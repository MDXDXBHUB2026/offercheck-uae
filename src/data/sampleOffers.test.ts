import { describe, expect, it } from "vitest";
import { runManager } from "@/lib/agents/manager";
import { SAMPLE_OFFERS } from "./sampleOffers";
import { UAE_CONTACTS } from "./uaeContacts";

describe("UI sample offers", () => {
  it("are four: three scam-style and one genuine-style", () => {
    expect(SAMPLE_OFFERS).toHaveLength(4);
    expect(SAMPLE_OFFERS.filter((sample) => sample.kind === "scam")).toHaveLength(3);
    expect(SAMPLE_OFFERS.filter((sample) => sample.kind === "genuine")).toHaveLength(1);
  });

  it.each(SAMPLE_OFFERS.map((sample) => [sample.id, sample] as const))(
    "%s gives the band its card implies (scam: high, genuine: low with no fee flag)",
    (_id, sample) => {
      const { risk, findings } = runManager(sample.text);
      if (sample.kind === "scam") expect(risk.band).toBe("high");
      else {
        expect(risk.band).toBe("low");
        expect(findings.filter((finding) => finding.check === "fee_requested")).toEqual([]);
      }
    },
  );

  it("name no confirmed UAE contact number and use only example or free-mail domains", () => {
    for (const sample of SAMPLE_OFFERS) {
      for (const entry of UAE_CONTACTS) expect(sample.text).not.toContain(entry.hotline);
      for (const domain of sample.text.match(/@[\w.-]+/g) ?? []) {
        expect(domain).toMatch(/^@(gmail\.com|yahoo\.com|example\.ae)$/);
      }
    }
  });
});
