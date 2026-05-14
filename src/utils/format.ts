export function rupiah(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return sign + 'Rp ' + abs.toLocaleString('id-ID');
}

export function pad(s: string, len: number): string {
  if (s.length >= len) return s.slice(0, len);
  return s + ' '.repeat(len - s.length);
}

export function tabelTransaksi(rows: Array<{
  tanggal: string; jenis: 'in' | 'out'; jumlah: number; merchant: string; bank: string;
}>): string {
  if (!rows.length) return '_(tidak ada transaksi)_';
  const lines = rows.map((r) => {
    const tag = r.jenis === 'in' ? '🟢' : '🔴';
    return `${tag} ${r.tanggal}  ${rupiah(r.jumlah)}\n    ${r.merchant} _(${r.bank})_`;
  });
  return lines.join('\n');
}
