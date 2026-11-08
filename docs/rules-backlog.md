# Rules backlog

Open items only.

## Holdout 1 (consumed)

Source: one run of `src/lib/agents/eval/holdout.ts` on 2026-11-06, with `redFlag.ts` at sha256 `f3570f8f1169ecb248dad6447deeb149010c23109bc6aee8936031122c729972`.

Reported two ways: strict 11 of 18, and right rule counted as a pass 15 of 18. H10 was a real miss, not a band dispute.

The score floor stays and no holdout 1 case is relabelled. H01, H09, H14 and H17 fired the expected rule and scored high against an expected medium, so they stay as strict failures.

H02, H10 and H18 are fixed and live on as dev regression cases R02, R10 and R18. Those are tuned results, not blind ones.

## Holdout 2

Source: one run of `src/lib/agents/eval/holdout2.ts` on 2026-11-06, with `redFlag.ts` at sha256 `05d05e13d896352e32624e905fd271fb88a4ada86549ff1dbd522cbda23d41ef`. The set was read only after the rules were frozen. 15 of 16 passed, and no rule, regex, label or threshold changed afterwards until Batch A (2026-11-08). After tuning, H21 also passes; that is a tuned result, not a blind one, and the blind result stays 15 of 16.

- **H21: `Share the 6-digit code we send you` is missed. Fixed by tuning in Batch A (2026-11-08): now 60, High, RF-002.** Expected high with RF-002. Got score 0 in the blind run. A live scam wording scores 0 here. The code pattern needs `sent`, `got` or `receive` after "code", and "we send" also matches the employer-sends exclusion for the whole part.
- **H30 passed, but this does not show that look-alike letters are handled.** The Cyrillic letter sits in "visa", and RF-001 fired on "fee of AED 500", which has none. QA defect 6 stays open.

## Known gaps from Step 1d

- **An employer named at the start of a list does not cover it. Fixed in Batch A (GAP-1), for cost items the employer usually pays; see `docs/known-limitations.md` for what still scores High.** `The company covers visa and medical fees of AED 500` scored 60, because the split at "and" takes the amount away from the employer wording. A payer named at the end of a list does cover it.
- **List scope can hide a real ask.** `The visa fee of AED 500 and flights are paid by the company` scores 0, because the fee reads as a list item covered by the payer named last. The wording is ambiguous.
- **A negated ask verb can reach too far.** `We do not require a degree the fee is AED 500` is suppressed, because only a new payment verb ends the reach of the negation.
- **Warning mentions are not consistent.** `Beware of agents who charge a fee` shows an info finding, but `Beware of agents asking for a processing fee` shows none, and neither does `There is no agency fee`.
- **Line joins are a heuristic.** A break stays before a list row, a label row or an ask verb, and after a one-word heading. Other one-idea-per-line text is joined, so an employer-covers phrase can still clear the next line if that line starts with some other word.
- **Bare fee wording does not fire.** `Do not forget the processing fee` and `Security deposit`.

## Post-deploy manual test A3

Checked again on 2026-11-08 against the local production build, with `redFlag.ts` at sha256 `789dc2b29a30940951257c677bddcb4eaf995bb8a187a19e3583ca51d1ebb76f`: score 20, band low, one finding (RF-003, quote `Send your passport copy`).

- **Gap (GAP-7): a request for a photo of a bank card is missed. Fixed in Batch A: RF-002 now fires, and the A3 text scores 60, High (RF-002 and RF-003).** Found by post-deploy manual test A3, synthetic text, not yet in any eval set. `Send your passport copy, Emirates ID and a photo of your bank card today, before any interview.` scores 20, Low, with RF-003 only. `photo of your bank card` matches no RF-002 pattern. RF-002 covers `card number` or `card details`, and a share verb followed by a password, a code, a card number or a PIN.
- **Design question: the rules cannot see timing.** Found by post-deploy manual test A3, synthetic text, not yet in any eval set. A request made before an interview or a written offer reads the same to the rules as one made later. A single RF-003 match on its own stays below the 30-point medium threshold. This is a candidate for the Phase 8 rules cycle, with a fresh blind holdout 3.

## Manual QA misses, 2026-11-08 (for the rules v2 cycle)

Logged only. No rule changed: `redFlag.ts` stays sha256 `789dc2b29a30940951257c677bddcb4eaf995bb8a187a19e3583ca51d1ebb76f`. Results below are from probes run on 2026-11-08 against that file. Synthetic text.

