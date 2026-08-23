# SimCore Release System v2 — RS2-1C First Permanent Regression Pack

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Parent inventory: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
Harness contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
Phase: `RS2-1 — Durable Tests`
Subphase: `RS2-1C — First Permanent Regression Pack`
Authority class: release-infrastructure design / first permanent regression-pack implementation contract

---

## 1. Purpose

RS2-1C defines the first concrete permanent regression pack that will be implemented on top of the RS2-1B harness contract.

The purpose is to convert the strongest current SimCore correctness controls from release-specific one-shot assertions into durable subsystem-owned assets without changing production runtime behavior.

RS2-1C freezes:

- the exact first pack membership;
- suite-by-suite fixture shape;
- source adapter strategy;
- which assertions are directly executable against the current bundle;
- which assertions temporarily require a bounded source-binding bridge;
- migration order;
- registry order;
- harness self-tests required before product fixtures are trusted;
- bounded report requirements;
- implementation validation gates;
- the handoff to RS2-1D baseline-equivalence proof.

This document does **not** implement the harness or fixtures.

---

## 2. Non-goals and hard scope

RS2-1C does not authorize:

- any `release-simcore` runtime change;
- any modification of `plugins/simcore/latest.js` or `install.js`;
- any SimCore version bump;
- M2-3 implementation;
- source modularization;
- new persistent state;
- changes to Reaction grammar or normalization;
- changes to Representation or Edit Reconcile decisions;
- changes to Broadcast/Time/Frame semantics;
- changes to diagnostic-copy behavior;
- changes to host/storage/network/timer behavior;
- a permanent GitHub CI workflow;
- replacement or deletion of the existing release mechanism;
- deletion of historical one-shot fixtures before RS2-1D proves equivalence.

RS2-1C is main-branch release-infrastructure work only.

If implementation of a test appears to require modifying production code solely to make the code testable, stop and classify that coverage as transitional rather than changing runtime in this phase.

---

## 3. Reference production state versus test authority

At design freeze, production is SimCore `v0.64.5` on `release-simcore`.

That version is reference provenance only.

The permanent harness must not hardcode `0.64.5` as the definition of production. At execution time, the outer orchestrator or developer materializes the chosen source and passes a local path to the harness.

Version-specific source may be used only for bounded migration/differential proof, for example:

```text
v0.64.4 physical-line behavior -> MISSING x5
v0.64.5 logical-unit behavior  -> PASS
```

Normal future regression runs execute the current source against stable contract fixtures.

---

## 4. First pack membership

The RS2-1C pack ID is:

```text
batch-a
```

It contains exactly these five stable suites in the first implementation:

```text
1. representation-fast
2. genuine-edit
3. community-reaction
4. broadcast-closure
5. diagnostic-copy
```

No Batch B or Batch C suite may be silently pulled into RS2-1C.

Architecture Contracts v2 remains an existing independent checker during RS2-1. It is not counted as one of the five first-pack behavioral suites.

---

## 5. Coverage-state model

The current single-file architecture does not expose every historical contract at the same executable boundary. RS2-1C therefore distinguishes coverage honestly instead of pretending that a static marker check is equivalent to an end-to-end behavioral test.

Each suite must report one implementation coverage state:

```text
EXECUTABLE
HYBRID_TRANSITIONAL
NOT_MIGRATED
```

### 5.1 `EXECUTABLE`

The expected behavior is directly invoked from code extracted from the source under test using the RS2-1B module/function loader and deterministic stubs.

This is the preferred state.

### 5.2 `HYBRID_TRANSITIONAL`

Part of the contract is directly executable, but one bounded decision or orchestration surface still lives inside the outer runtime and cannot safely be invoked without violating RS2-1B.

A hybrid suite must contain both:

1. direct executable assertions for the currently exposed owner/module behavior; and
2. a narrowly scoped source-binding guard proving the live runtime is still wired to the expected decision markers/order.

A source-binding guard is a migration bridge, **not** a substitute for a full behavioral claim.

The bounded report must name the missing executable surface.

### 5.3 `NOT_MIGRATED`

The suite is not ready. It cannot be silently skipped while `batch-a` reports PASS.

### 5.4 Promotion rule

RS2-1C itself may close with documented `HYBRID_TRANSITIONAL` suites where current architecture makes a safe direct test impossible.

