# SYS-23 — Negative-Control Registry — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · REVIEWED NEGATIVE-REGRESSION CONTRACT REGISTRY · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-23
Idea          = Negative-Control Registry
Size          = SMALL
Importance    = 4 / HIGH
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct upstream / adjacent boundaries:
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS22_TEST_INTENT_MANIFEST_DESIGN.md`
- `docs/SIMCORE_SYS28_VERIFICATION_DEBT_INDEX_DESIGN.md`
- `products/simcore/tests/registry.mjs`
- permanent fixture/test authorities and frozen behavior contracts

Related systems SYS-23 must compose with rather than replace:
- permanent suite registry / harness execution;
- individual fixture payloads and expected outputs;
- SYS-17 Missing Evidence Slot Analyzer;
- SYS-24 Fixture Orphan Detector;
- SYS-25 Golden Fixture Mutation Receipt;
- SYS-26 Coverage Promotion Readiness Scanner;
- SYS-29 Contract-to-Fixture Gap View;
- natural live evidence / anomaly authorities.

---

## 1. Problem

SimCore has many behaviors where correctness is not only:

```text
under condition X
→ expected behavior Y occurs
```

but also:

```text
under condition X
→ dangerous/incorrect behavior Z MUST NOT occur
```

Positive regression cases alone can miss over-trigger regressions.

Current examples make this concrete.

The permanent `representation-fast` fixture includes a case where the visible value exactly matches `Fresh` while canonical differs. The intended interpretation is Representation carryover rather than a new visible third representation.

The permanent `genuine-edit` fixture separately covers a visible value matching neither canonical nor Fresh and therefore representing a new visible representation candidate.

Those two contracts are semantically adjacent but opposite in one critical direction:

```text
Fresh-exact carryover
→ must not be promoted into genuine-user-edit handling

new visible third representation
→ must not be collapsed into Fresh-exact representation drift
```

Likewise SimCore already preserves negative behavioral controls such as:
- premature broadcast end must remain denied;
- current-era authority must not be displaced by unrequested historical context;
- a generic CI PASS must not be used to claim focused test execution that was not directly proven;
- a deterministic fixture PASS must not be promoted into natural live PASS.

Without a durable negative-control registry, these anti-overreach contracts remain scattered across fixtures, frozen designs, evidence notes, and human memory.

Failure modes include:

```text
POSITIVE-ONLY REGRESSION
A classifier still produces the expected positive case but begins firing on a neighboring case where it must remain inactive.

SILENT OVER-TRIGGER
A new heuristic broadens one branch and converts a previously safe negative case into a false positive.

NEGATIVE-CLAIM LOSS
A refactor preserves happy-path fixture output but drops a critical "must not" invariant that was only written in prose.

TEST-INTENT CONFUSION
A test's explicit non-claim is mistaken for an executable negative control even though no forbidden runtime outcome is actually asserted.

ABSENCE-AS-PROOF
The fact that a bad outcome did not appear in one unrelated test is treated as proof that the bad outcome is controlled.
```

SYS-23 defines one curated **Negative-Control Registry** that records reviewed forbidden outcomes for bounded inputs/conditions and points to the actual contract/test/evidence surfaces that own or prove them.

It is semantic repository memory, not a second test runner and not an automatic assertion generator.

---

## 2. Core invariant

```text
reviewed bounded precondition/input class
+ reviewed forbidden semantic outcome
+ owning contract authority
+ proof/enforcement surface reference
→ one negative-control registry entry

