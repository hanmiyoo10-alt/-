# SYS-50 — Work Bundling Conflict Detector — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_EXECUTABLE · READ-ONLY PREFLIGHT · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-50
Idea          = Work Bundling Conflict Detector
Size          = MEDIUM
Importance    = 5 / VERY HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_EXECUTABLE
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_SYS09_CHANGE_IMPACT_REVIEW_MAP_DESIGN.md`
- `docs/SIMCORE_SYS51_CLOSE_STEP_TRIGGER_MATRIX_DESIGN.md`
- `docs/SIMCORE_REALTIME_CLOSE_STEP_OPERATING_ROUTINE.md`

Protected systems this design must not silently modify:
- Release System v2/v2.1
- permanent CI path classification / required checks
- repository writer / branch authority
- permanent fixture harness authority

---

## 1. Problem

SimCore intentionally keeps bounded work attributable.

Standing examples include:

```text
one mini release = one primary goal
feature/runtime behavior change != CI/release/repository-system restructuring
fixture expansion != harness/CI topology redesign
new evidence classification != same-transaction speculative repair
frozen design != implementation in the same design-freeze transaction
```

SYS-09 now exposes the semantic change families present in a bounded work item, but the presence of multiple families is not automatically bad.

Legitimate combinations exist:

```text
runtime implementation + supporting regression test
architecture checkpoint + runtime ownership movement
implementation + required living-doc synchronization
release publication + required release-state/evidence record
```

The actual risk is **independent primary objectives that current policy requires to be separated**.

SYS-50 defines a deterministic read-only preflight that consumes reviewed SYS-09 change-family assignments plus each assignment's transaction role and reports whether the proposed bounded transaction is clean, requires semantic review, or must be split before implementation.

---

## 2. Core invariant

```text
reviewed change-family assignments
+ reviewed transaction roles
+ frozen conflict rules
→ bundling preflight result

SYS-50
!= path classifier
!= change-family classifier
!= task splitter
!= PR creator
!= release/CI authority
!= implementation scheduler
```

The detector may establish:

```text
"these declared primary objectives are forbidden in one transaction"
```

It may not decide:

```text
"therefore create PR A and PR B automatically"
"therefore work X is authorized"
"therefore gate Y is open"
```

---

## 3. Constitutional boundary with SYS-09

```text
SYS-09
= what semantic change families are materially present?

SYS-50
= given reviewed families + roles, may they coexist in this bounded transaction?
```

SYS-50 never infers a `CF-*` family from filenames, extensions, GitHub path labels, or diff text.

The input family set must already be reviewed under SYS-09 semantics.

If the family assignment is unresolved:

```text
BUNDLE_BLOCKED
```

rather than guessing a lighter class.

---

## 4. Transaction-role model

A family assignment must include one of exactly four v1 roles.

```text
PRIMARY_CHANGE
SUPPORTING_VERIFICATION
REQUIRED_CLOSE_SYNC
EVIDENCE_RECORD
```

### PRIMARY_CHANGE

A substantive objective the transaction intentionally changes.

Examples:
- runtime behavior implementation;
- architecture ownership extraction;
- fixture portfolio expansion as the work itself;
- CI/release/repository-system redesign;
- local tooling implementation.

### SUPPORTING_VERIFICATION

A change made only to verify the primary objective.

Examples:
- regression fixture/test added for a runtime fix;
- focused tooling test added for a local analyzer;
- architecture fixture adjusted solely to prove the extraction contract.

A supporting verification item must not smuggle an independent harness/CI-authority redesign into the transaction.

### REQUIRED_CLOSE_SYNC

A living-state/document/registry update required because the primary objective completed.

Examples:
- progress ledger synchronization;
- current queue/NEXT update;
- bounded manifest/state convergence where already owned by the current transaction;
- authority-map projection update.

This role cannot be used to disguise an independent policy redesign.

### EVIDENCE_RECORD

Point-in-time evidence created to record what the transaction proved.

Examples:
- implementation evidence;
- close receipt;
- bounded release evidence;
- static/CI verification record.

Evidence recording must not change the semantic contract merely because it is stored next to the work.

---

## 5. Why roles are mandatory

A family-only matrix would over-block legitimate engineering.

Example:

```text
CF-01 RUNTIME_SOURCE_OR_BEHAVIOR
+ CF-06 PERMANENT_FIXTURE_TEST_OR_COVERAGE
```

This can mean either:

```text
A. runtime fix + regression test proving that fix
   → legitimate

