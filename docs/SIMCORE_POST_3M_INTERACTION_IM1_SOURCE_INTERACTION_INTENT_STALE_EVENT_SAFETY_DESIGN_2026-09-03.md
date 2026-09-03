# SimCore Post-3.0M IM-1 Source Interaction Intent / Stale Event Safety Design — 2026-09-03

Date: 2026-09-03 KST

Status: **IM-1 DESIGN FROZEN · INTENT CONTROL PLANE · STALE EVENT FAIL-CLOSED · INTERACTION CONTROL BINDING SELECTED · NO MUTATION ENGINE · NO DURABLE TARGET SCHEMA · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · INTERACTION / MATERIALIZATION · IM-1 · SOURCE INTERACTION INTENT · STALE EVENT SAFETY · DESIGN-ONLY**

## 0. Purpose

IM-1 freezes the first detailed control-plane contract for source UI interaction.

It answers:

```text
How does a UI event become a bounded SourceInteractionIntent?
Which event data may be trusted and which is routing-only?
How is a control bound to the exact current presentation instance?
How are stale runtime, stale presentation, stale projection, and stale target events rejected?
How are VIEW_LOCAL actions kept separate from semantic mutation actions?
How is duplicate dispatch distinguished from a second intentional user action?
What information may the UI submit as user payload?
Where does Candidate C durable identity begin and where must IM-1 stop?
```

IM-1 is design-only.

It does not implement event listeners, DOM controls, durable ID allocation, mutation state, append behavior, revision storage, model calls, network/media effects, source persistence, structured transport, host mount integration, release changes, or `release-simcore` mutation.

## 1. Authority chain

IM-1 consumes:

```text
docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC5_ITEM_MUTATION_APPEND_RECONCILIATION_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/REPOSITORY_COMMON_RULES.md
```

Production runtime authority remains `release-simcore`.

The following inherited rules are especially important:

```text
UI EVENT != SOURCE STATE COMMIT
PRESENTATION IDENTITY != SEMANTIC DERIVED IDENTITY
DERIVED OBJECT ID != REVISION
REVISION != OPERATION AUTHORITY
RUNTIME GENERATION != SOURCE SUPPORT AUTHORITY
FOUND BY ID != SUPPORTED FOR USE
LATE EFFECTS REQUIRE CURRENT OPERATION AUTHORITY WHEN APPLICABLE
```

## 2. IM-1 primary decision

Selected control-plane architecture:

```text
OPAQUE_INTERACTION_CONTROL_BINDING
+
BOUNDED_SOURCE_INTERACTION_INTENT
+
ORDERED_STALE_EVENT_GATE
+
EXPLICIT_ACTION_REGISTRY
+
NO_IMPLICIT_RETRY_OR_RETARGET
```

The UI does not submit trusted semantic object state.

Instead:

```text
validated presentation
→ plugin-owned ephemeral control binding
→ user event
→ bounded intent
→ currentness / action / target gates
→ view-local consumer
   OR downstream semantic-mutation consumer
```

## 3. Three identity domains remain separate

IM-1 must keep three independent identity/currentness domains distinct.

### A. Presentation / runtime identity

Answers:

```text
Did this event come from the still-current rendered source surface?
```

Concepts include:

```text
runtime effect generation
ephemeral presentation instance
future host presentation binding
interaction control binding
```

### B. Source projection identity/support

Answers:

```text
Is the source projection represented by this surface still the current supported projection?
```

Concepts include:

```text
current source projection generation / locator
current source support authority
3M-6 support-at-use result
```

### C. Durable semantic target identity

Answers:

```text
Which logical durable derived object should a semantic mutation target?
```

This belongs to Candidate C / IM-2 and may require:

```text
owner scope
namespace
opaque durable object ID
expected semantic revision
```

Canonical firewall:

```text
PRESENTATION CONTROL BINDING
!=
DURABLE SEMANTIC OBJECT LOCATOR
```

## 4. `InteractionControlBindingRef`

IM-1 freezes a new **ephemeral conceptual binding**, not a runtime schema:

```text
InteractionControlBindingRef
```

Purpose:

```text
bind one rendered interactive control
or one bounded control group

TO

the exact current presentation instance
+ admitted action route
+ current source projection context
+ optional current presentation item route
```

It is plugin-owned and memory-only.

It must be opaque to semantic consumers.

## 5. Why a control binding is required

Forbidden architecture:

```text
<button data-item-id="42" data-action="append-reply">

click
→ trust data-item-id=42 as semantic identity
→ mutate source object 42
```

