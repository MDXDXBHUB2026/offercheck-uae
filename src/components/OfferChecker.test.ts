import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { draftReply } from "@/lib/agents/drafter";
import { SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { ENGLISH_EDGE_CASES, LATIN_NON_ENGLISH } from "@/lib/languageSamples";
import { ApprovalPanel } from "./ApprovalPanel";
import type { AnalyzeResponse } from "@/lib/audit";
import { checkBlockedReason, OfferChecker, recordCheck } from "./OfferChecker";
import { ResultsPanel } from "./ResultsPanel";
import { ScoreGauge } from "./ScoreGauge";

// The text the stubbed useState("") hands back, so a test can call the form's submit handler as if
// the user had typed it. Every other hook keeps its real initial value and ignores updates.
// The checked result is a state of its own, made with the `noCheck` initializer: the stub hands back
// typed.checked for it and records every value set, so a test can see what a check stored.
// BATCHB-2: the translation flow is a state of its own too, made with the `idleFlow` initializer.
const typed = vi.hoisted(() => ({
  text: "",
  stubbed: false,
  checked: null as unknown,
  checkedSets: [] as unknown[],
  flow: { step: "idle" } as unknown,
  flowSets: [] as unknown[],
  // STALE-1: the check failure (noFailure) and the cleared notice (notCleared), and gate actions.
  failure: null as unknown,
  failureSets: [] as unknown[],
  cleared: false as unknown,
  clearedSets: [] as unknown[],
  gateActions: [] as unknown[],
}));

vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  return {
    ...real,
    useState: <T,>(initial: T) => {
      if (!typed.stubbed) return real.useState(initial);
      if (typeof initial === "function" && initial.name === "noCheck") {
        return [typed.checked, (value: unknown) => typed.checkedSets.push(value)];
      }
      if (typeof initial === "function" && initial.name === "idleFlow") {
        return [typed.flow, (value: unknown) => typed.flowSets.push(value)];
      }
      if (typeof initial === "function" && initial.name === "noFailure") {
        return [typed.failure, (value: unknown) => typed.failureSets.push(value)];
      }
      if (typeof initial === "function" && initial.name === "notCleared") {
        return [typed.cleared, (value: unknown) => typed.clearedSets.push(value)];
      }
      return [initial === "" ? typed.text : initial, () => {}];
    },
    useReducer: (reducer: unknown, initial: unknown) =>
      typed.stubbed
        ? [initial, (action: unknown) => typed.gateActions.push(action)]
        : (real.useReducer as (r: unknown, i: unknown) => unknown)(reducer, initial),
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
  typed.flow = { step: "idle" };
  typed.flowSets = [];
  typed.failure = null;
  typed.failureSets = [];
  typed.cleared = false;
  typed.clearedSets = [];
  typed.gateActions = [];
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

  // STALE-1: the notice still comes from the checked text, never from the live box; but once the box
  // holds other text, the result (and with it the notice) is gone rather than kept.
  it("follows the checked text while the box holds it; after an edit no result or notice is shown", () => {
    const arabicCheck = recordCheck(respond(ARABIC), ARABIC);
    const englishCheck = recordCheck(respond(ENGLISH), ENGLISH);
    expect(renderWith(ARABIC, arabicCheck)).toContain(MOST);
    for (const edited of [ENGLISH, "", `${ARABIC} `]) {
      const html = renderWith(edited, arabicCheck);
      expect(html).not.toContain(MOST);
      expect(html).not.toContain("score-card");
    }
    expect(renderWith(ENGLISH, englishCheck)).toContain("score-card");
    expect(renderWith(ENGLISH, englishCheck)).not.toContain("not in English");
    const edited = renderWith(ARABIC, englishCheck);
    expect(edited).not.toContain("score-card");
    expect(edited).not.toContain("not in English");
  });

  // LANG-2: the chip and the announcement follow the checked result's tier, not the live text box.
  it("shows and announces the neutral chip from the checked result", () => {
    const arabicCheck = recordCheck(respond(ARABIC), ARABIC);
    const neutral = "Not checked: most of the text is not in English";
    // STALE-1: rendered with the checked text in the box (an edit would clear the result).
    const html = renderWith(ARABIC, arabicCheck);
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

// BATCHB-2: the translation buttons, the consent gate and the failure path, on the real component.
describe("send to Google and translate (BATCHB-2, one click)", () => {
  const ARABIC = "رسوم التأشيرة 750 درهم يجب دفعها اليوم";
  const ENGLISH = "Pay the visa fee of AED 500 today.";
  const TRANSLATE = "Send to Google and translate";
  const ORIGINAL = "Check original anyway (not checked)";

  type Props = { children?: ReactNode; onClick?: () => unknown; onConfirm?: () => unknown; type?: string };
  function findAll(node: ReactNode, match: (element: ReactElement<Props>) => boolean): ReactElement<Props>[] {
    if (Array.isArray(node)) return node.flatMap((child) => findAll(child, match));
    if (!node || typeof node !== "object" || !("props" in node)) return [];
    const element = node as ReactElement<Props>;
    return [...(match(element) ? [element] : []), ...findAll(element.props.children, match)];
  }
  const label = (element: ReactElement<Props>) => [element.props.children].flat().filter((c) => typeof c === "string").join("");

  function tree(text: string, flow: unknown) {
    typed.text = text;
    typed.flow = flow;
    typed.stubbed = true;
    try {
      return OfferChecker({ ruleCount: 5 });
    } finally {
      typed.stubbed = false;
    }
  }

  function html(text: string, flow: unknown) {
    typed.text = text;
    typed.flow = flow;
    typed.stubbed = true;
    try {
      return renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5 }));
    } finally {
      typed.stubbed = false;
    }
  }

  const calls = (fetchMock: ReturnType<typeof vi.fn>) =>
    fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse(String((init as RequestInit).body))]);

  it("non-English or mixed text: Send to Google and translate, then Check original anyway; English: Check offer only", () => {
    for (const text of [ARABIC, "Aapka job confirm ho gaya hai. Visa ke liye abhi 2000 dirham bhejo, warna offer cancel ho jayega."]) {
      const page = html(text, { step: "idle" });
      const buttons = [...page.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));
      expect(buttons.indexOf(TRANSLATE)).toBeGreaterThan(-1);
      expect(buttons.indexOf(TRANSLATE)).toBeLessThan(buttons.indexOf(ORIGINAL));
      expect(buttons).not.toContain("Check offer");
    }
    const english = html(ENGLISH, { step: "idle" });
    expect(english).not.toContain(TRANSLATE);
    expect(english).toContain(">Check offer<");
  });

  it("one press sends at once, once, with only the text and the consent flag; no second confirm", () => {
    const fetchMock = vi.fn(() => new Promise<never>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const [button] = findAll(tree(ARABIC, { step: "idle" }), (e) => label(e) === TRANSLATE);
    void button.props.onClick?.();
    expect(calls(fetchMock)).toEqual([["/api/translate", { text: ARABIC, consent: true }]]);
    expect(typed.flowSets).toEqual([{ step: "sending" }]);
    expect(html(ARABIC, { step: "idle" })).not.toMatch(/>Cancel<|Send this text to Google for translation\?/);
  });

  it("a failure shows the alert, never checks the original, and offers the same two buttons", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "provider_timeout" }), { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const [button] = findAll(tree(ARABIC, { step: "idle" }), (e) => label(e) === TRANSLATE);
    await button.props.onClick?.();
    await vi.waitFor(() => expect(typed.flowSets.at(-1)).toEqual({ step: "failed", code: "provider_timeout" }));
    // One request, to the translate route only: never a fall-back check of the original.
    expect(calls(fetchMock)).toEqual([["/api/translate", { text: ARABIC, consent: true }]]);
    expect(typed.checkedSets).toEqual([]);
    // The two choices again, under an alert that says nothing was checked.
    const page = html(ARABIC, { step: "failed", code: "provider_timeout" });
    expect(page).toContain('role="alert"');
    expect(page).toContain("Translation did not work, so nothing was checked.");
    expect(page).toContain(TRANSLATE);
    expect(page).toContain(ORIGINAL);
  });

  it("a failed request (network) never checks the original either", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);
    const [button] = findAll(tree(ARABIC, { step: "idle" }), (e) => label(e) === TRANSLATE);
    await button.props.onClick?.();
    await vi.waitFor(() => expect(typed.flowSets.at(-1)).toEqual({ step: "failed", code: "network" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(typed.checkedSets).toEqual([]);
  });

  it("on success, checks the English translation and records coverage translated", async () => {
    const english = "Visa fees of 750 dirhams must be paid today.";
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url === "/api/translate") return new Response(JSON.stringify({ translatedText: english, detectedSourceLanguage: "ar" }), { status: 200 });
      const { text } = JSON.parse(String(init.body)) as { text: string };
      return new Response(JSON.stringify({ ...runManager(text), runId: "run-t", audit: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const [button] = findAll(tree(ARABIC, { step: "idle" }), (e) => label(e) === TRANSLATE);
    await button.props.onClick?.();
    await vi.waitFor(() => expect(typed.checkedSets).toHaveLength(2));
    expect(calls(fetchMock)).toEqual([
      ["/api/translate", { text: ARABIC, consent: true }],
      ["/api/analyze", { text: english, translation: { result: "ok", sourceLang: "ar" } }],
    ]);
    expect(typed.flowSets).toContainEqual({ step: "idle" });
    expect(typed.checkedSets.at(-1)).toMatchObject({
      coverage: "translated",
      languageNotice: null,
      translation: { original: ARABIC, english, sourceLang: "ar" },
    });
    // The page then shows the original under its label and the English that was checked.
    typed.checked = typed.checkedSets.at(-1);
    const shown = html(ARABIC, { step: "idle" });
    expect(shown).toContain("Original text (Arabic)");
    expect(shown).toContain(english);
    expect(shown).toContain("based on a machine translation");
  });

  it("Check original anyway after a failure checks the original and records the failure code", async () => {
    const fetchMock = vi.fn(() => new Promise<never>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const form = findForm(tree(ARABIC, { step: "failed", code: "provider_busy" }));
    void form?.props.onSubmit?.({ preventDefault: () => {} });
    await Promise.resolve();
    expect(calls(fetchMock)).toEqual([["/api/analyze", { text: ARABIC, translation: { result: "provider_busy" } }]]);
  });

  it("translation_unavailable: no Translate button, the Stage 1 not-checked path unchanged", () => {
    const page = html(ARABIC, { step: "unavailable", alert: true });
    expect(page).not.toContain(TRANSLATE);
    expect(page).toContain(ORIGINAL);
    expect(page).toContain("The rules read English only, so the parts in other languages will not be checked.");
    expect(page).toContain('role="alert"');
    expect(html(ARABIC, { step: "unavailable", alert: false })).not.toContain('role="alert"');
  });
});

// The action area under the box: one control set per state, inside one banner for text that is not
// clearly English, with the samples on their own row after it. Display only: the consent, privacy
// and failure rules above are unchanged.
describe("action area layout", () => {
  const ARABIC = "رسوم التأشيرة 750 درهم يجب دفعها اليوم";
  const ENGLISH = "Pay the visa fee of AED 500 today.";
  const TRANSLATE = "Send to Google and translate";
  const ORIGINAL = "Check original anyway (not checked)";
  const DISCLOSURE =
    "To translate, Offer Check sends the text in the box to Google Cloud Translation, a machine translation service run by Google. Offer Check does not store it; Google&#x27;s terms apply to the text it receives. Remove names, phone numbers and other personal details first.";
  const SAMPLES = [
    { label: "Fee scam", text: "x" },
    { label: "Clean offer", text: "y" },
  ];
  const SAMPLE_LABELS = ["Fee scamSynthetic", "Clean offerSynthetic"];

  function page(text: string, flow: unknown) {
    typed.text = text;
    typed.flow = flow;
    typed.stubbed = true;
    try {
      return renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5, samples: SAMPLES }));
    } finally {
      typed.stubbed = false;
    }
  }
  // Every button on the page, in document (and so tab) order, by its visible text.
  const controls = (html: string) => [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));
  const buttonTag = (html: string, name: string) =>
    [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].find((m) => m[1].replace(/<[^>]+>/g, "") === name)?.[0] ?? "";
  // The banner runs from its opening tag to the samples row, which follows it.
  const banner = (html: string) => html.slice(html.indexOf('class="callout callout-neutral language-banner"'), html.indexOf('class="samples"'));
  const count = (html: string, needle: string) => html.split(needle).length - 1;

  it("empty: only Check offer (blocked, with its reason), then the samples; no banner, no translate controls", () => {
    const html = page("", { step: "idle" });
    expect(controls(html)).toEqual(["Check offer", ...SAMPLE_LABELS]);
    expect(buttonTag(html, "Check offer")).toContain('aria-disabled="true"');
    expect(html).toContain("Paste an offer or choose a sample, then check it.");
    expect(html).not.toContain("language-banner");
    expect(html).not.toContain("language-gate");
  });

  it("English: only Check offer, then the samples; nothing about translation", () => {
    const html = page(ENGLISH, { step: "idle" });
    expect(controls(html)).toEqual(["Check offer", ...SAMPLE_LABELS]);
    expect(buttonTag(html, "Check offer")).not.toContain("aria-disabled");
    expect(buttonTag(html, "Check offer")).toContain('class="primary"');
    for (const absent of ["language-banner", "language-gate", TRANSLATE, ORIGINAL, "Google"]) expect(html).not.toContain(absent);
  });

  it("not clearly English: one banner with the explanation and the disclosure, then exactly two buttons side by side", () => {
    const html = page(ARABIC, { step: "idle" });
    expect(controls(html)).toEqual([TRANSLATE, ORIGINAL, ...SAMPLE_LABELS]);
    expect(count(html, "language-banner")).toBe(1);
    const inBanner = banner(html);
    expect(inBanner).toMatch(/^class="callout callout-neutral language-banner"/);
    // The explanation, the disclosure, then one row holding both actions; nothing else in the banner.
    expect(inBanner.indexOf('id="language-gate"')).toBeLessThan(inBanner.indexOf('id="translate-disclosure"'));
    expect(inBanner.indexOf('id="translate-disclosure"')).toBeLessThan(inBanner.indexOf('class="gate-actions"'));
    expect(controls(inBanner)).toEqual([TRANSLATE, ORIGINAL]);
    const row = inBanner.slice(inBanner.indexOf('class="gate-actions"'));
    expect(controls(row)).toEqual([TRANSLATE, ORIGINAL]);
    expect(buttonTag(html, TRANSLATE)).toContain('class="primary"');
    expect(buttonTag(html, ORIGINAL)).toContain('class="secondary"');
    expect(html).not.toContain(">Check offer<");
    expect(html).not.toContain("translate-consent");
    expect(html).not.toContain('class="submit"');
  });

  it("the disclosure is on screen before any click, word for word, and describes the send button", () => {
    const html = page(ARABIC, { step: "idle" });
    const inBanner = banner(html);
    expect(inBanner).toContain(`<p id="translate-disclosure" class="translate-disclosure">${DISCLOSURE}</p>`);
    expect(buttonTag(html, TRANSLATE)).toContain('aria-describedby="translate-disclosure"');
    // No second step: no consent question, no Cancel, no old Translate button.
    expect(html).not.toMatch(/Send this text to Google for translation\?|>Cancel<|Translate to English and check|translate-consent/);
    // While translation is off nothing is sent, so there is no disclosure.
    expect(page(ARABIC, { step: "unavailable", alert: false })).not.toContain("translate-disclosure");
  });

  it("one click sends one request; a double click sends one; editing or a sample never sends", async () => {
    const fetchMock = vi.fn(() => new Promise<never>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    typed.text = ARABIC;
    typed.flow = { step: "idle" };
    typed.stubbed = true;
    let tree: ReactNode;
    try {
      tree = OfferChecker({ ruleCount: 5, samples: SAMPLES });
    } finally {
      typed.stubbed = false;
    }
    type Props = { children?: ReactNode; onClick?: () => unknown; onChange?: (event: { target: { value: string } }) => void };
    const all = (node: ReactNode): ReactElement<Props>[] => {
      if (Array.isArray(node)) return node.flatMap(all);
      if (!node || typeof node !== "object" || !("props" in node)) return [];
      const element = node as ReactElement<Props>;
      return [element, ...all(element.props.children)];
    };
    const elements = all(tree);
    const textOf = (e: ReactElement<Props>) => [e.props.children].flat().filter((c) => typeof c === "string").join("");
    // Editing the box and pressing a sample: no request.
    elements.find((e) => e.type === "textarea")?.props.onChange?.({ target: { value: `${ARABIC} ` } });
    elements.find((e) => e.type === "button" && (e.props as { className?: string }).className === "sample")?.props.onClick?.();
    expect(fetchMock).not.toHaveBeenCalled();
    // Two presses of the same button before a re-render: one request.
    const send = elements.find((e) => textOf(e) === TRANSLATE);
    void send?.props.onClick?.();
    void send?.props.onClick?.();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe("/api/translate");
  });

  it("translating: the same row, the send button busy and Check original anyway blocked; no Check offer", () => {
    const html = page(ARABIC, { step: "sending" });
    expect(controls(html)).toEqual(["Translating...", ORIGINAL, ...SAMPLE_LABELS]);
    expect(buttonTag(html, "Translating...")).toContain('aria-busy="true"');
    expect(buttonTag(html, "Translating...")).toContain('aria-disabled="true"');
    expect(buttonTag(html, ORIGINAL)).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled=""/);
    expect(html).not.toContain("translate-consent");
    expect(html).toContain('aria-busy="true"');
  });

  it("failure: the alert inside the banner above the row; the two choices again, nothing else", () => {
    const html = page(ARABIC, { step: "failed", code: "provider_timeout" });
    expect(controls(html)).toEqual([TRANSLATE, ORIGINAL, ...SAMPLE_LABELS]);
    const inBanner = banner(html);
    expect(count(html, 'role="alert"')).toBe(1);
    expect(inBanner).toContain('role="alert"');
    expect(inBanner).toContain("Translation did not work, so nothing was checked.");
    expect(inBanner.indexOf('role="alert"')).toBeLessThan(inBanner.indexOf('class="gate-actions"'));
  });

  it("translation off: the banner with the Stage 1 note and one primary Check original anyway", () => {
    const html = page(ARABIC, { step: "unavailable", alert: true });
    expect(controls(html)).toEqual([ORIGINAL, ...SAMPLE_LABELS]);
    expect(buttonTag(html, ORIGINAL)).toContain('class="primary"');
    expect(banner(html)).toContain("The rules read English only, so the parts in other languages will not be checked.");
    expect(banner(html)).toContain('role="alert"');
  });

  it("keyboard order: the text box, then the action area, then the samples", () => {
    for (const [text, flow] of [["", { step: "idle" }], [ARABIC, { step: "idle" }], [ARABIC, { step: "sending" }]] as const) {
      const html = page(text, flow);
      const box = html.indexOf("<textarea");
      const actions = html.indexOf(text ? "language-banner" : 'class="submit"');
      const samples = html.indexOf('class="samples"');
      expect(box).toBeGreaterThan(-1);
      expect(box).toBeLessThan(actions);
      expect(actions).toBeLessThan(samples);
      expect(html).not.toMatch(/tabindex="[1-9]/);
    }
  });

  it("styles: one column, the row side by side from 600px and stacked full width below, samples on one tidy row", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const rule = (selector: string, from = 0) => {
      const at = css.indexOf(`${selector} {`, from);
      return at === -1 ? "" : css.slice(at, css.indexOf("}", at));
    };
    expect(rule(".input-foot")).not.toContain("grid-template-columns");
    expect(css).not.toMatch(/\.input-foot\s*\{[^}]*grid-template-columns/);
    expect(rule(".gate-actions")).toContain("flex-direction: column");
    expect(rule(".gate-actions button")).toContain("width: 100%");
    const wide = css.indexOf("@media (min-width: 600px)");
    expect(rule(".gate-actions", wide)).toContain("flex-direction: row");
    expect(rule(".gate-actions button", wide)).toContain("width: auto");
    expect(rule(".samples")).toMatch(/display: flex[\s\S]*flex-wrap: wrap[\s\S]*align-items: center/);
    expect(rule(".samples-label")).not.toContain("margin-bottom");
    // The banner uses the existing callout and tokens; no new colours.
    expect(rule(".language-banner")).not.toMatch(/#[0-9a-f]{3,8}\b|rgb/i);
    expect(rule(".language-gate")).toContain("var(--ink)");
    // 44px targets for every button, including the ones in the banner.
    expect(rule("button")).toContain("min-height: 44px");
  });
});

