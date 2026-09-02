# SimCore Post-3.0M Candidate C CC-7 Partial Descendant Survival Design — 2026-09-02

Date: 2026-09-02 KST

Status: **CC-7 DESIGN FROZEN · PARTIAL DESCENDANT SURVIVAL / REATTACHMENT CONTRACT · C7 DESIGN LANE OPEN · DIRECT-CHILD FIRST SCOPE · DESIGN-ONLY · NO RUNTIME SURVIVOR ENGINE · NO AUTOMATIC REPARENT · NO STORAGE BACKEND CHANGE · NO MODEL CALL · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · CANDIDATE C · CC-7 · PARTIAL DESCENDANT SURVIVAL · REATTACHMENT · C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

CC-7 freezes the minimum contract required when a durable parent/source object is edited, rerolled, replaced, retired, or otherwise invalidated and a future product wants some descendants to survive instead of applying the earlier whole-projection/cascade-invalidating default.

The motivating question is:

```text
parent durable object P changes or disappears
        ↓
child durable objects C1, C2, C3 exist
        ↓
may any child remain a valid current object?
```

The answer is not based on visual presence, textual similarity, user convenience, or prior attachment alone.

A descendant may survive only when its consumer can prove an explicit survivor disposition under current authority.

CC-7 answers:

```text
what counts as a descendant for this checkpoint?
when may a child survive parent edit/replacement/retirement?
when may a child become an independent root?
when may a child be reattached to a replacement parent?
what identity/revision is preserved during survival?
what support must be re-proved?
what happens to a child's own descendants?
what does historical retention mean versus current survival?
how are survivor cost and blast radius bounded?
```

CC-7 does not implement a survivor engine, detach/reparent buttons, recursive graph migration, automatic model regeneration, storage transactions, background invalidation propagation, generic DAG salvage, new model calls, prompt injection, or release changes.

## 1. Authority chain

CC-7 consumes:

```text
SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01
SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC4_CONTROLLED_CONTEXT_REENTRY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC5_ITEM_MUTATION_APPEND_RECONCILIATION_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC6_DERIVED_TO_DERIVED_LINEAGE_DESIGN_2026-09-02
SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01
SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01
Lineage / Handoff / Evidence current support ownership
family validators / consumer relationship semantics
Presentation Renderer / host mount ownership
```

Inherited rules remain:

```text
same object ID != same revision
visual attachment != semantic dependency proof
historical retention != current survival
text similarity != identity continuity
parent replacement != child reattachment authority
survival != canonical truth
found-by-ID != supported-for-use
C7 survival != C5 derived attribution lineage
C7 survival != C6 automatic model-context re-entry
```

## 2. Capability profile

CC-7 opens only the partial-survival design lane.

```text
C1 survival         = YES
C2 stable identity  = YES
C3 item mutation    = INHERITS CC-5 DESIGN-OPEN STATE
C4 append/merge     = INHERITS CC-5 DESIGN-OPEN STATE
C5 derived lineage  = INHERITS CC-6 DESIGN-OPEN STATE
C6 context reentry  = INHERITS CC-4 DESIGN-OPEN STATE
C7 partial survival = YES, DESIGN CONTRACT ONLY
C8 delayed effect   = NO
```

Canonical rule:

```text
C7 DESIGN OPEN
!=
RUNTIME SURVIVOR / REPARENT AUTHORIZED
```

## 3. Primary decision

Selected first architecture:

```text
EXPLICIT_SURVIVOR_DISPOSITION
+
EXACT_CHILD_IDENTITY / REVISION
+
INDEPENDENT_SUPPORT_PROOF
+
RELATIONSHIP-SEMANTICS PROOF
+
NO_SIMILARITY_SALVAGE
+
DIRECT-CHILD / BOUNDED-FIRST SCOPE
+
FAIL-CLOSED UNKNOWN DESCENDANT STATE
```

There is no generic `salvage descendants` authority.

Every concrete consumer must state which descendant relations are eligible for survival and what proof is sufficient.

## 4. Descendant definition for CC-7

A CC-7 descendant is a durable derived object whose current semantic usability depends on a parent/source relationship owned by the same concrete consumer or an explicitly declared durable relationship.

Examples:

```text
BOARD REPLY attached to BOARD POST
thread child attached to durable thread root
consumer-defined durable nested source item
```

Not automatically CC-7 descendants:

```text
NEWS story that historically cites a BOARD post
```

That relationship is primarily CC-6 derived attribution lineage.

