import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { draftReply } from "./agents/drafter";
import {
  copyText,
  gateReducer,
  INITIAL_GATE_FLOW,
  unfilledPlaceholders,
  type GateAction,
  type GateFlow,
} from "./approvalGate";

const AT = "2026-11-06T10:00:00.000Z";
const PREPARE: GateAction = { type: "prepare", at: AT };
const START_EDIT: GateAction = { type: "startEdit", at: AT };
const DISCARD: GateAction = { type: "discard", at: AT };
const APPROVE: GateAction = { type: "approve", copied: true, at: AT };
const CANARY = "Pay AED 500 to our agent hr.canary@gmail.com";
// The template with both names filled in, which is what a user must do before approving.
const FILLED = draftReply().replace("[Recipient name]", "Ms Example").replace("[Your name]", "Sam");
const FILL: GateAction[] = [START_EDIT, { type: "changeDraft", draft: FILLED }];

function run(...actions: GateAction[]): GateFlow {
  return actions.reduce(gateReducer, INITIAL_GATE_FLOW);
}

function eventNames(flow: GateFlow): string[] {
  return flow.events.map((event) => event.event);
}

describe("before the click", () => {
  it("has no draft and no events", () => {
    expect(INITIAL_GATE_FLOW).toEqual({ gate: null, events: [] });
  });

  it.each<[string, GateAction]>([
    ["edit", START_EDIT],
    ["change", { type: "changeDraft", draft: CANARY }],
    ["approve", APPROVE],
    ["discard", DISCARD],
  ])("ignores %s", (_name, action) => {
    expect(gateReducer(INITIAL_GATE_FLOW, action)).toBe(INITIAL_GATE_FLOW);
  });
});

describe("prepare", () => {
  it("creates a pending draft from the template", () => {
    expect(run(PREPARE).gate).toEqual({ status: "pending", draft: draftReply(), editing: false });
  });

  it("does nothing while a draft exists", () => {
    const pending = run(PREPARE);
    expect(gateReducer(pending, PREPARE)).toBe(pending);
    const approved = run(PREPARE, ...FILL, APPROVE);
    expect(approved.gate?.status).toBe("approved");
    expect(gateReducer(approved, PREPARE)).toBe(approved);
  });

  it("can start again after a discard", () => {
    expect(run(PREPARE, DISCARD, PREPARE).gate?.status).toBe("pending");
  });
});

describe("discard", () => {
  it("clears a pending draft", () => {
    const flow = run(PREPARE, DISCARD);
    expect(flow.gate).toEqual({ status: "discarded", draft: null });
    expect(JSON.stringify(flow)).not.toContain("Before I go further");
  });

  it("clears an edited draft", () => {
    const flow = run(PREPARE, START_EDIT, { type: "changeDraft", draft: CANARY }, DISCARD);
    expect(flow.gate).toEqual({ status: "discarded", draft: null });
    expect(JSON.stringify(flow)).not.toContain(CANARY);
  });

  it("clears an approved draft", () => {
    expect(run(PREPARE, ...FILL, APPROVE, DISCARD).gate).toEqual({ status: "discarded", draft: null });
  });

  it("records one event only", () => {
    const flow = run(PREPARE, DISCARD);
    expect(gateReducer(flow, DISCARD)).toBe(flow);
  });
});

describe("approve", () => {
  it("approves when the clipboard works", () => {
    expect(run(PREPARE, ...FILL, APPROVE).gate).toEqual({
      status: "approved",
      draft: FILLED,
      copied: true,
    });
  });

  it("still approves and keeps the draft when the clipboard is denied", () => {
    const flow = run(PREPARE, ...FILL, { type: "approve", copied: false, at: AT });
    expect(flow.gate).toEqual({ status: "approved", draft: FILLED, copied: false });
    expect(flow.events.at(-1)?.detail).toBe("Template wording, names filled in, clipboard denied, manual copy shown");
  });

  it.each([
    ["both names unfilled", draftReply()],
    ["only [Your name] unfilled", draftReply().replace("[Recipient name]", "Ms Example")],
    ["only [Recipient name] unfilled", draftReply().replace("[Your name]", "Sam")],
    ["any other [..] placeholder", "Dear Ms Example, see you on [date]. Sam"],
  ])("refuses while a placeholder is left: %s", (_name, draft) => {
    const flow = run(PREPARE, START_EDIT, { type: "changeDraft", draft });
    expect(gateReducer(flow, APPROVE)).toBe(flow);
    expect(gateReducer(flow, { type: "approve", copied: false, at: AT })).toBe(flow);
  });

  it("refuses the untouched template draft", () => {
    const flow = run(PREPARE);
    expect(gateReducer(flow, APPROVE)).toBe(flow);
  });

  it("finds each unfilled placeholder once", () => {
    expect(unfilledPlaceholders(draftReply())).toEqual(["[Recipient name]", "[Your name]"]);
    expect(unfilledPlaceholders(`${FILLED} [Your name] [Your name]`)).toEqual(["[Your name]"]);
    expect(unfilledPlaceholders(FILLED)).toEqual([]);
  });

  it("labels a draft with only the names filled in as template wording", () => {
    const flow = run(PREPARE, ...FILL, APPROVE);
    expect(flow.gate).toEqual({ status: "approved", draft: FILLED, copied: true });
    expect(flow.events.at(-1)).toEqual({
      timestamp: AT,
      actor: "user",
      event: "gate_approved",
      detail: "Template wording, names filled in, copied to clipboard",
    });
  });

  it("does nothing when the draft is blank", () => {
    const flow = run(PREPARE, START_EDIT, { type: "changeDraft", draft: "  \n " });
    expect(gateReducer(flow, APPROVE)).toBe(flow);
  });

  it("records one event only", () => {
    const flow = run(PREPARE, ...FILL, APPROVE);
    expect(gateReducer(flow, APPROVE)).toBe(flow);
  });
});

