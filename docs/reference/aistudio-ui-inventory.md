# AI Studio export: UI/UX inventory (Phase 1)

Source: `docs/reference/aistudio/` (read only, never imported). Written 2026-11-10 against `main` at `c5fb169`.

Decision key:
- **Port**: bring into our app, re-created in our CSS and components.
- **Have**: already in our app, from `317192d` or earlier.
- **Skip**: not brought in; the reason is given.
- **Placeholder**: the export has content our app lacks; it is listed, not invented.
- **n/a**: the prompt names the feature, but the export does not have it.

Every Port is visual or interaction only. Scores, bands, findings, coverage states, the approval gate, the audit trail, vault encryption and translation consent stay as they are. Official links and numbers come only from `src/data/uaeContacts.ts` and `src/lib/authorities.ts`.

## Conflicts found before Phase 2

| # | Prompt says | Repo says | Proposed handling |
|---|---|---|---|
| C1 | "There is uncommitted interface work (portals page, Navbar, globals.css, routes.test.ts)." | That work was committed and pushed as `c5fb169`. The working tree has only untracked `docs/build-log/2026-11-10.md` and `docs/reference/aistudio/`. | Nothing to keep; no action. |
| C2 | Hero video: "same pattern as the current HeroBackdrop", "the pinned 0.12 limit", "keep the existing hero loop". | `HeroBackdrop`, `public/hero/*` and the 0.12 brightness test were removed in `317192d`. `public/` is empty, and no test pins 0.12 now. | In step 2c, re-create the `HeroBackdrop` pattern from `d31f511`, measure the export video's brightness, and add a new test that pins 0.12. If the video fails, there is no loop to fall back to, so the hero shows no video (aurora only). Owner decision. **Resolved 2026-11-10:** the export video was rejected (burned-in model and verdict text, invented figures, brightest pixel 0.962). The owner asked for a brighter loop, so `scripts/make-hero-loop.py` renders our own text-free loop: brightest pixel webm 0.410, mp4 0.458, poster 0.372; 1.36 MB, 1.10 MB, 122 KB. The 0.12 cap is replaced by a worst-case test: hero text on the `.hero-glass` panel over a white video pixel stays at 4.5:1 or more. |
| C3 | "the 5,000-character cap" | `MAX_OFFER_CHARS` is 20,000 (`src/lib/types.ts`). 5,000 is the translation cap in `/api/translate`. | Keep both unchanged. |
| C4 | The export starts the hero video with `autoPlay` and has Pause/Resume. | Our rule: no `autoplay` attribute; script starts the video only when motion is allowed. The owner removed the pause button on 2026-11-08 (S5-1, WCAG 2.2.2, accepted). | Follow our rule. Porting the export's Pause button would close S5-1. Owner decision. **Resolved 2026-11-10:** no pause button; S5-1 stays accepted. |
| C5 | The export's `HeroSection` | It is rendered inside `OfferAnalyzer`, not in `App.tsx`. Its telemetry panel shows fixed figures (AED 2,200, coordinates, "4 SIGNATURES", "RADAR 60FPS"). | Port the layout and the video only, with our copy. Skip every fixed figure. |

## Inventory

