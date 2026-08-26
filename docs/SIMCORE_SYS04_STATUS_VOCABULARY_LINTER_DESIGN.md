# SYS-04 — Status Vocabulary Linter — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_EXECUTABLE · READ-ONLY LINTER · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-04
Idea          = Status Vocabulary Linter
Size          = SMALL
Importance    = 4 / HIGH
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_EXECUTABLE
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct upstream lifecycle boundary:
- `docs/SIMCORE_SYS05_HISTORICAL_VS_LIVING_DOCUMENT_REGISTRY_DESIGN.md`

Related frozen/status authorities that SYS-04 must compose with rather than replace:
- `docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`
- `docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md`
- `docs/SIMCORE_SYS46_CANONICAL_TASK_CARD_DESIGN.md`
- `docs/SIMCORE_SYS47_USER_HANDOFF_CARD_DESIGN.md`
- `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`
- `docs/SIMCORE_SYS51_CLOSE_STEP_TRIGGER_MATRIX_DESIGN.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`

Downstream ideas expected to benefit from a frozen vocabulary boundary:
- SYS-02 Decision / Supersession Graph
- SYS-12 Current-State Snapshot Page
- SYS-07 Cross-Reference Integrity Auditor

---

## 1. Problem

SimCore intentionally uses multiple small status vocabularies because different repository objects answer different questions.

Current examples include:

```text
Evidence Index posture
→ PASS / WATCH / GAP

Forensic / anomaly disposition
→ WATCH / DEFER / FIX / BLOCKER

Deferred-ledger lifecycle
→ SUSPECTED / WATCH_ONLY / DIRECT_EVIDENCE / DEFERRED_NON_BLOCKING / ...

Idea apply class
→ NR_DOC_ONLY / NR_EXECUTABLE / NR_PROTECTED / NR_UNASSESSED

Canonical Task Card state
→ TASK_CARD_DRAFT / TASK_CARD_READY / TASK_CARD_BLOCKED / ...

User Handoff state
→ USER_HANDOFF_READY / USER_HANDOFF_BLOCKED / ...

Work close outcome / receipt state
→ COMPLETED / BLOCKED / SUPERSEDED / STOPPED
→ CLOSE_RECEIPT_COMPLETE / CLOSE_RECEIPT_BLOCKED
```

Those vocabularies are deliberately not one global status enum.

The recurring failure class is therefore not simply an unknown word. It is **namespace drift**:

```text
WRONG NAMESPACE
→ a valid token is used in the wrong field

ALIAS DRIFT
→ living documents invent synonyms such as DONE / FINISHED / OK when a field has a frozen vocabulary

COMBINATION DRIFT
→ mutually exclusive tokens appear together in one registered field

SEMANTIC COLLAPSE
→ PASS is treated as globally equivalent across evidence, verification, live gate, release, and implementation contexts

HISTORICAL FALSE POSITIVE
→ a valid old point-in-time status is linted as stale merely because current vocabulary later changed

PROSE OVERREACH
→ a generic grep finds words such as watch, blocked, pending, pass in narrative text and mistakes them for schema fields
```

SYS-04 defines a small deterministic **Status Vocabulary Linter** for explicit registered status-bearing fields and blocks.

It validates vocabulary membership, namespace placement, and bounded combination rules.

It does not determine whether the underlying status is factually correct.

---

## 2. Core invariant

```text
reviewed status namespace
+ registered target field / selector
+ SYS-05 lifecycle role / section boundary
+ deterministic token and combination rules
→ read-only vocabulary lint result

SYS-04
!= semantic status classifier
!= evidence reviewer
!= anomaly severity engine
!= stale-current-state detector
!= gate engine
!= status migrator
!= document rewriter
!= repository crawler
```

Canonical question:

> Is this explicit registered status-bearing field using the frozen vocabulary and combination rules assigned to that field in a lifecycle scope where the rule is intended to apply?

SYS-04 does not answer:

> Is `PASS`, `WATCH`, `BLOCKER`, `TASK_CARD_READY`, or another valid token actually justified by the evidence/current state?

That remains with the owning authority and, where applicable, SYS-21/SYS-13/SYS-17/S-10/current gate review.

---

## 3. Constitutional boundary: vocabulary validity is not semantic truth

This distinction is mandatory.

