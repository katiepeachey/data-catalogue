import { query } from '../db/motherduck';
import { upsertCleaningFields, CleaningField } from '../db/cleaningFields';
import { getLocalDb } from '../db/local';

interface CleaningFieldRow {
  id: string;
  crm_type: string;
  field_id: string;
  label: string;
  field_name: string;
  field_type: string;
  field_length: number | null;
  help_text: string;
  read_only: number;
  visible: number;
  category: string;
  display_order: number;
}

export async function syncCleaningFields(): Promise<number> {
  const rows = await query<CleaningFieldRow>(`
    SELECT
      id::TEXT AS id,
      crm_type,
      field_id,
      label,
      field_name,
      field_type,
      field_length,
      COALESCE(help_text, '') AS help_text,
      read_only::INTEGER AS read_only,
      visible::INTEGER AS visible,
      category,
      display_order
    FROM "kernel-analytics-db".raw.customer_app_cleaning_fields
    ORDER BY crm_type, display_order
  `);

  const fields: CleaningField[] = rows.map((r) => ({
    id: r.id,
    crmType: r.crm_type,
    fieldId: r.field_id,
    label: r.label,
    fieldName: r.field_name,
    fieldType: r.field_type,
    fieldLength: r.field_length,
    helpText: r.help_text,
    category: r.category as 'required' | 'recommended' | 'optional',
    displayOrder: r.display_order,
  }));

  // Full replace: clear local table first so removed fields don't persist
  getLocalDb().prepare('DELETE FROM cleaning_fields').run();
  upsertCleaningFields(fields);
  console.log(`Synced ${fields.length} cleaning fields`);
  return fields.length;
}
