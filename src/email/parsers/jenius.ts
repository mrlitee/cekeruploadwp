import { ParserFn, pickAmount, clean } from './types';

export const jenius: ParserFn = (e) => {
  const fromOk = /jenius|btpn/i.test(e.from);
  const subjOk = /Jenius|transaksi/i.test(e.subject);
  if (!fromOk && !subjOk) return null;

  const text = clean(e.text || '');
  const isIn  = /(in|masuk|terima|kredit)/i.test(text + ' ' + e.subject);
  const isOut = /(out|keluar|pembayaran|transfer|qris|pembelian|debit)/i.test(text + ' ' + e.subject);
  const jenis: 'in' | 'out' = isIn && !isOut ? 'in' : 'out';

  const amount = pickAmount(text);
  if (!amount) return null;

  const merchantMatch = text.match(/(?:to|ke|kepada|merchant)\s*[:\-]?\s*([A-Z0-9 .,&'/-]{3,60})/i);
  const refMatch = text.match(/(?:Ref(?:erensi)?|Trace)[:\s#]*([A-Z0-9-]{4,})/i);

  return {
    bank: 'JENIUS',
    jenis,
    amount,
    merchant: merchantMatch ? clean(merchantMatch[1]) : undefined,
    reference: refMatch?.[1],
    channel: /qris/i.test(text) ? 'QRIS' : /transfer/i.test(text) ? 'TRANSFER' : undefined,
    occurred_at: e.date,
  };
};