The DOM is presentation state, not semantic authority.

Required direction:

```text
renderer/materializer creates control
→ plugin owns opaque binding B
→ DOM/event carries only B or equivalent bounded route token
→ interaction control plane resolves B in current in-memory registry
→ semantic target is re-established from trusted current owners
```

Canonical rule:

```text
DOM-LOCATED
!=
SEMANTICALLY AUTHORIZED
```

## 6. Binding lifetime

`InteractionControlBindingRef` is valid only for the bounded presentation lifetime that created it.

It must become invalid when any event in the owner-defined revocation set occurs, including conceptually:

```text
runtime replacement / disposal
presentation instance replacement
source projection replacement
source card unmount
source reroll / source replacement
manual edit invalidating the source presentation binding
family adapter replacement if the old control mapping is no longer current
explicit interaction-surface teardown
```

No binding survives reload by default.

No binding is persisted.

## 7. Binding is not a durable locator

A control binding may route an event toward a current item, but it must not become the stable semantic object ID used by IM-2/CC-1.

Canonical rule:

```text
CONTROL BINDING EXPIRES WITH PRESENTATION
DURABLE TARGET ID EXPIRES WITH DERIVED OBJECT LIFETIME
```

Those are different lifetimes and owners.

## 8. Binding contents are not semantic API

A physical future implementation may internally map a binding to data such as:

```text
family
actionKind
presentationInstanceRef
current source projection reference
current presentation item ordinal/route
```

But consumers must not parse semantic identity from the binding token itself.

The token may be opaque and table-resolved.

No source authority, object revision, canonical entity ID, or user identity is encoded as required semantics inside the token.

## 9. `SourceInteractionIntentV1`

IM-1 refines the master concept into the following conceptual envelope:

```text
SourceInteractionIntentV1
  schemaVersion
  origin
  plane
  family
  actionKind
  interactionAttemptRef
  interactionControlBindingRef
  boundedUserPayload?
```

Trusted context is resolved separately and must not be accepted from user-controlled event data.

The envelope is conceptual only; no serialized runtime schema is authorized.

## 10. `origin`

First admitted origin:

```text
USER_DIRECT_SOURCE_UI
```

This means a user action was captured from an admitted Source Presentation control.

Not admitted by IM-1:

```text
BACKGROUND_AUTOMATION
MODEL_SELF_TRIGGER
NETWORK_CALLBACK_AS_USER_INTENT
HISTORICAL_EVENT_REPLAY
ARBITRARY_DOM_SCRIPT
```

A later effect callback belongs to the materialization/operation plane, not user-intent origin.

## 11. `plane`

First conceptual values:

```text
VIEW_LOCAL
SOURCE_MUTATION
EXTERNAL_MATERIALIZATION
```

The plane is selected by plugin-owned action registration, not arbitrary UI payload.

Canonical rule:

```text
ACTION REGISTRY
SELECTS PLANE
UI PAYLOAD DOES NOT ESCALATE PLANE
```

## 12. `family`

`family` names the source family whose current presentation emitted the control.

The value must agree with the current registered binding.

A family mismatch fails closed.

The first semantic mutation candidate remains:

```text
family = BOARD
action = BOARD_APPEND_REPLY
```

SOCIAL_FEED semantic actions remain later IM-4 work.

## 13. `actionKind`

`actionKind` must come from an explicit interaction action registry.

Unknown action:

```text
UNSUPPORTED_ACTION
```

The UI cannot invent arbitrary verbs and ask a generic mutation handler to interpret them.

Canonical rule:

```text
NO GENERIC mutate(source, payload)
```

## 14. `interactionAttemptRef`

IM-1 freezes an ephemeral attempt-scoped concept for dispatch ownership:

```text
InteractionAttemptRef
```

Purpose:

```text
detect accidental duplicate dispatch of the same captured event attempt
bind diagnostics to one dispatch attempt
prevent one callback path from being applied twice inside the same current runtime control plane
```

It is:

```text
memory-only
ephemeral
attempt-scoped
not semantic identity
not durable operation identity
not a Candidate C revision token
```

## 15. Duplicate dispatch is not double-click

IM-1 distinguishes:

```text
same captured attempt delivered twice
→ duplicate dispatch

user physically triggers control twice
→ two user attempts
```

Therefore:

```text
same InteractionAttemptRef seen twice
→ second dispatch may be dropped as DUPLICATE_ATTEMPT

two distinct attempt refs with same text/payload
→ do not deduplicate merely because values match
```

