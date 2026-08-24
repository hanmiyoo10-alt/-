# SimCore Release System v2.1 — Simplified Stable Release Transactions

Date: 2026-08-25
Status: **PROPOSED DESIGN · FEEDBACK-DERIVED · NON-RUNTIME**
Scope: next R hardening after the first genuine R-driven SimCore release
Parent evidence:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_FIRST_REAL_RELEASE_RETROSPECTIVE.md`
- `products/simcore/releases/R_FIRST_REAL_RELEASE_FEEDBACK_STATUS.json`

## 1. Objective

R v2.1 simplifies the **operator path**, not the safety model.

Steady-state target:

```text
PR 1 — product + release intent
→ generic candidate materialization
→ permanent candidate verification
→ machine candidate receipt / machine release spec

PR 2 — exact release approval
→ permanent caller
→ exact C/P Candidate Required
→ release-simcore publication
→ automatic REAL_RELEASE_LIVE_PENDING durable closure

human real long-chat validation

PR 3 — LIVE_PASS evidence closure
→ main state / long-term-memory closure
```

Targets:

```text
to production LIVE_PENDING: 2 operator PRs
through LIVE_PASS closure: 3 operator PRs
manual re-entry of machine-known identity fields: 0
```

## 2. Safety invariants that are not negotiable

```text
release-simcore remains runtime/deployment authority
main remains design/evidence/state/admin authority
latest.js == install.js for production
candidate C exact and immutable
expected production parent P exact
Candidate Required bound to exact C/P/verifier
single permanent production publisher
fast-forward-only production write
no force publication
candidate controller cannot publish production
approval adapter cannot publish production
post-publish recovery cannot republish production
real long-chat LIVE_PASS remains human-evidence-gated
no manual GitHub platform enforcement dependency
no runtime feature mixed into R infrastructure work
documentation/long-term-memory closure required before COMPLETE
```

## 3. Feedback mapped into v2.1

Immediate FIX owners:

```text
R_CANDIDATE_ORCHESTRATION_VERSION_SPECIFIC         → R2.1-B
CANDIDATE_RETRY_EXACT_REF_ALREADY_EXISTS          → R2.1-B
06407_CANDIDATE_ONE_SHOT_WORKFLOWS_STILL_ACTIVE   → R2.1-A
CANDIDATE_PREPARATION_OBSERVABILITY_NOT_PERMANENT → R2.1-B
LIVE_PENDING_DURABLE_CLOSURE_FRAGMENTED           → R2.1-D
MACHINE_KNOWN_RELEASE_FACTS_REENTERED_MANUALLY    → R2.1-C/D
```

Gated simplification:

```text
RELEASE_AUTHORIZATION_ACTIVATION_DOUBLE_PR
→ R2.1-E
→ only after B/C/D independently qualify
```

Retained as evidence-driven WATCH/DEFER:

```text
PERMANENT_ACTIVATION_RUN_DISCOVERY_POLLING        WATCH
CANDIDATE_TRANSPORT_REF_RETIREMENT                 DEFER
GITHUB_ACTIONS_NODE20_TARGET_FORCED_NODE24         WATCH
```

## 4. Core operating rules

### 4.1 Machine-known facts are written by machines

The operator must not manually copy values already produced by R:

```text
candidate commit
candidate blob
expected production commit
candidate ref
verifier commit
verification report digest
publisher run id
state-sync run id
publication disposition
LIVE_PENDING current priority
```

Human input remains product intent, exact release approval, and real-live evidence.

### 4.2 Idempotency is a first-class contract

Every permanent transaction distinguishes:

```text
NOT_STARTED
ALREADY_COMPLETED_EXACTLY
CONFLICTING_PRIOR_IDENTITY
```

Exact repeats become `NOOP/PASS`; conflicts remain fail-closed.

### 4.3 Operator steps may shrink while internal gates remain rich

R may still run several internal jobs, checks, artifacts, or bot commits. The simplification metric is duplicated operator decisions and manual PR transactions.

---

# 5. R2.1 hardening units

```text
R2.1-A — one-shot candidate workflow retirement
R2.1-B — generic candidate controller + idempotency
R2.1-C — machine candidate receipt + machine-derived release spec
R2.1-D — consolidated LIVE_PENDING state convergence
R2.1-E — exact release approval consolidation
```

R2.1-E is not active until B/C/D are qualified.

---

# 6. R2.1-A — One-shot retirement

Retire before the next runtime release:

```text
.github/workflows/product-simcore-06407-candidate-prep.yml
.github/workflows/product-simcore-06407-candidate-prep-observable.yml
```

Keep historical evidence, builder, candidate evidence, release spec, activation records and release record.

Acceptance:

```text
active v0.64.7-specific candidate workflows = 0
historical evidence preserved
v0.64.7 production unchanged
release-simcore unchanged
permanent CI proves no live control depends on retired workflows
```

---

# 7. R2.1-B — Generic Candidate Controller

Proposed permanent workflow:

`.github/workflows/simcore-candidate-materialize.yml`

Proposed application owner:

`products/simcore/tooling/candidate-materialize.mjs`

Input:

`products/simcore/releases/candidate-requests/<intentId>.json`

The request contains product/release intent, not the resulting C.

Representative request:

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

Frozen authority split:

```text
candidate request = human/product intent
candidate receipt = machine-observed candidate identity
```

## 7.1 Immutable source binding

Bind:

```text
P = expected production commit
S = immutable product source commit
builder = S:builderPath
verifier = explicit immutable verifier commit
```

Preconditions:

```text
release-simcore == P
latest(P) == install(P)
S exists
builder exists at S
builder path inside approved SimCore tooling namespace
target version/release mode valid
```

## 7.2 Materialization sequence

```text
checkout exact P
→ load exact builder from S
→ execute builder
→ latest == install
→ syntax/static checks
→ enforce runtime-path allowlist
→ run permanent candidate suites
→ create direct-child C of P
→ verify parent(C) == P
→ verify latest/install blob equality at C
→ materialize candidate transport
→ emit candidate report + receipt
```

No `release-simcore` write primitive is allowed in the candidate controller.

## 7.3 Candidate idempotency

Canonical ref proposal:

`candidate/simcore/<intentId>`

Rules:

```text
ref absent
→ create exact C
→ CREATED / PASS

