# Offer Check UAE

Offer Check is an MVP prototype. A job seeker pastes a job offer they received, for example by WhatsApp, email or LinkedIn. Offer Check returns a risk score, the risk indicators it found, and the matched clause or clauses from the offer, up to 3 per finding. On request it drafts a safe reply. It reports risk indicators, not a verdict. A low score does not confirm that an offer is genuine.

Live demo: https://offercheck-uae.vercel.app/

It is built for the DDS 8-Day Building Agentic AI Application challenge. It is not a production service.

## Who it is for

Job seekers in the UAE who want to check an unsolicited job offer for common scam signs, such as a fee request, a request for credentials or documents, urgency pressure, or a free email sender, before they reply or pay anything.

## What is built

| Step | Status |
|---|---|
| Intake | Built: cleans the text only. Claim extraction is not built yet |
| Red-flag | Built: fixed English rules, no LLM |
| Risk aggregator | Built: deterministic weights |
| Drafter | Built: fixed template blocks, no LLM. Runs only after the user asks for a draft |
| Audit trail | Built: page memory only, hash-chained, holds no offer or draft text |
| Language notices | Built: when most or part of the text is not in English, including common Hindi, Urdu, Arabic, Tagalog, Malayalam, Bengali, Tamil or French words typed in English letters, a notice says that text was not checked. Mostly not English shows "Not checked" in place of the score; partly not English with no finding shows "Score 0 on the English part". Never an all-clear. Two buttons then: "Send to Google and translate" and "Check original anyway (not checked)". Offline word lists |
| Translation (optional) | Built: for text that is not clearly English, a notice says what translation sends and to whom, before any click; only the "Send to Google and translate" button sends the text, once per press, every time, through `/api/translate` to Google Cloud Translation (Basic, v2). The English it returns is checked by the same fixed rules and shown read-only under the original, marked as a machine translation. With no finding the chip is grey, never green. A failure shows an alert and checks nothing. Without a server key the send button is hidden after the first try. Editing the text clears the previous result and stops a request in flight |
| Offer-likeness notice | Built: a low-scoring text with no signs of a job offer gets a notice. With no finding, the chip reads "Score 0. This text does not look like a job offer." It never changes the score |
| Limitations disclosure | The one-line notice under the analyzer (English text only, translation can change meaning, a low score does not mean an offer is genuine). The "What this check cannot do" section and its footer link were removed on 2026-11-11 (owner decision, LIMITS-2); the full list is internal, in `docs/known-limitations.md` |
| Shared header | Built: one header on every page, with the logo, the main navigation (Check, Warning signs, About) and a "Check an offer" link |
| Footer | Built: one footer on every page, with a "Check an offer" link, four fact chips (English rules, translation first; No sign-in; Not stored by Offer Check; Human approval) each checked by a test, and the disclaimer |
| Warning signs page | Built (`/guide`): eight warning signs of labour and visa fraud, each with why it matters and what to do, paraphrased from one official page (UAE Government Portal, "Tips to avoid labour and visa fraud"), linked at the bottom |
| About page | Built (`/about`): in plain language, what Offer Check is, the problem, what it does and does not do, who it is for, privacy, and the synthetic-data and legal-advice note; a short "If you think it is a scam" box links four official UAE channels (`src/lib/authorities.ts`), with no phone number or email address. Medium and High results on `/check` link there |
| Verification (domain and company checks) | Not built yet |
| Official-channel guidance | Not built yet |

The checker is at `/check`. The other pages are `/guide` (Warning signs) and `/about`, both static. Technical evidence (the steps and their status, the dev-set counts, the recorded holdout results and the known limitations) is in [docs/technical-evidence.md](docs/technical-evidence.md), which the site does not serve.

## Not built yet

