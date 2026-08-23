# SimCore Release System v2 — RS2-1A Fixture Inventory

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Phase: `RS2-1 — Durable Tests`
Subphase: `RS2-1A — Fixture Inventory`
Authority class: release-infrastructure design / regression-evidence inventory

## 1. Purpose

RS2-1A defines which existing SimCore correctness evidence is valuable enough to become a permanent regression asset before any permanent test harness is implemented.

This phase does **not**:

- change SimCore runtime behavior;
- change `release-simcore`;
- replace the current release mechanism;
- create the permanent CI workflow;
- alter `product-manifest.json` authority;
- change M2/M3 behavior or ordering;
- convert raw long-chat logs into permanent repository payloads.

The output of RS2-1A is an authoritative bounded inventory. RS2-1B will define how the permanent harness executes these assets.

---

## 2. Inventory principle

A fixture is promoted because it protects a durable behavioral contract, not because it belonged to a particular version.

Bad organization:

```text
06403-test
06404-test
06405-test
```

Target organization:

```text
diagnostic-copy
representation-fast
genuine-edit
broadcast-closure
community-reaction
summary-scope
frozen-surfaces
architecture-contracts
```

Version numbers remain provenance metadata, not the primary test identity.

---

## 3. Fixture classes

Every permanent fixture must declare exactly one evidence class.

### 3.1 `SYNTHETIC`

A minimal hand-authored input that isolates one deterministic contract.

Use when:

- the contract can be expressed without reproducing a full live turn;
- small negative controls are required;
- exact malformed variants must be tested.

Examples:

- reaction tag missing / multiple / final-tail cases;
- diagnostic copy stage-result fixtures;
- exact authority classifier combinations.

### 3.2 `CAPTURED_SHAPE`

A bounded structural reduction of a real live incident or success path.

Rules:

- preserve only the minimum shape required to reproduce the contract;
- do not retain full raw long-chat transcripts;
- do not retain unrelated user prose or model output;
- record the evidence-document reference and original release version;
- replace irrelevant names/content with neutral placeholders when semantics are not part of the contract.

Examples:

- bilingual X(EN) logical comment/reply shape that produced `MISSING × 5` in v0.64.4;
- `CANONICAL != FRESH_CHAT` followed by exact Fresh carryover;
- genuine visible edit where current matches neither canonical nor Fresh.

### 3.3 `GOLDEN_CONTRACT`

A bounded fixture whose expected result represents a historically validated behavior that later releases must preserve unless an explicit contract change retires it.

Use when:

- the behavior already survived real long-chat validation;
- the contract is a protected dependency for later architecture work;
- regression would make attribution of future changes ambiguous.

Examples:

- Representation Fast reconcile;
- genuine user edit rebuild;
- B_END explicit terminal closure;
- valid multiline COMMUNITY reaction validation after v0.64.5.

---

## 4. Required fixture metadata

Each permanent fixture must eventually expose bounded metadata equivalent to:

```json
{
  "id": "community-reaction.multiline-bilingual-valid",
  "subsystem": "community-reaction",
  "evidenceClass": "CAPTURED_SHAPE",
  "introducedBy": "0.64.5",
  "sourceEvidence": "docs/SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md",
  "contract": "logical comment/reply unit owns reaction-tail validation scope",
  "expected": "PASS",
  "negativeControl": false,
  "retirementPolicy": "explicit-contract-change-only"
}
```

Exact file syntax is deferred to RS2-1B. RS2-1A freezes the required semantic fields only.

Required semantic fields:

- stable fixture ID;
- subsystem;
- evidence class;
- release/version provenance;
- evidence document reference when available;
- one-sentence protected contract;
- bounded expected outcome;
- positive/negative-control identity;
- retirement policy.

No fixture metadata may contain a full raw diagnostic report, full long-chat response, arbitrary exception dump, or mutable production identity copied by hand.

---

## 5. Promotion criteria

A historical fixture is eligible for permanent promotion when at least one of the following is true:

1. it protects a correctness defect that was directly observed in real use;
2. it protects a behavior explicitly frozen for a later architecture checkpoint;
3. it distinguishes user edits from representation/host drift;
4. it protects production state/closure authority;
5. it protects a release/diagnostic failure mode that can otherwise silently regress;
6. it is reused as a regression control by more than one subsequent release;
7. it guards a forbidden side-effect or architecture boundary.

A fixture should **not** be promoted merely because a one-shot CI script happened to contain it.

---

## 6. Priority inventory — Batch A

Batch A is the minimum first permanent regression pack. These assets must be designed first in RS2-1B/1C because they are current correctness dependencies and have strong evidence.

### A1. Representation Fast Reconcile

Stable family: `representation-fast`

Protected path:

```text
prior representation = OUTPUT_MISMATCH
current visible == prior FRESH_CHAT exact
current visible != prior canonical
→ Edit origin = REPRESENTATION_DRIFT_CORRELATED
→ Edit reconcile = REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

Evidence class:

```text
GOLDEN_CONTRACT + CAPTURED_SHAPE
```

Required fixtures:

- small canonical/Fresh delta;
- natural-style one-character delta control;
- larger delta control if the permanent harness can express it without duplicating raw bodies;
- exact Fresh carryover must not route to manual rebuild.

Primary provenance:

- v0.63.55 correctness validation;
- v0.64.4 natural revalidation at @2099→@2100;
- M2-2 protected behavior;
- v0.65.0 M2-3 golden control.

Retirement policy: explicit representation/edit-reconcile contract change only.

### A2. Genuine Visible Edit

Stable family: `genuine-edit`

Protected path:

```text
prior = EXACT
current != canonical
current != Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

Evidence class:

```text
GOLDEN_CONTRACT + CAPTURED_SHAPE
```

Required controls:

- current differs from both canonical and Fresh;
- same-length/different-fingerprint case;
- successful rebuild updates the state snapshot;
- must not be confused with `REPRESENTATION_DRIFT_CORRELATED`.

This fixture is mandatory before M2-3 closes and therefore belongs in the first permanent pack.

Retirement policy: explicit edit-reconcile contract change only.

### A3. COMMUNITY Multiline Reaction Unit

Stable family: `community-reaction`

Protected contract:

```text
Community owns logical comment/reply grouping.
Reaction owns reaction grammar/inspection.
Structure judges the complete logical unit.
```

Evidence class:

```text
CAPTURED_SHAPE + GOLDEN_CONTRACT
```

Required positive fixtures:

- historical single-line comment/reply;
- bilingual top-level comment with reaction tag on translation continuation line;
- bilingual nested reply with reaction tag on continuation line;
- full 4 top + 1 reply X(EN)-style section.

Required differential fixture:

```text
v0.64.4 physical starter-line framing
→ MISSING ×5

v0.64.5 logical-unit framing
→ PASS
```

Required negative controls:

- no reaction tag → `MISSING`;
- two valid tags inside one logical unit → `MULTIPLE`;
- tag before visible continuation → `FINAL_TAIL`;
- visible text after final reaction tag → `FINAL_TAIL`;
- unrelated bracket syntax → not a reaction tag.

Primary provenance:

- `docs/SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md`;
- `docs/SIMCORE_06405_COMMUNITY_MULTILINE_REACTION_UNIT_REPAIR_PLAN.md`;
- v0.64.5 release CI differential.

Retirement policy: explicit COMMUNITY/reaction contract change only.

### A4. B_END Closure

Stable family: `broadcast-closure`

Protected contract:

```text
B_END explicit terminal authority
+ valid terminal airtime
+ valid expected COMMUNITY structure
→ terminal EXPLICIT
→ stored terminal airtime correct
→ broadcast UNLOCKED
→ Broadcast closure COMPLETE / structure PASS
```

Evidence class:

```text
GOLDEN_CONTRACT
```

Required controls:

- explicit terminal accepted;
- stored terminal airtime equals canonical terminal;
- B_END unlock remains correct;
- expected COMMUNITY count remains two;
- six platform groups remain distinct where current contract requires it;
- valid Structure produces closure `COMPLETE`;
- malformed COMMUNITY may downgrade diagnostic structure status without changing Broadcast authority semantics.

The v0.64.4 `PARTIAL · structure QUARANTINED` case must remain a diagnostic control demonstrating that COMMUNITY warnings and Broadcast terminal authority are separate concerns.

Retirement policy: explicit Broadcast closure contract change only.

### A5. Diagnostic Copy Resilience

Stable family: `diagnostic-copy`

Protected stage model:

```text
BUILD once
→ primary clipboard
→ bounded fallback if needed
```

Required expected outcomes:

```text
COPIED
COPIED_FALLBACK
REPORT_BUILD_FAILED
CLIPBOARD_WRITE_FAILED
```

Evidence class:

```text
SYNTHETIC + GOLDEN_CONTRACT
```

Required controls:

- report builder invoked exactly once;
- primary and fallback receive identical payload;
- builder failure short-circuits clipboard write;
- fallback cleans up temporary DOM state;
- clipboard failure classification remains distinct from report-build failure;
- B_END report construction path remains buildable.

Retirement policy: explicit diagnostic-copy contract change only.

---

## 7. Secondary inventory — Batch B

Batch B is important but does not block the first durable-harness proof.

### B1. Summary Scope Authority

Stable family: `summary-scope`

Required behavior families:

- `NONE`;
- `ANNUAL_ONLY`;
- `CUMULATIVE_YOY`;
- explicit previous-year baseline cannot be silently replaced by unrelated historical values;
- scope classification remains request-authority metadata rather than output-body repair.

Reason for Batch B rather than Batch A:

- strong contract, but independent of the immediate M2-3 architecture controls;
- can migrate after the first harness proves the fixture format and extractor contract.

### B2. Narrative / Current Timeline Clock Contracts

Stable family: `narrative-clock`

Candidates:

- backward current-time prevention;
- terminal canonical timestamp promotion;
- current-timeline authority guard;
- B-mode narrative clock non-mutation.

Do not promote the unresolved `POST_BEND_C_CLOCK_DOMAIN_GAP` as a golden expected behavior while its repair contract remains HOLD/conditional. It may be retained as evidence/watch metadata, not a PASS fixture.

### B3. Frame Sequencing

Stable family: `frame`

Candidates:

- one Response/Volume/Chapter/Chatindex frame;
- canonical timestamp position/order;
- duplicate/malformed frame markers remain invalid.

### B4. Representation Classification Matrix

Stable family: `representation`

Candidates:

- `EXACT`;
- `OUTPUT_MISMATCH`;
- canonical/host/Fresh relation taxonomy;
- unknown provenance conservatively blocks unsafe mirror write.

---

## 8. Infrastructure-contract inventory — Batch C

Batch C protects the release/development system itself and becomes especially important before RS2-3/RS2-4.

### C1. Architecture Contracts v2

Stable family: `architecture-contracts`

Protect:

- allowed module dependencies;
- transition debt may shrink but not silently expand;
- planned `edit-reconcile` ownership once physically promoted;
- forbidden direct imports for mechanically extracted modules.

### C2. Frozen Surfaces

Stable family: `frozen-surfaces`

Freeze classes must remain distinct:

```text
EXACT_BODY
BEHAVIORAL_CONTRACT
FORBIDDEN_NEW_SIDE_EFFECT
```

Permanent inventory must not collapse all three into byte hashing.

### C3. Protected Side Effects

Stable family: `side-effects`

Initial protected APIs:

```text
pluginStorage
setChat
fetch
setInterval
setTimeout
```

Simple call counts may be preserved as compatibility controls, but RS2 later should prefer explicit allowed-call-site contracts where practical.

### C4. Artifact Identity

Stable family: `artifact-identity`

Protect:

```text
latest.js == install.js
version marker consistency
runtime version consistency
production blob identity recording
```

