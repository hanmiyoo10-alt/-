# SimCore Post-3.0M MF-2 Shared Current Authority Bundle + Family-Lane Isolation Design — 2026-09-02

Date: 2026-09-02 KST

Status: **DESIGN FROZEN · FAMILY-NEUTRAL SHARED AUTHORITY CORE · MINIMAL FAMILY AUTHORITY VIEWS · NO SIBLING-DERIVED READS · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-2 · SHARED AUTHORITY · FAMILY-LANE ISOLATION · DESIGN**

## 0. Purpose

MF-0 froze same-current-authority sibling fanout.
MF-1 froze the admission boundary and immutable admitted family set.
MF-2 now freezes how admitted sibling lanes consume trusted current authority without becoming authority for one another.

The selected seam is:

```text
IMMUTABLE_SHARED_CURRENT_AUTHORITY_BUNDLE
+
MINIMAL_FAMILY_AUTHORITY_VIEWS
+
NO_SIBLING_DERIVED_READS
```

This checkpoint is design-only.

It does not implement runtime authority collection, source-job selection, model generation, sidecar transport, validators, presentation mounting, DOM/CSS, persistence, context re-entry, network/media, long-chat execution, release publication, or `release-simcore` mutation.

## 1. Authority chain

MF-2 consumes:

```text
MF-0  Multi-Family Orchestration Master Design
MF-1  Fanout Plan + Family Entry Registry
3M-3  Structured Sidecar + Validation
3M-5  BOARD Source Family
3M-6  Current Projection Support Invalidation
3M-8  NEWS Publication Maturity
```

Initial fanout-eligible families remain:

```text
LIVE_REACTION
BOARD
NEWS
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Product identity

MF-2 is an authority-sharing and lane-isolation contract.

It is not:

```text
a new source authority owner
a provenance store
a source-text cache
a semantic consensus engine
a cross-family knowledge graph
a model-call scheduler
a persistence layer
a renderer
```

Canonical rule:

```text
EXISTING OWNERS CREATE AUTHORITY
MF-2 BOUNDS HOW ADMITTED LANES MAY READ IT
```

MF-2 never upgrades derived output into authority.

## 3. Why `SourceAuthorityContextV1` itself is not the shared root object

3M-3's first conceptual `SourceAuthorityContextV1` includes family-bound scope such as:

```text
family = LIVE_REACTION
mode = C
```

BOARD and NEWS preserve the same direct-B source relationship but belong to different family identities.

Therefore Multi-Family Orchestration must not share a family-labeled `SourceAuthorityContextV1` wholesale across all lanes.

The shared object must instead be family-neutral.

Canonical decomposition:

```text
existing current owner facts
        ↓
SharedSourceRelationshipAuthorityCoreV1
        ↓
family-specific bounded authority view
        ↓
family validation
```

This avoids pretending a `LIVE_REACTION` authority context is automatically a BOARD or NEWS context.

## 4. Family-neutral shared source relationship core

MF-2 freezes the conceptual family-neutral core:

```text
SharedSourceRelationshipAuthorityCoreV1
  handoffEligible
  mode = C
  authorityKind = HANDOFF_EVIDENCE
  rootMode = B
  parentMode = B
  rootIndex
  parentIndex
  depth = 1
  rootFingerprint
  sourceAssistantIndex
  sourceAssistantFingerprint
  currentUserIndex
  currentUserFingerprint
```

These fields are normalized from the same existing Handoff / Evidence / Lineage owner results already used by 3M-3, BOARD, NEWS, and support-at-use.

MF-2 does not create stronger authority by copying them.

Canonical rule:

```text
SHARED CORE
= FAMILY-NEUTRAL VIEW OF EXISTING CURRENT OWNER FACTS

SHARED CORE
!= NEW CANONICAL SOURCE OWNER
```

No raw root/source/current-user body is embedded into this core.

## 5. Shared current source authority bundle

The conceptual orchestration object is:

```text
SharedCurrentSourceAuthorityBundleV1
  sourceAuthorityRef
  relationshipCore
  trustedAmbientOwnerInputs?
  lifetime = CURRENT_PROJECTION_ONLY
```

### `sourceAuthorityRef`

Must exact-match the current admitted plan's `sourceAuthorityRef`.

### `relationshipCore`

Exactly one current family-neutral direct-B-root authority core.

### `trustedAmbientOwnerInputs?`

Optional bounded references / normalized facts from already-authoritative current owners such as:

```text
Frame
Time
Continuity
source reachability owner
```

when such facts exist and are needed by a family-specific policy producer.

MF-2 does not freeze new internal schemas for those owners and does not invent missing facts.

Canonical rules:

```text
OPTIONAL AMBIENT AUTHORITY
MAY BE REUSED AS TRUSTED INPUT

