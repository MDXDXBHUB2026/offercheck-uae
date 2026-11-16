"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Download, KeyRound, RotateCcw, Upload } from "lucide-react";
import { useT } from "@/components/shell/lang";
import { Button, Card } from "@/components/ui";
import { useVaultState } from "@/components/vaultStore";
import {
  changePassphrase,
  exportVault,
  importVault,
  parseVaultFile,
  PASSPHRASE_MIN,
  resetVault,
  vaultFileName,
} from "@/lib/vault";
import { DecryptError } from "@/lib/vaultCrypto";

// Production hardening Phase 4a (2026-11-16): reset without the passphrase, backup to a file and back,
// and a new passphrase. The crypto is src/lib/vaultCrypto.ts unchanged; nothing is sent anywhere.
// Fixed messages only: no offer text, title or note is ever shown in a message here.

export const FORGOT_EXPLAIN =
  "Offer Check cannot recover a passphrase, and nothing in the vault can be opened without it. Resetting the vault permanently deletes the saved results in this browser, so you can start again.";
export const BACKUP_EXPLAIN =
  "Export saves the vault to a file, still encrypted. Import puts a saved file back in this browser. Opening it still needs the passphrase it was saved with. Keep the file somewhere private.";
export const IMPORT_REFUSED = "This file is not an Offer Check vault backup, or it is damaged. Nothing was changed.";
export const IMPORT_DONE = "Vault imported. Open it with the passphrase it was saved with.";