Canonical rule:

```text
VALUE EQUALITY
!=
SAME USER INTENT ATTEMPT
```

This mirrors the temporal-ownership rule that value equality does not restore old operation authority.

## 16. Attempt ref is not idempotency for durable mutation

`InteractionAttemptRef` does not solve durable duplicate-write semantics.

If IM-3 later requires retry-safe `BOARD_APPEND_REPLY`, it must define operation/idempotency behavior using Candidate C / CC-2 / CC-5 ownership.

IM-1 only prevents accidental duplicate dispatch inside the bounded control plane.

## 17. `boundedUserPayload`

User payload is untrusted plain input.

First examples:

```text
reply text
new post text
edited source-local text
quote commentary
```

The UI may not submit trusted fields such as:

```text
isValid
isPublic
assertion eligibility
sourceAuthorityRef
support fingerprint
validator reason code
durable object revision
operation token
canonical character identity
canonical event identity
admin capability
```

These come from trusted owners if needed.

## 18. Payload must be bounded before semantic work

The first gate on user-controlled payload is structural/size validation.

Required principle:

```text
malformed / oversized event payload
→ reject before history scan, model call, durable lookup, or semantic mutation work
```

Concrete character/byte limits belong to IM-3 family-action design and runtime hard-cap work.

IM-1 freezes only the requirement that every action declare bounded payload shape.

## 19. Plain-text boundary

For text-bearing user intent:

```text
user payload
= plain semantic text input
```

It must not grant raw HTML/script/style authority.

Presentation and future mutation consumers must preserve the existing escaped/plain-text boundary unless a later rich-text contract is explicitly designed.

## 20. Action registry model

IM-1 freezes a conceptual registry:

```text
SourceInteractionActionRegistry
```

Each admitted action record must define at least:

```text
actionKind
family
plane
payloadShape
targetRequirement
currentnessRequirements
downstreamOwner
status
```

This is design vocabulary, not runtime data.

## 21. Initial registry state

### View-local action class

Conceptual admitted actions may include:

```text
VIEW_EXPAND
VIEW_COLLAPSE
VIEW_OPEN_DETAIL
VIEW_CLOSE_DETAIL
VIEW_COPY_ACCEPTED_TEXT
```

Their downstream owner is presentation/view state.

They may not mutate semantic source state.

### First semantic mutation candidate

```text
BOARD_APPEND_REPLY
```

Status:

```text
DESIGN_ADMITTED
DOWNSTREAM_DURABLE_TARGET_REQUIRED
RUNTIME_NOT_AUTHORIZED
```

### Deferred semantic actions

```text
BOARD_ADD_POST
BOARD_EDIT_ITEM
BOARD_DELETE_ITEM
BOARD_REROLL_ITEM
BOARD_RECOMMEND
SOCIAL_FEED_CREATE_POST
SOCIAL_FEED_REPLY
SOCIAL_FEED_QUOTE
SOCIAL_FEED_REPOST
SOCIAL_FEED_REACT
```

No runtime authority is implied by listing them.

## 22. Target requirement classes

IM-1 freezes these target requirement classes:

```text
NO_SEMANTIC_TARGET
CURRENT_PRESENTATION_TARGET
DURABLE_SEMANTIC_TARGET
MATERIALIZATION_TARGET
```

Meaning:

### `NO_SEMANTIC_TARGET`

Pure view-local operation such as collapse/expand.

### `CURRENT_PRESENTATION_TARGET`

A presentation-only action attached to a current rendered item, such as copy accepted text.

### `DURABLE_SEMANTIC_TARGET`

A semantic mutation that must later address the exact same derived object under Candidate C.

`BOARD_APPEND_REPLY` requires this class.

### `MATERIALIZATION_TARGET`

Reserved for IM-5 effect work.

## 23. Ordered stale-event gate

IM-1 freezes the following first-safe ordering:

```text
0. envelope / payload structural bounds
1. interaction attempt duplicate-dispatch check
2. current runtime generation check
3. interaction control binding lookup
4. current presentation instance / host binding check
5. family + action registry consistency check
6. current source projection check
7. source support-at-use check when required by the action
8. current presentation target check when required
9. durable-target requirement handoff when required
10. action-specific policy handoff
```

No step may silently repair a failure from an earlier step.

## 24. Gate 0 · structural bounds

Malformed intent shape or invalid bounded payload fails as:

```text
INVALID_INTENT_SHAPE
INVALID_PAYLOAD
PAYLOAD_LIMIT_EXCEEDED
```