### Shell and navigation (`Navbar.tsx`, `App.tsx`, `index.css`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Sticky frosted header | Navbar.tsx | Sticky, blurred header with a bottom border and a deep shadow | Have | `.site-header` |
| UAE flag ribbon glow | Navbar.tsx | Soft glow on the green and red ends of the 4px ribbon | Port | The ribbon exists; the glow is a CSS addition |
| Aurora horizon glow above the header | Navbar.tsx | Blurred green, cyan and indigo band | Port | CSS gradient, `pointer-events: none`, static under reduced motion |
| Logo badge hover scale | Navbar.tsx | Badge scales to 1.05 on hover | Port | No-preference block only |
| Pinging red dot on the logo | Navbar.tsx | `animate-ping` dot | Skip | Signals a live alert with no meaning behind it |
| "MoHRE Compliance" chip and "Federal Decree-Law No. 33 of 2021" caption | Navbar.tsx | Brand sub-line | Skip | Implies a compliance status and a legal basis the app does not have |
| Desktop tab capsule | Navbar.tsx | Five tabs in a rounded capsule, icon and label | Have | `nav-desktop` |
| Active tab: gradient pill, glowing border, pulsing dot | Navbar.tsx | Current-tab styling | Port | Keep `aria-current` and the weight change, so state is not shown by colour alone; pulse only in the no-preference block |
| Shimmer sweep on hover | Navbar.tsx, OfferAnalyzer.tsx | A white gradient slides across a tab or button | Port | CSS pseudo-element and transition; off under reduced motion |
| Vault count badge on the tab | Navbar.tsx | Number of saved audits | Skip | The export sets it to 1 whenever any record exists (wrong count); ours cannot count records while the vault is locked |
| Radar tab icon pulse | Navbar.tsx | Pulsing red radio icon | Skip | Signals live activity; the radar shows demo data |
| "Online AI" engine button and popover | Navbar.tsx | Switches between Gemini and an offline engine; server ping | Skip | Model labels and an AI mode the app does not have; pings an endpoint we do not have |
| UAE Hotlines dropdown | Navbar.tsx | Three `tel:` rows | Have | Our numbers come from `uaeContacts.ts`; the export's hard-coded numbers are not used |
| Hotlines icon bounce | Navbar.tsx | Phone icon bounces every 3 s | Skip | Constant motion with no meaning |
| Dropdown open animation | Navbar.tsx | Fade and slide from the top | Port | CSS keyframe; 0s under reduced motion |
| Close the dropdown on mouse leave | Navbar.tsx | The panel closes when the pointer leaves | Skip | Bad for keyboard and touch; ours closes on Escape and outside click |
| EN/AR toggle and `dir` switch | App.tsx, Navbar.tsx | Sets `dir` and `lang` on `<html>` | Have | `lang.ts` and the RTL rules from `c5fb169` |
| Tajawal and Plus Jakarta Sans fonts | index.css | Web fonts | Skip | External font files; the system stack stays |
| Mobile tab bar | Navbar.tsx | Scrollable tab bar below 1024px | Have | `nav-mobile` |
| Mobile hamburger menu | none | The export has no hamburger | n/a | Our compact bar stays |
| Footer layout | App.tsx | Brand line, portal links, disclaimer row | Have | `SiteFooter` |
| Footer content | App.tsx | Five external links (`ecrime.ae`, `inquiry.mohre.gov.ae`, …), "Operating strictly in accordance with Decree-Law 33", "AES-256-GCM Local Vault Active" | Skip | Links not from `uaeContacts.ts`; claims a legal basis; claims the vault is active when it may be locked |
| Thin custom scrollbars | index.css | 6px slate scrollbar | Port | CSS only; thumb at least 3:1 on the track |
| Selection colour | App.tsx | Emerald selection highlight | Port | Token-based `::selection`, AA checked |
| Aurora utilities (`aurora-bg`, `aurora-border-active`, `aurora-glow-pill`) | index.css | Animated gradient backgrounds and borders | Port | Our class names; animation only in the no-preference block |
| Print styles | index.css | White page, hide `.no-print` | Have | `@media print` in globals.css |
| Page and tab transitions | App.tsx | None: tabs swap instantly | Port | Our tabs are routes; add a short fade-in on page content, 0s under reduced motion |

### Hero (`HeroSection.tsx`, `public/videos/hero-cyber-loop.mp4`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Hero frame with HUD corner brackets | HeroSection.tsx | Rounded card, green border glow, four corner brackets | Port | CSS pseudo-elements, decorative |
| Background video | HeroSection.tsx | 463 KB MP4 loop with `autoPlay`, fades in on load, saturate and contrast boost | Port | Pattern ported, file not copied: our own render in `public/hero/` (C2) with a poster; muted, `playsInline`, `aria-hidden`; no `autoplay` attribute; started by script only when motion is allowed; no saturate boost; brightness test (see C2) |
| Directional scrims | HeroSection.tsx | Dark gradients on the left and bottom | Port | Needed for AA text over the video |
| Pulsing aurora orbs | HeroSection.tsx | Two blurred circles | Port | Slow drift in the no-preference block, static otherwise |
| Glass copy panel | HeroSection.tsx | Blurred dark panel behind the headline | Port | Holds our existing hero copy |
| Headline and subtitle | HeroSection.tsx | "UAE Job Offer Scam & Red Flag Analyzer", "… with exact statutory evidence" | Skip | Our copy stays; "statutory evidence" overclaims |
| Claim chips | HeroSection.tsx | "Decree-Law Shield", "360° THREAT MATRIX ACTIVE", "Article 6: Zero Candidate Fees", "MoHRE Standard Contract Verification", "Automatic ID Redaction" | Skip | Legal articles and verification the app does not do; our hero-side list stays |
| Live Threat Acquisition panel | HeroSection.tsx | Fixed AED 2,200, @gmail.com, Law 33/2021, Dubai coordinates, "4 SIGNATURES" | Skip | Invented data presented as live |
| Pause/Resume button | HeroSection.tsx | Pauses the video | Skip | Owner decision (C4): no pause button, S5-1 stays accepted |
| Glow Max/Normal toggle and "RADAR 60FPS" badge | HeroSection.tsx | Brightness toggle, fake telemetry | Skip | The boost raises brightness past the cap; the FPS badge is not real |
| Headline or counter animations | none | The export has none | n/a | No counters invented |

