# SimCore Post-3.0M Candidate C CC-6 Derived-to-Derived Lineage Design — 2026-09-02

Date: 2026-09-02 KST

Status: **CC-6 DESIGN FROZEN · DERIVED ATTRIBUTION LINEAGE CONTRACT · C5 DESIGN LANE OPEN · ONE-PARENT / ONE-HOP FIRST SCOPE · DESIGN-ONLY · NO CROSS-FAMILY RUNTIME PROPAGATION · NO GENERIC PROVENANCE GRAPH · NO NEW MODEL CALL · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · CANDIDATE C · CC-6 · DERIVED-TO-DERIVED LINEAGE · ATTRIBUTION · C5 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

CC-6 freezes the minimum lineage contract required when one durable derived source object is intentionally used as an attributed semantic basis for a later derived source object.

The motivating example is:

```text
BOARD entry R
  "X라는 주장이 돌고 있다"
        ↓
NEWS story N
  "온라인 게시판에서 X라는 주장이 확산되고 있다"
```

The purpose is to preserve **where a derived claim came from** without converting the parent derived claim into canonical world truth.

CC-6 answers:

```text
when may one derived object become an attributed input to another derived object?
what exact parent identity/revision must be captured?
what semantic proposition does the parent lineage actually support?
how is "source said X" separated from "X is true"?
what happens when the parent is edited, rerolled, replaced, corrected, or retired?
how long must an exact parent revision remain inspectable while a child depends on it?
how does a child re-prove lineage support at later use?
when does model-visible parent content additionally require CC-4 context re-entry?
how are lineage depth, fan-in, lookup cost, and invalidation blast radius bounded?
```

CC-6 does **not** implement cross-family propagation, a provenance graph database, background fanout, automatic NEWS generation, model calls, source-history scans, mutation cascades, parent-to-child truth promotion, PUBLIC_KNOWLEDGE settlement, or release changes.

## 1. Authority chain

CC-6 consumes:

```text
SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01
SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC4_CONTROLLED_CONTEXT_REENTRY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC5_ITEM_MUTATION_APPEND_RECONCILIATION_DESIGN_2026-09-02
SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01
SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01
SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01
SIMCORE_3M_8_NEWS_PUBLICATION_MATURITY_DESIGN_2026-09-01
SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01
Lineage / Handoff / Evidence current source-support ownership
family validators / publication-maturity ownership
Prompt / request-assembly ownership
```

Inherited rules remain:

```text
persistence != canonical truth
found-by-ID != supported-for-use
same durable ID != same revision
historical attribution != current truth
one family result != sibling truth authority
C5 derived lineage != C6 automatic model-context re-entry
C5 derived lineage != C7 descendant-survival authority
cross-family source data may not silently replace current Lineage/Handoff/Evidence authority
```

## 2. Capability profile

CC-6 opens the Candidate C derived-lineage design lane only.

```text
C1 survival         = YES, parent/child may outlive current projection
C2 stable identity  = YES for parent/child lineage targets
C3 item mutation    = INHERITS CC-5 DESIGN-OPEN STATE, not expanded here
C4 append/merge     = INHERITS CC-5 DESIGN-OPEN STATE, not expanded here
C5 derived lineage  = YES, DESIGN CONTRACT ONLY
C6 context reentry  = INHERITS CC-4 DESIGN-OPEN STATE; required only if model must see durable parent content
C7 partial survival = NO
C8 delayed effect   = NO
```

Canonical rule:

```text
C5 DESIGN OPEN
!=
RUNTIME CROSS-FAMILY PROPAGATION AUTHORIZED
```

## 3. Primary decision

Selected first architecture:

```text
EXACT_PARENT_DERIVED_ATTRIBUTION
+
EXACT_PARENT_REVISION_BINDING
+
CLAIM_SCOPED_DEPENDENCY_SURFACE
+
NO_TRUTH_PROMOTION
+
SUPPORT_AT_CHILD_USE
+
BOUNDED_PARENT_REVISION_RETENTION
+
ONE_PARENT / ONE_HOP FIRST SCOPE
```

The first supported semantic relation is **attribution**.

CC-6 does not freeze a generic provenance DAG or arbitrary transform graph.

## 4. Candidate C lineage is not canonical lineage

Existing Lineage / Handoff / Evidence answer questions such as:

```text
what current source/world evidence supports this source projection?
what is the current trusted root/parent relationship?
```

CC-6 derived lineage answers a narrower question:

```text
which earlier durable derived object is this later derived statement explicitly attributing or discussing?
```

Canonical firewall:

```text
CURRENT SOURCE SUPPORT AUTHORITY
!=
DERIVED ATTRIBUTION LINEAGE
```

The second may reference the first through parent support-at-use checks, but may not replace it.

## 5. First semantic relation

CC-6 V1 freezes one relation class:

```text
ATTRIBUTED_DERIVED_CLAIM
```

Meaning:

```text
child derived source communicates that
an exact parent derived source object/revision
contained, expressed, reported, or circulated
some bounded semantic claim
```

Examples:

