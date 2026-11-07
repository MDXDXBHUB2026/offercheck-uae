import type { CSSProperties } from "react";
import type { RiskScore } from "@/lib/types";

// A semicircle filled to the score out of 100. It is decorative: the number and the band label
// carry the same information as text, so nothing depends on colour or on the drawing. The arc
// grows from 0 to the score once, over 600ms (0s with prefers-reduced-motion).
export function ScoreGauge({ risk }: { risk: RiskScore }) {
  const arc = "M 16 96 A 80 80 0 0 1 176 96";
  return (
    <div className={`score score-${risk.band}`}>
      <div className="gauge-wrap">
        <svg className="gauge" viewBox="0 0 192 104" aria-hidden="true" focusable="false">
          <path className="gauge-track" d={arc} pathLength={100} />
          {risk.score > 0 && (
            <path
              className="gauge-value"
              d={arc}
              pathLength={100}
              style={{ "--score": risk.score } as CSSProperties}
            />
          )}
        </svg>
        <p className="score-text">
          <span className="score-value">{risk.score}</span>
          <span className="score-max">/ 100</span>
        </p>
      </div>
      <p className="chip score-label">{risk.label}</p>
    </div>
  );
}
