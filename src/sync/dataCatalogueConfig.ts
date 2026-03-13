/**
 * Data Catalogue agent/flow designation config.
 *
 * Both control agents and flows are now picked up automatically via
 * agent_type_name = 'Data Catalogue' in MotherDuck.
 *
 * The flow whitelist below is kept as a fallback for any flows not yet tagged.
 * It can also be managed at runtime via /admin/sync-config.
 */

/** agent_type_name value for "Data Catalogue" in the portal */
export const DATA_CATALOGUE_TYPE_NAME = 'Data Catalogue';

/** Kept for reference / fallback only — auto-detection now uses agent_type_name */
export const DATA_CATALOGUE_TYPE_ID = 135;

/**
 * Flow IDs (q_flow_configs.id) tagged as Data Catalogue in the portal.
 * These come from the portal's agent_type_configs junction table which
 * isn't synced to MotherDuck.
 *
 * To find new IDs: check the portal Agents page → Types → Data Catalogue
 */
export const DATA_CATALOGUE_FLOW_IDS: number[] = [
  43769,  // Legal Name [v2]
  44411,  // Company Profile > Business Model
];
