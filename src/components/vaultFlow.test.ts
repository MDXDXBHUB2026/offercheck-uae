import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// Save-to-vault flow (owner request 3a/3b, 2026-11-10): empty state, confirm field and notes in the
// save dialog, plain count for the Vault tab, View result, and a wrong passphrase that cannot add to
// or wipe an existing vault. Storage is an in-memory stub; nothing is sent anywhere.

// Stores read their client snapshot here, so the vault state follows the stubbed storage.
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  return { ...real, useSyncExternalStore: (_s: unknown, get: () => unknown) => get() };
});
vi.mock("next/navigation", () => ({ usePathname: () => "/vault" }));

import { EmptyVault, EncryptedVault, VAULT_EMPTY, VAULT_LOCAL_NOTE } from "@/components/EncryptedVault";
import { checkedFromVault } from "@/components/OfferChecker";
import { defaultTitle, PASSPHRASE_NOTE, SAVED_NOTICE, savedDay, SaveVaultModal } from "@/components/SaveVaultModal";
import { Navbar } from "@/components/shell/Navbar";
import { clearReopen, peekReopen, setReopen } from "@/components/vaultStore";
import { LEGIT_OFFER, SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { toResultView } from "@/lib/resultView";
import { addToVault, openVault, PASSPHRASE_MIN, saveVault, VAULT_COUNT_KEY, VAULT_KEY, vaultState, type VaultRecord } from "@/lib/vault";
import { DecryptError } from "@/lib/vaultCrypto";

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  });
  return store;
}

const view = toResultView(runManager(SCAM_OFFER));
const record = (id: string, extra: Partial<VaultRecord> = {}): VaultRecord => ({
  id,
  savedAt: "2026-11-10T09:00:00.000Z",
  title: `Synthetic title ${id}`,
  channel: "Email",
  text: "synthetic checked text",
  view,
  notes: "synthetic private note",
  bandLabel: "High risk indicators",
  points: null,
  ...extra,
});

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

afterEach(() => {
  vi.unstubAllGlobals();
  clearReopen();
});

describe("vault storage: wrong passphrase, plain count", () => {
  it("refuses a save with a passphrase that does not open the existing vault, and leaves it untouched", async () => {
    const store = stubStorage();
    await addToVault(record("a"), "first passphrase");
    const before = store.get(VAULT_KEY);
    const countBefore = store.get(VAULT_COUNT_KEY);
    await expect(addToVault(record("b"), "another passphrase")).rejects.toBeInstanceOf(DecryptError);
    expect(store.get(VAULT_KEY)).toBe(before);
    expect(store.get(VAULT_COUNT_KEY)).toBe(countBefore);
    expect((await openVault("first passphrase")).map((entry) => entry.id)).toEqual(["a"]);
  });

  it("keeps only a number in plain text: no title, note, text or passphrase", async () => {
    const store = stubStorage();
    expect(vaultState()).toBe("none");
    await addToVault(record("a"), "first passphrase");
    await addToVault(record("b"), "first passphrase");
    expect(store.get(VAULT_COUNT_KEY)).toBe("2");
    expect(vaultState()).toBe("2");
    for (const value of store.values()) {
      expect(value).not.toMatch(/Synthetic title|synthetic private note|synthetic checked text|first passphrase/);
    }
    expect([...store.keys()].sort()).toEqual([VAULT_COUNT_KEY, VAULT_KEY].sort());
  });

  it("removes the count with the last record, and reads 'saved' for an older vault without a count", async () => {
    const store = stubStorage();
    await addToVault(record("a"), "first passphrase");
    await saveVault([], "first passphrase");
    expect(store.has(VAULT_KEY)).toBe(false);
    expect(store.has(VAULT_COUNT_KEY)).toBe(false);
    expect(vaultState()).toBe("none");
    await addToVault(record("a"), "first passphrase");
    store.delete(VAULT_COUNT_KEY);
    expect(vaultState()).toBe("saved");
  });
});

