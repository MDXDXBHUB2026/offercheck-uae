"use client";

import { INSTALL_HINT_STORAGE_KEY, resetInstallHint } from "@/components/shell/install";
import { LANG_STORAGE_KEY, resetLang } from "@/components/shell/lang";
import { MOTION_STORAGE_KEY, resetMotion } from "@/components/shell/motion";
import { resetTextSize, TEXT_SIZE_STORAGE_KEY } from "@/components/shell/textSize";
import { clearReopen } from "@/components/vaultStore";
import { resetVault, VAULT_COUNT_KEY, VAULT_KEY } from "@/lib/vault";

// Settings > Clear my data on this device (production hardening Phase 4a, 2026-11-16). Every key
// Offer Check writes to this browser's storage is listed here; src/components/settings.test.ts
// checks that no other key is written anywhere in src. The offline page cache holds only public
// pages and the app's own files (src/lib/serviceWorker.ts), never offer text or results, so it is
// not part of this list.
export const STORED_KEYS = [
  VAULT_KEY,
  VAULT_COUNT_KEY,
  LANG_STORAGE_KEY,
  MOTION_STORAGE_KEY,
  TEXT_SIZE_STORAGE_KEY,
  INSTALL_HINT_STORAGE_KEY,
] as const;

// Removes the vault, its count and every saved choice, then puts this page back to the defaults
// (English, animations on, standard text). No passphrase: the vault is deleted, not opened.
// Returns false when the browser did not allow it.
export function clearMyData(): boolean {
  let ok = resetVault();
  for (const key of STORED_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      ok = false;
    }
  }
  clearReopen();
  resetLang();
  resetMotion();
  resetTextSize();
  resetInstallHint();
  return ok;
}
