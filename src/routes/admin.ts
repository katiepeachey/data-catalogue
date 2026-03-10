import { Router, Request, Response } from 'express';
import requireAuth from '../middleware/requireAuth';
import { submissions, getSubmission, updateSubmission } from '../store';
import { queueView } from '../views/queueView';
import { reviewView } from '../views/reviewView';
import { sendRejectionNotification } from '../slack';
import { Category, Label, Source } from '../types';

const router = Router();

router.use(requireAuth);

// GET /admin/queue
router.get('/queue', (req: Request, res: Response) => {
  const msg = req.query.msg as string | undefined;
  res.send(queueView(submissions, msg));
});

// GET /admin/review/:id
router.get('/review/:id', (req: Request, res: Response) => {
  const submission = getSubmission(req.params.id);
  if (!submission) {
    res.status(404).send('Submission not found');
    return;
  }
  res.send(reviewView(submission));
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
    // Parse outputFields: from textarea, each line is a field
    const rawOutputFields = (body.outputFields as string) || '';
    const outputFields = rawOutputFields
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

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
      outputFields,
      exampleValue: (body.exampleValue as string) || submission.exampleValue,
      exampleEvidence:
        (body.exampleEvidence as string) || submission.exampleEvidence,
      exampleUrl: (body.exampleUrl as string) || submission.exampleUrl,
      source: (body.source as Source) || submission.source,
      labels,
      updatedDate: (body.updatedDate as string) || submission.updatedDate,
      status: 'approved',
    });

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

export default router;
