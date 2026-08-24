# SimCore Release System v2.1 — Simplified Stable Release Transactions

Date: 2026-08-25
Status: **PROPOSED DESIGN · FEEDBACK-DERIVED · NON-RUNTIME**
Scope: next Release System hardening after the first genuine R-driven SimCore release
Parent evidence:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_FIRST_REAL_RELEASE_RETROSPECTIVE.md`
- `products/simcore/releases/R_FIRST_REAL_RELEASE_FEEDBACK_STATUS.json`

## 1. Goal

R v2.1 should make a normal SimCore update materially simpler to operate while preserving or strengthening the safety properties proven by the first real R release.

The simplification target is **operator transactions**, not safety gates.

Steady-state target:

```text
PR 1 — product + release intent
→ generic candidate materialization
→ permanent candidate verification
→ machine candidate/spec receipt

PR 2 — exact release approval
→ permanent caller
→ exact C/P Candidate Required
→ release-simcore publication
→ automatic LIVE_PENDING durable closure

human real long-chat validation

PR 3 — LIVE_PASS evidence closure
→ main state / long-term memory sync
```

Target operator cost:

```text
to production LIVE_PENDING: 2 PRs
through human LIVE_PASS closure: 3 PRs
```

A temporary migration state may require one additional PR while old contracts are retired, but the steady-state target above is normative.

## 2. What must not be simplified away

R v2.1 must retain:

```text
release-simcore = runtime/deployment authority
main = design/evidence/state/admin authority
latest.js == install.js for production
exact candidate commit identity
exact expected production parent
Candidate Required PASS for exact C/P
single permanent publisher
fast-forward-only production writes
no force publication
recovery never republishes production
real long-chat LIVE_PASS remains human-evidence-gated
no manual GitHub platform enforcement dependency
no runtime feature mixed into R infrastructure work
repository documentation closure before COMPLETE
```

The design does not change SimCore runtime semantics.

## 3. First-real-release feedback consumed

Direct FIX scope:

```text
R_CANDIDATE_ORCHESTRATION_VERSION_SPECIFIC
CANDIDATE_RETRY_EXACT_REF_ALREADY_EXISTS
06407_CANDIDATE_ONE_SHOT_WORKFLOWS_STILL_ACTIVE
CANDIDATE_PREPARATION_OBSERVABILITY_NOT_PERMANENT
LIVE_PENDING_DURABLE_CLOSURE_FRAGMENTED
MACHINE_KNOWN_RELEASE_FACTS_REENTERED_MANUALLY
```

Still evidence-driven:

```text
PERMANENT_ACTIVATION_RUN_DISCOVERY_POLLING        WATCH
CANDIDATE_TRANSPORT_REF_RETIREMENT                 DEFER
GITHUB_ACTIONS_NODE20_TARGET_FORCED_NODE24         WATCH
```

`RELEASE_AUTHORIZATION_ACTIVATION_DOUBLE_PR` moves from plain DEFER to a **gated v2.1 design objective**. It must not activate until generic candidate materialization and consolidated LIVE_PENDING closure are independently qualified.

## 4. Core design rules

### 4.1 Machine-known facts are written by machines

The operator should not manually re-enter values R already knows:

```text
candidate commit
candidate blob
expected production commit
verifier commit
verification report hash
publisher run id
state-sync run id
publication disposition
LIVE_PENDING current priority
```

Human-authored inputs are limited to product intent, release approval, and real-live evidence.

### 4.2 One authority per responsibility

```text
product work branch
= runtime/source intent

generic candidate controller
= candidate materialization and verification only

release approval
= human approval of exact machine-produced candidate identity

permanent release caller
= sole production publisher

release-state convergence
= durable LIVE_PENDING state owner

