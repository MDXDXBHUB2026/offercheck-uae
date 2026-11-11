import { ExternalLink, ListChecks, Landmark } from "lucide-react";
import { Card } from "@/components/ui";
import { useLang, useT } from "@/components/shell/lang";
import {
  CROSS_CHECK_COUNT,
  CROSS_CHECK_LABELS,
  CROSS_CHECK_REASONS,
  CROSS_CHECKS_NONE,
  CROSS_CHECKS_NOTE,
  OFFICIAL_STEPS_NOTE,
  validCrossChecks,
} from "@/lib/crossCheckLabels";
import { resolveSteps } from "@/lib/officialSteps";
import { ruleName } from "@/lib/ruleNames";
import type { AnalysisResult, CrossCheck } from "@/lib/types";

// The two groups under the findings (2026-11-11): "Cross-checks on the offer" (Verification) and
// "Official steps for these findings" (Official channel). Both are score-neutral and say so once.
// Shown on the result card and in a saved vault record. A result saved before these steps existed
// has neither field, so neither group is shown for it.

export const CROSS_CHECKS_TITLE = "Cross-checks on the offer";
export const OFFICIAL_STEPS_TITLE = "Official steps for these findings";

// The plain name of a rule id (RF-…) or a cross-check id (V-…) as it matched in this result.
export function idName(id: string, checks: readonly CrossCheck[]): string {
  if (id.startsWith("V-")) {
    const matched = checks.find((check) => check.id === id);
    return matched ? (CROSS_CHECK_LABELS[matched.check] ?? id) : id;
  }
  return ruleName(id);
}

export function CrossChecksGroup({ result }: { result: Pick<AnalysisResult, "crossChecks"> }) {
  const t = useT();
  if (result.crossChecks === undefined) return null;
  const checks = validCrossChecks(result.crossChecks);
  return (
    <Card as="section" className="stack-sm cross-checks" aria-labelledby="cross-checks-heading">
      <h2 id="cross-checks-heading" className="h3 row">
        <ListChecks className="icon text-green" aria-hidden="true" />
        <span>{t(CROSS_CHECKS_TITLE)}</span>
      </h2>
      <p className="small muted">{t(CROSS_CHECKS_NOTE)}</p>
      {checks.length === 0 ? (
        <p className="small">{t(CROSS_CHECKS_NONE, CROSS_CHECK_COUNT)}</p>
      ) : (
        <ul className="stack-sm">
          {checks.map((check, index) => (
            <li key={`${check.check}-${index}`} className="card-sunken stack-sm">
              <h3 className="h3">{t(CROSS_CHECK_LABELS[check.check])}</h3>
              <p className="small">{t(CROSS_CHECK_REASONS[check.check])}</p>
              {check.evidence.map((quote) => (
                <p key={quote} className="quote" dir="auto">
                  {quote}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function OfficialStepsGroup({ result }: { result: Pick<AnalysisResult, "crossChecks" | "officialSteps"> }) {
  const t = useT();
  const lang = useLang();
  const steps = resolveSteps(result.officialSteps);
  // No entry applies: nothing is shown, and no guidance is written in its place.
  if (steps.length === 0) return null;
  const checks = validCrossChecks(result.crossChecks);
  const separator = lang === "ar" ? "، " : "; ";
  return (
    <Card as="section" className="stack-sm official-steps" aria-labelledby="official-steps-heading">
      <h2 id="official-steps-heading" className="h3 row">
        <Landmark className="icon text-green" aria-hidden="true" />
        <span>{t(OFFICIAL_STEPS_TITLE)}</span>
      </h2>
      <p className="small muted">{t(OFFICIAL_STEPS_NOTE)}</p>
      <ul className="stack-sm">
        {steps.map((step) => (
          <li key={step.key} className="card-sunken stack-sm">
            <h3 className="h3">{t(step.title)}</h3>
            <p className="small">{t(step.text)}</p>
            <p className="small muted">{t("For: {0}", step.forIds.map((id) => t(idName(id, checks))).join(separator))}</p>
            <p className="small">
              {/* Labelled by its address, not the page title: one official page title uses a word
                  the interface never uses, so no page title is shown here. */}
              <a href={step.sourceUrl} target="_blank" rel="noopener noreferrer">
                {t("Official source")} <bdi dir="ltr" lang="en">{new URL(step.sourceUrl).hostname}</bdi>
                <ExternalLink className="icon" aria-hidden="true" />
              </a>
            </p>
            {step.lastChecked && (
              <p className="small muted">
                {t("Last checked")} <bdi dir="ltr" lang="en">{step.lastChecked}</bdi>
              </p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
