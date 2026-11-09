# Offer Check UAE: product build roadmap (v2)

You are building a production-grade product, run on synthetic data only. "Production-grade" means engineering standards, security, accessibility, evaluation and documentation. It does NOT mean validated on real scam data, and the product must say so in its own pages.

Work ONE phase at a time. After a phase: run the checks, update the docs, commit locally, STOP and report. Never start the next phase until told. Never push or deploy without explicit approval. Follow CLAUDE.md in the repo root.

## Non-negotiable rules (apply to every phase)

1. Scoring is deterministic. No model ever sets, changes or sees the score logic. src/lib/agents/redFlag.ts and scoring.ts change only in a phase that explicitly allows it (Phase 8), and then only through the evaluation process described there. Until then the redFlag.ts sha256 must stay 789dc2b29a30940951257c677bddcb4eaf995bb8a187a19e3583ca51d1ebb76f.
2. Offer text is untrusted input. It is never logged, never stored on the server, never put in error messages, never sent to any model or third party. One exception (owner decision 1 in docs/batch-b-design.md, built as BATCHB-2): when the user presses "Send to Google and translate", with the disclosure shown next to it, every time, the text is sent to Google Cloud Translation for machine translation, and to no one else.
3. No model call ever receives raw offer text, evidence quotes, names, email addresses, phone numbers or URLs from the offer. A model receives only enumerated ids, severities, booleans and a language code. The BATCHB-2 translation call is the one exception, under the consent rule in principle 2; it never sets or changes the score.
4. Show only values the app really computes. No invented timings, counts, metrics, companies, laws or statistics anywhere in the UI or docs. Anything that cannot be verified is not shown.
5. Honest states: an agent or feature that is not built shows "Not implemented yet", never "done".
6. No bypassing: no skipped tests, no eslint-disable, no ts-ignore, no weakened assertions, no editing a test to make it pass unless the test asserted something you legitimately changed (list each such change in your report).
7. Every phase ends with: npm run check green, the client-bundle check (no rule patterns in client files), CI-compatible, docs updated (docs/build-log, docs/defects.md, docs/test-report.md), local commit with the two attribution lines.
8. Visual and UX quality bar: follow docs/step5-premium-ui.md tokens and rules for every new page and component. Accessibility: WCAG AA, keyboard-complete, 44px targets, visible focus, reduced motion respected, no meaning by colour alone.
9. When something is unclear or a decision belongs to the owner, list it under "Needs your decision" in the report and use the safest option meanwhile.
10. Never claim in code, docs or UI that something was tested unless a test or documented manual check exists for it.

## Report format after every phase

Checks (counts), what was built, files changed, tests added (count and what they prove), defects found and fixed (with ids), defects found and left open (with reason), what still looks weak, "Needs your decision", anything unsure.

---

## Phase 1: product shell and design system

Goal: turn the single page into a real multi-page product without changing behaviour.
Build:
- Shared layout with header navigation (Check, How it works, Test Lab, Guide, About and limits), footer with the prototype notice and "Risk indicators, not a verdict".
- Routes: /check (the current workspace; "/" redirects or renders it), /how-it-works, /lab, /guide, /about with placeholder pages that say plainly "Not built yet" until their phase.
- Reusable components with tokens: Card, Chip, Button (aria-disabled pattern), Callout, SectionHeader, DataTable, Timeline, Disclosure.
- App-level error boundary, not-found page, loading states, and an offline/error state for the check request. None of them may echo offer text.
Done when: all existing behaviour and tests still pass, every route has a title, metadata and landmark structure, keyboard navigation works through the header on mobile (menu button with correct aria).

Status (2026-11-09, owner decision, committed locally, not pushed): deviation from the nav list above. The public site has three items: Check, Warning signs (`/guide`) and About. How it works and Test Lab are not in the navigation, and no item shows "Soon". See `docs/build-log/2026-11-09.md`.

## Phase 2: How it works and About pages (content from the code, not invented)