describe("edit", () => {
  it("keeps the edited text and notes the edit on approval", () => {
    const flow = run(PREPARE, START_EDIT, { type: "changeDraft", draft: "My own words" }, APPROVE);
    expect(flow.gate).toEqual({ status: "approved", draft: "My own words", copied: true });
    expect(flow.events.at(-1)?.detail).toBe("Edited wording, copied to clipboard");
  });

  it("ignores typing unless editing was started", () => {
    const flow = run(PREPARE);
    expect(gateReducer(flow, { type: "changeDraft", draft: CANARY })).toBe(flow);
  });

  it("sends an approved draft back to pending, so it needs approval again", () => {
    const flow = run(PREPARE, ...FILL, APPROVE, START_EDIT);
    expect(flow.gate).toEqual({ status: "pending", draft: FILLED, editing: true });
  });
});

describe("audit events", () => {
  it("writes every state change in order", () => {
    const flow = run(PREPARE, ...FILL, APPROVE, START_EDIT, DISCARD, PREPARE);
    expect(eventNames(flow)).toEqual([
      "gate_pending",
      "gate_edit_started",
      "gate_approved",
      "gate_pending",
      "gate_discarded",
      "gate_pending",
    ]);
  });

  it("records who acted and when", () => {
    expect(run(PREPARE, ...FILL, APPROVE).events).toEqual([
      { timestamp: AT, actor: "drafter", event: "gate_pending", detail: "Draft prepared from template" },
      { timestamp: AT, actor: "user", event: "gate_edit_started", detail: "Draft opened for editing" },
      { timestamp: AT, actor: "user", event: "gate_approved", detail: "Template wording, names filled in, copied to clipboard" },
    ]);
  });

  it("does not add an event for each keystroke", () => {
    const flow = run(
      PREPARE,
      START_EDIT,
      { type: "changeDraft", draft: "a" },
      { type: "changeDraft", draft: "ab" },
    );
    expect(eventNames(flow)).toEqual(["gate_pending", "gate_edit_started"]);
  });

  it("never holds the draft, template or edited", () => {
    const flow = run(
      PREPARE,
      ...FILL,
      APPROVE,
      START_EDIT,
      { type: "changeDraft", draft: CANARY },
      APPROVE,
      DISCARD,
    );
    expect(eventNames(flow)).toContain("gate_discarded");
    const events = JSON.stringify(flow.events);
    expect(events).not.toContain("Before I go further");
    expect(events).not.toContain("Ms Example");
    expect(events).not.toContain(CANARY);
  });

  it("clears on reset for a new analysis", () => {
    expect(gateReducer(run(PREPARE, ...FILL, APPROVE), { type: "reset" })).toEqual(INITIAL_GATE_FLOW);
  });
});

describe("gateReducer", () => {
  it("does not change the state it is given", () => {
    const flow = run(PREPARE);
    const copy = structuredClone(flow);
    gateReducer(flow, DISCARD);
    expect(flow).toEqual(copy);
  });
});

describe("copyText", () => {
  it("writes the exact text to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(copyText("Reply", { writeText })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("Reply");
  });

  it("returns false when the clipboard is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    await expect(copyText("Reply", { writeText })).resolves.toBe(false);
  });

  it("returns false when there is no clipboard", async () => {
    await expect(copyText("Reply", undefined)).resolves.toBe(false);
  });
});

describe("the approval path", () => {
  it.each([
    "src/lib/approvalGate.ts",
    "src/lib/agents/drafter.ts",
    "src/components/ApprovalPanel.tsx",
  ])("has no way to send anything in %s", (file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|mailto:|window\.open|location\.href/,
    );
  });
});
