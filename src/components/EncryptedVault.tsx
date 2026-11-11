"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Copy, Eye, EyeOff, KeyRound, Lock, ScanSearch, Trash2 } from "lucide-react";
import { CrossChecksGroup, OfficialStepsGroup } from "@/components/CrossCheckGroups";
import { useLang, useT } from "@/components/shell/lang";
import { Button, ButtonLink, Callout, Card, Chip, cx } from "@/components/ui";
import { clearReopen, setReopen, useVaultState } from "@/components/vaultStore";
import type { UiLang } from "@/lib/i18n";
import { openVault, rememberCount, saveVault, TEXT_NOT_KEPT, type VaultRecord } from "@/lib/vault";
import { DecryptError } from "@/lib/vaultCrypto";

const LEVEL_TONE = { High: "high", Medium: "caution", Low: "green" } as const;

// Saved results live in this browser's storage only, so the page says what loses them.
export const VAULT_LOCAL_NOTE =
  "Saved results are kept only in this browser. They are lost if this browser's data is cleared, and they are not available on another device or browser.";

// The heading says "No saved results yet"; this line explains, without repeating it.
export const VAULT_EMPTY =
  "Run a check, then choose Save to Encrypted Vault on the result. You will choose your passphrase there. Offer Check cannot recover it.";

export { TEXT_NOT_KEPT };

