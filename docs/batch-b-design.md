# Batch B design: non-English text, translate before checking

Status: Stage 1 built (BATCHB-1). Option (b), server translation through Google Cloud Translation (Basic, v2), built as BATCHB-2 at the owner's request, ahead of stages 2 and 3; see the Decisions section and `docs/defects.md`. Stages 2, 3 and 5 are not built.

## 0. What the owner asked for, and the fixed constraints

- When pasted text is not English, or is mixed, the user translates it with a button before the check runs.
- The original text is shown as a label under the box only when a translation was done. English-only input gets no label.
- Translation must not depend on the user running their own browser's page translation (the owner rejects that).
- The score stays deterministic. Non-English text must never show a safe-looking (green) result.

Constraints from the repo that this design must keep:

- `docs/product-roadmap-v2.md`, principles 1 to 3: the score is set only by fixed rules; offer text is "never sent to any model or third party"; a model receives only enumerated ids, never raw offer text. Option (b) below breaks principles 2 and 3 as written, so it needs an owner decision and a plan change before it can be built (section 8).
- `redFlag.ts` and `scoring.ts` do not change in Batch B. Their sha256 prefixes stay c4abfc00e371ccfd and 0a6fb4880fbf3384 (first 16 hex characters).
- Offer text is untrusted input: it is never logged, never put in error messages, never stored by the app, and never rendered as HTML.
- Today's detector is `src/lib/textScript.ts`: it counts non-Latin letters (tier "most" at half of the letters, tier "part" at 10 or more). It cannot see non-English text written in Latin letters (public limitation 6).

## 1. Coverage model

One pure function decides the coverage of a check from three inputs: what the detector said, what the user chose, and what translation returned. It never reads the score.

| State | When | What the rules read |
|---|---|---|
| full | Detector says English. No translation. | The pasted text |
| translated | Detector said not English or mixed; the user pressed "Translate to English and check"; translation succeeded. | The English translation (shown in the box, editable) |
| partial | Mixed text (some English) and the user pressed "Check original anyway (not checked)". | The pasted text; only its English parts can match |
| unchecked | Mostly not English and the user pressed "Check original anyway (not checked)", or translation failed and the user chose to check the original. | The pasted text; the rules cannot read it |

Rule for every state other than full: the chip is never green, and "No risk indicators found" never appears alone.

| Where | full | translated | partial | unchecked |
|---|---|---|---|---|
| Score chip | Today's chips (green allowed when nothing matched and no other notice) | With findings: the band chip. Without: neutral "No risk indicators found in the English translation" | Today's tier-2 chip: "Score 0 on the English part. Part of the text was not checked." | Today's tier-1 chip: "Not checked: most of the text is not in English" |
| Findings card | Today's text | Findings as usual; when none, an info icon and "None of the rules matched in the English translation. A translation can lose or change meaning, so this does not confirm the offer is genuine." | Today's LANG-3 text | Today's LANG-2 text |
| Agent run, Intake row | "Cleaned N characters" | Adds "Checked a machine translation from <language name>, made <on this device / by the translation service>" | Adds "Part of the text is not in English and was not checked" | Adds "Most of the text is not in English and was not checked" |
| Announcement (live region) | Today's sentence | "Results ready. Checked an English translation. Score N of 100: <chip label>." | Today's LANG-3 sentence | Today's LANG-2 sentence |

The language name comes from a fixed list of codes (for example ar, hi, ur, ml, ta, bn, tl, fr, fa, ru, zh). Nothing from the offer text goes into any of this wording.

Audit trail: a new enumerated field on `intake_done`, no text and no hash of text.

```
coverage: "full" | "translated" | "partial" | "unchecked"
detected: "en" | "mixed" | "non_en"          // detector verdict
sourceLang: one code from the fixed list | "und"
translation: "none" | "device" | "server" | "bundled"
translationResult: "not_run" | "ok" | "unavailable" | "failed" | "cancelled" | "declined"
engine: one id from a fixed list, for example "chrome-translator" | "<provider>-v3" | "<model>-q8"
```

Lengths stay as numbers (original length and translated length). The audit test that allows only fixed keys and fixed-vocabulary strings is extended to cover these.

