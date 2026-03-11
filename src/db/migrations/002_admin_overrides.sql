-- Track admin edits separately so syncs don't overwrite curated content.
-- auto_* columns hold the original MotherDuck-derived values.
-- The main columns (name, description, etc.) become the "display" values
-- that admins can freely edit.

ALTER TABLE datapoints ADD COLUMN admin_edited INTEGER NOT NULL DEFAULT 0;
ALTER TABLE datapoints ADD COLUMN admin_edited_at TEXT;

-- Store original auto-generated values so we can show "Portal name" vs "Display name"
ALTER TABLE datapoints ADD COLUMN auto_name TEXT NOT NULL DEFAULT '';
ALTER TABLE datapoints ADD COLUMN auto_description TEXT NOT NULL DEFAULT '';
ALTER TABLE datapoints ADD COLUMN auto_category TEXT NOT NULL DEFAULT '';
ALTER TABLE datapoints ADD COLUMN auto_labels TEXT NOT NULL DEFAULT '[]';
ALTER TABLE datapoints ADD COLUMN auto_output_fields TEXT NOT NULL DEFAULT '[]';

-- Backfill: copy current values into auto_* columns
UPDATE datapoints SET
  auto_name = name,
  auto_description = description,
  auto_category = category,
  auto_labels = labels,
  auto_output_fields = output_fields
WHERE auto_name = '';
