# Test report

As of 2026-11-08, updated after `d31f511` (Step 5 hero, background video and glass theme; pushed to `main`). Every number gives its source. No test here ran against a live URL; the Vercel deployment of `d31f511` was not verified.

## Unit and component tests per suite

Source: `npx vitest run --reporter=json` on Windows 11, Node 24.19.0. Total: **779 tests in 21 files, 779 passed, 0 failed, 0 skipped**. (Step 3: 588 in 18 files. Step 4: 680 in 19 files. Phase 1: 755 in 21 files.)

| Suite | Tests | Passed | What it covers | What it does not cover |
|---|---|---|---|---|
| `src/lib/agents/redFlag.test.ts` | 213 | 213 | The five rules on fixed sentences: negation, lists, payer wording, warning mentions, evidence quotes, maximum-size timing | Wording nobody wrote a case for, non-English text, look-alike letters (QA-6) |
| `src/lib/audit.test.ts` | 104 | 104 | Run records, hash chain and `verifyAuditLog`, gate records (`placeholders`, `text`), one check for label and log, `isAnalyzeResponse`, privacy over all eval and holdout offers, no env | A real browser session; a tamper-proof chain, which it is not designed to be |
| `src/lib/agents/eval/eval.test.ts` | 48 | 48 | Every dev eval case, known misses, recorded precision and recall, `confusion()` | Blind performance: these cases were used for tuning |
| `src/lib/approvalGate.test.ts` | 38 | 38 | Gate states, placeholder refusal, labels, events hold no draft, clipboard | The React wiring in `OfferChecker.tsx` |
| `src/lib/agents/intake.test.ts` | 32 | 32 | Hidden characters removed, line joins, line endings | Look-alike letters and the hidden characters listed in QA-6 |
| `src/lib/agents/drafter.test.ts` | 29 | 29 | The five draft cases, block order, no offer text in drafts, template wording with names filled | Tone or quality of the wording as read by a person |
| `src/components/design.test.ts` | 89 | 89 | Arithmetic line agrees with the score on every fixture; gauge is decorative; only measured times; limitations text; sample buttons and their labelled group | Visual layout and real screen-reader output |
| `src/app/page.test.ts` | 47 | 47 | The prototype notice in the site-wide strip and footer; `/` is the Check workspace; no console, logger, file write or browser storage in any source file (more files since Phase 1) | Logging added by the host or a proxy |
| `src/app/routes.test.ts` | 67 | 67 | Every route has a title, description and one h1 and adds no landmark of its own; placeholders say "Not built yet" with no numbers; nav covers every route; layout has skip link and one main; header `aria-current`, no menu button without script, menu button `aria-expanded`/`aria-controls` with script; footer wording; error pages never show the error message or digest; not-found; loading; check-request failures never echo a server string; shared UI components; WCAG AA contrast of the token pairs in `globals.css`, including the glass sheen (`--surface-top`) and hero text over the video's 0.12 brightness limit; one dark theme; motion only without a reduced-motion preference; header action link; hero screen equals `runManager` on the synthetic fee-scam sample; backdrop video `aria-hidden`, muted, looping, no `autoplay` attribute, no button, no MP4 audio track, files under 1 MB | Real focus movement and the Escape key (checked by hand in Chrome, see the build log); contrast of colours not set by a token; the video's real brightness (the test pins the 0.12 limit as a constant; the decoded maxima were measured by a manual script, see `docs/build-log/2026-11-08.md`); playback in a browser |
| `src/components/OfferChecker.test.ts` | 11 | 11 | Check offer is `aria-disabled` with a reason (S4-1); an empty or blank submit does not fetch, a filled one fetches once; character counter; results order; stub timeline; gauge `--score`; placeholder marks; approve reason under the actions | A real browser click and network failure (checked by hand) |
| `src/components/ApprovalPanel.test.ts` | 20 | 20 | Markup per gate state, `aria-disabled`, reason live region, focusable buttons | Real focus movement and screen-reader output (no DOM in tests) |
| `src/app/api/analyze/route.test.ts` | 16 | 16 | 20,000-character limit, body cap, streamed and chunked bodies, false Content-Length, 20,000 control characters, no echo | A real socket. That was checked by hand once; see REV-L2 in `docs/defects.md`. Rate limiting does not exist (REV-O1) |
| `src/lib/scoring.test.ts` | 14 | 14 | Weights, bands, score floor | Whether the weights are right for real offers |
| `src/lib/agents/manager.test.ts` | 13 | 13 | Step order, stub statuses, durations | Real agents for verification and official-channel, which are not built |
| `src/components/ResultsPanel.test.ts` | 13 | 13 | Score-0 note, chips, rule count, stub labels, server-component check (now also `src/app/check/page.tsx`) | Visual layout |
| `scripts/check-no-bypass.test.mjs` | 10 | 10 | The no-bypass check passes on this repo and fails on each banned pattern | Bypasses the patterns do not name |
| `src/lib/agents/eval/holdout.test.ts` | 4 | 4 | The holdout 1 set is unchanged and its result is in the docs | It never runs the rules: holdout 1 is consumed |
| `src/lib/agents/eval/holdout2.test.ts` | 4 | 4 | The holdout 2 set is unchanged and its result is in the docs | It never runs the rules: holdout 2 is consumed |
| `src/components/AuditTrail.test.ts` | 3 | 3 | Entries shown with no offer text, stub labels, failure message | The "chain broken" label: effects do not run in static render |
| `src/components/ApprovalPanel.click.test.ts` | 3 | 3 | The approve click does nothing while blocked and approves when filled | A real click in a browser |
| `src/app/headers.test.ts` | 1 | 1 | The three response headers in `next.config.ts`, no CSP | Headers added or removed by a host |

