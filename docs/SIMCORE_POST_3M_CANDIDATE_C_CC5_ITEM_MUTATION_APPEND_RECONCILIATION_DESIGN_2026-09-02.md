# SimCore Post-3.0M Candidate C CC-5 Item Mutation / Append / Reconciliation Design — 2026-09-02

Date: 2026-09-02 KST

Status: **CC-5 DESIGN FROZEN · EXPLICIT ITEM MUTATION / APPEND / RECONCILIATION CONTRACT · C3/C4 DESIGN LANES OPEN · DESIGN-ONLY · NO MUTATION ENGINE · NO UI ACTIONS · NO STORAGE BACKEND CHANGE · NO MODEL CALL · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · CANDIDATE C · CC-5 · ITEM MUTATION · APPEND · RECONCILIATION · C3/C4 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

CC-5 freezes the minimum semantic mutation contract required when a future Candidate C consumer needs to alter one durable derived object or add/remove/reorder a bounded child relationship without regenerating an entire source snapshot.

It answers:

```text
what is a semantic mutation versus presentation-only state?
which first operation classes exist?
when does identity remain stable and revision advance?
when does reroll preserve identity versus create a replacement identity?
what does delete mean semantically versus physical purge?
how may a child be appended safely?
what happens to descendants when a parent changes or is replaced?
what must be validated before a mutation commit?
how do stale operations fail closed?
what becomes authoritative first: durable commit or presentation update?
how do CC-4 re-entry and multi-family presentation observe a mutation?
```

CC-5 does not implement a mutation engine, buttons, event handlers, persistent runtime IDs, storage transactions, source regeneration, extra model calls, asynchronous work, cross-family propagation, or release changes.

## 1. Authority chain

CC-5 consumes:

```text
SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01
SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC4_CONTROLLED_CONTEXT_REENTRY_DESIGN_2026-09-02
SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01
SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01
SIMCORE_POST_3M_MF4_PRESENTATION_STACK_ORDERING_MOUNT_ISOLATION_DESIGN_2026-09-02
REPOSITORY_COMMON_RULES · RCR-C10
REPOSITORY_COMMON_RULES · RCR-C11
Lineage / Handoff / Evidence source-support ownership
family validators / consumer semantic policy ownership
Presentation Renderer / host mount ownership
```

Inherited rules remain:

```text
same object ID != same semantic revision
same revision != operation attempt still current
found-by-ID != supported-for-use
persistence != canonical truth
partial view omission != deletion authority
late effects require current operation authority when supersession is possible
presentation state != semantic mutation
C3/C4 mutation != C5 derived-to-derived lineage
C3/C4 mutation != C6 automatic re-entry
C7 is required before descendants may survive replacement through special survivor logic
```

## 2. Capability profile

CC-5 opens the mutation and append design lanes only.

```text
C1 survival         = YES, prerequisite for durable mutation
C2 stable identity  = YES for item-targeted operations
C3 item mutation    = YES, DESIGN CONTRACT ONLY
C4 append/merge     = YES, DESIGN CONTRACT ONLY
C5 derived lineage  = NO
C6 context reentry  = INHERITS CC-4 DESIGN-OPEN STATE, not expanded by CC-5
C7 partial survival = NO
C8 delayed effect   = NO
```

Canonical rule:

```text
C3/C4 DESIGN OPEN
!=
RUNTIME MUTATION AUTHORIZED
```

## 3. Primary decision

Selected architecture:

```text
EXPLICIT_OPERATION_TAXONOMY
+
EXACT_TARGET_IDENTITY
+
EXPECTED_REVISION / OPERATION_CURRENTNESS
+
VALIDATE_BEFORE_COMMIT
+
EXPLICIT_DESCENDANT_DISPOSITION
+
COMMITTED_STATE_FIRST_RECONCILIATION
```

There is no generic `mutate(anything)` authority.

Every concrete consumer must declare which operation classes it supports and the exact semantic fields/relationships each class may alter.

## 4. Semantic mutation definition

A semantic mutation changes owner-defined durable semantic state or durable semantic relationships.

Examples:

```text
edit one post body
reroll one source-local post
retire/delete one reply
append one durable reply to a durable parent
change semantic child order
replace one durable object with another
```

Not semantic mutation by default:

```text
collapse / expand
scroll position
hover
selected tab
popover open/closed
responsive layout
DOM remount
presentation slot placement
CSS theme
```

Canonical rule:

```text
UI STATE CHANGE
!=
DERIVED OBJECT MUTATION
```

## 5. Mutation authority is not UI authority

A visible button, menu item, gesture, or DOM event does not by itself grant semantic mutation authority.

A future interaction must resolve to an explicit current feature/user operation owned by the relevant consumer.

Required conceptual separation:

```text
UI intent
→ current operation request
→ semantic authorization / validation
→ durable commit
→ presentation reconciliation
```

Forbidden:

```text
button clicked
→ directly patch stored object / DOM semantic text
```

## 6. First operation taxonomy

CC-5 freezes these semantic operation classes as the first common vocabulary:

```text
EDIT
REROLL_IN_PLACE
REROLL_REPLACE
DELETE_RETIRE
APPEND_CHILD
SEMANTIC_REORDER
```

The following remain conditional/deferred rather than universal first operations:

```text
DETACH_CHILD
REPARENT_CHILD
BULK_MUTATE
CROSS_FAMILY_MUTATE
MEDIA_REPLACE
```

`MEDIA_REPLACE` belongs primarily to CC-8 delayed-effect/materialization design.

## 7. No generic MERGE operation

C4 includes append/merge pressure, but CC-5 does not freeze a magical generic `MERGE` operation.

A merge must decompose into explicit bounded operations whose ownership is knowable, for example:

```text
EDIT target A
APPEND_CHILD child B under parent P
SEMANTIC_REORDER container C
```

Canonical rule:

```text
MERGE LABEL
DOES NOT BYPASS
PER-OPERATION IDENTITY / REVISION / VALIDATION RULES
```

A future batch transaction may group explicit operations, but bulk atomicity is not authorized here.

## 8. One-target first scope

The first mutation design scope is bounded to one primary durable target per operation request.

Exceptions that are structurally unavoidable:

```text
APPEND_CHILD
→ one existing parent + one newly created child

DELETE_RETIRE with fail-closed descendant cascade
→ one primary target + bounded affected descendants
```

No arbitrary multi-object batch mutation is authorized.

## 9. Operation input contract

A future concrete operation must resolve at minimum:

```text
operation class
consumer owner
target durable locator
expected semantic revision when required
current operation authority / token when required
current support/lifetime state
consumer-specific mutation intent/candidate payload
```

The model/producer cannot self-declare these as trusted authority fields.

## 10. Exact target rule

Mutation must target exact durable identity under CC-1.

Forbidden target recovery:

```text
same-looking title
same displayName
same text fingerprint
same old ordinal
nearest transcript position
semantic similarity guess
```

If exact identity cannot be resolved:

```text
MUTATION_TARGET_UNRESOLVED
→ DO NOT MUTATE
```

## 11. Currentness precondition

CC-5 inherits CC-2.

Safe default for state-derived mutation:

```text
target locator L
+ expected revision R
+ operation authority when required
```

Immediately before commit:

```text
L still resolves to same live object?
current revision still satisfies expected-revision contract?
operation attempt still current if tokenized?
support/lifetime still valid for this operation?
```

Any required failure rejects the mutation.

## 12. No silent stale refresh

If a mutation began from stale revision R3 and target is now R4:

```text
REVISION_MISMATCH
→ reject / require fresh current operation
```

Forbidden convenience behavior:

```text
silently update expectedRevision to R4
apply old edit anyway
```

CC-5 does not authorize automatic three-way text merge.

## 13. Candidate semantic validation

A mutation candidate does not inherit the old object's validation simply because it targets the same durable ID.

Canonical rule:

```text
OLD STATE WAS VALID
!=
NEW CANDIDATE IS VALID
```

Any changed semantic field must pass the then-current consumer/family validation required for ordinary use.

This can include as applicable:

```text
schema bounds
source authority join
Exposure policy
assertion mode rules
parent/child structure
NEWS maturity
family-specific invariants
support-at-use
```

CC-5 does not invent a second validator.

## 14. Validation before durable commit

First-safe semantic pipeline:

```text
resolve exact target
→ prove operation authorization
→ capture current revision/currentness
→ construct candidate semantic state
→ validate candidate under current owner rules
→ compute descendant disposition
→ re-check commit currentness
→ durable semantic commit
→ revision/retirement update
→ presentation reconciliation
```

Forbidden default:

```text
write candidate first
→ validate afterward
```

unless a future explicitly isolated optimistic protocol proves rollback ownership under CC-2/RCR-C11.

## 15. `EDIT`

`EDIT` changes owner-defined semantic fields while preserving the logical object identity.

