# SimCore Post-3.0M IM-5 External Materialization / Async Operation Ownership Design — 2026-09-03

Date: 2026-09-03 KST

Status: **IM-5 DESIGN FROZEN · FIRST ASYNC CONSUMER = SOCIAL_ITEM OPTIONAL_DECORATIVE_TILE_V1 · C8 CONCRETE CONSUMER ACTIVE · EXACT TARGET + EXACT REVISION + OWNER-SCOPED SLOT + CURRENT OPERATION TOKEN · LATE SUCCESS / FAILURE FAIL-CLOSED · SEMANTIC MEDIA DEFERRED · NO MODEL / PROVIDER / NETWORK RUNTIME AUTHORITY · NO MEDIA STORE · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · INTERACTION / MATERIALIZATION · IM-5 · EXTERNAL MATERIALIZATION · ASYNC EFFECT OWNERSHIP · C8 · DESIGN-ONLY**

## 0. Purpose

IM-5 freezes the first concrete external-materialization contract for the Interaction / Materialization workstream.

The selected first consumer is deliberately narrow:

```text
SOCIAL_ITEM
+
OPTIONAL_DECORATIVE_TILE_V1
```

The design question is not merely how to obtain an image.

The real question is:

```text
An external effect starts for exact durable source item T @ revision R.
The UI, target, support, revision, or requested decoration may change before the effect returns.

When does the late result still have authority to attach?
When must it be dropped even if generation/fetch succeeded?
How is an old failure prevented from clearing a newer success?
How is presentation decoration kept separate from source truth?
```

IM-5 is design-only.

It does not implement image generation, remote fetch, provider clients, URLs, blob storage, object URLs, media rendering, background workers, retries, network access, model calls, source mutation, semantic media, runtime event handlers, host mount changes, release changes, or `release-simcore` mutation.

## 1. Authority chain

IM-5 consumes without reopening:

```text
docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_INTERACTION_IM1_SOURCE_INTERACTION_INTENT_STALE_EVENT_SAFETY_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM2_BOARD_APPEND_REPLY_MINIMUM_DURABLE_TARGET_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM3_INTERACTIVE_BOARD_MUTATION_SEMANTICS_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM4_INTERACTIVE_SOCIAL_FEED_MUTATION_SEMANTICS_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_SOCIAL_FEED_SF5_METRICS_MEDIA_BOUNDARY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC8_DELAYED_EFFECT_MEDIA_ATTACHMENT_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/REPOSITORY_COMMON_RULES.md
```

Production runtime authority remains `release-simcore`.

Inherited firewalls remain authoritative:

```text
UI INTENT != MATERIALIZATION COMMIT
DURABLE TARGET ID != SEMANTIC REVISION
SEMANTIC REVISION != OPERATION AUTHORITY
OPERATION AUTHORITY != RUNTIME / PRESENTATION EPOCH
PROVIDER SUCCESS != ATTACHMENT AUTHORITY
MEDIA PRESENCE != SOURCE TRUTH
DECORATIVE MEDIA != SOURCE MEDIA
FOUND BY ID != SUPPORTED FOR USE
VISIBLE DOM SLOT != SEMANTIC TARGET ID
OLD FAILURE != CURRENT CLEANUP AUTHORITY
C8 ATTACHMENT != C6 MODEL CONTEXT RE-ENTRY
C8 ATTACHMENT != C5 DERIVED TRUTH LINEAGE
```

## 2. Terminology normalization

Existing documents use different numeric shorthand for media classes.

The Interaction master / CC-8 family uses:

```text
M0 STATIC PRESENTATION ASSET
M1 OPTIONAL PRESENTATION MATERIALIZATION
M2 SEMANTIC MEDIA ATTACHMENT
```

SF-5 uses:

```text
G0 LOCAL PRESENTATION GLYPH
M0 OPTIONAL EXTERNAL PRESENTATION MATERIALIZATION
M1 SEMANTIC SOURCE MEDIA
M2 DURABLE / DELAYED EXACT-OBJECT MEDIA
```

IM-5 therefore freezes semantic names as the canonical vocabulary for this workstream.

```text
LOCAL_PRESENTATION_DERIVATION
OPTIONAL_EXTERNAL_PRESENTATION_MATERIALIZATION
SEMANTIC_SOURCE_MEDIA
DELAYED_EXACT_OBJECT_MEDIA_EFFECT
```

Numeric labels remain document-local aliases only.

