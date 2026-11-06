import type { AnalysisResult, RiskBand } from "../../types";
import { runManager } from "../manager";
import { EVAL_OFFERS, type EvalOffer } from "./offers";

export type EvalResult = {
  offer: EvalOffer;
  band: RiskBand;
  ruleIds: string[];
  infoIds: string[];
  passed: boolean;
};

export type Confusion = {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number;
  recall: number;
};

function ids(result: AnalysisResult, info: boolean): string[] {
  return result.findings
    .filter((finding) => (finding.severity === "info") === info)
    .map((finding) => finding.source)
    .sort();
}

function sameIds(actual: string[], expected: string[]): boolean {
  return actual.join() === [...expected].sort().join();
}

export function evaluateOffer(offer: EvalOffer): EvalResult {
  const result = runManager(offer.text);
  const band = result.risk.band;
  const ruleIds = ids(result, false);
  const infoIds = ids(result, true);
  const passed =
    band === offer.expectedBand &&
    sameIds(ruleIds, offer.expectedRuleIds) &&
    sameIds(infoIds, offer.expectedInfoIds ?? []);
  return { offer, band, ruleIds, infoIds, passed };
}

export function evaluateAll(): EvalResult[] {
  return EVAL_OFFERS.map(evaluateOffer);
}

// An offer counts as flagged when its band is one of flaggedBands.
export function confusion(results: EvalResult[], flaggedBands: RiskBand[]): Confusion {
  const count = (scamLike: boolean, flagged: boolean) =>
    results.filter(
      (result) =>
        result.offer.scamLike === scamLike && flaggedBands.includes(result.band) === flagged,
    ).length;
  const truePositives = count(true, true);
  const falsePositives = count(false, true);
  const falseNegatives = count(true, false);
  const trueNegatives = count(false, false);
  return {
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    precision: truePositives / (truePositives + falsePositives),
    recall: truePositives / (truePositives + falseNegatives),
  };
}
