import { WASocket, proto } from '@whiskeysockets/baileys';
import {
  getOrCreateUser, createLead, markLeadContacted,
  getPostById, getTodayLeads, getUserByNumber
} from '../db/queries';
import prisma from '../db/client';
import { config } from '../config';
import { extractPostId } from '../utils/validator';
import { createLog } from '../db/queries';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────
// LEAD / INTEREST HANDLER
// Called when user writes "interested #XXXXXX" in group
// ─────────────────────────────────────────
export async function handleLeadCommand(
  sock: WASocket,
  groupJid: string,
  waNumber: string,
  text: string,
  message: proto.IWebMessageInfo
) {
  const shortId = extractPostId(text);

  if (!shortId) {
    // Interested without ID — ignore
    return;
  }

  // Get or create user
  const user = await getOrCreateUser(waNumber);
  const userJid = `${waNumber}@s.whatsapp.net`;

  // Find post — search active posts by short ID (last 6 chars)
  const allPosts = await prisma.post.findMany({
    where: { isActive: true },
    include: { draft: true, user: true },
  });
  const post = allPosts.find(p => p.id.slice(-6).toLowerCase() === shortId.toLowerCase()) || null;

  if (!post) {
    await sock.sendMessage(userJid, {
      text: `❌ Post #${shortId} nahi mila ya band ho gaya.\n\nSahi post ID check karein.`,
    });
    return;
  }

  // Can't be interested in own post
  if (post.userId === user.id) {
    await sock.sendMessage(userJid, {
      text: `ℹ️ Yeh aap ka apna post hai! Aap apne aap se interested nahi ho sakte. 😄`,
    });
    return;
  }

  // Create lead (deduped)
  const lead = await createLead(post.id, user.id);

  if (!lead) {
    // Already interested
    await sock.sendMessage(userJid, {
      text: `ℹ️ *Aap ne pehle se is post mein interest show kiya hua hai.*\n\nOwner ka number: *${post.draft.contactNumber}*`,
    });
    return;
  }

  // Mark as contacted
  await markLeadContacted(lead.id);

  // Send contact to interested user (private)
  await sock.sendMessage(userJid, {
    text: `✅ *Great! Aap ne interest show kiya.*\n\n🏠 *${post.draft.propertyType}* — ${post.draft.purpose}\n📍 ${[post.draft.city, post.draft.area].filter(Boolean).join(', ')}\n\n📞 *Owner ka number:* ${post.draft.contactNumber}\n\n_Directly owner se rabta karein._\n\n_Rabbi Estate Bot — Shukriya!_`,
  });

  // Notify post owner
  const ownerJid = `${post.user.waNumber}@s.whatsapp.net`;
  await sock.sendMessage(ownerJid, {
    text: `🔔 *Koi aap ki property mein interested hai!*\n\n🏠 *${post.draft.propertyType}* — ${post.draft.purpose}\n📍 ${[post.draft.city, post.draft.area].filter(Boolean).join(', ')}\n\n_Interested party ne aap ka number receive kar liya hai. Woh aap se contact kar sakte hain._\n\n_Rabbi Estate Bot_`,
  });

  // Notify admin
  await sock.sendMessage(config.adminNumber, {
    text: `📊 *New Lead!*\nPost: #${post.id.slice(-6)}\nProperty: ${post.draft.propertyType} — ${post.draft.purpose}\nLocation: ${[post.draft.city, post.draft.area].filter(Boolean).join(', ')}\nInterested User: ${waNumber}`,
  });

  await createLog('LEAD_CREATED', user.id, `Post ID: ${post.id}`);
  logger.info({ waNumber, postId: post.id }, 'Lead created');
}

// ─────────────────────────────────────────
// DAILY LEAD SUMMARY (called by cron job)
// ─────────────────────────────────────────
export async function sendDailyLeadReport(sock: WASocket) {
  try {
    const leads = await getTodayLeads();

    if (leads.length === 0) {
      await sock.sendMessage(config.adminNumber, {
        text: `📊 *Daily Lead Report — ${new Date().toLocaleDateString('en-PK')}*\n\nAaj koi lead nahi aayi.`,
      });
      return;
    }

    let msg = `📊 *Daily Lead Report — ${new Date().toLocaleDateString('en-PK')}*\n\n`;
    msg += `Total Leads Aaj: *${leads.length}*\n\n`;

    leads.forEach((l, i) => {
      const d = l.post.draft;
      msg += `${i + 1}. ${d.propertyType} — ${d.purpose}\n`;
      msg += `   📍 ${[d.city, d.area].filter(Boolean).join(', ')}\n`;
      msg += `   👤 ${l.interestedUser.waNumber}\n\n`;
    });

    await sock.sendMessage(config.adminNumber, { text: msg });
    logger.info({ leadCount: leads.length }, 'Daily lead report sent');
  } catch (err) {
    logger.error({ err }, 'Failed to send daily lead report');
  }
}
