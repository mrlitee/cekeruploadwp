# WA Finance Bot 💰

WhatsApp bot pencatat keuangan pribadi yang **otomatis mendeteksi transaksi** dari notifikasi bank — **tanpa login email, tanpa MacroDroid, tanpa app tambahan**.

## Cara kerja

```
[HP Android]
 ├─ Notif app bank ──▶ Termux:API ──▶ android-listener.ts ─┐
 │                                                          ▼
 └─ Chat WA dari bank ─▶ Baileys self-listen ──────────▶ Ingest ─▶ SQLite
                                                              │
                                                              ▼
                                                     Kirim notif ke owner WA
```

Bot **otomatis menangkap notifikasi dari 2 jalur**:
1. **Notifikasi Android** — langsung dibaca dari system notif HP via `termux-notification-list`.
2. **Pesan WhatsApp** — bot membaca chat masuk yang mengandung pola transaksi bank.

User cukup **jalankan bot + scan QR WhatsApp**. Selesai.

## Fitur

- ✅ Auto-detect tanpa app tambahan (cukup Termux + Termux:API)
- ✅ Multi-bank: **BCA, Mandiri, BNI, BRI, BSI, CIMB, Permata, Jago, Jenius**
- ✅ E-wallet: **GoPay, OVO, DANA, ShopeePay, LinkAja**
- ✅ Pencatatan manual: `/catat out 25000 Kopi Kenangan`
- ✅ Filter tanggal fleksibel
- ✅ Top outlet pengeluaran
- ✅ Anti-duplikat otomatis

## Install (Termux, 5 menit)

### 1. Install Termux & Termux:API

Download dari **F-Droid** (JANGAN dari Play Store):
- [Termux](https://f-droid.org/en/packages/com.termux/)
- [Termux:API](https://f-droid.org/en/packages/com.termux.api/)

Buka Termux, jalankan:
```bash
pkg update -y && pkg upgrade -y
pkg install -y git nodejs-lts termux-api
```

### 2. Beri izin

```bash
termux-setup-storage
termux-notification-list    # pertama kali akan minta izin Notification Access
```

Kalau muncul popup Android → **Allow Notification Access** untuk Termux:API.

> **PENTING**: Pastikan **Notification Access** ON untuk Termux:API di:
> Settings → Apps → Special access → Notification access → Termux:API ✅

### 3. Clone & install

```bash
cd ~
git clone https://github.com/mrlitee/cekeruploadwp.git
cd cekeruploadwp
git checkout feat/wa-finance-bot
npm install
```

### 4. Konfigurasi

```bash
cp .env.example .env
nano .env
```

Yang **WAJIB diisi** cuma 1:
```env
WA_OWNERS=628xxxxxxxxxx    # nomor WA kamu
```

Save: `Ctrl+O` → Enter → `Ctrl+X`

### 5. Jalankan

```bash
termux-wake-lock
npm run dev
```

Muncul **QR code** → buka WhatsApp → **Linked Devices** → scan QR.

Setelah sukses:
```
WhatsApp connected ✅
Bot aktif. Sumber notif:
  ✅ WhatsApp self-listen (otomatis)
  ✅ Android notification listener (termux-api)
```

**SELESAI!** Bot sekarang otomatis tangkap setiap transaksi.

### 6. Tes

Lakukan transaksi kecil (QRIS Rp 1.000, transfer kecil, dll). Dalam 5 detik, bot kirim notif ke WA kamu:
```
🔴 Pengeluaran — BCA
Rp 25.000
📍 STARBUCKS RESERVE
🔗 QRIS
```

## Perintah WhatsApp

Kirim ke nomor bot dari HP kamu:

| Perintah | Fungsi |
|---|---|
| `/menu` | tampilkan bantuan |
| `/saldo bulan ini` | ringkasan pemasukan/pengeluaran |
| `/laporan bulan lalu` | daftar semua transaksi |
| `/pengeluaran 1-30 bulan lalu` | hanya pengeluaran |
| `/pemasukan minggu ini` | hanya pemasukan |
| `/top bulan ini 5` | top 5 outlet pengeluaran |
| `/catat out 25000 Kopi Kenangan` | catat manual |

### Range yang didukung:
- `hari ini`, `kemarin`, `minggu ini`, `bulan ini`, `bulan lalu`
- `1-30 bulan lalu`, `5-15 bulan ini`
- `2026-01-01:2026-01-31`
- `01/05/2026:10/05/2026`

## Tips Termux

**Supaya bot tidak mati saat HP di-lock:**
```bash
termux-wake-lock
```
Plus matikan battery optimization: Settings → Apps → Termux → Battery → **Unrestricted**.

**Auto-start saat Termux dibuka:**
1. Install [Termux:Boot](https://f-droid.org/en/packages/com.termux.boot/) dari F-Droid
2. ```bash
   mkdir -p ~/.termux/boot
   echo '#!/data/data/com.termux/files/usr/bin/bash
   termux-wake-lock
   cd ~/cekeruploadwp && npm run dev' > ~/.termux/boot/start-bot.sh
   chmod +x ~/.termux/boot/start-bot.sh
   ```

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `EADDRINUSE port 3000` | `pkill -f node` lalu `npm run dev` ulang, atau set `WEBHOOK_ENABLED=false` |
| `termux-notification-list` tidak jalan | Beri Notification Access: Settings → Notification access → Termux:API |
| QR tidak muncul / terpotong | Kecilkan font: pinch-to-zoom atau `Ctrl + -` |
| Bot disconnect | Hapus `auth/` folder, scan QR ulang. Pastikan `termux-wake-lock` aktif |
| `npm install` error native | Pastikan pakai branch terbaru (`git pull`) — sudah tidak pakai native |
| Notif tidak terdeteksi | Cek `raw_text` di DB: `sqlite3 data/finance.db "SELECT * FROM transactions LIMIT 5"` |

## Bank yang didukung

| Bank/E-wallet | Package name app |
|---|---|
| BCA / myBCA / blu | com.bca.* / id.co.bca.blu |
| Mandiri / Livin' | id.co.mandiri.* |
| BRI / BRImo | id.co.bri.brimo |
| BNI Mobile | com.bni.mobilebanking |
| BSI / BYOND | id.co.bankbsi.* |
| CIMB / OCTO | com.ocaborneo.* |
| Permata | com.permata.* |
| Bank Jago | id.co.bankjago.* |
| Jenius | id.co.btpn.dc |
| GoPay | com.gojek.app |
| OVO | com.ovo.id |
| DANA | id.dana |
| ShopeePay | com.shopee.id |
| LinkAja | com.telkom.mylinaja |

## Lisensi
MIT
