import { Draft } from '@prisma/client';

// ─────────────────────────────────────────
// FORMAT DRAFT PREVIEW (shown to user before submit)
// ─────────────────────────────────────────
export function formatDraftPreview(draft: Draft): string {
  const purposeEmoji: Record<string, string> = {
    Buy: '🔵 BUY',
    Sell: '🟢 SELL',
    Rent: '🟡 RENT',
    'Rent Out': '🟠 RENT OUT',
  };

  const typeEmoji: Record<string, string> = {
    Flat: '🏢',
    House: '🏠',
    Shop: '🏪',
    Portion: '🏘️',
  };

  const emoji = typeEmoji[draft.propertyType || ''] || '🏠';
  const purpose = purposeEmoji[draft.purpose || ''] || draft.purpose;

  const location = [draft.city, draft.area, draft.street].filter(Boolean).join(', ');

  let msg = `${emoji} *${draft.propertyType?.toUpperCase()}* — ${purpose}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (location) msg += `📍 *Location:* ${location}\n`;
  if (draft.price) msg += `💰 *Price:* PKR ${draft.price}\n`;
  if (draft.size) msg += `📐 *Size:* ${draft.size}\n`;
  if (draft.bedrooms) msg += `🛏️ *Bedrooms:* ${draft.bedrooms}\n`;
  if (draft.bathrooms) msg += `🚿 *Bathrooms:* ${draft.bathrooms}\n`;
  if (draft.description) msg += `📝 *Features:* ${draft.description}\n`;
  if (draft.mediaLinks) msg += `🖼️ *Media:* ${draft.mediaLinks}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📞 Contact: _[Hidden — shared privately]_\n`;
  msg += `\n✅ *Is this correct?*\n`;
  msg += `Reply:\n*confirm* — Submit for admin review\n*edit* — Make changes\n*cancel* — Discard this post`;

  return msg;
}

// ─────────────────────────────────────────
// FORMAT APPROVED POST (posted in WhatsApp group)
// ─────────────────────────────────────────
export function formatGroupPost(draft: Draft, postId: string): string {
  const purposeEmoji: Record<string, string> = {
    Buy: '🔵 WANTED — BUYING',
    Sell: '🟢 FOR SALE',
    Rent: '🟡 WANTED — RENT',
    'Rent Out': '🟠 FOR RENT',
  };

  const typeEmoji: Record<string, string> = {
    Flat: '🏢 FLAT',
    House: '🏠 HOUSE',
    Shop: '🏪 SHOP',
    Portion: '🏘️ PORTION',
  };

  const emoji = typeEmoji[draft.propertyType || ''] || '🏠 PROPERTY';
  const purpose = purposeEmoji[draft.purpose || ''] || draft.purpose;

  const location = [draft.city, draft.area, draft.street].filter(Boolean).join(', ');

  let msg = `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `${emoji} | ${purpose}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  if (location) msg += `📍 *${location}*\n\n`;
  if (draft.price) msg += `💰 *Price:* PKR ${draft.price}\n`;
  if (draft.size) msg += `📐 *Size:* ${draft.size}\n`;
  if (draft.bedrooms) msg += `🛏️ *Bedrooms:* ${draft.bedrooms}\n`;
  if (draft.bathrooms) msg += `🚿 *Bathrooms:* ${draft.bathrooms}\n`;
  if (draft.description) msg += `\n📝 ${draft.description}\n`;
  if (draft.mediaLinks) msg += `\n🖼️ *Photos/Videos:* ${draft.mediaLinks}\n`;
  msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📞 *Contact Owner:* Reply *interested #${postId.slice(-6)}* in this group\n`;
  msg += `_I Rabbi Estate Bot — Karachi Real Estate_`;

  return msg;
}

// ─────────────────────────────────────────
// FORMAT ADMIN MODERATION MESSAGE
// ─────────────────────────────────────────
export function formatAdminModerationMsg(draft: Draft): string {
  const preview = formatDraftPreview(draft);
  let msg = `🔔 *NEW POST FOR REVIEW*\n`;
  msg += `Draft ID: \`${draft.id}\`\n\n`;
  msg += preview;
  msg += `\n\n━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📞 *Hidden Contact:* ${draft.contactNumber}\n\n`;
  msg += `*Admin Commands:*\n`;
  msg += `✅ *approve ${draft.id.slice(-6)}* — Approve & post\n`;
  msg += `❌ *reject ${draft.id.slice(-6)} <reason>* — Reject\n`;
  msg += `✏️ *edit ${draft.id.slice(-6)} price 50lakh* — Edit field`;
  return msg;
}

// ─────────────────────────────────────────
// FORMAT USER'S POST LIST
// ─────────────────────────────────────────
export function formatUserPostList(posts: any[]): string {
  if (posts.length === 0) {
    return `📭 *Aap ka koi active post nahi hai.*\n\nNaya post banane ke liye *post* likhein.`;
  }

  let msg = `📋 *Aap ke Active Posts (${posts.length}):*\n\n`;
  posts.forEach((p, i) => {
    const draft = p.draft;
    msg += `${i + 1}. *${draft.propertyType}* — ${draft.purpose}\n`;
    msg += `   📍 ${[draft.city, draft.area].filter(Boolean).join(', ')}\n`;
    msg += `   💰 ${draft.price || 'N/A'} | 🆔 #${p.id.slice(-6)}\n\n`;
  });

  msg += `Commands:\n`;
  msg += `*delete #XXXXXX* — Delete a post\n`;
  msg += `*view #XXXXXX* — View full post details`;

  return msg;
}