// STALE-1: a result belongs to the text that was checked. An edit or a sample clears it, aborts any
// request in flight and ignores a late reply. Offer text never goes into the announcement.
describe("STALE-1: clear the old result when the text changes", () => {
  const ENGLISH = "Pay the visa fee of AED 500 today.";
  const ARABIC = "رسوم التأشيرة 750 درهم يجب دفعها اليوم";
  const respond = (text: string, runId = "run-1"): AnalyzeResponse => ({ ...runManager(text), runId, audit: [] });
  type Props = {
    children?: ReactNode;
    onClick?: () => unknown;
    onChange?: (event: { target: { value: string } }) => void;
    onSubmit?: FormProps["onSubmit"];
    className?: string;
  };

  function mount(text: string, extra: { checked?: unknown; flow?: unknown; samples?: { label: string; text: string }[] } = {}) {
    typed.text = text;
    typed.checked = extra.checked ?? null;
    typed.flow = extra.flow ?? { step: "idle" };
    typed.stubbed = true;
    try {
      return OfferChecker({ ruleCount: 5, samples: extra.samples ?? [] });
    } finally {
      typed.stubbed = false;
    }
  }
  const all = (node: ReactNode): ReactElement<Props>[] => {
    if (Array.isArray(node)) return node.flatMap(all);
    if (!node || typeof node !== "object" || !("props" in node)) return [];
    const element = node as ReactElement<Props>;
    return [element, ...all(element.props.children)];
  };
  const edit = (tree: ReactNode, value: string) => all(tree).find((e) => e.type === "textarea")?.props.onChange?.({ target: { value } });
  const submit = (tree: ReactNode) => all(tree).find((e) => e.type === "form")?.props.onSubmit?.({ preventDefault: () => {} });
  const render = (text: string, checked: unknown, cleared = false) => {
    typed.text = text;
    typed.checked = checked;
    typed.cleared = cleared;
    typed.stubbed = true;
    try {
      return renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5 }));
    } finally {
      typed.stubbed = false;
    }
  };
  const status = (html: string) => html.match(/<p class="visually-hidden" role="status">(.*?)<\/p>/)?.[1] ?? "";
  const results = () => typed.checkedSets.filter((value) => value !== null);
  const alerts = () => typed.failureSets.filter((value) => value !== null);

  it("shows a result only while the box holds the checked text: score, findings, Agent run, draft and approval go together", () => {
    const check = recordCheck(respond(SCAM_OFFER), SCAM_OFFER);
    const shown = render(SCAM_OFFER, check);
    for (const part of ["score-card", "results-main", "trace-agent"]) expect(shown).toContain(part);
    for (const edited of [`${SCAM_OFFER}.`, ENGLISH, ""]) {
      const html = render(edited, check);
      for (const part of ["score-card", "results-main", "trace-agent"]) expect(html).not.toContain(part);
    }
  });

  it("a translated result is kept with the original that was in the box, and goes with it", () => {
    const english = "Visa fees of 750 dirhams must be paid today.";
    const check = recordCheck(respond(english), english, { original: ARABIC, english, sourceLang: "ar" });
    expect(check.boxText).toBe(ARABIC);
    expect(render(ARABIC, check)).toContain("Machine translation");
    const edited = render(`${ARABIC} `, check);
    expect(edited).not.toContain("Machine translation");
    expect(edited).not.toContain(english);
  });

  it("an edit clears the result, the failure and the gate, and announces it without offer text; focus is not moved", () => {
    const check = recordCheck(respond(ENGLISH), ENGLISH);
    edit(mount(ENGLISH, { checked: check }), `${ENGLISH} Reply now.`);
    expect(typed.checkedSets).toEqual([null]);
    expect(typed.failureSets).toEqual([null]);
    expect(typed.gateActions).toEqual([{ type: "reset" }]);
    expect(typed.clearedSets).toEqual([true]);
    const html = render(`${ENGLISH} Reply now.`, null, true);
    expect(status(html)).toBe("Result cleared because the text changed.");
    expect(status(html)).not.toMatch(/visa|Reply/i);
    expect(readFileSync(join(process.cwd(), "src/components/OfferChecker.tsx"), "utf8")).not.toMatch(/\.focus\(/);
  });

  it("a sample clears the result even when it fills in the same text", () => {
    const sample = { label: "Fee scam", text: SCAM_OFFER };
    const tree = mount(SCAM_OFFER, { checked: recordCheck(respond(SCAM_OFFER), SCAM_OFFER), samples: [sample] });
    all(tree).find((e) => e.type === "button" && e.props.className === "sample")?.props.onClick?.();
    expect(typed.checkedSets).toEqual([null]);
    expect(typed.clearedSets).toEqual([true]);
  });

  it("an edit with nothing to clear announces nothing", () => {
    edit(mount(""), "P");
    expect(typed.clearedSets).toEqual([]);
  });

  it("an edit aborts a check in flight: no result and no error alert, even when the reply arrives late", async () => {
    let signal: AbortSignal | undefined;
    let answer: (value: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        signal = init.signal ?? undefined;
        return new Promise<Response>((resolve) => {
          answer = resolve;
        });
      }),
    );
    const tree = mount(ENGLISH);
    void submit(tree);
    await Promise.resolve();
    expect(signal?.aborted).toBe(false);
    edit(tree, `${ENGLISH}!`);
    expect(signal?.aborted).toBe(true);
    // The server answers anyway: the late reply is ignored.
    answer(new Response(JSON.stringify(respond(ENGLISH)), { status: 200 }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(results()).toEqual([]);
    expect(alerts()).toEqual([]);
  });

  it("an aborted check that rejects shows no error alert", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
          }),
      ),
    );
    const tree = mount(ENGLISH);
    void submit(tree);
    await Promise.resolve();
    edit(tree, "");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(alerts()).toEqual([]);
    expect(results()).toEqual([]);
  });

  it("an edit aborts a translation in flight: no alert, no check, and the button is free again", async () => {
    let signal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init.signal ?? undefined;
          init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const tree = mount(ARABIC);
    const send = all(tree).find((e) => [e.props.children].flat().includes("Send to Google and translate"));
    void send?.props.onClick?.();
    await Promise.resolve();
    edit(tree, `${ARABIC} `);
    expect(signal?.aborted).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(typed.flowSets).toEqual([{ step: "sending" }, { step: "idle" }]);
    expect(results()).toEqual([]);
  });

  it("checking the same text again works and gives a fresh result", async () => {
    let n = 0;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(respond(ENGLISH, `run-${++n}`)), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    for (let i = 0; i < 2; i++) {
      void submit(mount(ENGLISH));
      await vi.waitFor(() => expect(results()).toHaveLength(i + 1));
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(results().map((value) => (value as { response: { runId: string } }).response.runId)).toEqual(["run-1", "run-2"]);
  });
});

