# SYS-13 — Verification Proof Matrix — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · PROOF-SCOPE MATRIX · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-13
Idea          = Verification Proof Matrix
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
- `docs/SIMCORE_NR_DIFFICULTY3_HARVEST_VERIFICATION_WATCH_2026-08-26.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md`
- `docs/SIMCORE_SYS42_IMPLEMENTATION_SLICE_CONFORMANCE_CHECKER_DESIGN.md`
- `docs/SIMCORE_SYS11_DESIGN_TO_IMPLEMENTATION_DRIFT_AUDIT_DESIGN.md`
- `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`

Existing authorities SYS-13 must not replace:
- actual test/CI/run logs and immutable run identities;
- Architecture Contracts v2 and its checker;
- permanent regression suites and fixture registry;
- release publication authority and release receipts;
- live-evidence/anomaly classification authorities;
- SYS-42 machine slice result;
- SYS-11 human drift-audit result.

---

## 1. Problem

SimCore intentionally preserves many different verification surfaces:

```text
syntax/static checks
focused deterministic tests
permanent regression harness
permanent CI routing / required checks
architecture contract checks
machine slice conformance
human design-to-implementation audit
release publication identity
natural real long-chat validation
genuine release-system end-to-end proof
living-doc / production-state convergence
```

They are often all described casually as `PASS`, even though they prove different things.

That creates dangerous overclaims such as:

```text
permanent CI PASS
→ therefore focused standalone test executed

fixture PASS
→ therefore natural rendered semantics are validated

SYS-42 SLICE_CONFORMANT
→ therefore the design intent is fully satisfied

release publication succeeded
→ therefore live runtime behavior passed

R2.1 permanent-CI qualification passed
→ therefore delegated release operation has genuine release E2E proof
```

All of those inferences are invalid unless an authority explicitly provides the missing proof.

SYS-13 defines one shared proof-scope matrix so every verification statement can answer:

```text
WHAT exact claim is being made?
WHICH proof kind supports it?
IS that support direct, conditional, supporting-only, or absent?
WHAT must still remain NOT_CLAIMED / UNPROVEN?
```

---

## 2. Core invariant

```text
proof result
+ immutable proof identity
+ claim kind
→ bounded proof relationship

proof relationship
!= global confidence score
!= universal PASS
!= gate authorization by itself
!= evidence maturity promotion by itself
```

Canonical rule:

```text
A proof kind is not globally stronger or weaker.
It is only fit or unfit for a specific claim.
```

Therefore SYS-13 has **no linear proof hierarchy** and no percentage/confidence score.

---

## 3. v1 implementation form

SYS-13 v1 is document-only durable policy/memory.

Preferred future materialization:

```text
docs/SIMCORE_VERIFICATION_PROOF_MATRIX.md
```

It contains:
- proof-kind definitions;
- claim-kind definitions;
- the frozen relationship matrix;
- required wording for `NOT_CLAIMED` and unresolved proof;
- examples drawn from current SimCore verification practice.

No scanner, generator, GitHub Action, CI hook, repository writer, workflow parser, log scraper, or background watcher is required for v1.

A future executable validator would be a separate idea/transaction because consuming CI/run logs reliably changes the implementation and trust boundary.

Apply Class therefore freezes as:

```text
NR_DOC_ONLY
```

---

## 4. Proof relationship vocabulary

Every matrix cell uses exactly one of:

```text
DIRECT
CONDITIONAL
SUPPORTING
NONE
```

### `DIRECT`

The proof kind can directly establish the named claim when its own preconditions and immutable identity are satisfied.

### `CONDITIONAL`

The proof kind can establish the claim only when additional bounded facts are explicitly present in the proof record.

Example:

```text
PERMANENT_CI
→ FOCUSED_TEST_EXECUTED
= CONDITIONAL
```

It is direct only if the relevant CI job/step/log explicitly proves that focused test ran.

### `SUPPORTING`

The proof is relevant context but cannot establish the claim alone.

### `NONE`

The proof kind does not establish the claim.

`NONE` does not mean the proof is weak; it means the proof addresses a different question.

---

## 5. Frozen v1 proof kinds

SYS-13 recognizes these proof kinds.

