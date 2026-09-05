# SimCore v0.70.7 Source Header Repair Design

Date: 2026-09-05 KST
Status: **FROZEN · FIX AUTHORIZED BY EXISTING v0.70.7 OPERATOR APPROVAL · PREPUBLICATION REPAIR ONLY**

## 1. Context

SimCore v0.70.7 `Output Snapshot Set Cost Attribution` implementation passed permanent CI and produced immutable candidate:

```text
intent = simcore-v0.70.7-intent-01
release = simcore-v0.70.7-new-01
candidate = e1766da6ff6c48a439a43256ef96640e168ba4a6
candidate blob = 65337383e1d554fc398e6d231d30711b296aaf47
expected production = e2552d7f93456652c94d9df37b0c253f12f2d900
```

Exact approval PR `#1532` merged, but Permanent Release run `33966597972` failed before publication during `release-state-preplay.mjs` with:

```text
PUBLISHED_IDENTITY_NOT_OBSERVED: source header
```

Failure evidence is preserved in:

- `docs/SIMCORE_07007_PERMANENT_RELEASE_FAILURE_01_PREPUBLICATION_SOURCE_HEADER_2026-09-05.md`

Production remained v0.70.6 and no live gate was entered.

## 2. Root cause

`release-state-converge.mjs` validates published source identity from two independent source surfaces:

```text
metadata version = //@version <version>
release note header = // v<version> <releaseName>:
```

The immutable v0.70.7 candidate correctly contains:

```text
//@version 0.70.7
```

but its newest release-note header is still:

```text
// v0.70.6 Manual Edit Redundant Prune Elision:
```

The v0.70.7 builder updated metadata, `SIMCORE_RUNTIME_VERSION`, `HOST_COMPAT_VERSION`, and the operator release card, but omitted the release-note insertion step.

This is deterministic. Re-running Permanent Release with the same immutable candidate would fail at the same prepublication source-header check even though the recovery tool correctly reports that such a rerun is semantically safe with respect to control-plane and production movement.

Classification:

```text
FIX / BLOCKER / CANDIDATE RELEASE IDENTITY HEADER / PREPUBLICATION / NON-SEMANTIC RUNTIME IDENTITY / PRODUCTION UNCHANGED
```

## 3. Repair boundary

The repair is intentionally smaller than the v0.70.7 feature implementation and does not redesign any release system.

Authorized code changes:

1. update `products/simcore/tooling/build-07007-output-snapshot-set-cost-attribution.py` so it requires the predecessor v0.70.6 release-note anchor exactly once and inserts a v0.70.7 release-note block immediately before it;
2. update `products/simcore/tests/suites/builder-v07007.test.mjs` so the built artifact must contain exactly one exact current source header:

```text
// v0.70.7 Output Snapshot Set Cost Attribution:
```

3. make the regression reject a candidate whose newest source header remains v0.70.6 or whose current header cardinality is not exactly one;
4. preserve all existing v0.70.7 payload-character, normalized-cost, ordinary-save, module/require, side-effect, and `OUT_STORAGE` assertions.

Authorized release-note content:

```text
// v0.70.7 Output Snapshot Set Cost Attribution:
// - Reuses the already-created ordinary out snapshot JSON string to record exact payload character count without a second stringify
// - Projects existing awaited plugin-storage set duration as exact out set cost and derives a pure ms/1K-character diagnostic ratio
// - Keeps OUT_STORAGE equal to outSetMs and preserves the authoritative conditional-metric out save, await, key semantics and prune:false behavior
// - Adds no storage/network/chat operation, timer, persistent schema, module, require edge or provider-cache claim
//
```

The predecessor v0.70.6 release-note block and all older historical notes remain byte-for-byte present after insertion.

## 4. Frozen non-goals

The repair MUST NOT change:

```text
SnapshotStore runtime semantics
payload serialization semantics
plugin-storage set count/order/await
output state/result semantics
prune / retention policy
persistent schema
module inventory
require graph
provider-cache policy
release-state-preplay.mjs
release-state-converge.mjs
Permanent Release workflow
Exact Approval Activation workflow
R2.9 validation projection
R2.11 profile inventory
```

This is not a release-system restructuring transaction.

## 5. Candidate immutability and recovery rule

Candidate `e1766da6ff6c48a439a43256ef96640e168ba4a6` and release `simcore-v0.70.7-new-01` are immutable failed evidence and MUST NOT be rewritten.

After repair CI and merge, recovery must use a fresh append-only transaction:

```text
intent = simcore-v0.70.7-intent-02
release = simcore-v0.70.7-new-02
expected production = e2552d7f93456652c94d9df37b0c253f12f2d900
```

The fresh candidate must be built from the unchanged v0.70.6 production parent and the repaired v0.70.7 builder.

The failed `new-01` approval/run remains preserved as historical evidence. It is not reused as publication authority for the repaired bytes.

## 6. Static acceptance

The repair implementation is acceptable only if permanent CI proves:

```text
metadata = 0.70.7
SIMCORE_RUNTIME_VERSION = 0.70.7
HOST_COMPAT_VERSION = 0.70.7
operator release card = 0.70.7 / Output Snapshot Set Cost Attribution
source release-note header = exact current v0.70.7 identity
current source-header cardinality = 1
v0.70.6 predecessor note remains present
latest.js == install.js
existing v0.70.7 executable behavior assertions = PASS
module/require/side-effect frozen surfaces = PASS
```

## 7. Publication acceptance

After a fresh `intent-02` candidate is materialized:

1. compare production -> candidate and require exactly one candidate commit with only `latest.js` and `install.js` changed;
2. require both paths to resolve to the same candidate blob;
3. directly read candidate source and require both `//@version 0.70.7` and exact `// v0.70.7 Output Snapshot Set Cost Attribution:`;
4. create a fresh exact approval for `simcore-v0.70.7-new-02`;
5. require Exact Approval Activation and Permanent Release to PASS;
6. only then accept direct `release-simcore` readback as production;
7. keep lifecycle `LIVE_PENDING` until human real-long-chat evidence closes the original v0.70.7 live gate.

## 8. Workflow checkpoint

```text
v0.70.7 feature design/implementation       = PASS
candidate new-01                            = IMMUTABLE FAILED EVIDENCE
Permanent Release new-01                    = PREPUBLICATION BLOCKED
source-header repair design                 = FROZEN
source-header repair implementation          = NEXT
fresh candidate intent-02                    = AFTER REPAIR CI/MERGE
production                                  = v0.70.6 UNCHANGED
```