Build:
- /how-it-works: an agent diagram (inline SVG) of Manager, Intake, Red-flag, Verification, Official channel, Risk aggregator, Explainer, Drafter, approval gate, audit trail. Each node shows a status read from a single typed registry in code (built, partial, not built) so the diagram can never disagree with the app.
- The trust boundaries in plain words: what the model can and cannot see, what is deterministic, where the human approves.
- /about: intended use, who it is for, what it does not do, known limitations read from docs/known-limitations.md at build time, the synthetic-data statement, "not legal advice", and how to report a problem.
Done when: a test fails if the registry and the diagram disagree, and if any limitation in docs/known-limitations.md is missing from /about.

Status (2026-11-09, committed locally, not pushed): built, together with Phase 3 in one task (owner decision). Tests in `src/app/docPages.test.ts` and `src/lib/authorities.test.ts`. "How to report a problem" above is intentionally dropped by the owner: the public does not report problems with Offer Check through any contact. Instead /about lists official UAE places to report a suspected scam (`src/lib/authorities.ts`). See `docs/build-log/2026-11-09.md`.

Status update (2026-11-09, owner decision, committed locally, not pushed): removed from the app. `/how-it-works` is deleted; its step list, statuses and the known limitations are copied to `docs/technical-evidence.md`, which the app does not serve (tests in `src/lib/technicalEvidence.test.ts`). `/about` is rewritten in plain language and links only the four main reporting channels.

## Phase 3: Test Lab (evaluation transparency)

Build /lab, rendered on the server by running the real engine over the case files at request or build time (never hard-coded numbers; never ship rule patterns to the client):
- Summary per suite: dev eval, holdout 1, holdout 2 (and later holdout 3). Show counts, precision and recall where meaningful, the locked pass bar for holdout 2 with the counts against it, and the plain labels "tuned on" versus "blind".
- Per-rule hit counts, a confusion table, and a per-case table (case id, category, expected, result, score, rule ids, miss reason where documented).
- A "What this does not prove" panel: synthetic data, small sample, rules tuned on the dev set, no real-world validation.
- Download of the results as JSON.
Done when: a test recomputes the numbers independently and compares; changing a rule or case changes the page; the page works with no JavaScript for the main tables.

Status (2026-11-09, committed locally, not pushed): built, computed at build time. The dev eval runs through the real rules; holdouts 1 and 2 are consumed and are shown as recorded (`src/lib/agents/eval/records.ts`), not re-run. Tests in `src/lib/labData.test.ts` and `src/lib/agents/eval/records.test.ts`.

Status update (2026-11-09, owner decision, committed locally, not pushed): removed from the app. `/lab`, `/lab/results.json`, `src/lib/labData.ts` and its test are deleted. The dev-set confusion counts and the recorded holdout results are copied to `docs/technical-evidence.md`; a test recomputes the counts from `offers.ts` and compares the holdout lines with `records.ts`. The eval files under `src/lib/agents/eval/` are unchanged.

## Phase 4: Intake v2 (structured extraction, deterministic)

Build a real Intake agent that turns text into a typed, privacy-safe structure. No model involved.
Extract: language guess (English, Arabic script present, mixed), contact channels mentioned (email, WhatsApp, Telegram, phone present), email domains and whether each is a free-mail domain, URLs and whether a shortener or raw IP, mentions of fees, deposits, visa, medical, flight, documents requested, salary mention present, urgency wording present, company-name candidates.
Output only the structured fields plus booleans and counts; the structure must never contain the raw strings of emails, phone numbers or names beyond what the UI needs to display to the same user in the same session (mark which fields are display-only and never leave the server except in the response to that user, never to a model and never in the audit log).
Rules: bounded runtime (no catastrophic regexes; add fuzz tests like the existing ones), unit tests per extractor with positive and negative cases, a property test that no extractor throws on random input.
Done when: the Agent run panel shows Intake as "Structured extraction" with real counts, the audit log records only counts and field kinds (fixed vocabulary), and the privacy tests still pass with canary strings.