B. runtime fix + independent fixture/harness portfolio redesign
   → mixed objective / should split
```

The distinction is role:

```text
A:
CF-01 PRIMARY_CHANGE
CF-06 SUPPORTING_VERIFICATION
→ allowed

B:
CF-01 PRIMARY_CHANGE
CF-06 PRIMARY_CHANGE
→ review/split according to rule matrix
```

The same principle prevents ordinary living-doc synchronization from being mistaken for a second primary project.

---

## 6. v1 result vocabulary

Exactly four top-level results:

```text
BUNDLE_CLEAN
BUNDLE_REVIEW_REQUIRED
BUNDLE_SPLIT_REQUIRED
BUNDLE_BLOCKED
```

### BUNDLE_CLEAN

No frozen conflict rule is violated and all family/role assignments are resolvable.

This means only:

```text
no known bundling conflict
```

It does not mean implementation is gated open, verified, or authorized.

### BUNDLE_REVIEW_REQUIRED

The combination may be legitimate but the frozen matrix requires an explicit semantic review because context determines whether the objectives are truly one bounded change.

No automatic downgrade to CLEAN.

### BUNDLE_SPLIT_REQUIRED

A standing SimCore policy requires the independent primary objectives to be separated before implementation/application proceeds.

### BUNDLE_BLOCKED

Required family/role information is ambiguous, contradictory, or missing.

Fail closed:

```text
unknown scope != clean bundle
```

---

## 7. Frozen conflict rules

Rules apply primarily to assignments with role `PRIMARY_CHANGE` unless explicitly stated otherwise.

### BC-01 Runtime + CI/release/repository-system redesign

```text
CF-01 PRIMARY_CHANGE
+ CF-09 PRIMARY_CHANGE
→ BUNDLE_SPLIT_REQUIRED
```

Reason:
- runtime/feature attribution must remain independent from CI, release machinery, repo-writer, branch-protection, or harness-authority redesign.

Allowed supporting consequence:
- existing CI may verify the runtime change;
- existing release system may later publish it in a separate release transaction;
- required living/evidence records may be updated.

### BC-02 Runtime + shared repository coordination redesign

```text
CF-01 PRIMARY_CHANGE
+ CF-11 PRIMARY_CHANGE
→ BUNDLE_SPLIT_REQUIRED
```

Reason:
- product/runtime semantics must not be mixed with shared repository write/coordination redesign.

### BC-03 Fixture/test expansion + CI/harness authority restructuring

```text
CF-06 PRIMARY_CHANGE
+ CF-09 PRIMARY_CHANGE
→ BUNDLE_SPLIT_REQUIRED
```

Reason:
- permanent fixture expansion must not quietly become CI discovery, harness-topology, required-check, or release-system restructuring.

Important exception:

```text
CF-06 SUPPORTING_VERIFICATION
+ CF-01/CF-07/CF-08 PRIMARY_CHANGE
→ not a BC-03 conflict by itself
```

### BC-04 New/changed frozen design + its implementation in same design-freeze transaction

If:

```text
CF-04 PRIMARY_CHANGE
```

represents substantive design/policy semantics being frozen in the current transaction, and the same transaction also contains an implementation primary family such as:

```text
CF-01
CF-06
CF-07
CF-08
CF-09
CF-11
```

then:

```text
→ BUNDLE_SPLIT_REQUIRED
```

Reason:
- Design Sweep First requires design freeze and implementation/application to be separate transactions.

Exception:
- documentation created as `REQUIRED_CLOSE_SYNC` or `EVIDENCE_RECORD` is not a new design primary objective.

### BC-05 New live/evidence classification + speculative repair

```text
CF-05 PRIMARY_CHANGE
+ CF-01 PRIMARY_CHANGE
```

when the CF-05 objective is **newly establishing attribution/severity/causality for the same suspected runtime issue**:

```text
→ BUNDLE_SPLIT_REQUIRED
```

Reason:
- Evidence Before Repair requires observation/classification to close before a repair transaction begins.

Exception:
- CF-05 `EVIDENCE_RECORD` documenting already-authorized verification of an implementation is allowed.
- a previously established FIX may authorize a later runtime repair transaction; that later transaction is not "new evidence + speculative repair" merely because it references old evidence.

### BC-06 Release publication + release-system redesign

```text
CF-02 PRIMARY_CHANGE
+ CF-09 PRIMARY_CHANGE
→ BUNDLE_SPLIT_REQUIRED
```

Reason:
- publishing a genuine runtime release and changing the release mechanism itself are separate attribution surfaces.

Normal publication through the already-authorized R2.1 system is `CF-02`, not automatically `CF-09`.

### BC-07 Runtime feature + unrelated second runtime objective

SYS-50 v1 cannot infer semantic unrelatedness from one shared `CF-01` family.

If the declared transaction contains multiple independent `PRIMARY_CHANGE` objective IDs inside CF-01:

```text
→ BUNDLE_REVIEW_REQUIRED
```

The operator must apply the existing `One Release, One Primary Goal` rule.

SYS-50 does not perform semantic diff understanding to decide whether two runtime edits are one objective.

### BC-08 Architecture + runtime ownership extraction

```text
CF-07 PRIMARY_CHANGE
+ CF-01 PRIMARY_CHANGE
```

is **not a conflict by default**.

Reason:
- a physical M2 architecture checkpoint can legitimately move runtime ownership while changing production source.

Required condition:
- both assignments must share one declared bounded objective ID / checkpoint authority.

If they name independent objectives:

```text
→ BUNDLE_REVIEW_REQUIRED
```

### BC-09 Local tooling + CI wiring

```text
CF-08 PRIMARY_CHANGE
+ CF-09 PRIMARY_CHANGE
→ BUNDLE_SPLIT_REQUIRED
```

Reason:
- implementing a local read-only tool is normal NR_EXECUTABLE work;
- enrolling it into permanent CI changes protected CI authority and must be a separate protected transaction unless a separately frozen design explicitly makes the CI integration itself the single primary objective.

### BC-10 Gate/priority update as required close consequence

```text
CF-10 REQUIRED_CLOSE_SYNC
```

may accompany any legitimate completed/frozen work and is not a bundling conflict.

But:

```text
CF-10 PRIMARY_CHANGE
```

plus an otherwise unrelated implementation primary objective requires:

```text
BUNDLE_REVIEW_REQUIRED
```

because priority/gate policy redesign must not be hidden inside product work.

### BC-11 Living-state updates and evidence records

These combinations are allowed when correctly role-tagged:

```text
CF-03 REQUIRED_CLOSE_SYNC
CF-12 EVIDENCE_RECORD
```

They do not create a second primary objective.

If either is actually a substantive policy/current-authority redesign, it must be reclassified as `PRIMARY_CHANGE` and evaluated normally.

---

## 8. Objective identity

Each `PRIMARY_CHANGE` assignment includes:

```text
objective_id
objective_label
```

Assignments that are legitimately two semantic faces of one change may share the same objective ID.

Example:

```text
objective_id = M2_3_EDIT_RECONCILE_EXTRACTION
CF-07 PRIMARY_CHANGE
CF-01 PRIMARY_CHANGE
```

This does not merge independent work; it records that architecture ownership and runtime source movement are both necessary surfaces of the same checkpoint.

Rules:
- objective IDs are reviewed input, not inferred by SYS-50;
- two unrelated objectives must not be given the same ID merely to bypass a conflict;
- SYS-50 may report an inconsistent or missing objective relation as `BUNDLE_BLOCKED` / `BUNDLE_REVIEW_REQUIRED` but cannot adjudicate semantic truth automatically.

---

## 9. Input contract

Later executable v1 consumes a bounded reviewed declaration, conceptually:

```json
{
  "schemaVersion": 1,
  "workId": "...",
  "assignments": [
    {
      "family": "CF-01",
      "role": "PRIMARY_CHANGE",
      "objectiveId": "...",
      "sourceAuthority": "docs/..."
    },
    {
      "family": "CF-06",
      "role": "SUPPORTING_VERIFICATION",
      "objectiveId": "...",
      "sourceAuthority": "docs/..."
    }
  ]
}
```

Required properties:
- all family values exist in frozen SYS-09 vocabulary;
- all roles exist in SYS-50 vocabulary;
- every PRIMARY_CHANGE has an objective ID;
- supporting/close/evidence rows point to the objective they support when applicable;
- source authority is non-empty.

The tool does not crawl the repo to manufacture this declaration.

---

## 10. v1 implementation form

Preferred later implementation:

```text
products/simcore/tooling/work-bundling-conflicts-v1.json
products/simcore/tooling/work-bundling-check.mjs
products/simcore/tooling/work-bundling-check.test.mjs
```

The conflict JSON contains only reviewed deterministic rule metadata.

The checker is:
- local;
- read-only;
- no network;
- no GitHub writes;
- no file mutations;
- no permanent CI wiring;
- no automatic task/PR creation.

This makes the frozen Apply Class:

```text
NR_EXECUTABLE
```

Permanent CI enrollment, PR-template enforcement, or automatic preflight gating would be separate protected work.

---

## 11. Output contract

Machine output is bounded to:

```text
schemaVersion
workId
result
assignmentsSummary
findings[]
```

Each finding contains:

```text
ruleId
severity = REVIEW_REQUIRED | SPLIT_REQUIRED | BLOCKED
familyA
roleA
familyB (optional)
roleB (optional)
objectiveIds[]
reasonCode
```

No copied document bodies, raw diffs, chat content, or proposed patch.

Possible reason codes include:

```text
RUNTIME_WITH_REPO_SYSTEM_REDESIGN
RUNTIME_WITH_SHARED_COORDINATION_REDESIGN
FIXTURE_WITH_CI_HARNESS_REDESIGN
DESIGN_AND_IMPLEMENTATION_SAME_TRANSACTION
NEW_EVIDENCE_WITH_SPECULATIVE_REPAIR
RELEASE_WITH_RELEASE_SYSTEM_REDESIGN
MULTIPLE_RUNTIME_PRIMARY_OBJECTIVES
ARCH_RUNTIME_OBJECTIVE_RELATION_REVIEW
LOCAL_TOOL_WITH_CI_ENROLLMENT
GATE_POLICY_MIXED_WITH_UNRELATED_IMPLEMENTATION
INPUT_ASSIGNMENT_UNRESOLVED
```

---

## 12. Precedence

Result precedence:

```text
BUNDLE_BLOCKED
> BUNDLE_SPLIT_REQUIRED
> BUNDLE_REVIEW_REQUIRED
> BUNDLE_CLEAN
```

One clean relation never suppresses a stronger finding.

Example:

```text
runtime + supporting fixture = clean
runtime + CI redesign = split
overall = BUNDLE_SPLIT_REQUIRED
```

---

## 13. Relationship to SYS-51 / SYS-08 / future SYS-42

### SYS-51 Close-Step Trigger Matrix

SYS-50 is primarily **preflight**, before selecting/starting implementation work.

If a mixed transaction is discovered late during work:
- report it immediately;
- stop scope expansion;
- split/reclassify the transaction;
- then use SYS-51 on each resulting bounded work item.

### SYS-08 Work-Item Close Receipt

A receipt may record:

```text
Bundling preflight = BUNDLE_CLEAN
```

or preserve why a proposed transaction stopped as `BUNDLE_SPLIT_REQUIRED`.

SYS-08 does not own the rule matrix.

### SYS-42 Implementation Slice Conformance Checker

```text
SYS-50
= are these objectives allowed in one transaction?

