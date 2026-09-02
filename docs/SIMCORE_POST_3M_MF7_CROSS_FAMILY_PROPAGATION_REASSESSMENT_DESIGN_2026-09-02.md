# SimCore Post-3.0M MF-7 Cross-Family Propagation Reassessment Design - 2026-09-02

Date: 2026-09-02 KST

Status: **MF-7 DESIGN FROZEN · CURRENT MF REMAINS SIBLING-FANOUT ONLY · CROSS-FAMILY PROPAGATION DEFERRED · CANDIDATE C C5 REASSESSMENT COMPLETE / NOT ACTIVATED · REOPEN CONTRACT FROZEN · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-7 · CROSS-FAMILY PROPAGATION · CANDIDATE C C5 · DESIGN**

## 0. Purpose

MF-0 through MF-6 now provide current-root sibling fanout for five family profiles:

```text
LIVE_REACTION
BOARD
SOCIAL_FEED
NEWS
PUBLIC_KNOWLEDGE
```

MF-7 reassesses whether the Multi-Family program should additionally authorize:

```text
derived family object
→ another derived family object
```

Final decision:

```text
CURRENT MULTI-FAMILY PRODUCT
= SIBLING FANOUT ONLY

CROSS-FAMILY PROPAGATION
= DEFERRED

CANDIDATE C C5
= REASSESSMENT COMPLETE
= NOT ACTIVATED
```

This is not a permanent prohibition. MF-7 freezes the conditions under which a concrete future child design may reopen C5 safely.

This checkpoint is design-only. It does not implement lineage IDs, storage, history, producer changes, transport, validators, model topology, presentation, persistence, re-entry, release publication, or `release-simcore` changes.

## 1. Authority chain

MF-7 consumes without reopening:

```text
3M-2 Exposure / assertion policy
3M-3 structured sidecar validation
3M-6 support-at-use invalidation / Candidate C triggers
3M-7 zero automatic structured re-entry
3M-9 bounded current-projection cost
3M-10 design/runtime separation

Candidate C Durable Derived-Object Master Design

MF-0 Multi-Family Master Design
MF-1 Fanout Plan + Family Registry
MF-2 Shared Authority + Lane Isolation
MF-3 Aggregate Budget + Failure Matrix
MF-4 Presentation Stack
MF-5 SOCIAL_FEED Entry
MF-6 PUBLIC_KNOWLEDGE Entry
MF-7 Cross-Family Propagation Impact Scope
```

Standalone family semantic owners remain unchanged.

## 2. Existing legal topology

The converged MF topology remains:

```text
trusted current authority E
  ├→ LIVE_REACTION(E)
  ├→ BOARD(E)
  ├→ SOCIAL_FEED(E)
  ├→ NEWS(E)
  └→ PUBLIC_KNOWLEDGE(E)
```

The children are sibling projections.

They may share authorized current-root relationship authority through MF-2, but they may not consume sibling derived outputs as semantic authority.

Canonical rule:

```text
COMMON ROOT
!= DERIVED PARENT RELATIONSHIP
```

## 3. Propagation topology is a separate capability

Cross-family propagation means an exact derived object becomes a provenance parent for another exact derived object.

Examples:

```text
BOARD rumor post
→ NEWS story reporting that the rumor circulated

SOCIAL_FEED post
→ NEWS attributed social claim

NEWS story
→ PUBLIC_KNOWLEDGE claim-support provenance
```

This creates a relation absent from sibling fanout:

```text
DERIVED OBJECT A
→ DERIVED OBJECT B
```

That relation is Candidate C C5.

## 4. Why C5 remains closed now

Candidate C is capability-gated by concrete consumers.

The current MF product requirement is satisfied by sibling fanout and does not require any exact derived parent/child pair.

No current requirement says, for example:

```text
BOARD_POST must become a NEWS_STORY parent
```

or:

```text
NEWS_STORY must become a PUBLIC_KNOWLEDGE assertion parent
```

