import { useEffect, useState } from "react";
import { Chip, Disclosure, type ChipTone } from "@/components/ui";
import { verifyAuditLog, type AuditEntry, type AuditValue, type ChainCheck } from "@/lib/audit";

const HASH_SHOWN = 12;

// The same wording as the Agent run panel, so a stub never reads as done.
const STATUS_LABELS: Record<string, string> = {
  completed: "completed",
  not_implemented: "not implemented yet",
};

function show(key: string, value: AuditValue): string {
  if (Array.isArray(value)) return value.length === 0 ? "none" : value.join(", ");
  if (key === "status" && typeof value === "string") return STATUS_LABELS[value] ?? value;
  return value === null ? "n/a" : String(value);
}

function chainLabel(check: ChainCheck | null): string {
  if (!check) return "checking the chain";
  return check.ok ? "chain verified" : `chain broken at entry ${check.brokenAt + 1}`;
}

function chainTone(check: ChainCheck | null): ChipTone {
  if (!check) return "neutral";
  return check.ok ? "success" : "high";
}

// The time part of the ISO timestamp, in UTC, as recorded.
function clock(at: string): string {
  const match = /T(\d{2}:\d{2}:\d{2})/.exec(at);
  return match ? `${match[1]} UTC` : at;
}

// Shows only what the log holds: ids, counts, statuses and decisions. It never holds offer or
// draft text, so there is nothing private to show.
export function AuditTrail({ entries, failed }: { entries: AuditEntry[]; failed?: boolean }) {
  const [check, setCheck] = useState<{ entries: AuditEntry[]; result: ChainCheck } | null>(null);

  useEffect(() => {
    let current = true;
    verifyAuditLog(entries).then(
      (result) => current && setCheck({ entries, result }),
      () => current && setCheck({ entries, result: { ok: false, brokenAt: 0 } }),
    );
    return () => {
      current = false;
    };
  }, [entries]);

  const result = check?.entries === entries ? check.result : null;
  return (
    <section className="block audit-trail" aria-label="Audit trail">
      {/* Outside the collapsed list, so a screen reader announces it. */}
      <p className="audit-failed" role="status">
        {failed ? "This browser could not add the latest step to the audit trail." : ""}
      </p>
      <Disclosure
        summary={
          <>
            <span className="audit-title">Audit trail</span>
            <span className="audit-count">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
            <Chip tone={chainTone(result)}>{chainLabel(result)}</Chip>
          </>
        }
      >
        <ol>
          {entries.map((entry) => (
            <li key={entry.hash}>
              <span className="audit-kind">{entry.kind}</span>
              <time dateTime={entry.at} title={entry.at}>
                {clock(entry.at)}
              </time>
              <span className="audit-data">
                {Object.entries(entry.data)
                  .map(([key, value]) => `${key}: ${show(key, value)}`)
                  .join("; ")}
              </span>
              <code title={entry.hash}>{entry.hash.slice(0, HASH_SHOWN)}</code>
            </li>
          ))}
        </ol>
      </Disclosure>
    </section>
  );
}
