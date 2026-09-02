# SimCore Post-3.0M Candidate C CC-10 Convergence / Runtime Validation Protocol — 2026-09-02

Date: 2026-09-02 KST

Status: **CC-10 DESIGN FROZEN · CANDIDATE C DESIGN PROGRAM CONVERGED · C1–C8 CAPABILITY CONTRACTS FROZEN · RUNTIME IMPLEMENTATION NOT AUTHORIZED · RUNTIME READINESS = NO · REAL TARGET-HOST / LONG-CHAT VALIDATION = NOT RUN · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · CANDIDATE C · CC-10 · CONVERGENCE · IMPLEMENTATION-READINESS · REAL-VALIDATION · DESIGN-ONLY**

## 0. Purpose

CC-10 is the terminal design checkpoint of the Post-3.0M Candidate C durable-derived-object design program.

It does not implement or deploy Candidate C.

It freezes:

```text
A. Candidate C design convergence declaration
B. capability-profile runtime-readiness rules
C. implementation staging direction
D. deterministic / adversarial acceptance matrix
E. target-host / long-chat validation protocol
F. runtime-close decision rule
```

The canonical separation is:

```text
DESIGN CONVERGED
!=
RUNTIME IMPLEMENTED
!=
RUNTIME READY
!=
DEPLOYED
!=
REAL HOST PASS
```

Candidate C is no longer an undefined future bucket.

It is now a frozen family of capability contracts whose runtime activation remains entirely separate.

## 1. Authority chain

This convergence protocol consumes:

```text
docs/SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC4_CONTROLLED_CONTEXT_REENTRY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC5_ITEM_MUTATION_APPEND_RECONCILIATION_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC6_DERIVED_TO_DERIVED_LINEAGE_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC7_PARTIAL_DESCENDANT_SURVIVAL_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC8_DELAYED_EFFECT_MEDIA_ATTACHMENT_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC9_INTEGRATION_COST_DORMANCY_DESIGN_2026-09-02.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
```

Applicable first-major Source Intelligence gates from 3M-10 remain binding.

Candidate C does not bypass:

```text
current source-job authority
Exposure policy
family semantic validation
support-at-use
presentation ownership
host mount ownership
production release authority
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Design convergence declaration

The Candidate C design program is converged through CC-10.

```text
CC-0  Master durable-derived-object architecture      = FROZEN
CC-1  Durable object identity / namespace             = FROZEN
CC-2  Revision / generation / operation safety        = FROZEN
CC-3  Source history / lifetime / retrieval           = FROZEN
CC-4  Controlled context re-entry                     = FROZEN
CC-5  Item mutation / append / reconciliation         = FROZEN
CC-6  Derived-to-derived lineage                      = FROZEN
CC-7  Partial descendant survival                     = FROZEN
CC-8  Delayed effect / optional media attachment      = FROZEN
CC-9  Integration / cost / dormancy                   = FROZEN
CC-10 Convergence / runtime validation protocol       = FROZEN
```

Therefore design-only documentation may say:

```text
CANDIDATE_C_DESIGN_PROGRAM = CONVERGED
```

It may not say:

```text
CANDIDATE_C_RUNTIME = IMPLEMENTED
CANDIDATE_C_RUNTIME = READY
CANDIDATE_C_RUNTIME = DEPLOYED
CANDIDATE_C_RUNTIME = LIVE_PASS
```

## 3. Candidate C is capability-gated, not one global subsystem switch

Candidate C remains a set of independent capabilities:

```text
C1 cross-turn derived-object survival
C2 stable derived identity
C3 item-level mutation / replacement
C4 append / merge / partial update
C5 derived-to-derived attribution lineage
C6 controlled future context re-entry
C7 partial descendant survival / reattachment
C8 delayed effect / media targeting
```

A concrete consumer MUST declare its minimal profile.

Example profiles:

```text
ARCHIVE_ONLY_BOARD
= C1 + C2

CONTINUABLE_BOARD
= C1 + C2 + C6

EDITABLE_BOARD
= C1 + C2 + C3 + C4

BOARD_TO_NEWS_ATTRIBUTION
= C1 + C2 + C5

REATTACHABLE_THREAD
= C1 + C2 + C3 + C4 + C7

