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

// GAP-5: a line that says the employer pays is a whole statement. When the next line starts a new
// sentence (a capital letter), the break stays, so "Flights are paid by the company" cannot join and
// clear "You settle the medical fee of AED 400" below it. A lower-case next line still joins.
const EMPLOYER_PAYS_LINE =
  /\b(?:covered|borne|paid|sponsored|waived)\s+(?:(?:directly|fully|entirely|for)\s+)?by\s+(?:(?:the|our|your)\s+)?(?:\w+\s+)?(?:company|employer|us|sponsor)\b|\b(?:company|employer|we)\s+(?:will\s+|shall\s+)?(?:covers?|pays?|bears?|sponsors?)\b|\b(?:is|are|will\s+be)\s+(?:covered|waived|sponsored)\b|\bfree of charge\b|\bat no cost\b/i;
const NEW_SENTENCE = /^[ \t]*[A-Z]/;

function joinHardWraps(text: string): string {
  return text.replace(HARD_WRAP, (_match, offset: number) => {
    const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
    const keep =
      NEW_SENTENCE.test(text.slice(offset + 1, offset + 3)) &&
      EMPLOYER_PAYS_LINE.test(text.slice(lineStart, offset));
    return keep ? "\n" : " ";
  });
}

export type CleanedOffer = {
  text: string;
  hiddenCharsRemoved: number;
};

// A simple text cleaner for now. It treats the offer as data and adds nothing to it.
export function cleanOfferText(rawText: string): CleanedOffer {
  const visible = rawText.replace(HIDDEN_CHARS, "");
  const text = joinHardWraps(
    visible.replace(LINE_ENDINGS, "\n").replace(NON_BREAKING_SPACES, " ").trim().replace(SPACES_ONLY_LINE, "\n"),
  );
  return { text, hiddenCharsRemoved: rawText.length - visible.length };
}
