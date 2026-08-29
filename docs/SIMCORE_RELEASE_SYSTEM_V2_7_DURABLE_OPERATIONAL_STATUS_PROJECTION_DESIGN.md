# SimCore Release System R2.7 — Durable Operational Status Projection Closure

Date: 2026-08-29 KST

Status: **DESIGN FROZEN · R2.7 CLOSURE FIX · NON_RUNTIME**

Parent design:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_EVIDENCE_DERIVED_OPERATIONS_DESIGN.md`

Primary evidence:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_V06800_FIRST_USE_OPERATIONAL_FEEDBACK_2026-08-29.md`
- `docs/SIMCORE_R2_7_OPERATIONAL_PROOF_PROJECTION_CLARIFICATION_2026-08-29.md`
- `products/simcore/tooling/release-operational-proof.mjs`
- `products/simcore/releases/records/simcore-v0.68.0-new-02.json`
- `products/simcore/releases/state-receipts/simcore-v0.68.0-new-02.json`

R2.7 implementation merge floor:
- `f01483956a8f3117852c501b17a366d77eefa1d8`

Runtime mutation: **NONE**

`release-simcore` mutation: **NONE**

## 1. Decision

R2.7 already owns canonical operational-proof derivation. The missing closure is a durable documentary projection caller.

Frozen principles:

```text
KEEP THE PROOF OWNER PURE
PROJECT DOCUMENTARY TRUTH FROM CANONICAL PROOF
ONE MAIN WRITER
EVENT-DRIVEN, NOT POLLING
IDEMPOTENT OR NO-OP
HUMAN_EVIDENCE IS OUT OF SCOPE
NO NEW AUTHORITY
```

Short form:

```text
PROVE ONCE
PROJECT DETERMINISTICALLY
WRITE THROUGH EXISTING AUTHORITY
```

## 2. Existing proof owner remains authoritative

The sole R2.7 operational-proof semantic owner remains:

```text
products/simcore/tooling/release-operational-proof.mjs
```

It validates canonical release record + state receipt identity and derives:

```text
operationallyProven = true
proofResult = PASS
authorityMutation = NONE
```

The closure MUST NOT fork or duplicate this proof logic.

## 3. Frozen target flow

```text
canonical release record + state receipt
→ release-operational-proof.mjs
→ bounded operational proof report
→ release-rsystem-status-project.mjs
→ exact R2.7 status projection
→ scripts/repo-main-write.py
→ durable origin/main reobservation
```

The projection is documentary only. It does not authorize, publish, merge, retry, or create human evidence.

## 4. First-use eligibility policy

A release is eligible to consume the R2.7 first-use gate only when all conditions hold:

```text
canonical operational proof = PASS
record.verifierCommit is descendant-or-equal to R2.7 implementation merge floor
R2.7 status activation gate is still pending
```

The status document MUST store this policy:

```text
operationalProofPolicy.mode = FIRST_GENUINE_RELEASE_AFTER_IMPLEMENTATION
operationalProofPolicy.implementationAncestor = f01483956a8f3117852c501b17a366d77eefa1d8
operationalProofPolicy.verifierRelationship = DESCENDANT_OR_EQUAL
operationalProofPolicy.consumeOnce = true
```

Version-number guessing is forbidden. Eligibility is based on immutable proof plus git ancestry.

## 5. Projection owner

Frozen owner:

```text
products/simcore/tooling/release-rsystem-status-project.mjs
```

Allowed capabilities:

```text
read one R-system status JSON
read one operational proof report
read the matching canonical release record
validate local git ancestry
produce one projected R-system status JSON
produce one bounded projection report
```

Forbidden capabilities:

```text
release-simcore publication
release approval
PR merge
main push
direct network mutation
HUMAN_EVIDENCE creation
product LIVE_PASS promotion
Permanent dispatch/retry
background polling
```

## 6. Projection semantics

For the first eligible proof, only the following documentary fields may converge:

```text
status = OPERATIONALLY_PROVEN_FIRST_USE_COMPLETE
activationAuthorized = true
activationFieldSemantics = DOCUMENTARY_FIRST_USE_GATE_CONSUMED
activationGate = CONSUMED_BY_FIRST_GENUINE_R2_7_RELEASE
operationallyProven = true
implementation.operationalActivationProof = exact immutable proof object
```