describe("vault page", () => {
  it("shows the empty state, with a link to the analyzer and no passphrase box, when nothing is saved", () => {
    stubStorage();
    const markup = html(createElement(EncryptedVault));
    expect(markup).toContain(VAULT_EMPTY);
    expect(markup).toContain('href="/check"');
    expect(markup).toContain("Go to the Offer Analyzer");
    expect(markup).not.toContain("vault-open-pass");
    expect(markup).toContain(VAULT_LOCAL_NOTE.replace("'", "&#x27;"));
    expect(html(createElement(EmptyVault))).toContain(VAULT_EMPTY);
  });

  it("shows the passphrase box, and the count, only when records are saved", async () => {
    stubStorage();
    await addToVault(record("a"), "first passphrase");
    const markup = html(createElement(EncryptedVault));
    expect(markup).toContain("vault-open-pass");
    expect(markup).toContain("Saved results: 1");
    expect(markup).not.toContain(VAULT_EMPTY);
  });
});

describe("Vault tab count", () => {
  it("shows the saved count without the passphrase, and nothing when the vault is empty", async () => {
    stubStorage();
    expect(html(createElement(Navbar))).not.toContain("nav-count");
    await addToVault(record("a"), "first passphrase");
    await addToVault(record("b"), "first passphrase");
    const markup = html(createElement(Navbar));
    expect(markup).toContain('<span class="nav-count" aria-hidden="true">2</span>');
    expect(markup).toContain("Saved results: 2");
    expect(markup).not.toContain("Synthetic title");
  });
});

describe("Save Encrypted dialog", () => {
  const props = {
    view,
    channel: "Email",
    checkedText: SCAM_OFFER,
    bandLabel: "High risk indicators",
    onClose: () => {},
    onSaved: () => {},
  };

  it("has a title, optional notes, the passphrase twice, the minimum length and the note", () => {
    stubStorage();
    const markup = html(createElement(SaveVaultModal, props));
    expect(markup).toContain('id="vault-title"');
    expect(markup).toContain(`value="${defaultTitle("High risk indicators", "Email", savedDay(new Date()))}"`);
    expect(markup).toContain("Notes (optional)");
    expect(markup).toContain('id="vault-pass"');
    expect(markup).toContain('id="vault-pass-confirm"');
    expect(markup).toContain("Confirm passphrase");
    expect(markup).toContain(`At least ${PASSPHRASE_MIN} characters.`);
    expect(markup).toContain(PASSPHRASE_NOTE);
  });

  it("asks for the existing vault's passphrase once a vault is saved", async () => {
    stubStorage();
    await addToVault(record("a"), "first passphrase");
    const markup = html(createElement(SaveVaultModal, props));
    expect(markup).toContain("A vault is already saved in this browser. Use the passphrase you chose for it.");
  });

  it("builds the default title from band, channel and date", () => {
    expect(defaultTitle("High risk indicators", "Email", savedDay(new Date(2026, 10, 10)))).toBe(
      "High risk indicators, Email, 10 Nov 2026",
    );
  });

  it("does not port the reference app's gauges, tags or claims", () => {
    stubStorage();
    const markup = [html(createElement(SaveVaultModal, props)), html(createElement(EncryptedVault)), PASSPHRASE_NOTE, SAVED_NOTICE].join(" ");
    expect(markup).not.toMatch(
      /trust score|scam probability|detection confidence|zero-knowledge|military-grade|\bSAFE\b|SUSPICIOUS|ILLEGAL FEE|\d+\s*%/i,
    );
  });
});

describe("View result", () => {
  it("hands the opened record to the analyzer, in memory only", () => {
    const store = stubStorage();
    const response = { ...runManager(LEGIT_OFFER), runId: "synthetic-run", audit: [] };
    const saved = record("a", {
      channel: "WhatsApp",
      text: LEGIT_OFFER,
      check: { response, coverage: { state: "full" } as never, offerSignals: [], redacted: 0, sourceLang: null },
    });
    setReopen(saved);
    const checked = checkedFromVault(peekReopen());
    expect(checked?.channel).toBe("WhatsApp");
    expect(checked?.boxText).toBe(LEGIT_OFFER);
    expect(checked?.response).toBe(response);
    expect(checked?.translation).toBeNull();
    expect(store.size).toBe(0);
    clearReopen();
    expect(peekReopen()).toBeNull();
  });

  it("cannot re-open a record saved before View result was added", () => {
    expect(checkedFromVault(record("old"))).toBeNull();
  });
});
