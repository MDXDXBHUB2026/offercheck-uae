# Rules backlog

Open items only.

## Holdout 1 (consumed)

Source: one run of `src/lib/agents/eval/holdout.ts` on 2026-11-06, with `redFlag.ts` at sha256 `f3570f8f1169ecb248dad6447deeb149010c23109bc6aee8936031122c729972`.

Reported two ways: strict 11 of 18, and right rule counted as a pass 15 of 18. H10 was a real miss, not a band dispute.

The score floor stays and no holdout 1 case is relabelled. H01, H09, H14 and H17 fired the expected rule and scored high against an expected medium, so they stay as strict failures.

H02, H10 and H18 are fixed and live on as dev regression cases R02, R10 and R18. Those are tuned results, not blind ones.

## Holdout 2

Source: one run of `src/lib/agents/eval/holdout2.ts` on 2026-11-06, with `redFlag.ts` at sha256 `05d05e13d896352e32624e905fd271fb88a4ada86549ff1dbd522cbda23d41ef`. The set was read only after the rules were frozen. 15 of 16 passed, and no rule, regex, label or threshold changed afterwards.

- **H21: `Share the 6-digit code we send you` is missed.** Expected high with RF-002. Got score 0. A live scam wording scores 0 here. The code pattern needs `sent`, `got` or `receive` after "code", and "we send" also matches the employer-sends exclusion for the whole part.
- **H30 passed, but this does not show that look-alike letters are handled.** The Cyrillic letter sits in "visa", and RF-001 fired on "fee of AED 500", which has none. QA defect 6 stays open.

## Known gaps from Step 1d

- **An employer named at the start of a list does not cover it.** `The company covers visa and medical fees of AED 500` scores 60, because the split at "and" takes the amount away from the employer wording. A payer named at the end of a list does cover it.
- **List scope can hide a real ask.** `The visa fee of AED 500 and flights are paid by the company` scores 0, because the fee reads as a list item covered by the payer named last. The wording is ambiguous.
- **A negated ask verb can reach too far.** `We do not require a degree the fee is AED 500` is suppressed, because only a new payment verb ends the reach of the negation.
- **Warning mentions are not consistent.** `Beware of agents who charge a fee` shows an info finding, but `Beware of agents asking for a processing fee` shows none, and neither does `There is no agency fee`.
- **Line joins are a heuristic.** A break stays before a list row, a label row or an ask verb, and after a one-word heading. Other one-idea-per-line text is joined, so an employer-covers phrase can still clear the next line if that line starts with some other word.
- **Bare fee wording does not fire.** `Do not forget the processing fee` and `Security deposit`.

## QA defects deferred

Numbers come from the Step 1c QA run.

6. **Invisible characters and look-alike letters survive cleaning.** U+2061, U+2062, U+034F, U+FE0F, U+180E, Cyrillic homoglyphs and fullwidth letters.
7. **The score-0 screen contradicts itself.** It says no rules matched while showing a warning mention.
8. **The Agent run panel overstates Intake.** Intake is only a text cleaner so far.
9. **The band label can disagree with the severity chip.** `Send your passport copy` shows a medium chip under a low band.
11. **Hidden-only input gets a result.** It should get the empty-input error, because the check runs before cleaning.
12. **The rule count is hard-coded in the UI.** `page.tsx` and `ResultsPanel.tsx` use a literal 5.
13. **Wrong error for escaped input.** 20,000 control characters return the over-limit 413.
14. **Minor over-matches.** `Do not trust anyone using hr.fake@gmail.com` fires RF-005. `Please reply today if you have any questions about the benefits` fires RF-004.
15. **Test gaps.** `eval.test.ts` checks that the confusion counts add up, not the precision and recall values.
16. **Thin timing margin on the maximum-size test.** Input of `"a, "` repeated takes about 580ms alone, against the 1000ms test limit. It failed in 3 of 12 full parallel runs during Step 2 (1,281ms and 1,248ms measured; the third value was not captured) and passed 3 of 3 runs alone. Cause: RF-001 split the rest of the sentence into list items for every clause, so cost grew with clauses times list items. Fixed on 2026-11-06 with a performance-only guard, and the test limit did not change. The list check now runs only for a part with a hit and only when a payer appears in that tail. `redFlag.ts` is now sha256 `789dc2b29a30940951257c677bddcb4eaf995bb8a187a19e3583ca51d1ebb76f`. Band, rule ids and info ids were identical before and after on all 77 cases.

## Evidence quotes

Quotes are whole clauses, so a quote can hold more than the matched phrase.