```text
VALID TOKEN
!= TRUE STATUS

VALID COMBINATION
!= CURRENT STATE FRESH

LINTER CLEAN
!= PASS
!= release readiness
!= implementation authorization
!= live correctness
```

Example:

```text
Evidence Index Status = PASS
```

may be vocabulary-valid because `PASS` belongs to that field.

If the cited evidence no longer supports PASS, that is a semantic/evidence inconsistency owned by the evidence authority / SYS-21, not a SYS-04 token error.

Likewise:

```text
Current gate = PENDING_REAL_LONG_CHAT
```

may be syntactically valid but stale after a later live close. Staleness is current-authority review, not vocabulary linting.

---

## 4. Why one global status enum is prohibited

Some tokens intentionally recur with different meanings.

Most obvious example:

```text
WATCH
```

can be:
- Evidence Index posture;
- reviewed project disposition;
- a human-readable qualifier inside a larger contract.

`PASS` also appears in multiple proof/status systems with different scopes.

Therefore SYS-04 v1 freezes this model:

```text
status token
+ namespace
+ target field
= meaning boundary
```

The linter must never normalize all `PASS`, `WATCH`, `BLOCKED`, `PENDING`, or `COMPLETE` strings into one universal state machine.

---

## 5. Relationship to SYS-05 lifecycle registry

SYS-05 owns document/section lifecycle classification.

SYS-04 consumes that reviewed boundary.

Frozen rule:

```text
LIVING_CURRENT / applicable LIVING_POLICY target
→ current usage lint may apply

POINT_IN_TIME_EVIDENCE / HISTORICAL_PLAN
→ preserve point-in-time status usage
→ do not lint merely because current vocabulary differs

FROZEN_DESIGN_CONTRACT / TEMPLATE_CONTRACT
→ definition/contract lint may apply only when explicitly registered
→ never treat the frozen example/status as a current-state freshness claim

ROLE_UNRESOLVED
→ targeted lint = BLOCKED
→ do not guess whether content is current or historical
```

SYS-04 must not infer lifecycle from filenames, timestamps, old version numbers, or the newest commit.

---

## 6. v1 scope: explicit registered targets only

SYS-04 does not scan arbitrary Markdown prose.

A target is lintable only when a reviewed target registration identifies:

```text
target ID
path or bounded file family
field / heading / table-column / managed-block selector
lifecycle applicability
status namespace
allowed token set
allowed combination shape
source vocabulary authority
```

Examples of acceptable selectors:

```text
Markdown table column: Apply
Markdown table column: Status
exact machine field: runtimeClass
managed block field: Validation
heading-local key: Card state
```

Forbidden selectors:

```text
all words after "Status"
all uppercase words
all occurrences of PASS
all documents containing WATCH
all docs modified recently
```

A generic prose search is not a status parser.

---

## 7. Frozen namespace model

A v1 namespace declaration contains:

```text
namespaceId
sourceAuthority
allowedTokens[]
cardinality
combinationRules[]
registeredTargets[]
```

### 7.1 Namespace identity

Stable upper-snake ID, for example:

```text
IDEA_SIZE
IDEA_RUNTIME_CLASS
IDEA_DESIGN_GATE
NR_APPLY_CLASS
R_DOC_APPLY_CLASS
EVIDENCE_INDEX_STATUS
FORENSIC_DISPOSITION
DEFERRED_LEDGER_LIFECYCLE
TASK_CARD_STATE
USER_HANDOFF_STATE
WORK_OUTCOME
CLOSE_RECEIPT_STATE
```

Namespace IDs are tooling metadata only. They do not replace the source authority's human terminology.

### 7.2 Source authority

Every namespace must point to the document/contract that defines its vocabulary.

SYS-04 is not the semantic source of the tokens it validates.

### 7.3 Cardinality

Exactly these v1 shapes:

```text
EXACTLY_ONE
ZERO_OR_ONE
ORDERED_COMPOSITE
SET_COMPOSITE
```

Most semantic status fields should be `EXACTLY_ONE`.

Composite shapes are allowed only when the owning contract already defines a compound display surface.

### 7.4 Combination rules

Deterministic only.

Examples:

```text
NR_APPLY_CLASS
→ exactly one of NR_DOC_ONLY / NR_EXECUTABLE / NR_PROTECTED / NR_UNASSESSED

EVIDENCE_INDEX_STATUS
→ exactly one of PASS / WATCH / GAP

TASK_CARD_STATE
→ exactly one TASK_CARD_* state
```