```text
BOARD post P said/rumored X
→ NEWS reports that BOARD users are claiming X

SOCIAL post S said X
→ future NEWS reports that account/source S claimed X
```

The SOCIAL example is future-family illustrative only. The first concrete pair is defined later in this document.

## 6. Unsupported relation classes

CC-6 V1 does not authorize generic relations such as:

```text
SUMMARIZED_FROM
INFERRED_FROM
AGGREGATED_FROM
CONFIRMED_BY
CANONICALIZED_FROM
LIKELY_SAME_AS
SEMANTICALLY_SIMILAR_TO
```

These would require separate semantic-transform and validation contracts.

Canonical rule:

```text
DERIVED LINEAGE V1
= ATTRIBUTION
!= ARBITRARY SEMANTIC TRANSFORMATION
```

## 7. The central proposition split

Suppose parent Board object P says:

```text
"X happened"
```

There are two different propositions:

```text
WORLD PROPOSITION
W = X happened

ATTRIBUTION PROPOSITION
A = Board object P said/reported/rumored that X happened
```

CC-6 lineage can support **A** when its exact parent revision and historical/current integrity are proven.

It does not by itself support **W**.

Canonical rule:

```text
PARENT DERIVED OBJECT SUPPORTS ATTRIBUTION ABOUT ITSELF
NOT THE UNDERLYING WORLD CLAIM BY DEFAULT
```

## 8. Meta-fact can be confirmed while underlying claim remains attributed

A child may sometimes treat this as confirmed:

```text
"Board post P contained claim X"
```

if the historical/current parent record, exposure, and child policy prove that statement-event proposition.

That does **not** permit:

```text
"X happened"
```

as `CONFIRMED_FACT` unless independent current authority supports X.

Therefore:

```text
CONFIRMED FACT ABOUT ATTRIBUTION EVENT
!=
CONFIRMED UNDERLYING CLAIM
```

## 9. No epistemic-strength laundering

Forbidden transformations include:

```text
BOARD RUMOR X
→ NEWS DIRECT_REPORT X as fact

BOARD ATTRIBUTED_SOCIAL X
→ NEWS headline X without attribution

multiple derived sources repeat X
→ X becomes canonical

persistent source says X for many turns
→ X becomes canonical
```

Repeated derivation is not independent evidence.

```text
N DERIVED COPIES OF ONE CLAIM
!=
N INDEPENDENT WORLD AUTHORITIES
```

## 10. Child keeps independent current source authority

A derived parent does not bootstrap a child source family into existence.

First-safe flow:

```text
current request / feature task
        ↓
current child-source job independently authorized
        ↓
current child-source authority / timing / reachability established
        ↓
optional exact derived parent attribution selected
        ↓
CC-6 lineage gate
        ↓
child family validation
```

Forbidden flow:

```text
old BOARD exists in history
→ therefore generate NEWS now
```

Canonical rule:

```text
DURABLE PARENT EXISTS
!=
CURRENT CHILD SOURCE JOB EXISTS
```

This preserves CC-4 current-request gating and 3M-9 dormancy.

## 11. Dual authority axes

A child derived object that uses CC-6 has at least two independent authority axes:

```text
A. CHILD CURRENT SOURCE AUTHORITY
   current Handoff / Evidence / time / reachability / family policy

B. DERIVED PARENT ATTRIBUTION BASIS
   exact durable parent identity + revision + retained integrity/support
```

Axis B may support the attribution proposition.

It cannot substitute for Axis A.

Likewise Axis A does not prove the historical parent said what the child attributes to it.

## 12. No derived parent inside `sourceAuthorityRef`

CC-6 does not overload the existing trusted `sourceAuthorityRef` with a durable derived object locator.

Conceptual separation remains:

```text
child sourceAuthorityRef
→ existing current source-support ownership

derivedParentRef
→ Candidate C attribution lineage
```

Canonical rule:

```text
DERIVED PARENT REF
!=
HANDOFF / EVIDENCE SOURCE AUTHORITY REF
```

## 13. `derivedParentRef` conceptual vocabulary

CC-6 freezes common conceptual fields, not one universal serialized schema.

A concrete consumer relation needs enough information equivalent to:

```text
parent owner scope
parent namespace
parent opaque object ID
exact parent semantic revision
relation kind = ATTRIBUTED_DERIVED_CLAIM
parent family/type
smallest parent semantic dependency surface
lineage use mode
```

The physical field names and serialization remain consumer-owned.

## 14. Exact parent identity

The parent must resolve through CC-1 durable identity.

Forbidden parent reconstruction:

```text
same title
same displayName
same content fingerprint
same transcript location
same old ordinal
semantic similarity
```

If exact parent identity cannot be resolved:

```text
LINEAGE_PARENT_UNRESOLVED
→ child lineage use not authorized
```

## 15. Exact parent revision

Every lineage edge binds to an exact observed semantic revision of the parent.

Conceptually:

```text
parent locator P
parent revision R7
```

not merely:

```text
whatever P means now
```

Reason:

Attribution is about what an exact durable source state expressed.

Canonical rule:

```text
LINEAGE PARENT ID WITHOUT REVISION
= INSUFFICIENT FOR MUTABLE PARENT
```