A single object may participate in both kinds of relations only if each relation is modeled separately.

Canonical rule:

```text
STRUCTURAL / SEMANTIC DESCENDANT RELATION
!=
DERIVED ATTRIBUTION LINEAGE
```

## 5. Why the old default was cascade

Before CC-7, the safe rule was:

```text
parent/source replaced or retired
→ dependent descendants do not automatically survive
```

This prevented a child from preserving or leaking semantic material whose support depended on the old parent.

CC-7 does not repeal that default.

It creates a narrow proof path for exceptions.

## 6. Survivor disposition vocabulary

CC-7 freezes the first common disposition vocabulary:

```text
CASCADE_INVALIDATE
CASCADE_RETIRE
HISTORICAL_ONLY
SURVIVE_INDEPENDENT_ROOT
REATTACH_TO_REPLACEMENT
HOLD_SURVIVAL_UNRESOLVED
```

A concrete consumer may use a strict subset.

Unknown cases fail closed to `HOLD_SURVIVAL_UNRESOLVED` or the consumer's stricter cascade rule.

## 7. `CASCADE_INVALIDATE`

Use when the child cannot currently prove semantic usability after the parent change.

The child may remain physically retained under CC-3 but is not current-valid.

```text
stored bytes may remain
current semantic use = NO
ordinary presentation = NO
CC-4 current re-entry = NO
```

## 8. `CASCADE_RETIRE`

Use when product semantics say the child object's durable life ends with the parent relation.

This is stronger than temporary invalidation.

```text
child lifetime → RETIRED
```

Physical purge remains a separate CC-3 retention decision.

## 9. `HISTORICAL_ONLY`

Use when the child may remain inspectable as historical evidence of what existed under the old parent but is no longer an ordinary current child.

Example:

```text
old thread snapshot shows that reply R existed under post P@R4
```

This does not mean R may be shown as a live reply under a replacement post.

Canonical rule:

```text
HISTORICAL EXISTENCE
!=
CURRENT RELATIONSHIP
```

## 10. `SURVIVE_INDEPENDENT_ROOT`

This is allowed only when the consumer explicitly defines the child type as independently meaningful without its former parent.

Required proof includes at minimum:

```text
exact child durable locator
exact current child revision
child lifetime still active
current support independent of former parent
consumer schema allows root form
all parent-dependent semantic fields removed or revalidated
current family policy passes
no unresolved child-of-child dependency
```

If the child semantic meaning inherently says "reply to P", it cannot silently become a root merely because the UI can render it alone.

Canonical rule:

```text
RENDERABLE ALONE
!=
SEMANTICALLY INDEPENDENT ROOT
```

## 11. `REATTACH_TO_REPLACEMENT`

This is the narrow path for preserving the same child identity under a new/replacement parent.

It requires all of:

```text
old child exact locator + revision
new parent exact locator + revision/currentness
explicit current reattachment operation authority
consumer relationship semantics permit reattachment
child logical identity remains the same object
child semantic material remains valid under new parent or is explicitly revalidated
current support/policy passes
ordering/duplicate constraints pass
child's own descendants have explicit disposition
```

If any required proof is unknown:

```text
DO NOT REATTACH
```

## 12. No automatic old-parent → new-parent retarget

For replacement:

```text
old parent P1
→ replacement P2
```

Forbidden:

```text
child.parent = P1
→ silently rewrite child.parent = P2
```

The replacement relation between P1 and P2 is not itself child reattachment authority.

## 13. Similarity is never survivor proof

Forbidden survivor decisions:

```text
new parent text looks similar
child text still "seems relevant"
same nickname appears
same ordinal exists
same title exists
same fingerprint prefix
model judges relationship probably still valid
```

Canonical rule:

```text
SEMANTIC SIMILARITY
!=
RELATIONSHIP CONTINUITY
```

## 14. Child identity continuity

A surviving child may preserve its durable ID only when product semantics say it is the same logical child object.

If survival requires rewriting the child into a materially different logical object, the safe path is:

```text
retire old child
create new child identity
record explicit replacement relation if needed
```

Do not preserve identity merely to keep UI references stable.

## 15. Revision behavior during survival

### No semantic state change

If the relationship changes but the child semantic payload and owner-defined durable semantic state truly remain unchanged, the consumer may choose whether relation state is part of the child's revision domain.

That choice must be frozen per consumer.

### Semantic child rewrite/revalidation

