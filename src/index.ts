import 'dotenv/config';

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import cron from 'node-cron';
import { handleIncomingMessage } from './bot/handler.js';
import { sendDailyLeadReport } from './bot/leads.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import prisma from './db/client.js';

// Ensure auth folder exists
if (!fs.existsSync(config.authFolder)) {
  fs.mkdirSync(config.authFolder, { recursive: true });
}

// Simple in-memory message cache (replaces removed makeInMemoryStore)
const msgCache = new Map<string, proto.IWebMessageInfo>();

// ─────────────────────────────────────────
// START BOT
// ─────────────────────────────────────────
async function startBot() {
  // Test DB connection
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error({ err }, '❌ Database connection failed');
    process.exit(1);
  }

  const { state, saveCreds } = await useMultiFileAuthState(config.authFolder);
  const { version } = await fetchLatestBaileysVersion();

  logger.info({ version }, '🚀 Starting Rabbi Estate Bot with Baileys');

  const sock = makeWASocket({
    version,
    logger: logger.child({ module: 'baileys' }) as any,
    printQRInTerminal: true,
    auth: state,
    // Human-like message timing
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => {
      const cacheKey = `${key.remoteJid}:${key.id}`;
      return msgCache.get(cacheKey)?.message || undefined;
    },
  });

  // Cache incoming messages for context
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.id && msg.key.remoteJid) {
        msgCache.set(`${msg.key.remoteJid}:${msg.key.id}`, msg);
      }
    }
  });

  // ─── CONNECTION EVENTS ───
  sock.ev.process(async (events) => {
    // ─── Connection Update ───
    if (events['connection.update']) {
      const { connection, lastDisconnect, qr } = events['connection.update'];

      if (qr) {
        logger.info('📱 Scan QR code with WhatsApp to connect the bot');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        logger.warn({ statusCode }, 'Connection closed');

        if (shouldReconnect) {
          logger.info('🔄 Reconnecting in 5 seconds...');
          setTimeout(startBot, 5000);
        } else {
          logger.error('❌ Logged out. Delete auth folder and restart.');
          process.exit(1);
        }
      }

      if (connection === 'open') {
        logger.info('✅ Rabbi Estate Bot is now ONLINE! 🏠');

        // Set up daily lead report cron (9 AM PKT = 4 AM UTC)
        cron.schedule('0 4 * * *', async () => {
          logger.info('📊 Sending daily lead report...');
          await sendDailyLeadReport(sock);
        });
      }
    }

    // ─── Credentials Update ───
    if (events['creds.update']) {
      await saveCreds();
    }

    // ─── Incoming Messages ───
    if (events['messages.upsert']) {
      const { messages, type } = events['messages.upsert'];

      if (type !== 'notify') return;

      for (const message of messages) {
        // Skip own messages
        if (message.key.fromMe) continue;
        // Skip empty messages
        if (!message.message) continue;

        try {
          await handleIncomingMessage(sock, message);
        } catch (err) {
          logger.error({ err, message: message.key }, 'Error handling message');
        }
      }
    }
  });

  return sock;
}

// ─────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection');
});

// Start!
startBot().catch((err) => {
  logger.error({ err }, 'Fatal error starting bot');
  process.exit(1);
});
