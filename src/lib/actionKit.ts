// The Action & Report Kit (production Phase 6, owner decision 2026-11-23): replaces the saved-results
// feature. Everything here is plain, deterministic text built in the browser from the check the person
// just ran. Nothing is sent, stored or opened automatically, and there is no network call.
//
// What the report text holds, and nothing else: the band wording the result already shows, the plain
// names of the findings that fired (fixed labels from checkLabels.ts), the channel the person picks,
// the person's own words from the free-text box (only what they type), and the official channels
// from authorities.ts with the existing reporting note. It never holds the offer text, an evidence
// quote, a name, a phone number or an email address from the offer: those are never read here.
//
// The wording does not name any channel's required format, and does not call itself an official
// packet or form. The MoI and Aman entries stay UAE Government directory links, as in
// authorities.ts (defects LINK-2: their own addresses are not owner-confirmed).
import { mainChannels, REPORT_FRAUD_NOTE } from "@/lib/authorities";
import { CHECK_LABELS } from "@/lib/checkLabels";
import type { RiskBand } from "@/lib/types";

type T = (en: string, ...args: (string | number)[]) => string;

// Where the offer came from. The first four are the analyzer's own channels; "Other" is the fifth.
export const KIT_CHANNELS = ["Email", "WhatsApp", "LinkedIn", "Offer letter or PDF", "Other"] as const;
export type KitChannel = (typeof KIT_CHANNELS)[number];

// The analyzer's channel list uses "Offer Letter PDF"; the Kit's picker says "Offer letter or PDF".
export function kitChannelFor(analyzerChannel: string | null | undefined): KitChannel {
  if (analyzerChannel === "Offer Letter PDF") return "Offer letter or PDF";
  return (KIT_CHANNELS as readonly string[]).includes(analyzerChannel ?? "") ? (analyzerChannel as KitChannel) : "Email";
}

// The free-text box: at most this many characters go into the copied text and the download.
export const NOTE_MAX = 1000;

// A Low or Medium result must never read as clearance (owner wording, 2026-11-23).
export const NOT_A_CLEARANCE =
  "These checks flagged nothing more. This is not a clearance: never pay a fee or send documents before you have confirmed the employer through official channels.";

export function clearanceLineShown(band: RiskBand): boolean {
  return band === "low" || band === "medium";
}

export const KIT_TITLE = "Action & Report Kit";
export const KIT_INTRO =
  "Made in this browser from the check you just ran. Nothing is sent, saved or opened for you. The text never includes the offer text, names, phone numbers or email addresses unless you type them yourself.";
export const KIT_CHANNEL_LABEL = "Where did the offer come from?";
export const KIT_NOTE_LABEL = "Your own details (optional)";
export const KIT_NOTE_HELP =
  "Whatever you type here is added to the copied text and the download. Leave out anything you do not want to share.";
export const KIT_REPORT_HEADING = "Report text";
export const KIT_REPORT_HELP = "Fixed wording you can paste into a report to the cybercrime channels or to MOHRE.";
export const KIT_COPY_REPORT = "Copy report text";
export const KIT_DOWNLOAD = "Download this summary";
export const KIT_REPLY_HEADING = "WhatsApp replies";
export const KIT_REPLY_HELP = "Three fixed replies. Copying one opens nothing and sends nothing; you paste it yourself.";
export const KIT_LINKS_HEADING = "Official links";
export const KIT_COPIED = "Copied.";
export const KIT_COPY_FAILED = "Your browser did not allow copying. Select the text and copy it yourself.";
export const KIT_DOWNLOADED = "The summary was saved to your device.";
export const KIT_DOWNLOAD_FAILED = "Your browser did not allow the download.";

export const REPLY_TEMPLATES = [
  {
    id: "decline",
    label: "Copy reply: decline politely",
    text: "Thank you for getting in touch about this role. I have decided not to go ahead, so please do not send me any more messages about it.",
  },
  {
    id: "mohre-reference",
    label: "Copy reply: ask for the MOHRE offer reference number",
    text: "Thank you for the offer. Before I go any further, please send me the MOHRE offer reference number for this job, so that I can check it on the MOHRE enquiry service.",
  },
  {
    id: "official-only",
    label: "Copy reply: continue only through official channels",
    text: "I would like to continue only through official channels. Please confirm the offer through the company's official website and MOHRE. I will not send documents or make any payment before that.",
  },
] as const;

