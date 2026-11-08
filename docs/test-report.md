# Test report

As of 2026-11-08, updated for QA round 2 (LANG-2 and COPY-1, the QA round 2 commit, see git log) on top of the QA fix batch `34903e2` (UX-1, LANG-1, nav "Soon" badge, approval wording). Every number gives its source. No automated test here ran against a live URL. The live site was checked by hand; see "Manual post-deploy QA (live site)" below.

## Unit and component tests per suite

Source: `npx vitest run --reporter=json` on Windows 11, Node 24.19.0. Total: **1003 tests in 25 files, 1003 passed, 0 failed, 0 skipped**. (Step 3: 588 in 18 files. Step 4: 680 in 19 files. Phase 1: 755 in 21 files. After `d31f511`: 779 in 21 files. QA fix batch `34903e2`: 832 in 22 files. QA round 2 and COPY-1: 855 in 22 files. Batch A: 957 in 24 files.)

| Suite | Tests | Passed | What it covers | What it does not cover |
|---|---|---|---|---|
| `src/lib/agents/redFlag.test.ts` | 213 | 213 | The five rules on fixed sentences: negation, lists, payer wording, warning mentions, evidence quotes, maximum-size timing | Wording nobody wrote a case for, non-English text, look-alike letters (QA-6) |
| `src/lib/agents/redFlag.batchA.test.ts` | 73 | 73 | Batch A, written before the change: GAP-1 list-head cover (cost nouns covered, fee nouns, `sponsors` and candidate markers still fire), H21 code requests, GAP-7 card photos (named card, Mastercard, Visa card, generic card only with a card detail), a negation case for each, one test per known residual asserting current behaviour, band thresholds unchanged, 14 timing tests on 50,000 characters of adversarial input | Wording nobody wrote a case for; the residual misses it pins |
| `src/lib/agents/redFlag.batchA1.test.ts` | 48 | 48 | Batch A.1, written before the change (plus the owner's 4 probe texts, added after they matched): a card detail across a comma in the same sentence, a code to enter with a link, URL, click or WhatsApp, `provides` as a list head with the fee-noun gate; negative, negation and known-residual cases for each; 9 timing tests on 50,000 characters | Wording nobody wrote a case for; the residual misses it pins |
| `src/lib/audit.test.ts` | 104 | 104 | Run records, hash chain and `verifyAuditLog`, gate records (`placeholders`, `text`), one check for label and log, `isAnalyzeResponse`, privacy over all eval and holdout offers, no env | A real browser session; a tamper-proof chain, which it is not designed to be |
| `src/lib/agents/eval/eval.test.ts` | 48 | 48 | Every dev eval case, known misses, recorded precision and recall, `confusion()` | Blind performance: these cases were used for tuning |
| `src/lib/approvalGate.test.ts` | 38 | 38 | Gate states, placeholder refusal, labels, events hold no draft, clipboard | The React wiring in `OfferChecker.tsx` |
| `src/lib/agents/intake.test.ts` | 32 | 32 | Hidden characters removed, line joins, line endings | Look-alike letters and the hidden characters listed in QA-6 |
| `src/lib/agents/drafter.test.ts` | 29 | 29 | The five draft cases, block order, no offer text in drafts, template wording with names filled | Tone or quality of the wording as read by a person |
| `src/components/design.test.ts` | 118 | 118 | Arithmetic line agrees with the score on every fixture; gauge is decorative; only measured times; limitations text; sample buttons and their labelled group; score chip per state (UX-1: clean 0, low with a finding, low with a warning only, medium, high), the announcement uses the chip's wording, amber caution CSS; LANG-2: tier 1 with no finding gets the neutral chip and a "could not check" findings line with no tick, tier 1 with a finding keeps its chip, tier 2 and no notice unchanged, score and findings unchanged, neutral CSS, Risk aggregator row agrees with the chip in tier 1 and shows the server summary otherwise; COPY-1: public limitations copy has no file paths, defect ids, phase names or backticks (one test per banned term), is ASCII only, has one item per bullet of the doc section (8), and the page shows the intro and all 8 items | Visual layout and real screen-reader output |
| `src/app/page.test.ts` | 51 | 51 | The prototype notice in the site-wide strip and footer; `/` is the Check workspace; no console, logger, file write or browser storage in any source file (one test per file, so new files add tests) | Logging added by the host or a proxy |
| `src/app/routes.test.ts` | 71 | 71 | Every route has a title, description and one h1 and adds no landmark of its own; placeholders say "Not built yet" with no numbers; nav covers every route; layout has skip link and one main; header `aria-current`, no menu button without script, menu button `aria-expanded`/`aria-controls` with script; footer wording; error pages never show the error message or digest; not-found; loading; check-request failures never echo a server string; shared UI components; WCAG AA contrast of the token pairs in `globals.css`, including the glass sheen (`--surface-top`) and hero text over the video's 0.12 brightness limit; one dark theme; motion only without a reduced-motion preference; header action link; nav "Soon" badge and `<label>, coming soon` name exactly on the placeholder pages, and its muted-on-fill contrast; UX-1 caution chip contrast; LANG-2 neutral chip contrast (ink on fill); hero screen equals `runManager` on the synthetic fee-scam sample; backdrop video `aria-hidden`, muted, looping, no `autoplay` attribute, no button, no MP4 audio track, files under 1 MB | Real focus movement and the Escape key (checked by hand in Chrome, see the build log); contrast of colours not set by a token; the video's real brightness (the test pins the 0.12 limit as a constant; the decoded maxima were measured by a manual script, see `docs/build-log/2026-11-08.md`); playback in a browser |
| `src/components/OfferChecker.test.ts` | 22 | 22 | Check offer is `aria-disabled` with a reason (S4-1); an empty or blank submit does not fetch, a filled one fetches once; character counter; results order; stub timeline; gauge `--score`; placeholder marks; approve reason under the actions; LANG-1 notice belongs to the checked result (set from the submitted text, cleared when a new check starts, unchanged by later edits), shown in the score card in every band with no offer text; LANG-2 chip and announcement follow the checked result's tier; Batch A offer notice recorded at check time, shown only for Low with no signal and not tier 1, no offer text in it | A real browser click and network failure (checked by hand) |
| `src/components/ApprovalPanel.test.ts` | 23 | 23 | Markup per gate state, `aria-disabled`, reason live region, focusable buttons; pre-approval note kept, post-approval note for copied and clipboard-blocked | Real focus movement and screen-reader output (no DOM in tests) |
| `src/lib/textScript.test.ts` | 30 | 30 | LANG-1 helper: tier boundaries at 49/50/51% and 9/10 letters, calibration sentences (letters recounted in code), English, empty, digits/emoji/punctuation only, injection-style text, other scripts, fixed wordings, not imported by rules, scoring or server; on the 77 eval cases tier 1 fires on S12 only and tier 2 on none | Real mixed-language offers; Latin-script non-English text; look-alike letters |
| `src/lib/offerLikeness.test.ts` | 21 | 21 | Batch A case 4: signal groups, whole words, no signal in non-offer text, injection-style text, 50,000-character timing, the notice condition (Low, no group, not tier 1), fixed wording, score unchanged; on the 77 cases 29 have no signal, the label-based notice set is 10 honest cases and no scam, and on the dev set with the real rules it is the 5 honest cases; not imported by rules, scoring, Intake or server | Real non-offer messages; non-English signal words |
| `src/app/api/analyze/route.test.ts` | 16 | 16 | 20,000-character limit, body cap, streamed and chunked bodies, false Content-Length, 20,000 control characters, no echo | A real socket. That was checked by hand once; see REV-L2 in `docs/defects.md`. Rate limiting does not exist (REV-O1) |
| `src/lib/scoring.test.ts` | 14 | 14 | Weights, bands, score floor | Whether the weights are right for real offers |
| `src/lib/agents/manager.test.ts` | 13 | 13 | Step order, stub statuses, durations | Real agents for verification and official-channel, which are not built |
| `src/components/ResultsPanel.test.ts` | 13 | 13 | Score-0 note, chips, rule count, stub labels, server-component check (now also `src/app/check/page.tsx`) | Visual layout |
| `scripts/check-no-bypass.test.mjs` | 10 | 10 | The no-bypass check passes on this repo and fails on each banned pattern | Bypasses the patterns do not name |
| `src/lib/agents/eval/holdout.test.ts` | 4 | 4 | The holdout 1 set is unchanged and its result is in the docs | It never runs the rules: holdout 1 is consumed |
| `src/lib/agents/eval/holdout2.test.ts` | 5 | 5 | The holdout 2 set is unchanged, its blind result and the separate tuned note are in the docs, and the recorded `redFlag.ts` sha256 is the current file | It never runs the rules: holdout 2 is consumed |
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
- End-to-end browser journeys. Playwright is not set up. The live site was checked by hand only (below).
- Response time (plan acceptance criterion 1).
- Real users and real offers.

## Manual post-deploy QA (live site)

Source: the owner's manual run on the live site (https://offercheck-uae.vercel.app/), reported on 2026-11-08. Not automated and not re-run here. "Owner-verified" means the owner checked it and no tool output is stored in the repo.

- Sections A to F were run.
- A to D: the misses found are logged in `docs/rules-backlog.md` › Manual QA misses, 2026-11-08, and in `docs/defects.md` (UX-1, LANG-1, GAP-7).
- E1 to E9: pass (owner-verified).
- F1 404 page: pass.
- F2 keyboard: pass (owner-verified).
- F3 reduced motion: pass (owner-verified). S5-1 (no pause control on the background video) is still open.
- F4 390 px: pass on a phone (owner-verified), plus a measured Check-screen layout with no overflow.
- F5 PageSpeed Insights, Mobile: Performance 97, Accessibility 100, Best Practices 100, SEO 100.
- Four nav pages (How it works, Test Lab, Guide, About and limits) are placeholders by the roadmap. They now carry a "Soon" badge.

These results are for the deployed build. The QA fix batch above is not deployed.

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
- **After tuning (Batch A, 2026-11-08):** H21 also passes (60, High, RF-002). This is a tuned result, not a blind one: the fix was made knowing the miss. The blind result above stays 15 of 16, and the pass bar counts below are from the blind run.

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
