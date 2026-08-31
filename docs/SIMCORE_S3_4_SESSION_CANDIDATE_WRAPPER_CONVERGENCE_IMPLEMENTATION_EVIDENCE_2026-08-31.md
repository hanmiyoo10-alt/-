# SimCore S3-4 Session Candidate Wrapper Convergence Implementation Evidence

Date: 2026-08-31 KST
Status: **PR-DRY FAILURE PRESERVED · FIX IN PROGRESS · INTERNAL CHECKPOINT ONLY**
Classification: **POST-M2 SIMPLIFICATION / S3 / PURE TELEMETRY CANDIDATE WRAPPER DEDUPE**

Authority:
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S3_3_SESSION_SURFACE_RESULT_CONVERGENCE_IMPLEMENTATION_EVIDENCE_2026-08-31.md`
- `docs/SIMCORE_S3_4_SESSION_CANDIDATE_WRAPPER_CONVERGENCE_DESIGN_2026-08-31.md`
- historical packaging precedent: `docs/SIMCORE_06600_RELEASE_INTENT_FAILURE_02_FIX01_BUILDER_SELF_CONTAINMENT_2026-08-29.md`

Production remains:

```text
release-simcore version = 0.70.1
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
release blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
```

No deployment or broad live authority exists before S7.

## Cumulative stages

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

## Exact P7 -> P8 runtime delta

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

The runtime delta itself did not change as a result of the PR-dry failure below.

## Frozen behavior

The builder must fail closed unless P7 -> P8 preserves:

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

## PR-dry failure 01

Temporary request:

```text
intent = simcore-v0.70.3-intent-07
PR = #1040
failed head = 05194b92796e867f200fb5017ae31c2959af258f
workflow run = 33363560645
Verify job = 99399539457
```

Bounded result:

```text
conclusion = FAIL
reasonCodes = [PR1_DRY_QUALIFICATION_FAIL]
GATE_CI_SELF = PASS
GATE_PR1_DRY = FAIL
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
candidateCommit = null
productionCommit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

Exact stderr:

```text
CANDIDATE_BUILDER_FAILED: python3 /tmp/simcore-candidate-40834G/build-s3-4-session-candidate-wrapper-convergence.py
S3_4_BASE_BUILDER_MISSING: products/simcore/tooling/build-s3-3-session-surface-result-convergence.py
```

Classification:

```text
FIX = S3_4_BUILDER_SELF_CONTAINMENT
class = BUILDER_PACKAGING_SELF_CONTAINMENT
runtime defect = NO
production mutation = NONE
candidate persistence = NONE
```

Root cause:

```text
candidate materializer copies the requested builder as one executable file
→ first P8 implementation expected sibling S3-3 builder from repository
→ sibling builder is not packaged in isolated candidate directory
→ P8 composition fails before materialization
```

This is the same generic single-file builder contract already preserved by the v0.66 builder self-containment incident. The release/candidate materializer must not be changed inside this runtime simplification transaction.

## Correct repair boundary

Replace the failed wrapper composition with a **self-contained P8 builder** that contains the full mechanical P0→P8 transformation and bounded verification needed to materialize this checkpoint in one file.

Forbidden repair:

```text
change candidate-materialize-core
copy sibling builders in generic release infrastructure
introduce repository-relative runtime dependency
widen S3-4 product delta
```

Required repair:

```text
one executable builder file
exact production v0.70.1 input
same P1→P7 transformations already qualified
exact P7→P8 S3-4 delta
static/differential fences in same file
latest/install byte identity
```

## PR-dry posture after repair

`intent-07` remains a dry-only qualification marker and produced no candidate. The repaired head must prove:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
candidateCommit = null
Required = PASS
```

After successful qualification:

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
S3_4_RUNTIME_DELTA = UNCHANGED
S3_4_PR_DRY_01 = FAIL / PRESERVED
S3_4_BUILDER_SELF_CONTAINMENT = FIX IN PROGRESS
S3_4_PUBLICATION = NONE BEFORE S7
```