## 16. Parent revision is not automatically floating-latest

Forbidden default:

```text
child cites P@R7
P later becomes R8
→ silently reinterpret child's parent as P@R8
```

The child remains bound to R7 unless a new current reconciliation/mutation explicitly revalidates and commits a different parent basis.

## 17. Claim-scoped dependency surface

A child should depend on the smallest stable parent semantic unit that supports its attribution.

Preferred:

```text
exact BOARD post durable object/revision
```

instead of:

```text
whole BOARD thread
whole conversation
all source history
```

Canonical rule:

```text
MINIMIZE LINEAGE DEPENDENCY SURFACE
```

This reduces invalidation blast radius and prevents unrelated parent edits from forcing broad revalidation.

## 18. Container-level lineage is exceptional

A concrete consumer may later need a collection-level attribution such as:

```text
"this Board thread contained widespread discussion of X"
```

That is not equivalent to citing one exact post.

It must freeze:

```text
what members are part of the claim?
what ordering/count semantics matter?
what mutation invalidates the collection attribution?
what bounded evidence proves the aggregate claim?
```

CC-6 V1 does not infer this from arbitrary thread contents.

## 19. First lineage use modes

CC-6 freezes two use modes for the same exact parent revision.

```text
CURRENT_PARENT_ATTRIBUTION
HISTORICAL_PARENT_ATTRIBUTION
```

These differ in currentness requirements.

## 20. `CURRENT_PARENT_ATTRIBUTION`

Use when the child communicates that the parent **currently** carries/expresses the referenced claim.

Requirements:

```text
parent locator alive
exact bound revision is still current or explicitly compatible
parent support currently valid
parent semantic unit currently eligible for the claimed attribution
child current-source authority valid
child family policy valid
```

Parent revision advance is therefore normally a lineage-currentness break.

## 21. `HISTORICAL_PARENT_ATTRIBUTION`

Use when the child communicates the historical fact that the exact parent revision once contained/expressed the referenced claim.

Example:

```text
"당시 게시판 글에서는 X라는 루머가 돌았다"
```

Requirements include:

```text
exact historical parent revision retained with integrity
historical record identity valid
lineage lifetime still valid
child framing preserves historical attribution
underlying claim is not promoted to current truth
```

The parent does not need to remain a current live object for this historical proposition to remain meaningful.

## 22. Historical attribution does not resurrect current authority

Even if `P@R7` is retained and proves that P said X:

```text
P@R7 historical record exists
!=
P is currently live
!=
X is currently true
!=
X is currently exposed by all audiences
```

The child must preserve the historical/attributed nature of the statement.

## 23. Parent revision retention pressure

CC-3 default storage is `LATEST_COMMITTED_STATE_ONLY`.

CC-6 introduces one concrete justified reason to retain an older revision:

```text
an active lineage edge still binds to that exact parent revision
```

Selected first design:

```text
BOUNDED_LINEAGE_PARENT_REVISION_PIN
```

Meaning:

While a child lineage object is within its declared lifetime and historical attribution may need proof, the parent owner may retain the exact referenced revision under a bounded lineage-retention policy.

## 24. Pinning is not permanent history

A lineage parent pin must be bounded by the concrete child/consumer lifetime.

It does not authorize:

```text
retain all revisions forever
retain all source content forever
turn CC-3 into event sourcing
```

Required future limits include:

```text
max pinned parent revisions per consumer
max bytes per pinned revision or semantic unit
max child lifetime
cleanup when last dependent edge expires/retires
```

## 25. No hidden denied-content pinning

A lineage edge may pin only semantic material that was admitted under the parent durable-object contract.

Forbidden default:

```text
DENY/HOLD/quarantined secret body
→ preserve forever because a child tried to cite it
```

CC-6 cannot create a hidden archive of rejected content.

## 26. Exact revision retention versus copied witness

Two future implementation families are conceptually possible:

```text
A. retain exact parent revision under parent owner
B. create an immutable bounded claim-scoped witness
```

CC-6 V1 selects **A** as the first design posture.

Reason:

- preserves one semantic owner;
- avoids duplicated content becoming a second truth store;
- reuses CC-3 historical-retention semantics;
- keeps parent integrity proofs local to the parent owner.

A copied witness format would require a separate design.

## 27. Parent content access and CC-4

C5 lineage and C6 model-context re-entry remain independent capabilities.

If a child producer can construct/validate the child without showing durable parent content to a model, C6 need not be used.

If the Semantic Renderer/model must read prior durable parent semantic text to generate the child:

```text
C5 derived lineage
+
CC-4 controlled re-entry
```

are both required.

The parent content must then enter only as a bounded typed continuity/attribution slice under CC-4.

Canonical rule:

```text
LINEAGE EDGE EXISTS
!=
MODEL MAY READ FULL PARENT OBJECT
```

## 28. Parent text remains untrusted context data

When a parent slice enters model context under CC-4:

```text
stored parent source text
= untrusted attribution/reference data
!= prompt instruction authority
```

CC-4 delimiter/escaping/current-task-primacy rules remain mandatory.

