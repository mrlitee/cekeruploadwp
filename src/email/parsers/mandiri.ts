import { ParserFn, pickAmount, clean } from './types';

// Sumber: Livin' by Mandiri, Mandiri e-Statement, notifikasi transaksi.
export const mandiri: ParserFn = (e) => {
  const fromOk = /bankmandiri|mandiri\.co\.id|livin/i.test(e.from);
  const subjOk = /mandiri|livin|transaksi|notifikasi|qris/i.test(e.subject);
  if (!fromOk && !subjOk) return null;

  const text = clean(e.text || '');
  const isIn  = /(kredit|masuk|setoran|terima)/i.test(text + ' ' + e.subject);
  const isOut = /(debet|debit|keluar|pembayaran|transfer|qris|pembelian|tarikan)/i.test(text + ' ' + e.subject);
  const jenis: 'in' | 'out' = isIn && !isOut ? 'in' : 'out';

  const amount = pickAmount(text);
  if (!amount) return null;

  const merchantMatch =
    text.match(/(?:Penerima|Merchant|Outlet|kepada|ke)\s*[:\-]?\s*([A-Z0-9 .,&'/-]{3,60})/i);
  const refMatch = text.match(/(?:Ref(?:erensi)?|No\.?\s*Ref|Trace)[:\s#]*([A-Z0-9-]{4,})/i);

  return {
    bank: 'MANDIRI',
    jenis,
    amount,
    merchant: merchantMatch ? clean(merchantMatch[1]) : undefined,
    reference: refMatch?.[1],
    channel: /qris/i.test(text) ? 'QRIS' : /transfer/i.test(text) ? 'TRANSFER' : undefined,
    occurred_at: e.date,
  };
};