However:

```text
HYBRID_TRANSITIONAL != full behavioral equivalence
```

RS2-1D must account for this explicitly before the permanent pack can replace historical release-specific assertions as an authoritative release gate.

---

## 6. Target implementation files

RS2-1C implementation will create the minimum RS2-1B layout needed by Batch A.

```text
products/simcore/
  tests/
    registry.mjs
    schema/
      fixture-v1.schema.json
    suites/
      representation-fast.test.mjs
      genuine-edit.test.mjs
      community-reaction.test.mjs
      broadcast-closure.test.mjs
      diagnostic-copy.test.mjs
    fixtures/
      representation-fast/
      genuine-edit/
      community-reaction/
      broadcast-closure/
      diagnostic-copy/
  tooling/
    test.mjs
    bundle-loader.mjs
    test-context.mjs
    assertions.mjs
```

Optional implementation-only helpers may be added under:

```text
products/simcore/tests/helpers/
```

only when they are generic test helpers shared by more than one suite.

Do not create version-named harness files such as:

```text
06405-test.mjs
06403-regression.mjs
```

Version belongs in fixture provenance metadata.

---

## 7. Harness implementation minimum required by RS2-1C

RS2-1C does not implement every future RS2-1B feature. It implements the smallest safe subset required by Batch A.

Required:

```text
single-source mode
explicit registry
fixture-v1 validation
bounded SimCore.define module extraction
bounded unique named-function extraction
fresh module cache per fixture
deterministic capability stubs
serial execution
PASS / FAIL / HARNESS_ERROR
exit 0 / 1 / 2
bounded JSON report support
```

Not required in RS2-1C implementation:

```text
parallel execution
permanent GitHub workflow
automatic ref resolution
automatic release materialization
automatic manifest writes
source modularization
full Batch B/C support
```

Differential CLI support may be implemented now if it is trivial, but RS2-1D owns the authoritative baseline-equivalence proof.

---

## 8. Loader extension: unique named local functions

Some Batch A contracts are represented by named functions inside the outer runtime lexical body rather than a `SimCore.define` module.

RS2-1C therefore requires the RS2-1B loader to support one additional bounded extraction class:

```text
UNIQUE_NAMED_FUNCTION
```

Rules:

1. the function declaration must have an exact expected name;
2. the declaration must occur exactly once;
3. extraction must use balanced syntax boundaries, not a greedy line regex;
4. the extracted function may execute only with explicit arguments and declared deterministic capabilities;
5. unresolved free variables are `HARNESS_ERROR / FUNCTION_DEPENDENCY_UNRESOLVED`;
6. the loader may not execute surrounding outer-runtime statements;
7. the loader may not rewrite the extracted body;
8. duplicate matches are `HARNESS_ERROR / FUNCTION_EXTRACTION_AMBIGUOUS`.

Initial Batch A users:

```text
runDiagnosticCopy
fallbackCopyText
```

No anonymous statement block may be treated as a function merely to make a test pass.

---

# 9. Suite A1 — Representation Fast Reconcile

Stable suite ID:

```text
representation-fast
```

Primary protected contract:

```text
prior representation = OUTPUT_MISMATCH
current visible == prior FRESH_CHAT exact
current visible != prior canonical
same output slot/location
session current/trusted canonical identity still matches prior canonical
→ REPRESENTATION_DRIFT_CORRELATED
→ representation-fast-reconciled
→ no snapshot rebuild/write
```

## 9.1 Current executable owner surface

The current `representation` module owns deterministic relation facts through:

```text
representation.inspectCarryover(...)
representation.createRegistry(...)
```

The suite must directly execute these functions from the source under test.

Required fixtures:

### `representation-fast.fresh-exact-carryover`

Input shape:

```text
prior fingerprintMatch = output mismatch class
prior canonical != prior fresh
current = prior fresh exact
```

Expected executable facts:

```text
priorRepresentation = OUTPUT_MISMATCH
currentMatch = FRESH_CHAT
deltaShape = FRESH_EXACT_CARRYOVER
```

### `representation-fast.fresh-exact-one-char-delta`

Captured-shape control representing the natural one-character representation mismatch.

No raw assistant body is stored. Only bounded fingerprints/length relation required to produce the same classification are retained.

Expected:

```text
currentMatch = FRESH_CHAT
classification remains exact carryover despite one-character canonical/Fresh length delta
```

