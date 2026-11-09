import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as about from "@/app/about/page";
import { resultAnnouncement } from "@/components/OfferChecker";
import { ResultsPanel } from "@/components/ResultsPanel";
import { noticeFor, reportLinkShown, scoreChip } from "@/components/scoreChip";
import { EVAL_OFFERS } from "./agents/eval/offers";
import { LEGIT_OFFER, SCAM_OFFER } from "./agents/fixtures";
import { runManager } from "./agents/manager";
import { RULES } from "./agents/redFlag";
import {
  AUTHORITIES,
  mainChannels,
  REPORT_FRAUD_ID,
  REPORT_FRAUD_NOTE,
  REPORT_LINK_SENTENCE,
  shownAuthorities,
  type Authority,
} from "./authorities";
import type { Coverage } from "./coverage";
import type { AnalysisResult } from "./types";

const decode = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

// Five or more digits in a row, allowing a space or dash between them: the shape of a phone number.
const PHONE_LIKE = /\d(?:[\s-]?\d){4,}/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("official reporting channels (src/lib/authorities.ts)", () => {
  it("holds exactly the six owner-approved entries", () => {
    expect(AUTHORITIES.map((entry) => entry.id)).toEqual([
      "moi_ecrimes",
      "dubai_police_ecrime",
      "abu_dhabi_aman",
      "fpp_my_safe_society",
      "police_station",
      "mohre_verify",
    ]);
  });

  it("every entry has a source link, a last-verified date and a reviewer", () => {
    for (const entry of AUTHORITIES) {
      expect(entry.sourceUrl, entry.id).toMatch(/^https:\/\/(u\.ae|www\.mohre\.gov\.ae)\//);
      expect(entry.sourceName.length, entry.id).toBeGreaterThan(0);
      expect(entry.lastVerified, entry.id).toMatch(ISO_DATE);
      expect(entry.lastVerified).toBe("2026-11-09");
      expect(entry.reviewer).toBe("owner, approved 2026-11-09");
    }
  });

  it("no entry has a phone number or an email address", () => {
    for (const entry of AUTHORITIES) {
      const text = [entry.id, entry.name, entry.purpose, entry.sourceName, entry.sourceUrl, entry.alsoSee?.name ?? "", entry.alsoSee?.url ?? ""].join(" ");
      expect(text, entry.id).not.toMatch(PHONE_LIKE);
      expect(text, entry.id).not.toContain("@");
      expect(text, entry.id).not.toMatch(/tel:|mailto:/);
    }
  });

  it("the renderer drops an entry with no source link or no last-verified date", () => {
    const base = AUTHORITIES[0];
    const broken: Authority[] = [
      { ...base, id: "no_url", sourceUrl: "" },
      { ...base, id: "no_date", lastVerified: "" },
      { ...base, id: "bad_date", lastVerified: "recently" },
      { ...base, id: "missing_url", sourceUrl: undefined as unknown as string },
    ];
    expect(shownAuthorities([...broken, base]).map((entry) => entry.id)).toEqual([base.id]);
    expect(shownAuthorities()).toHaveLength(AUTHORITIES.length);
  });
});

describe("/about#report-fraud", () => {
  const html = renderToStaticMarkup(createElement(about.default));
  const start = html.indexOf(`id="${REPORT_FRAUD_ID}"`);
  const section = html.slice(start, html.indexOf("</section>", start));

  it("has the section with its heading and the plain sentence", () => {
    expect(start).toBeGreaterThan(-1);
    expect(section).toContain(">If you think it is a scam</h2>");
    expect(decode(section)).toContain(REPORT_FRAUD_NOTE);
    expect(REPORT_FRAUD_NOTE).toBe(
      "Offer Check does not report anything for you and does not give legal advice. These are official UAE channels; use the official page for current details.",
    );
  });

  // Owner decision, 2026-11-09: a small box with the four main channels as links. The dates, the
  // reviewer and the source text stay in authorities.ts and are not shown.
  it("links the four main channels, and shows no dates, reviewer or source text", () => {
    const text = decode(section);
    expect(mainChannels().map((channel) => channel.id)).toEqual(["moi_ecrimes", "dubai_police_ecrime", "abu_dhabi_aman", "mohre_verify"]);
    for (const channel of mainChannels()) {
      expect(section).toContain(`<a class="source-link" href="${channel.url}" rel="noreferrer">${channel.name}</a>`);
    }
    expect(mainChannels().find((channel) => channel.id === "mohre_verify")?.url).toBe("https://www.mohre.gov.ae");
    expect(section.match(/<a /g)).toHaveLength(4);
    expect(text).not.toMatch(/Last verified|approved|2026-11-09/);
    for (const entry of AUTHORITIES) expect(text).not.toContain(entry.sourceName);
  });

  it("mainChannels drops a channel whose entry has no source link or date", () => {
    const list = AUTHORITIES.map((entry) => (entry.id === "dubai_police_ecrime" ? { ...entry, lastVerified: "" } : entry));
    expect(mainChannels(list).map((channel) => channel.id)).toEqual(["moi_ecrimes", "abu_dhabi_aman", "mohre_verify"]);
  });

  it("shows no phone number, email address, tel: or mailto: link", () => {
    expect(section).not.toMatch(/tel:|mailto:|@/);
    expect(decode(section).replaceAll("2026-11-09", "")).not.toMatch(PHONE_LIKE);
  });
});

describe("Check results: link to the official reporting channels", () => {
  const ruleCount = RULES.length;
  const render = (result: AnalysisResult, coverage: Coverage | null = null) =>
    renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount, coverage }));
  const LINK = `<p class="report-link"><a href="/about#${REPORT_FRAUD_ID}">${REPORT_LINK_SENTENCE}</a></p>`;

  const results = EVAL_OFFERS.map((offer) => runManager(offer.text));
  const medium = results.find((result) => result.risk.band === "medium");
  const high = runManager(SCAM_OFFER);
  const low = runManager(LEGIT_OFFER);

  it("the fixtures cover each band", () => {
    expect(medium?.risk.band).toBe("medium");
    expect(high.risk.band).toBe("high");
    expect(low.risk.band).toBe("low");
  });

  it("is shown once for a medium and a high result", () => {
    for (const result of [medium!, high]) {
      const html = render(result);
      expect(html.split(LINK)).toHaveLength(2);
    }
  });

  it("is shown for every medium or high dev-eval result, and never for a low one", () => {
    for (const result of results) {
      const shown = render(result).includes(REPORT_LINK_SENTENCE);
      expect(shown).toBe(result.risk.band !== "low");
    }
  });

  it("is absent for low, for a translation with no match, and for unchecked text (no score shown)", () => {
    expect(render(low)).not.toContain(REPORT_LINK_SENTENCE);
    expect(render(low, "translated")).not.toContain(REPORT_LINK_SENTENCE);
    expect(render(low, "unchecked")).not.toContain(REPORT_LINK_SENTENCE);
    // Unchecked text shows "Not checked" in place of the number, so no link even with a band above low.
    expect(render(high, "unchecked")).not.toContain(REPORT_LINK_SENTENCE);
    expect(render(medium!, "unchecked")).not.toContain(REPORT_LINK_SENTENCE);
    expect(reportLinkShown("low", null)).toBe(false);
    expect(reportLinkShown("high", "most")).toBe(false);
    expect(reportLinkShown("medium", "part")).toBe(true);
  });

  it("never changes the score, the chip or the announcement, and holds no offer text", () => {
    for (const result of [medium!, high, low]) {
      const before = structuredClone(result);
      const html = render(result);
      expect(result).toEqual(before);
      const notice = noticeFor("full", null, result.risk.band);
      const chip = scoreChip(result.risk, result.findings, notice).label;
      expect(html).toContain(chip);
      expect(resultAnnouncement(result, notice)).toBe(`Results ready. Score ${result.risk.score} of 100: ${chip}.`);
      expect(resultAnnouncement(result, notice)).not.toContain(REPORT_LINK_SENTENCE);
      expect(chip).not.toContain(REPORT_LINK_SENTENCE);
    }
    expect(REPORT_LINK_SENTENCE).toBe("If you think this is a scam, see the official places to report it.");
    expect(LINK).not.toContain(SCAM_OFFER.slice(0, 20));
  });

  it("says nothing all clear", () => {
    expect(REPORT_LINK_SENTENCE).not.toMatch(/No risk indicators found|all clear|genuine|safe/i);
  });
});