Therefore opening a generic lineage substrate now would solve no selected product requirement while creating identity, lifetime, invalidation, storage, and authority pressure.

Canonical rule:

```text
TECHNICALLY PLAUSIBLE PROPAGATION
!= CONCRETE C5 CONSUMER
```

## 5. C5 is not a truth conveyor

If C5 is reopened later, derived lineage must preserve:

```text
DERIVED PARENT EXISTS
!= PARENT PROPOSITION IS TRUE
```

A parent may support statements about itself.

Example:

```text
BOARD_POST P contains claim X
```

A child NEWS story may be allowed to say, with proper policy:

```text
A board post asserted X
```

The existence/content of P can be lineage-supported.

It does not authorize:

```text
X is true
```

without independent truth/exposure/policy authority.

## 6. Provenance fact and proposition truth are separate

A future C5 child must identify which semantic layer the edge supports.

Minimum distinction:

```text
OBJECT_EXISTENCE
= parent derived object existed under its validated lifecycle

OBJECT_CONTENT_ATTRIBUTION
= parent derived object contained/asserted specific content

UNDERLYING_PROPOSITION_TRUTH
= independent canonical/current authority question
```

C5 may support the first two when a child contract proves exact identity/content joins.

C5 alone never owns the third.

## 7. Settlement remains independent

PUBLIC_KNOWLEDGE is the strongest cross-family laundering hazard.

Even a future legal chain:

```text
BOARD object
→ NEWS object
→ PUBLIC_KNOWLEDGE object
```

must not imply:

```text
PUBLIC_KNOWLEDGE = SETTLED_PUBLIC_REFERENCE
```

PK still requires its own:

```text
current source support
Exposure eligibility
trusted PublicKnowledgeSettlementContextV1
settlementBasisRef exact join
PK validator disposition
```

Canonical rule:

```text
CROSS-FAMILY PROVENANCE
!= PUBLIC-REFERENCE SETTLEMENT
```

## 8. NEWS maturity remains independent

Likewise:

```text
BOARD object exists
→ NEWS may have an attributable source object
```

but does not imply:

```text
NEWS publication maturity = ALLOW
```

NEWS maturity still depends on trusted NEWS maturity context.

Lineage and maturity answer different questions.

## 9. SOCIAL_FEED attention remains independent

Future legitimate SOCIAL_FEED propagation, repetition, or engagement does not create truth authority.

```text
many reposts
many quotes
high engagement
```

may be source-world social facts if separately authorized, but:

```text
SOCIAL ATTENTION
!= CANONICAL TRUTH
!= NEWS MATURITY
!= PUBLIC_KNOWLEDGE SETTLEMENT
```

## 10. Reopen gate

MF-7 freezes one conceptual gate:

```text
CROSS_FAMILY_PROPAGATION_ACTIVATION_GATE
```

The gate remains CLOSED unless a future requirement identifies all mandatory activation fields.

Conceptual requirement record:

```text
CrossFamilyPropagationRequirement
  sourceFamily
  sourceObjectType
  targetFamily
  targetObjectType
  supportedSemanticRelation
  whySiblingRootDerivationIsInsufficient
  lifetimeNeed
  sourceReplacementBehavior
  futureContextNeed
  delayedEffectNeed
```

This is a design checklist, not an authorized runtime schema.

## 11. Mandatory activation fields

A C5 child design must name:

```text
1. exact source family
2. exact source derived object type
3. exact target family
4. exact target derived object type
5. exact semantic relation carried by the lineage edge
6. why current-root sibling derivation cannot satisfy the product requirement
7. same-operation or cross-turn lifetime
8. behavior when parent/source becomes stale or replaced
9. whether child may re-enter future model context
10. whether late/asynchronous effects target either object
```

Missing answers mean:

```text
C5 ACTIVATION = HOLD / NOT DESIGNED
```

## 12. Candidate C gate derivation

The child must derive the minimum Candidate C capability profile.

### Same-operation direct lineage

Possible profile:

