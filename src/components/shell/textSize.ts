"use client";

import { useSyncExternalStore } from "react";

// Settings > Text size (production hardening Phase 4a, 2026-11-16). "large" sets data-text="large"
// on <html>; the CSS reads that one attribute and raises the type scale inside the page, the footer
// and the dialogs. The header keeps its size, so its tabs still fit at 1280px
// (docs/header-measurements.json). The choice is kept in this browser only (localStorage), wrapped
// so blocked storage never breaks the page. Default: standard.

export type TextSize = "standard" | "large";

export const TEXT_SIZE_STORAGE_KEY = "offercheck_text_size";
let current: TextSize = "standard";
const listeners = new Set<() => void>();

function apply(size: TextSize) {
  if (typeof document === "undefined") return;
  if (size === "large") document.documentElement.dataset.text = "large";
  else delete document.documentElement.dataset.text;
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getTextSize(): TextSize {
  return current;
}

export function setTextSize(size: TextSize) {
  current = size;
  apply(size);
  try {
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, size);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  notify();
}

// Called once on mount: restores a saved choice.
export function restoreTextSize() {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
  } catch {
    saved = null;
  }
  if (saved === "standard" || saved === "large") setTextSize(saved);
}

// Clear my data: back to the default on this page, without writing anything.
export function resetTextSize() {
  current = "standard";
  apply(current);
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTextSize(): TextSize {
  return useSyncExternalStore(subscribe, getTextSize, () => "standard");
}
