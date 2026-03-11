import { getLocalDb } from '../db/local';
import { fetchCatalogFields } from './fetchCatalogFields';
import { groupRelatedFields } from './groupFields';
import { transformToDatapoint, TransformedDatapoint, humanizeName, mapSfFieldType } from './transform';
import { upsertFieldFromSync } from '../db/datapointFields';

export interface SyncResult {
  fieldsFetched: number;
  datapointsCreated: number;
  datapointsUpdated: number;
  datapointsUnchanged: number;
  error?: string;
}

export async function syncFromMotherDuck(): Promise<SyncResult> {
  const db = getLocalDb();
  const result: SyncResult = {
    fieldsFetched: 0,
    datapointsCreated: 0,
    datapointsUpdated: 0,
    datapointsUnchanged: 0,
  };

  // Start sync log
  const logStmt = db.prepare(
    `INSERT INTO sync_log (status) VALUES ('running')`
  );
  const { lastInsertRowid: logId } = logStmt.run();

  try {
    // 1. Fetch from MotherDuck
    console.log('Fetching catalog fields from MotherDuck...');
    const rawFields = await fetchCatalogFields();
    result.fieldsFetched = rawFields.length;
    console.log(`Fetched ${rawFields.length} catalog fields`);

    // 2. Group related fields
    const grouped = groupRelatedFields(rawFields);
    console.log(`Grouped into ${grouped.length} datapoints`);

    // 3. Build lookup of existing records to check admin_edited status
    const existingRows = db.prepare(
      'SELECT id, admin_edited FROM datapoints'
    ).all() as { id: string; admin_edited: number }[];
    const existingMap = new Map(existingRows.map((r) => [r.id, r.admin_edited]));

    // INSERT for new records
    const insertStmt = db.prepare(`
      INSERT INTO datapoints (
        id, catalog_field_id, name, category, description,
        output_fields, example_value, example_evidence, example_url,
        source, labels, updated_date, status, submitted_at,
        producing_agents, classifier_info, agent_types,
        rd_classification, data_type, entity_type, client_count,
        agent_statuses, classifier_options_sample,
        auto_name, auto_description, auto_category, auto_labels, auto_output_fields
      ) VALUES (
        @id, @catalogFieldId, @name, @category, @description,
        @outputFields, @exampleValue, @exampleEvidence, @exampleUrl,
        @source, @labels, @updatedDate, 'pending', datetime('now'),
        @producingAgents, @classifierInfo, @agentTypes,
        @rdClassification, @dataType, @entityType, @clientCount,
        @agentStatuses, @classifierOptionsSample,
        @name, @description, @category, @labels, @outputFields
      )
    `);

    // UPDATE for existing records that have NOT been admin-edited:
    // overwrite everything including display fields
    const updateFullStmt = db.prepare(`
      UPDATE datapoints SET
        name = @name,
        category = @category,
        description = @description,
        output_fields = @outputFields,
        example_value = CASE WHEN example_value = '' THEN @exampleValue ELSE example_value END,
        labels = @labels,
        updated_date = @updatedDate,
        producing_agents = @producingAgents,
        classifier_info = @classifierInfo,
        agent_types = @agentTypes,
        rd_classification = @rdClassification,
        data_type = @dataType,
        entity_type = @entityType,
        client_count = @clientCount,
        agent_statuses = @agentStatuses,
        classifier_options_sample = @classifierOptionsSample,
        auto_name = @name,
        auto_description = @description,
        auto_category = @category,
        auto_labels = @labels,
        auto_output_fields = @outputFields
      WHERE id = @id
    `);

    // UPDATE for existing records that HAVE been admin-edited:
    // only update metadata (agents, costs, statuses) — preserve display fields
    const updateMetadataOnlyStmt = db.prepare(`
      UPDATE datapoints SET
        producing_agents = @producingAgents,
        classifier_info = @classifierInfo,
        agent_types = @agentTypes,
        rd_classification = @rdClassification,
        data_type = @dataType,
        entity_type = @entityType,
        client_count = @clientCount,
        agent_statuses = @agentStatuses,
        classifier_options_sample = @classifierOptionsSample,
        auto_name = @name,
        auto_description = @description,
        auto_category = @category,
        auto_labels = @labels,
        auto_output_fields = @outputFields,
        updated_date = @updatedDate
      WHERE id = @id
    `);

    const upsertMany = db.transaction((datapoints: TransformedDatapoint[]) => {
      for (const dp of datapoints) {
        const params = {
          id: dp.id,
          catalogFieldId: dp.catalogFieldId,
          name: dp.name,
          category: dp.category,
          description: dp.description,
          outputFields: JSON.stringify(dp.outputFields),
          exampleValue: dp.exampleValue,
          exampleEvidence: dp.exampleEvidence,
          exampleUrl: dp.exampleUrl,
          source: dp.source,
          labels: JSON.stringify(dp.labels),
          updatedDate: dp.updatedDate,
          producingAgents: JSON.stringify(dp.producingAgents),
          classifierInfo: JSON.stringify(dp.classifierInfo),
          agentTypes: JSON.stringify(dp.agentTypes),
          rdClassification: dp.rdClassification,
          dataType: dp.dataType,
          entityType: dp.entityType,
          clientCount: dp.clientCount,
          agentStatuses: JSON.stringify(dp.agentStatuses),
          classifierOptionsSample: dp.classifierOptionsSample,
        };

        const existing = existingMap.get(dp.id);

        if (existing === undefined) {
          // New record
          insertStmt.run(params);
          result.datapointsCreated++;
        } else if (existing === 1) {
          // Admin-edited: only update metadata, preserve curated display fields
          updateMetadataOnlyStmt.run(params);
          result.datapointsUpdated++;
        } else {
          // Not admin-edited: safe to overwrite everything
          updateFullStmt.run(params);
          result.datapointsUpdated++;
        }

        // Upsert datapoint_fields for each output field
        // All output fields inherit the primary field's data type for SF mapping.
        // Admins can override SF types via the field config UI.
        for (const fieldName of dp.outputFields) {
          const displayName = humanizeName(fieldName);
          const sfType = mapSfFieldType(dp.dataType);
          upsertFieldFromSync(dp.id, fieldName, displayName, sfType);
        }
      }
    });

    const datapoints = grouped.map((g) => transformToDatapoint(g.primary));
    upsertMany(datapoints);

    result.datapointsUnchanged = existingRows.length - result.datapointsUpdated;
    if (result.datapointsUnchanged < 0) result.datapointsUnchanged = 0;

    // Update sync log
    db.prepare(`
      UPDATE sync_log SET
        status = 'completed',
        completed_at = datetime('now'),
        fields_fetched = ?,
        datapoints_created = ?,
        datapoints_updated = ?,
        datapoints_unchanged = ?
      WHERE id = ?
    `).run(
      result.fieldsFetched,
      result.datapointsCreated,
      result.datapointsUpdated,
      result.datapointsUnchanged,
      logId
    );

    console.log(`Sync complete: ${result.datapointsCreated} created, ${result.datapointsUpdated} updated`);
    return result;

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.error = errorMsg;

    db.prepare(`
      UPDATE sync_log SET status = 'failed', completed_at = datetime('now'), error = ? WHERE id = ?
    `).run(errorMsg, logId);

    console.error('Sync failed:', errorMsg);
    throw err;
  }
}