OPTIONAL AMBIENT AUTHORITY
MUST NOT BE REINTERPRETED AS WORLD TRUTH UPGRADE
```

## 6. Bundle ownership

The bundle is assembled by the SimCore control plane from existing trusted current owner outputs after MF-1 admission.

It is not owned by:

```text
main model
source semantic producer
LIVE_REACTION
BOARD
NEWS
Presentation Renderer
history
user-editable source content
```

The bundle builder may normalize and package existing facts.
It may not:

```text
change a fingerprint
repair a spoofed source ref
invent a missing time fact
invent reachability
mark a claim public
mark a NEWS story mature
promote a sibling result to evidence
```

## 7. Bundle lifetime

The first bundle lifetime is:

```text
CURRENT_PROJECTION_ONLY
```

No bundle store is authorized.

Not authorized:

```text
cross-turn bundle reuse
bundle cache as semantic authority
bundle archive
persistent fanout run ID
bundle retrieval by old UI card
future model-context re-entry
```

Canonical rule:

```text
SHARED AUTHORITY BUNDLE
!= SOURCE MEMORY
```

Candidate C remains closed.

## 8. MF-1 plan binding

Bundle construction begins only from an admitted MF-1 plan.

Conceptual binding:

```text
AdmittedCurrentSourceFanoutPlanV1.sourceAuthorityRef
==
SharedCurrentSourceAuthorityBundleV1.sourceAuthorityRef
```

and the bundle is valid only for the same current projection window.

The control plane must reject:

```text
bundle built for another source root
bundle from another turn/projection
bundle with multiple current roots
bundle constructed from an unadmitted intent
```

Canonical rule:

```text
FANOUT INTENT
CANNOT BIND AUTHORITY

ADMITTED CURRENT PLAN
CAN BIND ONE CURRENT BUNDLE
```

No persistent bundle ID is required.

## 9. Bundle construction disposition

Conceptual bundle disposition:

```text
BUNDLE_READY
BUNDLE_INVALID_PLAN_BINDING
BUNDLE_INVALID_SOURCE_AUTHORITY
BUNDLE_UNSUPPORTED_MULTI_ROOT
BUNDLE_UNSUPPORTED_SCOPE
```

`BUNDLE_READY` means only that the shared current authority package is structurally/currently usable for admitted lane projection.

It does not mean any family claim is accepted.

Canonical rule:

```text
BUNDLE_READY
!= FAMILY_VALID
!= CLAIM_PUBLIC
!= NEWS_MATURE
```

## 10. Least-authority family views

A lane does not receive the entire shared bundle by default.

Instead MF-2 freezes pure bounded family projections.

Conceptual operation:

```text
projectAuthorityView(bundle, admittedFamily)
→ minimal read-only family view
```

This operation:

```text
is deterministic
is model-free
is network-free
is history-free
does not mutate bundle
does not add authority
does not inspect sibling results
```

If a family is not present in the admitted MF-1 plan, no authority view may be created for it.

Attempting to dispatch an unadmitted family is a control-plane integrity failure, not a helpful expansion of the plan.

## 11. LIVE_REACTION minimal authority view

Conceptual view:

```text
LiveReactionAuthorityViewV1
  family = LIVE_REACTION
  sourceAuthorityContext
```

The lane-specific `sourceAuthorityContext` is reconstructed from the shared family-neutral relationship core with:

```text
family = LIVE_REACTION
```

and exact copied current owner values.

This view does not contain:

```text
BOARD semantics
NEWS semantics
NEWS maturity context
sibling validation receipts
claim-level exposure verdicts from another lane
```

Per-assertion `SourceAssertionPolicyContextV1[]` remains a separate lane-private trusted input generated/verified for LIVE_REACTION's own proposed assertions.

## 12. BOARD minimal authority view

Conceptual view:

```text
BoardAuthorityViewV1
  family = BOARD
  sourceAuthorityContext
```

The lane-specific `sourceAuthorityContext` is reconstructed from the same shared relationship core with:

```text
family = BOARD
```

BOARD-specific semantic structures remain private to the BOARD lane:

```text
participants[]
POST / REPLY entries
parent dependency closure
Board validation receipt
```

Per-entry `SourceAssertionPolicyContextV1[]` is not inherited from LIVE_REACTION or NEWS.

## 13. NEWS minimal authority view

Conceptual view:

```text
NewsAuthorityViewV1
  family = NEWS
  sourceAuthorityContext
  trustedMaturityOwnerInputs?
