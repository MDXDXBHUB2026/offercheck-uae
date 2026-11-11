# Offer Check UAE

Last updated: 11 Nov 2026

Offer Check is an MVP prototype. A job seeker pastes a job offer they received, for example by WhatsApp, email or LinkedIn. Offer Check checks it against five fixed rules and returns a risk score from 0 to 100, the risk indicators it found, and the words from the offer that matched, up to 3 quotes per finding. On request it fills a fixed reply template, which the user reviews before copying. It reports risk indicators, not a verdict. A low score does not confirm an offer is genuine.

Live demo: https://offercheck-uae.vercel.app/

It is built for the DDS 8-Day Building Agentic AI Application challenge. It is not a production service.

## Who it is for

Job seekers in the UAE who want to check an unsolicited job offer for common scam signs before they reply or pay anything: a fee request, a request for codes, passwords or card details, a request for identity or bank documents, pressure to act fast, or a sender using a free email address.

## Pages

| Page | Path | What it shows |
|---|---|---|
| Offer Analyzer | `/check` (also `/`) | The checker. Paste text or load one of 4 synthetic samples, then get the score, the findings with their quoted words, and a "Highlights in your text" view. From the result: Listen (the browser's own speech), Export PDF (the browser's print dialog), Save to Encrypted Vault, and a reply draft. |
| Threat Radar | `/radar` | Common job-scam patterns shown with 4 made-up demo reports. They are not real reports and not live data; the page says so. A report typed in its form is shown on that page only and is not sent anywhere. |
| Gov Portals Hub | `/portals` | Official UAE portals and hotlines for confirming an offer, and where to report a job scam. Medium and High results on `/check` link to its reporting section. |
| Legal Guidelines | `/legal` | Eight warning signs of labour and visa fraud, each with why it matters and what to do, paraphrased from one official page (UAE Government Portal, "Tips to avoid labour and visa fraud"), and an "About Offer Check" section. Not legal advice. |
| Encrypted Vault | `/vault` | Results the user chose to save, encrypted with their passphrase and kept in this browser only. |

The old `/guide` and `/about` links redirect to `/legal` and `/legal#about`. Every page has the same header (the five tabs, a UAE Hotlines menu and the language switch) and footer.

## What is built

The steps of a check, with the status the code reports. The run's trace comes from `src/lib/agents/manager.ts`, and [docs/technical-evidence.md](docs/technical-evidence.md) lists every step; `src/lib/technicalEvidence.test.ts` fails if that list stops matching the trace. There is no separate step registry file.

| Step | Status | What it does |
|---|---|---|
| Manager | Built | Runs the steps in order and merges their results. It never sends, stores or contacts anyone. |
| Intake | Partly built | Text cleaning only: removes hidden characters. It does not extract claims yet. |
| Red-flag | Built | Five fixed rules look for warning signs in English text and quote the words that matched. |
| Verification | Built (text only) | Five cross-checks on the cleaned text (V-01 to V-05), shown as "Cross-checks on the offer" with the matched words quoted. No outside lookups. They do not change the score. |
| Official channel | Built (text only) | Links findings and cross-checks to existing official entries, each with its official source link, shown as "Official steps for these findings". No new guidance text. It does not change the score. |
| Risk aggregator | Built | Turns the findings into a score with fixed weights. No AI model is involved. |
| Explainer | Not implemented yet | Would explain the findings in plain words. |
| Drafter | Built | Fills a fixed English reply template. It runs only after the user asks for a draft. |
| Approval gate | Built | A person approves a reply draft before it can be copied. Offer Check sends nothing. |
| Audit trail | Built | Records each step in a hash-chained list with no offer or draft text (see Privacy rules). |

The result card's "How this was checked" panel shows the same steps for each run, with "Not implemented yet" where a step is not built.

## Languages

