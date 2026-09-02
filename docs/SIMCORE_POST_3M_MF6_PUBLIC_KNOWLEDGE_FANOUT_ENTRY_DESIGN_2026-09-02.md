# SimCore Post-3.0M MF-6 PUBLIC_KNOWLEDGE Fanout Entry Review Design — 2026-09-02

Date: 2026-09-02 KST

Status: **MF-6 DESIGN FROZEN · PUBLIC_KNOWLEDGE V1 PROMOTED TO FANOUT ELIGIBLE FOR DIRECT-B CURRENT ROOT SIBLING SNAPSHOT · SETTLEMENT / TARGET AUTHORITY LANE-PRIVATE · CANONICAL STACK ORDER AMENDED · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-6 · PUBLIC_KNOWLEDGE · FANOUT ENTRY · REGISTRY AMENDMENT · DESIGN**

## 0. Purpose

MF-1 froze `PUBLIC_KNOWLEDGE` as `ENTRY_REVIEW_REQUIRED` until a dedicated fanout compatibility review proved all MF-1 F1..F12 obligations.

PK-0 through PK-6 converged PUBLIC_KNOWLEDGE V1 as a direct-B, current-projection, read-only public-reference snapshot family.

The MF-6 impact scope evaluated that exact profile and found it compatible with sibling fanout provided that settlement and document-target authority remain independent from sibling derived-source results.

MF-6 now freezes the actual design amendment.

It answers:

```text
Which exact PUBLIC_KNOWLEDGE profile becomes fanout-eligible?
How does the effective MF-1 registry change?
Which root profiles may structurally admit PUBLIC_KNOWLEDGE?
What authority may the PK lane share with siblings?
What authority must remain PK-private?
What happens when settlement context is unavailable?
How does MF-3 budget admission account for PK?
Where is PK inserted in the MF-4 stack?
Which PK failures are family-local?
Does entry activate Candidate C?
```

This checkpoint is design-only.

It does not implement runtime registry code, source-job selection, settlement-context production, document-target production, semantic generation, structured transport, validation code, model topology, numeric caps, DOM/CSS, Presentation Host mounting, persistence, search, revision history, interaction, network/media, release publication, S7, or `release-simcore` changes.

## 1. Authority chain

MF-6 consumes without reopening:

```text
MF-0 Multi-Family Orchestration Master Design
MF-1 Fanout Plan + Family Entry Registry
MF-2 Shared Current Authority Bundle + Family-Lane Isolation
MF-3 Aggregate Budget + Failure Matrix
MF-4 Presentation Stack + Ordering / Mount Isolation
MF-5 SOCIAL_FEED Fanout Entry
MF-6 PUBLIC_KNOWLEDGE Fanout Entry Impact Scope

PK-0 Settlement Master Design
PK-1 Settlement Context Authority
PK-2 Document Sidecar + Validator
PK-3 Presentation Grammar
PK-4 Citation / Provenance Boundary
PK-5 Revision / Durable Page Boundary
PK-6 Family Convergence / Expansion Boundary
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Exact promoted profile

MF-6 does not promote every conceivable PUBLIC_KNOWLEDGE capability.

The exact certified fanout profile is:

```text
PublicKnowledgeFanoutScopeProfileV1
  family = PUBLIC_KNOWLEDGE
  scopeProfile = CURRENT_ROOT_SIBLING_SNAPSHOT
  rootProfile = DIRECT_B_ROOT_HANDOFF_EVIDENCE
  runtimeMode = C
  sourceAuthorityClass = HANDOFF_EVIDENCE
  lifetime = CURRENT_PROJECTION_ONLY
  pageLifetime = CURRENT_PROJECTION_ONLY
  semanticInteraction = READ_ONLY
  presentationInteraction = VIEW_LOCAL_ONLY
  adapterKey = PUBLIC_REFERENCE_DOCUMENT_V1
  retrieval = NONE
  revisionHistory = NONE
  mutation = NONE
  sourceHistory = NONE
  contextReentry = NONE
  networkFetch = NONE
  backgroundRefresh = NONE
  externalMedia = NONE
  durablePageIdentity = NONE
  crossFamilyDerivedPropagation = NONE