No semantic target resolution occurs afterward.

## 25. Gate 1 · duplicate dispatch

If an already-consumed `InteractionAttemptRef` is observed again inside its bounded dispatch horizon:

```text
DUPLICATE_ATTEMPT
→ drop duplicate dispatch
```

This is not a semantic mutation failure and does not create a retry.

## 26. Gate 2 · runtime generation

The event must belong to the current active runtime/effect generation.

Failure:

```text
STALE_RUNTIME_GENERATION
```

Required behavior:

```text
DROP
NO RETARGET
NO RETRY
NO STATE MUTATION
```

Runtime generation is an effect-lifecycle predicate, not source support authority.

## 27. Gate 3 · control binding lookup

The submitted control binding must resolve in the current interaction-control owner.

Failure:

```text
CONTROL_BINDING_NOT_FOUND
CONTROL_BINDING_RETIRED
```

No fallback to DOM attributes or text matching is allowed.

## 28. Gate 4 · presentation currentness

The control binding must still point to the exact current presentation instance/binding it was created for.

Conceptual failures:

```text
STALE_PRESENTATION_INSTANCE
STALE_HOST_PRESENTATION_BINDING
```

LRE-1 currently confirms that exact host presentation identity is not yet runtime-ready.

Therefore:

```text
IM-1 DESIGN CAN FREEZE THIS REQUIREMENT
BUT ACTIVE HOST EVENT INTEGRATION REMAINS BLOCKED UNTIL HOST BINDING IS PROVEN
```

## 29. Gate 5 · family/action consistency

The current binding and action registry must agree on:

```text
family
actionKind
plane
target requirement
```

Mismatch:

```text
ACTION_BINDING_MISMATCH
FAMILY_ACTION_MISMATCH
PLANE_ESCALATION_REJECTED
```

The caller cannot change a VIEW_LOCAL binding into SOURCE_MUTATION by altering event payload.

## 30. Gate 6 · source projection currentness

A control bound to an old source projection must not act on a newer projection merely because the UI slot looks similar.

Failure:

```text
STALE_SOURCE_PROJECTION
```

Forbidden repair:

```text
old projection item ordinal 2
→ new projection also has item ordinal 2
→ retarget automatically
```

Projection ordinals are not durable identity.

## 31. Gate 7 · source support-at-use

For actions whose semantics depend on current source support, IM-1 requires the existing 3M-6 support owner to be consulted.

Conceptual outcome:

```text
SUPPORTED_CURRENT
→ continue

UNSUPPORTED_SCOPE
INVALID_AUTHORITY_UNAVAILABLE
INVALID_AUTHORITY_MISMATCH
→ reject semantic action
```

IM-1 does not rescan chat history or reconstruct support itself.

## 32. View-local support exception is explicit

Some purely local view actions may not require source-support revalidation if all of the following are true:

```text
action changes only ephemeral presentation state
current runtime/presentation binding is still valid
no semantic data is written
no model/network/effect work is started
no durable state is created
```

A concrete view action may declare this exemption in the action registry.

The exemption must not leak into semantic mutation actions.

## 33. Gate 8 · current presentation target

For actions on a particular visible item, the bound presentation route must still resolve to an accepted current presentation item.

Failure examples:

```text
TARGET_NOT_FOUND
TARGET_NO_LONGER_PRESENTED
TARGET_QUARANTINED
```

A hidden/quarantined item may not be reactivated through stale UI residue.

## 34. Gate 9 · durable target handoff

If the action requires `DURABLE_SEMANTIC_TARGET`, IM-1 stops at a typed handoff.

For `BOARD_APPEND_REPLY`:

```text
current safe interaction intent
+ current Board presentation target
→ DURABLE_TARGET_REQUIRED
→ hand off to IM-2 / Candidate C target contract
```

IM-1 does not invent the Board durable locator.

It does not promote:

```text
presentation item ordinal
DOM index
control binding
host message index
content fingerprint
```

into durable identity.

## 35. Gate 10 · action-specific policy handoff

Passing IM-1 gates means only:

```text
THIS IS A CURRENT, WELL-FORMED, CORRECTLY ROUTED USER INTENT
```

It does not mean:

```text
SEMANTIC MUTATION AUTHORIZED
```

The family action owner must still decide mutation semantics under IM-2/IM-3 and existing family validators.

## 36. Intent result vocabulary

IM-1 freezes a conceptual result vocabulary.

### Accepted routing states

