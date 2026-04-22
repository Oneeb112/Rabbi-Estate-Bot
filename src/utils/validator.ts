// ─────────────────────────────────────────
// SMART INPUT VALIDATORS (KARACHI REAL ESTATE CONTEXT)
// ─────────────────────────────────────────

import { logger } from './logger.js';

/**
 * Normalizes input: trims, removes extra commas, lowercase for parsing.
 */
export function normalizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function validatePropertyType(input: string): string | null {
  const map: Record<string, string> = {
    '1': 'Flat', 'flat': 'Flat', 'فلیٹ': 'Flat', 'apartment': 'Flat',
    '2': 'House', 'house': 'House', 'makan': 'House', 'مکان': 'House', 'banglow': 'House', 'villa': 'House',
    '3': 'Shop', 'shop': 'Shop', 'dukan': 'Shop', 'دکان': 'Shop', 'commercial': 'Shop', 'office': 'Shop',
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

/**
 * Validates numeric-only fields. Rejects text like "3 beds".
 */
export function validateNumber(input: string): string | null {
  const clean = input.trim();
  if (/^\d+$/.test(clean)) {
    return clean;
  }
  return null;
}

/**
 * Smart Price Validator: Normalizes lakh, crore, k, million into numeric strings.
 */
export function validatePrice(input: string): string | null {
  const text = input.toLowerCase().trim().replace(/,/g, '');
  
  // Regex to extract number and unit (non-anchored to handle things like "demand 1.5cr")
  const regex = /([\d.]+)\s*(lakh|lac|lukh|crore|cr|k|million|m|thousand|arab|kharab)?/i;
  const match = text.match(regex);

  if (match) {
    let value = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();

    if (unit) {
      if (unit === 'lakh' || unit === 'lac' || unit === 'lukh') value *= 100000;
      else if (unit === 'crore' || unit === 'cr') value *= 10000000;
      else if (unit === 'k' || unit === 'thousand') value *= 1000;
      else if (unit === 'million' || unit === 'm') value *= 1000000;
    }
    
    return value.toString();
  }

  // Fallback: if it's just a number with spaces or something
  const justNumbers = text.replace(/[^\d.]/g, '');
  if (justNumbers && !isNaN(parseFloat(justNumbers))) {
    return parseFloat(justNumbers).toString();
  }

  return null;
}

/**
 * Smart Area Validator: Extracts numeric + unit (yards, marla, kanal, sqft).
 */
export function validateArea(input: string): string | null {
  const text = input.toLowerCase().trim();
  
  // Common Karachi Units
  const units = ['sq yd', 'yards', 'yard', 'gaz', 'sq ft', 'ft', 'marla', 'kanal', 'sqm'];
  
  // Non-anchored regex to handle "corner plot 120 yards"
  const regex = new RegExp(`([\\d.]+)\\s*(${units.join('|')})?`, 'i');
  const match = text.match(regex);

  if (match) {
    const value = match[1];
    let unit = match[2] || 'yards'; // Default to yards for Karachi if not specified
    
    // Standardize units
    if (['yards', 'yard', 'gaz', 'sq yd'].includes(unit)) unit = 'Sq Yd';
    else if (['sq ft', 'ft'].includes(unit)) unit = 'Sq Ft';
    else if (unit === 'marla') unit = 'Marla';
    else if (unit === 'kanal') unit = 'Kanal';
    else if (unit === 'sqm') unit = 'Sqm';

    return `${value} ${unit}`;
  }

  return null;
}


export function validatePhoneNumber(input: string): boolean {
  // Pakistan phone numbers: 03XX-XXXXXXX or +923XX-XXXXXXX
  const cleaned = input.replace(/[\s\-\(\)]/g, '');
  return /^(\+92|0092|92|0)?3\d{9}$/.test(cleaned);
}

// ─────────────────────────────────────────
// COMMAND DETECTORS
// ─────────────────────────────────────────

export function isSkip(input: string): boolean {
  const text = input.toLowerCase().trim();
  return ['skip', 'چھوڑیں', 'chord', 'next', '0'].includes(text);
}

export function isCancel(input: string): boolean {
  const text = input.toLowerCase().trim();
  // REMOVED '3' to prevent conflict with data entry
  return ['cancel', 'بند', 'band', 'stop', 'quit', 'exit'].includes(text);
}

export function isConfirm(input: string): boolean {
  const text = input.toLowerCase().trim();
  // REMOVED '1' to prevent conflict
  return ['confirm', 'yes', 'ok', 'haan', 'ha', 'ہاں', 'send', 'submit', 'done'].includes(text);
}

export function isEdit(input: string): boolean {
  const text = input.toLowerCase().trim();
  // REMOVED '2' to prevent conflict
  return ['edit', 'tabdeel', 'change', 'wapas', 'back', 'تبدیل'].includes(text);
}

export function isUrl(input: string): boolean {
  try {
    if (!input.startsWith('http')) return false;
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