```text
PK-01 SOURCE_STATIC
PK-02 FOCUSED_DETERMINISTIC_TEST
PK-03 PERMANENT_REGRESSION_HARNESS
PK-04 PERMANENT_CI
PK-05 ARCHITECTURE_CONTRACT_CHECK
PK-06 MACHINE_SLICE_CONFORMANCE
PK-07 HUMAN_DESIGN_DRIFT_AUDIT
PK-08 RELEASE_PUBLICATION_IDENTITY
PK-09 NATURAL_LIVE_VALIDATION
PK-10 GENUINE_RELEASE_E2E
PK-11 LIVING_STATE_CONVERGENCE
```

### PK-01 `SOURCE_STATIC`

Examples:
- syntax parse;
- schema validation;
- static no-forbidden-import check when directly executed;
- byte/hash identity checks performed locally.

It proves only the exact static property checked.

### PK-02 `FOCUSED_DETERMINISTIC_TEST`

A specifically named focused test/mode executed against a bound revision/input set.

It can directly prove its frozen deterministic cases, but not natural runtime behavior outside those cases.

### PK-03 `PERMANENT_REGRESSION_HARNESS`

The permanent SimCore regression harness executing registered suites/required fixtures.

It proves the registered deterministic contracts that actually ran. It does not prove unregistered natural semantics.

### PK-04 `PERMANENT_CI`

A bound permanent CI workflow/run result.

It proves that the checks actually included in that run passed under that workflow identity. It does not imply every repository-local test existed in the execution path.

### PK-05 `ARCHITECTURE_CONTRACT_CHECK`

The existing Contracts v2 checker result.

It directly proves the machine-readable architecture invariants it owns and nothing more.

### PK-06 `MACHINE_SLICE_CONFORMANCE`

SYS-42 result for a reviewed machine slice contract and immutable base/head diff.

It directly proves only the projected machine-verifiable slice rules.

### PK-07 `HUMAN_DESIGN_DRIFT_AUDIT`

SYS-11 human-reviewed audit result.

It can directly establish the bounded audit finding state for frozen design requirements reviewed with cited evidence. It does not manufacture missing runtime proof.

### PK-08 `RELEASE_PUBLICATION_IDENTITY`

Bound proof that the authorized release identity was actually published to `release-simcore` and required identity invariants such as `latest.js == install.js` hold.

It does not prove long-chat behavior.

### PK-09 `NATURAL_LIVE_VALIDATION`

Reviewed natural/real long-chat evidence for an explicitly defined scenario/control.

It can directly prove that observed live control for that version/runtime/sample. It does not turn all unexercised deterministic contracts into live-proven claims.

### PK-10 `GENUINE_RELEASE_E2E`

A genuine runtime release that exercises the intended release-system chain end to end, including the specific delegated/permanent publication path whose operation is under proof.

It proves operational exercise of that release chain for the bound release. It is not a universal future-release guarantee.

### PK-11 `LIVING_STATE_CONVERGENCE`

Reviewed convergence of production identity, main living authorities, manifests, current gate/priority, and closure docs after the relevant operation.

It proves documentation/current-state convergence, not runtime correctness.

---

## 6. Frozen v1 claim kinds

SYS-13 recognizes these claim families.

```text
CK-01 SOURCE_IS_STATICALLY_VALID
CK-02 NAMED_DETERMINISTIC_CONTRACT_PASSED
CK-03 NAMED_FOCUSED_TEST_ACTUALLY_EXECUTED
CK-04 REGISTERED_PERMANENT_SUITE_PASSED
CK-05 APPLICABLE_PERMANENT_CI_PASSED
CK-06 ARCHITECTURE_CONTRACTS_SATISFIED
CK-07 IMPLEMENTATION_SLICE_CONFORMED
CK-08 FROZEN_DESIGN_DRIFT_AUDIT_CLEAN
CK-09 RELEASE_IDENTITY_PUBLISHED_CORRECTLY
CK-10 NAMED_NATURAL_LIVE_CONTROL_PASSED
CK-11 RELEASE_SYSTEM_E2E_OPERATION_PROVEN
CK-12 LIVING_AUTHORITIES_CONVERGED
```

Claims must remain named and bounded.

Forbidden generic claim:

```text
VERIFIED = YES
```

Preferred form:

```text
CK-04 summary-scope registered permanent suite = PROVEN by PK-03 <run/ref>
CK-03 M-13 focused standalone test directly executed by permanent CI = NOT_CLAIMED
CK-10 v0.64.7 reload continuity live control = PENDING
```

---

## 7. Frozen v1 proof matrix

Legend:

```text
D = DIRECT
C = CONDITIONAL
S = SUPPORTING
- = NONE
```

