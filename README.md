# Offer Check UAE

Last updated: 21 Nov 2026

Offer Check is an MVP prototype. A job seeker pastes a job offer they received, for example by WhatsApp, email or LinkedIn. Offer Check checks it against five fixed rules and returns a risk score from 0 to 100, the risk indicators it found, and the words from the offer that matched, up to 3 quotes per finding. It also runs five text-only cross-checks and lists official steps that apply to the findings; neither changes the score. On request it fills a fixed reply template, which the user reviews before copying. It reports risk indicators, not a verdict. A low score does not confirm an offer is genuine.

Live site: https://offercheck-uae.vercel.app/

It is built for the DDS 8-Day Building Agentic AI Application challenge. It is not a production service.

## Who it is for

Job seekers in the UAE who want to check an unsolicited job offer for common scam signs before they reply or pay anything: a fee request, a request for codes, passwords or card details, a request for identity or bank documents, pressure to act fast, or a sender using a free email address.

## Pages

| Page | Path | What it shows |
|---|---|---|
| Offer Analyzer | `/check` (also `/`) | The checker. Paste text or load one of 4 synthetic samples, then get the score, the findings with their quoted words, "Cross-checks on the offer", "Official steps for these findings" and a "Highlights in your text" view. From the result: Listen (the browser's own speech), Export PDF (the browser's print dialog), the Action & Report Kit, and a reply draft. |
| Sender Check | `/sender` | Four optional boxes (the sender's email address, phone number, web address or domain, and the company name the offer used). It gives plain facts and what to do next: a free-mail provider, a domain that looks like an official one but is not the same, an international (xn--) or mixed-script domain, an email domain that does not contain the company name typed, and a phone number that does not fit UAE numbering. Everything runs in the browser: nothing is fetched, looked up, stored or sent. It never calls a number or domain a scam, a VoIP line or a registered company, and it does not touch the score. |
| Gov Portals Hub | `/portals` | Official UAE portals and hotlines for confirming an offer, and where to report a job scam. Medium and High results on `/check` link to its reporting section. |
| Legal Guidelines | `/legal` | Eight warning signs of labour and visa fraud, each with why it matters and what to do, paraphrased from one official page (UAE Government Portal, "Tips to avoid labour and visa fraud"). Not legal advice. |
| About | `/about` | What Offer Check is for and who it is for, how a check works, five common job-scam patterns with the official places to report one and a link to tell the owner about a scam Offer Check missed (a Google Form), what it cannot do, privacy in short, and who runs it with the contact address. Not affiliated with any government body. |
| Privacy | `/privacy` | What is sent, kept and not kept. Drafted, pending legal review; each statement is traced to the code in [docs/privacy-terms.md](docs/privacy-terms.md). |
| Terms | `/terms` | Prototype status, not a verdict or legal advice, no guarantee, confirm through official channels, acceptable use. Drafted, pending legal review. |

The old `/guide` link redirects to `/legal`, `/vault` (Encrypted Vault, removed 2026-11-23) redirects to `/check` with a 308, and `/radar` (Threat Radar, removed 2026-11-23) redirects to `/check` with a 308. Every page has the same header and footer. The header has five tabs in two groups with a divider between them: Tools (Analyzer, Sender check) and Information (Portals, Guidelines, About), then a UAE Hotlines menu, the language switch and a Settings (gear) button. Each tab is its own pill button (border, gap, hover and focus states; the current page is bolder with a bar under it, as well as green). Below 1200 px the same four links sit in a bar under the header, one row per group (Analyzer alone, then Portals, Guidelines and About), with a line between the rows. The footer links About, Privacy and Terms. The operator line and the contact address are kept in `src/lib/siteConfig.ts` only. The header's fit was measured in Chrome at 1280, 1440, 1568 and 1920 px in English and Arabic (`scripts/measure-header.mjs`, results in `docs/header-measurements.json`, checked by `src/app/headerMeasurements.test.ts`).

## What is built

The steps of a check, in the order the run trace in `src/lib/agents/manager.ts` reports them. Every step in the trace ends as "Completed". [docs/technical-evidence.md](docs/technical-evidence.md) lists every step; `src/lib/technicalEvidence.test.ts` fails if that list stops matching the trace. There is no separate step registry file.

| Step | Status | What it does |
|---|---|---|
| Manager | Built | Runs the steps in order and merges their results. It never sends, stores or contacts anyone. |
| Intake | Partly built | Text cleaning only: removes hidden characters. Since Phase 8, for matching only, fullwidth letters and digits become plain ones and a Cyrillic or Greek letter that looks Latin becomes its Latin letter inside a word that also has Latin letters; quotes stay as typed. It does not extract claims yet. |
| Red-flag | Built | Five fixed rules look for warning signs in English text and quote the words that matched. |
| Verification | Built (text only) | Five cross-checks on the cleaned text (V-01 to V-05), shown as "Cross-checks on the offer" with the matched words quoted. No outside lookups: no domain lookup, web search or page fetch. No effect on the score. |
| Official channel | Built (text only) | Links findings, cross-checks and a UAE authority named in the text (MoHRE, ICP, GDRFA or Amer) to existing official entries, each with its official source link, shown as "Official steps for these findings". No new guidance text. No effect on the score. |
| Risk aggregator | Built | Turns the red-flag findings into a score with fixed weights. No AI model is involved. |

The five cross-checks: V-01 a free email address for a named company or government body; V-02 text that presents itself as a UAE authority with no official address, or ties an address that is not official to the authority (a plain mention of an authority does not count); V-03 a shortened link, a link to a numeric address, or an address that looks like an official one; V-04 a request to continue only on WhatsApp or Telegram; V-05 a payment asked for while the text says there are no fees, or a salary in more than one currency. Official addresses are the ones in the official links Offer Check already holds.

Outside the trace:

| Step | Status | What it does |
|---|---|---|
| Drafter | Built | Fills a fixed English reply template. It runs only after the user asks for a draft. |
| Approval gate | Built | A person approves a reply draft before it can be copied. Offer Check sends nothing. |
| Audit record (internal) | Built | Records each step in a hash-chained list with no offer or draft text (see Privacy rules). Not shown in the interface (owner decision, 2026-11-24). |

The result card's "How this was checked" panel shows the six trace steps for each run with their summaries, for example "1 of 5 cross-checks matched", and lists the rule IDs and the cross-checks that matched, each cross-check marked "Not counted in the score".

## Languages

- **The rules read English.** The fee, credentials, document and urgency rules match English wording only. The free email rule works in any language. The cross-checks also match English wording, except the link and address checks (V-03).
- **Detection.** An offline check (script tiers and word lists for common Hindi, Urdu, romanised Arabic, Tagalog, Malayalam, Bengali, Tamil and French words) marks text as mostly not English or partly English, and a notice says which parts the rules cannot read.
- **Translation, only with the user's agreement each time.** For text marked that way, the page offers "Send to Google and translate". The notice next to the button says what is sent and to whom before any click. Each press sends the text once, through `/api/translate`, to Google Cloud Translation (Basic, v2). Limits: 5,000 characters per request and an 8-second timeout. The rules then check the English that comes back, which is shown read-only under the original and marked as a machine translation. A failure shows an alert and checks nothing.
- **What the score shows.** Text that is mostly not English and is checked as the original shows "Not checked" in place of a number. Text that is partly English and checked as the original does show a score, labelled as covering the English part only (for example "Score 0 on the English part. Part of the text was not checked."). A translated result with no finding gets a grey chip, never green.
- **Interface language.** The interface is available in English and Arabic. The Arabic text was written with an AI tool and has not been reviewed by a native speaker; the Arabic interface says so. Offer text, quoted words and the reply draft stay as typed or in English.

## Privacy rules

- Offer text is untrusted input. The rules and cross-checks treat it as data, and instructions inside it are not followed.
- The server does not store or log offer text. `/api/analyze` and `/api/translate` process it in memory and return the result to the page; nothing is written to a server disk or database, and offer text is never put in error messages.
- Offer text is sent to Google Cloud Translation only when you press "Send to Google and translate", every time. It is sent to no one else. Google's terms apply to text it receives. Machine translation is lossy: the result says it is based on a machine translation and may be inexact.
- No model sets the score. No language model is called anywhere in the code; the one outside service is Google Cloud Translation, and it never sets or changes the score.
- **Auto-Redact** is always on, with no switch. In the browser, before the text is sent for a check or a translation, it replaces UAE Emirates ID numbers, UAE IBANs and passport numbers in a common format (one letter and 7 or 8 digits) with "[number removed]"; both requests mask the text themselves, so there is no unmasked path. Nothing about it is shown before a check. After a check, only when a number was hidden, the result says how many and that a reference number in a similar format may also be hidden. Other formats are not caught: IBANs from other countries, other passport formats, an Emirates ID written with dots, and Arabic-Indic digits. The text box itself is not changed. The footer says that these numbers are hidden in the browser before the text is sent.
- **Action & Report Kit (Phase 6, 2026-11-23, replaces the Encrypted Vault).** Under every result, in every band, the Kit is built in the browser from the check just run. Nothing is stored, sent or opened for the person. It offers: Copy report text and Download this summary (a client-side Blob .txt named `offer-check-summary.txt`, same content); the text holds the band wording, the plain names of the findings that fired, the channel the person picks (Email, WhatsApp, LinkedIn, Offer letter or PDF, Other), their own free-text box and the official channels from `src/lib/authorities.ts` with the existing note, and never the offer text, a quote, a name, a phone number or an email address unless the person types it; three fixed WhatsApp replies to copy (decline politely, ask for the MOHRE offer reference number, continue only through official channels); the official links and the missed-scam form link. Under a Low or Medium result the page and the copied text say: "These checks flagged nothing more. This is not a clearance: never pay a fee or send documents before you have confirmed the employer through official channels." It is not called an official packet and claims no channel's format; MoI and Aman stay the UAE Government directory links (defects LINK-2). Logic: `src/lib/actionKit.ts`; component: `src/components/ActionKit.tsx`. The Vault code is removed; `src/lib/vaultCrypto.ts` (locked) and `src/lib/vault.ts` stay in the repo, unused by the app, because the locked `vaultCrypto.test.ts` imports them (`docs/locked-files.md`). The Vault descriptions in the Design Studio-era and AI Studio documents under `docs/` are historical.
- **Audit record (internal, not shown).** The audit panel was removed from the interface on 2026-11-24; the record is still built. `/api/analyze` builds it for each run and returns it to the page, where approval-gate decisions are added. Entries hold fixed values only: a random run ID, times, the length of the checked text, each step's status and duration, the language coverage and detector result, the translation outcome and a language code, the rule IDs that matched, the cross-check IDs that matched and their count, the official-step count with the rule and cross-check IDs it covers, the score and band, and the gate decisions with the draft's block IDs. No offer text, draft text, quotes, names or contact details, and no hash of any of them. Each entry carries the SHA-256 hash of the previous one, so a changed, removed or reordered entry shows as a broken chain; it is tamper-evident, not tamper-proof. It is kept in page memory and is lost on reload.
- **Settings (Phase 4a).** The gear button opens a dialog (focus kept inside, Escape closes, focus returns to the gear): Text size (Standard, Large; Large scales the page and dialogs, not the header), Animations (On, Paused; the same state as the footer Pause control), Language (English, Arabic), Theme (System, Dark, Light; Dark is the default, System follows the device, and the choice is set before the page paints so a saved Light never flashes dark first), the Install app control, and Clear my data on this device, which removes every saved choice (and any Vault keys an earlier version left on the device) after a confirm step.
- The browser keeps these choices in local storage: language, animations, text size, theme (`offercheck_theme_v1`) and a dismissed install hint. None holds offer text. Every read and write is in try/catch, so a browser that blocks storage still works.
- No advertising, analytics or tracking scripts, and no cookies set by the app. The public privacy notice is `/privacy` (drafted, pending legal review).

## Rate limits

- **Checks:** 30 a minute per visitor on `/api/analyze`. Over that, the page says there were too many checks in a short time and keeps the text in the box.
- **Translations:** 10 a minute and 20 a UTC day per visitor on `/api/translate`, and a daily cap on the characters the whole app sends to Google (`OFFERCHECK_DAILY_CHAR_CAP`, 15,000 when unset). At the cap, nothing is sent and the page shows the existing "translation unavailable" message.
- **Where:** counters in an Upstash Redis store in Mumbai (`src/lib/rateLimit.ts`), called over its REST API. The visitor key is an HMAC-SHA-256 hash of the client address with `OFFERCHECK_RATE_SALT`; the store holds only counters with an expiry, never an address, a user agent or any text. Nothing is logged.
- **If the store is down:** translation is refused (it costs money); checks still run, limited per instance in memory. Locally and in tests, with no store, the limits run in memory.

## Security headers

- **Content-Security-Policy** on every page, with a new random nonce per request (`src/proxy.ts`, policy in `src/lib/csp.ts`). In production: `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'nonce-…'; img-src 'self'; font-src 'self'; connect-src 'self'; media-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. No `'unsafe-inline'`, no `'unsafe-eval'` and no external origin: the browser loads and calls nothing outside the app's own origin (Google Translate is called by the server). `next dev` alone adds `'unsafe-eval'` for scripts and `'unsafe-inline'` for styles.
- Because the nonce is new on every request, every page is rendered per request (`await connection()` in the root layout) instead of being prerendered at build time.
- On every route (`next.config.ts`): `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- `worker-src 'self'` (Phase 4a) is needed because without it the worker falls back to `script-src`, where `'strict-dynamic'` makes `'self'` ignored. `manifest-src 'self'` states what `default-src` already allowed. `/sw.js` gets its own headers: `Cache-Control: no-cache, no-store, must-revalidate` and `Content-Security-Policy: default-src 'self'; script-src 'self'`.
- `Strict-Transport-Security` is sent by Vercel (`max-age=63072000; includeSubDomains; preload`), not by the app.

## Installable web app and offline reading

- **Manifest** (`src/app/manifest.ts`, served at `/manifest.webmanifest`): name "Offer Check UAE", short name "Offer Check", start URL `/check`, standalone, the site's dark background as theme and background colour (the browser's own theme-colour tag follows the theme: light page colour for Light, dark for Dark, the device for System). Icons in `public/icons/` are drawn from the shield mark by `scripts/make-icons.mjs` (dev only, Node built-ins only; run `node scripts/make-icons.mjs`).
- **Install app** in Settings and the footer appears only when the browser offers installation; there is no pop-up on arrival. On iPhone and iPad a dismissible hint gives the two taps (Share, then Add to Home Screen). Saved results stay with the browser or the installed app they were saved in.
- **Service worker** (`src/lib/serviceWorker.ts`, served at `/sw.js`): on install it keeps a copy of `/check`, `/sender`, `/about`, `/legal`, `/portals`, `/privacy` and `/terms` with their built files. Pages are fetched from the network first and the copy is used offline; other pages show a short offline page. It never stores `/api` requests, POST requests, other origins, range or RSC requests, so no offer text, result or translation is cached. The cache is named per deployment (`VERCEL_DEPLOYMENT_ID`), and a new version deletes the old copy. Under `next dev` the worker unregisters itself.
- **Offline on the Check page:** "You are offline. Checking an offer needs a connection." The text in the box stays; nothing is sent.