```

The source-authority context is reconstructed from the same shared relationship core with:

```text
family = NEWS
```

`trustedMaturityOwnerInputs?` may expose only the bounded existing owner facts needed by the separately designed NEWS maturity-context producer, such as current:

```text
Frame / Time / Continuity
source reachability authority
```

The view does not contain a pre-authorized maturity result.

Canonical rules:

```text
SHARED TIME / REACHABILITY OWNER FACTS
→ MAY INFORM NEWS MATURITY CONTEXT

NEWS MATURITY RESULT
→ NEWS-LANE PRIVATE
```

Per-headline/body assertion exposure policy contexts also remain NEWS-lane private.

## 14. Shared-vs-private authority matrix

| Data / authority surface | Shared bundle | LIVE_REACTION lane | BOARD lane | NEWS lane |
| --- | --- | --- | --- | --- |
| admitted `sourceAuthorityRef` | yes | read | read | read |
| family-neutral Handoff/Evidence/Lineage root facts | yes | projected | projected | projected |
| raw source body copy | no | no new MF-2 copy | no new MF-2 copy | no new MF-2 copy |
| trusted current Frame/Time/Continuity/reachability owner inputs | optional bounded shared source | only if separately required later | only if separately required later | minimal maturity input view |
| `SourceAssertionPolicyContextV1[]` | no | private | private | private |
| semantic draft | no | private | private | private |
| validator disposition | no | private | private | private |
| DENY/HOLD content | no | private quarantine | private quarantine | private quarantine |
| BOARD parent dependency state | no | no | private | no |
| NEWS maturity context/result | no | no | no | private |
| validated semantic payload | no | private result | private result | private result |
| presentation state | no | renderer-local | renderer-local | renderer-local |

Canonical rule:

```text
SHARE ROOT AUTHORITY
MINIMIZE FAMILY AUTHORITY VIEW
NEVER SHARE FAMILY VERDICTS AS AUTHORITY
```

## 15. Claim-policy isolation

3M-3 policy contexts are assertion-specific.

Therefore these are invalid shortcuts:

```text
LIVE_REACTION assertion 0 ALLOW
→ BOARD entry 0 ALLOW

BOARD entry says X is public
→ NEWS headline X public

NEWS headline ALLOW
→ LIVE_REACTION confirmed fact ALLOW
```

Even when textual content overlaps, each lane's claim must receive its own policy context and policy evaluation.

Canonical rule:

```text
SAME SOURCE ROOT
!= SAME CLAIM POLICY RECEIPT
```

Ordinal equality across family sidecars has no cross-family meaning.

## 16. Family-lane semantic input contract

Conceptual lane execution input:

```text
FamilySemanticLaneInputV1
  admittedFamily
  minimalAuthorityView
  ownSemanticDraft
  ownAssertionPolicyContexts
  ownFamilySpecificTrustedPolicyContext?
```

Examples of family-specific trusted policy context:

```text
NEWS → maturity context
BOARD → hierarchical dependency is derived within BOARD validation
```

No field may contain sibling derived semantic payload as authority input.

## 17. No sibling-derived reads

During semantic evaluation, a family lane is forbidden from reading:

```text
sibling draft
sibling accepted text
sibling denied/held text
sibling validation receipt
sibling result counts as evidence
sibling presentation state
sibling consensus
```

A sibling may exist physically in the same model response or orchestration object without becoming semantic authority.

Canonical rule:

```text
CO-EXISTENCE
!= PROVENANCE
```

## 18. Write isolation

Each lane writes only into its own family result slot.

Conceptual slots:

```text
results[LIVE_REACTION]
results[BOARD]
results[NEWS]
```

A lane may not:

```text
rewrite sibling payload
change sibling disposition
change shared bundle
change admitted plan
append a new family
rewrite another family's receipt
```

After family evaluation, the orchestration layer may collect bounded outcomes for presentation and diagnostics.

That aggregation is downstream and must not be fed back into semantic validation.

## 19. Physical generation topology neutrality

MF-2 preserves MF-0's topology neutrality.

Future physical options include:

```text
one bounded model call that proposes multiple family drafts
one bounded call per family
another separately proven topology
```

Regardless of topology:

```text
family authority views remain logically independent
family sidecars remain independently validated
sibling output cannot become authority
```

Canonical rule:

```text
ONE PHYSICAL CALL
DOES NOT CREATE CROSS-FAMILY LINEAGE
```

A co-generated draft may contain similar language across families because both see the same current event.
That semantic overlap is not proof and does not replace lane-specific validation.

## 20. Shared-root failure taxonomy

The following are plan-wide failures:

```text
missing admitted current plan
invalid admitted-plan / bundle source ref binding
current source authority unavailable
source authority exact-join failure
unsupported multiple-root bundle
support-at-use mismatch after source replacement/reroll
control plane attempts to dispatch an unadmitted family
control plane injects sibling derived output into authority bundle/view
```

Result:

```text
WHOLE CURRENT FANOUT INVALID / FAIL CLOSED
```

Reason: these failures compromise the common authority boundary or admission integrity shared by the entire fanout.

## 21. Family-local authority/policy failure taxonomy

The following remain family-local when the shared root is valid:

```text
one family draft schema invalid
one family's claim-policy context invalid/missing
BOARD dependency closure quarantines a branch
NEWS maturity inputs insufficient
NEWS maturity = HOLD
one family scope unsupported after legal plan dispatch
one family semantic validator quarantines all of its payload
```

Result:

```text
AFFECTED FAMILY WITHHELD / QUARANTINED
OTHER SIBLINGS MAY REMAIN ELIGIBLE
```

Canonical rule:

```text
COMMON ROOT VALIDITY
IS PLAN-WIDE

