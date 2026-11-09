import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { draftReply } from "@/lib/agents/drafter";
import { SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { ApprovalPanel } from "./ApprovalPanel";
import type { AnalyzeResponse } from "@/lib/audit";
import { checkBlockedReason, OfferChecker, recordCheck } from "./OfferChecker";
import { ResultsPanel } from "./ResultsPanel";
import { ScoreGauge } from "./ScoreGauge";

// The text the stubbed useState("") hands back, so a test can call the form's submit handler as if
// the user had typed it. Every other hook keeps its real initial value and ignores updates.
// The checked result is a state of its own, made with the `noCheck` initializer: the stub hands back
// typed.checked for it and records every value set, so a test can see what a check stored.
const typed = vi.hoisted(() => ({ text: "", stubbed: false, checked: null as unknown, checkedSets: [] as unknown[] }));

vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  return {
    ...real,
    useState: <T,>(initial: T) => {
      if (!typed.stubbed) return real.useState(initial);
      if (typeof initial === "function" && initial.name === "noCheck") {
        return [typed.checked, (value: unknown) => typed.checkedSets.push(value)];
      }
      return [initial === "" ? typed.text : initial, () => {}];
    },
    useReducer: (reducer: unknown, initial: unknown) =>
      typed.stubbed ? [initial, () => {}] : (real.useReducer as (r: unknown, i: unknown) => unknown)(reducer, initial),
    useRef: <T,>(initial: T) => (typed.stubbed ? { current: initial } : real.useRef(initial)),
  };
});

type FormProps = { children?: ReactNode; onSubmit?: (event: { preventDefault: () => void }) => unknown };

function findForm(node: ReactNode): ReactElement<FormProps> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findForm(child);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== "object" || !("props" in node)) return null;
  const element = node as ReactElement<FormProps>;
  if (element.type === "form") return element;
  return findForm(element.props.children);
}

async function submitWith(text: string) {
  typed.text = text;
  typed.stubbed = true;
  const fetchMock = vi.fn(() => new Promise<never>(() => {}));
  vi.stubGlobal("fetch", fetchMock);
  try {
    const tree = OfferChecker({ ruleCount: 5 });
    const form = findForm(tree);
    expect(form).not.toBeNull();
    const preventDefault = vi.fn();
    void form?.props.onSubmit?.({ preventDefault });
    await Promise.resolve();
    expect(preventDefault).toHaveBeenCalled();
    return fetchMock;
  } finally {
    typed.stubbed = false;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  typed.checked = null;
  typed.checkedSets = [];
});

