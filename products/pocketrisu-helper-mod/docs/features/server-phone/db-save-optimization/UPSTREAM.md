# Upstream PR dossier — db-save-optimization

Feature-ID: `db-save-optimization`
Area: `server-phone`
PR status: `UPSTREAM_PARTIAL_ACCEPTED_D_READY`
Isolation status: `CLEAN`
Dependencies status: `D_BASE_RESOLVED_E_WAITS_ON_D`
Deployment status: `NOT_READY`
Local PR: `https://github.com/hanmiyoo10-alt/PocketRisu/pull/4`
Official upstream PRs: `https://github.com/PocketRisu/PocketRisu/pull/67`, `https://github.com/PocketRisu/PocketRisu/pull/68`, `https://github.com/PocketRisu/PocketRisu/pull/69`
Current tracked upstream heads: A `864b999fd4f4a74d4fb9a8866c7ce5a628265d02`; B `8756113790b84c0a1bc6bd40b1229f21fa7ce137`; C `f60e0618d1776d6918eec9e634b2e90f333e1bf2`; D upstream-ready `263a54fe3c54f0a3c9ef2cfafc1258211f7577fd`

## Clean staged branches / PRs
- Stage A — empty patch fast path + opaque ETag: official `PocketRisu/PocketRisu#67`; head `864b999fd4f4a74d4fb9a8866c7ce5a628265d02`; CLOSED / NOT MERGED. Maintainer adopted the empty-patch early-return half into `develop` via `e3a63daafdac00c52968c4e668af0ac6f7adcc3b`; isolated opaque revision ETag was not accepted because it can conflict with content-MD5 ETags minted by `/api/read` and 409 responses. Future ETag unification belongs with upstream #66 served-view/revision redesign.
- Stage B — compositional DB patch hash cache: official `PocketRisu/PocketRisu#68`; head `8756113790b84c0a1bc6bd40b1229f21fa7ce137`; MERGED into `develop` as `7159bf9fd2913e06965cd68c27b9f5292dfb75b5`. Original stacked local draft remains `hanmiyoo10-alt/PocketRisu#5` at `04992dcdc47b144d14fbc8df6c6c1c2c7cadec7c` and must not be auto-merged.
- Stage C — top-level selective clone: official `PocketRisu/PocketRisu#69`; head `f60e0618d1776d6918eec9e634b2e90f333e1bf2`; MERGED into `develop` as `7e0e61af73e67f3d443352509d8c989ccd8f4773`. Original stacked local draft remains `hanmiyoo10-alt/PocketRisu#6` at `0d0c8104246a662d9601cffcddb832fd52f7d6f1` and must not be auto-merged.
- Upstream follow-up after B/C: `e3a63daafdac00c52968c4e668af0ac6f7adcc3b` stores `result.newDocument`, rejects invalid/non-object roots, documents the no-in-place-mutation invariant for shared untouched branches, adds endpoint integration coverage, and includes the accepted empty-patch early return from Stage A.
- Stage D — pluginCustomStorage direct-child hash/clone: original stacked local draft `#7` remains at `c3ec3b5e63f7f0bcdb6888d8475f836cc9f31ca3`. A separate upstream-ready branch `feat/db-save-optimization-plugin-storage-child-upstream` at `263a54fe3c54f0a3c9ef2cfafc1258211f7577fd` was rebuilt on current `develop`; comparison is exactly ahead 1 / behind 0 and changes only 3 files. Cross-repository PR creation is currently blocked by connector HTTP 403 `Resource not accessible by integration`.
- Stage E — pluginCustomStorage depth-3 lazy subchild hash/clone: local draft `#8`; clean stacked head `1a937bc680658df732aab75632f0e030c2005f53`; 1 commit / 3 files. Do not promote until Stage D is officially reviewed/accepted/rebased.

The original stacked draft dependency rule remains B after A, C after B, D after C, E after D, but official B/C were independently rebased and merged into `develop`. Stage D's dependency on accepted Stage C is now resolved and a clean current-upstream branch exists. Stage E still waits on the final accepted/rebased Stage-D shape. Never merge the old stacked local drafts merely because their historical dependencies landed upstream; they are draft validation artifacts with obsolete ancestry.