## 29. Parent assertion mode must be preserved

A lineage consumer must preserve the epistemic status needed to prevent promotion.

Examples:

```text
parent = rumor / attributed claim
→ child may report that rumor/claim exists
→ child may not silently output underlying X as confirmed world fact

parent = opinion/inference
→ child may report that the parent expressed an opinion
→ child may not convert the opinion into fact
```

The exact family enums may differ, but the epistemic strength may not increase without independent authority.

## 30. NEWS report-kind mapping

For the first BOARD → NEWS attribution example, likely child report kinds include:

```text
ATTRIBUTED_CLAIM
RUMOR
```

Potential `DIRECT_REPORT` use is only for the meta-proposition that the Board discussion/claim exists, not for underlying X unless independently supported.

Canonical example:

```text
Board says "X happened" as rumor

LEGAL:
NEWS / RUMOR
"온라인 게시판에서 X라는 주장이 돌고 있다"

POTENTIALLY LEGAL META-FACT:
NEWS / DIRECT_REPORT
"온라인 게시판에 X를 주장하는 글이 게시됐다"

ILLEGAL WITHOUT INDEPENDENT SUPPORT:
NEWS / DIRECT_REPORT
"X happened"
```

## 31. NEWS maturity still applies

Derived lineage does not bypass 3M-8 publication maturity.

A NEWS child still requires:

```text
current NEWS source job
trusted publication maturity context
requested maturity ALLOW
headline/body exposure eligibility
story-atomic validation
```

Canonical rule:

```text
DERIVED ATTRIBUTION BASIS VALID
!=
NEWS READY TO PUBLISH IT NOW
```

## 32. Exposure still applies

The fact that a durable Board object exists in storage does not prove the child publication may expose it now.

The child attribution proposition and any quoted/derived semantic content must satisfy then-current exposure policy appropriate to the child source.

```text
PARENT WAS ONCE VISIBLE
!=
CHILD MAY REPUBLISH WITHOUT CURRENT POLICY
```

## 33. Child semantic validation remains family-native

CC-6 does not create a new universal child validator.

Flow:

```text
current child-source authority
+ exact derived parent lineage basis
+ child draft
        ↓
CC-6 lineage eligibility
        ↓
existing child family validator / policy
```

For NEWS, existing headline/body/maturity/story-atomic rules remain authoritative.

## 34. Child cannot self-declare lineage validity

The model/producer may propose attribution text but may not declare trusted fields equivalent to:

```text
parent exists
parent revision matches
parent was historically valid
lineage is current
safe to promote
lineage depth is safe
```

These are machine/policy-owner results.

## 35. First lineage receipt vocabulary

CC-6 freezes bounded disposition concepts, not a model-visible receipt schema.

Useful states include:

```text
LINEAGE_ALLOW_CURRENT_ATTRIBUTION
LINEAGE_ALLOW_HISTORICAL_ATTRIBUTION
LINEAGE_PARENT_UNRESOLVED
LINEAGE_PARENT_REVISION_UNAVAILABLE
LINEAGE_PARENT_REVISION_MISMATCH
LINEAGE_PARENT_SUPPORT_UNAVAILABLE
LINEAGE_PARENT_SUPPORT_MISMATCH
LINEAGE_SCOPE_UNSUPPORTED
LINEAGE_DEPTH_EXCEEDED
LINEAGE_FANIN_EXCEEDED
LINEAGE_PARENT_RETIRED_FOR_CURRENT_USE
LINEAGE_HISTORICAL_INTEGRITY_UNPROVEN
LINEAGE_CHILD_POLICY_BLOCKED
```

Receipts must not duplicate secret/quarantined parent content.

## 36. Parent edit semantics

Suppose child C binds to parent P@R7.

If parent receives `EDIT` and becomes R8:

### Current-parent child

```text
CURRENT_PARENT_ATTRIBUTION bound to R7
→ R7 no longer current
→ lineage currentness fails
→ child must be withheld/revalidated before current use
```

### Historical child

```text
HISTORICAL_PARENT_ATTRIBUTION bound to retained R7
→ may remain historically valid
```

provided R7 integrity and lineage lifetime remain proven.

## 37. Parent `REROLL_IN_PLACE`

Parent identity remains P but semantic revision advances materially.

Therefore:

```text
current attribution to old revision
→ invalid/revalidation required

historical attribution to retained old revision
→ may remain historical
```

The old child may not silently float to the rerolled content.

## 38. Parent `REROLL_REPLACE`

Parent P is replaced by new logical object Q.

Rules:

```text
old lineage edge remains bound to P@R
it does not retarget to Q
```

Current-parent use becomes invalid because P retired/replaced.

Historical attribution may remain valid if exact P@R is retained under historical lineage policy.

Canonical rule:

```text
REPLACEMENT SIMILARITY
DOES NOT RETARGET LINEAGE
```

## 39. Parent `DELETE_RETIRE`

For current attribution:

```text
parent retired
→ current-parent attribution invalid
```

For historical attribution:

```text
retired parent revision retained with integrity
→ historical fact that it once said X may remain valid
```

Physical purge policy remains CC-3-owned.

