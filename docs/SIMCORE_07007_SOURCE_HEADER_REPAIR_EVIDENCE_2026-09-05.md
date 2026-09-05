# SimCore v0.70.7 Source-Header Repair Evidence

Date: 2026-09-05
Status: IMPLEMENTED · VERIFY PASS · REQUIRED PASS · MERGE PENDING

## Scope

This evidence closes the bounded implementation repair defined by `docs/SIMCORE_07007_SOURCE_HEADER_REPAIR_DESIGN_2026-09-05.md` after the first v0.70.7 publication transaction failed closed before production publication.

The repair changes no deployed runtime semantics and no release-system behavior. It repairs only deterministic candidate construction identity and the executable regression that freezes that identity.

## Precursor production

Production authority remained unchanged throughout the failed publication and repair work:

- branch: `release-simcore`
- version: `0.70.6`
- release: `Manual Edit Redundant Prune Elision`
- commit: `e2552d7f93456652c94d9df37b0c253f12f2d900`
- blob: `83714d78537906fc9f2060c06c9e4ce349568a19`

No v0.70.7 failed candidate was published.

## Failure 01 preserved

The immutable first publication candidate `e1766da6ff6c48a439a43256ef96640e168ba4a6` had correct `//@version 0.70.7` metadata but retained the predecessor release-note header and omitted:

```text
// v0.70.7 Output Snapshot Set Cost Attribution:
```

Permanent Release failed closed in prepublication state qualification with:

```text
PUBLISHED_IDENTITY_NOT_OBSERVED: source header
```

Evidence is preserved in:

- `docs/SIMCORE_07007_PERMANENT_RELEASE_FAILURE_01_SOURCE_HEADER_2026-09-05.md`

The failed `intent-01 / new-01` transaction remains immutable historical evidence and is not eligible for rewrite or reuse.

## Repair implementation

PR: #1535
Branch: `fix/simcore-v07007-source-header-repair`

Implementation files:

1. `products/simcore/tooling/build-07007-output-snapshot-set-cost-attribution.py`
2. `products/simcore/tests/suites/builder-v07007.test.mjs`

Builder repair:

- requires exactly one predecessor `// v0.70.6 Manual Edit Redundant Prune Elision:` header
- inserts exactly one `// v0.70.7 Output Snapshot Set Cost Attribution:` block immediately before it
- fail-closes unless the v0.70.7 source header exists exactly once

Executable regression repair:

- treats the v0.70.7 release-note source header as part of exact release identity
- requires exact cardinality one on the generated candidate
- requires candidate cardinality to equal predecessor cardinality plus one

No runtime module, require graph, persistent schema, storage call count/order/await behavior, prune policy, or release-system implementation is changed by this repair.

## Failure 02 preserved

Initial repair head:

- head: `eff0a52c13aac1154491349289003edca1d4a1e9`
- SimCore CI run: `33967165749`
- Verify job: `101309209767`

The new release-note prose contained the literal frozen marker `JSON.stringify(state)`, causing the correct fail-closed assertion:

```text
07007_BUILD_BLOCK marker count changed JSON.stringify(state): 1 -> 2
```

This was classified:

```text
FIX / BLOCKER / REPAIR REGRESSION / NON_RUNTIME / PRODUCTION UNCHANGED
```

Evidence is preserved in:

- `docs/SIMCORE_07007_SOURCE_HEADER_REPAIR_FAILURE_02_MARKER_CARDINALITY_2026-09-05.md`

The frozen marker guard was not weakened. Only comment prose was changed from the executable marker literal to `already-created serialized state payload` wording.

## Passing repair head before evidence append

Repair head:

- `0d704e6e8493463994df0e4da72451fa464c9d79`

SimCore CI:

- run: `33967369964`
- Verify: PASS
- Required: PASS

The passing verifier proves the deployed v0.70.6 predecessor can be materialized through the repaired v0.70.7 builder while preserving all frozen marker cardinalities and producing the required v0.70.7 source header identity.

## Frozen guarantees

The repair retains the original v0.70.7 feature contract:

- one existing ordinary output snapshot serialization path
- one awaited backend set
- ordinary output `prune:false`
- `OUT_STORAGE` remains `detail.outSetMs`
- no added storage read/write, network operation, timer, queue, scheduler, chat mutation, or history mutation
- no persistent schema change
- no module inventory or require graph change
- `latest.js` and `install.js` generation remains byte-identical

## Merge and release gate

This evidence append itself requires a fresh exact-head Verify + Required pass before PR #1535 may merge.

After merge, publication recovery MUST be a fresh append-only transaction:

```text
intent:  simcore-v0.70.7-intent-02
release: simcore-v0.70.7-new-02
expected production: e2552d7f93456652c94d9df37b0c253f12f2d900
```

The stale `intent-01 / new-01` candidate and approval must remain preserved and must not be rewritten or retried as the publication vehicle.
