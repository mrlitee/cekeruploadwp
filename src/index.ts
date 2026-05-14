import { ImapPoller } from './email/imap';
import { WhatsAppBot } from './whatsapp/bot';
import { logger } from './utils/logger';

async function main() {
  // forward declarations: bot needs sync trigger, poller needs notifier.
  let bot: WhatsAppBot;

  const poller = new ImapPoller((tx) => {
    if (tx) bot?.notifyOwners(tx).catch(() => {});
  });

  bot = new WhatsAppBot(async () => {
    return await poller.scanOnce();
  });

  await bot.start();
  await poller.start();

  process.on('SIGINT', async () => {
    logger.info('shutting down…');
    await poller.stop();
    process.exit(0);
  });
}

main().catch((e) => {
  logger.error(e, 'fatal');
  process.exit(1);
});
