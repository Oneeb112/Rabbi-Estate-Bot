import { WASocket } from '@whiskeysockets/baileys';
import { User } from '@prisma/client';
import {
  getPendingDrafts, getDraftById, createPost,
  deactivatePost, getPostById, updateDraftField, getUserByNumber,
  createLog
} from '../db/queries.js';
import prisma from '../db/client.js';
import { config } from '../config/index.js';
import { formatGroupPost } from '../utils/formatter.js';
import { logger } from '../utils/logger.js';

// ─────────────────────────────────────────
// ADMIN COMMAND HANDLER
// Returns true if command was handled
// ─────────────────────────────────────────
export async function handleAdminCommand(
  sock: WASocket,
  jid: string,
  waNumber: string,
  text: string,
  user: User
): Promise<boolean> {
  const lower = text.toLowerCase().trim();

  // ─── APPROVE ───
  // Command: "approve ABC123"
  if (lower.startsWith('approve ')) {
    const shortId = lower.split(' ')[1]?.trim();
    if (!shortId) return false;
    await handleApprove(sock, jid, shortId);
    return true;
  }

  // ─── REJECT ───
  // Command: "reject ABC123 reason here"
  if (lower.startsWith('reject ')) {
    const parts = text.split(' ');
    const shortId = parts[1]?.trim();
    const reason = parts.slice(2).join(' ') || 'Admin ne reject kar diya.';
    if (!shortId) return false;
    await handleReject(sock, jid, shortId, reason);
    return true;
  }

  // ─── EDIT DRAFT ───
  // Command: "edit ABC123 price 50lakh"
  if (lower.startsWith('edit ')) {
    const parts = text.split(' ');
    const shortId = parts[1]?.trim();
    const field = parts[2]?.toLowerCase().trim();
    const value = parts.slice(3).join(' ');
    if (!shortId || !field || !value) {
      await sock.sendMessage(jid, {
        text: '⚠️ Format: *edit <ID> <field> <value>*\nExample: edit ABC123 price 50lakh',
      });
      return true;
    }
    await handleAdminEdit(sock, jid, shortId, field, value);
    return true;
  }

  // ─── VIEW PENDING QUEUE ───
  if (lower === 'queue' || lower === 'pending' || lower === 'admin queue') {
    await showAdminQueue(sock, jid);
    return true;
  }

  // ─── ADMIN FORCE DELETE POST ───
  if (lower.startsWith('admin delete ') || lower.startsWith('forcedelete ')) {
    const shortId = lower.split(' ').pop()?.trim() || '';
    await handleAdminDelete(sock, jid, shortId);
    return true;
  }

  return false; // Not an admin command
}

// ─────────────────────────────────────────
// APPROVE DRAFT
// ─────────────────────────────────────────
async function handleApprove(sock: WASocket, adminJid: string, shortId: string) {
  // Find draft by short ID (last 6 chars)
  const drafts = await getPendingDrafts();
  const draft = drafts.find(d => d.id.slice(-6).toLowerCase() === shortId.toLowerCase());

  if (!draft) {
    await sock.sendMessage(adminJid, {
      text: `❌ Draft #${shortId} nahi mila. Check *queue* command.`,
    });
    return;
  }

  // Post to WhatsApp group
  const postText = formatGroupPost(draft, draft.id);
  let groupMsgId: string | undefined;

  try {
    const sent = await sock.sendMessage(config.groupJid, { text: postText });
    groupMsgId = sent?.key?.id || undefined;
    logger.info({ draftId: draft.id }, 'Post sent to group');
  } catch (err) {
    logger.error({ err }, 'Failed to send post to group');
    await sock.sendMessage(adminJid, { text: `❌ Group mein post bhejne mein error aaya. Try again.` });
    return;
  }

  // Create post in DB
  const post = await createPost(draft.id, draft.userId, groupMsgId);

  // Notify admin
  await sock.sendMessage(adminJid, {
    text: `✅ *Post #${post.id.slice(-6)} approved aur group mein post ho gaya!*`,
  });

  // Notify post owner
  const owner = await getUserByNumber(draft.user.waNumber);
  if (owner) {
    await sock.sendMessage(`${draft.user.waNumber}@s.whatsapp.net`, {
      text: `🎉 *Mubarak ho! Aap ka property post approve ho gaya!*\n\n📢 Post ab Rabbi Estate WhatsApp Group mein live hai.\n\n_Post ID: #${post.id.slice(-6)}_\n\nDosron ko interested hone pe aap ko notify kiya jayega.`,
    });
  }

  await createLog('POST_APPROVED', draft.userId, `Post ID: ${post.id}`);
}

