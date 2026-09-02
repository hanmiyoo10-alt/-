# SimCore Post-3.0M Candidate C CC-9 Integration / Cost / Dormancy Design — 2026-09-02

Date: 2026-09-02 KST

Status: **CC-9 DESIGN FROZEN · C1–C8 INTEGRATION / COST-HORIZON / VERTICAL DORMANCY CONTRACT · CURRENT-INTENT-GATED DURABILITY · DESIGN-ONLY · NO STORE / REENTRY / MUTATION / LINEAGE / SURVIVOR / MEDIA RUNTIME · NO BACKGROUND WORK · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · CANDIDATE C · CC-9 · INTEGRATION · PERFORMANCE BUDGET · DORMANCY · FAILURE ISOLATION · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

CC-9 converges the Candidate C contracts frozen in CC-0 through CC-8 into one integration and cost architecture.

The problem changes after durable derived objects exist.

3M-9 froze the first-major rule:

```text
source irrelevant request
→ zero Source Intelligence semantic burden
```

At that time Candidate C was closed, so there was no durable source history, mutation lane, derived lineage, controlled re-entry, survivor reconciliation, or delayed media lane to accidentally wake up.

CC-9 extends the same discipline to a future system where those capabilities may exist.

It answers:

```text
How does Candidate C remain completely dormant when the current request/operation does not need it?
What current authority may activate each durable lane?
What may never activate from historical residue alone?
How does cost scale with the current target rather than total durable history?
How are CC-3 history, CC-4 re-entry, CC-5 mutation, CC-6 lineage, CC-7 survival, and CC-8 delayed effects composed without one global mega-pipeline?
What cross-lane races require explicit ordering/currentness checks?
What storage/index properties are required before runtime activation?
What feature-off behavior must close vertically?
What boundedness constants must exist before implementation can claim performance readiness?
How are failures isolated so presentation/media/history failures do not rewrite semantic authority?
What evidence must CC-10 later require from a real implementation?
```

CC-9 is design-only.

It does not implement persistence, indexes, retrieval, prompt re-entry, source mutation, model-assisted generation, derived lineage, descendant reconciliation, provider/network calls, media storage, background cleanup, telemetry pipelines, long-chat execution, runtime feature flags, release changes, or `release-simcore` mutation.

## 1. Authority chain

CC-9 consumes:

```text
SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01
SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC4_CONTROLLED_CONTEXT_REENTRY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC5_ITEM_MUTATION_APPEND_RECONCILIATION_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC6_DERIVED_TO_DERIVED_LINEAGE_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC7_PARTIAL_DESCENDANT_SURVIVAL_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC8_DELAYED_EFFECT_MEDIA_ATTACHMENT_DESIGN_2026-09-02
SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01
SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01
SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01
Lineage / Handoff / Evidence authority ownership
Prompt / Request Assembly ownership
Presentation Host runtime/effect-generation ownership
REPOSITORY_COMMON_RULES temporal ownership and partial-write invariants
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Primary integration decision

Selected architecture:

```text
CURRENT_INTENT_GATED_DURABILITY_ORCHESTRATION
+
OWNER_LOCAL_BOUNDED_COST_HORIZONS
+
VERTICAL_DORMANCY_FIREWALL
+
EXACT_TARGET_FIRST_RESOLUTION
+
SUPPORT_AT_EVERY_SEMANTIC_USE
+
FAILURE_CLASS_ISOLATION
```

Candidate C does not become a continuously running subsystem merely because durable objects exist.

Canonical rule:

```text
DURABLE OBJECT EXISTS
!=
CANDIDATE C WORK IS ACTIVE
```

The presence of stored BOARD posts, old NEWS stories, lineage pins, tombstones, or media metadata does not authorize reads, validation, prompt insertion, mutation, provider work, or background scans on an unrelated turn.

## 3. Candidate C is not one global state machine

CC-9 explicitly rejects one giant runtime state such as:

```text
CANDIDATE_C_ACTIVE = true
```

because different current operations require different capability subsets.

Instead, a future integration layer consumes an ephemeral **capability demand profile** derived from current authority.

Conceptually:

```text
CurrentDurabilityDemand
  durableRead?           // CC-3
  contextReentry?        // CC-4 / C6
  mutation?              // CC-5 / C3-C4
  lineageParentRead?     // CC-6 / C5
  survivorReconcile?     // CC-7 / C7
  delayedEffect?         // CC-8 / C8
