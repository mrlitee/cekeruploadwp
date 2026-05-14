# WA Finance Bot 💰

WhatsApp bot pencatat keuangan pribadi yang **otomatis mendeteksi pemasukan & pengeluaran** dari email notifikasi bank Indonesia, lalu melaporkan via chat WhatsApp.

## Fitur
- ✅ Auto-deteksi transaksi dari email setiap selesai transaksi (IMAP polling, anti-duplikat via UID)
- ✅ Support multi-bank Indonesia: **BCA, Mandiri, BNI, BRI, BSI, CIMB Niaga, Permata, Bank Jago, Jenius**
- ✅ Support e-wallet: **GoPay, OVO, DANA, ShopeePay, LinkAja**
- ✅ Pencatatan manual via chat: `/catat out 25000 Starbucks Sudirman`
- ✅ Filter tanggal fleksibel:
  - `bulan ini`, `bulan lalu`, `minggu ini`, `hari ini`, `kemarin`
  - `1-30 bulan lalu`, `5-15 bulan ini`
  - `2026-01-01:2026-01-31`
  - `01/05/2026:10/05/2026`
- ✅ Top outlet pengeluaran: `/top bulan lalu 10`

## Setup

```bash
npm install
cp .env.example .env
# isi IMAP_USER, IMAP_PASS (App Password Gmail), WA_OWNERS
npm run dev
```

Saat pertama jalan, scan QR dari WhatsApp → **Linked Devices**.

### Gmail App Password
1. Aktifkan 2FA di akun Google.
2. Buka <https://myaccount.google.com/apppasswords> → buat password 16 digit.
3. Pakai password itu di `IMAP_PASS`.

## Perintah WhatsApp

| Perintah | Contoh |
|---|---|
| `/menu` | tampilkan bantuan |
| `/saldo [range]` | ringkasan in/out/selisih |
| `/laporan [range]` | semua transaksi |
| `/pengeluaran [range]` | hanya pengeluaran |
| `/pemasukan [range]` | hanya pemasukan |
| `/top [range] [N]` | top outlet pengeluaran |
| `/sync` | tarik email baru sekarang |
| `/catat <in\|out> <jumlah> <nama>` | catat manual |

Contoh:
```
/saldo bulan lalu
/pengeluaran 1-30 bulan lalu
/top bulan ini 5
/laporan 2026-04-01:2026-04-15
```

## Catatan Kalibrasi Parser

Pola regex di `src/email/parsers/*` adalah baseline yang aman untuk subject & body **bahasa Indonesia umum**. Karena format email tiap bank kadang berubah, ada kasus dimana parser perlu disesuaikan:

1. Jalankan `npm run dev`, biarkan beberapa transaksi masuk.
2. Cek `data/finance.db` (table `transactions`) — kolom `raw_subject` & `raw_snippet` untuk lihat email mentahnya.
3. Sesuaikan regex `from`, `subject`, atau ekstraksi `merchant`/`amount` di file parser bank yang bersangkutan.
4. Field `email_uid` dijadikan unique key, jadi aman untuk re-scan; `setKV('last_uid', '0')` untuk re-scan total.

## Arsitektur singkat

```
Email (IMAP) ──▶ ImapPoller ──▶ dispatcher ──▶ parser per-bank ──▶ SQLite
                                                                     │
                                                                     ▼
                                                            WhatsApp Bot ◀── owner chat
```

## Lisensi
MIT
