"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getMotion, useMotion } from "@/components/shell/motion";
import { heroExamples } from "@/data/heroExamples";
import { Crosshair, Pause, Play, Zap } from "lucide-react";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { useT } from "@/components/shell/lang";

// The Offer Analyzer hero frame (AI Studio port): the 24px emerald panel with corner brackets, the
// dim video backdrop, the text panel (children, rendered on the server) and, on the other side, a
// CSS/SVG radar with an "Example findings" card and the hero controls.
//
// Everything on the radar side is decoration or demo data: the radar moves on a fixed loop and
// reads nothing; the example rows name rule types, not a result. "Pause radar" stops every hero
// animation and the video (WCAG 2.2.2, closes S5-1). All motion is in the no-preference block of
// globals.css, so with a reduced-motion preference the radar is a still picture.

// Three example rows with concrete values read from the synthetic "Visa fee before joining" sample
// (src/data/heroExamples.ts): what the rules find in it, and the official check it points to. Demo
// data: they do not come from the user's text. The badge counts these rows. No rule IDs here; they
// appear only in "How this was checked" and the audit trail.
const EXAMPLES = heroExamples();
// Stands in for {0} in the translated template, so the value can be placed as its own element.
const SLOT = "\u0000";

export function HeroStage({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  // The footer's "Pause animations" (S5-2) also holds the hero: its CSS loops stop through
  // data-motion on <html>, and the video is paused here. Resuming plays it again only when the
  // hero's own Pause radar is off and there is no reduced-motion preference.
  const motion = useMotion();
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (motion === "paused") video.pause();
    else if (!pausedRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.play().catch(() => {
        // Play refused: the poster stays.
      });
    }
  }, [motion]);
  const [glow, setGlow] = useState<"max" | "normal">("max");
  const t = useT();

  function togglePause() {
    const next = !paused;
    setPaused(next);
    const video = videoRef.current;
    if (!video) return;
    if (next) video.pause();
    else if (getMotion() !== "paused" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
              <span>{t("Example findings")}</span>
            </p>
            <span className="chip chip-neutral mono">{t("{0} EXAMPLES", EXAMPLES.length)}</span>
          </div>
          <ul className="hud-rows mono">
            {EXAMPLES.map((row) => (
              <li key={row.label}>
                <span className={`dot dot-${row.tone}`} aria-hidden="true" />
                <span>{t(row.label)}</span>
                <span className="hud-tag">
                  {row.arg === undefined ? (
                    t(row.value)
                  ) : (
                    // The sample value (an amount, a domain) is data: isolated left to right inside
                    // the translated words, so "AED 1,950" and "gmail.com" read correctly in Arabic.
                    t(row.value, SLOT)
                      .split(SLOT)
                      .map((part, index) =>
                        index === 0 ? (
                          part
                        ) : (
                          <span key={index}>
                            <bdi dir="ltr" lang="en">
                              {row.arg}
                            </bdi>
                            {part}
                          </span>
                        ),
                      )
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="hud-foot">
            <span>{t("Demo data, not your text")}</span>
          </p>
        </div>

        <div className="hero-controls">
          <button type="button" className="btn btn-secondary" onClick={togglePause}>
            {paused ? <Play className="icon text-green" aria-hidden="true" /> : <Pause className="icon text-green" aria-hidden="true" />}
            <span>{paused ? t("Resume radar") : t("Pause radar")}</span>
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setGlow(glow === "max" ? "normal" : "max")}>
            <Zap className="icon text-green" aria-hidden="true" />
            <span>{glow === "max" ? t("Glow: Max") : t("Glow: Normal")}</span>
          </button>
          <span className="chip chip-neutral demo-chip">
            <span className="dot pulse" aria-hidden="true" />
            <span>{t("Demo animation")}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
