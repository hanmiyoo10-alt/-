# SYS-42 — Implementation Slice Conformance Checker — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_PROTECTED · READ-ONLY GOVERNANCE PREFLIGHT/POSTCHECK · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-42
Idea          = Implementation Slice Conformance Checker
Size          = MEDIUM
Importance    = 5 / VERY HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_PROTECTED
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_SYS09_CHANGE_IMPACT_REVIEW_MAP_DESIGN.md`
- `docs/SIMCORE_SYS50_WORK_BUNDLING_CONFLICT_DETECTOR_DESIGN.md`
- `docs/SIMCORE_SYS51_CLOSE_STEP_TRIGGER_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`

Existing protected/verifier authorities that SYS-42 must compose with rather than replace:
- `config/simcore-architecture-v2.json`
- `scripts/simcore-architecture-check.py`
- permanent SimCore test harness / fixture registry
- release-specific frozen-surface / exact-body checks where already defined
- Release System v2 permanent CI routing and required-check authority

---

## 1. Problem

SimCore work is intentionally designed before implementation and keeps each bounded transaction narrow.

A frozen design can say:

```text
move ownership X into module Y
preserve behavior Z
allow supporting regression tests
forbid release-system changes
forbid persistent-schema changes
forbid unrelated module movement
```

SYS-09 can identify which semantic change families a transaction touches, and SYS-50 can reject policy-forbidden combinations before implementation begins. Neither system answers the next question:

```text
The implementation now exists.
Did the actual diff remain inside the slice that the frozen design authorized?
```

Without a bounded conformance check, three failure modes remain:

```text
SCOPE CREEP
→ implementation touches unrelated files/surfaces that the design did not authorize

SUPPORTING-WORK ESCALATION
→ a supporting fixture/doc/tool change quietly becomes a second primary objective

DESIGN/IMPLEMENTATION MISMATCH
→ implementation is locally green but violates an explicit frozen boundary
```

SYS-42 defines a read-only implementation-slice conformance checker for those mechanically reviewable boundaries.

It does not decide design intent from prose. It consumes a reviewed machine-readable projection of the frozen design.

---

## 2. Core invariant

```text
frozen human design authority
→ reviewed bounded machine slice contract
+ immutable base/head implementation diff
→ deterministic conformance report

SYS-42
!= design interpreter
!= architecture authority replacement
!= semantic-equivalence proof
!= CI path classifier
!= release authorizer
!= repository writer
```

A clean SYS-42 result means:

> The observed implementation diff satisfies every machine-verifiable rule that was explicitly projected into the reviewed slice contract.

It does **not** mean:

```text
the design itself was correct
the runtime behavior is correct
all semantic requirements are proven
live validation passed
release is authorized
implementation is automatically mergeable/deployable
```

---

## 3. Why this is `NR_PROTECTED`

The core implementation is executable and read-only, but its purpose is to **police architecture/design governance boundaries**.

Canonical NR classification explicitly treats non-runtime tooling that can alter or police architecture-governance surfaces as protected work.

Therefore:

```text
NON_RUNTIME = yes
NR_EXECUTABLE only = insufficient classification
NR_PROTECTED = correct
```

Consequences:
- design may freeze now;
- implementation is not ordinary SAFE_NON_RUNTIME harvest merely because plugin bytes stay unchanged;
- implementation requires a separate protected transaction;
- permanent-CI wiring, if ever desired, requires its own explicit protected integration decision;
- SYS-42 implementation must not be bundled with the runtime/architecture feature whose conformance it later checks.

---

## 4. Constitutional boundary with SYS-09 and SYS-50

### SYS-09 Change-Impact Review Map

```text
SYS-09
= what semantic change families are present?
= what reviews do those families require?

SYS-42
= did the actual implementation remain inside one reviewed frozen slice?
```

SYS-42 may consume reviewed `CF-*` assignments as metadata. It does not classify changed files into change families by itself.

### SYS-50 Work Bundling Conflict Detector

```text
SYS-50
= before implementation, are the proposed primary objectives allowed in one transaction?

