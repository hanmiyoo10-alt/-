# SYS-22 — Test Intent Manifest — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · REVIEWED TEST-INTENT AUTHORITY · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-22
Idea          = Test Intent Manifest
Size          = MEDIUM
Importance    = 5 / VERY HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS17_MISSING_EVIDENCE_SLOT_ANALYZER_DESIGN.md`
- `products/simcore/tests/registry.mjs`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
- `docs/SIMCORE_SUMMARY_SCOPE_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`
- `docs/SIMCORE_NR_DIFFICULTY3_HARVEST_VERIFICATION_WATCH_2026-08-26.md`

Existing authorities SYS-22 must not replace:
- permanent test registry and harness execution authority;
- individual frozen fixture/test designs;
- actual test/CI run evidence;
- SYS-13 proof-kind × claim-kind scope rules;
- SYS-17 required evidence-slot completeness;
- live-evidence and anomaly authorities.

---

## 1. Problem

SimCore now has a permanent regression portfolio, focused standalone tooling tests, architecture/static checks, and multiple evidence layers.

The executable permanent registry currently records operational facts such as:

```text
id
suite module
fixtureDir
coverage
required
goldenGate
```

That is the correct harness concern. It does not answer the semantic questions:

```text
What exact contract is this test intended to protect?
Which owner/authority defines that contract?
Which SYS-13 claim kinds may a successful execution support?
What must this test explicitly NOT be used to claim?
Which evidence maturity boundary remains outside the test?
```

Without a durable test-intent authority, a green test can gradually accumulate claims it was never designed to prove.

Examples of invalid expansion include:

```text
summary-scope fixture PASS
→ therefore rendered natural annual-summary semantics are live-proven

release-approval fixture PASS
→ therefore the delegated release path has genuine release E2E proof

focused tooling test exists
→ therefore permanent CI executed it

fixture is goldenGate=true
→ therefore LIVE_GOLDEN_ESTABLISHED
```

SYS-22 defines a reviewed manifest that records what each selected test surface means and, equally importantly, what it does not mean.

---

## 2. Core invariant

```text
test surface identity
+ frozen semantic authority
+ explicit intended claims
+ explicit non-claims
→ reviewed test intent

TEST INTENT
!= test execution evidence
!= fixture registration authority
!= CI discovery/routing authority
!= evidence-slot completion
!= live validation
!= release authorization
```

Canonical rule:

> A test may prove only the contract/claim scope its intent row declares, and only after an appropriate execution proof exists.

Therefore:

```text
intent row exists
!= test passed

test passed
!= every related behavior is proven
```

---

## 3. Why v1 is `NR_DOC_ONLY`

The useful v1 implementation is a curated reviewed repository-memory artifact.

Preferred future materialization:

```text
docs/SIMCORE_TEST_INTENT_MANIFEST.md
```

Optionally, the same reviewed rows may later be mirrored into a non-executable JSON data file only if a separate consumer requires it. That would not by itself change the v1 semantic authority.

SYS-22 v1 does **not** require:

```text
harness changes
registry.mjs changes
new fixture schema
new test runner
CI wiring
GitHub Action
repo scanner
auto-generated intent inference
automatic proof promotion
```

It is therefore `NR_DOC_ONLY` at freeze.

If a future executable checker or permanent harness enforcement consumes the manifest, that is a separate implementation/integration decision and must be reclassified for the relevant executable/protected authority boundary.

---

## 4. Constitutional boundary with the permanent registry

Current permanent registry owns executable membership and harness policy fields.

Conceptually:

```text
products/simcore/tests/registry.mjs
= WHAT permanent suite exists and how the harness treats it

