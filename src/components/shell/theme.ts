"use client";

import { useSyncExternalStore } from "react";
import { APP_BACKGROUND, APP_BACKGROUND_LIGHT } from "@/lib/appColors";
import { isTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/themeInit";

// Settings > Theme (production hardening Phase 4b). "dark" is the default and today's look; "light"
// is the light palette; "system" follows the device (prefers-color-scheme, in the CSS). The choice
// sets data-theme on <html>, which the CSS reads, and is kept in this browser only (localStorage key
// offercheck_theme_v1), wrapped so blocked storage never breaks the page. A script in the head
// (THEME_INIT_SCRIPT) sets the attribute before the first paint; restoreTheme() does the same on
// mount, which also covers React's development remount clearing the attribute. With no saved choice
// nothing is set and the CSS default (dark) applies.

export { THEME_STORAGE_KEY };
export type { Theme };

let current: Theme = "dark";
const listeners = new Set<() => void>();

// The browser's theme-colour tags follow an explicit choice; "system" puts the media-query tags back.
function applyBrowserColour(theme: Theme | null) {
  const tags = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  tags.forEach((tag) => {
    if (tag.dataset.originalContent === undefined) tag.dataset.originalContent = tag.content;
    if (theme === "dark") tag.content = APP_BACKGROUND;
    else if (theme === "light") tag.content = APP_BACKGROUND_LIGHT;
    else tag.content = tag.dataset.originalContent;
  });
}

function apply(theme: Theme | null) {
  if (typeof document === "undefined") return;
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  applyBrowserColour(theme === "system" ? null : theme);
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getTheme(): Theme {
  return current;
}

export function setTheme(theme: Theme) {
  current = theme;
  apply(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  notify();
}

// Called once on mount: restores a saved choice.
export function restoreTheme() {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    saved = null;
  }
  if (isTheme(saved)) {
    current = saved;
    apply(saved);
    notify();
  }
}

// Clear my data: back to the dark default on this page, without writing anything.
export function resetTheme() {
  current = "dark";
  apply(null);
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "dark");
}
