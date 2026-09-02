# SimCore Post-3.0M MF-8 Multi-Family Convergence / Runtime Validation Design — 2026-09-02

Date: 2026-09-02 KST

Status: **MF-8 DESIGN FROZEN · MULTI-FAMILY DESIGN PROGRAM CONVERGED · FIVE FAMILY CURRENT-ROOT SIBLING FANOUT · CANDIDATE C C5 NOT ACTIVATED · RUNTIME IMPLEMENTATION NOT AUTHORIZED · REAL VALIDATION NOT RUN · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-8 · MAJOR CONVERGENCE · RUNTIME VALIDATION PROTOCOL · DESIGN**

## 0. Final decision

MF-0 through MF-7 converge without requiring another family, another core mode, a new truth class, cross-family derived lineage, persistence, source history, or Candidate C activation.

Final design verdict:

```text
MULTI-FAMILY DESIGN PROGRAM
= CONVERGED

CURRENT PRODUCT TOPOLOGY
= CURRENT-ROOT SIBLING FANOUT ONLY

ELIGIBLE FAMILY PROFILES
= LIVE_REACTION
= BOARD
= SOCIAL_FEED
= NEWS
= PUBLIC_KNOWLEDGE

CROSS-FAMILY PROPAGATION
= DEFERRED

CANDIDATE C C5
= NOT ACTIVATED

RUNTIME IMPLEMENTATION
= NOT AUTHORIZED BY MF-8

M1 IMPLEMENTATION QUALIFICATION
= NOT RUN

M2 TARGET-HOST REAL VALIDATION
= NOT RUN
```

The convergence verdict is design-only.

## 1. Authority chain

MF-8 consumes without reopening:

```text
3M-2 Assertion / Exposure Boundary
3M-3 Structured Sidecar / Validator
3M-4 Presentation Renderer Architecture
3M-5 BOARD
3M-6 Support-at-Use Invalidation / Candidate C Triggers
3M-7 Zero Structured Re-entry / Source History NONE
3M-8 NEWS Publication Maturity
3M-9 Integration / Performance / Source-Irrelevant Baseline
3M-10 Major Convergence / Real-Validation Separation

SOCIAL_FEED SF-0..SF-6
PUBLIC_KNOWLEDGE PK-0..PK-6
Candidate C Durable Derived-Object Master Design

MF-0 Master Design
MF-1 Fanout Plan + Family Registry
MF-2 Shared Current Authority + Lane Isolation
MF-3 Aggregate Budget + Failure Matrix
MF-4 Presentation Stack + Mount Isolation
MF-5 SOCIAL_FEED Fanout Entry
MF-6 PUBLIC_KNOWLEDGE Fanout Entry
MF-7 Cross-Family Propagation Reassessment
MF-8 Impact Scope
```

Production remains independently authoritative on `release-simcore`.

## 2. Product identity

Multi-Family Orchestration is a current-request control-plane capability.

It is not:

```text
a new Mode A/B/C
a new source family
a truth merger
a consensus engine
a source database
a persistent scheduler
a generic provenance graph
a model memory channel
a presentation mega-renderer
```

Canonical separation remains:

```text
RUNTIME MODE
!= SOURCE FAMILY
!= MULTI-FAMILY ORCHESTRATION
!= PRESENTATION ADAPTER
!= CANDIDATE C
```

## 3. Final legal topology

```text
trusted current authority E
  ├→ LIVE_REACTION(E)
  ├→ BOARD(E)
  ├→ SOCIAL_FEED(E)
  ├→ NEWS(E)
  └→ PUBLIC_KNOWLEDGE(E)
```

All selected children are sibling projections.

```text
COMMON CURRENT ROOT
!= DERIVED PARENT RELATIONSHIP
```

Sibling family outputs may not become semantic authority for another sibling.

## 4. Final eligible family registry

Effective design registry after MF-5 and MF-6:

```text
LIVE_REACTION
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT

BOARD
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT

SOCIAL_FEED
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT
  profile = SOCIAL_FEED_PUBLIC_CURRENT_SNAPSHOT_V1

NEWS
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT

PUBLIC_KNOWLEDGE
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT
  profile = PUBLIC_KNOWLEDGE_DIRECT_B_PUBLIC_REFERENCE_SNAPSHOT_V1
  rootProfile = DIRECT_B_ROOT_HANDOFF_EVIDENCE
```

Canonical rule:

```text
FAMILY IS ELIGIBLE
!= FAMILY IS ELIGIBLE FOR EVERY ROOT
```

