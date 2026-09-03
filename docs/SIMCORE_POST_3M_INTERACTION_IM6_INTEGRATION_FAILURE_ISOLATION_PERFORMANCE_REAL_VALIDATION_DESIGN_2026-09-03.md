# SimCore Post-3.0M IM-6 Integration / Failure Isolation / Performance / Real-Validation Design — 2026-09-03

Date: 2026-09-03 KST

Status: **IM-6 DESIGN FROZEN · INTERACTION / MATERIALIZATION DESIGN PROGRAM CONVERGED · CURRENT-INTENT OWNER-LOCAL ORCHESTRATION · FAILURE-CLASS ISOLATION · ORDINARY-CHAT DORMANCY · D0 DESIGN PASS ONLY · RUNTIME IMPLEMENTATION NOT AUTHORIZED · RUNTIME READINESS = NO · REAL HOST / LONG-CHAT VALIDATION = NOT RUN · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · INTERACTION / MATERIALIZATION · IM-6 · CONVERGENCE · INTEGRATION · FAILURE ISOLATION · PERFORMANCE · REAL-VALIDATION · DESIGN-ONLY**

## 0. Purpose

IM-6 is the terminal design checkpoint of the Interaction / Materialization follow-up workstream.

It converges:

```text
IM-0  Interaction / Materialization master architecture
IM-1  current interaction intent + stale-event safety
IM-2  minimum durable BOARD_POST target
IM-3  interactive BOARD_APPEND_REPLY semantics
IM-4  interactive SOCIAL_FEED create/reply/quote/repost semantics
IM-5  optional external materialization + delayed-effect ownership
```

IM-6 freezes:

```text
A. final current-intent integration shape
B. owner-local concurrency composition
C. failure-class isolation and rollback boundaries
D. ordinary-chat dormancy / bounded-cost contract
E. runtime-readiness blockers and hard-cap prerequisites
F. deterministic / adversarial implementation acceptance matrix
G. target-host / long-chat validation protocol
H. final design-program convergence rule
```

IM-6 is design-only.

It does not implement event listeners, durable-object allocators, source mutation executors, provider clients, image generation, remote fetch, storage, DOM/CSS, host mount integration, model calls, source context re-entry, release changes, S7 changes, or `release-simcore` mutation.

## 1. Authority chain

IM-6 consumes without reopening:

```text
docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_INTERACTION_IM1_SOURCE_INTERACTION_INTENT_STALE_EVENT_SAFETY_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM2_BOARD_APPEND_REPLY_MINIMUM_DURABLE_TARGET_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM3_INTERACTIVE_BOARD_MUTATION_SEMANTICS_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM4_INTERACTIVE_SOCIAL_FEED_MUTATION_SEMANTICS_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM5_EXTERNAL_MATERIALIZATION_ASYNC_OPERATION_OWNERSHIP_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM6_INTEGRATION_FAILURE_ISOLATION_PERFORMANCE_REAL_VALIDATION_IMPACT_SCOPE_2026-09-03.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC5_ITEM_MUTATION_APPEND_RECONCILIATION_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC6_DERIVED_TO_DERIVED_LINEAGE_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC8_DELAYED_EFFECT_MEDIA_ATTACHMENT_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC9_INTEGRATION_COST_DORMANCY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC10_CONVERGENCE_RUNTIME_VALIDATION_PROTOCOL_2026-09-02.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/REPOSITORY_COMMON_RULES.md
```

Production runtime authority remains independently authoritative on `release-simcore`.

No Interaction / Materialization design document grants runtime authority.

## 2. Design convergence declaration

The Interaction / Materialization design program is converged through IM-6.

```text
IM-0 Master                                     = FROZEN
IM-1 Intent / stale-event safety                = FROZEN
IM-2 BOARD_POST durable target                  = FROZEN
IM-3 Interactive BOARD mutation                 = FROZEN
IM-4 Interactive SOCIAL_FEED mutation           = FROZEN
IM-5 Async optional materialization / C8         = FROZEN
IM-6 Integration / failure / performance / proof = FROZEN
```

Design documentation may therefore say:

```text
INTERACTION_MATERIALIZATION_DESIGN_PROGRAM = CONVERGED
```

It may not say:

```text
INTERACTION_RUNTIME = IMPLEMENTED
INTERACTION_RUNTIME = READY
MATERIALIZATION_RUNTIME = IMPLEMENTED
MATERIALIZATION_RUNTIME = READY
INTERACTION_MATERIALIZATION = DEPLOYED
INTERACTION_MATERIALIZATION = LIVE_PASS
```

## 3. Final product boundary

Interaction / Materialization remains a control/effect layer beside Source Intelligence.

Canonical separation:

```text
RUNTIME MODE
!= SOURCE FAMILY
!= INTERACTION PLANE
!= SEMANTIC MUTATION
!= EXTERNAL MATERIALIZATION
!= PRESENTATION RECONCILIATION
```

No new runtime mode is created.

No family gets write behavior merely by existing in the family registry.

## 4. Final primary decision

Selected architecture:

```text
CURRENT_INTENT_OWNER_LOCAL_EFFECT_ORCHESTRATION
+
EXACT_CURRENTNESS_AT_EVERY_WRITE_LIKE_BOUNDARY
+
OWNER_LOCAL_CONCURRENCY_LANES
+
FAILURE_CLASS_ISOLATION
+
VERTICAL_DORMANCY
+
BOUNDED_CURRENT_TARGET_COST_HORIZONS
```

There is no global interaction mutation engine and no global effect lock.

## 5. Current demand classification

IM-6 freezes a conceptual ephemeral demand classification.

```text
CurrentInteractionEffectDemandV1

NONE
VIEW_LOCAL
SOURCE_MUTATION
MATERIALIZATION
```

This is design vocabulary, not a runtime schema.

### `NONE`

No current authorized interaction/effect work exists.

### `VIEW_LOCAL`

Only presentation-owned ephemeral behavior is requested.

Examples:

```text
expand/collapse
popover
scroll
local selection highlight
```

No durable semantic lane activates.

### `SOURCE_MUTATION`

One current authorized semantic interaction intent exists and must dispatch to its family-owned mutation lane.

### `MATERIALIZATION`

One current authorized external materialization request exists and must dispatch to its target/slot-owned effect lane.

## 6. Demand is current-authority-derived only

The demand classifier may consume only current authority such as:

```text
current IM-1 accepted interaction intent
current explicit materialization intent
current presentation control binding
current family/action registry
```

It may not self-activate from:

```text
old durable objects
old source cards
old interaction receipts
old media attachments
historical family names
fuzzy transcript matches
recent-object heuristics
idle/background opportunities
```

Canonical rule:

```text
PAST INTERACTIVE STATE EXISTS
!=
CURRENT INTERACTION DEMAND EXISTS
```

## 7. Async completion is not a new current source job

An IM-5 provider/effect callback may arrive during a later ordinary user turn.

That callback is not authorized to create a new Source Intelligence request or wake unrelated durable lanes.

Its only authority is the already-issued bounded materialization operation lane.

Conceptually:

```text
late callback
→ exact target + slot + operation-token commit gate
```

not:

```text
late callback
→ history scan
→ source-family activation
→ model/source regeneration
```

## 8. Owner-local lane registry

IM-6 freezes three concrete owner-local lane classes.

```text
BOARD_REPLY_APPEND_LANE
SOCIAL_FEED_CREATE_LANE
MATERIALIZATION_SLOT_LANE
```

They share only control-plane invariants.

They do not share semantic revisions, ordering counters, operation tokens, or rollback authority.

## 9. BOARD lane ownership

From IM-3:

```text
lane owner
= exact durable BOARD_POST parent

operation
= BOARD_APPEND_REPLY

ordering
= parent-local appendSequence

idempotency
= BoardAppendCommitRef
```

A different BOARD_POST has a different append lane.

No global Board write lock is required by design.

## 10. SOCIAL_FEED lane ownership

From IM-4:

```text
lane owner
= one current interactive SOCIAL_FEED overlay

operations
= CREATE_POST / REPLY / QUOTE / REPOST

ordering
= overlaySequence

idempotency
= SocialItemCreateCommitRef
```

The lane serializes only final interactive feed-create ordering.

It does not own target semantic revisions.

## 11. Materialization lane ownership

From IM-5:

```text
lane owner
= exact durable target + owner-defined attachment slot

first concrete target
= SOCIAL_ITEM

first concrete slot
= OPTIONAL_DECORATIVE_TILE_V1

currentness
= MaterializationOperationToken
```

A newer request in the same target/slot lane supersedes the older token.

A different target/slot does not share that token.

## 12. No global lock

Forbidden architecture:

```text
GLOBAL_INTERACTION_LOCK
GLOBAL_CANDIDATE_C_MUTATION_LOCK
GLOBAL_MEDIA_TOKEN
GLOBAL_OPERATION_SEQUENCE
```

Reason:

```text
BOARD parent A reply
BOARD parent B reply
SOCIAL feed create
SOCIAL item X materialization
SOCIAL item Y materialization
```

are not the same semantic ownership domain.

Global serialization would add false coupling and turn one slow provider or target into unrelated interaction latency.

## 13. Authority precedence

When currentness predicates conflict, use this ordering:

```text
1. current production/runtime authority
2. current host/runtime lifecycle identity
3. current presentation/control binding when interaction originates from UI
4. exact durable target identity + lifetime
5. current source support / family eligibility
6. expected semantic revision when required
7. current owner-local operation/commit token
8. action/materialization-specific policy
9. committed semantic or attachment state
10. presentation reconciliation
11. view-local UI state
```

No lower layer rescues a failed higher layer.

Examples:

```text
current button cannot rescue stale durable target
same durable ID cannot rescue lost source support
same revision cannot rescue superseded materialization token
provider success cannot rescue stale runtime mount
renderer success cannot rescue failed semantic mutation
```

## 14. Failure-class taxonomy

IM-6 freezes seven integration failure classes.

