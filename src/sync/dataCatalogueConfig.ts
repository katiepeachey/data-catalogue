/**
 * Data Catalogue agent/flow designation config.
 *
 * Control agents are filtered automatically via agent_type_id = 135
 * in kernel-prod-db.public.control_agent_config.
 *
 * Flows use a junction table (agent_type_configs) that isn't replicated
 * to MotherDuck, so we maintain a whitelist of flow IDs here.
 * Update this list when new flows are tagged as "Data Catalogue" in the portal.
 */

/** agent_type_id value for "Data Catalogue" in the portal */
export const DATA_CATALOGUE_TYPE_ID = 135;

/** The "tools" client in the portal — contains canonical/reusable agents */
export const TOOLS_CLIENT_ID = 873;

/**
 * Flow IDs (q_flow_configs.id) tagged as Data Catalogue in the portal.
 * These come from the portal's agent_type_configs junction table which
 * isn't synced to MotherDuck.
 *
 * To find new IDs: check the portal Agents page → Types → Data Catalogue
 */
export const DATA_CATALOGUE_FLOW_IDS: number[] = [
  43769,  // Legal Name [v2]
];
