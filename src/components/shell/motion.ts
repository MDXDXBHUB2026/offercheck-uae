"use client";

import { useSyncExternalStore } from "react";

// "Pause animations" (closes S5-2, WCAG 2.2.2): one switch for the looping decoration outside the
// hero's own Pause radar (header icon loops, logo ping, flag line, aurora band, banner pulses, hero
// loops). Paused sets data-motion="paused" on <html>; the CSS reads that one attribute and sets every
// animation to none. HeroStage also pauses the hero video. The choice is kept in this browser only
// (localStorage), wrapped so blocked storage never breaks the page. Default: running, unless the
// person's system asks for reduced motion, in which case nothing loops anyway.

export type Motion = "running" | "paused";

export const MOTION_STORAGE_KEY = "offercheck_motion";
let current: Motion = "running";
const listeners = new Set<() => void>();

function apply(motion: Motion) {
  if (typeof document === "undefined") return;
  if (motion === "paused") document.documentElement.dataset.motion = "paused";
  else delete document.documentElement.dataset.motion;
}

export function getMotion(): Motion {
  return current;
}

export function setMotion(motion: Motion) {
  current = motion;
  apply(motion);
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, motion);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  listeners.forEach((listener) => listener());
}

// Called once on mount: restores a saved choice.
export function restoreMotion() {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(MOTION_STORAGE_KEY);
  } catch {
    saved = null;
  }
  if (saved === "paused" || saved === "running") setMotion(saved);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMotion(): Motion {
  return useSyncExternalStore(subscribe, getMotion, () => "running");
}
