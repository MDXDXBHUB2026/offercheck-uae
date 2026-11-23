"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Settings, Trash2, X } from "lucide-react";
import { clearMyData } from "@/components/shell/clearData";
import { InstallControl } from "@/components/shell/InstallControl";
import { setLang, useLang, useT } from "@/components/shell/lang";
import { setMotion, useMotion } from "@/components/shell/motion";
import { setTextSize, useTextSize } from "@/components/shell/textSize";
import { setTheme, useTheme } from "@/components/shell/theme";
import { Button } from "@/components/ui";

// Settings (production hardening Phase 4a, 2026-11-16): a gear button beside the language button opens
// this dialog. Every choice is kept in this browser only (each store wraps storage in try/catch), and
// nothing is sent to the server. Language and Animations are the same stores as the header's
// language button and the footer's Pause animations button, so all three always agree.
// Keyboard: focus moves into the dialog, Tab and Shift+Tab stay inside it, Escape closes it, and
// focus goes back to the gear button.

export const CLEAR_DATA_EXPLAIN =
  "Removes your Encrypted Vault, its count and every choice saved in this browser (language, animations, text size). Nothing is stored on Offer Check's server.";
export const CLEAR_DATA_CONFIRM =
  "Clear all Offer Check data on this device? Your saved results will be permanently deleted. This cannot be undone.";
export const CLEAR_DATA_DONE = "Your Offer Check data was removed from this browser.";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The element Tab (or Shift+Tab) should move to, to keep focus inside the dialog: the first one after
// the last, the last one before the first; null when the browser's own move stays inside.
export function wrapFocus<T>(items: readonly T[], active: T | null, backwards: boolean): T | null {
  if (items.length === 0) return null;
  const first = items[0];
  const last = items[items.length - 1];
  const index = active === null ? -1 : items.indexOf(active);
  if (index === -1) return backwards ? last : first;
  if (backwards && active === first) return last;
  if (!backwards && active === last) return first;
  return null;
}

function Choice({
  name,
  value,
  checked,
  disabled = false,
  onChange,
  children,
  lang,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
  children: ReactNode;
  lang?: string;
}) {
  const id = `setting-${name}-${value}`;
  return (
    <label className="setting-choice" htmlFor={id} data-disabled={disabled || undefined}>
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.()}
      />
      <span lang={lang}>{children}</span>
    </label>
  );
}

function Group({ legend, children, note }: { legend: string; children: ReactNode; note?: ReactNode }) {
  return (
    <fieldset className="setting-group">
      <legend className="label-caps">{legend}</legend>
      <div className="setting-choices">{children}</div>
      {note}
    </fieldset>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const motion = useMotion();
  const textSize = useTextSize();
  const theme = useTheme();
  const panel = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState<"idle" | "done" | "failed">("idle");

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
    const target = wrapFocus(items, document.activeElement as HTMLElement | null, event.shiftKey);
    if (target) {
      event.preventDefault();
      target.focus();
    }
  }

  function clearNow() {
    setConfirming(false);
    setCleared(clearMyData() ? "done" : "failed");
  }

  return (
    <div
      className="modal-backdrop settings-backdrop no-print"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="card modal settings-panel stack-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onKeyDown={onKeyDown}
      >
        <div className="row-between">
          <h2 id="settings-title" className="h3 row">
            <Settings className="icon text-green" aria-hidden="true" />
            <span>{t("Settings")}</span>
          </h2>
          <button type="button" className="icon-button" data-autofocus onClick={onClose}>
            <X className="icon" aria-hidden="true" />
            <span className="visually-hidden">{t("Close settings")}</span>
          </button>
        </div>
        <p className="small muted">{t("These choices are kept in this browser only.")}</p>

        <Group legend={t("Text size")}>
          <Choice name="text-size" value="standard" checked={textSize === "standard"} onChange={() => setTextSize("standard")}>
            {t("Standard")}
          </Choice>
          <Choice name="text-size" value="large" checked={textSize === "large"} onChange={() => setTextSize("large")}>
            {t("Large")}
          </Choice>
        </Group>

        <Group legend={t("Animations")}>
          <Choice name="motion" value="running" checked={motion === "running"} onChange={() => setMotion("running")}>
            {t("On")}
          </Choice>
          <Choice name="motion" value="paused" checked={motion === "paused"} onChange={() => setMotion("paused")}>
            {t("Paused")}
          </Choice>
        </Group>

        <Group legend={t("Language")}>
          <Choice name="lang" value="en" checked={lang === "en"} onChange={() => setLang("en")} lang="en">
            English
          </Choice>
          <Choice name="lang" value="ar" checked={lang === "ar"} onChange={() => setLang("ar")} lang="ar">
            العربية
          </Choice>
        </Group>

        <Group legend={t("Theme")}>
          <Choice name="theme" value="system" checked={theme === "system"} onChange={() => setTheme("system")}>
            {t("System")}
          </Choice>
          <Choice name="theme" value="dark" checked={theme === "dark"} onChange={() => setTheme("dark")}>
            {t("Dark")}
          </Choice>
          <Choice name="theme" value="light" checked={theme === "light"} onChange={() => setTheme("light")}>
            {t("Light")}
          </Choice>
        </Group>

        <section className="setting-group" aria-labelledby="settings-install">
          <h3 id="settings-install" className="label-caps">
            {t("App")}
          </h3>
          <InstallControl place="settings" />
        </section>

        <section className="setting-group" aria-labelledby="settings-clear">
          <h3 id="settings-clear" className="label-caps">
            {t("Clear my data on this device")}
          </h3>
          <p className="small muted">{t(CLEAR_DATA_EXPLAIN)}</p>
          {confirming ? (
            <div className="stack-sm confirm-delete" role="group" aria-labelledby="clear-question">
              <p id="clear-question" className="small">
                {t(CLEAR_DATA_CONFIRM)}
              </p>
              <div className="row">
                <Button variant="danger" onClick={clearNow}>
                  {t("Delete everything")}
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  {t("Cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="danger"
              onClick={() => {
                setCleared("idle");
                setConfirming(true);
              }}
            >
              <Trash2 className="icon" aria-hidden="true" />
              {t("Clear my data")}
            </Button>
          )}
          <p className="small" role="status">
            {cleared === "done" ? t(CLEAR_DATA_DONE) : ""}
          </p>
          {cleared === "failed" && (
            <p className="small text-red" role="alert">
              {t("This browser did not allow that.")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

// The gear button in the header, beside the language button.
export function SettingsButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  return (
    <>
      <Button
        ref={button}
        variant="secondary"
        className="settings-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Settings className="icon text-green" aria-hidden="true" />
        <span className="visually-hidden">{t("Settings")}</span>
      </Button>
      {/* In <body>, not in the header: the header's backdrop blur would otherwise size the fixed
          backdrop to the header. */}
      {open && createPortal(<SettingsDialog onClose={close} />, document.body)}
    </>
  );
}