```text
VIEW_LOCAL_ACCEPTED
CURRENT_INTENT_READY_FOR_DOWNSTREAM
DURABLE_TARGET_REQUIRED
MATERIALIZATION_POLICY_REQUIRED
```

### Rejected / dropped states

```text
INVALID_INTENT_SHAPE
INVALID_PAYLOAD
PAYLOAD_LIMIT_EXCEEDED
DUPLICATE_ATTEMPT
STALE_RUNTIME_GENERATION
CONTROL_BINDING_NOT_FOUND
CONTROL_BINDING_RETIRED
STALE_PRESENTATION_INSTANCE
STALE_HOST_PRESENTATION_BINDING
ACTION_BINDING_MISMATCH
FAMILY_ACTION_MISMATCH
PLANE_ESCALATION_REJECTED
STALE_SOURCE_PROJECTION
SOURCE_SUPPORT_UNAVAILABLE
SOURCE_SUPPORT_MISMATCH
TARGET_NOT_FOUND
TARGET_NO_LONGER_PRESENTED
TARGET_QUARANTINED
UNSUPPORTED_ACTION
```

These are bounded control-plane diagnostics, not model-authored statuses.

## 37. Fail-closed stale-event law

For any stale/currentness failure:

```text
DROP THE EVENT
DO NOT RETARGET
DO NOT REFRESH EXPECTED IDENTITY
DO NOT SEARCH FOR A SIMILAR ITEM
DO NOT QUEUE A HIDDEN RETRY
DO NOT START A MODEL CALL
DO NOT MUTATE SOURCE STATE
```

The user may initiate a new current interaction if desired.

## 38. No hidden retry queue

IM-1 does not authorize:

```text
retry stale interaction after next render
replay failed interaction after runtime reload
queue mutation until target reappears
re-submit old user payload against a newer revision
```

A stale user action is not automatically current intent later.

Canonical rule:

```text
OLD INTENT
DOES NOT GAIN NEW AUTHORITY FROM LATER STATE
```

## 39. No fuzzy retarget

Forbidden:

```text
post ID missing
→ find same text
→ target that
```

or:

```text
old reply target missing
→ choose nearest surviving post
```

or:

```text
same handle / title / body
→ assume same target
```

Exact targeting belongs to Candidate C where semantic mutation requires it.

## 40. No implicit semantic repair

If a control binding resolves but its source projection is stale, the interaction layer must not rewrite the binding to the new projection.

If the user wants to act on the new projection, the new presentation must issue a new control binding and the user must act on that current control.

## 41. Runtime reload semantics

For the first interaction design:

```text
runtime reload
→ all InteractionControlBindingRef values invalid
→ all InteractionAttemptRef dispatch state invalid/discarded
→ no event replay
```

Durable semantic objects may later survive through Candidate C, but interaction controls do not.

Canonical distinction:

```text
DURABLE SOURCE OBJECT MAY SURVIVE
!=
OLD UI CONTROL MAY SURVIVE
```

## 42. Reroll semantics

When the bound source/presentation is rerolled or replaced:

```text
old interaction controls become stale
```

Even if:

```text
same host slot remains
same visual layout remains
same text happens to reappear
```

A new current presentation issues new interaction control bindings.

## 43. Manual edit semantics

LRE-1 already selects fail-closed invalidation for a bound assistant message after manual edit unless a later reconcile contract proves otherwise.

IM-1 inherits:

```text
MANUAL EDIT INVALIDATES OLD SOURCE PRESENTATION BINDING
→ OLD INTERACTION CONTROLS INVALID
```

No interaction may ride across the edit by text equality.

## 44. Render refresh semantics

A pure render refresh that preserves the exact same current presentation binding may regenerate physical DOM nodes.

This must not create new semantic intent by itself.

A future implementation may either:

```text
preserve the same interaction-control routing owner where safe
or
issue replacement ephemeral control bindings
```

but in both cases old physical event handlers must not remain active after owner replacement.

## 45. Presentation cleanup ownership

Interaction handler lifecycle follows presentation/runtime cleanup ownership.

A future active host integration must guarantee:

```text
mount current controls
update current controls
unmount retired controls
dispose old runtime control owner
```

No orphan event listener may retain semantic action authority.

## 46. Event handler cardinality

IM-1 does not mandate event delegation versus per-control listeners.

It freezes the semantic invariant:

```text
ONE CURRENT PRESENTATION CONTROL ROUTE
→ AT MOST ONE CURRENT SEMANTIC DISPATCH OWNER
```

Duplicate physical listeners must not cause duplicate semantic dispatch.