ref exists + head == recomputed C + parent/blob/request all exact
→ ALREADY_MATERIALIZED / PASS
→ no mutation

ref exists but identity differs
→ CANDIDATE_REF_CONFLICT / BLOCK
```

Force updates are forbidden.

## 7.4 Permanent observability

No version-specific observable wrapper.

Every run emits:

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

## 7.5 Permanent negative coverage

```text
B-N1 invalid request
B-N2 production P moved
B-N3 source commit missing
B-N4 builder outside allowlist
B-N5 builder missing
B-N6 unauthorized runtime path
B-N7 latest/install divergence
B-N8 syntax failure
B-N9 candidate suite failure
B-N10 C not direct child P
B-N11 exact-existing candidate → PASS/NOOP
B-N12 conflicting-existing candidate → BLOCK
B-N13 force-update primitive → BLOCK
B-N14 production publication primitive → BLOCK
```

---

# 8. R2.1-C — Candidate Receipt + Machine Release Spec

After candidate PASS, R writes a bounded candidate receipt to main through the project-owned gateway.

Proposed path:

`products/simcore/releases/candidate-receipts/<intentId>.json`

Representative receipt:

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

The receipt owns machine truth for C/P/blob/ref/verifier/report identity.

## 8.1 Machine-derived release spec

Preferred steady-state:

```text
candidate request + candidate receipt
→ immutable machine-derived release spec
```

Derived fields include:

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

The spec becomes a machine transaction document. Human authorization moves to R2.1-E.

## 8.2 Migration safety

Do not switch spec authority immediately.

```text
1. generic candidate works with current spec/activation model
2. candidate receipt qualifies
3. machine spec shadow-produced
4. semantic equality compared with historical/current spec
5. NEW_VERSION / SAME_VERSION_CORRECTION / ROLLBACK proofs pass
6. only then activate machine-derived spec authority
```

Until step 6, current spec semantics remain authoritative.

---

# 9. R2.1-D — Consolidated LIVE_PENDING State Convergence

Successful publication should end with complete durable `REAL_RELEASE_LIVE_PENDING` truth automatically.

One logical state transaction derives/writes:

```text
product-manifest production identity
validation_status = PENDING_REAL_LONG_CHAT
current_priority = release liveGate.scenarioId
CURRENT_DEVELOPMENT current release/gate
SIMCORE_GUIDELINES managed release state where applicable
per-release record = LIVE_PENDING
R current lifecycle = REAL_RELEASE_LIVE_PENDING
machine release transaction evidence/receipt
```

Normal success requires:

```text
separate priority-sync PR = 0
separate LIVE_PENDING cleanup PR = 0
manual re-entry of run/commit/blob data = 0
```

## 9.1 Shared application owner

Formalize one application-level owner, conceptually:

`release-state-converge`

Responsibilities:

```text
validate immutable publication input
observe actual production identity
calculate complete LIVE_PENDING payload
enforce path allowlist
idempotency/supersession checks
render living docs from machine truth
emit machine state receipt
```

Both normal post-publish and exceptional recovery call this same owner.

## 9.2 Idempotency

```text
exact durable state already present
→ ALREADY_CONVERGED / PASS
→ main mutation NONE
→ production mutation NONE

