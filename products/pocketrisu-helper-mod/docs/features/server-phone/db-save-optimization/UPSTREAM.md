# Upstream PR dossier — db-save-optimization

Feature-ID: `db-save-optimization`
Area: `server-phone`
PR status: `UPSTREAM_SERIES_SETTLED_WITH_SUPERSEDED_D_E`
Isolation status: `CLEAN`
Dependencies status: `B_C_ACCEPTED_D_E_ARCHITECTURE_SUPERSEDED`
Deployment status: `NOT_READY`
Local PRs: `https://github.com/hanmiyoo10-alt/PocketRisu/pull/4` through `#8`
Official upstream PRs: `https://github.com/PocketRisu/PocketRisu/pull/67`, `#68`, `#69`, `#73`
Tracked upstream heads: A `864b999fd4f4a74d4fb9a8866c7ce5a628265d02`; B `8756113790b84c0a1bc6bd40b1229f21fa7ce137`; C `f60e0618d1776d6918eec9e634b2e90f333e1bf2`; D `263a54fe3c54f0a3c9ef2cfafc1258211f7577fd`

## Final series disposition

- **Stage A / upstream #67 — PARTIAL ADOPTION / CLOSED.** Empty-patch early return was adopted in `develop` via `e3a63daa`. The isolated opaque revision ETag was not accepted because `/api/read` and 409 responses still minted content-MD5 ETags, so mixing a random patch-success token with content hashes could create false conflicts.
- **Stage B / upstream #68 — MERGED.** Compositional DB patch hash cache landed as `7159bf9f`. Maintainer review independently confirmed bit-identical behavior with reference `calculateHash()` across ordering, number/null/undefined edge cases, unicode, escaped pointers, add/remove/move/copy, and reset behavior after full write/restore.
- **Stage C / upstream #69 — MERGED.** Selective top-level cloning landed as `7e0e61af`. Review confirmed atomicity, `path` + `from` cloning, and deep-copy semantics for `copy`. Follow-up `e3a63daa` stored `result.newDocument`, rejected invalid/non-object roots, added endpoint integration coverage, and documented the no-in-place-mutation invariant for shared untouched branches.
- **Stage D / upstream #73 — CLOSED / ARCHITECTURE SUPERSEDED.** Maintainer validation found no correctness defect, but `pluginCustomStorage` moved out of `database.bin` into server-side per-key KV via `f0d4eee3`, eliminating the targeted hot path. This was an architecture-direction decision, not code rejection or CI failure.
- **Stage E / local #8 — SUPERSEDED FALLBACK.** Never promoted upstream because it depended on the same retired in-DB plugin storage path. Keep only as validated historical/fallback design.

Detailed Stage D/E closure reasoning lives in `STAGE-D-HOLD.md`.

## Architecture dependency resolution — upstream issue #66

The Stage A review originally deferred ETag unification to the broader served-view/storage redesign associated with upstream issue #66. That issue was closed on 2026-08-25 after the maintainer reported all four storage/OOM phases in `develop`:

1. server asset manifest store/migration — upstream #72, `d851553c` plus hardening `bf777dbb`;
2. client lazy asset API — upstream #74, `97cdd7a5`;
3. plugin storage split — upstream self-implementation `f0d4eee3`, storing plugin values per key under server KV and reading only needed keys on demand;
4. manifest-aware orphan cleanup — upstream #74.

The closing evidence establishes that the plugin-storage architecture migration actually landed, which permanently supersedes Stage D/E against current upstream. It does **not** state that #67's opaque revision ETag was adopted. Therefore do not revive or resubmit the isolated opaque-token implementation without a fresh upstream-wide ETag model review.

Evidence:
- https://github.com/PocketRisu/PocketRisu/issues/66#issuecomment-5411444292
- https://github.com/PocketRisu/PocketRisu/pull/73#issuecomment-5411392720

## Stage D maintainer reasoning

Final review on #73 explicitly separated correctness from architecture:

- incremental hash matched real `calculateHash()` bit-for-bit across integer-like keys, `__proto__`, move in/out, root operations, storage type transitions, and delete/re-add cases;
- selective clone was safe: `copy` deep-cloned, `move` cloned the source child, and only untouched siblings shared identity;
- reviewed suite passed 19/19;
- closure occurred only after `f0d4eee3` removed `pluginCustomStorage` values from `database.bin` and routed child-key updates directly to per-key server storage.