Canonical rule:

```text
MEANING NAME > NUMERIC MEDIA LABEL
```

This prevents `M0` / `M1` from silently changing meaning across family boundaries.

## 3. IM-5 capability profile

IM-5 concretely consumes Candidate C C8 for one real product seam.

```text
C1 survival         = YES, target may outlive one projection in current runtime
C2 stable identity  = YES, exact SOCIAL_ITEM target
C3 semantic mutation = NO; decoration is not target semantic state
C4 append/merge     = NO
C5 derived lineage  = NO
C6 context re-entry = NO
C7 partial survival = NO
C8 delayed effect   = YES, concrete consumer active
```

Important qualification:

```text
C8 CONCRETE CONSUMER ACTIVE
!=
RUNTIME ASYNC PIPELINE AUTHORIZED
```

## 4. First concrete consumer

Selected first consumer:

```text
owner family = SOCIAL_FEED
exact target namespace = SOCIAL_ITEM
slot = OPTIONAL_DECORATIVE_TILE_V1
materialization class = OPTIONAL_EXTERNAL_PRESENTATION_MATERIALIZATION
semantic role = NONE
```

Why `SOCIAL_ITEM` first:

- IM-4 already provides exact durable item identity;
- one feed item provides a clean exact-object attachment target;
- no new durable actor/account object is required;
- the consumer exercises C8 without reopening Board mutation semantics;
- the result can fail soft without affecting source validity.

## 5. Why the first consumer is not an avatar

A generated avatar creates pressure to answer:

```text
which actor identity owns it?
does it depict the actor?
is it a profile image?
does it persist with the account?
```

SOCIAL_FEED intentionally does not have durable actor/account identity.

Therefore:

```text
GENERATED AVATAR
= NOT FIRST IM-5 CONSUMER
```

The first consumer targets a durable `SOCIAL_ITEM`, not a snapshot-local actor.

## 6. Why the first consumer is not a semantic illustration

A content-derived illustration may visually introduce facts that the source text did not establish.

Examples:

```text
text says "an incident occurred"
image depicts exact suspect appearance

text says "a building was damaged"
image invents location / casualty / weapon details
```

Even if called decoration, that can become semantic leakage in ordinary UI.

Therefore the first profile is deliberately non-narrative:

```text
OPTIONAL_DECORATIVE_TILE_V1
```

It must not claim to depict:

```text
actor appearance
event appearance
location
object appearance
source screenshot
photo evidence
canonical world state
```

## 7. `OPTIONAL_DECORATIVE_TILE_V1`

Conceptual presentation role:

```text
abstract / non-photographic visual ornament
attached to one exact SOCIAL_ITEM presentation surface
```

Required first-profile properties:

```text
non-semantic
non-evidentiary
non-photographic by contract
no readable generated text required
no logo / platform credential implication
no actor portrait implication
fail-soft
not part of validated SOCIAL_FEED semantic sidecar
not model-context data
```

The exact visual style is future presentation/provider policy.

## 8. Input minimization

The first decorative profile should not require source body text.

Preferred bounded materialization basis:

```text
accepted item kind
presentation adapter identity
slot policy version
bounded non-semantic style seed / request parameters
```

Default excluded inputs:

```text
item body text
assertions
actor handle/displayName
quoted target body
raw transcript
Knowledge
quarantined content
hidden history
private source data
```

Canonical rule:

```text
FIRST C8 CONSUMER
SHOULD PROVE TEMPORAL SAFETY
WITHOUT CREATING A CONTENT-EXFILTRATION CHANNEL
```

A later content-derived illustration requires a separate semantic-risk review.

## 9. User-explicit start only

First IM-5 start authority is explicit and current.

Conceptual flow:

```text
current user action
→ IM-1 EXTERNAL_MATERIALIZATION intent
→ exact current SOCIAL_ITEM target
→ IM-5 start gate
```

No first-scope behavior may do:

```text
background scan of old social items
automatic image generation for every visible item
idle-time enrichment
prefetch all source cards
historical materialization queue
```

Canonical rule:

```text
NO CURRENT MATERIALIZATION REQUEST
→ EXTERNAL MATERIALIZATION WORK = 0
```

## 10. Control-plane handoff

IM-1 owns proof that the current UI event is legitimate.

IM-5 receives only a current materialization intent.

Conceptually:

```text
SourceInteractionIntentV1
  plane = EXTERNAL_MATERIALIZATION
  family = SOCIAL_FEED
  actionKind = MATERIALIZE_OPTIONAL_DECORATIVE_TILE
  interactionControlBindingRef
  interactionAttemptRef
```

Important separation:

```text
InteractionAttemptRef
!=
MaterializationOperationToken
```

The first identifies one current UI dispatch attempt.
The second owns a potentially delayed attachment operation.

## 11. Exact target contract

The materialization request must resolve an exact durable target:

```text
SocialItemDurableLocator
+
expectedSemanticRevision
```

Forbidden target substitutes:

```text
itemOrdinal
timelineOrdinal
DOM index
CSS selector
content hash alone
handle
"latest post"
```

No fuzzy retargeting is permitted.

## 12. First revision policy

Although the first decorative tile does not carry semantic content, IM-5 intentionally selects the conservative C8 default:

```text
current target semantic revision
MUST equal
captured expected semantic revision
```

Therefore:

```text
T @ R3 starts decoration A
T becomes R4
A completes
→ STALE_TARGET_REVISION
→ DROP A
```

This proves the strict delayed-effect path before any narrower compatibility optimization is attempted.

A later checkpoint may authorize declared field-dependency compatibility.

## 13. Owner-scoped slot

First attachment slot:

```text
SocialItemOptionalDecorativeTileSlotV1
```

Conceptual ownership:

```text
owner = INTERACTIVE_SOCIAL_FEED presentation/materialization owner
scope = exact SOCIAL_ITEM locator
slotKind = OPTIONAL_DECORATIVE_TILE_V1
cardinality = 0..1 attached result
concurrency = one current superseding attempt
```

The slot is not part of the SOCIAL_ITEM semantic content revision.

## 14. Slot state is semantic-adjacent presentation state

First design chooses:

```text
TARGET SEMANTIC REVISION DOES NOT ADVANCE
WHEN DECORATIVE TILE ATTACHES / CLEARS
```

Reason:

The target source proposition is unchanged.

Canonical distinction:

```text
SOCIAL_ITEM semantic revision
!=
materialization slot state
```

The slot has its own operation-currentness state.

## 15. Operation authority token

One opaque `MaterializationOperationToken` is allocated by the slot owner before delayed work begins.

Conceptual rule:

```text
slot S current token = T2
late result carries T1
T1 != T2
→ STALE_SUPERSEDED_OPERATION
→ DROP
```

The token is not:

```text
SOCIAL_ITEM ID
semantic revision
provider request ID
asset ID
runtime epoch
InteractionAttemptRef
```

## 16. New request supersedes old request

For the same exact target + slot:

```text
request A installs token TA
request B installs token TB
TB becomes current
TA loses attachment authority immediately
```

Provider cancellation for A may be attempted in a future implementation, but correctness does not depend on provider cancellation succeeding.

The commit-time token gate is authoritative.

## 17. Start-time gate

Before external work begins, all of the following must pass:

```text
1. current IM-1 materialization intent
2. exact SOCIAL_ITEM locator resolves
3. target alive inside current-runtime lifetime
4. target current revision captured
5. target support-at-use currently valid
6. requested slot admitted for current family/item
7. bounded materialization input policy passes
8. current operation token installed
9. runtime/presentation epoch captured if live attachment depends on it
10. concrete provider budget/cap policy exists before runtime use
```

If any required step fails:

```text
DO NOT START EXTERNAL WORK
```

## 18. Provider is an effect worker, not an authority owner

A future provider may be:

```text
image generator
remote decorative asset service
controlled thumbnail service
other bounded external effect producer
```

But provider result means only:

```text
computation / fetch produced candidate effect data
```

It does not mean:

```text
target is still current
result may attach
source claim is true
actor identity is verified
media is source evidence
```

## 19. Provider ID is not SimCore operation authority

Provider request IDs may be retained in volatile diagnostics when necessary.

They must not replace:

```text
MaterializationOperationToken
```

Canonical rule:

```text
PROVIDER REQUEST ID
!=
SIMCORE ATTACHMENT AUTHORITY
```

## 20. Provider input security boundary

First profile permits only bounded authorized presentation inputs.

Forbidden defaults include:

```text
raw full conversation
Knowledge/private context
quarantined source text
arbitrary DOM
raw HTML
provider secrets
untrusted remote URL
model-generated arbitrary URL
unbounded historical source data
```

Raw provider prompt/payload is not a durable source-history record.