SYS-22 Test Intent Manifest
= WHY the test exists and WHICH semantic/proof claims it is allowed to support
```

SYS-22 must not duplicate mutable operational values merely for convenience.

Preferred row form:

```text
Test ID: summary-scope
Registry authority: products/simcore/tests/registry.mjs#summary-scope
```

rather than copying `required=true`, `goldenGate=true`, or current coverage state into a second authority.

If the permanent registry changes, operational truth comes from the registry. If the semantic contract changes, the individual frozen contract/test authority must change first, then the intent row is reviewed.

---

## 5. Constitutional boundary with SYS-13

SYS-13 owns general proof fitness:

```text
proof kind × claim kind
→ DIRECT / CONDITIONAL / SUPPORTING / NONE
```

SYS-22 does not rewrite that matrix.

Instead each intent row selects the bounded claim kinds relevant to the specific test.

Example:

```text
Test: summary-scope
Execution proof kind: PK-03 PERMANENT_REGRESSION_HARNESS
Intended claim: CK-02 NAMED_DETERMINISTIC_CONTRACT_PASSED
Registered-suite execution may support: CK-04 REGISTERED_PERMANENT_SUITE_PASSED
Explicit non-claim: CK-10 NAMED_NATURAL_LIVE_CONTROL_PASSED
```

If an intent row conflicts with SYS-13 proof fitness, SYS-13 wins and the row is stale/invalid.

---

## 6. Constitutional boundary with SYS-17

SYS-17 answers:

```text
for a selected scope,
which explicitly registered required evidence slots are missing?
```

SYS-22 answers:

```text
for a selected test,
what is that test intended to prove and not prove?
```

A test-intent row does not create an evidence requirement by itself.

Likewise a SYS-17 slot may require a live proof even when a deterministic fixture exists and passes.

Therefore:

```text
TEST_INTENT_DEFINED
!= EVIDENCE_SLOT_SATISFIED
```

---

## 7. v1 test-surface scope

SYS-22 v1 supports two curated surface kinds.

```text
PERMANENT_SUITE
FOCUSED_STANDALONE_TEST
```

### `PERMANENT_SUITE`

Every suite registered in `products/simcore/tests/registry.mjs` is eligible and should eventually have one intent row.

Current registry includes families such as:

```text
representation-fast
genuine-edit
community-reaction
summary-scope
narrative-clock
frame
broadcast-closure
diagnostic-copy
reload-cache-continuity
candidate-materialize
candidate-receipt
release-approval
```

The manifest does not change their current registry membership or execution class.

### `FOCUSED_STANDALONE_TEST`

Curated repository-local tests that are intentionally meaningful but not necessarily discovered by permanent CI may receive rows.

Examples include focused tooling tests created for existing NON_RUNTIME implementations.

Presence in SYS-22 does not imply permanent-CI execution. Current `NOT_CLAIMED` verification WATCH semantics remain valid until a bound execution proof exists.

### Explicitly outside v1

```text
ad hoc one-off shell commands
arbitrary manual inspection
all repository files matching *.test.*
LLM-generated tests not curated into an authority
natural live chat specimens
GitHub workflow jobs as if they were semantic tests
```

Do not crawl the repository and auto-register test intent.

---

## 8. Frozen v1 row schema

Every row contains exactly these semantic fields.

```text
testId
surfaceKind
surfaceAuthorityRef
semanticOwner
contractAuthorityRefs[]
intentSummary
executionProofKind
intendedClaimKinds[]
protectedBehaviors[]
explicitNonClaims[]
requiredInputsOrFixtures[]
negativeControlRefs[]
evidenceMaturityBoundary
reviewTriggers[]
notes
```

### `testId`

Stable selected test/suite identifier.

For a permanent suite, reuse the permanent registry ID.

### `surfaceKind`

```text
PERMANENT_SUITE
FOCUSED_STANDALONE_TEST
```

### `surfaceAuthorityRef`

Physical source/registry reference establishing which test surface the row describes.

### `semanticOwner`

The subsystem/authority responsible for the behavior being protected. This is not inferred from the suite filename.

### `contractAuthorityRefs[]`

Frozen design/contract/evidence documents that define the intended behavior.

### `intentSummary`

One bounded human-readable sentence describing the test's primary reason to exist.

### `executionProofKind`

Normally one of:

```text
PK-02 FOCUSED_DETERMINISTIC_TEST
PK-03 PERMANENT_REGRESSION_HARNESS
```

as defined by SYS-13.

### `intendedClaimKinds[]`

Only SYS-13 claim kinds that a valid execution can directly/conditionally support for this particular test.

### `protectedBehaviors[]`

Named contract-level behaviors/cases the test is intentionally preserving.

Do not paste implementation algorithms into this field.

### `explicitNonClaims[]`

Mandatory field. Lists tempting but invalid conclusions that must not be drawn from a successful execution.

At least one non-claim is required for every row.

### `requiredInputsOrFixtures[]`

Named deterministic fixture/input identities required to interpret the test result.

### `negativeControlRefs[]`

References to explicit negative controls when they already exist. SYS-22 does not create the future SYS-23 Negative-Control Registry.

### `evidenceMaturityBoundary`

Human-readable boundary such as:

```text
DETERMINISTIC_ONLY
DOES_NOT_ESTABLISH_NATURAL_LIVE
DOES_NOT_ESTABLISH_RELEASE_E2E
FOCUSED_EXECUTION_DOES_NOT_IMPLY_CI_DISCOVERY
```

This field does not replace existing evidence status authorities.

### `reviewTriggers[]`

Events requiring row review, for example:

```text
semantic owner changes
frozen contract changes
suite primary assertions materially change
fixture family meaning changes
SYS-13 claim/proof vocabulary changes
registry ID is replaced/superseded
```

---

## 9. Mandatory non-claim discipline

Every intent row must explicitly state what a PASS does not prove.

Minimum constitutional non-equivalences:

```text
PERMANENT_SUITE PASS
!= natural live validation

FOCUSED_STANDALONE_TEST PASS
!= permanent CI execution

goldenGate membership
!= LIVE_GOLDEN_ESTABLISHED

deterministic release fixture PASS
!= genuine release E2E proof