SYS-04 may reject two mutually exclusive tokens in one registered field.
It may not decide which one is semantically correct.

---

## 8. Required v1 namespace coverage

The first executable implementation should cover high-value, already-frozen structured surfaces rather than attempt every status-like phrase in the repo.

Minimum v1 namespaces:

```text
A. unified idea classification axes used by living inventories
   SIZE
   RUNTIME CLASS
   DESIGN GATE where target schema is explicit

B. NON_RUNTIME apply class
   NR_DOC_ONLY
   NR_EXECUTABLE
   NR_PROTECTED
   NR_UNASSESSED

C. RUNTIME document apply class
   DOC_APPLICABLE
   DOC_APPLIED
   DOC_NOT_REQUIRED
   DOC_UNASSESSED

D. Evidence Index status
   PASS
   WATCH
   GAP

E. forensic/project disposition where a registered field explicitly owns it
   WATCH
   DEFER
   FIX
   BLOCKER

F. Canonical Task Card state
   TASK_CARD_DRAFT
   TASK_CARD_READY
   TASK_CARD_BLOCKED
   TASK_CARD_STALE
   TASK_CARD_SUPERSEDED

G. registered User Handoff Card state vocabulary from SYS-47

H. Work-Item Close Receipt outcome / receipt completeness
```

The implementation may add another namespace only when its source vocabulary and target selector are reviewed first.

Do not treat the above list as permission to scrape arbitrary narrative occurrences of those tokens.

---

## 9. Deliberate exclusions from v1

Do not lint these as generic status fields unless separately registered:

```text
free-form document title Status lines containing compound human summaries
narrative prose
historical evidence paragraphs
raw diagnostics
plugin/runtime logs
GitHub PR/issue native states
CI workflow native conclusions
version/release names
arbitrary PENDING/ACTIVE/COMPLETE words in prose
```

Reason: many are either source-owned external vocabularies or intentionally human composite summaries.

If a compound document header later proves valuable to normalize, register a specific profile rather than widening the parser globally.

---

## 10. Alias policy

SYS-04 may enforce aliases only when the owning vocabulary explicitly rejects them.

Example:

```text
registered NR apply field
DONE
TOOL
DOC
SAFE
```

are invalid if the field contract requires one of the canonical `NR_*` values.

Finding:

```text
DISALLOWED_ALIAS
```

But SYS-04 must not invent preferred wording for ordinary prose.

```text
"the task is done"
```

inside a narrative paragraph is not automatically a linter target.

---

## 11. Finding vocabulary

Frozen v1 finding codes:

```text
UNKNOWN_STATUS_TOKEN
WRONG_STATUS_NAMESPACE
DISALLOWED_ALIAS
ILLEGAL_STATUS_COMBINATION
STATUS_CARDINALITY_VIOLATION
REQUIRED_STATUS_MISSING
TARGET_SELECTOR_UNRESOLVED
VOCABULARY_AUTHORITY_UNRESOLVED
LIFECYCLE_SCOPE_UNRESOLVED
REGISTERED_TARGET_MISSING
```

### `UNKNOWN_STATUS_TOKEN`

A registered target contains a token not defined by its assigned namespace.

### `WRONG_STATUS_NAMESPACE`

The token is valid elsewhere but not in the target's assigned namespace.

Example:

```text
Evidence Index Status = BLOCKER
```

`BLOCKER` may be valid as a forensic/project disposition, but Evidence Index Status is frozen to `PASS / WATCH / GAP`.

### `DISALLOWED_ALIAS`

The field uses a known non-canonical alias where the owning contract requires canonical vocabulary.

### `ILLEGAL_STATUS_COMBINATION`

All tokens may individually be known, but the registered field's combination rule forbids their coexistence.

### `STATUS_CARDINALITY_VIOLATION`

An `EXACTLY_ONE` field has zero or multiple values.

### `REQUIRED_STATUS_MISSING`

A registered field required by its target schema is absent.

### `TARGET_SELECTOR_UNRESOLVED`

The registered path exists but the expected structural selector cannot be resolved deterministically.

### `VOCABULARY_AUTHORITY_UNRESOLVED`

The namespace's defining authority cannot be resolved.

### `LIFECYCLE_SCOPE_UNRESOLVED`

