import { parseRange } from '../utils/date';
import { buildSummary, buildList, buildTop } from '../services/reports';
import { insertTx } from '../db/transactions';
import { rupiah } from '../utils/format';

export interface CommandCtx {
  from: string;
  text: string;
  reply: (msg: string) => Promise<void>;
}

const HELP = [
  '*Bot Catatan Keuangan* 💰',
  '',
  '/saldo [range]            – ringkasan',
  '/laporan [range]          – semua transaksi',
  '/pengeluaran [range]      – hanya pengeluaran',
  '/pemasukan [range]        – hanya pemasukan',
  '/top [range] [N]          – top outlet pengeluaran',
  '/catat <in|out> <jumlah> <nama outlet>  – manual',
  '',
  '*Range yang didukung:*',
  '• hari ini, kemarin, minggu ini',
  '• bulan ini, bulan lalu',
  '• 1-30 bulan lalu, 5-15 bulan ini',
  '• 2026-01-01:2026-01-31',
  '• 01/05/2026:10/05/2026',
].join('\n');

export async function handleCommand(ctx: CommandCtx) {
  const t = ctx.text.trim();
  if (!t.startsWith('/')) return;

  const [cmd, ...rest] = t.split(/\s+/);
  const args = rest.join(' ').trim();

  switch (cmd.toLowerCase()) {
    case '/menu':
    case '/help':
    case '/start':
      return ctx.reply(HELP);

    case '/saldo':
    case '/ringkasan':
      return ctx.reply(buildSummary(parseRange(args)));

    case '/laporan':
      return ctx.reply(buildList(parseRange(args)));

    case '/pengeluaran':
      return ctx.reply(buildList(parseRange(args), 'out'));

    case '/pemasukan':
      return ctx.reply(buildList(parseRange(args), 'in'));

    case '/top': {
      const m = args.match(/(.*?)(?:\s+(\d{1,2}))?$/);
      const rangeStr = (m?.[1] || '').trim();
      const limit = m?.[2] ? Number(m[2]) : 10;
      return ctx.reply(buildTop(parseRange(rangeStr), limit));
    }

    case '/catat': {
      const m = args.match(/^(in|out)\s+([\d.,]+)\s+(.+)$/i);
      if (!m) return ctx.reply('Format: /catat <in|out> <jumlah> <nama outlet>');
      const jenis = m[1].toLowerCase() as 'in' | 'out';
      const amount = Number(m[2].replace(/[.,]/g, ''));
      const merchant = m[3].trim();
      const id = `manual-${Date.now()}`;
      const r = insertTx({
        notif_id: id,
        source: 'manual',
        bank: 'MANUAL',
        jenis,
        amount,
        merchant,
        occurred_at: new Date().toISOString(),
      });
      return ctx.reply(
        r.inserted
          ? `✅ Tercatat ${jenis === 'in' ? '🟢 pemasukan' : '🔴 pengeluaran'} ${rupiah(amount)} — ${merchant}`
          : '⚠️ Gagal mencatat (kemungkinan duplikat).',
      );
    }

    default:
      return ctx.reply('Perintah tidak dikenal. Ketik */menu*.');
  }
}