```text
F0 VIEW_LOCAL_FAILURE
F1 INTENT_OR_STALE_EVENT_REJECTION
F2 TARGET_SUPPORT_CURRENTNESS_FAILURE
F3 SEMANTIC_MUTATION_FAILURE
F4 PROVIDER_OR_RESULT_FAILURE
F5 DELAYED_EFFECT_CURRENTNESS_FAILURE
F6 PRESENTATION_RECONCILIATION_FAILURE
```

These are diagnostic classes, not one shared error hierarchy requirement.

## 15. F0 · view-local failure

Examples:

```text
popover failed
collapse state lost
local decorative UI failed
```

Disposition:

```text
semantic source state unchanged
materialization authority unchanged unless the failing view owned a runtime-bound slot display
no semantic rollback
```

## 16. F1 · intent / stale-event rejection

Examples:

```text
stale runtime generation
stale presentation instance
unknown control binding
duplicate InteractionAttemptRef
unsupported family/action
invalid bounded payload
```

Disposition:

```text
NO semantic mutation
NO materialization launch
NO fuzzy retarget
NO hidden retry
NO model call
```

## 17. F2 · target/support/currentness failure

Examples:

```text
durable target not found
target lifetime expired
source support mismatch
target revision mismatch
family eligibility no longer valid
```

Disposition:

```text
NO new semantic commit
NO materialization attach
NO retarget to similar/current-looking object
```

An existing valid semantic object is not automatically deleted merely because one attempted operation failed.

## 18. F3 · semantic mutation failure

Examples:

```text
BOARD append capacity exceeded
SOCIAL target-kind policy rejected
commitRef conflict under invalid shape
final family semantic validation failed
```

Disposition:

```text
candidate mutation not committed
existing committed source state preserved
presentation remains on last committed state
no automatic materialization
```

## 19. F4 · provider/result failure

Examples:

```text
provider error
network error
invalid result media class
oversized result
unsafe result type
```

For the selected optional decorative materialization:

```text
source semantic item remains valid
text presentation remains sufficient
slot may show omitted/error presentation only if current owner allows
```

Provider failure has no semantic rollback authority.

## 20. F5 · delayed-effect currentness failure

Examples:

```text
operation token superseded
target revision changed
target retired
target support invalidated
runtime/presentation epoch stale
slot no longer current
```

Disposition:

```text
DROP late result from mutation/attachment
```

A successful provider result is still discarded when currentness fails.

An old failure similarly cannot clear a newer attached result.

## 21. F6 · presentation reconciliation failure

This is a critical final boundary.

If semantic commit has already succeeded:

```text
SEMANTIC COMMIT
        ↓ success
PRESENTATION RECONCILIATION
        ↓ failure
```

then:

```text
SEMANTIC COMMIT REMAINS COMMITTED
```

The renderer/host failure does not acquire rollback authority.

A later current remount may render from current committed semantics if the host/presentation identity contract allows it.

## 22. No presentation-driven rollback

Forbidden:

```text
append reply committed
DOM update throws
→ delete reply to make UI match
```

or:

```text
SOCIAL_ITEM committed
mount fails
→ restore previous semantic overlay automatically
```

Rollback/revert is itself a semantic operation and requires fresh current authority.

## 23. No optimistic semantic UI in first integration

The first integrated design keeps the safer sequence:

```text
validate
→ semantic commit
→ presentation reconcile
```

not:

```text
show semantic success optimistically
→ later attempt commit
```

View-local loading/pending affordances may exist, but they must not claim semantic mutation succeeded before commit.

## 24. Source mutation does not trigger materialization

Canonical rule:

```text
SEMANTIC SOURCE MUTATION
!=
MATERIALIZATION REQUEST
```

Examples:

```text
new SOCIAL post committed
→ no automatic tile generation

new BOARD reply committed
→ no automatic illustration
```

A current explicit materialization intent is required.

## 25. Materialization does not revise source semantics

For `OPTIONAL_DECORATIVE_TILE_V1`:

```text
attachment slot state changes
!=
target semanticRevision changes
```

The target semantic revision advances only for owner-defined semantic changes.

Optional decorative attachment state has its own owner-local lifecycle.

## 26. Materialization failure is fail-soft

The first selected external materialization is semantically optional.

Therefore:

```text
materialization unavailable
→ text/source semantics remain complete
```

The source item must never require the tile to remain semantically valid.

## 27. Semantic media remains excluded

IM-6 does not reopen:

```text
source post image as semantic content
screenshot evidence
canonical profile portrait
NEWS evidence image
media claim extraction
visual source truth
```

Those require a separate semantic-media contract.

## 28. Cross-lane concurrency example

Legal concurrent state:

```text
BOARD parent P1
→ reply append A in flight

SOCIAL feed
→ create POST B in flight

SOCIAL_ITEM X
→ decorative tile request M in flight
```

These operations do not share one lock.

They only interact if one operation changes a currentness predicate explicitly depended on by another.

## 29. Same-target semantic change versus media

If a future semantic mutation changes target `T @ R3` to `T @ R4` while materialization for R3 is in flight:

```text
media callback
→ exact target resolves
→ current revision = R4
→ expected revision = R3
→ stale
→ DROP
```

No global transaction is needed.

Currentness resolves the race locally.

## 30. Target replacement versus media

If old locator L1 is replaced by L2:

```text
L1 materialization operation
!= authority for L2
```

The result must not jump to the replacement card based on DOM position or content similarity.

## 31. Runtime teardown rule

When the current runtime/conversation-owned interactive lifetime ends:

```text
interaction control bindings expire
durable current-runtime object access expires
owner-local operation tokens lose apply authority
presentation instance references expire
in-flight late callbacks cannot resurrect state
```

No reload restoration is frozen.

## 32. Reload behavior

First integrated behavior remains:

```text
reload
→ no guaranteed interactive overlay restoration
→ no guaranteed durable target restoration
→ no guaranteed media attachment restoration
→ old async completion has no apply authority in new runtime
```

A future persistence/reload product requires a separate consumer and migration contract.

## 33. Dormancy firewall

When current demand is `NONE`:

```text
interaction/materialization = DORMANT
```

Required zero semantic/effect work:

```text
old durable target lookups              = 0
old overlay scans                        = 0
old relationship traversals              = 0
support revalidation for old objects     = 0
mutation lane resolution                 = 0
mutation candidate allocation            = 0
materialization slot lookup              = 0
new operation-token allocation           = 0
provider/network/model calls             = 0
background enrichment                    = 0
background retries                       = 0
historical media scans                   = 0
source-derived prompt re-entry bytes      = 0
interaction/materialization model bytes  = 0
```

A bounded current event/demand gate is allowed.

## 34. `VIEW_LOCAL` remains semantically dormant

A view-local interaction may update ephemeral presentation state without activating Candidate C semantic lanes.

Examples:

```text
expand card
open reply composer UI before submit
select tab
hover/highlight
```

Until a semantic/materialization intent is submitted:

```text
durable mutation work = 0
provider work = 0
```

## 35. Historical size must not wake interaction

Let:

```text
H = number of retained current-runtime durable interactive objects
```

For an unrelated ordinary request:

```text
interaction/materialization semantic cost
= O(1) bounded current-demand gate
```

not:

```text
O(H)
O(log H) historical search
```

No old object search may be used merely to decide whether an interaction might be useful.

## 36. Active BOARD cost horizon

A `BOARD_APPEND_REPLY` operation may touch only bounded current data such as:

```text
one exact parent target
one expected parent revision
one support-at-use proof
one parent-local append lane
one bounded reply payload
one new BOARD_REPLY record
one bounded presentation reconciliation
```

It must not scan all retained Board history.

## 37. Active SOCIAL_FEED cost horizon

A SOCIAL create/relation operation may touch only bounded current data such as:

```text
one interactive feed owner
zero or one exact target
one expected target revision when dependent
one support-at-use proof
one bounded user payload when content-bearing
one feed-create commit lane
one new SOCIAL_ITEM
one bounded presentation reconciliation
```

It must not scan all prior feeds.

## 38. Active materialization cost horizon

A materialization request may touch only bounded current data such as:

```text
one exact durable target
one expected revision
one support-at-use proof
one attachment slot
one operation token
one bounded provider request
one bounded result validation
one bounded presentation attach
```

It must not scan other media slots or historical objects to discover work.

## 39. No automatic prefetch or enrichment

Forbidden:

```text
source card becomes visible
→ automatically launch image generation

idle browser
→ fill missing tiles

old SOCIAL_ITEM retained
→ periodically refresh media
```

The first integration is current-intent-driven only.

## 40. Hard caps required before runtime readiness

D0 design convergence does not freeze arbitrary numeric values.

However I1 runtime readiness is blocked until concrete implementation caps are defined for at least:

```text
interaction payload characters / bytes
per-runtime retained BOARD_POST count
per-runtime retained BOARD_REPLY count
per-parent interactive reply count
per-runtime retained SOCIAL_ITEM count
interactive SOCIAL overlay length
active interaction control bindings
in-flight materialization operations
per-target/slot operation concurrency
materialization input characters / bytes
provider output bytes
provider output dimensions / duration as applicable
operation timeout / cancellation horizon
bounded diagnostic receipt counts
```

Unbounded collections are a runtime-readiness blocker.

## 41. Capacity failure behavior

When a concrete cap is reached:

```text
FAIL CLOSED FOR THE NEW OPERATION
```

Do not silently:

```text
evict an arbitrary current semantic object
merge unrelated objects
truncate accepted user semantic text after commit
retarget to a different object
expand the cap dynamically without policy
```

Eviction/persistence policy requires separate ownership if later needed.

## 42. Diagnostics contract

Future instrumentation may expose bounded metadata such as:

```text
current demand class
interaction attempts by action kind
accepted / rejected intent counts
stale-event reason counts
exact durable lookup counts
semantic commit counts
semantic failure reason counts
materialization launches
materialization supersessions
late-success drops
late-failure no-op counts
provider/result failures
presentation reconciliation failures
active current-runtime durable counts
```

