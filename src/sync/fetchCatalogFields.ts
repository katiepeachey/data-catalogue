import { query } from '../db/motherduck';
import { DATA_CATALOGUE_TYPE_ID, DATA_CATALOGUE_FLOW_IDS, TOOLS_CLIENT_ID } from './dataCatalogueConfig';

/**
 * One row per top-level Data Catalogue agent.
 * catalog_field_names contains all the catalog field names produced by that agent
 * (these become the "output fields" shown in the catalogue).
 */
export interface RawCatalogField {
  agent_id: number;
  agent_name: string;
  catalog_field_names: string[];   // catalog field names (shown as output fields)
  sf_output_fields: string[];      // SF object field names (for reference)
  description: string | null;
  data_type: string | null;
  entity_type: string | null;
  agent_types: string[];
  classifiers: string[];
  classifier_modes: string[];
  sample_options: string | null;
  rd_classifications: string[];
  statuses: string[];
  client_count: number;
  client_names: string[];
}

/**
 * Fetch Data Catalogue agents from MotherDuck, grouped by top-level agent.
 *
 * Each returned row represents ONE agent (e.g. "Magic Funding V2").
 * catalog_field_names contains all catalog fields produced by that agent
 * (e.g. ["krnl_funding", "krnl_total_funding", ...]).
 */
export async function fetchCatalogFields(): Promise<RawCatalogField[]> {
  const flowIdsList = DATA_CATALOGUE_FLOW_IDS.length > 0
    ? DATA_CATALOGUE_FLOW_IDS.join(', ')
    : '-1';

  const sql = `
    WITH data_catalogue_agents AS (
      -- Active control agents tagged as Data Catalogue (type_id = ${DATA_CATALOGUE_TYPE_ID})
      SELECT id AS agent_id, name AS agent_name
      FROM "kernel-prod-db".public.control_agent_config
      WHERE agent_type_id = ${DATA_CATALOGUE_TYPE_ID}
        AND status = 'active'
        AND client_id = ${TOOLS_CLIENT_ID}

      UNION

      -- Whitelisted Data Catalogue flows
      SELECT id AS agent_id, name AS agent_name
      FROM "kernel-prod-db".public.q_flow_configs
      WHERE id IN (${flowIdsList})
        AND status = 'active'
    ),
    snapshot_with_top_level AS (
      SELECT
        s.*,
        CASE
          -- If the immediate parent is a DC agent, group under the parent (handles child flows)
          WHEN s.agent_parent_id IN (SELECT agent_id FROM data_catalogue_agents) THEN s.agent_parent_id
          -- Otherwise use the agent itself (it is the top-level DC agent)
          WHEN s.agent_id IN (SELECT agent_id FROM data_catalogue_agents) THEN s.agent_id
        END AS top_level_agent_id
      FROM core.agent_classifier_field_snapshot s
      WHERE s.has_catalog_field_match = true
        AND s.catalog_field_archived = false
        AND (
          s.agent_id IN (SELECT agent_id FROM data_catalogue_agents)
          OR s.agent_parent_id IN (SELECT agent_id FROM data_catalogue_agents)
        )
    )
    SELECT
      d.agent_id,
      d.agent_name,
      ARRAY_AGG(DISTINCT s.catalog_field_name) AS catalog_field_names,
      ARRAY_AGG(DISTINCT s.output_field_name) AS sf_output_fields,
      FIRST(s.catalog_field_description) AS description,
      FIRST(s.catalog_field_data_type) AS data_type,
      FIRST(s.catalog_field_entity_type) AS entity_type,
      ARRAY_AGG(DISTINCT s.agent_type) AS agent_types,
      ARRAY_AGG(DISTINCT s.classifier_name) AS classifiers,
      ARRAY_AGG(DISTINCT s.classifier_mode) AS classifier_modes,
      FIRST(s.classifier_options_json) AS sample_options,
      ARRAY_AGG(DISTINCT s.effective_rd_classification) AS rd_classifications,
      ARRAY_AGG(DISTINCT s.agent_status) AS statuses,
      COUNT(DISTINCT s.agent_client_id) AS client_count,
      ARRAY_AGG(DISTINCT s.agent_client_name) AS client_names
    FROM snapshot_with_top_level s
    JOIN data_catalogue_agents d ON d.agent_id = s.top_level_agent_id
    GROUP BY d.agent_id, d.agent_name
    ORDER BY d.agent_name
  `;

  const rows = await query<RawCatalogField>(sql);
  return rows;
}
