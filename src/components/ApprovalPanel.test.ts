import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { draftReply } from "@/lib/agents/drafter";
import type { GateState } from "@/lib/approvalGate";
import { ApprovalPanel } from "./ApprovalPanel";

const DRAFT_LINE = "Before I go further";
const NOTE = "Nothing is sent until you approve. Offer Check never sends messages for you.";

function render(gate: GateState | null): string {
  return renderToStaticMarkup(createElement(ApprovalPanel, { gate, dispatch: () => {} }));
}

const PENDING: GateState = { status: "pending", draft: draftReply(), editing: false };
const APPROVED: GateState = { status: "approved", draft: draftReply(), copied: true };
const DENIED: GateState = { status: "approved", draft: draftReply(), copied: false };

describe("ApprovalPanel", () => {
  it("shows only the prepare button before the click", () => {
    const html = render(null);
    expect(html).toContain("Prepare draft reply");
    expect(html).not.toContain("Your approval needed");
    expect(html).not.toContain(DRAFT_LINE);
  });

  it("shows the title, the label, the draft and the 3 buttons when pending", () => {
    const html = render(PENDING);
    expect(html).toContain("Your approval needed");
    expect(html).toContain(NOTE);
    expect(html).toContain(DRAFT_LINE);
    for (const label of ["Approve and copy reply", "Edit draft", "Discard"]) {
      expect(html).toContain(label);
    }
  });

  it("gives an editable box while editing", () => {
    const html = render({ ...PENDING, editing: true });
    expect(html).toMatch(/<textarea id="draft-edit"/);
    expect(html).not.toMatch(/<textarea[^>]*readonly/i);
  });

  it("blocks approval for a blank draft and says why", () => {
    const html = render({ ...PENDING, editing: true, draft: "  " });
    expect(html).toMatch(
      /<button type="button" aria-disabled="true" aria-describedby="approve-reason">Approve and copy reply/,
    );
    expect(html).toContain("Write the reply before you approve.");
  });

  it("blocks approval and says why while the names are unfilled", () => {
    const html = render(PENDING);
    expect(html).toContain(
      "Choose Edit draft and replace [Recipient name] and [Your name] with the real details before you approve.",
    );
    expect(html).toMatch(
      /<button type="button" aria-disabled="true" aria-describedby="approve-reason">Approve and copy reply/,
    );
  });

  it("keeps the blocked approve button focusable: aria-disabled, never the native disabled", () => {
    for (const gate of [PENDING, { ...PENDING, editing: true, draft: "  " }, { ...PENDING, editing: true }]) {
      const button = render(gate).match(/<button[^>]*>Approve and copy reply/)?.[0] ?? "";
      expect(button).toContain('aria-disabled="true"');
      expect(button).not.toMatch(/\sdisabled=|tabindex="-1"/i);
    }
  });

  it("puts the reason in a live region that stays in place while pending", () => {
    const filled = draftReply().replace("[Recipient name]", "Ms Example").replace("[Your name]", "Sam");
    for (const gate of [PENDING, { ...PENDING, editing: true, draft: filled }]) {
      expect(render(gate)).toMatch(/<p id="approve-reason" class="placeholder-note" role="status">/);
    }
    expect(render(APPROVED)).not.toContain("approve-reason");
  });

  it("names only the placeholders still left while editing", () => {
    const html = render({
      ...PENDING,
      editing: true,
      draft: draftReply().replace("[Recipient name]", "Ms Example"),
    });
    expect(html).toContain("Replace [Your name] with the real text before you approve.");
    expect(html).not.toContain("Choose Edit draft");
  });

  it("allows approval with an empty reason once the names are filled in", () => {
    const filled = draftReply().replace("[Recipient name]", "Ms Example").replace("[Your name]", "Sam");
    const html = render({ ...PENDING, editing: true, draft: filled });
    expect(html).toContain('<p id="approve-reason" class="placeholder-note" role="status"></p>');
    expect(html).toMatch(/<button type="button">Approve and copy reply/);
  });

  it("confirms the copy when the clipboard works", () => {
    const html = render(APPROVED);
    expect(html).toContain("Reply copied.");
    expect(html).not.toContain("<textarea");
  });

  it("shows a selectable box and a manual-copy message when the clipboard is denied", () => {
    const html = render(DENIED);
    expect(html).toContain("Select the text below and copy it yourself.");
    expect(html).toMatch(/<textarea id="draft-manual-copy"[^>]*readonly/i);
    expect(html).toContain(DRAFT_LINE);
  });

  // After approval the pre-approval note no longer fits: say it was approved, and that nothing was sent.
  it.each<[string, GateState, string]>([
    ["copied", APPROVED, "Reply approved and copied. Offer Check has not sent anything."],
    ["clipboard blocked", DENIED, "Reply approved. Offer Check has not sent anything."],
  ])("after approval (%s), says it was approved and that nothing was sent", (_name, gate, wording) => {
    const html = render(gate);
    expect(html).toContain(wording);
    expect(html).not.toContain("Nothing is sent until you approve");
  });

  it("keeps the pre-approval note before approval", () => {
    expect(render(null)).toContain(NOTE);
    expect(render(PENDING)).toContain(NOTE);
    expect(render({ ...PENDING, editing: true })).toContain(NOTE);
  });

  it("does not offer approval again once approved", () => {
    expect(render(APPROVED)).not.toContain("Approve and copy reply");
  });

  it("shows no draft after a discard", () => {
    const html = render({ status: "discarded", draft: null });
    expect(html).toContain("Draft discarded.");
    expect(html).toContain("Prepare draft reply");
    expect(html).not.toContain(DRAFT_LINE);
  });

  it("shows edited text as text, never as markup", () => {
    const html = render({ ...APPROVED, draft: "<img src=x onerror=alert(1)>" });
    expect(html).not.toContain("<img");
  });

  it.each<[string, GateState | null]>([
    ["no draft", null],
    ["pending", PENDING],
    ["editing", { ...PENDING, editing: true }],
    ["approved", APPROVED],
    ["denied", DENIED],
    ["discarded", { status: "discarded", draft: null }],
  ])("uses native buttons that a keyboard can reach: %s", (_name, gate) => {
    const html = render(gate);
    expect(html.match(/<button/g)?.length).toBe(html.match(/<button type="button"/g)?.length);
    expect(html).not.toMatch(/tabindex="[1-9]/i);
    expect(html).not.toMatch(/role="button"/);
  });
});