SYS-05 role/section metadata required to determine lint applicability is unresolved.

### `REGISTERED_TARGET_MISSING`

A registered exact target path no longer exists.

---

## 12. Top-level result

Exactly three v1 results:

```text
STATUS_VOCAB_CLEAN
STATUS_VOCAB_DRIFT
STATUS_VOCAB_BLOCKED
```

### `STATUS_VOCAB_CLEAN`

All selected registered targets were resolvable and obey their assigned vocabulary/combination rules.

This does not establish semantic freshness or correctness.

### `STATUS_VOCAB_DRIFT`

At least one deterministic vocabulary/namespace/combination violation exists.

This is repository/document-schema drift, not automatically runtime impact.

### `STATUS_VOCAB_BLOCKED`

A required target, lifecycle scope, selector, or vocabulary authority cannot be resolved without guessing.

Fail closed:

```text
unknown target semantics
!= clean
```

Precedence:

```text
BLOCKED > DRIFT > CLEAN
```

---

## 13. v1 executable form

The useful implementation is executable and read-only.

Preferred later physical shape:

```text
products/simcore/tooling/status-vocabularies-v1.json
products/simcore/tooling/status-vocabulary-lint.mjs
products/simcore/tooling/status-vocabulary-lint.test.mjs
```

Optional reviewed target metadata may be stored in the same bounded JSON or a separate adjacent JSON when clearer.

Frozen properties:

```text
local only
read-only
no network
no GitHub API
no file writes
no automatic replacement suggestions required
no CI enrollment in the implementation transaction
no runtime/plugin imports
```

This establishes:

```text
APPLY CLASS = NR_EXECUTABLE
```

Permanent CI enrollment or PR enforcement would be a separate CI/repository-authority transaction and must not be smuggled into the ordinary SYS-04 implementation.

---

## 14. Input contract

Conceptual linter invocation:

```text
status-vocabulary-lint
+ reviewed namespace registry
+ registered target selectors
+ SYS-05 lifecycle registry input or reviewed equivalent
+ repository working tree snapshot
→ bounded report
```

The tool does not crawl the repository to discover status fields by itself.

It evaluates only registered targets.

If SYS-05 is not yet materialized when SYS-04 is eventually implemented, implementation must either:

```text
wait for the required lifecycle input
```

or use an explicitly reviewed bounded lifecycle fixture/input for focused testing.

It must not reimplement lifecycle inference internally.

---

## 15. Output contract

Machine output is bounded to:

```text
schemaVersion
result
checkedTargets
skippedHistoricalTargets
findings[]
```

Each finding contains:

```text
code
namespaceId
targetId
path
selector
observedTokenOrCount
allowedTokens (bounded)
sourceAuthority
```

No full document bodies, raw diagnostics, plugin bytes, or unbounded diffs.

Human output may render a compact table over the same fields.

---

## 16. Historical / mixed-document handling

SYS-05 role metadata is authoritative for lint scope, not file age.

Example:

```text
CURRENT_DEVELOPMENT.md
primary role = LIVING_CURRENT
historical release ledger section = POINT_IN_TIME_EVIDENCE
```

If one registered current field lies in the living section, lint it.

If an old status appears inside the historical exception, do not report drift merely because the token is no longer current elsewhere.

If a registered target selector crosses lifecycle sections ambiguously:

```text
LIFECYCLE_SCOPE_UNRESOLVED
→ STATUS_VOCAB_BLOCKED
```

Do not choose the interpretation with fewer findings.

---

## 17. Relationship to SYS-21 forensic consistency

```text
SYS-04
= is the recorded token legal in this field/namespace?

SYS-21
= is the recorded forensic classification consistent with cited evidence and impact?
```

Example:

```text
forensic disposition = WATCH
```

SYS-04 may say the token is vocabulary-valid.

SYS-21 may still conclude the living classification requires review because an active blocker is now established.

Neither result replaces the other.

---

## 18. Relationship to S-10 / stale-current-state checks

```text
SYS-04
= vocabulary/namespace structure

S-10 / current authority review
= do current authority claims agree?

SYS-10 stale NEXT scanner
= is the advertised NEXT still legitimate/current?
```

A linter-clean status can still be stale or contradictory.

Therefore SYS-04 must not become another current-state verifier.

---

## 19. Relationship to SYS-12 / SYS-02

### SYS-12 Current-State Snapshot Page

