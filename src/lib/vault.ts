// The Encrypted Vault's records, kept only in this browser's localStorage, encrypted with the user's
// passphrase (vaultCrypto.ts). Nothing here is sent to any server. Saving is always the user's
// choice ("Save Encrypted"), and every record can be deleted. Storage access is wrapped: a private
// window or blocked storage gives "unavailable", never a crash.
import type { AnalyzeResponse } from "./audit";
import type { Coverage } from "./coverage";
import type { OfferSignal } from "./offerLikeness";
import type { ResultView } from "./resultView";
import { decryptText, encryptText } from "./vaultCrypto";

export const VAULT_KEY = "offercheck_vault_v1";
// The number of saved results, kept in plain text next to the vault so the Vault tab can show it
// while the vault is locked. Only the number: titles, notes and text stay inside the encrypted vault.
export const VAULT_COUNT_KEY = "offercheck_vault_count_v1";
// Fired on this page whenever the vault or its count is written, so the tab badge updates.
export const VAULT_EVENT = "offercheck-vault";
// A new vault's passphrase must have at least this many characters.
export const PASSPHRASE_MIN = 8;
// When the person ticks "Also keep the checked text", the saved text is the text that was checked
// (after Auto-Redact, if on), cut to this length. Otherwise no text is saved.
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
