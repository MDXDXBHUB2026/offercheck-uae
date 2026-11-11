// Encrypted Vault crypto, in the browser only (Web Crypto). PBKDF2 (SHA-256) derives an AES-256-GCM
// key from the passphrase and a random 16-byte salt; each save uses a random 12-byte IV. Adapted from
// docs/reference/aistudio/src/utils/crypto.ts. The passphrase is never stored: it lives only in
// component state while the vault is unlocked.
//
// Phase 5 (owner-approved, 2026-11-11): new saves use 600,000 PBKDF2 iterations and write version 2
// with the count in the saved data. Opening uses the stored count, or 100,000 for a vault saved before
// the count was stored (version 1). A stored count outside 100,000 to 2,000,000 is refused, so an
// edited file can neither weaken the key nor make opening hang. Old vaults are not rewritten on
// unlock: they move to 600,000 at their next save or delete, which re-encrypts the whole vault.

export const PBKDF2_ITERATIONS = 600_000;
// Vaults saved before Phase 5 did not store the count; they used this one.
export const LEGACY_PBKDF2_ITERATIONS = 100_000;
export const MIN_PBKDF2_ITERATIONS = 100_000;
export const MAX_PBKDF2_ITERATIONS = 2_000_000;

export type EncryptedPayload =
  | { version: 1; cipherText: string; iv: string; salt: string }
  | { version: 2; iterations: number; cipherText: string; iv: string; salt: string };

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptText(plain: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  const payload: EncryptedPayload = {
    version: 2,
    iterations: PBKDF2_ITERATIONS,
    cipherText: toBase64(new Uint8Array(cipher)),
    iv: toBase64(iv),
    salt: toBase64(salt),
  };
  return JSON.stringify(payload);
}

export class DecryptError extends Error {
  constructor() {
    super("Wrong passphrase, or the saved data is damaged.");
  }
}

// The iteration count to open a saved payload with: the stored count for version 2, the legacy count
// for version 1 (or no version). Anything else (another version, a missing, non-integer or
// out-of-range count) is refused before any key is derived.
export function iterationsFor(payload: { version?: unknown; iterations?: unknown }): number {
  if (payload.version === undefined || payload.version === 1) {
    if (payload.iterations !== undefined) throw new DecryptError();
    return LEGACY_PBKDF2_ITERATIONS;
  }
  if (payload.version !== 2) throw new DecryptError();
  const count = payload.iterations;
  if (typeof count !== "number" || !Number.isInteger(count)) throw new DecryptError();
  if (count < MIN_PBKDF2_ITERATIONS || count > MAX_PBKDF2_ITERATIONS) throw new DecryptError();
  return count;
}

export async function decryptText(stored: string, passphrase: string): Promise<string> {
  try {
    const payload = JSON.parse(stored) as { version?: unknown; iterations?: unknown; cipherText?: string; iv?: string; salt?: string };
    if (!payload.cipherText || !payload.iv || !payload.salt) throw new DecryptError();
    const iterations = iterationsFor(payload);
    const key = await deriveKey(passphrase, fromBase64(payload.salt), iterations);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(payload.iv) },
      key,
      fromBase64(payload.cipherText),
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new DecryptError();
  }
}
