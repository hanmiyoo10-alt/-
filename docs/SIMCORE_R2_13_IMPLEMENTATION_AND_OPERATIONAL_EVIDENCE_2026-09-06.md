# SimCore R2.13 Implementation and Operational Evidence

Date: 2026-09-06 KST
Status: **CLOSED · KEEP · HOSTED DETERMINISTIC PASS · NATURAL END-TO-END PASS · NON-RUNTIME**
Classification: **RELEASE SYSTEM V2 / CANONICAL DOCUMENTATION PROMOTION CONTROL PLANE**

## 1. Executive closure

```text
R2.13 NAME = Exact Dispatch Run-ID Binding
R2.12 = KEEP / DO NOT REOPEN
R2.13 DESIGN = COMPLETE / FROZEN
R2.13 IMPLEMENTATION = COMPLETE
HOSTED DETERMINISTIC VALIDATION = PASS
NATURAL OPERATIONAL VALIDATION = PASS
INITIAL NATURAL-PATH WATCH = RESOLVED
R2.13 = CLOSED / KEEP
RUNTIME MUTATION = 0
release-simcore MUTATION = 0
NEW SIMCORE PROFILE = 0
NEW CHILD WORKFLOW INPUT = 0
NEW IDENTITY SERVICE / STATE STORE = 0
```

R2.13 removed the remaining stale same-head child-run selection ambiguity without reopening or weakening R2.12. The parent now receives exact workflow run identity from each dispatch, validates the returned run's event and head, then watches that exact run ID.

## 2. Lifecycle identities

### Design

```text
Design doc = docs/SIMCORE_R2_13_EXACT_DISPATCH_RUN_ID_BINDING_DESIGN_2026-09-06.md
Design PR = #1614
Design exact head = ade1997faea9ba5fb1c24fd39fb540205b084431
Design merge main = 3084c23eb56fb62d89f7066af2fa1ae139e52657
```

### Implementation authorization

```text
Authorization doc = docs/SIMCORE_R2_13_IMPLEMENTATION_AUTHORIZATION_2026-09-06.md
Authorization PR = #1617
Authorization exact head = b05df877a11e464f49ff9a6e1e7c7c693708fcfd
Authorization merge main = e154d2ac02f70db7aff7305859302049ee118f73
```

### Implementation

```text
Implementation PR = #1618
Implementation exact head = 042c5d4ff223ca0a55dc15626fdf9a80c4dc026f
Implementation merge main = 1617c499a9449db1a78969f1e65e790c18e47784
```

### Initial evidence / pending-natural-path record

```text
Evidence PR = #1620
Evidence exact head = 8456174977a2e92aee0235510c987cdb18ad4637
Evidence merge main = b9df9d74390d6f9a81468140139815ea5fd951dc
```

The initial post-implementation natural specimens did not enter the generated-doc `published=true` path, so the exact-run-ID dispatch steps were skipped. That state was correctly recorded as:

```text
WATCH · R2.13 NATURAL EXACT-RUN-ID PATH NOT_YET_EXERCISED · NON-CORRECTNESS
```

That WATCH is now resolved by the natural end-to-end specimen below.

## 3. Exact implementation owner boundary

Implementation changed exactly the two frozen owners:

```text
.github/workflows/canonical-main-doc-promotion.yml
.github/plugin-control-plane/canonical-main/tests/documentation-stream-contract.cjs
```

Explicit non-owners remained unchanged by R2.13 implementation:

```text
.github/workflows/simcore-ci.yml
.github/workflows/plugin-control-plane-ci.yml
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
runtime behavior
R2.12 MAIN_HEALTH routing semantics
R2.12 CANDIDATE_SHADOW runtime-candidate semantics
```

## 4. Implemented exact-run transaction

The canonical documentation promotion path now follows:

```text
exact generated documentation head
-> REST workflow dispatch for Plugin Control Plane
-> receive exact Plugin workflow_run_id
-> REST workflow dispatch for SimCore MAIN_HEALTH
-> receive exact SimCore workflow_run_id
-> carry both exact IDs as step outputs
-> re-read each exact run by ID
-> require event == workflow_dispatch
-> require head_sha == generated documentation HEAD_SHA
-> watch each exact run ID with exit-status semantics
-> exact-base / exact-head merge
```

The workflow dispatch REST contract is pinned to:

```text
X-GitHub-Api-Version: 2026-03-10
```

Removed from the canonical docs child-discovery path:

```text
gh run list
find_run()
wait_for_run() discovery
same-head first-match selection
head -n 1
60-iteration discovery polling
2-second discovery sleeps
```

No fallback to another same-head run is allowed.

## 5. Hosted deterministic implementation validation

Exact implementation head:

```text
042c5d4ff223ca0a55dc15626fdf9a80c4dc026f
```

Hosted validation:

```text
Plugin Control Plane CI 33987731061 = SUCCESS
Plugin Control Plane PR observe 33987731101 = SUCCESS
SimCore CI 33987731087 Verify = SUCCESS
SimCore CI 33987731087 Required = SUCCESS
```

The permanent documentation-stream contract regression passed on hosted GitHub Actions and enforces both the new exact-ID path and the removal of the old same-head discovery mechanism.

## 6. Natural end-to-end operational specimen

### Parent identity

```text
Canonical Main Documentation Promotion run = 33988149352
Promotion number = #5485
Parent trigger head = da2f2201f50110c41dd90ad442dd87fffedda429
Parent conclusion = SUCCESS
```

The parent completed all meaningful R2.13-owned steps successfully:

```text
Render stable durable documentation = SUCCESS
Publish generated branch or hand off PR creation = SUCCESS
Dispatch exact documentation candidate checks = SUCCESS
Wait for exact candidate checks = SUCCESS
Exact-base / exact-head merge = SUCCESS
```

### Generated documentation transaction identity

```text
Exact base main = da2f2201f50110c41dd90ad442dd87fffedda429
Generated docs head = 43373f130bfb539a4904fcd6995156082064c96c
Canonical generated docs PR = #1624
```

### Exact child IDs returned by dispatch

Parent operational log recorded:

```text
CANONICAL_MAIN_DOC_PROMOTION:CHECKS_DISPATCHED:
43373f130bfb539a4904fcd6995156082064c96c:
33988159396:
33988160709
```

Therefore the exact transaction-bound children were:

```text
Plugin Control Plane child = 33988159396
SimCore child = 33988160709
```

### Exact child metadata verification

Plugin Control Plane child:

```text
run id = 33988159396
event = workflow_dispatch
head_sha = 43373f130bfb539a4904fcd6995156082064c96c
conclusion = SUCCESS
```

SimCore child:

```text
run id = 33988160709
event = workflow_dispatch
head_sha = 43373f130bfb539a4904fcd6995156082064c96c
conclusion = SUCCESS
```

The parent log also emitted exact verification markers for both returned IDs before watching them. This proves head SHA was used as an assertion on a transaction-bound exact run rather than as a discovery key.

## 7. R2.12 semantics naturally preserved

The exact SimCore child `33988160709` passed:

```text
Verify = SUCCESS
Required = SUCCESS
Materialize deployed production exactly once = SUCCESS
Materialize immutable candidate = SKIPPED
Select source under test = SUCCESS
```

This is natural evidence that canonical documentation validation continued through the R2.12 `MAIN_HEALTH` production-source lane and did not regress into `CANDIDATE_SHADOW` runtime-candidate semantics.

## 8. Exact merge result

Canonical generated documentation PR #1624 was merged by the parent workflow after exact child success and exact-base / exact-head validation.

```text
PR #1624 base = da2f2201f50110c41dd90ad442dd87fffedda429
PR #1624 head = 43373f130bfb539a4904fcd6995156082064c96c
Result main = 26fe1b96fb46c6b126382fe7bfd1580d9e7d5ba1
```

Mailbox #457 re-observed the same state as:

```text
State = MERGED
Base SHA = da2f2201f50110c41dd90ad442dd87fffedda429
Head SHA = 43373f130bfb539a4904fcd6995156082064c96c
PR = #1624
Result main SHA = 26fe1b96fb46c6b126382fe7bfd1580d9e7d5ba1
Source run = 33988149352
```

## 9. Initial WATCH resolution

Previously recorded:

```text
WATCH · R2.13 NATURAL EXACT-RUN-ID PATH NOT_YET_EXERCISED · NON-CORRECTNESS
```

Resolution:

```text
RESOLVED BY NATURAL SPECIMEN 33988149352
EXACT DISPATCH = EXERCISED / PASS
EXACT RETURNED RUN IDS = OBSERVED
EXACT EVENT/HEAD REVALIDATION = PASS
EXACT RUN WATCH = PASS
EXACT BASE/HEAD MERGE = PASS
```

No rollback or repair is indicated.

The earlier canonical-documentation concurrency replacement observed before this specimen occurred above the R2.13 exact-ID child path and did not invalidate the later successful natural transaction. It remains part of the existing canonical-doc concurrency behavior family, not an R2.13 correctness failure.

## 10. Three-lens closure assessment

### Stabilization

```text
VERDICT = STRONGER
```

The stale same-head child-selection failure mode is removed by construction from the R2.13 path. The parent watches the exact run IDs created by its dispatch transaction and fails closed on identity mismatch.

### Automation

```text
VERDICT = MORE AUTOMATIC AND SAFER
```

Child identity is now carried machine-to-machine from dispatch to exact metadata verification to exact watch. No human or best-effort selection is required.

### Simplification

```text
VERDICT = SIMPLER
```

The system deleted same-head discovery, polling, sleeps, and first-match selection without adding a nonce, extra validation profile, child workflow input, helper service, or persistent identity store.

### Cross-lens verdict

```text
STABILIZATION = STRONGER
AUTOMATION = MORE AUTOMATIC AND SAFER
SIMPLIFICATION = SIMPLER
MATERIAL TRADEOFF = NONE OBSERVED
```

## 11. Runtime and release boundary

R2.13 is non-runtime control-plane work.

```text
release-simcore deployment = NOT APPLICABLE / FORBIDDEN BY DESIGN
runtime release = NONE
latest.js mutation = NONE
install.js mutation = NONE
real long-chat runtime validation = NOT APPLICABLE TO R2.13
```

The independent v0.70.9 HUMAN_EVIDENCE / long-chat state is not blocked or altered by R2.13.

## 12. Final disposition

```text
R2.12 = KEEP
R2.13 DESIGN = CLOSED
R2.13 IMPLEMENTATION = CLOSED
HOSTED DETERMINISTIC = PASS
NATURAL EXACT-ID DISPATCH = PASS
NATURAL EXACT-ID REVALIDATION = PASS
NATURAL EXACT-ID WATCH = PASS
NATURAL EXACT-BASE/HEAD MERGE = PASS
INITIAL WATCH = RESOLVED
R2.13 = CLOSED / KEEP
NEXT R2.13 ACTION = NONE
```