OPTIONAL_MEDIA_POST
= C1 + C2 + C8
```

The presence of one capability never implicitly enables another.

Canonical rule:

```text
CAPABILITY DESIGNED
!=
CAPABILITY ENABLED FOR THIS CONSUMER
```

## 4. Converged architecture

The Candidate C architecture is:

```text
CURRENT AUTHORIZED CONSUMER / OPERATION
        ↓
MINIMAL CAPABILITY PROFILE
        ↓
OWNER + NAMESPACE + OPAQUE DURABLE ID
        ↓
CURRENT LOGICAL OBJECT
        ↓
SEMANTIC REVISION / OPERATION CURRENTNESS
        ↓
OWNER-SCOPED BOUNDED DURABLE STATE
        ↓
EXACT OR OWNER-BOUNDED RESOLUTION
        ↓
SUPPORT-AT-USE / POLICY REVALIDATION
        ↓
CAPABILITY-SPECIFIC ACTION
        ├─ historical inspection
        ├─ controlled re-entry
        ├─ mutation / append
        ├─ derived attribution lineage
        ├─ descendant disposition
        └─ delayed optional materialization
        ↓
COMMITTED SEMANTIC STATE
        ↓
PRESENTATION RECONCILIATION
```

No stage acquires authority merely because a later stage succeeded.

## 5. Final authority precedence

When Candidate C rules appear to conflict, use this precedence:

```text
1. then-current canonical / runtime authority
2. current source support / family eligibility
3. exact durable object identity + lifetime
4. current semantic revision
5. current operation authority / generation
6. capability-specific policy
7. committed durable semantic state
8. presentation / optional materialization
9. view-local UI state
```

Examples:

```text
store lookup success cannot rescue stale support
same object ID cannot rescue wrong revision
same revision cannot rescue superseded operation token
renderer success cannot rescue invalid mutation
survivor UI cannot rescue missing independent survivor proof
provider success cannot rescue stale media authority
```

## 6. Cross-cutting invariants

Candidate C runtime, if later implemented, must preserve:

```text
PERSISTED
!=
CANONICAL FACT

STABLE ID
!=
CANONICAL ENTITY

FOUND BY ID
!=
SUPPORTED FOR USE

SAME OBJECT ID
!=
SAME REVISION

SAME REVISION
!=
SAME OPERATION AUTHORITY

OLD OPERATION SUCCESS
!=
CURRENT APPLY AUTHORITY

VISIBLE IN UI
!=
MODEL MEMORY

DURABLE HISTORY
!=
AUTOMATIC RE-ENTRY

PARENT SAID X
!=
X IS TRUE

HISTORICAL EXISTENCE
!=
CURRENT RELATIONSHIP

RENDERABLE ALONE
!=
SEMANTICALLY INDEPENDENT

MEDIA PRESENT
!=
SOURCE TRUTH

