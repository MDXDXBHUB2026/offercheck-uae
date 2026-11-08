# Known limitations

Offer Check is an MVP prototype. A low score or "No risk indicators found" does not confirm that an offer is genuine.

- **Fixed rules can miss wording.** The red-flag rules match fixed English patterns, so they can miss misspelled, obfuscated or unusual wording, such as `v1sa fee`. The fee rule fires on a payment verb, a stated amount, or a fee marked as required or payable. `Visa fee required` fires, but a bare mention such as `Security deposit` or `Do not forget the processing fee` does not.
- **Fixed rules can also over-match.** A rule can fire on text that mentions a fee or code without asking for it. A negation counts only when it is bound to the ask or the cost, as in `We never ask for a fee` or `Fees are not payable`, so other negative wording can still score.
- **English wording only.** The fee, credential, document and urgency rules match English, so an offer in another language does not fire them. The free email rule works in any language, so such an offer can still score 20, and a low score means even less for it.
- **Rules only, for now.** Intake only cleans the text; claim extraction is not implemented yet. Red-flag (fixed rules), the risk aggregator and the drafter (fixed template blocks) are implemented, with no LLM. Verification and official-channel are not implemented yet, so no company, domain or offer number is checked. The Agent run panel and the audit trail show both as "not implemented yet".
- **The audit trail does not fingerprint offer or draft text, by design; it cannot prove which text a run analysed.**
- **The audit trail lives in page memory only.** It is lost when the page is reloaded, and nothing is stored on the server.
- **The audit trail is tamper-evident, not tamper-proof.** Gate entries are added by the browser, so the hash chain shows that an entry was changed, removed or reordered, but anyone who rebuilds the whole chain can rewrite it.
- **The approval gate checks that the placeholders are gone, not that the names entered are real.**

- **Tested on a small synthetic set.** Holdout 1 is consumed, and it ran on the rules as they were before the Step 1d fixes. Strict result: 11 of 18 passed. With the right rule counted as a pass: 15 of 18. H10 was a real miss, not a band dispute. Holdout 2 is also consumed. It ran on the rules after those fixes, and 15 of 16 passed. That is 16 synthetic cases, so it is a small sample. Failures are listed in `docs/rules-backlog.md`.

## What this check cannot do

- **A company-covers wording at the start of a list can score high.** For example, `The company covers visa and medical fees of AED 500`.
- **A credentials request phrased "share the code we send you" can be missed.**
- **Look-alike letters can slip past cleaning.**
- **A request for a photo of a bank card can be missed.** For example, `Send your passport copy, Emirates ID and a photo of your bank card today, before any interview.` scores 20, Low, because only the document rule fires.
- **The check cannot tell whether a text is a job offer.** A message that names no employer, role or salary is still scored only on the fixed rules.
- **Non-English text in Latin script gets no language notice.** French, Tagalog, or Arabic or Hindi written in Latin letters, reads as English to the notice, so no notice is shown, though the rules do not understand it. A notice shows only for non-Latin letters: when they are at least half of the letters, or at least 10 of them.
- **The language notice floor of 10 letters is a design choice.** It is based on a few hand-written sentences and is not validated on real data. Mixed text with 10 or more non-Latin letters gets the notice, so a three-word Arabic name such as `محمد بن راشد` (10 letters) does too, while a short name such as `محمد` does not.
- **Look-alike letters can keep the language notice away.** A few Cyrillic or Greek letters that look Latin stay below the 10-letter floor, so no notice is shown and the words they sit in can be missed. See QA defect 6 in `docs/rules-backlog.md`; Intake v2 is Phase 4.

## Known misses in the eval set

These cases are marked `knownMiss` in `src/lib/agents/eval/offers.ts`. They stay unfixed because the rules cannot handle them without becoming unreliable. A test fails if one starts passing, so this list stays current.

- **S12: Arabic visa fee request.** Expected high, scores low. The rules are English patterns. Arabic needs its own reviewed pattern set or an intake model.
