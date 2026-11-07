import { draftReply, isTemplateWording } from "./agents/drafter";
import type { AuditEvent, Finding } from "./types";

export type GateState =
  | { status: "pending"; draft: string; editing: boolean }
  | { status: "approved"; draft: string; copied: boolean }
  | { status: "discarded"; draft: null };

// gate is null until the user asks for a draft. events never hold the draft: an edited draft can
// contain anything the user typed, including text pasted from the offer. template is this run's
// template draft, kept so the approval label and the audit entry check against the same text.
export type GateFlow = {
  gate: GateState | null;
  events: AuditEvent[];
  template: string | null;
};

export type GateAction =
  // findings choose the draft's blocks. Only their rule ids are read, never their evidence text.
  | { type: "prepare"; at: string; findings?: readonly Pick<Finding, "source">[] }
  | { type: "startEdit"; at: string }
  | { type: "changeDraft"; draft: string }
  | { type: "approve"; copied: boolean; at: string }
  | { type: "discard"; at: string }
  | { type: "reset" };

export const INITIAL_GATE_FLOW: GateFlow = { gate: null, events: [], template: null };

// Any [..] left in the draft, such as [Recipient name] or [Your name], is still to be filled in.
const PLACEHOLDER = /\[[^\]\n]*\]/g;

export function unfilledPlaceholders(draft: string): string[] {
  return [...new Set(draft.match(PLACEHOLDER) ?? [])];
}

export type PlaceholderState = "unfilled" | "filled";
export type TextState = "template" | "edited";

// Two separate facts about the draft, each from a fixed vocabulary. The approval label and the
// audit entry both use this one check, against this run's own template:
// - placeholders: "unfilled" while any [..] is left, otherwise "filled".
// - text: "edited" when the draft differs from the template once the two names are put back as
//   placeholders, otherwise "template". Filling in the names alone is not an edit.
export function draftState(
  draft: string,
  template: string,
): { placeholders: PlaceholderState; text: TextState } {
  return {
    placeholders: unfilledPlaceholders(draft).length > 0 ? "unfilled" : "filled",
    text: isTemplateWording(draft, template) ? "template" : "edited",
  };
}

function record(flow: GateFlow, gate: GateState, event: AuditEvent): GateFlow {
  return { ...flow, gate, events: [...flow.events, event] };
}

// An action that does not fit the current state changes nothing and records nothing.
export function gateReducer(flow: GateFlow, action: GateAction): GateFlow {
  const { gate } = flow;
  switch (action.type) {
    case "prepare": {
      if (gate && gate.status !== "discarded") return flow;
      const template = draftReply(action.findings);
      return record(
        { ...flow, template },
        { status: "pending", draft: template, editing: false },
        { timestamp: action.at, actor: "drafter", event: "gate_pending", detail: "Draft prepared from template" },
      );
    }
    case "startEdit": {
      if (gate?.status === "approved") {
        return record(
          flow,
          { status: "pending", draft: gate.draft, editing: true },
          { timestamp: action.at, actor: "user", event: "gate_pending", detail: "Approved draft reopened for editing" },
        );
      }
      if (gate?.status !== "pending" || gate.editing) return flow;
      return record(
        flow,
        { ...gate, editing: true },
        { timestamp: action.at, actor: "user", event: "gate_edit_started", detail: "Draft opened for editing" },
      );
    }
    case "changeDraft": {
      if (gate?.status !== "pending" || !gate.editing) return flow;
      return { ...flow, gate: { ...gate, draft: action.draft } };
    }
    case "approve": {
      if (gate?.status !== "pending" || gate.draft.trim().length === 0) return flow;
      if (unfilledPlaceholders(gate.draft).length > 0) return flow;
      // Approval needs the names filled in, so the label says whether the wording itself changed.
      const { text } = draftState(gate.draft, flow.template ?? draftReply());
      const wording = text === "template" ? "Template wording, names filled in" : "Edited wording";
      const copy = action.copied ? "copied to clipboard" : "clipboard denied, manual copy shown";
      return record(
        flow,
        { status: "approved", draft: gate.draft, copied: action.copied },
        { timestamp: action.at, actor: "user", event: "gate_approved", detail: `${wording}, ${copy}` },
      );
    }
    case "discard": {
      if (!gate || gate.status === "discarded") return flow;
      // A discard clears the template too; the audit entry for it reads the template from before.
      return record(
        { ...flow, template: null },
        { status: "discarded", draft: null },
        { timestamp: action.at, actor: "user", event: "gate_discarded", detail: "Draft cleared" },
      );
    }
    case "reset":
      return INITIAL_GATE_FLOW;
  }
}

// Only ever copies. The clipboard is missing outside a secure context and can be denied.
export async function copyText(
  text: string,
  clipboard: Pick<Clipboard, "writeText"> | undefined = globalThis.navigator?.clipboard,
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