FEATURE OFF
!=
UI HIDDEN ONLY
```

## 7. Current design/runtime state

At CC-10 design convergence:

```text
CANDIDATE_C_DESIGN_PROGRAM      = CONVERGED
RUNTIME_IMPLEMENTATION_AUTHORIZED = NO
RUNTIME_READINESS               = NO
REAL_TARGET_HOST_VALIDATION     = NOT_RUN
REAL_LONG_CHAT_COST_EVIDENCE    = NOT_RUN
```

This is the expected result.

Design convergence is not blocked by the absence of runtime evidence.

## 8. Evidence tiers

Candidate C uses the CC-9 evidence tier names:

```text
D0 · DESIGN BOUNDEDNESS
I1 · IMPLEMENTATION CONFORMANCE
H2 · HOST / LONG-CHAT EVIDENCE
```

Current state:

```text
D0 = PASS by CC-0..CC-10 design convergence
I1 = NOT_RUN because no runtime implementation exists
H2 = NOT_RUN because no deployed Candidate C runtime exists
```

No tier may stand in for a later tier.

```text
D0 PASS != I1 PASS
I1 PASS != H2 PASS
```

## 9. Candidate C readiness gate K1 · then-current production re-preflight

Before any Candidate C runtime implementation begins:

```text
re-read then-current release-simcore
re-read then-current main design authority
confirm current source/runtime owners
confirm applicable 3M-10 G1..G8 state
confirm no later amendment supersedes CC-0..CC-10
```

Historical v0.70.1 assumptions are not permanent implementation authority.

Current state:

```text
K1 = PENDING FUTURE IMPLEMENTATION START
```

## 10. Gate K2 · concrete consumer + capability profile

No generic Candidate C runtime may be implemented without a concrete consumer.

Required freeze:

```text
consumer name
source family / product owner
capability profile C1..C8
why each enabled capability is required
why each disabled capability remains off
lifetime semantics
failure behavior
```

Forbidden:

```text
"implement Candidate C generally"
"enable all C1..C8 just in case"
```

Current state:

```text
K2 = BLOCKED / FIRST RUNTIME CONSUMER NOT AUTHORIZED
```

## 11. Gate K3 · durable namespace / allocator / store ownership

Before C1/C2 runtime activation, freeze:

```text
runtime namespace registry
opaque ID allocator owner
collision behavior
retirement / non-reuse behavior
store backend owner
exact-key index
owner-scoped bounded collection index if needed
record schema/version
migration behavior
corruption behavior
```

Do not reuse:

```text
array ordinal
message index
content fingerprint
display handle
DOM position
```

as durable identity.

Current state:

```text
K3 = BLOCKED / RUNTIME ID + STORE AUTHORITY UNFROZEN
```

## 12. Gate K4 · storage and retention caps

CC-9 requires concrete implementation caps before runtime readiness.

At minimum freeze applicable numeric constants for:

```text
max live durable objects / owner
max bytes / owner
max object semantic bytes
max tombstones
max retained historical revisions
max lineage-pinned revisions
max pinned revision bytes
max bounded archive-list results
max lookup work per request
```

If a consumer does not use a category, freeze it as zero / unsupported rather than leaving it unbounded.

Current state:

```text
K4 = BLOCKED / CANDIDATE_C_RUNTIME_CAPS_NOT_FROZEN
```

## 13. Gate K5 · controlled re-entry seam, applicable only when C6 is enabled

A C6 consumer must freeze:

```text
current request/feature authority that requests continuity
exact/deterministic object resolver
max re-entry objects = explicit constant
field allowlist
max chars/tokens
serialization boundary
prompt-owner insertion seam
support-at-prompt-use validation
historical vs current-supported mode
legacy transcript / Community duplication proof
untrusted-context escaping
```

CC-4 V1 design baseline remains:

```text
MAX_REENTRY_OBJECTS_PER_REQUEST = 1
```

until an explicit later amendment changes it.

Unknown duplicate status fails closed.

Current state:

```text
K5 = BLOCKED IF C6 REQUESTED
```

## 14. Gate K6 · mutation / append engine, applicable when C3 or C4 is enabled

Freeze per-operation semantics for the concrete consumer:

```text
EDIT
REROLL_IN_PLACE
REROLL_REPLACE
DELETE_RETIRE
APPEND_CHILD
SEMANTIC_REORDER
```

For each supported operation specify:

```text
same ID or new ID
expected revision behavior
operation token/currentness
validation before commit
revision advancement
parent/child effects
stale-operation result
partial/projected write ownership
presentation reconciliation
```

Unsupported operations must fail explicitly.

Current state:

```text
K6 = BLOCKED IF C3/C4 REQUESTED
```

## 15. Gate K7 · lineage retention / pinning, applicable when C5 is enabled

CC-6 first scope remains:

```text
lineage kind = ATTRIBUTED_DERIVED_CLAIM
max derived parents / child = 1
max lineage depth = 1
```

Runtime must freeze:

```text
parent object/revision resolver
historical revision pin owner
pin lifetime
pin cap behavior
current vs historical attribution mode
truth-proposition firewall
parent correction / retirement handling
```

A pin-cap failure must HOLD or reject the operation.

It may not silently fall back to `latest` parent revision.

Current state:

```text
K7 = BLOCKED IF C5 REQUESTED
```

## 16. Gate K8 · descendant survival / reattachment, applicable when C7 is enabled

CC-7 V1 remains direct-child only.

Runtime must support explicit bounded dispositions:

```text
CASCADE_INVALIDATE
CASCADE_RETIRE
HISTORICAL_ONLY
SURVIVE_INDEPENDENT_ROOT
REATTACH_TO_REPLACEMENT
HOLD_SURVIVAL_UNRESOLVED
```

Reattachment requires exact old child + exact new parent + current operation authority + semantic revalidation.

Similarity-based salvage is forbidden.

Current state:

```text
K8 = BLOCKED IF C7 REQUESTED
```

## 17. Gate K9 · delayed effect / optional media, applicable when C8 is enabled

CC-8 first scope remains:

```text
M1_OPTIONAL_PRESENTATION_MATERIALIZATION
one durable target
one owner-defined slot
one current superseding operation attempt
```

Runtime must freeze:

```text
provider / effect owner
request authority
exact target ID
expected semantic revision or declared dependency compatibility
a current operation token
attachment-slot generation if needed
runtime epoch if needed
provider result size cap
provider concurrency cap
commit-time support/lifetime check
stale-result disposal
reload behavior
```

M2 semantic media remains deferred.

Current state:

```text
K9 = BLOCKED IF C8 REQUESTED
```

## 18. Gate K10 · observability / dormancy proof surface

Before any Candidate C feature can claim runtime readiness, bounded evidence must expose enough information to prove:

```text
current capability demand
active capability lanes
exact lookup count
bounded collection lookup count
history scan count
store reads / writes
re-entry object count / chars / tokens
mutation target/revision result class
lineage parent lookup / depth
survivor candidate count
provider/network calls
background/timer work
feature-off work
startup materialization count
Candidate C path latency
```

Evidence must not retain quarantined semantic content or become another semantic history store.

Current state:

```text
K10 = BLOCKED / ACTIVE INSTRUMENTATION NOT IMPLEMENTED
```

## 19. Applicable-gate readiness rule

Candidate C runtime readiness is consumer-profile-specific.

A consumer may become `READY_FOR_IMPLEMENTATION` only when:

```text
K1 satisfied
AND K2 frozen
AND K3 satisfied for C1/C2 use
AND K4 caps frozen
AND K10 instrumentation frozen
AND applicable 3M-10 G gates satisfied
AND every enabled capability-specific K gate is satisfied
AND no contradictory later design exists
```

Examples:

```text
ARCHIVE_ONLY_BOARD
requires K1 K2 K3 K4 K10
plus applicable base Source Intelligence / host ownership gates

