# Technical evidence

Not served by the app. The public site has three pages (Check, Warning signs, About); this file keeps the technical detail that the removed How it works and Test Lab pages showed (owner decision, 2026-11-09). Everything here is copied from the code or from existing records; `src/lib/technicalEvidence.test.ts` fails if a figure, a step status, a holdout record or a known limitation below stops matching its source.

## Steps of a check

The steps `runManager` reports in its trace, plus the reply draft, the approval gate and the audit trail that run in the browser. Statuses as built today.

| Step id | Step | Status | What it does |
|---|---|---|---|
| `manager` | Manager | Built | Runs the steps in order and merges their results. It never sends, stores or contacts anyone. |
| `intake` | Intake | Partly built | Text cleaning only: removes hidden characters. It does not extract claims yet. |
| `red_flag` | Red-flag | Built | Fixed rules look for warning signs in English text and quote the words that matched. |
| `verification` | Verification | Built (text only) | Five cross-checks on the cleaned text (V-01 to V-05), each with a plain reason and the matched words quoted. No outside lookups: no RDAP, web search or page fetch. Score-neutral: it does not change the score, band or findings. |
| `official_channel` | Official channel | Built (text only) | Links each finding and cross-check to existing official entries (warning signs, reporting channels, contacts), each with its official source link. No new guidance text; nothing shown when no entry applies. Score-neutral. |
| `risk_aggregator` | Risk aggregator | Built | Turns the findings into a score with fixed weights. No AI model is involved. |
| `explainer` | Explainer | Not implemented yet | Would explain the findings in plain words. Not implemented yet. |
| `drafter` | Drafter | Built | Fills a fixed reply template. It runs only after you ask for a draft. |
| `approval_gate` | Approval gate | Built | A person approves a reply draft before it can be copied. Offer Check sends nothing. |
| `audit_trail` | Audit trail | Built | Records each step in a hash-chained list, in page memory only, with no offer or draft text. |

## Dev set: confusion counts

Source: `src/lib/agents/eval/offers.ts`, run through `runManager` with no translation. The rules were tuned on this set, so these results are not blind. A case counts as flagged when its band is medium or high; a scam-like case flagged is a true positive. A case passes when its band, its counted rules and its warning-only rules all match what the case file expects. The one failure is the known miss S12 (see below).

```json
{
  "source": "src/lib/agents/eval/offers.ts",
  "flaggedBands": [
    "medium",
    "high"
  ],
  "cases": 43,
  "passed": 42,
  "failed": 1,
  "truePositives": 17,
  "falsePositives": 1,
  "falseNegatives": 1,
  "trueNegatives": 24
}
```

## Holdouts (consumed, recorded)

Both holdouts ran once and are never run again, so these are records copied from `src/lib/agents/eval/records.ts` (itself checked against `docs/test-report.md` and `docs/holdout2-pass-bar.md`), not results this code can compute. Hash prefixes are the first 8 hex characters of `redFlag.ts` at the time.

### Holdout 1

- Ran once, on 2026-11-06, against `redFlag.ts` sha256 `f3570f8f…`, which was before the Step 1d fixes.
- Cases: 18.
- **Strict:** 11 of 18.
- **Right rule counted as a pass:** 15 of 18.
- **H10** was a real miss. It was fixed afterwards and kept as dev case R10, which is now a tuned result.
- Strict failures: H01, H09, H14 and H17. They fired the expected rule but scored high against an expected medium.
- No pass bar was set for holdout 1.

### Holdout 2

- Ran once, on 2026-11-06, after the rules were frozen at `redFlag.ts` sha256 `05d05e13…`.
- Cases: 16.
- **Result:** 15 of 16 passed. The one failure is H21, a scam expected high with RF-002, which scored 0.
- After tuning: H21 also passes. This is a tuned result, not a blind one: the fix was made knowing the miss. The blind result above stays 15 of 16, and the pass bar counts below are from the blind run.

The pass bar. It was locked on 2026-11-06, before the run. The owner applies it; this report gives counts only.

- At least 5 of the 7 scam cases flagged.
- At most 1 of the 8 legitimate cases flagged.
- No legitimate case flagged high.

Cases counted:

- Scam cases (7): H19, H20, H21, H22, H29, H31, H33. A scam is "flagged" when its band is medium or high.
- Legitimate cases (8): H23, H24, H25, H26, H27, H28, H32, H34. A legitimate case is "flagged" when its band is medium or high, or when it scores any points.
- H30 (Cyrillic homoglyph) is a stress case. Report it separately. It is not counted in either number.