Default identity behavior:

```text
locator L @ Rn
→ EDIT accepted
→ locator L @ Rn+1-equivalent current revision
```

The exact revision representation remains owner-defined.

If the edit is a semantic no-op under the owner contract:

```text
NO_SEMANTIC_CHANGE
→ revision need not advance
```

## 16. Edit field ownership

A concrete consumer must freeze the exact fields editable by `EDIT`.

Examples:

```text
post content
post title
reply content
source-local display label
```

Not implicitly editable:

```text
object ID
owner scope
namespace
trusted authority refs
validator-derived disposition
operation tokens
backend metadata
unowned plugin/host metadata
```

RCR-C10 applies to partial edit payloads.

## 17. Partial edit omission is not clear

For an edit patch:

```text
field omitted
!=
clear/delete that field
```

Explicit clearing requires a consumer-owned clear value/operation where semantically legal.

A generic partial object replacement must not erase unmaterialized metadata.

## 18. Edit descendant rule

An `EDIT` preserves parent identity, but descendants may semantically depend on the changed parent state.

Therefore CC-5 freezes:

```text
PARENT EDIT
→ structural child attachment does not automatically disappear
→ semantic descendant eligibility must be reconsidered when dependency may be affected
```

Until revalidation/reconciliation succeeds, an affected descendant must not be presented/re-entered as if nothing changed.

Safe default when dependency impact cannot be proven bounded/safe:

```text
DESCENDANT_REVALIDATION_REQUIRED
→ withhold affected descendant from ordinary semantic use
```

This is not CC-7 survivor authorization; the parent identity itself was not replaced.

## 19. Dependency-neutral edit

A concrete owner may prove some edit fields cannot affect descendant semantic validity.

Example class:

```text
consumer-owned source-local label field
```

if descendants do not semantically depend on it.

Such a field may preserve descendant eligibility without a semantic revalidation walk, but the dependency-neutral field set must be explicitly frozen by that consumer.

Convenience is not proof.

## 20. `REROLL_IN_PLACE`

Use when product semantics say:

```text
this is still the same logical derived object / slot
but its generated semantic content is being regenerated
```

Identity behavior:

```text
same locator
new validated semantic state
revision advances
```

The operation must be declared as in-place before candidate generation.

It must not decide identity preservation only after seeing whether the new text looks similar.

## 21. In-place reroll does not inherit truth/support

A rerolled candidate is new semantic material.

Therefore:

```text
old object validation
old Exposure ALLOW
old source assertion mode
old NEWS maturity result
```

do not automatically apply to the new candidate.

The new candidate must be validated under current authority/policy.

## 22. In-place reroll descendant default

Reroll can materially replace parent meaning even while preserving parent ID.

Therefore first-safe default:

```text
REROLL_IN_PLACE on object with semantic descendants
→ descendants become WITHHELD_PENDING_REVALIDATION or CASCADE_INVALIDATED according to consumer contract
```

A consumer may not simply preserve all descendants because the parent ID stayed the same.

CC-7 is required for richer explicit survivor logic when parent/source replacement semantics are involved.

## 23. `REROLL_REPLACE`

Use when product semantics say the reroll creates a different logical derived object.

Conceptual transition:

```text
old locator L1 @ Rn
→ create new locator L2 under current authority
→ validate L2 candidate
→ atomically/owner-safely make L2 current replacement
→ retire L1
```

`L1 != L2`.

Old callbacks/operations targeting L1 must not retarget to L2.

## 24. Replacement identity decision is explicit

Forbidden:

```text
reroll candidate looks similar
→ reuse old ID

candidate looks very different
→ allocate new ID
```

Identity semantics come from the operation contract, not textual similarity.

## 25. Replacement descendant default

Without CC-7 partial-survival authorization:

```text
REROLL_REPLACE parent/source object
→ descendants do not automatically survive under the new object
```

First-safe disposition:

```text
CASCADE_INVALIDATE / RETIRE dependent descendants
```

A future design that preserves/re-attaches selected descendants must open CC-7 and prove independent survivor support.

## 26. Replacement relation is not C5 propagation

A bounded mutation receipt may record internally:

```text
old locator → replacement locator
```

for reconciliation/stale-reference rejection.

This does not itself create derived-to-derived semantic source lineage.

If another semantic consumer later uses the predecessor relationship as attributed input, CC-6/C5 design must authorize that use.

## 27. `DELETE_RETIRE`