human live closure
= LIVE_PASS authority
```

### 4.3 Exact retries are idempotent

Every project-owned transaction distinguishes:

```text
not started
already completed with exact same identity
conflicting prior identity
```

Exact repeats should become explicit `NOOP/PASS`. Conflicting identity remains fail-closed.

### 4.4 Reduce operator transactions, not internal safety work

R may still use multiple jobs, permanent tests, artifacts, and bounded bot commits internally. The simplification metric is the number of manual/operator transactions and duplicated decisions.

## 5. R v2.1 hardening units

```text
R2.1-A  one-shot retirement and cleanup
R2.1-B  generic candidate controller
R2.1-C  candidate receipt + machine-derived release spec
R2.1-D  consolidated LIVE_PENDING state convergence
R2.1-E  exact release approval consolidation
```

R2.1-E is gated on B/C/D qualification.

---

# R2.1-A — One-shot retirement

## 6. Remove version-specific executable orchestration

Retire before the next runtime release:

```text
.github/workflows/product-simcore-06407-candidate-prep.yml
.github/workflows/product-simcore-06407-candidate-prep-observable.yml
```

Historical evidence, builders, release specs, release records, and retrospective documents remain.

Acceptance:

```text
active v0.64.7-specific candidate workflows = 0
historical evidence preserved
v0.64.7 production unchanged
release-simcore unchanged
permanent CI proves no live control depends on retired files
```

---

# R2.1-B — Generic Candidate Controller

## 7. Permanent controller

Proposed workflow:

`.github/workflows/simcore-candidate-materialize.yml`

Proposed application owner:

`products/simcore/tooling/candidate-materialize.mjs`

Input is an immutable candidate request committed with the product work.

Proposed path:

`products/simcore/releases/candidate-requests/<intentId>.json`

## 8. Candidate request contract

The request contains intent, not C.

Representative fields:

```json
{
  "schemaVersion": 1,
  "intentId": "simcore-v0.64.8-intent-01",
  "product": "SimCore",
  "targetVersion": "0.64.8",
  "releaseName": "Example Release",
  "releaseMode": "NEW_VERSION",
  "expectedProductionCommit": "<P>",
  "sourceCommit": "<immutable product source commit>",
  "builderPath": "products/simcore/tooling/build-06408-example.py",
  "verificationSuite": "batch-a",
  "allowedRuntimePaths": [
    "plugins/simcore/latest.js",
    "plugins/simcore/install.js"
  ],
  "changeClass": "RUNTIME_FEATURE",
  "primaryGoalId": "...",
  "liveGate": {
    "required": true,
    "scenarioId": "...",
    "closeAuthority": "HUMAN_EVIDENCE"
  },
  "evidenceRefs": []
}
```

Frozen authority distinction:

```text
request = human/product intent
receipt = machine-observed candidate identity
```

## 9. Immutable source binding

The generic controller must not build from moving main state.

Bind:

```text
P = expected production commit
S = immutable product source commit
builder bytes = S:builderPath
verifier/policy = explicit immutable verifier commit
```

Preconditions:

```text
release-simcore == P
latest(P) == install(P)
S exists
builderPath exists at S
builderPath is within approved SimCore tooling namespace
target version and release mode are valid
```

## 10. Materialization sequence

```text
checkout exact P
→ load exact builder from S
→ execute builder
→ latest == install
→ syntax/static checks
→ enforce allowed runtime path diff
→ run permanent candidate suites
→ create direct-child C of P
→ verify parent(C) == P
→ verify latest/install blob equality at C
→ materialize candidate transport under idempotent rules
→ emit candidate report/receipt
```

The candidate controller has no `release-simcore` publication authority.

## 11. Candidate idempotency

Canonical candidate ref proposal:

`candidate/simcore/<intentId>`

If absent:

```text
create C
result = CREATED
```

If present and exact:

```text
head == recomputed C
parent(C) == P
blob identity matches
request identity matches
→ result = ALREADY_MATERIALIZED
→ PASS
→ no mutation
```

If present but conflicting:

```text
result = CANDIDATE_REF_CONFLICT
→ BLOCK
```

Never force-update a candidate ref.

## 12. Permanent candidate observability

No version-specific observable wrapper.

Every generic candidate run emits a report containing:

```text
intentId
P
S
C
candidate blob
candidate ref
builder path + digest
verifier commit
suite result
changed paths
CREATED | ALREADY_MATERIALIZED
production mutation = NONE
failureDomain = CANDIDATE when applicable
```

## 13. Candidate permanent negatives

At minimum:

```text
B-N1 invalid request schema
B-N2 production P moved
B-N3 source commit missing
B-N4 builder outside allowlist
B-N5 builder missing
B-N6 unauthorized changed runtime path
B-N7 latest/install divergence
B-N8 syntax failure
B-N9 candidate regression failure
B-N10 generated C not direct child P
B-N11 exact existing candidate → PASS/NOOP
B-N12 conflicting existing candidate → BLOCK
B-N13 force-update primitive present → BLOCK
B-N14 production publication primitive present → BLOCK
```

---

# R2.1-C — Candidate Receipt and Machine Release Spec

## 14. Candidate receipt

After candidate PASS, R writes a bounded machine receipt to main through the project-owned gateway.

Proposed path:

`products/simcore/releases/candidate-receipts/<intentId>.json`

Representative machine truth:

```json
{
  "schemaVersion": 1,
  "intentId": "...",
  "candidateDisposition": "CREATED",
  "expectedProductionCommit": "<P>",
  "sourceCommit": "<S>",
  "candidateCommit": "<C>",
  "candidateReleaseBlob": "<blob>",
  "candidateFetchRef": "candidate/simcore/<intentId>",
  "verifierCommit": "<V>",
  "verificationReportSha256": "<hash>",
  "result": "PASS"
}
```

## 15. Stop manual identity transcription

The candidate receipt becomes the source for:

```text
C
P
blob
candidate ref
verifier identity
verification report identity
```

These values must not be manually copied into downstream authorization data in the steady state.

## 16. Machine-derived release spec

Preferred steady-state contract:

```text
candidate request + candidate receipt
→ immutable machine-derived release spec
```

The spec derives:

```text
candidateCommit
expectedProductionCommit
candidateReleaseBlob
version
releaseName
releaseMode
primaryGoalId
changeClass
evidenceRefs
liveGate
```

This changes the spec from a human-authored authorization document to a machine-derived immutable transaction document.

Human approval moves to R2.1-E.

## 17. Safe migration for spec authority

Do not flip this contract immediately.

```text
1. generic candidate works with current spec/activation model
2. candidate receipt qualified
3. machine-derived spec shadow-produced
4. compare against historical/current human-authored semantics
5. prove correction/rollback/new-version cases
6. only then activate machine-derived spec authority
```

Until step 6, existing spec semantics remain authoritative.

---

# R2.1-D — Consolidated LIVE_PENDING State Convergence

## 18. Normal success should end at complete LIVE_PENDING truth

A successful permanent publication should automatically converge main to the full `REAL_RELEASE_LIVE_PENDING` state.

One logical state transaction should derive/write:

```text
product-manifest production identity
validation_status = PENDING_REAL_LONG_CHAT
current_priority = release liveGate.scenarioId
CURRENT_DEVELOPMENT current release/gate
SIMCORE_GUIDELINES managed release state where applicable
per-release record = LIVE_PENDING
R machine lifecycle = REAL_RELEASE_LIVE_PENDING
machine release transaction evidence/receipt
```

No separate normal-path priority-sync command PR.
No separate normal-path LIVE_PENDING cleanup PR.

## 19. State application owner

Formalize one application-level owner, conceptually:

`release-state-converge`

Responsibilities:

```text
validate immutable publication input
observe actual production identity
calculate complete LIVE_PENDING durable payload
enforce path allowlist
idempotency / supersession checks
render living docs from machine truth
emit machine state receipt
```

Both normal post-publish and exceptional recovery must call the same owner.

## 20. State convergence idempotency

Exact replay after durable state already matches:

```text
result = ALREADY_CONVERGED
PASS
main mutation = NONE
production mutation = NONE
```

Newer/conflicting durable state:

```text
result = STATE_SUPERSEDED_OR_CONFLICTING
BLOCK
```

## 21. Recovery boundary remains strict

Publication and recovery remain separate authorities.

```text
publication may have succeeded while main state failed
```

Recovery may consume immutable publication handoff/receipt, but it must never call the publisher or mutate `release-simcore`.

## 22. State convergence permanent negatives

```text
D-N1 publication input missing
D-N2 observed production != declared C
D-N3 latest/install mismatch
D-N4 production blob mismatch
D-N5 payload escapes allowlist
D-N6 main contains newer production
D-N7 required liveGate missing
D-N8 current_priority inconsistent with liveGate
D-N9 recovery includes publication primitive
D-N10 exact replay → PASS/NOOP
D-N11 main Required missing/fail → no main mutation
D-N12 partial prior state → deterministic converge or explicit conflict
```

---

# R2.1-E — Exact Release Approval Consolidation

## 23. Goal

After B/C/D are independently qualified, consolidate the current authorization PR + activation PR into one human approval transaction without removing exact-C human approval.

Proposed path:

`products/simcore/releases/approvals/<releaseId>.json`

Minimal human-facing object:

```json
{
  "schemaVersion": 1,
  "releaseId": "simcore-v0.64.8-new-01",
  "candidateReceiptPath": "products/simcore/releases/candidate-receipts/<intentId>.json",
  "authorityConfirmation": "RS2_4_RELEASE"
}
```

The operator does not type C/P/blob.

## 24. Approval meaning

Merging the approval PR means:

> Approve publication of the exact immutable candidate identified by the referenced machine receipt under `RS2_4_RELEASE`.

Before dispatch, R must revalidate:

```text
approval first-touch / immutable
receipt exists and PASS
candidate ref still points to exact C
machine-derived spec matches request + receipt
production still == expected P
Candidate Required exact C/P PASS
```

The permanent release caller remains the only publisher.

## 25. E activation gate

Do not activate approval consolidation until:

```text
B generic candidate qualified
C receipt/spec derivation qualified
D consolidated state convergence qualified
negative proof shows approval cannot resolve or authorize a different C
NEW_VERSION / SAME_VERSION_CORRECTION / ROLLBACK remain represented correctly
```

If E is not ready, B/C/D may ship first while retaining current spec + activation split.

---

# R v2.1 Normal Operator Path

## 26. PR 1 — Product + Release Intent

Contains:

```text
design/evidence
runtime implementation or product builder
permanent regression changes
candidate request
```

After Required PASS + merge:

```text
generic candidate controller
→ candidate C
→ candidate verification
→ candidate receipt
→ machine-derived spec when activated
```

No production mutation.

## 27. PR 2 — Exact Release Approval

Contains only human approval and genuinely human-authored rationale not already present in product evidence.

After Required PASS + merge:

```text
approval resolver
→ exact receipt/spec
→ permanent caller
→ exact C/P Candidate Required
→ release-simcore P → C
→ exact production re-observation
→ release-state-converge
→ durable REAL_RELEASE_LIVE_PENDING
```

No normal-path priority-sync or cleanup PR.

## 28. PR 3 — Human LIVE_PASS Closure

After real long-chat evidence:

```text
human live evidence
→ anomaly classification
→ LIVE_PASS state convergence
→ next current priority
→ authority/cutover decisions only if separately eligible
→ documentation/long-term-memory closure
```

This remains a human-evidence gate.

---

# Stability Model

## 29. Mandatory invariants

R v2.1 acceptance requires:

```text
S1 no production write before exact Candidate Required PASS
S2 Candidate Required bound to exact C/P/verifier
S3 candidate controller cannot publish production
S4 approval adapter cannot publish directly
S5 permanent caller is sole publisher
S6 production publication fast-forward only
S7 latest == install before and after publication
S8 post-publish state cannot republish
S9 recovery cannot republish
S10 exact retries are idempotent
S11 conflicting retries fail closed
S12 main state writer remains path bounded
S13 real LIVE_PASS requires human evidence
S14 machine-generated identities cannot be manually overridden downstream
S15 documentation closure remains part of COMPLETE
```

## 30. Failure locality

Permanent reports should identify one stable failure domain:

```text
PRODUCT
CANDIDATE
PUBLICATION
STATE_CLOSURE
LIVE_VALIDATION
```

This is an observability rule, not a relaxed gate.

---

# Migration and Qualification

## 31. Stage A — cleanup

```text
retire v0.64.7 one-shot candidate workflows
CI proves historical evidence remains and active dependency is zero
```

## 32. Stage B — generic candidate shadow replay

Replay preserved v0.64.7 inputs without production mutation.

Expected historical output:

```text
C = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
```

## 33. Stage C — candidate idempotency qualification

Against the existing v0.64.7 candidate:

```text
same request → ALREADY_MATERIALIZED PASS
conflicting synthetic identity → BLOCK
```

## 34. Stage D — state convergence shadow replay

Feed preserved v0.64.7 publication/state evidence to the new convergence owner.

Against current durable truth:

```text
ALREADY_CONVERGED PASS
main mutation = NONE
release-simcore mutation = NONE
```

Historical partial-state fixtures must also prove deterministic recovery.

## 35. Stage E — approval/spec shadow

Machine-generate the historical v0.64.7 spec from request/receipt inputs and compare semantic identity with the historical immutable spec.

Then prove the proposed approval object resolves exact historical C/P without containing those fields itself.

No publish.

## 36. Stage F — next legitimate runtime release

Only after required A-E gates PASS:

```text
next legitimate SimCore runtime release
→ R v2.1 path
→ target 2 operator PRs to LIVE_PENDING
→ real operational evidence
→ human long-chat validation
→ documentation closure
```

If E is not ready but B/C/D are ready, a transitional release may safely use:

```text
product PR
→ generic candidate
→ existing authorization PR
→ existing activation PR
→ consolidated LIVE_PENDING closure
```

---

# Acceptance Metrics

## 37. Required technical metrics

```text
active version-specific candidate workflows = 0
normal candidate workflow count = 1 permanent generic controller
exact-existing candidate retry = PASS/NOOP
conflicting candidate retry = BLOCK
manual candidate SHA/blob copy = 0 in steady state
manual priority-sync PR after normal publication = 0
manual LIVE_PENDING cleanup PR after normal publication = 0
production publisher count = 1
recovery publisher count = 0
latest/install equality gate retained
human real-long-chat gate retained
```

## 38. Operator metrics

Steady-state:

```text
PR 1 product + intent
PR 2 exact approval
→ production + LIVE_PENDING
PR 3 LIVE_PASS closure
```

If a normal release without a genuinely new failure class exceeds four operator PRs, preserve the reason as new R feedback.

## 39. No fake simplification

These are explicitly forbidden:

```text
remove Candidate Required
skip exact P revalidation
allow candidate force update
publish directly from product PR
let recovery republish
remove long-chat LIVE_PASS
stop evidence recording
silently mutate docs without machine state
use manual GitHub branch protection to compensate for weaker project-owned controls
```

---

# Feedback Mapping

## 40. R-F1

`R-F1_RETIRE_06407_ONE_SHOT_CANDIDATE_WORKFLOWS`

```text
classification = FIX
owner = R2.1-A
priority = FIRST
```

## 41. R-F2

`R-F2_GENERIC_CANDIDATE_PREPARATION_AND_IDEMPOTENCY`

```text
classification = FIX
owner = R2.1-B/C
priority = HIGH
```

Owns:

```text
R_CANDIDATE_ORCHESTRATION_VERSION_SPECIFIC
CANDIDATE_RETRY_EXACT_REF_ALREADY_EXISTS
CANDIDATE_PREPARATION_OBSERVABILITY_NOT_PERMANENT
MACHINE_KNOWN_RELEASE_FACTS_REENTERED_MANUALLY (candidate side)
```

## 42. R-F3

`R-F3_CONSOLIDATE_LIVE_PENDING_DURABLE_CLOSURE`

```text
classification = FIX
owner = R2.1-D
priority = HIGH
```

Owns:

```text
LIVE_PENDING_DURABLE_CLOSURE_FRAGMENTED
MACHINE_KNOWN_RELEASE_FACTS_REENTERED_MANUALLY (state side)
```

## 43. R-F4

`R-F4_AUTHORIZATION_ACTIVATION_CONSOLIDATION_REVIEW`

```text
classification = DEFER → GATED DESIGN OBJECTIVE
owner = R2.1-E
activation = B/C/D QUALIFIED
```

## 44. R-F5

`R-F5_ACTIVATION_RUN_CORRELATION_WATCH`

```text
classification = WATCH
current behavior = RETAIN
future trigger = observed ambiguity or misbinding
```

Do not redesign polling solely for aesthetics.

---

# Design-operation findings

## 45. DESIGN_BRANCH_PREWRITE_404

During creation of this proposed design, two write attempts targeted `design/simcore-r-next-simplification` before the branch had been created.

Classification:

```text
FIX / TOOLING / PREWRITE / NON_RUNTIME
```

Impact:

```text
main mutation = NONE from these 404 attempts
release-simcore mutation = NONE
runtime mutation = NONE
```

The branch was then created explicitly before further design writes.

## 46. ACCIDENTAL_MAIN_DESIGN_PROBE_FILE

A tool-routing mistake created:

`docs/SHOULD_NOT_CREATE.tmp`

on `main` in commit:

`f962a46ce28b07b1cadf0a2e870f4b66a7a38d27`

It was immediately removed in:

`bcffa92a6914d407f437d27a46e8ad1fef8f90fc`

Classification:

```text
FIX / TOOLING / MAIN_ADMIN_ONLY / NON_RUNTIME
```

Impact:

```text
runtime mutation = NONE
release-simcore mutation = NONE
production identity mutation = NONE
residual file = NONE
```

This incident does not alter R v2.1 architecture, but remains durable evidence under the repository-first operating rule.

---

# Completion Boundary

## 47. This document is design, not activation

This proposal does not authorize production mutation.

Implementation must follow:

```text
design/evidence on repo
→ dedicated R infra branch
→ permanent static/CI
→ main merge
→ shadow/replay qualification
→ next legitimate runtime release operational proof
→ real long-chat validation
→ documentation/long-term-memory closure
```

Do not mix R v2.1 infrastructure implementation with the next runtime feature implementation.

## 48. Recommended implementation order after design approval

```text
1. R2.1-A retire v0.64.7 one-shot candidate workflows
2. R2.1-B generic candidate controller
3. R2.1-C candidate receipt + machine-spec shadow
4. R2.1-D release-state convergence
5. shadow/idempotency/recovery qualification
6. R2.1-E approval consolidation only after prior gates PASS
7. next legitimate runtime release through R v2.1
8. real feedback + documentation closure
```

Recommended first implementation work item after this design is accepted:

`R2.1-A` — separate non-runtime cleanup.
