// Auto-Redact (client side, before anything is sent): replaces UAE Emirates ID numbers, passport
// numbers and UAE IBANs in the box text with a fixed placeholder. Adapted from the reference app's
// maskSensitiveData (docs/reference/aistudio/src/utils/crypto.ts). Pure and deterministic.
// The placeholder holds no word any rule reads (fee, passport, code, urgent...), so redaction can
// only remove a number, never add a finding (redact.test.ts).

export const REDACTED = "[number removed]";

// Emirates ID: 784-YYYY-NNNNNNN-N, with or without separators.
const EMIRATES_ID = /\b784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d\b/g;
// UAE IBAN: AE, 2 check digits, 19 digits; spaces allowed between digits.
const UAE_IBAN = /\bAE\d{2}(?:\s?\d){19}\b/gi;
// Passport number: one letter then 7 or 8 digits (a common format; others are not caught).
const PASSPORT = /\b[A-Z]\d{7,8}\b/gi;

export type Redaction = { text: string; count: number };

export function redactSensitive(text: string): Redaction {
  let count = 0;
  const swap = () => {
    count++;
    return REDACTED;
  };
  const out = text.replace(EMIRATES_ID, swap).replace(UAE_IBAN, swap).replace(PASSPORT, swap);
  return { text: out, count };
}
