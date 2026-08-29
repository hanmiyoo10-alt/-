# SimCore v0.69.0 Candidate Architecture Contract Dual-Lane Blocker

Date: 2026-08-30 KST

Status: **BLOCKER RECORDED · PRODUCTION UNCHANGED · STATIC-GATE REPAIR REQUIRED**

Classification: **BLOCKER / FIX · ARCHITECTURE GATE · NON_RUNTIME**

## Trigger

After the v0.69 layer contradiction was resolved, ownership preflight followed the permanent release verifier path before runtime mutation.

`CANDIDATE_REQUIRED` always executes:

```text
python3 scripts/simcore-architecture-check.py --source <candidate latest> --source <candidate install>
```

against the verifier commit's default `config/simcore-architecture-v2.json`.

The repository therefore needs one contract to describe two legitimate topologies during the staged release:

```text
CURRENT PRODUCTION v0.68
  state-reconcile absent
  Kernel upward exceptions community/recurrence/lineage/handoff present

AUTHORIZED CANDIDATE v0.69
  state-reconcile present
  Kernel upward exceptions absent
```

The existing checker can already express the module half of this transition with `physical: planned`, but it treats every declared `transition_exception` as permanently active and fails if the edge becomes absent as a stale exception.

Therefore no truthful single current contract can pass both lanes without either retaining the exact Kernel debt v0.69 exists to remove or weakening the Foundation layer policy.

## Rejected bypasses

Rejected:

```text
retain unused Kernel domain requires
hide require tokens in comments/strings
reclassify Kernel or domain owners to falsify layer direction
allow Foundation -> Domain globally
skip/disable GATE_ARCH
mutate candidate outside immutable release flow
```

## Selected repair

Use the already-proven v0.65 dual-lane principle without weakening the checker:

1. keep current production contract unchanged for dedicated production drift guard;
2. add one bounded v0.69 candidate architecture sidecar contract;
3. make permanent `check.mjs` select the sidecar only when the immutable source under test declares exact `//@version 0.69.0`;
4. require latest/install to select the same contract;
5. all other versions continue using `config/simcore-architecture-v2.json`;
6. after v0.69 publication + terminal architecture convergence, promote main contract to v0.69 and retire the transitional sidecar selection.

This does not change publisher authority, release identity, runtime behavior, or any pass/fail rule. It changes only which already-strict architecture contract is applied to the exact source version being verified.

## Safety invariants

```text
GATE_ARCH remains mandatory
checker implementation unchanged
Foundation layer rule unchanged
candidate sidecar is stricter for v0.69 Kernel/state-reconcile target
version selection exact, no ranges/fuzzy matching
unknown version falls back to current production contract
latest/install contract disagreement = fail closed
runtime mutation = NONE
release-simcore mutation = NONE
```

## Disposition

```text
V06900_CANDIDATE_ARCH_DUAL_LANE = BLOCKER / FIX
PRODUCTION_EXPOSURE = NONE
RUNTIME_IMPLEMENTATION = PAUSED UNTIL FIX MAIN_CI_PASS
```