Semantic delete means the durable derived object is retired from ordinary current semantic use.

It does not necessarily mean bytes are immediately physically purged.

Canonical rule:

```text
SEMANTIC DELETE / RETIRE
!=
PHYSICAL STORAGE PURGE
```

CC-3 retention/tombstone rules remain separate.

## 28. Delete identity rule

A retired durable locator must not later be silently reused for an unrelated new object inside the stale-reference/tombstone horizon.

Late operations targeting the retired object fail closed.

## 29. Delete revision/currentness

Safe default:

```text
DELETE_RETIRE based on displayed/current state
→ exact locator + expected revision required
```

If the target advanced before delete commit:

```text
REVISION_MISMATCH
→ reject
```

A stronger product command meaning “delete this object regardless of intervening edits” would require explicit stronger current authority and is not the default.

## 30. Delete descendant default

Without CC-7 survivor/reparent authority:

```text
parent DELETE_RETIRE
→ dependent descendants may not remain ordinary current children
```

First-safe behavior:

```text
CASCADE_RETIRE / CASCADE_INVALIDATE dependent descendants
```

Historical retention may remain physically available under CC-3 policy, but current presentation/re-entry must not expose an orphan as a normal live child.

## 31. No implicit orphaning

Forbidden default:

```text
parent deleted
→ child stays live with parent = null
```

unless the child consumer explicitly defines an independently meaningful root object and proves support for that transition.

That would be a later explicit detach/survival contract.

## 32. `APPEND_CHILD`

`APPEND_CHILD` creates one new durable child attached to one exact durable parent.

Required conceptual inputs:

```text
exact parent locator
parent alive/lifetime valid
parent support valid for append semantics
new child candidate
new child identity allocation under CC-1 when C2 is required
append currentness policy
ordering/duplicate policy
family validation
```

## 33. Append child creates new identity

The child is a new logical derived object.

Therefore:

```text
new child
→ new owner-scoped locator
→ independent child revision domain
```

The child does not reuse:

```text
projection ordinal
old removed child ID
text fingerprint
parent ID
```

as its durable identity.

## 34. Parent revision for append is consumer-owned

CC-5 does not force one universal physical aggregate model.

Two legal conceptual append contracts exist.

### A. Strict parent-state append

Use when child membership/order is part of the parent's owner-defined semantic state.

```text
expected parent revision required
append commits child + parent membership change
parent revision advances
```

### B. Explicit safe append lane

Use only when the consumer proves child insertion is safely owned by a separate bounded append lane.

Requirements include:

```text
parent must still be alive/eligible
child identity uniqueness
duplicate prevention
deterministic ordering semantics
operation currentness / append token if overlap requires it
bounded cardinality
no hidden overwrite of parent semantic payload
```

In this contract, parent payload revision need not advance merely because an independently owned child record was appended.

Canonical rule:

```text
APPEND MAY AVOID GLOBAL PARENT SERIALIZATION
ONLY WHEN A SAFE OWNER-DEFINED APPEND CONTRACT PROVES IT
```

## 35. Append is not automatically commutative

Two replies arriving concurrently are not assumed safe merely because both are “append”.

The consumer must define:

```text
ordering
same-request duplicate detection
same-content duplicate semantics
maximum children
concurrent commit ownership
retry/idempotency behavior
```

Otherwise safe default is serialization/revision guard.

## 36. Append ordering authority

Arrival/completion time does not automatically own semantic order.

Possible consumer-defined order sources include:

```text
serialized commit order
owner-issued append ordinal/sequence
explicit user position under bounded contract
```

Wall-clock timestamp alone is not semantic ownership proof.

## 37. Append validation

A new child must pass all relevant family/consumer policy independently.

For BOARD-like parent/child semantics:

```text
child own assertion policy = ALLOW
AND
parent eligible/current
→ child may become eligible
```

A hidden/invalid parent may not be used merely to host an otherwise valid new child.

## 38. `SEMANTIC_REORDER`

Reorder is semantic only when ordering is part of the consumer's durable semantic model.

If order affects meaning/later operations:

```text
SEMANTIC_REORDER
→ exact container/target ownership
→ currentness precondition
→ validate new bounded order
→ revision advance for the order-owning semantic object
```

Presentation-only sorting remains outside CC-5.

## 39. Reorder preserves item identity

Changing semantic order does not by itself create new item identities.

```text
same children
+ different valid semantic order
→ child IDs preserved
```

The order-owning container/relation state may revise.

## 40. Detach / reparent defer

