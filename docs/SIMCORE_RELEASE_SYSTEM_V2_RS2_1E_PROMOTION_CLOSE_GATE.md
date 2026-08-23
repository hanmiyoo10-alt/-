# SimCore Release System v2 — RS2-1E Promotion / Close Gate

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Fixture inventory: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
Harness contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
First pack contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1C_FIRST_REGRESSION_PACK.md`
Equivalence contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1D_BASELINE_EQUIVALENCE_PROOF.md`
Phase: `RS2-1 — Durable Tests`
Subphase: `RS2-1E — Promotion / Close Gate`
Authority class: release-infrastructure design / RS2-1 operational-claim boundary

---

## 1. Purpose

RS2-1E defines what SimCore is operationally allowed to claim after the permanent test harness, Batch A fixtures, and baseline-equivalence proof have been implemented and validated.

The purpose is to prevent three different ideas from being collapsed into one:

```text
permanent tests exist
historical assertions are partially replaceable
historical release gates are fully replaceable
```

These are different states and receive different authorities.

RS2-1E freezes:

- RS2-1 operational status vocabulary;
- minimum evidence required for each status;
- what partial replacement authorizes;
- what partial replacement does not authorize;
- retirement handling for mapped historical assertions;
- transitional-control retention rules;
- relationship to real-host/live authority;
- whether RS2-2 may begin before full historical replacement;
- rollback/fallback behavior;
- blocked-state handling;
- implementation close record requirements;
- the final RS2-1 close gate.

This document does **not** implement RS2-1, create permanent CI, modify `release-simcore`, modify `product-manifest.json`, change the current release workflow, delete historical workflows, change M2-3, or alter SimCore runtime behavior.

---

## 2. Core separation

RS2-1E adopts one primary rule:

```text
RS2-1 completion
!=
full historical release-gate replacement
```

RS2-1 is the durable-test adoption phase.

It is successful when the permanent harness and first regression pack are real, validated, attributable, and usable without weakening historical safety meaning.

Full historical release-gate replacement is a stronger future condition and may remain incomplete while RS2-1 itself closes successfully.

This separation is required because the initial Batch A design intentionally contains transitional coverage for:

```text
representation-fast
genuine-edit
broadcast-closure
```

and Release System v2 must not force unrelated runtime refactors merely to obtain a cosmetically complete test matrix.

---

## 3. Operational status vocabulary

RS2-1E defines four independent operational claims.

```text
DURABLE_TESTS_AVAILABLE
PARTIAL_REPLACEMENT_AUTHORIZED
FULL_REPLACEMENT_AUTHORIZED
RS2_1_CLOSED
```

These claims are cumulative only where their prerequisites are satisfied.

### 3.1 `DURABLE_TESTS_AVAILABLE`

Meaning:

- the permanent harness is implemented;
- the registered Batch A pack executes successfully on the chosen production baseline subject to declared transitional coverage;
- fixture metadata and raw-data policy pass;
- harness self-tests pass;
- results are bounded and reproducible;
- the harness is safe to use as a reusable regression input to future release/static validation.

This status does **not** mean any historical assertion may be retired.

### 3.2 `PARTIAL_REPLACEMENT_AUTHORIZED`

Meaning:

- `DURABLE_TESTS_AVAILABLE` is true;
- RS2-1D equivalence records exist for all required Batch A suites;
- at least one mapped historical assertion is `EXACT_EQUIVALENT` or `COMPATIBLE_SUPERSET`;
- no required mapping is `NOT_EQUIVALENT`;
- all `PARTIAL_TRANSITIONAL` mappings are explicitly retained rather than silently replaced.

This status authorizes replacement only at the **assertion-family level** where equivalence is retirement-eligible.

Expected initial retirement-eligible families:

```text
community-reaction deterministic assertions
diagnostic-copy deterministic assertions
```

Expected retained families:

```text
representation-fast decision-path/live controls
genuine-edit state-changing/live controls
broadcast-closure lifecycle/state/live controls
```

### 3.3 `FULL_REPLACEMENT_AUTHORIZED`

Meaning:

Every required legacy assertion family mapped by RS2-1D is either:

```text
EXACT_EQUIVALENT
or
COMPATIBLE_SUPERSET
```

and every required real-host authority has either:

- remained explicitly required as a live gate; or
- received an explicit later disposition proving it is no longer required.

`FULL_REPLACEMENT_AUTHORIZED` is **not required** to close the initial RS2-1 phase.

It is a future promotion state.

