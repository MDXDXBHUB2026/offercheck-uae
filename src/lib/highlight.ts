// "Interactive Source Text Highlights": split the checked text into plain parts and marked parts, one
// mark per evidence quote, found in the text itself. Pure; the UI renders every part as text (React
// text nodes), never as HTML, so offer text cannot inject markup.

export type MarkLevel = "High" | "Medium" | "Low";
export type MarkSpec = { quote: string; level: MarkLevel; label: string };
export type Part = { text: string; mark?: { level: MarkLevel; label: string } };

// Quotes this short would mark common words, as in the reference app.
const MIN_QUOTE = 3;

function find(haystack: string, needle: string): number {
  const lowerHay = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  // Lower-casing can change the length of some characters; then only an exact match is safe.
  if (lowerHay.length === haystack.length && lowerNeedle.length === needle.length) {
    return lowerHay.indexOf(lowerNeedle);
  }
  return haystack.indexOf(needle);
}

// Each quote marks its first occurrence in a part not already marked. Earlier specs win overlaps.
export function highlightParts(text: string, specs: readonly MarkSpec[]): Part[] {
  let parts: Part[] = [{ text }];
  for (const spec of specs) {
    const quote = spec.quote.trim();
    if (quote.length < MIN_QUOTE) continue;
    let placed = false;
    const next: Part[] = [];
    for (const part of parts) {
      if (placed || part.mark) {
        next.push(part);
        continue;
      }
      const at = find(part.text, quote);
      if (at === -1) {
        next.push(part);
        continue;
      }
      placed = true;
      if (at > 0) next.push({ text: part.text.slice(0, at) });
      next.push({ text: part.text.slice(at, at + quote.length), mark: { level: spec.level, label: spec.label } });
      if (at + quote.length < part.text.length) next.push({ text: part.text.slice(at + quote.length) });
    }
    parts = next;
  }
  return parts;
}