// LANG-1: the language notice belongs to the checked result, never to the live text box.
describe("language notice (LANG-1)", () => {
  const ARABIC = "رسوم التأشيرة 750 درهم يجب دفعها اليوم";
  const ENGLISH = "Pay the visa fee of AED 500 today.";
  const MOST = "Most of this text is not in English.";
  const PART = "Part of this text is not in English.";
  const respond = (text: string): AnalyzeResponse => ({ ...runManager(text), runId: "run-1", audit: [] });
  const scoreSide = (html: string) => html.slice(html.indexOf("score-card"), html.indexOf("results-main"));

  function renderWith(liveText: string, checked: unknown) {
    typed.text = liveText;
    typed.checked = checked;
    typed.stubbed = true;
    try {
      return renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5 }));
    } finally {
      typed.stubbed = false;
    }
  }

  it("sets the flag from the text that was checked", () => {
    expect(recordCheck(respond(ARABIC), ARABIC).languageNotice).toBe("most");
    expect(recordCheck(respond(ENGLISH), ENGLISH).languageNotice).toBeNull();
  });

  it("does not change when the text is edited after a check", () => {
    const arabicCheck = recordCheck(respond(ARABIC), ARABIC);
    const englishCheck = recordCheck(respond(ENGLISH), ENGLISH);
    expect(renderWith(ARABIC, arabicCheck)).toContain(MOST);
    expect(renderWith(ENGLISH, arabicCheck)).toContain(MOST);
    expect(renderWith("", arabicCheck)).toContain(MOST);
    expect(renderWith(ENGLISH, englishCheck)).not.toContain("not in English");
    expect(renderWith(ARABIC, englishCheck)).not.toContain("not in English");
  });

  // LANG-2: the chip and the announcement follow the checked result's tier, not the live text box.
  it("shows and announces the neutral chip from the checked result", () => {
    const arabicCheck = recordCheck(respond(ARABIC), ARABIC);
    const neutral = "Not checked: most of the text is not in English";
    const html = renderWith(ENGLISH, arabicCheck);
    expect(html).toContain(`<p class="chip score-label">${neutral}</p>`);
    expect(html).toContain(`Results ready. ${neutral}.`);
    expect(renderWith(ARABIC, recordCheck(respond(ENGLISH), ENGLISH))).not.toContain(neutral);
  });

  // LANG-3: the whole rendered page, draft and audit included, never says all clear in tier 2.
  it("tier 2 with no finding: no all-clear wording anywhere on the page, qualified announcement", () => {
    const tier2 = "Thank you for applying. We will be in touch.\nيرجى دفع 750 درهم لتأكيد الوظيفة";
    const check = recordCheck(respond(tier2), tier2);
    expect(check.languageNotice).toBe("part");
    expect(check.response.findings).toEqual([]);
    const html = renderWith(tier2, check);
    expect(html).not.toContain("No risk indicators found");
    expect(html).toContain("Results ready. Score 0 of 100 on the English part. Part of the text was not checked.");
  });

  // Batch B Stage 1: the coverage state is recorded with the result, from the submitted text.
  it("records the coverage state of the submitted text", () => {
    expect(recordCheck(respond(ARABIC), ARABIC).coverage).toBe("unchecked");
    expect(recordCheck(respond(ENGLISH), ENGLISH).coverage).toBe("full");
    const hinglish = "Aapka job confirm ho gaya hai. Visa ke liye abhi 2000 dirham bhejo, warna offer cancel ho jayega.";
    const check = recordCheck(respond(hinglish), hinglish);
    expect(check.coverage).toBe("unchecked");
    expect(check.languageNotice).toBe("most");
    const html = renderWith(hinglish, check);
    expect(html).toContain('<span class="score-value score-not-checked">Not checked</span>');
    expect(html).not.toContain("No risk indicators found");
  });

  // Batch B Stage 1, decision 4: non-English or mixed live text keeps the button, renamed, with a note.
  it("names the button 'Check original anyway (not checked)' for non-English or mixed live text", () => {
    const button = (html: string) => html.match(/<button[^>]*type="submit"[^>]*>(.*?)<\/button>/)?.[0] ?? "";
    for (const text of [ARABIC, "Aapka job confirm ho gaya hai. Visa ke liye abhi 2000 dirham bhejo, warna offer cancel ho jayega."]) {
      const html = renderWith(text, null);
      expect(button(html)).toContain("Check original anyway (not checked)");
      expect(button(html)).toContain('aria-describedby="language-gate"');
      expect(html).toContain('id="language-gate"');
    }
    for (const text of [ENGLISH, ""]) {
      const html = renderWith(text, null);
      expect(button(html)).toContain(">Check offer<");
      expect(html).not.toContain("language-gate");
    }
  });

  it("clears the result when a new check starts, then stores the flag for the submitted text", async () => {
    typed.checked = recordCheck(respond(ARABIC), ARABIC);
    typed.checkedSets = [];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(respond(ENGLISH)), { status: 200 })));
    typed.text = ENGLISH;
    typed.stubbed = true;
    let form: ReturnType<typeof findForm>;
    try {
      form = findForm(OfferChecker({ ruleCount: 5 }));
    } finally {
      typed.stubbed = false;
    }
    void form?.props.onSubmit?.({ preventDefault: () => {} });
    await vi.waitFor(() => expect(typed.checkedSets).toHaveLength(2));
    expect(typed.checkedSets[0]).toBeNull();
    expect(typed.checkedSets.at(-1)).toMatchObject({ languageNotice: null, response: { runId: "run-1" } });
  });

  it.each([
    ["most", MOST],
    ["part", PART],
  ] as const)("shows the %s notice in the score card in every band, with no offer text", (tier, wording) => {
    for (const text of ["Hello", "Reply within 2 hours.", "Send your passport copy. Reply within 2 hours.", SCAM_OFFER]) {
      const result = runManager(text);
      const html = renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5, languageNotice: tier }));
      const side = scoreSide(html);
      expect(side).toContain(wording);
      expect(side).not.toContain(text);
      const again = runManager(text);
      expect({ risk: result.risk, findings: result.findings }).toEqual({ risk: again.risk, findings: again.findings });
    }
  });

  it("shows no notice without a flag", () => {
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result: runManager(ENGLISH), ruleCount: 5 }));
    expect(html).not.toContain("not in English");
  });
});

