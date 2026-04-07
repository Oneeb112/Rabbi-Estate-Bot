import 'dotenv/config';

export const config = {
  // Admin WhatsApp JID
  adminNumber: `${process.env.ADMIN_NUMBER}@s.whatsapp.net`,

  // Group JID where posts are published
  groupJid: process.env.GROUP_JID || '',

  // Bot Info
  botName: process.env.BOT_NAME || 'Rabbi Estate Bot',

  // Limits
  maxFormsPerMonth: parseInt(process.env.MAX_FORMS_PER_MONTH || '500'),
  maxMsgsPerUserPerHour: parseInt(process.env.MAX_MSGS_PER_USER_PER_HOUR || '50'),

  // Environment
  isDev: process.env.NODE_ENV !== 'production',

  // Session auth folder
  authFolder: './auth_info_baileys',

  // Pairing Code Support
  usePairingCode: process.env.USE_PAIRING_CODE === 'true',
  phoneNumber: process.env.PHONE_NUMBER || '',

  // Lead report hour (PKT)
  leadReportHour: parseInt(process.env.LEAD_REPORT_HOUR || '9'),
};

// ─────────────────────────────────────────
// FORM STEPS DEFINITION
// ─────────────────────────────────────────
export const FORM_STEPS = [
  {
    step: 1,
    field: 'propertyType',
    required: true,
    question: {
      en: '🏠 *Step 1/10 — Property Type*\n\nSelect your property type:\n\n1️⃣ Flat\n2️⃣ House\n3️⃣ Shop\n4️⃣ Portion\n\nReply with number (1-4)',
      ur: '🏠 *مرحلہ 1/10 — پراپرٹی کی قسم*\n\nاپنی پراپرٹی کی قسم منتخب کریں:\n\n1️⃣ فلیٹ\n2️⃣ مکان\n3️⃣ دکان\n4️⃣ پورشن\n\nنمبر لکھیں (1-4)',
    },
    options: ['Flat', 'House', 'Shop', 'Portion'],
    skipable: false,
  },
  {
    step: 2,
    field: 'purpose',
    required: true,
    question: {
      en: '📋 *Step 2/10 — Purpose*\n\nWhat do you want to do with this property?\n\n1️⃣ Buy\n2️⃣ Sell\n3️⃣ Rent (Looking for rent)\n4️⃣ Rent Out (Giving on rent)\n\nReply with number (1-4)',
      ur: '📋 *مرحلہ 2/10 — مقصد*\n\nآپ اس پراپرٹی کے ساتھ کیا کرنا چاہتے ہیں؟\n\n1️⃣ خریدنا\n2️⃣ بیچنا\n3️⃣ کرایہ (کرایہ پر لینا)\n4️⃣ کرایہ دینا\n\nنمبر لکھیں (1-4)',
    },
    options: ['Buy', 'Sell', 'Rent', 'Rent Out'],
    skipable: false,
  },
  {
    step: 3,
    field: 'location',
    required: true,
    question: {
      en: '📍 *Step 3/10 — Location*\n\nPlease send the full location:\nCity, Area, Street/Block\n\n_Example: Karachi, North Nazimabad, Block H_',
      ur: '📍 *مرحلہ 3/10 — مقام*\n\nمکمل پتہ لکھیں:\nشہر، علاقہ، گلی/بلاک\n\n_مثال: کراچی، نارتھ ناظم آباد، بلاک ایچ_',
    },
    skipable: false,
  },
  {
    step: 4,
    field: 'price',
    required: false,
    question: {
      en: '💰 *Step 4/10 — Price / Rent*\n\nEnter price or monthly rent in PKR:\n\n_Example: 1.5 Crore / 25,000/month_\n\nOr type *skip* to skip',
      ur: '💰 *مرحلہ 4/10 — قیمت / کرایہ*\n\nقیمت یا ماہانہ کرایہ PKR میں لکھیں:\n\n_مثال: 1.5 کروڑ / 25,000 ماہانہ_\n\nیا *skip* لکھیں',
    },
    skipable: true,
  },
  {
    step: 5,
    field: 'size',
    required: false,
    question: {
      en: '📐 *Step 5/10 — Size / Area*\n\nEnter the size of the property:\n\n_Example: 120 sq yards / 5 Marla / 1200 sq ft_\n\nOr type *skip* to skip',
      ur: '📐 *مرحلہ 5/10 — سائز / رقبہ*\n\nپراپرٹی کا سائز لکھیں:\n\n_مثال: 120 گز / 5 مرلہ / 1200 مربع فٹ_\n\nیا *skip* لکھیں',
    },
    skipable: true,
  },
  {
    step: 6,
    field: 'bedrooms',
    required: false,
    question: {
      en: '🛏️ *Step 6/10 — Bedrooms*\n\nHow many bedrooms?\n\n_Example: 3_\n\nOr type *skip* to skip',
      ur: '🛏️ *مرحلہ 6/10 — کمرے*\n\nکتنے کمرے ہیں؟\n\n_مثال: 3_\n\nیا *skip* لکھیں',
    },
    skipable: true,
  },
  {
    step: 7,
    field: 'bathrooms',
    required: false,
    question: {
      en: '🚿 *Step 7/10 — Bathrooms*\n\nHow many bathrooms?\n\n_Example: 2_\n\nOr type *skip* to skip',
      ur: '🚿 *مرحلہ 7/10 — باتھ روم*\n\nکتنے باتھ روم ہیں؟\n\n_مثال: 2_\n\nیا *skip* لکھیں',
    },
    skipable: true,
  },
  {
    step: 8,
    field: 'description',
    required: false,
    question: {
      en: '📝 *Step 8/10 — Description / Features*\n\nDescribe the property features:\n\n_Example: Fully furnished, corner plot, near park, lift available, 24hr security_\n\nOr type *skip* to skip',
      ur: '📝 *مرحلہ 8/10 — تفصیل / خصوصیات*\n\nپراپرٹی کی خصوصیات بیان کریں:\n\n_مثال: مکمل فرنیچر، کارنر پلاٹ، پارک کے قریب، لفٹ موجود_\n\nیا *skip* لکھیں',
    },
    skipable: true,
  },
  {
    step: 9,
    field: 'mediaLinks',
    required: false,
    question: {
      en: '🖼️ *Step 9/10 — Photos / Videos*\n\nShare Google Drive or Dropbox link with photos/videos:\n\n_Example: https://drive.google.com/..._\n\nOr type *skip* to skip',
      ur: '🖼️ *مرحلہ 9/10 — تصاویر / ویڈیوز*\n\nگوگل ڈرائیو یا ڈراپ باکس لنک شیئر کریں:\n\n_مثال: https://drive.google.com/..._\n\nیا *skip* لکھیں',
    },
    skipable: true,
  },
  {
    step: 10,
    field: 'contactNumber',
    required: true,
    question: {
      en: '📞 *Step 10/10 — Contact Number*\n\nEnter your contact number:\n_(This will be kept private — only shared with interested buyers/tenants)_\n\n_Example: 0300-1234567_',
      ur: '📞 *مرحلہ 10/10 — رابطہ نمبر*\n\nاپنا رابطہ نمبر لکھیں:\n_(یہ خفیہ رکھا جائے گا — صرف دلچسپی رکھنے والوں کو دیا جائے گا)_\n\n_مثال: 0300-1234567_',
    },
    skipable: false,
  },
];

// Session states
export const SESSION = {
  IDLE: 'IDLE',
  FORM_STEP: (n: number) => `FORM_STEP_${n}`,
  AWAITING_CONFIRM: 'AWAITING_CONFIRM',
  AWAITING_EDIT_FIELD: 'AWAITING_EDIT_FIELD',
  ADMIN_MODE: 'ADMIN_MODE',
};