### Offer Analyzer input (`OfferAnalyzer.tsx`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Sample cards grid | OfferAnalyzer.tsx | Card per sample: tag, channel, name, two-line description, "Load Sample →" | Have | Our four synthetic samples |
| Sample card hover lift and arrow nudge | OfferAnalyzer.tsx | Border tint, arrow moves on hover | Port | No-preference block |
| "High Risk Scam" and "Genuine Baseline" tags | OfferAnalyzer.tsx | States the expected result on each sample | Skip | Verdict wording; ours keeps "Synthetic" |
| Channel segmented control | OfferAnalyzer.tsx | Email, WhatsApp, LinkedIn, Offer Letter PDF | Have | Active-segment styling is a Port |
| Engine toggle (Gemini / offline) | OfferAnalyzer.tsx | Switches the analysis engine | Skip | Model labels; no model scores anything |
| Auto-Redact toggle and count | OfferAnalyzer.tsx | Masks Emirates ID, passport and IBAN before sending | Have | `src/lib/redact.ts` |
| Placeholder with example scam phrases | OfferAnalyzer.tsx | Lists phrases, including "adnoc.hr.recruitment@gmail.com" | Skip | Names a real company; our placeholder stays |
| Character count | OfferAnalyzer.tsx | "n characters" | Have | |
| Clear text button | OfferAnalyzer.tsx | Empties the box | Port | Must go through the STALE-1 clearing path |
| Image upload and drag-drop zone | OfferAnalyzer.tsx | Attach an image for Gemini OCR | Skip | The upload box is excluded (Part 1); it needs a model |
| Error banner | OfferAnalyzer.tsx | Red inline alert | Have | `Callout` |
| Loading panel look | OfferAnalyzer.tsx | Bordered panel with spinner | Port | Shows only the real state ("Checking…") with an indeterminate shimmer |
| Rotating step text and model label | OfferAnalyzer.tsx | Four legal-sounding steps rotate every 1.1 s regardless of progress; "Model: Gemini 3.8 Flash" | Skip | Fake progress (Step 5 rule) and a model label |
| Primary CTA: gradient, glow, shimmer, icon scale | OfferAnalyzer.tsx | "Audit Job Offer for UAE Scams & Red Flags" | Port | Styling only; our label and the aria-disabled reason stay |

