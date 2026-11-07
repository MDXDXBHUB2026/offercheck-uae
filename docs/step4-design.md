# Step 4: styling pass (do NOT start until the owner says so)

Mobile-first. No new dependencies other than next/font. Do not change scoring logic in this step.

## Fonts
- Inter for body text, Space Grotesk for headings (via next/font).

## Colours
- Background #F6F4EF, ink #14211F, muted text #5B6764
- Card #FFFFFF with border #E2DED4
- Accent teal #0F5C55
- High risk #B3261E on #FBE9E7
- Medium risk #8A4B00 on #FFF1DC
- Success #1E6B3A on #E5F2E9

## Components
- Score: semicircle gauge plus the arithmetic line, for example "40 + 20 + 20 + 20 = 100, capped".
- Evidence cards: quoted offer text with the matched phrase highlighted, a severity badge with its points, and the rule ID.
- Info findings (RF-00x-W): visibly different from risk findings, labelled "Mentioned in a warning, not counted in the score".
- Agent run list: status icon, agent name, one-line summary, measured time; "Not run" or "Not implemented yet" where true.
- Sample buttons: fee scam, clean offer, injection attempt (synthetic fixtures only).
- A "What this check cannot do" panel that reads from docs/known-limitations.md content.

## Accessibility
- The risk band uses colour plus a text label, never colour alone.
- Touch targets at least 44px, visible focus states, real buttons and labels, text contrast at least 4.5:1.
- Everything usable by keyboard.

## Wording
- "Risk indicators", never a verdict about a named company.
- Every number on screen is measured or computed. No invented statistics or timings.