// Batch A case 4: the offer notice is set once, at check time, and never changes the score.
describe("offer notice (Batch A case 4)", () => {
  const NOT_AN_OFFER = "Hi, how are you? Call me back.";
  const OFFER = "Salary AED 4,000 per month for the driver role.";
  const NOTICE = "This text has no clear signs of a job offer";
  const respond = (text: string): AnalyzeResponse => ({ ...runManager(text), runId: "run-1", audit: [] });
  const panel = (text: string, checkedText = text, language: "most" | "part" | null = null) => {
    const checked = recordCheck(respond(text), checkedText);
    return renderToStaticMarkup(
      createElement(ResultsPanel, {
        result: checked.response,
        ruleCount: 5,
        languageNotice: language,
        offerSignals: checked.offerSignals,
      }),
    );
  };

  it("records the signal groups of the text that was checked", () => {
    expect(recordCheck(respond(NOT_AN_OFFER), NOT_AN_OFFER).offerSignals).toEqual([]);
    expect(recordCheck(respond(OFFER), OFFER).offerSignals).toEqual(["role", "pay"]);
  });

  it("shows the notice for a low score with no signal, and not otherwise", () => {
    expect(panel(NOT_AN_OFFER)).toContain(NOTICE);
    expect(panel(OFFER)).not.toContain(NOTICE);
    expect(panel("Pay AED 750 now.")).not.toContain(NOTICE);
    expect(panel(NOT_AN_OFFER, NOT_AN_OFFER, "most")).not.toContain(NOTICE);
    expect(panel(NOT_AN_OFFER, NOT_AN_OFFER, "part")).toContain(NOTICE);
  });

  it("shows no notice without a recorded value", () => {
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result: runManager(NOT_AN_OFFER), ruleCount: 5 }));
    expect(html).not.toContain(NOTICE);
  });

  it("puts no offer text in the notice and leaves the score alone", () => {
    const html = panel(NOT_AN_OFFER);
    const notice = html.match(/class="[^"]*offer-notice[^"]*"[^>]*>(.*?)<\/div>/)?.[1] ?? "";
    expect(notice).toContain(NOTICE);
    expect(notice).not.toContain("Call me back");
    expect(recordCheck(respond(NOT_AN_OFFER), NOT_AN_OFFER).response.risk).toEqual(runManager(NOT_AN_OFFER).risk);
  });

  // OFFER-1: the whole rendered page, draft and audit included, never says all clear with the notice.
  it("OFFER-1: no all-clear wording anywhere on the page, qualified chip and announcement", () => {
    const check = recordCheck(respond(NOT_AN_OFFER), NOT_AN_OFFER);
    typed.text = NOT_AN_OFFER;
    typed.checked = check;
    typed.stubbed = true;
    let html = "";
    try {
      html = renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5 }));
    } finally {
      typed.stubbed = false;
    }
    expect(html).not.toContain("No risk indicators found");
    expect(html).toContain('<p class="chip score-label">Score 0. This text does not look like a job offer.</p>');
    expect(html).toContain("Results ready. Score 0 of 100. This text does not look like a job offer.");
  });
});

