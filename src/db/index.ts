import { Database } from 'node-sqlite3-wasm';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

const dir = path.dirname(config.db.path);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(config.db.path);

// Schema bootstrap. Setiap statement dijalankan terpisah karena beberapa
// driver SQLite WASM hanya support single-statement per exec().
const STMTS = [
  `CREATE TABLE IF NOT EXISTS transactions (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     notif_id      TEXT    NOT NULL UNIQUE,
     source        TEXT    NOT NULL,
     bank          TEXT    NOT NULL,
     jenis         TEXT    NOT NULL CHECK (jenis IN ('in','out')),
     amount        INTEGER NOT NULL,
     currency      TEXT    NOT NULL DEFAULT 'IDR',
     merchant      TEXT,
     category      TEXT,
     channel       TEXT,
     reference     TEXT,
     occurred_at   TEXT    NOT NULL,
     raw_title     TEXT,
     raw_text      TEXT,
     created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_tx_occurred ON transactions(occurred_at)`,
  `CREATE INDEX IF NOT EXISTS idx_tx_jenis    ON transactions(jenis)`,
  `CREATE INDEX IF NOT EXISTS idx_tx_merchant ON transactions(merchant)`,
  `CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)`,
];
for (const s of STMTS) db.exec(s);

export function getKV(k: string): string | undefined {
  const row = db.prepare('SELECT v FROM kv WHERE k = :k').get({ k }) as { v: string } | undefined;
  return row?.v;
}

export function setKV(k: string, v: string) {
  db.prepare(
    'INSERT INTO kv(k,v) VALUES(:k,:v) ON CONFLICT(k) DO UPDATE SET v=excluded.v',
  ).run({ k, v });
}
