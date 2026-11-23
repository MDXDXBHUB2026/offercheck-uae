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
| `official_channel` | Official channel | Built (text only) | Links each finding and cross-check, and a UAE authority named in the text (MoHRE, ICP, GDRFA or Amer), to existing official entries (warning signs, reporting channels, contacts), each with its official source link. No new guidance text; nothing shown when no entry applies. Score-neutral. |
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

Each holdout ran once and is never run again, so these are records copied from `src/lib/agents/eval/records.ts` (itself checked against `docs/test-report.md`, `docs/holdout2-pass-bar.md` and `docs/holdout3-cases.md`), not results this code can compute. Hash prefixes are the first 8 hex characters of `redFlag.ts` at the time.

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

### Holdout 3 (blind)

- Ran once, blind, on 2026-11-20, after the rules were frozen at `redFlag.ts` sha256 `87a170e7…`.
- Cases: 24.
- The advisor had read `docs/defects.md` before writing the set, so it is blind to the rule patterns, not to the defect list.
- **Result:** 21 of 24 matched their labels. The three that differ are H36 and H38, scams expected high with RF-001 and RF-002, which scored 0, and H53, a legitimate case expected low, which scored 60, High, with RF-001.
- The misses were fixed afterwards by tuning (Phase 8 round 2); that is a tuned result, not a blind one, and the result above stays. The per-case table is in `docs/test-report.md`.

The pass bar. It was locked on 2026-11-20, before the run. The owner applies it; this report gives counts only.

- At least 10 of the 12 scam cases flagged.
- At most 1 of the 11 legitimate cases flagged.
- No legitimate case flagged high.

Cases counted:

- Scam cases (12): H35 to H45, and H58. A scam is "flagged" when its band is medium or high.
- Legitimate cases (11): H46 to H56. A legitimate case is "flagged" when its band is medium or high, or when it scores any points.
- H57 (zero-width characters) is a stress case. Report it separately. It is not counted in either number.

| Bar item | Required | Count | Where the count comes from |
|---|---|---|---|
| Scam cases flagged (medium or high) | at least 10 of 12 | 10 of 12 | Per-case record. Not flagged: H36 and H38, each 0, Low, no rule. |
| Legitimate cases flagged (medium or high, or any points) | at most 1 of 11 | 1 of 11 | Per-case record. H53 scored 60, High, RF-001; the other 10 scored 0 with no rule and no info finding. |
| Legitimate cases flagged high | 0 | 1 | Per-case record. H53. |
| H57, a stress case reported separately | not counted | 60, High, RF-001 | Per-case record. Matches its label. The quote is `Pay the registration fee of AED 700 to proceed`: cleaning removed both zero-width spaces. |

Holdout 3 may not be re-run, so these counts cannot be re-checked by running it again.

## Known limitations

Copied from `docs/known-limitations.md`, every bullet; that file stays the source.

Offer Check is an MVP prototype. A low score or "No risk indicators found" does not confirm that an offer is genuine.