PUBLIC_KNOWLEDGE retains its stricter direct-B root requirement.

## 5. Final current-request states

```text
DORMANT
ACTIVE_SINGLE
ACTIVE_MULTI
UNSUPPORTED
```

`ACTIVE_MULTI` means two or more structurally admitted family profiles bound to one exact current source authority root.

Historical source cards, old Community text, visible DOM, family names in unrelated prose, model preference, or renderer state may not create `ACTIVE_MULTI`.

## 6. Final control flow

```text
current request / authorized current source job
        ↓
CurrentSourceFanoutIntentV1
        ↓
MF-1 trusted registry + atomic structural admission
        ↓
AdmittedCurrentSourceFanoutPlanV1
        ↓
MF-2 exact shared current authority core
        ↓
family-specific least-authority views
        ↓
MF-3 aggregate execution-budget admission
        ↓
independent family semantic lanes
        ↓
family validators / family-private policy
        ↓
validated family results
        ↓
MF-4 presentation eligibility + canonical stack
        ↓
family-local presentation adapters
        ↓
current source presentation host
```

No downstream component may add, remove, or change an admitted family set except through an explicit fail-closed outcome defined by its owner.

## 7. Atomic admission and partial execution

Two different concepts remain separate:

```text
PLAN ADMISSION
= atomic

POST-ADMISSION FAMILY OUTCOMES
= may be partial
```

Examples:

```text
[BOARD, PUBLIC_KNOWLEDGE]
+ incompatible root
→ WHOLE STRUCTURAL PLAN REJECT
```

but:

```text
[LIVE_REACTION, BOARD, SOCIAL_FEED, NEWS, PUBLIC_KNOWLEDGE]
+ compatible root
+ execution budget admitted

LIVE_REACTION       ALLOW
BOARD               ALLOW
SOCIAL_FEED         ALLOW
NEWS                HOLD maturity
PUBLIC_KNOWLEDGE    HOLD settlement

→ PARTIAL_FAMILY_ELIGIBILITY
```

Silent family dropping to make a plan fit is forbidden.

## 8. Shared authority / lane-private authority split

MF-2 final invariant:

```text
SHARED
= family-neutral current relationship authority only

PRIVATE
= family semantic/policy authority
```

Examples of family-private authority/results:

```text
Exposure/assertion policy contexts
BOARD parent/child dependency result
SOCIAL_FEED graph validation
NEWS publication maturity context/result
PUBLIC_KNOWLEDGE settlement context/result
PUBLIC_KNOWLEDGE document-target authority
family validation receipts
family presentation state
```

Canonical rule:

```text
SAME CURRENT ROOT
!= SAME POLICY RECEIPT
!= SAME TRUTH AUTHORITY
```

## 9. Truth-laundering firewall

The following remain forbidden:

```text
BOARD says X
→ NEWS treats X as true

SOCIAL_FEED repeats X
→ NEWS treats X as true

NEWS reports X
→ PUBLIC_KNOWLEDGE settles X

multiple sibling families agree X
→ canonical truth/confidence upgrade
```

Canonical rules:

```text
NEWS REPORT EXISTS
!= PUBLIC KNOWLEDGE SETTLED

SOCIAL ATTENTION
!= PUBLIC KNOWLEDGE SETTLED

MULTI-FAMILY AGREEMENT
!= CANONICAL TRUTH
```

## 10. Candidate C final decision

MF-7 completed C5 reassessment.

```text
C5 derived lineage
= NOT ACTIVATED
```

No current MF requirement selects an exact derived parent/child consumer.

Therefore the runtime must not contain hidden propagation such as:

```text
BOARD object → NEWS authority
SOCIAL_FEED object → NEWS authority
NEWS object → PK settlement authority
fuzzy sibling text match → provenance edge
DOM order → lineage
```

A future concrete child design may reopen C5 only under the MF-7 activation contract.

The preferred smallest future profile remains conceptually:

```text
SAME_OPERATION
SINGLE_PARENT
DEPTH_1
READ_ONLY
NO_HISTORY
NO_CONTEXT_REENTRY
NO_SOURCE_REPLACEMENT_SURVIVAL
NO_ASYNC_EFFECT
```

That future profile is not authorized by MF-8.

## 11. Presentation convergence

Canonical current stack order is:

```text
LIVE_REACTION
BOARD
SOCIAL_FEED
NEWS
PUBLIC_KNOWLEDGE
```

This is presentation order only.

```text
DISPLAY ORDER
!= TRUTH RANK
!= CONFIDENCE RANK
!= SETTLEMENT RANK
!= LINEAGE ORDER
```