If child semantic content or owner-defined relationship state changes:

```text
same logical child
→ revision advances
```

CC-2 currentness rules apply.

## 16. Parent edit versus replacement

CC-7 distinguishes:

```text
PARENT EDIT / REROLL_IN_PLACE
→ parent identity remains
→ child relation may remain structurally attached
→ semantic dependency may require revalidation

PARENT REROLL_REPLACE / DELETE_RETIRE
→ old parent identity no longer current
→ child requires explicit survival disposition
```

The second case is where CC-7's survivor exception is primarily needed.

## 17. Dependency surface must be explicit

A child consumer should identify the smallest parent dependency surface needed to validate survival.

Example:

```text
reply depends on:
- exact parent identity
- parent conversational proposition(s)
- thread membership

reply does not depend on:
- parent CSS
- viewport position
- reaction count presentation
```

This prevents irrelevant parent changes from causing unnecessary cascades while still protecting real semantic dependencies.

## 18. Independent support proof

A descendant may not survive merely because it was valid when first created.

At survival decision time:

```text
PAST VALID
!=
CURRENT SURVIVOR-SAFE
```

The consumer must prove all current support required for the proposed new state.

This can include:

```text
Lineage / Handoff / Evidence support
Exposure policy
family validation
relationship schema
lifetime/currentness
CC-6 lineage if the child depends on attributed derived claims
```

## 19. Parent content leakage guard

A child whose content reveals a proposition only supported by the old/retired parent cannot survive as an independent current object unless that proposition has independent current support.

Example:

```text
parent P contained hidden/invalidated proposition X
child R says "맞아, X 때문에 그런 거야"
```

If P loses support, R cannot survive as a current root merely because R's words are stored independently.

Canonical rule:

```text
STORED CHILD CONTENT
DOES NOT CREATE
INDEPENDENT SUPPORT FOR OLD PARENT FACTS
```

## 20. Historical-only can preserve old relationship evidence

Historical retention may preserve:

```text
child C was attached to old parent P@R4
```

when that exact relationship is itself historical metadata under bounded retention.

It must not be represented as a current attachment to P's replacement.

## 21. Reattachment is a semantic mutation

`REATTACH_TO_REPLACEMENT` is not a presentation operation.

Conceptual pipeline:

```text
current reattachment intent
→ resolve old child
→ resolve exact new parent
→ capture revisions/currentness
→ build candidate relationship state
→ validate child under new parent
→ decide child's descendants
→ re-check currentness
→ durable semantic commit
→ presentation reconciliation
```

CC-5 mutation safety applies.

## 22. No DOM-driven reattachment

Forbidden:

```text
move reply DOM under new post
→ infer semantic parent relation from DOM
```

The durable semantic relation must commit first.

## 23. Child with its own descendants

V1 does not authorize arbitrary recursive subtree salvage.

If candidate survivor child C has its own dependent descendants:

```text
C
└ D1
└ D2
```

then the consumer must either:

```text
A. prove a bounded direct-child disposition for each D under a separately bounded operation
or
B. cascade/withhold the subtree
```

No implicit recursive "keep everything below C" rule exists.

## 24. First depth bound

Frozen first scope:

```text
survival decision depth = direct child only
```

This means CC-7 can decide children of one changed parent, but does not freeze a general recursive graph migration engine.

A future subtree-survival feature must define explicit depth/node caps.

## 25. First count bound

A runtime consumer must freeze a concrete maximum number of candidate direct descendants examined per parent mutation before activation.

CC-7 does not choose the number here.

Required property:

```text
bounded by current parent relation set
not by entire source-history store
```

No global descendant scan is authorized.

## 26. Missing relation index fails closed

A future runtime implementation must have an owner-bounded way to enumerate the current direct descendants of the exact parent.

If it cannot prove the descendant set is complete enough for the mutation contract:

```text
HOLD_SURVIVAL_UNRESOLVED
or block parent mutation under consumer policy
```

It may not search arbitrary transcript/history text for likely children.

## 27. Parent replacement ordering

Safe conceptual ordering for replacement with survivor candidates:

```text
resolve old parent + direct children
→ validate replacement parent candidate
→ compute per-child disposition
→ validate all survivor candidates under proposed state
→ re-check currentness
→ commit replacement + retire old parent + survivor relationship state under owner-safe transaction boundary
→ presentation reconciliation
```

CC-7 does not freeze a storage transaction implementation.

## 28. No half-reattached visible state as authority

If presentation updates partially fail after semantic commit:

