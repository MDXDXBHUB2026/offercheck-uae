import { afterEach, describe, expect, it, vi } from "vitest";
import { addToVault, openVault, saveVault, VAULT_KEY, type VaultRecord } from "./vault";
import {
  decryptText,
  DecryptError,
  encryptText,
  iterationsFor,
  LEGACY_PBKDF2_ITERATIONS,
  MAX_PBKDF2_ITERATIONS,
  MIN_PBKDF2_ITERATIONS,
  PBKDF2_ITERATIONS,
} from "./vaultCrypto";

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

// Builds a saved payload the way an older build did, independently of vaultCrypto.ts: PBKDF2-SHA-256 at
// the given count, AES-256-GCM. With `iterations` undefined it is a version 1 vault (no count stored).
async function legacyPayload(plain: string, passphrase: string, count: number, stored?: { version: number; iterations: number }) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: count, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)));
  const head = stored ?? { version: 1 };
  return JSON.stringify({ ...head, cipherText: b64(cipher), iv: b64(iv), salt: b64(salt) });
}

describe("vault crypto (AES-256-GCM, PBKDF2)", () => {
  it("round-trips text with the right passphrase", async () => {
    const stored = await encryptText("synthetic note", "correct horse");
    expect(await decryptText(stored, "correct horse")).toBe("synthetic note");
  });

  it("refuses a wrong passphrase with a fixed message", async () => {
    const stored = await encryptText("synthetic note", "correct horse");
    await expect(decryptText(stored, "wrong")).rejects.toBeInstanceOf(DecryptError);
  });

  it("stores neither the text nor the passphrase in the clear, and uses a fresh salt and IV each time", async () => {
    const a = await encryptText("synthetic note", "correct horse");
    const b = await encryptText("synthetic note", "correct horse");
    expect(a).not.toContain("synthetic");
    expect(a).not.toContain("correct horse");
    expect(JSON.parse(a).iv).not.toBe(JSON.parse(b).iv);
    expect(JSON.parse(a).salt).not.toBe(JSON.parse(b).salt);
  });
});

