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
| Language notices | Built: when most or part of the text is not in English, including common Hindi, Urdu, Arabic, Tagalog, Malayalam, Bengali, Tamil or French words typed in English letters, a notice says that text was not checked. Mostly not English shows "Not checked" in place of the score; partly not English with no finding shows "Score 0 on the English part". Never an all-clear. The button then reads "Check original anyway (not checked)". Offline word lists, no translation |
| Offer-likeness notice | Built: a low-scoring text with no signs of a job offer gets a notice. With no finding, the chip reads "Score 0. This text does not look like a job offer." It never changes the score |
| Limitations disclosure | Built: a short intro is always visible; the 8 limitations sit in a closed "What this check cannot do" section |
| Shared header | Built: one header on every page, with the logo, the main navigation and a "Check an offer" link. Pages not built yet show as plain text with a "Soon" badge, not links |
| Footer | Built: one footer on every page, with a "Check an offer" link, a link that opens the limitations, four fact chips (English only, No sign-in, Offer text not stored, Human approval) each checked by a test, and the disclaimer |
| Verification (domain and company checks) | Not built yet |
| Official-channel guidance | Not built yet |

The checker is at `/check`. The pages `/about`, `/guide`, `/how-it-works` and `/lab` are placeholders marked "Not built yet". The header and footer do not link to them.

## Not built yet

- Claim extraction in the intake step.
- Verification: no company, domain or offer number is checked.
- Official-channel guidance.
- Any LLM call. No model is called anywhere in the code today.
- Server-side storage of anything, including the audit trail.
- Rate limits and a cost cap. The plan requires them before an AI endpoint is shared.

See [docs/known-limitations.md](docs/known-limitations.md) for what the current rules miss and over-match.

## How to run

Requires Node 24.19.0 (see `.nvmrc`). `package.json` accepts Node 24.x.

```sh
npm install
npm run dev     # dev server at http://localhost:3000
npm run check   # tests, typecheck, lint, production build, no-bypass check
```

On 2026-11-09, `npm run check` passed on Node v24.19.0 with npm 11.17.0: 26 test files, 1174 tests. Earlier, on 2026-11-08, one test in `src/lib/audit.test.ts` ("uses only fixed keys and fixed-vocabulary strings") hit its 5-second timeout on the first run of the day. It passed when the file was run alone and on the next full run.

## Synthetic data only

Every offer in this repo, in the tests, the evaluation sets and the sample buttons, is synthetic. No real person's message is used. The evaluation sets are small (43 dev cases, 18 in holdout 1, 16 in holdout 2), and the rules have not been validated on real scam data. See [docs/test-report.md](docs/test-report.md).

## Privacy rules

- Offer text is untrusted input. The rules treat it as data, and instructions inside it are not followed.
- Offer text is never stored. The `/api/analyze` route processes it in memory and returns the result to the page. Nothing is written to disk, a database or browser storage.
- Offer text is never logged and never put in error messages.
- Offer text is never sent to a model or any third party. Today no model is called at all.
- The audit trail records each step, agent, status and approval, but no offer text, draft text or hash of either. It lives in page memory and is lost on reload.

## Deterministic score

The risk score comes from fixed weights over the rules that fired, so the same English text always gets the same score. If an LLM is added later, it may explain or reword findings, but it may not set or change the score. Every finding carries the matched clause or clauses from the offer, up to 3 per finding.

## Docs

- [docs/offercheck-plan.md](docs/offercheck-plan.md): build plan, agent design and acceptance criteria
- [docs/known-limitations.md](docs/known-limitations.md): known limitations and known misses
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
