import { WhatsAppBot } from './whatsapp/bot';
import { Ingest } from './notif/ingest';
import { startWebhookServer } from './notif/server';
import { logger } from './utils/logger';

async function main() {
  let bot: WhatsAppBot;

  // Ingest service: dipakai oleh webhook (Android) maupun WA self-listen.
  const ingest = new Ingest((tx) => {
    bot?.notifyOwners(tx).catch(() => {});
  });

  bot = new WhatsAppBot(ingest);

  await bot.start();
  await startWebhookServer(ingest);

  process.on('SIGINT', () => {
    logger.info('shutting down…');
    process.exit(0);
  });
}

main().catch((e) => {
  logger.error(e, 'fatal');
  process.exit(1);
});