describe("vault crypto: stored PBKDF2 count (Phase 5)", () => {
  it("new saves write version 2 with 600,000 iterations in the saved data", async () => {
    expect(PBKDF2_ITERATIONS).toBe(600_000);
    const payload = JSON.parse(await encryptText("synthetic note", "correct horse"));
    expect(payload.version).toBe(2);
    expect(payload.iterations).toBe(600_000);
  });

  it("an old 100,000 vault (no count stored) still opens", async () => {
    expect(LEGACY_PBKDF2_ITERATIONS).toBe(100_000);
    const old = await legacyPayload("synthetic note", "correct horse", 100_000);
    expect(JSON.parse(old).iterations).toBeUndefined();
    expect(await decryptText(old, "correct horse")).toBe("synthetic note");
  });

  it("opening uses the stored count", async () => {
    const stored = await legacyPayload("synthetic note", "correct horse", 150_000, { version: 2, iterations: 150_000 });
    expect(await decryptText(stored, "correct horse")).toBe("synthetic note");
    // The same ciphertext labelled with another (in-range) count derives another key and does not open.
    const relabelled = JSON.stringify({ ...JSON.parse(stored), iterations: 600_000 });
    await expect(decryptText(relabelled, "correct horse")).rejects.toBeInstanceOf(DecryptError);
  });

  it("accepts a stored count only from 100,000 to 2,000,000", () => {
    expect([MIN_PBKDF2_ITERATIONS, MAX_PBKDF2_ITERATIONS]).toEqual([100_000, 2_000_000]);
    expect(iterationsFor({ version: 2, iterations: 100_000 })).toBe(100_000);
    expect(iterationsFor({ version: 2, iterations: 2_000_000 })).toBe(2_000_000);
    expect(iterationsFor({ version: 1 })).toBe(100_000);
    expect(iterationsFor({})).toBe(100_000);
  });

  it.each([
    ["below the range", { version: 2, iterations: 99_999 }],
    ["above the range", { version: 2, iterations: 2_000_001 }],
    ["one", { version: 2, iterations: 1 }],
    ["zero", { version: 2, iterations: 0 }],
    ["negative", { version: 2, iterations: -600_000 }],
    ["not a whole number", { version: 2, iterations: 600_000.5 }],
    ["a string", { version: 2, iterations: "600000" }],
    ["not finite", { version: 2, iterations: Number.POSITIVE_INFINITY }],
    ["missing on version 2", { version: 2 }],
    ["a count on version 1", { version: 1, iterations: 600_000 }],
    ["an unknown version", { version: 3, iterations: 600_000 }],
  ])("refuses a stored count that is %s", async (_label, head) => {
    expect(() => iterationsFor(head)).toThrow(DecryptError);
    const good = JSON.parse(await encryptText("synthetic note", "correct horse"));
    const { cipherText, iv, salt } = good;
    const tampered = JSON.stringify({ ...head, cipherText, iv, salt });
    await expect(decryptText(tampered, "correct horse")).rejects.toBeInstanceOf(DecryptError);
  });

  it("an out-of-range count is refused before any key is derived", async () => {
    const good = JSON.parse(await encryptText("synthetic note", "correct horse"));
    const spy = vi.spyOn(crypto.subtle, "deriveKey");
    try {
      const huge = JSON.stringify({ ...good, iterations: 1_000_000_000 });
      await expect(decryptText(huge, "correct horse")).rejects.toBeInstanceOf(DecryptError);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("a wrong passphrase is still refused, for old and new vaults", async () => {
    const old = await legacyPayload("synthetic note", "correct horse", 100_000);
    await expect(decryptText(old, "wrong")).rejects.toBeInstanceOf(DecryptError);
    const fresh = await encryptText("synthetic note", "correct horse");
    await expect(decryptText(fresh, "wrong")).rejects.toBeInstanceOf(DecryptError);
  });
});

describe("vault storage (browser only)", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubStorage() {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    });
    return store;
  }

  const record = (id: string): VaultRecord => ({
    id,
    savedAt: "2026-11-10T00:00:00.000Z",
    title: "t",
    channel: "Email",
    text: "synthetic",
    view: {
      overall_risk_level: "Low",
      score: 0,
      coverage: "full",
      summary: "s",
      red_flags: [],
      verification_checklist: [],
      channels: [],
    },
  });

  it("saves only ciphertext, and a wrong passphrase cannot add to (or wipe) an existing vault", async () => {
    const store = stubStorage();
    expect(await addToVault(record("a"), "pass one")).toBe(1);
    expect(store.get(VAULT_KEY)).not.toContain("synthetic");
    await expect(addToVault(record("b"), "pass two")).rejects.toBeInstanceOf(DecryptError);
    expect((await openVault("pass one")).map((entry) => entry.id)).toEqual(["a"]);
  });

  it("an old 100,000 vault opens and is not rewritten on unlock", async () => {
    const store = stubStorage();
    const old = await legacyPayload(JSON.stringify([record("a")]), "pass one", 100_000);
    store.set(VAULT_KEY, old);
    expect((await openVault("pass one")).map((entry) => entry.id)).toEqual(["a"]);
    expect(store.get(VAULT_KEY)).toBe(old);
  });

  it("an old vault moves to version 2 and 600,000 at its next save", async () => {
    const store = stubStorage();
    store.set(VAULT_KEY, await legacyPayload(JSON.stringify([record("a")]), "pass one", 100_000));
    expect(await addToVault(record("b"), "pass one")).toBe(2);
    const saved = JSON.parse(store.get(VAULT_KEY) ?? "{}");
    expect([saved.version, saved.iterations]).toEqual([2, 600_000]);
    // Newest first, as before.
    expect((await openVault("pass one")).map((entry) => entry.id)).toEqual(["b", "a"]);
  });

  it("an old vault moves to version 2 and 600,000 at its next delete", async () => {
    const store = stubStorage();
    store.set(VAULT_KEY, await legacyPayload(JSON.stringify([record("a"), record("b")]), "pass one", 100_000));
    const records = await openVault("pass one");
    // Deleting a result saves the remaining records (EncryptedVault calls saveVault).
    expect(await saveVault(records.filter((entry) => entry.id !== "a"), "pass one")).toBe(true);
    const saved = JSON.parse(store.get(VAULT_KEY) ?? "{}");
    expect([saved.version, saved.iterations]).toEqual([2, 600_000]);
    expect((await openVault("pass one")).map((entry) => entry.id)).toEqual(["b"]);
  });

  it("a wrong passphrase cannot add to (or upgrade) an old vault", async () => {
    const store = stubStorage();
    const old = await legacyPayload(JSON.stringify([record("a")]), "pass one", 100_000);
    store.set(VAULT_KEY, old);
    await expect(addToVault(record("b"), "pass two")).rejects.toBeInstanceOf(DecryptError);
    expect(store.get(VAULT_KEY)).toBe(old);
  });

  it("blocked storage reads as an empty vault, not a crash", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(await openVault("x")).toEqual([]);
  });
});
