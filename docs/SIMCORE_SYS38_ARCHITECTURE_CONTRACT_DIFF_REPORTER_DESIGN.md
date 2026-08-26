# SYS-38 — Architecture Contract Diff Reporter — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_EXECUTABLE · READ-ONLY ARCHITECTURE DELTA REPORTER · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-38
Idea          = Architecture Contract Diff Reporter
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
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `scripts/simcore-architecture-check.py`
- `docs/SIMCORE_ARCHITECTURE_DEPENDENCY_SNAPSHOT_GENERATOR_DESIGN.md`
- `docs/SIMCORE_SYS42_IMPLEMENTATION_SLICE_CONFORMANCE_CHECKER_DESIGN.md`
- `docs/SIMCORE_SYS11_DESIGN_TO_IMPLEMENTATION_DRIFT_AUDIT_DESIGN.md`
- `docs/SIMCORE_SYS09_CHANGE_IMPACT_REVIEW_MAP_DESIGN.md`

Existing authorities SYS-38 must not replace:
- `config/simcore-architecture-v2.json` as machine-readable current architecture contract authority;
- `docs/SIMCORE_CONTRACTS_V2.md` as human semantic architecture/ownership authority;
- `scripts/simcore-architecture-check.py` as physical module/dependency extraction and architecture enforcement authority;
- M-11 dependency snapshot as deterministic physical-topology evidence projection;
- SYS-42 implementation-slice conformance result;
- SYS-11 human design-to-implementation semantic drift audit;
- Git diff / immutable commit history as repository change identity.

---

## 1. Problem

SimCore already has strong architecture controls:

```text
human Contracts v2
+ machine-readable architecture contract
+ machine architecture checker
+ deterministic M-11 dependency snapshot
```

The current checker is intentionally a drift guard. It answers:

```text
Does this revision satisfy the currently supplied Contracts v2 rules?
```

M-11 answers:

```text
What physical module/dependency graph did this revision expose?
```

Neither surface directly answers the bounded review question needed during staged ownership extraction:

```text
What architecture facts changed between revision A and revision B?
```

For M2-3 and later checkpoints, reviewers need to see at a glance:

```text
which physical modules appeared/disappeared
which direct dependency edges appeared/disappeared
which edge classifications changed
which module layers changed
which physical-state declarations changed
which allowed-dependency declarations changed
which transition exceptions were added/removed
which ownership/exclusion statements changed in the machine contract
which global/layer policies changed
whether those deltas are expected for the named checkpoint
```

Without a dedicated reporter, reviewers must manually compare large JSON/snapshot files and may miss a meaningful architecture delta even when both endpoints individually pass the checker.

SYS-38 adds a deterministic read-only architecture **delta projection**.

It does not create new architecture policy.

---

## 2. Core invariant

```text
immutable architecture state A
+ immutable architecture state B
→ normalized architecture delta

normalized architecture delta
!= architecture authorization
!= architecture PASS/FAIL
!= expectedness decision
!= semantic equivalence proof
!= implementation-slice conformance proof
!= live correctness proof
```

Canonical identity:

```text
SYS-38
= architecture difference reporter

NOT
= second Contracts v2 checker
= architecture policy engine
= auto-updater for config/docs
= migration planner
= gate opener
```

The reporter is observational.

If SYS-38 disagrees with the existing checker about the meaning/classification of a physical edge, the checker remains authoritative.

---

## 3. Why v1 is executable

The useful v1 behavior is deterministic comparison of two bounded machine-readable architecture states.

A static document template would not reliably answer:

```text
what exact edges changed?
what contract declarations changed?
was an old transition exception removed?
did a planned module become physical?
```

Therefore the final Apply Class is:

```text
NR_EXECUTABLE
```

This does **not** make SYS-38 `NR_PROTECTED` in v1.

Reason:

```text
SYS-38 reads architecture governance artifacts
and reports differences
but does not enforce, police, mutate, approve, or gate them.
```

If a future revision wires the reporter into required CI/release policy or uses its result to block/authorize merges automatically, that is a separate protected design/transaction.

---

## 4. Reuse existing architecture extraction

M-11 already freezes the rule:

```text
NO second SimCore.define / require parser
NO separately maintained edge classifier
```

SYS-38 inherits that rule.

Physical graph input must come from deterministic M-11 snapshot material produced through:

```text
scripts/simcore-architecture-check.py --snapshot-out ...
```

The current checker snapshot already records:

```text
contract path/hash/schema/milestone/phase
source path/hash
physical modules
module layer
module physical status
module direct dependencies
edge classifications
graph digest
checker PASS/FAIL/notices
```