### `representation-fast.third-representation-negative`

Current matches neither canonical nor Fresh.

Expected:

```text
currentMatch = NONE
not eligible as Fresh exact carryover
```

## 9.2 Transitional decision binding

Before M2-3, the final `representationFastEligible` decision remains in outer request orchestration rather than an independently executable application service.

RS2-1C must **not** copy that boolean algorithm into test code and call the copy a production test.

Instead the suite is initially:

```text
HYBRID_TRANSITIONAL
```

with a bounded source-binding guard requiring the current source to retain all of these decision dependencies in the same gate:

```text
prior provenance exists
priorRepresentation == OUTPUT_MISMATCH
currentMatch == FRESH_CHAT
prior canonical exists
prior fresh exists
prior canonical != prior fresh
visible fingerprint == prior fresh
current output index == last assistant
current output fingerprint == prior canonical
trusted output fingerprint == prior canonical
```

and the success result must retain the bounded reason:

```text
representation-fast-reconciled
```

The bridge must also assert absence of the manual-rebuild call inside the fast-success branch if this can be proven by bounded AST/source-region inspection.

If branch isolation cannot be proven safely, report the limitation instead of expanding regex tolerance.

## 9.3 M2-3 upgrade path

Once v0.65.0 physically introduces the frozen `edit-reconcile` service, the suite adapter must switch from the transitional source-binding guard to direct service execution with deterministic Store and Session Port stubs.

Fixture IDs and expected semantic outcomes remain unchanged.

Expected post-M2-3 coverage state:

```text
EXECUTABLE
```

No fixture rename is allowed merely because ownership moved.

---

# 10. Suite A2 — Genuine Visible Edit

Stable suite ID:

```text
genuine-edit
```

Protected contract:

```text
prior exact canonical identity
current visible matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ state/snapshot updated through the existing reconcile path
```

## 10.1 Current executable classification surface

The suite directly executes Representation relation classification.

Required fixtures:

### `genuine-edit.neither-canonical-nor-fresh`

Expected:

```text
priorRepresentation = EXACT
currentMatch = NONE
deltaShape = NEW_VISIBLE_REPRESENTATION
```

### `genuine-edit.same-length-different-fingerprint`

The visible representation has the same character-length class as canonical but a different fingerprint and does not match Fresh.

Expected:

```text
currentMatch = NONE
must not become exact solely because lengths match
```

### `genuine-edit.not-representation-drift`

Expected:

```text
not FRESH_CHAT exact carryover
```

## 10.2 Transitional decision binding

Before M2-3, `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT` is not a safely isolated application-service call.

The first implementation therefore uses:

```text
HYBRID_TRANSITIONAL
```

and must statically bind the executable Representation facts to the existing runtime markers:

```text
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
```

The suite must not claim that snapshot mutation was dynamically proven when only the relation facts were executed.

The bounded result must expose:

```text
missingExecutableSurface = EDIT_RECONCILE_STATE_CHANGE_PATH
```

## 10.3 M2-3 upgrade path

After `edit-reconcile.createService({ store, sessionPort })` exists, direct deterministic service fixtures become mandatory:

```text
current differs from canonical and Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ save/commit exactly as expected
→ snapshot updated
```

A negative control must prove the representation-fast case does not enter the rebuild path.

At that point coverage becomes:

```text
EXECUTABLE
```

---

# 11. Suite A3 — COMMUNITY Multiline Reaction Unit

Stable suite ID:

```text
community-reaction
```

Expected RS2-1C coverage state:

```text
EXECUTABLE
```

Source owners:

```text
community.commentUnits
reaction.inspectCommentReactionLine
structure.validateStructure
```

This suite must preserve ownership boundaries:

```text
Community = logical grouping
Reaction  = grammar/inspection
Structure = judge-only validation
```

## 11.1 Required fixtures

### `community-reaction.multiline-bilingual-valid`

Captured shape:

```text
- @a: English comment
(한국어 번역) [RT 1,001]
```

Expected:

```text
one logical TOP unit
one valid reaction tag at logical-unit end
PASS
```

### `community-reaction.multiline-bilingual-reply-valid`

Captured shape:

```text
ㄴ @b: English reply
(한국어 번역) [RT 1,002]
```

Expected:

```text
one logical REPLY unit
PASS
```