Historical improvement notes if a similar path ever returns:
1. remove remaining O(total plugin keys) work from shallow storage copy, `new Map(childHashes)`, and per-key key-hash composition;
2. centralize duplicated `collectPluginStorageChildKeys` logic;
3. keep adversarial parity coverage, not only happy-path tests.

The author replied after closure that a new direction had been found and a future PR may follow. Treat any such PR as a **new architecture proposal** unless its actual diff proves otherwise; do not reopen Stage D or revive Stage E automatically.

## Local fork PR disposition

- `hanmiyoo10-alt/PocketRisu#4`: OPEN, non-draft historical Stage A artifact; upstream outcome supersedes it as a merge candidate.
- `#5`: OPEN DRAFT; superseded by merged upstream #68.
- `#6`: OPEN DRAFT; superseded by merged upstream #69.
- `#7`: OPEN DRAFT; validated ancestry/fallback for Stage D, superseded by plugin-storage KV architecture.
- `#8`: OPEN DRAFT; depth-3 fallback design, superseded by the same architecture.

Do not auto-merge or rebase these just because their historical dependencies landed. They are evidence artifacts, not current integration candidates.

## Problem / historical motivation

Large `/api/patch` requests historically paid repeated whole-database costs: recursive hash calculation, whole DB deep clone, patch application, persistence work, and full encoded-content MD5/ETag generation. On the verified local workload, large plugin storage patches were roughly 1.1–1.8s before the deeper optimization experiments.

The accepted upstream B/C work removed repeated whole-database hash and clone costs at the top level while preserving correctness. Historical Stage D/E experiments reduced a representative large plugin-storage patch to roughly 287ms (`clone ~195ms`, patch apply `~29ms`, hash update `~63ms`), but those measurements apply to the retired architecture and are not current upstream performance targets.

## Current upstream invariants to preserve

- DB patch failure must not mutate the live database before commit.
- Untouched branches may share identity between old/new roots only if server code never mutates those branches in place; replace the branch/root instead.
- Preserve `result.newDocument` handling for root operations and non-object-root rejection.
- Do not reintroduce `/api/db/flush` on hide/pagehide in this feature.
- Preserve the intentional `flushServerDbKeepalive()` no-op policy unless a separate evidence-backed feature changes it.
- Do not bundle worker structured-clone, chunk-store, session/write-lock, notification, plugin runtime reload, or unrelated persistence-format work into this feature.
- Never deploy either phone or auto-merge upstream/source PRs from this lifecycle record.

## If a future PR revisits this area

1. Inspect current upstream `/api/patch`, plugin-storage KV APIs, hash helper, selective-clone helper, and persistence path first.
2. Assign a new Feature-ID if the optimization target is the new per-key architecture rather than the retired `pluginCustomStorage` DB branch.
3. Preserve the accepted B/C invariants and endpoint-level integration coverage.
4. Benchmark current code before claiming value; historical Stage D/E numbers are provenance only.
5. Record maintainer requests as follow-up items before implementing them.
6. Do not resurrect the opaque ETag Stage A half unless all ETag minting paths are reviewed together.

## Verification / status snapshot — 2026-08-28

- official #67: CLOSED / NOT MERGED; empty-patch half adopted, opaque ETag half not adopted;
- official #68: MERGED as `7159bf9f`;
- official #69: MERGED as `7e0e61af`;
- official #73: CLOSED / NOT MERGED / architecture superseded;
- local #4-#8: still open in their historical/draft states; no meaningful state change observed in this check;
- no newly opened `hanmiyoo10-alt` PR found in either `PocketRisu/PocketRisu` or `hanmiyoo10-alt/PocketRisu` during this check;
- upstream issue #66 is CLOSED after asset/plugin-storage lazy architecture landed; this confirms D/E supersession but does not revive or resolve the opaque ETag proposal.

Next strategy: wait for an actually new PR/diff against the post-`f0d4eee3` architecture. Do not spend implementation effort on Stage D/E or the isolated random ETag design unless upstream code changes recreate a valid target.
