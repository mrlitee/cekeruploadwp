import crypto from 'crypto';
import { dispatch } from './dispatcher';
import { RawNotif, ParsedTx } from './parsers/types';
import { insertTx } from '../db/transactions';
import { logger } from '../utils/logger';

export type OnNewTx = (tx: ParsedTx) => void;

export class Ingest {
  constructor(private onNewTx?: OnNewTx) {}

  /**
   * Proses 1 notif mentah:
   *  - Jalankan dispatcher (cocokkan ke parser bank)
   *  - Insert ke DB (anti-duplikat via UNIQUE notif_id)
   *  - Trigger callback bila baru
   */
  ingest(n: RawNotif): { matched: boolean; inserted: boolean; tx?: ParsedTx } {
    if (!n.id) {
      n.id = crypto
        .createHash('sha1')
        .update(`${n.source}|${n.app || ''}|${n.title || ''}|${n.text}|${n.receivedAt}`)
        .digest('hex');
    }
    const tx = dispatch(n);
    if (!tx) {
      logger.debug({ source: n.source, app: n.app, text: n.text.slice(0, 120) }, 'no parser matched');
      return { matched: false, inserted: false };
    }
    const r = insertTx({
      notif_id: n.id,
      source: n.source,
      bank: tx.bank,
      jenis: tx.jenis,
      amount: tx.amount,
      merchant: tx.merchant,
      channel: tx.channel,
      reference: tx.reference,
      occurred_at: tx.occurred_at.toISOString(),
      raw_title: n.title,
      raw_text: n.text.slice(0, 500),
    });
    if (r.inserted && this.onNewTx) this.onNewTx(tx);
    return { matched: true, inserted: r.inserted, tx };
  }
}