SYS-42
= after/during implementation, did the resulting diff stay inside the already-approved bounded transaction?
```

A `BUNDLE_CLEAN` result never replaces SYS-42.
A `SLICE_CONFORMANT` result never retroactively makes a forbidden bundle acceptable.

---

## 5. Constitutional boundary with SYS-11

SYS-11 `Design-to-Implementation Drift Audit` remains a separate candidate and must not be collapsed into SYS-42.

Frozen distinction:

```text
SYS-42
= deterministic machine-verifiable slice rules
= reviewed manifest + immutable diff
= exact structural conformance where expressible

SYS-11
= broader design-to-implementation audit
= catches semantic or intent drift that cannot safely be encoded as a mechanical slice rule
= can question whether the machine slice contract itself omitted an important frozen requirement
```

Therefore:

```text
SLICE_CONFORMANT
!= NO DESIGN DRIFT
```

SYS-42 is the mechanical lower bound. SYS-11 is the broader audit layer.

---

## 6. Constitutional boundary with existing Architecture Contracts v2 checker

Contracts v2 already checks global architecture rules such as:

```text
physical modules declared
required baseline modules remain
no undeclared direct require edges
layer direction
transition-exception discipline
core → runtime prohibition
planned/deferred module authorization
latest/install architecture graph agreement
```

SYS-42 must not reimplement those rules.

```text
Architecture Contracts v2
= global architectural invariants

SYS-42
= one work item's frozen allowed/forbidden implementation slice
```

A slice contract may declare:

```text
requiredExternalGuards:
- ARCHITECTURE_CONTRACTS_V2
```

but the SYS-42 inner checker does not become another architecture parser.

If the relevant external guard did not actually execute, SYS-42 reports that proof dependency as unresolved rather than pretending it passed.

---

## 7. v1 physical implementation shape

Preferred protected implementation:

```text
products/simcore/tooling/implementation-slice-check.mjs
products/simcore/tooling/implementation-slice-check.test.mjs
products/simcore/tooling/implementation-slice-contract-v1.schema.json
products/simcore/tooling/implementation-slices/<WORK_ID>.json
```

The per-work slice JSON is a reviewed projection of a frozen human design/implementation plan.

No plugin/runtime source is part of SYS-42 itself.

No GitHub Action, permanent-CI discovery rule, branch protection, repository writer, release workflow, automatic patcher, or background watcher is part of v1.

---

## 8. Slice-contract authority model

The human frozen design remains primary semantic authority.

The machine slice contract is a **reviewed projection** only.

Each contract must bind to an immutable design identity:

```text
designAuthorityPath
designAuthorityCommit
designAuthorityBlob
workId
schemaVersion
```

Rule:

```text
machine slice conflicts with frozen design
→ frozen design wins
→ slice contract is stale/invalid
→ do not weaken design to make the checker green
```

The checker must never parse arbitrary Markdown and infer allowed/forbidden rules from prose.

If a requirement cannot be represented mechanically without changing its meaning, encode it as `HUMAN_REVIEW_REQUIRED` rather than inventing a machine rule.

---

## 9. Immutable comparison identity

Every conformance run binds to exactly:

```text
baseCommit
headCommit
```

Both must resolve to immutable commit SHAs before evaluation.

The checker records:

```text
baseCommit
headCommit
designAuthorityCommit
designAuthorityBlob
sliceContractHash
```

A moving branch name may be used only to discover a commit before execution; it is never the execution identity.

No later re-resolution of the branch is allowed inside one report.

---

## 10. Transaction-role model

SYS-42 reuses the role vocabulary frozen by SYS-50:

```text
PRIMARY_CHANGE
SUPPORTING_VERIFICATION
REQUIRED_CLOSE_SYNC
EVIDENCE_RECORD
```

Each allowed changed surface in the slice contract is assigned one role.

This prevents a supporting path from silently becoming a second primary objective.

Example:

```text
runtime module extraction
→ PRIMARY_CHANGE

focused regression fixture
→ SUPPORTING_VERIFICATION

implementation evidence doc
→ EVIDENCE_RECORD

