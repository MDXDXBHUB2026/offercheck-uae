import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Production Phase 7 (2026-11-24): the Sender check page, its nav tab, the Privacy and Terms sentences,
// and the removal of the audit panel (Step 0). The logic itself is tested in src/lib/senderCheck.test.ts.

const nav = vi.hoisted(() => ({ lang: "en" as "en" | "ar", pathname: "/sender" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  const scripted = (_subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    return value === "en" || value === "ar" ? nav.lang : value;
  };
  return { ...real, useSyncExternalStore: scripted };
});

import SenderPage, { metadata } from "@/app/sender/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import CheckPage from "@/app/check/page";
import { SenderCheck, SenderLimits, SenderResults } from "@/components/SenderCheck";
import { Navbar } from "@/components/shell/Navbar";
import { NAV_ITEMS } from "@/components/shell/site";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { LEGIT_OFFER, SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { AR } from "@/lib/i18nAr";
import { hasArabic, tr } from "@/lib/i18n";
import { mainChannels, REPORT_FRAUD_NOTE } from "@/lib/authorities";
import { OFFLINE_PAGES } from "@/lib/serviceWorker";
import { checkSender, NOTHING_FLAGGED, type SenderInput } from "@/lib/senderCheck";

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").trim();
const resultOf = (input: Partial<SenderInput>) => checkSender({ email: "", phone: "", web: "", company: "", ...input });

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("the /sender page", () => {
  it("has its title and description, one h1, and no main, header or footer of its own", () => {
    expect(metadata.title).toBe("Sender Check");
    expect(String(metadata.description).length).toBeGreaterThan(20);
    const markup = html(createElement(SenderPage));
    expect(markup.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(markup).not.toMatch(/<main[\s>]|<header[\s>]|<footer[\s>]/);
  });

  it("shows the four fields, each with a label, and the two buttons, before anything is typed", () => {
    const markup = html(createElement(SenderCheck));
    for (const [id, label] of [
      ["sender-email", "Sender email address"],
      ["sender-phone", "Phone number"],
      ["sender-web", "Web address or domain"],
      ["sender-company", "Company name the offer used"],
    ]) {
      expect(markup).toContain(`<label for="${id}">${label}</label>`);
      expect(markup).toMatch(new RegExp(`<input id="${id}"`));
    }
    expect(markup).toContain("Run the checks");
    expect(markup).toContain(">Clear<");
    // Nothing flagged and nothing said before the button is pressed.
    expect(text(markup)).not.toContain("nothing to flag");
    expect(markup).not.toContain("things to look at");
  });

  it("the form has no action and no method: nothing is submitted anywhere", () => {
    const markup = html(createElement(SenderCheck));
    expect(markup).not.toMatch(/<form[^>]*\b(?:action|method)=/);
    expect(markup).not.toMatch(/type="(?:email|tel|url|password)"/);
  });

  it("names the limits and links to the official channels from authorities.ts", () => {
    const markup = html(createElement(SenderLimits));
    expect(text(markup)).toContain("cannot tell whether a number is a VoIP line, who owns an address, or whether a company is registered");
    for (const channel of mainChannels()) expect(markup).toContain(`href="${channel.url}"`);
    expect(mainChannels().map((channel) => channel.id)).toContain("mohre_verify");
    expect(text(markup)).toContain(REPORT_FRAUD_NOTE);
  });
});

describe("the result wording", () => {
  it("nothing flagged: exactly the owner's sentence, in a callout, never as a clearance", () => {
    const markup = html(createElement(SenderResults, { result: resultOf({ email: "hr@desertstar.ae", phone: "+971 4 123 4567" }) }));
    expect(text(markup)).toBe(NOTHING_FLAGGED);
    expect(NOTHING_FLAGGED).toBe("These checks found nothing to flag. This is not a clearance: confirm the employer through official channels before you pay a fee or send documents.");
    expect(markup).toContain('role="status"');
  });

  it("says what to type when the form is empty", () => {
    expect(text(html(createElement(SenderResults, { result: resultOf({ company: "Desert Star" }) })))).toContain("Add an email address, a phone number or a web address");
  });

  it("the live region is in the page even with no result, so a result is announced", () => {
    expect(html(createElement(SenderResults, { result: null }))).toBe('<div role="status" aria-live="polite" class="stack-sm"></div>');
  });

  it("with findings: a count heading, each fact with its next step, and the not-a-verdict line", () => {
    const result = resultOf({ email: "hr@acme-trading.ae", company: "Desert Star", phone: "+44 7700 900123", web: "rnohre.gov.ae" });
    const markup = html(createElement(SenderResults, { result }));
    expect(text(markup)).toContain("3 things to look at");
    expect(text(markup)).toContain("The email domain (acme-trading.ae) does not contain any word from the company name you typed (Desert Star)");
    expect(text(markup)).toContain("The web address (rnohre.gov.ae) is not in Offer Check's list of official addresses, but it matches mohre.gov.ae once look-alike letters are swapped");
    expect(text(markup)).toContain("The phone number starts with a country code other than +971 (the UAE)");
    expect(markup.match(/What to do next/g)).toHaveLength(3);
    expect(text(markup)).toContain("not a verdict");
    expect(text(markup)).not.toContain(NOTHING_FLAGGED);
  });

  it("one finding reads '1 thing to look at'", () => {
    expect(text(html(createElement(SenderResults, { result: resultOf({ email: "a@gmail.com" }) })))).toContain("1 thing to look at");
  });

  it("the typed text is shown escaped, never as markup", () => {
    const markup = html(createElement(SenderResults, { result: resultOf({ web: '<img src=x onerror=alert(1)>.example.com' }) }));
    expect(markup).not.toContain("<img");
  });

  it("in Arabic the same findings are in Arabic, with typed addresses isolated left to right", () => {
    nav.lang = "ar";
    const markup = html(createElement(SenderResults, { result: resultOf({ web: "rnohre.gov.ae", phone: "+44 7700 900123" }) }));
    nav.lang = "en";
    expect(markup).toContain("2 أمور للنظر فيها");
    expect(markup).toContain("⁦rnohre.gov.ae⁩");
    expect(markup).toContain("ما تفعله بعد ذلك");
    expect(markup).not.toMatch(/What to do next|look at/);
  });

  it("in Arabic the empty result is the Arabic sentence", () => {
    nav.lang = "ar";
    const markup = html(createElement(SenderResults, { result: resultOf({ email: "hr@desertstar.ae" }) }));
    nav.lang = "en";
    expect(text(markup)).toBe(tr("ar", NOTHING_FLAGGED));
  });
});

describe("no network, no storage, nothing sent, no copied address", () => {
  const FILES = ["src/components/SenderCheck.tsx", "src/lib/senderCheck.ts", "src/app/sender/page.tsx"];

  it.each(FILES)("%s has no fetch, request, storage, cookie, window.open, mailto or wa.me", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|document\.cookie|window\.open|mailto:|wa\.me|navigator\.clipboard|import\s*\(/);
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toMatch(/process\.env/);
  });

  it("the component imports the official links; it holds none of its own", () => {
    const source = read("src/components/SenderCheck.tsx");
    expect(source).toContain('import { mainChannels, REPORT_FRAUD_NOTE } from "@/lib/authorities";');
  });

  it("no pasted value is ever placed in the page's own source, a URL or the document title", () => {
    const markup = html(createElement(SenderPage));
    expect(markup).not.toMatch(/value="[^"]+"/);
  });

  it("does not reach the analyzer, the scorer or the red-flag rules", () => {
    for (const file of FILES) expect(read(file)).not.toMatch(/from "@\/lib\/(?:scoring|agents\/|audit|rateLimit)/);
  });

  it("no new counters: the counter names are the same six as before", () => {
    expect(read("src/lib/rateLimit.ts")).toMatch(/COUNT_NAMES\s*=\s*\[\s*"checks",\s*"analyze_errors",\s*"analyze_rejected",\s*"analyze_rate_limits",\s*"translate_requests",\s*"translate_refusals",?\s*\]/);
  });
});

describe("the fifth tab", () => {
  it("Sender check is a Tools tab after the Analyzer, with its Arabic label", () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual(["analyzer", "sender", "portals", "legal", "about"]);
    const item = NAV_ITEMS.find((entry) => entry.id === "sender");
    expect(item).toMatchObject({ group: "tools", href: "/sender", label: "Sender Check", short: "Sender check", labelAr: "فحص المرسل" });
    expect(hasArabic(item?.short ?? "")).toBe(true);
    expect(hasArabic(item?.label ?? "")).toBe(true);
  });

  it("is in the desktop header and the compact bar, English and Arabic, marked current on /sender", () => {
    for (const lang of ["en", "ar"] as const) {
      nav.lang = lang;
      const markup = html(createElement(Navbar));
      expect(markup.match(/href="\/sender"/g), lang).toHaveLength(2);
      expect(markup).toMatch(/aria-current="page"[^>]*href="\/sender"|href="\/sender"[^>]*aria-current="page"/);
      expect(markup).toContain(lang === "ar" ? "فحص المرسل" : "Sender check");
    }
    nav.lang = "en";
  });

  it("is kept for offline reading; there is no sitemap or manifest shortcut to add it to", () => {
    expect(OFFLINE_PAGES).toContain("/sender");
    for (const file of ["src/app/sitemap.ts", "src/app/robots.ts"]) {
      if (existsSync(join(process.cwd(), file))) expect(read(file)).toContain("/sender");
    }
    expect(read("src/app/manifest.ts")).not.toMatch(/shortcuts/);
  });

  it("every Arabic page title for the five tabs is in the dictionary", () => {
    for (const item of NAV_ITEMS) expect(item.labelAr.length).toBeGreaterThan(1);
  });
});

describe("Privacy and Terms say the Sender check runs in the browser and nothing is sent", () => {
  const PRIVACY = "The Sender check runs in your browser on what you type into it, and nothing you type there is sent, saved or looked up.";
  const TERMS = "The Sender check runs in your browser and nothing you type there is sent; it gives plain facts, not a verdict.";

  it("English", () => {
    expect(text(html(createElement(PrivacyPage)))).toContain(PRIVACY);
    expect(text(html(createElement(TermsPage)))).toContain(TERMS);
  });

  it("Arabic, from the dictionary, in the [review] block", () => {
    const source = read("src/lib/i18nAr.ts");
    const block = source.slice(source.indexOf("[review] Phase 7"));
    for (const sentence of [PRIVACY, TERMS]) {
      expect(hasArabic(sentence)).toBe(true);
      expect(block).toContain(JSON.stringify(sentence));
    }
    nav.lang = "ar";
    expect(text(html(createElement(PrivacyPage)))).toContain(AR[PRIVACY]);
    expect(text(html(createElement(TermsPage)))).toContain(AR[TERMS]);
    nav.lang = "en";
  });

  it("the offline sentence names the Sender check", () => {
    expect(text(html(createElement(PrivacyPage)))).toContain("a copy of the Check page, the Sender check and the About");
  });
});

describe("every new Arabic string is in the Phase 7 [review] block, once", () => {
  const source = read("src/lib/i18nAr.ts").replace(/\r\n/g, "\n");
  const start = source.indexOf("// [review] Phase 7 (2026-11-24)");
  const block = source.slice(start, source.indexOf("// Official names"));
  const keys = [...block.matchAll(/^ {2}("(?:[^"\\]|\\.)*"):/gm)].map((match) => JSON.parse(match[1]) as string);

  it("holds 47 entries, none repeated, none the same as its English", () => {
    expect(keys).toHaveLength(47);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(AR[key], key).not.toBe(key);
  });

  it("every key is new: none was in the dictionary before this block", () => {
    const before = source.slice(0, start);
    expect(keys.filter((key) => before.includes(JSON.stringify(key)))).toEqual([]);
  });
});

describe("Step 0: the audit panel is gone from the interface, the internal record stays", () => {
  it("AuditTrail.tsx and its test are deleted, and nothing imports it", () => {
    expect(existsSync(join(process.cwd(), "src/components/AuditTrail.tsx"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/components/AuditTrail.test.ts"))).toBe(false);
    for (const file of sources("src")) expect(read(file), file).not.toMatch(/components\/AuditTrail/);
  });

  it("the analyzer page shows no audit trail, no chain label and no audit status message", () => {
    const markup = html(createElement(CheckPage));
    expect(markup).not.toMatch(/audit-trail|Audit trail|chain verified|chain broken|audit-failed|latest step to the audit/i);
  });

  it("no interface source or Arabic entry holds the removed strings", () => {
    const REMOVED = ["Audit trail", "This browser could not add the latest step to the audit trail.", "{0} entry", "{0} entries", "checking the chain", "chain verified", "chain broken at entry {0}"];
    for (const key of REMOVED) expect(AR[key], key).toBeUndefined();
    for (const file of [...sources("src/components"), ...sources("src/app")]) {
      expect(read(file), file).not.toMatch(/chain verified|chain broken|audit-failed|aria-label=\{t\("Audit trail"\)\}/);
    }
  });

  it("the internal audit record is still built: src/lib/audit.ts is used, the page keeps its chain in memory", () => {
    const source = read("src/components/OfferChecker.tsx");
    expect(source).toContain("appendEntries");
    expect(source).toContain("gateStep");
    expect(source).toContain("startAudit(data.runId, data.audit);");
    expect(source).not.toMatch(/useState<AuditEntry\[\]>|setAuditLog|setAuditFailed|auditFailed/);
    expect(existsSync(join(process.cwd(), "src/lib/audit.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/lib/audit.test.ts"))).toBe(true);
  });

  it("/api/analyze still returns the audit record with the run (the server builds it, the page does not show it)", () => {
    const run = runManager(SCAM_OFFER);
    expect(run.risk.score).toBeGreaterThan(0);
    expect(read("src/app/api/analyze/route.ts")).toContain("runWithAudit");
  });
});

describe("scoring is not touched: the sample offers score exactly as they did on main (d436055)", () => {
  const EXPECTED: [string, number, string][] = [
    ["visa-fee", 100, "high"],
    ["whatsapp-otp", 60, "high"],
    ["documents-deposit", 100, "high"],
    ["genuine-letter", 0, "low"],
  ];

  it.each(EXPECTED)("%s scores %i, band %s", (id, score, band) => {
    const sample = SAMPLE_OFFERS.find((entry) => entry.id === id);
    expect(sample, id).toBeDefined();
    const run = runManager(sample?.text ?? "");
    expect([run.risk.score, run.risk.band]).toEqual([score, band]);
  });

  it("the two fixtures score the same too", () => {
    expect([runManager(SCAM_OFFER).risk.score, runManager(SCAM_OFFER).risk.band]).toEqual([100, "high"]);
    expect([runManager(LEGIT_OFFER).risk.score, runManager(LEGIT_OFFER).risk.band]).toEqual([0, "low"]);
  });

  it("an offer's score does not change with the Sender check: the check reads none of it", () => {
    const before = runManager(SCAM_OFFER).risk.score;
    checkSender({ email: "hr@gmail.com", phone: "+44 1", web: "rnohre.gov.ae", company: "Desert Star" });
    expect(runManager(SCAM_OFFER).risk.score).toBe(before);
  });
});
