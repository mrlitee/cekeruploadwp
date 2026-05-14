import { ParserFn, pickAmount, clean } from './types';

// Sumber notifikasi BCA: e-Statement, BCA mobile push (jarang via email),
// myBCA notifikasi transaksi, KlikBCA, Sakuku.
// TODO calibrate: cocokkan dengan email asli BCA-mu (subject & body).
export const bca: ParserFn = (e) => {
  const fromOk = /bca\.co\.id|bca\.id|halobca/i.test(e.from);
  const subjOk = /BCA|transaksi|notifikasi|debet|kredit|qris/i.test(e.subject);
  if (!fromOk && !subjOk) return null;

  const text = clean(e.text || '');
  const isOut = /(debet|debit|pembayaran|transfer keluar|tarikan|pembelian|qris)/i.test(text + ' ' + e.subject);
  const isIn  = /(kredit|setoran|transfer masuk|terima)/i.test(text + ' ' + e.subject);
  const jenis: 'in' | 'out' = isIn && !isOut ? 'in' : 'out';

  const amount = pickAmount(text, /(?:Rp|IDR)\s*[\d.,]+/i);
  if (!amount) return null;

  const merchantMatch =
    text.match(/(?:di|kepada|ke|merchant|outlet)[:\s]+([A-Z0-9 .,&'/-]{3,60})/i) ||
    text.match(/(?:QRIS)\s+([A-Z0-9 .,&'/-]{3,60})/i);
  const merchant = merchantMatch ? clean(merchantMatch[1]).slice(0, 80) : undefined;

  const refMatch = text.match(/(?:ref(?:erensi)?|trace|no\.?\s*ref)[:\s#]*([A-Z0-9-]{4,})/i);
  const channel = /qris/i.test(text) ? 'QRIS'
                : /transfer/i.test(text) ? 'TRANSFER'
                : /debit|debet/i.test(text) ? 'DEBIT'
                : undefined;

  return {
    bank: 'BCA',
    jenis,
    amount,
    merchant,
    channel,
    reference: refMatch?.[1],
    occurred_at: e.date,
  };
};
