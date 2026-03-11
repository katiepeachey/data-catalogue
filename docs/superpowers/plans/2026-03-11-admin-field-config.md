# Admin Field Configuration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-field configuration (display name, SF type, visibility), datapoint visibility toggle, and manual datapoint creation to the data catalogue admin and public UI.

**Architecture:** New `datapoint_fields` table stores per-field metadata alongside existing `datapoints` table. Sync pipeline populates fields with auto-mapped Salesforce types. Admin UI gets visibility toggles, field config tables, and a manual add form. Public UI switches from hardcoded HTML to dynamic API fetch.

**Tech Stack:** TypeScript, Express SSR (server-rendered HTML views), better-sqlite3, existing Kernel design system

**Spec:** `docs/superpowers/specs/2026-03-11-admin-field-config-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/db/migrations/003_fields_and_visibility.sql` | Schema: `datapoint_fields` table + `visible` column on `datapoints` |
| `src/db/datapointFields.ts` | Data access for `datapoint_fields` (CRUD, bulk upsert) |
| `src/views/newDatapointView.ts` | Admin form for manual datapoint creation |

### Modified files
| File | Changes |
|------|---------|
| `src/types.ts` | Add `SF_FIELD_TYPES` const, `SfFieldType` type, `DatapointField` interface |
| `src/sync/transform.ts` | Add `mapSfFieldType()` function for auto-mapping MotherDuck types |
| `src/sync/syncFromMotherDuck.ts` | Populate `datapoint_fields` during sync |
| `src/db/datapoints.ts` | Add `visible` to queries, add `toggleVisibility()`, update `listDatapoints` for public filtering |
| `src/routes/admin.ts` | Add visibility toggle, field config, new datapoint routes |
| `src/routes/api.ts` | Include fields in public API response, filter by `visible=1` |
| `src/views/queueView.ts` | Add visibility toggle switch + "Add Datapoint" button per row |
| `src/views/reviewView.ts` | Replace output fields textarea with field configuration table |
| `public/index.html` | Replace hardcoded data with dynamic fetch, add SF Type column |

---

## Chunk 1: Schema, Types & Data Access Layer

### Task 1: Create migration 003

**Files:**
- Create: `src/db/migrations/003_fields_and_visibility.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
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
```

- [ ] **Step 2: Verify migration runs**

Run: `npm run dev` (or `npx ts-node src/sync/run.ts`)
Expected: Server starts without migration errors. Check `data/catalogue.db` has the new table.

- [ ] **Step 3: Commit**

```bash
git add src/db/migrations/003_fields_and_visibility.sql
git commit -m "feat: add migration 003 — datapoint_fields table + visible column"
```

---

### Task 2: Add Salesforce field type constants

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add SF field type definitions**

Append to `src/types.ts` after the existing `Submission` interface:

```typescript
/** Standard Salesforce field types for mapping */
export const SF_FIELD_TYPES = [
  'Text',
  'Long Text Area',
  'Number',
  'Currency',
  'Percent',
  'Date',
  'DateTime',
  'Checkbox',
  'Picklist',
  'Multi-Select Picklist',
  'URL',
  'Email',
  'Phone',
] as const;

export type SfFieldType = typeof SF_FIELD_TYPES[number];

export interface DatapointField {
  id: number;
  datapointId: string;
  fieldName: string;
  displayName: string;
  sfFieldType: SfFieldType;
  visible: boolean;
  sortOrder: number;
  adminEdited: boolean;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Salesforce field type constants and DatapointField interface"
```

---

### Task 3: Create datapoint fields data access layer

**Files:**
- Create: `src/db/datapointFields.ts`

- [ ] **Step 1: Write the data access module**

```typescript
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
  // Check if exists
  const existing = db.prepare(
    'SELECT id, admin_edited FROM datapoint_fields WHERE datapoint_id = ? AND field_name = ?'
  ).get(datapointId, fieldName) as { id: number; admin_edited: number } | undefined;

  if (!existing) {
    // New field — get next sort_order
    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM datapoint_fields WHERE datapoint_id = ?'
    ).get(datapointId) as { max_order: number };

    db.prepare(`
      INSERT INTO datapoint_fields (datapoint_id, field_name, display_name, sf_field_type, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(datapointId, fieldName, displayName, sfFieldType, maxOrder.max_order + 1);
  } else if (existing.admin_edited === 0) {
    // Exists but not admin-edited — safe to update
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
}

/** Bulk update field configuration from admin UI */
export function updateFieldConfig(datapointId: string, fields: FieldConfigUpdate[]): void {
  const db = getLocalDb();
  const updateStmt = db.prepare(`
    UPDATE datapoint_fields
    SET display_name = ?, sf_field_type = ?, visible = ?, sort_order = ?, admin_edited = 1
    WHERE datapoint_id = ? AND field_name = ?
  `);

  const updateMany = db.transaction((items: FieldConfigUpdate[]) => {
    for (const f of items) {
      updateStmt.run(f.displayName, f.sfFieldType, f.visible ? 1 : 0, f.sortOrder, datapointId, f.fieldName);
    }
  });

  updateMany(fields);
}

