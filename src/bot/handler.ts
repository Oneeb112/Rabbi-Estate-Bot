import { WASocket, proto } from '@whiskeysockets/baileys';
import { getOrCreateUser, updateUserSession, checkMonthlyFormLimit } from '../db/queries.js';
import { config } from '../config/index.js';
import { handleFormStep } from './form.js';
import { handleAdminCommand } from './moderation.js';
import { handlePostCommand } from './posts.js';
import { handleLeadCommand } from './leads.js';
import { logger } from '../utils/logger.js';

// Rate limiting: track message counts in memory
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function isRateLimited(waNumber: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(waNumber);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(waNumber, { count: 1, reset: now + 3600000 }); // 1 hour
    return false;
  }
  if (entry.count >= config.maxMsgsPerUserPerHour) return true;
  entry.count++;
  return false;
}

// ─────────────────────────────────────────
// WELCOME MESSAGE
// ─────────────────────────────────────────
function getWelcomeMessage(): string {
  return `👋 *Assalam-o-Alaikum! Rabbi Estate Bot mein Khush Amdeed!*
🏠 _Karachi Real Estate — Buy | Sell | Rent_

━━━━━━━━━━━━━━━━━━━━━
📌 *Aap kya karna chahte hain?*

🏡 *post* — Naya property post banayein
📋 *my posts* — Apne active posts dekhein
ℹ️ *help* — Help aur commands
━━━━━━━━━━━━━━━━━━━━━

_Kisi bhi group post pe interested hone ke liye:_
*interested #POSTID* likhein

🤖 _Rabbi Estate Bot — Powered by AI_`;
}

function getHelpMessage(): string {
  return `📖 *Rabbi Estate Bot — Help*

━━━━━━━━━━━━━━━━━━━━━
*🏡 POST MANAGEMENT*
• *post* — Naya listing shuru karein
• *my posts* — Apne posts dekhein
• *delete #XXXXXX* — Post delete karein
• *view #XXXXXX* — Post ki details dekhein

*👥 LEAD / INTEREST*
• *interested #XXXXXX* — Kissi post mein interested hain

*🔄 FORM COMMANDS*
• *skip* — Optional step skip karein
• *cancel* — Form band karein
• *back* — Pichle step pe jayein

━━━━━━━━━━━━━━━━━━━━━
📞 Support ke liye admin se rabta karein.`;
}

// ─────────────────────────────────────────
// MAIN MESSAGE HANDLER
// ─────────────────────────────────────────
export async function handleIncomingMessage(
  sock: WASocket,
  message: proto.IWebMessageInfo
) {
  const jid = message.key.remoteJid!;
  const isGroup = jid.endsWith('@g.us');

  // Only process private messages + group messages with bot mention
  if (isGroup) {
    // In group: only handle "interested #ID" command
    const text = extractText(message)?.toLowerCase().trim() || '';
    if (text.startsWith('interested')) {
      const waNumber = message.key.participant?.replace('@s.whatsapp.net', '') || '';
      await handleLeadCommand(sock, jid, waNumber, text, message);
    }
    return;
  }

  // Private message handling
  const waNumber = jid.replace('@s.whatsapp.net', '');
  const text = extractText(message)?.trim() || '';

  if (!text) return; // Ignore non-text messages (images, etc.)

  logger.info({ waNumber, text: text.slice(0, 50) }, 'Incoming message');

  // Rate limiting
  if (isRateLimited(waNumber)) {
    await sock.sendMessage(jid, {
      text: '⚠️ Aap bahut zyada messages bhej rahe hain. Kuch der baad try karein.',
    });
    return;
  }

  // Get or create user
  const user = await getOrCreateUser(waNumber);

  if (user.isBanned) {
    await sock.sendMessage(jid, { text: '🚫 Aap ka account block kar diya gaya hai.' });
    return;
  }

  // ─── ADMIN COMMANDS ───
  if (user.isAdmin || waNumber === config.adminNumber.replace('@s.whatsapp.net', '')) {
    const adminHandled = await handleAdminCommand(sock, jid, waNumber, text, user);
    if (adminHandled) return;
  }

  const lower = text.toLowerCase();

  // ─── GLOBAL COMMANDS ───
  if (['hi', 'hello', 'start', 'salam', 'helo', 'السلام', 'assalam'].some(w => lower.includes(w)) && user.sessionState === 'IDLE') {
    await sock.sendMessage(jid, { text: getWelcomeMessage() });
    return;
  }

  if (lower === 'help' || lower === 'madad') {
    await sock.sendMessage(jid, { text: getHelpMessage() });
    return;
  }

  if ((lower === 'post' || lower === 'naya post' || lower === 'new post' || lower === 'listing') && user.sessionState === 'IDLE') {
    // Check monthly limit
    const canPost = await checkMonthlyFormLimit(waNumber, config.maxFormsPerMonth);
    if (!canPost) {
      await sock.sendMessage(jid, {
        text: `⚠️ *Monthly limit ${config.maxFormsPerMonth} posts pahunch gayi.*\nAgle mahine try karein.`,
      });
      return;
    }
    // Start form
    await handleFormStep(sock, jid, waNumber, user, 'START', null);
    return;
  }

  if (lower === 'my posts' || lower === 'mere posts' || lower === 'meri listings') {
    await handlePostCommand(sock, jid, waNumber, 'list', null);
    return;
  }

  if (lower.startsWith('delete') || lower.startsWith('delete #')) {
    await handlePostCommand(sock, jid, waNumber, 'delete', text);
    return;
  }

  if (lower.startsWith('view') || lower.startsWith('view #')) {
    await handlePostCommand(sock, jid, waNumber, 'view', text);
    return;
  }

  // ─── FORM IN PROGRESS ───
  if (user.sessionState.startsWith('FORM_STEP') || user.sessionState === 'AWAITING_CONFIRM') {
    await handleFormStep(sock, jid, waNumber, user, text, user.activeDraftId);
    return;
  }

  // ─── DEFAULT: Show welcome if idle ───
  if (user.sessionState === 'IDLE') {
    await sock.sendMessage(jid, { text: getWelcomeMessage() });
  }
}

// ─────────────────────────────────────────
// EXTRACT TEXT FROM MESSAGE
// ─────────────────────────────────────────
function extractText(message: proto.IWebMessageInfo): string | null {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    null
  );
}
