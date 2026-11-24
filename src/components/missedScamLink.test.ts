import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Production Phase 5, Part A (owner decision, 2026-11-23): the "Offer Check missed a scam?" link to the
// owner's Google Form. A plain link, shown only while SITE_MISSED_SCAM_FORM_URL is not empty, under a
// result on /check and on /about and /privacy, with a note that Google receives what is typed there.

const env = vi.hoisted(() => ({ lang: "en" as "en" | "ar", url: "" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/about" }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  const scripted = (_subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    return value === "en" || value === "ar" ? env.lang : value;
  };
  return { ...real, useSyncExternalStore: scripted };
});
// The address the pages read: the real one unless a test sets another (env.url, "" turns the link off).
vi.mock("@/lib/siteConfig", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/siteConfig")>();
  env.url = real.SITE_MISSED_SCAM_FORM_URL;
  return {
    ...real,
    get SITE_MISSED_SCAM_FORM_URL() {
      return env.url;
    },
  };
});

import AboutPage from "@/app/about/page";
import PrivacyPage from "@/app/privacy/page";
import { MISSED_SCAM_LINK_TEXT, MISSED_SCAM_NOTE, MissedScamLink } from "@/components/MissedScamLink";
import { AR } from "@/lib/i18nAr";

const URL_OWNER = "https://docs.google.com/forms/d/e/1FAIpQLSeLc3RSg_6y59__ommv0U1nckl_8bO2MQPgE8br_odCH3Dg0A/viewform";
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replaceAll("\r\n", "\n");
const decode = (html: string) => html.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&");

function render(node: Parameters<typeof createElement>[0], lang: "en" | "ar" = "en", props: object = {}): string {
  env.lang = lang;
  try {
    return decode(renderToStaticMarkup(createElement(node, props)));
  } finally {
    env.lang = "en";
  }
}
function withUrl<T>(url: string, run: () => T): T {
  const before = env.url;
  env.url = url;
  try {
    return run();
  } finally {
    env.url = before;
  }
}

function sources(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(join(process.cwd(), path)).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("the missed-scam link: one address, one place", () => {
  it("the value is the owner's form, and only src/lib/siteConfig.ts holds it", async () => {
    const real = await vi.importActual<typeof import("@/lib/siteConfig")>("@/lib/siteConfig");
    expect(real.SITE_MISSED_SCAM_FORM_URL).toBe(URL_OWNER);
    const holders = sources("src").filter((file) => /docs\.google\.com\/forms|1FAIpQLSe/.test(read(file)));
    expect(holders).toEqual(["src/lib/siteConfig.ts"]);
  });

  it("the line and the note are the owner's words and the form is described plainly", () => {
    expect(MISSED_SCAM_LINK_TEXT).toBe("Offer Check missed a scam? Tell us what it did, without pasting the offer.");
    expect(MISSED_SCAM_NOTE).toContain("Google Form");
    expect(MISSED_SCAM_NOTE).toContain("new tab");
    expect(MISSED_SCAM_NOTE).toContain("Google receives what you type there");
    expect(MISSED_SCAM_NOTE).toContain("does not send any offer text");
  });
});

describe("the missed-scam link: shown only when the address is not empty", () => {
  it("renders a link that opens in a new tab with rel noopener noreferrer, and the note beside it", () => {
    const html = render(MissedScamLink, "en", { url: URL_OWNER });
    expect(html).toContain(`<a href="${URL_OWNER}" target="_blank" rel="noopener noreferrer">`);
    expect(html).toContain(MISSED_SCAM_LINK_TEXT);
    expect(html).toContain(MISSED_SCAM_NOTE);
    // A plain link: no query string, no form, no script, nothing about the visitor or an offer.
    expect(html).not.toMatch(/<form|<script|onclick/i);
    expect(html).not.toContain(`${URL_OWNER}?`);
  });

  it.each([
    ["an empty string", ""],
    ["spaces only", "   "],
  ])("renders nothing for %s", (_name, url) => {
    expect(render(MissedScamLink, "en", { url })).toBe("");
  });

  it("uses the configured address when none is passed, and nothing when it is turned off", () => {
    expect(render(MissedScamLink)).toContain(`href="${URL_OWNER}"`);
    expect(withUrl("", () => render(MissedScamLink))).toBe("");
  });

  it("says the same in Arabic, with the same link", () => {
    const html = render(MissedScamLink, "ar", { url: URL_OWNER });
    expect(html).toContain(AR[MISSED_SCAM_LINK_TEXT]);
    expect(html).toContain(AR[MISSED_SCAM_NOTE]);
    expect(html).toContain(`href="${URL_OWNER}"`);
  });
});

describe("the missed-scam link: where it appears", () => {
  it.each(["en", "ar"] as const)("/about and /privacy show it (%s) while the address is set", (lang) => {
    for (const page of [AboutPage, PrivacyPage]) {
      const html = render(page, lang);
      expect(html).toContain(`<a href="${URL_OWNER}" target="_blank" rel="noopener noreferrer">`);
      expect(html).toContain(lang === "ar" ? AR[MISSED_SCAM_LINK_TEXT] : MISSED_SCAM_LINK_TEXT);
    }
  });

  it("/about and /privacy show no link and no form section when the address is empty", () => {
    for (const page of [AboutPage, PrivacyPage]) {
      const html = withUrl("", () => render(page));
      expect(html).not.toContain("docs.google.com");
      expect(html).not.toContain(MISSED_SCAM_LINK_TEXT);
      expect(html).not.toContain("If Offer Check missed a scam");
    }
  });

  it("/privacy says that Google receives what is typed in the form, and that no offer text goes to it", () => {
    const html = render(PrivacyPage);
    expect(html).toContain("If Offer Check missed a scam");
    expect(html).toContain("Google receives what you type there, under Google's terms");
    expect(html).toContain("does not send the form any offer text, result or other data from the app");
  });

  // Phase 6 (2026-11-23): changed on purpose. The link moved into the Action & Report Kit, which the
  // result card renders under every result; it is no longer a separate line after the card.
  it("the result on /check shows the link inside the Action & Report Kit, and only when there is a result", () => {
    const kit = read("src/components/ActionKit.tsx");
    expect(kit).toContain("<MissedScamLink />");
    expect(read("src/components/ResultCard.tsx")).toContain("<ActionKit");
    expect(read("src/components/OfferChecker.tsx")).not.toContain("<MissedScamLink />");
    expect(read("src/components/OfferChecker.tsx")).toMatch(/\{result && checked && \(\s*<ResultCard/);
  });
});

describe("the missed-scam link: nothing else changes", () => {
  it("the content security policy file does not name the form (a link is a navigation, not a request)", () => {
    expect(read("src/lib/csp.ts")).not.toContain("docs.google.com");
  });
});

describe("/privacy: the daily totals sentence (Part B)", () => {
  const SENTENCE = "We keep daily totals of how many checks, rejected inputs, errors and limit hits happened, with no text and nothing that identifies you.";
  it("is on the page in English and in Arabic", () => {
    expect(render(PrivacyPage)).toContain(SENTENCE);
    expect(AR[SENTENCE]).toBeTruthy();
    expect(render(PrivacyPage, "ar")).toContain(AR[SENTENCE]);
  });
});
