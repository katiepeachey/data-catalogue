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
        exampleValue: f.exampleValue || null,
      })),
      classifierOptionsSample: dp.classifierOptionsSample || null,
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
