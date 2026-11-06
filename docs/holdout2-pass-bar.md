# Holdout 2 pass bar (locked 2026-11-06, before the run)

Set by the owner. Do not change after results are seen.

## Cases counted
- Scam cases (7): H19, H20, H21, H22, H29, H31, H33. A scam is "flagged" when its band is medium or high.
- Legitimate cases (8): H23, H24, H25, H26, H27, H28, H32, H34. A legitimate case is "flagged" when its band is medium or high, or when it scores any points.
- H30 (Cyrillic homoglyph) is a stress case. Report it separately. It is not counted in either number.

## Bar
- PASS requires ALL of:
  1. At least 5 of the 7 scam cases flagged.
  2. At most 1 of the 8 legitimate cases flagged.
  3. No legitimate case flagged high.
- Anything else is FAIL.

## If FAIL
- No further rule tuning before the demo. Misses go to docs/rules-backlog.md and the limitations panel.
- The demo story changes to "risk indicators plus human approval", with no accuracy claim.

## Reporting
- Report the per-case table (expected vs got) and the raw counts only.
- Do not write a verdict such as "mostly passes". The owner applies the bar.
