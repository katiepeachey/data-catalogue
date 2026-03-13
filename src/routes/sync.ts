import { Router, Request, Response } from 'express';
import requireAuth from '../middleware/requireAuth';
import { syncFromMotherDuck } from '../sync/syncFromMotherDuck';
import { getLocalDb } from '../db/local';
import { syncConfigView, FlowEntry } from '../views/syncConfigView';

const router = Router();

router.use(requireAuth);

// POST /admin/sync — trigger a manual sync
router.post('/sync', async (_req: Request, res: Response) => {
  try {
    const result = await syncFromMotherDuck();
    res.redirect(
      `/admin/queue?msg=Sync+complete:+${result.datapointsCreated}+created,+${result.datapointsUpdated}+updated`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.redirect(`/admin/queue?msg=Sync+failed:+${encodeURIComponent(msg)}`);
  }
});

// GET /admin/sync/status — last sync info + schedule
router.get('/sync/status', (_req: Request, res: Response) => {
  const db = getLocalDb();
  const lastSync = db.prepare(
    `SELECT * FROM sync_log ORDER BY id DESC LIMIT 1`
  ).get() as Record<string, unknown> | undefined;

  res.json({
    lastSync: lastSync || null,
    schedule: process.env.SYNC_CRON || '0 6 * * *',
  });
});

// GET /admin/sync-config — manage flow whitelist
router.get('/sync-config', (req: Request, res: Response) => {
  const db = getLocalDb();
  const flows = db.prepare('SELECT * FROM flow_whitelist ORDER BY added_at DESC').all() as FlowEntry[];
  const msg = req.query.msg as string | undefined;
  res.send(syncConfigView(flows, msg));
});

// POST /admin/sync-config/add
router.post('/sync-config/add', (req: Request, res: Response) => {
  const db = getLocalDb();
  const raw = ((req.body as any).flowInput as string || '').trim();
  const label = ((req.body as any).label as string || '').trim() || null;

  // Accept "workflows/44575", "tools/configs/...", or plain "44575"
  const match = raw.match(/(\d+)[^\/]*$/);
  const flowId = match ? parseInt(match[1], 10) : NaN;

  if (!flowId || isNaN(flowId)) {
    const flows = db.prepare('SELECT * FROM flow_whitelist ORDER BY added_at DESC').all() as FlowEntry[];
    return res.send(syncConfigView(flows, 'Invalid flow ID — paste the URL path or a numeric ID'));
  }

  try {
    db.prepare('INSERT OR IGNORE INTO flow_whitelist (flow_id, label) VALUES (?, ?)').run(flowId, label);
    res.redirect('/admin/sync-config?msg=Flow+' + flowId + '+added.+Run+a+sync+to+pull+it+in.');
  } catch {
    res.redirect('/admin/sync-config?msg=Failed+to+add+flow');
  }
});

// POST /admin/sync-config/remove
router.post('/sync-config/remove', (req: Request, res: Response) => {
  const db = getLocalDb();
  const id = parseInt((req.body as any).id as string, 10);
  db.prepare('DELETE FROM flow_whitelist WHERE id = ?').run(id);
  res.redirect('/admin/sync-config?msg=Flow+removed');
});

// GET /admin/sync/history — recent sync runs
router.get('/sync/history', (_req: Request, res: Response) => {
  const db = getLocalDb();
  const history = db.prepare(
    `SELECT * FROM sync_log ORDER BY id DESC LIMIT 20`
  ).all();

  res.json({ history });
});

export default router;
