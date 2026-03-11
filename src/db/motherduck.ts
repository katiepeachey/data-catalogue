import duckdb from 'duckdb';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance: duckdb.Database | null = null;

function getDb(): duckdb.Database {
  if (!dbInstance) {
    const DATABASE = process.env.MOTHERDUCK_DATABASE;
    const TOKEN = process.env.MD_SERVICE_ACCOUNT_ACCESS_TOKEN;
    if (!DATABASE || !TOKEN) {
      throw new Error('Missing MOTHERDUCK_DATABASE or MD_SERVICE_ACCOUNT_ACCESS_TOKEN in .env');
    }
    const CONNECTION_STRING = `md:${DATABASE}?motherduck_token=${TOKEN}`;
    dbInstance = new duckdb.Database(CONNECTION_STRING);
  }
  return dbInstance;
}

export function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const conn = db.connect();
    conn.all(sql, (err: Error | null, rows: unknown) => {
      if (err) {
        reject(err);
      } else {
        resolve((rows as T[]) ?? []);
      }
    });
  });
}

export function close(): Promise<void> {
  return new Promise((resolve) => {
    if (dbInstance) {
      dbInstance.close(() => {
        dbInstance = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