### `community-reaction.section-4-top-1-reply-valid`

Bounded X(EN)-style section with four top-level comments and one nested reply.

Expected:

```text
logical units = 5
TOP = 4
REPLY = 1
reaction failures = 0
```

### `community-reaction.single-line-historical-valid`

Covers supported single-line labels:

```text
공감
RT
좋아요
추천
포텐
Upvote
```

using bounded numeric forms already supported by production grammar.

## 11.2 Negative fixtures

Permanent negatives:

```text
community-reaction.missing
community-reaction.multiple
community-reaction.final-tail-continuation
community-reaction.final-tail-visible
community-reaction.unrelated-bracket
```

Expected failure classes remain:

```text
MISSING
MULTIPLE
FINAL_TAIL
```

No suite code may normalize or repair the fixture before passing it to production logic.

## 11.3 Historical differential provenance

The suite records migration provenance that the same bounded bilingual 4+1 shape produced:

```text
v0.64.4 physical starter-line framing -> MISSING x5
v0.64.5 logical comment-unit framing   -> PASS
```

The historical physical-line algorithm may exist only as an explicitly named reference helper for RS2-1D migration proof.

It is not production source and must never be used during ordinary future golden runs.

---

# 12. Suite A4 — B_END Closure

Stable suite ID:

```text
broadcast-closure
```

Initial expected coverage state:

```text
HYBRID_TRANSITIONAL
```

Reason: the contract spans Time parsing, Structure validation, lifecycle/session state behavior, and diagnostic closure formatting; not all of those decisions are currently exposed as one bounded application service.

The suite must test each executable owner directly and bind the remaining orchestration without booting the real plugin runtime.

## 12.1 Executable Time control

Use the extracted `time` module to evaluate a bounded B_END response timestamp sequence.

Required positive fixture:

```text
frame timestamp present
later explicit terminal canonical timestamp present
timestamp sequence monotonic
```

Expected:

```text
sceneCount > 0
tailStatus = MONOTONIC
candidate = terminal timestamp
```

Required negative controls:

```text
missing explicit terminal
non-monotonic terminal sequence
malformed timestamp tail
```

These must fail closed according to the existing Time contract.

## 12.2 Executable Structure control

Use `structure.validateStructure` with a deterministic pending B_END context and bounded output body.

Required valid fixture:

```text
Response envelope valid
exactly 2 COMMUNITY blocks
3 platform sections per block
4 top + 1 reply per section
reaction units valid
Knowledge final
```

Expected:

```text
COMMUNITY reaction warnings = 0
B_END structural warnings = 0 for the protected closure shape
```

Required diagnostic-separation negative fixture:

```text
Broadcast terminal facts valid
COMMUNITY malformed
```

Expected:

```text
Structure warns/quarantines
no assertion may reinterpret that as Broadcast end authority denial
```

## 12.3 Transitional closure binding

Until closure derivation is available through a bounded executable helper, the suite statically binds these existing diagnostic semantics:

```text
broadcastTerminalExplicit = terminal sequence has sceneCount > 0 + MONOTONIC + candidate
broadcastCommunityClean = no COMMUNITY warning
COMPLETE iff broadcastTerminalExplicit && broadcastCommunityClean
otherwise PARTIAL
```

The source-binding guard must verify that B_END diagnostic status continues to distinguish:

```text
terminal EXPLICIT / MISSING_OR_INVALID
structure PASS / QUARANTINED
```

It must not evaluate an independently copied replacement formula and call that production behavior.

## 12.4 Stored airtime and unlock limitation

The first harness must not boot the production outer runtime merely to prove storage/unlock state changes.

Until a bounded Session/Lifecycle service boundary supports deterministic invocation, the suite report must state:

```text
missingExecutableSurface = B_END_STATE_COMMIT_AND_UNLOCK
```

The historical live evidence remains authoritative for the end-to-end state behavior during the transitional period.

A later safe application-service extraction may upgrade this suite to `EXECUTABLE` without changing fixture IDs.

---

# 13. Suite A5 — Diagnostic Copy Resilience

Stable suite ID:

```text
diagnostic-copy
```

Expected RS2-1C coverage state:

```text
EXECUTABLE
```

The current source contains uniquely named local functions suitable for bounded extraction:

```text
runDiagnosticCopy
fallbackCopyText
```

