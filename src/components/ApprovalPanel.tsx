import { useEffect, useRef, type Dispatch } from "react";
import { InfoIcon } from "@/components/icons";
import { Callout } from "@/components/ui";
import { copyText, unfilledPlaceholders, type GateAction, type GateState } from "@/lib/approvalGate";

const NOTHING_SENT = "Nothing is sent until you approve. Offer Check never sends messages for you.";

function listOf(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function now(): string {
  return new Date().toISOString();
}

// Why approval is blocked, or "" when it is not. The gate refuses the same cases on its own.
function blockedReason(draft: string, editing: boolean): string {
  if (draft.trim().length === 0) return "Write the reply before you approve.";
  const missing = unfilledPlaceholders(draft);
  if (missing.length === 0) return "";
  return `${editing ? "Replace " : "Choose Edit draft and replace "}${listOf(missing)} with the real ${
    missing.length === 1 ? "text" : "details"
  } before you approve.`;
}

// The draft as text, with each unfilled placeholder shown as a highlighted chip. Text only: the
// draft is never parsed as markup.
function DraftText({ draft }: { draft: string }) {
  const missing = new Set(unfilledPlaceholders(draft));
  const parts = draft.split(/(\[[^\]\n]+\])/);
  return (
    <p className="draft-text">
      {parts.map((part, index) =>
        missing.has(part) ? (
          <mark key={index} className="placeholder">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </p>
  );
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
      <section className="block approval" aria-labelledby="draft-heading">
        <h2 id="draft-heading" className="section-title">
          Draft reply
        </h2>
        <div className="card draft-card">
          {gate && (
            <Callout tone="neutral" role="status" className="confirm">
              <p>Draft discarded.</p>
            </Callout>
          )}
          <p className="approval-note">
            Offer Check can prepare a careful reply for you to review. {NOTHING_SENT}
          </p>
          <div className="approval-actions">
            <button
              ref={prepareRef}
              type="button"
              className="secondary"
              onClick={() => dispatch({ type: "prepare", at: now() })}
            >
              Prepare draft reply
            </button>
          </div>
        </div>
      </section>
    );
  }

  async function approve(draft: string) {
    const copied = await copyText(draft);
    dispatch({ type: "approve", copied, at: now() });
  }

  const startEdit = () => dispatch({ type: "startEdit", at: now() });
  const discard = () => dispatch({ type: "discard", at: now() });
  const reason = gate.status === "pending" ? blockedReason(gate.draft, gate.editing) : "";

  return (
    <section className="block approval" aria-labelledby="approval-heading">
      <h2 id="approval-heading" className="section-title" ref={headingRef} tabIndex={-1}>
        {gate.status === "pending" ? "Your approval needed" : "Reply approved"}
      </h2>
      <div className="card draft-card">
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
        {gate.status === "pending" && !gate.editing && <DraftText draft={gate.draft} />}

        {gate.status === "approved" && gate.copied && (
          <>
            <Callout tone="success" role="status" className="confirm">
              <p>Reply copied. Paste it yourself if you want to use it.</p>
            </Callout>
            <DraftText draft={gate.draft} />
          </>
        )}
        {gate.status === "approved" && !gate.copied && (
          <>
            <Callout tone="neutral" role="status" className="confirm">
              <p>Your browser did not allow copying. Select the text below and copy it yourself.</p>
            </Callout>
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

        <div className="approval-actions">
          {gate.status === "pending" && (
            // aria-disabled, not disabled: the button stays in the tab order, so keyboard and
            // screen-reader users reach it and hear why it is blocked.
            <button
              type="button"
              aria-disabled={reason ? true : undefined}
              aria-describedby={reason ? "approve-reason" : undefined}
              onClick={() => {
                if (!reason) void approve(gate.draft);
              }}
            >
              Approve and copy reply
            </button>
          )}
          <button type="button" className="secondary" disabled={editing} onClick={startEdit}>
            Edit draft
          </button>
          <button type="button" className="text-button" onClick={discard}>
            Discard
          </button>
        </div>

        {/* A live region that stays in place while pending, so a screen reader announces each
            change to the reason, such as one name left instead of two. */}
        {gate.status === "pending" && (
          <p id="approve-reason" className="placeholder-note" role="status">
            {reason && (
              <>
                <InfoIcon />
                <span>{reason}</span>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