## 40. Parent physical purge pressure

If a historical child still requires exact parent revision proof, the parent revision cannot be physically purged **and simultaneously remain provable** under the selected V1 retention design.

Therefore a concrete consumer must choose before purge:

```text
A. keep bounded parent revision while dependent lineage remains alive
or
B. retire/invalidate dependent historical lineage first
```

CC-6 does not create an orphan historical claim with no proof.

## 41. Parent append semantics

An unrelated `APPEND_CHILD` elsewhere under the same container does not automatically invalidate an exact item-level lineage edge.

Example:

```text
child NEWS cites exact Board post P@R7
new unrelated Board reply Q appended
→ P@R7 attribution may remain unchanged
```

unless the child claim depended on aggregate/container state.

This is a benefit of claim-scoped dependency surfaces.

## 42. Parent semantic reorder

If the child claim depends only on exact parent content and not ordering:

```text
presentation/local reorder
→ irrelevant

semantic reorder elsewhere
→ may be dependency-neutral
```

If ordering itself is part of the attributed proposition, revalidation is required.

The dependency-neutral set must be explicit, not inferred opportunistically.

## 43. Parent correction

A later parent correction/retraction does not rewrite an already committed child source object automatically.

Instead:

```text
parent current state changes
→ current lineage support may fail
→ child current semantic use must revalidate/withhold
```

A future new correction child/source may explicitly report the correction under normal family policy.

Canonical rule:

```text
PARENT CORRECTION
!=
SILENT CROSS-FAMILY CHILD EDIT AUTHORITY
```

## 44. Child mutation after parent change

A child may intentionally reconcile to a new parent revision through a fresh current CC-5 mutation only if the concrete consumer supports that operation.

Required flow:

```text
resolve child exact ID/revision
resolve intended parent exact ID/revision
prove lineage under current policy
construct new child semantics
run child family validation
commit child revision
```

No automatic parent-ref rewrite is authorized.

## 45. No CC-7 survivor semantics hidden inside lineage

CC-6 does not authorize descendants to survive source replacement merely because they have a lineage edge.

```text
LINEAGE EXISTS
!=
DESCENDANT MAY SURVIVE REPLACEMENT
```

If a child must survive a replacement while changing/re-attaching support, CC-7 remains the authority.

## 46. No automatic reverse mutation

Child changes do not mutate the parent.

```text
NEWS corrects its wording
→ BOARD parent unchanged
```

CC-6 is directional semantic lineage, not shared mutable state.

## 47. No automatic sibling mutation

Two children sharing a parent do not own each other.

```text
parent P
├ child NEWS N1
└ child NEWS N2

N1 edit
→ N2 unchanged unless its own support/use gate later fails
```

No sibling propagation exists.

## 48. One-parent first bound

CC-6 V1 freezes:

```text
MAX_DERIVED_PARENTS_PER_CHILD = 1
```

Reason:

- prevents source aggregation from entering through attribution backdoor;
- keeps support-at-use bounded;
- keeps revision retention bounded;
- prevents accidental truth-by-consensus logic;
- makes first invalidation behavior tractable.

Multiple derived parents require a later explicit fan-in design.

## 49. One-hop first bound

CC-6 V1 freezes:

```text
MAX_DERIVED_LINEAGE_DEPTH = 1
```

The parent may be a durable derived source object supported from existing current/historical authority, but it may not itself depend on another CC-6 derived parent for the child relation in the first scope.

Conceptually:

```text
root/current authority
→ BOARD derived object P
→ NEWS child N
```

allowed as a designed shape.

```text
root
→ BOARD P
→ NEWS N
→ PUBLIC_KNOWLEDGE K
```

requires a later multi-hop design.

## 50. One-hop bound prevents cycles by construction

Because V1 parent lineage depth must be zero before the new child edge is added:

```text
A → B → A
```

cannot be admitted.

Future multi-hop expansion must add explicit acyclicity/cycle detection and total traversal bounds.

CC-6 V1 therefore does not build a generic cycle detector.

## 51. No arbitrary graph traversal

Ordinary lineage validation reads:

```text
one child
→ one exact parent
→ one exact parent revision
```

It must not:

```text
walk all ancestors
scan all source history
search all children
compute global graph closure
```

This preserves 3M-9 bounded cost.

## 52. Reverse dependency index is not semantic authority

A future implementation may maintain a bounded owner-local reverse index for operational hygiene, such as quickly finding currently mounted direct children when a parent mutates.

If present:

```text
reverse index
= locator optimization
!= lineage truth authority
```

A missing/corrupt cache/index cannot prove a child has no dependency.

The semantic child record's exact parent reference remains authoritative for its own lineage relation.

## 53. Lazy support-at-use is the semantic baseline

CC-6 selects lazy direct revalidation as the semantic baseline:

```text
child later used/presented/re-entered
        ↓
resolve its one exact parent ref
        ↓
re-prove required current/historical lineage state
        ↓
allow / withhold
```

This avoids requiring a global background invalidation walk.

## 54. Active mounted child after known parent mutation

