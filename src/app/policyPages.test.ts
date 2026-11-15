import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Production hardening Phase 3 (2026-11-15): the About, Privacy and Terms pages, the footer links to
// them, and the one source of the operator line and the contact address (src/lib/siteConfig.ts).
// Privacy and Terms are drafted, pending legal review (docs/privacy-terms.md, which names the file
// behind every privacy statement). The statements that can be checked on the code are checked here.

const env = vi.hoisted(() => ({ lang: "en" as "en" | "ar" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/about" }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  const scripted = (_subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    return value === "en" || value === "ar" ? env.lang : value;
  };
  return { ...real, useSyncExternalStore: scripted };
});

import AboutPage from "@/app/about/page";
import PortalsPage from "@/app/portals/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import { SiteFooter } from "@/components/shell/site";
import { TRANSLATE_BUTTON, TRANSLATE_CONSENT_TEXT } from "@/components/translateFlow";
import { REPORT_FRAUD_ID } from "@/lib/authorities";
import { buildCsp } from "@/lib/csp";
import { AR } from "@/lib/i18nAr";
import { REDACTED, redactSensitive } from "@/lib/redact";
import { POLICY_LAST_UPDATED, SITE_CONTACT_EMAIL, SITE_OPERATOR } from "@/lib/siteConfig";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replaceAll("\r\n", "\n");
const decode = (html: string) =>
  html.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

const PAGES = { about: AboutPage, privacy: PrivacyPage, terms: TermsPage } as const;
type Page = keyof typeof PAGES;

function render(page: Page | "footer", lang: "en" | "ar"): string {
  env.lang = lang;
  try {
    return decode(renderToStaticMarkup(createElement(page === "footer" ? SiteFooter : PAGES[page])));
  } finally {
    env.lang = "en";
  }
}