The immutable proof object MUST contain:

```text
releaseId
publisherRunId
releaseRecord
stateReceipt
productionCommit
previousProductionCommit
productionBlob
verifierCommit
result = PASS
```

The following status facts MUST remain preserved:

```text
designAuthorized
designFrozen
implementationAuthorized
implementationVerified
preservedAuthorities
complexityBudget
runtimeMutation = NONE
releaseSimcoreMutation = NONE
```

Historical closure documents are not rewritten.

## 7. Idempotency and contradiction rules

```text
pending + first eligible proof
→ PROJECT

already proven + exact same proof
→ NO_OP_ALREADY_DURABLE

already proven + later unrelated valid release
→ NO_OP_GATE_ALREADY_CONSUMED

already proven + contradictory stored first-use proof
→ FAIL_CLOSED

proof invalid / noncanonical
→ FAIL_CLOSED

verifier predates implementation ancestor
→ NO_PROJECTION_NOT_ELIGIBLE
```

No later release may replace the first-use proof.

## 8. Trigger model

Preferred durable caller is an event-driven workflow on `main` changes to canonical release evidence:

```text
push:
  branches: [main]
  paths:
    - products/simcore/releases/records/**
    - products/simcore/releases/state-receipts/**
```

The caller exits cleanly when no complete matching record/receipt pair requires projection.

Forbidden:

```text
schedule
daemon
standing polling
background retry loop
new release gate
new required release job
```

## 9. Main-write boundary

Durable status mutation MUST route through the existing repository authority:

```text
scripts/repo-main-write.py
```

The caller may allow only:

```text
products/simcore/releases/R_V2_7_EVIDENCE_DERIVED_OPERATIONS_STATUS.json
```

Direct main push remains forbidden.

After gateway success, the caller MUST fetch/reobserve `origin/main` and require exact projected content equality.

`release-state-main-gate.mjs` is not broadened. Product post-publish payload ownership and R-system documentary projection remain separate boundaries.

## 10. Failure semantics

A projection failure after a valid product release is administrative only:

```text
R2_7_DURABLE_STATUS_PROJECTION_FAIL
= FIX · CONTROL_PLANE · NON_RUNTIME
```

It MUST NOT trigger:

```text
runtime republish
production rollback
LIVE_PENDING invalidation
HUMAN_EVIDENCE creation
```

Recovery is a fresh idempotent projection attempt through the same main gateway after the defect is corrected.

## 11. Regression requirements

Positive:

```text
v0.68 canonical record + receipt → existing operational proof PASS
R2.7 implementation ancestor → verifier ancestry PASS
pending status → deterministic first-use projection
same proof twice → idempotent no-op
later release after consumed gate → first-use proof unchanged
```

Negative:

```text
noncanonical proof rejected by existing proof owner
pre-implementation verifier → not eligible
contradictory stored first-use proof → fail closed
projection cannot touch product LIVE_PASS/HUMAN_EVIDENCE
projection owner contains no publish/merge/push/dispatch primitives
gateway path is the only durable main-write route
```

## 12. Complexity budget

```text
new proof owners                0
new main writers                0
new publishers                  0
new product lifecycle states    0
new required release jobs       0
new clean-path PRs              0
background polling/retry        0
new bounded projection owner    1
operator status edits           remove
```

## 13. Separation from R2.8

```text
R2.7 closure = proof → documentary R-system status
R2.8         = deterministic approval packaging / approval-boundary completion
```

These MUST remain separate implementation transactions.

## 14. Frozen verdict

```text
R2_7_EXISTING_PROOF_OWNER = KEEP
R2_7_DURABLE_PROJECTION = ADD MISSING CALLER
ELIGIBILITY = IMPLEMENTATION_ANCESTRY + CANONICAL_PROOF
TRIGGER = EVENT_DRIVEN_MAIN_EVIDENCE
MAIN_WRITE = EXISTING repo-main-write.py ONLY
HUMAN_EVIDENCE_AUTOMATION = FORBIDDEN
PRODUCT_LIVE_PASS_AUTOMATION = FORBIDDEN
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
DESIGN_FROZEN = YES
```