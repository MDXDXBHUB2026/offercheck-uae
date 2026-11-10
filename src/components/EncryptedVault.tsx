"use client";

import { useState, type FormEvent } from "react";
import { Copy, Eye, EyeOff, KeyRound, Lock, Trash2 } from "lucide-react";
import { Button, Callout, Card, Chip, cx } from "@/components/ui";
import { openVault, saveVault, type VaultRecord } from "@/lib/vault";
import { DecryptError } from "@/lib/vaultCrypto";

const LEVEL_TONE = { High: "high", Medium: "caution", Low: "green" } as const;

function when(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

// The reference app's Encrypted Vault: records saved with "Save Encrypted" on a result, encrypted
// with AES-256-GCM (a key derived from the passphrase with PBKDF2) and kept in this browser only.
// The passphrase is held in memory while the vault is open and dropped on Lock; it is never stored.
// Saved text is shown as text only.
export function EncryptedVault() {
  const [passphrase, setPassphrase] = useState("");
  // Show or hide the passphrase while typing. Display only: the value is the same either way.
  const [showPass, setShowPass] = useState(false);
  const [records, setRecords] = useState<VaultRecord[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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
    } catch (error) {
      setStatus(error instanceof DecryptError ? "wrong" : "failed");
    }
  }

  function lock() {
    setRecords(null);
    setSelected(null);
    setPassphrase("");
    setShowPass(false);
    setStatus("idle");
  }

  async function remove(id: string | null) {
    if (!records) return;
    const next = id === null ? [] : records.filter((record) => record.id !== id);
    if (!(await saveVault(next, passphrase))) {
      setStatus("failed");
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

  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="green">
        <div className="stack-sm">
          <p className="eyebrow-pill">
            <Lock className="icon" aria-hidden="true" />
            <span>AES-256-GCM, in this browser only</span>
          </p>
          <h1 id="page-title" className="h1">
            Encrypted Vault
          </h1>
          <p className="lead">
            Results you save with Save Encrypted stay in this browser, encrypted with your passphrase. They are never
            sent anywhere. The passphrase is not stored: without it the records cannot be opened.
          </p>
        </div>
        {records && (
          <div className="hero-side">
            <Button variant="secondary" onClick={lock}>
              <Lock className="icon" aria-hidden="true" />
              Lock
            </Button>
          </div>
        )}
      </section>

      {!records ? (
        <Card as="section" className="stack-sm narrow" aria-labelledby="unlock-heading">
          <span className="key-ring" aria-hidden="true">
            <KeyRound className="icon icon-xl text-green" />
          </span>
          <h2 id="unlock-heading" className="h3 unlock-title">
            Open the vault
          </h2>
          <form className="stack-sm" onSubmit={unlock}>
            <div className="field">
              <label htmlFor="vault-open-pass">Passphrase</label>
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
                  <span className="visually-hidden">Show passphrase</span>
                </button>
              </div>
            </div>
            <Button type="submit" block large blocked={!passphrase.trim()} busy={status === "opening"}>
              <Lock className="icon" aria-hidden="true" />
              Open
            </Button>
            <p className="small text-red" role="alert">
              {status === "wrong"
                ? "That passphrase does not open the vault saved in this browser."
                : status === "failed"
                  ? "This browser did not allow reading the vault."
                  : ""}
            </p>
            <p className="small muted">With nothing saved yet, any passphrase opens an empty vault.</p>
          </form>
        </Card>
      ) : records.length === 0 ? (
        <Card className="empty stack-sm">
          <Lock className="icon icon-xl muted" aria-hidden="true" />
          <p>The vault is empty. Check an offer, then choose Save Encrypted on the result.</p>
        </Card>
      ) : (
        <div className="vault-layout">
          <Card as="section" className="stack-sm" aria-label="Saved results">
            <ul className="stack-sm">
              {records.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    className="tab vault-item"
                    aria-pressed={record.id === selected}
                    onClick={() => setSelected(record.id)}
                  >
                    <span className="sample-name">{record.title}</span>
                    <span className="small muted">{when(record.savedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="danger" onClick={() => void remove(null)}>
              <Trash2 className="icon" aria-hidden="true" />
              Delete all
            </Button>
          </Card>
          {current && (
            <Card as="section" tone={current.view.overall_risk_level === "High" ? "high" : current.view.overall_risk_level === "Medium" ? "medium" : "green"} className="stack-sm" aria-labelledby="record-heading">
              <div className="row-between">
                <h2 id="record-heading" className="h3">
                  {current.title}
                </h2>
                <Chip tone={LEVEL_TONE[current.view.overall_risk_level]} upper>
                  Score {current.view.score} / 100
                </Chip>
              </div>
              <p className="small muted">
                {current.channel} · saved {when(current.savedAt)}
              </p>
              <p>{current.view.summary}</p>
              {current.view.red_flags.length > 0 && (
                <ul className="stack-sm">
                  {current.view.red_flags.map((flag) => (
                    <li key={flag.check} className="card-sunken stack-sm">
                      <p className={cx("h3", flag.severity === "High" ? "text-red" : "text-amber")}>{flag.signal}</p>
                      {flag.matched_text && <p className="quote">{flag.matched_text}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <h3 className="label-caps">Checked text</h3>
              <div className="source-text" dir="auto">
                {current.text}
              </div>
              <div className="row">
                <Button variant="secondary" onClick={() => void copy(current.text)}>
                  <Copy className="icon" aria-hidden="true" />
                  {status === "copied" ? "Copied" : "Copy text"}
                </Button>
                <Button variant="danger" onClick={() => void remove(current.id)}>
                  <Trash2 className="icon" aria-hidden="true" />
                  Delete
                </Button>
              </div>
              {status === "failed" && (
                <Callout tone="high" role="alert">
                  <p>This browser did not allow that.</p>
                </Callout>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