The suite must not invoke the surrounding settings UI or outer runtime.

## 13.1 `runDiagnosticCopy` fixtures

### `diagnostic-copy.primary-success`

Setup:

```text
buildReport -> payload
primaryCopy -> success
fallbackCopy should not execute
```

Expected:

```text
result = COPIED
build count = 1
primary count = 1
fallback count = 0
```

### `diagnostic-copy.fallback-success`

Setup:

```text
buildReport -> payload
primaryCopy -> throws/rejects
fallbackCopy -> success
```

Expected:

```text
result = COPIED_FALLBACK
build count = 1
primary count = 1
fallback count = 1
primary payload == fallback payload exactly
```

### `diagnostic-copy.report-build-failed`

Setup:

```text
buildReport -> throws
```

Expected:

```text
result = REPORT_BUILD_FAILED
primary count = 0
fallback count = 0
```

### `diagnostic-copy.clipboard-write-failed`

Setup:

```text
build succeeds
primary fails or unavailable
fallback fails
```

Expected:

```text
result = CLIPBOARD_WRITE_FAILED
build count = 1
```

## 13.2 `fallbackCopyText` DOM fixture

Use only the deterministic DOM capability from `test-context.mjs`.

Required assertions:

```text
temporary textarea created once
payload assigned exactly
textarea appended before copy
selection requested
execCommand('copy') observed
textarea removed in finally path
previous active element focus restoration attempted when valid
no real DOM used
```

Required failure fixture:

```text
execCommand false or throws
```

Expected:

```text
cleanup still occurs
no temporary node leaks
```

No raw diagnostic report is needed; use a short neutral synthetic payload.

---

## 14. Fixture JSON conventions for Batch A

Each fixture follows `fixture-v1.schema.json` and the RS2-1B common envelope.

Batch A adds these bounded optional metadata fields:

```json
{
  "meta": {
    "goldenGate": true,
    "coverageExpectation": "EXECUTABLE",
    "migrationFrom": "optional prior release or one-shot evidence identifier"
  }
}
```

Rules:

- `goldenGate` is registry/suite metadata, not a second evidence class;
- `coverageExpectation` is implementation metadata and may be `EXECUTABLE` or `HYBRID_TRANSITIONAL`;
- `migrationFrom` is provenance only;
- production commit/blob/version is not copied by hand into every fixture;
- full RAW logs remain prohibited.

---

## 15. Stable registry contract

`products/simcore/tests/registry.mjs` is explicit and ordered.

Initial pack order is frozen as:

```text
representation-fast
genuine-edit
community-reaction
broadcast-closure
diagnostic-copy
```

The order is not performance-driven. It follows dependency/attribution value:

1. identity classification controls;
2. genuine-edit distinction;
3. COMMUNITY validator correctness;
4. B_END closure composition;
5. diagnostic transport resilience.

Each registry entry declares at least:

```text
suite ID
suite module path
fixture directory
coverage state
required/optional status
golden-gate status
```

The runner must reject:

```text
duplicate suite ID
duplicate fixture ID
unknown suite referenced by fixture
missing required fixture directory
```

as `HARNESS_ERROR`.

---

## 16. Harness self-test gate

No Batch A result is trusted until the harness proves its own failure-closed behavior.

RS2-1C implementation must include self-tests for at least:

```text
unique module extraction PASS
duplicate module extraction -> MODULE_EXTRACTION_AMBIGUOUS
missing module -> MODULE_EXTRACTION_FAILED
unique named-function extraction PASS
duplicate named function -> FUNCTION_EXTRACTION_AMBIGUOUS
unresolved function dependency -> FUNCTION_DEPENDENCY_UNRESOLVED
invalid fixture schema -> HARNESS_ERROR
undeclared capability request -> HARNESS_ERROR
fixture state does not leak into next fixture
source file bytes unchanged after run
report excludes raw source bodies by default
```

Self-tests use synthetic mini sources under test fixtures. They must not mutate the real SimCore bundle.

---

## 17. Implementation sequence

The RS2-1C implementation must proceed in this order.

### Step C0 — Infrastructure work branch

Create a main-based infrastructure work branch.

No branch is based on `release-simcore` because this phase does not modify production runtime.

### Step C1 — Harness skeleton

Implement:

```text
test.mjs
bundle-loader.mjs
test-context.mjs
assertions.mjs
fixture-v1.schema.json
registry.mjs skeleton
```

Run harness self-tests before adding product suites.

### Step C2 — COMMUNITY suite first

Migrate `community-reaction` first because it has the cleanest current module boundary and a recent proven differential.

Required state:

```text
EXECUTABLE
```

### Step C3 — Diagnostic Copy suite

Add unique named-function extraction and deterministic clipboard/DOM stubs.

Required state:

```text
EXECUTABLE
```

### Step C4 — Representation/Genuine Edit pair

Migrate both together because they share Representation relation fixtures and must remain mutually exclusive controls.

Expected pre-M2-3 state:

```text
representation-fast = HYBRID_TRANSITIONAL
genuine-edit        = HYBRID_TRANSITIONAL
```

Do not duplicate the full outer decision algorithm into suite code.

### Step C5 — B_END Closure

Add Time + Structure executable controls and bounded closure source-binding guard.

Expected initial state:

```text
HYBRID_TRANSITIONAL
```

### Step C6 — Full `batch-a` run

Run all required fixtures serially and emit one bounded summary.

### Step C7 — Freeze implementation evidence

Record:

```text
harness commit
source-under-test SHA-256
suite counts
fixture counts
coverage states
PASS/FAIL/HARNESS_ERROR counts
known transitional surfaces
```

Do not record full source bodies or raw long-chat output.

### Step C8 — Hand off to RS2-1D

No old one-shot fixture is deleted yet.

RS2-1D proves old/new equivalence and decides which historical assertions may be retired.

---

## 18. Implementation validation matrix

RS2-1C implementation is accepted only if all of the following hold.

### Harness integrity

```text
node syntax for all .mjs files                         PASS
fixture JSON schema validation                         PASS
harness self-tests                                     PASS
source input SHA before == after                       PASS
no repository/network write capability in harness     PASS
serial deterministic rerun produces same results      PASS
```

### Suite migration

```text
community-reaction                                     EXECUTABLE / PASS
diagnostic-copy                                        EXECUTABLE / PASS
representation-fast                                    HYBRID_TRANSITIONAL or EXECUTABLE / PASS
genuine-edit                                           HYBRID_TRANSITIONAL or EXECUTABLE / PASS
broadcast-closure                                      HYBRID_TRANSITIONAL or EXECUTABLE / PASS
```

### Production isolation

```text
plugins/simcore/latest.js diff                         NONE
plugins/simcore/install.js diff                        NONE
release-simcore diff                                   NONE
product-manifest.json authority change                 NONE
runtime version change                                 NONE
host/storage/network/timer runtime surface change      NONE
```

### Release-system isolation

```text
existing release path deletion                         NONE
permanent simcore-ci.yml                               NOT YET REQUIRED
permanent release workflow                             NOT YET REQUIRED
one-shot historical fixtures deletion                  NONE
```

---

## 19. RS2-1C result report

A successful `batch-a` run emits a bounded result conceptually equivalent to:

```json
{
  "status": "PASS",
  "source": {
    "label": "candidate",
    "sha256": "...",
    "bytes": 123
  },
  "pack": "batch-a",
  "suites": [
    {
      "id": "community-reaction",
      "coverage": "EXECUTABLE",
      "status": "PASS",
      "fixtures": {"pass": 9, "fail": 0, "error": 0}
    },
    {
      "id": "representation-fast",
      "coverage": "HYBRID_TRANSITIONAL",
      "status": "PASS",
      "fixtures": {"pass": 3, "fail": 0, "error": 0},
      "missingExecutableSurface": "EDIT_RECONCILE_FAST_DECISION"
    }
  ]
}
```

The exact numeric fixture count may differ from this example after implementation review.

Rules:

- no stack dump by default;
- no full source excerpt;
- no full fixture payload in summary;
- fixture IDs and bounded failure codes are sufficient for normal CI diagnosis;
- debug mode, if later added, must still respect raw-log prohibitions.

---

## 20. Failure policy

### `FAIL`

Use when production source executes successfully but violates an expected fixture contract.

Examples:

```text
community multiline valid becomes MISSING
third representation becomes FRESH_CHAT
runDiagnosticCopy builds twice
valid B_END Structure emits COMMUNITY warning
```

### `HARNESS_ERROR`

