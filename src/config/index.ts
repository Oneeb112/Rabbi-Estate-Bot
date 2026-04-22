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

  // Session auth folder (Persistent Volume support)
  authFolder: process.env.AUTH_FOLDER || './auth_info_baileys',

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
    validationType: 'propertyType',
    required: true,
    question: {
      en: '🏠 *Step 1/10 — Property Type*\n\nApni property ki category select karein (Select property type):\n\n1️⃣ Flat\n2️⃣ House\n3️⃣ Shop\n4️⃣ Portion\n\nReply with number (1-4)',
      ur: '🏠 *Step 1/10 — Property Type*\n\nApni property ki category select karein (Select property type):\n\n1️⃣ Flat\n2️⃣ House\n3️⃣ Shop\n4️⃣ Portion\n\nReply with number (1-4)',
    },
    options: ['Flat', 'House', 'Shop', 'Portion'],
    skipable: false,
  },
  {
    step: 2,
    field: 'purpose',
    validationType: 'purpose',
    required: true,
    question: {
      en: '📋 *Step 2/10 — Purpose*\n\nAap is property ke saath kya karna chahte hain? (Select purpose):\n\n1️⃣ Buy (Kharidna)\n2️⃣ Sell (Bechna)\n3️⃣ Rent (Kiraye pe lena)\n4️⃣ Rent Out (Kiraye pe dena)\n\nReply with number (1-4)',
      ur: '📋 *Step 2/10 — Purpose*\n\nAap is property ke saath kya karna chahte hain? (Select purpose):\n\n1️⃣ Buy (Kharidna)\n2️⃣ Sell (Bechna)\n3️⃣ Rent (Kiraye pe lena)\n4️⃣ Rent Out (Kiraye pe dena)\n\nReply with number (1-4)',
    },
    options: ['Buy', 'Sell', 'Rent', 'Rent Out'],
    skipable: false,
  },
  {
    step: 3,
    field: 'location',
    validationType: 'text',
    required: true,
    question: {
      en: '📍 *Step 3/10 — Location*\n\nProperty ki mukammal location likhein (Enter location):\n_City, Area, Street/Block_\n\n_Example: Karachi, North Nazimabad, Block H_',
      ur: '📍 *Step 3/10 — Location*\n\nProperty ki mukammal location likhein (Enter location):\n_City, Area, Street/Block_\n\n_Example: Karachi, North Nazimabad, Block H_',
    },
    skipable: false,
  },
  {
    step: 4,
    field: 'price',
    validationType: 'price',
    required: false,
    question: {
      en: '💰 *Step 4/10 — Price / Rent*\n\nProperty ki total price ya monthly rent likhein (Enter price/rent):\n\n_Example: 1.5 Crore / 35,000_\n\nType the amount or reply *0* to skip',
      ur: '💰 *Step 4/10 — Price / Rent*\n\nProperty ki total price ya monthly rent likhein (Enter price/rent):\n\n_Example: 1.5 Crore / 35,000_\n\nType the amount or reply *0* to skip',
    },
    skipable: true,
  },
  {
    step: 5,
    field: 'size',
    validationType: 'area',
    required: false,
    question: {
      en: '📐 *Step 5/10 — Size / Area*\n\nProperty ka size ya area likhein (Enter size):\n\n_Example: 120 sq yards / 1000 sq ft_\n\nType the size or reply *0* to skip',
      ur: '📐 *Step 5/10 — Size / Area*\n\nProperty ka size ya area likhein (Enter size):\n\n_Example: 120 sq yards / 1000 sq ft_\n\nType the size or reply *0* to skip',
    },
    skipable: true,
  },
  {
    step: 6,
    field: 'bedrooms',
    validationType: 'number',
    required: false,
    question: {
      en: '🛏️ *Step 6/10 — Bedrooms*\n\nProperty mein kitne bedrooms hain? (How many bedrooms):\n\n_Example: 3_\n\nType the number or reply *0* to skip',
      ur: '🛏️ *Step 6/10 — Bedrooms*\n\nProperty mein kitne bedrooms hain? (How many bedrooms):\n\n_Example: 3_\n\nType the number or reply *0* to skip',
    },
    skipable: true,
  },
  {
    step: 7,
    field: 'bathrooms',
    validationType: 'number',
    required: false,
    question: {
      en: '🚿 *Step 7/10 — Bathrooms*\n\nProperty mein kitne bathrooms hain? (How many bathrooms):\n\n_Example: 2_\n\nType the number or reply *0* to skip',
      ur: '🚿 *Step 7/10 — Bathrooms*\n\nProperty mein kitne bathrooms hain? (How many bathrooms):\n\n_Example: 2_\n\nType the number or reply *0* to skip',
    },
    skipable: true,
  },
  {
    step: 8,
    field: 'description',
    validationType: 'text',
    required: false,
    question: {
      en: '📝 *Step 8/10 — Features / Description*\n\nProperty ki mazeed tafseelat likhein (Describe features):\n\n_Example: Corner plot, Facing park, West open, Lift available_\n\nType features or reply *0* to skip',
      ur: '📝 *Step 8/10 — Features / Description*\n\nProperty ki mazeed tafseelat likhein (Describe features):\n\n_Example: Corner plot, Facing park, West open, Lift available_\n\nType features or reply *0* to skip',
    },
    skipable: true,
  },
  {
    step: 9,
    field: 'mediaLinks',
    validationType: 'media',
    required: false,
    question: {
      en: '🖼️ *Step 9/10 — Photos / Videos*\n\nPlease send property photos or videos directly here on WhatsApp.\n\n✅ *You can:*\n• Upload from gallery\n• Record live video\n• Forward from another chat\n• Send multiple files\n\n_Type *DONE* when finished, or reply *0* to skip._',
      ur: '🖼️ *Step 9/10 — Photos / Videos*\n\nPlease send property photos or videos directly here on WhatsApp.\n\n✅ *You can:*\n• Upload from gallery\n• Record live video\n• Forward from another chat\n• Send multiple files\n\n_Type *DONE* when finished, or reply *0* to skip._',
    },
    skipable: true,
  },

  {
    step: 10,
    field: 'contactNumber',
    validationType: 'phone',
    required: true,
    question: {
      en: '📞 *Step 10/10 — Contact Number*\n\nApna rabta number likhein (Enter contact number):\n_(Ye private rahega — sirf serious leads ko diya jayega)_\n\n_Example: 0300-1234567_',
      ur: '📞 *Step 10/10 — Contact Number*\n\nApna rabta number likhein (Enter contact number):\n_(Ye private rahega — sirf serious leads ko diya jayega)_\n\n_Example: 0300-1234567_',
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
