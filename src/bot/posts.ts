import { WASocket } from '@whiskeysockets/baileys';
import {
  getUserActivePosts, getPostById, deactivatePost,
  getUserByNumber
} from '../db/queries';
import { formatUserPostList } from '../utils/formatter';
import { extractPostId } from '../utils/validator';
import { createLog } from '../db/queries';

// ─────────────────────────────────────────
// POST CRUD COMMANDS
// ─────────────────────────────────────────
export async function handlePostCommand(
  sock: WASocket,
  jid: string,
  waNumber: string,
  command: 'list' | 'delete' | 'view',
  text: string | null
) {
  const user = await getUserByNumber(waNumber);
  if (!user) return;

  switch (command) {
    // ─── LIST POSTS ───
    case 'list': {
      const posts = await getUserActivePosts(user.id);
      const msg = formatUserPostList(posts);
      await sock.sendMessage(jid, { text: msg });
      break;
    }

    // ─── DELETE POST ───
    case 'delete': {
      const shortId = text ? extractPostId(text) : null;
      if (!shortId) {
        await sock.sendMessage(jid, {
          text: `⚠️ Format: *delete #XXXXXX*\n\nApne posts dekhne ke liye: *my posts*`,
        });
        return;
      }

      // Find post — match last 6 chars of ID
      const posts = await getUserActivePosts(user.id);
      const post = posts.find(p => p.id.slice(-6).toLowerCase() === shortId.toLowerCase());

      if (!post) {
        await sock.sendMessage(jid, {
          text: `❌ Post #${shortId} aap ke account mein nahi mila.\n\nApne posts: *my posts*`,
        });
        return;
      }

      await deactivatePost(post.id);
      await createLog('POST_DELETED', user.id, `Post ID: ${post.id}`);
      await sock.sendMessage(jid, {
        text: `🗑️ *Post #${shortId} delete kar diya gaya.*\n\nNaya post: *post*`,
      });
      break;
    }

    // ─── VIEW POST ───
    case 'view': {
      const shortId = text ? extractPostId(text) : null;
      if (!shortId) {
        await sock.sendMessage(jid, {
          text: `⚠️ Format: *view #XXXXXX*`,
        });
        return;
      }

      const posts = await getUserActivePosts(user.id);
      const post = posts.find(p => p.id.slice(-6).toLowerCase() === shortId.toLowerCase());

      if (!post) {
        await sock.sendMessage(jid, {
          text: `❌ Post #${shortId} nahi mila.`,
        });
        return;
      }

      const d = post.draft;
      const location = [d.city, d.area, d.street].filter(Boolean).join(', ');
      let msg = `📋 *Post #${shortId} Details:*\n\n`;
      msg += `🏠 Type: ${d.propertyType}\n`;
      msg += `📋 Purpose: ${d.purpose}\n`;
      msg += `📍 Location: ${location || 'N/A'}\n`;
      msg += `💰 Price: ${d.price || 'N/A'}\n`;
      msg += `📐 Size: ${d.size || 'N/A'}\n`;
      msg += `🛏️ Beds: ${d.bedrooms || 'N/A'}\n`;
      msg += `🚿 Baths: ${d.bathrooms || 'N/A'}\n`;
      msg += `📝 Description: ${d.description || 'N/A'}\n`;
      msg += `🖼️ Media: ${d.mediaLinks || 'N/A'}\n`;
      msg += `👁️ Views: ${post.viewCount}\n`;
      msg += `📅 Posted: ${post.postedAt.toLocaleDateString('ur-PK')}\n\n`;
      msg += `*delete #${shortId}* — Post delete karein`;

      await sock.sendMessage(jid, { text: msg });
      break;
    }
  }
}
