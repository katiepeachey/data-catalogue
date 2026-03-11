import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', '..', 'data', 'catalogue.db');

let dbInstance: Database.Database | null = null;

export function getLocalDb(): Database.Database {
  if (!dbInstance) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

export function closeLocalDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