a test of one semantic owner
!= adjacent-owner correctness unless explicitly covered
```

If a row cannot state its non-claims clearly, its intent is not sufficiently bounded and must not be called complete.

---

## 10. Representative v1 rows

These examples freeze the intended shape; they do not materialize the future manifest in this design transaction.

### 10.1 `summary-scope`

```text
testId = summary-scope
surfaceKind = PERMANENT_SUITE
semanticOwner = Lifecycle
intentSummary = protect deterministic request-scoped Summary Scope Authority classification
executionProofKind = PK-03
intendedClaimKinds = CK-02, CK-04
protectedBehaviors = NONE / ANNUAL_ONLY / CUMULATIVE_YOY bounded classifier results
explicitNonClaims =
- does not prove generated annual-summary prose is semantically correct
- does not prove arithmetic/retrieval correctness
- does not establish CK-10 natural live control
- does not make LIVE_GOLDEN_ESTABLISHED true
```

This preserves the existing Summary Scope fixture design boundary.

### 10.2 `release-approval`

```text
testId = release-approval
surfaceKind = PERMANENT_SUITE
intentSummary = protect deterministic release-approval package/resolution contract exercised by the permanent harness
executionProofKind = PK-03
intendedClaimKinds = CK-02, CK-04
explicitNonClaims =
- does not prove CK-11 RELEASE_SYSTEM_E2E_OPERATION_PROVEN
- does not prove a genuine runtime release used the delegated path
- does not authorize publication by itself
```

This preserves the current R2.1 distinction between permanent-CI qualification and genuine release proof.

### 10.3 focused evidence-index tooling test

```text
surfaceKind = FOCUSED_STANDALONE_TEST
intentSummary = protect deterministic evidence-index generator/check behavior for its reviewed inputs
executionProofKind = PK-02
intendedClaimKinds = CK-02, CK-03 when actually executed
explicitNonClaims =
- existence of the test does not prove permanent CI executed it
- local focused PASS does not prove permanent-CI coverage/discovery
```

This preserves the existing `NOT_CLAIMED` coverage WATCH rather than erasing it.

---

## 11. Row completeness states

For human review/materialization, use only:

```text
INTENT_DEFINED
INTENT_INCOMPLETE
INTENT_BLOCKED
INTENT_SUPERSEDED
```

### `INTENT_DEFINED`

All required semantic fields are present, referenced authorities resolve, claim kinds are compatible with SYS-13, and explicit non-claims are bounded.

### `INTENT_INCOMPLETE`

The test exists but one or more required intent fields remain unresolved.

This is not a test failure.

### `INTENT_BLOCKED`

Conflicting/unresolvable authorities prevent a trustworthy intent row.

### `INTENT_SUPERSEDED`

The test surface has been replaced and the historical row remains point-in-time memory.

These states describe manifest completeness only. They do not modify test PASS/FAIL, WATCH/FIX/BLOCKER, evidence status, or CI state.

---

## 12. Update discipline

Canonical order:

```text
semantic contract/owner changes
→ update owning frozen/current authority first
→ update actual test/fixture if separately authorized
→ verify test behavior
→ review/update SYS-22 intent row
→ recompute affected evidence/proof surfaces
```

Never update the intent manifest first and use it to authorize a semantic change.

When only test implementation details change without changing its semantic intent, the row may remain unchanged after review.

When a test begins to claim a materially broader contract, that is not a harmless manifest edit; review the owning contract and work scope first.

---

## 13. Non-duplication boundaries

```text
permanent suite membership/execution policy
→ products/simcore/tests/registry.mjs + harness authority

fixture schema/body
→ existing fixture/test authorities

proof fitness
→ SYS-13

required evidence completeness
→ SYS-17

negative-control portfolio
→ future SYS-23

fixture orphan detection
→ future SYS-24

coverage promotion readiness
→ future SYS-26

contract-to-fixture gap
→ gated future SYS-29

natural evidence
→ live/evidence authorities
```

SYS-22 is the semantic contract between a named test surface and the claims it is intended to support.

---

## 14. Verification/application plan for later transaction

Because v1 is `NR_DOC_ONLY`, later application should be a bounded documentation transaction only.

Minimum verification:

```text
all materialized test IDs/paths resolve
permanent-suite IDs correspond to current registry entries
contract authority refs resolve
SYS-13 claim/proof tokens are valid
no row infers live/release proof from deterministic tests
no harness/fixture/runtime/CI file changes
release-simcore unchanged
```

No Node/Python generator, harness enforcement, registry edit, or permanent CI integration belongs to v1 application.

---

## 15. Freeze verdict

```text
SYS-22 TEST INTENT MANIFEST
= DESIGN FROZEN
= MEDIUM / I5 / D3
= NON_RUNTIME
= NR_DOC_ONLY
= HUMAN-REVIEWED SEMANTIC TEST-INTENT AUTHORITY
= NO HARNESS/REGISTRY CHANGE
= NO PROOF PROMOTION
= NO RUNTIME CHANGE
= OPEN DESIGN QUESTIONS 0
```

Implementation/application remains a later transaction under the active Design Sweep First hold.
