import { getLocalDb } from './local';
import { DatapointField, SfFieldType } from '../types';

interface FieldRow {
  id: number;
  datapoint_id: string;
  field_name: string;
  display_name: string;
  sf_field_type: string;
  visible: number;
  sort_order: number;
  admin_edited: number;
  example_value: string | null;
}

function rowToField(row: FieldRow): DatapointField {
  return {
    id: row.id,
    datapointId: row.datapoint_id,
    fieldName: row.field_name,
    displayName: row.display_name,
    sfFieldType: row.sf_field_type as SfFieldType,
    visible: row.visible === 1,
    sortOrder: row.sort_order,
    adminEdited: row.admin_edited === 1,
    exampleValue: row.example_value || null,
  };
}

/** Get all fields for a datapoint, ordered by sort_order */
export function getFieldsForDatapoint(datapointId: string): DatapointField[] {
  const db = getLocalDb();
  const rows = db.prepare(
    'SELECT * FROM datapoint_fields WHERE datapoint_id = ? ORDER BY sort_order ASC, id ASC'
  ).all(datapointId) as FieldRow[];
  return rows.map(rowToField);
}

/** Get only visible fields for a datapoint (for public API) */
export function getVisibleFields(datapointId: string): DatapointField[] {
  const db = getLocalDb();
  const rows = db.prepare(
    'SELECT * FROM datapoint_fields WHERE datapoint_id = ? AND visible = 1 ORDER BY sort_order ASC, id ASC'
  ).all(datapointId) as FieldRow[];
  return rows.map(rowToField);
}

/** Upsert a field during sync — respects admin_edited flag */
export function upsertFieldFromSync(
  datapointId: string,
  fieldName: string,
  displayName: string,
  sfFieldType: SfFieldType
): void {
  const db = getLocalDb();
  const existing = db.prepare(
    'SELECT id, admin_edited FROM datapoint_fields WHERE datapoint_id = ? AND field_name = ?'
  ).get(datapointId, fieldName) as { id: number; admin_edited: number } | undefined;

  if (!existing) {
    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM datapoint_fields WHERE datapoint_id = ?'
    ).get(datapointId) as { max_order: number };

    db.prepare(`
      INSERT INTO datapoint_fields (datapoint_id, field_name, display_name, sf_field_type, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(datapointId, fieldName, displayName, sfFieldType, maxOrder.max_order + 1);
  } else if (existing.admin_edited === 0) {
    db.prepare(
      'UPDATE datapoint_fields SET display_name = ?, sf_field_type = ? WHERE id = ?'
    ).run(displayName, sfFieldType, existing.id);
  }
  // If admin_edited = 1, leave untouched
}

export interface FieldConfigUpdate {
  fieldName: string;
  displayName: string;
  sfFieldType: SfFieldType;
  visible: boolean;
  sortOrder: number;
  exampleValue?: string | null;
}

/** Bulk update field configuration from admin UI */
export function updateFieldConfig(datapointId: string, fields: FieldConfigUpdate[]): void {
  const db = getLocalDb();
  const updateStmt = db.prepare(`
    UPDATE datapoint_fields
    SET display_name = ?, sf_field_type = ?, visible = ?, sort_order = ?, example_value = ?, admin_edited = 1
    WHERE datapoint_id = ? AND field_name = ?
  `);

  const updateMany = db.transaction((items: FieldConfigUpdate[]) => {
    for (const f of items) {
      updateStmt.run(
        f.displayName, f.sfFieldType, f.visible ? 1 : 0,
        f.sortOrder, f.exampleValue ?? null,
        datapointId, f.fieldName
      );
    }
  });

  updateMany(fields);
}

/** Add a new field manually (admin) */
export function addField(
  datapointId: string,
  fieldName: string,
  displayName: string,
  sfFieldType: SfFieldType,
  exampleValue?: string | null
): void {
  const db = getLocalDb();
  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM datapoint_fields WHERE datapoint_id = ?'
  ).get(datapointId) as { max_order: number };

  db.prepare(`
    INSERT INTO datapoint_fields (datapoint_id, field_name, display_name, sf_field_type, sort_order, admin_edited, example_value)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(datapointId, fieldName, displayName, sfFieldType, maxOrder.max_order + 1, exampleValue ?? null);
}
