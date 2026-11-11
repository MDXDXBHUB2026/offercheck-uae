import { PUBLIC_LIMITS_INTRO } from "@/components/publicLimitations";
import { Card } from "@/components/ui";
import { T } from "@/components/shell/T";

// The one-line notice under the analyzer, on the empty state and under every result: English text
// only, translation can change meaning, and a low score does not mean an offer is genuine. Until
// 2026-11-11 it opened the "What this check cannot do" section; that section was removed by owner
// decision (LIMITS-2 in docs/defects.md) and the full list stays internal, in docs/known-limitations.md.
export function AnalyzerNotice() {
  return (
    <Card className="limits-intro">
      <p className="small">
        <T>{PUBLIC_LIMITS_INTRO}</T>
      </p>
    </Card>
  );
}
