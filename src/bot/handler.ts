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
📌 *Aap kya karna chahte hain? (Select an option):*

1️⃣ *post* — Naya property post banayein
2️⃣ *my posts* — Apne active posts dekhein
3️⃣ *help* — Help aur mazeed commands
━━━━━━━━━━━━━━━━━━━━━

_Reply with number (1-3) or type the command._

_Kisi bhi group post pe interested hone ke liye:_
*interested #POSTID* likhein

🤖 _Rabbi Estate Bot — Powered by AI_`;
}

function getHelpMessage(): string {
  return `📖 *Rabbi Estate Bot — Help Guide*

━━━━━━━━━━━━━━━━━━━━━
*🏡 POST MANAGEMENT*
• *1* ya *post* — Naya listing shuru karein
• *2* ya *my posts* — Apne active posts dekhein
• *delete #XXXXXX* — Purana post delete karein
• *view #XXXXXX* — Post ki details dekhein

*👥 LEAD / INTEREST*
• *interested #XXXXXX* — Kisi post mein dilchaspi zahir karein

*🔄 FORM COMMANDS*
• *0* — (skip) Optional step ko chhorne ke liye
• *3* — (cancel) Form khatam karne ke liye
• *back* — Pichle step pe jane ke liye

━━━━━━━━━━━━━━━━━━━━━
📞 Support ke liye admin se rabta (contact) karein.`;
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

  // ─── FORM IN PROGRESS (High Priority) ───
  if (user.sessionState.startsWith('FORM_STEP') || user.sessionState === 'AWAITING_CONFIRM') {
    await handleFormStep(sock, jid, waNumber, user, text, user.activeDraftId, message);
    return;
  }


  const lower = text.toLowerCase();

  // ─── GLOBAL COMMANDS ───
  if (['hi', 'hello', 'start', 'salam', 'helo', 'السلام', 'assalam'].some(w => lower.includes(w)) && user.sessionState === 'IDLE') {
    const sections = [
      {
        title: "Main Menu",
        rows: [
          { title: "Naya Post (New Post)", rowId: "1", description: "Property listing shuru karein" },
          { title: "Mere Posts (My Posts)", rowId: "2", description: "Apne active listings dekhein" },
          { title: "Help (Madad)", rowId: "3", description: "Bot use karne ka tareeqa" },
        ]
      }
    ];

    await sock.sendMessage(jid, {
      text: getWelcomeMessage(),
      buttonText: "Menu Chunaein",
      footer: "Rabbi Estate Bot",
      sections
    } as any);
    return;
  }


  if ((lower === 'help' || lower === 'madad' || lower === '3') && user.sessionState === 'IDLE') {
    await sock.sendMessage(jid, { text: getHelpMessage() });
    return;
  }

  if ((lower === 'post' || lower === 'naya post' || lower === 'new post' || lower === 'listing' || lower === '1') && user.sessionState === 'IDLE') {
    // Check monthly limit
    const canPost = await checkMonthlyFormLimit(waNumber, config.maxFormsPerMonth);
    if (!canPost) {
      await sock.sendMessage(jid, {
        text: `⚠️ *Monthly limit ${config.maxFormsPerMonth} posts pahunch gayi.*\nAgle mahine try karein.`,
      });
      return;
    }
    // Start form
    await handleFormStep(sock, jid, waNumber, user, 'START', null, message);
    return;
  }

  if (lower === 'my posts' || lower === 'mere posts' || lower === 'meri listings' || lower === '2') {
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


  // ─── DEFAULT: Show welcome if idle ───
  if (user.sessionState === 'IDLE') {
    await sock.sendMessage(jid, { text: getWelcomeMessage() });
  }
}

// ─────────────────────────────────────────
// EXTRACT TEXT FROM MESSAGE
// ─────────────────────────────────────────
function extractText(message: proto.IWebMessageInfo): string | null {
  const msg = message.message;
  return (
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.buttonsResponseMessage?.selectedButtonId ||
    msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.templateButtonReplyMessage?.selectedId ||
    msg?.imageMessage?.caption ||
    null
  );
}