## Problem / motivation
Large `/api/patch` requests paid repeated whole-database costs: recursive hash calculation, whole DB deep clone, patch application, persistence work, and full encoded-content MD5/ETag generation. On large saves/pluginCustomStorage this produced roughly 1.1–1.8s patch latency in the verified local workload.

## Legacy evidence
The optimized implementation is verified in the live/local PocketRisu server working tree and backups, but it was developed incrementally together with other server modifications and is not represented by one clean Git commit. Do not attempt Git-history surgery. Rebuild the independently verified optimization stages on the then-current upstream server implementation.

Primary legacy touch area:
- `server/node/server.cjs`

Verified local rollback anchors are documented in this feature README; backup files themselves must never be committed.

## Baseline cost model to re-check on current upstream
Historical original `/api/patch` path:
1. recursive whole stripped-DB hash;
2. whole DB JSON stringify/parse deep clone;
3. JSON patch apply;
4. cache/mutation/save bookkeeping;
5. full server encode + MD5 content ETag.

Current upstream has changed this pipeline through merged Stages B/C and follow-up `e3a63daa`. Before every later stage, inspect current `/api/patch` and helper behavior first and only port optimizations that still match the accepted architecture.

## Minimal upstream scope
Rebuild the optimization as a sequence of independent, correctness-first PRs against the current upstream `/api/patch` implementation. Each PR removes one measurable whole-DB cost while preserving atomicity, fallback behavior and persistent DB integrity; do not bundle unrelated worker/chunk-store/session/notification work.

## Upstream PR split plan
This feature is intentionally **not** one giant PR. Prepare small prerequisite-sized PRs in this order when still applicable.

### PR A — Opaque revision ETag
Goal:
- stop computing an expensive full encoded-content MD5 solely to produce an HTTP ETag when clients treat ETag as an opaque revision token;
- generate a new opaque revision only after a real accepted mutation.

Current upstream disposition:
- empty-patch early return accepted independently in `e3a63daa`;
- opaque ETag portion superseded for now because patch success, `/api/read`, and 409 responses do not yet share one revision model;
- do not re-submit the isolated random-token implementation. Revisit only with the broader #66 served-view/revision redesign.

### PR B — Zero-op + top-level compositional hash cache
Goal:
- detect no-op patches cheaply;
- replace repeated whole recursive hash with cached top-level contributions where safe.

Acceptance:
- computed cached hash/equality decision matches full reference calculation across synthetic mutations;
- cache invalidation covers all touched top-level branches.

Upstream result:
- MERGED as #68 / `7159bf9fd2913e06965cd68c27b9f5292dfb75b5`.
- Maintainer independent review confirmed bit-identical behavior to reference `calculateHash()` across ordering, null/undefined, number edge cases, unicode, escaped pointers, and add/remove/move/copy; WeakMap state reset behavior on full write/restore was also accepted.

### PR C — Top-level selective clone
Goal:
- avoid whole DB JSON deep clone;
- clone only touched top-level branches while preserving atomicity/rollback semantics.

Acceptance:
- patch failure cannot mutate the original live DB;
- untouched branch identity may be shared only when it cannot be mutated by the patch path.

Upstream result:
- MERGED as #69 / `7e0e61af73e67f3d443352509d8c989ccd8f4773`.
- Maintainer review confirmed atomicity, `path` + `from` branch cloning, and deep-copy behavior for `copy`; follow-up `e3a63daa` added explicit anti-alias coverage and documented the resulting server invariant that shared untouched branches must never be mutated in place.

### PR D — pluginCustomStorage direct-child incremental hash + selective clone
Goal:
- for large `pluginCustomStorage`, track and clone/hash only touched direct children.

Acceptance:
- direct-child root operations fall back safely;
- arrays/non-object/ambiguous shapes use conservative fallback.

Current preparation:
- clean upstream-ready head `263a54fe3c54f0a3c9ef2cfafc1258211f7577fd` on current `develop` (`ahead 1 / behind 0`, 3 files only).
- official PR creation is blocked only by connector cross-repository permission (HTTP 403); do not treat this as a code failure and do not substitute old stacked draft #7.

