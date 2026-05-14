import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export const TZ = process.env.TZ || 'Asia/Jakarta';

export function now(): Dayjs {
  return dayjs().tz(TZ);
}

export interface Range {
  from: Dayjs;
  to: Dayjs;
  label: string;
}

/**
 * Parse user input filter range. Examples:
 *   "hari ini"
 *   "kemarin"
 *   "minggu ini"
 *   "bulan ini"
 *   "bulan lalu"            -> 1..end of previous month
 *   "1-30 bulan lalu"       -> day 1 to day 30 of previous month
 *   "5-15 bulan ini"
 *   "2026-01-01:2026-01-31" -> ISO range
 *   "01/05/2026:10/05/2026" -> dd/mm/yyyy range
 */
export function parseRange(input: string | undefined): Range {
  const raw = (input || 'bulan ini').trim().toLowerCase();

  if (raw === 'hari ini' || raw === 'today') {
    const t = now();
    return { from: t.startOf('day'), to: t.endOf('day'), label: 'Hari ini' };
  }
  if (raw === 'kemarin' || raw === 'yesterday') {
    const t = now().subtract(1, 'day');
    return { from: t.startOf('day'), to: t.endOf('day'), label: 'Kemarin' };
  }
  if (raw === 'minggu ini' || raw === 'this week') {
    const t = now();
    return { from: t.startOf('week'), to: t.endOf('week'), label: 'Minggu ini' };
  }
  if (raw === 'bulan ini' || raw === 'this month') {
    const t = now();
    return { from: t.startOf('month'), to: t.endOf('month'), label: 'Bulan ini' };
  }
  if (raw === 'bulan lalu' || raw === 'last month') {
    const t = now().subtract(1, 'month');
    return { from: t.startOf('month'), to: t.endOf('month'), label: 'Bulan lalu' };
  }

  // d1-d2 bulan lalu / d1-d2 bulan ini
  const mPartial = raw.match(/^(\d{1,2})-(\d{1,2})\s+bulan\s+(lalu|ini)$/);
  if (mPartial) {
    const d1 = parseInt(mPartial[1], 10);
    const d2 = parseInt(mPartial[2], 10);
    const base = mPartial[3] === 'lalu' ? now().subtract(1, 'month') : now();
    const start = base.date(Math.max(1, d1)).startOf('day');
    const endDay = Math.min(base.daysInMonth(), d2);
    const end = base.date(endDay).endOf('day');
    return {
      from: start,
      to: end,
      label: `${d1}-${d2} ${mPartial[3] === 'lalu' ? 'bulan lalu' : 'bulan ini'}`,
    };
  }

  // ISO range
  const mIso = raw.match(/^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/);
  if (mIso) {
    return {
      from: dayjs.tz(mIso[1], TZ).startOf('day'),
      to: dayjs.tz(mIso[2], TZ).endOf('day'),
      label: `${mIso[1]} s/d ${mIso[2]}`,
    };
  }

  // dd/mm/yyyy:dd/mm/yyyy
  const mDmy = raw.match(/^(\d{2}\/\d{2}\/\d{4}):(\d{2}\/\d{2}\/\d{4})$/);
  if (mDmy) {
    const a = dayjs.tz(mDmy[1], 'DD/MM/YYYY', TZ).startOf('day');
    const b = dayjs.tz(mDmy[2], 'DD/MM/YYYY', TZ).endOf('day');
    return { from: a, to: b, label: `${mDmy[1]} s/d ${mDmy[2]}` };
  }

  // fallback
  const t = now();
  return { from: t.startOf('month'), to: t.endOf('month'), label: 'Bulan ini' };
}

export function fmt(d: Dayjs): string {
  return d.tz(TZ).format('DD/MM HH:mm');
}