| Bar item | Required | Count | Where the count comes from |
|---|---|---|---|
| Scam cases flagged (medium or high) | at least 5 of 7 | 6 of 7 | Derived. Only H21 failed, and every other scam case passed at its expected band of medium or high. |
| Legitimate cases flagged (medium or high, or any points) | at most 1 of 8 | 0 of 8 by band | Derived. All 8 passed at their expected band, low, with no rules. The repo does not record each case's score, so "any points" cannot be confirmed from files. |
| Legitimate cases flagged high | 0 | 0 | Derived as above |
| H30, a stress case reported separately | not counted | passed | `docs/rules-backlog.md`. RF-001 fired on "fee of AED 500", not on the look-alike word, so this does not show that look-alike letters are handled. |

Holdout 2 may not be re-run, so these counts cannot be re-checked by running it again.

## Known limitations

Copied from `docs/known-limitations.md`, every bullet; that file stays the source.

Offer Check is an MVP prototype. A low score or "No risk indicators found" does not confirm that an offer is genuine.

- **Fixed rules can miss wording.** The red-flag rules match fixed English patterns, so they can miss misspelled, obfuscated or unusual wording, such as `v1sa fee`. The fee rule fires on a payment verb, a stated amount, or a fee marked as required or payable. `Visa fee required` fires, but a bare mention such as `Security deposit` or `Do not forget the processing fee` does not.
- **Fixed rules can also over-match.** A rule can fire on text that mentions a fee or code without asking for it. A negation counts only when it is bound to the ask or the cost, as in `We never ask for a fee` or `Fees are not payable`, so other negative wording can still score.
- **English wording only.** The fee, credential, document and urgency rules match English, so an offer in another language does not fire them. The free email rule works in any language, so such an offer can still score 20, and a low score means even less for it. BATCHB-2 adds an optional machine translation: for text the offline detector marks as not English or mixed, "Send to Google and translate" sends it, once per press and every time, with the disclosure shown before the click, through `/api/translate` to Google Cloud Translation (Basic, v2), and the rules check the English it returns. The score is still set only by the rules, on the English text.
- **Rules only, for now.** Intake only cleans the text; claim extraction is not implemented yet. Red-flag (fixed rules), the risk aggregator and the drafter (fixed template blocks) are implemented, with no LLM. Verification and official-channel are built as text-only steps (2026-11-11): Verification runs five cross-checks (V-01 to V-05) on the cleaned text, and Official channel links findings and cross-checks to existing official entries. Nothing is looked up outside Offer Check, so no company, domain or offer number is checked against any registry or website.
- **Cross-checks are text-only and score-neutral.** They read only the cleaned text and quote the words that matched. They do not change the score, the band or the findings; weights for them are deferred by owner decision (2026-11-11). They can match an honest offer: V-02 (a UAE authority named with no official address) matches the "Standard offer letter" sample, which names MoHRE and gives no address. The list of official addresses is taken from the official links Offer Check already holds, so an official address that is not on it counts as not official.
- **The audit trail does not fingerprint offer or draft text, by design; it cannot prove which text a run analysed.**
- **The audit trail lives in page memory only.** It is lost when the page is reloaded, and nothing is stored on the server.
- **The audit trail is tamper-evident, not tamper-proof.** Gate entries are added by the browser, so the hash chain shows that an entry was changed, removed or reordered, but anyone who rebuilds the whole chain can rewrite it.
- **The approval gate checks that the placeholders are gone, not that the names entered are real.**
- **Translation sends the text to a third party.** Only when the user presses "Send to Google and translate", every time; the disclosure is shown next to the button before any click, and there is no second confirm step. Offer Check does not store the text or the translation; Google's terms apply to what it receives. The key is read only on the server (`GOOGLE_TRANSLATE_API_KEY`); without it the route answers `translation_unavailable` and the page hides the send button.
- **The translation throttle is best-effort.** `/api/translate` allows 10 requests a minute per client address, held in server memory only. On serverless hosting each instance has its own table and a cold start empties it. It is not a spend limit: the real spend limit is the quota set on the Google Cloud project, which the owner must set.

- **Tested on a small synthetic set.** Holdout 1 is consumed, and it ran on the rules as they were before the Step 1d fixes. Strict result: 11 of 18 passed. With the right rule counted as a pass: 15 of 18. H10 was a real miss, not a band dispute. Holdout 2 is also consumed. It ran on the rules after those fixes, and 15 of 16 passed. That is 16 synthetic cases, so it is a small sample. After tuning (Batch A, 2026-11-08), H21 also passes; that is a tuned result, not a blind one, and the blind result stays 15 of 16. Failures are listed in `docs/rules-backlog.md`.

### What this check cannot do