### 3.4 `RS2_1_CLOSED`

Meaning:

The RS2-1 durable-tests phase has completed its own bounded mission and may hand off to RS2-2.

Initial RS2-1 close requires:

```text
DURABLE_TESTS_AVAILABLE
+
PARTIAL_REPLACEMENT_AUTHORIZED
+
no BLOCKED required equivalence
+
transitional retention recorded
+
current release path still available
```

Full replacement is not a prerequisite.

---

## 4. Initial expected state

If RS2-1C and RS2-1D implementation match the frozen design, the expected first operational result is:

```text
DURABLE_TESTS_AVAILABLE            YES
PARTIAL_REPLACEMENT_AUTHORIZED     YES
FULL_REPLACEMENT_AUTHORIZED        NO
RS2_1_CLOSED                       YES
```

Expected Batch A equivalence matrix:

| Suite | Coverage | Equivalence | Replacement |
|---|---|---|---|
| `community-reaction` | `EXECUTABLE` | `COMPATIBLE_SUPERSET` | eligible mapped assertions |
| `diagnostic-copy` | `EXECUTABLE` | `EXACT_EQUIVALENT` or `COMPATIBLE_SUPERSET` | eligible mapped assertions |
| `representation-fast` | `HYBRID_TRANSITIONAL` | `PARTIAL_TRANSITIONAL` | retained |
| `genuine-edit` | `HYBRID_TRANSITIONAL` | `PARTIAL_TRANSITIONAL` | retained |
| `broadcast-closure` | `HYBRID_TRANSITIONAL` | `PARTIAL_TRANSITIONAL` | retained |

Expected aggregate equivalence status:

```text
PARTIAL_REPLACEMENT_ONLY
```

This is an acceptable RS2-1 close result.

---

## 5. What `DURABLE_TESTS_AVAILABLE` authorizes

After this status is promoted, future SimCore development/release validation may invoke the permanent harness instead of creating new duplicated copies of already-migrated fixture logic.

Examples:

```text
node products/simcore/tooling/test.mjs --source <candidate> --suite batch-a
```

or bounded suite-specific runs.

It authorizes:

- reuse of stable fixture IDs;
- reuse of permanent suite assertions;
- adding new correctness fixtures to the permanent inventory instead of version-named one-shot test files;
- using the harness from temporary/release-specific CI during the transition;
- using permanent test output as static evidence for a candidate release.

It does not authorize:

- deployment;
- manifest mutation;
- automatic release-state synchronization;
- deletion of the old release path;
- replacing real long-chat validation;
- weakening release-specific attribution when a new feature needs a new bounded control.

---

## 6. What `PARTIAL_REPLACEMENT_AUTHORIZED` changes

Partial replacement is narrow and forward-looking.

For an assertion family marked retirement-eligible by RS2-1D:

```text
future release-specific validation
should call the permanent fixture/suite
instead of re-embedding an equivalent copied assertion
```

Example:

```text
old:
new one-shot workflow contains another handwritten COMMUNITY multiline fixture

preferred after promotion:
release validation invokes permanent community-reaction suite
```

Historical workflow files remain historical evidence and are not deleted merely because their mapped assertion is no longer needed as an active future gate.

### 6.1 Eligible assertion-level retirement

Retirement eligibility applies only to the mapped assertion IDs recorded by RS2-1D.

It does not infer retirement of:

- unrelated syntax checks;
- version checks;
- architecture checks;
- patching steps;
- deployment steps;
- frozen-surface checks;
- git commit/push behavior;
- live gates.

### 6.2 Future release authoring rule

After partial promotion, new SimCore correctness releases should follow:

```text
new defect / contract
→ add or extend permanent fixture where appropriate
→ run permanent harness
→ keep release-specific checks only for truly release-specific scope/freeze/attribution
```

Do not recreate a version-named copy of an already permanent regression family without a documented reason.

---

## 7. Transitional retention ledger

RS2-1E requires an explicit record of controls that remain authoritative after partial replacement.

Directional location:

```text
products/simcore/tests/equivalence/retained-controls.json
```

The exact implementation syntax may differ, but it must identify at least:

```text
stable suite
legacy assertion/live-control ID
reason retained
missing executable surface
upgrade trigger
current authority type
```

Conceptual entries:

```text
representation-fast
reason: final edit-reconcile decision path not directly executable
upgrade trigger: M2-3 edit-reconcile service available


genuine-edit
reason: state-changing rebuild/save/commit path not directly executable
upgrade trigger: M2-3 edit-reconcile service available

broadcast-closure
reason: real lifecycle unlock/state transition remains integrated/live
upgrade trigger: explicit later executable boundary or separate disposition
```

