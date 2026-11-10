"use client";

import { useSyncExternalStore } from "react";
import { VAULT_EVENT, vaultState, type VaultRecord } from "@/lib/vault";

function subscribe(listener: () => void) {
  window.addEventListener(VAULT_EVENT, listener);
  // Another tab saving or deleting updates this one too.
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(VAULT_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

// "pending" on the server and before the page has read storage, then "none", a count such as "3",
// or "saved" (a vault exists, count unknown). Read without the passphrase: only the plain count.
export function useVaultState(): string {
  return useSyncExternalStore(subscribe, vaultState, () => "pending");
}

// "View result": the vault page hands one opened record to the analyzer. Held in memory only, for
// the next page, and taken once; it is never written to storage, so nothing decrypted is left behind.
let pending: VaultRecord | null = null;

export function setReopen(record: VaultRecord) {
  pending = record;
}

// Read by the analyzer on its first render, then cleared once it is in the analyzer's state.
export function peekReopen(): VaultRecord | null {
  return pending;
}

export function clearReopen() {
  pending = null;
}