Determinism: detection is pure (fixed code and a fixed word list, so the same text always gets the same coverage). Translation is not deterministic: engines change between versions and devices. So the guarantee becomes "the same English text gives the same score", and the translated English is what the user sees in the box and what was scored.

## 2. Language detection without a network call

The detector runs in the browser on every change to the box (debounced), and again on the server for the coverage field. It must not import or be imported by the rules or the scoring.

| Option | Size (approximate; confirm at build time) | Short WhatsApp-style text | Latin-script non-English | Notes |
|---|---|---|---|---|
| A. Today's script count (keep) | 0, already built | Good for Arabic, Devanagari, Malayalam and other non-Latin scripts | Blind | Stays as the first pass |
| B. English word coverage (new, recommended) | A list of about 10,000 common English words plus job and money terms: roughly 80 to 100 KB raw, 30 to 40 KB gzipped | Usable from about 6 to 8 words; below that it abstains | Catches Hinglish and romanised Arabic when most words are not English words ("aap", "kya", "hai", "paisa", "habibi", "flous", "3arabi") | Pure and deterministic; easy to test; tuned on the calibration set |
| C. franc or franc-min (trigram) | Tens to a few hundred KB depending on build | Its own docs warn results are unreliable on short input | Detects French, Tagalog and similar; not Hinglish or romanised Arabic | MIT licence; adds a dependency |
| D. CLD3 or fastText language id (WASM) | About 1 MB (compressed fastText model) or more, plus the WASM runtime | Better than trigrams; still weak under about 20 characters | Romanised text often comes back as English or a wrong language | Heavy for a phone-first page |
| E. Chrome LanguageDetector API | 0 in the bundle; on-device model | Weak on very short text | As D | Chrome desktop only at last check; cannot be the only detector |

Recommendation: A then B, both pure and in the repo. C to E are not needed for the gate.

How B decides: count word tokens of 2 or more letters. With 6 or more tokens, `en` if at least about 70% are English words, `non_en` if under about 40%, `mixed` between. Under 6 tokens, it abstains and A's verdict stands. The cut-offs are placeholders to be set from the calibration set.

What it will still miss (stated plainly in the limitations list):

- Very short text (a name, "ok sir", "send fee").
- Hinglish or romanised text that is mostly English loanwords ("Sir job confirm hai, visa fees pay karo" is close to the line).
- Single non-English sentences inside a long English offer (they lower coverage only a little).
- English text full of names, places or brand names may be flagged as mixed (a false positive, which costs a click, not safety).
- Look-alike letters from other alphabets (public limitation 3) stay a separate problem.

## 3. Translation options

| | (a) On-device browser translator API | (b) Server route calling a cloud translation service | (c) Bundled in-browser model |
|---|---|---|---|
| What it is | The browser's built-in Translator API (Chrome), model runs on the device | `/api/translate` on our server forwards the text to a provider such as Google Cloud Translation, Azure Translator, DeepL or Amazon Translate | A translation model shipped as files and run in the page (WASM or WebGPU), for example Bergamot-style models or Opus-MT through transformers.js |
| Privacy | Text stays on the device. No third party. | Text leaves the device and our server and goes to the provider. The provider's terms decide retention and logging. | Text stays on the device. Model files are downloaded from our host or a CDN, not the text. |
| Cost | Free | Pay per character (list prices on the order of USD 10 to 25 per million characters, with free tiers; confirm current pricing). One maximum-size offer is 20,000 characters. Needs a rate limit and a daily cap. | Free per use; hosting and bandwidth for model files of tens of MB per language pair (Opus-MT size) up to hundreds of MB (NLLB size) |
| Browser support | Chrome desktop (Windows, macOS, Linux, ChromeOS) at last check. Not Safari, not Firefox, and not Chrome on Android or iOS at last check. Most UAE job seekers paste from WhatsApp on a phone, so most of them would not have it. Confirm the support matrix at build time. | Every browser | Needs WASM (all modern browsers); fast only with WebGPU; slow and memory-heavy on mid-range phones |
| First use | A language pack downloads after a click (user activation needed); a progress bar is needed | None | A large download before the first translation |
| Failure | `availability()` says unavailable or downloadable; download fails; translation throws | Network error, provider error, quota or rate limit reached, kill switch on, key missing (fail closed) | Out of memory, download fails, unsupported pair |
| Offline | Works once the pack is downloaded | Does not work | Works once the model is cached |
| Plan fit | Fits principles 2 and 3 (no third party, no server model) | Breaks principles 2 and 3 as written | Fits principles 2 and 3 |