current progress ledger
→ REQUIRED_CLOSE_SYNC
```

The checker may report an undeclared or role-incompatible change, but it does not infer a new role from the path.

---

## 11. Frozen v1 rule types

The machine slice contract supports exactly these rule classes in v1.

### 11.1 `ALLOW_PATH`

Declares an exact path or bounded prefix that may change under a named role.

Fields:

```text
selectorType = EXACT_PATH | PATH_PREFIX
selector
role
changeFamilies[]
notes
```

### 11.2 `FORBID_PATH`

Declares an exact path/prefix that must not change in this work item.

Use only when the frozen design or standing constitutional policy explicitly supports the prohibition.

### 11.3 `REQUIRE_PATH_CHANGE`

Requires at least one change under a declared exact path/prefix.

Use sparingly for slices where the primary objective cannot legitimately complete without touching the named owner surface.

It must not be used to require cosmetic changes.

### 11.4 `ALLOW_CHANGE_FAMILY_ROLE`

Declares reviewed allowed `CF-*` + transaction-role combinations for the work item.

Example:

```text
CF-07 ARCHITECTURE_CONTRACT_OR_OWNERSHIP = PRIMARY_CHANGE
CF-01 RUNTIME_SOURCE_OR_BEHAVIOR        = PRIMARY_CHANGE
CF-06 PERMANENT_FIXTURE_TEST_OR_COVERAGE = SUPPORTING_VERIFICATION
CF-12 HISTORICAL_OR_POINT_IN_TIME_RECORD_ONLY = EVIDENCE_RECORD
```

SYS-42 consumes these assignments; it does not derive them from paths.

### 11.5 `FORBID_CHANGE_FAMILY_ROLE`

Explicitly forbids a reviewed family/role combination in the transaction.

Typical examples:

```text
CF-09 CI_RELEASE_OR_REPOSITORY_AUTHORITY + PRIMARY_CHANGE
CF-11 SHARED_REPOSITORY_COORDINATION + PRIMARY_CHANGE
```

for an ordinary M2 runtime extraction.

### 11.6 `EXTERNAL_GUARD_REQUIRED`

Names an existing authoritative checker/control that must have an independently recorded result before full conformance can be claimed.

Examples:

```text
ARCHITECTURE_CONTRACTS_V2
PERMANENT_REGRESSION_SUITE:<suite-or-pack>
EXACT_BODY_FREEZE:<existing-control-id>
LATEST_INSTALL_IDENTITY
```

SYS-42 stores only the requirement and consumes a bounded provided result reference.
It does not reimplement the guard.

### 11.7 `HUMAN_REVIEW_REQUIRED`

Records a frozen design requirement that cannot safely be machine-decided.

Fields:

```text
reviewId
requirement
humanAuthorityRef
```

A run with unresolved human review cannot return full `SLICE_CONFORMANT`.

---

## 12. Deliberately unsupported v1 rule types

Do not add these merely for convenience:

```text
arbitrary regex over whole source
arbitrary JavaScript predicates from the work branch
prose semantic diffing
LLM-generated allowed paths
automatic function-body understanding
automatic ownership inference
runtime behavioral equivalence inference
provider/cache inference
live-chat result inference
transitive dependency inference
```

If a narrow exact-body or architecture rule already exists elsewhere, reference that external guard instead of cloning it.

---

## 13. Diff acquisition contract

The inner checker is local and read-only.

Canonical input:

```text
git diff / repository comparison for immutable baseCommit..headCommit
```

It may read:
- changed path names;
- change status (`A/M/D/R` where deterministically available);
- bounded diff metadata needed to identify whether a registered path changed.

It must not:
- write the working tree;
- amend commits;
- create branches;
- stage files;
- call GitHub to mutate PRs;
- fetch arbitrary network resources;
- rewrite the slice contract.

If the immutable commits cannot be resolved locally without network mutation or ambiguity, return blocked.

---

## 14. Conformance algorithm

Frozen v1 sequence:

```text
1. validate slice schema
2. verify design path + design immutable identity
3. resolve immutable base/head commits
4. obtain changed-path set
5. verify every changed path is covered by an ALLOW_PATH rule
6. fail any FORBID_PATH hit
7. verify every REQUIRE_PATH_CHANGE requirement
8. consume reviewed SYS-09 CF assignments + SYS-50 transaction roles
9. verify all family/role assignments are allowed and none forbidden
10. verify required external guard result references are present and acceptable
11. verify required human reviews are resolved
12. emit bounded report
```

No step may broaden scope to make a failing implementation conform.

---

## 15. Result vocabulary

Exactly four top-level v1 results:

```text
SLICE_CONFORMANT
SLICE_REVIEW_REQUIRED
SLICE_VIOLATION
SLICE_BLOCKED
```

Precedence:

```text
BLOCKED
> VIOLATION
> REVIEW_REQUIRED
> CONFORMANT
```

### `SLICE_CONFORMANT`

All machine rules pass, all required external guards have acceptable bounded results, and all declared human-review requirements are resolved.

This is a slice-conformance result only.

### `SLICE_REVIEW_REQUIRED`

Machine rules pass, but one or more declared semantic/human requirements remain unresolved or an external result is intentionally `NOT_CLAIMED` rather than failed.

This must not be rewritten as PASS.

### `SLICE_VIOLATION`

A deterministic hard rule is violated, for example:
- undeclared changed path;
- forbidden path changed;
- required primary path absent;
- forbidden family/role present;
- declared external guard explicitly failed.

### `SLICE_BLOCKED`

Trustworthy evaluation is impossible, for example:
- slice schema invalid;
- design immutable identity no longer matches;
- base/head cannot resolve uniquely;
- reviewed family/role assignments missing where required;
- required external result reference is ambiguous or unavailable.

Fail closed:

```text
unknown != conformant
```

---

## 16. Finding vocabulary

Minimum frozen finding codes:

```text
UNDECLARED_CHANGED_PATH
FORBIDDEN_PATH_CHANGED
REQUIRED_PATH_NOT_CHANGED
CHANGE_FAMILY_ROLE_NOT_ALLOWED
FORBIDDEN_CHANGE_FAMILY_ROLE
DESIGN_AUTHORITY_IDENTITY_MISMATCH
SLICE_SCHEMA_INVALID
BASE_COMMIT_UNRESOLVED
HEAD_COMMIT_UNRESOLVED
EXTERNAL_GUARD_FAILED
EXTERNAL_GUARD_RESULT_MISSING
HUMAN_REVIEW_PENDING
REVIEWED_IMPACT_ASSIGNMENT_MISSING
```

Reports contain IDs/paths/result tokens only; no full source bodies or unbounded diffs.

---

## 17. M2-3 specialization example

SYS-42 is generic, but M2-3 demonstrates why it matters.

Contracts v2 freezes M2-3 as a mechanical ownership extraction:

```text
edit-reconcile becomes one application service
Session/outer shell lose reconcile ownership
validated Representation fast path preserved
genuine user edit positive control preserved
no new provider-cache claim
no Deferred Mirror safety weakening
no unrelated M2-4 ownership movement
no feature behavior mixed into the mechanical move
```

A reviewed M2-3 slice contract could therefore allow:

```text
PRIMARY_CHANGE
- runtime source locations required to materialize edit-reconcile and remove old ownership
- architecture machine contract update required to declare the new module/edges

