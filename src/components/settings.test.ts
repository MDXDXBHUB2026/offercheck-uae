import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Production hardening Phase 4a (2026-11-16): Settings (text size, animations, language, theme, install,
// Clear my data) and the install hint. Storage is an in-memory stand-in; nothing is sent anywhere.

// Stores read their client snapshot here, so a render shows what the store holds.
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  return { ...real, useSyncExternalStore: (_s: unknown, get: () => unknown) => get() };
});
vi.mock("next/navigation", () => ({ usePathname: () => "/check" }));

import { clearMyData, STORED_KEYS } from "@/components/shell/clearData";
import {
  dismissInstallHint,
  getHintDismissed,
  getInstallState,
  INSTALL_HINT_STORAGE_KEY,
  isAppleMobile,
  promptInstall,
  startInstallWatch,
} from "@/components/shell/install";
import { InstallControl, INSTALL_SEPARATE_NOTE, IOS_INSTALL_STEPS } from "@/components/shell/InstallControl";
import { getLang, LANG_STORAGE_KEY, setLang } from "@/components/shell/lang";
import { MotionToggle, RESUME_ANIMATIONS } from "@/components/shell/MotionToggle";
import { getMotion, MOTION_STORAGE_KEY, setMotion } from "@/components/shell/motion";
import { Navbar } from "@/components/shell/Navbar";
import {
  CLEAR_DATA_CONFIRM,
  CLEAR_DATA_EXPLAIN,
  SettingsDialog,
  THEME_NOTE,
  wrapFocus,
} from "@/components/shell/SettingsPanel";
import { getTextSize, restoreTextSize, setTextSize, TEXT_SIZE_STORAGE_KEY } from "@/components/shell/textSize";
import { AR } from "@/lib/i18nAr";
import { saveVault, VAULT_COUNT_KEY, VAULT_KEY, vaultState } from "@/lib/vault";

type Listener = (event: Event & { preventDefault?: () => void }) => void;

function stubBrowser({ userAgent = "Mozilla/5.0 (Windows NT 10.0) Chrome/142", platform = "Win32", touch = 0, standalone = false, blocked = false } = {}) {
  const store = new Map<string, string>();
  const listeners = new Map<string, Listener[]>();
  const dataset: Record<string, string> = {};
  const root = { dataset, lang: "en", dir: "ltr" };
  const guard = <T>(fn: () => T): T => {
    if (blocked) throw new Error("SecurityError");
    return fn();
  };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => guard(() => store.get(key) ?? null),
      setItem: (key: string, value: string) => guard(() => void store.set(key, value)),
      removeItem: (key: string) => guard(() => void store.delete(key)),
    },
    matchMedia: () => ({ matches: standalone }),
    addEventListener: (type: string, fn: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    removeEventListener: () => {},
    dispatchEvent: () => true,
  });
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("navigator", { userAgent, platform, maxTouchPoints: touch, onLine: true });
  const fire = (type: string, event: object = {}) => (listeners.get(type) ?? []).forEach((fn) => fn(event as Event));
  return { store, root, fire };
}

