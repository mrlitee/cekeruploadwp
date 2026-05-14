import { db } from './index';

export interface TxInput {
  notif_id: string;
  source: 'android' | 'wa' | 'manual';
  bank: string;
  jenis: 'in' | 'out';
  amount: number;
  currency?: string;
  merchant?: string;
  channel?: string;
  reference?: string;
  occurred_at: string;
  raw_title?: string;
  raw_text?: string;
}

export interface TxRow extends TxInput {
  id: number;
  category: string | null;
  created_at: string;
}

export function insertTx(t: TxInput): { inserted: boolean; id?: number } {
  try {
    const stmt = db.prepare(`
      INSERT INTO transactions
        (notif_id, source, bank, jenis, amount, currency, merchant, channel, reference, occurred_at, raw_title, raw_text)
      VALUES (@notif_id, @source, @bank, @jenis, @amount, @currency, @merchant, @channel, @reference, @occurred_at, @raw_title, @raw_text)
    `);
    const r = stmt.run({
      currency: 'IDR',
      merchant: null,
      channel: null,
      reference: null,
      raw_title: null,
      raw_text: null,
      ...t,
    });
    return { inserted: true, id: Number(r.lastInsertRowid) };
  } catch (e: any) {
    if (String(e?.message || '').includes('UNIQUE')) return { inserted: false };
    throw e;
  }
}

export function listTx(fromIso: string, toIso: string, jenis?: 'in' | 'out'): TxRow[] {
  const sql = `
    SELECT * FROM transactions
    WHERE occurred_at >= ? AND occurred_at <= ?
    ${jenis ? 'AND jenis = ?' : ''}
    ORDER BY occurred_at DESC
  `;
  const params: any[] = [fromIso, toIso];
  if (jenis) params.push(jenis);
  return db.prepare(sql).all(...params) as TxRow[];
}

export function summary(fromIso: string, toIso: string) {
  const r = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN jenis='in'  THEN amount END),0) AS total_in,
        COALESCE(SUM(CASE WHEN jenis='out' THEN amount END),0) AS total_out,
        COUNT(*) AS n
       FROM transactions
       WHERE occurred_at >= ? AND occurred_at <= ?`,
    )
    .get(fromIso, toIso) as { total_in: number; total_out: number; n: number };
  return r;
}

export function topMerchants(fromIso: string, toIso: string, limit = 10) {
  return db
    .prepare(
      `SELECT COALESCE(merchant,'(tanpa nama)') AS merchant,
              SUM(amount) AS total,
              COUNT(*)   AS n
       FROM transactions
       WHERE jenis='out' AND occurred_at >= ? AND occurred_at <= ?
       GROUP BY merchant
       ORDER BY total DESC
       LIMIT ?`,
    )
    .all(fromIso, toIso, limit) as { merchant: string; total: number; n: number }[];
}
