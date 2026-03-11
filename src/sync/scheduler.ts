import * as cron from 'node-cron';
import { syncFromMotherDuck } from './syncFromMotherDuck';

let task: ReturnType<typeof cron.schedule> | null = null;

/**
 * Start the daily sync schedule.
 * Default: 6:00 AM UTC daily. Override with SYNC_CRON env var.
 */
export function startSyncScheduler(): void {
  const cronExpr = process.env.SYNC_CRON || '0 6 * * *';

  if (!cron.validate(cronExpr)) {
    console.error(`Invalid SYNC_CRON expression: ${cronExpr}`);
    return;
  }

  task = cron.schedule(cronExpr, async () => {
    console.log(`[${new Date().toISOString()}] Scheduled sync starting...`);
    try {
      const result = await syncFromMotherDuck();
      console.log(
        `[${new Date().toISOString()}] Scheduled sync complete: ` +
        `${result.datapointsCreated} created, ${result.datapointsUpdated} updated`
      );
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Scheduled sync failed:`, err);
    }
  });

  console.log(`Sync scheduler started (cron: ${cronExpr})`);
}

export function stopSyncScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('Sync scheduler stopped');
  }
}