- **Fixed rules can miss wording.** The red-flag rules match fixed English patterns, so they can miss misspelled, obfuscated or unusual wording, such as `v1sa fee`. The fee rule fires on a payment verb, a stated amount, or a fee marked as required or payable. `Visa fee required` fires, and since Phase 8 (2026-11-20) so does a reminder such as `Do not forget the processing fee`, but a bare label such as `Security deposit` on its own does not.
- **Fixed rules can also over-match.** A rule can fire on text that mentions a fee or code without asking for it. A negation counts only when it is bound to the ask or the cost, as in `We never ask for a fee` or `Fees are not payable`, so other negative wording can still score.
- **English wording only.** The fee, credential, document and urgency rules match English, so an offer in another language does not fire them. The free email rule works in any language, so such an offer can still score 20, and a low score means even less for it. BATCHB-2 adds an optional machine translation: for text the offline detector marks as not English or mixed, "Send to Google and translate" sends it, once per press and every time, with the disclosure shown before the click, through `/api/translate` to Google Cloud Translation (Basic, v2), and the rules check the English it returns. The score is still set only by the rules, on the English text.
- **Rules only, for now.** Intake only cleans the text; claim extraction is not implemented yet. Red-flag (fixed rules), the risk aggregator and the drafter (fixed template blocks) are implemented, with no LLM. Verification and official-channel are built as text-only steps (2026-11-11): Verification runs five cross-checks (V-01 to V-05) on the cleaned text, and Official channel links findings and cross-checks to existing official entries. Nothing is looked up outside Offer Check, so no company, domain or offer number is checked against any registry or website.
- **Cross-checks are text-only and score-neutral.** They read only the cleaned text and quote the words that matched. They do not change the score, the band or the findings; weights for them are deferred by owner decision (2026-11-11). V-02 matches only text that presents itself as coming from, or acting for, a UAE authority (fixed English cues such as `this is MoHRE`, `an officer from the Ministry`, the authority in a `From:` line or after a sign-off such as `Regards,`, or `approved by MoHRE` together with a fee request), or that ties an address that is not official to the authority (`the MoHRE portal www.example.com`). A plain mention, such as `Your offer letter will be issued through MoHRE`, matches nothing and only adds the authority's official step. The cues are fixed patterns, so an impersonation worded another way can be missed, and an honest signature that names an authority after a sign-off can match. The list of official addresses is taken from the official links Offer Check already holds, so an official address that is not on it counts as not official.
- **The audit trail does not fingerprint offer or draft text, by design; it cannot prove which text a run analysed.**
- **The audit trail lives in page memory only.** It is lost when the page is reloaded, and nothing is stored on the server.
- **The audit trail is tamper-evident, not tamper-proof.** Gate entries are added by the browser, so the hash chain shows that an entry was changed, removed or reordered, but anyone who rebuilds the whole chain can rewrite it.
- **The approval gate checks that the placeholders are gone, not that the names entered are real.**
- **Auto-Redact hides only a few number formats.** It is always on (owner decision, 2026-11-11) and runs in the browser before the text is sent to `/api/analyze` or `/api/translate`. It hides a UAE Emirates ID written as `784`, 4, 7 and 1 digits with dashes, spaces or nothing between them; a UAE IBAN (`AE`, 2 check digits and 19 digits, with single spaces allowed); and one letter followed by 7 or 8 digits, a common passport format. Not caught: IBANs from other countries, other passport formats (two letters, or digits only), an Emirates ID written with dots or other separators, and numbers written in Arabic-Indic digits. It can also over-mask: any reference, invoice or offer number of one letter and 7 or 8 digits, such as `R12345678`, is hidden too, so it is missing from the quotes and the highlights. Since 2026-11-16 (Phase 4a) titles and notes typed into the vault are masked the same way; records saved before then can hold these numbers in their title or notes, and vault records saved before 2026-11-11 with Auto-Redact switched off can still hold these numbers.
- **Translation sends the text to a third party.** Only when the user presses "Send to Google and translate", every time; the disclosure is shown next to the button before any click, and there is no second confirm step. Offer Check does not store the text or the translation; Google's terms apply to what it receives. The key is read only on the server (`GOOGLE_TRANSLATE_API_KEY`); without it the route answers `translation_unavailable` and the page hides the send button.
- **Rate limits and the daily translation cap are simple counters.** (Phase 2, 2026-11-15, `src/lib/rateLimit.ts`.) `/api/analyze` allows 30 checks a minute per visitor. `/api/translate` allows 10 a minute and 20 a UTC day per visitor, and the whole app sends at most `OFFERCHECK_DAILY_CHAR_CAP` characters to Google in a UTC day (15,000 when it is unset or not a positive whole number); a text that would pass the cap is refused as `translation_unavailable` before anything is sent, and its characters are given back. The counters live in an Upstash Redis store in Mumbai, shared by all instances. A visitor is the first address in `X-Forwarded-For`, which Vercel sets, hashed with HMAC-SHA-256 and `OFFERCHECK_RATE_SALT`; the store holds only counters whose keys carry that hash and a time window, each with an expiry (2 minutes or 25 hours), and never an address, a user agent or any text. Limits of this design: windows are fixed (the UTC minute or day), so up to twice the per-minute limit can pass across a minute boundary; every translation attempt counts towards the visitor's daily limit, refused ones included; people behind one shared address (an office, a mobile carrier) share one limit, and someone with many addresses gets many; the characters of a translation that then fails at Google still count. If the store does not answer within 800 ms, or is not configured on Vercel, translation is refused and checks are limited per instance in memory only. With no store and not on Vercel (local development and tests) everything runs in memory with a fixed, public test salt. The cap is a guard, not a bill: the real spend limit is still the quota set on the Google Cloud project, which the owner must set.

