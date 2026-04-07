// ─────────────────────────────────────────
// INPUT VALIDATORS
// ─────────────────────────────────────────

export function validatePropertyType(input: string): string | null {
  const map: Record<string, string> = {
    '1': 'Flat', 'flat': 'Flat', 'فلیٹ': 'Flat',
    '2': 'House', 'house': 'House', 'makan': 'House', 'مکان': 'House',
    '3': 'Shop', 'shop': 'Shop', 'dukan': 'Shop', 'دکان': 'Shop',
    '4': 'Portion', 'portion': 'Portion', 'پورشن': 'Portion',
  };
  return map[input.toLowerCase().trim()] || null;
}

export function validatePurpose(input: string): string | null {
  const map: Record<string, string> = {
    '1': 'Buy', 'buy': 'Buy', 'kharidna': 'Buy',
    '2': 'Sell', 'sell': 'Sell', 'bechna': 'Sell',
    '3': 'Rent', 'rent': 'Rent', 'kiraya': 'Rent', 'kiraya lena': 'Rent',
    '4': 'Rent Out', 'rent out': 'Rent Out', 'kiraya dena': 'Rent Out',
  };
  return map[input.toLowerCase().trim()] || null;
}

export function validatePhoneNumber(input: string): boolean {
  // Pakistan phone numbers: 03XX-XXXXXXX or +923XX-XXXXXXX
  const cleaned = input.replace(/[\s\-\(\)]/g, '');
  return /^(\+92|0092|92|0)?3\d{9}$/.test(cleaned);
}

export function isSkip(input: string): boolean {
  return ['skip', 'چھوڑیں', 'chord', 'next', 'ok', '0'].includes(input.toLowerCase().trim());
}

export function isCancel(input: string): boolean {
  const text = input.toLowerCase().trim();
  return ['cancel', 'بند', 'band', 'stop', 'quit', 'exit', '3'].includes(text);
}

export function isConfirm(input: string): boolean {
  const text = input.toLowerCase().trim();
  return ['confirm', 'yes', 'ok', 'haan', 'ha', 'ہاں', 'send', 'submit', 'done', '1'].includes(text);
}

export function isEdit(input: string): boolean {
  const text = input.toLowerCase().trim();
  return ['edit', 'tabdeel', 'change', 'wapas', 'back', 'تبدیل', '2'].includes(text);
}

export function isUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

export function extractPostId(input: string): string | null {
  const match = input.match(/#([a-zA-Z0-9]{6})/);
  return match ? match[1] : null;
}