If a runtime knows an active presented child depends on a parent being mutated in the same active lifecycle, it must not knowingly leave the child presented as current while its lineage state is unresolved.

First-safe behavior:

```text
known parent mutation
+ known mounted dependent child
→ withhold/reconcile child until lineage revalidation completes
```

Exact host mechanics remain future runtime design.

## 55. Storage ownership

The parent owner remains owner of parent semantic state/revisions.

The child owner remains owner of child semantic state and its derived-parent reference.

Forbidden:

```text
child copies entire parent record into its own durable payload
child edits parent revision metadata
parent stores arbitrary child semantic payloads merely for lineage
```

A bounded reverse locator index, if later needed, is operational metadata only.

## 56. Lineage retention accounting

A future lineage-enabled store must be able to account for bounded resource pressure conceptually including:

```text
active lineage edge count
pinned parent revision count
bytes retained because of lineage
oldest lineage-dependent revision age
current vs historical lineage disposition
```

These are diagnostics/accounting, not model-visible semantics.

## 57. Dormancy

When no C5 lineage consumer is active:

```text
no parent lookup
no lineage validation
no revision pin allocation
no graph traversal
no model-visible lineage bytes
no background propagation
no child generation
```

Historical lineage objects in storage do not wake Source Intelligence by themselves.

## 58. Model-call firewall

CC-6 authorizes no model call.

A future child generation flow that needs a model must separately prove:

```text
current child source job authority
producer/transport authorization
CC-4 re-entry if durable parent content must be model-visible
bounded parent slice
family-native validation after generation
```

The existence of a lineage edge is not a model-call budget grant.

## 59. Cross-family scheduler firewall

CC-6 does not create a scheduler that says:

```text
Board rumor persisted for N turns
→ automatically produce News
```

Any future delayed source transition requires a current authorized source job from its own owner.

No polling/background watcher is authorized.

## 60. First concrete designed pair

The first concrete semantic pair selected for CC-6 is:

```text
PARENT FAMILY = BOARD
PARENT OBJECT = one durable accepted BOARD POST/REPLY item
RELATION      = ATTRIBUTED_DERIVED_CLAIM
CHILD FAMILY  = NEWS
CHILD ROLE    = attributed claim / rumor reporting
```

This pair is **designed only**.

It does not modify 3M-8's currently frozen direct-B-root runtime scope.

## 61. First BOARD → NEWS example

Parent:

```text
Board post P@R3
mode = ATTRIBUTED_SOCIAL
content = "X라는 소문이 돈다"
```

Child candidate:

```text
NEWS reportKind = RUMOR
headline/body preserve attribution:
"온라인 게시판에서 X라는 주장이 확산"
```

Required:

```text
current NEWS source job independently authorized
exact P@R3 lineage resolved
P@R3 current or historical attribution mode proven
current NEWS maturity ALLOW
headline/body exposure policy ALLOW
story-atomic validation passes
```

## 62. Illegal BOARD → NEWS promotion example

Parent:

```text
Board P@R3 = "X happened" as rumor
```

Illegal child without independent support:

```text
NEWS / DIRECT_REPORT
"X happened"
```

Reason:

```text
parent proves Board rumor/claim existence
parent does not prove X as world fact
```

## 63. Correction example

Timeline:

```text
T1 Board P@R3 says rumor X
T2 News N@R1 reports "Board says X"
T3 Board P edited to R4 correcting/retracting X
```

Then:

```text
N current-use lineage bound to R3
→ no longer current-parent attribution
→ withhold/revalidate before current use

N historical framing "At T2, Board P@R3 was claiming X"
→ may remain supportable if R3 retained and integrity proven
```

N is not silently edited to mention the correction.

A new current correction story requires its own authorized operation/source job.

## 64. Parent deletion example

Timeline:

```text
Board P@R3 says X
News N cites P@R3
P later DELETE_RETIRE
```

Results:

```text
CURRENT_PARENT_ATTRIBUTION
→ blocked

HISTORICAL_PARENT_ATTRIBUTION
→ may survive only while P@R3 proof is retained
```

No automatic retarget to a similar replacement post.

## 65. Retraction and correction do not erase history automatically

A historical record may truthfully support:

```text
"the source once claimed X"
```

even after the source retracts X.

But the child must not use old historical lineage to imply:

```text
"the source still claims X"
```

Canonical distinction:

```text
HISTORICAL CLAIM EVENT MAY SURVIVE
CURRENT CLAIM STATUS MAY NOT
```

## 66. Child headline is part of lineage-sensitive semantics

For NEWS, the headline may itself perform the attribution/promotion.

Therefore child lineage validation must cover any headline semantic unit that relies on the parent.

Forbidden:

```text
body says "Board rumor"
headline says "X confirmed"
```

Existing NEWS story-atomic validation remains the final family guard.

## 67. No source-count leakage through withheld lineage

If a parent lineage basis is denied/held/unavailable, ordinary child presentation must not reveal hidden diagnostic metadata such as:

```text
"3 hidden Board posts support this"
"one source was removed"
```

unless a separately eligible semantic field explicitly authorizes that statement.

Diagnostics remain bounded and non-model/non-presentation by default.

