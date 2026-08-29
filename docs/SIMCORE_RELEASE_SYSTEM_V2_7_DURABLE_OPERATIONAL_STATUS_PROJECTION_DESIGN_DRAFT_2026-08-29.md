# SimCore Release System R2.7 — Durable Operational Status Projection Closure Draft

Date: 2026-08-29 KST

Status: **DRAFT · NOT FROZEN · R2.7 CLOSURE FIX · NON_RUNTIME · NO IMPLEMENTATION AUTHORIZATION**

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

R2.7 already implemented the dangerous and semantically important half of evidence-derived status: canonical operational proof validation and derivation.

The remaining defect is a missing durable projection caller.

R2.7 closure should therefore finish the original R2.7-A / R2.7-E intent without creating a new proof engine or a second main writer.

Canonical closure principles:

```text
KEEP THE PROOF OWNER PURE
PROJECT DOCUMENTARY TRUTH FROM CANONICAL PROOF
ONE MAIN WRITER
EVENT-DRIVEN, NOT POLLING
IDEMPOTENT OR NO-OP
HUMAN EVIDENCE IS OUT OF SCOPE
```

Short form:

```text
PROVE ONCE
PROJECT DETERMINISTICALLY
WRITE THROUGH EXISTING AUTHORITY
```

## 2. Existing owner remains authoritative

The existing owner remains:

```text
products/simcore/tooling/release-operational-proof.mjs
```

It already validates canonical record/receipt identity and derives:

```text
operationallyProven = true
proofResult = PASS
authorityMutation = NONE
```

Do not replace, fork, or duplicate this owner.

## 3. Missing layer

Current behavior:

```text
canonical release record + state receipt
→ release-operational-proof.mjs
→ PASS / operationallyProven=true
→ operator remembers to edit R-system status
```

Target behavior:

```text
canonical release record + state receipt
→ release-operational-proof.mjs
→ deterministic R-system status projection
→ scripts/repo-main-write.py
→ durable main reobservation
```

The projection is documentary only. It does not authorize a release.

## 4. Eligibility policy must be evidence-bound

A release proves R2.7 first use only if the release was verified by a control-plane commit that contains the R2.7 implementation.

Preferred policy stored in the R2.7 status itself:

```text
operationalProofPolicy.mode = FIRST_GENUINE_RELEASE_AFTER_IMPLEMENTATION
operationalProofPolicy.implementationAncestor = f01483956a8f3117852c501b17a366d77eefa1d8
operationalProofPolicy.verifierRelationship = DESCENDANT_OR_EQUAL
operationalProofPolicy.consumeOnce = true
```

Eligibility therefore requires:

```text
canonical operational proof PASS
+ record.verifierCommit is descendant-or-equal to implementationAncestor
+ status activation gate is still pending
```

This avoids version-number guessing and avoids operator memory about which later product release exercised R2.7.

For v0.68 the canonical record contains verifier commit `88b932f8ecfc89df4be53a4a92d61cfa11d9e0e3`; implementation ancestry is a deterministic git-history fact to validate during projection.

## 5. Projection owner

Preferred bounded owner:

```text
products/simcore/tooling/release-rsystem-status-project.mjs
```

This owner may:

```text
read one R-system status JSON
read one already-derived operational proof report
read the matching canonical release record
validate implementation ancestry from local git history
produce one projected R-system status JSON
produce one bounded projection report
```

It must not:

```text
publish release-simcore
approve a release
merge a PR
push main directly
create HUMAN_EVIDENCE
promote product LIVE_PASS
retry or dispatch Permanent Release
perform background polling
```

## 6. Deterministic R2.7 projection

On the first eligible proof, project only documentary R2.7 fields:

```text
status = OPERATIONALLY_PROVEN_FIRST_USE_COMPLETE
activationAuthorized = true
activationFieldSemantics = DOCUMENTARY_FIRST_USE_GATE_CONSUMED
activationGate = CONSUMED_BY_FIRST_GENUINE_R2_7_RELEASE
operationallyProven = true
implementation.operationalActivationProof = exact immutable proof object
```