CONTINUABLE_BOARD
adds K5

EDITABLE_BOARD
adds K6

BOARD_TO_NEWS_ATTRIBUTION
adds K7

REATTACHABLE_THREAD
adds K8

OPTIONAL_MEDIA_POST
adds K9
```

A consumer must not claim readiness for disabled capabilities.

## 20. Recommended first implementation staging direction

CC-10 does not authorize implementation.

If a later program authorizes Candidate C, the narrowest preferred staging is:

```text
Stage A
ARCHIVE_ONLY_BOARD
C1 + C2
historical inspection only
no C6 re-entry
no mutation
no lineage
no survivor reattachment
no media

Stage B
controlled C6 continuation for one exact Board object

Stage C
C3/C4 mutation + append for an explicitly bounded Board consumer

Stage D
C5 BOARD → NEWS attributed lineage

Stage E
C7 partial descendant survival only if the product requires it

Stage F
C8 M1 optional materialization only if an explicit media consumer exists
```

This direction minimizes simultaneous authority changes.

It is not a release schedule and does not reserve version numbers.

## 21. Static / schema acceptance layer

A future implementation must statically prove at least:

```text
runtime namespaces are closed / explicit
opaque ID allocator does not derive IDs from content/ordinal/DOM
schema version is explicit
retired IDs are not reused
record writes preserve unowned metadata
exact-key index exists for exact-object lookup
no full-history fallback path
collection queries have explicit bounds
feature-off gates vertically close the lane
unsupported capabilities fail explicitly
C5 depth / parent caps are explicit
C7 direct-child scope is explicit
C8 M1/M2 classes are not conflated
no hidden all-source truth database exists
no startup full-history semantic materialization path exists
```

Static PASS is necessary but not sufficient.

## 22. Deterministic identity / revision matrix

Minimum deterministic fixtures:

```text
I1 stable object lookup succeeds by exact owner/namespace/ID
I2 ordinal/content fingerprint cannot resolve durable identity
I3 retired ID cannot be silently reused
I4 same object edit keeps ID and advances revision
I5 explicit revert creates a new revision rather than decrementing revision
I6 stale expected revision rejects mutation
I7 newer operation token supersedes older same-revision attempt
I8 failed old attempt cannot rollback a newer successful state
I9 replacement reroll creates new ID and retires old object
I10 storage corruption / unknown schema fails closed
```

## 23. Deterministic history / retrieval matrix

```text
H1 exact current-object retrieval returns one bounded record
H2 missing exact ID returns unresolved; no full-store search
H3 bounded owner collection stops at configured cap
H4 latest committed state is the default retained state
H5 historical revision is unavailable unless explicitly retained/pinned
H6 physical bytes present after logical expiry do not make object current
H7 cache miss does not imply logical deletion
H8 historical inspection cannot become current semantic authority
H9 quarantined DENY/HOLD content is not durably retained by default
H10 tombstone does not retain unnecessary semantic payload
```

## 24. Deterministic C6 re-entry matrix

For a C6-enabled implementation:

```text
R1 no current continuation intent → lookup/re-entry = 0
R2 exact current request → one object resolves → bounded slice eligible
R3 unresolved request → NO_REENTRY_UNRESOLVED
R4 ambiguous bounded resolver → NO_REENTRY_AMBIGUOUS
R5 fuzzy semantic match would find something → still no re-entry
R6 current-supported continuity revalidates current support/policy
R7 historical-attribution mode preserves attribution without truth promotion
R8 object support stale → no current-supported re-entry
R9 re-entry budget exceeded after semantic-unit reduction → no re-entry
R10 old source text containing instruction-like strings remains untrusted data
R11 legacy Community duplicate proven present → structured duplicate suppressed
R12 duplicate status unknown → HOLD / no structured duplicate
```

## 25. Deterministic mutation / append matrix

For C3/C4-enabled implementation:

```text
M1 EDIT same object → same ID + revision advance
M2 edited candidate fails policy → no semantic commit
M3 REROLL_IN_PLACE → same ID + new revision
M4 REROLL_REPLACE → new ID + old retire
M5 DELETE_RETIRE → logical retirement, physical purge independent
M6 APPEND_CHILD → new child durable ID
M7 strict-parent append rejects stale parent revision
M8 safe-append lane works only with explicit ownership/order/duplicate contract
M9 stale UI edit rejects after target revision advances
M10 presentation failure after successful commit does not rollback semantic state
M11 partial write omission does not delete unowned metadata
M12 unsupported operation fails explicitly rather than guessing semantics
```

## 26. Deterministic descendant survival matrix

For C7-enabled implementation:

```text
S1 parent replacement with no child proof → cascade / hold
S2 visually standalone child without semantic independence → cannot survive as root
S3 independent child proof → SURVIVE_INDEPENDENT_ROOT allowed
S4 exact old child + exact replacement parent + validation → REATTACH may commit
S5 similar replacement text without relationship proof → no reattach
S6 historical-only child preserves old relation as historical, not current
S7 direct child may survive while grandchild remains separately unresolved
S8 no recursive subtree salvage in V1
S9 child carrying invalid parent secret cannot survive without independent support
S10 parent deletion cannot be undone by DOM card persistence
```

## 27. Deterministic derived-lineage matrix

For C5-enabled implementation:

```text
L1 BOARD P@R7 → NEWS attribution may prove "P said X"
L2 same lineage cannot prove "X is true"
L3 parent edit to R8 does not float old lineage from R7 to R8
L4 current-parent attribution to stale R7 fails/revalidates
L5 historical attribution to retained exact R7 may survive
L6 parent replacement cannot auto-repoint lineage to replacement object
L7 child NEWS needs independent current NEWS source authority/maturity
L8 one child cannot exceed configured parent count
L9 lineage cannot exceed configured depth
L10 pin-cap exhaustion fails closed / HOLD, never silently uses latest revision
L11 parent correction does not automatically grant child mutation authority
L12 repeated derived claims do not canonicalize world truth
```

## 28. Deterministic delayed-effect / media matrix

For C8-enabled implementation:

```text
A1 provider succeeds, target revision unchanged, token current → attach eligible
A2 provider succeeds after target revision changes → stale drop
A3 newer same-slot operation supersedes old token → old result drop
A4 target replaced with new object ID → old token cannot attach to replacement
A5 target retired before callback → result drop
A6 provider failure does not invalidate source semantics
A7 old provider failure cannot clear newer successful attachment
A8 declared media dependency fields unchanged across revision → compatibility may be accepted
A9 visual similarity alone cannot prove compatibility
A10 reload invalidates in-flight runtime authority unless separate journal/resume design exists
A11 committed media does not automatically enter model context
A12 M1 attachment cannot become M2 semantic evidence
```

## 29. Candidate C DORMANT matrix

This is a release-critical matrix.

Prepare a store containing many durable objects, tombstones, retained/pinned revisions, and optional attachments.

Then execute:

```text
D1 ordinary chat with Candidate C features installed but never used
D2 ordinary chat immediately after archive inspection
D3 ordinary chat immediately after C6 continuation
D4 ordinary chat immediately after mutation
D5 ordinary chat immediately after derived lineage use
D6 ordinary chat while optional media exists
D7 unrelated text mentioning "board", "history", "news", "old post"
D8 long chat after many durable operations
D9 feature disabled while old durable records remain
D10 reload/startup with large durable history but no current Candidate C demand
```

Expected semantic work on the ordinary request:

```text
Candidate C activation lanes = none
semantic history lookup = 0
full-history scan = 0
re-entry = 0
mutation target resolution = 0
lineage parent lookup = 0
survivor traversal = 0
provider/network call = 0
background semantic work = 0
Candidate C prompt contribution = 0
new Candidate C semantic writes = 0
```

A bounded local feature/demand gate may execute.

Do not claim literally zero CPU instructions.

## 30. Large-history scaling matrix

Future H2 validation must compare at least two materially different history sizes.

Conceptual setup:

```text
small durable store = N objects
large durable store = K*N objects
```

Test:

```text
ordinary turn
exact object retrieval
one-object C6 re-entry
one-target mutation
one-parent C5 lineage
one-parent direct-child C7 decision
one-target one-slot C8 callback
```

Expected qualitative result:

```text
ordinary-turn Candidate C semantic work stays dormant
exact-target operation work stays target-local / bounded
no operation cost is proportional to total durable history merely because history grew
```

CC-10 does not invent numeric latency thresholds before an implementation exists.

Future implementation impact scope must freeze the actual measurement and threshold method before H2.

## 31. Startup / reload matrix

Required:

```text
U1 cold start with empty store
U2 cold start with small store
U3 cold start with large store
U4 reload with retired IDs/tombstones
U5 reload with lineage pins
U6 reload with committed M1 attachment
U7 reload while an old async operation had been in flight
```

Required invariants:

```text
no startup full-history semantic validation
no startup full-history model-context construction
no automatic source resurrection
no automatic media generation
no automatic operation resume without a separately authorized journal contract
committed bounded indexes may load only under a proven bounded/indexed strategy
```

## 32. Feature-off vertical closure matrix

For each implemented capability lane, test the lane disabled while old durable data remains.

Examples:

```text
C6 OFF → no re-entry lookup/prompt bytes
C3/C4 OFF → no mutation dispatch/write
C5 OFF → no derived-parent lookup/pin extension
C7 OFF → no survivor/reattach engine
C8 OFF → no provider/network/token/attachment write
```

UI invisibility alone is insufficient evidence.

## 33. Failure-class isolation

Future runtime evidence must distinguish at least:

```text
IDENTITY_RESOLUTION_FAILURE
SUPPORT_INVALIDATION
POLICY_DENY_OR_HOLD
REVISION_CONFLICT
OPERATION_SUPERSEDED
STORE_FAILURE
REENTRY_RESOLUTION_FAILURE
REENTRY_BUDGET_FAILURE
LINEAGE_PARENT_FAILURE
SURVIVOR_POLICY_FAILURE
PRESENTATION_FAILURE
PROVIDER_FAILURE
STALE_DELAYED_RESULT
```

These classes must not silently rewrite each other's semantic conclusions.

Examples:

```text
presentation failure != semantic invalidation
provider failure != source assertion invalidation
store lookup failure != permission to scan all history
revision conflict != permission to force overwrite
lineage parent missing != permission to treat child claim as canonical
```

## 34. Real target-host validation philosophy

H2 evaluates the deployed runtime in the real target host.

A local fixture or static verifier cannot prove:

```text
actual host storage lifecycle
real reload behavior
actual edit/reroll integration
prompt insertion bytes
legacy transcript duplication
host metadata preservation
real DOM reconciliation
real callback timing
real long-chat cost shape
```

A visually convincing result is not sufficient.

## 35. H2 evidence header

Every Candidate C H2 run must record at least:

```text
exact release-simcore SHA
exact Candidate C feature profile
exact target host/version if available
exact namespace/schema version
configured caps
feature flags
store object count / bounded size metrics
scenario ID
before-state object locator + revision where applicable
after-state locator + revision where applicable
Candidate C lane activation counters
store lookup/read/write counts
re-entry chars/tokens where applicable
provider/network count where applicable
background/timer count
operator observation
verdict
```

Do not record denied/quarantined secret content merely for diagnostics.

## 36. Real edit/reroll acceptance

If the host supports user-visible edit/reroll behavior, H2 must prove at least:

```text
edit/reroll changes the intended semantic object only
stale UI operations are rejected or safely reconciled
host message/record ownership is preserved
unowned metadata survives
old object ID/revision behavior matches selected operation semantics
source support is revalidated where required
presentation follows committed semantic state
reload does not resurrect retired current-state authority
```

## 37. Real C6 prompt acceptance

If C6 is enabled, H2 must prove:

```text
ordinary unrelated turn adds zero Candidate C re-entry bytes
current authorized continuation adds only the declared bounded slice
actual prompt serialization keeps old source text as context data, not instruction authority
legacy Community / transcript duplication behavior matches frozen consumer contract
ambiguous/unresolved continuation does not trigger fuzzy history recovery
source support/policy is rechecked at prompt use
```

Prompt-byte evidence must come from the actual request path, not reconstructed guesses.

## 38. Real lineage acceptance

If C5 is enabled, H2 must prove:

```text
exact parent object/revision is resolved
one-hop/one-parent limits are enforced
historical pins remain bounded
parent correction/replacement does not silently float lineage
child source still needs independent current source authority
truth laundering does not occur
```

The first recommended semantic pair remains BOARD → NEWS attributed claim, not canonical truth propagation.

## 39. Real delayed-effect acceptance

If C8 is enabled, H2 must intentionally create race cases:

```text
start A
edit target
allow A to finish
→ A must not attach if stale