newer or conflicting durable state
→ STATE_SUPERSEDED_OR_CONFLICTING / BLOCK
```

## 9.3 Recovery boundary

Recovery may replay immutable publication evidence but must never call the publisher or mutate `release-simcore`.

Permanent negatives:

```text
D-N1 publication input missing
D-N2 observed production != declared C
D-N3 latest/install mismatch
D-N4 production blob mismatch
D-N5 payload escapes allowlist
D-N6 main contains newer production
D-N7 required liveGate missing
D-N8 current_priority inconsistent with liveGate
D-N9 recovery contains publication primitive
D-N10 exact replay → PASS/NOOP
D-N11 Required fail → no main mutation
D-N12 partial prior state → deterministic converge or explicit conflict
```

---

# 10. R2.1-E — Exact Release Approval Consolidation

Only after B/C/D qualify, consolidate the current authorization PR + activation PR into one exact human approval transaction.

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

The human does not type C/P/blob.

Merging the approval PR means:

> Approve publication of the exact immutable candidate identified by the referenced machine receipt under `RS2_4_RELEASE`.

Before dispatch, R revalidates:

```text
approval first-touch / immutable
receipt exists and PASS
candidate ref still exact C
machine spec matches request + receipt
production still exact P
Candidate Required exact C/P PASS
```

The permanent release caller remains the sole publisher.

Activation gate for E:

```text
B qualified
C qualified
D qualified
negative proof: approval cannot resolve another C
NEW_VERSION/CORRECTION/ROLLBACK representation proven
```

If E is not ready, ship B/C/D first and retain current spec + activation split.

---

# 11. Normal v2.1 operator path

## PR 1 — Product + Release Intent

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
→ C
→ permanent candidate verification
→ candidate receipt
→ machine spec when activated
```

No production mutation.

## PR 2 — Exact Release Approval

After Required PASS + merge:

```text
approval resolver
→ exact receipt/spec
→ permanent caller
→ exact C/P Candidate Required
→ release-simcore P→C
→ exact production re-observation
→ release-state-converge
→ durable REAL_RELEASE_LIVE_PENDING
```

No normal-path priority-sync/cleanup PR.

## PR 3 — Human LIVE_PASS Closure

After real long-chat evidence:

```text
human live evidence
→ anomaly classification
→ LIVE_PASS convergence
→ next current priority
→ authority/cutover decision only if separately eligible
→ documentation/long-term-memory closure
```

---

# 12. Stability acceptance

Mandatory invariants:

```text
S1 no production write before exact Candidate Required PASS
S2 Candidate Required exact C/P/verifier binding
S3 candidate controller cannot publish
S4 approval adapter cannot publish
S5 permanent caller is sole publisher
S6 fast-forward-only production
S7 latest == install before/after publication
S8 post-publish state cannot republish
S9 recovery cannot republish
S10 exact retries idempotent
S11 conflicts fail closed
S12 main writer path bounded
S13 LIVE_PASS requires human evidence
S14 machine identities not manually overridden downstream
S15 documentation closure required for COMPLETE
```

