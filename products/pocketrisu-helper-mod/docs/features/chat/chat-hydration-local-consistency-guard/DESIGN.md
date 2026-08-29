# Feature-ID: CHAT-HYDRATION-LOCAL-CONSISTENCY-GUARD

Status: DESIGN_NEEDED

## Problem / evidence

`TripleHwang/RisuVault@a494f246e88b7617e43c58bd9bf047f3c101e6d7` documents a failure mode where chat hydration combines reads from separate transactions and rejects the result whenever a global database revision changes. Unrelated autosaves, plugin writes, other-chat saves, or audit commits can therefore abort a hydration even when the selected chat is unchanged. The same broad invalidation can interfere with conflict-rebase reads.

PocketRisu has not yet been shown to have an equivalent owner, so evidence is external and implementation remains blocked.

## Minimal safe scope

Only if a matching PocketRisu split-read hydration/rebase path is found:

1. Add a failing overlap test showing an unrelated write invalidates the current implementation.
2. Identify the minimal same-chat coherence state shared by the split reads.
3. Replace only the over-broad read-assembly rejection condition with a scoped guard.
4. Preserve all write-side revision/ETag conflict protection unchanged.

No storage migration, schema change, recovery rewrite, or broad chat-state refactor belongs in the first PR.

## Ownership boundaries

- Browser/client chat hydration owner: may decide whether split reads can be assembled.
- Persistence layer: supplies a stable per-chat coherence token/count/revision if one already exists or can be derived read-only.
- Write conflict/ETag logic: out of scope and must remain authoritative for mutations.
- Plugin/autosave/other-chat writes: must not become false invalidators unless they mutate the selected chat's required coherence state.

## Proposed mechanism

Prefer a narrowly scoped immutable/read-only coherence token representing the selected chat state shared by the two reads. A message count is acceptable only if PocketRisu's data model proves that count fully captures the cross-read invariant. Otherwise use a per-chat revision or equivalent token.

On detected same-chat skew, retry/reload within a hard bound. On unrelated global revision movement, accept the internally coherent selected-chat data. Any exhausted-retry fallback must publish only data returned from one internally consistent transaction/snapshot; never synthesize a mixed cross-snapshot state by guess.

## Compatibility / invariants

- Unrelated writes must not abort selected-chat hydration.
- Same-chat mutation between split reads must still be detected.
- Write-side optimistic concurrency remains unchanged.
- Existing save/integrity optimizations remain unchanged.
- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains a no-op.
- Targeted V3 plugin reload remains unchanged.
- No PM2 or Android server-phone notification changes.

## Validation / acceptance

Required before READY_TO_PORT:

- Reproduce the PocketRisu failure with an unrelated write inserted between the two reads.
- Verify the scoped guard allows that case.
- Insert a same-chat mutation between reads and verify retry/reload still occurs.
- Stress repeated chat switching while autosave/plugin writes occur and verify no empty/greeting-only false failure.
- If conflict rebase uses the same owner, verify no valid rebase result is discarded solely because unrelated DB state changed.
- Verify retry count is bounded and fallback never combines inconsistent snapshots.

## Risk / blast radius

Risk is MEDIUM. A guard that is too broad recreates availability failures; a guard that is too narrow can admit stale same-chat assembly. The first slice must therefore be test-first and limited to read consistency, not mutation authority.

## Rollback / fallback

Single-feature branch/PR. Revert the scoped guard and its tests if parity cannot be established. Keep the existing broader guard rather than guessing at a weaker invariant.

## Dependencies

- Matching PocketRisu split-read chat hydration/rebase owner.
- Explicit inventory of mutable state shared across those reads.
- Reproducible overlap test.
- A safe per-chat coherence token/count/revision.

## PR decomposition

1. Test-only reproduction and owner inventory.
2. Minimal scoped read-consistency guard.
3. Optional follow-up observability/diagnostics only if needed.

Do not combine with render-window changes, save refactors, storage migrations, or unrelated cleanup.
