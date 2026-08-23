# Upstream PR dossier — db-save-optimization

Feature-ID: `db-save-optimization`
Area: `server-phone`
PR status: `UPSTREAM_OPEN`
Isolation status: `CLEAN`
Dependencies status: `STAGED_WAITING_ON_UPSTREAM`
Deployment status: `NOT_READY`
Local PR: `https://github.com/hanmiyoo10-alt/PocketRisu/pull/4`
Official upstream PR: `https://github.com/PocketRisu/PocketRisu/pull/67`
Current head: `864b999fd4f4a74d4fb9a8866c7ce5a628265d02`

## Clean staged branches / PRs
- Stage A — empty patch fast path + opaque ETag: official `PocketRisu/PocketRisu#67`; clean head `864b999fd4f4a74d4fb9a8866c7ce5a628265d02`; 1 commit / 1 file.
- Stage B — compositional DB patch hash cache: local draft `hanmiyoo10-alt/PocketRisu#5`; clean head `04992dcdc47b144d14fbc8df6c6c1c2c7cadec7c`; 1 commit / 3 files.
- Stage C — top-level selective clone: local draft `#6`; clean head `0d0c8104246a662d9601cffcddb832fd52f7d6f1`; 1 commit / 3 files.
- Stage D — pluginCustomStorage direct-child hash/clone: local draft `#7`; clean head `c3ec3b5e63f7f0bcdb6888d8475f836cc9f31ca3`; 1 commit / 3 files.
- Stage E — pluginCustomStorage depth-3 lazy subchild hash/clone: local draft `#8`; clean head `1a937bc680658df732aab75632f0e030c2005f53`; 1 commit / 3 files.

Dependency rule: B waits for A; C waits for B; D waits for C; E waits for D. Draft state is intentional. Never merge a later local stage into an earlier stage branch while the earlier branch backs an official upstream PR.

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

Current upstream may have changed this pipeline. Before rebuilding, instrument/inspect first and only port stages that still exist.

## Minimal upstream scope
Rebuild the optimization as a sequence of independent, correctness-first PRs against the current upstream `/api/patch` implementation. Each PR removes one measurable whole-DB cost while preserving atomicity, fallback behavior and persistent DB integrity; do not bundle unrelated worker/chunk-store/session/notification work.

## Upstream PR split plan
This feature is intentionally **not** one giant PR. Prepare small prerequisite-sized PRs in this order when still applicable.

### PR A — Opaque revision ETag
Goal:
- stop computing an expensive full encoded-content MD5 solely to produce an HTTP ETag when clients treat ETag as an opaque revision token;
- generate a new opaque revision only after a real accepted mutation.

Acceptance:
- conditional/ETag semantics remain correct;
- no content-hash security/integrity contract depends on the old MD5;
- zero-op requests do not create false revisions unless upstream semantics explicitly require it.

### PR B — Zero-op + top-level compositional hash cache
Goal:
- detect no-op patches cheaply;
- replace repeated whole recursive hash with cached top-level contributions where safe.

Acceptance:
- computed cached hash/equality decision matches full reference calculation across synthetic mutations;
- cache invalidation covers all touched top-level branches.

### PR C — Top-level selective clone
Goal:
- avoid whole DB JSON deep clone;
- clone only touched top-level branches while preserving atomicity/rollback semantics.

Acceptance:
- patch failure cannot mutate the original live DB;
- untouched branch identity may be shared only when it cannot be mutated by the patch path.

### PR D — pluginCustomStorage direct-child incremental hash + selective clone
Goal:
- for large `pluginCustomStorage`, track and clone/hash only touched direct children.

Acceptance:
- direct-child root operations fall back safely;
- arrays/non-object/ambiguous shapes use conservative fallback.

### PR E — pluginCustomStorage depth-3 lazy subchild optimization
Goal:
- for a huge plain-object direct child, lazily cache subchild contributions and clone only touched subchildren.

Acceptance:
- both JSON Patch `path` and `from` are tracked for copy/move;
- multiple touched subchildren work;
- child-root operations fall back;
- original object remains unchanged until commit.

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
- Never reintroduce `/api/db/flush` on hide/pagehide as part of this work.
- Preserve the intentional `flushServerDbKeepalive()` no-op policy unless a separate feature with evidence replaces it.
- Do not require `sqlite3` CLI; local validation uses Node + `better-sqlite3` when DB inspection is needed.

## Dependencies
- Current upstream `server/node/server.cjs` or equivalent `/api/patch` implementation: resolved for PR A against base `e57c0435018646800566f2158fd1a9fa12caa9e2`.
- Existing patch/hash/save/ETag semantics as inspected at rebuild time: resolved for the isolated PR A diff.
- Later staged PRs depend only on the earlier still-applicable stages in this feature series and remain out of scope for PR #4.

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

## PR construction recipe
1. Create the first applicable fresh branch from latest official upstream, starting with PR A or the earliest still-needed stage.
2. INSPECT_ONLY current `/api/patch`, ETag and persistence pipeline first.
3. Add temporary measurement only when needed; never ship debug instrumentation accidentally.
4. Implement one optimization stage only.
5. Run correctness + persistence tests before comparing performance.
6. Submit/land that stage before constructing the next dependent stage.
7. Rebase/re-inspect after every upstream stage because later code boundaries may shift.

## Upstream pitch
Large self-host databases should not pay whole-database hash/clone/ETag costs for small JSON patches. The verified local implementation shows substantial latency reduction, and the staged plan keeps each optimization reviewable and independently correctness-tested.

## Review / PR state
- dossier reconstruction: COMPLETE
- legacy Git-history surgery: NOT REQUIRED
- upstream strategy: STAGED_PR_SERIES
- Stage B local draft: `hanmiyoo10-alt/PocketRisu#5` — clean / validated / waiting on Stage A.
- Stage C local draft: `#6` — clean / validated / waiting on Stage B.
- Stage D local draft: `#7` — clean / validated / waiting on Stage C.
- Stage E local draft: `#8` — clean / validated / waiting on Stage D.
- local PR #4: OPEN / MERGEABLE / NOT_DRAFT
- isolation: CLEAN — official Stage A is one commit / one file (`server/node/server.cjs`, +23/-2)
- reviews: none; unresolved review threads: none
- CI/checks: MISSING — no relevant workflow run or status check is currently observed for official PR #67 head `864b999fd4f4a74d4fb9a8866c7ce5a628265d02`; absence of checks is not GREEN
- official upstream PR: OPEN / MERGEABLE / NOT_DRAFT — `PocketRisu/PocketRisu#67`
- next action: monitor official PR #67 review/check state. Keep Stage B (`hanmiyoo10-alt/PocketRisu#5`) and Stage C (`#6`) as dependent drafts until Stage A is accepted/rebased; after any upstream result, re-inspect latest `develop` before promoting the next stage.