---

## 9. Explicit non-inventory items

The following must **not** become permanent PASS fixtures during RS2-1A:

### 9.1 Unresolved WATCH observations

Examples:

- generation-semantic inner-state certainty warning;
- open-broadcast ending-expression warning;
- storage/cold-init latency variance;
- cache-frontier volatility;
- stale-scale fallback unless a separate correctness defect is proven;
- B-mode display of old Narrative diagnostic context;
- `POST_BEND_C_CLOCK_DOMAIN_GAP` while still HOLD/non-deterministically reproduced.

These belong in evidence/watch documents until a bounded correctness contract exists.

### 9.2 Full live logs

Do not preserve complete PocketRisu diagnostic dumps or long assistant outputs as ordinary test fixtures.

Instead preserve:

```text
source evidence document
+
bounded structural reduction
+
expected result
```

### 9.3 Performance thresholds without stable environment contracts

Do not encode values such as:

```text
storage < 300 ms
cold init < 1 s
```

as permanent release gates unless measurement environment and variance contract are explicitly designed later.

### 9.4 Provider-cache claims

Provider/cache behavior remains `UNVERIFIED` unless direct evidence establishes an enforceable local contract.

---

## 10. Fixture identity and naming

Stable IDs must describe behavior, not version chronology.

Recommended form:

```text
<subsystem>.<contract-or-case>
```

Examples:

```text
representation-fast.fresh-exact-carryover
representation-fast.fresh-exact-one-char-delta
genuine-edit.neither-canonical-nor-fresh
community-reaction.multiline-bilingual-valid
community-reaction.missing
community-reaction.multiple
community-reaction.final-tail-visible
broadcast-closure.explicit-terminal-complete
diagnostic-copy.primary-success
diagnostic-copy.fallback-success
diagnostic-copy.report-build-failed
```

Do not use version number as the stable fixture ID. Version belongs in provenance metadata.

---

## 11. Fixture retirement policy

Permanent does not mean immortal.

A fixture may be retired only when:

1. an explicit contract change makes the old expectation intentionally obsolete;
2. the replacement contract and replacement fixture are committed in the same bounded change;
3. evidence documents explain why the prior expectation is no longer authoritative;
4. deletion is not performed merely because a test is inconvenient during refactoring.

Architecture movement alone is not sufficient reason to delete a behavioral fixture.

---

## 12. RS2-1A deliverable inventory

### Batch A — required first migration

```text
representation-fast
genuine-edit
community-reaction
broadcast-closure
diagnostic-copy
```

### Batch B — next migration

```text
summary-scope
narrative-clock (resolved contracts only)
frame
representation classification matrix
```

### Batch C — infrastructure controls

```text
architecture-contracts
frozen-surfaces
side-effects
artifact-identity
```

---

## 13. RS2-1A close gate

RS2-1A is complete when:

```text
fixture evidence classes defined              PASS
required fixture metadata defined             PASS
promotion criteria defined                    PASS
Batch A inventory frozen                      PASS
Batch B inventory bounded                     PASS
Batch C infrastructure inventory bounded      PASS
WATCH/non-fixture exclusions explicit         PASS
raw-log retention prohibition explicit        PASS
stable naming contract defined                PASS
retirement contract defined                   PASS
runtime diff                                  NONE
release-simcore diff                           NONE
```

No test runner or workflow is required to close RS2-1A.

---

## 14. Next subphase

After RS2-1A is accepted, proceed to:

```text
RS2-1B — Permanent Test Harness Contract
```

RS2-1B must decide:

- canonical test-root path;
- fixture file format;
- bundle/module extraction boundary;
- test-runner command and exit semantics;
- production-baseline versus candidate execution modes;
- deterministic result format;
- fixture metadata validation;
- how old one-shot fixtures are compared against permanent equivalents;
- how the harness remains no-runtime-change and independent from RS2-3 permanent CI.

Do not begin fixture migration implementation until RS2-1B is frozen.