| Claim | Static | Focused | Harness | CI | Arch | Slice | Drift | Release | Live | Release E2E | Convergence |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| CK-01 static validity | D | S | S | C | S | S | S | - | - | - | - |
| CK-02 named deterministic contract | - | D | D | C | C | C | C | - | S | - | - |
| CK-03 focused test actually executed | - | D | C | C | - | - | S | - | - | - | - |
| CK-04 registered permanent suite passed | - | C | D | C | - | - | S | - | - | - | - |
| CK-05 applicable permanent CI passed | - | - | - | D | - | - | - | - | - | C | - |
| CK-06 architecture contracts satisfied | - | - | - | C | D | C | C | - | - | - | - |
| CK-07 implementation slice conformed | - | - | - | C | S | D | C | - | - | - | - |
| CK-08 frozen-design drift audit clean | - | S | S | S | S | S | D | - | S | - | S |
| CK-09 release identity published correctly | C | - | - | C | - | - | S | D | S | C | C |
| CK-10 named natural live control passed | - | S | S | S | S | S | S | S | D | S | S |
| CK-11 release-system E2E operation proven | - | - | - | S | - | - | S | S | S | D | S |
| CK-12 living authorities converged | C | - | - | S | - | - | S | C | S | C | D |

The table is a scope guard, not an automatic evaluator.

Every `C` requires an explicit condition in the proof record. If that condition is absent:

```text
CONDITIONAL without condition proof
→ NOT_PROVEN / NOT_CLAIMED
```

---

## 8. Mandatory non-equivalence rules

These rules are constitutional for SYS-13 v1.

### 8.1 Permanent CI vs focused test execution

```text
PK-04 PERMANENT_CI PASS
!= CK-03 NAMED_FOCUSED_TEST_ACTUALLY_EXECUTED
```

Unless a bound job/step/log directly proves execution, the correct wording remains:

```text
NOT_CLAIMED
```

This preserves the current M-11/M-10/M-13 verification WATCH semantics.

### 8.2 Permanent fixture vs natural semantics

```text
PK-03 deterministic fixture PASS
!= CK-10 natural live control PASS
```

A deterministic contract may be `ESTABLISHED` while natural rendered semantics remain `VALIDATION_ONLY` or pending.

### 8.3 SYS-42 vs design intent

```text
PK-06 SLICE_CONFORMANT
!= CK-08 DRIFT_AUDIT_CLEAN
```

SYS-42 proves only reviewed machine slice rules. SYS-11 remains necessary for semantic/intent omissions.

### 8.4 SYS-11 vs missing runtime evidence

```text
PK-07 human drift audit
cannot convert UNPROVEN live requirement into PROVEN
```

If the frozen design requires a live control and no valid live sample exists:

```text
DRIFT_AUDIT_REVIEW_REQUIRED
```

or equivalent unresolved state remains.

### 8.5 Release publication vs live validation

```text
PK-08 release publication identity
!= CK-10 natural live control PASS
```

Publication creates or confirms production identity; real long-chat validation is a separate proof surface.

### 8.6 Permanent-CI qualification vs genuine release E2E

```text
PK-04 permanent CI qualification
!= CK-11 release-system E2E operation proven
```

R2.1 remains `AWAITING GENUINE RELEASE PROOF` until an actual runtime release exercises the delegated approval/publication chain.

### 8.7 Live PASS vs universal correctness

```text
one PK-09 natural control PASS
!= all possible live behavior proven
```

The claim must retain the scenario/control/version/runtime identity.

### 8.8 Living convergence vs runtime correctness

```text
PK-11 living-state convergence
!= runtime semantic correctness
```

It proves that authorities agree on the recorded state, not that the recorded release behaves correctly.

---

## 9. Proof record schema

Every proof statement using SYS-13 should preserve at least:

```text
proofKind
claimKind
claimLabel
result
proofIdentity
scope
conditionsSatisfied[]
conditionsMissing[]
sourceAuthorityRefs[]
notClaimed[]
notes
```

Recommended result vocabulary:

```text
PROVEN
NOT_PROVEN
NOT_CLAIMED
CONFLICTED
BLOCKED
NOT_APPLICABLE
```

Definitions:

### `PROVEN`

The selected proof kind has a `DIRECT` relationship, or a `CONDITIONAL` relationship whose exact conditions are explicitly satisfied.

### `NOT_PROVEN`

The needed proof is absent or insufficient for the claim.

### `NOT_CLAIMED`

The current evidence does not establish the claim and no contrary failure is asserted. Use this when preserving verification honesty matters, especially for execution/discovery coverage.

### `CONFLICTED`

