import { query } from '../db/motherduck';
import { DATA_CATALOGUE_TYPE_ID, DATA_CATALOGUE_FLOW_IDS, TOOLS_CLIENT_ID } from './dataCatalogueConfig';

export interface RawCatalogField {
  catalog_field_id: number;
  catalog_field_name: string;
  catalog_field_description: string | null;
  catalog_field_data_type: string | null;
  catalog_field_entity_type: string | null;
  output_fields: string[];
  producing_agents: string[];
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
 * Fetch catalog fields from MotherDuck, filtered to only Data Catalogue agents/flows.
 *
 * Uses two filters (unioned):
 *  1. Control agents with agent_type_id = DATA_CATALOGUE_TYPE_ID (135) in kernel-prod-db
 *  2. Flows explicitly listed in DATA_CATALOGUE_FLOW_IDS whitelist
 *
 * Both paths are intersected with the standard catalog field match + active status filters.
 */
export async function fetchCatalogFields(): Promise<RawCatalogField[]> {
  // Build the flow IDs placeholder — fallback to an impossible ID if list is empty
  const flowIdsList = DATA_CATALOGUE_FLOW_IDS.length > 0
    ? DATA_CATALOGUE_FLOW_IDS.join(', ')
    : '-1';

  const sql = `
    WITH data_catalogue_agents AS (
      -- Active control agents tagged as Data Catalogue (type_id = ${DATA_CATALOGUE_TYPE_ID})
      -- Filtered to tools client (${TOOLS_CLIENT_ID}) to exclude client-specific agents
      SELECT id AS agent_id
      FROM "kernel-prod-db".public.control_agent_config
      WHERE agent_type_id = ${DATA_CATALOGUE_TYPE_ID}
        AND status = 'active'
        AND client_id = ${TOOLS_CLIENT_ID}

      UNION

      -- Whitelisted Data Catalogue flows
      SELECT id AS agent_id
      FROM "kernel-prod-db".public.q_flow_configs
      WHERE id IN (${flowIdsList})
        AND status = 'active'
    )
    SELECT
      s.catalog_field_id,
      s.catalog_field_name,
      s.catalog_field_description,
      s.catalog_field_data_type,
      s.catalog_field_entity_type,
      ARRAY_AGG(DISTINCT s.output_field_name) AS output_fields,
      ARRAY_AGG(DISTINCT s.agent_name) AS producing_agents,
      ARRAY_AGG(DISTINCT s.agent_type) AS agent_types,
      ARRAY_AGG(DISTINCT s.classifier_name) AS classifiers,
      ARRAY_AGG(DISTINCT s.classifier_mode) AS classifier_modes,
      FIRST(s.classifier_options_json) AS sample_options,
      ARRAY_AGG(DISTINCT s.effective_rd_classification) AS rd_classifications,
      ARRAY_AGG(DISTINCT s.agent_status) AS statuses,
      COUNT(DISTINCT s.agent_client_id) AS client_count,
      ARRAY_AGG(DISTINCT s.agent_client_name) AS client_names
    FROM core.agent_classifier_field_snapshot s
    WHERE s.has_catalog_field_match = true
      AND s.catalog_field_archived = false
      AND (
        -- Agent itself is a Data Catalogue agent
        s.agent_id IN (SELECT agent_id FROM data_catalogue_agents)
        -- OR agent is a child of a Data Catalogue control agent
        OR s.agent_parent_id IN (SELECT agent_id FROM data_catalogue_agents)
      )
    GROUP BY
      s.catalog_field_id, s.catalog_field_name, s.catalog_field_description,
      s.catalog_field_data_type, s.catalog_field_entity_type
    ORDER BY s.catalog_field_name
  `;

  const rows = await query<RawCatalogField>(sql);
  return rows;
}
