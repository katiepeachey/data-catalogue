-- Add export_field_name to datapoint_fields.
-- This is the client-facing field name used in CSV exports.
-- Defaults to 'kernel_' + field_name, but is fully editable by admins.
-- Never overwritten by sync once set (admin_edited flag controls this).
ALTER TABLE datapoint_fields ADD COLUMN export_field_name TEXT NOT NULL DEFAULT '';

-- Back-fill: set export_field_name = 'kernel_' + field_name for all existing rows,
-- unless field_name already starts with 'kernel_' or 'krnl_'.
UPDATE datapoint_fields SET export_field_name =
  CASE
    WHEN lower(field_name) LIKE 'kernel_%' THEN field_name
    WHEN lower(field_name) LIKE 'krnl_%'   THEN 'kernel_' || substr(field_name, 6)
    ELSE 'kernel_' || field_name
  END
WHERE export_field_name = '';
