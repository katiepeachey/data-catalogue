CREATE TABLE IF NOT EXISTS flow_whitelist (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id     INTEGER NOT NULL UNIQUE,
  label       TEXT,
  added_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