### PR E — pluginCustomStorage depth-3 lazy subchild optimization
Goal:
- for a huge plain-object direct child, lazily cache subchild contributions and clone only touched subchildren.

Acceptance:
- both JSON Patch `path` and `from` are tracked for copy/move;
- multiple touched subchildren work;
- child-root operations fall back;
- original object remains unchanged until commit.

Current state:
- staged only; wait for Stage D official review/acceptance/rebase before preparing a current-upstream branch.

Each PR must be independently benchmarked and correctness-tested. If current upstream makes any stage obsolete, skip it rather than recreating old architecture.

## Explicitly out of scope
Do not bundle:
- worker structured-clone optimization;
- chunk-store CDC/hash/SQLite commit optimization;
- session/write-lock logic;
- response notification;
- plugin runtime reload behavior;
- forced DB flush on visibility/pagehide;
- unrelated persistence format migration.

Known remaining bottlenecks (worker structured clone before worker launch; synchronous chunk-store CDC/hash/SQLite commit after worker result) are separate future Feature-IDs if pursued.

## Critical guardrails
- Preserve DB atomicity and rollback behavior before performance.
- Preserve upstream's new shared-branch invariant: untouched branches shared between old/new roots must never be mutated in place; replace the branch or whole root instead.
- Never reintroduce `/api/db/flush` on hide/pagehide as part of this work.
- Preserve the intentional `flushServerDbKeepalive()` no-op policy unless a separate feature with evidence replaces it.
- Do not require `sqlite3` CLI; local validation uses Node + `better-sqlite3` when DB inspection is needed.
- runit stays; do not introduce PM2.
- server phone must not create Android notifications.
- Preserve existing V3 targeted reload behavior unless a separate feature explicitly and safely replaces it.

## Dependencies
- Current upstream `/api/patch` implementation: resolved through merged #68/#69 plus follow-up `e3a63daa` for Stage-D preparation.
- Stage A opaque ETag: not a prerequisite for D; empty-patch half landed, opaque-token half is superseded pending #66 revision redesign.
- Stage D dependency on accepted/rebased Stage C: RESOLVED; clean D branch rebuilt on current `develop`.
- Stage E dependency on final accepted/rebased Stage D: UNRESOLVED.
- No official upstream PR should be auto-merged by this automation.

## Verification evidence
### Correctness from the verified legacy implementation
Synthetic hash tests:
- all reference/cache comparisons reported `MATCH=YES`.

Atomicity/selective-clone tests:
- `DEEP_REPLACE`: apply success + original unchanged;
- `MULTI_SUBCHILD`: success + original unchanged;
- `CHILD_ROOT_FALLBACK`: success + original unchanged;
- `COPY_MOVE`: success + original unchanged.

Operational verification:
- no Hash mismatch warnings;
- no relevant warning/error after clean use;
- BackgroundPersist commits succeeded;
- restart preserved plugin/character state;
- `node --check` passed after cleanup;
- temporary PatchTiming/PatchShape instrumentation and dead ETag/hash helpers were removed after measurement.

### Upstream verification now incorporated
- #68 maintainer review independently verified compositional hash equivalence and cache reset behavior.
- #69 maintainer review independently verified selective-clone atomicity and copy semantics.
- `e3a63daa` adds endpoint-level `/api/patch` integration tests across nested, root, empty, and failing patches, stores `result.newDocument`, rejects invalid database roots, and documents the no-in-place-mutation invariant.
- Maintainer plans to ship the merged B/C work after dogfooding on their own instance; this is upstream release timing, not permission for this automation to deploy to server-phone.

### Historical performance
Large pluginCustomStorage patch before optimization:
- roughly 1.1–1.8s.

After depth-3 hash + clone optimization, representative repeated measurement:
- ops: ~828;
- clone: ~195ms;
- patch apply: ~29ms;
- hash update: ~63ms;
- total: ~287ms.

Small plugin patch:
- roughly 39–71ms.