function when(iso: string, lang: UiLang): string {
  const date = new Date(iso);
  const locale = lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB";
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

// The band wording saved with the record, or the wording built from the level for older records.
function bandOf(record: VaultRecord): string {
  return record.bandLabel ?? `${record.view.overall_risk_level} risk indicators`;
}

// Nothing saved in this browser: say how saving works, and go to the analyzer.
export function EmptyVault() {
  const t = useT();
  return (
    <Card as="section" className="empty stack-sm narrow" aria-labelledby="vault-empty-heading">
      <Lock className="icon icon-xl muted" aria-hidden="true" />
      <h2 id="vault-empty-heading" className="h3">
        {t("No saved results yet")}
      </h2>
      <p>{t(VAULT_EMPTY)}</p>
      <ButtonLink href="/check" variant="primary">
        <ScanSearch className="icon" aria-hidden="true" />
        {t("Go to the Offer Analyzer")}
      </ButtonLink>
    </Card>
  );
}

// The saved record's checked text, or, when it was not kept (decision 2h), a line that says so.
export function SavedText({ record }: { record: VaultRecord }) {
  const t = useT();
  return (
    <>
      <h3 className="label-caps">{t("Checked text")}</h3>
      {record.text !== undefined ? (
        <div className="source-text" dir="auto">
          {record.text}
        </div>
      ) : (
        <p className="small muted">{t(TEXT_NOT_KEPT)}</p>
      )}
    </>
  );
}

type Confirming = { kind: "one"; id: string } | { kind: "all" } | null;

// The reference app's Encrypted Vault: records saved with "Save to Encrypted Vault" on a result, encrypted
// with AES-256-GCM (a key derived from the passphrase with PBKDF2) and kept in this browser only.
// With nothing saved, an empty state replaces the unlock form. The passphrase and the opened records
// are held in memory while the vault is open and dropped on Lock; the passphrase is never stored.
// Saved text is shown as text only. Deleting asks first.
export function EncryptedVault() {
  const t = useT();
  const lang = useLang();
  const vault = useVaultState();
  const [passphrase, setPassphrase] = useState("");
  // Show or hide the passphrase while typing. Display only: the value is the same either way.
  const [showPass, setShowPass] = useState(false);
  const [records, setRecords] = useState<VaultRecord[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [status, setStatus] = useState<"idle" | "opening" | "wrong" | "failed" | "copied">("idle");

  async function unlock(event: FormEvent) {
    event.preventDefault();
    if (!passphrase.trim() || status === "opening") return;
    setStatus("opening");
    try {
      const opened = await openVault(passphrase);
      setRecords(opened);
      setSelected(opened[0]?.id ?? null);
      setStatus("idle");
      rememberCount(opened.length);
    } catch (error) {
      setStatus(error instanceof DecryptError ? "wrong" : "failed");
    }
  }

  // Lock vault: the opened records and the passphrase leave memory.
  function lock() {
    setRecords(null);
    setSelected(null);
    setConfirming(null);
    setPassphrase("");
    setShowPass(false);
    setStatus("idle");
    clearReopen();
  }

  async function remove(id: string | null) {
    if (!records) return;
    const next = id === null ? [] : records.filter((record) => record.id !== id);
    setConfirming(null);
    if (!(await saveVault(next, passphrase))) {
      setStatus("failed");
      return;
    }
    // Nothing left: the vault is gone, so the passphrase leaves memory and the empty state shows.
    if (next.length === 0) {
      lock();
      return;
    }
    setRecords(next);
    setSelected(next[0]?.id ?? null);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  const current = records?.find((record) => record.id === selected) ?? null;
  const count = Number(vault);

  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="green">
        <div className="stack-sm">
          <p className="eyebrow-pill">
            <Lock className="icon" aria-hidden="true" />
            <span>{t("AES-256-GCM, in this browser only")}</span>
          </p>
          <h1 id="page-title" className="h1">
            {t("Encrypted Vault")}
          </h1>
          <p className="lead">
            {t(
              "Results you save with Save to Encrypted Vault stay in this browser, encrypted with your passphrase. They are never sent anywhere. The passphrase is not stored: without it the records cannot be opened.",
            )}
          </p>
          <p className="small muted">{t(VAULT_LOCAL_NOTE)}</p>
        </div>
        {records && (
          <div className="hero-side">
            <Button variant="secondary" onClick={lock}>
              <Lock className="icon" aria-hidden="true" />
              {t("Lock vault")}
            </Button>
          </div>
        )}
      </section>

      {!records ? (
        vault === "pending" ? null : vault === "none" ? (
          <EmptyVault />
        ) : (
          <Card as="section" className="stack-sm narrow" aria-labelledby="unlock-heading">
            <span className="key-ring" aria-hidden="true">
              <KeyRound className="icon icon-xl text-green" />
            </span>
            <h2 id="unlock-heading" className="h3 unlock-title">
              {t("Open the vault")}
            </h2>
            {count > 0 && <p className="small muted">{t("Saved results: {0}", count)}</p>}
            <form className="stack-sm" onSubmit={unlock}>
              <div className="field">
                <label htmlFor="vault-open-pass">{t("Passphrase")}</label>
                <div className="pass-wrap">
                  <input
                    id="vault-open-pass"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    spellCheck={false}
                    value={passphrase}
                    onChange={(e) => {
                      setPassphrase(e.target.value);
                      if (status !== "idle") setStatus("idle");
                    }}
                  />
                  <button
                    type="button"
                    className="pass-toggle"
                    aria-pressed={showPass}
                    aria-controls="vault-open-pass"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <EyeOff className="icon" aria-hidden="true" /> : <Eye className="icon" aria-hidden="true" />}
                    <span className="visually-hidden">{t("Show passphrase")}</span>
                  </button>
                </div>
              </div>
              <Button type="submit" block large blocked={!passphrase.trim()} busy={status === "opening"}>
                <Lock className="icon" aria-hidden="true" />
                {t("Open")}
              </Button>
              <p className="small text-red" role="alert">
                {status === "wrong"
                  ? t("That passphrase does not open the vault saved in this browser.")
                  : status === "failed"
                    ? t("This browser did not allow reading the vault.")
                    : ""}
              </p>
              <p className="small muted">{t("Offer Check cannot recover a forgotten passphrase.")}</p>
            </form>
          </Card>
        )
      ) : records.length === 0 ? (
        <EmptyVault />
      ) : (
        <div className="vault-layout">
          <Card as="section" className="stack-sm" aria-label={t("Saved results")}>
            <ul className="stack-sm">
              {records.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    className="tab vault-item"
                    aria-pressed={record.id === selected}
                    onClick={() => {
                      setSelected(record.id);
                      setConfirming(null);
                    }}
                  >
                    <span className="sample-name" dir="auto">
                      {record.title}
                    </span>
                    <span className="small muted">
                      {t(bandOf(record))} · {t(record.channel)} · {when(record.savedAt, lang)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {confirming?.kind === "all" ? (
              <div className="stack-sm confirm-delete" role="group" aria-labelledby="delete-all-question">
                <p id="delete-all-question" className="small">
                  {t("Delete all saved results? This cannot be undone.")}
                </p>
                <div className="row">
                  <Button variant="danger" onClick={() => void remove(null)}>
                    {t("Delete all")}
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirming(null)}>
                    {t("Keep them")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirming({ kind: "all" })}>
                <Trash2 className="icon" aria-hidden="true" />
                {t("Delete all")}
              </Button>
            )}
          </Card>
          {current && (
            <Card
              as="section"
              tone={current.view.overall_risk_level === "High" ? "high" : current.view.overall_risk_level === "Medium" ? "medium" : "green"}
              className="stack-sm"
              aria-labelledby="record-heading"
            >
              <div className="row-between">
                <h2 id="record-heading" className="h3" dir="auto">
                  {current.title}
                </h2>
                <Chip tone={LEVEL_TONE[current.view.overall_risk_level]}>{t(bandOf(current))}</Chip>
              </div>
              <p className="small muted">
                {t(current.channel)} · {t("saved {0}", when(current.savedAt, lang))}
              </p>
              {current.notes && (
                <div className="stack-sm">
                  <h3 className="label-caps">{t("Notes")}</h3>
                  <p className="vault-notes" dir="auto">
                    {current.notes}
                  </p>
                </div>
              )}
              <p>{t(current.view.summary)}</p>
              {current.points && (
                <p className="small">
                  <strong>{t("Points")}:</strong> <span className="mono">{t(current.points)}</span>
                </p>
              )}
              {current.view.red_flags.length > 0 && (
                <ul className="stack-sm">
                  {current.view.red_flags.map((flag) => (
                    <li key={flag.check} className="card-sunken stack-sm">
                      <p className={cx("h3", flag.severity === "High" ? "text-red" : "text-amber")}>{t(flag.signal)}</p>
                      {flag.matched_text && (
                        <p className="quote" dir="auto">
                          {flag.matched_text}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {/* Saved with the result since 2026-11-11; a record saved earlier has neither group. */}
              {current.check && (
                <>
                  <CrossChecksGroup result={current.check.response} />
                  <OfficialStepsGroup result={current.check.response} />
                </>
              )}
              <SavedText record={current} />
              <div className="row">
                {current.check ? (
                  <Link href="/check" className="btn btn-primary" onClick={() => setReopen(current)}>
                    {t("View result")}
                    <ArrowRight className="icon sample-arrow" aria-hidden="true" />
                  </Link>
                ) : null}
                {current.text !== undefined && (
                  <Button variant="secondary" onClick={() => void copy(current.text ?? "")}>
                    <Copy className="icon" aria-hidden="true" />
                    {status === "copied" ? t("Copied") : t("Copy text")}
                  </Button>
                )}
                {!(confirming?.kind === "one" && confirming.id === current.id) && (
                  <Button variant="danger" onClick={() => setConfirming({ kind: "one", id: current.id })}>
                    <Trash2 className="icon" aria-hidden="true" />
                    {t("Delete")}
                  </Button>
                )}
              </div>
              {!current.check && (
                <p className="small muted">
                  {t("This result was saved before View result was added, so it cannot be opened in the analyzer.")}
                </p>
              )}
              {confirming?.kind === "one" && confirming.id === current.id && (
                <div className="stack-sm confirm-delete" role="group" aria-labelledby="delete-one-question">
                  <p id="delete-one-question" className="small">
                    {t("Delete this saved result? This cannot be undone.")}
                  </p>
                  <div className="row">
                    <Button variant="danger" onClick={() => void remove(current.id)}>
                      {t("Delete")}
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirming(null)}>
                      {t("Keep it")}
                    </Button>
                  </div>
                </div>
              )}
              {status === "failed" && (
                <Callout tone="high" role="alert">
                  <p>{t("This browser did not allow that.")}</p>
                </Callout>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