Permanent reports should expose stable failure domains:

```text
PRODUCT
CANDIDATE
PUBLICATION
STATE_CLOSURE
LIVE_VALIDATION
```

---

# 13. Migration qualification

## Stage A — cleanup

Retire v0.64.7 candidate one-shot workflows.

## Stage B — historical generic-candidate replay

Replay preserved v0.64.7 inputs without mutation.

Expected:

```text
C = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
```

## Stage C — idempotency proof

```text
same preserved v0.64.7 candidate → ALREADY_MATERIALIZED PASS
conflicting synthetic candidate → BLOCK
```

## Stage D — historical state convergence replay

Against current v0.64.7 durable truth:

```text
ALREADY_CONVERGED PASS
main mutation NONE
release-simcore mutation NONE
```

Also replay partial-state fixtures.

## Stage E — machine spec / approval shadow

Generate historical v0.64.7 spec semantically from request/receipt and prove proposed approval resolves exact C/P without embedding them manually.

No publish.

## Stage F — next legitimate runtime release

Only after required qualification:

```text
next legitimate SimCore runtime release through R v2.1
→ target 2 operator PRs to LIVE_PENDING
→ real operational evidence
→ real long-chat validation
→ documentation closure
```

Transitional safe path if E is not ready:

```text
product PR
→ generic candidate
→ existing authorization PR
→ existing activation PR
→ consolidated LIVE_PENDING closure
```

---

# 14. Acceptance metrics

```text
active version-specific candidate workflows = 0
normal candidate workflow count = 1
generic exact-existing retry = PASS/NOOP
generic conflicting retry = BLOCK
manual candidate SHA/blob copy = 0 steady-state
manual priority-sync PR after normal publish = 0
manual LIVE_PENDING cleanup PR after normal publish = 0
production publisher count = 1
recovery publisher count = 0
latest/install equality gate retained
human long-chat gate retained
```

A normal release without a genuinely new failure class requiring more than four operator PRs must generate new R feedback evidence.

Forbidden fake simplification:

```text
remove Candidate Required
skip P revalidation
allow force candidate update
publish directly from product PR
let recovery republish
remove live validation
stop evidence recording
weaken project-owned controls and compensate with manual GitHub governance
```

---

# 15. Implementation order

After design approval:

```text
1. R2.1-A retire v0.64.7 one-shot candidate workflows
2. R2.1-B generic candidate controller
3. R2.1-C candidate receipt + machine-spec shadow
4. R2.1-D release-state convergence
5. full replay/idempotency/recovery qualification
6. R2.1-E approval consolidation only after prior gates PASS
7. next legitimate runtime release through R v2.1
8. real feedback + documentation closure
```

Do not mix these R infrastructure changes with the next runtime feature implementation.

---

# 16. Design-operation findings

## DESIGN_BRANCH_PREWRITE_404

Two design-write attempts targeted the intended design branch before it existed.

```text
FIX / TOOLING / PREWRITE / NON_RUNTIME
main mutation NONE from the 404 attempts
release-simcore mutation NONE
```

## ACCIDENTAL_MAIN_DESIGN_PROBE_FILE

A tool-routing mistake created `docs/SHOULD_NOT_CREATE.tmp` on main in:

`f962a46ce28b07b1cadf0a2e870f4b66a7a38d27`

It was immediately removed in:

`bcffa92a6914d407f437d27a46e8ad1fef8f90fc`

Classification:

```text
FIX / TOOLING / MAIN_ADMIN_ONLY / NON_RUNTIME
```

Final impact:

```text
runtime mutation NONE
release-simcore mutation NONE
production identity mutation NONE
residual file NONE
```

The initial design branch later became behind current main because unrelated repository work advanced main. The proposed design was therefore reconstructed from the latest main rather than merging an outdated base.

---

# 17. Completion boundary

This document is a proposal, not implementation authorization.

Current product gate remains:

`06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT`

R v2.1 design work must not alter v0.64.7 production or claim LIVE_PASS.

Recommended first implementation item after explicit design acceptance:

`R2.1-A_ONE_SHOT_RETIREMENT`
