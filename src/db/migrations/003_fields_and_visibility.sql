-- Migration 003: datapoint_fields table + visibility column
-- Adds per-field configuration and datapoint visibility toggle

-- New table for per-field metadata
CREATE TABLE IF NOT EXISTS datapoint_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  datapoint_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  sf_field_type TEXT NOT NULL DEFAULT 'Text',
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  admin_edited INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (datapoint_id) REFERENCES datapoints(id),
  UNIQUE(datapoint_id, field_name)
);

-- Index for fast lookups by datapoint
CREATE INDEX IF NOT EXISTS idx_datapoint_fields_dp ON datapoint_fields(datapoint_id);

-- Add visible column to datapoints (default 0 = hidden until admin enables)
ALTER TABLE datapoints ADD COLUMN visible INTEGER NOT NULL DEFAULT 0;
