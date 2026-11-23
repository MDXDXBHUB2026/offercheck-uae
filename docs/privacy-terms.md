# Privacy notice and terms of use

Production hardening Phase 3, 2026-11-15.

- **Privacy notice (`/privacy`): drafted, pending legal review.** Source: `src/app/privacy/page.tsx`.
- **Terms of use (`/terms`): drafted, pending legal review.** Source: `src/app/terms/page.tsx`.

Both pages were written from the code, not from a template. They name no law, article, jurisdiction, liability rule or compliance standard, and make no compliance claim (`src/app/policyPages.test.ts` checks this). A lawyer has not read either page. "Last updated" on both reads `POLICY_LAST_UPDATED` in `src/lib/siteConfig.ts` (2026-11-16: production hardening Phase 4a changed what stays in the browser and added the offline copy). The operator line and the contact address come from the same file, and nowhere else.

Change rule: a code change that makes a statement below untrue must change the page, this table and `POLICY_LAST_UPDATED` in the same commit.

## Privacy notice: each statement and where the code says it

"Test" names the check in `src/app/policyPages.test.ts` (unless another file is given). "Not from code" means the code cannot confirm it; the source is given instead.

| Statement on `/privacy` | Source in the code | Test |
|---|---|---|
| A check sends the text in the box and, after a translation, whether it worked and the detected language. | `src/components/checkRequest.ts` (`analyzeRequest`: body is `{ text }` or `{ text, translation }`), `src/lib/translation.ts` (`TranslationRecord`: `result` and `sourceLang` only), `src/components/OfferChecker.tsx` (the one `fetch("/api/analyze")`) | what a check sends; `src/app/routes.test.ts` › what the site says about itself (two browser requests only) |
| The request carries the network (IP) address. | Every HTTP request does; `src/lib/rateLimit.ts` (`clientAddress` reads `X-Forwarded-For`) | none (property of HTTP) |
| The server does not store the text or the result, and Offer Check's code writes them to no log. | `src/app/api/analyze/route.ts` (returns `runWithAudit(...)`), `src/lib/auditRun.ts`; no `console.` call in `src` | not stored or logged; `src/app/page.test.ts`; `src/app/routes.test.ts` (no module-level state in the routes) |
| Emirates ID, UAE IBAN and one-letter-plus-7-or-8-digit passport numbers are masked before text leaves the browser. | `src/lib/redact.ts` (`EMIRATES_ID`, `UAE_IBAN`, `PASSPORT`), applied in `src/components/checkRequest.ts` and `src/components/translateRequest.ts` | the numbers hidden in the browser; `src/lib/redact.test.ts` |
| Not caught: other IBANs, other passport formats, an Emirates ID with dots, Arabic-Indic digits. | `src/lib/redact.ts` (the three patterns above); same list in `docs/known-limitations.md` (Auto-Redact bullet) | the numbers hidden in the browser (one example of each) |
| Text is sent for translation only when the user presses "Send to Google and translate", each time; the page says so next to the button first. | `src/components/translateFlow.ts` (`TRANSLATE_BUTTON`, `TRANSLATE_CONSENT_TEXT`), `src/components/translateRequest.ts` (`consent: true`, called only from that button in `src/components/OfferChecker.tsx`) | the consent wording; `src/components/translate.test.ts` |
| The server passes it to Google Cloud Translation; Offer Check does not store it; Google's terms apply. | `src/lib/translateServer.ts` (locked; the only call to Google), `src/app/api/translate/route.ts`, `TRANSLATE_CONSENT_TEXT` | the consent wording |
| Checks and translations run in Vercel functions in Mumbai, India. | `vercel.json` (`"regions": ["bom1"]`) | processing in Mumbai; `src/app/vercelConfig.test.ts` |
| Rate-limit counters are keyed by a salted hash of the network address and a time window, never the address, and hold only a number. | `src/lib/rateLimit.ts` (`visitorKey`: HMAC-SHA-256 with `OFFERCHECK_RATE_SALT`, first 32 hex characters; `keys`; `upstashStore` sends `INCR`/`INCRBY` and `EXPIRE` only) | the rate-limit counters; `src/lib/rateLimit.test.ts` |
| Each counter expires: 2 minutes (per-minute limits), 25 hours (daily). | `src/lib/rateLimit.ts` (`MINUTE_TTL_S = 120`, `DAY_TTL_S = 90_000`, `EXPIRE ... NX`) | the rate-limit counters |
| The counters are kept in an Upstash Redis store in Mumbai. | **Not from code.** The code reads only `KV_REST_API_URL` and `KV_REST_API_TOKEN`; the store's region is set where the store was created. Stated by the owner (Phase 2, 2026-11-15); confirm in the Upstash or Vercel Storage dashboard. | none |
| The browser keeps the Encrypted Vault (encrypted, passphrase not stored) and the number of saved results; titles and notes are inside it, with Emirates ID, passport and UAE IBAN numbers hidden. | `src/lib/vault.ts` (`offercheck_vault_v1`, `offercheck_vault_count_v1`), `src/lib/vaultCrypto.ts` (locked), `src/components/SaveVaultModal.tsx` (`buildRecord` masks title and notes with `redactSensitive`) | what stays in the browser; `src/lib/vaultTools.test.ts` (titles and notes are masked) |
| The browser keeps the Settings choices: language, animations, text size, theme, and a dismissed install hint. | `src/components/shell/lang.ts` (`offercheck_lang`), `motion.ts` (`offercheck_motion`), `textSize.ts` (`offercheck_text_size`), `theme.ts` and `src/lib/themeInit.ts` (`offercheck_theme_v1`, read once by a script in the page head and written only when the person chooses; never sent), `install.ts` (`offercheck_install_hint_dismissed`) | what stays in the browser; `src/components/settings.test.ts` (no other key is written) |
| Threat Radar reports stay in the open tab's memory only. | `src/components/radar/localReports.ts` | what stays in the browser |
| An exported vault file is saved where the browser puts downloads, still encrypted; Offer Check keeps no copy. | `src/lib/vault.ts` (`exportVault`: the stored payload as it is), `src/components/VaultTools.tsx` (a blob download in the page, no request) | `src/lib/vaultTools.test.ts` (export and import) |
| To clear: Settings > Clear my data on this device removes the vault and every choice without the passphrase; clearing the site's data in the browser does the same. | `src/components/shell/clearData.ts` (`STORED_KEYS`, `clearMyData`), `src/components/shell/SettingsPanel.tsx` (confirm step); clearing site data removes `localStorage` (browser behaviour) | what stays in the browser; `src/components/settings.test.ts` (Clear my data removes every stored key) |
| An installed app keeps its own storage, separate from the browser's. | **Not from code.** Browser behaviour for installed web apps (notably on iPhone and iPad); the app writes the same keys wherever it runs. | none |
| After a first visit the browser keeps a copy of /check, /about, /legal, /portals, /privacy and /terms with their files, for offline reading. | `src/lib/serviceWorker.ts` (`OFFLINE_PAGES`, `OFFLINE_ASSETS`, install step), served at `/sw.js` by `src/app/sw.js/route.ts` | `src/lib/serviceWorker.test.ts` (install) |
| The copy never holds pasted text, a result, or a reply to a check or translation. | `src/lib/serviceWorker.ts` (`neverCached`: not GET, `/api`, another origin, range; RSC requests not answered) | `src/lib/serviceWorker.test.ts` (never /api); Chrome check 2026-11-16 (no cached entry holds the offer text) |
| Each new version replaces the copy; clearing site data removes it. | `src/lib/serviceWorker.ts` (`activate` deletes every older `offercheck-` cache), `src/app/sw.js/route.ts` (version = deployment id); clearing site data removes Cache Storage (browser behaviour) | `src/lib/serviceWorker.test.ts` (a new deploy replaces the old cache) |
| Vercel keeps its own infrastructure logs of requests, under its own terms. | **Not from code.** Vercel's own request and function logs are outside the app; the app neither adds to nor controls them. | none |
| No advertising, analytics or tracking scripts; the code sets no cookies. | `package.json` (4 dependencies, none for analytics), `src/lib/csp.ts` (`default-src 'self'`, no outside origin), a search of `src` for analytics, tag-manager, pixel, beacon and cookie code (none found, 2026-11-15) | no advertising, analytics or tracking script; its code sets no cookies |
| Contact: the operator line and the address. | `src/lib/siteConfig.ts` | siteConfig: the one source |

