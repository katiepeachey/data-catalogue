-- Datapoints table: stores transformed catalog field data for the catalogue
CREATE TABLE IF NOT EXISTS datapoints (
  id TEXT PRIMARY KEY,
  catalog_field_id INTEGER,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  output_fields TEXT NOT NULL DEFAULT '[]',  -- JSON array of field names
  example_value TEXT NOT NULL DEFAULT '',
  example_evidence TEXT NOT NULL DEFAULT '',
  example_url TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'kernel',
  labels TEXT NOT NULL DEFAULT '[]',  -- JSON array of label strings
  updated_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  rejection_reason TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Extra metadata from MotherDuck (not shown on public catalogue)
  producing_agents TEXT DEFAULT '[]',    -- JSON array of agent names
  classifier_info TEXT DEFAULT '[]',     -- JSON array of classifier names
  agent_types TEXT DEFAULT '[]',         -- JSON array: control_agent, flow, etc.
  rd_classification TEXT,                -- R&D | COGS
  data_type TEXT,                        -- string, boolean, string_array, etc.
  entity_type TEXT,                      -- account | metadata
  client_count INTEGER DEFAULT 0,
  agent_statuses TEXT DEFAULT '[]',      -- JSON array of statuses
  classifier_options_sample TEXT         -- Sample classifier options JSON
);

-- Sync log: tracks sync runs
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  fields_fetched INTEGER DEFAULT 0,
  datapoints_created INTEGER DEFAULT 0,
  datapoints_updated INTEGER DEFAULT 0,
  datapoints_unchanged INTEGER DEFAULT 0,
  error TEXT,
  status TEXT NOT NULL DEFAULT 'running'  -- running | completed | failed
);
