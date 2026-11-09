"use client";

import { useSyncExternalStore } from "react";

// The English / Arabic switch. Arabic sets dir="rtl" and lang="ar" on <html>, so the whole layout
// mirrors (the CSS uses logical properties). As in the reference app, the navigation labels change
// language; the content stays in English. The Arabic labels are the reference app's own and have not
// been reviewed by a native speaker; the footer says so while Arabic is on. The choice is kept in
// this browser only (localStorage), wrapped so blocked storage never breaks the page.

export type Lang = "en" | "ar";

const STORAGE_KEY = "offercheck_lang";
let current: Lang = "en";
const listeners = new Set<() => void>();

function apply(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  current = lang;
  apply(lang);
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  listeners.forEach((listener) => listener());
}

// Called once on mount: restores a saved choice.
export function restoreLang() {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  if (saved === "ar" || saved === "en") setLang(saved);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => "en");
}