```

Canonical rule:

```text
PUBLIC_KNOWLEDGE FANOUT ELIGIBLE
MEANS THIS EXACT DIRECT-B SNAPSHOT PROFILE ONLY
```

## 3. Effective MF-1 registry amendment

Effective after MF-6, the conceptual fanout registry becomes:

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
  review = MF-5 PASS

NEWS
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT

PUBLIC_KNOWLEDGE
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT
  profile = PUBLIC_KNOWLEDGE_DIRECT_B_PUBLIC_REFERENCE_SNAPSHOT_V1
  rootProfile = DIRECT_B_ROOT_HANDOFF_EVIDENCE
  review = MF-6 PASS
```

This is an amendment to the effective registry state, not a rewrite of the historical MF-1 initial-registry record.

Canonical rule:

```text
MF-1 INITIAL STATE
+
MF-6 SUCCESSFUL ENTRY REVIEW
→ EFFECTIVE PUBLIC_KNOWLEDGE STATE = ELIGIBLE FOR EXACT PROFILE
```

## 4. Five eligible families do not imply one universal eligibility profile

After MF-6, the registry recognizes five fanout-eligible family profiles:

```text
LIVE_REACTION
BOARD
SOCIAL_FEED
NEWS
PUBLIC_KNOWLEDGE
```

However, eligibility remains profile-specific.

PUBLIC_KNOWLEDGE has a stricter root requirement:

```text
DIRECT_B_ROOT_HANDOFF_EVIDENCE
```

Therefore:

```text
FAMILY IS ELIGIBLE
!=
FAMILY IS ELIGIBLE FOR EVERY CURRENT ROOT
```

A fanout containing PUBLIC_KNOWLEDGE must satisfy the PK root profile in addition to the common MF-1 conditions.

## 5. Structural admission consequences

After MF-6, examples that may be structurally admissible when the common root is a compatible direct-B HANDOFF_EVIDENCE root include:

```text
[NEWS, PUBLIC_KNOWLEDGE]
[SOCIAL_FEED, PUBLIC_KNOWLEDGE]
[BOARD, PUBLIC_KNOWLEDGE]
[LIVE_REACTION, PUBLIC_KNOWLEDGE]

[LIVE_REACTION, BOARD, SOCIAL_FEED, NEWS, PUBLIC_KNOWLEDGE]
```

This does not mean execution budget admission will pass.

MF-3 remains a distinct second-stage gate.

Canonical distinction:

```text
MF-6 REGISTRY ELIGIBILITY
!= MF-3 EXECUTION-BUDGET ADMISSION
```

## 6. Root-profile mismatch remains atomic plan failure

If a current fanout intent includes PUBLIC_KNOWLEDGE but the selected source root does not satisfy the certified direct-B root profile, the plan remains structurally unsupported.

Examples:

```text
A-root + PUBLIC_KNOWLEDGE
INLINE_C ancestry + PUBLIC_KNOWLEDGE
multi-root aggregation + PUBLIC_KNOWLEDGE
historical source root + PUBLIC_KNOWLEDGE
```

MF-1 may use its existing conceptual scope reason:

```text
PLAN_DENY_FAMILY_INELIGIBLE_FOR_SCOPE
```

No silent behavior such as:

```text
[BOARD, PUBLIC_KNOWLEDGE]
→ root incompatible with PK
→ silently run BOARD only
```

is permitted.

Plan admission remains atomic.

## 7. Registry eligibility does not create settlement authority

This is the central MF-6 invariant.

```text
PUBLIC_KNOWLEDGE registry state = ELIGIBLE
```

means only:

```text
the exact V1 profile may legally participate in a current sibling fanout plan
```

It does not mean:

```text
claims are settled
claims are true
settlement context exists
settlement producer exists
PK will render
PK has runtime support
```

Canonical rule:

