import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SCAM_OFFER } from "@/lib/agents/fixtures";
import { appendEntries } from "@/lib/audit";
import { runWithAudit } from "@/lib/auditRun";
import { AuditTrail } from "./AuditTrail";

describe("AuditTrail", () => {
  it("lists every entry with its kind, data and a short hash, and none of the offer", async () => {
    const { audit, findings } = await runWithAudit(SCAM_OFFER);
    const html = renderToStaticMarkup(createElement(AuditTrail, { entries: audit }));
    // Step 5: the summary is a title, a count and a chain-status chip in separate spans.
    expect(html).toMatch(
      /<summary><span class="audit-title">Audit trail<\/span><span class="audit-count">7 entries<\/span><span class="chip chip-neutral">checking the chain<\/span><\/summary>/,
    );
    expect(html.match(/<li>/g)).toHaveLength(7);
    expect(html).toContain(`offerLength: ${SCAM_OFFER.length}`);
    expect(html).toContain(audit[0].hash.slice(0, 12));
    for (const quote of findings.flatMap((finding) => finding.evidence)) {
      expect(html).not.toContain(quote);
    }
    expect(html).not.toMatch(/@|Desert Star/);
  });

  // Since 2026-11-11 Verification and Official channel run; their entries hold ids and a count.
  it("shows the Verification and Official-channel steps as completed, with check ids and a count", async () => {
    const { audit } = await runWithAudit(SCAM_OFFER);
    const html = renderToStaticMarkup(createElement(AuditTrail, { entries: audit }));
    expect(html).toMatch(/agent: verification; status: completed; durationMs: [\d.]+; checkIds: (?:none|V-0\d(?:, V-0\d)*); count: \d+/);
    expect(html).toMatch(/agent: official_channel; status: completed; durationMs: [\d.]+; checkIds: [^;]+; count: \d+/);
    expect(html).not.toContain("not implemented yet");
  });

  it("labels a stub step as not implemented yet, with the Agent run panel's wording", async () => {
    const audit = await appendEntries([], [
      { runId: "r", at: "2026-11-11T00:00:00.000Z", kind: "agent_step", data: { agent: "explainer", status: "not_implemented", durationMs: null } },
    ]);
    const html = renderToStaticMarkup(createElement(AuditTrail, { entries: audit }));
    expect(html).toContain("agent: explainer; status: not implemented yet; durationMs: n/a");
    expect(html).not.toMatch(/status: not_implemented/);
  });

  it("says when the browser could not extend the trail", () => {
    const html = renderToStaticMarkup(createElement(AuditTrail, { entries: [], failed: true }));
    expect(html).toContain("could not add the latest step");
  });
});