Use when the test mechanism cannot establish a trustworthy result.

Examples:

```text
module/function extraction ambiguous
fixture schema invalid
required deterministic capability unavailable
registry duplicate
source file unreadable
```

### Transitional mismatch

If a source-binding guard no longer finds the pre-M2-3 decision shape:

- do not automatically call the behavior regressed;
- report `HARNESS_ERROR / TRANSITIONAL_BINDING_STALE` unless a direct executable fixture independently proves FAIL;
- inspect whether ownership moved intentionally;
- update the adapter only with an explicit architecture/evidence record.

This prevents a mechanical M2-3 move from being misreported as a correctness regression merely because line placement changed.

---

## 21. Relationship to M2-3

RS2-1C must not become a hidden blocker that forces M2-3 implementation into this infrastructure phase.

The relationship is:

```text
before M2-3:
Representation facts executable
Edit Reconcile final decision transitional

M2-3 moves decision ownership into edit-reconcile service

then:
RS2 permanent fixture IDs stay stable
suite adapter changes to direct service execution
coverage upgrades HYBRID_TRANSITIONAL -> EXECUTABLE
```

This is deliberate.

The permanent fixture describes the behavior contract; module ownership may evolve underneath it.

No M2-3 runtime code is added for the sake of RS2-1C.

---

## 22. Relationship to v0.64.5 live close

The `community-reaction` permanent fixture is derived from the proven v0.64.4 MISSING x5 root cause and v0.64.5 repair contract.

RS2-1C design does not replace the required real long-chat v0.64.5 live close.

Static permanent regression evidence and real production validation remain separate authority classes.

If v0.64.5 live validation finds a new anomaly:

```text
record evidence immediately
classify WATCH / DEFER / FIX / BLOCKER
keep the anomaly separate from RS2 unless it changes a permanent contract
```

---

## 23. No permanent CI yet

RS2-1C creates reusable test code, not the final CI orchestration.

The authoritative command after implementation is local/read-only in shape:

```text
node products/simcore/tooling/test.mjs \
  --source <materialized-source> \
  --suite batch-a
```

RS2-3 later decides when and how GitHub Actions runs this automatically on SimCore changes.

If RS2-1C implementation requires CI execution for validation before RS2-3 exists, any temporary validation workflow must:

- be explicitly infrastructure-only;
- have no production deploy/write step;
- use the same read-only harness command;
- not become a new release authority;
- be removed or retired after its validation purpose is complete.

A temporary validation workflow is not itself the permanent CI design.

---

## 24. One-shot fixture retirement rule

RS2-1C does not delete old one-shot assertions, workflows, or scripts merely because equivalent-looking permanent files now exist.

Retirement requires RS2-1D.

Required order:

```text
old assertion known result
new permanent fixture known result
same source / bounded equivalent source
same protected semantic outcome
→ equivalence recorded
→ only then old assertion may be marked retirement-eligible
```

If the results differ, preserve both and investigate attribution before deletion.

---

## 25. RS2-1C close gate

RS2-1C **design** is frozen when this document is accepted.

Future RS2-1C **implementation** closes only when:

```text
minimal permanent harness implemented                   PASS
harness self-tests                                      PASS
Batch A registry present                                PASS
community-reaction executable suite                     PASS
diagnostic-copy executable suite                        PASS
representation-fast direct relation fixtures            PASS
genuine-edit direct relation fixtures                   PASS
broadcast Time + Structure fixtures                     PASS
all transitional binding limits explicit                PASS
batch-a bounded report                                  PASS
source bytes unchanged by harness                       PASS
release-simcore runtime diff                            NONE
manifest authority change                               NONE
permanent CI replacement                                NONE
historical one-shot deletion                            NONE
```

RS2-1C implementation completion does **not** by itself authorize retiring old release-specific fixtures.

---

## 26. Next subphase

After RS2-1C implementation evidence exists, proceed to:

```text
RS2-1D — Baseline Equivalence Proof
```

RS2-1D must answer, fixture family by fixture family:

```text
Did the permanent harness reproduce the old release-specific assertion on the same bounded contract?
Can the old assertion now be retired without losing evidence or coverage?
Which HYBRID_TRANSITIONAL suites still need a later executable ownership boundary?
```

Only after that proof may RS2-1E decide whether RS2-1 Durable Tests as a whole is ready for promotion/close.