describe("Check offer button (S4-1)", () => {
  it("stays focusable while the box is empty: aria-disabled with a reason, never native disabled", () => {
    const html = renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5, samples: [{ label: "S", text: "x" }] }));
    const button = html.match(/<button type="submit"[^>]*>/)?.[0] ?? "";
    expect(button).toContain('aria-disabled="true"');
    expect(button).toContain('aria-describedby="check-reason"');
    expect(button).not.toMatch(/\sdisabled=|tabindex="-1"/i);
    expect(html).toContain("Paste an offer or choose a sample, then check it.");
    expect(html).toMatch(/<p id="check-reason" class="helper">/);
  });

  it("gives a reason for empty or blank text only", () => {
    expect(checkBlockedReason("", true)).toBe("Paste an offer or choose a sample, then check it.");
    expect(checkBlockedReason("  \n ", false)).toBe("Paste an offer, then check it.");
    expect(checkBlockedReason("Pay the fee", true)).toBe("");
  });

  it.each([[""], ["   "]])("sends nothing when submitted with %j", async (text) => {
    expect(await submitWith(text)).not.toHaveBeenCalled();
  });

  it("sends the request once the box has text", async () => {
    const fetchMock = await submitWith("Pay the visa fee of AED 500");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the live character count against the limit", () => {
    const html = renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5 }));
    expect(html).toContain('<span id="offer-count" class="counter">0 / 20,000</span>');
    expect(html).toMatch(/<textarea id="offer"[^>]*aria-describedby="offer-count"/);
  });
});

describe("Step 5 results layout", () => {
  it("puts the score on the side and findings, agent run, then the caller's panels in the main column", () => {
    const result = runManager(SCAM_OFFER);
    const html = renderToStaticMarkup(
      createElement(ResultsPanel, { result, ruleCount: 5 }, createElement("p", { id: "child" }, "child")),
    );
    const side = html.indexOf('class="results-side"');
    const main = html.indexOf('class="results-main"');
    expect(side).toBeGreaterThan(-1);
    expect(html.indexOf("results-heading")).toBeLessThan(main);
    const order = ["findings-heading", "agent-run-heading", 'id="child"'].map((s) => html.indexOf(s));
    expect(order.every((index) => index > main)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("draws stub agents with a 'Not implemented yet' label and no check icon", () => {
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result: runManager("Hello"), ruleCount: 5 }));
    const rows = html.match(/<li class="trace-[^"]+">.*?<\/li>/g) ?? [];
    const stubs = rows.filter((row) => row.includes("trace-not_implemented"));
    expect(stubs).toHaveLength(2);
    for (const row of stubs) {
      expect(row).toContain('<span class="trace-summary">Not implemented yet</span>');
      expect(row).not.toContain("<svg");
    }
  });

  it("animates the arc to the server's score, from a CSS variable", () => {
    const html = renderToStaticMarkup(
      createElement(ScoreGauge, { risk: { score: 60, band: "high", label: "High risk indicators" } }),
    );
    expect(html).toContain('class="gauge-value"');
    expect(html).toContain("--score:60");
  });
});

describe("draft placeholders", () => {
  it("shows each unfilled placeholder as a highlighted chip", () => {
    const html = renderToStaticMarkup(
      createElement(ApprovalPanel, { gate: { status: "pending", draft: draftReply(), editing: false }, dispatch: () => {} }),
    );
    expect(html).toContain('<mark class="placeholder">[Recipient name]</mark>');
    expect(html).toContain('<mark class="placeholder">[Your name]</mark>');
  });

  it("puts the blocked reason under the action buttons, with the button still described by it", () => {
    const html = renderToStaticMarkup(
      createElement(ApprovalPanel, { gate: { status: "pending", draft: draftReply(), editing: false }, dispatch: () => {} }),
    );
    expect(html.indexOf('class="approval-actions"')).toBeLessThan(html.indexOf('id="approve-reason"'));
  });
});
