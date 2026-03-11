import { Router, Request, Response } from 'express';
import requireAuth from '../middleware/requireAuth';
import { syncFromMotherDuck } from '../sync/syncFromMotherDuck';
import { getLocalDb } from '../db/local';

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

// GET /admin/sync/history — recent sync runs
router.get('/sync/history', (_req: Request, res: Response) => {
  const db = getLocalDb();
  const history = db.prepare(
    `SELECT * FROM sync_log ORDER BY id DESC LIMIT 20`
  ).all();

  res.json({ history });
});

export default router;