- **The rules read English.** The fee, credentials, document and urgency rules match English wording only. The free email rule works in any language.
- **Detection.** An offline check (script tiers and word lists for common Hindi, Urdu, romanised Arabic, Tagalog, Malayalam, Bengali, Tamil and French words) marks text as mostly not English or partly English, and a notice says which parts the rules cannot read.
- **Translation, only with the user's agreement each time.** For text marked that way, the page offers "Send to Google and translate". The notice next to the button says what is sent and to whom before any click. Each press sends the text once, through `/api/translate`, to Google Cloud Translation (Basic, v2). Limits: 5,000 characters per request and an 8-second timeout. The rules then check the English that comes back, which is shown read-only under the original and marked as a machine translation. A failure shows an alert and checks nothing.
- **What the score shows.** Text that is mostly not English and is checked as the original shows "Not checked" in place of a number. Text that is partly English and checked as the original does show a score, labelled as covering the English part only (for example "Score 0 on the English part. Part of the text was not checked."). A translated result with no finding gets a grey chip, never green.
- **Interface language.** The interface is available in English and Arabic. The Arabic text was written with an AI tool and has not been reviewed by a native speaker; the Arabic interface says so. Offer text, quoted words, the reply draft and the audit entries stay as typed or in English.

## Privacy rules

- Offer text is untrusted input. The rules treat it as data, and instructions inside it are not followed.
- The server does not store or log offer text. `/api/analyze` and `/api/translate` process it in memory and return the result to the page; nothing is written to a server disk or database, and offer text is never put in error messages.
- Offer text is sent to Google Cloud Translation only when you press "Send to Google and translate", every time. It is sent to no one else. Google's terms apply to text it receives. Machine translation is lossy: the result says it is based on a machine translation and may be inexact.
- No model sets the score. No language model is called anywhere in the code; the one outside service is Google Cloud Translation, and it never sets or changes the score.
- **Auto-Redact** is on by default. In the browser, before anything is sent for a check or a translation, it replaces UAE Emirates ID numbers, UAE IBANs and passport numbers in a common format (one letter and 7 or 8 digits) with "[number removed]". Other number formats are not caught.
- **Encrypted Vault.** Saving is the user's choice. A saved result stays in this browser's local storage, encrypted with AES-256-GCM using a key derived from the user's passphrase with PBKDF2-SHA-256 at 600,000 iterations (vaults saved before 11 Nov 2026 used 100,000 and move to 600,000 at their next save or delete). The passphrase is chosen by the user (at least 8 characters) and cannot be recovered by Offer Check; if it is forgotten, the saved results cannot be opened. By default the record holds the result and its quoted findings, not the full checked text; the full text (up to 2,000 characters) is kept only if the user ticks "Also keep the checked text". Nothing in the vault is sent to the server.
- **Audit trail.** `/api/analyze` builds it for each run and returns it to the page, where approval-gate decisions are added. Entries hold IDs, counts, statuses and decisions only: no offer text, draft text, quotes, names or contact details, and no hash of any of them. Each entry carries the SHA-256 hash of the previous one, so a changed, removed or reordered entry shows as a broken chain; it is tamper-evident, not tamper-proof. It is kept in page memory and is lost on reload, except that a result saved to the Encrypted Vault includes the run's audit entries inside the encrypted record.
- The browser also keeps the language choice and the animation setting in local storage. Neither holds offer text.

## Deterministic score

Five fixed rules, fixed weights, so the same English text always gets the same score:

| Rule | Plain name | Points |
|---|---|---|
| RF-001 | Asks you to pay a fee or money | 40 (high) |
| RF-002 | Asks for a code, password or card details | 40 (high) |
| RF-003 | Asks for identity or bank documents | 20 (medium) |
| RF-004 | Pressure to act quickly | 20 (medium) |
| RF-005 | Uses a free email address | 20 (medium) |

The points add up and are capped at 100. Any high rule puts the score at 60 or more. Bands: high 60 or more, medium 30 to 59, low under 30. A rule's wording that appears only inside a warning to the reader is listed as a mention and adds no points. Every finding quotes the matched words from the offer, up to 3 per finding.