### Result card (`AnalysisResultCard.tsx`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Risk banner tinted by band, with a large icon | AnalysisResultCard.tsx | Gradient banner; the High icon pulses | Port | Driven by our band and coverage state; no pulse; unchecked and partial keep the neutral look |
| Verdict headlines | AnalysisResultCard.tsx | "HIGH RISK: PROBABLE RECRUITMENT SCAM", "LOW RISK: STANDARD RECRUITMENT PATTERNS DETECTED" | Skip | Verdict wording; ours says "Risk indicators, not a verdict" |
| "Safe Job Offer Verified" chip | AnalysisResultCard.tsx | Pulsing green chip on Low | Skip | Verdict wording ("safe", "verified") |
| Confetti and the "Celebrate Safe" button | AnalysisResultCard.tsx, utils/confetti.ts | canvas-confetti burst on Low | Skip | Dependency, and it celebrates a "safe" result |
| Channel and finding-count meta | AnalysisResultCard.tsx | "Channel: Email · Red Flags: 3" | Have | `.result-meta` |
| Toolbar: Listen, Export PDF, Save Encrypted, New Audit | AnalysisResultCard.tsx | Result actions | Have | Listen reads fixed wording only, never offer text |
| Radial gauge | AnalysisResultCard.tsx | SVG ring animating over 1 s to the trust score | Port | The ring shows our `risk.score` from scoring.ts, with the band text and the number; no ring when unchecked; no "trust score" and no inversion |
| Trust score, scam probability and "AI Scam Detection Reliability" bar | AnalysisResultCard.tsx | Numbers the component derives from flag counts | Skip | Invented scores, not from scoring.ts |
| Four "dimension" bars (Fee Legality, Sender Authenticity, Identity Protection, Recruitment Rigor) | AnalysisResultCard.tsx | 0/100 bars from keyword matches, labelled "Compliant", "Verified", "Safe" | Skip | Invented scores and verdict words |
| View switch: findings or source highlights | AnalysisResultCard.tsx | Two tabs | Have | `role="tablist"` in ResultCard |
| Finding card layout | AnalysisResultCard.tsx | Title, severity chip, explanation | Have | The chip keeps the "rule, +N points" wording |
| Finding number tile and hover border | AnalysisResultCard.tsx | "#1" tile; border tint on hover | Port | Decorative |
| Quote block with Copy Quote | AnalysisResultCard.tsx | Copies matched text, shows "Copied" | Have | |
| "Report Signal" per finding | AnalysisResultCard.tsx | Opens the report modal prefilled | Have | Ours prefills the local demo modal; nothing is sent |
| Expand or collapse per finding | none | The export has none (`selectedFlagIndex` is unused) | n/a | |
| Empty findings state | AnalysisResultCard.tsx | Big green tick, "No Obvious Scam Signals Extracted" | Skip | Ours follows `allClearShown` and the coverage rules; no green tick with a notice |
| Source text highlights with legend | AnalysisResultCard.tsx | `<mark>` around matched text | Have | Rendered as text nodes, never HTML |
| Verification checklist with n / m counter | AnalysisResultCard.tsx | Click a row to tick it | Have | |
| Checklist tick transition | AnalysisResultCard.tsx | Row tint and strike-through | Port | No-preference block |
| Portal jump buttons | AnalysisResultCard.tsx | Four external links, including `ecrime.ae` | Have | Ours come from `authorities.ts`; the export's URLs are not used |
| Save passphrase modal | App.tsx | Modal for the vault passphrase | Have | `SaveVaultModal` |
| Modal fade and scale-in | App.tsx, ReportModal.tsx | `animate-in fade-in` | Port | CSS keyframe; 0s under reduced motion |
| `alert()` after save | App.tsx | Browser alert | Skip | Blocking dialog; ours uses an inline status |

### Threat Radar (`ThreatRadar.tsx`, `ReportModal.tsx`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Red-tinted header banner styling | ThreatRadar.tsx | Gradient banner with a pill | Port | Styling only |
| Header copy | ThreatRadar.tsx | "Active UAE Threat Intelligence Radar", "Real-time feed" | Skip | Ours must say "Sample reports (demo data)"; "real-time" and "active" are false |
| Map | none | The export has no map | n/a | |
| Search box and category filter chips | ThreatRadar.tsx | Client-side filter | Have | |
| Loading spinner | ThreatRadar.tsx | "Connecting to UAE Threat Intelligence Feed…" while fetching `/api/threat-radar` | Skip | No server feed; the data is local |
| Empty state | ThreatRadar.tsx | "No Threat Alerts Found" with an icon | Have | |
| Threat card layout | ThreatRadar.tsx | Severity chip, type, title, description, quote, region | Have | |
| Date and law reference on cards | ThreatRadar.tsx | Report date, legal article | Skip | Part 1 rule: no dates or law articles on demo data |
| Upvote | ThreatRadar.tsx | POSTs an upvote | Skip | Server call; implies real community data |
| Report modal | ReportModal.tsx | Form that POSTs `/api/report-scam` | Have | Ours keeps reports on the device and says so |
| Report success tick | ReportModal.tsx | Tick in a circle | Port | Scale-in, 0s under reduced motion |

### Gov Portals Hub (`VerificationHub.tsx`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Header banner | VerificationHub.tsx | Pill, title and intro | Have | |
| MoHRE code "format validator" | VerificationHub.tsx | Regex reports "Valid MoHRE standard contract format" for ST-, PT- and 14-digit codes | Skip | Invents MoHRE code formats and calls them valid; our `ReferenceHelper` only tidies the reference and links to MoHRE |
| Portal directory cards | VerificationHub.tsx | Category, Arabic name, badge, hotline, Open Portal | Have | |
| "How to verify" steps per portal | VerificationHub.tsx | Numbered steps for each portal | Placeholder | Not in `uaeContacts.ts`; needs owner-supplied steps |