- **Pages are rendered per request because of the CSP nonce.** (Production hardening, 2026-11-15.) The Content-Security-Policy carries a new nonce for each request (`src/proxy.ts`, `src/lib/csp.ts`), and a page prerendered at build time cannot carry one, so every page is now rendered on demand (`await connection()` in the root layout; `force-static` removed from Legal, Portals, Radar and Vault). Measured on `next start` on the development machine, 100 requests per page: median time to first byte went from about 5–14 ms to 9–14 ms (+4 to +6 ms on most pages), and each page grew by about 650–750 bytes. On Vercel the pages were served from the edge cache before (`X-Vercel-Cache: HIT`); they now run a function on every request, which adds latency, possible cold starts and function invocations. Measured by the owner on the preview from the UAE: `/check` took 450–650 ms per request (cache MISS) against 35–50 ms on production (cache HIT), while the functions ran in Vercel's default region, iad1 (Washington, D.C.). `vercel.json` now sets the function region to bom1 (Mumbai), the closest Vercel compute region to the UAE; Vercel has no compute region in the Gulf. Routing Middleware (`src/proxy.ts`) is deployed by Vercel to all regions regardless of this setting (fewer on the Hobby plan). Running in Mumbai also means offer text sent to `/api/analyze` and `/api/translate` is processed there instead of in the United States; neither route stores it. The experimental SRI option (hashes instead of nonces) covers script files but not the inline scripts Next.js emits, so it cannot keep pages static under a policy without `'unsafe-inline'`.
- **What the CSP allows.** Scripts need this request's nonce or must be loaded by a script that has it (`'strict-dynamic'`); a script element created from script is therefore allowed, as in any `'strict-dynamic'` policy. `style-src` has no `'unsafe-inline'`: the app emits no `<style>` tags and no `style` attributes in its HTML, and style values set from script (the checklist meter, the hero animation) go through the CSSOM, which CSP allows. Next.js's built-in prerendered `_global-error.html` fallback has `style` attributes and un-nonced inline scripts; it is served only if rendering itself fails, and it would show unstyled. `upgrade-insecure-requests` is not set (every URL is relative and HSTS comes from Vercel). There is no `report-uri`, so violations in users' browsers are not collected.
- **`/favicon.ico` returns 404.** The app has no favicon, so each first page load logs one 404 in the console. Not a CSP issue; it was the same before.
- **Saved results do not move between a browser and an installed app.** Each keeps its own storage, notably on iPhone and iPad. Export vault and Import vault are the way to move them.
- **A forgotten passphrase cannot be recovered.** Reset vault and Clear my data delete the saved results; they do not open them.
- **Pasted text survives going offline, not a reload.** The Check page keeps the text in the box while the connection drops; Offer Check stores no offer text, so a full reload while offline starts empty.
- **Install app depends on the browser.** The button appears only after the browser offers installation (Chrome and Edge); Safari on iPhone shows the two-tap hint instead, and some browsers offer neither. The install prompt itself was not exercised in the automated Chrome check.
- **Theme (Phase 4b, 2026-11-23):** System, Dark and Light work from Settings. Dark is the default and is unchanged. The choice stays on the device (`offercheck_theme_v1`) and nothing about it is sent. Limits: the installed app's splash screen, the manifest and the icons stay dark whatever the theme; the hero video is the same dark teal footage in both themes, with a light glass panel over it in Light; printing always uses the light colours; and with System chosen the browser's address-bar colour follows the device setting.
- **The missed-scam form is run by Google, not by Offer Check (Phase 5, 2026-11-23).** The link opens a Google Form in a new tab; Google receives what the person types there, under Google's terms, and Offer Check sends it nothing: no offer text, no result, no query string. The form is not part of the app and is not tested here. The link is shown only while `SITE_MISSED_SCAM_FORM_URL` in `src/lib/siteConfig.ts` is not empty. Nobody is told whether a report was read or acted on.
- **Daily totals are five counts, read by the owner only (Phase 5, 2026-11-23).** Checks completed, analyze errors (any answer other than a result or a 429), analyze limit hits (429), translate requests and translate refusals, one counter each per UTC day (`oc:v1:m:<day>:<name>`, 40 days), with no visitor key, address, user agent, text or cookie. They are added after the response is sent and skipped if the store does not answer within 800 ms, so a day's totals can be low; with no store configured on Vercel nothing is counted. They are read with `scripts/read-counts.mjs` on the owner's computer; there is no public endpoint.
- **The Threat Radar examples are invented (Phase 5, 2026-11-23).** The four entries are made-up reports, each tagged "Example" on the page. They are not removed yet: whether to remove them is the owner's decision.
- **Offline reading covers six pages** (/check, /about, /legal, /portals, /privacy, /terms) after one online visit. Radar and Vault show the offline page when not reachable.

