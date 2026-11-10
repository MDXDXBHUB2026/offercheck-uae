import { useEffect, useRef, type Dispatch } from "react";
import { Info } from "lucide-react";
import { Button, Callout, Card } from "@/components/ui";
import { copyText, unfilledPlaceholders, type GateAction, type GateState } from "@/lib/approvalGate";
import { useLang, useT } from "@/components/shell/lang";

const NOTHING_SENT = "Nothing is sent until you approve. Offer Check never sends messages for you.";

// After approval: say what happened, and that the reply draft was not sent. When the browser blocked
// the clipboard, the reply was not copied, so the note does not say it was. BATCHB-2: the note speaks
// for the reply draft only, since a translation, if chosen, did send the offer text to Google.
function approvedNote(copied: boolean): string {
  return copied
    ? "Reply approved and copied. Offer Check has not sent this reply draft anywhere."
    : "Reply approved. Offer Check has not sent this reply draft anywhere.";
}

function listOf(items: string[], and: string): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}`;
}

function now(): string {
  return new Date().toISOString();
}

// Why approval is blocked, or "" when it is not. The gate refuses the same cases on its own.
// The placeholders are quoted from the draft, which stays in English.
function blockedReason(draft: string, editing: boolean, t: Translate): string {
  if (draft.trim().length === 0) return t("Write the reply before you approve.");
  const missing = unfilledPlaceholders(draft);
  if (missing.length === 0) return "";
  const one = missing.length === 1;
  const template = editing
    ? one
      ? "Replace {0} with the real text before you approve."
      : "Replace {0} with the real details before you approve."
    : one
      ? "Choose Edit draft and replace {0} with the real text before you approve."
      : "Choose Edit draft and replace {0} with the real details before you approve.";
  return t(template, listOf(missing, t("and")));
}

type Translate = ReturnType<typeof useT>;

// The draft as text, with each unfilled placeholder shown as a highlighted chip. Text only: the
// draft is never parsed as markup.
function DraftText({ draft }: { draft: string }) {
  const missing = new Set(unfilledPlaceholders(draft));
  const parts = draft.split(/(\[[^\]\n]+\])/);
  return (
    <p className="draft-text" lang="en" dir="ltr">
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
  const t = useT();
  const lang = useLang();

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
      <Card as="section" className="stack-sm approval no-print" aria-labelledby="draft-heading">
        <h2 id="draft-heading" className="h3">
          {t("Draft reply")}
        </h2>
        <div className="stack-sm">
          {gate && (
            <Callout tone="neutral" role="status" className="confirm">
              <p>{t("Draft discarded.")}</p>
            </Callout>
          )}
          <p className="approval-note small muted">
            {t("Offer Check can prepare a careful reply for you to review.")} {t(NOTHING_SENT)}
          </p>
          <div className="row approval-actions">
            <Button ref={prepareRef} variant="secondary" onClick={() => dispatch({ type: "prepare", at: now() })}>
              {t("Prepare draft reply")}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  async function approve(draft: string) {
    const copied = await copyText(draft);
    dispatch({ type: "approve", copied, at: now() });
  }

  const startEdit = () => dispatch({ type: "startEdit", at: now() });
  const discard = () => dispatch({ type: "discard", at: now() });
  const reason = gate.status === "pending" ? blockedReason(gate.draft, gate.editing, t) : "";

  return (
    <Card as="section" className="stack-sm approval no-print" aria-labelledby="approval-heading">
      <h2 id="approval-heading" className="h3" ref={headingRef} tabIndex={-1}>
        {t(gate.status === "pending" ? "Your approval needed" : "Reply approved")}
      </h2>
      <div className="stack-sm">
        <p className="approval-note small muted">{t(gate.status === "approved" ? approvedNote(gate.copied) : NOTHING_SENT)}</p>

        {gate.status === "pending" && gate.editing && (
          <>
            <label htmlFor="draft-edit">{t("Draft reply")}</label>
            <textarea
              id="draft-edit"
              ref={editRef}
              rows={10}
              lang="en"
              dir="ltr"
              value={gate.draft}
              onChange={(event) => dispatch({ type: "changeDraft", draft: event.target.value })}
            />
          </>
        )}
        {gate.status === "pending" && !gate.editing && <DraftText draft={gate.draft} />}

        {gate.status === "approved" && gate.copied && (
          <>
            <Callout tone="success" role="status" className="confirm">
              <p>{t("Reply copied. Paste it yourself if you want to use it.")}</p>
            </Callout>
            <DraftText draft={gate.draft} />
          </>
        )}
        {gate.status === "approved" && !gate.copied && (
          <>
            <Callout tone="neutral" role="status" className="confirm">
              <p>{t("Your browser did not allow copying. Select the text below and copy it yourself.")}</p>
            </Callout>
            <label htmlFor="draft-manual-copy">{t("Reply to copy")}</label>
            <textarea
              id="draft-manual-copy"
              ref={manualCopyRef}
              rows={10}
              readOnly
              lang="en"
              dir="ltr"
              value={gate.draft}
            />
          </>
        )}

        <div className="row approval-actions">
          {gate.status === "pending" && (
            // aria-disabled, not disabled: the button stays in the tab order, so keyboard and
            // screen-reader users reach it and hear why it is blocked.
            <Button blocked={Boolean(reason)} reasonId="approve-reason" onClick={() => void approve(gate.draft)}>
              {t("Approve and copy reply")}
            </Button>
          )}
          <Button variant="secondary" blocked={editing} onClick={startEdit}>
            {t("Edit draft")}
          </Button>
          <Button variant="danger" onClick={discard}>
            {t("Discard")}
          </Button>
        </div>

        {/* A live region that stays in place while pending, so a screen reader announces each
            change to the reason, such as one name left instead of two. */}
        {gate.status === "pending" && (
          <p id="approve-reason" className="placeholder-note" role="status">
            {reason && (
              <>
                <Info className="icon" aria-hidden="true" />
                <span>
                  {/* The placeholders are quoted from the English draft, so they keep its language. */}
                  {(lang === "ar" ? reason.split(/(\[[^\]\n]+\])/) : [reason]).map((part, index) =>
                    index % 2 === 1 ? (
                      <bdi key={index} lang="en">
                        {part}
                      </bdi>
                    ) : (
                      part
                    ),
                  )}
                </span>
              </>
            )}
          </p>
        )}
      </div>
    </Card>
  );
}
