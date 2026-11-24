import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Production Phase 6 (owner decision, 2026-11-23): the Action & Report Kit replaces the Encrypted
// Vault. The Kit is built in the browser from the check just run; it never holds the offer text, a
// Low or Medium result is never a clearance, no banned wording, and no Vault string is left.

const nav = vi.hoisted(() => ({ lang: "en" as "en" | "ar" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/check" }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  const scripted = (_subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    return value === "en" || value === "ar" ? nav.lang : value;
  };
  return { ...real, useSyncExternalStore: scripted };
});

import { ActionKit } from "./ActionKit";
import { ResultCard } from "./ResultCard";
import { Navbar } from "@/components/shell/Navbar";
import { SettingsDialog } from "@/components/shell/SettingsPanel";
import { NAV_ITEMS, SiteFooter } from "@/components/shell/site";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { EVAL_OFFERS } from "@/lib/agents/eval/offers";
import { HOLDOUT_OFFERS } from "@/lib/agents/eval/holdout";
import { LEGIT_OFFER, SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { RULES } from "@/lib/agents/redFlag";
import {
  buildReportText,
  cleanNote,
  clearanceLineShown,
  KIT_CHANNELS,
  KIT_STRINGS,
  kitChannelFor,
  NOT_A_CLEARANCE,
  NOTE_MAX,
  REPLY_TEMPLATES,
  SUMMARY_FILE_NAME,
} from "@/lib/actionKit";
import { mainChannels, REPORT_FRAUD_NOTE } from "@/lib/authorities";
import { tr } from "@/lib/i18n";
import { AR } from "@/lib/i18nAr";
import type { AnalysisResult } from "@/lib/types";
import AboutPage from "@/app/about/page";
import CheckPage from "@/app/check/page";
import LegalPage from "@/app/legal/page";
import PortalsPage from "@/app/portals/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import { REDIRECTS } from "../../next.config";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replaceAll("\r\n", "\n");
const html = (element: ReactElement) => renderToStaticMarkup(element);
const textOf = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ");
const t = (en: string, ...args: (string | number)[]) => tr("en", en, ...args);

// Made-up test data: a fake name, phone number and email address inside an offer that also asks for a fee.
const FAKE_NAME = "Zorander Vexley";
const FAKE_PHONE = "+971 50 555 0199";
const FAKE_EMAIL = "zorander.vexley@example.test";
const OFFER = `Dear candidate, I am ${FAKE_NAME} from Desert Star Recruitment. You are selected for a Sales Executive role in Dubai, salary AED 9,000. To continue, pay a visa processing fee of AED 1,500 today. Reply on WhatsApp ${FAKE_PHONE} or email ${FAKE_EMAIL}. This offer closes today.`;
const PRIVATE_VALUES = [FAKE_NAME, "Zorander", "Vexley", FAKE_PHONE, "555 0199", "5550199", FAKE_EMAIL, "example.test", "Desert Star"];

const card = (result: AnalysisResult, props: Record<string, unknown> = {}) =>
  html(createElement(ResultCard, { result, ruleCount: RULES.length, sourceText: OFFER, channel: "WhatsApp", ...props }));

// The Kit's own section of a rendered result card.
function kitSection(markup: string): string {
  const heading = markup.indexOf('id="kit-heading"');
  expect(heading, "the Kit is on the page").toBeGreaterThan(-1);
  const start = markup.lastIndexOf("<section", heading);
  return markup.slice(start, markup.indexOf("</section>", start) + "</section>".length);
}

function resultsByBand() {
  const offers = [
    ...SAMPLE_OFFERS.map((offer) => offer.text),
    ...EVAL_OFFERS.map((offer) => offer.text),
    ...HOLDOUT_OFFERS.map((offer) => offer.text),
    SCAM_OFFER,
    LEGIT_OFFER,
    OFFER,
  ];
  const out = { low: [] as AnalysisResult[], medium: [] as AnalysisResult[], high: [] as AnalysisResult[] };
  for (const text of offers) {
    const result = runManager(text);
    out[result.risk.band].push(result);
  }
  return out;
}

describe("the Kit text never holds the pasted offer", () => {
  const result = runManager(OFFER);
  const checks = result.findings.filter((f) => f.severity !== "info").map((f) => f.check);

  it("the test offer fires findings, so the check is real", () => {
    expect(checks.length).toBeGreaterThan(0);
    expect(result.findings.flatMap((f) => f.evidence).join(" ")).toContain("fee");
  });

  it.each(KIT_CHANNELS.map((channel) => [channel] as const))("report text, channel %s: none of the name, phone or email, and no evidence quote", (channel) => {
    for (const band of ["low", "medium", "high"] as const) {
      const text = buildReportText({ bandLabel: "High risk indicators", band, checks, channel, note: "" }, t);
      for (const value of PRIVATE_VALUES) expect(text, value).not.toContain(value);
      for (const quote of result.findings.flatMap((f) => f.evidence)) expect(text, quote).not.toContain(quote);
      // No sentence of the offer either.
      for (const sentence of OFFER.split(/[.,]\s+/).filter((part) => part.length > 20)) expect(text).not.toContain(sentence);
    }
  });

  it("the rendered Kit, in English and Arabic, holds none of them either (the rest of the card may quote the offer)", () => {
    for (const lang of ["en", "ar"] as const) {
      nav.lang = lang;
      const kit = kitSection(card(result));
      for (const value of PRIVATE_VALUES) expect(kit, `${lang} ${value}`).not.toContain(value);
      for (const quote of result.findings.flatMap((f) => f.evidence)) expect(kit, `${lang} ${quote}`).not.toContain(quote);
    }
    nav.lang = "en";
    // The offer text is on the card (the highlights), so the check above is not vacuous.
    expect(card(result)).toContain("Desert Star");
  });

  it("the report text is the band wording, the finding names, the channel and the person's own words, then the official channels", () => {
    const text = buildReportText({ bandLabel: "High risk indicators", band: "high", checks, channel: "WhatsApp", note: "They asked me for AED 1,500." }, t);
    expect(text).toContain("Result: High risk indicators");
    expect(text).toContain("The offer reached me by: WhatsApp");
    expect(text).toContain("They asked me for AED 1,500.");
    expect(text).toContain("- Asks you to pay a fee or money");
    for (const channel of mainChannels()) expect(text).toContain(`${channel.name}: ${channel.url}`);
    expect(text).toContain(REPORT_FRAUD_NOTE);
    // It does not call itself an official packet or claim a channel's required format.
    expect(text).not.toMatch(/official packet|required format|official form(?!\.)/i);
    expect(text).toContain("it is not an official report form");
    // MoI and Aman stay the UAE Government directory links, as in authorities.ts (defects LINK-2).
    expect(text).toContain("lists the MoI eCrimes platform");
    expect(text).toContain("lists Aman, Abu Dhabi Police");
  });

  it("with nothing matched the text says so, and the own-words box can stay empty", () => {
    const text = buildReportText({ bandLabel: "No risk indicators found", band: "low", checks: [], channel: "Email", note: "  \n " }, t);
    expect(text).toContain("None of the fixed rules matched.");
    expect(text).toContain("(nothing added)");
  });

  it("the own-words box is cut to its limit, and line breaks are kept", () => {
    expect(cleanNote("a\r\nb")).toBe("a\nb");
    expect(cleanNote("x".repeat(NOTE_MAX + 50))).toHaveLength(NOTE_MAX);
  });

  it("the three WhatsApp replies are fixed: no name, number, address or placeholder", () => {
    expect(REPLY_TEMPLATES).toHaveLength(3);
    for (const reply of REPLY_TEMPLATES) {
      expect(reply.text).not.toMatch(/\d|@|https?:|\[|\{|<|_{2,}/);
      for (const value of PRIVATE_VALUES) expect(reply.text).not.toContain(value);
    }
    expect(REPLY_TEMPLATES.map((reply) => reply.id)).toEqual(["decline", "mohre-reference", "official-only"]);
    expect(REPLY_TEMPLATES[1].text).toContain("MOHRE offer reference number");
  });

  it("nothing is sent or opened: the Kit has no request, no link to a messaging app, no mailto, no window.open, no storage", () => {
    for (const file of ["src/components/ActionKit.tsx", "src/lib/actionKit.ts"]) {
      const source = read(file);
      expect(source, file).not.toMatch(
        /\bfetch\(|fetchImpl|XMLHttpRequest|sendBeacon|WebSocket|mailto:|wa\.me|api\.whatsapp|whatsapp:\/\/|window\.open|navigator\.share|localStorage|sessionStorage|indexedDB|document\.cookie|console\./,
      );
    }
    // The download is a same-page blob of the same text, named without any offer text or date.
    const kit = read("src/components/ActionKit.tsx");
    expect(kit).toContain("new Blob([text]");
    expect(kit).toContain("saveTextFile(reportText(), SUMMARY_FILE_NAME)");
    expect(kit).toContain("void copy(reportText())");
    expect(SUMMARY_FILE_NAME).toBe("offer-check-summary.txt");
    // No change to the content security policy: a blob download is not a fetch.
    const csp = read("src/lib/csp.ts");
    expect(csp).not.toMatch(/blob:|data:/);
  });

  it("the channel picker offers Email, WhatsApp, LinkedIn, Offer letter or PDF and Other, and starts at the check's channel", () => {
    expect([...KIT_CHANNELS]).toEqual(["Email", "WhatsApp", "LinkedIn", "Offer letter or PDF", "Other"]);
    expect(kitChannelFor("Offer Letter PDF")).toBe("Offer letter or PDF");
    expect(kitChannelFor("LinkedIn")).toBe("LinkedIn");
    expect(kitChannelFor(null)).toBe("Email");
    const kit = html(createElement(ActionKit, { band: "high", bandLabel: "High risk indicators", checks, defaultChannel: "LinkedIn" }));
    expect(kit.match(/<option /g)).toHaveLength(5);
    expect(kit).toMatch(/<option value="LinkedIn" selected="">LinkedIn<\/option>/);
    expect(kit).toContain("Copy report text");
    expect(kit).toContain("Download this summary");
    for (const reply of REPLY_TEMPLATES) expect(textOf(kit)).toContain(reply.label);
    expect(kit).toContain("Offer Check missed a scam?");
    for (const channel of mainChannels()) expect(kit).toContain(`href="${channel.url}"`);
  });
});

describe("a Low or Medium result is never a clearance", () => {
  const bands = resultsByBand();

  it("the offers cover all three bands", () => {
    expect(bands.low.length).toBeGreaterThan(5);
    expect(bands.medium.length).toBeGreaterThan(2);
    expect(bands.high.length).toBeGreaterThan(5);
  });

  it("the line is the owner's wording, and it is shown for Low and Medium only", () => {
    expect(NOT_A_CLEARANCE).toBe(
      "These checks flagged nothing more. This is not a clearance: never pay a fee or send documents before you have confirmed the employer through official channels.",
    );
    expect([clearanceLineShown("low"), clearanceLineShown("medium"), clearanceLineShown("high")]).toEqual([true, true, false]);
  });

  it.each(["en", "ar"] as const)("%s: every Low result shows the line, in every coverage state, with or without a finding", (lang) => {
    nav.lang = lang;
    const line = lang === "en" ? NOT_A_CLEARANCE : AR[NOT_A_CLEARANCE];
    expect(line).toBeTruthy();
    const states = [{}, { coverage: "partial" }, { coverage: "unchecked" }, { coverage: "translated", sourceLang: "hi" }, { offerSignals: [] }];
    for (const result of bands.low) {
      for (const props of states) {
        const markup = textOf(card(result, props));
        expect(markup, `${result.risk.score} ${JSON.stringify(props)}`).toContain(line);
      }
    }
    nav.lang = "en";
  });

  it("every Medium result shows it too, and a High result does not", () => {
    for (const result of bands.medium) expect(textOf(card(result))).toContain(NOT_A_CLEARANCE);
    for (const result of bands.high) expect(textOf(card(result))).not.toContain(NOT_A_CLEARANCE);
  });

  it("the line sits in the result's banner, once, and the copied text carries it for Low and Medium", () => {
    const markup = card(bands.low[0]);
    expect(markup.split("not-clearance").length - 1).toBe(1);
    expect(markup.indexOf("not-clearance")).toBeLessThan(markup.indexOf('id="kit-heading"'));
    expect(buildReportText({ bandLabel: "x", band: "low", checks: [], channel: "Email", note: "" }, t)).toContain(NOT_A_CLEARANCE);
    expect(buildReportText({ bandLabel: "x", band: "medium", checks: [], channel: "Email", note: "" }, t)).toContain(NOT_A_CLEARANCE);
    expect(buildReportText({ bandLabel: "x", band: "high", checks: [], channel: "Email", note: "" }, t)).not.toContain(NOT_A_CLEARANCE);
  });
});

describe("the Kit is under every result", () => {
  const bands = resultsByBand();
  it("all three bands, and the not-checked and translated states, show it once", () => {
    for (const result of [bands.low[0], bands.medium[0], bands.high[0]]) {
      for (const props of [{}, { coverage: "unchecked" }, { coverage: "translated", sourceLang: "ur" }, { coverage: "partial" }]) {
        const markup = card(result, props);
        expect(markup.split('id="kit-heading"').length - 1).toBe(1);
        expect(kitSection(markup)).toContain("Action &amp; Report Kit");
      }
    }
  });

  it("it is not printed, and the missed-scam link is inside it rather than after the card", () => {
    expect(kitSection(card(bands.high[0]))).toMatch(/^<section class="card stack kit no-print"/);
    expect(kitSection(card(bands.high[0]))).toContain("data-missed-scam");
  });
});

describe("no banned wording in the Kit", () => {
  const BANNED = /\b(?:probabilit\w*|reliab\w*|trust score|safe|verified|legit|genuine baseline|live threat|zero-knowledge|military-grade)\b/i;
  const bands = resultsByBand();

  it("not in any Kit string, any reply, or any report text built from any result, in English", () => {
    for (const text of KIT_STRINGS) expect(text, text).not.toMatch(BANNED);
    for (const result of [...bands.low, ...bands.medium, ...bands.high]) {
      const checks = result.findings.filter((f) => f.severity !== "info").map((f) => f.check);
      const text = buildReportText({ bandLabel: result.risk.label, band: result.risk.band, checks, channel: "Other", note: "" }, t);
      expect(text).not.toMatch(BANNED);
    }
  });

  it("not in the rendered Kit, in English or Arabic", () => {
    for (const lang of ["en", "ar"] as const) {
      nav.lang = lang;
      expect(textOf(kitSection(card(bands.high[0]))), lang).not.toMatch(BANNED);
      expect(textOf(kitSection(card(bands.low[0]))), lang).not.toMatch(BANNED);
    }
    nav.lang = "en";
  });
});

describe("Arabic for every Kit string", () => {
  it("has an entry, apart from the two product names", () => {
    for (const text of KIT_STRINGS.filter((s) => !["WhatsApp", "LinkedIn"].includes(s))) {
      expect(AR[text], text).toMatch(/\p{Script=Arabic}/u);
    }
  });

  it("the Arabic report text is built from them and keeps the findings, the channel and the links", () => {
    const result = runManager(OFFER);
    const checks = result.findings.filter((f) => f.severity !== "info").map((f) => f.check);
    const ar = (en: string, ...args: (string | number)[]) => tr("ar", en, ...args);
    const text = buildReportText({ bandLabel: ar("High risk indicators"), band: "high", checks, channel: "Offer letter or PDF", note: "" }, ar);
    expect(text).toContain(AR["Result"]);
    expect(text).toContain(AR["Offer letter or PDF"]);
    for (const channel of mainChannels()) expect(text).toContain(channel.url);
    for (const value of PRIVATE_VALUES) expect(text).not.toContain(value);
  });

  it("every new Arabic entry is marked [review] in the dictionary, in one block", () => {
    const dict = read("src/lib/i18nAr.ts");
    expect(dict).toContain("// [review] Phase 6 (2026-11-23)");
    const block = dict.slice(dict.indexOf("// [review] Phase 6 (2026-11-23)"));
    for (const text of ["Action & Report Kit", "Copy report text", "Download this summary", NOT_A_CLEARANCE]) {
      expect(block, text).toContain(JSON.stringify(text));
    }
  });
});

describe("the Vault is gone", () => {
  it("/vault answers a permanent redirect to /check, and the page and its components are deleted", () => {
    expect(REDIRECTS).toContainEqual({ source: "/vault", destination: "/check", permanent: true });
    for (const file of [
      "src/app/vault/page.tsx",
      "src/components/EncryptedVault.tsx",
      "src/components/SaveVaultModal.tsx",
      "src/components/VaultTools.tsx",
      "src/components/vaultStore.ts",
    ]) {
      expect(() => statSync(join(process.cwd(), file)), file).toThrow();
    }
    expect(readdirSync(join(process.cwd(), "src/app"))).not.toContain("vault");
  });

  it("no header tab and no footer link goes to /vault, in either header", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual(["/check", "/portals", "/legal", "/about"]);
    for (const lang of ["en", "ar"] as const) {
      nav.lang = lang;
      const markup = html(createElement(Navbar));
      expect(markup, lang).not.toMatch(/\/vault|data-icon="vault"|nav-count/);
      expect(markup.match(/<a [^>]*class="tab"/g)?.length, lang).toBe(8);
    }
    nav.lang = "en";
  });

  // A word-level scan of every page and panel, both languages. Settings and the header are included.
  const PAGES: [string, () => ReactElement][] = [
    ["/check", () => createElement(CheckPage)],
    ["/portals", () => createElement(PortalsPage)],
    ["/legal", () => createElement(LegalPage)],
    ["/about", () => createElement(AboutPage)],
    ["/privacy", () => createElement(PrivacyPage)],
    ["/terms", () => createElement(TermsPage)],
    ["footer", () => createElement(SiteFooter)],
    ["header", () => createElement(Navbar)],
    ["settings", () => createElement(SettingsDialog, { onClose: () => {} })],
  ];
  const VAULT_EN = /vault|encrypted|passphrase|AES-256|saved results?\b/i;
  const VAULT_AR = /الخزنة|خزنتك|الخزنة المشفّرة|عبارة المرور|حفظ مشفّر|النتائج المحفوظة/;

  it.each(PAGES)("%s shows no Vault wording in English or Arabic", (_name, make) => {
    nav.lang = "en";
    expect(textOf(html(make())), "en").not.toMatch(VAULT_EN);
    nav.lang = "ar";
    expect(textOf(html(make())), "ar").not.toMatch(VAULT_AR);
    expect(textOf(html(make())), "ar").not.toMatch(VAULT_EN);
    nav.lang = "en";
  });

  it("a result card, with its Kit, shows none either", () => {
    for (const lang of ["en", "ar"] as const) {
      nav.lang = lang;
      const markup = textOf(card(runManager(OFFER)));
      expect(markup, lang).not.toMatch(lang === "en" ? VAULT_EN : VAULT_AR);
    }
    nav.lang = "en";
  });

  it("the Arabic dictionary has no Vault entry: not a key, not a value", () => {
    for (const [en, ar] of Object.entries(AR)) {
      expect(en, en).not.toMatch(/vault|passphrase|encrypt/i);
      expect(ar, en).not.toMatch(VAULT_AR);
    }
  });

  it("no interface source names the Vault, apart from the storage keys Clear my data still removes and the two locked-test files", () => {
    const allowed = new Set([
      "src/components/shell/clearData.ts",
      // Kept only because src/lib/vaultCrypto.test.ts (locked) imports them; no page imports either.
      "src/lib/vault.ts",
      "src/lib/vaultCrypto.ts",
    ]);
    const files = (dir: string): string[] =>
      readdirSync(join(process.cwd(), dir)).flatMap((name) => {
        const path = `${dir}/${name}`;
        if (statSync(join(process.cwd(), path)).isDirectory()) return files(path);
        return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
      });
    expect(files("src").filter((path) => !allowed.has(path) && /vault/i.test(read(path)))).toEqual([]);
    // And nothing imports the two kept modules.
    for (const path of files("src").filter((p) => !allowed.has(p))) {
      expect(read(path), path).not.toMatch(/from "@\/lib\/vault(?:Crypto)?"|from "\.\/vault(?:Crypto)?"/);
    }
  });
});