## Phase 5: Verification agent v1 (deterministic cross-checks)

Build the Verification agent on top of the Intake structure. Checks must be explainable and each produces a Finding in the shared format with severity, check id, and a plain reason:
- Sender domain is free-mail while the text claims a company or government body.
- The text claims to be from a named UAE authority but no sender domain from the curated official list is present (the curated list is a data file; see Phase 6 for sourcing rules; until it exists this check is "not enabled").
- URL shorteners, raw-IP links, look-alike domain patterns against the curated official list.
- Contact channel mismatch (job offer asks to continue on a messaging app only).
- Inconsistency checks inside the offer (fee mentioned together with "no fees"; salary mentioned in different currencies).
These findings appear in the results as a separate group "Verification checks" and feed the Risk aggregator only through the existing fixed weights (add check ids to the weight table with explicit tests; do not change existing rule weights).
Done when: each check has tests, the aggregator tests prove determinism, the Test Lab gets a "verification checks" section computed from cases, and the Agent run shows Verification as real.

## Phase 6: Official channels guidance (sourced library, strict provenance)

Build the mechanism, not the content:
- A typed guidance library file (data/guidance.json) where every entry has: id, topic, finding types it applies to, plain-language text, official source name, source URL, date last verified, and a reviewer field.
- The loader REFUSES to include an entry that lacks an official source URL or a verified date, and a test enforces this. The UI shows the source link and "last verified" date on every guidance item.
- The agent maps findings to guidance deterministically (no model).
- Content for the library will be supplied by the owner after separate research with citations. Ship the mechanism with an empty or clearly marked sample set that is NOT displayed to users until the owner supplies reviewed content. Do not invent legal or regulatory statements.
Done when: with an empty library the UI shows "Guidance not available yet" honestly, tests cover the refusal rules and the mapping.

Status (2026-11-09, owner decision, committed locally, not pushed): partly built: warning signs only. `/guide` ("Warning signs") shows eight owner-approved signs from `src/lib/warningSigns.ts`, paraphrased from one official page (UAE Government Portal, "Tips to avoid labour and visa fraud"). The typed library, loader refusal rules and finding-to-guidance mapping above are not built.

## Phase 7: Orchestrator v2 (manager with a visible plan)

Build a real Manager that creates a run plan from the Intake result: which workers run, in what order, which are skipped and why (for example, no email domains means domain checks are skipped with a stated reason), with timeouts, typed messages between agents and per-step status (completed, skipped with reason, failed, not implemented).
The UI shows the plan and the real trace with measured durations. A failed worker never breaks the run: the run completes with that step marked failed and the score computed from the remaining deterministic findings, with a visible notice.
Done when: tests cover skip logic, failure isolation, ordering, and timeouts; the audit trail records plan and step statuses with the fixed vocabulary only.

## Phase 8: Rules v2 evaluation cycle (the only phase that may change redFlag.ts)

Process (strict):
1. The owner will provide a new tuning set and a new BLIND holdout 3 written outside the repo. Do not read holdout 3 until the rules are frozen.
2. Work only from the tuning set and docs/defects.md (open rule gaps, H21, QA defects). Add Arabic-script and transliterated patterns, and fix documented gaps, through the same rule structure and the same findings format. Keep the score floor and weights unless a documented defect requires a change, and then justify it.
3. Fuzz-test all new patterns for runtime. Verify every old case still behaves as before unless a documented change explains the difference.
4. Freeze. Record the new redFlag.ts sha256 in docs. Then run holdout 3 once, store per-case scores read-only, compare with the pre-locked pass bar (provided by the owner), and report counts without a self-granted verdict.
5. Update the Test Lab, defects register and test report. Every number must say where it came from.
Done when: all suites are reproducible from the repo and the page shows holdout 3 as blind with its locked bar.

## Phase 9: LLM Explainer layer (guarded, optional, fails closed)

