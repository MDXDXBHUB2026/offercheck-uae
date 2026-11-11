# Locked files

Created 2026-11-11 (owner request, Phase 4 brief). Before this, the lock was spread over three places: `src/lib/agents/eval/holdout2.test.ts` enforced the `redFlag.ts` hash; `scoring.ts` was recorded only in prose (`docs/build-log/2026-11-10.md`, "Locked files", and `docs/test-report.md`); the other four files were not recorded anywhere.

A locked file changes only with the owner's approval. `src/app/lockedFiles.test.ts` reads the table below and fails `npm run check` when a listed file's hash differs, so an approved change must update its row in the same commit.

**Hash method:** the recorded value is the sha256 of the **committed blob**, which git stores with LF line endings: `git show <commit>:<path> | sha256sum`. Never hash the working copy as it is on disk: on Windows (`core.autocrlf=true`) git checks some files out with CRLF, and their raw hash then differs although the content does not. `src/app/lockedFiles.test.ts` reads the working copy and turns CRLF into LF before hashing, which gives the same value as the committed blob (the method `holdout2.test.ts` already uses); the same test checks with `git ls-files --eol` that git stores each locked file with LF only, so the two can never disagree. To report a hash, use the committed blob at a named commit.

Earlier notes (`docs/test-report.md`, `docs/batch-b-design.md`, the build logs of 2026-11-09 and 2026-11-10) gave `scoring.ts` as `0a6fb4880fbf3384`. That is the same content hashed from the Windows working copy with CRLF line endings, not a different file. Checked 2026-11-11 against the committed blobs: `scoring.ts` is `390e4f3feb7d5ebc…` and `redFlag.ts` is `c4abfc00e371ccfd…` at `faa1e8d`, `2677760` and `5096b97`; no commit touched either file in that range (`scoring.ts` last changed in `97e811a`, `redFlag.ts` in `e244723`). `redFlag.ts` never showed a second value because its working copy is checked out with LF.

| File | sha256 (LF) | Last commit | Why it is locked |
|---|---|---|---|
| `src/lib/agents/redFlag.ts` | `c4abfc00e371ccfd7f6df7fc8e59466301bb02613e9fa7f9f3398d419061fa3c` | `e244723` | The rules. Holdout results are tied to this hash. |
| `src/lib/scoring.ts` | `390e4f3feb7d5ebccd3c68d12df9d67b6eed5ed617f09075fb9c0ddee964a217` | `97e811a` | The score and bands must stay deterministic. |
| `src/lib/vaultCrypto.ts` | `45562e0ae8f1f969da38193530b4b7289f1fe304d6386b09a4dc5e9025f6343d` | `6764d0b` | Vault encryption (PBKDF2-SHA-256 and AES-256-GCM). Phase 5, owner-approved: new saves store version 2 with 600,000 iterations; stored counts accepted from 100,000 to 2,000,000 (defect VAULT-KDF-1). Previous hash `35b20988…` at `317192d`. |
| `src/lib/approvalGate.ts` | `df64becc300e935a23a58c7a6ef4b4ace08c1b368f7e02110df05dd21368289e` | `39e327d` | Nothing is copied or sent without the person's approval. |
| `src/lib/audit.ts` | `05743ca5e72e0d47acc0467e4aa8328b256816fa27a1708dc6d901bd756e5f52` | `5096b97` | The audit trail holds no offer text. Owner-approved change, 2026-11-11, with conditions: one branch only, for the Verification and Official channel steps; fixed vocabulary (check ids and a count); no offer text or quoted words in any entry; entries for the existing steps byte-identical (`src/lib/auditCrossChecks.test.ts`). Previous hash `1ad096da…` at `25e7fb6`. |
| `src/lib/translateServer.ts` | `1b517eda166b620564a089a48c69e89f348ee5e9a7a935cbebc1f15718446f3b` | `25e7fb6` | The only code that sends text to Google, and only with consent. |