start A
start B for same slot
allow B to finish
allow A to finish later
→ A must not overwrite B

start A
delete/replace target
allow A to finish
→ A must not attach to replacement/current object
```

Provider success cannot substitute for current-operation proof.

## 40. Long-chat acceptance sequence

A future integrated H2 lane should interleave ordinary and Candidate C operations.

Conceptual sequence:

```text
T1  ordinary chat
T2  create/view durable BOARD object
T3  ordinary chat
T4  historical inspection
T5  ordinary chat
T6  controlled continuation if C6 enabled
T7  ordinary chat
T8  edit/append if C3/C4 enabled
T9  ordinary chat
T10 derived BOARD→NEWS attribution if C5 enabled
T11 ordinary chat
T12 parent replacement + bounded survivor decision if C7 enabled
T13 ordinary chat
T14 delayed optional media race if C8 enabled
T15 ordinary chat
T16 reload
T17 ordinary chat
T18 exact old-object historical inspection
T19 ordinary chat
```

Acceptance requires ordinary turns to remain ordinary.

Old durable source objects must not pull the main model back into stale tasks or source formats.

## 41. Required blocker set before runtime implementation claims

The following remain blockers until a future implementation program closes them for the applicable consumer:

```text
BLOCKER · CANDIDATE_C_FIRST_RUNTIME_CONSUMER_NOT_AUTHORIZED
BLOCKER · CANDIDATE_C_RUNTIME_ID_ALLOCATOR_UNFROZEN
BLOCKER · CANDIDATE_C_RUNTIME_STORE_OWNER_UNFROZEN
BLOCKER · CANDIDATE_C_RUNTIME_CAPS_NOT_FROZEN
BLOCKER · CANDIDATE_C_UNBOUNDED_LOOKUP_PLAN
BLOCKER · CANDIDATE_C_ACTIVE_INSTRUMENTATION_UNFROZEN
BLOCKER · CANDIDATE_C_DORMANT_TURN_REGRESSION
BLOCKER · CANDIDATE_C_STARTUP_FULL_HISTORY_MATERIALIZATION
```

Capability-specific blockers apply only when the capability is requested.

## 42. Explicit deferrals preserved

CC-10 does not silently absorb the following future work:

```text
DEFER · M2_SEMANTIC_MEDIA_ATTACHMENT · CONCRETE_SEMANTIC_CONSUMER_REQUIRED
DEFER · MULTI_PARENT_DERIVED_LINEAGE · SEPARATE_DESIGN
DEFER · LINEAGE_DEPTH_GREATER_THAN_ONE · SEPARATE_DESIGN
DEFER · RECURSIVE_SUBTREE_SURVIVAL · SEPARATE_DESIGN
DEFER · DURABLE_INFLIGHT_OPERATION_JOURNAL_AND_RESUME · SEPARATE_DESIGN
DEFER · AUTOMATIC_BACKGROUND_SEMANTIC_MAINTENANCE · SEPARATE_DESIGN
DEFER · LEGACY_COMMUNITY_HOST_HISTORY_MIGRATION · SEPARATE_DESIGN
```

Existing PUBLIC_KNOWLEDGE settlement defer also remains independent.

## 43. Relationship to 3M-10 first-major close

3M-10 closed the first-major design with Candidate C not activated.

CC-10 does not retroactively alter that first-major contract.

Instead:

```text
3M first-major runtime
may remain current-projection-only

