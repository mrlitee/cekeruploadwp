import { listTx, summary, topMerchants } from '../db/transactions';
import { Range } from '../utils/date';
import { rupiah } from '../utils/format';

export function buildSummary(r: Range): string {
  const s = summary(r.from.toISOString(), r.to.toISOString());
  const net = s.total_in - s.total_out;
  return [
    `*Ringkasan ${r.label}*`,
    `🟢 Pemasukan : ${rupiah(s.total_in)}`,
    `🔴 Pengeluaran: ${rupiah(s.total_out)}`,
    `💼 Selisih   : ${rupiah(net)}`,
    `🧾 Transaksi : ${s.n}`,
  ].join('\n');
}

export function buildList(r: Range, jenis?: 'in' | 'out', limit = 30): string {
  const rows = listTx(r.from.toISOString(), r.to.toISOString(), jenis).slice(0, limit);
  if (!rows.length) return `_Tidak ada transaksi pada ${r.label}._`;
  const head = `*Daftar ${jenis === 'in' ? 'Pemasukan' : jenis === 'out' ? 'Pengeluaran' : 'Transaksi'} ${r.label}*`;
  const lines = rows.map((t) => {
    const tag = t.jenis === 'in' ? '🟢' : '🔴';
    const d = new Date(t.occurred_at);
    const dd = d.toLocaleString('id-ID', {
      timeZone: process.env.TZ || 'Asia/Jakarta',
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    const m = t.merchant || '(tanpa nama)';
    return `${tag} ${dd}  ${rupiah(t.amount)}\n   ${m}  _(${t.bank}${t.channel ? '/' + t.channel : ''})_`;
  });
  return [head, ...lines].join('\n');
}

export function buildTop(r: Range, limit = 10): string {
  const rows = topMerchants(r.from.toISOString(), r.to.toISOString(), limit);
  if (!rows.length) return `_Belum ada pengeluaran pada ${r.label}._`;
  const head = `*Top ${rows.length} Outlet Pengeluaran — ${r.label}*`;
  const lines = rows.map((row, i) =>
    `${String(i + 1).padStart(2, ' ')}. ${row.merchant}\n    ${rupiah(row.total)} • ${row.n}x`,
  );
  return [head, ...lines].join('\n');
}
