CREATE TABLE IF NOT EXISTS cleaning_fields (
  id TEXT PRIMARY KEY,
  crm_type TEXT NOT NULL,
  field_id TEXT NOT NULL,
  label TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  field_length INTEGER,
  help_text TEXT NOT NULL DEFAULT '',
  read_only INTEGER NOT NULL DEFAULT 1,
  visible INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(crm_type, field_id)
);
CREATE INDEX IF NOT EXISTS idx_cleaning_fields_crm ON cleaning_fields(crm_type);
