import { useEffect, useRef, type Dispatch } from "react";
import { copyText, unfilledPlaceholders, type GateAction, type GateState } from "@/lib/approvalGate";

const NOTHING_SENT = "Nothing is sent until you approve. Offer Check never sends messages for you.";

function listOf(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function now(): string {
  return new Date().toISOString();
}

type ApprovalPanelProps = {
  gate: GateState | null;
  dispatch: Dispatch<GateAction>;
};

export function ApprovalPanel({ gate, dispatch }: ApprovalPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prepareRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const manualCopyRef = useRef<HTMLTextAreaElement>(null);

  const status = gate?.status;
  const editing = gate?.status === "pending" && gate.editing;
  const manualCopy = gate?.status === "approved" && !gate.copied;

  // The button that was pressed can disappear, so keyboard focus moves to what replaced it.
  useEffect(() => {
    if (!status) return;
    if (status === "discarded") {
      prepareRef.current?.focus();
    } else if (editing) {
      editRef.current?.focus();
    } else if (manualCopy) {
      manualCopyRef.current?.focus();
      manualCopyRef.current?.select();
    } else {
      headingRef.current?.focus();
    }
  }, [status, editing, manualCopy]);

  if (!gate || gate.status === "discarded") {
    return (
      <section className="approval" aria-label="Draft reply">
        {gate && <p role="status">Draft discarded.</p>}
        <button
          ref={prepareRef}
          type="button"
          onClick={() => dispatch({ type: "prepare", at: now() })}
        >
          Prepare draft reply
        </button>
      </section>
    );
  }

  async function approve(draft: string) {
    const copied = await copyText(draft);
    dispatch({ type: "approve", copied, at: now() });
  }

  const startEdit = () => dispatch({ type: "startEdit", at: now() });
  const discard = () => dispatch({ type: "discard", at: now() });
  const missing = gate.status === "pending" ? unfilledPlaceholders(gate.draft) : [];

  return (
    <section className="approval" aria-labelledby="approval-heading">
      <h2 id="approval-heading" ref={headingRef} tabIndex={-1}>
        {gate.status === "pending" ? "Your approval needed" : "Reply approved"}
      </h2>
      <p className="approval-note">{NOTHING_SENT}</p>

      {gate.status === "pending" && gate.editing && (
        <>
          <label htmlFor="draft-edit">Draft reply</label>
          <textarea
            id="draft-edit"
            ref={editRef}
            rows={10}
            value={gate.draft}
            onChange={(event) => dispatch({ type: "changeDraft", draft: event.target.value })}
          />
        </>
      )}
      {gate.status === "pending" && !gate.editing && <p className="draft-text">{gate.draft}</p>}

      {gate.status === "approved" && gate.copied && (
        <>
          <p role="status">Reply copied. Paste it yourself if you want to use it.</p>
          <p className="draft-text">{gate.draft}</p>
        </>
      )}
      {gate.status === "approved" && !gate.copied && (
        <>
          <p role="status">
            Your browser did not allow copying. Select the text below and copy it yourself.
          </p>
          <label htmlFor="draft-manual-copy">Reply to copy</label>
          <textarea
            id="draft-manual-copy"
            ref={manualCopyRef}
            rows={10}
            readOnly
            value={gate.draft}
          />
        </>
      )}

      {missing.length > 0 && (
        <p id="placeholder-note" className="placeholder-note">
          {gate.status === "pending" && gate.editing ? "Replace " : "Choose Edit draft and replace "}
          {listOf(missing)} with the real {missing.length === 1 ? "text" : "details"} before you
          approve.
        </p>
      )}

      <div className="approval-actions">
        {gate.status === "pending" && (
          <button
            type="button"
            disabled={gate.draft.trim().length === 0 || missing.length > 0}
            aria-describedby={missing.length > 0 ? "placeholder-note" : undefined}
            onClick={() => approve(gate.draft)}
          >
            Approve and copy reply
          </button>
        )}
        <button type="button" className="secondary" disabled={editing} onClick={startEdit}>
          Edit draft
        </button>
        <button type="button" className="secondary" onClick={discard}>
          Discard
        </button>
      </div>
    </section>
  );
}