```

This is a design vocabulary, not a serialized runtime schema.

A demand bit does not grant authority by itself.

It means only that the current authorized consumer has a reason to enter that lane and must still satisfy that lane's exact contract.

## 4. Activation authority is current, never historical

Candidate C lane activation may come only from current authority such as:

```text
current user request
current authorized source interaction intent
current source-family operation
current explicitly authorized model-assisted mutation job
current explicitly authorized materialization request
current child-source job that declares a derived parent requirement
```

It must not self-activate from:

```text
old source cards visible in UI
old durable objects existing in storage
old source names appearing in transcript
old lineage edges
old attachment records
old operation receipts
fuzzy similarity with current prose
recent-object heuristics without an authorized selector
background "helpful enrichment"
```

Canonical rule:

```text
CURRENT DURABILITY WORK
MUST BE CAUSED BY CURRENT AUTHORITY
NOT BY HISTORICAL RESIDUE
```

## 5. Ordinary-turn dormancy firewall

When the current request has no authorized Candidate C demand:

```text
Candidate C = DORMANT
```

Required behavior:

```text
durable object lookup                  = 0
owner collection scan                  = 0
history parse                          = 0
revision validation                    = 0
support revalidation for old objects   = 0
context re-entry resolution            = 0
re-entry prompt bytes                  = 0
mutation target resolution             = 0
mutation draft allocation              = 0
lineage parent lookup                  = 0
lineage revision-pin lookup            = 0
survivor traversal                     = 0
attachment-slot lookup                 = 0
provider/network call                  = 0
media generation                       = 0
background retry                       = 0
background prefetch                    = 0
periodic history sweep                 = 0
auxiliary model call                   = 0
new Candidate C persistent write       = 0
Candidate C model-context bytes        = 0
```

A bounded local feature/demand gate may execute to decide dormancy.

CC-9 freezes **zero durable semantic work**, not the physically impossible claim of zero CPU instructions.

## 6. Durable history size must not affect ordinary chat

Let:

```text
H = total durable objects retained across all Candidate C owners
```

For an unrelated ordinary request:

```text
Candidate C semantic cost = O(1) bounded gate
```

not:

```text
O(H)
```

or:

```text
O(log H) hidden retrieval just to decide whether old content might help
```

No historical search is permitted merely to decide whether Candidate C should wake up.

## 7. Cost horizon principle

For an active Candidate C operation, cost must scale with the **current explicitly targeted semantic horizon**, not total history.

Canonical rule:

```text
cost(current operation)
≈ bounded current target set + bounded required dependencies
```

Forbidden:

```text
cost(current operation)
≈ all prior durable source objects
```

Each lane therefore has its own cost horizon.

## 8. CC-3 history retrieval cost horizon

Default exact lookup:

```text
(owner, namespace, opaque object ID)
→ one bounded record
```

Target complexity requirement:

```text
EXACT_LOOKUP
≈ O(1) or implementation-equivalent indexed lookup
```

A bounded owner-scoped collection may return at most `K_owner` objects under an explicitly authorized archive/list operation.

```text
OWNER_COLLECTION_READ
= O(K_owner)
```

where `K_owner` is a frozen implementation cap.

Forbidden fallback:

```text
index miss
→ scan all H records
```

If exact/indexed resolution cannot be performed:

```text
UNRESOLVED / STORE_INDEX_UNAVAILABLE
```

not a global scan.

## 9. CC-4 context re-entry cost horizon

CC-4 V1 remains:

```text
MAX_REENTRY_OBJECTS_PER_REQUEST = 1
```

Therefore the re-entry horizon is:

```text
one exact/deterministically resolved durable object
+ one bounded typed field slice
+ current support/policy checks required for that slice
```

It must not scan all source history to find "relevant memories".

Prompt cost is bounded by the consumer's explicit re-entry caps:

```text
max objects
max semantic units
max chars/tokens
```

No cap means runtime activation is blocked.

## 10. CC-5 mutation cost horizon

A mutation begins from:

```text
one exact target locator
+ expected revision/currentness
```

Additional work may include only dependencies explicitly owned by the operation.

Examples:

```text
EDIT one item
→ target + bounded direct descendant reconciliation set

APPEND_CHILD
→ target parent + new child + bounded ordering/dedupe state