```text
semantic committed state remains authority
UI must reconcile/reload from committed state
```

Presentation failure does not authorize semantic rollback by itself.

## 29. Failure before commit

If any required survivor proof fails before commit:

```text
no survivor semantic commit
```

The parent mutation policy may then:

```text
cascade the affected child
or
block the parent mutation
```

according to the concrete consumer contract.

## 30. Parent mutation must declare unresolved policy

Each consumer supporting CC-7 must freeze what happens when one candidate child's survival is unresolved.

Allowed first policy shapes:

```text
STRICT_BLOCK_PARENT_MUTATION
CASCADE_UNRESOLVED_CHILD
```

A consumer may not improvise case by case based on generated text.

## 31. BOARD example

Suppose:

```text
POST P1
├ REPLY R1
├ REPLY R2
└ REPLY R3
```

and product requests:

```text
REROLL_REPLACE P1 → P2
```

Without CC-7 proof:

```text
R1/R2/R3 → cascade invalid/retire
```

With CC-7, each direct reply may independently receive a disposition.

Example:

```text
R1 = HISTORICAL_ONLY
R2 = REATTACH_TO_REPLACEMENT, after current semantic revalidation
R3 = CASCADE_RETIRE
```

This is only valid if the consumer has explicitly defined reply reattachment semantics and each decision is mechanically supported.

## 32. BOARD reply caution

Most natural-language replies are context-dependent.

Therefore first-safe BOARD default remains:

```text
replacement parent
→ replies DO NOT reattach automatically
```

CC-7 creates the design path for an explicitly proven exception; it does not make reply survival generally safe.

## 33. NEWS / CC-6 distinction

If NEWS story N cites BOARD post P through CC-6:

```text
P → N
```

and P is later replaced, N is not necessarily a structural child for CC-7.

Its validity follows the CC-6 lineage mode:

```text
CURRENT_PARENT_ATTRIBUTION
or
HISTORICAL_PARENT_ATTRIBUTION
```

Do not run CC-7 reparent logic on CC-6 attribution edges unless a future consumer explicitly defines a structural relation too.

## 34. CC-4 re-entry after survival

A survivor object becoming current does not automatically enter model context.

```text
SURVIVOR CURRENT
!=
AUTOMATIC REENTRY
```

Future prompt use still requires CC-4 current-request gating and support-at-prompt-use.

## 35. Source history retention

`HISTORICAL_ONLY` may remain in CC-3 history according to bounded retention.

A survivor becoming `SURVIVE_INDEPENDENT_ROOT` or `REATTACH_TO_REPLACEMENT` becomes a current durable state and must be stored under the consumer's latest-committed-state policy.

No new universal event log is authorized.

## 36. Tombstones and stale operations

If old parent or retired child locators remain within stale-reference horizons, CC-3 tombstones may be required.

Late CC-2 operations targeting retired/replaced identities fail closed and may not auto-retarget to survivors/replacements.

## 37. No survivor truth promotion

A child surviving longer than its parent does not gain stronger truth authority.

```text
SURVIVED PARENT
!=
MORE TRUE
```

All inherited assertion/exposure/attribution semantics remain.

## 38. No user-visible label as proof

UI states such as:

```text
"preserved"
"moved"
"restored"
```

are presentation of an already-authorized disposition, not authority to create it.

## 39. Survivor receipt

A future validator/owner may emit a bounded receipt such as:

```text
DescendantSurvivalReceiptV1
  childLocator
  expectedChildRevision
  oldParentLocator
  proposedNewParentLocator? // only for reattach
  disposition
  reasonCode
```

The receipt must not contain quarantined semantic content unless specifically required by a concrete consumer and safely bounded.

## 40. Reason-code first vocabulary

Conceptual first reason codes:

```text
ALLOW_HISTORICAL_ONLY
ALLOW_INDEPENDENT_ROOT
ALLOW_REATTACH_TO_REPLACEMENT
CASCADE_PARENT_DEPENDENCY
CASCADE_PARENT_RETIRED
HOLD_CHILD_SUPPORT_UNKNOWN
HOLD_CHILD_REVISION_MISMATCH
HOLD_NEW_PARENT_UNRESOLVED
HOLD_RELATIONSHIP_NOT_ALLOWED
HOLD_DESCENDANT_POLICY_UNRESOLVED
HOLD_SURVIVOR_BUDGET_EXCEEDED
```

These are policy results, not model declarations.

