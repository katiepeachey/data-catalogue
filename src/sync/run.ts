import { runMigrations } from '../db/migrate';
import { syncFromMotherDuck } from './syncFromMotherDuck';
import { close as closeMd } from '../db/motherduck';
import { closeLocalDb } from '../db/local';

async function main() {
  console.log('Running migrations...');
  runMigrations();

  console.log('Starting sync from MotherDuck...');
  const result = await syncFromMotherDuck();

  console.log('\n=== Sync Summary ===');
  console.log(`Fields fetched:       ${result.fieldsFetched}`);
  console.log(`Datapoints created:   ${result.datapointsCreated}`);
  console.log(`Datapoints updated:   ${result.datapointsUpdated}`);
  console.log(`Datapoints unchanged: ${result.datapointsUnchanged}`);

  await closeMd();
  closeLocalDb();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