while

Candidate C future consumers
may later add bounded durable capabilities under explicit profiles
```

Candidate C runtime activation therefore requires an explicit later implementation program and, where it touches existing Source Intelligence families, applicable 3M-10 readiness gates.

## 44. Release qualification rule

Candidate C runtime may not be described as release-ready merely because:

```text
code exists
unit tests pass
PR CI is green
local storage works
UI looks correct
one edit succeeds
one media callback succeeds
```

Release qualification requires the repository's then-current release process plus applicable I1 and H2 evidence.

CC-10 does not create a parallel release authority.

## 45. Candidate C runtime-close decision rule

For a specific deployed Candidate C consumer/profile, runtime close requires:

```text
applicable K gates CLOSED
+ applicable 3M-10 G gates CLOSED
+ I1 implementation conformance PASS
+ H2 target-host / long-chat evidence PASS
+ feature-off vertical closure PASS
+ dormant-turn regression blocker absent
+ no unresolved semantic-authority blocker
+ then-current release qualification complete
```

Only then may that consumer/profile be described as runtime-valid.

This does not automatically validate every Candidate C capability.

Example:

```text
ARCHIVE_ONLY_BOARD runtime-valid
!=
C6 runtime-valid
!=
C5 runtime-valid
!=
C8 runtime-valid
```

## 46. Candidate C design-program close rule

The design program itself closes when:

```text
CC-0..CC-10 frozen
+ capability boundaries explicit
+ runtime gates explicit
+ acceptance matrices explicit
+ unresolved implementation questions classified as blockers/deferred
+ no runtime implementation falsely claimed
```

CC-10 satisfies this design condition.

Therefore:

```text
CANDIDATE_C_DESIGN_PROGRAM = CONVERGED / CLOSED
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
RUNTIME_READINESS = NO
REAL VALIDATION = NOT RUN
```

## 47. Non-goals at closure

CC-10 does not authorize:

```text
persistent runtime store
runtime namespace allocator
stable source identities in production
cross-turn automatic source memory
mutation buttons
individual reroll
source database UI
BOARD→NEWS runtime propagation
child reattachment
image generation
remote media fetch
background workers
semantic media evidence
recursive provenance graph
multi-parent lineage
release publication
semver selection
```

## 48. Terminal checkpoint state

```text
CC-0  Master Architecture                    ✅ FROZEN
CC-1  Identity / Namespace                   ✅ FROZEN
CC-2  Revision / Operation Safety            ✅ FROZEN
CC-3  History / Lifetime / Retrieval         ✅ FROZEN
CC-4  Controlled Context Re-entry            ✅ FROZEN
CC-5  Mutation / Append / Reconciliation     ✅ FROZEN
CC-6  Derived-to-Derived Lineage             ✅ FROZEN
CC-7  Partial Descendant Survival            ✅ FROZEN
CC-8  Delayed Effect / Media Attachment      ✅ FROZEN
CC-9  Integration / Cost / Dormancy          ✅ FROZEN
CC-10 Convergence / Runtime Validation        ✅ FROZEN
```

Terminal design status:

```text
CANDIDATE C DESIGN
= CONVERGED

RUNTIME
= NOT IMPLEMENTED
= NOT AUTHORIZED
= NOT READY

REAL TARGET-HOST / LONG-CHAT EVIDENCE
= NOT RUN
```

There is no automatic CC-11.

A later design checkpoint must be opened only by a concrete new requirement or a material contradiction discovered during a separately authorized implementation program.

## 49. Final principle

```text
DURABILITY IS A BOUNDED CAPABILITY OF A CONCRETE CONSUMER.
IT IS NOT A SECOND WORLD MODEL,
NOT A HIDDEN MEMORY CHANNEL,
AND NOT A SOURCE OF TRUTH BY PERSISTENCE.
```