## 68. Lineage and PUBLIC_KNOWLEDGE

CC-6 does not open PUBLIC_KNOWLEDGE settlement.

Forbidden shortcut:

```text
Board → News lineage exists
News later repeated
→ Public Knowledge settled
```

Settlement remains a separate policy problem.

## 69. Lineage and multi-family sibling fanout

Multi-family sibling outputs produced from one shared current authority remain siblings, not lineage parents merely because they appear together.

```text
same event
→ BOARD
→ NEWS
```

under current multi-family fanout does not mean:

```text
NEWS derived from BOARD
```

A CC-6 edge exists only when the child semantic contract explicitly uses a durable parent derived object as attributed input.

## 70. Lineage creation point

A lineage edge becomes semantically committed only when:

```text
exact parent/ref/revision resolved
lineage policy allows the relation
child candidate passes family validation
child durable commit succeeds
```

A model draft merely mentioning a parent does not create lineage.

## 71. Lineage edge revision behavior

If a committed child later changes the parent reference or lineage use mode, that is child semantic state.

Therefore:

```text
change derived parent ref / parent revision / relation mode
→ child semantic revision advances
```

under CC-2/CC-5.

## 72. Child reroll behavior

For `REROLL_IN_PLACE` child:

```text
same child ID
new semantic revision
lineage basis must be revalidated for new candidate
```

The old lineage does not automatically validate newly generated content.

For `REROLL_REPLACE` child:

```text
new child ID
new lineage edge decision
```

Old parent refs do not automatically copy unless the new operation contract explicitly selects/revalidates them.

## 73. Child delete behavior

`DELETE_RETIRE` child retires the active lineage edge for ordinary current use.

Any parent revision pin that existed only for that child's lineage may be released when no remaining bounded dependent edge requires it, subject to CC-3 retention policy.

## 74. No lineage identity from text fingerprints

Fingerprints may help verify retained semantic bytes or duplicate evidence.

They remain:

```text
integrity/support evidence
!= durable parent identity
!= lineage edge identity
```

## 75. No universal lineage-edge ID required

CC-6 V1 does not require every relation itself to receive a standalone durable object ID.

If the child has at most one parent edge, the relation can be owned as part of child semantic state.

A future product requiring independently mutable/multi-edge provenance records may justify explicit edge identity later.

## 76. No graph database

Not authorized:

```text
universal Candidate C node table
universal edge table
recursive graph query engine
cross-family provenance crawler
automatic reverse dependency traversal
```

The first relation is one child-owned exact parent reference.

## 77. Failure taxonomy separation

Lineage failures are separate from:

```text
Exposure DENY/HOLD
NEWS maturity HOLD
CC-2 operation stale
CC-5 mutation reject
CC-4 re-entry blocked
Presentation failure
```

Do not collapse all into `invalid` if diagnostics/consumer behavior needs the distinction.

## 78. First validation matrix

Conceptual cases:

| Parent condition | Use mode | CC-6 result |
|---|---|---|
| exact parent current revision, support current | CURRENT | ALLOW_CURRENT |
| parent advanced revision | CURRENT | HOLD / REVISION_MISMATCH |
| parent retired | CURRENT | BLOCK_CURRENT_PARENT_RETIRED |
| exact old revision retained with integrity | HISTORICAL | ALLOW_HISTORICAL |
| old revision unavailable | HISTORICAL | HOLD_PARENT_REVISION_UNAVAILABLE |
| exact parent unresolved | either | BLOCK_PARENT_UNRESOLVED |
| parent itself lineage-derived depth 1 | V1 new child | BLOCK_DEPTH_EXCEEDED |
| second parent requested | V1 | BLOCK_FANIN_EXCEEDED |

Exact disposition naming may be consumer-specific, but these semantic distinctions are frozen.

## 79. Acceptance traps for later implementation

A future implementation/evaluator must include at minimum:

### Trap 1 · truth laundering

```text
Board rumor X
→ News says X as fact
```

must fail.

### Trap 2 · exact attribution

```text
Board rumor X
→ News says Board is circulating rumor X
```

may pass when all other child policies pass.

### Trap 3 · parent edit

```text
child bound P@R3
parent now R4
CURRENT use
```

must fail/revalidate.

### Trap 4 · historical retained parent

```text
child bound P@R3
parent now R4
R3 retained
HISTORICAL use
```

may remain attributable.

### Trap 5 · replacement retarget

```text
P replaced by similar Q
```

old child must not silently retarget to Q.

### Trap 6 · parent deletion

current attribution must fail; historical may survive only with retained proof.

### Trap 7 · fan-in

two parent derived refs must be rejected in V1.

### Trap 8 · depth

parent already has derived parent must be rejected in V1.

### Trap 9 · source resurrection

old Board stored, no current NEWS source job
→ no News generation.

### Trap 10 · C6 independence

lineage edge exists but model-visible parent slice not authorized
→ no full parent content prompt injection.

### Trap 11 · duplicate current siblings

BOARD and NEWS generated independently from same current root
→ no fake lineage edge inferred.

### Trap 12 · parent correction

child not silently rewritten by parent correction.