What (b) sends to the third party, exactly: the offer text as pasted (after the existing hidden-character cleaning), the source language code (or "auto") and the target "en". Nothing else from us: no run id, no user id, no IP address from us (the provider sees our server's address), no cookie. The response holds the English text, which is returned to the page and not kept on our server.

What the user must agree to before (b) sends anything, every time (not remembered, since the app stores nothing):

> "To translate, Offer Check sends the text in the box to <provider>, a translation service. <provider> may keep it as its terms allow. Remove names, phone numbers and other personal details first. Send it?" Buttons: "Send for translation" and "Cancel".

The server route refuses any request without that consent flag, logs nothing, puts no text in error messages, has a timeout and one retry at most, and a per-IP rate limit, a daily cap and a kill switch that fail closed.

## 4. Button flow

1. The user pastes text. The detector runs as they type.
2. English: one button, "Check offer", as today. No label.
3. Not English or mixed: a short note under the box, "This text looks like it is not in English (or only partly). The check reads English only." It is tied to the buttons with `aria-describedby`. Two buttons replace "Check offer":
   - Primary: "Translate to English and check".
   - Secondary: "Check original anyway (not checked)".
   There is no plain "Check offer" button in this state.
4. Translate pressed: the form is `aria-busy`, a status line says "Translating" (and shows download progress with a Cancel button when a model or language pack downloads). On success the box holds the English translation, the original appears below it, and the check runs on the English text.
5. The original-text label: a heading "Original text (<language name>), translated <on this device / by <provider>>", then the original in a block with `lang` set to the detected code (or none when unknown) and `dir="auto"`, rendered as text, never as HTML, collapsed after about 6 lines with a "Show all" button. It disappears when the box is cleared or a sample is loaded. If the user edits the translation and checks again, coverage stays translated and the label stays.
6. Translation fails or is cancelled: an alert (role="alert") says "Translation did not work, so nothing was checked." with the reason category only (not available in this browser, download failed, service unavailable, limit reached), never the text. Buttons: "Try again" and "Check original anyway (not checked)". There is no silent fall-back to checking the original.
7. "Check original anyway (not checked)" runs the check on the original. The result is partial or unchecked, never green.

Keyboard and screen reader: both buttons are real buttons in a logical order (primary first). Focus stays on the pressed button while translating, then moves to the results heading as today. Progress uses a `progress` element with a text value. The Cancel button is reachable by Tab. The translated text in the box is announced by the status line ("Translated from Arabic. Checking the English translation."), not read out in full.

## 5. Claims that change

Option key: (a) on-device API, (b) server cloud service, (c) bundled model.

| Where | Today | Problem | Proposed wording |
|---|---|---|---|
| Hero (`src/app/check/page.tsx`) | "English text only. No AI is used yet, and your text is not saved." | Translation uses a machine-translation model in all three options. With (b) the text leaves the app. | (a), (c): "The rules read English. Other languages are translated on your device first. The score is set by fixed rules, not AI, and your text is not saved." (b): "...translated by a translation service if you agree. The score is set by fixed rules, not AI. Offer Check does not save your text." |
| Footer chip | "English only" | Other languages are handled through translation | "English rules, translation first" |
| Footer chip | "Offer text not stored" | (b): the provider may keep it | (a), (c): unchanged. (b): "Not stored by Offer Check" |
| Footer trust line | "Rule-based score: the same text gives the same score" | Translation can differ between engines and versions | "Rule-based score: the same English text gives the same score" |
| Disclaimer | "A low score does not confirm an offer is genuine. Offer Check does not give legal advice." | Still true | Add for all options: "A translation can lose or change meaning." |
| Prototype notice | "Prototype. Use synthetic or redacted offers only. The app does not store offer text." | (b) | (a), (c): unchanged. (b): "... The app does not store offer text. If you choose translation, the translation service receives it." |
| README, Not built yet | "Any LLM call. No model is called anywhere in the code today." | A translation model runs in every option | (a), (c): "No language model is called by the server. Translation runs on a model in your browser." (b): "The server calls a translation service only after you agree. No model sets or changes the score." |
| README, Privacy | "Offer text is never sent to a model or any third party. Today no model is called at all." | False in (a), (c) for "model"; false in (b) entirely | (a), (c): "Offer text is never sent to a third party. Translation happens on your device." (b): "Offer text is sent to <provider> only when you press Translate and agree. It is sent to no one else." |
| README, Privacy | "Offer text is never stored. ... Nothing is written to disk, a database or browser storage." | (c) caches model files in browser storage; (b) provider retention | (c): "No offer text is written to disk, a database or browser storage. Translation model files are cached by the browser." (b): "Offer Check never stores offer text. <provider>'s terms apply to text you send for translation." |
| README, Deterministic score | "the same text always gets the same score" | As the footer line | "the same English text always gets the same score. A translation may differ between devices or versions, so the English text that was checked is shown." |
| README, What is built | "Red-flag: fixed English rules, no LLM" | Still true | Unchanged; add a row for translation and coverage |
| Limitations intro | "reads English text only" | Translation path | "checks English text. Text in other languages must be translated first, and a translation can lose or change meaning." |
| Limitation 6 | "Other languages typed in English letters are not detected." | Partly fixed by detector B | "Some languages typed in English letters are still missed", with the cases from section 2 |
| Limitation 7 | "The language notice uses a simple cut-off." | New detector | Describe both cut-offs and that very short text is not judged |
| New limitation | | | "A translation can change the meaning. Scam wording can be lost or softened in translation." |
| `LANGUAGE_NOTICES` | "...This check reads English only..." | Now there is a way forward | Name the Translate button |
| Roadmap principles 2 and 3 | "never sent to any model or third party" | (b) breaks it; (a), (c) need "on-device translation model" carved out | Owner to amend; see section 8 |

## 6. Tests

Write first, before any code:

1. Detector (pure): fixed cases for each script, English word coverage on synthetic Hinglish and romanised Arabic, the abstain rule under 6 tokens, the cut-off boundaries, names-heavy English, determinism.
2. Coverage function (pure): a table of (detector verdict, user choice, translation result) to coverage state; every row checked.
3. Invariant (extends the OFFER-1 invariant in `scoreChip.ts`): for every coverage other than full, across all eval fixtures, the chip tone is never success and no all-clear wording appears in the chip, Findings, aggregator row or announcement.
4. UI: English input shows only "Check offer"; non-English and mixed show the two buttons and no "Check offer"; the label appears only after a successful translation; it renders the original as escaped text with `lang` and `dir="auto"`; failure shows the alert and never auto-checks.
5. Translation adapter: one interface, fake implementations for success, unavailable, failure and cancel; a canary string in the input never appears in any error message or audit entry.
6. Audit: the new fields use fixed keys and fixed values only; no text, no hash of text.
7. For (b) only: the route refuses a request without consent; the request to the provider (mocked fetch) holds only the text and language codes; no console call or logger (the existing scan covers it); the rate limit, cap, kill switch and missing key all fail closed.

The isolation test must still guarantee, extending the existing `offerLikeness isolation` test:

- `redFlag.ts`, `scoring.ts`, `agents/intake.ts` and `agents/manager.ts` contain no import of the detector, the coverage function or any translation code, and no `fetch`.
- The rules and scoring sha256 prefixes stay as listed in section 0.
- The same English text gives the same score (already tested; keep).
- The translation module is never imported by server code except `/api/translate` (option b only).

Calibration set, kept outside the repo, like the holdout sets:

- About 60 to 80 short synthetic texts written for this purpose (no real messages): Arabic, Hindi, Urdu, Malayalam, Tamil, Bengali and Tagalog in their own scripts; Hinglish; romanised Arabic; French; mixed English and Arabic; and English controls heavy with names and places. Lengths from 3 words to a paragraph.
- Stored outside the repo, in a private location the owner controls. A script in the repo takes its path as an argument and prints only counts per language and per detector verdict, never the texts.
- Used to set the cut-offs once. After that it is consumed: a fresh set is needed to measure again, and the numbers go into `docs/test-report.md` as measured results, not targets.

## 7. Staged plan (each stage ships on its own)

1. Stage 1, detection and gating, no translation, no third party. Detector B on top of A, the coverage function, the coverage field in the audit trail, the chip, Findings, Agent run row and announcement per state. Non-English or mixed text shows only "Check original anyway (not checked)" plus the note. Claims: limitations 6 and 7, the language notices.
2. Stage 2, on-device translation (a), no third party. Feature-detected: shown only where the browser has the Translator API; elsewhere the note says translation is not available in this browser. The original-text label, download progress, failure path. Claims for (a).
3. Stage 3, calibration and copy. Run the calibration set once, set the cut-offs, record the numbers, update README, hero, footer, disclaimer and limitations wording for what is live.
4. Stage 4, optional, server translation (b). Only after the owner amends roadmap principles 2 and 3 and chooses a provider. Consent dialog, `/api/translate`, rate limit, daily cap, kill switch, fail closed. Claims for (b).
5. Stage 5, optional, bundled model (c) for a short list of languages, if (b) is rejected and phone coverage matters. Model hosting, caching, memory checks.

Stages 1 to 3 need no third-party call. Stage 1 alone already meets "non-English text never shows a safe-looking result".

## 8. Recommendation

Build stages 1 to 3: the offline detector with gating, then on-device translation where the browser has it, then calibration and copy. Keep option (b) as a separate owner decision, because it breaks two roadmap principles and changes three public claims.

Main risk: option (a) is missing on most phones at last check (Chrome on Android and iOS, Safari, Firefox). Most UAE job seekers paste from WhatsApp on a phone, so after stages 1 to 3 most non-English users will see only "Check original anyway (not checked)". That is safe, because nothing looks green, but it is not useful to them. Closing that gap needs (b) (a third party) or (c) (large downloads on phones).

Decisions for the owner:

1. Is sending offer text to a cloud translation service acceptable at all, with per-check consent? If yes, the roadmap principles 2 and 3 must be amended, and a provider chosen (its retention terms decide the claim wording).
2. Is an on-device translation model acceptable under "no model is called"? The README and hero wording change in every option.
3. Detector cut-offs: accept placeholder values for stage 1, to be set from the calibration set in stage 3?
4. With no translation available, should "Check original anyway (not checked)" stay, or should the check be blocked for non-English text?
5. A translated result with no findings: neutral chip as proposed, or a stronger caution chip?
6. Who writes the calibration set (native speakers for which languages), and where it is kept outside the repo?
7. Which languages to support first (for example Arabic, Hindi, Urdu, Malayalam, Tagalog, Bengali)?

## Decisions

Owner decisions, 2026-11-09.

1. Cloud translation: approved in principle as the LAST stage only, with consent before every send, a rate limit, a daily cost cap, no logging, and the key only in Vercel settings. Not built now.
2. On-device translation: acceptable with the wording "The app calls no AI model of its own." A large bundled in-browser model: rejected.
3. Stage 1 ships with conservative placeholder thresholds.
4. Keep "Check original anyway (not checked)"; unchecked results show "Not checked" in place of the number.
5. Translated text with no matches: a neutral grey chip, with wording that says a translation may change the meaning. Never green.
6. The calibration set is written by the owner's assistant and kept outside the repo.
7. Languages first: Arabic, Hindi, Urdu, Malayalam, Tagalog, Bengali; plus Hinglish and romanised Arabic as detector tests.

BATCHB-2 build notes, 2026-11-09:

- Built option (b) with Google Cloud Translation (Basic, v2 REST) on the owner's instruction, ahead of stages 2 and 3. Consent before every send, no logging, no storage, the key only in the server environment.
- The daily cost cap is the quota on the Google Cloud project, set by the owner. The app has only a best-effort in-memory throttle (10 requests a minute per client address).
- Section 3 asked for "one retry at most" and a kill switch. The route makes no retry. Removing the key is the kill switch: the route then answers `translation_unavailable` and the page hides the Translate button.
- Section 4 put the English translation into the box. Instead, the box keeps the original, and the original and the English are shown read-only under it, as the BATCHB-2 task asked.
- `LANGUAGE_NOTICES` (section 5) are unchanged. They describe a check of the original, which is still right when translation is off.
