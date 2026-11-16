import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { buildRecord } from "@/components/SaveVaultModal";
import { LEGIT_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { REDACTED } from "@/lib/redact";
import { toResultView } from "@/lib/resultView";
import {
  changePassphrase,
  exportVault,
  importVault,
  openVault,
  parseVaultFile,
  resetVault,
  saveVault,
  validPayload,
  VAULT_COUNT_KEY,
  VAULT_FILE_FORMAT,
  VAULT_FILE_MAX_CHARS,
  VAULT_KEY,
  vaultFileName,
  vaultState,
  type VaultRecord,
} from "@/lib/vault";
import { DecryptError } from "@/lib/vaultCrypto";

// Production hardening Phase 4a (2026-11-16): reset without the passphrase, titles and notes masked,
// export and import, and a new passphrase. src/lib/vaultCrypto.ts is used as it is (its hash is
// checked by src/app/lockedFiles.test.ts). Storage is an in-memory stand-in; nothing is sent anywhere.

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

afterEach(() => {
  vi.unstubAllGlobals();
});

const PASS = "correct horse battery";
const view = toResultView(runManager(LEGIT_OFFER));

function record(title: string, notes = ""): VaultRecord {
  return buildRecord({ title, channel: "Email", checkedText: "", keepText: false, view, notes, bandLabel: "Low risk indicators", points: null });
}

describe("reset vault without the passphrase", () => {
  it("deletes the encrypted vault and its count, with no passphrase asked", async () => {
    const store = stubStorage();
    await saveVault([record("One"), record("Two")], PASS);
    expect(store.has(VAULT_KEY)).toBe(true);
    expect(vaultState()).toBe("2");
    expect(resetVault()).toBe(true);
    expect(store.has(VAULT_KEY)).toBe(false);
    expect(store.has(VAULT_COUNT_KEY)).toBe(false);
    expect(vaultState()).toBe("none");
  });

  it("the locked vault offers Forgot your passphrase?, an explanation, and Reset behind a confirm step", () => {
    const tools = readFileSync("src/components/VaultTools.tsx", "utf8");
    const vault = readFileSync("src/components/EncryptedVault.tsx", "utf8");
    expect(vault).toContain("<ForgotPassphrase count=");
    expect(tools).toContain('{t("Forgot your passphrase?")}');
    expect(tools).toMatch(/Offer Check cannot recover a passphrase, and nothing in the vault can be opened without it\./);
    // Reset first shows the question; only its own button deletes.
    expect(tools).toMatch(/onClick=\{\(\) => setConfirming\(true\)\}>\s*<RotateCcw/);
    expect(tools).toMatch(/<Button variant="danger" onClick=\{reset\}>\s*\{t\("Delete and reset"\)\}/);
    expect(tools).toMatch(/function reset\(\) \{\s*setConfirming\(false\);\s*if \(!resetVault\(\)\)/);
  });
});

describe("titles and notes are masked like the offer text", () => {
  it("hides an Emirates ID, a UAE IBAN and a passport number in the title and the notes before saving", () => {
    const saved = record("Offer for 784-1990-1234567-1", "IBAN AE07 0331 2345 6789 0123 456, passport N1234567, call Friday");
    expect(saved.title).toBe(`Offer for ${REDACTED}`);
    expect(saved.notes).toBe(`IBAN ${REDACTED}, passport ${REDACTED}, call Friday`);
    expect(JSON.stringify(saved)).not.toMatch(/784-1990|AE07|N1234567/);
  });

  it("leaves a title and notes without such numbers as they are, and empty notes absent", () => {
    const saved = record("High risk indicators, Email, 16 Nov 2026");
    expect(saved.title).toBe("High risk indicators, Email, 16 Nov 2026");
    expect(saved.notes).toBeUndefined();
  });

  it("is what the encrypted vault holds", async () => {
    stubStorage();
    await saveVault([record("ID 784199012345671", "K12345678")], PASS);
    const [opened] = await openVault(PASS);
    expect(opened.title).toBe(`ID ${REDACTED}`);
    expect(opened.notes).toBe(REDACTED);
  });
});

describe("export and import", () => {
  it("round-trips: the exported file, imported into an empty browser, opens with the same passphrase to the same records", async () => {
    const store = stubStorage();
    const records = [record("First"), record("Second", "a note")];
    await saveVault(records, PASS);
    const stored = store.get(VAULT_KEY);
    const file = exportVault(new Date("2026-11-16T10:00:00Z"));
    expect(file).not.toBeNull();
    const parsed = JSON.parse(file as string);
    expect(Object.keys(parsed).sort()).toEqual(["count", "exportedAt", "format", "vault", "version"]);
    expect(parsed).toMatchObject({ format: VAULT_FILE_FORMAT, version: 1, exportedAt: "2026-11-16T10:00:00.000Z", count: 2 });
    // Still encrypted: no title, note or result in the file.
    expect(file).not.toMatch(/First|Second|a note|Low risk/);
    expect(JSON.stringify(parsed.vault)).toBe(stored);

    store.clear();
    expect(vaultState()).toBe("none");
    const read = parseVaultFile(file as string);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(importVault(read)).toBe(true);
    expect(vaultState()).toBe("2");
    expect(store.get(VAULT_KEY)).toBe(stored);
    // Still needs the passphrase to open.
    await expect(openVault("not the passphrase")).rejects.toBeInstanceOf(DecryptError);
    expect(await openVault(PASS)).toEqual(records);
  });

  it("names the file by day, and exports nothing when no vault is saved", () => {
    stubStorage();
    expect(vaultFileName(new Date("2026-11-16T23:00:00Z"))).toBe("offercheck-vault-2026-11-16.json");
    expect(exportVault()).toBeNull();
  });

  it("an import without a count leaves the count unknown, not zero", async () => {
    const store = stubStorage();
    await saveVault([record("One")], PASS);
    const file = JSON.parse(exportVault() as string);
    file.count = null;
    store.clear();
    const read = parseVaultFile(JSON.stringify(file));
    expect(read.ok).toBe(true);
    if (read.ok) importVault(read);
    expect(store.has(VAULT_COUNT_KEY)).toBe(false);
    expect(vaultState()).toBe("saved");
  });

  async function goodFile(): Promise<Record<string, unknown>> {
    stubStorage();
    await saveVault([record("One")], PASS);
    return JSON.parse(exportVault() as string);
  }

  it("refuses anything that is not a file Export wrote: format, version, fields, date, count", async () => {
    const good = await goodFile();
    const variants: unknown[] = [
      { ...good, format: "something-else" },
      { ...good, version: 2 },
      { ...good, version: "1" },
      { ...good, extra: true },
      { format: good.format, version: good.version, exportedAt: good.exportedAt, vault: good.vault },
      { ...good, exportedAt: "yesterday" },
      { ...good, count: 0 },
      { ...good, count: 1.5 },
      { ...good, count: "1" },
      [good],
      null,
      "text",
    ];
    for (const variant of variants) expect(parseVaultFile(JSON.stringify(variant)), JSON.stringify(variant).slice(0, 80)).toEqual({ ok: false });
    expect(parseVaultFile("{not json")).toEqual({ ok: false });
    expect(parseVaultFile("")).toEqual({ ok: false });
    expect(parseVaultFile(" ".repeat(VAULT_FILE_MAX_CHARS + 1))).toEqual({ ok: false });
    expect(parseVaultFile(JSON.stringify(good)).ok).toBe(true);
  });

  it("refuses an encrypted payload of another version, with other fields, a weak or huge iteration count, or wrong sizes", async () => {
    const good = (await goodFile()).vault as Record<string, unknown>;
    expect(validPayload(good)).toBe(true);
    const bad: unknown[] = [
      { ...good, version: 3 },
      { ...good, version: 1 },
      { ...good, extra: "x" },
      { ...good, iterations: 1000 },
      { ...good, iterations: 5_000_000 },
      { ...good, iterations: 600_000.5 },
      { ...good, salt: btoa("short") },
      { ...good, iv: btoa("0123456789abcdef") },
      { ...good, cipherText: btoa("tiny") },
      { ...good, cipherText: "not base64!" },
      { ...good, salt: undefined },
      [good],
    ];
    for (const payload of bad) expect(validPayload(payload), JSON.stringify(payload).slice(0, 60)).toBe(false);
    // A version 1 payload (saved before the count was stored) has no iterations field and is accepted.
    const { iterations: _unused, ...legacy } = good;
    void _unused;
    expect(validPayload({ ...legacy, version: 1 })).toBe(true);
  });

  it("asks before replacing a vault already saved in this browser, and never asks for the passphrase", () => {
    const tools = readFileSync("src/components/VaultTools.tsx", "utf8");
    expect(tools).toMatch(/if \(exists\) \{\s*setStatus\("idle"\);\s*setPending/);
    expect(tools).toContain("The current ones will be permanently deleted.");
    expect(tools).not.toMatch(/openVault|decryptText/);
  });
});

describe("change passphrase", () => {
  it("opens with the old passphrase, re-encrypts with the new one, and the old one no longer opens it", async () => {
    const store = stubStorage();
    const records = [record("One"), record("Two")];
    await saveVault(records, PASS);
    const before = store.get(VAULT_KEY);
    expect(await changePassphrase(PASS, "a brand new passphrase")).toBe(2);
    expect(store.get(VAULT_KEY)).not.toBe(before);
    expect(await openVault("a brand new passphrase")).toEqual(records);
    await expect(openVault(PASS)).rejects.toBeInstanceOf(DecryptError);
    expect(vaultState()).toBe("2");
  });

  it("with a wrong old passphrase, throws DecryptError and changes nothing", async () => {
    const store = stubStorage();
    await saveVault([record("One")], PASS);
    const before = store.get(VAULT_KEY);
    await expect(changePassphrase("wrong passphrase", "another new one")).rejects.toBeInstanceOf(DecryptError);
    expect(store.get(VAULT_KEY)).toBe(before);
  });

  it("uses the existing crypto functions, unchanged: vault.ts imports them and adds none of its own", () => {
    const vault = readFileSync("src/lib/vault.ts", "utf8");
    expect(vault).toContain('import { decryptText, encryptText, iterationsFor } from "./vaultCrypto";');
    const code = vault.replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/crypto\.subtle|deriveKey|PBKDF2|AES-GCM/);
  });
});
