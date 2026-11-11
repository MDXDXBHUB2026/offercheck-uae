"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { useLang, useT } from "@/components/shell/lang";
import { Button, Card } from "@/components/ui";
import { useVaultState } from "@/components/vaultStore";
import type { UiLang } from "@/lib/i18n";
import type { ResultView } from "@/lib/resultView";
import { addToVault, PASSPHRASE_MIN, SAVED_TEXT_MAX, type SavedCheck, type VaultRecord } from "@/lib/vault";
import { DecryptError } from "@/lib/vaultCrypto";

export const PASSPHRASE_NOTE =
  "You choose this passphrase. Offer Check cannot recover it. If you forget it, saved results cannot be opened.";
export const SAVED_NOTICE = "Saved to your vault in this browser.";
// Decision 2h: by default only the result is saved (quoted findings, points, band, channel, title,
// notes). The checked text is kept only if this box is ticked; it starts unticked.
export const KEEP_TEXT_LABEL = "Also keep the checked text (it may contain personal details)";
export const SAVE_INTRO =
  "The result is encrypted with AES-256-GCM in this browser and kept only here. The passphrase is not stored; if you forget it, the saved records cannot be opened.";

// The day of the save, for the default title: "10 Nov 2026".
export function savedDay(date: Date, lang: UiLang = "en"): string {
  const locale = lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB";
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

// The default title: the band wording shown on the result, the channel and the day, for example
// "High risk indicators, Email, 10 Nov 2026". The person can change it.
export function defaultTitle(bandLabel: string, channel: string, day: string): string {
  return `${bandLabel}, ${channel}, ${day}`;
}

// The record Save Encrypted writes. Decision 2h: the checked text is in it only when keepText is
// true (redacted text, cut to SAVED_TEXT_MAX characters); otherwise the record has no text field.
export function buildRecord(input: {
  title: string;
  channel: string;
  checkedText: string;
  keepText: boolean;
  view: ResultView;
  notes: string;
  bandLabel: string;
  points: string | null;
  check?: SavedCheck;
}): VaultRecord {
  return {
    id: globalThis.crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    title: input.title,
    channel: input.channel,
    ...(input.keepText && input.checkedText ? { text: Array.from(input.checkedText).slice(0, SAVED_TEXT_MAX).join("") } : {}),
    view: input.view,
    notes: input.notes.trim() || undefined,
    bandLabel: input.bandLabel,
    points: input.points,
    check: input.check,
  };
}

type Status = "idle" | "saving" | "wrong" | "failed";

// "Save Encrypted": title, optional notes, and the passphrase twice. The passphrase is used once to
// encrypt and is never stored. With a vault already saved, the passphrase must open it, or nothing is
// written. The checked text (after Auto-Redact, cut to SAVED_TEXT_MAX characters) is saved only when
// "Also keep the checked text" is ticked; otherwise the record has no text field at all. Fixed messages only: no offer text in any message.
export function SaveVaultModal({
  view,
  channel,
  checkedText,
  bandLabel,
  points = null,
  check,
  onClose,
  onSaved,
}: {
  view: ResultView;
  channel: string;
  checkedText: string;
  bandLabel: string;
  points?: string | null;
  check?: SavedCheck;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const vault = useVaultState();
  const existing = vault !== "none" && vault !== "pending";
  const [title, setTitle] = useState(() => defaultTitle(t(bandLabel), t(channel), savedDay(new Date(), lang)));
  const [notes, setNotes] = useState("");
  const [keepText, setKeepText] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Why saving is blocked, or "" when it is not. A new vault needs the minimum length; an existing
  // vault's passphrase is checked by opening it, whatever its length.
  const reason = !passphrase
    ? t("Enter a passphrase.")
    : !existing && passphrase.length < PASSPHRASE_MIN
      ? t("The passphrase needs at least {0} characters.", PASSPHRASE_MIN)
      : confirm !== passphrase
        ? t("The two passphrases do not match.")
        : "";

  function edited(set: (value: string) => void) {
    return (value: string) => {
      set(value);
      if (status !== "idle" && status !== "saving") setStatus("idle");
    };
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (reason || status === "saving") return;
    setStatus("saving");
    const record = buildRecord({
      title: title.trim() || defaultTitle(t(bandLabel), t(channel), savedDay(new Date(), lang)),
      channel,
      checkedText,
      keepText,
      view,
      notes,
      bandLabel,
      points,
      check,
    });
    try {
      await addToVault(record, passphrase);
      setPassphrase("");
      setConfirm("");
      onSaved();
    } catch (error) {
      setStatus(error instanceof DecryptError ? "wrong" : "failed");
    }
  }

  return (
    <div className="modal-backdrop no-print" role="presentation">
      <Card as="section" className="modal stack-sm narrow" aria-labelledby="vault-modal-title">
        <h2 id="vault-modal-title" className="h3 row">
          <Lock className="icon text-green" aria-hidden="true" />
          <span>{t("Encrypt and save in this browser")}</span>
        </h2>
        <form className="stack-sm" onSubmit={save}>
          <p className="small muted">
            {t(SAVE_INTRO)}
          </p>
          <div className="field">
            <label htmlFor="vault-title">{t("Title")}</label>
            <input
              id="vault-title"
              ref={firstField}
              type="text"
              autoComplete="off"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="vault-notes">{t("Notes (optional)")}</label>
            <textarea id="vault-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {checkedText && (
          <label className="check-item small" htmlFor="vault-keep-text">
            <input
              id="vault-keep-text"
              type="checkbox"
              checked={keepText}
              onChange={(e) => setKeepText(e.target.checked)}
            />
            <span>{t(KEEP_TEXT_LABEL)}</span>
          </label>
          )}
          {/* Side by side where there is room, so the buttons fit in a 744px-high window. */}
          <div className="field-pair">
            <div className="field">
              <label htmlFor="vault-pass">{t("Passphrase")}</label>
              <input
                id="vault-pass"
                type="password"
                autoComplete="new-password"
                aria-describedby="vault-pass-hint vault-pass-note"
                value={passphrase}
                onChange={(e) => edited(setPassphrase)(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="vault-pass-confirm">{t("Confirm passphrase")}</label>
              <input
                id="vault-pass-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => edited(setConfirm)(e.target.value)}
              />
            </div>
          </div>
          <p id="vault-pass-hint" className="small muted">
            {existing
              ? t("A vault is already saved in this browser. Use the passphrase you chose for it.")
              : t("At least {0} characters.", PASSPHRASE_MIN)}
          </p>
          <p id="vault-pass-note" className="small">
            {t(PASSPHRASE_NOTE)}
          </p>
          <p className="small text-red" role="alert">
            {status === "wrong"
              ? t("That passphrase does not open the vault already saved in this browser. Nothing was changed.")
              : status === "failed"
                ? t("This browser did not allow saving.")
                : ""}
          </p>
          <div className="row">
            <Button variant="secondary" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button type="submit" blocked={Boolean(reason)} reasonId="vault-save-reason" busy={status === "saving"}>
              {t("Encrypt and save")}
            </Button>
          </div>
          <p id="vault-save-reason" className="small muted" role="status">
            {passphrase || confirm ? reason : ""}
          </p>
        </form>
      </Card>
    </div>
  );
}
