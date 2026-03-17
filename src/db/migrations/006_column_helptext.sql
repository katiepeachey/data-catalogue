CREATE TABLE IF NOT EXISTS column_helptext (
  column_key  TEXT PRIMARY KEY,
  helptext    TEXT NOT NULL DEFAULT ''
);

-- Seed with default empty rows for each catalogue column
INSERT OR IGNORE INTO column_helptext (column_key) VALUES
  ('labels'),
  ('datapoint'),
  ('description'),
  ('output_fields'),
  ('example_values'),
  ('source');