`InteractionAttemptRef` may participate in bounded duplicate-dispatch protection, but exact host mechanics remain future implementation work.

## 47. User-authored text preservation

For a future `BOARD_APPEND_REPLY` user-authored mutation, the interaction layer should carry the user's bounded exact text as user input.

It should not silently rewrite that text for style or truth strength in IM-1.

Any model-assisted transformation requires a separate explicit model-assisted mutation contract.

## 48. User text is publication input, not canonical truth

If the user intentionally submits text to a public source surface, later IM-3 may treat that as a current user publication action for that exact text under 3M-2 policy.

But:

```text
USER SUBMITTED TEXT
!=
CANONICAL WORLD FACT
```

IM-1 carries intent; it does not adjudicate truth.

## 49. No model call in IM-1

The intent control plane requires no model call.

Frozen design budget:

```text
interaction capture
+ bounded validation
+ currentness checks
+ typed downstream handoff
```

No semantic generation occurs here.

## 50. No network / media work in IM-1

An action classified as `EXTERNAL_MATERIALIZATION` may only reach:

```text
MATERIALIZATION_POLICY_REQUIRED
```

in IM-1.

No provider call, image fetch, generation job, attachment, retry, polling, or async queue is authorized.

Those belong to IM-5 and Candidate C C8 where applicable.

## 51. Source-irrelevant dormancy

IM-1 inherits 3M-9.

When no interactive source surface/control is active:

```text
no interaction registry dispatch
no event listener work attributable to source interaction
no stale-event checks
no Candidate C target resolution
no persistent lookup
no model call
no network call
```

A future implementation may use a bounded existing host event surface, but source interaction must not create global polling or full-history scanning.

## 52. Diagnostics boundary

A future bounded interaction receipt may conceptually include:

```text
family
actionKind
plane
result code
currentness failure class
payload length
attempt duplicate yes/no
```

It should not retain by default:

```text
full user reply text
raw DOM HTML
hidden/quarantined source content
source fingerprints
full durable object payloads
arbitrary event objects
```

Diagnostics are observational and bounded.

## 53. Failure taxonomy separation

IM-1 adds interaction-control failures without collapsing existing failure classes.

```text
STALE INTERACTION EVENT
!=
SOURCE SUPPORT INVALIDATION
!=
ASSERTION POLICY QUARANTINE
!=
DURABLE REVISION MISMATCH
!=
PRESENTATION FAILURE
!=
MATERIALIZATION FAILURE
```

Examples:

```text
old button click after runtime replacement
→ stale interaction event

current Board source loses source support
→ source support invalidation

current target post exists but reply candidate violates policy
→ later family mutation validation failure

correct durable post ID but old expected revision
→ CC-2/IM-3 revision mismatch

CSS fails after semantic commit
→ presentation failure
```

## 54. Interaction currentness is not semantic revision currentness

An event may come from the current presentation instance yet target an old durable semantic revision if the source object changed without the control being refreshed correctly.

Therefore IM-2/IM-3 must still check durable locator/revision as required.

Canonical rule:

```text
CURRENT BUTTON
!=
CURRENT DURABLE REVISION PROVEN
```

Likewise:

```text
CURRENT DURABLE REVISION
!=
CURRENT RUNTIME EVENT PROVEN
```

Both may be required.

## 55. CC-2 operation token boundary

IM-1 does not allocate Candidate C operation authority tokens.

`InteractionAttemptRef` is not a substitute.

If later `BOARD_APPEND_REPLY` can race or retry in a way that creates stale late mutation authority, IM-3 must apply the CC-2 operation-currentness contract.

Canonical rule:

```text
INTERACTION ATTEMPT REF
!=
SEMANTIC OPERATION AUTHORITY TOKEN
```

## 56. CC-5 append boundary

CC-5 already freezes the common semantics for `APPEND_CHILD`.

IM-1 therefore does not redefine:

```text
parent durable identity
expected parent revision
new child identity
append ordering
duplicate child prevention
validation before commit
presentation reconciliation
```

Those are consumed by IM-2/IM-3 for BOARD.

## 57. Host coupling blocker remains real

LRE-1 confirms that the current presentation mount path lacks a fully frozen identity-bearing source mount.

Therefore active IM-1 runtime integration remains blocked by the same host identity problem.

Conceptual blocker:

```text
BLOCKER · INTERACTION_EVENT_SOURCE_MOUNT_IDENTITY_UNPROVEN
```

Reason:

```text
safe semantic interaction requires proof of which exact current source surface/control the user acted on
```

