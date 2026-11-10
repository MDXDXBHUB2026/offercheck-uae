"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { addToVault, SAVED_TEXT_MAX, type VaultRecord } from "@/lib/vault";
import { DecryptError } from "@/lib/vaultCrypto";
import type { ResultView } from "@/lib/resultView";
import { useT } from "@/components/shell/lang";

// "Save Encrypted": the passphrase prompt from the reference app. The passphrase is used once to
// encrypt and is never stored. The saved text is the text that was checked (after Auto-Redact),
// cut to SAVED_TEXT_MAX characters. Fixed messages only: no offer text in any message.
export function SaveVaultModal({
  view,
  channel,
  checkedText,
  onClose,
}: {
  view: ResultView;
  channel: string;
  checkedText: string;
  onClose: () => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "wrong" | "failed">("idle");
  const input = useRef<HTMLInputElement>(null);
  const t = useT();

  useEffect(() => {
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!passphrase.trim() || status === "saving") return;
    setStatus("saving");
    const record: VaultRecord = {
      id: globalThis.crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      title: `${view.overall_risk_level} risk indicators, ${channel}`,
      channel,
      text: Array.from(checkedText).slice(0, SAVED_TEXT_MAX).join(""),
      view,
    };
    try {
      await addToVault(record, passphrase);
      setPassphrase("");
      setStatus("saved");
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
        {status === "saved" ? (
          <div className="stack-sm" role="status">
            <p>{t("Saved. Open it from the Encrypted Vault tab with the same passphrase.")}</p>
            <Button variant="secondary" onClick={onClose}>
              {t("Close")}
            </Button>
          </div>
        ) : (
          <form className="stack-sm" onSubmit={save}>
            <p className="small muted">
              {t(
                "The result and the checked text are encrypted with AES-256-GCM in this browser and kept only here. The passphrase is not stored; if you forget it, the saved records cannot be opened.",
              )}
            </p>
            <div className="field">
              <label htmlFor="vault-pass">{t("Passphrase")}</label>
              <input
                id="vault-pass"
                ref={input}
                type="password"
                autoComplete="new-password"
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  if (status !== "idle") setStatus("idle");
                }}
              />
            </div>
            <p className="small text-red" role="alert">
              {status === "wrong"
                ? t("That passphrase does not open the vault already saved in this browser.")
                : status === "failed"
                  ? t("This browser did not allow saving.")
                  : ""}
            </p>
            <div className="row">
              <Button variant="secondary" onClick={onClose}>
                {t("Cancel")}
              </Button>
              <Button type="submit" blocked={!passphrase.trim()} busy={status === "saving"}>
                {t("Encrypt and save")}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
