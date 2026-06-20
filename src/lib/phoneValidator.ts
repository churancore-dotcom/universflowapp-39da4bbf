// Phone validation using libphonenumber-js (offline, free, comprehensive)
// Catches: wrong length per country, invalid operator prefixes, repeated digits,
// sequential digits, all-zeros / all-same — the classic fake-number tricks.
import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  getCountryCallingCode,
  CountryCode,
} from 'libphonenumber-js';

// Expected national-number digit length per country (most common).
// Used for inline live feedback before the user finishes typing.
export const PHONE_DIGITS: Record<string, number> = {
  IN: 10, US: 10, CA: 10, GB: 10, AU: 9, AE: 9,
  DE: 11, FR: 9, IT: 10, ES: 9, NL: 9, BE: 9, PT: 9,
  PL: 9, SE: 9, NO: 8, DK: 8, FI: 9, IE: 9, CH: 9,
  AT: 11, CZ: 9, HU: 9, RO: 9, GR: 10, TR: 10, RU: 10,
  UA: 9, JP: 10, KR: 10, CN: 11, HK: 8, SG: 8, MY: 9,
  ID: 10, TH: 9, VN: 9, PH: 10, PK: 10, BD: 10, LK: 9,
  NP: 10, NZ: 9, BR: 11, MX: 10, AR: 10, CL: 9, CO: 10,
  PE: 9, ZA: 9, NG: 10, EG: 10, KE: 9, MA: 9, SA: 9,
  IL: 9, QA: 8,
};

export interface PhoneCheck {
  ok: boolean;
  e164?: string;
  troll?: string; // playful message when fake
  reason?: string;
}

// Detect obvious fake patterns even when length matches.
function looksFake(digits: string): string | null {
  if (/^(\d)\1+$/.test(digits)) return 'all-same';
  // 1234567890 / 9876543210 etc.
  let asc = true, desc = true;
  for (let i = 1; i < digits.length; i++) {
    if (+digits[i] !== +digits[i - 1] + 1) asc = false;
    if (+digits[i] !== +digits[i - 1] - 1) desc = false;
  }
  if (asc || desc) return 'sequential';
  // Classic Bollywood fakes
  if (['1234567890', '9876543210', '0000000000', '1111111111'].includes(digits)) return 'classic-fake';
  return null;
}

const TROLLS = [
  '😏 Nice try, but Universflow doesn\'t accept made-up numbers.',
  '🤨 That phone number is faker than a $3 bill. Try a real one.',
  '🚫 Even Spotify wouldn\'t fall for that number. We won\'t either.',
  '🎭 Your fake number game is weak. Use the real one, superstar.',
  '👀 We see you typing 1234567890. We\'re Universflow, not Universnaive.',
  '🪪 Real artists use real numbers. No exceptions, no shortcuts.',
];

export function validatePhone(country: string, raw: string): PhoneCheck {
  const cc = (country || '').toUpperCase() as CountryCode;
  const digits = (raw || '').replace(/\D/g, '');

  if (!digits) return { ok: false, reason: 'Enter your phone number.' };

  const expected = PHONE_DIGITS[cc];
  if (expected && digits.length !== expected) {
    return {
      ok: false,
      reason: `${cc} numbers must be exactly ${expected} digits (you entered ${digits.length}).`,
    };
  }

  const fake = looksFake(digits);
  if (fake) {
    return {
      ok: false,
      reason: 'Fake number detected.',
      troll: TROLLS[Math.floor(Math.random() * TROLLS.length)],
    };
  }

  // libphonenumber: definitive structural + operator-prefix validation.
  try {
    const parsed = parsePhoneNumberFromString(raw, cc);
    if (!parsed || !parsed.isValid() || !isValidPhoneNumber(raw, cc)) {
      return {
        ok: false,
        reason: 'Not a valid mobile number for your country.',
        troll: TROLLS[Math.floor(Math.random() * TROLLS.length)],
      };
    }
    return { ok: true, e164: parsed.number };
  } catch {
    return { ok: false, reason: 'Could not validate this number.' };
  }
}

export function getDialCode(country: string): string {
  try {
    return '+' + getCountryCallingCode((country || 'IN').toUpperCase() as CountryCode);
  } catch {
    return '+91';
  }
}
