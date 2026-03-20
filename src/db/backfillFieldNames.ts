import { getLocalDb } from './local';
import { toKernelFieldName } from '../utils/fieldNaming';

const MIGRATION_NAME = '011_backfill_kernel_field_names';

interface FieldRow {
  id: number;
  datapoint_id: string;
  field_name: string;
  display_name: string;
}

export function backfillFieldNames(): void {
  const db = getLocalDb();

  // Check if already applied
  const already = db.prepare(
    'SELECT 1 FROM _migrations WHERE name = ?'
  ).get(MIGRATION_NAME);
  if (already) return;

  // Get all fields for approved datapoints that don't already have kernel_ prefix
  const fields = db.prepare(`
    SELECT df.id, df.datapoint_id, df.field_name, df.display_name
    FROM datapoint_fields df
    JOIN datapoints d ON d.id = df.datapoint_id
    WHERE d.status = 'approved'
      AND df.field_name NOT LIKE 'kernel\\_%' ESCAPE '\\'
  `).all() as FieldRow[];

  if (fields.length === 0) {
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(MIGRATION_NAME);
    console.log(`Backfill: no fields to rename. Marked as complete.`);
    return;
  }

  const updateField = db.prepare(
    'UPDATE datapoint_fields SET field_name = ? WHERE id = ?'
  );
  const updateOutputFields = db.prepare(
    'UPDATE datapoints SET output_fields = ? WHERE id = ?'
  );
  const getOutputFields = db.prepare(
    'SELECT output_fields FROM datapoints WHERE id = ?'
  );
  const checkCollision = db.prepare(
    'SELECT 1 FROM datapoint_fields WHERE datapoint_id = ? AND field_name = ? AND id != ?'
  );

  const runBackfill = db.transaction(() => {
    // Track renames per datapoint for output_fields JSON update
    const renameMap: Record<string, Record<string, string>> = {};

    for (const f of fields) {
      let newName = toKernelFieldName(f.display_name);

      // Handle collisions: append _2, _3, etc.
      let suffix = 1;
      let candidate = newName;
      while (checkCollision.get(f.datapoint_id, candidate, f.id)) {
        suffix++;
        candidate = `${newName}_${suffix}`;
      }
      newName = candidate;

      updateField.run(newName, f.id);

      if (!renameMap[f.datapoint_id]) renameMap[f.datapoint_id] = {};
      renameMap[f.datapoint_id][f.field_name] = newName;
    }

    // Update output_fields JSON arrays in datapoints
    for (const [dpId, renames] of Object.entries(renameMap)) {
      const row = getOutputFields.get(dpId) as { output_fields: string } | undefined;
      if (!row) continue;
      try {
        const outputFields: string[] = JSON.parse(row.output_fields || '[]');
        const updated = outputFields.map((name) => renames[name] || name);
        updateOutputFields.run(JSON.stringify(updated), dpId);
      } catch {
        // If output_fields isn't valid JSON, skip
      }
    }

    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(MIGRATION_NAME);
  });

  runBackfill();
  console.log(`Backfill: renamed ${fields.length} field(s) to kernel_* format.`);
}
