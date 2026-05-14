import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

const dir = path.dirname(config.db.path);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(config.db.path);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  notif_id      TEXT    NOT NULL UNIQUE,           -- hash unik dari notif (anti-duplikat)
  source        TEXT    NOT NULL,                  -- 'android' | 'wa' | 'manual'
  bank          TEXT    NOT NULL,                  -- BCA, MANDIRI, BNI, BRI, ...
  jenis         TEXT    NOT NULL CHECK (jenis IN ('in','out')),
  amount        INTEGER NOT NULL,                  -- rupiah integer
  currency      TEXT    NOT NULL DEFAULT 'IDR',
  merchant      TEXT,                              -- nama outlet / counterparty
  category      TEXT,                              -- (opsional)
  channel       TEXT,                              -- QRIS, TRANSFER, DEBIT, EWALLET, ...
  reference     TEXT,
  occurred_at   TEXT    NOT NULL,                  -- ISO8601
  raw_title     TEXT,
  raw_text      TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_occurred ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_tx_jenis    ON transactions(jenis);
CREATE INDEX IF NOT EXISTS idx_tx_merchant ON transactions(merchant);

CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT
);
`);

export function getKV(k: string): string | undefined {
  const row = db.prepare('SELECT v FROM kv WHERE k=?').get(k) as { v: string } | undefined;
  return row?.v;
}

export function setKV(k: string, v: string) {
  db.prepare('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k, v);
}
