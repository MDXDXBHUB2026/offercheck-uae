import { readFileSync } from "node:fs";
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

import { EmptyVault, EncryptedVault, SavedText, VAULT_EMPTY, VAULT_LOCAL_NOTE } from "@/components/EncryptedVault";
import { checkedFromVault } from "@/components/OfferChecker";
import {
  buildRecord,
  defaultTitle,
  KEEP_TEXT_LABEL,
  PASSPHRASE_NOTE,
  SAVED_NOTICE,
  savedDay,
  SaveVaultModal,
} from "@/components/SaveVaultModal";
import { ResultCard } from "@/components/ResultCard";
import { Navbar } from "@/components/shell/Navbar";
import { clearReopen, peekReopen, setReopen } from "@/components/vaultStore";
import { LEGIT_OFFER, SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { toResultView } from "@/lib/resultView";
import {
  addToVault,
  openVault,
  PASSPHRASE_MIN,
  SAVED_TEXT_MAX,
  saveVault,
  TEXT_NOT_KEPT,
  VAULT_COUNT_KEY,
  VAULT_KEY,
  vaultState,
  type VaultRecord,
} from "@/lib/vault";
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
    // The heading says "No saved results yet" once; the line under it does not repeat it.
    expect(markup.match(/No saved results yet/g)).toHaveLength(1);
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

describe("Save to Encrypted Vault dialog", () => {
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

// Decision 2h (2026-11-11): by default only the result is saved. The checked text is kept only when
// the person ticks "Also keep the checked text"; it starts unticked.
describe("saved text scope (decision 2h)", () => {
  const response = { ...runManager(SCAM_OFFER), runId: "synthetic-run", audit: [] };
  const base = {
    title: "Synthetic title",
    channel: "Email",
    checkedText: SCAM_OFFER,
    view,
    notes: " synthetic private note ",
    bandLabel: "High risk indicators",
    points: "synthetic points",
    check: { response, coverage: { state: "full" } as never, offerSignals: [], redacted: 0, sourceLang: null },
  };
  // A stretch of the offer that no rule quotes, so it can only be in a record that kept the text.
  const unquoted = SCAM_OFFER.split(/\r?\n/).find(
    (line) => line.trim().length > 20 && !response.findings.some((f) => f.evidence.some((q) => line.includes(q) || q.includes(line.trim()))),
  )!.trim();

  it("the dialog has the keep-text box, unticked", () => {
    stubStorage();
    const markup = html(
      createElement(SaveVaultModal, {
        view,
        channel: "Email",
        checkedText: SCAM_OFFER,
        bandLabel: "High risk indicators",
        onClose: () => {},
        onSaved: () => {},
      }),
    );
    expect(markup).toContain(KEEP_TEXT_LABEL);
    expect(markup).toMatch(/<input id="vault-keep-text" type="checkbox"(?![^>]*checked)[^>]*>/);
  });

  it("unticked: saves the quoted findings, points, band, channel, title and notes, and no text", async () => {
    expect(unquoted).toBeTruthy();
    const store = stubStorage();
    const saved = buildRecord({ ...base, keepText: false });
    expect("text" in saved).toBe(false);
    expect(saved).toMatchObject({ title: "Synthetic title", channel: "Email", bandLabel: "High risk indicators", points: "synthetic points", notes: "synthetic private note" });
    expect(saved.view.red_flags.some((flag) => flag.matched_text)).toBe(true);
    await addToVault(saved, "first passphrase");
    const [opened] = await openVault("first passphrase");
    expect(opened.text).toBeUndefined();
    expect(JSON.stringify(opened)).not.toContain(unquoted);
    expect(store.get(VAULT_KEY)).not.toContain(unquoted);
  });

  it("ticked: keeps the redacted checked text, cut to the cap", () => {
    expect(buildRecord({ ...base, keepText: true }).text).toBe(SCAM_OFFER.slice(0, SAVED_TEXT_MAX));
    const long = "x".repeat(SAVED_TEXT_MAX + 50);
    expect(buildRecord({ ...base, checkedText: long, keepText: true }).text).toHaveLength(SAVED_TEXT_MAX);
  });

  it("the detail view says the text was not kept, and shows the text when it was", () => {
    const without = html(createElement(SavedText, { record: buildRecord({ ...base, keepText: false }) }));
    expect(without).toContain(TEXT_NOT_KEPT);
    expect(without).not.toContain("source-text");
    const kept = html(createElement(SavedText, { record: buildRecord({ ...base, checkedText: "synthetic kept text", keepText: true }) }));
    expect(kept).toContain("synthetic kept text");
    expect(kept).not.toContain(TEXT_NOT_KEPT);
  });

  it("View result still opens a record saved without its text, and says the text was not kept", () => {
    const saved = buildRecord({ ...base, keepText: false });
    const checked = checkedFromVault(saved);
    expect(checked?.response).toBe(response);
    expect(checked?.boxText).toBe("");
    expect(checked?.textNotKept).toBe(true);
    const card = html(createElement(ResultCard, { result: response, ruleCount: 1, sourceText: "", textNotKept: true }));
    expect(card).toContain(TEXT_NOT_KEPT);
    expect(checkedFromVault(buildRecord({ ...base, keepText: true }))?.textNotKept).toBeUndefined();
  });
});

// Phase 2 follow-up (2026-11-11), measured in headless Chrome at 1280x744: Cancel and "Encrypt and
// save" end at 658px (English) and 674px (Arabic), with no scroll; at 600px and 480px the dialog
// scrolls inside itself. These rules keep that true.
describe("save dialog fits a 744px-high window", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  it("keeps the notes box at its rows, scrolls inside itself, and is pinned to the window", () => {
    expect(css).toMatch(/\.modal textarea \{\s*min-height: 0;/);
    expect(css).toMatch(/\.modal \{[^}]*max-height: calc\(100dvh - 2 \* var\(--sp-4\)\);[^}]*overflow-y: auto;/);
    // A held translate on the page would make it the containing block for the fixed backdrop.
    expect(css).toMatch(/\.page > \.stack \{\s*animation: page-in 200ms var\(--ease-out\) backwards;/);
    expect(css).not.toMatch(/animation: page-in[^;]*\bboth\b/);
  });
});