```text
C1 survival         = NO
C2 stable identity  = OPERATION_LOCAL_ONLY if required
C3 item mutation    = NO
C4 append/merge     = NO
C5 derived lineage  = YES
C6 context reentry  = NO
C7 partial survival = NO
C8 delayed effect   = NO
```

This is the smallest plausible future C5 shape.

It is not authorized by MF-7.

### Cross-turn lineage

Likely minimum pressure:

```text
C1 = YES
C2 = YES
C5 = YES
```

C6/C7/C8 remain independent and must not be inferred.

## 13. Same-operation C5 does not imply persistence

Important boundary:

```text
C5
!= C1
```

A future consumer might need:

```text
parent derived object produced earlier in the same bounded operation
→ child consumes exact semantic parent ref
→ operation ends
→ both refs disappear
```

That may use operation-local identity and no source history.

However, the child must prove why direct current-root authority is insufficient.

## 14. Direct-root derivation remains preferred

When both parent and child can independently derive from current trusted authority E, sibling fanout remains preferred:

```text
E → A
E → B
```

Do not replace it with:

```text
E → A → B
```

merely because lineage appears richer.

Canonical selection rule:

```text
DIRECT CURRENT AUTHORITY SUFFICIENT
→ DO NOT ACTIVATE C5
```

C5 exists for product semantics that are specifically about a derived object or its publication/discourse existence.

## 15. First reopened child should be single-parent

Unless a concrete consumer proves otherwise, the first C5 child design must default to:

```text
one target derived object
→ at most one explicit derived parent edge for the selected relation
```

Generic multi-parent fan-in is not the default.

Why:

```text
parent count
must not become
consensus / confidence / truth score
```

A future multi-parent consumer requires its own policy.

## 16. No consensus fan-in

Forbidden generic rule:

```text
BOARD P1
+ SOCIAL P2
+ NEWS P3
→ three sources agree
→ target claim stronger
```

That collapses provenance into epistemic promotion.

If a future product wants to represent multiple derived attestations, it must preserve them as distinct attributed records unless another authority explicitly owns aggregation semantics.

## 17. No cycles

A future first C5 child must not permit circular lineage such as:

```text
BOARD A → NEWS B → BOARD A
```

or:

```text
NEWS A → PK B → NEWS C → PK B
```

Default future constraint:

```text
lineage edge = directed
cycle acceptance = NONE
```

A generic graph cycle resolver is not part of Candidate C.

## 18. Bounded depth

MF-7 does not authorize multi-hop propagation.

A future first child should default to direct depth 1:

```text
parent → child
```

A chain such as:

```text
BOARD → SOCIAL_FEED → NEWS → PUBLIC_KNOWLEDGE
```

is not automatically authorized because each pair might individually appear plausible.

Every additional edge must have a concrete consumer contract and bounded support-at-use semantics.

## 19. No transitive authority

Even if future edges exist:

```text
A → B
B → C
```

C must not silently treat A as its direct authority.

Canonical rule:

```text
LINEAGE TRANSITIVITY
!= AUTHORITY TRANSITIVITY
```

A child design must state which exact parent edge it validates.

## 20. Exact semantic parent identity

Presentation identifiers cannot become C5 identity.

Forbidden parent identity sources:

```text
array ordinal only
DOM node
stack slot
renderInstanceKey
headline/title string
handle/displayName
content similarity
host message index
screen position
```

A future child requiring C5 needs a bounded semantic derived-object identity owned by the relevant source family/derived-object owner.

## 21. Durable identity is only as durable as required

If identity is required only for same-operation C5, it must not automatically become cross-turn durable identity.

```text
OPERATION_LOCAL_DERIVED_ID
!= DURABLE_CROSS_TURN_ID
```

A later C1/C2 child may define a stronger lifetime.

## 22. Derived parent reference vocabulary

Candidate C master already permits the concept of a derived parent/origin reference.

MF-7 freezes only minimum vocabulary for future child discussion:

```text
DerivedParentRef
  parentFamily
  parentObjectType
  parentDerivedId
  parentRevisionOrGeneration?  // only when child lifetime requires it
  parentSupportRef
```

No generic serialized `DerivedParentRefV1` runtime schema is authorized here.

Concrete child contracts select actual fields.

## 23. Parent support and parent identity are distinct

Future lineage needs both questions when applicable:

```text
which parent object?
```

and:

```text
is that parent still supported for this use?
```

Canonical rule:

```text
PARENT ID MATCH
!= PARENT SUPPORT CURRENT
```

Stale support cannot be repaired by stable identity.

## 24. Source replacement behavior must be explicit

For every future C5 child:

```text
source/root rerolled or replaced
→ what happens to parent?
→ what happens to child?
```

must be answered.

If the child must survive parent/source replacement, Candidate C C7 pressure exists.

MF-7 does not activate C7.

## 25. Parent invalidation cannot promote child

If a parent lineage edge becomes unsupported:

```text
parent invalid/stale
```

forbidden outcomes include:

```text
child upgrades to independent confirmed fact
child keeps attribution but drops provenance silently
sibling consensus repairs parent
presentation text is used as replacement proof
```

The exact child failure/HOLD behavior belongs to the future child policy.

## 26. Parent quarantine propagates only as policy requires

A quarantined parent assertion cannot become accepted target content merely by crossing a family boundary.

Canonical minimum:

```text
QUARANTINED CONTENT
→ NO AUTHORITY PROMOTION THROUGH C5
```

A target may still legally report the existence of a quarantined/denied object only if its own policy explicitly permits that meta-level fact and exact safe data are available.

That distinction must be designed per consumer.

## 27. Exposure is re-evaluated at target family

Future C5 lineage does not carry an automatic Exposure pass.

```text
parent exposure result
!= target-family exposure result
```

Target-family semantic content still passes its own active Exposure/assertion policy.

## 28. Family-specific policy remains authoritative

A future target still retains its family policy:

```text
BOARD hierarchy
SOCIAL_FEED graph/reachability
NEWS maturity/story policy
PUBLIC_KNOWLEDGE settlement/reference policy
LIVE_REACTION assertion policy
```

C5 adds lineage evidence. It does not bypass target-family validation.

## 29. Model declaration cannot create parentage

The main model may not establish lineage by generating text such as:

```text
"according to the board post above"
```

or by returning an arbitrary parent ID string.

A future producer draft may propose a ref only if the child contract allows it; trusted validation must exact-join against authorized derived-object authority.

Canonical rule:

```text
MODEL-SPELLED PARENT REF
!= TRUSTED DERIVED LINEAGE
```

## 30. Presentation cannot create parentage

The MF-4 stack remains non-semantic.

```text
NEWS visually below BOARD
```

never means:

```text
NEWS derived from BOARD
```

Likewise links, quote-card appearance, adjacency, collapse state, and animation cannot create provenance.

## 31. No history mining

Future C5 lookup must be bounded by exact refs.

Forbidden:

```text
scan old BOARD history for likely parent
search old SOCIAL_FEED posts by similar text
match NEWS headline to prior source cards
reconstruct parent from host transcript
```

A cross-turn C5 child therefore needs explicit C1/C2 storage/index semantics rather than fuzzy retrieval.

## 32. No universal provenance database

MF-7 explicitly rejects automatic creation of:

```text
UniversalDerivedGraph
GlobalSourceObjectStore
CrossFamilyKnowledgeGraph
PersistentProvenanceDBForAllSources
```

Candidate C remains consumer-specific.

```text
ONE C5 CHILD
!= GENERIC C5 PLATFORM FOR EVERY FAMILY
```

## 33. Cost rule

A future C5 child must have bounded lookup cost tied to explicit refs.

Preferred cost shape:

```text
O(number of explicitly authorized parent refs)
```

not:

```text
O(all historical derived objects)
```

Lineage depth and parent count require concrete caps before runtime.

## 34. Failure isolation

Future propagation creates a new possible target-local failure axis:

```text
DERIVED_PARENT_UNAVAILABLE
DERIVED_PARENT_ID_MISMATCH
DERIVED_PARENT_REVISION_MISMATCH
DERIVED_PARENT_SUPPORT_STALE
DERIVED_PARENT_RELATION_UNSUPPORTED
```

These reason names are conceptual examples, not frozen runtime enums.

A target lineage failure must not mutate sibling validated results.

Shared current-root invalidation remains a separate whole-fanout axis.

## 35. C5 does not change MF-1 fanout registry

MF-7 does not add a new family and does not change the five eligible sibling profiles.

Effective sibling registry remains:

```text
LIVE_REACTION     ELIGIBLE
BOARD             ELIGIBLE
SOCIAL_FEED       ELIGIBLE
NEWS              ELIGIBLE
PUBLIC_KNOWLEDGE  ELIGIBLE FOR ITS CERTIFIED DIRECT-B PROFILE
```

Cross-family propagation is not represented by simply adding another family key.

## 36. C5 does not change MF-4 stack order

Canonical display order remains:

```text
LIVE_REACTION
BOARD
SOCIAL_FEED
NEWS
PUBLIC_KNOWLEDGE
```

This is presentation grammar only.

No lineage relationship is inferred from vertical order.

## 37. C5 does not change MF-3 budget today

Because C5 remains closed:

```text
cross-family parent lookup budget = NONE
lineage graph budget = NONE
persistent provenance budget = NONE
```

If a child later activates C5, that child must add finite cost dimensions to MF-3 integration before runtime.

## 38. Reopen triggers

MF-7 may be reopened only by a named concrete requirement such as:

```text
P1  NEWS must report the existence/content of an exact BOARD object rather than the common root event
P2  NEWS must report an exact SOCIAL_FEED object as a derived publication source
P3  PUBLIC_KNOWLEDGE must attach exact NEWS object provenance without treating it as settlement authority
P4  a source family must preserve exact parentage across turns
P5  a user-facing provenance inspector requires exact derived parent links
```

A vague desire for richer continuity or more realistic source behavior is insufficient.

## 39. First reopen lane recommendation

If a concrete requirement is selected later, the safest first child is:

```text
SAME_OPERATION
SINGLE_PARENT
DIRECT_DEPTH_1
READ_ONLY
NO_HISTORY
NO_CONTEXT_REENTRY
NO_SOURCE_REPLACEMENT_SURVIVAL
NO_ASYNC_EFFECT
```

This attempts to activate only C5 with operation-local identity pressure.

Only after that child proves insufficient should C1/C2/C6/C7/C8 be added.

## 40. What MF-8 should converge

MF-8 should close the current Multi-Family design around:

```text
five fanout-eligible current snapshot families
atomic fanout-plan admission
least-authority lane views
aggregate budget gate
family-local semantic/presentation failures
canonical presentation stack
SOCIAL_FEED and PUBLIC_KNOWLEDGE entry amendments
C5 closed with explicit reopen contract
Candidate C not activated by current MF product
```

MF-8 must not reinterpret MF-7 as an implementation authorization.

## 41. Final MF-7 verdict

```text
MF-7 DESIGN = FROZEN

CURRENT MULTI-FAMILY ARCHITECTURE
= CURRENT-ROOT SIBLING FANOUT

CROSS-FAMILY PROPAGATION
= DEFERRED UNTIL CONCRETE CHILD REQUIREMENT

CANDIDATE C C5
= REASSESSMENT COMPLETE
= NOT ACTIVATED

GENERIC PROVENANCE GRAPH
= REJECTED

NEXT
= MF-8 MULTI-FAMILY CONVERGENCE / RUNTIME VALIDATION PROTOCOL
```

## 42. Runtime / production authority

No runtime work is authorized by this design.

```text
runtime implementation = NONE
Candidate C implementation = NONE
release-simcore mutation = NONE
production change = NONE
```

Production remains independently authoritative on `release-simcore`.