- **Tested on a small synthetic set.** Holdout 1 is consumed, and it ran on the rules as they were before the Step 1d fixes. Strict result: 11 of 18 passed. With the right rule counted as a pass: 15 of 18. H10 was a real miss, not a band dispute. Holdout 2 is also consumed. It ran on the rules after those fixes, and 15 of 16 passed. That is 16 synthetic cases, so it is a small sample. After tuning (Batch A, 2026-11-08), H21 also passes; that is a tuned result, not a blind one, and the blind result stays 15 of 16. Failures are listed in `docs/rules-backlog.md`. Phase 8 part 1 (2026-11-20) changed the rules for eight documented defects; every case added then is tuned, not blind, and a comparison with the pre-change baseline showed that no holdout 1 or holdout 2 case changed. Holdout 3 (24 synthetic cases) ran once, blind, on 2026-11-20 against the frozen rules: 21 of 24 matched their labels. It missed two scams (H36, a fee called an "amount"; H38, a request for card number, expiry date and CVV) and flagged one honest line high (H53, `No deposit, fee or payment is required …`). Phase 8 round 2 fixed all three by tuning; that is a tuned result, not a blind one, and the blind result stays as recorded (`docs/rules-backlog.md`); the advisor had read `docs/defects.md` before writing the set, so it is blind to the rule patterns, not to the defect list.

### What this check cannot do

Internal only. Until 2026-11-11 the check page showed a plain-language version of these bullets in a closed "What this check cannot do" section (COPY-1). The owner removed that section, its footer link and its Arabic strings (LIMITS-2 in `docs/defects.md`); the check page keeps only the one-line notice under the analyzer (`src/components/publicLimitations.ts`). Nothing in the app reads this list.

