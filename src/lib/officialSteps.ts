// Official-channel v1 (2026-11-11): a typed, deterministic mapping from finding and cross-check ids
// to entries that already exist, the eight warning signs (src/lib/warningSigns.ts), the reporting
// channels (src/lib/authorities.ts) and the UAE contacts (src/data/uaeContacts.ts). No guidance
// text is written here: each item shows its entry's own words and links its official source. The
// loader refuses an entry without an https source URL. "Last checked" is shown only where the entry
// already holds a date. A finding with no mapping gets nothing. Client-safe: plain data, no rules.
import { UAE_CONTACTS, type UaeContact } from "@/data/uaeContacts";
import { AUTHORITIES } from "@/lib/authorities";
import { WARNING_SIGNS, WARNING_SIGNS_SOURCE } from "@/lib/warningSigns";
import type { OfficialStepRef } from "@/lib/types";

// "sign:<id>", "authority:<id>" or "contact:<id>".
export type StepKey = `sign:${string}` | `authority:${string}` | `contact:${UaeContact["id"]}`;

// Which existing entries apply to which finding or cross-check id. Ids not listed get nothing.
export const STEP_MAP: Readonly<Record<string, readonly StepKey[]>> = {
  "RF-001": ["sign:recruitment-fees", "contact:mohre"],
  "RF-002": ["authority:moi_ecrimes", "contact:ecrime"],
  "RF-003": ["sign:offer-letter"],
  "RF-004": ["sign:reference-number"],
  "RF-005": ["sign:company-lookup"],
  "V-01": ["sign:company-lookup"],
  "V-02": ["authority:mohre_verify"],
  "V-03": ["contact:ecrime"],
  "V-04": ["sign:offer-letter"],
  "V-05": ["sign:offer-letter"],
  // A UAE authority named in the text, even in a plain mention (owner decision, 2026-11-11): its own
  // existing entry, with no cross-check. Dubai Police has no entry for this, so it gets nothing.
  "mention:mohre": ["authority:mohre_verify"],
  "mention:icp": ["contact:icp"],
  "mention:gdrfa": ["contact:amer"],
};

// The plain name of an authority-mention id, for "For: …" under an official step.
export const MENTION_LABELS: Readonly<Record<string, string>> = {
  "mention:mohre": "MoHRE is named in the text",
  "mention:icp": "ICP is named in the text",
  "mention:gdrfa": "GDRFA or Amer is named in the text",
};

// What the interface shows for one step: the entry's own words and its official source.
export type OfficialStep = {
  key: StepKey;
  title: string;
  text: string;
  sourceName: string;
  sourceUrl: string;
  // ISO date, only where the entry already holds one.
  lastChecked?: string;
};

const HTTPS = /^https:\/\/\S+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function raw(key: string): Partial<OfficialStep> | null {
  const [kind, id] = key.split(":");
  if (kind === "sign") {
    const sign = WARNING_SIGNS.find((entry) => entry.id === id);
    return sign
      ? {
          title: sign.sign,
          text: sign.whatToDo,
          sourceName: `${WARNING_SIGNS_SOURCE.publisher}, “${WARNING_SIGNS_SOURCE.title}”`,
          sourceUrl: WARNING_SIGNS_SOURCE.url,
          lastChecked: WARNING_SIGNS_SOURCE.verified,
        }
      : null;
  }
  if (kind === "authority") {
    const entry = AUTHORITIES.find((item) => item.id === id);
    return entry
      ? { title: entry.name, text: entry.purpose, sourceName: entry.sourceName, sourceUrl: entry.sourceUrl, lastChecked: entry.lastVerified }
      : null;
  }
  if (kind === "contact") {
    const entry = UAE_CONTACTS.find((item) => item.id === id);
    // The contacts file holds no per-entry date, so none is shown.
    return entry ? { title: entry.name, text: entry.purpose, sourceName: entry.name, sourceUrl: entry.url } : null;
  }
  return null;
}

// The loader: an entry is used only with a title, a text and an https source URL. A date that is
// not an ISO date is dropped, never guessed.
export function loadStep(key: string, read: (key: string) => Partial<OfficialStep> | null = raw): OfficialStep | null {
  const entry = read(key);
  if (!entry || !entry.title || !entry.text || !entry.sourceName || !HTTPS.test(entry.sourceUrl ?? "")) return null;
  return {
    key: key as StepKey,
    title: entry.title,
    text: entry.text,
    sourceName: entry.sourceName,
    sourceUrl: entry.sourceUrl as string,
    ...(entry.lastChecked && ISO_DATE.test(entry.lastChecked) ? { lastChecked: entry.lastChecked } : {}),
  };
}

// The Official-channel step: for the given ids (red-flag rule ids, cross-check ids, then the
// authority-mention ids), the
// entries that apply, each once, in order of first use, with the ids it is shown for.
export function selectOfficialSteps(ids: readonly string[]): OfficialStepRef[] {
  const out: OfficialStepRef[] = [];
  for (const id of ids) {
    for (const key of STEP_MAP[id] ?? []) {
      if (!loadStep(key)) continue;
      const existing = out.find((step) => step.key === key);
      if (existing) {
        if (!existing.forIds.includes(id)) existing.forIds.push(id);
      } else out.push({ key, forIds: [id] });
    }
  }
  return out;
}

// For the interface and saved records: refs that no longer resolve (or are malformed) are dropped.
export function resolveSteps(refs: unknown): (OfficialStep & { forIds: string[] })[] {
  if (!Array.isArray(refs)) return [];
  return refs.flatMap((ref) => {
    if (typeof ref !== "object" || ref === null) return [];
    const { key, forIds } = ref as Record<string, unknown>;
    if (typeof key !== "string" || !Array.isArray(forIds) || !forIds.every((id) => typeof id === "string")) return [];
    const step = loadStep(key);
    return step ? [{ ...step, forIds: forIds as string[] }] : [];
  });
}
