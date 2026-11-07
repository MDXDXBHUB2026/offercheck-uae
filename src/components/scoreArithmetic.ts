import { HIGH_BAND_MIN, SEVERITY_WEIGHTS } from "@/lib/scoring";
import type { Finding, RiskScore } from "@/lib/types";

const MAX_SCORE = 100;

// The sum behind the score, for example "40 + 20 + 20 + 20 = 100" with "capped at 100". It is built
// from the findings the server returned and shown only when it ends on the score the server
// computed, so the page never shows a number that disagrees with the real score.
export function scoreArithmetic(findings: readonly Finding[], risk: RiskScore): string | null {
  const points = findings.filter((f) => f.severity !== "info").map((f) => SEVERITY_WEIGHTS[f.severity]);
  if (points.length === 0) return null;
  const total = points.reduce((sum, p) => sum + p, 0);
  const sum = points.length === 1 ? `${total} points from 1 rule` : `${points.join(" + ")} = ${total}`;
  const hasHigh = findings.some((f) => f.severity === "high");
  let shown = total;
  let line = sum;
  if (hasHigh && total < HIGH_BAND_MIN) {
    shown = HIGH_BAND_MIN;
    line = `${sum}, raised to ${HIGH_BAND_MIN} because a high-severity rule matched`;
  } else if (total > MAX_SCORE) {
    shown = MAX_SCORE;
    line = `${sum}, capped at ${MAX_SCORE}`;
  }
  return shown === risk.score ? line : null;
}
