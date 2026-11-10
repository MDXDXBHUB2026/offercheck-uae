"use client";

import { useEffect, useRef } from "react";

// The silent, looping, decorative video behind the Offer Analyzer hero: a tilted wall of glass
// offer cards in emerald and cyan (made by scripts/make-hero-loop.py; no words, no numbers, no audio
// track). It has no autoplay attribute: it starts from script only without a reduced-motion
// preference; otherwise, and without JavaScript, the still poster shows. No pause button, by the
// owner's decision (2026-11-08, confirmed 2026-11-10); see S5-1 in docs/defects.md. The hero text
// sits on .hero-glass panels, never on the video itself.
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
      <span className="hero-orb" />
      <span className="hero-orb" />
    </div>
  );
}