SUPPORTING_VERIFICATION
- representation-fast / genuine-edit regression fixtures or direct owner tests

EVIDENCE_RECORD
- implementation evidence

REQUIRED_CLOSE_SYNC
- living M2/current-progress authorities
```

and explicitly forbid in the same implementation transaction:

```text
release-system redesign
permanent-CI topology redesign
shared repo writer changes
M2-4 Session/Runtime Mirror scope
provider-cache semantics
persistent schema change without separate authorization
unrelated Broadcast/Frame/Continuity/etc. behavior changes
```

If the actual diff touches an undeclared release workflow, SYS-42 can deterministically report `UNDECLARED_CHANGED_PATH` / `SLICE_VIOLATION`.

If the diff stays on declared paths but whether a moved decision tree is behaviorally equivalent requires semantic review, that remains a `HUMAN_REVIEW_REQUIRED` / SYS-11 / regression/live-validation concern rather than something SYS-42 fabricates.

---

## 18. Relationship to verification / SYS-13

SYS-42 consumes verification facts; it does not own proof semantics.

Example:

```text
required external guard = REPRESENTATION_FAST_DIRECT_CONTROL
provided result = PASS / FAIL / NOT_CLAIMED / MISSING
```

The meaning and strength of that proof belong to the verification authority and future SYS-13 Verification Proof Matrix.

SYS-42 only enforces whether the frozen slice requires that proof before full conformance can be claimed.

Therefore generic green CI must not be silently substituted for a named focused/direct guard.

---

## 19. Relationship to SYS-08 close receipt

A future SYS-08 receipt may record:

```text
SYS-42 result = SLICE_CONFORMANT
base/head = <immutable SHAs>
slice contract = <path/hash>
findings = NONE
external guard refs = <bounded refs>
```

or:

```text
SYS-42 result = SLICE_REVIEW_REQUIRED
pending = HUMAN_REVIEW_REQUIRED:<id>
```

The receipt is point-in-time evidence; it does not become the slice contract or design authority.

---

## 20. Protected implementation transaction requirements

When SYS-42 is later implemented, the implementation transaction must itself be protected and separate from runtime feature work.

Minimum requirements:

```text
1. dedicated work branch
2. no plugin/runtime source changes
3. no release-simcore changes
4. no permanent-CI wiring in the initial implementation
5. no repo writer/branch authority changes
6. focused deterministic tool tests
7. fail-closed fixtures for ambiguous inputs
8. production-neutrality verification
9. explicit evidence that the checker cannot write the repo
10. main living-document sync after implementation
```

Only after the local protected checker is independently proven may a later separate design decide whether permanent CI should invoke it.

---

## 21. Minimum focused test matrix for later implementation

At least:

```text
1. only declared primary path changes
   → SLICE_CONFORMANT when all other proof dependencies resolved