It must not require storing semantic content.

## 43. Diagnostics content exclusion

Do not retain in ordinary diagnostics:

```text
raw Board reply text
raw Social post/reply/quote text
hidden source content
quarantined semantic content
raw materialization prompt
provider secrets
generated media bytes
private Knowledge/history
```

Reason codes and lengths are preferred over semantic payload copies.

## 44. No diagnostics authority

Canonical rule:

```text
DIAGNOSTIC SAYS COMMIT SUCCEEDED
!=
DIAGNOSTIC BECOMES SOURCE AUTHORITY
```

Current durable semantic state remains owned by the actual semantic owner.

## 45. Model-call baseline

Current admitted interaction mutations are direct-user literal operations.

Therefore:

```text
BOARD_APPEND_REPLY model call = 0
SOCIAL CREATE/REPLY/QUOTE/REPOST model call = 0
```

`OPTIONAL_DECORATIVE_TILE_V1` may later use an external effect provider only under a separately implemented materialization adapter. Its existence does not authorize an LLM call for semantic source generation.

## 46. Context re-entry remains closed

IM-6 does not activate C6.

```text
interactive durable object exists
!=
insert it into future model context
```

No Board/Social interactive overlay is automatically copied into later prompts.

A later model-assisted mutation must activate and satisfy the explicit controlled context-reentry contract.

## 47. C7 remains closed

IM-6 does not freeze partial descendant survival across parent replacement.

Therefore current same-family relations use strict current target/revision support.

If future edit/reroll/replacement wants historical children to survive:

```text
C7 consumer required
```

No floating-latest repair is added here.

## 48. Current Candidate C profile after IM-6

Design consumers currently require:

```text
C1 survival         = YES, bounded current runtime
C2 stable identity  = YES, BOARD_POST / BOARD_REPLY / SOCIAL_ITEM
C3 item edit        = NO
C4 append/merge     = YES, BOARD reply + SOCIAL overlay create
C5 relation         = YES, narrow same-family SOCIAL relation edges
C6 context re-entry = NO
C7 survivor logic   = NO
C8 delayed effect   = YES, OPTIONAL_DECORATIVE_TILE_V1
```

This is a design capability profile, not deployed runtime state.

## 49. Runtime-readiness gate family

Interaction / Materialization runtime readiness requires all applicable upstream Source Intelligence / Candidate C / LRE gates plus the following concrete integration prerequisites.

```text
IR1 THEN_CURRENT_PRODUCTION_PREFLIGHT
IR2 EXACT_HOST_PRESENTATION_IDENTITY
IR3 INTERACTION_EVENT / CONTROL-BINDING PLUMBING
IR4 CURRENT-RUNTIME DURABLE OBJECT ALLOCATOR + EXACT LOOKUP
IR5 BOARD / SOCIAL MUTATION EXECUTORS
IR6 MATERIALIZATION ADAPTER + RESULT VALIDATION + CANCELLATION
IR7 CONCRETE HARD CAPS
IR8 DORMANCY / CURRENTNESS / FAILURE INSTRUMENTATION
```

These names are IM-6 readiness vocabulary, not repository release gates.

## 50. IR1 · then-current production preflight

Before implementation/runtime work:

```text
re-read then-current release-simcore
re-run then-current target-host coupling evidence
re-confirm source transport / structured sidecar path
re-confirm production current-state invariants
```

No 2026-09-03 host observation is a permanent host guarantee.

## 51. IR2 · exact host presentation identity

LRE-1 currently confirms a display identity gap.

Therefore active interaction controls and materialization attachment remain blocked until exact current host presentation/message identity is safely available.

Forbidden workaround:

```text
content hash
DOM text similarity
hidden transcript marker
CSS position
"latest assistant message" guess
```

## 52. IR3 · interaction event plumbing

Future implementation must provide:

```text
plugin-owned InteractionControlBinding resolution
runtime generation checks
presentation instance checks
bounded SourceInteractionIntent construction
stale-event rejection
```

DOM attributes alone may not become semantic authority.

## 53. IR4 · durable current-runtime object support

Future implementation must support exact owner-scoped lookup for the admitted durable namespaces while preserving current-runtime bounded lifetime.

It must not accidentally introduce persistent global source storage merely for convenience.

## 54. IR5 · mutation executors

Runtime must implement owner-specific semantics, not one generic JSON patcher.

Required first executors:

```text
BOARD_APPEND_REPLY
SOCIAL_FEED_CREATE_POST
SOCIAL_FEED_REPLY
SOCIAL_FEED_QUOTE
SOCIAL_FEED_REPOST
```

Semantic `REACT`, edit/delete/reroll and Board recommend remain outside this convergence scope.

## 55. IR6 · materialization adapter

A future first adapter must define concrete:

```text
provider/effect class
bounded safe input derivation
result type validation
size/dimension caps
operation cancellation/supersession behavior
late callback handling
presentation attach/remove behavior
```

IM-6 does not select a provider.

## 56. IR7 · concrete caps

All cap categories from section 40 must have explicit implementation values before runtime readiness can be claimed.