IM-1 does not solve this by hidden transcript markers, content hashes, DOM order, or legacy prose parsing.

## 58. No hidden transcript interaction bridge

Forbidden:

```text
store hidden target marker in assistant transcript
→ read marker from display
→ use as semantic interaction identity
```

This would contaminate stored/model context and conflate presentation routing with semantic durable identity.

## 59. No raw DOM snapshot as mutation input

The mutation consumer must not receive the DOM subtree and reconstruct source state from it.

Required direction:

```text
DOM event
→ control binding
→ current validated semantic/presentation owners
→ typed intent
```

not:

```text
DOM card HTML
→ parse post text/author/index
→ synthesize mutation target
```

## 60. Security / trust boundary

Treat all event-carried values as untrusted until resolved against plugin-owned current bindings and action policy.

This includes values originating from:

```text
data-* attributes
form inputs
button values
custom event detail
query selectors
DOM text
```

The user payload itself is intentional user input but not trusted authority metadata.

## 61. Initial action admission matrix

| Action | Plane | Target requirement | IM-1 result | Later owner |
| --- | --- | --- | --- | --- |
| VIEW_EXPAND | VIEW_LOCAL | CURRENT_PRESENTATION_TARGET | VIEW_LOCAL_ACCEPTED | Presentation view state |
| VIEW_COLLAPSE | VIEW_LOCAL | CURRENT_PRESENTATION_TARGET | VIEW_LOCAL_ACCEPTED | Presentation view state |
| VIEW_OPEN_DETAIL | VIEW_LOCAL | CURRENT_PRESENTATION_TARGET | VIEW_LOCAL_ACCEPTED | Presentation view state |
| VIEW_COPY_ACCEPTED_TEXT | VIEW_LOCAL | CURRENT_PRESENTATION_TARGET | VIEW_LOCAL_ACCEPTED | Presentation/local clipboard effect |
| BOARD_APPEND_REPLY | SOURCE_MUTATION | DURABLE_SEMANTIC_TARGET | DURABLE_TARGET_REQUIRED | IM-2 / IM-3 / Candidate C |
| BOARD_ADD_POST | SOURCE_MUTATION | future family-owned | UNSUPPORTED_ACTION for first slice | later IM-3 |
| BOARD_EDIT_ITEM | SOURCE_MUTATION | DURABLE_SEMANTIC_TARGET | UNSUPPORTED_ACTION for first slice | later IM-3 |
| BOARD_DELETE_ITEM | SOURCE_MUTATION | DURABLE_SEMANTIC_TARGET | UNSUPPORTED_ACTION for first slice | later IM-3 |
| BOARD_REROLL_ITEM | SOURCE_MUTATION | DURABLE_SEMANTIC_TARGET | UNSUPPORTED_ACTION for first slice | later IM-3 |
| SOCIAL_FEED_* | SOURCE_MUTATION | future | UNSUPPORTED_ACTION | IM-4 |
| media actions | EXTERNAL_MATERIALIZATION | MATERIALIZATION_TARGET | MATERIALIZATION_POLICY_REQUIRED only after later admission | IM-5 |

This matrix is design-only.

## 62. First `BOARD_APPEND_REPLY` routing example

Conceptual safe flow:

```text
current BOARD post is rendered
        ↓
plugin creates current opaque interaction control binding B
        ↓
user opens reply composer and submits bounded plain text
        ↓
new InteractionAttemptRef A
        ↓
SourceInteractionIntent
  origin = USER_DIRECT_SOURCE_UI
  plane = SOURCE_MUTATION
  family = BOARD
  actionKind = BOARD_APPEND_REPLY
  binding = B
  attempt = A
  payload = exact bounded user reply text
        ↓
IM-1 stale-event gates
        ↓
DURABLE_TARGET_REQUIRED
        ↓
IM-2 resolves exact durable BOARD_POST target
        ↓
IM-3 applies append semantics later
```

No Board mutation happens inside IM-1.

## 63. Stale click example

```text
BOARD projection P1 rendered
→ button binding B1 created
→ source reroll creates P2
→ B1 becomes stale
→ user clicks old DOM residue / delayed event from B1
```

Required result:

```text
STALE_SOURCE_PROJECTION
or retired binding result
→ DROP
```

Forbidden:

```text
find corresponding post in P2 and continue
```

## 64. Runtime replacement example

```text
runtime generation G1 mounts interaction owner
→ source control B1
→ plugin/runtime replaced by G2
→ late event handler from G1 fires
```

Required result:

```text
STALE_RUNTIME_GENERATION
→ DROP
```