SYS-23
!= test execution evidence
!= permanent suite registry
!= fixture payload authority
!= automatic negative-case generator
!= fuzzing system
!= anomaly classifier
!= global "must not" prose scraper
!= evidence-slot engine
!= CI/release gate authority
!= repository writer
```

Canonical question:

> Under which exact reviewed conditions must which exact semantic outcome remain impossible or unselected, and where is that contract currently enforced or evidenced?

---

## 3. Negative control is not an explicit test non-claim

SYS-22 Test Intent Manifest records what a test may and may not be used to claim.

Example shape:

```text
fixture PASS
!= natural live PASS
```

That is a **proof-boundary non-claim**.

SYS-23 instead records a **behavioral or classifier negative control**:

```text
Fresh-exact carryover
→ USER_EDIT_CANDIDATE must not be selected
```

or a reviewed operational negative invariant:

```text
no explicit/legitimate broadcast-end authority
→ premature B_END transition must not be accepted
```

The two may be related, but they are not interchangeable.

Frozen rule:

```text
explicit non-claim
!= negative-control entry automatically
```

A SYS-23 entry requires a concrete forbidden outcome under a bounded precondition.

---

## 4. Negative control is not mere absence

The registry must never infer a control from:

```text
"we never saw X"
"fixture output did not mention X"
"no bug report exists"
"the test passed"
```

A negative control requires an explicit reviewed contract such as:

```text
condition A
→ outcome B forbidden
```

and a durable authority supporting that relationship.

Therefore:

```text
absence of failure
!= negative proof
```

This is compatible with SYS-13 proof-scope discipline.

---

## 5. v1 artifact form

The useful v1 application is one curated living repository document:

```text
docs/SIMCORE_NEGATIVE_CONTROL_REGISTRY.md
```

It records semantic negative-control contracts and links to executable or natural evidence where those already exist.

No new executable runner, fixture format, assertion helper, registry.mjs field, CI integration, fuzz generator, source parser, or repository writer is required for v1.

This establishes:

```text
APPLY CLASS = NR_DOC_ONLY
```

Why not `NR_EXECUTABLE` in v1:
- actual deterministic enforcement remains with existing/future fixture suites;
- actual live negative proof remains with live evidence authorities;
- the new value is cross-suite semantic discoverability and anti-overreach memory;
- generating executable assertions from prose would create unsafe semantic inference;
- later executable completeness checking belongs to SYS-29/SYS-24/SYS-26 style consumers, not the registry itself.

---

## 6. Relationship to permanent test registry

Current permanent registry owns executable suite membership and operational harness fields:

```text
id
module
fixtureDir
coverage
required
goldenGate
```

SYS-23 must not duplicate those mutable operational values as authority.

Preferred reference:

```text
Enforcement surface
= products/simcore/tests/registry.mjs#representation-fast
```

rather than:

```text
required = true
goldenGate = true
```

If operational suite membership changes, `registry.mjs` wins.

SYS-23 only states the reviewed negative semantic contract and points to the surface intended to protect it.

---

## 7. Relationship to SYS-13 Verification Proof Matrix

SYS-13 answers:

```text
which proof kind may establish which claim kind?
```

SYS-23 answers:

```text
which bad semantic outcome is forbidden under which bounded condition?
```

A negative-control row may cite:
- a focused deterministic test;
- permanent regression harness evidence;
- natural live evidence;
- frozen contract prose;
- more than one of those.

But the registry never promotes a cited proof beyond SYS-13 scope.

Example:

```text
negative fixture passes
→ deterministic negative contract protected
!= natural long-chat negative control proven
```

---

## 8. Relationship to SYS-28 Verification Debt Index

A negative-control row may exist even when no open verification debt exists.

Likewise a verification debt entry may say that a negative control needs later direct revalidation.

Frozen rule:

```text
negative control registered
!= verification debt