## 57. IR8 · evidence instrumentation

Runtime must be able to prove at least:

```text
ordinary-turn durable work stayed zero
no hidden history scan occurred
which currentness predicate rejected a stale operation
old success/failure could not mutate newer state
presentation failure did not roll back semantics
no unrequested provider/model work occurred
```

Instrumentation may not itself create large hidden semantic state.

## 58. Current readiness verdict

At IM-6 design convergence:

```text
IM_DESIGN_PROGRAM     = CONVERGED
RUNTIME_IMPLEMENTED   = NO
RUNTIME_AUTHORIZED    = NO
RUNTIME_READY         = NO
DEPLOYED              = NO
REAL_HOST_VALIDATION  = NOT_RUN
REAL_LONG_CHAT_PASS   = NOT_RUN
```

This is the expected result.

## 59. Evidence tiers

IM-6 reuses the Candidate C evidence separation.

```text
D0 · DESIGN BOUNDEDNESS
I1 · IMPLEMENTATION CONFORMANCE
H2 · HOST / LONG-CHAT EVIDENCE
```

Current state:

```text
D0 = PASS when this convergence transaction is accepted
I1 = NOT_RUN
H2 = NOT_RUN
```

No lower tier substitutes for a higher tier.

## 60. Deterministic acceptance matrix overview

A future I1 implementation must have deterministic tests for the following lanes before host evidence.

```text
R0  ordinary-chat dormancy after heavy interaction history
R1  VIEW_LOCAL does not activate semantic/effect lanes
R2  stale/duplicate interaction event rejection
R3  BOARD reply happy path
R4  BOARD concurrent distinct replies + deterministic ordering
R5  BOARD parent revision/support race
R6  SOCIAL create/reply/quote/repost happy paths
R7  SOCIAL exact target revision race
R8  duplicate commit retry versus two distinct user actions
R9  materialization A/B supersession
R10 old materialization failure after newer success
R11 target revision changes while media is in flight
R12 support loss / retirement while media is in flight
R13 provider/result failure soft degradation
R14 semantic commit then presentation failure
R15 runtime replacement/reload with async callback in flight
R16 mixed BOARD + SOCIAL + media interleaving
R17 no automatic materialization after semantic mutation
R18 zero automatic model/context re-entry
R19 source reroll/edit invalidates stale interaction target
R20 bounded-cap failure
```

## 61. R0 · ordinary-chat dormancy

Setup:

```text
perform multiple interactive BOARD/SOCIAL operations
launch/finish bounded materializations
retain current-runtime durable objects
then send unrelated ordinary requests
```

Required evidence on unrelated turns:

```text
durable lookup = 0
old overlay scan = 0
materialization slot lookup = 0
provider/network/model calls = 0
source-derived prompt bytes = 0
```

Historical size must not affect activation cost.

## 62. R1 · VIEW_LOCAL isolation

Actions such as expand/collapse or opening a composer without submit must prove:

```text
semantic mutation work = 0
new durable semantic writes = 0
provider work = 0
```

## 63. R2 · stale / duplicate event safety

Cases:

```text
old runtime generation
old presentation instance
unknown binding
duplicate InteractionAttemptRef
```

Required:

```text
DROP
NO RETARGET
NO MUTATION
NO MATERIALIZATION
```

## 64. R3 · BOARD reply happy path

Prove:

```text
exact parent locator
expected parent revision
support-at-use
bounded literal user reply
new BOARD_REPLY identity
one parent-local append commit
presentation from committed overlay
```

No model call.

## 65. R4 · concurrent BOARD replies

Two distinct user replies observed against the same still-current parent revision may both commit.

Required:

```text
both durable child identities survive
appendSequence deterministic
one reply does not stale the other merely because it committed first
```

Internal retry of one append must not create a duplicate child.

## 66. R5 · BOARD parent race

If parent semantic revision or support changes between user observation and final commit:

```text
append rejected
no automatic refresh-and-apply
no retarget
```

## 67. R6 · SOCIAL happy paths

Independently prove:

```text
CREATE_POST
REPLY
QUOTE
REPOST
```

with correct content/relation shapes, new durable `SOCIAL_ITEM`, deterministic overlaySequence, and no aggregate metrics.

## 68. R7 · SOCIAL target race

If target revision changes before dependent REPLY/QUOTE/REPOST commit:

```text
reject dependent create
```

No floating-latest repair.

## 69. R8 · retry versus two user actions

Prove separately:

```text
same semantic commitRef retry
→ one committed object

two distinct current user intents with equal text
→ two committed objects when policy/capacity allows
```

Value equality must not become user-action deduplication.

## 70. R9 · materialization supersession

Scenario:

```text
T @ R
A starts for slot S
B starts later for same T/R/S
B becomes current
A returns after B
```

Required:

```text
A cannot attach
B may attach only if all currentness gates still pass
```

## 71. R10 · old failure after newer success

Scenario:

```text
A starts
B supersedes A
B succeeds + attaches
A later fails
```

Required:

```text
A failure cannot clear B attachment
```

## 72. R11 · revision change during effect