## Deterministic score

Five fixed rules, fixed weights, so the same English text always gets the same score:

| Rule | Plain name | Points |
|---|---|---|
| RF-001 | Asks you to pay a fee or money | 40 (high) |
| RF-002 | Asks for a code, password or card details | 40 (high) |
| RF-003 | Asks for identity or bank documents | 20 (medium) |
| RF-004 | Pressure to act quickly | 20 (medium) |
| RF-005 | Uses a free email address | 20 (medium) |

The points add up and are capped at 100. Any high rule puts the score at 60 or more. Bands: high 60 or more, medium 30 to 59, low under 30. A rule's wording that appears only inside a warning to the reader is listed as a mention and adds no points. Every finding quotes the matched words from the offer, up to 3 per finding. The cross-checks and official steps are shown beside the findings and add no points.

The result card names each finding in plain words. Rule IDs and cross-check IDs appear only in "How this was checked". A translation may differ between versions of the translation service, so the English text that was checked is shown with the result. If an LLM is added later, it may explain or reword findings, but it may not set or change the score.

## Not built yet

From [docs/product-roadmap-v2.md](docs/product-roadmap-v2.md):

- Structured extraction in the intake step (Phase 4).
- Weights for the cross-checks in the score (Phase 5): deferred by owner decision, so they do not count.
- The typed guidance library (`data/guidance.json`) with a reviewer field (Phase 6). The official-channel step maps findings to the existing warning signs, reporting channels and contacts only.
- A run plan with skipped and failed steps and timeouts (Phase 7).
- The guarded, optional explainer (Phase 9). No language model is called; a code search finds no model client or model API call.
- Arabic reply blocks for the drafter, and the full report export the roadmap describes (Phase 10). Export PDF today uses the browser's print dialog.
- Hardening (Phase 11, rest): no end-to-end browser or accessibility tests, no threat model document.
- The documentation set (Phase 12): system card and architecture document.

