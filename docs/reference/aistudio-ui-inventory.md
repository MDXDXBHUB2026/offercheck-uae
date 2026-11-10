# AI Studio export: UI/UX inventory

Source: the AI Studio export, kept outside the repo at `D:\offercheck-reference\aistudio\src\` (read only, never imported or copied in; it was at `docs/reference/aistudio/` until 2026-11-10). First written 2026-11-10 against `main` at `c5fb169`; updated 2026-11-10 for the AI Studio port, part 2 (navbar, hero, analyzer and result card, Threat Radar, Gov Portals Hub, Legal Guidelines, Encrypted Vault, page transitions).

Decision key. Every item has one of three decisions and a reason:
- **Ported**: in our app, re-created in our CSS and components (no Tailwind, no motion library, no file from the export). Where it was already in the app before part 2, the reason says so.
- **Skipped**: not brought in. The reason is given: a claim we cannot make, an invented number, a dependency, an external file, or nothing in the export to port.
- **Needs source**: the export has content our app lacks, and it cannot be shown until the owner supplies an official source for it. Nothing is invented in its place.

Every Ported item is visual or interaction only. Scores and bands come only from `src/lib/scoring.ts`. Findings, coverage states, the approval gate, the audit trail, vault encryption and translation consent are unchanged. Official links and numbers come only from `src/data/uaeContacts.ts` and `src/lib/authorities.ts`. Every animation runs only under `prefers-reduced-motion: no-preference`; with `reduce` every duration is 0s and the page is a still picture.

## Conflicts found before the port

| # | Brief says | Repo says | Handling |
|---|---|---|---|
| C1 | "There is uncommitted interface work (portals page, Navbar, globals.css, routes.test.ts)." | That work was committed and pushed as `c5fb169`. | Nothing to keep; no action. |
| C2 | Hero video: "same pattern as the current HeroBackdrop", "the pinned 0.12 limit", "keep the existing hero loop". | `HeroBackdrop`, `public/hero/*` and the 0.12 brightness test had been removed in `317192d`. | **Resolved 2026-11-10:** the export video was rejected (burned-in model and verdict text, invented figures, brightest pixel 0.962). `scripts/make-hero-loop.py` renders our own text-free loop (brightest pixel webm 0.410, mp4 0.458, poster 0.372). The 0.12 cap is replaced by a worst-case test: hero text on the `.hero-glass` panel over a white video pixel stays at 4.5:1 or more. |
| C3 | "the 5,000-character cap" | `MAX_OFFER_CHARS` is 20,000 (`src/lib/types.ts`). 5,000 is the translation cap in `/api/translate`. | Both unchanged. |
| C4 | The export starts the hero video with `autoPlay` and has Pause/Resume. | No `autoplay` attribute; script starts the video only when motion is allowed. The owner removed the pause button on 2026-11-08 (S5-1, accepted). | First resolved as "no pause button". **Changed 2026-11-10 (part 2 brief):** the hero has "Pause radar / Resume radar", which pauses the video and holds every hero animation. S5-1 is fixed; the loops outside the hero are S5-2 (open). |
| C5 | The export's `HeroSection` | Its telemetry panel shows fixed figures (AED 2,200, coordinates, "4 SIGNATURES", "RADAR 60FPS"). | The layout is ported with our copy; the panel becomes "Example findings", labelled demo data, with rule names from `redFlag.ts`. The export's figures are not used. |
| C6 | MoHRE enquiry link | `MOHRE_INQUIRY_URL` pointed to `https://www.mohre.gov.ae/en/services/inquiry.aspx`, which MoHRE answers with "Page Not Found" (build log 2026-11-10). | **Fixed 2026-11-10:** `https://receipts.mohre.gov.ae/OfferInquiry/Index?langid=2`, the page MoHRE's own home page links. A test fails if any portal URL ends in `/services/inquiry.aspx`. |

## Inventory

### Shell and navigation (`Navbar.tsx`, `App.tsx`, `index.css`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Sticky frosted header | Navbar.tsx | Sticky, blurred header with a bottom border and a deep shadow | Ported | `.site-header`, in the app before part 2 |
| UAE flag ribbon glow and drift | Navbar.tsx | Soft glow on the ribbon; the colours slide | Ported | One four-colour gradient that drifts over 24s (`ribbon-drift`); still under reduced motion. Its loop is part of S5-2 |
| Aurora horizon glow above the header | Navbar.tsx | Blurred green, cyan and indigo band | Ported | CSS gradient, `pointer-events: none`, static under reduced motion. Its loop is part of S5-2 |
| Logo badge hover scale | Navbar.tsx | Badge scales to 1.05 on hover | Ported | No-preference block only |
| Pinging red dot on the logo | Navbar.tsx | `animate-ping` dot | Ported | `.brand-ping`: decorative, `aria-hidden`, no pointer events, and no text that claims a live alert. Its loop is part of S5-2 |
| "MoHRE Compliance" chip and "Federal Decree-Law No. 33 of 2021" caption | Navbar.tsx | Brand sub-line | Skipped | Implies a compliance status and a legal basis the app does not have. Our caption keeps one line with an ellipsis |
| "Online AI" engine button and popover | Navbar.tsx | Switches between Gemini and an offline engine; server ping | Skipped | Model labels and an AI mode the app does not have. Replaced by a "Fixed rules" status pill, which is true of the engine |
| Desktop tab capsule | Navbar.tsx | Five tabs in a rounded capsule, icon and label | Ported | `nav-desktop`, in the app before part 2 |
| Active tab: gradient pill, glowing border, dot | Navbar.tsx | Current-tab styling | Ported | `aria-current` and the weight change carry the state; the glowing `.tab-dot` is decorative and does not pulse; brighter border and text on hover |
| Shimmer sweep on hover | Navbar.tsx, OfferAnalyzer.tsx | A white gradient slides across a tab or button | Ported | CSS pseudo-element and transition; off under reduced motion |
| Vault count badge on the tab | Navbar.tsx | Number of saved audits | Skipped | The export sets it to 1 whenever any record exists (wrong count); ours cannot count records while the vault is locked |
| Radar tab icon pulse | Navbar.tsx | Pulsing red radio icon | Skipped | Signals live activity; the radar shows demo data |
| UAE Hotlines dropdown | Navbar.tsx | Three `tel:` rows | Ported | In the app before part 2; numbers from `uaeContacts.ts`, not the export's |
| Hotlines icon bounce | Navbar.tsx | Phone icon bounces every 3 s | Skipped | Constant motion with no meaning |
| Dropdown open animation | Navbar.tsx | Fade and slide from the top | Ported | CSS keyframe; 0s under reduced motion |
| Close the dropdown on mouse leave | Navbar.tsx | The panel closes when the pointer leaves | Skipped | Bad for keyboard and touch; ours closes on Escape and outside click |
| EN/AR toggle and `dir` switch | App.tsx, Navbar.tsx | Sets `dir` and `lang` on `<html>` | Ported | `lang.ts` and the RTL rules, in the app before part 2. New rules use logical properties; direction-dependent pieces (radar sweep, sample arrow, score ring) mirror under `dir="rtl"` |
| Tajawal and Plus Jakarta Sans fonts | index.css | Web fonts | Skipped | External font files; the system stack stays |
| Mobile tab bar | Navbar.tsx | Scrollable tab bar below 1024px | Ported | `nav-mobile`, in the app before part 2 |
| Mobile hamburger menu | none | The export has no hamburger | Skipped | Nothing to port; our compact bar stays |
| Footer layout | App.tsx | Brand line, portal links, disclaimer row | Ported | `SiteFooter`, in the app before part 2; part 2 adds "GDRFA Dubai (Amer)" because it is in `uaeContacts.ts` |
| Footer content | App.tsx | Five external links (`ecrime.ae`, `inquiry.mohre.gov.ae`, …), "Operating strictly in accordance with Decree-Law 33", "AES-256-GCM Local Vault Active" | Skipped | Links not from `uaeContacts.ts`; claims a legal basis; claims the vault is active when it may be locked |
| Thin custom scrollbars | index.css | 6px slate scrollbar | Ported | CSS only; thumb at least 3:1 on the track |
| Selection colour | App.tsx | Emerald selection highlight | Ported | Token-based `::selection`, AA checked |
| Aurora utilities (`aurora-bg`, `aurora-border-active`, `aurora-glow-pill`) | index.css | Animated gradient backgrounds and borders | Ported | Our class names; animation only in the no-preference block |
| Print styles | index.css | White page, hide `.no-print` | Ported | `@media print`, in the app before part 2; Legal accordions print open |
| Page and tab transitions | App.tsx | None: tabs swap instantly | Ported | Our tabs are routes: each page fades in over 200ms with an 8px rise (`page-in`); 0s under reduced motion |

### Hero (`HeroSection.tsx`, `public/videos/hero-cyber-loop.mp4`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Hero frame with HUD corner brackets | HeroSection.tsx | 24px rounded card, green border glow, four corner brackets | Ported | CSS pseudo-elements, decorative; the brackets pulse only when motion is allowed |
| Background video | HeroSection.tsx | MP4 loop with `autoPlay` | Ported | Pattern only; the file is our own render in `public/hero/` (C2), muted, `playsInline`, `aria-hidden`, no `autoplay` attribute, started by script only when motion is allowed |
| Directional scrims and glass copy panel | HeroSection.tsx | Dark gradients and a blurred panel behind the headline | Ported | `.hero-glass`; text contrast tested over a white video pixel |
| Pulsing aurora orbs | HeroSection.tsx | Two blurred circles | Ported | Behind the radar; 6s and 4s pulse, static under reduced motion |
| Headline and subtitle | HeroSection.tsx | "UAE Job Offer Scam & Red Flag Analyzer", "… with exact statutory evidence" | Skipped | Our copy stays; "statutory evidence" overclaims |
| Hero badges and feature chips | HeroSection.tsx | Two badges and three chips beside the headline | Ported | Layout only, with our words: "Fixed rules, no AI scoring", "{RULES.length} rules, every finding quoted" and the three existing hero-side lines |
| Claim chips | HeroSection.tsx | "Decree-Law Shield", "360° THREAT MATRIX ACTIVE", "Article 6: Zero Candidate Fees", "MoHRE Standard Contract Verification" | Skipped | Legal articles and verification the app does not do |
| Radar with sweep and blips | HeroSection.tsx | A turning radar with targets | Ported | CSS/SVG only (`HeroStage.tsx`): rings, crosshair, an 8s sweep turned with `rotate`, three blips timed to the sweep; `aria-hidden`, no pointer events; reads nothing |
| Live Threat Acquisition panel | HeroSection.tsx | Fixed AED 2,200, @gmail.com, Law 33/2021, Dubai coordinates, "4 SIGNATURES" | Ported | Layout only, as "Example findings": three rows naming real rules (RF-001, RF-005) and the MoHRE check, a count tied to the four synthetic samples, and "Demo data, not your text". The export's figures and law reference are not used |
| Pause/Resume button | HeroSection.tsx | Pauses the video | Ported | "Pause radar / Resume radar" pauses the video and holds every hero animation; closes S5-1 (C4) |
| Glow Max/Normal toggle | HeroSection.tsx | Brightness toggle | Ported | Dims the aurora and orbs only; never brightens the video |
| "RADAR 60FPS" badge | HeroSection.tsx | Fake telemetry | Skipped | Not real; replaced by a "Demo animation" chip |
| Headline or counter animations | none | The export has none | Skipped | Nothing to port; no counters invented |

### Offer Analyzer input (`OfferAnalyzer.tsx`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Sample cards grid | OfferAnalyzer.tsx | Card per sample: channel, name, two-line description, "Load Sample →" | Ported | Our four synthetic samples, in the app before part 2 |
| Sample card hover lift, glow and arrow | OfferAnalyzer.tsx | Lift, border tint, arrow moves on hover | Ported | 2px lift and glow; the arrow slides 4px (mirrored in RTL); motion in the no-preference block |
| "High Risk Scam" and "Genuine Baseline" tags | OfferAnalyzer.tsx | States the expected result on each sample | Skipped | Verdict wording; ours shows the channel only |
| Channel segmented control | OfferAnalyzer.tsx | Email, WhatsApp, LinkedIn, Offer Letter PDF | Ported | One boxed group with icons; the active segment uses `aria-pressed` |
| Engine toggle (Gemini / offline) | OfferAnalyzer.tsx | Switches the analysis engine | Skipped | Model labels; no model scores anything |
| Auto-Redact toggle and count | OfferAnalyzer.tsx | Masks Emirates ID, passport and IBAN before sending | Ported | `src/lib/redact.ts`, in the app before part 2 |
| Placeholder with example scam phrases | OfferAnalyzer.tsx | Lists phrases, including "adnoc.hr.recruitment@gmail.com" | Skipped | Names a real company; our placeholder stays |
| Character count | OfferAnalyzer.tsx | "n characters" | Ported | Live "n / 20,000" counter, in the app before part 2 |
| Clear text | OfferAnalyzer.tsx | Empties the box | Ported | A "Clear text" link-style button with a 44px target, through the STALE-1 clearing path |
| Textarea focus glow | OfferAnalyzer.tsx | Emerald glow around the focused box | Ported | 3px focus ring (was 1px on text inputs) plus a soft glow |
| Image upload and drag-drop zone | OfferAnalyzer.tsx | Attach an image for Gemini OCR | Skipped | Needs a model; the brief excludes it |
| Error banner | OfferAnalyzer.tsx | Red inline alert | Ported | `Callout`, in the app before part 2 |
| Loading panel with a spinning ring | OfferAnalyzer.tsx | Bordered panel with spinner | Ported | Shown only when a check takes over 300ms; nothing waits for it. It lists "Cleaning the text", "Running {n} fixed rules", "Building the score" as what a check does, not as timed progress. `aria-hidden`; the status region says "Checking the offer." |
| Rotating step text and model label | OfferAnalyzer.tsx | Four legal-sounding steps rotate every 1.1 s regardless of progress; "Model: Gemini 3.8 Flash" | Skipped | Fake progress and a model label |
| Primary button: gradient, glow, shimmer, press | OfferAnalyzer.tsx | "Audit Job Offer for UAE Scams & Red Flags" | Ported | Emerald-to-cyan gradient (white text 4.5:1 on both ends, tested), icon, glow, shimmer, press scale 0.98; flat and dim when blocked; our label and the aria-disabled reason stay |

### Result card (`AnalysisResultCard.tsx`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Risk banner tinted by band, with a large icon | AnalysisResultCard.tsx | Gradient banner | Ported | Driven by our band and coverage state; band words from `scoring.ts`; unchecked and partial keep the neutral look |
| Verdict headlines | AnalysisResultCard.tsx | "HIGH RISK: PROBABLE RECRUITMENT SCAM", "LOW RISK: STANDARD RECRUITMENT PATTERNS DETECTED" | Skipped | Verdict wording; ours says "Risk indicators, not a verdict" |
| "Safe Job Offer Verified" chip | AnalysisResultCard.tsx | Pulsing green chip on Low | Skipped | Verdict wording ("safe", "verified"); a test bans both words |
| Confetti and the "Celebrate Safe" button | AnalysisResultCard.tsx, utils/confetti.ts | canvas-confetti burst on Low | Skipped | Dependency, and it celebrates a "safe" result |
| Channel and finding-count meta | AnalysisResultCard.tsx | "Channel: Email · Red Flags: 3" | Ported | `.result-meta`, in the app before part 2 |
| Toolbar: Listen, Export PDF, Save Encrypted, New Audit | AnalysisResultCard.tsx | Result actions | Ported | In the app before part 2; Listen reads fixed wording only, never offer text |
| Radial score ring | AnalysisResultCard.tsx | SVG ring animating to the trust score | Ported | Fills over 600ms to `risk.score` from `scoring.ts`; no ring when the text was not checked; no "trust score" and no inversion |
| Trust score, scam probability and "AI Scam Detection Reliability" bar | AnalysisResultCard.tsx | Numbers derived from flag counts | Skipped | Invented scores, not from `scoring.ts` |
| Evidence basis box | AnalysisResultCard.tsx | A reliability figure | Ported | Layout only: "N matched rules, each with the exact words quoted from the text"; a count, never a percentage; hidden when the text was not checked |
| Four "dimension" bars | AnalysisResultCard.tsx | 0/100 bars (Fee Legality, Sender Authenticity, Identity Protection, Recruitment Rigor) labelled "Compliant", "Verified", "Safe" | Ported | Layout only: four tiles grouping our rule ids (RF-001; RF-002/RF-003; RF-004; RF-005), each "Indicator found" or "No indicator found" with a full or empty bar; "Not checked" when the text was not checked. The export's scores and labels are not used |
| View switch: findings or source highlights | AnalysisResultCard.tsx | Two tabs | Ported | "Documented red flags (n)" and "Highlights in your text", `role="tablist"` |
| Finding card layout | AnalysisResultCard.tsx | Number tile, title, severity chip, explanation | Ported | Numbered badge; the chip keeps "rule, +N points"; explanation from `checkLabels.ts` |
| Finding entrance | AnalysisResultCard.tsx | Cards fade in | Ported | Fade up, 60ms apart; no scroll reveal |
| Quote block with Copy Quote | AnalysisResultCard.tsx | Copies matched text, shows "Copied" | Ported | Mono italic quote as text; "Copy quote" shows "Copied" for 1.5s |
| "Report Signal" per finding | AnalysisResultCard.tsx | Opens the report modal prefilled | Ported | Opens our local `ReportModal`; nothing is sent |
| Expand or collapse per finding | none | The export has none (`selectedFlagIndex` is unused) | Skipped | Nothing to port |
| Empty findings state | AnalysisResultCard.tsx | Big green tick, "No Obvious Scam Signals Extracted" | Skipped | Ours follows `allClearShown` and the coverage rules; no green tick with a notice |
| Source text highlights with legend | AnalysisResultCard.tsx | `<mark>` around matched text | Ported | In the app before part 2; rendered as text nodes, never HTML |
| Verification checklist with n / m counter | AnalysisResultCard.tsx | Click a row to tick it | Ported | "Check it yourself": the eight warning-sign actions from `warningSigns.ts`, a "0 / 8 done" counter and a progress bar |
| Reporting channels | AnalysisResultCard.tsx | Mixed into the checklist and portal buttons | Ported | A separate block, "If it looks like a scam, report it": Dubai Police eCrime button and its 901 hotline from `uaeContacts.ts`, the other channels from `authorities.ts` as links; no ticks, no counter |
| Portal jump buttons | AnalysisResultCard.tsx | Four external links, including `ecrime.ae` | Ported | MoHRE offer enquiry, MoHRE website and ICP, from `uaeContacts.ts`; the export's URLs are not used |
| Save passphrase modal | App.tsx | Modal for the vault passphrase | Ported | `SaveVaultModal`, in the app before part 2 |
| Modal fade and scale-in | App.tsx, ReportModal.tsx | `animate-in fade-in` | Ported | CSS keyframe; 0s under reduced motion |
| `alert()` after save | App.tsx | Browser alert | Skipped | Blocking dialog; ours uses an inline status |

### Threat Radar (`ThreatRadar.tsx`, `ReportModal.tsx`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Red-tinted header banner | ThreatRadar.tsx | Gradient banner | Ported | `data-tint="red"` on the page banner |
| Pulsing eyebrow pill | ThreatRadar.tsx | Pill above the title | Ported | Our wording, "Sample reports (demo data)", with a pulsing dot. Its loop is part of S5-2 |
| Header copy | ThreatRadar.tsx | "Active UAE Threat Intelligence Radar", "Real-time feed" | Skipped | "Real-time" and "active" are false; our demo-data line stays |
| "Add a report" with red glow | ThreatRadar.tsx | Report button | Ported | Danger button with a red glow; opens our local modal |
| Map | none | The export has no map | Skipped | Nothing to port |
| Search box and category filter chips | ThreatRadar.tsx | Client-side filter | Ported | In the app before part 2; the search box gets the focus glow |
| Loading spinner | ThreatRadar.tsx | "Connecting to UAE Threat Intelligence Feed…" | Skipped | No server feed; the data is local |
| Empty state | ThreatRadar.tsx | "No Threat Alerts Found" with an icon | Ported | In the app before part 2 |
| Threat card layout and hover lift | ThreatRadar.tsx | Severity chip, title, mono quote, region; lift on hover | Ported | Every card keeps its "Demo data" tag; 2px lift and glow on hover |
| Date and law reference on cards | ThreatRadar.tsx | Report date, legal article | Skipped | No dates or law articles on demo data |
| Upvote | ThreatRadar.tsx | POSTs an upvote | Skipped | Server call; implies real community data |
| Report modal | ReportModal.tsx | Form that POSTs `/api/report-scam` | Ported | Ours keeps reports on the device and says so |
| Report success tick | ReportModal.tsx | Tick in a circle | Ported | Scale-in, 0s under reduced motion |

### Gov Portals Hub (`VerificationHub.tsx`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Header banner | VerificationHub.tsx | Pill, title and intro | Ported | Green tint and a pulsing "Official sources only" pill. Its loop is part of S5-2 |
| MoHRE code "format validator" | VerificationHub.tsx | Regex reports "Valid MoHRE standard contract format" for ST-, PT- and 14-digit codes | Skipped | Invents MoHRE code formats and calls them valid; our `ReferenceHelper` only tidies the reference, links to the MoHRE enquiry and says "Offer Check cannot tell whether a reference is real" |
| Portal directory cards | VerificationHub.tsx | Category, authority, Arabic name, hotline, Open Portal | Ported | Category chip and Federal or Dubai tag, Arabic name, hotline chip, green "Open portal"; every link and number from `uaeContacts.ts` |
| "How to verify" steps per portal | VerificationHub.tsx | Portal-specific numbered steps | Needs source | The export's steps describe how each portal works inside, with no source. Our cards show three general steps that hold for any official channel (open it from here, what it is for from `uaeContacts.ts`, call the hotline if anything differs) until the owner supplies sourced steps |

### Legal Guidelines (`OfflineGuide.tsx`, `data/uaeLaborGuidelines.ts`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Header with "Print Pocket Guide" | OfflineGuide.tsx | Banner and print button | Ported | Green-tinted banner with our existing `PrintButton` |
| Numbered rule cards | OfflineGuide.tsx | "5 Golden Rules" with number tiles | Ported | Number tiles on our eight warning signs from `warningSigns.ts`; the export's rules are not used |
| Accordion open and close motion | OfflineGuide.tsx | Chevron flips; panel appears | Ported | `SignAccordion`: "Why it matters" folds open with `grid-template-rows` 0fr to 1fr and a turning chevron; text only from `warningSigns.ts`; prints open; 0s under reduced motion |
| Law article accordion content | OfflineGuide.tsx, uaeLaborGuidelines.ts | Article numbers, summaries, fines, "practical rule" | Needs source | Federal Decree-Law No. 33 of 2021 articles and penalties as the export states them have no source in the repo; a test bans article numbers and fines on the page until each is checked against the official text |
| "Anatomy of a Genuine MoHRE Offer Letter" | OfflineGuide.tsx | Claims about barcodes, 14-digit numbers and dual columns | Needs source | Unverified facts about the MoHRE letter; needs an official source |
| "Accessible completely offline" | OfflineGuide.tsx | Claim | Skipped | Not true: there is no service worker |

### Encrypted Vault (`EncryptedVault.tsx`, `utils/crypto.ts`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Header banner layout | EncryptedVault.tsx | Pill, title, intro, side pill | Ported | Green tint; the pill keeps our wording, "AES-256-GCM, in this browser only" |
| Header copy | EncryptedVault.tsx | "military-grade", "Zero Server Footprint" | Skipped | Overclaims; ours keeps the truthful wording |
| Unlock card with a key icon | EncryptedVault.tsx | Key in a ringed circle, passphrase form | Ported | Ringed key (decorative), show/hide passphrase button (`aria-pressed`, 44px), full-width gradient "Open" button; `vaultCrypto.ts` is untouched |
| Unlocked status bar and Lock button | EncryptedVault.tsx | Status line | Ported | In the app before part 2 |
| Status dot pulse | EncryptedVault.tsx | Pulsing green dot | Skipped | Adds another endless loop (S5-2); the Lock button and the text carry the state |
| Two-pane list and detail | EncryptedVault.tsx | Record list and detail | Ported | In the app before part 2 |
| Record chip colour (High red, everything else green) | EncryptedVault.tsx | Binary colour | Skipped | Shows Medium as green; ours uses the band |
| Empty states | EncryptedVault.tsx | No records; nothing selected | Ported | In the app before part 2 |

### Cross-cutting

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Hover and press states | all | Colour and scale changes, arrow nudges | Ported | Scale 1.02 on hover and 0.98 on press, in the no-preference block; blocked buttons do not move |
| Entry animations (`animate-in fade-in slide-in-from-top-2`) | Navbar.tsx, modals | Tailwind plugin animations | Ported | CSS keyframes |
| Scroll reveals | none | The export has none | Skipped | Tried with `animation-timeline: view()` and removed: content outside the viewport stayed at opacity 0, so print and full-page captures came out blank. A test forbids it |
| Toasts | none | The export has none (it uses `alert()`) | Skipped | Nothing to port; our inline `role="status"` messages stay |
| Gemini server, local analyzer, `/api/*` endpoints | server.ts, utils/localAnalyzer.ts | Scoring and feeds | Skipped | Scoring rule; no model; no new endpoints |
| `public/assets/aistudio/*.png` | public/assets | Two screenshots of the export | Skipped | Reference images, not UI assets |

## Summary

| Area | Ported | Skipped | Needs source | Total |
|---|---|---|---|---|
| Shell and navigation | 18 | 9 | 0 | 27 |
| Hero | 9 | 4 | 0 | 13 |
| Offer Analyzer input | 10 | 5 | 0 | 15 |
| Result card | 17 | 7 | 0 | 24 |
| Threat Radar | 8 | 5 | 0 | 13 |
| Gov Portals Hub | 2 | 1 | 1 | 4 |
| Legal Guidelines | 3 | 1 | 2 | 6 |
| Encrypted Vault | 5 | 3 | 0 | 8 |
| Cross-cutting | 2 | 4 | 0 | 6 |
| **All** | **74** | **39** | **3** | **116** |
