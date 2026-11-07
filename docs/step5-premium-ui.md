# Step 5: premium UI pass

Goal: redesign the UI to a premium, restrained, product-grade level. This replaces the look from Step 4 (commit 7334612) wherever they differ. If a frontend-design skill is available, use it.

Reference files (markup and CSS only, not runnable, they use a template syntax): docs/reference/Main.dc.html (desktop) and docs/reference/Mobile.dc.html (mobile). Read them for layout, spacing and styling ideas. Do NOT copy invented timings, counts or sample numbers from them.

## Hard rules

- Presentation only. Do NOT touch src/lib (rules, scoring, drafter, gate, audit) or any test's behaviour. redFlag.ts sha256 must stay 789dc2b29a30940951257c677bddcb4eaf995bb8a187a19e3583ca51d1ebb76f. Tests may change only where they assert markup you changed; list each such change in your report.
- No new runtime dependencies. CSS only (globals.css or CSS modules), inline SVG for icons, next/font for Inter and Space Grotesk (self-hosted, no runtime network requests).
- Show only values the app really computes. No invented timings, counts or sample metrics.
- Keep: the prototype notice, "Risk indicators, not a verdict", honest "Not implemented yet" states for Verification and Official channel, the approval gate with its blocked-approve reason, the audit trail panel, the limitations panel.
- Accessibility: WCAG AA contrast (report computed ratios), 3px visible focus ring with offset, 44px minimum targets, logical tab order, no meaning by colour alone, prefers-reduced-motion respected. Keep the stronger control-border colour (#7A8481) added in Step 4 for input and button edges.

## Design tokens

- Colours: bg #F6F4EF, surface #FFFFFF, card border #E4E0D6, control border #7A8481, ink #14211F, muted #5B6764, primary #0F5C55 (hover #0B4A45), high #B3261E on #FBE9E7, medium #8A4B00 on #FFF1DC, success #1E6B3A on #E5F2E9, not-built #6B7471 on #EEF0EF.
- Type: Space Grotesk for headings and numbers (letter-spacing -0.02em, tabular numerals for scores), Inter for text. Scale: 44/52 hero, 28/36 section, 20/28 card title, 16/26 body, 14/22 secondary, 12/16 labels. Body text never below 14px, textarea 16px.
- Spacing scale 4/8/12/16/24/32/48/64 only. Radii: cards 16, controls 10, chips 999.
- Elevation: cards are white with a 1px #E4E0D6 border and a two-layer shadow (0 1px 2px rgba(20,33,31,.04), 0 8px 24px rgba(20,33,31,.06)). No heavy shadows, no gradients behind text, no emoji, no stock imagery.

## Layout

- Max content width 1120px, centred; 64px between major blocks on desktop, 40px on mobile.
- Header: small wordmark "Offer Check UAE" with a simple inline-SVG mark (rounded square with a check, built from basic shapes) and a one-line tagline. Under it a slim, calm info strip for the prototype notice (soft teal-tinted background, info icon, not a red alert).
- Input card: label, 16px textarea (min-height 220px, resize vertical, clear focus state), live character counter "n / 20,000" (value from the existing MAX_OFFER_CHARS, imported read-only), primary "Check offer" button (44px, full width on mobile). Keep ALL THREE existing sample buttons: scam, clean and "Injection attempt", each labelled synthetic; they fill the textarea from the existing fixtures. While the request is running show a real busy state (button spinner and aria-busy), no fake progress.
- Results, desktop (>=1024px): two columns. Left, sticky: score card with an arc or ring gauge (SVG), the score in 56px Space Grotesk, a band chip, the thresholds line, the points sum line (only when it matches the server score) and "Risk indicators, not a verdict". Right: findings, then agent run, then the draft, then the audit trail. Mobile: one column in that order.
- Gauge: the arc animates 600ms ease-out to the score; with prefers-reduced-motion the transition is 0s. Colour by band, plus the band text label and the number (never colour alone).
- Findings: each is a card with a 4px left severity bar, a chip such as "HIGH, +40 points", the rule name (20/28 semibold), a one-line plain explanation, and the evidence in a quote block (subtle #F6F4EF background, 3px teal left border, opening-quote glyph, 15px). Empty state when no rule counted: a calm card with a check icon and the existing wording.
- Agent run: vertical timeline. Completed = teal filled node with a check icon. Not implemented yet = dashed grey outline node with the label "Not implemented yet" and muted text; it must never look green or done. Show only real measured durations.
- Draft reply: a paper-like card (white, 1px border, 24px padding, 15/26 text). Show [Recipient name] and [Your name] as amber highlighted chips. Buttons: Edit (secondary), Approve (primary), Discard (text). Blocked Approve: aria-disabled, muted fill, with a helper line and info icon directly under it giving the reason. Approved and discarded states get their own calm confirmation panels.
- Audit trail: a disclosure with a clean list (event, status, time) and the chain-verified status as a small chip.
- Motion: results fade and rise 8px over 200ms on first render only. Hover transitions 120ms. Nothing else animates.

## Also fix (open items from Step 4)

- S4-1: "Check offer" uses native disabled while the text box is empty. Switch to aria-disabled with a focusable button and a visible reason line, same pattern as the approve button. Add tests.
- S4-3: investigate the page reload seen after Tab, Tab, Tab, Enter following an approve. Try to reproduce it at least five times in the production build. Report the result either way. If it reproduces, fix the cause. If it does not, keep S4-3 open with the evidence.
- S4-4: give the sample buttons a labelled group (role="group" with an accessible name). Re-check the accessibility snapshot.

## Process (required)

1. Build it.
2. Run the production build and take screenshots at 1440px, 1280px and 390px for: empty state, scam example with results, clean example with results, injection example, blocked-approve state, approved state, audit trail open. Save them to docs/design-review/ (PNG, optimised, small).
3. Critique your own screenshots against this list and fix what fails, at least three rounds: alignment and spacing consistency, type hierarchy, colour restraint, too many borders or boxes, contrast, anything that looks like a default form or a template, mobile overflow, focus ring visibility, empty-state quality.
4. Keyboard-only pass through the whole flow.
5. Run npm run check, the client-bundle rule-pattern check, and print the redFlag.ts hash.
6. Update docs/build-log/2026-11-07.md and docs/defects.md with anything found or fixed. Commit locally with the two attribution lines. Do NOT push.

## Report

The contrast table, the list of test assertions you changed and why, the paths of the screenshots, a short honest list of what still looks weak, and anything unsure.