beforeEach(() => {
  setLang("en");
  setMotion("running");
  setTextSize("standard");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

// One radio's <input> tag and the label text after it, found by name and value.
function radio(out: string, name: string, value: string): { tag: string; label: string } {
  const match = new RegExp(`<input id="setting-${name}-${value}"[^>]*/><span[^>]*>(.*?)</label>`).exec(out);
  if (!match) throw new Error(`no radio ${name}=${value}`);
  return { tag: match[0].slice(0, match[0].indexOf("/>")), label: match[1] };
}

describe("Clear my data on this device", () => {
  it("removes every stored key: the vault, its count, language, animations, text size and the install hint", async () => {
    const { store, root } = stubBrowser();
    await saveVault([{ id: "1", savedAt: "2026-11-16T00:00:00Z", title: "t", channel: "Email", view: { overall_risk_level: "Low", summary: "", red_flags: [] } as never }], "a passphrase");
    setLang("ar");
    setMotion("paused");
    setTextSize("large");
    dismissInstallHint();
    store.set("unrelated_site_key", "kept");
    expect([...store.keys()].sort()).toEqual([...STORED_KEYS, "unrelated_site_key"].sort());

    // No passphrase: the vault is deleted, not opened.
    expect(clearMyData()).toBe(true);
    expect([...store.keys()]).toEqual(["unrelated_site_key"]);
    expect(vaultState()).toBe("none");
    // And this page is back to the defaults, without writing them.
    expect([getLang(), getMotion(), getTextSize(), getHintDismissed()]).toEqual(["en", "running", "standard", false]);
    expect(root.dir).toBe("ltr");
    expect(root.dataset.motion).toBeUndefined();
    expect(root.dataset.text).toBeUndefined();
  });

  it("lists every storage key the code writes: no file in src writes an offercheck_ key not in the list", () => {
    expect([...STORED_KEYS].sort()).toEqual(
      [VAULT_KEY, VAULT_COUNT_KEY, LANG_STORAGE_KEY, MOTION_STORAGE_KEY, TEXT_SIZE_STORAGE_KEY, INSTALL_HINT_STORAGE_KEY].sort(),
    );
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return files(path);
        return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
      });
    const found = new Set<string>();
    for (const file of files("src")) for (const m of readFileSync(file, "utf8").matchAll(/"(offercheck_[a-z0-9_]+)"/g)) found.add(m[1]);
    expect([...found].sort()).toEqual([...STORED_KEYS].sort());
  });

  it("says false, and does not crash, when the browser blocks storage", () => {
    stubBrowser({ blocked: true });
    expect(clearMyData()).toBe(false);
  });

  it("asks first, saying saved results will be permanently deleted", () => {
    expect(CLEAR_DATA_CONFIRM).toContain("Your saved results will be permanently deleted.");
    const source = readFileSync("src/components/shell/SettingsPanel.tsx", "utf8");
    // The Clear my data button only opens the question; Delete everything clears.
    expect(source).toMatch(/setConfirming\(true\);\s*\}\}\s*>\s*<Trash2[^>]*\/>\s*\{t\("Clear my data"\)\}/);
    expect(source).toMatch(/<Button variant="danger" onClick=\{clearNow\}>\s*\{t\("Delete everything"\)\}/);
  });
});