```text
FANOUT ELIGIBILITY
!= PUBLIC-REFERENCE SETTLEMENT
```

## 8. MF-2 shared current authority integration

PUBLIC_KNOWLEDGE joins MF-2 through a family-specific least-authority current view.

Conceptual view:

```text
PublicKnowledgeCurrentAuthorityViewV1
  family = PUBLIC_KNOWLEDGE
  sourceAuthorityRef
  relationshipCore
  rootProfile = DIRECT_B_ROOT_HANDOFF_EVIDENCE
  currentProjectionOnly = true
```

`relationshipCore` is projected from the trusted family-neutral current relationship authority.

The view proves the current root relationship required by PK.

It does not contain sibling semantic payloads.

## 9. PK-private trusted authority inputs

The following must remain PUBLIC_KNOWLEDGE lane-private rather than becoming generic shared fanout authority:

```text
PublicKnowledgeSettlementContextV1
PublicKnowledgeDocumentTargetContextV1
PUBLIC_KNOWLEDGE assertion / Exposure policy contexts
settlementBasisRef exact-join inputs
reference-state compatibility inputs
optional trusted claim-support / citation contexts
PUBLIC_KNOWLEDGE validation receipt
```

Canonical rule:

```text
SHARED CURRENT ROOT
!= SHARED SETTLEMENT AUTHORITY
!= SHARED DOCUMENT TARGET AUTHORITY
```

Sibling lanes do not receive PK settlement state merely because they share the current root.

## 10. Settlement context producer remains an explicit runtime obligation

PK standalone design freezes `PublicKnowledgeSettlementContextV1` as a trusted consumer boundary.

It does not claim a production producer already exists.

MF-6 therefore freezes this status distinction:

```text
PUBLIC_KNOWLEDGE FANOUT DESIGN COMPATIBILITY = PASS
TRUSTED SETTLEMENT CONTEXT PRODUCER = RUNTIME OBLIGATION
```

Before runtime ACTIVE_MULTI can legally produce settled/attributed/contested/corrected/withdrawn PK reference semantics, a trusted bounded settlement-context producer must be separately authorized and proven.

MF-6 does not implement or authorize that producer.

## 11. Missing settlement context is family-local, not a sibling fallback trigger

If the current fanout is otherwise valid but PUBLIC_KNOWLEDGE lacks compatible trusted settlement context:

```text
LIVE_REACTION → may succeed
BOARD         → may succeed
SOCIAL_FEED   → may succeed
NEWS          → may succeed
PUBLIC_KNOWLEDGE → HOLD_UNKNOWN_SETTLEMENT / WITHHELD
```

Forbidden fallback:

```text
PK settlement context missing
→ use NEWS article as settlement evidence
```

or:

```text
PK settlement context missing
→ count sibling agreement
→ settle claim heuristically
```

Canonical rule:

```text
MISSING PK AUTHORITY
→ PK HOLDS
NOT
→ SIBLING AUTHORITY SUBSTITUTION
```

## 12. Trusted document target remains independent

PUBLIC_KNOWLEDGE document identity comes from trusted current target context, conceptually:

```text
PublicKnowledgeDocumentTargetContextV1
  targetRef
  displayLabel
```

The following cannot create or repair `targetRef`:

```text
NEWS headline
BOARD title/body
SOCIAL_FEED handle/post text
LIVE_REACTION text
model-generated wiki title
presentation stack label
old PUBLIC_KNOWLEDGE card
```

Canonical rule:

```text
VISIBLE LABEL
!= DOCUMENT IDENTITY AUTHORITY
```

If target authority is missing or incompatible, the PK lane fails/holds locally under its family contract.

## 13. Sibling outputs remain forbidden settlement evidence

PUBLIC_KNOWLEDGE must not consume as settlement authority:

```text
LIVE_REACTION accepted assertions
BOARD accepted posts/replies
SOCIAL_FEED POST/REPLY/REPOST/QUOTE objects
NEWS headline/body assertions
NEWS reportKind
NEWS publication maturity
sibling validation receipts
sibling render state
sibling visible counts
sibling agreement/repetition
sibling chronological order
```