## 21. Raw prompt persistence

First design:

```text
RAW MATERIALIZATION PROMPT PERSISTENCE = NONE
RAW PROVIDER PAYLOAD PERSISTENCE = NONE
```

Allowed bounded diagnostics may include:

```text
slot kind
policy version
provider class
input field-set identifier
input size
status / reason code
operation lifetime timing
```

They must not become a hidden copy of source content.

## 22. Result validation boundary

Provider success produces untrusted candidate effect data.

Before attachment, a future implementation must validate at least a bounded profile equivalent to:

```text
expected media class
safe content type
bounded bytes
bounded dimensions / duration
no executable payload
asset ownership / lifetime valid
no unsupported transport scheme
```

Concrete numeric caps and accepted media types must be frozen before runtime authorization.

First design does not authorize SVG/HTML/script-capable payloads as ordinary image attachments.

## 23. Commit-time gate

Immediately before any late result changes slot state or current presentation, re-prove:

```text
exact target still resolves
AND target still alive
AND target current revision == expected revision
AND target support-at-use still valid
AND slot still exists under same owner
AND operation token still current
AND provider result passed validation
AND runtime lifecycle current when runtime-bound
AND current presentation binding is exact when live DOM attachment occurs
```

Only then:

```text
ATTACH OPTIONAL DECORATIVE TILE
```

Otherwise:

```text
DROP RESULT FROM CURRENT ATTACHMENT
```

## 24. Late success rule

```text
PROVIDER SUCCESS
!=
CURRENT ATTACHMENT AUTHORITY
```

Examples:

```text
A succeeds after B superseded it
→ drop A

A succeeds after target edit R3→R4
→ drop A

A succeeds after target retirement
→ drop A

A succeeds after support invalidation
→ drop A
```

Successful wasted work is preferable to stale mutation.

## 25. Late failure rule

An old failed operation cannot clear a newer successful tile.

Example:

```text
A starts
B starts
B succeeds and attaches
A later fails
```

Frozen rule:

```text
A FAILURE
→ diagnostic only unless A still owns current token
→ MUST NOT clear B
```

Canonical rule:

```text
OLD FAILURE
!=
CURRENT SLOT CLEANUP AUTHORITY
```

## 26. Cancellation semantics

Cancellation is best-effort effect control plus deterministic authority revocation.

Required correctness mechanism:

```text
revoke / supersede current token
```

Optional future optimization:

```text
also cancel provider request
```

If provider cancellation fails, the late callback still cannot commit because its token is stale.

## 27. Clear decoration

A future explicit `CLEAR_OPTIONAL_DECORATIVE_TILE` action may clear the slot only under current slot/target authority.

It must also revoke any in-flight attempt for that slot.

Clear is presentation/materialization state management, not source-truth deletion.

IM-5 freezes the safety rule but does not authorize a runtime clear control.

## 28. Target edit / reroll

Default first policy:

```text
same locator + new semantic revision
→ all in-flight exact-revision decoration operations become stale
```

Existing already-attached decoration should also be treated as incompatible with the new revision unless a later consumer explicitly freezes survival compatibility.

No visual similarity heuristic may preserve it.

## 29. Target replacement

If old locator L1 is replaced by L2:

```text
L1 slot/token/asset
!= authority for L2
```

No automatic transfer.

A new materialization request for L2 requires fresh current authority.

## 30. Target retirement / deletion

If target retires:

```text
in-flight result cannot revive target
attached presentation tile is removed from current live presentation
late result cannot attach to replacement
```

Historical media retention is outside first IM-5 scope.

## 31. Support invalidation

Support valid at start does not prove support at finish.

If current support fails at commit:

```text
STALE_TARGET_SUPPORT
→ no current attachment
```

The tile is optional presentation data and provides no reason to preserve an otherwise unsupported target.

## 32. Presentation epoch and host coupling

Target semantic identity and presentation identity remain independent.

If a late result attaches into a live presentation surface, future runtime must also prove the presentation/mount instance is still current.

Forbidden fallback:

```text
find a visually similar card in DOM
→ attach result
```

Current LRE-1 host-mount identity blockers remain authoritative.

Therefore:

```text
ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

remains a runtime blocker for live attachment.

## 33. Presentation remount

A presentation remount does not automatically destroy target semantic identity.

Conceptually:

```text
same durable target still alive/current
+ slot result current
+ new exact presentation binding proven
→ current attachment may be rendered in new presentation
```

But a stale callback may not search the DOM and invent that binding itself.

## 34. Attachment lifetime

First attachment lifetime follows the same bounded current-runtime durability posture as the interactive durable target.

```text
CURRENT RUNTIME ONLY
```

No first-scope guarantee across:

```text
reload
conversation change
runtime teardown
browser restart
```

Therefore:

```text
MEDIA DATABASE = NONE
BLOB PERSISTENCE = NONE
RELOAD RESTORE = NONE
```

## 35. Asset reference ownership

A future runtime may use an ephemeral asset reference appropriate to its provider/host environment.

The design requires only:

```text
asset ref lifetime bounded
asset ref cleanup owned
asset ref never used as source truth identity
asset ref never used as target object identity
```

No universal media-ID schema is frozen.

## 36. No model-context re-entry

Attached decoration must not enter future model context automatically.

```text
VISIBLE DECORATIVE TILE
!=
MODEL CONTEXT
```

C6 remains closed for IM-5.

No image description, provider prompt, generated caption, or attachment metadata may be injected into future prompts merely because the tile exists.

## 37. No truth upgrade

Canonical rules:

```text
GENERATED TILE EXISTS
!=
SOURCE CLAIM VERIFIED

REMOTE EFFECT SUCCEEDED
!=
SOURCE FACT CONFIRMED