## 41. No generic reparent API

CC-7 does not freeze:

```text
reparent(child, anyParent)
```

A consumer must explicitly authorize the source and target relation kinds.

Example future allowlist:

```text
BOARD_REPLY → BOARD_POST
```

A `BOARD_REPLY → NEWS_STORY` relation would not become legal merely because both have durable IDs.

## 42. No bulk salvage

Not authorized:

```text
move all replies to replacement post
preserve every descendant unless validator objects
repair whole source tree automatically
```

First-safe philosophy:

```text
SURVIVAL IS AN EXCEPTION THAT MUST BE PROVEN
NOT A DEFAULT THAT MUST BE DISPROVEN
```

## 43. No background repair loop

CC-7 does not authorize a daemon/poller that repeatedly scans history looking for orphaned descendants.

Survival/reconciliation occurs only in connection with a current authorized operation or explicitly bounded repair action.

## 44. Source-irrelevant dormancy

When no current parent mutation/survival job exists:

```text
survivor history scans      = 0
relationship scans          = 0
survivor validation         = 0
reattachment work           = 0
prompt bytes                = 0
new model calls             = 0
network calls               = 0
```

A bounded current-operation branch check may exist in a future implementation.

## 45. Runtime blockers before activation

Any future runtime CC-7 implementation must freeze/prove:

```text
exact durable parent/child namespaces
complete bounded direct-child relation index
per-consumer survivor-eligible relation types
concrete direct-child cap
revision/currentness semantics
independent-support producer
reattachment operation authority
transaction/commit boundary
presentation reconciliation
stale-reference/tombstone behavior
CC-4 behavior for survivors
```

Until then:

```text
RUNTIME_CC7_SURVIVAL = NOT AUTHORIZED
```

## 46. Adversarial acceptance cases

A future implementation must prove at least:

```text
A. text-similar replacement parent does not auto-retain children
B. stale child revision blocks reattachment
C. missing new-parent locator blocks reattachment
D. hidden/invalidated old-parent proposition cannot leak through surviving child
E. historical-only child is not shown as live current child
F. independent-root survival only works for explicitly root-capable child schema
G. replacement does not retarget late operations from old parent/child identities
H. survivor child with unresolved grandchildren does not silently preserve subtree
I. UI move failure does not rewrite semantic authority
J. no current survival job leaves source-irrelevant path dormant
```

## 47. Candidate C state after CC-7

```text
C1 survival         = DESIGN-AVAILABLE
C2 stable identity  = DESIGN-AVAILABLE
C3 item mutation    = DESIGN-OPEN
C4 append/merge     = DESIGN-OPEN
C5 derived lineage  = DESIGN-OPEN
C6 context reentry  = DESIGN-OPEN
C7 partial survival = DESIGN-OPEN
C8 delayed effect   = CLOSED
```

No runtime capability is implied.

## 48. Deferred extensions

Not frozen here:

```text
recursive subtree survivor transactions
multi-parent child survival
cross-family structural reparenting
automatic semantic rewrite to make a child independent
background orphan repair
similarity-assisted reattachment
bulk user-selected survivor migration
```

Each requires separate consumer evidence and bounded design.

## 49. Relationship to CC-8

CC-8 will design delayed effects/materialized attachments that arrive after a target may have changed, moved, survived, or retired.

CC-7 provides one of the current-state facts CC-8 will need:

```text
where does the exact target object currently live,
and is the exact target revision/effect authority still valid?
```

CC-8 must not infer target survival from UI location.

## 50. Final frozen decision

CC-7 freezes:

```text
PARTIAL DESCENDANT SURVIVAL
IS ALLOWED ONLY BY EXPLICIT DISPOSITION
BACKED BY CURRENT INDEPENDENT SUPPORT
AND CONSUMER-DEFINED RELATIONSHIP SEMANTICS.

PARENT REPLACEMENT
DOES NOT AUTOMATICALLY REATTACH CHILDREN.

TEXT SIMILARITY
IS NEVER SURVIVOR PROOF.

HISTORICAL RETENTION
IS NOT CURRENT SURVIVAL.

DIRECT-CHILD FIRST SCOPE
PREVENTS A GENERIC GRAPH-SALVAGE ENGINE.
```

CC-7 is design-frozen only.

No runtime survivor engine, storage implementation, prompt injection, model call, DOM mutation path, or production change is authorized.

Next recommended checkpoint:

```text
CC-8 · Delayed Effect / Media Attachment
```
