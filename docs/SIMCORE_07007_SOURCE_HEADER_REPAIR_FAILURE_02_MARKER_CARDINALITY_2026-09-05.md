# SimCore v0.70.7 Source-Header Repair Failure 02 — Frozen Marker Cardinality

Date: 2026-09-05
Status: PRESERVED · FIX / BLOCKER · REPAIR REGRESSION · NON_RUNTIME · PRODUCTION UNCHANGED

## Context

The first v0.70.7 publication transaction (`simcore-v0.70.7-intent-01` / `simcore-v0.70.7-new-01`) failed closed before publication because the immutable candidate omitted the current release-note source header `// v0.70.7 Output Snapshot Set Cost Attribution:`.

The bounded repair was frozen in `docs/SIMCORE_07007_SOURCE_HEADER_REPAIR_DESIGN_2026-09-05.md` and implemented on PR #1535, branch `fix/simcore-v07007-source-header-repair`.

## Failed repair head

- PR: #1535
- head: `eff0a52c13aac1154491349289003edca1d4a1e9`
- SimCore CI run: `33967165749`
- Verify job: `101309209767`
- deployed production observed by CI: `e2552d7f93456652c94d9df37b0c253f12f2d900`
- deployed production version: `0.70.6`
- deployed production blob: `83714d78537906fc9f2060c06c9e4ce349568a19`

## Gate result

The trusted predecessor lane passed. The proposed verifier executed and produced a bounded fail-closed result.

- `GATE_CI_SELF`: PASS
- `GATE_STATIC`: PASS
- `GATE_ARCH`: PASS
- `GATE_REGRESSION`: FAIL
- conclusion: `FAIL`
- reason: `PERMANENT_REGRESSION_FAIL`

Exact regression assertion:

```text
SUITE_ASSERTION_FAILED: builder-v07007: v0.70.7 builder exit:
07007_BUILD_BLOCK marker count changed JSON.stringify(state): 1 -> 2
: expected=0 actual=1
```

## Root cause

The source-header repair itself added a release-note comment containing this literal text:

```text
JSON.stringify(state)
```

The v0.70.7 builder intentionally freezes the cardinality of the runtime marker `JSON.stringify(state)` to prove that the feature does not add or move serialization work. The repair comment therefore increased the lexical marker count from one to two even though it added no executable serialization call.

The fail-closed result is correct. The frozen marker guard is not defective and MUST NOT be weakened or removed.

## Classification

```text
FIX / BLOCKER / REPAIR REGRESSION / NON_RUNTIME / PRODUCTION UNCHANGED
```

- runtime semantic defect: NO
- deployed production mutation: NONE
- `release-simcore` exposure: NONE
- candidate publication: NONE
- persistent schema change: NONE
- release-system defect: NO

## Bounded repair

Change only the new v0.70.7 release-note prose so it does not contain the frozen executable marker literal.

Replace wording equivalent to:

```text
Reuses the same JSON.stringify(state) payload and awaited backend set ...
```

with wording equivalent to:

```text
Reuses the same already-created serialized state payload and awaited backend set ...
```

The following remain frozen:

- `JSON.stringify(state)` marker guard and its expected cardinality
- builder executable behavior
- runtime semantics
- output save call count/order/await behavior
- `prune:false` ordinary output semantics
- module inventory and require graph
- release-system code and authority boundaries

## Recovery rule

No deployment action may proceed from the failed repair head. After this evidence is durable on `main`, PR #1535 may receive the comment-only wording correction and must pass fresh Verify + Required on its exact final head before merge.

After the repaired implementation is merged, the failed immutable `intent-01 / new-01` transaction remains preserved. Publication recovery must use a fresh append-only `simcore-v0.70.7-intent-02` / `simcore-v0.70.7-new-02` transaction against production `e2552d7f93456652c94d9df37b0c253f12f2d900`.
