// Encrypted Vault crypto, in the browser only (Web Crypto). PBKDF2 (SHA-256, 100,000 iterations)
// derives an AES-256-GCM key from the passphrase and a random 16-byte salt; each save uses a random
// 12-byte IV. Adapted from docs/reference/aistudio/src/utils/crypto.ts. The passphrase is never
// stored: it lives only in component state while the vault is unlocked.

export const PBKDF2_ITERATIONS = 100_000;

export type EncryptedPayload = { version: 1; cipherText: string; iv: string; salt: string };

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

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptText(plain: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  const payload: EncryptedPayload = {
    version: 1,
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

export async function decryptText(stored: string, passphrase: string): Promise<string> {
  try {
    const payload = JSON.parse(stored) as Partial<EncryptedPayload>;
    if (!payload.cipherText || !payload.iv || !payload.salt) throw new DecryptError();
    const key = await deriveKey(passphrase, fromBase64(payload.salt));
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
