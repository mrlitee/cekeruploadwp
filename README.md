# WA Finance Bot 💰 (no-email edition)

WhatsApp bot pencatat keuangan pribadi yang **otomatis mendeteksi pemasukan & pengeluaran** dari notifikasi bank — **tanpa login email Gmail**.

## Cara kerja

Ada **2 sumber data** yang aktif bersamaan:

1. **Notifikasi Android dari aplikasi mobile banking**
   App seperti BCA mobile / myBCA / blu, Livin' by Mandiri, BRImo, BNI Mobile, BSI Mobile, OCTO Mobile (CIMB), PermataMobile, Jago, Jenius, GoPay, OVO, DANA, ShopeePay — semuanya kirim notifikasi tiap transaksi.
   Notif ini di-forward dari HP ke server bot lewat HTTP webhook menggunakan **MacroDroid** atau **Tasker** (gratis di Play Store).

2. **WhatsApp self-listen**
   Banyak bank (BCA, BRI, Mandiri Livin', dll) juga kirim notifikasi transaksi via WhatsApp resmi mereka. Bot akan otomatis membaca pesan dari nomor-nomor tersebut.

```
[HP Android]
 ├─ Notif app bank ──▶ MacroDroid/Tasker ──HTTP POST──▶ /notif (Fastify)
 │                                                          │
 └─ Pesan WA bank ───▶ Baileys self-listen ────────────────▶ Ingest ─▶ SQLite
                                                                 │
                                                                 ▼
                                                       Notif balik ke owner
```

## Fitur

- Auto-deteksi in/out via notif Android & WA (anti-duplikat)
- Multi-bank Indonesia: **BCA, Mandiri, BNI, BRI, BSI, CIMB Niaga, Permata, Jago, Jenius**
- E-wallet: **GoPay, OVO, DANA, ShopeePay, LinkAja**
- Pencatatan manual: `/catat out 25000 Starbucks Sudirman`
- Filter tanggal fleksibel
- Top outlet pengeluaran

## Setup server bot

```bash
npm install
cp .env.example .env
# edit .env: WA_OWNERS=628xxxx, WEBHOOK_TOKEN=token-acak
npm run dev
```

Pertama kali jalan akan menampilkan QR di terminal — buka WhatsApp → **Linked Devices** → scan.

Server webhook listen di port **3000** (atur di `WEBHOOK_PORT`).

## Setup HP Android (MacroDroid)

1. Install **MacroDroid** dari Play Store.
2. Beri izin **Notification Access** ke MacroDroid.
3. Buat macro baru:
   - **Trigger**: *Notification → Notification Received*
     - Aplikasi: pilih app bank yang kamu pakai (BCA, Livin', BRImo, dst). Bisa pilih banyak app sekaligus dengan beberapa macro atau pakai satu macro per app.
   - **Action**: *Connectivity → HTTP Request*
     - Method: `POST`
     - URL: `https://your-server.example.com/notif` (atau IP lokal kalau server di dalam jaringan rumah, mis. `http://192.168.1.10:3000/notif`)
     - Headers:
       ```
       Content-Type: application/json
       Authorization: Bearer ISI_DENGAN_WEBHOOK_TOKEN
       ```
     - Body (JSON):
       ```json
       {
         "source": "android",
         "app": "[notification_package]",
         "title": "[notification_title]",
         "text": "[notification_text]",
         "receivedAt": [system_time_millis]
       }
       ```
       *Tag dalam kurung siku adalah magic-text MacroDroid yang otomatis diisi.*

> **Tasker** punya cara serupa: AutoNotification (atau Notification event) → HTTP Request action.

> Aplikasi alternatif: *"Notification Forwarder"* atau *"AutoNotification + Tasker"*. Apapun yang bisa POST JSON ke webhook sudah cukup.

## Setup WhatsApp self-listen (opsional)

Kalau bankmu juga kirim notifikasi via WhatsApp resmi (mis. HaloBCA, BRI Info, Livin'), tambahkan nomor WA mereka ke `WA_BANK_SOURCES`:

```env
WA_BANK_SOURCES=6281804500888,6281190001946
```

Format: nomor internasional tanpa `+`, dipisah koma. Pesan dari nomor-nomor itu akan diparse otomatis sebagai sumber transaksi.

> Nomor di atas hanya contoh — cek nomor resmi WA bankmu langsung dari app/web resmi bank.

## Perintah WhatsApp (kirim dari nomor `WA_OWNERS`)

| Perintah | Contoh |
|---|---|
| `/menu` | tampilkan bantuan |
| `/saldo [range]` | ringkasan in/out/selisih |
| `/laporan [range]` | semua transaksi |
| `/pengeluaran [range]` | hanya pengeluaran |
| `/pemasukan [range]` | hanya pemasukan |
| `/top [range] [N]` | top outlet pengeluaran |
| `/catat <in\|out> <jumlah> <nama>` | catat manual |

Range yang didukung:
- `hari ini`, `kemarin`, `minggu ini`, `bulan ini`, `bulan lalu`
- `1-30 bulan lalu`, `5-15 bulan ini`
- `2026-01-01:2026-01-31`
- `01/05/2026:10/05/2026`

Contoh:
```
/saldo bulan lalu
/pengeluaran 1-30 bulan lalu
/top bulan ini 5
/laporan 2026-04-01:2026-04-15
```

## Cek webhook

```bash
curl -s http://localhost:3000/health
# {"ok":true}

curl -s -X POST http://localhost:3000/notif \
  -H 'Authorization: Bearer ISI_TOKENMU' \
  -H 'Content-Type: application/json' \
  -d '{
    "source":"android",
    "app":"com.bca.mybca.omni.android",
    "title":"BCA",
    "text":"QRIS di STARBUCKS RESERVE Rp 75.000 berhasil"
  }'
# {"matched":true,"inserted":true,"tx":{...}}
```

## Catatan kalibrasi parser

Setiap bank punya format teks notif yang unik dan kadang berubah. Baseline regex sudah cocok untuk format umum bahasa Indonesia. Kolom `raw_title` dan `raw_text` disimpan di DB sehingga bisa dipakai untuk debugging dan menyesuaikan regex per-bank di `src/notif/parsers/<bank>.ts`.

Kalau ada notif yang tidak ke-detect (response webhook `{"matched":false}`), kirim contoh teksnya — saya bisa tweak regex bank yang bersangkutan.

## Lisensi
MIT