describe("Settings dialog", () => {
  it("is a modal dialog with Text size, Animations, Language, Theme, App and Clear my data", () => {
    stubBrowser();
    const out = html(createElement(SettingsDialog, { onClose: () => {} }));
    expect(out).toContain('role="dialog"');
    expect(out).toContain('aria-modal="true"');
    expect(out).toContain('aria-labelledby="settings-title"');
    for (const legend of ["Text size", "Animations", "Language", "Theme"]) expect(out).toContain(`<legend class="label-caps">${legend}</legend>`);
    for (const heading of ["App", "Clear my data on this device"]) expect(out).toContain(heading);
    expect(out).toContain(CLEAR_DATA_EXPLAIN.replace("'", "&#x27;"));
    expect(out).toContain("Close settings");
  });

  it("Theme: System and Light disabled and marked coming soon, Dark chosen", () => {
    stubBrowser();
    const out = html(createElement(SettingsDialog, { onClose: () => {} }));
    for (const [value, name] of [["system", "System"], ["light", "Light"]]) {
      const choice = radio(out, "theme", value);
      expect(choice.tag).toContain('disabled=""');
      expect(choice.tag).not.toContain("checked");
      expect(choice.label).toBe(`${name} <span class="chip chip-soon">coming soon</span></span>`);
    }
    const dark = radio(out, "theme", "dark");
    expect(dark.tag).toContain('checked=""');
    expect(dark.tag).not.toContain("disabled");
    expect(out).toContain(THEME_NOTE);
  });

  it("Language and Animations are the same stores as the header button and the footer Pause control", () => {
    stubBrowser();
    setLang("ar");
    setMotion("paused");
    setTextSize("large");
    const out = html(createElement(SettingsDialog, { onClose: () => {} }));
    for (const [name, on, off] of [["lang", "ar", "en"], ["motion", "paused", "running"], ["text-size", "large", "standard"]]) {
      expect(radio(out, name, on).tag, name).toContain('checked=""');
      expect(radio(out, name, off).tag, name).not.toContain("checked");
    }
    // The language choices are named in their own language.
    expect(radio(out, "lang", "ar").label).toBe('العربية</span>');
    expect(out).toContain('<span lang="ar">العربية</span>');
    // The footer control shows the same paused state.
    expect(html(createElement(MotionToggle))).toContain(AR[RESUME_ANIMATIONS]);
    // In Arabic, the dialog's text is Arabic (the page is rtl, so the dialog mirrors).
    expect(out).toContain(AR["Settings"]);
    expect(out).toContain(AR["Text size"]);
    expect(out).toContain(AR["coming soon"]);
  });

  it("Text size Large sets data-text on <html>, is kept, and restores; blocked storage never throws", () => {
    const { store, root } = stubBrowser();
    setTextSize("large");
    expect(root.dataset.text).toBe("large");
    expect(store.get(TEXT_SIZE_STORAGE_KEY)).toBe("large");
    setTextSize("standard");
    expect(root.dataset.text).toBeUndefined();
    store.set(TEXT_SIZE_STORAGE_KEY, "large");
    restoreTextSize();
    expect(getTextSize()).toBe("large");
    store.set(TEXT_SIZE_STORAGE_KEY, "huge");
    setTextSize("standard");
    restoreTextSize();
    expect(getTextSize()).toBe("standard");
    stubBrowser({ blocked: true });
    expect(() => setTextSize("large")).not.toThrow();
    expect(() => restoreTextSize()).not.toThrow();
  });

  it("Large scales the page, footer and dialogs only, never the header (its tabs must fit at 1280px)", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const rule = /:root\[data-text="large"\] :is\(([^)]*)\) \{([^}]*)\}/.exec(css);
    expect(rule).not.toBeNull();
    const [, scope, body] = rule as RegExpExecArray;
    expect(scope.split(",").map((s) => s.trim())).toEqual(["#main", ".site-footer", ".modal", ".dropdown-panel"]);
    expect(scope).not.toMatch(/site-header|header-row|nav-desktop/);
    expect(body).toMatch(/--fs-sm: 16px/);
  });

  it("keyboard: focus wraps inside the dialog, Escape closes it, focus returns to the gear button", () => {
    const items = ["close", "standard", "large", "clear"];
    expect(wrapFocus(items, "clear", false)).toBe("close");
    expect(wrapFocus(items, "close", true)).toBe("clear");
    expect(wrapFocus(items, "standard", false)).toBeNull();
    expect(wrapFocus(items, null, false)).toBe("close");
    expect(wrapFocus([], null, false)).toBeNull();
    const source = readFileSync("src/components/shell/SettingsPanel.tsx", "utf8");
    expect(source).toMatch(/if \(event\.key === "Escape"\) \{\s*event\.stopPropagation\(\);\s*onClose\(\);/);
    expect(source).toMatch(/function close\(\) \{\s*setOpen\(false\);\s*button\.current\?\.focus\(\);/);
    expect(source).toContain('panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus()');
  });

  it("the gear button sits beside the language button in the header", () => {
    stubBrowser();
    const out = html(createElement(Navbar));
    const lang = out.indexOf("العربية");
    const gear = out.indexOf('class="btn btn-secondary settings-btn"');
    expect(lang).toBeGreaterThan(-1);
    expect(gear).toBeGreaterThan(lang);
    expect(out.slice(gear, gear + 400)).toContain('aria-haspopup="dialog"');
    expect(out.slice(gear)).toMatch(/<span class="visually-hidden">Settings<\/span>/);
  });
});