SYS-42
= did the actual implementation stay inside the allowed slice of the selected design?
```

SYS-50 therefore logically precedes SYS-42.

---

## 14. Failure / ambiguity behavior

Use `BUNDLE_BLOCKED` when:
- a material change family is unresolved;
- a PRIMARY_CHANGE lacks objective identity;
- role tagging is contradictory;
- a supporting/close/evidence row cannot be tied to a legitimate primary objective where required;
- the declaration appears to use a lighter role to evade a frozen conflict rule.

The checker must not repair the declaration itself.

```text
ambiguous declaration
→ BUNDLE_BLOCKED
→ human/operator resolves scope
→ rerun preflight
```

---

## 15. Minimum later verification cases

At implementation time, focused deterministic tests must cover at least:

```text
1. CF-01 PRIMARY + CF-06 SUPPORTING_VERIFICATION
   → BUNDLE_CLEAN

2. CF-01 PRIMARY + CF-09 PRIMARY
   → BUNDLE_SPLIT_REQUIRED

3. CF-01 PRIMARY + CF-11 PRIMARY
   → BUNDLE_SPLIT_REQUIRED

4. CF-06 PRIMARY + CF-09 PRIMARY
   → BUNDLE_SPLIT_REQUIRED

5. CF-04 PRIMARY + CF-08 PRIMARY
   → BUNDLE_SPLIT_REQUIRED

