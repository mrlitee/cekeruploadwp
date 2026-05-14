import { ParserFn, pickAmount, clean } from './types';

export const cimb: ParserFn = (e) => {
  const fromOk = /cimbniaga|cimb\.co\.id|octo/i.test(e.from);
  const subjOk = /CIMB|OCTO|transaksi/i.test(e.subject);
  if (!fromOk && !subjOk) return null;

  const text = clean(e.text || '');
  const isIn  = /(kredit|masuk|terima)/i.test(text + ' ' + e.subject);
  const isOut = /(debet|debit|pembayaran|transfer|qris|pembelian)/i.test(text + ' ' + e.subject);
  const jenis: 'in' | 'out' = isIn && !isOut ? 'in' : 'out';

  const amount = pickAmount(text);
  if (!amount) return null;

  const merchantMatch = text.match(/(?:Penerima|Merchant|kepada|ke)\s*[:\-]?\s*([A-Z0-9 .,&'/-]{3,60})/i);
  const refMatch = text.match(/(?:Ref(?:erensi)?|Trace)[:\s#]*([A-Z0-9-]{4,})/i);

  return {
    bank: 'CIMB',
    jenis,
    amount,
    merchant: merchantMatch ? clean(merchantMatch[1]) : undefined,
    reference: refMatch?.[1],
    channel: /qris/i.test(text) ? 'QRIS' : /transfer/i.test(text) ? 'TRANSFER' : undefined,
    occurred_at: e.date,
  };
};