describe("Install app", () => {
  it("captures the browser's install event without its pop-up, and installs only from the button", async () => {
    const { fire } = stubBrowser();
    startInstallWatch();
    expect(getInstallState()).toBe("unsupported");
    const prevented = vi.fn();
    const prompt = vi.fn(async () => {});
    fire("beforeinstallprompt", { preventDefault: prevented, prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
    expect(prevented).toHaveBeenCalledOnce();
    expect(prompt).not.toHaveBeenCalled();
    expect(getInstallState()).toBe("available");
    const out = html(createElement(InstallControl, { place: "settings" }));
    expect(out).toContain("Install app");
    expect(out).toContain(INSTALL_SEPARATE_NOTE);
    expect(html(createElement(InstallControl, { place: "footer" }))).toContain("Install app");
    await promptInstall();
    expect(prompt).toHaveBeenCalledOnce();
    expect(getInstallState()).toBe("installed");
  });

  it("iPhone and iPad: a short hint with the two taps, the separate-storage note, and a footer dismiss that is remembered", async () => {
    expect(isAppleMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "iPhone", 5)).toBe(true);
    expect(isAppleMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5)).toBe(true);
    expect(isAppleMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0)).toBe(false);
    expect(isAppleMobile("Mozilla/5.0 (Linux; Android 15)", "Linux armv8l", 5)).toBe(false);

    const { store } = stubBrowser({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", platform: "iPhone", touch: 5 });
    // A fresh page: the install test above left this module's state "installed".
    vi.resetModules();
    const install = await import("@/components/shell/install");
    const { InstallControl } = await import("@/components/shell/InstallControl");
    const { getInstallState, dismissInstallHint } = install;
    install.startInstallWatch();
    expect(getInstallState()).toBe("ios");
    expect(IOS_INSTALL_STEPS).toBe("To install on iPhone or iPad: tap Share, then Add to Home Screen.");
    const footer = html(createElement(InstallControl, { place: "footer" }));
    expect(footer).toContain(IOS_INSTALL_STEPS);
    expect(footer).toContain(INSTALL_SEPARATE_NOTE);
    expect(footer).toContain('role="note"');
    expect(footer).toContain("Dismiss");
    dismissInstallHint();
    expect(store.get(INSTALL_HINT_STORAGE_KEY)).toBe("1");
    expect(html(createElement(InstallControl, { place: "footer" }))).toBe("");
    // Settings still explains it, without a dismiss button.
    const settings = html(createElement(InstallControl, { place: "settings" }));
    expect(settings).toContain(IOS_INSTALL_STEPS);
    expect(settings).not.toContain("Dismiss");
  });

  it("no pop-up on arrival: nothing installs or opens until a button is pressed, and an installed app shows no hint", async () => {
    stubBrowser({ standalone: true });
    vi.resetModules();
    const { getInstallState } = await import("@/components/shell/install");
    const { InstallControl } = await import("@/components/shell/InstallControl");
    expect(getInstallState()).toBe("installed");
    expect(html(createElement(InstallControl, { place: "footer" }))).toBe("");
    const source = readFileSync("src/components/shell/install.ts", "utf8");
    expect(source.match(/\.prompt\(\)/g)).toHaveLength(1);
    expect(source).toMatch(/export async function promptInstall\(\)/);
    expect(readFileSync("src/components/shell/InstallControl.tsx", "utf8")).toContain("onClick={() => void promptInstall()}");
  });

  it("has Arabic for the install button and the hint", () => {
    for (const text of ["Install app", "Dismiss", IOS_INSTALL_STEPS, INSTALL_SEPARATE_NOTE]) expect(AR[text], text).toBeTruthy();
  });
});
