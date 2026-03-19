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

// Active CRM types managed in the field builder
const ACTIVE_CRM_TYPES = ['salesforce', 'dynamics'];

export interface CleaningFieldUpdate {
  label: string;
  fieldName: string;
  fieldType: string;
  fieldLength: number | null;
  helpText: string;
  category: 'required' | 'recommended' | 'optional';
  displayOrder: number;
}

/** Update a field across all CRM types (by field_id) */
export function updateCleaningField(fieldId: string, u: CleaningFieldUpdate): void {
  const db = getLocalDb();
  db.prepare(`
    UPDATE cleaning_fields SET
      label = ?, field_name = ?, field_type = ?, field_length = ?,
      help_text = ?, category = ?, display_order = ?, synced_at = datetime('now')
    WHERE field_id = ?
  `).run(u.label, u.fieldName, u.fieldType, u.fieldLength, u.helpText, u.category, u.displayOrder, fieldId);
}

/** Delete a field from all CRM types */
export function deleteCleaningField(fieldId: string): void {
  const db = getLocalDb();
  db.prepare('DELETE FROM cleaning_fields WHERE field_id = ?').run(fieldId);
}

/** Add a new field for all active CRM types */
export function addCleaningField(f: CleaningFieldUpdate & { fieldId: string }): void {
  const db = getLocalDb();
  const stmt = db.prepare(`
    INSERT INTO cleaning_fields (id, crm_type, field_id, label, field_name, field_type, field_length, help_text, read_only, visible, category, display_order, synced_at)
    VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random())%4+1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
      ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, datetime('now'))
    ON CONFLICT(crm_type, field_id) DO NOTHING
  `);
  const insertMany = db.transaction(() => {
    for (const crm of ACTIVE_CRM_TYPES) {
      stmt.run(crm, f.fieldId, f.label, f.fieldName, f.fieldType, f.fieldLength, f.helpText, f.category, f.displayOrder);
    }
  });
  insertMany();
}

/** Get distinct fields (one row per field_id, using salesforce as canonical) */
export function getDistinctCleaningFields(): CleaningField[] {
  const db = getLocalDb();
  const rows = db.prepare(
    `SELECT * FROM cleaning_fields WHERE crm_type = 'salesforce'
     ORDER BY
       CASE category WHEN 'required' THEN 0 WHEN 'recommended' THEN 1 ELSE 2 END,
       display_order ASC`
  ).all() as (CleaningField & { crm_type: string; field_id: string; field_name: string; field_type: string; field_length: number | null; help_text: string; display_order: number })[];
  return rows.map((r: any) => ({
    id: r.id, crmType: r.crm_type, fieldId: r.field_id,
    label: r.label, fieldName: r.field_name, fieldType: r.field_type,
    fieldLength: r.field_length, helpText: r.help_text,
    category: r.category, displayOrder: r.display_order,
  }));
}