**Other checks.** Source: the commands, run locally.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run check:no-bypass` passed.
- Client bundle (2026-11-08, after `d31f511`; same result as Phase 1): an ad hoc script found 29 regex literals and 47 string phrases of 12 or more characters in `src/lib/agents/redFlag.ts` and searched the 14 files in `.next/static`. **0 regex literals** were found. 9 phrases were found, all rule ID labels (`fee_requested`, `free_email_contact` and so on) that `ResultsPanel.tsx` already used at `7334612`; no pattern or matching text. (Step 4 counted 28 literals with a different script.)
- `redFlag.ts` sha256 `789dc2b29a30940951257c677bddcb4eaf995bb8a187a19e3583ca51d1ebb76f`, unchanged; `redFlag.ts` and `scoring.ts` have no diff against `7334612`.

**Not covered by any suite:**
- End-to-end browser journeys. Playwright is not set up, and there is no deployed URL.
- Response time (plan acceptance criterion 1).
- Real users and real offers.

## Dev eval (tuned, not blind)

Source: `src/lib/agents/eval/eval.test.ts`, test "matches the recorded tuned precision and recall". Recorded on 2026-11-07 with `redFlag.ts` sha256 `789dc2b2…`.

- **Set:** 43 labelled synthetic offers (eval.test.ts, "has 43 labelled offers").
- **Flagged** means band medium or high.

| True positives | False positives | False negatives | True negatives | Precision | Recall |
|---|---|---|---|---|---|
| 17 | 1 | 1 | 24 | 17/18 (0.944) | 17/18 (0.944) |

These are the cases the rules were tuned on, so they say little about new wording. Known miss: S12, an Arabic fee request (`docs/known-limitations.md`). This report does not name which case is the false positive or which is the false negative, because the test records only the counts.

## Holdout 1 (consumed)

Source: `docs/rules-backlog.md` and `src/lib/agents/eval/holdout.test.ts`.

- **Run:** once, on 2026-11-06, against `redFlag.ts` sha256 `f3570f8f…`, which was before the Step 1d fixes.
- **Strict:** 11 of 18.
- **Right rule counted as a pass:** 15 of 18.
- **H10** was a real miss. It was fixed afterwards and kept as dev case R10, which is now a tuned result.
- **Strict failures that stay strict failures:** H01, H09, H14 and H17. They fired the expected rule but scored high against an expected medium.
- No pass bar was set for holdout 1.

## Holdout 2 (consumed) and the locked pass bar

Source: `docs/holdout2-pass-bar.md`, `docs/rules-backlog.md` and `src/lib/agents/eval/holdout2.test.ts`.

- **Run:** once, on 2026-11-06, after the rules were frozen at `redFlag.ts` sha256 `05d05e13…`.
- **Result:** 15 of 16 passed. The one failure is H21, a scam expected high with RF-002, which scored 0.

**Pass bar.** It was locked on 2026-11-06, before the run. The owner applies it; this report gives counts only.

| Bar item | Required | Count | Where the count comes from |
|---|---|---|---|
| Scam cases flagged (medium or high) | at least 5 of 7 | 6 of 7 | Derived. Only H21 failed, and every other scam case passed at its expected band of medium or high. |
| Legitimate cases flagged (medium or high, or any points) | at most 1 of 8 | 0 of 8 by band | Derived. All 8 passed at their expected band, low, with no rules. The repo does not record each case's score, so "any points" cannot be confirmed from files. |
| Legitimate cases flagged high | 0 | 0 | Derived as above |
| H30, a stress case reported separately | not counted | passed | `docs/rules-backlog.md`. RF-001 fired on "fee of AED 500", not on the look-alike word, so this does not show that look-alike letters are handled. |

Holdout 2 may not be re-run, so these counts cannot be re-checked by running it again.

## What none of the numbers above show
- **Real offers:** every set is synthetic and small. There are 43 dev cases, 18 in holdout 1 and 16 in holdout 2.
- **Other languages:** the fee, credentials, document and urgency rules are English only.
- **Verification:** no company, domain or offer number is checked; those agents are not built.
- **Real use:** nothing here measures speed on a deployed URL or behaviour under load.
