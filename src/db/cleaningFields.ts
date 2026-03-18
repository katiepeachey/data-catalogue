import { getLocalDb } from './local';

export interface CleaningField {
  id: string;
  crmType: string;
  fieldId: string;
  label: string;
  fieldName: string;
  fieldType: string;
  fieldLength: number | null;
  helpText: string;
  category: 'required' | 'recommended' | 'optional';
  displayOrder: number;
}

interface CleaningFieldRow {
  id: string;
  crm_type: string;
  field_id: string;
  label: string;
  field_name: string;
  field_type: string;
  field_length: number | null;
  help_text: string;
  category: string;
  display_order: number;
}

function rowToField(row: CleaningFieldRow): CleaningField {
  return {
    id: row.id,
    crmType: row.crm_type,
    fieldId: row.field_id,
    label: row.label,
    fieldName: row.field_name,
    fieldType: row.field_type,
    fieldLength: row.field_length,
    helpText: row.help_text,
    category: row.category as 'required' | 'recommended' | 'optional',
    displayOrder: row.display_order,
  };
}

export function getCleaningFields(crmType: string): CleaningField[] {
  const db = getLocalDb();
  const rows = db.prepare(
    'SELECT * FROM cleaning_fields WHERE crm_type = ? ORDER BY display_order ASC'
  ).all(crmType) as CleaningFieldRow[];
  return rows.map(rowToField);
}

export function getAllCleaningFields(): Record<string, CleaningField[]> {
  const db = getLocalDb();
  const rows = db.prepare(
    'SELECT * FROM cleaning_fields ORDER BY crm_type ASC, display_order ASC'
  ).all() as CleaningFieldRow[];

  const result: Record<string, CleaningField[]> = {};
  for (const row of rows) {
    if (!result[row.crm_type]) result[row.crm_type] = [];
    result[row.crm_type].push(rowToField(row));
  }
  return result;
}

export function getCleaningFieldsByIds(ids: string[]): CleaningField[] {
  if (ids.length === 0) return [];
  const db = getLocalDb();
  const placeholders = ids.map(() => '?').join(', ');
  const rows = db.prepare(
    `SELECT * FROM cleaning_fields WHERE id IN (${placeholders}) ORDER BY display_order ASC`
  ).all(...ids) as CleaningFieldRow[];
  return rows.map(rowToField);
}

export function upsertCleaningFields(fields: CleaningField[]): void {
  const db = getLocalDb();
  const stmt = db.prepare(`
    INSERT INTO cleaning_fields (
      id, crm_type, field_id, label, field_name, field_type,
      field_length, help_text, read_only, visible, category, display_order, synced_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, 1, 1, ?, ?, datetime('now')
    )
    ON CONFLICT(crm_type, field_id) DO UPDATE SET
      id = excluded.id,
      label = excluded.label,
      field_name = excluded.field_name,
      field_type = excluded.field_type,
      field_length = excluded.field_length,
      help_text = excluded.help_text,
      category = excluded.category,
      display_order = excluded.display_order,
      synced_at = datetime('now')
  `);

  const upsertMany = db.transaction((items: CleaningField[]) => {
    for (const f of items) {
      stmt.run(
        f.id, f.crmType, f.fieldId, f.label, f.fieldName, f.fieldType,
        f.fieldLength, f.helpText, f.category, f.displayOrder
      );
    }
  });

  upsertMany(fields);
}