// Every .ts and .tsx under a folder that is not a test.
function sources(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(join(process.cwd(), path)).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("the three pages render in English and Arabic", () => {
  const HEADINGS: Record<Page, string> = { about: "About Offer Check UAE", privacy: "Privacy notice", terms: "Terms of use" };

  it.each(Object.keys(PAGES) as Page[])("/%s: one h1, in each language, and every section heading translated", (page) => {
    for (const lang of ["en", "ar"] as const) {
      const html = render(page, lang);
      expect(html.match(/<h1[\s>]/g), lang).toHaveLength(1);
      const h1 = lang === "en" ? HEADINGS[page] : AR[HEADINGS[page]];
      expect(h1, page).toBeTruthy();
      expect(html).toContain(`<h1 id="page-title" class="h1">${h1}</h1>`);
      for (const m of html.matchAll(/<h2 id="[^"]+" class="h2">([^<]+)<\/h2>/g)) {
        if (lang === "ar") expect(Object.values(AR), m[1]).toContain(m[1]);
      }
    }
  });

  // Arabic: no English sentence is left untranslated. What may stay in Latin letters: product and
  // service names, the address, the date, and the two technical terms given in brackets.
  const LATIN_ALLOWED = new Set(
    "Offer Check UAE Google Cloud Translation Vercel Upstash Redis IP salted hash cookies WhatsApp LinkedIn Delete all".split(" "),
  );
  it.each(Object.keys(PAGES) as Page[])("/%s in Arabic leaves no English text outside names", (page) => {
    const html = render(page, "ar")
      .replace(/<([a-z]+)[^>]*lang="en"[^>]*>[\s\S]*?<\/\1>/g, " ")
      .replace(/<time[^>]*>[^<]*<\/time>/g, " ");
    const latin = new Set(text(html).match(/[A-Za-z]{2,}/g) ?? []);
    expect([...latin].filter((word) => !LATIN_ALLOWED.has(word))).toEqual([]);
  });

  it("the pages are laid out with logical properties only, so they mirror in Arabic", () => {
    for (const page of Object.keys(PAGES)) {
      expect(read(`src/app/${page}/page.tsx`)).not.toMatch(/style=|left|right|marginLeft|paddingRight/);
    }
  });

  it("Privacy and Terms show the same 'Last updated' date, from siteConfig, at the top", () => {
    expect(POLICY_LAST_UPDATED).toBe("2026-11-15");
    for (const page of ["privacy", "terms"] as const) {
      const html = render(page, "en");
      const at = html.indexOf("Last updated:");
      expect(at).toBeGreaterThan(-1);
      expect(at).toBeLessThan(html.indexOf('class="lead"'));
      expect(html).toContain(`<time dateTime="2026-11-15" lang="en" dir="ltr">2026-11-15</time>`);
      expect(render(page, "ar")).toContain(AR["Last updated:"]);
    }
  });
});

describe("links: the footer and About reach the new pages, and every internal link resolves", () => {
  const page = (href: string) => href.split("#")[0];
  const internal = (html: string) => [...html.matchAll(/<a [^>]*href="(\/[^"]*)"/g)].map((m) => m[1]);

  it("the footer links About, Privacy and Terms; About links Privacy and Terms; each policy page links the other", () => {
    expect(internal(render("footer", "en"))).toEqual(["/about", "/privacy", "/terms"]);
    expect(internal(render("about", "en"))).toEqual(expect.arrayContaining(["/privacy", "/terms"]));
    expect(internal(render("privacy", "en"))).toEqual(expect.arrayContaining(["/terms", "/about"]));
    expect(internal(render("terms", "en"))).toEqual(expect.arrayContaining(["/privacy", "/about", "/portals"]));
  });

  it("every internal link on the footer and the three pages goes to a page that exists, and every anchor to an id on it", () => {
    const hrefs = new Set((["footer", "about", "privacy", "terms"] as const).flatMap((p) => internal(render(p, "en"))));
    expect(hrefs.size).toBeGreaterThan(4);
    for (const href of hrefs) {
      expect(existsSync(join(process.cwd(), "src/app", page(href), "page.tsx")), href).toBe(true);
    }
    expect(hrefs).toContain(`/portals#${REPORT_FRAUD_ID}`);
    expect(renderToStaticMarkup(createElement(PortalsPage))).toContain(`id="${REPORT_FRAUD_ID}"`);
  });

  it("/about no longer redirects", () => {
    expect(read("next.config.ts")).not.toMatch(/source: "\/about"/);
  });
});

describe("siteConfig: the one source of the operator line and the contact address", () => {
  it("holds the owner's wording", () => {
    expect(SITE_OPERATOR.en).toBe("Offer Check UAE, an independent project run by an individual developer in the UAE");
    expect(SITE_CONTACT_EMAIL).toBe("offercheck.uae@gmail.com");
  });

  it("no other source file, the Arabic dictionary included, holds either of them", () => {
    const values = [SITE_OPERATOR.en, SITE_OPERATOR.ar, SITE_CONTACT_EMAIL, "independent project run by", "offercheck.uae@"];
    const offending = sources("src")
      .filter((path) => path !== "src/lib/siteConfig.ts")
      .filter((path) => values.some((value) => read(path).includes(value)));
    expect(offending).toEqual([]);
    for (const [en, ar] of Object.entries(AR)) for (const value of values) expect(`${en} ${ar}`).not.toContain(value);
  });

  it.each(["en", "ar"] as const)("%s: About, Privacy and Terms show the line and the address from siteConfig", (lang) => {
    for (const page of Object.keys(PAGES) as Page[]) {
      const html = render(page, lang);
      expect(html, page).toContain(SITE_OPERATOR[lang]);
      expect(html, page).toContain(`<a href="mailto:${SITE_CONTACT_EMAIL}" lang="en" dir="ltr">${SITE_CONTACT_EMAIL}</a>`);
    }
  });

  it("About says Offer Check is not affiliated with any government body", () => {
    expect(text(render("about", "en"))).toContain("Offer Check UAE is not affiliated with any government body.");
  });
});

describe("no personal name in user-facing copy", () => {
  // Capitalised words that may appear: product, place, service and organisation names, and the
  // first word of a sentence or heading. Anything else (such as a person's name) fails.
  const ALLOWED = new Set(
    `About Acceptable Before Check Checks Confirm Contact Cross Delete Do Each Emirates Encrypted English Five Fixed Google Gov Hub
    IBAN IBANs ID If India It Last Like Limits Mumbai No Not Numbers Offer Official Open Or Portals Privacy Questions Rate Read Redis
    Reports Risk Save Some Terms Text The There They To Translation Translate Threat Radar UAE Upstash Use Vercel Vault Your WhatsApp
    LinkedIn People Cloud What When Where Who An Arabic Indic Information Tools IP A Before How You AI Remove Send`.split(/\s+/),
  );
  it.each(["about", "privacy", "terms", "footer"] as const)("%s: every capitalised word is on the list", (page) => {
    const words = new Set(text(render(page, "en")).match(/\b[A-Z][A-Za-z]+\b/g) ?? []);
    const footerNames = new Set(["MoHRE", "Portal", "ICP", "Smart", "Services", "GDRFA", "Dubai", "Amer", "Police", "eCrime", "Prototype", "Rule", "Resume", "Pause", "Score", "Animations"]);
    expect([...words].filter((word) => !ALLOWED.has(word) && !footerNames.has(word))).toEqual([]);
  });

  it("the operator line names no person: only the project and 'an individual developer'", () => {
    expect(SITE_OPERATOR.en.match(/\b[A-Z][A-Za-z]+\b/g)).toEqual(["Offer", "Check", "UAE", "UAE"]);
    expect(SITE_OPERATOR.en).toContain("an individual developer");
  });
});

describe("privacy statements that can be checked on the code", () => {
  const privacy = () => text(render("privacy", "en"));

  it("no advertising, analytics or tracking script: no such package, code or outside origin", () => {
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["lucide-react", "next", "react", "react-dom"]);
    const tracking = /analytics|gtag|googletagmanager|google-analytics|plausible|posthog|mixpanel|hotjar|clarity\.ms|segment\.io|fbq\(|facebook\.net|sendBeacon|<script[^>]+src=/i;
    // The policy pages and their Arabic text name what is absent, so they are left out of the search.
    const policyPages = ["src/app/privacy/page.tsx", "src/app/about/page.tsx", "src/app/terms/page.tsx", "src/lib/i18nAr.ts"];
    const found = sources("src").filter((path) => !policyPages.includes(path) && tracking.test(read(path)));
    expect(found).toEqual([]);
    // The policy lets the browser load nothing from another origin.
    const csp = buildCsp("bm9uY2U=");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toMatch(/https?:|\*/);
    expect(privacy()).toContain("Offer Check has no advertising, analytics or tracking scripts, and its code sets no cookies.");
  });

  it("its code sets no cookies", () => {
    const cookie = /document\.cookie|cookies\(\)|\.cookies\.set|Set-Cookie/i;
    expect(sources("src").filter((path) => cookie.test(read(path)))).toEqual([]);
  });

  it("the consent wording: the page names the translate button, and the button's disclosure says what the page says", () => {
    expect(privacy()).toContain(`The text is sent only when you press “${TRANSLATE_BUTTON}”, each time you press it`);
    expect(TRANSLATE_BUTTON).toBe("Send to Google and translate");
    expect(TRANSLATE_CONSENT_TEXT).toContain("Google Cloud Translation, a machine translation service run by Google. Offer Check does not store it; Google's terms apply to the text it receives.");
    expect(privacy()).toContain("Google Cloud Translation, a machine translation service run by Google. Offer Check does not store it; Google's terms apply to the text it receives.");
    expect(read("src/components/translateRequest.ts")).toContain("body: JSON.stringify({ text: masked, consent: true })");
  });

  it("what a check sends: the masked text and the translation record, nothing else", () => {
    const source = read("src/components/checkRequest.ts");
    expect(source).toContain("const { text, count } = redactSensitive(unmasked);");
    expect(source).toContain("JSON.stringify(translation ? { text, translation } : { text })");
    expect(read("src/lib/translation.ts")).toContain('export type TranslationRecord = { result: "ok"; sourceLang: string } | { result: TranslateFailure };');
  });

  it("not stored or logged: no source file writes to the console, and the analysis route returns the run", () => {
    expect(sources("src").filter((path) => /\bconsole\./.test(read(path)))).toEqual([]);
    expect(read("src/app/api/analyze/route.ts")).toContain("return NextResponse.json(await runWithAudit(text, translation));");
  });

  it("the numbers hidden in the browser, and the ones that are not", () => {
    for (const caught of ["784-1990-1234567-1", "AE070331234567890123456", "A1234567", "K12345678"]) {
      expect(redactSensitive(caught).text, caught).toBe(REDACTED);
    }
    for (const missed of ["GB29NWBK60161331926819", "784.1990.1234567.1", "AB1234567", "٧٨٤-١٩٩٠-١٢٣٤٥٦٧-١"]) {
      expect(redactSensitive(missed).count, missed).toBe(0);
    }
  });

  it("processing in Mumbai: the functions run in bom1", () => {
    expect(JSON.parse(read("vercel.json")).regions).toEqual(["bom1"]);
  });

  it("the rate-limit counters: a salted hash of the address, counters only, 2 minutes or 25 hours", () => {
    const source = read("src/lib/rateLimit.ts");
    expect(source).toContain("const MINUTE_TTL_S = 120;");
    expect(source).toContain("const DAY_TTL_S = 90_000; // 25 hours");
    expect(source).toContain('crypto.subtle.importKey("raw", new TextEncoder().encode(salt), { name: "HMAC", hash: "SHA-256" }');
    expect(source).toContain('["EXPIRE", key, String(ttlSeconds), "NX"]');
  });

  it("what stays in the browser: exactly the vault, its count, the language and the animation choice", () => {
    const storage = sources("src").filter((path) => /localStorage|sessionStorage|indexedDB/.test(read(path)));
    expect(storage.sort()).toEqual(["src/components/shell/lang.ts", "src/components/shell/motion.ts", "src/lib/vault.ts"]);
    expect(storage.some((path) => /sessionStorage|indexedDB/.test(read(path)))).toBe(false);
    expect(read("src/components/shell/lang.ts")).toContain('const STORAGE_KEY = "offercheck_lang";');
    expect(read("src/components/shell/motion.ts")).toMatch(/MOTION_STORAGE_KEY = "offercheck_motion"/);
    expect(read("src/lib/vault.ts")).toMatch(/offercheck_vault_v1/);
    expect(read("src/lib/vault.ts")).toMatch(/offercheck_vault_count_v1/);
    // Threat Radar reports: tab memory only.
    expect(read("src/components/radar/localReports.ts")).not.toMatch(/localStorage|sessionStorage|fetch\(/);
    // How to clear them: the vault's own Delete all.
    expect(read("src/components/EncryptedVault.tsx")).toContain('{t("Delete all")}');
  });

  it("Privacy and Terms are marked drafted, pending legal review, in the docs", () => {
    const doc = read("docs/privacy-terms.md");
    expect(doc).toMatch(/Privacy notice \(`\/privacy`\): drafted, pending legal review/);
    expect(doc).toMatch(/Terms of use \(`\/terms`\): drafted, pending legal review/);
  });
});

describe("Terms: plain statements, no invented law", () => {
  it("covers prototype status, not a verdict or legal advice, no guarantee, official channels, acceptable use, and limits", () => {
    const terms = text(render("terms", "en"));
    for (const line of [
      "Offer Check UAE is an early prototype.",
      "It is not a verdict on any offer, sender or company, and it is not legal advice.",
      "Offer Check gives no guarantee that a result is accurate or complete.",
      "confirm it yourself through the official UAE channels",
      "Do not send checks or translations with scripts or other automated tools",
      "Do not paste unlawful content.",
      "The operator may limit, change or stop the service",
    ]) {
      expect(terms, line).toContain(line);
    }
  });

  it("names no law, article, court, jurisdiction or compliance standard", () => {
    for (const page of ["privacy", "terms"] as const) {
      expect(text(render(page, "en")), page).not.toMatch(/\blaw\b|Article \d|Federal|Decree|court|jurisdiction|GDPR|PDPL|complian|liabilit|indemnif|governed by/i);
    }
  });
});
