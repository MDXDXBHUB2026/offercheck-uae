// UX-3: the footer's "What this check cannot do" link opens the limitations' details element on
// the check page. Plain functions, so a test can run them on a stand-in document.
export const LIMITS_ID = "limits";

type Doc = { getElementById(id: string): unknown };

// Opens the details element with LIMITS_ID. Returns false when the page has none.
export function openLimits(doc: Doc): boolean {
  const element = doc.getElementById(LIMITS_ID);
  if (typeof element !== "object" || element === null || !("open" in element)) return false;
  (element as { open: boolean }).open = true;
  return true;
}

// On arrival with #limits (a page load, or back and forward), open it. Any other hash: no change.
export function syncLimitsToHash(doc: Doc, hash: string): void {
  if (hash === `#${LIMITS_ID}`) openLimits(doc);
}