export type KitInput = {
  // The wording the result's chip shows, for example "High risk indicators".
  bandLabel: string;
  band: RiskBand;
  // The check ids of the findings that counted toward the score (never their evidence).
  checks: readonly string[];
  channel: KitChannel;
  note: string;
};

const HEADER = "Job offer check summary, made with Offer Check UAE";
const HEADER_NOTE =
  "This is a summary of warning signs found by fixed rules. It is not a verdict, and it is not an official report form.";
const RESULT_LABEL = "Result";
const SIGNS_LABEL = "Warning signs found";
const NONE_FOUND = "None of the fixed rules matched.";
const CHANNEL_LABEL = "The offer reached me by";
const NOTE_HEADING = "In my own words";
const NOTE_EMPTY = "(nothing added)";
const WHERE_HEADING = "Where to report or check an offer";

// Every English string the report text can contain, for the tests (banned words, Arabic coverage).
export const REPORT_STRINGS: readonly string[] = [
  HEADER,
  HEADER_NOTE,
  RESULT_LABEL,
  SIGNS_LABEL,
  NONE_FOUND,
  CHANNEL_LABEL,
  NOTE_HEADING,
  NOTE_EMPTY,
  WHERE_HEADING,
  NOT_A_CLEARANCE,
  REPORT_FRAUD_NOTE,
];

// The finding names, in the order the result lists them, each once.
export function findingNames(checks: readonly string[], t: T): string[] {
  const names: string[] = [];
  for (const check of checks) {
    const name = t(CHECK_LABELS[check] ?? check);
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

// The own-words box: trimmed, cut to NOTE_MAX, and line breaks kept. Only what the person typed.
export function cleanNote(note: string): string {
  return note.replace(/\r\n?/g, "\n").trim().slice(0, NOTE_MAX);
}

// The text for "Copy report text" and for the downloaded .txt: the same content for both.
export function buildReportText(input: KitInput, t: T): string {
  const names = findingNames(input.checks, t);
  const note = cleanNote(input.note);
  const lines = [
    t(HEADER),
    t(HEADER_NOTE),
    "",
    `${t(RESULT_LABEL)}: ${input.bandLabel}`,
    `${t(SIGNS_LABEL)}:`,
    ...(names.length > 0 ? names.map((name) => `- ${name}`) : [`- ${t(NONE_FOUND)}`]),
    `${t(CHANNEL_LABEL)}: ${t(input.channel)}`,
    "",
    `${t(NOTE_HEADING)}:`,
    note || t(NOTE_EMPTY),
    ...(clearanceLineShown(input.band) ? ["", t(NOT_A_CLEARANCE)] : []),
    "",
    `${t(WHERE_HEADING)}:`,
    ...mainChannels().map((channel) => `- ${t(channel.name)}: ${channel.url}`),
    t(REPORT_FRAUD_NOTE),
  ];
  return lines.join("\n");
}

// The file name of the download: fixed, no date and no text from the offer.
export const SUMMARY_FILE_NAME = "offer-check-summary.txt";

// Every English string the Kit shows, for the tests.
export const KIT_STRINGS: readonly string[] = [
  KIT_TITLE,
  KIT_INTRO,
  KIT_CHANNEL_LABEL,
  KIT_NOTE_LABEL,
  KIT_NOTE_HELP,
  KIT_REPORT_HEADING,
  KIT_REPORT_HELP,
  KIT_COPY_REPORT,
  KIT_DOWNLOAD,
  KIT_REPLY_HEADING,
  KIT_REPLY_HELP,
  KIT_LINKS_HEADING,
  KIT_COPIED,
  KIT_COPY_FAILED,
  KIT_DOWNLOADED,
  KIT_DOWNLOAD_FAILED,
  ...KIT_CHANNELS,
  ...REPLY_TEMPLATES.flatMap((reply) => [reply.label, reply.text]),
  ...REPORT_STRINGS,
];