DELETE_RETIRE
→ target + explicitly bounded descendant disposition set
```

Mutation must not load every historical revision or every source object in the family.

If descendant fanout exceeds the frozen consumer cap:

```text
BLOCK_MUTATION_BOUNDEDNESS_EXCEEDED
```

rather than silently widening the scan.

## 11. CC-6 lineage cost horizon

CC-6 first scope remains:

```text
MAX_DERIVED_PARENTS_PER_CHILD = 1
MAX_DERIVED_LINEAGE_DEPTH = 1
```

Therefore one child-source operation may perform at most:

```text
one exact parent-object lookup
+ one exact parent-revision lookup/pin check
+ bounded proposition/attribution validation
```

No recursive ancestor walk exists in the first scope.

A future increase in parent count or depth requires a new cost/provenance design before implementation.

## 12. CC-7 survivor cost horizon

CC-7 first scope remains:

```text
DIRECT CHILD ONLY
```

For a parent-affecting operation, survivor reconciliation may inspect only the bounded direct-child set owned by the concrete consumer.

It must not recursively traverse an unbounded subtree.

If a child itself owns descendants and no bounded second-level policy is authorized:

```text
withhold / cascade / block according to consumer contract
```

not recursive best-effort salvage.

## 13. CC-8 delayed-effect cost horizon

CC-8 first scope remains:

```text
one durable target
one owner-defined attachment slot
one current superseding attempt
one result
```

A result completion path resolves only:

```text
target locator
current target revision/compatibility state
slot currentness
operation token
support/lifetime
optional runtime epoch
```

It does not search historical objects for another place where the result might fit.

No stale-result retargeting exists.

## 14. Integrated current-operation pipeline

Candidate C does not need one mega-pipeline, but all semantic operations share a common safety skeleton.

Conceptually:

```text
1. receive current authorized intent/job
2. derive the minimum capability demand profile
3. resolve exact current target(s) within lane-specific caps
4. verify identity / lifetime / current revision as required
5. verify current source support / policy at the semantic-use boundary
6. perform only the requested lane-local work
7. before commit/apply, re-check temporal authority required by that lane
8. commit through the owning semantic/store owner if mutation exists
9. reconcile downstream presentation/effect owner
10. retain only bounded diagnostics required by the consumer
```

The skeleton does not flatten lane semantics.

## 15. No universal Candidate C transaction manager

CC-9 does not authorize:

```text
GlobalCandidateCTransactionManager
UniversalDerivedObjectLock
GlobalOperationTokenRegistry
AllSourceHistoryTransaction
```

Different operations may safely use different mechanisms:

```text
exact read only
revision compare-and-commit
serialized object mutation lane
safe append contract
operation token per media slot
runtime epoch for view-local effects
```

Shared integration means shared invariants, not one global lock service.

## 16. No universal graph traversal service

CC-6 and CC-7 create different relationship classes.

```text
CC-6 = derived attribution lineage
CC-7 = structural/semantic descendant relationship
```

CC-9 forbids automatically merging them into one globally traversable graph.

No runtime may infer:

```text
"it is an edge, therefore generic graph traversal applies"
```

Each relationship owner defines its bounded traversal semantics.

## 17. Storage must expose owner-local indexes before runtime activation

A future store implementation must prove that the operations it supports can be resolved without full-history scans.

At minimum, any activated consumer must identify the indexes/lookup surfaces it needs, such as:

```text
exact durable locator lookup
bounded owner collection lookup
bounded direct-child lookup
exact pinned revision lookup
owner-scoped attachment-slot lookup
```

CC-9 does not freeze a database technology.

Possible backends remain implementation choices.

Canonical requirement:

```text
SUPPORTED OPERATION
→ BOUNDED LOOKUP PLAN EXISTS
```

If not:

```text
BLOCKER · CANDIDATE_C_UNBOUNDED_LOOKUP_PLAN
```

## 18. Indexes are not semantic authority

An index entry answers where a record may be found.

It does not prove:

```text
record is current
record is supported
record is exposable
record may enter prompt
record may mutate
```

Canonical rule:

```text
INDEX HIT
!=
SEMANTIC AUTHORITY
```

Support-at-use remains mandatory.

## 19. Cache remains non-authoritative

A cache may accelerate an authorized bounded lookup.

It may not:

```text
activate Candidate C
replace durable identity
replace revision checks
replace Lineage/Handoff/Evidence support
resurrect expired objects
retarget stale effects
```

Canonical rule:

```text
CACHE HIT / MISS
!=
OBJECT LIFETIME OR AUTHORITY
```

## 20. Cross-lane ordering: mutation versus re-entry

A context-reentry operation captures a supported typed slice for one current request.

If the source object mutates **after** request construction:

```text
old in-flight request is not rewritten retroactively
```

A later request resolves the then-current object/revision again.

If mutation occurs **before** prompt construction commits:

```text
CC-4 currentness/support gate must observe the updated state or fail closed
```

No hidden prompt patching of an already-sent request exists.

## 21. Cross-lane ordering: mutation versus delayed media

If media operation A targets:

```text
T @ R3
```

and a CC-5 semantic mutation advances T to R4, then A is stale unless the media owner explicitly proves its dependency fields remain compatible.

The mutation lane does not need to wait for A.

The media completion lane bears the responsibility to re-check currentness.

Canonical rule:

```text
SEMANTIC MUTATION
MAY INVALIDATE DELAYED EFFECT AUTHORITY
```

not:

```text
DELAYED EFFECT BLOCKS SEMANTIC MUTATION BY DEFAULT
```

## 22. Cross-lane ordering: replacement/delete versus delayed media

If target T is replaced or retired:

```text
old attachment operation authority is revoked
```

A late result must not:

```text
recreate T
reattach to replacement T2
revive retired slot
```

Replacement object work requires a new current operation.

## 23. Cross-lane ordering: mutation versus lineage

A lineage child bound to parent:

```text
P @ R7
```

does not float to R8 after mutation.

Current-parent attribution may become invalid and require a new child-source operation or revalidation.

Historical attribution may remain valid only if exact R7 is retained under the bounded lineage-pin contract.

No mutation lane silently rewrites child-source lineage.

## 24. Cross-lane ordering: lineage pins versus retention

A retained old revision required by a live historical-attribution child may be pinned despite CC-3's default `LATEST_COMMITTED_STATE_ONLY` rule.

The pin must be:

```text
owner-scoped
exact-revision scoped
bounded by live dependent child lifetime
count/byte capped
releasable when no longer required
```

A pin is not permission to keep all revisions forever.

## 25. Cross-lane ordering: parent replacement versus survivor reconciliation

CC-5 parent-affecting operations must declare descendant disposition.

CC-7 may selectively prove survival only within its bounded direct-child scope.

Until survivor proof commits:

```text
old relationship is not assumed current
```

Presentation must not optimistically reparent descendants as semantic truth.

## 26. Cross-lane ordering: survivor reconciliation versus delayed effects

If child C survives independently or is reattached under CC-7, an old CC-8 operation targeting the prior relationship does not automatically survive with it.

The attachment owner must independently prove:

```text
same durable target identity
compatible revision/dependency state
current slot
current operation token
current support/lifetime
```

Relationship survival does not transfer async operation authority.

## 27. Cross-lane ordering: re-entry versus lineage

If a child-source producer needs old parent text to produce an attributed child:

```text
C5 lineage requirement
+
C6 controlled re-entry requirement
```

are both present.

The lineage edge alone does not authorize reading arbitrary parent text into the model prompt.

CC-4 still owns the typed bounded slice and prompt budget.

## 28. Failure-class isolation

CC-9 preserves distinct failure classes:

```text
A. DEMAND / FEATURE GATE FAILURE
B. EXACT TARGET RESOLUTION FAILURE
C. STORE / INDEX AVAILABILITY FAILURE
D. IDENTITY / LIFETIME FAILURE
E. REVISION / OPERATION CURRENTNESS FAILURE
F. SOURCE SUPPORT INVALIDATION
G. EXPOSURE / FAMILY POLICY QUARANTINE
H. CONTEXT REENTRY ELIGIBILITY / BUDGET FAILURE
I. MUTATION VALIDATION / COMMIT FAILURE
J. LINEAGE ATTRIBUTION FAILURE
K. DESCENDANT SURVIVAL / REATTACHMENT FAILURE
L. PRESENTATION FAILURE
M. MATERIALIZATION PROVIDER FAILURE
N. STALE MATERIALIZATION RESULT
```

One class must not silently impersonate another.

Examples:

```text
provider timeout
!= source assertion invalid

