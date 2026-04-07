# Rabbi Estate Bot 🏠

WhatsApp-based Real Estate Bot for Karachi/Pakistan market.
Built with Baileys (Node.js), Prisma, and MySQL on Railway.app.

---

## Features
- ✅ 10-step property listing form (with skip, edit, cancel)
- ✅ Admin moderation via WhatsApp commands
- ✅ Approved posts auto-posted to WhatsApp group
- ✅ Lead management — interested users get hidden contact privately
- ✅ 500 forms/month limit with auto-reset
- ✅ English + Urdu + Roman Urdu support
- ✅ Daily lead reports to admin (9 AM PKT)
- ✅ Auto-reconnect on disconnect

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Generate Prisma client
npm run prisma:generate

# 4. Create DB tables
npm run prisma:migrate

# 5. Start bot (scan QR code when prompted)
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string from Railway |
| `ADMIN_NUMBER` | Admin WhatsApp number (without + or @) |
| `GROUP_JID` | WhatsApp Group JID |
| `MAX_FORMS_PER_MONTH` | Monthly form limit (default: 500) |
| `BOT_NAME` | Bot display name |

---

## Admin Commands (WhatsApp)

| Command | Action |
|---|---|
| `queue` | Show pending posts |
| `approve ABC123` | Approve and post to group |
| `reject ABC123 reason` | Reject with reason |
| `edit ABC123 price 50lakh` | Edit a draft field |
| `admin delete ABC123` | Force delete a post |

---

## User Commands (WhatsApp)

| Command | Action |
|---|---|
| `hi` / `start` | Welcome message |
| `post` | Start new property listing |
| `my posts` | View your active posts |
| `delete #XXXXXX` | Delete your post |
| `view #XXXXXX` | View post details |
| `interested #XXXXXX` | Show interest in group post |
| `help` | Show all commands |

---

## Deployment (Railway.app)

1. Push code to GitHub
2. Connect repo to Railway.app
3. Add MySQL plugin to Railway project
4. Set all environment variables
5. Deploy — Railway auto-builds & runs

---

## Cost: ~300-500 PKR/month (Railway free tier covers bot + DB)