Internal only. Until 2026-11-11 the check page showed a plain-language version of these bullets in a closed "What this check cannot do" section (COPY-1). The owner removed that section, its footer link and its Arabic strings (LIMITS-2 in `docs/defects.md`); the check page keeps only the one-line notice under the analyzer (`src/components/publicLimitations.ts`). Nothing in the app reads this list.

- **Some honest offers can score high.** An employer named at the start of a list (`covers`, `pays`, `pays for`, `bears`, `provides`) covers an item it usually pays, such as a visa, medical or a flight. Still High: `sponsors` and other verbs such as `arranges` (`The company arranges visa and medical fees of AED 500`), a head in an earlier sentence, a list longer than 160 characters, a fee noun in the item (processing, registration, admin, application, security, deposit, training, clearance, agency, service, handling, documentation, verification, courier), and a candidate marker such as `before joining` near the cost.
- **A request for a code can be missed when it is worded indirectly.** Still missed: `What number did you get by SMS?`, and a code to type into a form with no link, URL, "click" or WhatsApp in the sentence, such as `Type the code into the form we emailed you`. `Enter the code we send you on our portal` stays unflagged on purpose, because a real careers portal asks for that.
- **Look-alike letters can slip past cleaning.**
- **A request for a photo of a card can be missed if it names neither the kind of card nor a card detail in the same sentence.** Still missed: `Snap your card and send it` (no image word), `Send a photo of your card. Make sure the CVV is visible.` (the detail is in the next sentence), a detail more than 60 characters away, `Send a photo of your Visa` (the brand alone is the work visa) and a video of a card.
- **The check is built for job offers.** A notice (`src/lib/offerLikeness.ts`) shows when the band is Low, no signal group matches (role, pay, process, organisation) and the tier 1 language notice is not shown. It never changes the score. A non-offer that uses one signal word, such as `company` or `monthly`, gets no notice, and non-English text is not read for signals.
- **Non-English text in Latin script is only partly detected.** Batch B Stage 1 adds an offline word check (`src/lib/coverage.ts`, word lists in `src/lib/languageWords.ts`). Text is not English when at least 2 different marker words (common Hindi, Urdu, romanised Arabic, Tagalog, Malayalam, Bengali, Tamil or French words) make up at least 30% of its Latin words, or when under 15% of them are common English words; it is partly English when at least 3 different marker words make up at least 10%, or (LANG-4) when 15% up to 30% of them are common English words. In that uncertain band the banner says English could not be confirmed and offers translation; checking the original gives a score from the English words only, marked as partial, so a warning sign in another language can be missed. It abstains under 6 Latin words, and a language with no marker words, or one whose words are left off the lists because they are also English, names or UAE places, can still read as English. The script tiers are unchanged: a notice also shows for non-Latin letters when they are at least half of the letters, or at least 10 of them. The 15% and 30% cut-offs rest on a small synthetic sample (10 English edge cases, 15 non-English texts, one romanised Arabic fee scam; none validated by a native speaker), not on real offers. On that sample 2 of the 10 English texts (heavy with jargon or names) get the language banner and, checked as the original, a partial score; none of the 15 non-English texts passes as English, and 7 of them are only partly checked rather than not checked. Some Latin-script text will still pass as English, for example text that uses enough common English words.
- **The language cut-offs are design choices.** The floor of 10 letters is based on a few hand-written sentences; the word-check cut-offs are conservative placeholders (Batch B decision 3), set so that none of the 77 eval cases changes. None is validated on real data. Mixed text with 10 or more non-Latin letters gets the notice, so a three-word Arabic name such as `محمد بن راشد` (10 letters) does too, while a short name such as `محمد` does not.
- **Look-alike letters can keep the language notice away.** A few Cyrillic or Greek letters that look Latin stay below the 10-letter floor, so no notice is shown and the words they sit in can be missed. See QA defect 6 in `docs/rules-backlog.md`; Intake v2 is Phase 4.
- **A translation can change the meaning.** BATCHB-2: machine translation by Google Cloud Translation can lose, soften or change scam wording, so a rule that would fire on the original can stay silent. Translation quality has not been measured for any language, and no accuracy is claimed. A translated result is marked as such: with no finding the chip is grey (`TRANSLATED_NONE_LABEL`), never green. Translation is offered only when the offline detector flags the text, so the Latin-script gap above (languages typed in English letters that read as English) also means no translation is offered for them.

### Known misses in the eval set

These cases are marked `knownMiss` in `src/lib/agents/eval/offers.ts`. They stay unfixed because the rules cannot handle them without becoming unreliable. A test fails if one starts passing, so this list stays current.

- **S12: Arabic visa fee request.** Expected high, scores low. The rules are English patterns. Arabic needs its own reviewed pattern set or an intake model.