verification debt exists
!= negative control missing
```

If a previously proven negative control requires post-refactor revalidation, SYS-28 may carry that unresolved obligation without changing the SYS-23 semantic contract.

---

## 9. v1 entry schema

Each entry contains exactly these fields:

```text
Negative Control ID
Control title
Owner / contract authority
Precondition / bounded input class
Forbidden outcome
Required allowed disposition / alternative
Control kind
Enforcement / proof surface
Evidence / fixture refs
Lifecycle / review trigger
Explicit non-claims
Notes
```

### 9.1 Negative Control ID

Stable registry-local identifier:

```text
NC-001
NC-002
```

It is navigation identity only.
It must not become a fixture, work-item, gate, release, or evidence numbering authority.

### 9.2 Owner / contract authority

One frozen semantic authority that says the forbidden relationship is real.

Preferred owner classes:

```text
RUNTIME_BEHAVIOR_CONTRACT
CLASSIFIER_CONTRACT
LIFECYCLE_CONTRACT
TIME/FRAME_CONTRACT
RELEASE/VERIFICATION_SCOPE_CONTRACT
```

The class is descriptive only; exact path/ID remains required.

### 9.3 Precondition / bounded input class

Must be precise enough that the forbidden outcome is unambiguous.

Good:

```text
prior representation = OUTPUT_MISMATCH
current visible fingerprint == prior Fresh fingerprint
current visible fingerprint != prior canonical fingerprint
```

Bad:

```text
normal case
representation mismatch
user did not edit probably
```

### 9.4 Forbidden outcome

One exact semantic result that must not occur.

Examples:

```text
USER_EDIT_CANDIDATE selected
MANUAL_EDIT_REBUILT selected
premature B_END accepted
historical context promoted above current-era authority without explicit past-scene request
natural-live PASS claimed from deterministic-only proof
```

Avoid vague wording such as:

```text
must not break
must not regress
must not be wrong
```

### 9.5 Required allowed disposition / alternative

Where the contract specifies a positive alternative, record it.

Example:

```text
Fresh-exact carryover
→ allowed disposition: FRESH_CHAT / representation-fast lineage
```

If the negative contract only forbids one outcome and multiple alternatives are legitimate, use:

```text
ANY VALID NON_FORBIDDEN DISPOSITION PER OWNER
```

Do not invent a single winner just to make the row symmetric.

---

## 10. Control kinds

Exactly five v1 kinds:

```text
CLASSIFIER_FALSE_POSITIVE_GUARD
CLASSIFIER_FALSE_NEGATIVE_GUARD
LIFECYCLE_PREMATURE_TRANSITION_GUARD
AUTHORITY_TAKEOVER_GUARD
PROOF_OVERCLAIM_GUARD
```

### `CLASSIFIER_FALSE_POSITIVE_GUARD`

A neighboring case must not be incorrectly classified into the target branch.

Canonical current example family:
- representation drift / Fresh-exact carryover must not become genuine-edit handling.

### `CLASSIFIER_FALSE_NEGATIVE_GUARD`

A real target case must not be swallowed by a broader non-target branch.

Canonical current example family:
- a visible third representation matching neither canonical nor Fresh must not be treated as simple Fresh-exact carryover.

### `LIFECYCLE_PREMATURE_TRANSITION_GUARD`

A lifecycle transition must remain denied until its named authority/precondition exists.

Example family:
- premature broadcast end denied.

### `AUTHORITY_TAKEOVER_GUARD`

A lower/historical/contextual source must not displace a higher current authority outside an explicit allowance.

Example family:
- unrequested historical context must not take over current-era visible chronology.

### `PROOF_OVERCLAIM_GUARD`

A proof result must not be promoted into a stronger/different claim outside its proof scope.

Examples:
- deterministic fixture PASS must not become natural-live PASS;
- generic CI PASS must not become direct focused-test-execution proof without direct evidence.

This kind protects verification semantics rather than plugin runtime semantics.

---

## 11. Enforcement / proof surface vocabulary

Each row names one or more current surfaces using these descriptive values:

```text
PERMANENT_FIXTURE
FOCUSED_TEST
STATIC_CHECK
NATURAL_LIVE_EVIDENCE
FROZEN_CONTRACT_ONLY
COMPOSITE
```

This field does not claim the surface has executed recently.
Execution proof must come from actual evidence.

`FROZEN_CONTRACT_ONLY` is allowed when a negative invariant is important but no dedicated executable case exists yet.

That state may later feed SYS-29 Contract-to-Fixture Gap View or SYS-28 verification debt review, but SYS-23 itself does not create the gap/blocker automatically.

---

## 12. No automatic pair generation

A positive control does not automatically create its logical inverse.

Example:

```text
A → B
```

does not automatically imply a useful row:

```text
NOT A → NOT B
```

Real classifier domains are often multi-valued and asymmetric.

Likewise:

```text
Fresh exact → representation fast
```

does not imply every non-Fresh case must be genuine edit.

Frozen rule:

```text
negative control
= reviewed bounded anti-outcome contract
!= Boolean inverse generator
```

---

## 13. No exhaustive Cartesian registry

SYS-23 must not attempt to enumerate every combination of:
- mode;
- frame state;
- cache state;
- representation state;
- release state;
- proof kind;
- fixture state.

That would become unmaintainable and create fake coverage confidence.

A row is added when at least one is true:

```text
A. a real historical regression established the negative invariant;
B. a frozen design identifies a high-risk neighboring branch;
C. an executable fixture intentionally protects a false-positive/false-negative boundary;
D. a live control established a critical "must not" behavior;
E. verification policy has a recurring proof-overclaim hazard.
```

---

## 14. Current repository examples validating the design

These examples validate the model; they are not a materialized v1 registry in this design transaction.

### 14.1 Representation Fast false-positive guard

Current deterministic fixture includes:

```text
case: output-mismatch-fresh-exact
priorRepresentation = OUTPUT_MISMATCH
currentMatch = FRESH_CHAT
deltaShape = FRESH_EXACT_CARRYOVER
```

Reviewed negative meaning:

```text
when current visible exactly matches prior Fresh
→ do not treat that alone as a genuine new visible user edit
```

Potential registry form:

```text
Kind = CLASSIFIER_FALSE_POSITIVE_GUARD
Forbidden = genuine-edit branch selection solely from canonical mismatch
Surface = representation-fast fixture + frozen Representation contract
```

The existing suite still reports `HYBRID_TRANSITIONAL` because the outer reconcile sequence is not fully executable in that suite; SYS-23 must preserve that proof boundary rather than overclaim full outer-path execution.

### 14.2 Genuine visible third representation false-negative guard

Current `genuine-edit` fixture establishes:

```text
current != canonical
current != Fresh
currentMatch = NONE
deltaShape = NEW_VISIBLE_REPRESENTATION
```

Reviewed negative meaning:

```text
new visible third representation
→ must not be collapsed into the Fresh-exact carryover case
```

Potential registry form:

```text
Kind = CLASSIFIER_FALSE_NEGATIVE_GUARD
Forbidden = FRESH_EXACT_CARRYOVER disposition for the bounded third-representation case
Surface = genuine-edit fixture + frozen genuine-edit contract
```

Again, current suite coverage is `HYBRID_TRANSITIONAL`; the registry records semantics, not stronger execution evidence.

### 14.3 Premature broadcast end

Existing M2 regression controls preserve:

```text
premature broadcast end denied = PASS
```

Potential registry meaning:

```text
Kind = LIFECYCLE_PREMATURE_TRANSITION_GUARD
Precondition = no legitimate terminal broadcast-end authority yet
Forbidden = premature B_END acceptance / lifecycle unlock
```

Exact current lifecycle owner and executable/live refs must be cited when the registry is materialized.

### 14.4 Current-era authority takeover

Historical mitigation established that persisted-state repair alone was insufficient when visible output could regress into an unrequested historical era.

Potential registry meaning:

```text
Kind = AUTHORITY_TAKEOVER_GUARD
Precondition = current-era flow with no explicit past-scene allowance
Forbidden = historical/context source replacing current timeline authority
```

An explicit requested flashback is outside this negative control and must remain allowed under its own contract.

### 14.5 Verification proof overclaim

Current verification WATCHes establish:

```text
generic PR/CI PASS
!= direct standalone tooling-test execution proof unless exact execution evidence exists
```

Potential registry meaning:

```text
Kind = PROOF_OVERCLAIM_GUARD
Forbidden = promote generic CI PASS to focused direct-execution claim without direct run/step evidence
```

This row protects evidence semantics, not runtime behavior.

---

## 15. Lifecycle / review triggers

A negative-control row must be reviewed when:

```text
owner contract changes materially
classifier branch semantics change
fixture or suite protecting the control is removed/replaced
architecture ownership moves the relevant decision boundary
proof-scope policy changes for PROOF_OVERCLAIM_GUARD rows
natural evidence disproves or narrows the recorded precondition
```

Do not update a row merely because:
- a new release number exists;
- unrelated code changes;
- the same fixture re-runs successfully.

The semantic contract is the lifecycle anchor.

---

## 16. Stale / conflict behavior

The future registry uses three maintenance states:

```text
NC_ACTIVE
NC_REVIEW_REQUIRED
NC_CONFLICTED
```

`NC_ACTIVE`
= owner, condition, forbidden outcome, and references remain coherent.

`NC_REVIEW_REQUIRED`
= an owner/fixture/architecture change means the row may be stale but no contradictory semantic decision is established yet.

`NC_CONFLICTED`
= current reviewed authorities disagree about whether the forbidden outcome is actually forbidden under the recorded condition.

Neither state decides runtime severity or gate status.

If conflicted:

```text
fail closed for registry interpretation
→ review owner authorities
→ do not silently pick the newest-looking document
```

---

## 17. Relationship to future SYS-24 / SYS-25 / SYS-26 / SYS-29

SYS-23 provides semantic metadata that later regression-management ideas may consume.

```text
SYS-24 Fixture Orphan Detector
→ may ask whether a referenced executable negative-control fixture still resolves

