import { ParserFn, pickAmount, clean, detectJenis } from './types';

const MAP: Array<[RegExp, string]> = [
  [/gopay|gojek/i,   'GOPAY'],
  [/ovo/i,           'OVO'],
  [/dana/i,          'DANA'],
  [/shopeepay/i,     'SHOPEEPAY'],
  [/linkaja/i,       'LINKAJA'],
];

export const ewallet: ParserFn = (n) => {
  const hay = `${n.title || ''} ${n.text} ${n.app || ''}`;
  const hit = MAP.find(([re]) => re.test(hay));
  if (!hit) return null;

  const text = clean(n.text);
  const amount = pickAmount(text);
  if (!amount) return null;

  const merchantMatch =
    text.match(/(?:Merchant|to|ke|Penjual|Outlet|Toko)[:\s]+([A-Z0-9 .,&'/-]{3,60})/i) ||
    text.match(/(?:di|at)\s+([A-Z0-9 .,&'/-]{3,60})/i);
  const refMatch = text.match(/(?:Order|Transaction|Trx|Ref)\s*ID?\s*[:#]?\s*([A-Z0-9-]{6,})/i);

  return {
    bank: hit[1],
    jenis: detectJenis(text + ' ' + (n.title || '')),
    amount,
    merchant: merchantMatch ? clean(merchantMatch[1]) : undefined,
    reference: refMatch?.[1],
    channel: 'EWALLET',
    occurred_at: new Date(n.receivedAt),
  };
};