// ─────────────────────────────────────────
// REJECT DRAFT
// ─────────────────────────────────────────
async function handleReject(sock: WASocket, adminJid: string, shortId: string, reason: string) {
  const drafts = await getPendingDrafts();
  const draft = drafts.find(d => d.id.slice(-6).toLowerCase() === shortId.toLowerCase());

  if (!draft) {
    await sock.sendMessage(adminJid, { text: `❌ Draft #${shortId} nahi mila.` });
    return;
  }

  // Update status
  await updateDraftField(draft.id, 'status', 'REJECTED');
  await updateDraftField(draft.id, 'adminNote', reason);

  await sock.sendMessage(adminJid, {
    text: `❌ *Draft #${shortId} reject kar diya gaya.*`,
  });

  // Notify owner
  await sock.sendMessage(`${draft.user.waNumber}@s.whatsapp.net`, {
    text: `😔 *Aap ka property post reject ho gaya.*\n\n📝 *Wajah:* ${reason}\n\n_Kripya post mein tabdeel karein aur dobara submit karein. *post* likhein._`,
  });

  await createLog('POST_REJECTED', draft.userId, `Draft ID: ${draft.id}, Reason: ${reason}`);
}

// ─────────────────────────────────────────
// ADMIN EDIT DRAFT FIELD
// ─────────────────────────────────────────
async function handleAdminEdit(sock: WASocket, adminJid: string, shortId: string, field: string, value: string) {
  const drafts = await getPendingDrafts();
  const draft = drafts.find(d => d.id.slice(-6).toLowerCase() === shortId.toLowerCase());

  if (!draft) {
    await sock.sendMessage(adminJid, { text: `❌ Draft #${shortId} nahi mila.` });
    return;
  }

  const validFields = ['propertytype', 'purpose', 'city', 'area', 'street', 'price', 'size', 'bedrooms', 'bathrooms', 'description', 'medialinks', 'contactnumber'];
  const fieldMap: Record<string, string> = {
    'propertytype': 'propertyType',
    'purpose': 'purpose',
    'city': 'city',
    'area': 'area',
    'street': 'street',
    'price': 'price',
    'size': 'size',
    'bedrooms': 'bedrooms',
    'bathrooms': 'bathrooms',
    'description': 'description',
    'medialinks': 'mediaLinks',
    'contactnumber': 'contactNumber',
  };

  if (!validFields.includes(field)) {
    await sock.sendMessage(adminJid, {
      text: `❌ Invalid field. Valid fields: ${validFields.join(', ')}`,
    });
    return;
  }

  await updateDraftField(draft.id, fieldMap[field], value);
  await sock.sendMessage(adminJid, {
    text: `✅ *Draft #${shortId}* — *${field}* updated to: ${value}\n\nAb approve karne ke liye: *approve ${shortId}*`,
  });
}

// ─────────────────────────────────────────
// SHOW ADMIN QUEUE
// ─────────────────────────────────────────
async function showAdminQueue(sock: WASocket, adminJid: string) {
  const pending = await getPendingDrafts();

  if (pending.length === 0) {
    await sock.sendMessage(adminJid, { text: `✅ *Queue khali hai — koi pending post nahi.*` });
    return;
  }

  let msg = `📋 *Pending Post Queue (${pending.length}):*\n\n`;
  pending.forEach((d, i) => {
    const location = [d.city, d.area].filter(Boolean).join(', ');
    msg += `${i + 1}. *${d.propertyType}* — ${d.purpose}\n`;
    msg += `   📍 ${location || 'N/A'}\n`;
    msg += `   💰 ${d.price || 'N/A'}\n`;
    msg += `   🆔 #${d.id.slice(-6)}\n\n`;
  });

  msg += `Commands:\n✅ *approve <ID>*\n❌ *reject <ID> <reason>*\n✏️ *edit <ID> <field> <value>*`;

  await sock.sendMessage(adminJid, { text: msg });
}

// ─────────────────────────────────────────
// ADMIN FORCE DELETE POST
// ─────────────────────────────────────────
async function handleAdminDelete(sock: WASocket, adminJid: string, shortId: string) {
  // Find by short post ID (last 6 chars)
  const allPosts = await prisma.post.findMany({
    where: { isActive: true },
  });
  const post = allPosts.find(p => p.id.slice(-6).toLowerCase() === shortId.toLowerCase());
  
  if (!post) {
    await sock.sendMessage(adminJid, { text: `❌ Post #${shortId} nahi mila.` });
    return;
  }
  await deactivatePost(post.id);
  await sock.sendMessage(adminJid, { text: `✅ Post #${shortId} delete kar diya gaya.` });
  await createLog('POST_ADMIN_DELETED', post.userId, `Post ID: ${post.id}`);
}
