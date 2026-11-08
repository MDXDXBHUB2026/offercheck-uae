import { CHECK_LABELS } from "@/components/ResultsPanel";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Chip, type ChipTone } from "@/components/ui";
import { runManager } from "@/lib/agents/manager";
import { SEVERITY_WEIGHTS } from "@/lib/scoring";
import type { Severity } from "@/lib/types";

const TONE: Record<Severity, ChipTone> = { high: "high", medium: "medium", low: "success", info: "neutral" };

// The "screen" beside the page heading. It shows a real result: the synthetic fee-scam sample run
// through the same rules, on the server, when the page is built. Nothing in it is typed by hand.
export function HeroPreview({ sampleText }: { sampleText: string }) {
  const result = runManager(sampleText);
  const counted = result.findings.filter((finding) => finding.severity !== "info");
  return (
    <figure className="hero-figure" aria-labelledby="hero-screen-caption">
      <div className="hero-screen">
        <div className="screen-bar" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="screen-body">
          <ScoreGauge risk={result.risk} findings={result.findings} />
          <ul className="screen-findings">
            {counted.map((finding) => (
              <li key={finding.source}>
                <span className="screen-finding">{CHECK_LABELS[finding.check] ?? finding.check}</span>
                <Chip tone={TONE[finding.severity]}>+{SEVERITY_WEIGHTS[finding.severity]}</Chip>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption id="hero-screen-caption" className="hero-caption">
        Example: the synthetic &ldquo;Fee scam&rdquo; sample, checked by the same rules. Risk
        indicators, not a verdict.
      </figcaption>
    </figure>
  );
}