No retained control may disappear merely because `RS2_1_CLOSED` becomes true.

---

## 8. M2-3 relationship

RS2-1E must not make M2-3 a prerequisite for RS2-1 closure.

Frozen ordering rule:

```text
RS2-1 closes with honest transitional controls
↓
normal roadmap proceeds
↓
M2-3 naturally introduces edit-reconcile service
↓
re-evaluate representation-fast + genuine-edit equivalence
```

Expected post-M2-3 transition:

```text
representation-fast:
HYBRID_TRANSITIONAL -> EXECUTABLE
PARTIAL_TRANSITIONAL -> EXACT_EQUIVALENT / COMPATIBLE_SUPERSET


genuine-edit:
HYBRID_TRANSITIONAL -> EXECUTABLE
PARTIAL_TRANSITIONAL -> EXACT_EQUIVALENT / COMPATIBLE_SUPERSET
```

This re-evaluation is an RS2 maintenance action, not permission to alter M2-3 runtime scope.

B_END closure is evaluated independently and must not drag a Broadcast/lifecycle refactor into M2-3.

---

## 9. Real-host / live authority rule

Permanent deterministic tests and historical live gates remain separate authorities.

RS2-1 close must preserve this distinction.

Examples of real-host evidence that may remain independently required:

```text
actual representation-fast snapshot unchanged in PocketRisu
actual genuine visible edit rebuild
actual Broadcast unlock/state transition
actual clipboard behavior in WebView
real long-chat release close gates
```

A permanent fixture PASS may reduce deterministic regression burden but does not fabricate a live result.

Therefore:

```text
STATIC/PERMANENT PASS
!=
LIVE PASS
```

remains frozen.

---

## 10. RS2-2 entry decision

RS2-2 State Synchronization **may begin after `RS2_1_CLOSED` even when `FULL_REPLACEMENT_AUTHORIZED` is false**.

Reason:

RS2-2 addresses machine-managed repeated facts and documentation staleness. It does not require full replacement of every historical behavioral assertion.

RS2-2 entry requires:

```text
RS2_1_CLOSED                           YES
DURABLE_TESTS_AVAILABLE                YES
PARTIAL_REPLACEMENT_AUTHORIZED         YES
required retained controls recorded    YES
current release mechanism retained     YES
runtime diff                           NONE
release-simcore diff                    NONE
```

RS2-2 must not reinterpret partial replacement as full release-workflow replacement.

The old release mechanism remains available through RS2-2 and RS2-3 until RS2-4 replacement gates are satisfied.

---

## 11. Full replacement promotion rule

`FULL_REPLACEMENT_AUTHORIZED` may be promoted later without reopening RS2-1 as an incomplete phase.

It is a stronger maintenance status.

Promotion requires:

1. every required `PARTIAL_TRANSITIONAL` mapping has been upgraded or explicitly dispositioned;
2. every required equivalence record is retirement-eligible;
3. no required `UNPROVABLE` mapping remains unresolved;
4. current production passes the full permanent pack;
5. retained live gates are still represented correctly;
6. no old assertion is being removed solely because its workflow is inconvenient.

Full replacement still does not by itself authorize deleting the release mechanism.

Release-mechanism retirement belongs to RS2-4 after shadow validation and rollback rehearsal.

---

## 12. Blocked states

RS2-1E defines these promotion blockers:

```text
HARNESS_NOT_TRUSTED
REQUIRED_FIXTURE_MISSING
REQUIRED_EQUIVALENCE_NOT_EQUIVALENT
REQUIRED_EQUIVALENCE_UNPROVABLE
TRANSITIONAL_CONTROL_UNRECORDED
RAW_DATA_POLICY_VIOLATION
PRODUCTION_BASELINE_REGRESSION
RUNTIME_DIFF_DETECTED
RELEASE_SIMCORE_DIFF_DETECTED
MANIFEST_MUTATION_DETECTED
LEGACY_PATH_REMOVED_TOO_EARLY
```

### 12.1 Hard blockers

The following prevent `RS2_1_CLOSED`:

```text
HARNESS_NOT_TRUSTED
REQUIRED_FIXTURE_MISSING
REQUIRED_EQUIVALENCE_NOT_EQUIVALENT
TRANSITIONAL_CONTROL_UNRECORDED
RAW_DATA_POLICY_VIOLATION
RUNTIME_DIFF_DETECTED
RELEASE_SIMCORE_DIFF_DETECTED
MANIFEST_MUTATION_DETECTED
LEGACY_PATH_REMOVED_TOO_EARLY
```

