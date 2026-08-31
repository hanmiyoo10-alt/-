# SimCore S7 Post-M2 Simplification Program Convergence Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · FINAL CUMULATIVE v0.70.3 RELEASE/LIVE BOUNDARY · NO NEW SIMPLIFICATION SCOPE**
Classification: **POST-M2 SIMPLIFICATION / S7 / FINAL CONVERGENCE / RELEASE + REAL-LONG-CHAT BOUNDARY**

## 1. Authority

This design is governed by:

- `docs/SIMCORE_PRE_MAJOR_SIMPLIFICATION_ROUTINE_2026-08-31.md`
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S6_PROMPT_COMMUNITY_SEMANTIC_RESTRAINT_CLOSURE_2026-08-31.md`
- all qualified S1-S5 implementation/closure evidence on `main`
- Generic Candidate + exact approval + Permanent Release release-system authority already in the repository

S7 does not reopen S1-S6 design. It packages and proves the cumulative end state already qualified by those phases.

## 2. Exact production parent

Production authority remains:

```text
product = SimCore
production version = 0.70.1
release name = Cold First-Turn Tail Attribution
release branch = release-simcore
release commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
release blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
latest.js == install.js = YES
provider cache = UNVERIFIED
```

The S7 cumulative candidate must have exactly this production commit as its single parent.

Any movement of `release-simcore` before candidate materialization invalidates the transaction and requires a rebase/re-proof. S7 must not silently retarget the parent.

## 3. Final release identity

Freeze the cumulative release identity as:

```text
version = 0.70.3
release name = Post-M2 Simplification Convergence
release mode = NEW_VERSION
```

v0.70.2 remains reserved for the parked Cache Observer Cold-Path Attribution program and must not be reused.

### Why identity convergence is required

The current P12 construction builder correctly targets runtime version `0.70.3`, but its release headline/operator-card name still inherits the first S1 mini identity:

```text
Runtime Cache Hash Primitive Convergence
```

That was valid for the internal S1 checkpoint but is not an accurate identity for the final cumulative S1-S6 release.

S7 therefore owns a strictly administrative/runtime-identity convergence step:

```text
P12 internal candidate semantics
+ final v0.70.3 release headline convergence
+ final operator-card release-name convergence
= S7 publication candidate
```

This is not a new simplification mini and does not change runtime behavior.

The final builder must replace the S1-only v0.70.3 headline/operator-card name with:

```text
Post-M2 Simplification Convergence
```

No other semantic string or behavior may change under this identity step.

## 4. Cumulative construction ledger

The final candidate is the exact cumulative result of:

```text
P0  = exact production v0.70.1
P1  = S1-1 Runtime Cache FNV primitive convergence
P2  = S2-1 Prompt dead render seam retirement
P3  = S2-2 Session dead re-export retirement
P4  = S2-3 runtime utility dead export retirement
P5  = S3-1 telemetry claim-selection probe convergence
P6  = S3-2 session candidate result convergence
P7  = S3-3 session surface result convergence
P8  = S3-4 session candidate wrapper convergence
P9  = S4-1 runtime current guard convergence
P10 = S4-2 output fallback-index pass-through retirement
P11 = S4-3 pending-probe branch convergence
P12 = S5-1 State Reconcile optional trimmed-string convergence
S6  = semantic restraint only, no runtime delta
S7  = full proof + release identity convergence + publication/live boundary
```

No P13 semantic checkpoint is created.

## 5. Final builder contract

Create one self-contained builder:

```text
products/simcore/tooling/build-s7-post-m2-simplification-convergence.py
```

The Generic Candidate isolated materializer receives one builder file, so the final builder must not import, execute, network-fetch or depend at runtime on sibling S1-S5 builders.

Required packaging:

```text
single executable builder = YES
sibling builder runtime dependency = NONE
network dependency = NONE
exact production parent requirement = v0.70.1
latest/install equality enforced = YES
node --check latest/install = REQUIRED
release-system tooling change = NONE
```

### Builder construction rule

The S7 builder may reuse the already-qualified P12 builder source as authoring material, but the committed final builder must itself directly reconstruct and verify the whole P0→P12 sequence.

It must:

1. load exact v0.70.1 latest/install and require equality,
2. reconstruct P1→P12 through the frozen transformations,
3. execute every predecessor differential/invariant proof retained by P12,
4. converge only the final release headline/operator-card identity,
5. run final cumulative inventory and semantic-protection checks,
6. write identical latest/install,
7. syntax-check both outputs.

## 6. Identity-only S7 delta

Immediately before identity convergence, the reconstructed P12 must still contain exactly one internal S1 release headline and one operator-card S1 name at the frozen anchors.

S7 then changes only:

```text
// v0.70.3 Runtime Cache Hash Primitive Convergence:
→
// v0.70.3 Post-M2 Simplification Convergence:
```

and:

```text
version: '0.70.3'
name: 'Runtime Cache Hash Primitive Convergence'
→
version: '0.70.3'
name: 'Post-M2 Simplification Convergence'
```

The version value itself does not change during S7 identity convergence.

Fail closed if the expected old identity occurs at any cardinality other than exactly one per intended anchor.

## 7. Final cumulative static proof

S7 must prove the candidate against P0 production and against the exact internally reconstructed P12.

### 7.1 Production identity

```text
parent metadata version = 0.70.1
parent runtime version = 0.70.1
parent host compatibility version = 0.70.1
candidate metadata version = 0.70.3
candidate runtime version = 0.70.3
candidate host compatibility version = 0.70.3
candidate release name = Post-M2 Simplification Convergence
```

### 7.2 Module inventory

```text
module names/order = unchanged P0 → final
module count = unchanged
new architecture layer = 0
new module = 0
```

### 7.3 Require graph

```text
require edge multiset/order = unchanged P0 → final
new upward dependency = 0
new circular dependency = 0
```

### 7.4 Export inventory

Export changes must equal only the already-qualified S2 retirements.

Required final posture:

```text
Prompt dead compileRuntimePrompt/renderRuntimePrompt exports = absent
Session dead render alias/re-export = absent
four S2-2 dead Session re-exports = absent
runtime-cache public surface = createRuntimePromptCacheTracker only
runtime-topology public surface = messageSignature, breakAttribution, createRequestTopologyTracker
all other owner exports = frozen from qualified construction
```

No S7-only export change is permitted.

### 7.5 Async boundaries

```text
await/yield site counts and frozen call-order markers = unchanged except no already-qualified transformation may add async
new Promise/timer/network/storage/chat I/O = 0
```

S7 itself introduces no async or I/O site.

### 7.6 Side-effect inventory

Compare production and final candidate markers for:

```text
pluginStorage
setChat
fetch
XMLHttpRequest
setTimeout / setInterval
history/messages mutation
system prompt insertion
host.currentIndices/getChat
Session load/onSend/processOutput
OUTPUT_COMMIT checkpoint
```

Every count must be unchanged unless an earlier qualified checkpoint explicitly proved a dead-site removal. Current P1-P12 construction is expected to preserve these counts.

### 7.7 Persistent-state/schema inventory

Must remain:

```text
STATE_VERSION = 5
CORE_STATE_VERSION = 10
persistent field set = unchanged
persistent field meaning = unchanged
telemetry capsule key/TTL/size authority = unchanged
history/reload/edit/reroll state ownership = unchanged
```

No schema migration is part of S7.

### 7.8 Protected semantic markers

At minimum freeze:

```text
PROMPT_COMPILER_VERSION = 4
COMMUNITY_CLASSIFIER_VERSION = 3
TAIL_AFTER_CURRENT_USER
provider cache UNVERIFIED
Post-onSend attribution diagnostics
Host-local/session telemetry handoff keys
Current Task Primacy protection
Frame/Time continuity contracts
Representation/Deferred Mirror contracts
```

### 7.9 Prompt / Community semantics

S2 removed only dead Prompt wrappers. Therefore prove that the live `compileRuntimePromptParts` path and its emitted prompt text are equivalent to production for representative states across A/B/C/B_END/current-time/summary/handoff/recurrence shapes.

Community module bytes must remain production-identical across the cumulative program.

No S7 prompt byte/order change is allowed beyond release identity text outside generated prompt semantics.

### 7.10 State Reconcile semantics

Retain the S5-1 differential harness for:

```text
broadcastAirtime
broadcastAirtimeStart
narrativeTimestamp
```

including non-strings, empty/whitespace strings, Unicode/Korean, emoji and ordinary trimmed/untrimmed strings.

Property values and property order must remain equivalent.

## 8. Required cumulative differential harnesses

The final builder must preserve or supersede all bounded predecessor harnesses:

```text
S1 FNV equivalence
S3 telemetry result/helper equivalence
S4-2 fallback/resolve equivalence
S4-3 pending branch assignment/clear/timestamp order equivalence
S5-1 optional trimmed-string and representative-state equivalence
```

Add a final identity harness/assertion proving:

```text
P12 internal candidate
vs
S7 final candidate
```

differs only at the two frozen release-name anchors.

## 9. Final candidate request identity

Freeze durable S7 transaction identity as:

```text
intentId = simcore-v0.70.3-intent-12
releaseId = simcore-v0.70.3-new-12
```

Rationale:

- internal construction used dry-only identities through intent-11,
- those temporary requests were removed and created no durable candidate,
- intent-12 avoids ambiguous reuse of historical construction identifiers,
- the S7 transaction is the first durable v0.70.3 candidate authority attempt.

Candidate request path:

```text
products/simcore/releases/candidate-requests/simcore-v0.70.3-intent-12.json
```

Required payload:

```text
schemaVersion = 1
product = SimCore
targetVersion = 0.70.3
releaseName = Post-M2 Simplification Convergence
releaseMode = NEW_VERSION
expectedProductionCommit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
builderPath = products/simcore/tooling/build-s7-post-m2-simplification-convergence.py
verificationSuite = batch-a
allowedRuntimePaths = plugins/simcore/latest.js, plugins/simcore/install.js
changeClass = RUNTIME_CORRECTION
primaryGoalId = S7_POST_M2_SIMPLIFICATION_PROGRAM_CONVERGENCE
liveGate.required = true
liveGate.scenarioId = S7_CUMULATIVE_SIMPLIFICATION_REAL_LONG_CHAT
liveGate.closeAuthority = HUMAN_EVIDENCE
```

Evidence refs must include this design and the S6 closure plus the cumulative implementation evidence/ledger required by current release tooling.

## 10. PR1 qualification and durable candidate rule

The S7 implementation PR carries the final builder, implementation evidence and candidate request.

Before merge:

```text
GATE_PR1_DRY = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
Verify = PASS
Required = PASS
candidateCommit = null on dry path
production = unchanged v0.70.1
```

Unlike S1-S5 internal dry requests, the S7 durable candidate request is not removed after PR1 qualification.

After exact-head PR1 merge, the unchanged Generic Candidate authority materializes the durable candidate from exact production v0.70.1.

Required receipt:

```text
candidateDisposition = CREATED or exact idempotent ALREADY_MATERIALIZED
candidate parent = 861100f4771967aa5b8ab8811d06f11702c0d3ff
candidate version = 0.70.3
candidate release name = Post-M2 Simplification Convergence
candidate latest/install blob = identical
productionMutation = NONE
releaseAuthority = candidate receipt/transport only
result = PASS
```

A candidate ref conflict, moved production parent, builder failure, regression failure or latest/install divergence is a BLOCKER.

## 11. Exact approval / publication sequence

Do not bypass the established release authority.

Required sequence:

```text
PR1 implementation + durable candidate request
→ Generic Candidate durable receipt
→ PR2 exact release approval
→ Permanent Release controller
→ release-simcore exact candidate publication
→ main state synchronization to LIVE_PENDING
```

Exact approval file shape follows the current authority, for example:

```json
{
  "schemaVersion": 1,
  "releaseId": "simcore-v0.70.3-new-12",
  "candidateReceiptPath": "products/simcore/releases/candidate-receipts/simcore-v0.70.3-intent-12.json",
  "authorityConfirmation": "RS2_4_RELEASE"
}
```

The exact authority confirmation must remain whatever the current permanent release controller requires at execution time. S7 does not redesign it.

Publication must move `release-simcore` to exactly the durable candidate commit. Rebuilding equivalent bytes into a different production commit is not acceptable.

After publication, verify:

```text
release-simcore HEAD = candidateCommit
latest blob = install blob = candidateReleaseBlob
version = 0.70.3
release name = Post-M2 Simplification Convergence
main product-manifest = exact published identity
validation status = PENDING_REAL_LONG_CHAT
live lifecycle = LIVE_PENDING
```

## 12. S7 broad real-long-chat matrix

This is deliberately broad because the cumulative train touched Runtime Cache, exported seams, Runtime Telemetry, outer runtime shell and State Reconcile.

The validation scenario is:

```text
S7_CUMULATIVE_SIMPLIFICATION_REAL_LONG_CHAT
```

### L1. Ordinary long-chat continuation

Require:

```text
Request hook SEEN
Core handshake FOUND
Runtime ACTIVE
output COMMITTED
binding BOUND
stability PASS
continuity PASS
frame PASS
warnings = 0 unless separately classified
```

### L2. Fresh-runtime cold → warm pair

Exercise a genuinely fresh runtime followed by an immediate warm request.

Require correctness on both. Timing is observational only; no provider-cache inference is permitted.

### L3. Mode A ordinary narrative path

Check:

```text
current-task authority
frame/time continuity
Knowledge final block
no Community unless expected
state continuity
```

### L4. Mode B lifecycle path

Exercise at least:

```text
B_START
B_CONTINUE
B_END
```

Check broadcast-lock lifecycle, airtime monotonicity, B_END closure authority, Frame/Time sentinels and expected Community block shape.

### L5. Mode C Community/source path

Check:

```text
Community block count/three-platform structure
reaction-line structure
source-lineage handoff
CURRENT_ROOT_EVIDENCE / CURRENT_SOURCE_EVIDENCE boundary behavior where eligible
no unintended prior-answer reuse
Knowledge final placement
```

### L6. Reroll

Reroll only the intended input/output generation path and verify no stale-turn binding, state corruption or duplicate output-state commit.

### L7. Manual edit positive control

Perform a genuine visible assistant edit and require Edit Reconcile to distinguish it from representation drift.

Check revision/state rebuild behavior and no false representation-fast acceptance.

### L8. Refresh/reload

After established chat state, refresh/reload runtime and continue.

Require session/state continuity, no stale runtime binding, and compatible telemetry/state adoption.

### L9. Telemetry adoption / reload continuity

Because S3 touched telemetry bookkeeping, observe the fresh/reload path for:

```text
memory/session/host-local claim selection
one-shot ownership
no duplicate adoption
no raw body retention increase
```

Schema/TTL/size semantics must remain unchanged.

### L10. Representation exactness + Deferred Mirror

Require canonical/fresh representation distinction to remain correct and Deferred Mirror to remain non-authoritative for semantic rewrites.

### L11. Frame / Time / continuity sentinels

Across the matrix inspect:

```text
volume/chapter/chatindex continuity
narrative timestamp monotonicity/current-floor behavior
broadcast airtime behavior
post-B_END clock handoff
```

### L12. Warning / compatibility diagnostic review

Review the final diagnostic output for:

```text
warnings
compatibility diagnostics
stale runtime drops
hook cleanup/reload safety
unexpected preamble handling
```

Any new repeatable anomaly is immediately recorded in the anomaly ledger before proceeding.

### L13. Output-storage latency observation

Preserve the existing separate watch:

```text
WATCH · REPEATED_OUT_STORAGE_LATENCY
```

S7 records observations but does not optimize this path.

### L14. Provider-cache posture

```text
provider cache = UNVERIFIED
```

Cold/warm timing is evidence only. S7 does not infer provider cache behavior, tune it, or resume the parked cache program early.

## 13. Live anomaly handling

Every real anomaly is preserved immediately as exactly one of:

```text
WATCH
DEFER
FIX
BLOCKER
```

Disposition rules:

- correctness/state/reload/edit/reroll regression caused by v0.70.3 = `BLOCKER` or `FIX` before live close,
- known independent latency with correctness intact = `WATCH`,
- low-value or architecture-scale cleanup unrelated to release correctness = `DEFER`,
- provider-cache behavior remains `UNVERIFIED`, not inferred from timing.

Do not fold a discovered optimization or release-system redesign into the S7 publication transaction.

## 14. Human evidence authority

Automation may establish:

```text
candidate PASS
publication PASS
LIVE_PENDING
formal diagnostic acceptance
```

Automation must not manufacture:

```text
LIVE_PASS
human approval
terminal HUMAN_EVIDENCE
```

After the broad matrix is technically acceptable, explicit human evidence is required to close v0.70.3.

Until that explicit decision exists:

```text
v0.70.3 = LIVE_PENDING
validation = PENDING_REAL_LONG_CHAT / HUMAN_EVIDENCE PENDING
```

## 15. Post-human terminal convergence

Only after explicit human PASS:

1. record HUMAN_EVIDENCE using the existing R2.8 terminal authority,
2. execute any required terminal/admin convergence,
3. confirm `release-simcore` remains the exact v0.70.3 production commit,
4. confirm latest/install remain identical,
5. converge main product manifest/current development/guidelines and program closure docs,
6. mark Post-M2 Simplification Program complete,
7. resume the parked CACHE/COST program in a separate transaction.

Do not infer this terminal state ahead of the user's explicit decision.

## 16. Rollback / stop conditions

Stop before publication if:

```text
production parent moved
cumulative reconstruction differs from frozen P1-P12 transformations
final identity diff exceeds the two allowed release-name anchors
module inventory unexpected
require graph unexpected
export delta exceeds S2-qualified retirements
async/side-effect inventory changes unexpectedly
schema markers change
Prompt/Community semantics change
latest/install diverge
static/architecture/regression gate fails
candidate receipt is not exact
```

After publication, a correctness BLOCKER uses the existing release-system rollback/correction authority as a separate transaction. Do not patch production manually outside release authority.

## 17. S7 implementation transaction boundaries

Allowed in the implementation transaction:

```text
new final self-contained S7 builder
S7 implementation evidence
one durable v0.70.3 candidate request
final identity convergence inside candidate output
bounded proof additions required for final convergence
```

Not allowed in the same transaction:

```text
release-system redesign
provider-cache tuning
output-storage latency optimization
new Community feature
new prompt semantics
persistent schema change
M2 architecture change
unrelated docs/products
```

The exact approval PR is a separate release-authority transaction after the candidate receipt exists.

## 18. Quantitative final ledger

S7 evidence should record production-vs-final counts for:

```text
runtime bytes / LOC
module count
public export count by module or total
require edge count
await/yield count
storage/network/chat-write/timer side-effect marker counts
persistent schema/version markers
```

No target percentage is required. The ledger exists to prove the final simplification shape rather than to reward line deletion.

Expected direction:

```text
module count = same
public exports = down
require edges = same
persistent fields = exactly same
async boundaries = same
side-effect sites = same
reasoning/seam surface = down
```

## 19. Program close disposition after successful human evidence

Successful S7 closes as:

```text
POST_M2_SIMPLIFICATION_PROGRAM = DONE
FINAL_RELEASE = v0.70.3 Post-M2 Simplification Convergence
CUMULATIVE_RUNTIME = P1-P12
S6_RUNTIME_DELTA = NONE
M2_6 = FROZEN
M2_7 = NOT AUTHORIZED
PROVIDER_CACHE = UNVERIFIED
NEXT = RESUME CACHE / COST PROGRAM
```

The parked v0.70.2 cache design must then be reviewed/rebased against the new v0.70.3 production source before implementation because S1/S2/S3/S4/S5 changed its source envelope mechanically.

## 20. Immediate execution order

```text
1. merge this S7 design to main
2. create S7 implementation branch from exact main
3. create self-contained final convergence builder
4. create implementation evidence + durable intent-12 request
5. PR1 dry/static/architecture/regression qualification
6. exact-head PR1 merge
7. observe Generic Candidate durable receipt
8. create exact approval PR2
9. observe Permanent Release publication to release-simcore
10. confirm main LIVE_PENDING convergence
11. run S7 broad real-long-chat matrix
12. preserve anomalies
13. wait for explicit human LIVE decision
14. terminal HUMAN_EVIDENCE + main program closure sync only if human PASS
```

## 21. Final design disposition

```text
S7_DESIGN = FROZEN
TARGET_VERSION = 0.70.3
RELEASE_NAME = Post-M2 Simplification Convergence
PRODUCTION_PARENT = 861100f4771967aa5b8ab8811d06f11702c0d3ff
CUMULATIVE_CHECKPOINT = P12
S7_NEW_SEMANTIC_SCOPE = NONE
FINAL_BUILDER = build-s7-post-m2-simplification-convergence.py
DURABLE_INTENT = simcore-v0.70.3-intent-12
DURABLE_RELEASE = simcore-v0.70.3-new-12
LIVE_SCENARIO = S7_CUMULATIVE_SIMPLIFICATION_REAL_LONG_CHAT
HUMAN_CLOSE_AUTHORITY = HUMAN_EVIDENCE
PUBLICATION_BEFORE_CANDIDATE_APPROVAL = FORBIDDEN
NEXT = S7 IMPLEMENTATION TRANSACTION
```