store index unavailable
!= target never existed

presentation mount failed
!= semantic mutation rolled back

historical attribution retained
!= current parent support restored
```

## 29. Feature-off vertical closure

A feature being off must close every owned lane, not merely hide the UI.

### Durable history OFF

```text
no durable write
no durable lookup
no retention pin
no tombstone maintenance for that feature
```

### Context re-entry OFF

```text
no history lookup for prompt use
no re-entry resolver
no typed slice construction
no Candidate C prompt bytes
```

### Mutation OFF

```text
no semantic mutation listener dispatch
no target write resolution
no mutation draft
no model-assisted mutation call
no revision commit
```

### Derived lineage OFF

```text
no derived-parent lookup
no lineage pin
no derived attribution producer path
```

### Survivor reconciliation OFF

```text
no partial salvage
no reattach
use existing cascade/block fallback
```

### Delayed materialization OFF

```text
no provider/network call
no operation token allocation
no retry
no attachment write
```

Canonical rule:

```text
FEATURE OFF
→ OWNED SEMANTIC / EFFECT LANE CLOSED VERTICALLY
```

## 30. UI visibility does not wake durable lanes

A durable source card may remain visible while all Candidate C semantic lanes are dormant.

```text
VISIBLE HISTORICAL UI
!=
HISTORY LOOKUP AUTHORITY
!=
REENTRY AUTHORITY
!=
MUTATION AUTHORITY
!=
MEDIA ENRICHMENT AUTHORITY
```

Presentation-local expand/collapse remains view state and must not wake Candidate C unless a specific user action explicitly requests a durable operation.

## 31. No background semantic maintenance by default

CC-9 does not authorize periodic workers that scan durable history for:

```text
support refresh
revalidation
lineage cleanup
media enrichment
semantic migration
"stale object detection"
```

Default:

```text
BACKGROUND_CANDIDATE_C_SEMANTIC_WORK = NONE
```

A future consumer may require bounded maintenance, but that needs a separate authority, cadence, cost, failure, and shutdown contract.

## 32. Garbage collection does not imply background scanning

Physical retention eventually requires cleanup in a real store.

CC-9 does not freeze a GC implementation.

Allowed future patterns may include:

```text
bounded cleanup piggybacked on owner writes
bounded cleanup on explicit archive operations
indexed expiry queue with explicit maintenance authority
explicit user/admin cleanup
```

Forbidden default:

```text
scan all Candidate C records periodically just in case
```

Before background GC exists, its complexity and wake-up semantics must be separately justified.

## 33. Storage growth must be capped per consumer

A future runtime may not activate a durable consumer until it freezes explicit limits for every retained collection it owns.

Required categories as applicable:

```text
max live durable objects per owner scope
max retained bytes per owner scope
max bounded archive-list return count
max tombstones
max historical revision pins
max pinned revision bytes
max direct children inspected per reconciliation
max attachment metadata records / slots
max bounded receipts
```

CC-9 intentionally does not guess product numbers.

Absence of a number is not permission for infinity.

Canonical blocker:

```text
BLOCKER · CANDIDATE_C_RUNTIME_CAPS_NOT_FROZEN
```

## 34. Prompt/re-entry caps are independently required

Storage caps do not substitute for model-context caps.

Before C6 runtime activation, each consumer must freeze:

```text
max re-entry objects per request
max semantic units per object
max chars/tokens per re-entry slice
max aggregate Candidate C prompt contribution
legacy/current-context dedupe policy
```

CC-4 first scope already fixes one object per request; remaining concrete size constants still require implementation-time closure.

## 35. Mutation fanout caps are required

A single mutation must not trigger unbounded work through descendants, lineage, or attachments.

A future mutable consumer must freeze as applicable:

```text
max direct descendants touched by one mutation
max survivor candidates
max reattachment candidates
max lineage dependents notified/invalidated synchronously
max attachment slots invalidated
```

If a design cannot express a bounded synchronous blast radius, it must split work into explicit later operations rather than hide unbounded fanout inside one click.

## 36. Derived lineage pin caps are required

CC-6 historical attribution introduces the first justified old-revision pin.

Before runtime activation, the lineage consumer must freeze:

```text
max pins per child
max live pinned revisions per owner
max bytes per pinned revision
pin release condition
behavior when cap is reached
```

Safe cap-exceeded behavior is:

```text
reject/HOLD new historical lineage requirement
```

not evict a still-authoritative pin silently or expand storage without bound.

## 37. Delayed-effect caps are required

CC-8 first scope is one current attempt per slot.

A concrete media consumer must additionally freeze:

```text
max active slots per object
max concurrent provider operations per current user action
max result metadata size
max provider response size accepted before validation
max retry count, with default 0 unless explicitly designed
```

Background retry remains unauthorized.

## 38. No hidden auxiliary model cascade

Candidate C does not gain a background model budget merely because durable objects exist.

Ordinary requests:

```text
Candidate C extra model calls = 0
```

Active operations may use a model only when the concrete current operation explicitly requires and authorizes it, such as a future model-assisted reroll.

One operation must not fan out into hidden model calls for:

```text
summary refresh
semantic similarity search
lineage inference
survivor inference
image captioning
archive indexing
```

unless a later explicit contract authorizes that exact producer.

## 39. Network/media dormancy

Candidate C history alone never authorizes network activity.

When no current materialization request exists:

```text
network calls = 0
provider calls = 0
remote media refresh = 0
prefetch = 0
polling = 0
```

When a current CC-8 operation exists, network/provider cost belongs only to that bounded operation and its explicit caps.

## 40. Diagnostics remain bounded and non-semantic

A future integration receipt may expose bounded metadata such as:

```text
active capability lanes
operation kind
target kind
lookup count
objects touched
semantic units considered
re-entry chars/tokens
revision mismatch count
stale effect drop count
reason code
```

It should not retain:

```text
raw quarantined content
full prompt slices by default
provider secrets
raw media bytes
full historical object dumps
hidden model drafts
```

Diagnostics do not become semantic history.

## 41. No metrics-driven authority

Performance counters may report what the system did.

They may not decide:

```text
which object is canonical
which source assertion is true
which old object should be resurrected
which stale media result should attach
```

Canonical rule:

```text
OBSERVABILITY
!=
SEMANTIC AUTHORITY
```

## 42. Long-chat non-accumulation scenario

A future implementation must preserve the following qualitative behavior:

```text
T1 ordinary chat
→ Candidate C dormant

