// The Encrypted Vault's records, kept only in this browser's localStorage, encrypted with the user's
// passphrase (vaultCrypto.ts). Nothing here is sent to any server. Saving is always the user's
// choice ("Save to Encrypted Vault"), and every record can be deleted. Storage access is wrapped: a private
// window or blocked storage gives "unavailable", never a crash.
import type { AnalyzeResponse } from "./audit";
import type { Coverage } from "./coverage";
import type { OfferSignal } from "./offerLikeness";
import type { ResultView } from "./resultView";
import { decryptText, encryptText, iterationsFor } from "./vaultCrypto";

export const VAULT_KEY = "offercheck_vault_v1";
// The number of saved results, kept in plain text next to the vault so the Vault tab can show it
// while the vault is locked. Only the number: titles, notes and text stay inside the encrypted vault.
export const VAULT_COUNT_KEY = "offercheck_vault_count_v1";
// Fired on this page whenever the vault or its count is written, so the tab badge updates.
export const VAULT_EVENT = "offercheck-vault";
// A new vault's passphrase must have at least this many characters.
export const PASSPHRASE_MIN = 8;
// When the person ticks "Also keep the checked text", the saved text is the text that was checked
// (always after Auto-Redact), cut to this length. Otherwise no text is saved.
export const SAVED_TEXT_MAX = 2_000;
// Decision 2h: shown on a saved result whose checked text was not kept (vault detail, View result).
export const TEXT_NOT_KEPT = "The checked text was not kept with this result. Only the result was saved.";

// What "View result" needs to show the result again in the analyzer. Inside the encrypted record only.
export type SavedCheck = {
  response: AnalyzeResponse;
  coverage: Coverage;
  offerSignals: OfferSignal[];
  redacted: number;
  sourceLang: string | null;
};

export type VaultRecord = {
  id: string;
  savedAt: string;
  title: string;
  channel: string;
  // The checked text, only when the person chose to keep it (decision 2h, 2026-11-11). Records saved
  // before then always have it.
  text?: string;
  view: ResultView;
  // Added 2026-11-10; records saved before then do not have them.
  notes?: string;
  bandLabel?: string;
  points?: string | null;
  check?: SavedCheck;
};

export function readVault(): string | null {
  try {
    return window.localStorage.getItem(VAULT_KEY);
  } catch {
    return null;
  }
}

function announce() {
  try {
    window.dispatchEvent(new Event(VAULT_EVENT));
  } catch {
    // No window (tests): nothing to update.
  }
}

function writeVault(value: string | null, count: number): boolean {
  try {
    if (value === null) {
      window.localStorage.removeItem(VAULT_KEY);
      window.localStorage.removeItem(VAULT_COUNT_KEY);
    } else {
      window.localStorage.setItem(VAULT_KEY, value);
      window.localStorage.setItem(VAULT_COUNT_KEY, String(count));
    }
  } catch {
    return false;
  }
  announce();
  return true;
}

// Records the count after an unlock, for a vault saved before the count was kept. Best effort.
export function rememberCount(count: number) {
  try {
    if (readVault() === null) return;
    window.localStorage.setItem(VAULT_COUNT_KEY, String(count));
  } catch {
    return;
  }
  announce();
}

// The vault's state without the passphrase: "none" (nothing saved), a count such as "3", or "saved"
// when a vault exists but its count is not known (saved before the count was kept).
export function vaultState(): string {
  if (readVault() === null) return "none";
  try {
    const count = Number(window.localStorage.getItem(VAULT_COUNT_KEY));
    return Number.isInteger(count) && count > 0 ? String(count) : "saved";
  } catch {
    return "saved";
  }
}

export async function openVault(passphrase: string): Promise<VaultRecord[]> {
  const raw = readVault();
  if (!raw) return [];
  return JSON.parse(await decryptText(raw, passphrase)) as VaultRecord[];
}

export async function saveVault(records: VaultRecord[], passphrase: string): Promise<boolean> {
  if (records.length === 0) return writeVault(null, 0);
  return writeVault(await encryptText(JSON.stringify(records), passphrase), records.length);
}

// Adds a record. With an existing vault the passphrase must open it; a wrong one throws DecryptError
// before anything is written, so the saved records stay as they were (the reference app silently
// started a new list, which would wipe the old records).
export async function addToVault(record: VaultRecord, passphrase: string): Promise<number> {
  const records = await openVault(passphrase);
  const next = [record, ...records];
  if (!(await saveVault(next, passphrase))) throw new Error("Storage unavailable");
  return next.length;
}

// ---------- Phase 4a (production hardening, 2026-11-16): reset, export, import, new passphrase ----------
// All four use the functions above and src/lib/vaultCrypto.ts as they are: the encryption is not
// changed, and nothing here is sent to any server.

// "Forgot your passphrase?" > Reset vault, and Settings > Clear my data: deletes the saved vault and
// its count without opening it, so no passphrase is needed. Nothing can be recovered afterwards.
export function resetVault(): boolean {
  return writeVault(null, 0);
}

