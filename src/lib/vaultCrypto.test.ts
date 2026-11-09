import { afterEach, describe, expect, it, vi } from "vitest";
import { addToVault, openVault, VAULT_KEY, type VaultRecord } from "./vault";
import { decryptText, DecryptError, encryptText } from "./vaultCrypto";

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