### 12.2 `UNPROVABLE` handling

A required core contract that is `UNPROVABLE` blocks replacement for that suite.

Whether it blocks RS2-1 close depends on whether the suite can be truthfully retained as transitional without losing an existing authority.

Rules:

- if existing authority can remain intact and the permanent coverage is additive, classify retained/transitional and do not claim replacement;
- if the migration process would drop the only known guard, RS2-1 close is blocked;
- never infer equivalence to clear the block.

---

## 13. Fallback and rollback

RS2-1 is infrastructure-only and must have a simple fallback:

```text
permanent harness problem
→ do not weaken/patch production
→ use last verified release-specific path
→ repair RS2 infrastructure separately
```

If an urgent correctness release is needed while RS2-1 tooling is broken:

- use the last verified release path;
- preserve the new incident evidence;
- do not block the correctness repair solely on RS2 infrastructure;
- record the RS2 tooling issue separately.

The permanent harness must never become a single point of failure before RS2-3/RS2-4 proves the replacement system.

---

## 14. Historical artifact disposition

RS2-1E distinguishes four historical artifact states:

```text
ACTIVE_REQUIRED
ACTIVE_PARTIAL
RETIRED_ASSERTION_CONTENT
HISTORICAL_EVIDENCE_ONLY
```

### `ACTIVE_REQUIRED`

Still contains a required release/live control not replaced by permanent equivalence.

### `ACTIVE_PARTIAL`

Some assertions are permanent/replaced, but other responsibilities remain active.

### `RETIRED_ASSERTION_CONTENT`

A specific mapped assertion no longer needs to be re-authored in future release CI because the permanent suite is authoritative for that deterministic contract.

### `HISTORICAL_EVIDENCE_ONLY`

The entire artifact has no active mechanism responsibility but is retained for provenance/history.

RS2-1E does not delete workflow files merely to change these classifications.

Physical cleanup belongs to a later bounded administrative change after replacement authority is proven.

---

## 15. Required close record

RS2-1 implementation must end with one bounded close record.

Directional location:

```text
products/simcore/tests/RS2_1_STATUS.json
```

or another clearly named machine-readable state record under the SimCore test infrastructure.

Required semantic fields:

```text
statusVersion
phase
harnessStatus
batchAStatus
equivalenceStatus
durableTestsAvailable
partialReplacementAuthorized
fullReplacementAuthorized
rs2_1Closed
retirementEligibleAssertionIds
retainedControlIds
productionSourceIdentity used for close proof
implementation evidence reference
closedAt
```

The record is release-infrastructure state, not production release identity.

It must not become a second authority for the currently deployed SimCore version.

Production release identity remains `product-manifest.json`.

---

## 16. Human-readable implementation evidence

RS2-1 implementation should also preserve a human-readable evidence document under `docs/` summarizing:

```text
harness self-test result
Batch A suite result
coverage-state matrix
RS2-1D equivalence matrix
retirement-eligible assertion IDs
retained transitional controls
production source identity tested
no-runtime-diff proof
promotion decision
RS2-2 eligibility
```

Do not duplicate full fixture payloads or raw reports into the document.

The machine-readable records remain the detailed bounded data source.

---

## 17. Promotion decision algorithm

RS2-1E freezes the promotion decision conceptually as:

```text
if harness invalid:
  BLOCKED

if required Batch A fixture missing:
  BLOCKED

if runtime/release-simcore/manifest mutated:
  BLOCKED

if any required mapping NOT_EQUIVALENT:
  BLOCKED

if transitional controls exist and are not retained explicitly:
  BLOCKED

DURABLE_TESTS_AVAILABLE = true

if any assertion mapping is retirement-eligible
and all non-eligible required controls remain retained:
  PARTIAL_REPLACEMENT_AUTHORIZED = true

if every required mapping retirement-eligible
and live-authority treatment is explicit:
  FULL_REPLACEMENT_AUTHORIZED = true
else:
  FULL_REPLACEMENT_AUTHORIZED = false

if DURABLE_TESTS_AVAILABLE
and PARTIAL_REPLACEMENT_AUTHORIZED
and no hard blocker:
  RS2_1_CLOSED = true
```

The initial design expects the final branch of this algorithm to produce:

```text
RS2_1_CLOSED = true
FULL_REPLACEMENT_AUTHORIZED = false
```

