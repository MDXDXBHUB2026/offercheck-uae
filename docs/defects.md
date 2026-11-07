# Defect register

One row per defect or review finding. Sources: `docs/rules-backlog.md`, `docs/known-limitations.md`, test files, git history and the review reports of 2026-11-07. Where the repo does not record a date, a severity or who found it, the cell says "unknown". Nothing here is a guess.

Status: **open** (not fixed), **fixed** (fixed, with a proving test), **accepted** (kept as it is, for the reason given).

"Fix commit `fb448af`" means the fix was made before the first commit and is part of it. The repo has no separate commit for it. "This commit" means the commit that adds this file: "Add build log, defect register, test report, no-bypass check and CI".

## Register

| ID | Date found | Found by | Severity | Status | Description | Fix commit | Proving test |
|---|---|---|---|---|---|---|---|
| QA-6 | unknown (Step 1c QA run) | QA run, Step 1c | unknown | open | Invisible characters and look-alike letters survive cleaning: U+2061, U+2062, U+034F, U+FE0F, U+180E, Cyrillic homoglyphs and fullwidth letters. Holdout 2 case H30 passed, but not because of cleaning. | none | none |
| QA-7 | unknown (Step 1c QA run) | QA run, Step 1c | unknown | fixed | The score-0 note said "no rules matched" while it showed a warning mention. | `97e811a` | `src/components/ResultsPanel.test.ts` › does not say no rules matched when it shows a warning mention |
| QA-8 | unknown (Step 1c QA run) | QA run, Step 1c | unknown | fixed | The agent run label implied that Intake extracts claims. | `97e811a` | `src/components/ResultsPanel.test.ts` › labels Intake as text cleaning only |
| QA-9 | unknown (Step 1c QA run) | QA run, Step 1c | unknown | fixed | A medium chip under a low band read as a contradiction. Chips now read "<severity> rule, +N points", with the band thresholds shown. | `97e811a` | `src/components/ResultsPanel.test.ts` › shows each chip as rule points, with the band thresholds beside the score |
| QA-11 | unknown (Step 1c QA run) | QA run, Step 1c | unknown | open | Input made only of hidden characters gets a result. It should get the empty-input error, but the empty check runs before cleaning. | none | none |
| QA-12 | unknown (Step 1c QA run) | QA run, Step 1c | unknown | fixed | The rule count in the UI was a literal 5. It now comes from `RULES.length`, and `page.tsx` is a server component. | `97e811a` | `src/components/ResultsPanel.test.ts` › takes the rule count from its prop; no UI file may hard-code the number of rules |
| QA-13 | unknown (Step 1c QA run) | QA run, Step 1c; found again as review finding REV-L3 on 2026-11-07 | low (REV-L3 rating) | fixed | 20,000 control characters returned the over-limit 413. JSON escapes each one as `\uXXXX` (6 bytes), so the body passed the 81,024-byte cap. The cap is now 122,048 bytes (20,000 × 6 + 2,048). | this commit | `src/app/api/analyze/route.test.ts` › accepts 20,000 control characters; refuses 20,001 control characters with the same 413 message |
| QA-14 | unknown (Step 1c QA run) | QA run, Step 1c | unknown | open | Minor over-matches: `Do not trust anyone using hr.fake@gmail.com` fires RF-005, and `Please reply today if you have any questions about the benefits` fires RF-004. | none | none |
| QA-15 | unknown (Step 1c QA run) | QA run, Step 1c | unknown | fixed | `eval.test.ts` did not assert the precision and recall values. | `97e811a` | `src/lib/agents/eval/eval.test.ts` › matches the recorded tuned precision and recall; computes precision and recall from a known table |
| QA-16 | unknown (Step 2) | full parallel test runs during Step 2 | unknown | fixed | Thin timing margin on the maximum-size test: about 580 ms alone against a 1,000 ms limit, and it failed in 3 of 12 full parallel runs (1,281 ms and 1,248 ms; the third value was not captured). Cause: RF-001 re-split the rest of the sentence into list items for every clause. Fixed on 2026-11-06 with a performance-only guard; band, rule ids and info ids were identical on all 77 cases. The test limit did not change. This is also the "RF-001 list re-splitting timing issue". | `fb448af` | `src/lib/agents/redFlag.test.ts` › handles maximum-size input quickly |
| SRC-1 | unknown | unknown | unknown | fixed | Invisible characters in source files. Raw zero-width and look-alike characters in source are invisible in review. `intake.ts` and the holdout sets now build every such character from an escape sequence. | `fb448af` | `src/lib/agents/eval/holdout.test.ts` › builds the zero-width characters from escape sequences; `holdout2.test.ts` › builds the look-alike letter from an escape sequence |
| H10 | 2026-11-06 | holdout 1 run | unknown | fixed | Holdout 1 miss: a plain request for an OTP ("We need your OTP received on your phone …") scored 0. It was a real miss, not a band dispute. Fixed, and kept as dev regression case R10. This is a tuned result, not a blind one. | `fb448af` | `src/lib/agents/eval/eval.test.ts` › R10 |
| H21 | 2026-11-06 | holdout 2 run | unknown | open | Holdout 2 miss: `Share the 6-digit code we send you …` scores 0, but high with RF-002 was expected. The code pattern needs `sent`, `got` or `receive` after "code", and "we send" also matches the employer-sends exclusion. No rule change is allowed after holdout 2 (pass bar). | none | none |
| GAP-1 | unknown (Step 1d) | Step 1d | unknown | open | An employer named at the start of a list does not cover it: `The company covers visa and medical fees of AED 500` scores 60. | none | none |
| GAP-2 | unknown (Step 1d) | Step 1d | unknown | open | List scope can hide a real ask: `The visa fee of AED 500 and flights are paid by the company` scores 0. | none | none |
| GAP-3 | unknown (Step 1d) | Step 1d | unknown | open | A negated ask verb can reach too far: `We do not require a degree the fee is AED 500` is suppressed. | none | none |
| GAP-4 | unknown (Step 1d) | Step 1d | unknown | open | Warning mentions are not consistent across similar wordings. | none | none |
| GAP-5 | unknown (Step 1d) | Step 1d | unknown | open | Line joins are a heuristic, so an employer-covers phrase can still clear the next line. | none | none |
| GAP-6 | unknown (Step 1d) | Step 1d | unknown | open | Bare fee wording does not fire: `Do not forget the processing fee`, `Security deposit`. | none | none |
| S12 | unknown | dev eval | unknown | accepted | An Arabic visa fee request scores low, but high was expected. The rules are English patterns. Marked `knownMiss`; a test fails if it starts passing. | none | `src/lib/agents/eval/eval.test.ts` › S12 is still a known miss |
| REV-M1 | 2026-11-07 | security-agent review of `fb448af..7e5e1d4` | medium | fixed | `/api/analyze` read the whole body into memory when Content-Length was missing (chunked upload). The body is now read as a stream with a hard cap and cancelled as soon as it passes the cap. | `7839a32` | `src/app/api/analyze/route.test.ts` › streamed body cap (6 tests) |
| REV-M2 | 2026-11-07 | qa-agent review of `fb448af..7e5e1d4` | medium | fixed | Every approval was logged `edited: true`, because approval needs the names filled in. Now two fields: `placeholders` (unfilled/filled) and `text` (template/edited). | `7839a32` | `src/lib/audit.test.ts` › gate records |
| REV-M3 | 2026-11-07 | qa-agent review of `fb448af..7e5e1d4` | medium (accessibility) | fixed | The approve button used native `disabled`, so keyboard and screen-reader users never reached it to hear why it was blocked. It now uses `aria-disabled`, with the reason in a `role="status"` live region. | `7839a32` | `src/components/ApprovalPanel.test.ts`, `ApprovalPanel.click.test.ts` |
| REV-L1 | 2026-11-07 | security-agent review of the `7839a32` diff | low | fixed | A sentence added to the greeting or sign-off line was logged as template text. A name is now one to five words with no sentence punctuation. Fixed before `7839a32` was committed. | `7839a32` | `src/lib/agents/drafter.test.ts` › counts a sentence added to the greeting or sign-off line as edited |
| REV-L2 | 2026-11-07 | security-agent review of the `7839a32` diff (from reading Next's source, not a run) | low | accepted | Concern: cancelling the body stream could reset the connection, so a real client might never see the 413. Not reproduced over a real socket; see the evidence below. Kept as is. | none needed | manual check below; unit tests in `route.test.ts` |
| REV-L3 | 2026-11-07 | security-agent review of the `7839a32` diff | low | fixed | Same issue as QA-13. | this commit | see QA-13 |
| REV-I1 | 2026-11-07 | security-agent review of the `7839a32` diff | info | fixed | The approval label checked the draft against any of the 512 templates, but the audit entry checked against this run's template, so the two could disagree. Both now use one check (`draftState`) against this run's template, kept in the gate flow. | this commit | `src/lib/audit.test.ts` › labels and logs a draft swapped for another template's wording as edited, the same way |
| REV-L4 | 2026-11-07 | qa-agent review of `fb448af..7e5e1d4` | low | fixed | A double-click on approve logged two approvals. Gate entries are now computed from the latest gate state. | `7e5e1d4` | `src/lib/audit.test.ts` › logs one approval for a double-click |
| REV-L5 | 2026-11-07 | security-agent review of `fb448af..7e5e1d4` | low | fixed | The browser did not check the shape of the `/api/analyze` reply. | `7e5e1d4` | `src/lib/audit.test.ts` › isAnalyzeResponse |
| REV-L6 | 2026-11-07 | qa-agent review of `fb448af..7e5e1d4` | low | fixed | The audit trail showed the raw value `not_implemented`, and its failure message sat inside the collapsed list. | `7e5e1d4` | `src/components/AuditTrail.test.ts` |
| REV-O1 | 2026-11-07 | security-agent reviews | not rated | open | No rate limit or cost cap on `/api/analyze`. A slow client can hold a request open until Node's request timeout. | none | none |
| REV-O2 | 2026-11-07 | security-agent reviews | info | accepted | The audit hash chain is unkeyed, so it is tamper-evident, not tamper-proof. Stated in `docs/known-limitations.md`. No secret may be used for the audit trail. | none | none |
| S4-1 | 2026-11-07 | Step 4 browser check | low | open | The "Check offer" button uses native `disabled` while the text box is empty. A keyboard user cannot reach it, and no text says why it is unavailable. The approve button already uses `aria-disabled` with a reason (REV-M3); this button does not yet. Not changed in Step 4, which was presentation only. | none | none |
| S4-2 | 2026-11-07 | Step 4 contrast check | low | fixed | The design's border colour `#e2ded4` is 1.34:1 on white, below the 3:1 that WCAG 1.4.11 asks for form-control edges. The text box and secondary buttons now use `--control-border` `#7a8481` (3.86:1). Cards keep the light border, which is decorative. | this commit | manual: contrast table in `docs/build-log/2026-11-07.md` |
| S4-3 | 2026-11-07 | Step 4 keyboard pass | unknown | open | During the first keyboard pass, after approving, three Tabs and Enter reloaded the page (a `GET /` was logged, no console error). A second identical pass reached the audit summary as expected (Edit draft, Discard, summary). Not reproduced; the cause is unknown. It may be focus leaving the page into the browser UI in the automated browser. | none | none |
| S4-4 | 2026-11-07 | Step 4 browser check | low | open | The Chrome DevTools accessibility snapshot did not show the sample buttons' `role="group"` with its name "Try a synthetic sample:". Not checked with a screen reader. | none | none |

## REV-L2 evidence: what a real client receives

Run on 2026-11-07, on Windows 11 with Node 24.19.0 and Next 16.4.5. The test was `npm run build`, then `next start -p 3107` with no proxy or middleware, then curl 8.21.0 against `http://localhost:3107/api/analyze`. The cap was 122,048 bytes.

| Case | Request | Client received |
|---|---|---|
| A | 300,011-byte JSON body, `Transfer-Encoding: chunked`, no Content-Length | `HTTP/1.1 413 Payload Too Large` with body `{"error":"Offer text must be 20,000 characters or fewer."}`. curl exit 0. The headers `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and `X-Frame-Options: DENY` were present. |
| E | 20,971,531-byte JSON body, chunked, no Content-Length | 413 with the same JSON body. curl exit 0. curl stopped after uploading 655,320 bytes, in 0.016 s. |
| B | small valid JSON body, chunked | 200 |
| C | 300,011-byte body with Content-Length | 413 with the same JSON body |

Command for case A (the body file was made with `JSON.stringify({text: "a".repeat(300000)})`):

```
curl -sS -i -X POST http://localhost:3107/api/analyze -H "Content-Type: application/json" -H "Transfer-Encoding: chunked" --data-binary @big.json
```

Result: the client gets the 413 JSON. The connection was not reset, and the server did not take the whole 20 MB body. REV-L2 is **accepted**: no code change is needed. Not tested: a hosting proxy in front of the app, which may buffer or cut bodies differently.
