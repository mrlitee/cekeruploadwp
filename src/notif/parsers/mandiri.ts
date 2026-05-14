import { ParserFn, pickAmount, clean, detectJenis } from './types';

const ID_HINTS  = /(Mandiri|Livin|Livin')/i;
const APP_HINTS = /(mandiri|livin)/i;

export const mandiri: ParserFn = (n) => {
  const haystack = `${n.title || ''} ${n.text}`;
  if (!ID_HINTS.test(haystack) && !(n.app && APP_HINTS.test(n.app))) return null;

  const text = clean(n.text);
  const amount = pickAmount(text);
  if (!amount) return null;

  const jenis = detectJenis(text + ' ' + (n.title || ''));

  const merchantMatch =
    text.match(/QRIS\s+(?:di\s+)?([A-Z0-9 .,&'/-]{3,60})/i) ||
    text.match(/(?:ke|kepada|merchant|outlet|penerima)[:\s]+([A-Z0-9 .,&'/-]{3,60})/i);
  const refMatch = text.match(/(?:Ref(?:erensi)?|Trace)[:\s#]*([A-Z0-9-]{4,})/i);

  return {
    bank: 'MANDIRI',
    jenis,
    amount,
    merchant: merchantMatch ? clean(merchantMatch[1]) : undefined,
    reference: refMatch?.[1],
    channel: /qris/i.test(text) ? 'QRIS' : /transfer/i.test(text) ? 'TRANSFER' : undefined,
    occurred_at: new Date(n.receivedAt),
  };
};
