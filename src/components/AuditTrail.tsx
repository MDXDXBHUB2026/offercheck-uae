import { useEffect, useState } from "react";
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
    <section className="audit-trail" aria-label="Audit trail">
      {/* Outside the collapsed list, so a screen reader announces it. */}
      <p role="status">
        {failed ? "This browser could not add the latest step to the audit trail." : ""}
      </p>
      <details>
      <summary>
        Audit trail: {entries.length} {entries.length === 1 ? "entry" : "entries"}, {chainLabel(result)}
      </summary>
      <ol>
        {entries.map((entry) => (
          <li key={entry.hash}>
            <span className="audit-kind">{entry.kind}</span>{" "}
            <time dateTime={entry.at}>{entry.at}</time>{" "}
            {Object.entries(entry.data)
              .map(([key, value]) => `${key}: ${show(key, value)}`)
              .join("; ")}{" "}
            <code title={entry.hash}>{entry.hash.slice(0, HASH_SHOWN)}</code>
          </li>
        ))}
      </ol>
      </details>
    </section>
  );
}