Canonical invariants remain:

```text
NEWS REPORT EXISTS
!= PUBLIC KNOWLEDGE SETTLED

SOCIAL ATTENTION
!= PUBLIC KNOWLEDGE SETTLED

BOARD DISCUSSION
!= PUBLIC KNOWLEDGE SETTLED

LIVE REACTION FREQUENCY
!= PUBLIC KNOWLEDGE SETTLED

MULTI-FAMILY AGREEMENT
!= PUBLIC KNOWLEDGE SETTLED
```

## 14. Same-event sibling fanout remains legal

One trusted current event E may independently support:

```text
E
├→ LIVE_REACTION
├→ BOARD
├→ SOCIAL_FEED
├→ NEWS
└→ PUBLIC_KNOWLEDGE
```

Each lane consumes its own authorized view and trusted family-private contexts.

The PK lane does not consume the derived sibling objects.

Therefore this remains:

```text
CURRENT-ROOT SIBLING FANOUT
```

not:

```text
DERIVED-TO-DERIVED PUBLICATION LINEAGE
```

## 15. Reference states remain validator-owned

PUBLIC_KNOWLEDGE reference states remain:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

They are derived from trusted PK settlement inputs by the PK validator.

They are not model declarations, renderer declarations, or cross-family aggregation results.

Canonical rule:

```text
SIBLING SURFACE STATE
DOES NOT OWN PK REFERENCE STATE
```

## 16. NEWS maturity remains orthogonal

NEWS publication maturity and PK settlement answer different questions.

```text
NEWS maturity
= may NEWS report this detail now?

PK settlement
= how may this claim appear in a public-reference document?
```

Therefore:

```text
NEWS = FOLLOWUP_ANALYSIS
```

or another mature NEWS state does not imply:

```text
PK = SETTLED_PUBLIC_REFERENCE
```

Likewise a PK settled reference does not retroactively change NEWS maturity.

## 17. SOCIAL_FEED propagation remains orthogonal

SOCIAL_FEED graph structure may show:

```text
POST
REPLY
REPOST
QUOTE
```

Those relationships remain social semantics only.

Neither graph degree nor repeated propagation upgrades PK settlement.

Even if future legitimate social metrics exist:

```text
viral
widely reposted
high engagement
```

would remain distinct from:

```text
SETTLED_PUBLIC_REFERENCE
```

## 18. Exposure remains a prerequisite

MF-6 preserves PK validation ordering:

```text
current source support
→ Exposure/assertion eligibility
→ settlement exact join / compatibility
→ document construction
→ support-at-use
→ presentation
```

Settlement can never launder an unexposed assertion.

Forbidden:

```text
private / unexposed fact
+ trusted-looking settlement state
→ ordinary public-reference fact
```

The same rule applies even when sibling families show related public material.

## 19. Cross-family publication lineage remains MF-7-only

The following are outside MF-6:

```text
BOARD derived object
→ NEWS derived object
→ PUBLIC_KNOWLEDGE derived object
```

```text
SOCIAL_FEED post object
→ PK settlementBasisRef authority
```

```text
NEWS article object
→ PK claimSupportRef lineage authority
```

when the derived object itself is intended to become a formal parent/provenance input for the next derived object.

That is `CROSS_FAMILY_PUBLICATION_LINEAGE` and remains MF-7 / Candidate C C5 territory.

Even after a future C5 design:

```text
UPSTREAM DERIVED OBJECT EXISTS
!= PUBLIC_KNOWLEDGE SETTLED
```

must remain true.

## 20. PK citation/provenance remains additive and family-local

PK-4 citation concepts remain separate:

```text
settlementBasisRef
!= claimSupportRef
!= citationRef
!= render-local citation marker
```

Sibling links, labels, source names, or article presentation do not become PK citation provenance by string similarity.

Citation validation failure may remain PK-local when settlement/semantic validity otherwise survives under PK-4 rules.

The renderer may not invent replacement citations.

