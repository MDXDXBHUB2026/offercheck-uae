# Step 5: premium UI (dark navy aurora theme)

Goal: a premium, restrained, product-grade UI in a dark Apple Pro style: near-black navy, slate greys, one flat blue for actions, a faint aurora glow, glass cards and quiet motion. This replaces the teal light theme of Step 4 (commit 7334612) and the first Step 5 pass. The theme lives in `src/app/globals.css`; the app does not use Tailwind, so the values below are the Tailwind slate/blue palette written as CSS custom properties.

Reference files (markup and CSS only, not runnable, they use a template syntax): docs/reference/Main.dc.html (desktop) and docs/reference/Mobile.dc.html (mobile). Use them for layout ideas only. Do NOT copy their colours, invented timings, counts or sample numbers.

## Hard rules

- Presentation only. Do NOT touch src/lib (rules, scoring, drafter, gate, audit), API routes, React state, hooks or event handlers. redFlag.ts sha256 must stay 789dc2b29a30940951257c677bddcb4eaf995bb8a187a19e3583ca51d1ebb76f. Tests may change only where they assert markup or tokens you changed; list each such change in your report.
- No new runtime dependencies. CSS only (globals.css), inline SVG for icons, the system font stack (no font files downloaded).
- Show only values the app really computes. No invented timings, counts or sample metrics.
- Show only controls that work. No profile, search or account icon while those features do not exist.
- Keep: the prototype notice, "Risk indicators, not a verdict", honest "Not implemented yet" states for Verification and Official channel, the approval gate with its blocked-approve reason, the audit trail panel, the limitations panel.
- Accessibility: WCAG AA contrast for every text pair (computed in `src/app/routes.test.ts` from the tokens), 3:1 for control edges, 3px visible focus ring with offset, 44px minimum targets, logical tab order, no meaning by colour alone, prefers-reduced-motion respected.

## Design tokens

One dark theme (`color-scheme: dark`); there is no light variant.

| Token | Value | Use |
|---|---|---|
| `--bg` | #030712 | Page background |
| `--surface` | #080d1c | What a glass card looks like over the page (slate-900 at 40% over `--bg`); used for contrast checks and the text box |
| `--card-bg` | rgba(15, 23, 42, 0.4) | Card fill, with a 12px backdrop blur |
| `--fill` | #0f172a | Quiet fills: callouts, quote blocks, chips, hover states, blocked buttons |
| `--border` | rgba(30, 41, 59, 0.6) | Card borders (decorative) |
| `--header-border` | #0f172a | Header and footer rules |
| `--control-border` | #64748b | Text box and secondary-button edges (needs 3:1) |
| `--heading` | #f8fafc | Headings, wordmark, score |
| `--ink` | #e2e8f0 | Main text |
| `--muted` | #94a3b8 | Secondary text, nav links, notes |
| `--primary` | #60a5fa | Links and other blue text |
| `--primary-tint` | #0c1a3a | Blue-tinted background |
| `--action` / `--action-hover` | #2563eb / #1d4ed8 | Filled buttons, button links, skip link. Hover darkens: white on blue-500 (#3b82f6) is 3.68:1, below AA |
| `--on-primary` | #ffffff | Text on filled buttons |
| `--high` on `--high-bg` | #f87171 on #2a0d12 | High severity |
| `--medium` on `--medium-bg` | #fbbf24 on #2a1a05 | Medium severity, draft placeholders |
| `--success` on `--success-bg` | #34d399 on #062419 | Low band, success states |
| `--not-built` on `--not-built-bg` | #94a3b8 on #0f172a | Not-built states |
| `--header-bg` | rgba(2, 6, 23, 0.7) | Frosted header, 24px backdrop blur; solid `--bg` where blur is unsupported |
| `--aurora` | cyan-500, indigo-500, blue-600, each at 10% | Glow behind the page heading |

