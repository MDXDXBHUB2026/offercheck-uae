"use client";

import { useEffect, useRef, type RefObject } from "react";

// The silent, looping, decorative video behind the Offer Analyzer hero: a tilted wall of glass
// offer cards in emerald and cyan (made by scripts/make-hero-loop.py; no words, no numbers, no audio
// track). It has no autoplay attribute: it starts from script only without a reduced-motion
// preference; otherwise, and without JavaScript, the still poster shows. HeroStage owns the
// "Pause radar" control, which pauses this video with the rest of the hero motion (closes S5-1,
// WCAG 2.2.2). The hero text sits on .hero-glass panels, never on the video itself.
export function HeroBackdrop({ videoRef }: { videoRef?: RefObject<HTMLVideoElement | null> }) {
  const ownRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? ownRef;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current?.play().catch(() => {
      // Autoplay refused: the poster stays, which is fine for a decorative backdrop.
    });
  }, [ref]);

  return (
    <div className="hero-backdrop" aria-hidden="true">
      <video ref={ref} muted loop playsInline preload="metadata" poster="/hero/poster.jpg" tabIndex={-1}>
        <source src="/hero/loop.webm" type="video/webm" />
        <source src="/hero/loop.mp4" type="video/mp4" />
      </video>
      <span className="hero-orb" />
      <span className="hero-orb" />
    </div>
  );
}
