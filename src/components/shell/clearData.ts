"use client";

import { INSTALL_HINT_STORAGE_KEY, resetInstallHint } from "@/components/shell/install";
import { LANG_STORAGE_KEY, resetLang } from "@/components/shell/lang";
import { MOTION_STORAGE_KEY, resetMotion } from "@/components/shell/motion";
import { resetTextSize, TEXT_SIZE_STORAGE_KEY } from "@/components/shell/textSize";
import { resetTheme, THEME_STORAGE_KEY } from "@/components/shell/theme";

// Settings > Clear my data on this device (production hardening Phase 4a, 2026-11-16). Every key
// Offer Check writes to this browser's storage is listed here; src/components/settings.test.ts
// checks that no other key is written anywhere in src. The offline page cache holds only public
// pages and the app's own files (src/lib/serviceWorker.ts), never offer text or results, so it is
// not part of this list.
// Phase 6 (owner decision, 2026-11-23): the Encrypted Vault is gone and nothing writes these two keys
// any more. They stay in the list, as plain strings, so "Clear my data" still removes a vault or count
// that someone saved in this browser before. (src/lib/vaultCrypto.ts stays in the tree, unused.)
export const LEGACY_VAULT_KEYS = ["offercheck_vault_v1", "offercheck_vault_count_v1"] as const;

export const STORED_KEYS = [
  ...LEGACY_VAULT_KEYS,
  LANG_STORAGE_KEY,
  MOTION_STORAGE_KEY,
  TEXT_SIZE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  INSTALL_HINT_STORAGE_KEY,
] as const;

// Removes any earlier vault, its count and every saved choice, then puts this page back to the
// defaults (English, animations on, standard text). No passphrase: a saved vault is deleted, not
// opened. Returns false when the browser did not allow it.
export function clearMyData(): boolean {
  let ok = true;
  for (const key of STORED_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      ok = false;
    }
  }
  resetLang();
  resetMotion();
  resetTextSize();
  resetTheme();
  resetInstallHint();
  return ok;
}
