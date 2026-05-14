import { ParserFn, ParsedTx, RawNotif } from './parsers/types';
import { bca } from './parsers/bca';
import { mandiri } from './parsers/mandiri';
import { bni } from './parsers/bni';
import { bri } from './parsers/bri';
import { bsi } from './parsers/bsi';
import { cimb } from './parsers/cimb';
import { permata } from './parsers/permata';
import { jago } from './parsers/jago';
import { jenius } from './parsers/jenius';
import { ewallet } from './parsers/ewallet';

const PARSERS: ParserFn[] = [bca, mandiri, bni, bri, bsi, cimb, permata, jago, jenius, ewallet];

export function dispatch(n: RawNotif): ParsedTx | null {
  for (const p of PARSERS) {
    try {
      const r = p(n);
      if (r && r.amount > 0) return r;
    } catch {
      /* continue */
    }
  }
  return null;
}