- **Design question (band design): one medium rule alone stays Low.** Each medium rule adds 20 points, and medium starts at 30, so a single medium match is always Low, whatever was asked for. A3 (GAP-7), A4 and B2 below all land there. Owner's position: a bank-details request should not read as a plain Low. The UI now shows such a result as "Low, review the findings below" (UX-1), but the band is unchanged. For Phase 8, with a fresh blind holdout 3.
- **Band design: decided, no threshold change; UX-1 amber chip covers a Low score with a finding.** Owner decision, Batch A (2026-11-08). Lowering medium to 20 was measured on the 77 cases: it would only move L09 and L10, two honest cases expected Low, to Medium. A3 is fixed by GAP-7 instead. A4 and B2 stay Low 20 with the amber chip.
- **A3 (GAP-7): ID or passport copy requested, scored Low 20.** Already logged above under Post-deploy manual test A3. Linked to the band design question.
- **A4: a vague request for documents with no context, scored Low.** Distinct from GAP-7, which is a missed bank-card photo. The exact A4 text is not recorded in the repo, and UX-1 records a different A4 text (urgency, `Reply within 2 hours or this offer is cancelled. Only 3 slots left.`). Two probes, `Send your documents.` and `Please share the documents.`, score 0 with no rule, because RF-003 fires only on a passport, an Emirates ID, bank details, a bank statement or an IBAN. If A4 scored 20, one medium rule fired and it belongs with the band design question. Its UI side is UX-1.
- **B2: "send bank details, IBAN" scored Low 20.** Probe `Send your bank details, IBAN`: score 20, RF-003 only (quote `Send your bank details`); the credentials rule RF-002 did not fire. Linked to the band design question.
- **C4: closed, not a rules defect.** As typed in the QA run, `we do not need a degree, but pass AED fee` scored 0; "pass" was a typo for "pay". Live retest (owner, 2026-11-08): `We do not need a degree, but pay AED 500 fee` scores 60, High, RF-001. Local probes against the same `redFlag.ts` agree: `pay AED 500 fee` and `pay AED fee` (no amount) both score 60, RF-001, so the "do not" before the comma does not cancel the fee. The remaining gap is a known limit, not a defect: fee wording with neither a payment verb the rule knows nor an amount, such as `pass AED fee`, scores 0 (see "Fixed rules can miss wording" in `docs/known-limitations.md`).
- **GAP-3: a negated ask verb can reach too far.** Exists: `docs/defects.md` GAP-3 and Known gaps from Step 1d above.
- **GAP-7: a request for a photo of a bank card is missed.** Exists: `docs/defects.md` GAP-7 and Post-deploy manual test A3 above.

## QA defects deferred

Numbers come from the Step 1c QA run.

6. **Invisible characters and look-alike letters survive cleaning.** U+2061, U+2062, U+034F, U+FE0F, U+180E, Cyrillic homoglyphs and fullwidth letters.
11. **Hidden-only input gets a result.** It should get the empty-input error, because the check runs before cleaning.
13. **Wrong error for escaped input.** 20,000 control characters returned the over-limit 413. Fixed on 2026-11-07: the body cap is now 122,048 bytes (20,000 characters at 6 bytes each for JSON `\uXXXX` escapes, plus 2,048), so any offer within the character limit fits. See `docs/defects.md`.
14. **Minor over-matches.** `Do not trust anyone using hr.fake@gmail.com` fires RF-005. `Please reply today if you have any questions about the benefits` fires RF-004.
16. **Thin timing margin on the maximum-size test.** Input of `"a, "` repeated takes about 580ms alone, against the 1000ms test limit. It failed in 3 of 12 full parallel runs during Step 2 (1,281ms and 1,248ms measured; the third value was not captured) and passed 3 of 3 runs alone. Cause: RF-001 split the rest of the sentence into list items for every clause, so cost grew with clauses times list items. Fixed on 2026-11-06 with a performance-only guard, and the test limit did not change. The list check now runs only for a part with a hit and only when a payer appears in that tail. `redFlag.ts` is now sha256 `789dc2b29a30940951257c677bddcb4eaf995bb8a187a19e3583ca51d1ebb76f`. Band, rule ids and info ids were identical before and after on all 77 cases.

Defects 7, 8, 9, 12 and 15 were fixed on 2026-11-07 in the UI and tests only. `redFlag.ts` did not change.

## Evidence quotes

Quotes are whole clauses, so a quote can hold more than the matched phrase.