IMAGE LOOKS PLAUSIBLE
!=
CANONICAL APPEARANCE
```

Materialization status cannot change assertion mode, Exposure, source authority, publication maturity, actor identity, or settlement status.

## 38. Accessibility / semantic labeling

Because the first tile is explicitly decorative:

```text
accessible source meaning remains in accepted text
```

Preferred future rendering posture:

```text
decorative / aria-hidden
or equivalently non-semantic presentation treatment
```

Forbidden accessible claims:

```text
"photo of event"
"profile image"
"evidence image"
```

unless a future semantic-media contract proves those meanings.

## 39. No semantic source-media masquerade

The tile must not be placed or labeled in a way that implies it was authored/uploaded by the represented social actor.

Forbidden first-scope UI implications:

```text
"attached image"
"uploaded photo"
"media from this post"
"source screenshot"
```

The Presentation Renderer must preserve the distinction between:

```text
SOURCE ITEM CONTENT
and
OPTIONAL SIMCORE PRESENTATION DECORATION
```

## 40. Failure isolation

First-scope materialization failure has one ordinary product consequence:

```text
TEXT-ONLY / NORMAL SOURCE PRESENTATION REMAINS VALID
```

No materialization failure may:

```text
quarantine accepted SOCIAL_ITEM semantics
invalidate source authority
trigger model retry
rollback source mutation
create a new source item
change metrics
```

## 41. Concurrency model

First profile chooses one superseding lane per:

```text
(target locator, slot kind)
```

Different targets may have independent attempts.

Different slot kinds, if later introduced, require independent owner-defined lanes.

No global media lock is selected.

## 42. Multiple in-flight targets

A future runtime may support bounded parallelism across different exact targets only after concrete caps exist.

The design does not authorize unbounded fan-out.

Required runtime caps before implementation include at least:

```text
max concurrent external operations per runtime
max concurrent operations per family
max operations per target
max result bytes
max dimensions
max operation duration / stale horizon
max retained attachment refs
max provider input size
```

## 43. Dormancy

When no current materialization request exists:

```text
provider calls = 0
network calls = 0
image/model calls = 0
materialization history scan = 0
background retry = 0
polling = 0
attachment-store scan = 0
```

Ordinary source rendering remains unaffected.

## 44. Diagnostics

Bounded diagnostics may record:

```text
family
namespace
slot kind
operation disposition
reason code
latency bucket / timing metadata
result size class
whether result attached or dropped
```

They should not retain:

```text
raw image bytes
raw provider prompt
secret source text
private URL credentials
quarantined semantic content
```

## 45. First disposition vocabulary

Conceptual IM-5 outcomes:

```text
MATERIALIZATION_STARTED
ATTACHED_CURRENT
DROPPED_TARGET_NOT_FOUND
DROPPED_TARGET_RETIRED
DROPPED_TARGET_REVISION_MISMATCH
DROPPED_TARGET_SUPPORT_INVALID
DROPPED_SLOT_RETIRED
DROPPED_SUPERSEDED_OPERATION
DROPPED_RUNTIME_EPOCH_STALE
DROPPED_PRESENTATION_BINDING_STALE
DROPPED_RESULT_VALIDATION_FAILURE
FAILED_CURRENT_OPERATION
CANCELLED_CURRENT_OPERATION
```

Exact runtime encoding is future implementation detail.

## 46. Semantic media remains deferred

IM-5 does not authorize media whose content changes source meaning.

Still deferred:

```text
post image claimed as source attachment
source screenshot
photo/video evidence
canonical/profile portrait
NEWS evidentiary image
image carrying new claim semantics
OCR-derived source facts
multimodal assertion validation
```

A future semantic-media checkpoint must first define:

```text
media semantic schema
source/provenance owner
visual exposure validation
claim coverage
correction/retraction behavior
storage/lifetime
model-context policy if any
```

## 47. Remote URL fetch remains deferred

An arbitrary remote URL fetch creates additional concerns:

```text
URL authority
redirects
content type
credential leakage
network policy
tracking/privacy
content drift
cache identity
```

Therefore first IM-5 does not freeze arbitrary URL fetching as the concrete provider path.

Provider implementation choice remains future runtime design.

## 48. Candidate C status after IM-5

```text
C1 survival         = ACTIVE for current interactive durable consumers
C2 stable identity  = ACTIVE
C3 item mutation    = not opened by IM-5
C4 append/merge     = ACTIVE from IM-3/IM-4
C5 derived relation = narrow same-family social relation from IM-4
C6 context re-entry = CLOSED
C7 partial survival = CLOSED
C8 delayed effect   = ACTIVE FOR OPTIONAL EXTERNAL PRESENTATION MATERIALIZATION
```

Important:

```text
C8 ACTIVE FOR ONE CONSUMER
!=
GENERIC MEDIA PLATFORM AUTHORIZED
```

## 49. Runtime blockers preserved

IM-5 adds no implementation authority.

At minimum, future runtime requires proof for:

```text
exact Presentation Host mount identity
current source/materialization interaction routing
runtime durable target allocator/store
current operation-token lane implementation
provider security/cap policy
result validation
asset cleanup/lifetime
C8 instrumentation
real stale success/failure tests
```

Production remains unchanged.

## 50. Validation scenarios for IM-6 / future runtime

At minimum, later integration/real-validation must test:

```text
V1 current target/current token → result attaches
V2 same revision, newer request supersedes old → old success drops
V3 same revision, newer success then old failure → old failure does not clear
V4 target revision changes before result → result drops
V5 target replaced by similar object → no retarget
V6 target retired → result drops
V7 source support invalidates → result drops
V8 presentation remount with exact current target → render only through current binding
V9 stale old DOM binding → no attachment
V10 result validation failure → text-only fallback
V11 provider failure → source semantics remain valid
V12 ordinary source turn with no request → zero external work
V13 reload/runtime teardown → no first-scope restoration claim
V14 two different targets → independent bounded lanes
```

## 51. IM-6 handoff

IM-6 receives the complete Interaction / Materialization architecture:

```text
IM-1 intent + stale event safety
IM-2 BOARD_POST durable target
IM-3 BOARD_APPEND_REPLY mutation
IM-4 interactive SOCIAL_FEED create/relations
IM-5 C8 optional external materialization
```

IM-6 should not add a new feature family.

It should converge:

```text
interaction/action registry
Candidate C capability usage
failure isolation
ordinary-turn dormancy
operation/currentness instrumentation
runtime blocker matrix
real validation protocol
```

## 52. Frozen conclusion

IM-5 freezes the first concrete C8 consumer as:

```text
EXPLICIT CURRENT USER REQUEST
+
EXACT DURABLE SOCIAL_ITEM
+
EXACT EXPECTED REVISION
+
OPTIONAL_DECORATIVE_TILE_V1 SLOT
+
CURRENT MATERIALIZATION OPERATION TOKEN
+
COMMIT-TIME TARGET / SUPPORT / TOKEN / RUNTIME RECHECK
+
FAIL-CLOSED LATE RESULT DROP
+
CURRENT-RUNTIME-ONLY ATTACHMENT LIFETIME
+
NO SEMANTIC MEDIA
+
NO MODEL CONTEXT RE-ENTRY
```

The key rule is:

```text
EXTERNAL EFFECT FINISHED
!=
EXTERNAL EFFECT MAY STILL APPLY
```

IM-5 design is frozen.

Runtime implementation remains separately unauthorized.
