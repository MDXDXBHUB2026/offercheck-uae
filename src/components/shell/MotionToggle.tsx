"use client";

import { Pause, Play } from "lucide-react";
import { setMotion, useMotion } from "@/components/shell/motion";
import { useT } from "@/components/shell/lang";
import { Button } from "@/components/ui";

export const PAUSE_ANIMATIONS = "Pause animations";
export const RESUME_ANIMATIONS = "Resume animations";

// The footer's "Pause animations / Resume animations" switch (S5-2). A real button: 44px target,
// keyboard reachable, aria-pressed while the animations are paused.
export function MotionToggle() {
  const t = useT();
  const paused = useMotion() === "paused";
  return (
    <Button
      variant="secondary"
      className="motion-toggle"
      aria-pressed={paused}
      onClick={() => setMotion(paused ? "running" : "paused")}
    >
      {paused ? <Play className="icon" aria-hidden="true" /> : <Pause className="icon" aria-hidden="true" />}
      <span>{t(paused ? RESUME_ANIMATIONS : PAUSE_ANIMATIONS)}</span>
    </Button>
  );
}
