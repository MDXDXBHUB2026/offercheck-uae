import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PROTOTYPE_NOTICE, SiteFooter } from "@/components/shell/site";
import Home from "./page";

// The redesign: the notice names the server (it stores nothing), Google (only on translation) and
// the Encrypted Vault (an encrypted copy in this browser, only on Save Encrypted).
const NOTICE =
  "Prototype. Use synthetic or redacted offers only. Offer Check&#x27;s server does not store offer text. If you choose translation, Google Cloud Translation receives it. Save Encrypted keeps an encrypted copy in this browser only.";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("home page", () => {
  // Phase 1: the notice is in the shared layout, so every route shows it. The redesign removed the
  // strip under the header (the reference header has none); the footer keeps it word for word.
  it("shows the prototype notice in the site-wide footer", () => {
    expect(PROTOTYPE_NOTICE).toBe(NOTICE.replace("&#x27;", "'"));
    expect(renderToStaticMarkup(createElement(SiteFooter))).toContain(NOTICE);
  });

  it("is the Check workspace", () => {
    expect(renderToStaticMarkup(createElement(Home))).toContain('<textarea id="offer"');
  });
});

// The notice says the server does not store offer text. These checks keep that true.
// Two files may use browser storage, both named in the notice or the footer and checked below: the
// Encrypted Vault (only ciphertext, on the user's Save Encrypted) and the language switch (only
// "en" or "ar"). Every other file stays free of storage.
const STORAGE_ALLOWED = [join("src", "lib", "vault.ts"), join("src", "components", "shell", "lang.ts")];

describe("no logging or storage of offer text", () => {
  const files = [...sourceFiles(join(process.cwd(), "src")), join(process.cwd(), "next.config.ts")];
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

  it("the vault writes only the encrypted payload, and the language switch only the language", () => {
    const vault = read(STORAGE_ALLOWED[0]);
    // Besides the ciphertext, only the number of saved results (for the Vault tab) is written.
    expect(vault.match(/localStorage\.setItem\(([^)]*\)?)\)/g)).toEqual([
      "localStorage.setItem(VAULT_KEY, value)",
      "localStorage.setItem(VAULT_COUNT_KEY, String(count))",
      "localStorage.setItem(VAULT_COUNT_KEY, String(count))",
    ]);
    expect(vault).toContain("writeVault(await encryptText(");
    expect(vault).not.toMatch(/\bconsole\.\w+|sessionStorage|indexedDB|document\.cookie/);
    const lang = read(STORAGE_ALLOWED[1]);
    expect(lang.match(/localStorage\.setItem\(([^)]*)\)/g)).toEqual(["localStorage.setItem(STORAGE_KEY, lang)"]);
    expect(lang).not.toMatch(/\bconsole\.\w+|sessionStorage|indexedDB|document\.cookie/);
  });

  it("finds the source files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((file) => [file.slice(process.cwd().length + 1)]).filter(([file]) => !STORAGE_ALLOWED.includes(file)))(
    "%s has no console call, logger, file write or browser storage",
    (file) => {
      expect(read(file)).not.toMatch(
        /\bconsole\.\w+|\b(?:pino|winston|morgan)\b|\b(?:writeFile|appendFile|createWriteStream)\w*\(|localStorage|sessionStorage|indexedDB|document\.cookie/,
      );
    },
  );
});