These numbers are evidence of value, **not** hard upstream acceptance thresholds; rerun benchmarks on current upstream/hardware.

## Rebuild test plan
For every staged PR:
1. Run reference-vs-optimized hash/equality tests on add/replace/remove/copy/move.
2. Verify original DB remains unchanged on failed patch and before commit.
3. Test direct-root and ambiguous-shape fallbacks.
4. Test multiple touched branches/subchildren in one patch.
5. Test zero-op patch behavior.
6. Restart server and verify persistent data survives.
7. Run representative small and large patch benchmarks before/after.
8. Inspect logs for hash mismatch, persistence warnings and unexpected errors.
9. Remove temporary instrumentation before final PR.
10. Preserve the upstream `result.newDocument` root handling and shared-branch no-in-place-mutation invariant added after #68/#69.

## PR construction recipe
1. Start each remaining official stage from latest accepted upstream `develop`, not from old stacked local drafts.
2. INSPECT_ONLY current `/api/patch`, hash helper, selective clone helper and persistence pipeline first.
3. Add temporary measurement only when needed; never ship debug instrumentation accidentally.
4. Implement one optimization stage only.
5. Run correctness + persistence tests before comparing performance.
6. Submit/land that stage before constructing the next dependent stage.
7. Rebase/re-inspect after every upstream stage because later code boundaries may shift.

## Upstream pitch
Large self-host databases should not pay whole-database hash/clone/ETag costs for small JSON patches. The accepted B/C work already removes whole-database hash/clone costs at the top level; Stage D is the next isolated optimization for large `pluginCustomStorage`, while deeper Stage E remains deliberately separate.

## Review / PR state
- dossier reconstruction: COMPLETE
- legacy Git-history surgery: NOT REQUIRED
- upstream strategy: STAGED_PR_SERIES
- boundary validation: all currently open source-repo `feat/` PRs #4-#8 contain exactly one `Feature-ID: db-save-optimization` line and their branch names match the Feature-ID. Exactly one matching dossier folder exists at `docs/features/server-phone/db-save-optimization/`, with required `README.md`, `UPSTREAM.md`, and `FAILURES.md` present.
- local PR #4: OPEN / MERGEABLE / NOT_DRAFT; historical branch is obsolete relative to upstream outcome and has no relevant CI/check runs, so it is not GREEN and must not be auto-merged.
- local PRs #5-#8: OPEN / MERGEABLE / DRAFT; draft state blocks auto-merge. Absence of relevant checks also prevents GREEN; never treat no checks as success.
- official upstream PR #67: CLOSED / NOT_MERGED. Empty-patch half adopted in `e3a63daa`; opaque ETag half superseded pending #66 revision-model work.
- official upstream PR #68: MERGED `7159bf9fd2913e06965cd68c27b9f5292dfb75b5`.
- official upstream PR #69: MERGED `7e0e61af73e67f3d443352509d8c989ccd8f4773`.
- official feedback: positive independent verification on #68/#69; #69 maintainer explicitly thanked the careful split across the three PRs. Both merged stages are planned for upstream dogfooding before release.
- Stage D upstream-ready branch: `feat/db-save-optimization-plugin-storage-child-upstream` / `263a54fe3c54f0a3c9ef2cfafc1258211f7577fd`; current comparison to `develop` is ahead 1 / behind 0, 3 files only. Official PR creation remains blocked by connector 403 and requires a GitHub path with cross-repository PR permission.
- Stage E: keep staged; do not promote until D receives official review/acceptance/rebase.
- deployment gate: `docs/features/server-phone/safe-updater/UPSTREAM.md` currently has `AUTO_DEPLOY_GATE: DISABLED` and `AUTO_DEPLOY_VERIFIED: NO`; therefore no server-phone deployment, SSH, restart, direct git pull, or device action is permitted. Even after a future gate enablement, deployment must use the verified pull-based safe-updater rather than GitHub Actions push-SSH.
- next action: submit the clean Stage-D branch through an authorized GitHub identity/integration; then monitor its upstream CI/review state. Do not auto-merge any official upstream PR and do not prepare Stage E against current upstream until D's accepted shape is known.
