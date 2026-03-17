import { getLocalDb } from './local';

export type HelptextMap = Record<string, string>;

export function getColumnHelptext(): HelptextMap {
  const db = getLocalDb();
  const rows = db.prepare('SELECT column_key, helptext FROM column_helptext').all() as { column_key: string; helptext: string }[];
  const map: HelptextMap = {};
  for (const row of rows) {
    map[row.column_key] = row.helptext;
  }
  return map;
}

export function setColumnHelptext(columnKey: string, helptext: string): void {
  const db = getLocalDb();
  db.prepare('INSERT OR REPLACE INTO column_helptext (column_key, helptext) VALUES (?, ?)').run(columnKey, helptext);
}