FAMILY POLICY SUFFICIENCY
IS FAMILY-LOCAL
```

## 22. NEWS missing maturity authority example

Given:

```text
shared direct-B authority = valid
LIVE_REACTION exposure inputs = sufficient
BOARD exposure inputs = sufficient
NEWS source root = valid
NEWS trusted timing/reachability basis = insufficient
```

Legal outcome:

```text
LIVE_REACTION → may continue
BOARD         → may continue
NEWS          → HOLD / family-local withheld under NEWS policy
```

Illegal outcome:

```text
NEWS missing maturity input
→ invalidate LIVE_REACTION and BOARD
```

unless the missing fact also proves the shared root itself invalid.

## 23. Raw semantic material boundary

MF-2 does not authorize copying raw B-root text into the authority bundle.

Existing refs intentionally use bounded indices/fingerprints.

Therefore:

```text
SharedCurrentSourceAuthorityBundleV1
!= prompt fragment
!= transcript cache
!= raw evidence archive
```

Future semantic producer transport may separately decide how current source material is made available to the main model.
That problem remains outside MF-2.

## 24. Main-model boundary

The main model may eventually propose semantic drafts for already-admitted lanes.

It does not own:

```text
shared authority core
bundle construction
family authority view
sourceAuthorityRef validity
claim-policy context truth
NEWS maturity authority
sibling eligibility
```

The model cannot self-authorize a lane by copying plausible fingerprints or naming another family.

## 25. Presentation boundary

Presentation Renderers consume validated family payloads, not the shared authority bundle.

They do not need:

```text
Handoff/Evidence fingerprints
claim-policy contexts
NEWS maturity inputs
sibling receipts
```

to determine semantic truth.

Canonical rule:

```text
AUTHORITY BUNDLE
STOPS BEFORE PRESENTATION
```

Presentation failure remains family-local and cannot modify the bundle or sibling semantic outcomes.

## 26. Bounded diagnostics

MF-2 permits a bounded orchestration authority receipt conceptually containing metadata such as:

```text
bundleDisposition
admittedFamilyCount
sourceAuthorityKind
familyViewDispositions[]
sharedSupportDisposition
```

A family-view disposition may contain:

```text
family
viewReady = true | false
reasonCode
```

Diagnostics must not duplicate:

```text
raw source bodies
family semantic content
quarantined claim text
NEWS headline/body content
BOARD post/reply content
```

The receipt is not model context or future source history by default.

## 27. Support-at-use

Before ordinary family presentation/use, the current shared source root must still be supported.

Conceptual check:

```text
bundle.sourceAuthorityRef
↕ exact compare
then-current trusted source authority
```

Mismatch after reroll/source replacement:

```text
old bundle invalid
old family views invalid
all old sibling semantic results invalid
→ fresh current plan / fresh bundle / fresh projections
```

No sibling survives because its text still appears plausible.

## 28. Reroll / edit boundary

Current first scope keeps whole-plan invalidation.

Not authorized:

```text
reroll BOARD only while retaining old NEWS/LIVE_REACTION lineage
edit one sibling and preserve others as stable descendants
rebind an old family view to a new source root
```

Those create stable descendant identity / partial survival pressure and require Candidate C C3/C7 reassessment.

## 29. Context and history boundary

MF-2 inherits:

```text
CURRENT_PROJECTION_ONLY
NO STRUCTURED SOURCE HISTORY
NO AUTOMATIC CONTEXT RE-ENTRY
NO HIDDEN RETRIEVAL
```

The shared bundle and family authority views do not enter future model context automatically.

Visible source surfaces do not keep authority views alive.

## 30. Candidate C status

Current MF-2 scope leaves all activation conditions false:

```text
C1 cross-turn survival          = no
C2 stable derived identity      = no
C3 item mutation                = no
C4 append / revision            = no
C5 derived-to-derived lineage   = no
C6 future context re-entry      = no
C7 partial descendant survival  = no
C8 delayed semantic side effect = no
```

Therefore:

```text
CANDIDATE_C = NOT ACTIVATED
```

If later Multi-Family design permits:

```text
BOARD output → NEWS source input
SOCIAL_FEED output → PUBLIC_KNOWLEDGE evidence
```

that is no longer sibling fanout and must reopen C5.

## 31. Design acceptance matrix

A future implementation/evaluator should prove at least:

```text
A0  ACTIVE_SINGLE still receives the same family-specific authority semantics
A1  LIVE_REACTION + BOARD share exact root facts but not claim-policy contexts
A2  LIVE_REACTION + NEWS share exact root facts but NEWS alone receives maturity inputs
A3  BOARD + NEWS remain independent despite overlapping semantic content
A4  all three lanes use one current root with no sibling-derived authority
A5  bundle/root mismatch invalidates whole fanout
A6  NEWS missing maturity authority is family-local when root is valid
A7  sibling output injection into authority path fails closed
A8  unadmitted family cannot receive an authority view
A9  source reroll invalidates bundle and all sibling results
A10 raw source bodies are not duplicated into MF-2 bundle/receipts
A11 unrelated next turn has no bundle/history residue
A12 one-call vs per-family physical generation preserves identical authority semantics
```

These are validation requirements only. No runtime evidence is claimed here.

## 32. MF-3 handoff

MF-2 hands MF-3 a bounded authority topology:

```text
one admitted plan
one current shared source-authority bundle
N admitted family authority views
N isolated family semantic lanes
```

MF-3 must design:

```text
admission-time aggregate budget
family-count / char / validation / presentation caps
pre-expensive-work rejection
family-local vs plan-wide failure matrix
partial-success aggregation
bounded orchestration receipt
```

MF-3 may use family count and known family capability metadata for budgeting.

MF-3 must not:

```text
change source authority
turn family results into sibling evidence
weaken MF-1 atomic plan admission
create history/persistence
```

## 33. Explicitly deferred

MF-2 does not authorize:

```text
multi-authority composition
cross-family propagation
stable sibling IDs
persistent authority bundles
source history
source context re-entry
item-level reroll
family-to-family truth voting
network/media authority
raw transcript caching
automatic background fanout
```

## 34. Design-only deltas

```text
runtime code delta                 = 0
release-simcore delta              = 0
persistent storage delta           = 0
prompt/output transport delta      = 0
model-call count delta             = 0
network-call delta                 = 0
DOM/CSS delta                      = 0
history scan delta                 = 0
context re-entry delta             = 0
```

## 35. Frozen result

```text
MF_CHECKPOINT = MF-2
SELECTED_SEAM = IMMUTABLE_SHARED_CURRENT_AUTHORITY_BUNDLE + MINIMAL_FAMILY_AUTHORITY_VIEWS
SHARED_ROOT_OBJECT = FAMILY-NEUTRAL CURRENT AUTHORITY CORE
SOURCE_AUTHORITY_OWNER = EXISTING HANDOFF / EVIDENCE / LINEAGE OWNERS
FAMILY_AUTHORITY_VIEWS = LIVE_REACTION / BOARD / NEWS MINIMAL READ-ONLY PROJECTIONS
CLAIM_POLICY_CONTEXTS = FAMILY-LANE PRIVATE
NEWS_MATURITY_CONTEXT_AND_RESULT = NEWS-LANE PRIVATE
SIBLING_DERIVED_READS = FORBIDDEN
SHARED_ROOT_FAILURE = PLAN-WIDE FAIL CLOSED
FAMILY_POLICY_GAP = FAMILY-LOCAL
RAW SOURCE BODY IN BUNDLE = FORBIDDEN BY DEFAULT
BUNDLE_LIFETIME = CURRENT_PROJECTION_ONLY
CANDIDATE_C = NOT ACTIVATED
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```

Next checkpoint:

```text
MF-3 · Admission / Aggregate Budget + Failure Matrix
```
