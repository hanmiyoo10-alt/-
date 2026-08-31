# SimCore S3-4 Session Candidate Wrapper Convergence Implementation Evidence

Date: 2026-08-31 KST
Status: **IMPLEMENTED · PR-DRY QUALIFICATION PENDING · INTERNAL CHECKPOINT ONLY**
Classification: **POST-M2 SIMPLIFICATION / S3 / PURE TELEMETRY CANDIDATE WRAPPER DEDUPE**

Authority:
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S3_3_SESSION_SURFACE_RESULT_CONVERGENCE_IMPLEMENTATION_EVIDENCE_2026-08-31.md`
- `docs/SIMCORE_S3_4_SESSION_CANDIDATE_WRAPPER_CONVERGENCE_DESIGN_2026-08-31.md`

Production remains:

```text
release-simcore version = 0.70.1
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
release blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
```

No deployment or broad live authority exists before S7.

## Cumulative builder architecture

`products/simcore/tooling/build-s3-4-session-candidate-wrapper-convergence.py`

The P8 builder intentionally reuses the already-qualified P7 builder rather than copying its full verification body:

```text
run build-s3-3-session-surface-result-convergence.py
→ P7 materialized and P0→P7 proofs re-executed
→ read byte-identical P7 latest/install
→ apply exact P7→P8 wrapper-only delta
→ execute S3-4 differential/static proof
→ write byte-identical P8 latest/install
```

This keeps previous qualification executable while narrowing new verification ownership to S3-4.

Stages:

```text
P0 = exact v0.70.1 production
P1 = S1-1 FNV convergence
P2 = S2-1 Prompt dead render seam retirement
P3 = S2-2 Session dead re-export retirement
P4 = S2-3 runtime utility dead export retirement
P5 = S3-1 claim-selection probe convergence
P6 = S3-2 session candidate result convergence
P7 = S3-3 session surface result convergence
P8 = S3-4 session candidate wrapper convergence
```

## Exact P7 -> P8 delta

Target:

```text
runtime-telemetry.resolveSessionCandidates(root, windowLike)
```

Add one private helper:

```js
function sessionStorageCandidate(label, storage) {
  return Object.freeze({ label, storage });
}
```

Replace only the five repeated direct frozen `{ label, storage }` constructions with helper calls.

## Frozen behavior

The builder fails closed unless P7 -> P8 preserves:

```text
inspectSessionSurface call count/order
WINDOW then GLOBAL_THIS inspection order
window/global usability predicates
storage identity comparison
relation branch order and values
SAME_OBJECT = WINDOW only
DISTINCT_OBJECTS = WINDOW first + GLOBAL_THIS second
SINGLE_CANDIDATE mapping
NONE/null behavior
lastSurfaceProbe assignment/timing
surface/return object shape
S3-3 sessionStorage access/capability behavior
S3-2 takeSessionCandidate consume behavior
S3-1 claim selection behavior
Host-local acquisition/claim behavior
telemetry constants/schema/TTL/size rules
module inventory / require graph
side-effect marker counts
latest.js == install.js
node --check
```

The new helper must remain private and occur exactly once as a declaration plus five call sites.

A Node differential harness proves deep equality, property order, storage reference identity and frozen output for both candidate labels over representative storage objects.

## PR-dry posture

Temporary request:

```text
intent = simcore-v0.70.3-intent-07
purpose = GATE_PR1_DRY only
candidate persistence = forbidden
release authority = none
```

Required qualification:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
candidateCommit = null
Required = PASS
```

After PR-dry qualification:

```text
record exact evidence
remove intent-07
run fresh request-free substantive CI
require GATE_PR1_DRY = NOT_APPLICABLE
require CI_SELF / STATIC / ARCH / REGRESSION = PASS
sync evidence
run final exact-head CI
merge only after Required PASS
```

## Safety state

```text
candidate selection semantics = FROZEN
sessionStorage semantics = FROZEN
Host-local mailbox semantics = FROZEN
telemetry durability = FROZEN
provider cache = UNVERIFIED
v0.70.2 cache program = PARKED / PRESERVED
release-simcore = v0.70.1 unchanged
broad real-long-chat = S7 only
```

## Current disposition

```text
S3_4_DESIGN = FROZEN ON MAIN
S3_4_BUILDER = IMPLEMENTED
S3_4_PR_DRY = PENDING
S3_4_PUBLICATION = NONE BEFORE S7
```