// "Forgot your passphrase?" on the locked vault: what cannot be done, then Reset with a confirm step.
export function ForgotPassphrase({ count }: { count: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  function reset() {
    setConfirming(false);
    if (!resetVault()) setFailed(true);
  }

  return (
    <div className="stack-sm">
      <button
        type="button"
        className="link-btn forgot-link"
        aria-expanded={open}
        aria-controls="forgot-panel"
        onClick={() => {
          setOpen(!open);
          setConfirming(false);
        }}
      >
        {t("Forgot your passphrase?")}
      </button>
      {open && (
        <div id="forgot-panel" className="stack-sm card-sunken">
          <p className="small">{t(FORGOT_EXPLAIN)}</p>
          {confirming ? (
            <div className="stack-sm confirm-delete" role="group" aria-labelledby="reset-question">
              <p id="reset-question" className="small">
                {count > 0
                  ? t("Permanently delete the {0} saved results in this browser? This cannot be undone.", count)
                  : t("Permanently delete the saved results in this browser? This cannot be undone.")}
              </p>
              <div className="row">
                <Button variant="danger" onClick={reset}>
                  {t("Delete and reset")}
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  {t("Cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              <RotateCcw className="icon" aria-hidden="true" />
              {t("Reset vault")}
            </Button>
          )}
          {failed && (
            <p className="small text-red" role="alert">
              {t("This browser did not allow that.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// The browser saves the file: a same-page download of an in-memory blob, never a network request.
function download(text: string, name: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}

type Pending = { stored: string; count: number | null } | null;
type BackupStatus = "idle" | "exported" | "refused" | "imported" | "failed";

// Export and Import. Import never asks for the passphrase: the file's vault goes in still encrypted.
// With a vault already saved here, the person confirms that it is replaced.
export function VaultBackup({ onImported }: { onImported?: () => void }) {
  const t = useT();
  const vault = useVaultState();
  const exists = vault !== "none" && vault !== "pending";
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [status, setStatus] = useState<BackupStatus>("idle");

  function exportNow() {
    const text = exportVault();
    setStatus(text !== null && download(text, vaultFileName(new Date())) ? "exported" : "failed");
  }

  function put(file: { stored: string; count: number | null }) {
    setPending(null);
    if (!importVault(file)) {
      setStatus("failed");
      return;
    }
    setStatus("imported");
    onImported?.();
  }

  async function chosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setPending(null);
    if (!file) return;
    let text = "";
    try {
      text = await file.text();
    } catch {
      setStatus("refused");
      return;
    }
    const parsed = parseVaultFile(text);
    if (!parsed.ok) {
      setStatus("refused");
      return;
    }
    if (exists) {
      setStatus("idle");
      setPending({ stored: parsed.stored, count: parsed.count });
      return;
    }
    put(parsed);
  }

  return (
    <Card as="section" className="stack-sm narrow" aria-labelledby="backup-heading">
      <h2 id="backup-heading" className="h3">
        {t("Backup")}
      </h2>
      <p className="small muted">{t(BACKUP_EXPLAIN)}</p>
      <div className="row">
        {exists && (
          <Button variant="secondary" onClick={exportNow}>
            <Download className="icon" aria-hidden="true" />
            {t("Export vault")}
          </Button>
        )}
        <Button variant="secondary" onClick={() => fileInput.current?.click()}>
          <Upload className="icon" aria-hidden="true" />
          {t("Import vault")}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void chosen(event)}
        />
      </div>
      {pending && (
        <div className="stack-sm confirm-delete" role="group" aria-labelledby="import-question">
          <p id="import-question" className="small">
            {t("Replace the saved results in this browser with the ones in this file? The current ones will be permanently deleted.")}
          </p>
          <div className="row">
            <Button variant="danger" onClick={() => put(pending)}>
              {t("Replace")}
            </Button>
            <Button variant="secondary" onClick={() => setPending(null)}>
              {t("Cancel")}
            </Button>
          </div>
        </div>
      )}
      <p className="small" role="status">
        {status === "exported"
          ? t("Vault exported. Your browser saved the file.")
          : status === "imported"
            ? t(IMPORT_DONE)
            : ""}
      </p>
      {(status === "refused" || status === "failed") && (
        <p className="small text-red" role="alert">
          {status === "refused" ? t(IMPORT_REFUSED) : t("This browser did not allow that.")}
        </p>
      )}
    </Card>
  );
}

type ChangeStatus = "idle" | "saving" | "wrong" | "failed" | "done";

// Change passphrase, on the open vault: the old passphrase opens it again, then every record is
// encrypted with the new one. onChanged hands the new passphrase to the open vault's memory.
export function ChangePassphrase({ onChanged }: { onChanged: (passphrase: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<ChangeStatus>("idle");

  const reason = !current
    ? t("Enter your current passphrase.")
    : next.length < PASSPHRASE_MIN
      ? t("The passphrase needs at least {0} characters.", PASSPHRASE_MIN)
      : confirm !== next
        ? t("The two passphrases do not match.")
        : "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (reason || status === "saving") return;
    setStatus("saving");
    try {
      await changePassphrase(current, next);
      onChanged(next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setStatus("done");
    } catch (error) {
      setStatus(error instanceof DecryptError ? "wrong" : "failed");
    }
  }

  const edit = (set: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    set(event.target.value);
    if (status !== "saving") setStatus("idle");
  };

  return (
    <div className="stack-sm">
      <Button variant="secondary" aria-expanded={open} aria-controls="change-pass-form" onClick={() => setOpen(!open)}>
        <KeyRound className="icon" aria-hidden="true" />
        {t("Change passphrase")}
      </Button>
      {open && (
        <form id="change-pass-form" className="stack-sm card-sunken" onSubmit={submit}>
          <div className="field">
            <label htmlFor="change-pass-current">{t("Current passphrase")}</label>
            <input id="change-pass-current" type="password" autoComplete="current-password" value={current} onChange={edit(setCurrent)} />
          </div>
          <div className="field-pair">
            <div className="field">
              <label htmlFor="change-pass-new">{t("New passphrase")}</label>
              <input id="change-pass-new" type="password" autoComplete="new-password" value={next} onChange={edit(setNext)} />
            </div>
            <div className="field">
              <label htmlFor="change-pass-confirm">{t("Confirm new passphrase")}</label>
              <input id="change-pass-confirm" type="password" autoComplete="new-password" value={confirm} onChange={edit(setConfirm)} />
            </div>
          </div>
          <p className="small muted">{t("Offer Check cannot recover a forgotten passphrase.")}</p>
          <Button type="submit" blocked={Boolean(reason)} reasonId="change-pass-reason" busy={status === "saving"}>
            {t("Save new passphrase")}
          </Button>
          <p id="change-pass-reason" className="small muted">
            {current || next || confirm ? reason : ""}
          </p>
          <p className="small" role="status">
            {status === "done" ? t("Passphrase changed. Use the new one from now on.") : ""}
          </p>
          {(status === "wrong" || status === "failed") && (
            <p className="small text-red" role="alert">
              {status === "wrong"
                ? t("That is not the current passphrase. Nothing was changed.")
                : t("This browser did not allow saving.")}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