Build behind a provider adapter interface (support Anthropic and Google providers; the owner chooses which to enable). Rules:
- Disabled by default. Enabled only if LLM_ENABLED=true AND the key and limits are present in server environment variables. Never read secrets in client code. Never commit a key; add only variable names to .env.example.
- Input to the model: rule ids, check ids, severities, band, score, language code, and booleans. Never raw text, quotes, names, addresses, numbers or URLs from the offer.
- Output: a strict JSON schema (summary, per-finding plain explanation, next steps). Validate the schema. Reject and fall back to the deterministic explanation if the output contains any URL, any digit not present in the input, any ids not in the input, any imperative to pay, share credentials or contact someone, or exceeds length caps. Log only the fallback reason code.
- Languages: English and Arabic. Machine-generated text must carry a visible label ("Machine-generated explanation; check the findings above"). The Arabic output has not been reviewed by a native speaker; the UI must say so.
- Cost and abuse controls: per-IP rate limit and a global daily call cap through a RateLimiter interface (in-memory for dev and tests, a production adapter via environment variables); if the production limiter is not configured, LLM calls are disabled (fail closed). Request timeout, at most one retry, a kill-switch environment flag, and token counts recorded as numbers only in the audit log.
- The model never sets or alters the score, band, findings or the approval status. The explanation panel is clearly separate from the deterministic result.
- Tests with a fake provider: happy path, schema violations, injection attempts in the structured fields, timeout, provider error, rate-limit exhaustion, kill switch, and a test that proves the request payload to the provider contains none of the canary offer strings. An optional live smoke test runs only when an environment flag is set and is excluded from CI.
Done when: with the feature off everything works unchanged; with the fake provider on, the full flow works; the Agent run shows the Explainer as real, optional and guarded.

## Phase 10: Drafter languages and report export

- Drafter: keep fixed blocks; add Arabic versions of the fixed blocks ONLY as machine-translated text labelled "not reviewed by a native speaker", selectable by the user; the English draft stays the default.
- Report export: a printable and downloadable report (print stylesheet and a PDF through the browser print path; no server-side PDF dependency) containing score, band, findings with evidence, verification checks, guidance items with sources, the explanation if present and labelled, the approval status and a privacy-safe audit summary.
- Optional local history: opt-in, stored only in the user's browser, with a clear delete control, never sent to the server, and stated plainly in the UI. If this cannot be done without storing offer text server-side, do not build it.

## Phase 11: Hardening

- Content-Security-Policy with nonces (follow the Next.js docs in node_modules/next/dist/docs for the correct current mechanism), plus the existing headers. Test the headers.
- Production rate limiting for the check endpoint through the RateLimiter adapter, returning a clear 429 message that never echoes offer text.
- Playwright end-to-end tests against the production build: main flow, keyboard-only flow, mobile viewport, error states, the S4-3 reload scenario, the Test Lab, the Guide empty state. Add axe-core accessibility checks to the e2e tests. Add them to CI.
- npm audit with every finding either fixed or documented; pin versions.
- Performance budget (bundle size and a measured response time on the deployed URL; record real numbers only).
- A threat model document (docs/threat-model.md): assets, trust boundaries, prompt injection, data leakage, cost abuse, denial of service, supply chain; each threat with the mitigation in code and the test that proves it, or marked open.

## Phase 12: Documentation set

- docs/system-card.md: intended use, out-of-scope use, data, evaluation (linking to the Test Lab), failure modes, human oversight, privacy design, limitations, versioning.
- docs/architecture.md with diagrams and the decision log (ADRs) for the major decisions made so far (deterministic scoring, LLM boundary, no server storage of offer text, hash-chained audit, holdout discipline).
- Final consolidation of docs/build-log, docs/defects.md and docs/test-report.md into a day-by-day record: work done, errors found, errors fixed, what was tested, what remains open and why.
- A README with how to run, check, test and deploy, and an honest statement of scope.

---

Start with Phase 1 only.