Scenario:

```text
T @ R3
materialization starts
T becomes R4
result returns
```

Required first policy:

```text
DROP stale result
```

unless a future explicit field-dependency compatibility contract exists.

## 73. R12 · support loss / retirement during effect

If target support is lost or target lifetime ends:

```text
late result cannot attach
late result cannot resurrect target
late result cannot retarget
```

## 74. R13 · provider/result failure

For optional decorative materialization:

```text
provider failure
→ semantic source item remains valid
→ text-only presentation remains legal
```

No semantic rollback.

## 75. R14 · semantic commit then presentation failure

Scenario:

```text
semantic mutation commits
presentation reconciliation throws/fails
```

Required:

```text
semantic state remains committed
no automatic rollback
future current remount renders current state if host identity contract allows
```

This is a mandatory integration proof.

## 76. R15 · runtime replacement / reload

Scenario:

```text
materialization in flight
runtime replaced/reloaded
old callback returns
```

Required:

```text
old runtime/operation authority rejected
no state resurrection
no attachment into new runtime by similarity
```

## 77. R16 · mixed interleaving

Interleave:

```text
BOARD replies on multiple parents
SOCIAL creates
materialization on different SOCIAL_ITEM targets
```

Required:

```text
no global operation lock
owner-local ordering remains deterministic
one lane's provider delay does not block unrelated semantic commits
failure in one lane does not roll back another lane
```

## 78. R17 · no automatic materialization

After successful BOARD/SOCIAL mutation with no explicit materialization request:

```text
provider/network/image work = 0
```

## 79. R18 · no automatic context/model work

Across all direct-user interaction paths:

```text
semantic model call = 0
old source context re-entry = 0
```

If future model-assisted interaction is introduced, it requires a separate design checkpoint.

## 80. R19 · source reroll/edit invalidation

If the underlying supported source/root changes so an interactive durable target loses support:

```text
old visible control event cannot mutate it
old durable locator cannot rescue it
```

Required:

```text
fail closed by support/currentness gate
```

## 81. R20 · bounded-cap failure

Exercise every concrete runtime cap near and beyond its limit.

Required:

```text
new over-cap operation rejected predictably
existing committed semantics preserved
no arbitrary unrelated eviction
no silent truncation of committed semantic content
no unbounded fallback structure
```

## 82. Adversarial matrix

I1 tests must additionally cover:

```text
forged DOM locator
copied control binding from another presentation
same content with different durable identity
same durable ID with stale revision
same revision with stale operation token
provider result with wrong media class
provider result after slot reset
old callback after conversation/runtime replacement
old failure after newer state
materialization attempt against unsupported target
interaction after target lifetime expiry
```

Every case fails closed at the earliest owning boundary.

## 83. Host / long-chat H2 protocol

H2 must run against the then-current target host after the actual implementation exists and after applicable LRE/runtime gates pass.

The protocol must use real host lifecycle behavior, not only isolated evaluator objects.

## 84. H2 ordinary-chat baseline

Run long sequences alternating:

```text
ordinary chat
interactive BOARD
ordinary chat
interactive SOCIAL_FEED
ordinary chat
optional materialization
ordinary chat
```

Required ordinary turns:

```text
zero interaction durable semantic work
zero provider work
zero interaction-derived context bytes
no growing latency from old interactive history
```

## 85. H2 current-host identity proof

Interaction actions must prove they target the exact current source presentation/message identity under real reroll/edit/remount behavior.

No content-similarity fallback may pass.

## 86. H2 reroll/edit stress

During real host source reroll/edit:

```text
old controls become stale
old target support is rejected
new presentation gets fresh bindings
old async callbacks cannot attach to replacement content
```

## 87. H2 race stress

Exercise deliberately reordered completion:

```text
A starts before B
B finishes before A
A success late
A failure late
runtime remount between start/finish
```

The observed result must match owner-local currentness rules, not callback arrival order alone.

## 88. H2 mixed-family stress

Interleave BOARD and SOCIAL operations while materialization is active.

Required evidence:

```text
no global interaction blockage
no cross-family semantic promotion
no cross-lane rollback
no old-source activation on unrelated turns
```

## 89. H2 performance shape

Performance evidence must distinguish:

```text
ordinary dormant turns
active direct semantic mutation
active provider/materialization turns
late callback commit checks
```

Do not average them into one meaningless latency number.

The key proof is shape/boundedness, especially:

```text
ordinary cost independent of retained durable history
active cost proportional to current bounded target horizon
```

## 90. H2 media/provider evidence

If the selected materialization adapter uses external network/model/image work, collect separately:

```text
start latency
provider duration
result-validation duration
commit-time currentness gate duration
late-drop counts
supersession counts
```

Provider duration must not be attributed to ordinary Source Intelligence semantic cost.

## 91. H2 failure evidence

Real host tests must visibly prove:

```text
semantic commit survives presentation failure
optional media failure degrades to text-only
stale success is dropped
stale failure cannot clear newer state
reload/runtime replacement kills old apply authority
```

## 92. Regression requirements