6. CF-05 PRIMARY(new attribution) + CF-01 PRIMARY(repair)
   → BUNDLE_SPLIT_REQUIRED

7. CF-05 EVIDENCE_RECORD + CF-01 PRIMARY
   → no BC-05 split

8. CF-02 PRIMARY + CF-09 PRIMARY
   → BUNDLE_SPLIT_REQUIRED

9. CF-07 PRIMARY + CF-01 PRIMARY with same objective ID
   → no BC-08 split

10. CF-07 PRIMARY + CF-01 PRIMARY with unresolved/different objective relation
    → BUNDLE_REVIEW_REQUIRED

11. CF-08 PRIMARY + CF-09 PRIMARY
    → BUNDLE_SPLIT_REQUIRED

12. CF-03 REQUIRED_CLOSE_SYNC + CF-12 EVIDENCE_RECORD + one valid primary
    → no conflict

13. two CF-01 PRIMARY assignments with different objective IDs
    → BUNDLE_REVIEW_REQUIRED

14. unknown CF token
    → BUNDLE_BLOCKED

15. unknown role
    → BUNDLE_BLOCKED

16. PRIMARY_CHANGE without objective ID
    → BUNDLE_BLOCKED

17. no filesystem writes
18. no network/GitHub calls
19. no automatic split/PR/task creation
20. bounded JSON output only
```

No real long-chat validation is required solely for SYS-50.

---

## 16. Hard boundaries

SYS-50 must never become:

```text
repo-wide diff semantic classifier
permanent CI path router
branch-protection rule
GitHub PR generator
branch creator/deleter
task scheduler
release publisher
automatic gate opener
automatic design selector
runtime/plugin feature
policy override engine
```

A `BUNDLE_CLEAN` result cannot override:
- design gates;
- runtime live gates;
- R2.1 release authorization boundaries;
- NR_PROTECTED requirements;
- evidence requirements;
- the unified priority system.

---

## 17. Unified classification freeze verdict

Design inspection confirms:

```text
SIZE          = MEDIUM
IMPORTANCE    = 5
DIFFICULTY    = 3
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_EXECUTABLE
```

Why `NR_EXECUTABLE`:
- the core value is a deterministic conflict matrix over reviewed structured input;
- a small local read-only checker prevents repeated operator mistakes;
- no runtime/plugin behavior changes;
- no CI/release/repository-writer authority changes are required for local use.

Permanent CI integration remains outside v1 and would be separately protected.

---

## 18. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION = NOT STARTED
```

Per Design Sweep First, stop SYS-50 here.
Implementation is a later bounded NON_RUNTIME transaction after the active system-design sweep closes or priority is explicitly changed.

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