SYS-38 may not reparse plugin source merely to reconstruct the same data.

Canonical physical topology chain:

```text
plugin source
→ existing architecture checker/extractor
→ M-11 snapshot
→ SYS-38 delta
```

---

## 5. Inputs

A v1 comparison is explicitly two-sided.

Required inputs:

```text
BASE snapshot
HEAD snapshot
BASE machine contract JSON
HEAD machine contract JSON
```

Conceptual CLI:

```text
node products/simcore/tooling/architecture-contract-diff.mjs \
  --base-snapshot <path> \
  --head-snapshot <path> \
  --base-contract <path> \
  --head-contract <path>
```

Optional output:

```text
--json-out <path>
```

Human-readable stdout remains useful by default.

No implicit `main`, `HEAD`, `release-simcore`, working tree, or network lookup is permitted.

The caller must bind both sides explicitly.

---

## 6. Immutable identity discipline

Each side must preserve the exact identities already present in its snapshot/contract inputs.

The report records at least:

```text
base.snapshotSha256
base.contractSha256
base.sourceSha256[]
base.graphSha256[]

head.snapshotSha256
head.contractSha256
head.sourceSha256[]
head.graphSha256[]
```

A branch name alone is not an immutable comparison identity.

Recommended milestone evidence additionally records the Git commit SHA outside or alongside the report.

SYS-38 does not discover commit identity from Git history automatically in v1.

---

## 7. Input compatibility checks

SYS-38 fails closed when the compared inputs cannot safely support a meaningful delta.

Required validation:

```text
snapshot schema version supported
contract schema version supported
snapshot contract hash matches supplied same-side contract bytes
source list is non-empty
source/module/edge rows are structurally valid
module/edge identities are unique within each normalized side
```

For comparisons involving multiple source rows such as `latest.js` + `install.js`:

```text
same-side graph parity false
→ comparison remains reportable only as BLOCKED/PARITY_CONFLICT
→ do not choose one source silently as canonical
```

The reporter must never hide an endpoint inconsistency to manufacture a clean diff.

---

## 8. Frozen v1 delta families

SYS-38 reports the following architecture delta families.

### AD-01 `PHYSICAL_MODULE_DELTA`

```text
module added physically
module removed physically
```

Example M2-3 expectation:

```text
edit-reconcile
planned/absent → physical/present
```

Presence alone is not proof that ownership was correctly moved.

### AD-02 `DIRECT_EDGE_DELTA`

```text
edge added
edge removed
```

Edge identity:

```text
(from, to)
```

This is physical topology only.

### AD-03 `EDGE_CLASSIFICATION_DELTA`

For an edge present on both sides:

```text
ALLOWED
TRANSITION_EXCEPTION
UNDECLARED
UNKNOWN_MODULE
FORBIDDEN_LAYER
```

classification may change only as serialized by the existing checker/snapshot.

SYS-38 does not independently classify edges.

### AD-04 `MODULE_LAYER_DELTA`

Machine-contract module field:

```text
layer
```

Changes are reported explicitly.

### AD-05 `MODULE_PHYSICAL_STATUS_DELTA`

Machine-contract module field:

```text
physical
```

Examples:

```text
planned → required
required → deferred
```

SYS-38 reports the transition but does not decide whether it is legal.

### AD-06 `ALLOWED_DEPENDENCY_CONTRACT_DELTA`

Per module:

```text
allowed_dependencies added/removed
```

This is a contract declaration delta, not proof of a physical source edge.

### AD-07 `TRANSITION_EXCEPTION_DELTA`

Per module:

```text
transition_exceptions added/removed
```

Important principle:

```text
exception removed
= architecture debt declaration changed

physical edge removed
= source topology changed
```

Both should normally be reviewed together but are separate facts.

### AD-08 `OWNERSHIP_TEXT_DELTA`

Machine-contract fields only:

```text
owns
excludes
```

The reporter performs exact normalized value comparison only.

It does not semantically interpret prose or decide whether one statement is broader/narrower.

Broader semantic ownership interpretation remains SYS-11/human review.

### AD-09 `MODULE_STATUS_OR_TARGET_DELTA`

Bounded machine-contract fields:

```text
status
m2_target
principle
m1_decision
```

Only fields that exist on at least one side are compared.

Unknown arbitrary fields are not silently treated as architecture meaning.

### AD-10 `LAYER_POLICY_DELTA`

Machine-contract:

```text
layer_dependency_policy
```