2. declared supporting fixture path changes
   → allowed as SUPPORTING_VERIFICATION

3. one undeclared unrelated path changes
   → UNDECLARED_CHANGED_PATH / SLICE_VIOLATION

4. forbidden release workflow path changes
   → FORBIDDEN_PATH_CHANGED / SLICE_VIOLATION

5. required primary path missing
   → REQUIRED_PATH_NOT_CHANGED / SLICE_VIOLATION

6. runtime + regression role assignment valid
   → no false conflict

7. CF-09 PRIMARY_CHANGE forbidden by slice
   → FORBIDDEN_CHANGE_FAMILY_ROLE

8. required architecture guard explicit PASS
   → accepted

9. required focused guard is NOT_CLAIMED
   → SLICE_REVIEW_REQUIRED, not conformant

10. required external guard explicit FAIL
    → SLICE_VIOLATION

11. human review unresolved
    → SLICE_REVIEW_REQUIRED

12. design blob mismatch
    → SLICE_BLOCKED

13. base/head ambiguous or unresolved
    → SLICE_BLOCKED

14. malformed slice schema
    → SLICE_BLOCKED

15. historical evidence/doc-only path allowed only under EVIDENCE_RECORD role
    → accepted when declared

16. no filesystem writes
17. no network calls
18. no GitHub mutations
19. bounded report contains no source bodies
```

No real long-chat validation is required solely to prove SYS-42 tooling itself; live validation remains required for the runtime implementation being checked when its own contract says so.

---

## 22. Hard boundaries

SYS-42 must never become:

```text
automatic design interpreter
automatic allowed-scope generator from prose
second Architecture Contracts v2 checker
second permanent-CI path classifier
second release declaration system
runtime behavior equivalence oracle
LIVE_PASS classifier
priority/NEXT selector
gate opener
work auto-splitter
repository writer
automatic patch reverter
PR merger/closer
branch creator/deleter
release publisher
background watcher
```

It checks one reviewed slice. Nothing more.

---

## 23. Unified classification freeze verdict

Design inspection changes the provisional apply classification from unassessed to protected:

```text
SIZE          = MEDIUM
IMPORTANCE    = 5
DIFFICULTY    = 3
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_PROTECTED
```

Why `NR_PROTECTED`:
- useful implementation is executable;
- it enforces/polices design and architecture-governance boundaries;
- a false positive/false negative can affect whether an implementation is considered scope-conformant;
- this is a higher governance blast radius than ordinary local analysis tooling even with zero runtime mutation;
- permanent-CI integration is explicitly excluded from v1 and would require another protected decision.

---

## 24. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION/APPLICATION = NOT STARTED
```

Per Design Sweep First, stop SYS-42 here.

The active system-idea design sweep must continue before any SYS-42 implementation. Its eventual implementation must be a dedicated protected transaction and must not be combined with the runtime/architecture implementation it will later evaluate.

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