- **Some honest offers can score high.** An employer named at the start of a list (`covers`, `pays`, `pays for`, `bears`, `provides`) covers an item it usually pays, such as a visa, medical or a flight. Still High: `sponsors` and other verbs such as `arranges` (`The company arranges visa and medical fees of AED 500`), a head in an earlier sentence, a list longer than 160 characters, a fee noun in the item (processing, registration, admin, application, security, deposit, training, clearance, agency, service, handling, documentation, verification, courier), and a candidate marker such as `before joining` near the cost.
- **A request for a code can be missed when it is worded indirectly.** Still missed: `What number did you get by SMS?`, and a code to type into a form with no link, URL, "click" or WhatsApp in the sentence, such as `Type the code into the form we emailed you`. `Enter the code we send you on our portal` stays unflagged on purpose, because a real careers portal asks for that.
- **The holdout 3 fixes are narrow (Phase 8 round 2, tuned).** A list of cost words after "no" is cleared only when a word such as "required", "payable" or "taken" follows the list straight away or after "ever", so `No deposit, fee or payment is currently required` still scores High. A request for a card's expiry date needs a card number or a CVV named in the same sentence, so `We need your card expiry date` alone scores 0. An "amount" counts as a fee only after "booking", "registration" or "processing", so `The medical amount of AED 600 must be paid by you` still scores 0.
- **Look-alike letters can slip past cleaning.** Since Phase 8 (QA-6, 2026-11-20) the rules match a copy in which fullwidth letters and digits are plain ones and a Cyrillic or Greek letter that looks Latin becomes its Latin letter inside a word that also has Latin letters. Still missed: a word written wholly in look-alike letters, digits or symbols used as letters (`v1sa`), accented letters, and look-alikes from other scripts.
- **Warnings are recognised by fixed wording.** A fee mentioned in a warning about someone else (`Beware of agents asking for a fee`) or after `there is no` gives a 0-point warning finding. A free-mail address after warning wording in the same clause (`Do not trust anyone using ...`) is not counted, unless `except`, `only`, `but` or `other than` follows the warning, so an offer that puts its own free-mail address right after such wording, with none of those words, gets no points for it (`Beware of fakes and email ...`). This is an open limit (security review, 2026-11-21): `To avoid fake offers email hr.jobs@gmail.com` and `Beware of scammers: our recruiter is hr.jobs@gmail.com` each score 0, while `Our recruiter is hr.jobs@gmail.com` scores 20. It removes only the 20 points of the free email rule (RF-005); the other rules still read the same text, so a fee request next to it still scores High. A reply asked for `today` or `now` is not counted when an invitation to ask questions follows (`if you have any questions`).
- **Line breaks are still a heuristic.** After a line that says the employer pays, the break stays only when the next line starts with a capital letter. A next line in lower case still joins, so the employer wording can still clear it.
- **A negation can still reach a cost with no verb of its own.** `We do not require a degree the fee is AED 500` fires, because `the fee is` starts a new statement. `We do not require a degree fee AED 500` still reads as part of the negation and gives only the 0-point warning finding.
- **A request for a photo of a card can be missed if it names neither the kind of card nor a card detail in the same sentence.** Still missed: `Snap your card and send it` (no image word), `Send a photo of your card. Make sure the CVV is visible.` (the detail is in the next sentence), a detail more than 60 characters away, `Send a photo of your Visa` (the brand alone is the work visa) and a video of a card.
- **The check is built for job offers.** A notice (`src/lib/offerLikeness.ts`) shows when the band is Low, no signal group matches (role, pay, process, organisation) and the tier 1 language notice is not shown. It never changes the score. A non-offer that uses one signal word, such as `company` or `monthly`, gets no notice, and non-English text is not read for signals.
- **Non-English text in Latin script is only partly detected.** Batch B Stage 1 adds an offline word check (`src/lib/coverage.ts`, word lists in `src/lib/languageWords.ts`). Text is not English when at least 2 different marker words (common Hindi, Urdu, romanised Arabic, Tagalog, Malayalam, Bengali, Tamil or French words) make up at least 30% of its Latin words, or when under 15% of them are common English words; it is partly English when at least 3 different marker words make up at least 10%, or (LANG-4) when 15% up to 30% of them are common English words. In that uncertain band the banner says English could not be confirmed and offers translation; checking the original gives a score from the English words only, marked as partial, so a warning sign in another language can be missed. It abstains under 6 Latin words, and a language with no marker words, or one whose words are left off the lists because they are also English, names or UAE places, can still read as English. The script tiers are unchanged: a notice also shows for non-Latin letters when they are at least half of the letters, or at least 10 of them. The 15% and 30% cut-offs rest on a small synthetic sample (10 English edge cases, 15 non-English texts, one romanised Arabic fee scam; none validated by a native speaker), not on real offers. On that sample 2 of the 10 English texts (heavy with jargon or names) get the language banner and, checked as the original, a partial score; none of the 15 non-English texts passes as English, and 7 of them are only partly checked rather than not checked. Some Latin-script text will still pass as English, for example text that uses enough common English words.
- **The language cut-offs are design choices.** The floor of 10 letters is based on a few hand-written sentences; the word-check cut-offs are conservative placeholders (Batch B decision 3), set so that none of the 77 eval cases changes. None is validated on real data. Mixed text with 10 or more non-Latin letters gets the notice, so a three-word Arabic name such as `محمد بن راشد` (10 letters) does too, while a short name such as `محمد` does not.
- **Look-alike letters can keep the language notice away.** A few Cyrillic or Greek letters that look Latin stay below the 10-letter floor, so no notice is shown. Since Phase 8 (QA-6, 2026-11-20) the rules still read a word they sit in when it also has Latin letters; a word written wholly in look-alike letters can be missed. See QA-6 in `docs/defects.md`; Intake v2 is Phase 4.
- **A translation can change the meaning.** BATCHB-2: machine translation by Google Cloud Translation can lose, soften or change scam wording, so a rule that would fire on the original can stay silent. Translation quality has not been measured for any language, and no accuracy is claimed. A translated result is marked as such: with no finding the chip is grey (`TRANSLATED_NONE_LABEL`), never green. Translation is offered only when the offline detector flags the text, so the Latin-script gap above (languages typed in English letters that read as English) also means no translation is offered for them.

### Known misses in the eval set

These cases are marked `knownMiss` in `src/lib/agents/eval/offers.ts`. They stay unfixed because the rules cannot handle them without becoming unreliable. A test fails if one starts passing, so this list stays current.

- **S12: Arabic visa fee request.** Expected high, scores low. The rules are English patterns. Arabic needs its own reviewed pattern set or an intake model.