The proof object should contain at least:

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

Historical implementation closure documents remain historical and are not rewritten.

## 7. Idempotency / contradiction rules

Required behavior:

```text
pending + first eligible proof
→ PROJECT

already proven + exact same proof
→ NO_OP_ALREADY_DURABLE

already proven + later unrelated release
→ NO_OP_GATE_ALREADY_CONSUMED

already proven + contradictory stored proof
→ FAIL_CLOSED

proof invalid / noncanonical / pre-implementation verifier
→ NO_PROJECTION / FAIL_CLOSED AS APPROPRIATE
```

No later release may silently replace the first-use proof.

## 8. Trigger model

Preferred trigger is event-driven after canonical release evidence becomes durable on `main`.

Directional trigger:

```text
push to main
paths:
  products/simcore/releases/records/**
  products/simcore/releases/state-receipts/**
```

The caller should exit cleanly until both matching canonical artifacts exist.

No schedule, daemon, polling loop, or standing retry process is permitted.

The projection workflow is not a new release gate and must not become a prerequisite for Permanent publication or product LIVE_PENDING.

## 9. Main write boundary

Durable mutation must use the existing authority:

```text
scripts/repo-main-write.py
```

The caller may allow only the exact R-system status path being projected.

Direct push to main remains forbidden for the automation path.

After the gateway succeeds, the caller must fetch/reobserve `origin/main` and confirm the durable status content equals the projected content.

The existing R2.6 `release-state-main-gate.mjs` remains the owner for post-publish product-state payloads and should not be broadened merely to carry R-system documentary status. This closure must not mix product-state envelope semantics with release-system admin projection.

## 10. Failure semantics

Projection failure after a valid product release is administrative, not a production rollback signal.

Classify:

```text
R2_7_DURABLE_STATUS_PROJECTION_FAIL
= FIX · CONTROL_PLANE · NON_RUNTIME
```

A projection failure must not:

```text
republish runtime
rollback production
invalidate an already-valid LIVE_PENDING release
create HUMAN_EVIDENCE
```

Recovery is retry of the idempotent projection through the same main gateway after the defect is fixed.

## 11. Regression targets

Positive:

```text
v0.68 canonical record + receipt -> operational proof PASS
R2.7 implementation ancestor -> verifier ancestry PASS
pending R2.7 status -> deterministic first-use proven projection
same input twice -> idempotent no-op
later release after consumed gate -> no proof replacement
```

Negative:

```text
noncanonical record/receipt rejected by existing proof owner
verifier predating R2.7 implementation rejected for first-use eligibility
contradictory previously stored proof fails closed
projection cannot touch product LIVE_PASS or HUMAN_EVIDENCE
projection owner contains no publication / merge / push / dispatch primitives
main durable write uses repo-main-write.py only
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

The new projection owner is justified only because it removes recurring documentary edits while reusing the existing proof owner and main writer.

## 13. Separation from R2.8

This closure must complete before R2.8 implementation.

R2.8 must not carry R2.7 status debt inside its approval-boundary work.

```text
R2.7 closure = proof -> documentary status automation
R2.8         = approval transaction simplicity / automation
```

## 14. Draft verdict

```text
R2_7_EXISTING_PROOF_OWNER = KEEP
R2_7_DURABLE_PROJECTION = ADD MISSING CALLER
ELIGIBILITY = CONTROL_PLANE_IMPLEMENTATION_ANCESTRY + CANONICAL PROOF
TRIGGER = EVENT_DRIVEN_MAIN_EVIDENCE
MAIN_WRITE = EXISTING repo-main-write.py ONLY
HUMAN_EVIDENCE_AUTOMATION = FORBIDDEN
PRODUCT_LIVE_PASS_AUTOMATION = FORBIDDEN
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
DESIGN_FROZEN = NO
IMPLEMENTATION_AUTHORIZED = NO
```