`DETACH_CHILD` and `REPARENT_CHILD` are not universally authorized by CC-5.

Reason:

- orphan semantics vary by family;
- parent change can alter attribution/meaning;
- child support may depend on the original parent;
- reparenting can become a form of descendant survival/re-attachment.

Disposition:

```text
DEFER · DETACH / REPARENT
→ consumer-specific CC-5 extension and possibly CC-7
```

## 41. Descendant dependency classes

A concrete mutation-capable consumer must classify bounded child relationships at least conceptually as one of:

```text
STRUCTURAL_ONLY
SEMANTICALLY_DEPENDENT
INDEPENDENT_SUPPORT_REQUIRED
```

`STRUCTURAL_ONLY` does not mean the child may survive arbitrary parent replacement; it only indicates which edits may be dependency-neutral.

## 42. Descendant disposition is explicit

Every parent-affecting operation must derive one descendant disposition before commit/presentation:

```text
UNCHANGED_SAFE
REVALIDATE_REQUIRED
CASCADE_INVALIDATE
CASCADE_RETIRE
BLOCK_MUTATION_DESCENDANT_POLICY_UNRESOLVED
```

No implicit “keep whatever is mounted” behavior is allowed.

## 43. CC-7 boundary

CC-5 may revalidate descendants after same-identity edits/rerolls when the consumer can prove the dependency relation under current authority.

CC-5 may not create sophisticated survivor semantics for replacement/retirement.

If a child should remain live after its parent/source is replaced or deleted because it has independent support:

```text
C7 PARTIAL SURVIVAL
→ must open before authorization
```

## 44. Mutation and source support

Durable mutation never makes the object self-supporting.

Before ordinary use/commit, support required by the consumer must still be available from trusted owners.

Canonical rule:

```text
USER / FEATURE REQUESTED EDIT
!=
NEW CONTENT AUTOMATICALLY PUBLIC / TRUE / MATURE
```

Operation authority and epistemic authority are separate.

## 45. User-authored mutation does not bypass source policy

A future product may let a user type replacement content into a source-local post.

That user action may authorize the mutation attempt, but it does not automatically classify every resulting claim as exposed/canonical truth.

The concrete consumer must define how user-authored source semantics interact with current Exposure/authority policy.

CC-5 does not guess this mapping.

## 46. Model-generated mutation does not self-authorize

If a future reroll/edit uses the main model or another semantic producer:

```text
producer output
= candidate semantic material
```

not:

```text
producer output
= trusted mutation decision / authority / validation receipt
```

No additional model call is authorized by this design.

## 47. Committed state is semantic authority for reconciliation

After successful semantic commit:

```text
committed durable semantic state
→ source for downstream presentation reconciliation
```

The DOM/presentation model is not the mutation authority.

Forbidden:

```text
patch DOM text
→ infer durable semantic state from DOM afterward
```

## 48. Commit-before-presentation rule

First-safe ordering:

```text
semantic validation PASS
→ durable owner commit PASS
→ revision/retirement state current
→ presentation reconcile from committed result
```

Presentation failure after a successful semantic commit does not automatically roll back semantic state.

Canonical rule:

```text
PRESENTATION FAILURE
!=
AUTOMATIC SEMANTIC ROLLBACK AUTHORITY
```

A product requiring atomic semantic+presentation UX would need an explicit higher-level design.

## 49. Presentation reconciliation outcomes

Conceptual outcomes:

```text
PRESENTATION_UPDATED
PRESENTATION_REMOVED
PRESENTATION_REBUILT
PRESENTATION_RECONCILE_FAILED
PRESENTATION_STALE_INSTANCE_DROPPED
```

These outcomes do not change validator truth/exposure decisions.

## 50. Render-instance currentness

A UI interaction based on a mounted item should carry enough owned currentness information to avoid acting on a stale view.

Conceptually:

```text
durable locator
+ displayed semantic revision
+ current render-instance identity if effect is UI-bound
```

If the semantic revision no longer matches, the semantic operation is rejected/refreshed rather than silently applied to the newer object.

## 51. Presentation-local state across same-ID edit

Presentation-only state such as collapse/selection may survive a same-ID semantic update when the presentation owner proves it remains local and safe.

Example:

```text
same post ID, content R4 → R5
card remains collapsed
```

This does not imply semantic state preservation beyond the committed revision.

## 52. Presentation state across replacement

For `REROLL_REPLACE`:

```text
old semantic ID != new semantic ID
```