See [docs/known-limitations.md](docs/known-limitations.md) for what the rules and cross-checks miss and over-match. It is internal documentation; the About page shows five plain lines drawn from it.

## How to run

Requires Node 24.19.0 (see `.nvmrc`). `package.json` accepts Node 24.x.

```sh
npm install
npm run dev     # dev server at http://localhost:3000
npm run check   # tests, typecheck, lint, production build, no-bypass check
```

Server environment variables are listed, without values, in `.env.example`. Rate limits use `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `OFFERCHECK_RATE_SALT` and `OFFERCHECK_DAILY_CHAR_CAP`; with none of them set and outside Vercel, they run in memory. Translation needs one more: `GOOGLE_TRANSLATE_API_KEY`. Set it in the server environment only (for example in the Vercel project settings), never in a `NEXT_PUBLIC_` variable or in the repo, and set a quota on the Google Cloud project. The app works without it except for translation: the route answers `translation_unavailable`, nothing is sent, the send button is hidden, and the user can still check the original text.

On 24 Nov 2026, `npm run check` passed on Node v24.19.0 with npm 11.17.0: 71 test files, 3,688 tests, then typecheck, lint, the production build and the no-bypass check (branch `phase-5`).

## Synthetic data only

Every offer in this repo, in the tests, the evaluation sets, the sample buttons and the hero's example findings, is synthetic. No real person's message is used. The evaluation sets are small: 43 dev cases (`src/lib/agents/eval/offers.ts`), 18 in holdout 1 (`holdout.ts`), 16 in holdout 2 (`holdout2.ts`) and 24 in holdout 3 (`holdout3.ts`). The rules were tuned on the dev set and have not been validated on real scam data. See [docs/test-report.md](docs/test-report.md) and [docs/technical-evidence.md](docs/technical-evidence.md).

Rules v2 (Phase 8) is built. The rules were changed for eight documented defects, then for the three cases holdout 3 got wrong, then once more for the wording `No deposit, fee or payment is ever required`. Every case added for those changes is tuned, not blind.

- **Holdout 1** (consumed): ran once, on 6 Nov 2026, before the Step 1d fixes. Strict: 11 of 18; with the right rule counted as a pass: 15 of 18.
- **Holdout 2** (consumed): ran once, on 6 Nov 2026. 15 of 16 passed; the one failure, H21, was fixed afterwards by tuning, and the blind result stays 15 of 16.
- **Holdout 3** (consumed, blind): ran once, on 20 Nov 2026, before the tuning fixes. 21 of 24 matched their labels. Against its pass bar, locked before the run: 10 of 12 scam cases flagged, 1 of 11 genuine cases flagged, and 1 genuine case flagged high. The later fixes for H36, H38 and H53 are tuned, not blind, and the blind result stays as recorded. The advisor who wrote the set had read `docs/defects.md`, so it is blind to the rule patterns, not to the defect list.

## Docs

- [docs/offercheck-plan.md](docs/offercheck-plan.md): build plan, agent design and acceptance criteria
- [docs/product-roadmap-v2.md](docs/product-roadmap-v2.md): roadmap, with a status note per phase
- [docs/technical-evidence.md](docs/technical-evidence.md): steps and their status, dev-set counts, holdout records (not served by the app)
- [docs/known-limitations.md](docs/known-limitations.md): known limitations and known misses (internal; five plain lines from it are on `/about` since 15 Nov 2026)
- [docs/privacy-terms.md](docs/privacy-terms.md): the Privacy and Terms pages (drafted, pending legal review), with the source file for each privacy statement
- [docs/test-report.md](docs/test-report.md): test and evaluation report
- [docs/defects.md](docs/defects.md): defect register
- [docs/locked-files.md](docs/locked-files.md): files that change only with the owner's approval, with their hashes and how they are computed
- [docs/rules-backlog.md](docs/rules-backlog.md): rule failures and backlog
- [docs/holdout2-cases.md](docs/holdout2-cases.md): holdout 2 cases
- [docs/holdout2-pass-bar.md](docs/holdout2-pass-bar.md): holdout 2 pass bar
- [docs/batch-b-design.md](docs/batch-b-design.md): Batch B design (language detection and translation)
- [docs/step4-design.md](docs/step4-design.md): Step 4 visual design
- [docs/step5-premium-ui.md](docs/step5-premium-ui.md): Step 5 UI
- [docs/build-log/](docs/build-log/): daily build log
- [docs/reference/](docs/reference/): design reference pages
