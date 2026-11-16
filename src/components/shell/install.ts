"use client";

import { useSyncExternalStore } from "react";

// "Install app" (production hardening Phase 4a, 2026-11-16). Browsers that can install a web app
// (Chrome, Edge, Samsung Internet) fire beforeinstallprompt; the event is kept, and its own mini
// pop-up is suppressed, so nothing appears on arrival: installing starts only from the Install app
// button in Settings or the footer. iPhone and iPad browsers have no such event; there the same
// places show a short hint with the two taps for Add to Home Screen, which the person can dismiss
// (kept in this browser only). Nothing is sent anywhere.

export type InstallState = "pending" | "available" | "installed" | "ios" | "unsupported";

export const INSTALL_HINT_STORAGE_KEY = "offercheck_install_hint_dismissed";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: PromptEvent | null = null;
let installed = false;
let hintDismissed = false;
let started = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

// iPhone, iPod and iPad (iPadOS reports itself as a Mac with touch).
export function isAppleMobile(userAgent: string, platform: string, touchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && touchPoints > 1);
}

function standalone(): boolean {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export function getInstallState(): InstallState {
  if (typeof window === "undefined") return "pending";
  if (installed || standalone()) return "installed";
  if (deferred) return "available";
  if (isAppleMobile(navigator.userAgent, navigator.platform, navigator.maxTouchPoints ?? 0)) return "ios";
  return "unsupported";
}

// Called once on mount, as early as the page allows.
export function startInstallWatch() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    hintDismissed = window.localStorage.getItem(INSTALL_HINT_STORAGE_KEY) === "1";
  } catch {
    hintDismissed = false;
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    // No browser pop-up on arrival: the event is kept for the Install app button.
    event.preventDefault();
    deferred = event as PromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
  notify();
}

// The browser's own install dialog, from the person's click only.
export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  deferred = null;
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") installed = true;
  } catch {
    // The browser refused: nothing changes.
  }
  notify();
}

export function getHintDismissed(): boolean {
  return hintDismissed;
}

export function dismissInstallHint() {
  hintDismissed = true;
  try {
    window.localStorage.setItem(INSTALL_HINT_STORAGE_KEY, "1");
  } catch {
    // Storage blocked: dismissed for this page only.
  }
  notify();
}

// Settings > Clear my data: the hint may show again.
export function resetInstallHint() {
  hintDismissed = false;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getInstallState, () => "pending");
}

export function useHintDismissed(): boolean {
  return useSyncExternalStore(subscribe, getHintDismissed, () => true);
}
