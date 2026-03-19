import { Router, Request, Response } from 'express';
import requireAuth from '../middleware/requireAuth';
import { getSubmission, updateSubmission } from '../store';
import { getAllSubmissionsWithMeta, getDatapointWithMeta, toggleVisibility } from '../db/datapoints';
import { getFieldsForDatapoint, updateFieldConfig, addField as addFieldToDatapoint, FieldConfigUpdate } from '../db/datapointFields';
import { getLocalDb } from '../db/local';
import { getAllCleaningFields, getCleaningFieldsByIds } from '../db/cleaningFields';
import { queueView } from '../views/queueView';
import { reviewView } from '../views/reviewView';
import { newDatapointView } from '../views/newDatapointView';
import { helptextView } from '../views/helptextView';
import { fieldBuilderView, EnrichmentDatapoint } from '../views/fieldBuilderView';
import { getColumnHelptext, setColumnHelptext } from '../db/columnHelptext';
import { sendRejectionNotification } from '../slack';
import { Category, Label, Source, SfFieldType, DatapointField } from '../types';

const router = Router();

router.use(requireAuth);

// GET /admin/queue
router.get('/queue', (req: Request, res: Response) => {
  const msg = req.query.msg as string | undefined;
  res.send(queueView(getAllSubmissionsWithMeta(), msg));
});

// GET /admin/review/:id
router.get('/review/:id', (req: Request, res: Response) => {
  const meta = getDatapointWithMeta(req.params.id);
  if (!meta) {
    res.status(404).send('Submission not found');
    return;
  }
  const fields = getFieldsForDatapoint(req.params.id);
  res.send(reviewView(meta, fields));
});

// POST /admin/review/:id
router.post('/review/:id', async (req: Request, res: Response) => {
  const submission = getSubmission(req.params.id);
  if (!submission) {
    res.status(404).send('Submission not found');
    return;
  }

  const body = req.body as Record<string, string | string[]>;
  const action = body._action as string;

  if (action === 'approve') {
    // Parse labels: comes as array from checkboxes (or single string or undefined)
    let labels: Label[] = [];
    if (Array.isArray(body.labels)) {
      labels = body.labels as Label[];
    } else if (typeof body.labels === 'string' && body.labels) {
      labels = [body.labels as Label];
    }

    const autoDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    updateSubmission(submission.id, {
      name: (body.name as string) || submission.name,
      category: (body.category as Category) || submission.category,
      description: (body.description as string) || submission.description,
      exampleValue: (body.exampleValue as string) ?? submission.exampleValue,
      exampleEvidence: (body.exampleEvidence as string) ?? submission.exampleEvidence,
      exampleUrl: (body.exampleUrl as string) ?? submission.exampleUrl,
      source: (body.source as Source) || submission.source,
      labels,
      updatedDate: autoDate,
      status: 'approved',
    });

    // Save field configuration — Express extended:true parses fields[i][key] as body.fields[i].key
    const rawFields = ((req.body as any).fields as Array<{
      fieldName?: string;
      displayName?: string;
      sfFieldType?: string;
      dynamicsFieldType?: string;
      fieldLength?: string;
      helpText?: string;
      visible?: string;
      sortOrder?: string;
      exampleValue?: string;
    }>) || [];

    const existingFields = getFieldsForDatapoint(submission.id);
    const existingFieldNames = new Set(existingFields.map((f: DatapointField) => f.fieldName));
    const fieldUpdates: FieldConfigUpdate[] = [];

    for (let fi = 0; fi < rawFields.length; fi++) {
      const rf = rawFields[fi];
      if (!rf || !rf.fieldName) continue;
      const fieldName = rf.fieldName;
      const displayName = rf.displayName || fieldName;
      const sfFieldType = (rf.sfFieldType as SfFieldType) || 'Text';
      const dynamicsFieldType = rf.dynamicsFieldType || '';
      const fieldLengthParsed = parseInt(rf.fieldLength ?? '', 10);
      const fieldLength = isNaN(fieldLengthParsed) ? null : fieldLengthParsed;
      const helpText = rf.helpText || '';
      const visible = rf.visible === '1';
      const sortOrderParsed = parseInt(rf.sortOrder ?? '', 10);
      const sortOrder = isNaN(sortOrderParsed) ? fi : sortOrderParsed;
      const exampleValue = rf.exampleValue || null;

      if (existingFieldNames.has(fieldName)) {
        fieldUpdates.push({ fieldName, displayName, sfFieldType, dynamicsFieldType, fieldLength, helpText, visible, sortOrder, exampleValue });
      } else {
        // New field added manually via "Add Field" button
        addFieldToDatapoint(submission.id, fieldName, displayName, sfFieldType, exampleValue);
        updateFieldConfig(submission.id, [{ fieldName, displayName, sfFieldType, dynamicsFieldType, fieldLength, helpText, visible, sortOrder, exampleValue }]);
      }
    }

    if (fieldUpdates.length > 0) {
      updateFieldConfig(submission.id, fieldUpdates);
    }

    res.redirect('/admin/queue?msg=Datapoint+approved+successfully');
  } else if (action === 'reject') {
    const rejectionReason = (body.rejectionReason as string) || 'No reason provided';

    updateSubmission(submission.id, {
      status: 'rejected',
      rejectionReason,
    });

    await sendRejectionNotification(submission, rejectionReason);

    res.redirect('/admin/queue?msg=Datapoint+rejected');
  } else {
    res.redirect(`/admin/review/${submission.id}`);
  }
});

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
  addFieldToDatapoint(req.params.id, fieldName, displayName, sfFieldType || 'Text');
  res.json({ ok: true });
});