## 21. MF-3 family budget profile requirement

MF-6 adds PUBLIC_KNOWLEDGE to the set of families for which a trusted MF-3 family budget profile must exist before ACTIVE_MULTI runtime execution may include it.

Conceptually:

```text
FanoutFamilyBudgetProfileCatalogV1
  LIVE_REACTION     → profile
  BOARD             → profile
  SOCIAL_FEED       → profile
  NEWS              → profile
  PUBLIC_KNOWLEDGE  → profile REQUIRED BEFORE RUNTIME
```

The PUBLIC_KNOWLEDGE profile must eventually provide finite upper bounds compatible with at least:

```text
assertion count
aggregate assertion characters
fixed section-role structure
settlement context/basis joins
validation receipt entries
optional citation attachments
presentation nodes
model input/output contribution when topology accounting applies
model-call contribution when topology accounting applies
```

MF-6 freezes no numeric values.

## 22. Five eligible families do not freeze a runtime family-count cap

After MF-6, five family profiles are structurally eligible.

This does not silently set:

```text
MAX_FAMILIES_PER_FANOUT = 5
```

MF-3 still owns concrete runtime caps.

Therefore:

```text
[LIVE_REACTION, BOARD, SOCIAL_FEED, NEWS, PUBLIC_KNOWLEDGE]
→ structurally legal on compatible direct-B root
→ shared authority binding possible
→ MF-3 may still reject execution
```

Canonical rule:

```text
REGISTRY CARDINALITY
!= RUNTIME EXECUTION CAP
```

## 23. No budget borrowing

PUBLIC_KNOWLEDGE receives its own trusted reservation.

It may not:

```text
borrow unused NEWS semantic allowance
borrow unused SOCIAL_FEED presentation allowance
expand because BOARD returned empty
add more assertions because LIVE_REACTION was short
```

MF-3 non-borrowing remains authoritative.

## 24. PK family-bound exceedance

If PUBLIC_KNOWLEDGE exceeds its native family bound after valid aggregate execution admission:

```text
PUBLIC_KNOWLEDGE FAMILY_BOUND_EXCEEDED
→ PK family result invalid / quarantined
→ no arbitrary semantic truncation
→ sibling family results may remain valid when control-plane integrity remains sound
```

The system must not remove status-bearing clauses or qualifiers merely to fit the budget.

For example, blindly truncating a contested/corrected/withdrawn reference statement could reverse its epistemic meaning.

## 25. MF-4 canonical stack order amendment

Effective multi-family presentation order becomes:

```text
LIVE_REACTION
BOARD
SOCIAL_FEED
NEWS
PUBLIC_KNOWLEDGE
```

This preserves the relative order frozen before MF-6:

```text
LIVE_REACTION < BOARD < SOCIAL_FEED < NEWS
```

and inserts PUBLIC_KNOWLEDGE after NEWS.

Conceptual canonical ranks after MF-6:

```text
LIVE_REACTION    = 0
BOARD            = 1
SOCIAL_FEED      = 2
NEWS             = 3
PUBLIC_KNOWLEDGE = 4
```

Only renderable or family-contract-valid empty surfaces appear.

## 26. PUBLIC_KNOWLEDGE last does not mean final truth

The presentation sequence expresses a stable reading grammar:

```text
immediate reaction
→ discussion/thread
→ social propagation/commentary
→ publication/reporting
→ public-reference projection
```

It does not express epistemic dominance.

Canonical rules:

```text
DISPLAY ORDER
!= TRUTH RANK
!= CONFIDENCE RANK
!= SETTLEMENT RANK
!= SOURCE AUTHORITY RANK
```

PUBLIC_KNOWLEDGE appearing last must not be presented as a magically authoritative final answer.

A contested PK record may remain contested even if NEWS above it states a claim more simply.

## 27. PUBLIC_KNOWLEDGE stack slot

MF-4 current cardinality extends to:

```text
one current stack
→ at most one PUBLIC_KNOWLEDGE ordinary slot
```

Conceptual ownership grammar:

```text
[data-simcore-source-stack="multi-family"]
  ...
  [data-simcore-source-slot="public-knowledge"]
    [data-simcore-source-family="public-knowledge"]
  ...
```

The slot and any `renderInstanceKey` are presentation identity only.

They do not create durable page identity.

## 28. PK presentation states in the stack

MF-4 classification applies.

### READY

```text
validated PK document
+ legal PUBLIC_REFERENCE_DOCUMENT_V1 adapter/policy
→ PUBLIC_KNOWLEDGE slot eligible
```

### EMPTY

Only a PK-semantic-contract-valid empty reference projection may produce a deterministic empty PK surface.

### WITHHELD

Examples:

```text
UNKNOWN settlement
missing compatible settlement context
no renderable surviving assertions after policy quarantine
unsupported PK-local semantic scope
```

must not be disguised as a generic empty encyclopedia page.

### FAILED_PRE_MOUNT / presentation failure

Adapter/policy/read-model/mount failure remains presentation failure and must not rewrite settlement semantics.

## 29. Status-preserving presentation is mandatory

For PK states:

```text
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

ordinary presentation must preserve a visible textual/structural distinction.

The multi-family stack must not flatten them because sibling surfaces use plainer styles.

Forbidden:

```text
PK = CONTESTED
NEWS = plain report
→ stack normalizes PK into plain settled-looking paragraph
```

Canonical rule:

```text
STACK COMPOSITION
MAY NOT ERASE PK EPISTEMIC STATUS
```

## 30. Family-local semantic failure matrix

PUBLIC_KNOWLEDGE-local semantic/policy outcomes include:

```text
missing/incompatible settlement context
settlementBasisRef exact-join failure
UNKNOWN_SETTLEMENT
unsupported reference assertion mode
Exposure DENY/HOLD
trusted target missing/mismatch
assertion quarantine
section/document structural invalidity
PUBLIC_KNOWLEDGE family-bound exceedance
optional citation quarantine
```

When MF-1/MF-2/MF-3 common integrity remains valid:

```text
PUBLIC_KNOWLEDGE withheld/quarantined
→ sibling semantic lanes may remain valid
```

No sibling result may be used to repair PUBLIC_KNOWLEDGE.

## 31. Family-local presentation failure matrix

PUBLIC_KNOWLEDGE-local presentation failures include:

```text
PUBLIC_REFERENCE_DOCUMENT_V1 adapter failure
presentation input invariant failure
PK family slot mount failure
PK family CSS isolation failure
optional citation presentation failure
```

When isolatable:

```text
PK presentation fails closed
→ PK validated semantic result unchanged
→ sibling semantic results unchanged
→ sibling presentation may remain mounted
```

## 32. Common integrity failures remain common

The following remain common fanout/stack failures where applicable:

```text
shared sourceAuthorityRef mismatch
current source reroll/replacement invalidating common root
multi-authority corruption
admitted-plan mutation/corruption
lane writing sibling result slots
aggregate execution-budget integrity breach
stale generation owning stack root
wrong assistant message owning stack root
common stack disposal ownership corruption
```

MF-6 does not downgrade these into PK-local failures.

## 33. Source replacement invalidates the old PK sibling projection

If the common direct-B source root is replaced or rerolled:

```text
old LIVE_REACTION       invalid
old BOARD               invalid
old SOCIAL_FEED         invalid
old NEWS                invalid
old PUBLIC_KNOWLEDGE    invalid
```

for whichever siblings existed in the current fanout.

PUBLIC_KNOWLEDGE V1 does not preserve an old page independently after source replacement.

That would require durable/historical page design and Candidate C reassessment.

## 34. Collapse remains presentation-only

Collapsing the PUBLIC_KNOWLEDGE slot is:

```text
VIEW_LOCAL_ONLY
```

It must not:

```text
change reference state
change settlement evidence
return MF-3 budget to siblings
remove PK from the admitted semantic plan
persist page state
create durable page identity
enter PK content into future model context
```

`VIEW COLLAPSE != SEMANTIC SETTLEMENT` remains implicit in the presentation boundary.

## 35. PK durability remains excluded

MF-6 does not activate any PK-5 durable profile.

Still inactive:

```text
PK-D1 DURABLE_PAGE_IDENTITY
PK-D2 REVISIONED_PAGE
PK-D3 HISTORICAL_PAGE
PK-D4 CONTEXTUAL_DURABLE_PAGE
```

Likewise the PK-X expansion registry remains inactive.

Fanout entry does not turn a current reference snapshot into a wiki database.

## 36. Search / retrieval remains absent

PUBLIC_KNOWLEDGE fanout entry does not authorize:

```text
page lookup
history scan
search index
old page retrieval
cross-turn title matching
fuzzy source recovery
```

A rendered old PK surface does not become future semantic input or a settlement source.

## 37. Metrics and media remain absent

MF-6 does not add:

```text
page views
revision count
reference count
watch count
trust score
confidence score
```

and does not add:

```text
external image fetch
semantic media
maps
diagrams
public-record scans
late exact-page media attachment
```

Any future semantic/delayed media requires its own authority contract; delayed exact-object attachment may activate Candidate C C8.

## 38. Candidate C final MF-6 decision

For the exact promoted snapshot profile:

```text
C1 cross-turn derived survival       = NO
C2 stable derived identity           = NO
C3 item/page mutation                = NO
C4 append/merge/revision             = NO
C5 derived-to-derived propagation    = NO
C6 future context re-entry           = NO
C7 partial historical survival       = NO
C8 delayed exact-object effect       = NO
```

Final MF-6 verdict:

```text
PUBLIC_KNOWLEDGE SNAPSHOT FANOUT ENTRY
DOES NOT REQUIRE CANDIDATE C
```

## 39. Candidate C reopen triggers

Before any of the following, the relevant durable-derived-object design must reopen:

```text
same PK page across turns
stable page identity
revision/edit/restore
historical page retrieval
append/merge previous PK projection
BOARD → NEWS → PK formal derived lineage
SOCIAL_FEED → PK formal derived lineage
old PK content re-enters future model context
partial descendant/revision survival
late media attaches to exact old PK page/revision
```

Do not reuse current snapshot `targetRef`, presentation slots, or render keys as shortcuts for durable identity.

## 40. Cross-family propagation remains deferred to MF-7

MF-6 completes family entry only.

It does not authorize propagation.

MF-7 must separately decide whether any concrete cross-family derived lineage should exist at all.

The current safe default remains:

```text
SIBLING FANOUT = YES
DERIVED FAMILY → DERIVED FAMILY AUTHORITY = NO
```

and:

```text
CANDIDATE C C5 = NOT ACTIVATED
```

## 41. No automatic fanout authorization

Promoting PUBLIC_KNOWLEDGE to `ELIGIBLE` does not make it automatically active.

Still forbidden:

```text
NEWS exists
→ automatically add PUBLIC_KNOWLEDGE