Added/removed allowed target layers are reported per source layer.

### AD-11 `GLOBAL_RULE_DELTA`

Machine-contract:

```text
global_rules
```

Exact set additions/removals only.

### AD-12 `MAJOR_UPDATE_ARCHITECTURE_STATE_DELTA`

Bounded fields:

```text
major_update.phase
major_update.status
major_update.checkpoint
major_update.runtime_refactor_authorized
```

These are useful context but must not be treated as product/live-gate authority by SYS-38.

---

## 9. Human Contracts v2 prose boundary

`docs/SIMCORE_CONTRACTS_V2.md` remains human semantic authority, but v1 **does not automatically parse or semantically diff Markdown prose**.

Reason:

```text
prose semantic comparison
would require heuristic/LLM interpretation
→ not deterministic architecture evidence
```

Instead SYS-38 emits a review reminder when machine architecture facts changed:

```text
HUMAN_CONTRACT_REVIEW_REQUIRED = true
```

This means only:

```text
machine architecture state changed
→ reviewer must confirm whether human Contracts v2 needs corresponding sync
```

It does not assert that the human document is stale.

A future machine-readable human-section registry would be a separate idea.

---

## 10. Normalized report schema v1

Conceptual JSON output:

```json
{
  "schemaVersion": 1,
  "result": "ARCH_DIFF_PRESENT",
  "base": {},
  "head": {},
  "summary": {},
  "deltas": {
    "physicalModules": [],
    "directEdges": [],
    "edgeClassifications": [],
    "moduleLayers": [],
    "modulePhysicalStatus": [],
    "allowedDependencies": [],
    "transitionExceptions": [],
    "ownershipText": [],
    "moduleStatusTargets": [],
    "layerPolicy": [],
    "globalRules": [],
    "majorUpdateState": []
  },
  "review": {
    "humanContractsReviewRequired": true,
    "checkerEndpointFailuresPresent": false,
    "notes": []
  }
}
```

No wall-clock timestamp is required for deterministic output.

---

## 11. Result vocabulary

Top-level result uses exactly:

```text
ARCH_DIFF_NONE
ARCH_DIFF_PRESENT
ARCH_DIFF_BLOCKED
```

### `ARCH_DIFF_NONE`

All frozen v1 compared architecture surfaces are equal.

It does **not** mean source bytes are equal.

### `ARCH_DIFF_PRESENT`

At least one frozen v1 architecture delta exists and both sides were safely comparable.

It does **not** mean the delta is intended or valid.

### `ARCH_DIFF_BLOCKED`

Comparison cannot safely complete because input identity/schema/parity is unresolved.

Forbidden results:

```text
ARCH_CHANGE_GOOD
ARCH_CHANGE_BAD
ARCH_CHANGE_APPROVED
M2_3_READY
```

Those would incorrectly turn a reporter into an authority engine.

---

## 12. Delta row vocabulary

Every delta row is mechanically one of:

```text
ADDED
REMOVED
CHANGED
```

No severity score is assigned.

Example:

```json
{
  "kind": "DIRECT_EDGE",
  "change": "REMOVED",
  "from": "session",
  "to": "recovery"
}
```

or:

```json
{
  "kind": "MODULE_PHYSICAL_STATUS",
  "change": "CHANGED",
  "module": "edit-reconcile",
  "base": "planned",
  "head": "required"
}
```

---

## 13. Determinism

Given byte-identical four inputs:

```text
base snapshot
head snapshot
base contract
head contract
```

SYS-38 JSON output must be byte-identical.

Normalization:

```text
all sets sorted lexicographically
module rows sorted by module
edge rows sorted by from/to
array-valued contract fields compared as normalized sets where their authority treats order as non-semantic
scalar/string fields compared exactly
UTF-8 JSON
stable indentation
one trailing newline
no timestamp
no absolute paths
no environment metadata
```

Where order may itself be semantic in a future contract field, that field must not be added to v1 without explicit design revision.

---

## 14. Endpoint checker state preservation

Each M-11 snapshot includes existing checker status.

SYS-38 preserves endpoint state:

```text
base.check.result
head.check.result
```

If either endpoint is `FAIL` but its snapshot is otherwise structurally valid:

```text
ARCH_DIFF may still be computed
BUT
review.checkerEndpointFailuresPresent = true
```

The reporter does not convert checker FAIL into PASS.

A diff between two failing states is still only a diff.

---

## 15. Expected M2-3 use

The intended future M2-3 evidence flow is:

```text
pre-M2-3 frozen base revision
→ Contracts v2 checker PASS
→ M-11 snapshot A

M2-3 bounded implementation revision
→ Contracts v2 checker PASS/expected result
→ M-11 snapshot B

SYS-38 A ↔ B
→ architecture delta report

SYS-42
→ was the implementation inside the frozen machine-verifiable slice?

SYS-11
→ did semantic design intent remain aligned?

fixtures/static/CI
→ behavioral deterministic evidence

real long-chat control
→ live evidence
```

Expected M2-3 deltas may include:

```text
edit-reconcile becomes physical
session/runtime-shell direct orchestration edges shrink or move
edit-reconcile allowed dependency declarations become active
session ownership/exclusions narrow
M2 checkpoint/status metadata advances
```

SYS-38 does not hard-code those as required outcomes.

The exact expected M2-3 slice remains owned by the frozen M2-3 design/SYS-42 contract when implementation begins.

---

## 16. Relationship to SYS-42

```text
SYS-38
= WHAT architecture changed?

SYS-42
= Was the implementation within the explicitly authorized frozen slice?
```

Therefore:

```text
ARCH_DIFF_PRESENT
!= SLICE_VIOLATION

ARCH_DIFF_NONE
!= SLICE_CONFORMANT
```

A runtime implementation could change behavior without changing the frozen architecture surfaces; conversely an intended mechanical extraction should normally produce architecture deltas.

---

## 17. Relationship to SYS-11

SYS-38 compares exact machine contract values and physical graph facts.

It cannot determine semantic questions such as:

```text
Did edit-reconcile ownership become too broad?
Did Session retain a responsibility the design intended to move?
Did an exclusion sentence materially weaken?
```

Those are human semantic design-drift questions for SYS-11.

Canonical split:

```text
SYS-38 exact delta
→ reviewer evidence
→ SYS-11 semantic interpretation when needed
```

---

## 18. Relationship to SYS-09 / SYS-50

A SYS-38 implementation/materialization task is:

```text
CF-08 LOCAL_NON_RUNTIME_TOOLING
```

by default.

If future work also modifies:

```text
architecture checker policy
permanent CI routing
release/repository authority
```

then SYS-09 must expose the additional change families and SYS-50 may require a split.

SYS-38 v1 itself does not authorize those changes.

---

## 19. Security and boundedness

Forbidden inputs/outputs:

```text
plugin source bodies
prompt text
user/assistant bodies
Fresh bodies
runtime diagnostics bodies
secrets
environment values
GitHub tokens
network responses
absolute local paths
```

Allowed architecture material:

```text
module names
layer names
physical status
module status
owns/excludes machine-contract strings
direct dependency names
edge classifications
transition exceptions
allowed dependency lists
layer dependency policy
global architecture rules
bounded M2 state metadata
SHA-256 identities
repository-relative paths from snapshots
```

Hard recommended v1 bounds:

```text
max modules per side: 256
max direct edges per side: 2048
max contract rules/delta rows per family: 4096
max scalar text field: 4096 chars
max JSON report: 1 MiB
```

Exceeding a bound fails closed rather than silently truncating the report.

---

## 20. State / repository permissions

```text
plugin/runtime write       FORBIDDEN
Core state write           FORBIDDEN
SnapshotStore write        FORBIDDEN
Host read/write            FORBIDDEN
network                    FORBIDDEN
GitHub API                 FORBIDDEN
release-simcore write      FORBIDDEN
contract auto-write        FORBIDDEN
Contracts v2 prose rewrite FORBIDDEN
CI/workflow mutation       FORBIDDEN
branch/PR mutation         FORBIDDEN
background task            FORBIDDEN
```

Allowed filesystem mutation:

```text
explicit caller-selected JSON output file only
```

stdout-only mode must remain available.

---

## 21. Future physical implementation

Preferred bounded implementation:

```text
products/simcore/tooling/architecture-contract-diff.mjs
products/simcore/tooling/architecture-contract-diff.test.mjs
products/simcore/tooling/schema/architecture-contract-diff-v1.schema.json
```

No permanent CI registration in the same implementation transaction.

No modification to:

```text
scripts/simcore-architecture-check.py
```

should be required merely to implement SYS-38 because M-11 already exposes sufficient graph material.

If implementation discovers a genuine missing structured field in M-11 snapshot that is required for physical-topology comparison, expanding M-11 is a separate design-impact review rather than silently coupling the tools.

---

## 22. Verification plan for later implementation

Minimum focused verification:

```text
1. identical inputs → ARCH_DIFF_NONE
2. module addition detected
3. module removal detected
4. physical edge addition detected
5. physical edge removal detected
6. edge classification change detected from snapshot rows
7. module layer change detected from contracts
8. physical planned→required change detected
9. allowed dependency add/remove detected
10. transition exception add/remove detected
11. owns exact change detected
12. excludes exact change detected
13. global rule add/remove detected
14. layer-policy add/remove detected
15. bounded M2 checkpoint/status change detected
16. snapshot/contract hash mismatch → ARCH_DIFF_BLOCKED
17. unsupported schema → ARCH_DIFF_BLOCKED
18. same-side source graph parity conflict → ARCH_DIFF_BLOCKED
19. checker FAIL endpoint remains visible and never becomes PASS
20. output ordering deterministic
21. identical invocation → byte-identical JSON
22. no source body is read or emitted by reporter
23. no repo/network write occurs
24. no existing architecture checker behavior changes
25. no permanent CI/release policy changes
26. plugin bytes unchanged
```

Synthetic fixtures should use tiny architecture snapshots/contracts rather than copying production plugin bodies.

---

## 23. Live validation

```text
REAL LONG-CHAT VALIDATION = NOT REQUIRED FOR SYS-38 ITSELF
```

SYS-38 is non-runtime architecture tooling.

However, when its report is used as part of an M2 runtime checkpoint, it cannot replace that checkpoint's required live validation.

---

## 24. Failure behavior

Fail closed on:

```text
unreadable input
invalid JSON
unsupported schema
snapshot-contract identity mismatch
duplicate normalized module identity
duplicate edge identity with conflicting classification
unsafe same-side graph parity conflict
bound exceeded
output serialization/write failure
```

Never:

```text
silently drop invalid rows
choose HEAD as truth when BASE is malformed
choose one of latest/install when they disagree
repair contract input
rewrite snapshot input
```

---

## 25. Non-goals

SYS-38 v1 does not:

```text
author architecture changes
score architecture quality
infer expected M2 delta
open/close checkpoint gates
modify Contracts v2
modify architecture config
modify architecture checker
parse human Markdown semantically
scan state writers
scan public APIs/exports
scan dead modules
compute long-term import trends
update CI
publish a release
perform live validation
```

Related future ideas retain those domains:

```text
SYS-39 Import-Boundary Trend Report
SYS-40 Dead Module / Export Scanner
SYS-41 Public Test-Seam Inventory
SYS-43 M2 Checkpoint Close Pack
SYS-44 Ownership Migration Ledger
M-12 State Writer Static Audit
```

---

## 26. Frozen v1 example

Suppose BASE has:

```text
edit-reconcile physical = planned
session allowed_dependencies excludes edit-reconcile
edit-reconcile absent from physical source graph
```

and HEAD has:

```text
edit-reconcile physical = required
session allowed_dependencies includes edit-reconcile
edit-reconcile appears physically
```

SYS-38 reports mechanically:

```text
MODULE_PHYSICAL_STATUS
edit-reconcile: planned → required

ALLOWED_DEPENDENCY_CONTRACT
session → edit-reconcile: ADDED

PHYSICAL_MODULE
edit-reconcile: ADDED
```

It does **not** conclude:

```text
M2-3 SUCCESS
ownership correctly extracted
behavior equivalent
release ready
```

Those require the other authorities/evidence layers.

---

## 27. Design freeze checklist

```text
[x] existing checker remains architecture enforcement authority
[x] M-11 remains physical graph extraction/snapshot authority
[x] no second plugin parser
[x] no independent edge classification
[x] base/head identities explicit
[x] machine-contract comparison allowlist frozen
[x] human Markdown semantic parsing prohibited
[x] result vocabulary frozen
[x] deterministic output contract frozen
[x] failure behavior frozen
[x] no CI/release/runtime mutation
[x] SYS-42/SYS-11 boundaries explicit
[x] M2-3 future use explicit
[x] Apply Class = NR_EXECUTABLE
[x] OPEN DESIGN QUESTIONS = 0
```

---

## 28. Final frozen verdict

```text
SYS-38 Architecture Contract Diff Reporter
= DESIGN FROZEN
= NON_RUNTIME
= NR_EXECUTABLE
= read-only deterministic architecture delta reporter
= implementation NOT STARTED / HOLD under current system-design sweep
```

Canonical formula:

```text
M-11 snapshot(BASE) + machine contract(BASE)
+
M-11 snapshot(HEAD) + machine contract(HEAD)
→ exact bounded architecture delta report

report
!= authority
!= approval
!= conformance
!= live proof
```