/** Add a new field manually (admin) */
export function addField(datapointId: string, fieldName: string, displayName: string, sfFieldType: SfFieldType): void {
  const db = getLocalDb();
  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM datapoint_fields WHERE datapoint_id = ?'
  ).get(datapointId) as { max_order: number };

  db.prepare(`
    INSERT INTO datapoint_fields (datapoint_id, field_name, display_name, sf_field_type, sort_order, admin_edited)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(datapointId, fieldName, displayName, sfFieldType, maxOrder.max_order + 1);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/datapointFields.ts
git commit -m "feat: add datapoint fields data access layer"
```

---

### Task 4: Add visibility toggle to datapoints data access

**Files:**
- Modify: `src/db/datapoints.ts`

- [ ] **Step 1: Add `visible` field to DatapointRow and rowToSubmission**

In `src/db/datapoints.ts`, add `visible: number;` to the `DatapointRow` interface (after `classifier_options_sample`).

Add `visible: boolean` to the `SubmissionWithMeta` interface.

In `rowToSubmissionWithMeta`, add: `visible: row.visible === 1,`

- [ ] **Step 2: Add toggleVisibility function**

Append to `src/db/datapoints.ts`:

```typescript
export function toggleVisibility(id: string, visible: boolean): boolean {
  const db = getLocalDb();
  const result = db.prepare('UPDATE datapoints SET visible = ? WHERE id = ?').run(visible ? 1 : 0, id);
  return result.changes > 0;
}
```

- [ ] **Step 3: Update listDatapoints to support visible filter**

In the `ListFilters` interface, add: `visible?: boolean;`

In `listDatapoints`, add this condition block after the `search` filter:

```typescript
if (filters.visible !== undefined) {
  conditions.push('visible = ?');
  params.push(filters.visible ? 1 : 0);
}
```

- [ ] **Step 4: Add visible to Submission type**

In `src/types.ts`, add `visible?: boolean;` to the `Submission` interface.

In `src/db/datapoints.ts`, add to `rowToSubmission`: `visible: row.visible === 1,`

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/db/datapoints.ts src/types.ts
git commit -m "feat: add visibility toggle and filter to datapoints data access"
```

---

## Chunk 2: Sync Pipeline Updates

### Task 5: Add SF field type auto-mapping

**Files:**
- Modify: `src/sync/transform.ts`

- [ ] **Step 1: Add mapSfFieldType function**

Add this function to `src/sync/transform.ts`, after the existing `mapLabels` function:

```typescript
import { SfFieldType } from '../types';

/** Map MotherDuck catalog_field_data_type to Salesforce field type */
export function mapSfFieldType(dataType: string | null): SfFieldType {
  switch (dataType?.toLowerCase()) {
    case 'number': return 'Number';
    case 'boolean': return 'Checkbox';
    case 'string_array': return 'Multi-Select Picklist';
    case 'date': return 'Date';
    case 'string':
    default:
      return 'Text';
  }
}
```

Note: The import of `SfFieldType` needs to be added to the existing import from `'../types'`. Update the existing import line:
```typescript
import { Category, Label, SfFieldType } from '../types';
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/sync/transform.ts
git commit -m "feat: add Salesforce field type auto-mapping from MotherDuck data types"
```

---

### Task 6: Update sync to populate datapoint_fields

**Files:**
- Modify: `src/sync/syncFromMotherDuck.ts`

- [ ] **Step 1: Import new dependencies**

Add to the top of `src/sync/syncFromMotherDuck.ts`:

```typescript
import { upsertFieldFromSync } from '../db/datapointFields';
import { mapSfFieldType, humanizeName } from './transform';
```

Note: `humanizeName` is already exported from `transform.ts` but not currently imported in `syncFromMotherDuck.ts`.

- [ ] **Step 2: Add field upsert logic after datapoint upsert**

Inside the `upsertMany` transaction function, after the existing upsert logic for each datapoint (after the `if/else if/else` block at line ~157), add:

```typescript
// Upsert datapoint_fields for each output field
// Note: All output fields inherit the primary field's catalog_field_data_type for SF mapping.
// This is a simplification — individual per-output-field data types are not preserved
// through the grouping pipeline. Admins can override SF types via the field config UI.
const outputFields = dp.outputFields;
for (const fieldName of outputFields) {
  const displayName = humanizeName(fieldName);
  const sfType = mapSfFieldType(dp.dataType);
  upsertFieldFromSync(dp.id, fieldName, displayName, sfType);
}
```

- [ ] **Step 3: Verify sync works**

Run: `npm run sync` (or `npx ts-node src/sync/run.ts`)
Expected: Sync completes. Check SQLite: `SELECT COUNT(*) FROM datapoint_fields` should return > 0. Each datapoint should have fields matching its `output_fields` JSON array.

- [ ] **Step 4: Commit**

```bash
git add src/sync/syncFromMotherDuck.ts
git commit -m "feat: populate datapoint_fields during sync with auto-mapped SF types"
```

---

## Chunk 3: Admin Routes & API

### Task 7: Add visibility toggle endpoint

**Files:**
- Modify: `src/routes/admin.ts`

- [ ] **Step 1: Add the visibility toggle route**

Add this import at the top of `src/routes/admin.ts`:

```typescript
import { toggleVisibility } from '../db/datapoints';
```

Add this route after the existing `POST /admin/review/:id` handler:

```typescript
// POST /admin/datapoints/:id/visibility — toggle public visibility
router.post('/datapoints/:id/visibility', (req: Request, res: Response) => {
  const { visible } = req.body as { visible: boolean };
  const success = toggleVisibility(req.params.id, visible);
  if (!success) {
    res.status(404).json({ error: 'Datapoint not found' });
    return;
  }
  res.json({ ok: true, visible });
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/admin.ts
git commit -m "feat: add visibility toggle endpoint"
```

---

### Task 8: Add field config bulk update endpoint

**Files:**
- Modify: `src/routes/admin.ts`

- [ ] **Step 1: Add the field config route**

Add import at top:

```typescript
import { updateFieldConfig, addField, FieldConfigUpdate } from '../db/datapointFields';
import { SfFieldType } from '../types';
```

Add route:

```typescript
// POST /admin/datapoints/:id/fields — bulk update field configuration
router.post('/datapoints/:id/fields', (req: Request, res: Response) => {
  const fields = req.body as FieldConfigUpdate[];
  if (!Array.isArray(fields)) {
    res.status(400).json({ error: 'Expected array of field updates' });
    return;
  }
  updateFieldConfig(req.params.id, fields);
  res.json({ ok: true });
});

// POST /admin/datapoints/:id/fields/add — add a new field
router.post('/datapoints/:id/fields/add', (req: Request, res: Response) => {
  const { fieldName, displayName, sfFieldType } = req.body as {
    fieldName: string;
    displayName: string;
    sfFieldType: SfFieldType;
  };
  if (!fieldName || !displayName) {
    res.status(400).json({ error: 'fieldName and displayName required' });
    return;
  }
  addField(req.params.id, fieldName, displayName, sfFieldType || 'Text');
  res.json({ ok: true });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/admin.ts
git commit -m "feat: add field config bulk update and add field endpoints"
```

---

### Task 9: Add manual datapoint creation routes

**Files:**
- Modify: `src/routes/admin.ts`
- Create: `src/views/newDatapointView.ts` (Task 12 below — just wire route here)

- [ ] **Step 1: Add GET and POST routes for /admin/new**

Add these imports if not already present:

```typescript
import { newDatapointView } from '../views/newDatapointView';
import { addField as addFieldToDatapoint } from '../db/datapointFields';
```

Add imports at top if not already present:

```typescript
import { getLocalDb } from '../db/local';
```

Add routes:

```typescript
// GET /admin/new — render manual add form
router.get('/new', (_req: Request, res: Response) => {
  res.send(newDatapointView());
});

// POST /admin/new — create new datapoint with fields
router.post('/new', (req: Request, res: Response) => {
  const body = req.body as Record<string, string | string[]>;
  const db = getLocalDb();

  // Generate a unique ID for manual datapoints
  const id = `manual_${Date.now()}`;

  // Parse labels
  let labels: string[] = [];
  if (Array.isArray(body.labels)) {
    labels = body.labels;
  } else if (typeof body.labels === 'string' && body.labels) {
    labels = [body.labels];
  }

  const now = new Date();
  const updatedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  db.prepare(`
    INSERT INTO datapoints (
      id, name, category, description,
      output_fields, example_value, example_evidence, example_url,
      source, labels, updated_date, status, submitted_at, visible,
      auto_name, auto_description, auto_category, auto_labels, auto_output_fields,
      admin_edited,
      producing_agents, classifier_info, agent_types, agent_statuses
    ) VALUES (
      ?, ?, ?, ?,
      '[]', ?, '', '',
      ?, ?, ?, 'pending', datetime('now'), 0,
      ?, ?, ?, ?, '[]',
      1,
      '[]', '[]', '[]', '[]'
    )
  `).run(
    id,
    body.name || 'Untitled',
    body.category || 'Custom Enrichment',
    body.description || '',
    body.exampleValue || '',
    body.source || 'kernel',
    JSON.stringify(labels),
    updatedDate,
    body.name || 'Untitled',
    body.description || '',
    body.category || 'Custom Enrichment',
    JSON.stringify(labels),
  );

  // Parse and insert fields from the form
  // Fields come as parallel arrays: fieldName[], fieldDisplayName[], fieldSfType[]
  const fieldNames = Array.isArray(body['fieldName[]']) ? body['fieldName[]'] : (body['fieldName[]'] ? [body['fieldName[]']] : []);
  const fieldDisplayNames = Array.isArray(body['fieldDisplayName[]']) ? body['fieldDisplayName[]'] : (body['fieldDisplayName[]'] ? [body['fieldDisplayName[]']] : []);
  const fieldSfTypes = Array.isArray(body['fieldSfType[]']) ? body['fieldSfType[]'] : (body['fieldSfType[]'] ? [body['fieldSfType[]']] : []);

  for (let i = 0; i < fieldNames.length; i++) {
    const fn = (fieldNames[i] as string || '').trim();
    if (!fn) continue;
    const dn = (fieldDisplayNames[i] as string || fn).trim();
    const st = (fieldSfTypes[i] as string || 'Text') as SfFieldType;
    addFieldToDatapoint(id, fn, dn, st);
  }

  res.redirect('/admin/queue?msg=Datapoint+created+successfully');
});
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/admin.ts
git commit -m "feat: add manual datapoint creation routes"
```

---

### Task 10: Update public API to include fields and visibility filter

**Files:**
- Modify: `src/routes/api.ts`

- [ ] **Step 1: Update the GET /api/datapoints endpoint**

Replace the entire `src/routes/api.ts` with:

```typescript
import { Router, Request, Response } from 'express';
import { listDatapoints, getDatapoint, getStats } from '../db/datapoints';
import { getVisibleFields, getFieldsForDatapoint } from '../db/datapointFields';
import { SubmissionStatus } from '../types';

const router = Router();

// GET /api/datapoints — public, returns approved + visible datapoints with fields
router.get('/datapoints', (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const label = req.query.label as string | undefined;
  const search = req.query.q as string | undefined;
  const page = parseInt(req.query.page as string, 10) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string, 10) || 25, 100);
  const status = (req.query.status as SubmissionStatus) || 'approved';

  // Public requests: only approved + visible
  const result = listDatapoints({ status, category, search, page, perPage, visible: true });

  // Optionally filter by label client-side (labels are stored as JSON array)
  let items = result.items;
  if (label) {
    items = items.filter((d) => d.labels.includes(label as any));
  }

  // Attach visible fields to each datapoint
  const datapointsWithFields = items.map((dp) => {
    const fields = getVisibleFields(dp.id);
    return {
      ...dp,
      fields: fields.map((f) => ({
        fieldName: f.fieldName,
        displayName: f.displayName,
        sfFieldType: f.sfFieldType,
      })),
    };
  });

  res.json({
    datapoints: datapointsWithFields,
    total: label ? items.length : result.total,
    page,
    perPage,
  });
});

// GET /api/datapoints/:id — single datapoint with all fields
router.get('/datapoints/:id', (req: Request, res: Response) => {
  const dp = getDatapoint(req.params.id);
  if (!dp) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const fields = getFieldsForDatapoint(dp.id);
  res.json({
    ...dp,
    fields: fields.map((f) => ({
      fieldName: f.fieldName,
      displayName: f.displayName,
      sfFieldType: f.sfFieldType,
      visible: f.visible,
    })),
  });
});

// GET /api/stats — counts
router.get('/stats', (_req: Request, res: Response) => {
  res.json(getStats());
});

export default router;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/routes/api.ts
git commit -m "feat: include field data in public API, filter by visibility"
```

---

## Chunk 4: Admin UI Views

### Task 11: Update queue view with visibility toggle + Add Datapoint button

**Depends on:** Task 4 (adds `visible` field to `SubmissionWithMeta`)

**Files:**
- Modify: `src/views/queueView.ts`

- [ ] **Step 1: Update the queueView function signature**

The function currently receives `Submission[]`. We need the `visible` field from `SubmissionWithMeta`. Update the import and function:

Change the import at the top:
```typescript
import { Submission, SubmissionStatus } from '../types';
```
to:
```typescript
import { SubmissionStatus } from '../types';
import { SubmissionWithMeta } from '../db/datapoints';
```

Change function signature from `queueView(submissions: Submission[], flashMsg?: string)` to `queueView(submissions: SubmissionWithMeta[], flashMsg?: string)`.

- [ ] **Step 2: Add "Add Datapoint" button next to Sync button**

In the `page-header` section, add the "Add Datapoint" button before the sync form:

Replace the entire page-header block (lines ~96-110) with:

```typescript
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;">
      <h1 class="page-title">
        Review Queue
        ${pending > 0 ? `<span class="badge">${pending} pending</span>` : ''}
      </h1>
      <div style="display:flex;gap:8px;align-items:center;">
        <a href="/admin/new" class="btn btn-primary btn-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Datapoint
        </a>
        <form method="POST" action="/admin/sync" style="margin:0;">
          <button type="submit" class="btn btn-outline btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Sync from MotherDuck
          </button>
        </form>
      </div>
    </div>
```

- [ ] **Step 3: Add visibility toggle to each row**

Add a new column header "Visible" to the table and a toggle switch per row.

Update the `<colgroup>` to add a visible column:
```html
<colgroup>
  <col style="width:20%"/>
  <col style="width:12%"/>
  <col style="width:24%"/>
  <col style="width:10%"/>
  <col style="width:10%"/>
  <col style="width:12%"/>
  <col style="width:12%"/>
</colgroup>
```

Add `<th>Visible</th>` after the Status header.

In each row, add a visibility toggle cell before the action button:

```typescript
const visToggle = s.status === 'approved'
  ? `<label class="toggle-switch">
      <input type="checkbox" ${s.visible ? 'checked' : ''}
        onchange="toggleVis('${escapeHtml(s.id)}', this.checked)" />
      <span class="toggle-slider"></span>
    </label>`
  : `<span style="color:#ccc;font-size:11px;">—</span>`;
```

Add `<td style="text-align:center;">${visToggle}</td>` to each row after the status badge cell.

- [ ] **Step 4: Add toggle switch CSS and JavaScript**

Add to the `<style>` block:

```css
.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: #ddd; border-radius: 20px;
  transition: background 0.2s;
}
.toggle-slider::before {
  content: ''; position: absolute; width: 16px; height: 16px;
  left: 2px; bottom: 2px; background: #fff;
  border-radius: 50%; transition: transform 0.2s;
}
.toggle-switch input:checked + .toggle-slider { background: #2d7a4f; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(16px); }
```

Add a `<script>` block at the end of the body content (before closing):

```javascript
function toggleVis(id, visible) {
  fetch('/admin/datapoints/' + id + '/visibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visible: visible })
  }).then(r => {
    if (!r.ok) console.error('Failed to toggle visibility');
  }).catch(err => console.error('Toggle error:', err));
}
```

- [ ] **Step 5: Update admin.ts to pass SubmissionWithMeta to queueView**

In `src/routes/admin.ts`, update the GET /admin/queue handler. The `getAllSubmissions()` currently returns `Submission[]`. We need to change it to return data with the `visible` field.

In `src/db/datapoints.ts`, create a new function `getAllSubmissionsWithMeta`:

```typescript
export function getAllSubmissionsWithMeta(): SubmissionWithMeta[] {
  const db = getLocalDb();
  const rows = db.prepare('SELECT * FROM datapoints ORDER BY name ASC').all() as DatapointRow[];
  return rows.map(rowToSubmissionWithMeta);
}
```

In `src/routes/admin.ts`, update the import:
```typescript
import { getAllSubmissions, getDatapointWithMeta, getAllSubmissionsWithMeta } from '../db/datapoints';
```

Update the queue route:
```typescript
router.get('/queue', (req: Request, res: Response) => {
  const msg = req.query.msg as string | undefined;
  res.send(queueView(getAllSubmissionsWithMeta(), msg));
});
```

- [ ] **Step 6: Verify it compiles and renders**

Run: `npm run dev`
Navigate to `/admin/queue` — verify the toggle switches render, the "Add Datapoint" button appears.

- [ ] **Step 7: Commit**

```bash
git add src/views/queueView.ts src/db/datapoints.ts src/routes/admin.ts
git commit -m "feat: add visibility toggle and Add Datapoint button to admin queue"
```

---

### Task 12: Update review view with field configuration table

**Note:** The field config form uses bracket-notation field names (`fields[0][fieldName]`). This requires `express.urlencoded({ extended: true })`, which is already configured in `src/server.ts:29`.

**Files:**
- Modify: `src/views/reviewView.ts`

- [ ] **Step 1: Import field types and data**

Add to imports at top of `src/views/reviewView.ts`:

```typescript
import { SF_FIELD_TYPES, SfFieldType, DatapointField } from '../types';
```

Update the function signature. The caller (admin.ts) needs to pass fields. We'll update the `SubmissionWithMeta` data to include fields, or pass them separately.

Add a new parameter:

```typescript
export function reviewView(submission: SubmissionWithMeta, fields: DatapointField[]): string {
```

- [ ] **Step 2: Replace the Output Fields textarea with a Field Configuration table**

Find the existing output fields form group (the `<div class="form-group">` containing the `outputFields` textarea, around line 125-132). Replace it entirely with:

```typescript
            <div class="form-group">
              <label class="form-label">
                Field Configuration
                <span class="label-hint">Configure display names, SF types, and visibility per field</span>
              </label>
              <div class="field-config-table-wrap">
                <table class="field-config-table" id="fieldConfigTable">
                  <thead>
                    <tr>
                      <th style="width:25%;">Original Name</th>
                      <th style="width:25%;">Display Name</th>
                      <th style="width:22%;">SF Field Type</th>
                      <th style="width:13%;">Visible</th>
                      <th style="width:15%;">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${fields.map((f, i) => `
                      <tr>
                        <td>
                          <span class="field-tag" style="font-size:11px;">${escapeHtml(f.fieldName)}</span>
                          <input type="hidden" name="fields[${i}][fieldName]" value="${escapeHtml(f.fieldName)}" />
                        </td>
                        <td>
                          <input class="form-input" type="text" name="fields[${i}][displayName]"
                            value="${escapeHtml(f.displayName)}" style="padding:6px 8px;font-size:12px;" />
                        </td>
                        <td>
                          <select class="form-select" name="fields[${i}][sfFieldType]" style="padding:6px 8px;font-size:12px;">
                            ${SF_FIELD_TYPES.map((t) =>
                              `<option value="${t}"${t === f.sfFieldType ? ' selected' : ''}>${t}</option>`
                            ).join('')}
                          </select>
                        </td>
                        <td style="text-align:center;">
                          <input type="checkbox" name="fields[${i}][visible]" value="1"${f.visible ? ' checked' : ''}
                            style="width:16px;height:16px;accent-color:#2d7a4f;" />
                        </td>
                        <td>
                          <input class="form-input" type="number" name="fields[${i}][sortOrder]"
                            value="${f.sortOrder}" style="padding:6px 8px;font-size:12px;width:60px;" />
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                ${fields.length === 0 ? '<p style="color:#aaa;font-size:12px;padding:12px;">No fields configured yet. Add fields below or run a sync.</p>' : ''}
                <button type="button" class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="addFieldRow()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Field
                </button>
              </div>
            </div>
```

- [ ] **Step 3: Add field config table CSS**

Add to the `<style>` block:

```css
.field-config-table-wrap {
  background: #fafcfa; border: 1px solid #e8ece8;
  border-radius: 8px; overflow: hidden;
}
.field-config-table { width: 100%; border-collapse: collapse; }
.field-config-table thead th {
  background: #f0f2f0; color: #888; font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  padding: 8px 10px; text-align: left; border-bottom: 1px solid #e0e4e0;
}
.field-config-table tbody td {
  padding: 6px 10px; border-bottom: 1px solid #f0f2f0;
  vertical-align: middle; font-size: 12px;
}
.field-config-table tbody tr:last-child td { border-bottom: none; }
```

- [ ] **Step 4: Add JavaScript for addFieldRow and saving fields**

Add to the `<script>` block:

```javascript
let fieldRowCount = ${fields.length};

function addFieldRow() {
  const tbody = document.querySelector('#fieldConfigTable tbody');
  const i = fieldRowCount++;
  const tr = document.createElement('tr');
  tr.innerHTML = \`
    <td><input class="form-input" type="text" name="fields[\${i}][fieldName]" placeholder="field_name" style="padding:6px 8px;font-size:12px;" /></td>
    <td><input class="form-input" type="text" name="fields[\${i}][displayName]" placeholder="Display Name" style="padding:6px 8px;font-size:12px;" /></td>
    <td>
      <select class="form-select" name="fields[\${i}][sfFieldType]" style="padding:6px 8px;font-size:12px;">
        ${SF_FIELD_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('')}
      </select>
    </td>
    <td style="text-align:center;"><input type="checkbox" name="fields[\${i}][visible]" value="1" checked style="width:16px;height:16px;accent-color:#2d7a4f;" /></td>
    <td><input class="form-input" type="number" name="fields[\${i}][sortOrder]" value="\${i}" style="padding:6px 8px;font-size:12px;width:60px;" /></td>
  \`;
  tbody.appendChild(tr);
}
```

- [ ] **Step 5: Update the approve action in admin.ts to save field config**

In `src/routes/admin.ts`, inside the `action === 'approve'` block:

**First**, remove the existing `outputFields` parsing (lines ~43-47 that parse from textarea). The field config table replaces the textarea, so `body.outputFields` will be undefined. Remove:
```typescript
    const rawOutputFields = (body.outputFields as string) || '';
    const outputFields = rawOutputFields
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
```

And remove `outputFields` from the `updateSubmission` call.

**Then**, after saving the datapoint, add field config saving:

```typescript
    // Save field configuration from the field config table
    const existingFields = getFieldsForDatapoint(submission.id);
    const existingFieldNames = new Set(existingFields.map(f => f.fieldName));
    const fieldUpdates: FieldConfigUpdate[] = [];
    let fi = 0;
    while (body[`fields[${fi}][fieldName]`]) {
      const fieldName = body[`fields[${fi}][fieldName]`] as string;
      const displayName = (body[`fields[${fi}][displayName]`] as string) || fieldName;
      const sfFieldType = (body[`fields[${fi}][sfFieldType]`] as string as SfFieldType) || 'Text';
      const visible = body[`fields[${fi}][visible]`] === '1';
      const sortOrder = parseInt(body[`fields[${fi}][sortOrder]`] as string, 10) || fi;

      if (existingFieldNames.has(fieldName)) {
        fieldUpdates.push({ fieldName, displayName, sfFieldType, visible, sortOrder });
      } else {
        // New field added manually via "Add Field" button
        addFieldToDatapoint(submission.id, fieldName, displayName, sfFieldType);
        // Also update the newly added field's visible/sortOrder
        updateFieldConfig(submission.id, [{ fieldName, displayName, sfFieldType, visible, sortOrder }]);
      }
      fi++;
    }

    if (fieldUpdates.length > 0) {
      updateFieldConfig(submission.id, fieldUpdates);
    }
```

Import `getFieldsForDatapoint` at the top if not already present:
```typescript
import { getFieldsForDatapoint, updateFieldConfig, addField as addFieldToDatapoint, FieldConfigUpdate } from '../db/datapointFields';
```

- [ ] **Step 6: Update the review route to pass fields**

In `src/routes/admin.ts`, update the GET /admin/review/:id handler:

```typescript
import { getFieldsForDatapoint } from '../db/datapointFields';
```

```typescript
router.get('/review/:id', (req: Request, res: Response) => {
  const meta = getDatapointWithMeta(req.params.id);
  if (!meta) {
    res.status(404).send('Submission not found');
    return;
  }
  const fields = getFieldsForDatapoint(req.params.id);
  res.send(reviewView(meta, fields));
});
```

- [ ] **Step 7: Update preview panel to show fields with SF types**

In the preview section of `reviewView.ts`, replace the existing `previewFields` generation with field-config-aware preview. Replace:

```typescript
  const previewFields = submission.outputFields
    .map((f) => `<li><span class="field-tag">${escapeHtml(f)}</span></li>`)
    .join('\n');
```

With:

```typescript
  const previewFields = fields
    .filter((f) => f.visible)
    .map((f) => `<li>
      <span class="field-tag">${escapeHtml(f.displayName)}</span>
      <span class="sf-type-badge">${escapeHtml(f.sfFieldType)}</span>
    </li>`)
    .join('\n');
```

Add to the style block:
```css
.sf-type-badge {
  display: inline-flex; font-size: 9px; font-weight: 600;
  background: #eef2fc; color: #3a5fa0; border: 1px solid #b8c8ef;
  border-radius: 3px; padding: 1px 5px; margin-left: 4px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
```

- [ ] **Step 8: Verify it compiles and renders**

Run: `npm run dev`
Navigate to `/admin/review/<any-id>` — verify field config table renders with existing fields.

- [ ] **Step 9: Commit**

```bash
git add src/views/reviewView.ts src/routes/admin.ts
git commit -m "feat: replace output fields textarea with field configuration table"
```

---

### Task 13: Create new datapoint form view

**Files:**
- Create: `src/views/newDatapointView.ts`

- [ ] **Step 1: Write the new datapoint view**

```typescript
import { Category, Label, Source, SF_FIELD_TYPES } from '../types';
import { layout, escapeHtml } from './layout';

const ALL_LABELS: { value: Label; display: string }[] = [
  { value: 'company-identity',          display: 'Company Identity' },
  { value: 'location-geography',        display: 'Location & Geography' },
  { value: 'corporate-structure',       display: 'Corporate Structure' },
  { value: 'financial-profile',         display: 'Financial Profile' },
  { value: 'technology-infrastructure', display: 'Technology & Infrastructure' },
  { value: 'sales-marketing',           display: 'Sales & Marketing' },
  { value: 'workforce-people',          display: 'Workforce & People' },
  { value: 'hiring-talent',             display: 'Hiring & Talent' },
  { value: 'customer-support',          display: 'Customer Support' },
  { value: 'compliance-risk',           display: 'Compliance & Risk' },
  { value: 'ecommerce-retail',          display: 'E-commerce & Retail' },
  { value: 'operations',                display: 'Operations' },
  { value: 'industry-market',           display: 'Industry & Market' },
];

const ALL_CATEGORIES: Category[] = [
  'Entity Data', 'Firmographics', 'Technographics',
  'People Metrics', 'Hiring Signals', 'Custom Enrichment',
];

export function newDatapointView(): string {
  const categoryOptions = ALL_CATEGORIES.map((c) =>
    `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
  ).join('\n');

  const labelCheckboxes = ALL_LABELS.map((l) =>
    `<label class="label-checkbox">
      <input type="checkbox" name="labels" value="${l.value}" />
      <span class="sub-label lbl-${l.value}">${escapeHtml(l.display)}</span>
    </label>`
  ).join('\n');

  const body = `
    <div style="max-width:800px;">
      <div class="page-header">
        <h1 class="page-title">Add Datapoint</h1>
      </div>

      <div class="card" style="padding:0;">
        <div style="padding:20px 24px 16px;border-bottom:1px solid #eaeeea;">
          <h2 style="font-size:15px;font-weight:700;color:#1a1a1a;">New Datapoint</h2>
          <p style="font-size:12px;color:#999;margin-top:4px;">Manually add a datapoint to the catalogue. It will be created with "pending" status.</p>
        </div>

        <form method="POST" action="/admin/new" style="padding:20px 24px 24px;">

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="name">Datapoint Name</label>
              <input class="form-input" type="text" id="name" name="name" required placeholder="e.g. Company Revenue" />
            </div>
            <div class="form-group">
              <label class="form-label" for="category">Category</label>
              <select class="form-select" id="category" name="category">
                ${categoryOptions}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="description">Description</label>
            <textarea class="form-textarea" id="description" name="description" rows="4"
              placeholder="Describe what this datapoint captures..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="exampleValue">Example Value</label>
            <input class="form-input" type="text" id="exampleValue" name="exampleValue"
              placeholder="e.g. $10M - $50M ARR" />
          </div>

          <div class="form-group">
            <label class="form-label" for="source">Source</label>
            <select class="form-select" id="source" name="source">
              <option value="kernel">Kernel AI</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Labels</label>
            <div class="labels-grid">
              ${labelCheckboxes}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              Output Fields
              <span class="label-hint">Add fields this datapoint will produce</span>
            </label>
            <div class="field-config-table-wrap">
              <table class="field-config-table" id="fieldConfigTable">
                <thead>
                  <tr>
                    <th style="width:30%;">Field Name</th>
                    <th style="width:30%;">Display Name</th>
                    <th style="width:25%;">SF Field Type</th>
                    <th style="width:15%;"></th>
                  </tr>
                </thead>
                <tbody id="fieldTableBody"></tbody>
              </table>
              <button type="button" class="btn btn-outline btn-sm" style="margin:8px 10px;" onclick="addFieldRow()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Field
              </button>
            </div>
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:12px;border-top:1px solid #eaeeea;">
            <a href="/admin/queue" class="btn btn-outline">Cancel</a>
            <button type="submit" class="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Datapoint
            </button>
          </div>

        </form>
      </div>
    </div>

    <style>
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .labels-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 8px; padding: 12px; background: #fafcfa;
        border: 1px solid #e8ece8; border-radius: 8px;
      }
      .label-checkbox {
        display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px; border-radius: 6px;
      }
      .label-checkbox:hover { background: #f0f2f0; }
      .label-checkbox input[type="checkbox"] { width: 14px; height: 14px; accent-color: #2d7a4f; cursor: pointer; }
      .field-config-table-wrap {
        background: #fafcfa; border: 1px solid #e8ece8;
        border-radius: 8px; overflow: hidden;
      }
      .field-config-table { width: 100%; border-collapse: collapse; }
      .field-config-table thead th {
        background: #f0f2f0; color: #888; font-size: 10px; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.06em;
        padding: 8px 10px; text-align: left; border-bottom: 1px solid #e0e4e0;
      }
      .field-config-table tbody td {
        padding: 6px 10px; border-bottom: 1px solid #f0f2f0; vertical-align: middle;
      }
      @media (max-width: 860px) { .form-grid { grid-template-columns: 1fr; } }
    </style>

    <script>
      let fieldCount = 0;
      function addFieldRow() {
        const tbody = document.getElementById('fieldTableBody');
        const i = fieldCount++;
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td><input class="form-input" type="text" name="fieldName[]" placeholder="field_name" style="padding:6px 8px;font-size:12px;" /></td>' +
          '<td><input class="form-input" type="text" name="fieldDisplayName[]" placeholder="Display Name" style="padding:6px 8px;font-size:12px;" /></td>' +
          '<td><select class="form-select" name="fieldSfType[]" style="padding:6px 8px;font-size:12px;">' +
          ${JSON.stringify(SF_FIELD_TYPES.map((t) => `<option value="${t}">${t}</option>`).join(''))} +
          '</select></td>' +
          '<td style="text-align:center;"><button type="button" class="btn btn-outline btn-sm" onclick="this.closest(\\\'tr\\\').remove()" style="padding:4px 8px;font-size:11px;color:#a03a3a;">Remove</button></td>';
        tbody.appendChild(tr);
      }
      // Start with one empty row
      addFieldRow();
    </script>
  `;

  return layout('Add Datapoint', body);
}
```

- [ ] **Step 2: Verify it compiles and renders**

Run: `npm run dev`
Navigate to `/admin/new` — verify the form renders with field table.

- [ ] **Step 3: Commit**

```bash
git add src/views/newDatapointView.ts
git commit -m "feat: add new datapoint form view"
```

---

## Chunk 5: Public UI

### Task 14: Rewrite public/index.html to fetch dynamically

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Replace hardcoded table body with dynamic fetch**

Keep the existing HTML structure (navbar, toolbar, stats, table headers) but:

1. **Update table columns**: Replace "Example Output" with "SF Field Type". New column order:
   - Labels | Datapoint | Description | Output Fields | SF Field Type | Source | Updated

2. **Update colgroup widths**:
```html
<colgroup>
  <col style="width:11%;"/>
  <col style="width:13%;"/>
  <col style="width:22%;"/>
  <col style="width:17%;"/>
  <col style="width:14%;"/>
  <col style="width:9%;"/>
  <col style="width:7%;"/>
</colgroup>
```

3. **Update thead**:
```html
<thead>
  <tr>
    <th>Labels</th>
    <th>Datapoint</th>
    <th>Description</th>
    <th>Output Fields</th>
    <th>SF Field Type</th>
    <th>Source</th>
    <th>Updated</th>
  </tr>
</thead>
```

4. **Empty the `<tbody>`** — remove all hardcoded rows.

5. **Replace the `<script>` block** with dynamic fetching:

```javascript
let allDatapoints = [];
let activeLabelFilter = '';

async function loadDatapoints() {
  try {
    const res = await fetch('/api/datapoints?per_page=100');
    const data = await res.json();
    allDatapoints = data.datapoints || [];
    renderTable();
  } catch (err) {
    console.error('Failed to load datapoints:', err);
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('emptyState').textContent = 'Failed to load datapoints.';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const LABEL_DISPLAY = {
  'company-identity': 'Company Identity',
  'location-geography': 'Location & Geography',
  'corporate-structure': 'Corporate Structure',
  'financial-profile': 'Financial Profile',
  'technology-infrastructure': 'Technology & Infrastructure',
  'sales-marketing': 'Sales & Marketing',
  'workforce-people': 'Workforce & People',
  'hiring-talent': 'Hiring & Talent',
  'customer-support': 'Customer Support',
  'compliance-risk': 'Compliance & Risk',
  'ecommerce-retail': 'E-commerce & Retail',
  'operations': 'Operations',
  'industry-market': 'Industry & Market',
};

const CAT_COLOURS = {
  'Entity Data':        { dot: '#2d7a4f', bg: '#e8f5ee', text: '#2d7a4f' },
  'Firmographics':      { dot: '#e8923a', bg: '#fff3e8', text: '#c06c1a' },
  'Technographics':     { dot: '#6a8fc8', bg: '#eef2fc', text: '#3a5fa0' },
  'People Metrics':     { dot: '#9b6fc8', bg: '#f3eefb', text: '#6a3fa0' },
  'Hiring Signals':     { dot: '#c86a6a', bg: '#fbeee8', text: '#a03a3a' },
  'Custom Enrichment':  { dot: '#5aa8c8', bg: '#eaf6fb', text: '#2a7a9a' },
};

function setLabelFilter(label) {
  activeLabelFilter = activeLabelFilter === label ? '' : label;
  document.getElementById('labelFilter').value = activeLabelFilter;
  renderTable();
}

function filterTable() {
  activeLabelFilter = document.getElementById('labelFilter').value;
  renderTable();
}

function renderTable() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const catFilter = document.getElementById('categoryFilter').value;
  const labelFilter = activeLabelFilter;

  // Filter datapoints
  let filtered = allDatapoints.filter(dp => {
    if (catFilter && dp.category !== catFilter) return false;
    if (labelFilter && !(dp.labels || []).includes(labelFilter)) return false;
    if (query) {
      const text = (dp.name + ' ' + dp.description + ' ' + (dp.labels || []).join(' ')).toLowerCase();
      if (!text.includes(query)) return false;
    }
    return true;
  });

  // Group by category
  const categories = {};
  filtered.forEach(dp => {
    if (!categories[dp.category]) categories[dp.category] = [];
    categories[dp.category].push(dp);
  });

  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  const catOrder = ['Entity Data', 'Firmographics', 'Technographics', 'People Metrics', 'Hiring Signals', 'Custom Enrichment'];
  let totalVisible = 0;

  catOrder.forEach(cat => {
    const dps = categories[cat];
    if (!dps || dps.length === 0) return;

    const colours = CAT_COLOURS[cat] || CAT_COLOURS['Custom Enrichment'];

    // Category header row
    const catRow = document.createElement('tr');
    catRow.className = 'cat-row';
    catRow.innerHTML = '<td colspan="7"><div class="cat-row-inner"><span class="cat-label">' +
      '<span class="cat-dot" style="background:' + colours.dot + ';"></span>' +
      escapeHtml(cat) +
      ' <span class="cat-count" style="background:' + colours.bg + ';color:' + colours.text + ';">' + dps.length + '</span>' +
      '</span></div></td>';
    tbody.appendChild(catRow);

    dps.forEach(dp => {
      totalVisible++;
      const tr = document.createElement('tr');
      tr.className = 'data-row';

      // Labels cell
      const labelsHtml = (dp.labels || []).map(l =>
        '<span class="sub-label lbl-' + l + (activeLabelFilter === l ? ' active-filter' : '') +
        '" data-label="' + l + '" onclick="setLabelFilter(\'' + l + '\')">' +
        (LABEL_DISPLAY[l] || l) + '</span>'
      ).join('');

      // Fields cell — use display names from fields array
      const fields = dp.fields || [];
      const fieldsHtml = fields.length > 0
        ? '<ul class="fields-list">' + fields.map(f =>
            '<li><span class="field-tag">' + escapeHtml(f.displayName) + '</span></li>'
          ).join('') + '</ul>'
        : '<span style="color:#ccc;font-size:12px;">—</span>';

      // SF Type cell — show badges for each field's type
      const sfTypesHtml = fields.length > 0
        ? fields.map(f =>
            '<span class="sf-type-badge">' + escapeHtml(f.sfFieldType) + '</span>'
          ).join(' ')
        : '<span style="color:#ccc;font-size:12px;">—</span>';

      // Source badge
      const sourceBadge = dp.source === 'linkedin'
        ? '<span class="source-badge source-linkedin"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452H16.89v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a1.98 1.98 0 0 1-1.983-1.98 1.98 1.98 0 0 1 3.962 0 1.98 1.98 0 0 1-1.979 1.98zm1.961 13.019H3.374V9h3.924v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>LinkedIn</span>'
        : '<span class="source-badge source-kernel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Kernel AI</span>';

      tr.innerHTML =
        '<td><div class="sub-labels">' + labelsHtml + '</div></td>' +
        '<td><div class="dp-name">' + escapeHtml(dp.name) + '</div></td>' +
        '<td><span class="dp-desc">' + escapeHtml(dp.description) + '</span></td>' +
        '<td>' + fieldsHtml + '</td>' +
        '<td><div class="sf-types-cell">' + sfTypesHtml + '</div></td>' +
        '<td>' + sourceBadge + '</td>' +
        '<td class="date-cell">' + escapeHtml(dp.updatedDate || '') + '</td>';

      tbody.appendChild(tr);
    });
  });

  document.getElementById('totalCount').textContent = totalVisible;
  document.getElementById('emptyState').style.display = totalVisible === 0 ? 'block' : 'none';
}

// Initial load
loadDatapoints();
```

6. **Add SF type badge CSS** to the existing `<style>` block:

```css
.sf-type-badge {
  display: inline-flex; font-size: 9px; font-weight: 600;
  background: #eef2fc; color: #3a5fa0; border: 1px solid #b8c8ef;
  border-radius: 3px; padding: 2px 5px; margin: 1px 2px;
  text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
}
.sf-types-cell { display: flex; flex-wrap: wrap; gap: 3px; }
```

- [ ] **Step 2: Verify it works end-to-end**

Run: `npm run dev`
1. Navigate to `/` — should see dynamic data (only approved + visible datapoints)
2. Approve a datapoint in admin and toggle visibility on
3. Refresh `/` — datapoint should appear with fields and SF types

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: replace hardcoded catalogue with dynamic API fetch, add SF type column"
```

---

## Post-Implementation Verification

After all tasks are complete:

- [ ] **Start the dev server**: `npm run dev`
- [ ] **Run a sync**: Click "Sync from MotherDuck" or `npm run sync`
- [ ] **Verify datapoint_fields populated**: Check SQLite `SELECT * FROM datapoint_fields LIMIT 5`
- [ ] **Approve a datapoint**: Go to `/admin/review/<id>`, verify field config table shows, approve
- [ ] **Toggle visibility**: On queue page, toggle visibility on for the approved datapoint
- [ ] **Check public UI**: Navigate to `/` — verify the datapoint appears with fields and SF types
- [ ] **Create manual datapoint**: Go to `/admin/new`, fill in form with fields, verify it appears in queue
- [ ] **Verify API**: `curl localhost:3000/api/datapoints | jq` — should show only approved+visible with fields
