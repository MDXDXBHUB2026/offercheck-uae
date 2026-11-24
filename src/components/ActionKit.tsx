"use client";

import { useState } from "react";
import { Copy, Download, ExternalLink, MessageCircle, Send } from "lucide-react";
import { MissedScamLink } from "@/components/MissedScamLink";
import { useT } from "@/components/shell/lang";
import { Button, Card } from "@/components/ui";
import { mainChannels } from "@/lib/authorities";
import {
  buildReportText,
  KIT_CHANNELS,
  KIT_CHANNEL_LABEL,
  KIT_COPIED,
  KIT_COPY_FAILED,
  KIT_COPY_REPORT,
  KIT_DOWNLOAD,
  KIT_DOWNLOADED,
  KIT_DOWNLOAD_FAILED,
  KIT_INTRO,
  KIT_LINKS_HEADING,
  KIT_NOTE_HELP,
  KIT_NOTE_LABEL,
  KIT_REPLY_HEADING,
  KIT_REPLY_HELP,
  KIT_REPORT_HEADING,
  KIT_REPORT_HELP,
  KIT_TITLE,
  NOTE_MAX,
  REPLY_TEMPLATES,
  SUMMARY_FILE_NAME,
  type KitChannel,
} from "@/lib/actionKit";
import type { RiskBand } from "@/lib/types";

// Production Phase 6 (owner decision, 2026-11-23): shown under every result, in every band. It is
// built in this browser from the result already on the page (the band wording and the names of the
// findings that fired, never their quotes) and the person's own picks. No network call, no storage,
// nothing sent or opened automatically: each button copies text to the clipboard or saves a .txt
// that the person asked for. The text logic is in src/lib/actionKit.ts.

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// The browser saves the file: a same-page download of an in-memory blob, never a network request.
function saveTextFile(text: string, name: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}

type Status = { text: string; ok: boolean } | null;

export function ActionKit({
  band,
  bandLabel,
  checks,
  defaultChannel,
}: {
  band: RiskBand;
  // The wording the result's chip shows.
  bandLabel: string;
  // The check ids of the findings that counted toward the score.
  checks: readonly string[];
  defaultChannel: KitChannel;
}) {
  const t = useT();
  const [channel, setChannel] = useState<KitChannel>(defaultChannel);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const channels = mainChannels();

  const reportText = () => buildReportText({ band, bandLabel, checks, channel, note }, t);

  async function copy(text: string) {
    const ok = await copyText(text);
    setStatus({ text: ok ? KIT_COPIED : KIT_COPY_FAILED, ok });
  }

  function download() {
    const ok = saveTextFile(reportText(), SUMMARY_FILE_NAME);
    setStatus({ text: ok ? KIT_DOWNLOADED : KIT_DOWNLOAD_FAILED, ok });
  }

  return (
    <Card as="section" className="stack kit no-print" aria-labelledby="kit-heading" id="action-kit">
      <div className="stack-sm">
        <h2 id="kit-heading" className="h3 row">
          <Send className="icon text-green" aria-hidden="true" />
          <span>{t(KIT_TITLE)}</span>
        </h2>
        <p className="small muted">{t(KIT_INTRO)}</p>
      </div>

      <div className="stack-sm kit-part">
        <h3 className="h3">{t(KIT_REPORT_HEADING)}</h3>
        <p className="small muted">{t(KIT_REPORT_HELP)}</p>
        <div className="field">
          <label htmlFor="kit-channel">{t(KIT_CHANNEL_LABEL)}</label>
          <select id="kit-channel" value={channel} onChange={(event) => setChannel(event.target.value as KitChannel)}>
            {KIT_CHANNELS.map((option) => (
              <option key={option} value={option}>
                {t(option)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="kit-note">{t(KIT_NOTE_LABEL)}</label>
          <textarea
            id="kit-note"
            className="kit-note"
            value={note}
            maxLength={NOTE_MAX}
            aria-describedby="kit-note-help"
            onChange={(event) => setNote(event.target.value)}
          />
          <p id="kit-note-help" className="small muted">
            {t(KIT_NOTE_HELP)}
          </p>
        </div>
        <div className="kit-actions">
          <Button onClick={() => void copy(reportText())}>
            <Copy className="icon" aria-hidden="true" />
            {t(KIT_COPY_REPORT)}
          </Button>
          <Button variant="secondary" onClick={download}>
            <Download className="icon" aria-hidden="true" />
            {t(KIT_DOWNLOAD)}
          </Button>
        </div>
      </div>

      <div className="stack-sm kit-part">
        <h3 className="h3 row">
          <MessageCircle className="icon text-green" aria-hidden="true" />
          <span>{t(KIT_REPLY_HEADING)}</span>
        </h3>
        <p className="small muted">{t(KIT_REPLY_HELP)}</p>
        <ul className="stack-sm kit-replies">
          {REPLY_TEMPLATES.map((reply) => (
            <li key={reply.id} className="card-sunken stack-sm kit-reply">
              <p className="kit-reply-text">{t(reply.text)}</p>
              <Button variant="secondary" block onClick={() => void copy(t(reply.text))}>
                <Copy className="icon" aria-hidden="true" />
                {t(reply.label)}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* One live region for every copy and download result; always in the page, so it is announced. */}
      <p role="status" className={status && !status.ok ? "small kit-status kit-status-failed" : "small kit-status"}>
        {status ? t(status.text) : ""}
      </p>

      <div className="stack-sm kit-part">
        <h3 className="h3">{t(KIT_LINKS_HEADING)}</h3>
        <ul className="stack-sm small kit-links">
          {channels.map((entry) => (
            <li key={entry.id}>
              <a href={entry.url} target="_blank" rel="noopener noreferrer">
                {t(entry.name)} <ExternalLink className="icon" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <MissedScamLink />
      </div>
    </Card>
  );
}