A future runtime activation must also preserve existing production behaviors outside the new lanes.

At minimum:

```text
ordinary Mode A behavior unchanged when no source job exists
existing B/C/community compatibility not silently altered
first-major Source Intelligence dormancy preserved
existing production output correctness not regressed
release authority remains release-simcore until explicit release transaction
```

## 93. Host-coupling blocker remains binding

LRE-1 currently freezes:

```text
DISPLAY OUTPUT PHASE EXISTS
!=
IDENTITY-BEARING SOURCE MOUNT EXISTS
```

Therefore IM-6 design convergence does not make real interaction mount safe by itself.

Runtime work remains blocked until the then-current host identity contract is proven.

## 94. Structured source/runtime prerequisites remain binding

Interaction controls need an actual trusted structured source presentation/runtime surface.

IM-6 does not bypass unresolved transport/producer/mount work by hiding mutation IDs in ordinary assistant transcript.

Forbidden shortcut:

```text
encode durable interaction state into hidden assistant text
→ call it runtime transport
```

## 95. No persistence shortcut

Current runtime bounded durable identity does not authorize:

```text
localStorage dump of full source semantics
IndexedDB archive
hidden transcript storage
remote source database
```

If reload survival becomes a product requirement, reopen the storage/lifetime consumer explicitly.

## 96. Implementation staging direction

If runtime work is separately authorized later, the recommended implementation order is:

```text
Stage 0 · then-current G1/LRE/host preflight
Stage 1 · IM-1 control binding + stale-event plumbing, no semantic write
Stage 2 · current-runtime durable allocator / exact lookup
Stage 3 · BOARD_APPEND_REPLY only
Stage 4 · SOCIAL create/reply/quote/repost
Stage 5 · dormancy/currentness instrumentation + hard caps
Stage 6 · optional materialization adapter with fake/local deterministic provider first
Stage 7 · real provider only after local async ownership tests pass
Stage 8 · full I1 matrix
Stage 9 · H2 target-host / long-chat matrix
```

This is staging guidance, not implementation authorization.

## 97. Why fake/local async evidence should precede real provider

Temporal safety can be proven without provider variability.

A deterministic delayed-effect harness should first control:

```text
completion order
success/failure
supersession
revision change
runtime replacement
support invalidation
```

Only after ownership behavior is deterministic should external provider variability be introduced.

## 98. No implementation-by-design

The existence of detailed pseudotypes such as:

```text
CurrentInteractionEffectDemandV1
InteractionControlBindingRef
MaterializationOperationToken
```

must not be interpreted as approval to serialize them into production or persistent schema.

They remain design vocabulary until implementation authority is separately granted.

## 99. Deferred features after IM-6

Still deferred:

```text
BOARD add-post/edit/delete/reroll/recommend
SOCIAL_FEED semantic REACT
SOCIAL edit/delete/reroll
persistent SOCIAL actor/account identity
model-assisted mutations
C6 interactive context re-entry
C7 descendant/historical relation survival
semantic source media
media evidence/provenance
reload persistence
cross-conversation source archive
automatic background enrichment
```

These are not required to close the first Interaction / Materialization design program.

## 100. Final convergence blockers versus deferrals

### Blocks runtime readiness

```text
exact host presentation identity unresolved
actual event/control plumbing absent
actual current-runtime durable allocator absent
actual mutation executors absent
actual materialization adapter absent
concrete hard caps absent
instrumentation/evidence absent
then-current production/host preflight not run
```

### Does not block design convergence

```text
semantic REACT deferred
edit/delete/reroll deferred
semantic media deferred
C6 closed
C7 closed
reload persistence absent
real provider absent
real host evidence absent before implementation
```

## 101. Final design verdict

```text
CURRENT_INTENT_OWNER_LOCAL_EFFECT_ORCHESTRATION = FROZEN
OWNER_LOCAL_CONCURRENCY                         = FROZEN
FAILURE_CLASS_ISOLATION                        = FROZEN
PRESENTATION_FAILURE_ROLLBACK                   = FORBIDDEN
AUTOMATIC_MEDIA_AFTER_MUTATION                  = FORBIDDEN
ORDINARY_CHAT_DURABLE_SCAN                      = FORBIDDEN
AUTOMATIC_CONTEXT_REENTRY                       = FORBIDDEN
C8 FIRST OPTIONAL MATERIALIZATION CONSUMER       = FROZEN
D0 DESIGN BOUNDEDNESS                           = PASS
I1 IMPLEMENTATION CONFORMANCE                   = NOT_RUN
H2 HOST / LONG_CHAT                             = NOT_RUN
RUNTIME IMPLEMENTATION AUTHORIZED               = NO
RUNTIME READY                                   = NO
```

## 102. Workstream close

The Interaction / Materialization first design program is complete.

```text
IM-0 ✅
IM-1 ✅
IM-2 ✅
IM-3 ✅
IM-4 ✅
IM-5 ✅
IM-6 ✅
```

There is no automatic `IM-7`.

Any further work must be opened by a concrete new product consumer or by separately authorized runtime-enabling work.
