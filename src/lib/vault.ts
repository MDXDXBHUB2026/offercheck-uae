// The Encrypted Vault's records, kept only in this browser's localStorage, encrypted with the user's
// passphrase (vaultCrypto.ts). Nothing here is sent to any server. Saving is always the user's
// choice ("Save Encrypted"), and every record can be deleted. Storage access is wrapped: a private
// window or blocked storage gives "unavailable", never a crash.
import type { ResultView } from "./resultView";
import { decryptText, encryptText } from "./vaultCrypto";

export const VAULT_KEY = "offercheck_vault_v1";
// The saved text is the text that was checked (after Auto-Redact, if on), cut to this length.
export const SAVED_TEXT_MAX = 2_000;

export type VaultRecord = {
  id: string;
  savedAt: string;
  title: string;
  channel: string;
  text: string;
  view: ResultView;
};

export function readVault(): string | null {
  try {
    return window.localStorage.getItem(VAULT_KEY);
  } catch {
    return null;
  }
}

function writeVault(value: string | null): boolean {
  try {
    if (value === null) window.localStorage.removeItem(VAULT_KEY);
    else window.localStorage.setItem(VAULT_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export async function openVault(passphrase: string): Promise<VaultRecord[]> {
  const raw = readVault();
  if (!raw) return [];
  return JSON.parse(await decryptText(raw, passphrase)) as VaultRecord[];
}

export async function saveVault(records: VaultRecord[], passphrase: string): Promise<boolean> {
  if (records.length === 0) return writeVault(null);
  return writeVault(await encryptText(JSON.stringify(records), passphrase));
}

// Adds a record. With an existing vault the passphrase must open it; a wrong one throws DecryptError
// (the reference app silently started a new list, which would wipe the old records).
export async function addToVault(record: VaultRecord, passphrase: string): Promise<number> {
  const records = await openVault(passphrase);
  const next = [record, ...records];
  if (!(await saveVault(next, passphrase))) throw new Error("Storage unavailable");
  return next.length;
}