The old handler may not mutate semantic state even if the durable target is otherwise still alive.

## 65. Duplicate callback example

```text
one user submit
→ captured as attempt A
→ same physical callback path dispatches A twice
```

Required:

```text
first A may proceed
second A → DUPLICATE_ATTEMPT
```

But:

```text
user presses submit twice intentionally
→ A1, A2
```

are two attempts and are not collapsed by equal reply text.

Whether both semantic appends should ultimately commit belongs to IM-3 duplicate/append policy.

## 66. Acceptance conditions for IM-1 design

IM-1 design is complete only if all are explicit:

```text
interaction controls are ephemeral and plugin-owned
DOM values are not semantic authority
intent envelope is bounded
plane escalation is impossible through payload
stale runtime/presentation/projection events fail closed
no fuzzy retarget exists
duplicate dispatch differs from a second user attempt
view-local interaction remains non-semantic
semantic mutation stops at durable-target handoff
InteractionAttemptRef != CC-2 operation token
host mount identity blocker remains visible
no runtime/persistence/model/network authority is implied
```

## 67. Blockers for active runtime implementation

IM-1 design is not runtime-ready.

At minimum, future implementation requires then-current proof for:

```text
exact identity-bearing source presentation mount / event origin
current runtime generation ownership
current presentation binding lifecycle
current source projection binding
bounded action registry integration
IM-2 durable target contract for BOARD_APPEND_REPLY
IM-3 actual mutation policy
hard payload/action caps
cleanup / event-handler cardinality
```

These are implementation-readiness gates, not work performed by IM-1.

## 68. Explicit non-goals

```text
NO DOM/event implementation
NO runtime action registry
NO mutation reducer
NO BOARD durable ID schema
NO revision store
NO history store
NO source write
NO append commit
NO model call
NO source reroll implementation
NO media operation
NO async queue
NO persistence
NO context re-entry
NO release transaction
NO release-simcore mutation
```

## 69. Frozen invariants

```text
I1  intent precedes semantic mutation
I2  UI event data is routing/user input, not semantic authority
I3  control binding is opaque, ephemeral, and presentation-lifetime scoped
I4  control binding != durable object identity
I5  stale runtime/presentation/projection events fail closed
I6  no fuzzy retarget or hidden retry
I7  action registry owns family/plane/action admission
I8  event payload cannot escalate VIEW_LOCAL into SOURCE_MUTATION
I9  duplicate dispatch != repeated intentional user action
I10 InteractionAttemptRef != semantic operation token
I11 current interaction != current durable revision proof
I12 semantic mutation requires downstream Candidate C target resolution
I13 source support remains owned by existing support authorities
I14 view-local actions remain non-semantic
I15 host mount identity blocker remains explicit
I16 no runtime implementation authority is created
```

## 70. IM workstream status

```text
IM-0  Interaction / Materialization Master Design
      = FROZEN

IM-1  Source Interaction Intent + Stale Event Safety
      = FROZEN BY THIS DOCUMENT

IM-2  Candidate C Minimum Durable Target Contract
      first consumer = BOARD_APPEND_REPLY
      = NEXT

IM-3  Interactive BOARD Mutation Semantics
      = PENDING

IM-4  Interactive SOCIAL_FEED Mutation Semantics
      = PENDING

IM-5  External Media Materialization / Async Ownership
      = PENDING

IM-6  Integration / Failure Isolation / Performance / Validation
      = PENDING
```

## 71. Frozen state

```text
IM1_DESIGN                         = FROZEN
CONTROL_BINDING                    = OPAQUE_EPHEMERAL_PRESENTATION_SCOPED
INTENT_POLICY                      = INTENT_BEFORE_MUTATION
STALE_EVENT_POLICY                 = FAIL_CLOSED
FUZZY_RETARGET                     = FORBIDDEN
HIDDEN_RETRY                       = FORBIDDEN
FIRST_MUTATION_ACTION              = BOARD_APPEND_REPLY
BOARD_APPEND_REPLY_RUNTIME         = NOT AUTHORIZED
DURABLE_TARGET_RESOLUTION          = DEFERRED TO IM-2
SEMANTIC_MUTATION                  = NOT AUTHORIZED
MODEL_CALL                         = NONE
NETWORK / MEDIA                    = NONE
PERSISTENCE                        = NONE
PRODUCTION                         = UNCHANGED
release-simcore                    = UNCHANGED
NEXT                               = IM-2 MINIMUM DURABLE TARGET CONTRACT
```
