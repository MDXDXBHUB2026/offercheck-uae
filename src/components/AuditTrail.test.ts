import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SCAM_OFFER } from "@/lib/agents/fixtures";
import { runWithAudit } from "@/lib/auditRun";
import { AuditTrail } from "./AuditTrail";

describe("AuditTrail", () => {
  it("lists every entry with its kind, data and a short hash, and none of the offer", async () => {
    const { audit, findings } = await runWithAudit(SCAM_OFFER);
    const html = renderToStaticMarkup(createElement(AuditTrail, { entries: audit }));
    expect(html).toContain("Audit trail: 7 entries, checking the chain");
    expect(html.match(/<li>/g)).toHaveLength(7);
    expect(html).toContain(`offerLength: ${SCAM_OFFER.length}`);
    expect(html).toContain(audit[0].hash.slice(0, 12));
    for (const quote of findings.flatMap((finding) => finding.evidence)) {
      expect(html).not.toContain(quote);
    }
    expect(html).not.toMatch(/@|Desert Star/);
  });

  it("labels stub steps as not implemented yet, with the Agent run panel's wording", async () => {
    const { audit } = await runWithAudit(SCAM_OFFER);
    const html = renderToStaticMarkup(createElement(AuditTrail, { entries: audit }));
    expect(html).toContain("agent: verification; status: not implemented yet; durationMs: n/a");
    expect(html).toContain("agent: official_channel; status: not implemented yet");
    expect(html).not.toContain("not_implemented<");
    expect(html).not.toMatch(/status: not_implemented/);
  });

  it("says when the browser could not extend the trail", () => {
    const html = renderToStaticMarkup(createElement(AuditTrail, { entries: [], failed: true }));
    expect(html).toContain("could not add the latest step");
  });
});
