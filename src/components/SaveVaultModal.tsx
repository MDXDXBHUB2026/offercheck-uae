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

type Status = "idle" | "saving" | "wrong" | "failed";

// "Save Encrypted": title, optional notes, and the passphrase twice. The passphrase is used once to
// encrypt and is never stored. With a vault already saved, the passphrase must open it, or nothing is
// written. The saved text is the text that was checked (after Auto-Redact), cut to SAVED_TEXT_MAX
// characters. Fixed messages only: no offer text in any message.
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
    const record: VaultRecord = {
      id: globalThis.crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      title: title.trim() || defaultTitle(t(bandLabel), t(channel), savedDay(new Date(), lang)),
      channel,
      text: Array.from(checkedText).slice(0, SAVED_TEXT_MAX).join(""),
      view,
      notes: notes.trim() || undefined,
      bandLabel,
      points,
      check,
    };
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
            {t(
              "The result and the checked text are encrypted with AES-256-GCM in this browser and kept only here. The passphrase is not stored; if you forget it, the saved records cannot be opened.",
            )}
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
            <p id="vault-pass-hint" className="small muted">
              {existing
                ? t("A vault is already saved in this browser. Use the passphrase you chose for it.")
                : t("At least {0} characters.", PASSPHRASE_MIN)}
            </p>
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
