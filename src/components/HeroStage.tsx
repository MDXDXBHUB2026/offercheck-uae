"use client";

import { useRef, useState, type ReactNode } from "react";
import { Crosshair, Pause, Play, Zap } from "lucide-react";
import { HeroBackdrop } from "@/components/HeroBackdrop";

// The Offer Analyzer hero frame (AI Studio port): the 24px emerald panel with corner brackets, the
// dim video backdrop, the text panel (children, rendered on the server) and, on the other side, a
// CSS/SVG radar with an "Example findings" card and the hero controls.
//
// Everything on the radar side is decoration or demo data: the radar moves on a fixed loop and
// reads nothing; the example rows name rule types, not a result. "Pause radar" stops every hero
// animation and the video (WCAG 2.2.2, closes S5-1). All motion is in the no-preference block of
// globals.css, so with a reduced-motion preference the radar is a still picture.

// Three example rows, each a rule the engine really has (src/lib/agents/redFlag.ts) or the official
// check it points to. Demo data: they do not come from the user's text.
const EXAMPLES = [
  { tone: "high", text: "fee asked", tag: "RF-001" },
  { tone: "medium", text: "free e-mail sender", tag: "RF-005" },
  { tone: "green", text: "MoHRE reference", tag: "check on MoHRE" },
] as const;

export function HeroStage({ children, exampleCount }: { children: ReactNode; exampleCount: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [glow, setGlow] = useState<"max" | "normal">("max");

  function togglePause() {
    const next = !paused;
    setPaused(next);
    const video = videoRef.current;
    if (!video) return;
    if (next) video.pause();
    else if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.play().catch(() => {
        // Play refused: the poster stays.
      });
    }
  }

  return (
    <section
      className="card hero hero-video"
      aria-labelledby="page-title"
      data-paused={paused ? "true" : undefined}
      data-glow={glow}
    >
      <HeroBackdrop videoRef={videoRef} />
      {children}
      <div className="hero-radar-col">
        <div className="radar" aria-hidden="true">
          <span className="radar-aura">
            <span className="radar-orb" />
            <span className="radar-orb" />
          </span>
          <svg className="radar-grid" viewBox="0 0 200 200" focusable="false">
            <circle cx="100" cy="100" r="96" />
            <circle cx="100" cy="100" r="64" />
            <circle cx="100" cy="100" r="32" />
            <line x1="100" y1="4" x2="100" y2="196" />
            <line x1="4" y1="100" x2="196" y2="100" />
            <text x="100" y="15">N</text>
            <text x="188" y="103">E</text>
            <text x="100" y="192">S</text>
            <text x="12" y="103">W</text>
          </svg>
          <span className="radar-sweep" />
          <span className="radar-blip radar-blip-1" />
          <span className="radar-blip radar-blip-2" />
          <span className="radar-blip radar-blip-3" />
        </div>

        <div className="hud hero-glass">
          <div className="hud-head">
            <p className="hud-title">
              <Crosshair className="icon text-green hud-crosshair" aria-hidden="true" />
              <span>Example findings</span>
            </p>
            <span className="chip chip-neutral mono">{exampleCount} EXAMPLES</span>
          </div>
          <ul className="hud-rows mono">
            {EXAMPLES.map((row) => (
              <li key={row.text}>
                <span className={`dot dot-${row.tone}`} aria-hidden="true" />
                <span>{row.text}</span>
                <span className="hud-tag">{row.tag}</span>
              </li>
            ))}
          </ul>
          <p className="hud-foot">
            <span>Demo data, not your text</span>
            <span className="mono" dir="ltr">
              Dubai 25.20° N, 55.27° E
            </span>
          </p>
        </div>

        <div className="hero-controls">
          <button type="button" className="btn btn-secondary" onClick={togglePause}>
            {paused ? <Play className="icon text-green" aria-hidden="true" /> : <Pause className="icon text-green" aria-hidden="true" />}
            <span>{paused ? "Resume radar" : "Pause radar"}</span>
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setGlow(glow === "max" ? "normal" : "max")}>
            <Zap className="icon text-green" aria-hidden="true" />
            <span>{glow === "max" ? "Glow: Max" : "Glow: Normal"}</span>
          </button>
          <span className="chip chip-neutral demo-chip">
            <span className="dot pulse" aria-hidden="true" />
            <span>Demo animation</span>
          </span>
        </div>
      </div>
    </section>
  );
}
