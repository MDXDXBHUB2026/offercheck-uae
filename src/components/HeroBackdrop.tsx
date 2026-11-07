"use client";

import { useEffect, useRef } from "react";

// A silent, looping, decorative video behind the Check hero: a tilted wall of glass offer cards
// sliding by (made by scripts/make-hero-loop.py; no words, no numbers, no audio track). It starts
// only after the script runs and only without a reduced-motion preference; otherwise the still
// poster shows. There is deliberately no pause button (owner's decision, 2026-11-08); see the
// WCAG 2.2.2 note in docs/step5-premium-ui.md.
export function HeroBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    videoRef.current?.play().catch(() => {
      // Autoplay refused: the poster stays, which is fine for a decorative backdrop.
    });
  }, []);

  return (
    <div className="hero-backdrop" aria-hidden="true">
      <video ref={videoRef} muted loop playsInline preload="metadata" poster="/hero/poster.jpg" tabIndex={-1}>
        <source src="/hero/loop.webm" type="video/webm" />
        <source src="/hero/loop.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
