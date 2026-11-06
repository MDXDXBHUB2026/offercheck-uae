// Hidden characters can split a phrase ("visa<zero-width space> fee") so a rule misses it.
// Every character here is an escape sequence, so this file holds no invisible characters.
const HIDDEN_CHARS = new RegExp(
  [
    "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", // C0 controls, except tab, newline, return
    "[\\u007F-\\u009F]", // DEL and C1 controls
    "\\u00AD", // soft hyphen
    "[\\u200B-\\u200F]", // zero-width characters and direction marks
    "[\\u202A-\\u202E]", // bidi embedding and override controls
    "\\u2060", // word joiner
    "[\\u2066-\\u2069]", // bidi isolate controls
    "\\uFEFF", // byte order mark
  ].join("|"),
  "g",
);
const NON_BREAKING_SPACES = /[\u00A0\u2007\u202F]/g;
const LINE_ENDINGS = /\r\n?|[\u2028\u2029]/g;

const SPACES_ONLY_LINE = /\n[ \t]+(?=\n)/g;
// A hard wrap can split a sentence, so a single line break becomes a space. Blank lines stay. So do
// breaks before a list row, a label row or an ask, and after a one-word heading, which are separate
// items: "Visa fee: paid by employer" must not join and clear "Training fee: AED 500" below it.
const HARD_WRAP =
  /(?<!\n)(?<!^\S+[ \t]*)\n(?!\n|[ \t]*(?:[-*•][ \t]|\d+[.)][ \t]|[a-z][\w /-]{0,30}:|(?:pay|transfer|deposit|remit|send|share)\b))/gim;

export type CleanedOffer = {
  text: string;
  hiddenCharsRemoved: number;
};

// A simple text cleaner for now. It treats the offer as data and adds nothing to it.
export function cleanOfferText(rawText: string): CleanedOffer {
  const visible = rawText.replace(HIDDEN_CHARS, "");
  const text = visible
    .replace(LINE_ENDINGS, "\n")
    .replace(NON_BREAKING_SPACES, " ")
    .trim()
    .replace(SPACES_ONLY_LINE, "\n")
    .replace(HARD_WRAP, " ");
  return { text, hiddenCharsRemoved: rawText.length - visible.length };
}
