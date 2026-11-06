import { draftReply } from "./agents/drafter";
import type { AuditEvent } from "./types";

export type GateState =
  | { status: "pending"; draft: string; editing: boolean }
  | { status: "approved"; draft: string; copied: boolean }
  | { status: "discarded"; draft: null };

// gate is null until the user asks for a draft. events never hold the draft: an edited draft can
// contain anything the user typed, including text pasted from the offer.
export type GateFlow = {
  gate: GateState | null;
  events: AuditEvent[];
};

export type GateAction =
  | { type: "prepare"; at: string }
  | { type: "startEdit"; at: string }
  | { type: "changeDraft"; draft: string }
  | { type: "approve"; copied: boolean; at: string }
  | { type: "discard"; at: string }
  | { type: "reset" };

export const INITIAL_GATE_FLOW: GateFlow = { gate: null, events: [] };

function record(flow: GateFlow, gate: GateState, event: AuditEvent): GateFlow {
  return { gate, events: [...flow.events, event] };
}

// An action that does not fit the current state changes nothing and records nothing.
export function gateReducer(flow: GateFlow, action: GateAction): GateFlow {
  const { gate } = flow;
  switch (action.type) {
    case "prepare": {
      if (gate && gate.status !== "discarded") return flow;
      return record(
        flow,
        { status: "pending", draft: draftReply(), editing: false },
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
      const wording = gate.draft === draftReply() ? "Template draft" : "Edited draft";
      const copy = action.copied ? "copied to clipboard" : "clipboard denied, manual copy shown";
      return record(
        flow,
        { status: "approved", draft: gate.draft, copied: action.copied },
        { timestamp: action.at, actor: "user", event: "gate_approved", detail: `${wording}, ${copy}` },
      );
    }
    case "discard": {
      if (!gate || gate.status === "discarded") return flow;
      return record(
        flow,
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