T2 BOARD durable object created/used
→ only current bounded target work

T3 ordinary chat
→ Candidate C dormant, no history lookup

T4 explicit "continue that Board"
→ one bounded CC-4 object resolution/re-entry

T5 edit one reply
→ one exact CC-5 target + bounded dependency reconciliation

T6 ordinary chat
→ Candidate C dormant

T7 NEWS explicitly attributes one retained Board claim
→ one CC-6 parent/revision lookup

T8 ordinary chat
→ Candidate C dormant

T9 optional illustration request for one source item
→ one CC-8 target/slot/operation

T10 ordinary chat
→ Candidate C dormant
```

The accumulated existence of objects from T2/T4/T5/T7/T9 must not make T10 more expensive in Candidate C semantic work.

## 43. History-count invariance requirement

For an exact-target operation with the same current target shape:

```text
history count = 10
history count = 1,000
history count = 100,000
```

should not change semantic work except for implementation-level indexed lookup effects bounded by the chosen storage technology.

The semantic algorithm must not intentionally traverse history count.

Future performance evidence should measure this rather than merely assert it.

## 44. Dormant-turn quality invariant

Future Candidate C runtime acceptance fails if enabling durable capabilities degrades unrelated ordinary chat through:

```text
prompt token pressure
stale source replay
old source instruction competition
unexpected model-context insertion
latency growth with history size
background provider work
main-thread/UI jank from hidden history traversal
source-derived fact leakage
```

Canonical blocker:

```text
BLOCKER · CANDIDATE_C_DORMANT_TURN_REGRESSION
```

## 45. Current-request primacy remains intact

Even when Candidate C is active for one operation:

```text
CURRENT USER REQUEST / CURRENT AUTHORIZED INTERACTION
= operation authority source