old PK card visible
→ activate PK next turn

model thinks encyclopedia view is useful
→ add PK

word "wiki" appears in narrative
→ naive PK activation
```

MF-1 current activation authority remains required.

Canonical rule:

```text
REGISTRY ELIGIBLE
!= AUTOMATICALLY REQUESTED
```

## 42. Source-irrelevant dormancy remains exact

When no current PUBLIC_KNOWLEDGE source job is admitted:

```text
PK settlement composition = 0
PK target-context work = 0
PK semantic draft generation = 0
PK validation = 0
PK citation work = 0
PK presentation build = 0
PK history/retrieval = 0
PK persistence = 0
PK network/media = 0
PK extra model call = 0
```

The presence of a PK registry entry adds no ordinary source semantic burden.

## 43. Failure-axis separation remains intact

MF-6 preserves distinct axes:

```text
SOURCE SUPPORT INVALIDATION
EXPOSURE / ASSERTION POLICY
PUBLIC-REFERENCE SETTLEMENT
PK DOCUMENT STRUCTURE
OPTIONAL CITATION VALIDATION
PRESENTATION FAILURE
COMMON MULTI-FAMILY CONTROL-PLANE INTEGRITY
```

No axis may silently substitute for another.

Examples:

```text
citation exists
!= settlement

