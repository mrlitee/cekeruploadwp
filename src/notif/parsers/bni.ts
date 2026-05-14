import { ParserFn, pickAmount, clean, detectJenis } from './types';

export const bni: ParserFn = (n) => {
  const hay = `${n.title || ''} ${n.text}`;
  if (!/BNI|wondr/i.test(hay) && !(n.app && /bni|wondr/i.test(n.app))) return null;

  const text = clean(n.text);
  const amount = pickAmount(text);
  if (!amount) return null;

  const merchantMatch =
    text.match(/QRIS\s+(?:di\s+)?([A-Z0-9 .,&'/-]{3,60})/i) ||
    text.match(/(?:ke|kepada|merchant|penerima)[:\s]+([A-Z0-9 .,&'/-]{3,60})/i);
  const refMatch = text.match(/(?:Ref(?:erensi)?|Trace)[:\s#]*([A-Z0-9-]{4,})/i);

  return {
    bank: 'BNI',
    jenis: detectJenis(text + ' ' + (n.title || '')),
    amount,
    merchant: merchantMatch ? clean(merchantMatch[1]) : undefined,
    reference: refMatch?.[1],
    channel: /qris/i.test(text) ? 'QRIS' : /transfer/i.test(text) ? 'TRANSFER' : undefined,
    occurred_at: new Date(n.receivedAt),
  };
};