- Blue is for actions and links only. Icons, quote marks, the logo mark and completed timeline nodes are monochrome.
- Radii: cards 16px, controls (text box, callouts) 12px, buttons and chips fully round (pill).
- No drop shadows. `--shadow-card` is transparent; cards are outlined by the thin border.
- Type: system font stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`), San Francisco on Apple devices. Headings semibold with letter-spacing -0.025em. Scale: page heading 36/40 (60/60 from 768px), section 28/34, card title 20/28, body 17/25, intro 19/28, secondary 14/20 to 14/22, nav links 12/16, labels and chips 12/16. Buttons 14px medium; textarea 16px. Tabular numerals for scores, counters and times.

## Contrast (WCAG 2.x relative luminance)

| Text | Background | Ratio |
|---|---|---|
| heading #F8FAFC | bg #030712 | 19.24 |
| ink #E2E8F0 | bg #030712 | 16.33 |
| ink #E2E8F0 | surface #080D1C | 15.71 |
| ink #E2E8F0 | fill #0F172A | 14.48 |
| muted #94A3B8 | bg #030712 | 7.85 |
| muted #94A3B8 | surface #080D1C | 7.55 |
| muted #94A3B8 | fill #0F172A | 6.96 |
| primary #60A5FA | bg #030712 | 7.92 |
| primary #60A5FA | surface #080D1C | 7.62 |
| primary #60A5FA | fill #0F172A | 7.02 |
| primary #60A5FA | primary-tint #0C1A3A | 6.75 |
| ink #E2E8F0 | primary-tint #0C1A3A | 13.91 |
| white #FFFFFF | action #2563EB | 5.17 |
| white #FFFFFF | action-hover #1D4ED8 | 6.70 |
| high #F87171 | high-bg #2A0D12 | 6.52 |
| high #F87171 | surface #080D1C | 7.00 |
| medium #FBBF24 | medium-bg #2A1A05 | 10.08 |
| success #34D399 | success-bg #062419 | 8.57 |

Non-text (needs 3:1): control border #64748B on surface 4.07. Text over glass cards is checked against `--surface`; the aurora behind it is 10% opacity and does not change the result measurably.

## Layout

- Content up to 1280px wide, centred, 24px side padding. Main area 48px top and bottom, 96px from 768px.
- Header: sticky, frosted, 52px tall. Wordmark with the inline-SVG mark on the left; small grey nav links centred (current page in heading colour, semibold, with a 2px bar, not colour alone). The right column stays empty to keep the links centred. Below 768px the links fold behind a Menu button on the right (`aria-expanded`, `aria-controls`, Escape closes and refocuses); without JavaScript all links show.
- Under the header: a slim prototype-notice strip on `--fill`, centred, muted text and info icon, not a red alert.
- Page heading area (`.hero`, `.placeholder`) carries the aurora: an absolutely positioned, 120px-blurred gradient behind the heading, `pointer-events: none`. `overflow-x: clip` on html and body stops it causing sideways scroll.
- Input card: label, 16px textarea (min-height 220px, resize vertical, focus state), live counter "n / 20,000" (from MAX_OFFER_CHARS), primary "Check offer" pill (full width on mobile). All three sample buttons (scam, clean, "Injection attempt") as pills with a "Synthetic" tag, in a labelled group. Real busy state while the request runs (spinner and aria-busy), no fake progress.
- Results, desktop (from 1024px): two columns. Left, sticky below the header: score card with the arc gauge, the score, the band chip, the points sum, the band thresholds and "Risk indicators, not a verdict". Right: findings, agent run, draft, audit trail. Mobile: one column in that order.
- Gauge: colour by band, plus the band text and the number (never colour alone).
- Findings: glass card with a 4px left severity bar, a chip such as "HIGH RULE, +40 POINTS", the rule name (20/28), a one-line explanation and the evidence in a quote block (`--fill` background, grey left border, quote glyph).
- Agent run: vertical timeline. Completed = filled node in heading colour with a check icon. Not implemented yet = dashed grey outline node, muted text and a "Not implemented yet" pill; it must never look done. Only real measured durations.
- Draft reply: card with [Recipient name] and [Your name] as amber dashed chips. Buttons: Edit (secondary), Approve (primary), Discard (text). Blocked Approve: aria-disabled, muted fill and dashed edge, with the reason line under the actions.
- Audit trail: a disclosure card with the chain status as a chip.
- Footer: on `--bg` with a thin top rule, "Risk indicators, not a verdict." and the prototype notice. It sits at the bottom on short pages.

## Motion

- All interactive states transition over 300ms with an ease-out curve (cubic-bezier(0.16, 1, 0.3, 1)).
- Only without a reduced-motion preference (`@media (prefers-reduced-motion: no-preference)`):
  - The heading area, input card, limitations panel and results fade in and rise 16px over 700ms, staggered by 80ms.
  - Findings, warning mentions, the draft and the audit trail fade up as they scroll into view, where `animation-timeline: view()` is supported.
  - Pressable buttons and button links scale to 1.02 on hover and 0.98 when pressed; blocked buttons do not move. A closed disclosure scales to 1.01 on hover.
- The gauge arc animates 600ms to the score. With reduced motion every duration is 0s.

## Open items from Step 4

- S4-1: fixed in Phase 1. "Check offer" uses aria-disabled with a visible reason line.
- S4-3: page reload after Tab, Tab, Tab, Enter following an approve. Still open; try to reproduce it at least five times in the production build and report the result either way.
- S4-4: fixed in Phase 1. The sample buttons are a labelled group.

## Process (required)

1. Build it.
2. Run the production build and take screenshots at 1440px, 1280px and 390px for: empty state, scam example with results, clean example with results, injection example, blocked-approve state, approved state, audit trail open. Save them to docs/design-review/ (PNG, optimised, small).
3. Critique your own screenshots against this list and fix what fails, at least three rounds: alignment and spacing consistency, type hierarchy, colour restraint, too many borders or boxes, contrast, anything that looks like a default form or a template, mobile overflow, focus ring visibility, empty-state quality.
4. Keyboard-only pass through the whole flow.
5. Run npm run check, the client-bundle rule-pattern check, and print the redFlag.ts hash.
6. Update docs/build-log/2026-11-07.md and docs/defects.md with anything found or fixed. Commit locally with the two attribution lines. Do NOT push.

## Report

The contrast table, the list of test assertions you changed and why, the paths of the screenshots, a short honest list of what still looks weak, and anything unsure.
