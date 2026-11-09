// COPY-1: the limitations a visitor sees, in plain language. One item per bullet under "What this
// check cannot do" in the internal limitations doc, which keeps the technical detail. A test keeps
// the counts equal and bans file paths, defect ids, phase names, backticks and non-ASCII text here.
export type PublicLimit = { title: string; text: string };

export const LIMITS_SECTION = "What this check cannot do";

export const PUBLIC_LIMITS_INTRO =
  'Offer Check is an early prototype that reads English text only. A low score, or "No risk indicators found", does not mean an offer is genuine.';

export const PUBLIC_LIMITS: PublicLimit[] = [
  {
    title: "Some honest offers can score high.",
    text: 'Unusual wording about who pays a fee can still be flagged as a fee request, for example when an offer says the company "sponsors" or "arranges" your visa and medical fees, or names the company in an earlier sentence.',
  },
  {
    title: "A request for a code can be missed.",
    text: "It may not be flagged when it is worded indirectly, such as asking what number you received by text message, or when it asks you to type the code into a form without mentioning a link.",
  },
  {
    title: "Look-alike letters can hide words.",
    text: "Some letters from other alphabets look like English letters. If a message uses them, the check can miss the words they appear in.",
  },
  {
    title: "A request for a photo of a card can be missed.",
    text: "It may not be flagged if it does not say which kind of card, such as a bank, debit or credit card, and does not mention a card detail, such as the CVV, the expiry date or both sides, in the same sentence. A request for a video of a card can also be missed.",
  },
  {
    title: "The check is built for job offers.",
    text: "When a low-scoring text shows no sign of a job offer, such as a role, a salary or an employer, a notice says so. The score still comes only from the fixed rules.",
  },
  {
    title: "Other languages typed in English letters are only partly detected.",
    text: "A word check catches common Hindi, Urdu, Arabic, Tagalog, Malayalam, Bengali, Tamil and French words written in English letters, and then shows the text as not checked. Messages under 6 words, and languages it has no words for, can still look like English to the check.",
  },
  {
    title: "The language check uses simple cut-offs.",
    text: "Text counts as not English when at least half of its letters come from another alphabet, or when too few of its words are common English words or too many are common words from other languages. Fewer such letters or words, but still some, mark it as partly English. Very short non-English text, such as a single name, may get no notice. The cut-offs are a design choice and have not been tested on real offers.",
  },
  {
    title: "Look-alike letters can also keep the language notice away.",
    text: "A few of them stay below the cut-off, so no notice is shown.",
  },
];
