import { PIPELINE, PIPELINE_STATUS_TEXT, type PipelineNode } from "@/lib/pipeline";

// Roadmap Phase 2: the pipeline as an inline SVG, drawn only from the registry in src/lib/pipeline.ts.
// Each box carries its label and its status as text; a step that is not built also has a dashed
// edge, so the status never depends on colour. The text list next to it is the accessible equivalent.
const WIDTH = 340;
const BOX_X = 20;
const BOX_WIDTH = WIDTH - 2 * BOX_X;
const BOX_HEIGHT = 56;
const GAP = 24;
const TOP = 8;

function boxY(index: number): number {
  return TOP + index * (BOX_HEIGHT + GAP);
}

function Node({ node, index }: { node: PipelineNode; index: number }) {
  const y = boxY(index);
  const status = node.status.replace(" ", "-");
  return (
    <g className={`pipeline-node pipeline-${status}`}>
      <rect x={BOX_X} y={y} width={BOX_WIDTH} height={BOX_HEIGHT} rx={14} />
      <text className="pipeline-label" x={BOX_X + 20} y={y + 24}>
        {node.label}
      </text>
      <text className="pipeline-status" x={BOX_X + 20} y={y + 44}>
        {PIPELINE_STATUS_TEXT[node.status]}
      </text>
    </g>
  );
}

function Arrow({ index }: { index: number }) {
  const from = boxY(index) + BOX_HEIGHT;
  const to = boxY(index + 1);
  const x = WIDTH / 2;
  return (
    <g className="pipeline-arrow">
      <line x1={x} y1={from + 2} x2={x} y2={to - 6} />
      <path d={`M ${x - 5} ${to - 10} L ${x} ${to - 3} L ${x + 5} ${to - 10}`} />
    </g>
  );
}

export function PipelineDiagram() {
  const height = boxY(PIPELINE.length - 1) + BOX_HEIGHT + TOP;
  return (
    <svg
      className="pipeline-diagram"
      role="img"
      aria-labelledby="pipeline-title pipeline-desc"
      viewBox={`0 0 ${WIDTH} ${height}`}
      width={WIDTH}
      height={height}
    >
      <title id="pipeline-title">The Offer Check pipeline</title>
      <desc id="pipeline-desc">
        The steps in order, each with its status. The same steps are listed as text next to the diagram.
      </desc>
      {PIPELINE.slice(0, -1).map((node, index) => (
        <Arrow key={`arrow-${node.id}`} index={index} />
      ))}
      {PIPELINE.map((node, index) => (
        <Node key={node.id} node={node} index={index} />
      ))}
    </svg>
  );
}