Two authoritative proof records materially disagree and require review.

### `BLOCKED`

The proof identity or required source cannot be resolved reliably.

### `NOT_APPLICABLE`

The claim is outside the bounded work/control.

`UNKNOWN`, missing fields, or generic `PASS` must never silently map to `PROVEN`.

---

## 10. Proof identity discipline

Every proof claim must bind to the narrowest immutable identity available.

Examples:

```text
static check
→ commit SHA + command/check identity

focused test
→ commit SHA + test path/mode + deterministic input/fixture identity

permanent CI
→ workflow run ID + job/step when claim depends on a specific execution

architecture check
→ commit SHA + checker/config identity

SYS-42
→ base/head SHAs + slice contract identity

SYS-11
→ frozen design identity + implementation identity + audit record

release publication
→ release commit + release blob + version + latest/install identity

live validation
→ version + runtime/generation + scenario/control + specimen/evidence identity

genuine release E2E
→ release ID + candidate/approval/publication chain identities
```

Moving branch names alone are insufficient proof identity.

---

## 11. Relationship to current verification WATCHes

SYS-13 preserves rather than erases existing WATCHes.

Example:

```text
M-13 permanent SimCore CI = PASS
```

may support:

```text
CK-05 applicable permanent CI passed = PROVEN
```

while simultaneously preserving:

```text
CK-03 focused standalone M-13 test executed by current CI = NOT_CLAIMED
CK-03 evidence-index --check directly executed by current CI = NOT_CLAIMED
```

No CI restructuring is justified merely to make the matrix prettier.

If separate permanent focused-test coverage is later desired, it remains separate repository/CI work.

---

## 12. Relationship to Evidence Index / M-13

SYS-13 does not replace the Evidence Index.

```text
SYS-13
= what a proof kind can legitimately prove

Evidence Index / M-13
= navigation to reviewed evidence artifacts and statuses
```

Evidence Index entries may reference SYS-13 proof/claim vocabulary later, but no generator/schema change is part of SYS-13 v1.

---

## 13. Relationship to SYS-17 Missing Evidence Slot Analyzer

SYS-13 defines the vocabulary SYS-17 will need.

```text
SYS-13
claim → acceptable proof kinds / non-equivalence boundary

SYS-17
required claim slots for a bounded work item
→ which required proof slots remain missing?
```

SYS-13 does not determine which claims are mandatory for every work item. That requirement comes from the owning design/gate/release/live contract.

---

## 14. Relationship to SYS-08 Work-Item Close Receipt

SYS-08 may summarize proof coverage using SYS-13 vocabulary.

Example:

```text
Verification proof summary:
- CK-01 source static validity = PROVEN / PK-01
- CK-04 permanent regression suite = PROVEN / PK-03
- CK-05 permanent CI = PROVEN / PK-04
- CK-10 live control = NOT_APPLICABLE for this non-runtime work
- CK-03 focused standalone test direct CI execution = NOT_CLAIMED
```

The receipt points to proof authorities; it does not duplicate their full logs.

---

## 15. Forbidden v1 behavior

SYS-13 must not:

```text
assign a single numeric confidence score
rank proof kinds in one universal strongest→weakest order
infer test execution from repository presence
infer focused-test execution from generic CI PASS
infer live correctness from deterministic fixtures
infer release E2E proof from release-system unit/permanent CI qualification
infer semantic equivalence from SYS-42
infer all-design satisfaction from SYS-11 without required external evidence
promote WATCH/DEFER/FIX/BLOCKER automatically
rewrite evidence maturity automatically
modify CI/release/repository/runtime surfaces
```

---

## 16. Apply classification

Useful v1 implementation is a durable living proof-scope document/table.

```text
NON_RUNTIME
+ no executable parser needed
+ no CI/release/repository authority change
+ no runtime behavior
→ NR_DOC_ONLY
```

Application remains held while the current system design sweep is active.

---

## 17. Design completion condition

SYS-13 is design-complete when:

```text
proof kinds fixed
claim kinds fixed
relationship vocabulary fixed
proof matrix fixed
NOT_CLAIMED discipline fixed
proof identity requirements fixed
non-equivalence rules fixed
SYS-17 / SYS-08 / Evidence Index boundaries fixed
no code/CI/release/runtime implementation implied
```

Status:

```text
OPEN DESIGN QUESTIONS = 0
DESIGN FROZEN
APPLY CLASS = NR_DOC_ONLY
IMPLEMENTATION/APPLICATION = HOLD
```

---

## 18. Production boundary

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