## 80. Cost target

For one child lineage validation under V1:

```text
O(1 child)
+ O(1 exact parent lookup)
+ O(1 exact parent revision/support check)
+ family-native child validation
```

Forbidden cost shape:

```text
O(total durable source history)
O(all lineage descendants)
O(full conversation transcript)
```

## 81. Source-irrelevant baseline

When no current C5 consumer is active:

```text
lineage lookup = 0
revision pin change = 0
graph traversal = 0
re-entry bytes caused by lineage = 0
child generation caused by lineage = 0
```

Stored lineage relations alone do not activate a turn.

## 82. Runtime implementation prerequisites

Before any CC-6 runtime implementation, a concrete consumer must freeze/prove at minimum:

```text
exact parent family/object namespace
actual durable identity allocator
actual revision representation
bounded retention/pinning implementation
child current-source-job owner
lineage use mode
exact model-visible parent slice if C6 is required
family-native child validation path
hard lineage count/byte/lifetime caps
current/historical support-at-use implementation
presentation withholding/reconciliation behavior
observability for lineage reason codes
```

## 83. Runtime blockers

Until separately authorized/resolved:

```text
BLOCKER · DURABLE_RUNTIME_ID_ALLOCATOR_NOT_AUTHORIZED
BLOCKER · DURABLE_HISTORY_BACKEND_NOT_AUTHORIZED
BLOCKER · CROSS_FAMILY_SOURCE_JOB_RUNTIME_NOT_AUTHORIZED
BLOCKER · DERIVED_PARENT_MODEL_REENTRY_NOT_AUTHORIZED_WHERE_NEEDED
BLOCKER · LINEAGE_REVISION_PIN_RETENTION_NOT_IMPLEMENTED
BLOCKER · ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

These do not block this design checkpoint.

## 84. Explicit non-goals

```text
NO runtime lineage edge creation
NO automatic Board→News propagation
NO background polling
NO lineage scheduler
NO generic provenance graph
NO multi-parent aggregation
NO multi-hop lineage
NO cycle detector needed in V1
NO automatic child mutation when parent changes
NO truth promotion
NO PUBLIC_KNOWLEDGE settlement
NO new model call
NO prompt injection
NO DOM/CSS change
NO store implementation
NO release transaction
```

## 85. Frozen invariants

```text
I1  C5 derived lineage is design-open only; runtime remains unauthorized
I2  V1 relation is ATTRIBUTED_DERIVED_CLAIM only
I3  derived lineage supports attribution propositions, not underlying world truth by default
I4  child current source authority remains independent and mandatory
I5  derived parent ref does not replace sourceAuthorityRef
I6  parent resolution uses exact durable identity
I7  mutable parent lineage binds an exact semantic revision
I8  child never floats silently from old parent revision to latest
I9  dependency surface is the smallest parent semantic unit needed
I10 V1 allows at most one derived parent per child
I11 V1 allows at most one derived-lineage hop
I12 V1 therefore admits no cycles by construction
I13 current-parent attribution requires current/compatible parent revision and support
I14 historical-parent attribution requires retained exact revision/integrity and preserves historical framing
I15 historical attribution does not promote underlying claim to current truth
I16 active lineage can justify bounded exact parent-revision retention
I17 lineage retention does not authorize unbounded revision history/event sourcing
I18 denied/held/quarantined secret content is not lineage-pinned by default
I19 parent content becomes model-visible only through separately authorized CC-4 re-entry
I20 parent assertion/epistemic status must not be silently strengthened downstream
I21 NEWS maturity and Exposure remain independent child gates
I22 parent edit/reroll/replacement/delete never silently retargets child lineage
I23 parent correction does not grant automatic cross-family child edit authority
I24 current child use revalidates lineage support at use
I25 lazy one-parent support-at-use is the semantic baseline; no global graph walk required
I26 reverse dependency indexes, if any, are optimization metadata only
I27 sibling multi-family outputs are not lineage unless an explicit durable parent relation exists
I28 changing a child's parent ref/use mode is child semantic mutation and advances revision
I29 physical parent purge cannot coexist with supposedly provable historical lineage unless an alternate proof contract exists
I30 ordinary turns with no lineage consumer incur zero lineage semantic work
```

## 86. Design conclusion

CC-6 freezes Candidate C's first cross-source provenance capability as a **narrow attributed lineage edge**, not a general semantic graph.

The key semantic firewall is:

```text
PARENT DERIVED SOURCE SAID X
MAY SUPPORT
"PARENT SAID X"

IT DOES NOT BY ITSELF SUPPORT
"X IS TRUE"
```

The first bounded relation is:

```text
one exact durable parent item
+ one exact parent revision
+ one attributed child
+ one-hop lineage
+ support-at-use
```

This creates a safe bridge from durable source history to later source attribution without turning repetition, persistence, or publication into canonical truth.

Next recommended checkpoint:

```text
CC-7 · PARTIAL DESCENDANT SURVIVAL
```

CC-7 should answer when a child/descendant may remain alive after a parent/source is replaced or invalidated, what independent support is required, and how reattachment differs from textual similarity salvage.