## Terms of use: what each part rests on

| Statement on `/terms` | Rests on |
|---|---|
| An early prototype, tested on made-up offers only, not validated on real scams. | `docs/known-limitations.md` (Tested on a small synthetic set), the footer's `SYNTHETIC_STATEMENT` and `PROTOTYPE_NOTICE` (`src/components/shell/site.tsx`) |
| Risk indicators, not a verdict, not legal advice; a low score does not mean an offer is genuine. | `src/lib/resultView.ts` (`NOT_A_VERDICT`), `FOOTER_DISCLAIMER`, `PUBLIC_LIMITS_INTRO` |
| No guarantee of accuracy; can miss signs, can flag an honest offer; translation can change meaning. | `docs/known-limitations.md` (fixed rules can miss wording, can over-match; a translation can change the meaning) |
| Confirm through official channels in the Gov Portals Hub; Offer Check does not report anything for you. | `src/app/portals/page.tsx`, `src/lib/authorities.ts` (`REPORT_FRAUD_NOTE`) |
| Acceptable use: no scripted or automated use, no getting around the limits, no disruption, no unlawful content. | Owner brief (Phase 3). The limits it refers to are in `src/lib/rateLimit.ts`. |
| The operator may limit, change or stop the service; limits already apply. | Owner brief (Phase 3); `src/lib/rateLimit.ts` |

## Owner decisions behind these pages (2026-11-15)

- About is its own page again, `/about`, with a short "What it cannot do" section (LIMITS-3 in `docs/defects.md`, reversing LIMITS-2 for that page only).
- The site has a contact address again, `offercheck.uae@gmail.com`, with the operator line "Offer Check UAE, an independent project run by an individual developer in the UAE" (CONTACT-2 in `docs/defects.md`, reversing the contact removal of 2026-11-09). No personal name is shown anywhere on the site.