SYS-25 Golden Fixture Mutation Receipt
→ may require review when a golden fixture mutation changes a registered negative-control case

SYS-26 Coverage Promotion Readiness Scanner
→ may consider whether important negative-control surfaces exist before promoting coverage claims

SYS-29 Contract-to-Fixture Gap View
→ may identify frozen negative controls that have no intended deterministic fixture surface
```

None of those later systems may infer a negative semantic contract solely from fixture filenames.
SYS-23 remains the reviewed semantic registry.

---

## 18. Verification plan for later application

When `SIMCORE_NEGATIVE_CONTROL_REGISTRY.md` is materialized, verify at least:

```text
1. every row has an exact bounded precondition;
2. every row names one exact forbidden outcome;
3. every row points to an owner/contract authority;
4. every executable surface reference resolves;
5. permanent registry operational fields are not duplicated as semantic authority;
6. fixture/test PASS is not described as natural-live PASS;
7. proof-overclaim controls follow SYS-13/SYS-22 semantics;
8. no row is created from mere absence or Boolean inversion;
9. no runtime/plugin/release/CI/repository-writer behavior changes;
10. release-simcore remains unchanged.
```

A manual semantic review is sufficient for SYS-23 v1 application.

---

## 19. Runtime audit lens

SYS-23 is non-runtime, but its negative-control semantics are relevant to the standing runtime audit lens.

High-value negative controls should preferentially cover failure modes where a false positive/false negative could cause:
- repeated expensive rebuilds;
- erroneous lifecycle transitions;
- duplicate retries/poll loops;
- resource lifecycle imbalance;
- error-recovery over-trigger;
- state corruption or stale-state takeover.

This does not expand SYS-23 into runtime static analysis.
It only helps prioritize which already-reviewed negative invariants deserve durable registry rows.

---

## 20. Unified classification freeze verdict

Source/design inspection confirms:

```text
SIZE          = SMALL
IMPORTANCE    = 4
DIFFICULTY    = 2
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- semantic negative-control identity is reviewed human repository memory;
- existing/future suites remain executable enforcement owners;
- no new runner or assertion engine is required for core value;
- no CI/release/build/repository authority changes are needed.

---

## 21. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
APPLICATION = NOT STARTED
```

Per Design Sweep First, stop this idea here.
Materialization of `docs/SIMCORE_NEGATIVE_CONTROL_REGISTRY.md` is a separate NR application transaction after the active system-idea design sweep closes or priority is explicitly changed.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
