import { execSync } from 'child_process';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { Ingest } from './ingest';
import { RawNotif } from './parsers/types';

/**
 * Termux Notification Listener
 *
 * Menggunakan `termux-notification-list` (dari paket Termux:API)
 * untuk polling notifikasi HP setiap beberapa detik.
 * TIDAK PERLU install app tambahan (cukup Termux + Termux:API).
 *
 * Notif dari app bank terdeteksi otomatis -> dikirim ke ingest -> catat transaksi.
 */

// Package name app mobile banking Indonesia
const BANK_PACKAGES = [
  'com.bca.mybca.omni.android',     // myBCA
  'com.bca',                         // BCA mobile lama
  'id.co.bca.blu',                   // blu by BCA
  'id.co.mandiri.livin',             // Livin' Mandiri
  'id.co.mandiri',                   // Mandiri Online lama
  'id.co.bri.brimo',                 // BRImo
  'com.bni.mobilebanking',           // BNI Mobile Banking
  'com.bnimobile.eticketing',        // BNI
  'id.co.bankbsi.superapp',          // BSI Mobile / BYOND
  'com.ocaborneo.cimbclicks',        // OCTO Mobile (CIMB Niaga)
  'com.permata.mobilebanking',       // PermataMobile X
  'id.co.bankjago.app',              // Bank Jago
  'id.co.btpn.dc',                   // Jenius / BTPN
  'com.gojek.app',                   // Gojek (GoPay)
  'id.dana',                         // DANA
  'com.ovo.id',                      // OVO
  'com.shopee.id',                   // Shopee (ShopeePay)
  'com.telkom.mylinaja',             // LinkAja
];

// Set untuk tracking notif yang sudah diproses (agar tidak duplikat)
const processed = new Set<string>();
const MAX_PROCESSED = 5000;

let pollTimer: NodeJS.Timeout | undefined;

export function startNotifListener(ingest: Ingest, intervalMs = 5000) {
  // Cek apakah termux-notification-list tersedia
  if (!isTermuxApiAvailable()) {
    logger.warn(
      'termux-notification-list tidak tersedia. ' +
      'Pastikan sudah install Termux:API dari F-Droid dan jalankan: pkg install termux-api'
    );
    logger.info('Bot tetap jalan (sumber notif: WA self-listen saja)');
    return;
  }

  logger.info({ intervalMs }, 'Android notification listener aktif');
  pollTimer = setInterval(() => pollNotifications(ingest), intervalMs);
  // Initial poll
  pollNotifications(ingest);
}

export function stopNotifListener() {
  if (pollTimer) clearInterval(pollTimer);
}

function isTermuxApiAvailable(): boolean {
  try {
    execSync('which termux-notification-list', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function pollNotifications(ingest: Ingest) {
  try {
    const raw = execSync('termux-notification-list', {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let notifications: any[];
    try {
      notifications = JSON.parse(raw);
    } catch {
      return; // parse gagal, skip
    }

    if (!Array.isArray(notifications)) return;

    for (const n of notifications) {
      // Filter hanya notif dari app bank
      const pkg = n.packageName || '';
      if (!BANK_PACKAGES.some((p) => pkg.includes(p) || pkg.startsWith(p.split('.').slice(0, 2).join('.')))) {
        continue;
      }

      // Buat unique key untuk anti-duplikat
      const key = `${pkg}|${n.id || ''}|${n.when || ''}|${(n.content || '').slice(0, 50)}`;
      const hash = crypto.createHash('sha1').update(key).digest('hex');

      if (processed.has(hash)) continue;
      processed.add(hash);

      // Cegah memory leak
      if (processed.size > MAX_PROCESSED) {
        const entries = [...processed];
        entries.slice(0, 1000).forEach((e) => processed.delete(e));
      }

      const text = [n.title, n.content, n.text].filter(Boolean).join(' ');
      if (!text.trim()) continue;

      const notif: RawNotif = {
        id: hash,
        source: 'android',
        app: pkg,
        title: n.title || '',
        text,
        receivedAt: n.when || Date.now(),
      };

      const result = ingest.ingest(notif);
      if (result.inserted) {
        logger.info({ bank: result.tx?.bank, amount: result.tx?.amount, merchant: result.tx?.merchant },
          'Transaksi terdeteksi dari notif Android');
      }
    }
  } catch (e: any) {
    // Hanya warn, jangan crash kalau termux-api error
    if (!String(e?.message || '').includes('ENOENT')) {
      logger.debug({ err: e?.message }, 'notif poll error');
    }
  }
}