// LANG-4: two bands. Uncertain (English-word share 0.15 up to 0.30): its own banner explanation, and
// "Check original anyway" gives partial coverage with a score. Below 0.15: unchanged, unchecked.
describe("LANG-4: the uncertain band", () => {
  const UNCERTAIN =
    "We could not confirm that all of this text is in English. The rules read English only. You can have it machine translated first, or check the original; parts that are not English will not be checked.";
  const NOT_ENGLISH =
    "This text does not look like English, or only part of it does. The rules read English only. You can have it machine translated to English first, or check the original, where the parts in other languages will not be checked.";
  const NO_TRANSLATE =
    "This text does not look like English, or only part of it does. The rules read English only, so the parts in other languages will not be checked.";
  const text = (id: string) => [...ENGLISH_EDGE_CASES, ...LATIN_NON_ENGLISH].find((entry) => entry.id === id)?.text ?? "";
  const respond = (offer: string): AnalyzeResponse => ({ ...runManager(offer), runId: "run-1", audit: [] });
  const chip = (html: string) => html.match(/<p class="chip score-label">(.*?)<\/p>/)?.[1];

  function renderWith(liveText: string, checked: unknown, flow: unknown = { step: "idle" }) {
    typed.text = liveText;
    typed.checked = checked;
    typed.flow = flow;
    typed.stubbed = true;
    try {
      return renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5 }));
    } finally {
      typed.stubbed = false;
      typed.flow = { step: "idle" };
    }
  }

  it.each(["EN-08", "EN-10"])("%s gets the banner with the uncertain explanation and the same two buttons", (id) => {
    const html = renderWith(text(id), null);
    expect(html).toContain(`<p id="language-gate" class="language-gate">${UNCERTAIN}</p>`);
    expect(html).not.toContain(NOT_ENGLISH);
    expect(html).toContain("Send to Google and translate");
    expect(html).toContain("Check original anyway (not checked)");
  });

  it.each(["EN-08", "EN-10"])("%s checked as the original: a score with partial coverage, never 'Not checked' or all clear", (id) => {
    const check = recordCheck(respond(text(id)), text(id));
    expect(check.coverage).toBe("partial");
    expect(check.languageNotice).toBe("part");
    const html = renderWith(text(id), check);
    expect(html).toContain(`<span class="score-value">${check.response.risk.score}</span>`);
    expect(html).not.toContain("Not checked");
    expect(html).not.toContain("No risk indicators found");
    expect(html).toContain("Part of this text is not in English.");
    expect(html).toContain("icon icon-info");
    const expected = check.response.findings.length === 0 ? "Score 0 on the English part. Part of the text was not checked." : check.response.risk.label;
    expect(chip(html)).toBe(expected);
  });

  it("band 1 (below 0.15) is unchanged: the old explanation, and checking gives 'Not checked' with no score", () => {
    const es = text("ES-01");
    expect(renderWith(es, null)).toContain(`<p id="language-gate" class="language-gate">${NOT_ENGLISH}</p>`);
    const check = recordCheck(respond(es), es);
    expect(check.coverage).toBe("unchecked");
    const html = renderWith(es, check);
    expect(html).toContain('<span class="score-value score-not-checked">Not checked</span>');
    expect(html).not.toContain('<span class="score-value">');
  });

  it("text decided by marker words keeps the old explanation; translation off keeps the plain note", () => {
    for (const id of ["ML-01", "TL-01", "UR-01", "HG-01"]) expect(renderWith(text(id), null), id).toContain(NOT_ENGLISH);
    const off = renderWith(text("EN-08"), null, { step: "unavailable", alert: false });
    expect(off).toContain(`<p id="language-gate" class="language-gate">${NO_TRANSLATE}</p>`);
    expect(off).not.toContain(UNCERTAIN);
  });
});