- Claim extraction in the intake step.
- Verification: no company, domain or offer number is checked.
- Official-channel guidance.
- Any LLM call. No language model is called. The one outside service is Google Cloud Translation, a machine translation service, which the server calls only after the user asks for a translation and confirms. It never sets or changes the score.
- Server-side storage of anything, including the audit trail.
- A real rate limit and cost cap. `/api/translate` has a best-effort throttle (10 requests a minute per client address, in server memory, per instance). The real spend limit is the quota set on the Google Cloud project.

See [docs/known-limitations.md](docs/known-limitations.md) for what the current rules miss and over-match. It is internal documentation; the app does not show this list.

## How to run

Requires Node 24.19.0 (see `.nvmrc`). `package.json` accepts Node 24.x.

```sh
npm install
npm run dev     # dev server at http://localhost:3000
npm run check   # tests, typecheck, lint, production build, no-bypass check
```

Translation is optional. To turn it on, set `GOOGLE_TRANSLATE_API_KEY` in the server environment (for example in the Vercel project settings, never in a `NEXT_PUBLIC_` variable or in the repo), and set a quota on the Google Cloud project, which is the real spend limit. Without the key the route answers `translation_unavailable` and the page keeps the "Check original anyway (not checked)" path.

On 2026-11-09, `npm run check` passed on Node v24.19.0 with npm 11.17.0: 33 test files, 1383 tests (public-only site: Check, Warning signs, About, committed locally, not pushed; 1410 tests with the technical pages before the owner removed them). Earlier, on 2026-11-08, one test in `src/lib/audit.test.ts` ("uses only fixed keys and fixed-vocabulary strings") hit its 5-second timeout on the first run of the day. It passed when the file was run alone and on the next full run.

## Synthetic data only

Every offer in this repo, in the tests, the evaluation sets and the sample buttons, is synthetic. No real person's message is used. The evaluation sets are small (43 dev cases, 18 in holdout 1, 16 in holdout 2), and the rules have not been validated on real scam data. See [docs/test-report.md](docs/test-report.md).

## Privacy rules

- Offer text is untrusted input. The rules treat it as data, and instructions inside it are not followed.
- Offer Check never stores offer text. The `/api/analyze` and `/api/translate` routes process it in memory and return the result to the page. Nothing is written to disk, a database or browser storage. Google's terms apply to text you send for translation.
- Offer text is never logged and never put in error messages.
- Offer text is sent to Google Cloud Translation only when you press "Send to Google and translate", every time. The notice next to the button says this before you press it. It is sent to no one else, and no language model is called. Machine translation is lossy: the result says it is based on a machine translation and may be inexact.
- The audit trail records each step, agent, status and approval, but no offer text, draft text or hash of either. It lives in page memory and is lost on reload.

## Deterministic score

The risk score comes from fixed weights over the rules that fired, so the same English text always gets the same score. A translation may differ between versions of the translation service, so the English text that was checked is shown with the result. If an LLM is added later, it may explain or reword findings, but it may not set or change the score. Every finding carries the matched clause or clauses from the offer, up to 3 per finding.

## Docs

- [docs/offercheck-plan.md](docs/offercheck-plan.md): build plan, agent design and acceptance criteria
- [docs/known-limitations.md](docs/known-limitations.md): known limitations and known misses (internal; not shown in the app since 2026-11-11)
- [docs/product-roadmap-v2.md](docs/product-roadmap-v2.md): roadmap
- [docs/test-report.md](docs/test-report.md): test and evaluation report
- [docs/defects.md](docs/defects.md): defect register
- [docs/rules-backlog.md](docs/rules-backlog.md): rule failures and backlog
- [docs/holdout2-cases.md](docs/holdout2-cases.md): holdout 2 cases
- [docs/holdout2-pass-bar.md](docs/holdout2-pass-bar.md): holdout 2 pass bar
- [docs/step4-design.md](docs/step4-design.md): Step 4 visual design
- [docs/step5-premium-ui.md](docs/step5-premium-ui.md): Step 5 UI
- [docs/build-log/](docs/build-log/): daily build log
- [docs/reference/](docs/reference/): design reference pages