DURABLE HISTORY
= bounded target/reference substrate
```

Old durable content never becomes the current task merely because it was retrieved.

CC-4 Current Task Primacy remains authoritative for prompt use.

## 46. No automatic cross-family wake-up

A mutation in BOARD does not automatically wake NEWS, LIVE_REACTION, SOCIAL_FEED, or another family.

A CC-6 derived lineage child requires its own current authorized child-source job.

Canonical rule:

```text
FAMILY A MUTATED
!=
FAMILY B JOB EXISTS
```

No background propagation scheduler is authorized.

## 47. No automatic attachment refresh after mutation

A semantic edit may invalidate an attachment.

That does not authorize automatic regeneration.

Possible safe result:

```text
old attachment becomes unavailable/stale
→ presentation falls back without media
```

A new media result requires a new current materialization request unless a future explicit auto-refresh product contract is separately designed.

## 48. No automatic support refresh on archive open

Historical inspection may show an old source object without asserting current support.

Opening an archive does not require revalidating every visible record against current world/source authority.

Only records used for **current semantic use** cross support-at-use again.

This preserves both semantics and cost.

## 49. Store unavailability degradation

If Candidate C storage/indexing is unavailable:

```text
ordinary current Source Intelligence that does not require Candidate C
→ should continue under its own current contracts
```

Candidate C-dependent operations may fail locally:

```text
HISTORY_UNAVAILABLE
REENTRY_UNAVAILABLE
MUTATION_TARGET_UNAVAILABLE
LINEAGE_PARENT_UNAVAILABLE
```

Store failure must not invalidate unrelated current source semantics.

## 50. Prompt-owner unavailability degradation

If CC-4 eligibility succeeds but Prompt / Request Assembly cannot safely insert the typed slice:

```text
context re-entry fails locally
```

It must not fall back to transcript duplication, raw store dump, or hidden second model call.

## 51. Presentation failure degradation

A committed durable semantic operation may succeed while the current renderer/mount fails.

Presentation failure:

```text
!= semantic rollback authority
```

The UI may reconcile on a later explicit render opportunity from current committed state.

Old failed render callbacks must still obey runtime epoch/currentness.

## 52. Provider failure degradation

CC-8 M1 provider failure remains presentation/effect-local.

It must not:

```text
rollback source edit
invalidate source assertion
change exposure policy
trigger source regeneration
```

## 53. Partial write ownership remains mandatory

Any future Candidate C store or host-adjacent write must preserve unowned fields.

Canonical rule inherited from repository common invariants:

```text
OMITTED FIELD
!=
DELETE INTENT
```

A Candidate C writer owns only the explicitly declared fields/records of its bounded consumer.

No store migration or host-message update may overwrite unrelated plugin/host metadata by projection omission.

## 54. Schema/version migration is not free background work

If persistent Candidate C records later require schema migration, CC-9 does not authorize an all-record startup scan.

A future migration contract must choose an explicit bounded strategy such as:

```text
lazy per-record migration on authorized access
versioned read adapters
bounded owner-scoped migration command
```

Any bulk/background migration requires separate cost and failure design.

## 55. Startup/reload dormancy

The existence of Candidate C persistence must not force startup to deserialize/validate all durable semantic objects.

Desired startup shape:

```text
load only minimal store/index metadata required for bounded future lookup
```

not:

```text
load + validate every durable source object
```

Exact physical startup behavior depends on the chosen backend and belongs to implementation evidence.

Canonical blocker:

```text
BLOCKER · CANDIDATE_C_STARTUP_FULL_HISTORY_MATERIALIZATION
```

## 56. Runtime implementation prerequisites introduced by CC-9

Before any Candidate C runtime lane is activated, the implementation plan must publish:

```text
1. concrete consumer + capability profile
2. exact owner/namespace
3. bounded lookup/index plan
4. object/byte retention caps
5. lane-specific item/fanout caps
6. re-entry prompt caps if C6 is used
7. operation concurrency/currentness mechanism
8. feature-off vertical closure proof plan
9. dormant-turn instrumentation
10. active-operation bounded-cost instrumentation
11. failure-class isolation plan
12. cleanup/GC strategy without unauthorized global scans
```

A concrete consumer may omit irrelevant categories, but it may not leave an activated unbounded collection unspecified.

## 57. Evidence levels

CC-9 design creates three future evidence levels.

### `D0 · DESIGN BOUNDEDNESS`

This document.

Meaning:

```text
cost horizons and dormancy contracts are frozen conceptually
```

### `I1 · IMPLEMENTATION CONFORMANCE`

Future separately authorized implementation must prove by instrumentation/tests:

```text
lane activation matches current authority
exact/bounded lookups are used
feature-off closes owned paths
caps are enforced
stale operations fail closed
```

### `H2 · HOST / LONG-CHAT COST EVIDENCE`

Real host evidence must prove:

```text
ordinary turns remain dormant after durable source activity
history growth does not produce semantic scan growth
re-entry remains bounded
mutation fanout remains capped
lineage remains one-parent/one-hop in first scope
stale media is dropped
no background work appears while idle
```

CC-9 completion is only `D0`.

## 58. Required future instrumentation categories

Without freezing exact implementation field names, CC-9 expects evidence capable of distinguishing at least:

```text
dormant decision count
store exact-lookups
store bounded-collection reads
records/materialized bytes touched
re-entry object count
re-entry chars/tokens
mutation objects touched
survivor candidates inspected
lineage parents resolved
pinned revisions touched
materialization operations started
provider calls
stale results dropped
background Candidate C work count
extra model calls
```

The desired dormant signature is visibly near-zero/zero on all semantic/effect counters except the bounded demand gate.

## 59. Adversarial integration scenarios for CC-10

CC-10 should later include at least these scenarios in the real-validation protocol after implementation exists:

### A. Dormant after large history

```text
create/retain many durable source objects
→ unrelated ordinary chat
→ zero Candidate C semantic lookup/re-entry/provider work
```

### B. Exact re-entry under large history

```text
large history
→ explicitly continue one known Board
→ exactly one bounded object resolution + bounded prompt slice
```

### C. Ambiguous continuation

```text
multiple possible old Boards
→ generic "continue that board"
→ fail ambiguous rather than scan/fuzzy-pick
```

### D. Stale edit

```text
open edit at R4
object advances R5
submit old edit
→ revision mismatch, no silent merge
```

### E. Parent replacement with descendants

```text
replace parent
→ inspect only bounded direct children
→ explicit disposition per child
→ no recursive surprise traversal
```

### F. BOARD → NEWS attribution

```text
one current NEWS job
+ one exact Board parent/revision
→ one-hop attributed lineage
→ no truth promotion
```

### G. Lineage pin pressure

```text
historical attribution pins old revisions until cap
→ cap reached
→ HOLD/reject new pin rather than unbounded growth
```

### H. Late media after edit

```text
media A targets R3
object becomes R4
A succeeds late
→ stale drop
```

### I. Superseded media same revision

```text
A and B target same R
B supersedes A
A finishes
→ operation-token stale drop
```

### J. Feature OFF

```text
durable features disabled
→ old history still physically exists
→ no lookup/re-entry/mutation/media work
```

### K. Store failure isolation

```text
Candidate C store unavailable
→ ordinary current source job that needs no durability remains functional
```

### L. Presentation failure isolation

```text
semantic mutation commits
presentation mount fails
→ no semantic rollback by render failure
```

## 60. Performance claims CC-9 does not make

CC-9 does not claim:

```text
zero CPU overhead
specific millisecond latency
specific memory usage
specific database complexity guarantees
real IndexedDB/localStorage performance
real model token delta
real provider latency
real long-chat stability
```

Those require implementation and host evidence.

Canonical rule:

```text
CC-9 DESIGN PASS
!=
REAL PERFORMANCE PASS
```

## 61. Runtime state remains unchanged

At CC-9 close:

```text
Candidate C persistent store          = NONE
runtime durable ID allocator          = NONE
runtime semantic revision store       = NONE
runtime operation-token registry      = NONE
runtime source-history retrieval      = NONE
runtime context re-entry              = NONE
runtime mutation engine               = NONE
runtime derived-lineage engine        = NONE
runtime survivor engine               = NONE
runtime provider/media attachment     = NONE
runtime background maintenance        = NONE
```

No Candidate C runtime lane is authorized by this design.

## 62. Capability map after CC-9

Design status:

```text
C1 cross-turn survival             = DESIGNED
C2 stable derived identity         = DESIGNED
C3 item mutation                   = DESIGNED
C4 append/merge                    = DESIGNED
C5 derived-to-derived lineage      = DESIGNED
C6 controlled context re-entry     = DESIGNED
C7 partial descendant survival     = DESIGNED
C8 delayed effect targeting        = DESIGNED
```

Integration status:

```text
C1–C8 bounded integration contract = DESIGNED / FROZEN
runtime implementation             = NOT AUTHORIZED
real performance evidence          = NOT RUN
```

## 63. Explicit non-goals / deferred expansions

CC-9 does not authorize:

```text
unbounded semantic search over history
embedding/vector retrieval
multi-object re-entry
recursive lineage DAG traversal
recursive survivor salvage
multi-family automatic propagation
global transaction manager
global provenance graph
background semantic refresh
background media enrichment
background retries
full event-sourcing history
unbounded revision retention
semantic M2 media
multimodal prompt re-entry
startup full-history materialization
```

Each requires its own concrete consumer and bounded design.

## 64. Blockers carried into implementation readiness

CC-9 introduces/preserves these blockers for any future runtime implementation:

```text
BLOCKER · CANDIDATE_C_RUNTIME_CAPS_NOT_FROZEN
BLOCKER · CANDIDATE_C_UNBOUNDED_LOOKUP_PLAN
BLOCKER · CANDIDATE_C_DORMANT_TURN_REGRESSION
BLOCKER · CANDIDATE_C_STARTUP_FULL_HISTORY_MATERIALIZATION
```

Existing Source Intelligence runtime blockers remain independently applicable, including structured-sidecar transport, presentation-host mount authority, target-host Exposure evidence, and any concrete consumer-specific implementation blockers.

## 65. Next checkpoint

Recommended next checkpoint:

```text
CC-10 · Candidate C Convergence / Runtime Validation Protocol
```

CC-10 should not add another capability.

It should converge CC-0 through CC-9 into:

```text
design closure state
implementation prerequisite matrix
consumer-by-consumer acceptance matrix
real host / long-chat validation protocol
stale-operation / mutation / re-entry / lineage / survivor / media adversarial suite
release-readiness decision rule
```

## 66. Final CC-9 decision

Frozen conclusion:

```text
CANDIDATE C MAY BE DURABLE
WITHOUT BEING CONTINUOUSLY ACTIVE.

OLD OBJECTS DO NOT CREATE CURRENT WORK.
CURRENT AUTHORITY CREATES A BOUNDED OPERATION.
THE BOUNDED OPERATION MAY TOUCH ONLY ITS DECLARED TARGET HORIZON.
```

And the cost invariant:

```text
ordinary turn
→ zero Candidate C semantic burden

active durable operation
→ bounded target-local work

more historical objects
→ more retained data within caps
!= more semantic work on unrelated turns
```

This closes CC-9 at design level only.