Presentation must not automatically transfer semantic-targeted state that would imply identity continuity.

Pure view preferences may be reapplied only under presentation-owned policy and must not become semantic identity evidence.

## 53. Multi-family isolation

A mutation to one family object does not automatically mutate sibling family objects even when they describe the same event.

Example:

```text
BOARD post edited
→ NEWS sibling remains its independently validated current object
```

Automatic cross-family propagation requires CC-6/C5 derived-lineage authority and potentially Multi-Family orchestration design.

Canonical rule:

```text
MUTATION IN FAMILY A
!=
SEMANTIC PATCH AUTHORITY FOR FAMILY B
```

## 54. CC-4 re-entry relationship

CC-5 does not push mutation results into future prompts.

For a later request, CC-4 must retrieve/revalidate the then-current committed object and build a bounded re-entry slice.

Canonical rule:

```text
OBJECT MUTATED
!=
PROMPT UPDATED AUTOMATICALLY
```

## 55. In-flight prompt snapshot rule

If a model request has already been assembled/sent using an earlier valid CC-4 slice, a later semantic mutation does not retroactively rewrite that in-flight request.

Future requests must use the then-current committed object/revision.

This is request-local snapshot semantics, not permission to tolerate stale future reuse.

## 56. Store write ownership

CC-5 inherits CC-3 and RCR-C10.

A mutation commit may write only fields/records owned by the concrete durable consumer.

It may not erase or overwrite:

```text
host-owned metadata
other plugin metadata
presentation-only metadata
security/privacy metadata
migration metadata
```

merely because they were absent from the mutation view.

## 57. Latest-state default remains

CC-3 default remains:

```text
LATEST_COMMITTED_STATE_ONLY
```

CC-5 does not automatically create a full revision archive.

A successful edit/reroll may replace the retained current semantic state while old revisions remain absent unless an explicit history-retention consumer authorizes them.

## 58. Delete and tombstone

After `DELETE_RETIRE`, a minimal tombstone may remain when needed for:

```text
stale operation rejection
ID reuse prevention
historical locator resolution policy
late effect rejection
```

The tombstone must not retain old semantic bodies merely by default.

## 59. Replacement commit shape

A safe `REROLL_REPLACE` may require an owner-defined atomicity boundary over:

```text
create validated new object L2
mark L2 as current replacement
retire old object L1
record bounded replacement relation if needed
```

CC-5 freezes the semantic all-or-fail requirement for the owner's current-object view, not a specific database transaction primitive.

Forbidden visible mixed state:

```text
old object retired
+ new object missing/invalid
```

unless the consumer explicitly supports a temporary no-current-object state.

## 60. Append commit shape

A safe append must not expose:

```text
child record exists
+ parent relation/membership missing
```

or the inverse when both are owned parts of one semantic append contract.

The concrete owner must choose an atomic/consistent representation boundary appropriate to its store.

## 61. Mutation receipts

CC-5 permits bounded diagnostics such as:

```text
operation class
target namespace
opaque target ID or redacted bounded form
expected revision
observed commit revision outcome
mutation disposition
reason code
descendant disposition
affected descendant count
presentation reconciliation outcome
```

Receipts must not become a second semantic history archive.

## 62. No raw candidate/old-body diagnostics by default

Do not retain in ordinary mutation receipts:

```text
old post body
new rejected candidate body
DENY/HOLD content
quarantined secrets
full prompt/source bodies
```

unless a separate explicit audit/privacy product authorizes it.

## 63. Failure taxonomy

CC-5 freezes at least these distinct conceptual failures:

```text
MUTATION_TARGET_UNRESOLVED
MUTATION_TARGET_RETIRED
MUTATION_NOT_AUTHORIZED
REVISION_MISMATCH
OPERATION_STALE
SUPPORT_UNAVAILABLE
SUPPORT_MISMATCH
CANDIDATE_INVALID
CANDIDATE_POLICY_DENY
CANDIDATE_POLICY_HOLD
PARENT_INVALID
APPEND_DUPLICATE
APPEND_ORDER_CONFLICT
DESCENDANT_REVALIDATION_REQUIRED
DESCENDANT_POLICY_BLOCKED
REPLACEMENT_COMMIT_FAILED
STORE_COMMIT_FAILED
PRESENTATION_RECONCILE_FAILED
```

Exposure DENY/HOLD remain policy outcomes, not generic storage failures.

## 64. Semantic failure versus presentation failure

These must remain distinguishable:

```text
semantic mutation rejected
→ no new committed semantic state

semantic commit succeeded, presentation failed
→ semantic state remains current; UI may need remount/recovery
```

Do not report both as one generic `mutation failed` when operational evidence needs to distinguish them.

## 65. Retry policy

A failed/stale operation may not automatically retry against a newer revision unless the current user/feature operation contract explicitly permits a new attempt.

A retry is a fresh operation attempt with current authority.

It must not silently reuse a stale operation token.

## 66. Idempotency / duplicate safety

Concrete mutation consumers must define duplicate/retry semantics for operations that may be re-issued.

Examples:

```text
same delete request after object already retired
same append request delivered twice
same edit command retried after uncertain transport result
```

CC-5 does not infer idempotency from equal payload text.

## 67. No value-equality authority

Inherited CC-2 rule:

```text
CURRENT VALUE == DESIRED VALUE
!=
STALE OPERATION OWNS CURRENT STATE
```

A stale operation cannot regain edit/delete/rollback authority merely because the semantic value happens to match.

## 68. No automatic rollback

If a mutation performs future optimistic work and then fails, rollback is itself a semantic mutation and requires current rollback ownership.

CC-5 does not authorize an optimistic runtime protocol.

First-safe design remains validate/commit before presentation.

## 69. Bounded descendant work

A mutation-capable consumer must set hard bounds before runtime authorization for:

```text
max descendants inspected/revalidated per operation
max cascade size
max append children per parent/lifetime
max semantic reorder cardinality
max candidate characters/items
max mutation receipt entries
```

Unbounded descendant graph walks are not authorized.

## 70. Cost follows active operation, not archive age

Required cost property:

```text
cost(mutation)
≈ target object + bounded directly affected relation/descendants
```

Forbidden default:

```text
edit one post
→ scan entire source-history archive / transcript
```

## 71. Dormancy

When no mutation-capable current operation is active:

```text
mutation lookup = 0
mutation validation = 0
mutation store write = 0
descendant scan = 0
presentation reconciliation work = 0
```

apart from pre-existing unrelated runtime behavior.

## 72. No hidden background reconciliation

CC-5 does not authorize polling the store for changed objects or continuously reconciling source history in the background.

Reconciliation is triggered by an explicit committed current mutation or an independently authorized runtime lifecycle event.

## 73. Family neutrality

CC-5 is operation/lifetime driven, not family-name driven.

Possible future consumers:

```text
persistent BOARD thread
persistent SOCIAL_FEED post
revisioned NEWS story
PUBLIC_KNOWLEDGE document
```

No family receives mutation authority merely because CC-5 is designed.

## 74. Existing snapshot families remain snapshot-only

The frozen current 3M BOARD/NEWS/LIVE_REACTION designs remain unchanged.

CC-5 does not retrofit them with:

```text
stable runtime IDs
edit buttons
reroll buttons
append actions
source-history storage
```

A concrete family adoption design is still required.

## 75. First recommended consumer shape

If runtime mutation is later explored, the narrowest first consumer should be a durable single-family object with:

```text
exact stable locator
small bounded semantic payload
no cross-family dependency
no delayed effect
no CC-7 survivor requirement
explicit hard caps
```

A persistent BOARD thread is a plausible candidate only after a separate consumer-adoption design freezes its durable identities and operation subset.

## 76. First-safe operation subset recommendation

For a first concrete consumer, prefer:

```text
EDIT one leaf item
DELETE_RETIRE one leaf item
APPEND_CHILD under one bounded parent
```

before attempting:

```text
parent reroll with many descendants
bulk mutation
cross-family propagation
reparenting
async media mutation
```

This is a recommendation, not runtime authorization.

## 77. Design validation scenarios

Future static/implementation evidence should include at minimum:

```text
EDIT leaf at current revision
→ same ID, revision advances, validated candidate visible

EDIT stale revision
→ REVISION_MISMATCH, no state change

EDIT parent dependency-neutral field
→ child remains eligible only under frozen neutral-field contract

EDIT parent semantic body
→ affected child withheld/revalidated before ordinary use

REROLL_IN_PLACE
→ same ID, new revision, candidate revalidated

REROLL_REPLACE
→ new ID, old ID retired, old callbacks cannot retarget

DELETE_RETIRE leaf
→ object no longer ordinary-current; physical purge not implied

DELETE_RETIRE parent
→ descendants cascade retire/invalidate unless later CC-7 contract

APPEND_CHILD
→ new child ID, exact parent, bounded order/duplicate policy

concurrent append without safe append contract
→ serialized/revision-guarded rather than assumed commutative

semantic reorder
→ IDs preserved; order owner revision advances

presentation update fails after commit
→ semantic commit remains current; diagnostic distinction preserved

stored object currently re-enterable under CC-4, then mutated
→ next request uses latest committed revision; no automatic prompt injection occurs

BOARD edited
→ NEWS sibling not automatically changed
```

