# WA Finance Bot 💰

Bot WhatsApp pencatat keuangan otomatis. **Sumber utama: notifikasi EMAIL dari bank.**

User cukup chat ke nomor bot. Tidak install apa pun di HP.

## Cara kerja

```
                                 ┌────────────────────┐
  Email notif transaksi    ─────▶│   IMAP poller      │──┐
  (Gmail/Outlook/Yahoo)          │   (cek tiap 60s)   │  │
                                 └────────────────────┘  │
                                                         ▼
  Pesan WA dari bank (opsional) ─────▶ Baileys ─────▶ Ingest ──▶ SQLite
                                                         │
                                                         ▼
                                              Notif balik ke owner WA
```

Bot baca **email notif transaksi** dari mailbox kamu (Gmail, Outlook, Yahoo, Zoho) lewat IMAP, parse otomatis (BCA, Mandiri, BNI, BRI, BSI, CIMB, Permata, Jago, Jenius, GoPay, OVO, DANA, ShopeePay, LinkAja), simpan ke DB, dan kirim notif ke WhatsApp kamu.

## Mode penggunaan

| Mode | Cocok untuk | User akhir install? |
|---|---|---|
| **A. Cloud (Railway/Render)** | Banyak user, 24/7 | ❌ tidak install apa-apa |
| **B. Termux (HP)** | Pribadi sendiri | hanya operator |
| **C. PC/laptop** | Yang punya laptop nyala | hanya operator |

---

## A. Setup CLOUD (paling simpel untuk user akhir)

### 1. Persiapan email

Pakai 1 alamat email yang sudah/akan menerima notif transaksi dari bank.

**Untuk Gmail:**
1. Aktifkan [2-Step Verification](https://myaccount.google.com/security)
2. Buat [App Password](https://myaccount.google.com/apppasswords) → simpan 16 karakternya
3. Pastikan [IMAP Access](https://mail.google.com/mail/u/0/#settings/fwdandpop) ON di Gmail Settings

**Untuk Outlook/Yahoo/Zoho:** App Password juga (cara serupa).

### 2. Deploy ke Railway

1. <https://railway.app> → **New Project** → **Deploy from GitHub** → pilih repo ini
2. Branch: `feat/wa-finance-bot`
3. Tab **Variables**, tambah:
   ```
   WA_OWNERS = 6281234567890
   EMAIL_ENABLED = true
   IMAP_HOST = imap.gmail.com
   IMAP_USER = email-anda@gmail.com
   IMAP_PASS = app-password-16-karakter
   TZ = Asia/Jakarta
   ```
4. Tab **Settings → Volumes**, tambah:
   - `/app/auth` (session WhatsApp)
   - `/app/data` (database)
5. **Deploy** → buka **Deploy Logs**

### 3. Scan QR WhatsApp (sekali)

Di logs akan muncul QR code → scan dari WA bot di **Linked Devices → Link a Device**.

Setelah connected, session disimpan di volume cloud. Tidak perlu scan lagi.

### 4. Selesai

User akhir tinggal:
- Save nomor WA bot
- Setiap transaksi dari bank yang kirim email → otomatis tercatat dalam <60 detik
- Chat `/saldo`, `/laporan`, dll untuk lihat data

---

## B. Setup TERMUX (di HP sendiri)

```bash
pkg update -y && pkg install -y git nodejs-lts
git clone https://github.com/mrlitee/cekeruploadwp.git
cd cekeruploadwp && git checkout feat/wa-finance-bot
npm install
cp .env.example .env
nano .env   # isi WA_OWNERS, IMAP_USER, IMAP_PASS
termux-wake-lock
npm run dev
```

Scan QR → selesai.

---

## C. Setup PC/Laptop

```bash
git clone https://github.com/mrlitee/cekeruploadwp.git
cd cekeruploadwp && git checkout feat/wa-finance-bot
npm install
cp .env.example .env
# edit .env
npm run dev
```

---

## Bank/E-wallet yang didukung

Selama mereka kirim email konfirmasi/notifikasi transaksi:

**Bank:** BCA · Mandiri · BNI · BRI · BSI · CIMB Niaga (OCTO) · Permata · Bank Jago · Jenius (BTPN)

**E-wallet:** GoPay · OVO · DANA · ShopeePay · LinkAja

> Kalau bank kamu tidak kirim email transaksi, daftar dulu lewat app bank-nya. Hampir semua bank Indonesia kirim email konfirmasi setiap transaksi.

---

## Perintah WhatsApp

Kirim dari nomor `WA_OWNERS` ke nomor bot:

| Perintah | Contoh |
|---|---|
| `/menu` | bantuan |
| `/saldo bulan ini` | ringkasan in/out/selisih |
| `/laporan bulan lalu` | semua transaksi |
| `/pengeluaran 1-30 bulan lalu` | filter |
| `/pemasukan minggu ini` | filter pemasukan |
| `/top bulan ini 5` | top 5 outlet pengeluaran |
| `/catat out 25000 Kopi Kenangan` | catat manual |

### Filter range
- `hari ini`, `kemarin`, `minggu ini`
- `bulan ini`, `bulan lalu`
- `1-30 bulan lalu`, `5-15 bulan ini`
- `2026-01-01:2026-01-31`
- `01/05/2026:10/05/2026`

---

## Kalibrasi parser email

Format email tiap bank kadang berubah. Bot menyimpan `raw_title` (subject) dan `raw_text` (snippet body) di DB. Cek:

```bash
sqlite3 data/finance.db "SELECT bank,amount,merchant,raw_title FROM transactions ORDER BY id DESC LIMIT 10"
```

Kalau ada email yang tidak terbaca, kirim contoh subject+body-nya — bisa di-tweak regex parser di `src/notif/parsers/<bank>.ts`.

---

## Troubleshooting

| Error | Solusi |
|---|---|
| IMAP `Invalid credentials` | Pakai App Password, bukan password biasa. Aktifkan 2FA dulu. |
| IMAP `disabled by admin` | Aktifkan IMAP di Gmail Settings. |
| `EADDRINUSE port 3000` | `pkill -f node` atau set `WEBHOOK_ENABLED=false` |
| Bot disconnect WA | Pastikan `termux-wake-lock` (Termux), atau volume `/app/auth` ada (cloud). |
| QR tidak muncul / terpotong | Kecilkan font terminal. |

## Lisensi
MIT