### Legal Guidelines (`OfflineGuide.tsx`, `data/uaeLaborGuidelines.ts`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Header with "Print Pocket Guide" | OfflineGuide.tsx | Print button | Have | `PrintButton` |
| Numbered rule cards | OfflineGuide.tsx | "5 Golden Rules" with number tiles | Port | Number-tile styling only; our warning-sign entries stay as the content |
| Law article accordion content | OfflineGuide.tsx, uaeLaborGuidelines.ts | Article number, summary, "practical rule" | Skip | Law articles and fines are excluded (Part 1) |
| Accordion open and close motion | OfflineGuide.tsx | Chevron flips; panel appears | Port | Applied to our existing `<details>`; 0s under reduced motion |
| "Anatomy of a Genuine MoHRE Offer Letter" | OfflineGuide.tsx | Claims about barcodes, 14-digit numbers and dual columns | Placeholder | Unverified facts; needs a confirmed source |
| "Accessible completely offline" | OfflineGuide.tsx | Claim | Skip | Not true: there is no service worker |

### Encrypted Vault (`EncryptedVault.tsx`, `utils/crypto.ts`)

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Header banner layout | EncryptedVault.tsx | Pill, title, intro, side pill | Have | |
| Header copy | EncryptedVault.tsx | "military-grade", "Zero Server Footprint" | Skip | Overclaims; ours keeps the truthful wording |
| Unlock or create card with a key icon | EncryptedVault.tsx | Passphrase form | Have | `vaultCrypto.ts` is locked and untouched |
| Unlocked status bar and Lock button | EncryptedVault.tsx | Status line | Have | |
| Status dot pulse | EncryptedVault.tsx | Pulsing green dot | Port | No-preference block; the text carries the state |
| Two-pane list and detail | EncryptedVault.tsx | Record list on the left, detail on the right | Have | |
| Record chip colour (High red, everything else green) | EncryptedVault.tsx | Binary colour | Skip | Shows Medium as green; ours uses the band |
| Empty states | EncryptedVault.tsx | No records; nothing selected | Have | |

### Cross-cutting

| Feature | Source | What it does | Decision | Reason |
|---|---|---|---|---|
| Hover and press states | all | Colour and scale changes, arrow nudges | Port | Scale 1.02 on hover and 0.98 on press, in the no-preference block; blocked buttons do not move |
| Entry animations (`animate-in fade-in slide-in-from-top-2`) | Navbar.tsx, modals | Tailwind plugin animations | Port | CSS keyframes |
| Scroll reveals | none | The export has none | Skip | Tried with `animation-timeline: view()`, then removed: findings outside the viewport stayed at opacity 0, so print, Export PDF and full-page captures came out blank. A test now forbids it |
| Toasts | none | The export has none (it uses `alert()`) | n/a | Our inline `role="status"` messages stay |
| Gemini server, local analyzer, `/api/*` endpoints | server.ts, utils/localAnalyzer.ts | Scoring and feeds | Skip | Scoring rule; no model; no new endpoints |
| `public/assets/aistudio/*.png` | public/assets | Two screenshots of the export (header, MoHRE validator) | Skip | Reference images, not UI assets |

## Summary

| Area | Port | Have | Skip | Placeholder | n/a | Total |
|---|---|---|---|---|---|---|
| Shell and navigation | 10 | 7 | 9 | 0 | 1 | 27 |
| Hero | 5 | 0 | 5 | 0 | 1 | 11 |
| Offer Analyzer input | 4 | 5 | 5 | 0 | 0 | 14 |
| Result card | 5 | 10 | 7 | 0 | 1 | 23 |
| Threat Radar | 2 | 4 | 4 | 0 | 1 | 11 |
| Gov Portals Hub | 0 | 2 | 1 | 1 | 0 | 4 |
| Legal Guidelines | 2 | 1 | 2 | 1 | 0 | 6 |
| Encrypted Vault | 1 | 5 | 2 | 0 | 0 | 8 |
| Cross-cutting | 2 | 0 | 3 | 0 | 1 | 6 |
| **All** | **31** | **34** | **38** | **2** | **5** | **110** |