## 78. Runtime authorization blockers

Before any concrete CC-5 runtime implementation, require at least:

```text
1. concrete consumer + capability profile
2. actual namespace / ID allocator contract from CC-1 adoption
3. concrete revision/currentness representation from CC-2 adoption
4. concrete bounded store owner/backend contract from CC-3 adoption
5. exact supported operation subset
6. exact editable semantic fields / relationship ownership
7. candidate validation owner
8. descendant dependency/disposition policy
9. hard item/character/descendant caps
10. presentation reconciliation mount/update authority
11. stale UI-event proof
12. failure/diagnostic evidence
```

If the consumer uses future prompt continuity, CC-4 adoption is additionally required.

## 79. Explicit non-goals

```text
NO mutation engine
NO runtime edit/reroll/delete/append buttons
NO actual stable runtime namespace registration
NO actual revision store
NO optimistic write implementation
NO rollback implementation
NO automatic three-way merge
NO arbitrary batch transaction
NO detach/reparent default
NO CC-7 survivor implementation
NO CC-8 media replacement
NO cross-family propagation
NO new model call
NO automatic context re-entry
NO host transcript rewrite
NO source-history backend selection
NO release-simcore mutation
```

## 80. Frozen invariants

```text
I1  semantic mutation is separate from presentation-only state
I2  every mutation uses explicit operation semantics
I3  exact target identity is required
I4  stale revision/operation authority fails closed
I5  changed semantic material must be revalidated
I6  EDIT preserves ID and advances revision on semantic change
I7  reroll identity behavior is explicit: in-place or replacement
I8  textual similarity never decides reroll identity
I9  DELETE_RETIRE is semantic retirement, not physical purge
I10 APPEND_CHILD creates a new child identity
I11 append concurrency/order must be explicitly owned
I12 parent-affecting mutation derives explicit descendant disposition
I13 CC-7 remains required for survivor semantics across replacement/retirement
I14 durable commit is semantic authority for presentation reconciliation
I15 presentation failure does not automatically roll back semantic commit
I16 mutation does not automatically inject future prompt context
I17 mutation in one family does not patch sibling families
I18 partial writes preserve unowned metadata
I19 mutation receipts are bounded diagnostics, not semantic archives
I20 cost is bounded to the active object/relation, not total history
```

## 81. Frozen verdict

```text
CC_5 = DESIGN_FROZEN
PRIMARY_ARCHITECTURE = EXPLICIT_OPERATION_TAXONOMY
C3_ITEM_MUTATION = DESIGN_OPEN_ONLY
C4_APPEND_MERGE = DESIGN_OPEN_ONLY
EDIT = SAME_ID_REVISIONED
REROLL = EXPLICIT_IN_PLACE_OR_REPLACE
DELETE = SEMANTIC_RETIRE_NOT_PHYSICAL_PURGE
APPEND_CHILD = NEW_CHILD_ID_WITH_EXPLICIT_PARENT_CURRENTNESS
DESCENDANT_DEFAULT = FAIL_CLOSED / REVALIDATE / CASCADE PER OPERATION
CC7_SURVIVOR_SEMANTICS = NOT OPENED
CROSS_FAMILY_PROPAGATION = NONE
AUTOMATIC_CONTEXT_REENTRY = NONE
RUNTIME_MUTATION = NOT_AUTHORIZED
PRODUCTION = UNCHANGED
```

## 82. Next checkpoint handoff

Next recommended Candidate C checkpoint:

```text
CC-6 · Derived-to-Derived Lineage
```

It should answer:

```text
when may one durable derived object become attributed input to another derived source?
what exact parent/origin locator and revision are carried?
how is historical attribution separated from current truth?
what happens when the parent is edited, corrected, retired, or replaced?
how are cycles prohibited?
how is derived lineage bounded without creating a universal provenance graph?
```

CC-6 must preserve:

```text
DERIVED PARENT SAID X
!=
X IS CANONICAL FACT
```

and must not use CC-5 replacement relations as truth authority merely because they are durable.