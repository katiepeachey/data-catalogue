import { Router, Request, Response } from 'express';
import requireAuth from '../middleware/requireAuth';
import { getSubmission, updateSubmission } from '../store';
import { getAllSubmissionsWithMeta, getDatapointWithMeta, toggleVisibility } from '../db/datapoints';
import { getFieldsForDatapoint, updateFieldConfig, addField as addFieldToDatapoint, FieldConfigUpdate } from '../db/datapointFields';
import { getLocalDb } from '../db/local';
import { queueView } from '../views/queueView';
import { reviewView } from '../views/reviewView';
import { newDatapointView } from '../views/newDatapointView';
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

    updateSubmission(submission.id, {
      name: (body.name as string) || submission.name,
      category: (body.category as Category) || submission.category,
      description: (body.description as string) || submission.description,
      exampleValue: (body.exampleValue as string) || submission.exampleValue,
      exampleEvidence:
        (body.exampleEvidence as string) || submission.exampleEvidence,
      exampleUrl: (body.exampleUrl as string) || submission.exampleUrl,
      source: (body.source as Source) || submission.source,
      labels,
      updatedDate: (body.updatedDate as string) || submission.updatedDate,
      status: 'approved',
    });

    // Save field configuration from the field config table
    const existingFields = getFieldsForDatapoint(submission.id);
    const existingFieldNames = new Set(existingFields.map((f: DatapointField) => f.fieldName));
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
        updateFieldConfig(submission.id, [{ fieldName, displayName, sfFieldType, visible, sortOrder }]);
      }
      fi++;
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

export default router;
