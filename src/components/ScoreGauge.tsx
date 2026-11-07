import type { RiskScore } from "@/lib/types";

// A semicircle filled to the score out of 100. It is decorative: the number and the band label
// beside it carry the same information as text, so nothing depends on colour or on the drawing.
export function ScoreGauge({ risk }: { risk: RiskScore }) {
  const arc = "M 12 62 A 50 50 0 0 1 112 62";
  return (
    <div className={`score score-${risk.band}`}>
      <svg className="gauge" viewBox="0 0 124 70" aria-hidden="true" focusable="false">
        <path className="gauge-track" d={arc} pathLength={100} />
        {risk.score > 0 && (
          <path
            className="gauge-value"
            d={arc}
            pathLength={100}
            strokeDasharray={`${risk.score} 100`}
          />
        )}
      </svg>
      <p className="score-text">
        <span className="score-value">{risk.score}</span>
        <span className="score-max">/ 100</span>
      </p>
      <p className="score-label">{risk.label}</p>
    </div>
  );
}