The stack owns composition. Each family adapter owns only its subtree.

Family presentation states remain conceptually distinct:

```text
ABSENT
READY
EMPTY
WITHHELD
FAILED
```

A semantic HOLD is `WITHHELD`, not a fake empty card.

View-local collapse/expand is ephemeral and non-semantic.

## 12. Failure blast-radius convergence

MF-3/MF-4 converge four important failure scopes:

```text
P  PLAN_WIDE_PRE_EXECUTION
L  FAMILY_LOCAL_SEMANTIC_POLICY
R  FAMILY_LOCAL_PRESENTATION
I  CONTROL_PLANE / COMMON INTEGRITY
```

Examples:

```text
aggregate budget rejected
→ P / whole ACTIVE_MULTI does not begin expensive work

NEWS maturity HOLD
→ L / NEWS local

SOCIAL_TIMELINE adapter crash
→ R / SOCIAL_FEED presentation local

shared authority mismatch, stale stack generation, wrong active mount owner
→ I / fail closed at current common scope
```

Presentation failure may not mutate semantic authority.

## 13. Source invalidation convergence

All siblings remain tied to exact current trusted support.

If the common source authority is replaced/rerolled:

```text
old LIVE_REACTION       invalid
old BOARD               invalid
old SOCIAL_FEED         invalid
old NEWS                invalid
old PUBLIC_KNOWLEDGE    invalid
```

No partial stale salvage is authorized.

Fresh authority requires fresh projection.

## 14. History / persistence convergence

The current MF design remains:

```text
CURRENT_PROJECTION_ONLY
SOURCE HISTORY STORE = NONE
STRUCTURED AUTOMATIC REENTRY = NONE
PERSISTENCE = NONE
NETWORK REQUIREMENT = NONE
BACKGROUND REFRESH = NONE
```

Visible old source UI does not activate a current source job and is not model memory.

```text
VISIBLE OLD SOURCE CARD
!= ACTIVE SOURCE JOB
!= STRUCTURED MODEL CONTEXT
```

## 15. Budget convergence

MF-3 requires finite trusted family budget profiles and finite aggregate caps before ACTIVE_MULTI runtime execution may be authorized.

Required cap axes include at least:

```text
MAX_FAMILIES_PER_FANOUT
MAX_AGGREGATE_SEMANTIC_CHARS
MAX_AGGREGATE_SEMANTIC_ITEMS
MAX_AGGREGATE_VALIDATION_RECEIPT_ENTRIES
MAX_AGGREGATE_PRESENTATION_NODES
MAX_MODEL_CALLS_PER_FANOUT
MAX_MODEL_INPUT_BUDGET_PER_FANOUT
MAX_MODEL_OUTPUT_BUDGET_PER_FANOUT
```

MF-8 freezes no numeric values.

Five eligible family profiles do not imply:

```text
MAX_FAMILIES_PER_FANOUT = 5
```

Concrete numbers require an actual implementation baseline.

## 16. Evidence ladder

MF-8 freezes three independent acceptance levels.

### M0 — Design Convergence

Required evidence:

```text
MF-0..MF-8 frozen design artifacts
owner boundaries internally consistent
no unresolved design contradiction
repository SimCore Verify + Required PASS for MF-8 transaction
production branch unchanged
```

M0 is what MF-8 may complete now.

### M1 — Implementation / Instrumentation Qualification

Requires an actual runtime candidate.

Must prove machine-observable implementation behavior against frozen contracts.

M1 is not run by MF-8.

### M2 — Target-Host Real Long-Chat Qualification

Requires actual target-host execution over long conversations and lifecycle actions.

M2 is not run by MF-8.

Canonical rule:

```text
M0 PASS
!= M1 PASS
!= M2 PASS
```

## 17. Future M1 runtime preconditions

Before an M1 candidate can be called ready for qualification, separate authorization/proof is required for at least:

```text
current source-job / fanout-plan producer
trusted fanout registry implementation
exact authority bundle projection
family least-authority views
structured sidecar producer and transport
family validators / receipts
finite family budget profiles
finite aggregate hard caps
presentation adapters
active source presentation host mount authority
NEWS maturity-context producer
PUBLIC_KNOWLEDGE settlement-context producer
PUBLIC_KNOWLEDGE document-target producer
bounded instrumentation
unowned host/plugin metadata preservation
```

These are obligations, not implementation authorization.

## 18. Future observability contract

M1 should expose enough bounded instrumentation to prove at least:

```text
current orchestration state
requested/admitted/executed family count
sourceAuthorityRef/current root support result
source-specific prompt bytes/tokens
per-family semantic items/chars
aggregate semantic items/chars
validation receipt counts
presentation node counts
fanout-attributable model call count
model input/output budget contribution
source-history scan count
persistent read/write count
network call count
background worker/poll count
family-local validation latency
aggregate orchestration latency
presentation build/mount latency
stale-generation rejection count
```

The exact instrumentation representation is implementation work.

## 19. Future real-validation protocol

### R0 — Ordinary source-irrelevant long chat

Goal: prove `DORMANT` and zero source semantic burden after many prior source projections.

Expected:

```text
source-specific prompt bytes/tokens = 0
source-history scans = 0
source payload generation = 0
source validation = 0
source presentation work = 0
source persistent reads/writes = 0
network calls = 0
extra source model calls = 0
background source work = 0
```

A bounded source-job existence check is permitted.

### R1 — ACTIVE_SINGLE compatibility

Each eligible family profile individually must preserve its standalone contract.

### R2 — Representative two-family fanout

At least:

```text
LIVE_REACTION + BOARD
BOARD + SOCIAL_FEED
SOCIAL_FEED + NEWS
NEWS + PUBLIC_KNOWLEDGE on compatible direct-B root
```

### R3 — Four-family fanout

```text
LIVE_REACTION + BOARD + SOCIAL_FEED + NEWS
```

when MF-3 caps allow.

### R4 — Five-family structural / execution case

```text
LIVE_REACTION + BOARD + SOCIAL_FEED + NEWS + PUBLIC_KNOWLEDGE
```

on a compatible direct-B root.

If aggregate caps reject the plan, rejection itself may be the correct result. The protocol must not assume five-family execution is always allowed.

### R5 — Atomic structural rejection

Cases:

```text
duplicate family key
unknown/disabled profile
multi-authority fanout
PUBLIC_KNOWLEDGE root mismatch
history-derived activation
model/renderer attempts to add family
```

No silent subset execution.

### R6 — Aggregate budget rejection

A structurally legal plan exceeding trusted aggregate reservation must fail before expensive work.

No hidden family dropping or resource borrowing.

### R7 — Family-local semantic partial success

Examples:

```text
NEWS maturity HOLD
PUBLIC_KNOWLEDGE settlement HOLD
BOARD parent dependency quarantine
SOCIAL_FEED graph invalid
```

Healthy siblings remain unaffected.

### R8 — Family-local presentation failure

One adapter/mount subtree failure must not change sibling semantic eligibility.

### R9 — Common integrity failure

Shared authority mismatch, wrong source binding, stale runtime generation, or invalid active stack ownership must fail closed at the common scope.

### R10 — Truth-laundering negatives

Prove sibling outputs do not become another lane's truth/settlement/maturity authority.

### R11 — Source reroll / replacement

Old sibling set loses support. Fresh source authority requires fresh fanout.

### R12 — Repeated fanout / no accumulation

Repeated source jobs across long chat must not increase future fanout cost because of accumulated structured history.

### R13 — Ordinary turn after source fanout

Immediately after a multi-family source turn, a normal unrelated turn must return to `DORMANT` with zero source semantic burden.

### R14 — Collapse / expand

View-local state must not affect semantic authority, model context, budget, or subsequent family selection.

### R15 — Reload / stale generation

Old visible source UI must not reactivate source semantics. Stale runtime generation must not own new active source DOM.

### R16 — Unowned metadata preservation

Source integration must not erase or overwrite host/plugin metadata it does not own.

### R17 — Hidden C5 negative

Prove no derived sibling object is being consumed as a formal provenance/truth parent behind the scenes.

## 20. Performance acceptance model

MF-8 does not invent latency numbers.

Future performance qualification must establish an implementation baseline and then freeze concrete thresholds.

Required scaling property:

```text
cost(current fanout at turn N)
≈ cost(current fanout)
```

not:

```text
cost(turn N)
≈ all previous source projections
```

The evaluation should separate at least:

```text
orchestration overhead
semantic/model cost
validation cost
presentation build cost
DOM/mount cost
```

Source-irrelevant turns remain the strongest regression baseline.

## 21. Acceptance authority

The main model does not self-declare PASS.

Validators and receipts prove only their owned machine-checkable claims.

Repository CI proves repository/implementation checks only.

Target-host correctness/performance requires target-host evidence.

Where the existing SimCore evidence protocol requires human evidence terminal convergence, M2 must use it.

Canonical rules:

```text
MODEL SAYS PASS
!= PASS

CI GREEN
!= TARGET-HOST REAL PASS
```

## 22. Runtime blocker catalog

Any later runtime candidate remains blocked if evidence shows any of:

```text
ordinary source-irrelevant regression
history residue activates fanout
unbounded source prompt/history/DOM growth
cross-family truth promotion
sibling output substitutes for PK settlement
source mismatch fails to invalidate affected fanout
DENY/HOLD semantic content leaks into presentation
presentation failure mutates semantic authority
silent budget-driven family dropping
model or renderer mutates admitted family set
unowned host/plugin metadata overwritten or deleted
hidden persistence/network/background work
stale generation owns active source DOM
Candidate C behavior appears without explicit child design
PUBLIC_KNOWLEDGE root restriction bypassed
NEWS maturity self-authorized by model/sibling
PK settlement self-authorized by model/sibling
```

## 23. Major Convergence Matrix

| Checkpoint | Frozen responsibility | Final invariant | Future evidence |
|---|---|---|---|
| MF-0 | overall architecture | sibling fanout, not propagation | topology trace |
| MF-1 | plan + registry | intent != admitted plan; atomic admission | admission receipts/reasons |
| MF-2 | authority sharing | shared root != shared semantic authority | lane input isolation evidence |
| MF-3 | aggregate budget/failure | structural pass != execution-budget pass | caps/reservations/failure trace |
| MF-4 | presentation stack | display order != truth; mount isolation | DOM/mount lifecycle evidence |
| MF-5 | SOCIAL_FEED entry | exact public snapshot profile only | profile-specific runtime proof |
| MF-6 | PUBLIC_KNOWLEDGE entry | eligibility != settlement | root/settlement/target proof |
| MF-7 | propagation reassessment | C5 closed absent concrete consumer | negative hidden-lineage proof |
| MF-8 | convergence/validation | M0 != M1 != M2 | final acceptance bundle |

## 24. Design close criteria

MF design is considered converged when all are true:

```text
MF-0..MF-7 responsibilities compose without contradiction
five exact family profiles have bounded entry contracts
current root and lane-private authority boundaries are explicit
budget and presentation failure scopes are explicit
source-irrelevant negative control remains intact
history/persistence/reentry remain absent
cross-family truth laundering remains forbidden
C5 remains closed with an explicit reopen contract
future M1/M2 evidence protocol is frozen
no runtime/release claim is made by design artifacts
```

MF-8 finds these conditions satisfied at design level.

## 25. Procedural WATCH — accidental placeholder write reverted

During the MF-8 impact transaction, an assistant tool-ordering error created a one-line placeholder file directly on `main` and immediately removed the same file in the next corrective commit.

Recorded status:

```text
WATCH · ACCIDENTAL_PLACEHOLDER_WRITE_REVERTED
PRODUCT / DESIGN CONTENT DIFF = NONE
RELEASE-SIMCORE IMPACT = NONE
```

The actual MF-8 impact artifact was subsequently created through the normal docs-only branch / PR / SimCore CI path.

This procedural watch grants no authority and changes no product contract.

## 26. Final runtime sequence

The clean future sequence is:

```text
MF-8 DESIGN FROZEN
        ↓
separate runtime implementation proposal / authorization
        ↓
implement exact current-root sibling fanout only
        ↓
freeze concrete caps + instrumentation baseline
        ↓
M1 implementation / instrumentation qualification
        ↓
target-host long-chat lane
        ↓
M2 real validation / human evidence convergence where required
        ↓
separate production release decision
```

No step is skipped by MF-8.

## 27. Final convergence verdict

```text
MF-0  ✅
MF-1  ✅
MF-2  ✅
MF-3  ✅
MF-4  ✅
MF-5  ✅
MF-6  ✅
MF-7  ✅
MF-8  ✅ DESIGN FROZEN

MULTI-FAMILY DESIGN PROGRAM
= CONVERGED

CURRENT ELIGIBLE FAMILY PROFILES
= LIVE_REACTION
= BOARD
= SOCIAL_FEED
= NEWS
= PUBLIC_KNOWLEDGE

CROSS-FAMILY PROPAGATION
= DEFERRED

CANDIDATE C C5
= NOT ACTIVATED

RUNTIME IMPLEMENTATION
= NOT AUTHORIZED

REAL TARGET-HOST VALIDATION
= NOT RUN
```

There is no automatic `MF-9` checkpoint.

Any further Multi-Family design must be triggered by a new concrete requirement, a runtime-qualification finding, or an explicitly selected Candidate C child capability.
