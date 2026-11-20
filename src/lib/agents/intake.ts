// Hidden characters can split a phrase ("visa<zero-width space> fee") so a rule misses it.
// Every character here is an escape sequence, so this file holds no invisible characters.
const HIDDEN_CHARS = new RegExp(
  [
    "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", // C0 controls, except tab, newline, return
    "[\\u007F-\\u009F]", // DEL and C1 controls
    "\\u00AD", // soft hyphen
    "\\u034F", // combining grapheme joiner (QA-6)
    "\\u180E", // Mongolian vowel separator (QA-6)
    "[\\u200B-\\u200F]", // zero-width characters and direction marks
    "[\\u202A-\\u202E]", // bidi embedding and override controls
    "[\\u2060-\\u2064]", // word joiner, invisible function application, times, separator, plus (QA-6)
    "[\\u2066-\\u2069]", // bidi isolate controls
    "\\uFE0F", // variation selector 16 (QA-6)
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

// QA-6: look-alike letters, for matching only. Every entry maps one UTF-16 unit to one, so the
// folded text has the same length as the text as typed and a match maps back to the words as typed.
// The look-alike letters below, and the ranges in FULLWIDTH and CYRILLIC_OR_GREEK, are typed as the
// characters themselves, not as escape sequences, so this file does hold Cyrillic, Greek and fullwidth
// characters. The comment above each group names the Latin letters it maps to. None is invisible.
const LOOK_ALIKES: Record<string, string> = Object.fromEntries(
  [
    // Cyrillic lower case: a e o p c y x i j s h d q w l
    ["а", "a"], ["е", "e"], ["о", "o"], ["р", "p"], ["с", "c"], ["у", "y"],
    ["х", "x"], ["і", "i"], ["ј", "j"], ["ѕ", "s"], ["һ", "h"], ["ԁ", "d"],
    ["ԛ", "q"], ["ԝ", "w"], ["ӏ", "l"],
    // Cyrillic upper case: A B E K M H O P C T X Y I J S
    ["А", "A"], ["В", "B"], ["Е", "E"], ["К", "K"], ["М", "M"], ["Н", "H"],
    ["О", "O"], ["Р", "P"], ["С", "C"], ["Т", "T"], ["Х", "X"], ["Ү", "Y"],
    ["І", "I"], ["Ј", "J"], ["Ѕ", "S"],
    // Greek lower case: a o v i k p u
    ["α", "a"], ["ο", "o"], ["ν", "v"], ["ι", "i"], ["κ", "k"], ["ρ", "p"],
    ["υ", "u"],
    // Greek upper case: A B E Z H I K M N O P T Y X
    ["Α", "A"], ["Β", "B"], ["Ε", "E"], ["Ζ", "Z"], ["Η", "H"], ["Ι", "I"],
    ["Κ", "K"], ["Μ", "M"], ["Ν", "N"], ["Ο", "O"], ["Ρ", "P"], ["Τ", "T"],
    ["Υ", "Y"], ["Χ", "X"],
  ],
);
const FULLWIDTH = /[！-～]/g;
const WORD = /[\p{L}\p{N}]+/gu;
const LATIN_LETTER = /[A-Za-z]/;
const CYRILLIC_OR_GREEK = /[Ͱ-ϿЀ-ԯ]/;

// The text the rules match against. Fullwidth letters, digits and signs become ASCII. A Cyrillic or
// Greek look-alike becomes its Latin letter only inside a word that also has Latin letters, so a
// word written wholly in Russian or Greek, and all Arabic and Hindi text, comes out unchanged. The
// person sees, and every quote shows, the text as typed: this copy is never shown.
export function foldForMatching(text: string): string {
  const ascii = text.replace(FULLWIDTH, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
  return ascii.replace(WORD, (word) =>
    LATIN_LETTER.test(word) && CYRILLIC_OR_GREEK.test(word)
      ? word.replace(/./g, (char) => LOOK_ALIKES[char] ?? char)
      : word,
  );
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