The result card names each finding in plain words. Rule IDs appear only in "How this was checked" (next to the plain name and its points) and in the audit trail. A translation may differ between versions of the translation service, so the English text that was checked is shown with the result. If an LLM is added later, it may explain or reword findings, but it may not set or change the score.

## Not built yet

- Claim extraction in the intake step (roadmap Phase 4).
- Outside lookups for verification: no company, domain or offer number is checked against any registry or website (no RDAP, web search or page fetch). Weights for the cross-checks are deferred by owner decision, so they do not count in the score (roadmap Phase 5).
- The typed guidance library with a reviewer field (roadmap Phase 6; the official-channel step maps findings to the existing warning signs, reporting channels and contacts only).
- The explainer step (roadmap Phase 9). No language model is called; a code search finds no model client or model API call.
- A run plan with skipped and failed steps (roadmap Phase 7).
- Hardening (roadmap Phase 11): no Content-Security-Policy yet (only `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options` are set), no rate limit on `/api/analyze`, no end-to-end browser tests. `/api/translate` has a best-effort throttle of 10 requests a minute per client address, in server memory, per instance; the real spend limit is the quota set on the Google Cloud project.
- Server-side storage of anything.

See [docs/known-limitations.md](docs/known-limitations.md) for what the rules miss and over-match. It is internal documentation; the app does not show this list.

## How to run

Requires Node 24.19.0 (see `.nvmrc`). `package.json` accepts Node 24.x.

```sh
npm install
npm run dev     # dev server at http://localhost:3000
npm run check   # tests, typecheck, lint, production build, no-bypass check
```

Translation needs one server environment variable: `GOOGLE_TRANSLATE_API_KEY`. Set it in the server environment only (for example in the Vercel project settings), never in a `NEXT_PUBLIC_` variable or in the repo, and set a quota on the Google Cloud project. The app works without it except for translation: the route answers `translation_unavailable`, nothing is sent, the send button is hidden, and the user can still check the original text.

On 11 Nov 2026, `npm run check` passed on Node v24.19.0 with npm 11.17.0: 47 test files, 2,499 tests, then typecheck, lint, the production build and the no-bypass check.

## Synthetic data only

Every offer in this repo, in the tests, the evaluation sets, the sample buttons and the Threat Radar demo reports, is synthetic. No real person's message is used. The evaluation sets are small: 43 dev cases (`src/lib/agents/eval/offers.ts`), 18 in holdout 1 (`holdout.ts`) and 16 in holdout 2 (`holdout2.ts`). The rules were tuned on the dev set and have not been validated on real scam data. See [docs/test-report.md](docs/test-report.md).

## Docs

- [docs/offercheck-plan.md](docs/offercheck-plan.md): build plan, agent design and acceptance criteria
- [docs/product-roadmap-v2.md](docs/product-roadmap-v2.md): roadmap
- [docs/technical-evidence.md](docs/technical-evidence.md): steps and their status, dev-set counts, holdout records (not served by the app)
- [docs/known-limitations.md](docs/known-limitations.md): known limitations and known misses (internal; not shown in the app since 11 Nov 2026)
- [docs/test-report.md](docs/test-report.md): test and evaluation report
- [docs/defects.md](docs/defects.md): defect register
- [docs/locked-files.md](docs/locked-files.md): files that change only with the owner's approval, with their hashes
- [docs/rules-backlog.md](docs/rules-backlog.md): rule failures and backlog
- [docs/holdout2-cases.md](docs/holdout2-cases.md): holdout 2 cases
- [docs/holdout2-pass-bar.md](docs/holdout2-pass-bar.md): holdout 2 pass bar
- [docs/batch-b-design.md](docs/batch-b-design.md): Batch B design (language detection and translation)
- [docs/step4-design.md](docs/step4-design.md): Step 4 visual design
- [docs/step5-premium-ui.md](docs/step5-premium-ui.md): Step 5 UI
- [docs/build-log/](docs/build-log/): daily build log
- [docs/reference/](docs/reference/): design reference pages