settlement exists
!= exposure

presentation looks authoritative
!= settlement

sibling consensus
!= settlement
```

## 44. Effective Multi-Family family set after MF-6

The design-time eligible family set is now:

```text
LIVE_REACTION
BOARD
SOCIAL_FEED
NEWS
PUBLIC_KNOWLEDGE
```

with the important qualifier:

```text
PUBLIC_KNOWLEDGE eligibility
= DIRECT_B_ROOT_HANDOFF_EVIDENCE snapshot profile only
```

No family becomes authority for another merely by being co-rendered.

## 45. Runtime-readiness obligations preserved

MF-6 registry promotion is not runtime readiness.

Before runtime implementation/validation claims are legal, relevant obligations include at minimum:

```text
current source-job selector authority
exact direct-B PK source-authority binding
trusted PublicKnowledgeSettlementContextV1 producer
trusted PublicKnowledgeDocumentTargetContextV1 producer
structured semantic producer/transport
PK validator implementation
finite PK native budget profile
finite aggregate MF hard caps
PUBLIC_REFERENCE_DOCUMENT_V1 implementation
Presentation Host mount authority
source-irrelevant dormancy instrumentation
model-compliance evidence
long-chat / reroll / replacement evidence
cross-family sibling-isolation evidence
status-preserving presentation evidence
```

None is granted by MF-6.

## 46. Future validation scenarios

A later implementation workstream should include at least:

```text
K0 non-source long chat remains dormant
K1 direct-B PK single-family snapshot
K2 NEWS + PK same-root sibling fanout
K3 SOCIAL_FEED + NEWS + PK same-root fanout
K4 full structurally eligible five-family request under bounded caps
K5 PK settlement context absent while siblings succeed
K6 PK contested/corrected/withdrawn status preserved beside plain sibling content
K7 sibling repetition cannot upgrade PK settlement
K8 non-direct-B plan containing PK is atomically denied
K9 PK family-local adapter failure preserves sibling surfaces
K10 common source reroll invalidates old PK sibling projection
K11 collapse/reload does not create PK source memory
K12 no cross-family derived object enters PK settlement basis without MF-7/C5 authority
```

These are future acceptance lanes, not evidence already collected.

## 47. MF-6 completion verdict

Final design verdict:

```text
PUBLIC_KNOWLEDGE_DIRECT_B_PUBLIC_REFERENCE_SNAPSHOT_V1
= FANOUT ELIGIBLE
```

with these permanent V1 safety conditions:

```text
settlement authority = PK lane-private
trusted target authority = PK lane-private
sibling results = not PK settlement evidence
root profile = direct-B HANDOFF_EVIDENCE only
lifetime = current projection only
interaction = read/view-local only
budget = finite profile required before runtime
presentation = status-preserving family-native adapter
cross-family propagation = none
Candidate C = not activated
```

## 48. Next checkpoint

After MF-6:

```text
MF-0 Master Design                         DONE
MF-1 Fanout Plan + Registry                DONE
MF-2 Shared Authority + Lane Isolation     DONE
MF-3 Aggregate Budget + Failure Matrix     DONE
MF-4 Presentation Stack                    DONE
MF-5 SOCIAL_FEED Fanout Entry              DONE
MF-6 PUBLIC_KNOWLEDGE Fanout Entry         DONE
MF-7 Cross-Family Propagation Reassessment NEXT
MF-8 Multi-Family Convergence              LATER
```

MF-7 must not assume propagation is desirable merely because all five snapshot families are now fanout-compatible.

## 49. No implementation authority

This design is not permission to implement or deploy Multi-Family orchestration or PUBLIC_KNOWLEDGE.

It does not change production runtime authority.

`release-simcore` remains authoritative until a separate implementation/release workstream is explicitly authorized.