A later snapshot may consume only registered/current fields whose vocabulary is known and may optionally record a SYS-04 clean result as structural confidence.

It must still read current values from their natural authorities.

### SYS-02 Decision / Supersession Graph

A later graph may use canonical status vocabulary for its own registered node/edge lifecycle fields if that design chooses to define them.

SYS-04 does not infer supersession from status words.

---

## 20. Failure behavior

Fail closed for lint claims, fail safe for repository state.

```text
missing vocabulary authority
→ STATUS_VOCAB_BLOCKED
→ no write

missing registered exact target
→ STATUS_VOCAB_BLOCKED
→ no write

selector ambiguous
→ STATUS_VOCAB_BLOCKED
→ no guess

unknown token in resolvable target
→ STATUS_VOCAB_DRIFT
→ report only

historical section contains old valid status
→ excluded according to SYS-05
→ no current drift finding
```

No SYS-04 execution may mutate documentation or production.

---

## 21. Verification plan for later NR_EXECUTABLE implementation

Minimum focused deterministic controls:

```text
1. valid living inventory row using canonical SIZE/RUNTIME/APPLY values
   → STATUS_VOCAB_CLEAN

2. living NR Apply field = TOOL
   → DISALLOWED_ALIAS or UNKNOWN_STATUS_TOKEN
   → STATUS_VOCAB_DRIFT

3. living Evidence Index Status = BLOCKER
   → WRONG_STATUS_NAMESPACE

4. Evidence Index Status = PASS + GAP in one EXACTLY_ONE field
   → STATUS_CARDINALITY_VIOLATION / ILLEGAL_STATUS_COMBINATION

5. valid forensic disposition = WATCH in its registered field
   → clean for that namespace

6. the same WATCH token in a field whose vocabulary excludes it
   → WRONG_STATUS_NAMESPACE

7. old historical Evidence Index/status text inside POINT_IN_TIME_EVIDENCE
   → no current drift finding solely from age/current vocabulary difference

8. mixed CURRENT_DEVELOPMENT fixture with living target + historical exception
   → only living target linted

9. lifecycle role unresolved
   → STATUS_VOCAB_BLOCKED

10. registered target path missing
    → STATUS_VOCAB_BLOCKED

11. selector cannot resolve exact table/field
    → STATUS_VOCAB_BLOCKED

12. generic narrative sentence contains "pass", "watch", or "blocked"
    → not scanned when not registered

13. linter output contains only bounded IDs/paths/tokens
    → no document-body leakage

14. no filesystem writes
15. no network/GitHub calls in inner tool
16. no plugin/runtime import or mutation
17. no release-simcore mutation
18. no permanent CI enrollment in the SYS-04 implementation transaction
```

Static/syntax validation plus focused tests are required when implemented.

A generic green workflow does not prove the focused linter tests executed unless the workflow logs/path classifier establish that fact.

---

## 22. Live validation obligation

None solely for SYS-04.

It is repository-local read-only tooling.

Validation class:

```text
static / focused deterministic tests / repository fixtures
```

No plugin release and no real long-chat validation are required solely because SYS-04 is implemented later.

---

## 23. Hard boundaries

SYS-04 must never become:

```text
one global status enum
semantic evidence classifier
automatic WATCH/FIX/BLOCKER promoter
automatic gate opener/closer
stale NEXT/current-state scanner
historical-document classifier
repo-wide prose grep linter
document formatter/rewriter
automatic patch generator
GitHub/repository writer
CI policy owner
release-system component
runtime/plugin feature
```

It is a deterministic registered-field vocabulary checker only.

---

## 24. Unified classification freeze verdict

Source/design inspection changes the provisional implementation-form assumption from unassessed to executable:

```text
SIZE          = SMALL
IMPORTANCE    = 4
DIFFICULTY    = 2
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_EXECUTABLE
```

Why `NR_EXECUTABLE`:
- the core value is deterministic validation of registered structured fields;
- a document-only vocabulary list would not actually detect drift;
- the tool can remain local/read-only and avoid runtime/release/repository-writer authority;
- CI enrollment is explicitly outside v1 implementation.

---

## 25. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION = NOT STARTED
```

Per Design Sweep First, stop SYS-04 here.

Later implementation is a separate bounded `NR_EXECUTABLE` transaction after the active system-idea design sweep closes or priority is explicitly changed.

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