---

## 18. RS2-1 implementation order across subphases

When the durable-test phase is actually implemented, the consolidated order is:

```text
I0  create dedicated RS2-1 infrastructure work branch from current main
I1  implement RS2-1B harness minimum + self-tests
I2  implement RS2-1C Batch A suites/fixtures
I3  run permanent pack against materialized production baseline
I4  implement RS2-1D legacy assertion map/equivalence adapters
I5  run immutable historical differential/equivalence proof
I6  emit bounded equivalence report
I7  classify retirement-eligible assertion IDs
I8  write retained-controls ledger
I9  run no-runtime-diff / no-release-simcore-diff / no-manifest-write checks
I10 emit RS2-1 close record + implementation evidence
I11 apply RS2-1E promotion decision
I12 merge infrastructure-only result to main
I13 preserve current release path unchanged
I14 mark RS2-2 eligible if close gate passes
```

This implementation is one infrastructure work item and must not be mixed with a SimCore runtime feature release.

---

## 19. Validation gates for RS2-1 close

`RS2_1_CLOSED` requires all of the following:

```text
RS2-1B harness implemented                             PASS
harness self-tests                                     PASS
fixture-v1 validation                                  PASS
Batch A registry complete                              PASS
community-reaction suite                               PASS
diagnostic-copy suite                                  PASS
representation-fast coverage                           PASS / HYBRID_TRANSITIONAL recorded
genuine-edit coverage                                  PASS / HYBRID_TRANSITIONAL recorded
broadcast-closure coverage                             PASS / HYBRID_TRANSITIONAL recorded
RS2-1D legacy map                                      PASS
immutable historical source/proof pinning              PASS
community differential                                 PASS
diagnostic-copy equivalence                            PASS
all required partial mappings explicitly retained      PASS
no required NOT_EQUIVALENT mapping                     PASS
retirement eligibility assertion-level only            PASS
current production permanent-pack validation           PASS subject to declared transitional state
bounded report policy                                  PASS
raw long-chat fixture retention                        NONE
production runtime diff                                NONE
release-simcore diff                                   NONE
product-manifest mutation                              NONE
current release mechanism removed                      NO
fallback to old release path                           AVAILABLE
close record                                           WRITTEN
implementation evidence                                WRITTEN
```

`FULL_REPLACEMENT_AUTHORIZED` is deliberately absent from this required list.

---

## 20. RS2-1 design close gate

The RS2-1E **design** subphase is complete when:

```text
operational claim vocabulary defined                    PASS
RS2-1 completion separated from full replacement       PASS
partial replacement authority defined                  PASS
full replacement authority defined                     PASS
transitional retention ledger defined                  PASS
live authority separation defined                      PASS
RS2-2 entry decision defined                           PASS
historical artifact disposition defined                PASS
fallback/rollback defined                              PASS
blocked-state handling defined                         PASS
close-record contract defined                          PASS
implementation order defined                           PASS
final RS2-1 close gate defined                         PASS
runtime diff                                           NONE
release-simcore diff                                   NONE
```

No RS2-1 implementation is required to close the design subphase.

---

## 21. Handoff after RS2-1 implementation

If implementation produces the expected initial state:

```text
DURABLE_TESTS_AVAILABLE
PARTIAL_REPLACEMENT_AUTHORIZED
RS2_1_CLOSED
FULL_REPLACEMENT_AUTHORIZED = false
```

then the next Release System v2 phase may be:

```text
RS2-2 — State Synchronization
```

without waiting for M2-3 or B_END executable-equivalence upgrades.

The retained-control ledger remains active in parallel.

Later runtime architecture work may improve individual suite equivalence, but it does not reopen RS2-1 as failed or incomplete.

---

## 22. Frozen final rules

RS2-1E freezes the following final rules:

1. **Durable tests may become useful before they become total.**
2. **Partial replacement must be labeled partial.**
3. **An assertion may retire without deleting the historical file that once contained it.**
4. **A transitional live/state control survives RS2-1 close until its own replacement proof exists.**
5. **RS2-2 may begin after honest RS2-1 partial closure.**
6. **Full release-mechanism replacement belongs to RS2-4, not RS2-1.**
7. **Release System v2 must adapt to SimCore architecture; SimCore runtime must not be distorted to satisfy Release System v2.**

The safe initial outcome is therefore not:

```text
old system replaced
```

It is:

```text
permanent regression infrastructure established
+
proved assertion-level reuse begun
+
remaining historical/live authority explicitly retained
```