// The backup file Export writes and Import reads. The vault inside it is the encrypted payload exactly
// as it is stored in this browser: the file is as safe as the passphrase, and opening it on another
// browser still needs that passphrase.
export const VAULT_FILE_FORMAT = "offercheck-vault";
export const VAULT_FILE_VERSION = 1;
// A larger file is refused before it is read as JSON.
export const VAULT_FILE_MAX_CHARS = 5_000_000;

export type VaultFile = {
  format: typeof VAULT_FILE_FORMAT;
  version: typeof VAULT_FILE_VERSION;
  exportedAt: string;
  count: number | null;
  vault: unknown;
};

// The file's name, by day: offercheck-vault-2026-11-16.json.
export function vaultFileName(date: Date): string {
  return `offercheck-vault-${date.toISOString().slice(0, 10)}.json`;
}

// The backup file's text, or null when no vault is saved in this browser. No passphrase needed: the
// vault is copied still encrypted.
export function exportVault(now: Date = new Date()): string | null {
  const raw = readVault();
  if (raw === null) return null;
  let vault: unknown;
  try {
    vault = JSON.parse(raw);
  } catch {
    return null;
  }
  const state = vaultState();
  const file: VaultFile = {
    format: VAULT_FILE_FORMAT,
    version: VAULT_FILE_VERSION,
    exportedAt: now.toISOString(),
    count: /^\d+$/.test(state) ? Number(state) : null,
    vault,
  };
  return JSON.stringify(file, null, 2);
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function base64Bytes(value: unknown): number | null {
  if (typeof value !== "string" || value.length % 4 !== 0 || !BASE64.test(value)) return null;
  try {
    return atob(value).length;
  } catch {
    return null;
  }
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function sameKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value).sort();
  return own.length === keys.length && [...keys].sort().every((key, i) => key === own[i]);
}

// The encrypted payload inside a backup file, checked field by field: version 1 or 2 with exactly the
// fields vaultCrypto.ts writes, a stored iteration count it accepts (iterationsFor), a 16-byte salt,
// a 12-byte IV and a cipher text at least as long as the AES-GCM tag. Anything else is refused.
export function validPayload(payload: unknown): boolean {
  if (!plainObject(payload)) return false;
  const keys = payload.version === 2 ? ["version", "iterations", "cipherText", "iv", "salt"] : ["version", "cipherText", "iv", "salt"];
  if (payload.version !== 1 && payload.version !== 2) return false;
  if (!sameKeys(payload, keys)) return false;
  try {
    iterationsFor(payload);
  } catch {
    return false;
  }
  const cipher = base64Bytes(payload.cipherText);
  return base64Bytes(payload.salt) === 16 && base64Bytes(payload.iv) === 12 && cipher !== null && cipher >= 16;
}

export type ParsedVaultFile = { ok: true; stored: string; count: number | null } | { ok: false };

// Reads a backup file's text. Only a file Export wrote is accepted: the format name, file version 1,
// exactly the five fields, a date, a count that is a positive whole number or null, and a valid
// encrypted payload. The passphrase is not asked for here: the vault stays encrypted until it is
// opened on the Vault page.
export function parseVaultFile(text: string): ParsedVaultFile {
  if (typeof text !== "string" || text.length === 0 || text.length > VAULT_FILE_MAX_CHARS) return { ok: false };
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!plainObject(file) || !sameKeys(file, ["format", "version", "exportedAt", "count", "vault"])) return { ok: false };
  if (file.format !== VAULT_FILE_FORMAT || file.version !== VAULT_FILE_VERSION) return { ok: false };
  if (typeof file.exportedAt !== "string" || Number.isNaN(Date.parse(file.exportedAt))) return { ok: false };
  const count = file.count;
  if (count !== null && !(typeof count === "number" && Number.isInteger(count) && count > 0)) return { ok: false };
  if (!validPayload(file.vault)) return { ok: false };
  return { ok: true, stored: JSON.stringify(file.vault), count: count as number | null };
}

// Import: replaces the vault in this browser with the one from the file, still encrypted. The person
// confirms first when a vault is already saved here (src/components/VaultBackup.tsx).
export function importVault(file: { stored: string; count: number | null }): boolean {
  if (!writeVault(file.stored, file.count ?? 0)) return false;
  if (file.count === null) {
    try {
      window.localStorage.removeItem(VAULT_COUNT_KEY);
    } catch {
      // The count is a convenience only; the vault itself was written.
    }
    announce();
  }
  return true;
}

// Change passphrase: the old passphrase opens the vault (a wrong one throws DecryptError before
// anything is written), then every record is encrypted again with the new one, with a new salt and IV.
export async function changePassphrase(oldPassphrase: string, newPassphrase: string): Promise<number> {
  const records = await openVault(oldPassphrase);
  if (records.length === 0) return 0;
  if (!(await saveVault(records, newPassphrase))) throw new Error("Storage unavailable");
  return records.length;
}