// GET /admin/helptext — render helptext edit page
router.get('/helptext', (_req: Request, res: Response) => {
  const msg = _req.query.msg as string | undefined;
  res.send(helptextView(getColumnHelptext(), msg));
});

// POST /admin/helptext — save helptext values
router.post('/helptext', (req: Request, res: Response) => {
  const body = req.body as Record<string, string | string[]>;
  const keys = Array.isArray(body._keys) ? body._keys : (body._keys ? [body._keys] : []);
  for (const key of keys) {
    setColumnHelptext(key as string, (body[key as string] as string) || '');
  }
  res.redirect('/admin/helptext?msg=Helptext+saved+successfully');
});

// GET /admin/new — render manual add form
router.get('/new', (_req: Request, res: Response) => {
  res.send(newDatapointView());
});

// POST /admin/new — create new datapoint with fields
router.post('/new', (req: Request, res: Response) => {
  const body = req.body as Record<string, string | string[]>;
  const db = getLocalDb();

  const id = `manual_${Date.now()}`;

  let labels: string[] = [];
  if (Array.isArray(body.labels)) {
    labels = body.labels;
  } else if (typeof body.labels === 'string' && body.labels) {
    labels = [body.labels];
  }

  const updatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Possible values: free text example or rigid schema options
  // Express extended:true parses name[] as body.name (array)
  const ba = req.body as any;
  let classifierOptionsSample: string | null = null;
  if (body.valueMode === 'schema') {
    const optNames: string[] = Array.isArray(ba.optionName) ? ba.optionName : (ba.optionName ? [ba.optionName] : []);
    const opts = optNames.filter((n: string) => (n || '').trim()).map((n: string) => ({ name: n.trim() }));
    if (opts.length > 0) classifierOptionsSample = JSON.stringify({ options: opts });
  }

  db.prepare(`
    INSERT INTO datapoints (
      id, name, category, description,
      output_fields, example_value, example_evidence, example_url,
      source, labels, updated_date, status, submitted_at, visible,
      auto_name, auto_description, auto_category, auto_labels, auto_output_fields,
      admin_edited,
      producing_agents, classifier_info, agent_types, agent_statuses,
      classifier_options_sample
    ) VALUES (
      ?, ?, ?, ?,
      '[]', ?, '', '',
      ?, ?, ?, 'pending', datetime('now'), 0,
      ?, ?, ?, ?, '[]',
      1,
      '[]', '[]', '[]', '[]',
      ?
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
    classifierOptionsSample,
  );

  // Parse and insert fields — Express extended:true parses fieldName[] as body.fieldName
  const fieldNames: string[] = Array.isArray(ba.fieldName) ? ba.fieldName : (ba.fieldName ? [ba.fieldName] : []);
  const fieldDisplayNames: string[] = Array.isArray(ba.fieldDisplayName) ? ba.fieldDisplayName : (ba.fieldDisplayName ? [ba.fieldDisplayName] : []);
  const fieldSfTypes: string[] = Array.isArray(ba.fieldSfType) ? ba.fieldSfType : (ba.fieldSfType ? [ba.fieldSfType] : []);
  const fieldExamples: string[] = Array.isArray(ba.fieldExample) ? ba.fieldExample : (ba.fieldExample ? [ba.fieldExample] : []);

  for (let i = 0; i < fieldNames.length; i++) {
    const fn = (fieldNames[i] || '').trim();
    if (!fn) continue;
    const dn = (fieldDisplayNames[i] || fn).trim();
    const st = (fieldSfTypes[i] || 'Text') as SfFieldType;
    const exampleValue = (fieldExamples[i] || '').trim() || null;
    addFieldToDatapoint(id, fn, dn, st, exampleValue);
  }

  res.redirect('/admin/queue?msg=Datapoint+created+successfully');
});

// ─── Field Builder ─────────────────────────────────────────────────────────

function getEnrichmentDatapoints(): EnrichmentDatapoint[] {
  const db = getLocalDb();
  const rows = db.prepare(
    `SELECT id, name, category FROM datapoints
     WHERE status = 'approved' AND visible = 1
     ORDER BY category ASC, name ASC`
  ).all() as { id: string; name: string; category: string }[];

  return rows.map((dp) => {
    const fields = getFieldsForDatapoint(dp.id)
      .filter((f: DatapointField) => f.visible)
      .map((f: DatapointField) => ({
        fieldName: f.fieldName,
        displayName: f.displayName,
        sfFieldType: f.sfFieldType,
        dynamicsFieldType: f.dynamicsFieldType,
        fieldLength: f.fieldLength,
        helpText: f.helpText,
      }));
    return { id: dp.id, name: dp.name, category: dp.category, fields };
  });
}

// GET /admin/field-builder
router.get('/field-builder', (_req: Request, res: Response) => {
  const fieldsByCrm = getAllCleaningFields();
  const datapoints = getEnrichmentDatapoints();
  res.send(fieldBuilderView(fieldsByCrm, datapoints));
});

// POST /admin/field-builder/export
router.post('/field-builder/export', (req: Request, res: Response) => {
  const body = req.body as Record<string, string | string[]>;
  const crmType = (body.crm_type as string) || 'salesforce';

  const rawCleaning = body.selected_cleaning;
  const selectedCleaningIds: string[] = Array.isArray(rawCleaning)
    ? rawCleaning
    : rawCleaning ? [rawCleaning] : [];

  const rawEnrichment = body.selected_enrichment;
  const selectedEnrichmentIds: string[] = Array.isArray(rawEnrichment)
    ? rawEnrichment
    : rawEnrichment ? [rawEnrichment] : [];

  const isSalesforce = crmType === 'salesforce';

  function exportFieldName(fieldName: string): string {
    return isSalesforce ? `${fieldName}__c` : fieldName;
  }

  function enrichmentFieldType(field: { sfFieldType: string; dynamicsFieldType: string }): string {
    if (isSalesforce) return field.sfFieldType;
    return field.dynamicsFieldType || field.sfFieldType;
  }

  // Build CSV rows
  const csvRows: string[][] = [];

  // Header
  csvRows.push(['Module', 'Label', 'Field Name', 'SF Field Type', 'Length', 'Help Text', 'Priority']);

  // Cleaning fields — ordered required → recommended → optional
  if (selectedCleaningIds.length > 0) {
    const cleaningFields = getCleaningFieldsByIds(selectedCleaningIds)
      .filter((f) => f.crmType === crmType);

    const order = ['required', 'recommended', 'optional'];
    cleaningFields.sort((a, b) => {
      const ai = order.indexOf(a.category);
      const bi = order.indexOf(b.category);
      if (ai !== bi) return ai - bi;
      return a.displayOrder - b.displayOrder;
    });

    for (const f of cleaningFields) {
      csvRows.push([
        'CRM Cleaning',
        f.label,
        exportFieldName(f.fieldName),
        f.fieldType,
        f.fieldLength != null ? String(f.fieldLength) : '',
        f.helpText,
        f.category.charAt(0).toUpperCase() + f.category.slice(1),
      ]);
    }
  }

  // Enrichment fields
  if (selectedEnrichmentIds.length > 0) {
    const allDatapoints = getEnrichmentDatapoints();
    const selectedDps = allDatapoints.filter((dp) => selectedEnrichmentIds.includes(dp.id));

    for (const dp of selectedDps) {
      for (const field of dp.fields) {
        csvRows.push([
          'Enrichment',
          field.displayName,
          exportFieldName(field.fieldName),
          enrichmentFieldType(field),
          field.fieldLength != null ? String(field.fieldLength) : '',
          field.helpText,
          'Recommended',
        ]);
      }
    }
  }

  // Escape CSV cell
  function csvCell(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  const csv = csvRows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const today = new Date().toISOString().slice(0, 10);
  const filename = `kernel_field_set_${crmType}_${today}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export default router;
