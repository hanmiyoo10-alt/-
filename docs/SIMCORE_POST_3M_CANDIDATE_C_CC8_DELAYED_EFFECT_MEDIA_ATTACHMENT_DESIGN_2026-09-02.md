# SimCore Post-3.0M Candidate C CC-8 Delayed Effect / Media Attachment Design — 2026-09-02

Date: 2026-09-02 KST

Status: **CC-8 DESIGN FROZEN · DELAYED EFFECT TARGETING / OPTIONAL MEDIA ATTACHMENT CONTRACT · C8 DESIGN LANE OPEN · SINGLE-SLOT / SINGLE-TARGET FIRST SCOPE · M1 OPTIONAL PRESENTATION MATERIALIZATION ONLY · M2 SEMANTIC MEDIA DEFERRED · DESIGN-ONLY · NO PROVIDER / NETWORK / IMAGE RUNTIME · NO MEDIA STORE · NO BACKGROUND WORK · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · CANDIDATE C · CC-8 · DELAYED EFFECT · MEDIA ATTACHMENT · OPERATION CURRENTNESS · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

CC-8 freezes the minimum Candidate C contract required when an asynchronous or delayed effect intentionally targets a durable derived source object and may finish after that object's semantic state, support, presentation lifecycle, or attachment request has changed.

The motivating example is:

```text
BOARD post P @ revision R3
        ↓
optional illustration generation A begins
        ↓
post changes to R4
or newer illustration generation B supersedes A
        ↓
A finishes late
```

The central question is not whether A succeeded computationally.

The central question is:

```text
Does A still have authority to attach its result to the current durable object state?
```

CC-8 answers:

```text
what exact durable target must a delayed effect bind to?
what semantic revision or compatibility predicate must remain valid?
what operation token owns one attachment attempt?
how does a newer request supersede an older request?
when is runtime/presentation generation additionally required?
how is provider success separated from semantic mutation authority?
when may a result be durably attached versus view-only?
what metadata may persist without storing provider secrets or raw prompts?
what happens after edit, reroll, replacement, retirement, support invalidation, or reload?
when may an attachment survive a semantic revision?
when must a stale successful result be dropped?
how are media truth, model context, and source authority kept separate?
```

CC-8 does not implement image generation, remote fetch, provider clients, media storage, blob upload, URL fetching, media rendering, background enrichment, retry workers, semantic-media assertions, multimodal prompt re-entry, or release changes.

## 1. Authority chain

CC-8 consumes:

```text
SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01
SIMCORE_POST_3M_CANDIDATE_C_CC1_DURABLE_OBJECT_IDENTITY_NAMESPACE_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC4_CONTROLLED_CONTEXT_REENTRY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC5_ITEM_MUTATION_APPEND_RECONCILIATION_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC6_DERIVED_TO_DERIVED_LINEAGE_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC7_PARTIAL_DESCENDANT_SURVIVAL_DESIGN_2026-09-02
SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01
SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01
SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01
SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01
REPOSITORY_COMMON_RULES · late effects require current operation authority
Lineage / Handoff / Evidence source-support ownership
Presentation Host runtime/effect-generation ownership
```

Inherited rules remain:

```text
same object ID != same semantic revision
same semantic revision != same operation authority
same operation authority != same runtime lifecycle
provider success != mutation authority
persistence != canonical truth
media presence != source truth
historical attachment != current support
found-by-ID != supported-for-use
old operation token != authority for replacement object
visible DOM slot != semantic target identity
C8 media attachment != C6 model-context re-entry
C8 media attachment != C5 derived truth lineage
```

## 2. Capability profile

CC-8 opens only the delayed-effect/media-targeting design lane.

```text
C1 survival         = YES when durable target/attachment outlives one projection
C2 stable identity  = YES for durable target
C3 mutation         = CONDITIONAL when attachment metadata is durable semantic-adjacent state
C4 append/merge     = NO by default in first single-slot scope
C5 derived lineage  = NO; media result is not another source-truth parent by default
C6 context re-entry = NO; media does not enter model context automatically
C7 partial survival = NO automatic attachment transfer across parent replacement
C8 delayed effects  = YES, DESIGN LANE OPEN
```

This document does not activate runtime Candidate C machinery.

## 3. Primary decision

Selected architecture:

```text
EXACT_DURABLE_TARGET
+
EXPECTED_REVISION_OR_DECLARED_COMPATIBILITY
+
OWNER_SCOPED_ATTACHMENT_SLOT
+
CURRENT_OPERATION_AUTHORITY_TOKEN
+
COMMIT_TIME_SUPPORT / LIFETIME RECHECK
+
OPTIONAL_RUNTIME_EPOCH_GUARD
+
FAIL_CLOSED_STALE_RESULT_DROP
```

First scope:

```text
one durable target
one owner-defined optional media slot
one current superseding operation attempt per slot
one result attachment
```

No gallery, multi-asset fan-in, arbitrary attachment graph, or provider-independent media database is frozen here.

## 4. Media/effect classes remain separate

The Interaction / Materialization master design distinguishes:

```text
M0_STATIC_PRESENTATION_ASSET
M1_OPTIONAL_PRESENTATION_MATERIALIZATION
M2_SEMANTIC_MEDIA_ATTACHMENT
```

CC-8 first scope selects only:

```text
M1_OPTIONAL_PRESENTATION_MATERIALIZATION
```

Examples:

```text
generated decorative illustration
optional avatar
remote thumbnail after an explicit safe-source contract exists
presentation enhancement that source semantics do not depend on
```

Canonical property:

```text
SOURCE SEMANTICS REMAIN COMPLETE AND VALID WITHOUT THE MEDIA
```

## 5. M2 semantic media remains deferred

CC-8 does not authorize media whose content itself carries a source assertion, evidence claim, canonical identity claim, or publication meaning.

Examples that remain outside first scope:

```text
"this photograph proves event X"
"this screenshot is the canonical source evidence"
"this generated portrait establishes actor appearance"
"this image is part of a NEWS fact assertion"
```

Status:

```text
DEFER · M2_SEMANTIC_MEDIA_ATTACHMENT · CONCRETE_SEMANTIC_CONSUMER_REQUIRED
```

A future M2 checkpoint must define:

```text
semantic media schema
media assertion/provenance ownership
exposure policy
source truth relationship
correction/retraction rules
media-specific context re-entry if any
```

CC-8 may not smuggle M2 behavior into M1 presentation attachments.

## 6. First concrete consumer shape

The first design consumer is an optional single illustration/avatar-like slot attached to one durable source item.

Conceptually:

```text
Durable source object T @ revision R
        ↓
owner-defined optional media slot S
        ↓
materialization request M
        ↓
late result A
        ↓
attach only if T/R/S/M are still current under declared policy
```

No concrete runtime family is granted media behavior by this document.

The consumer shape is sufficient to freeze temporal/attachment rules without authorizing BOARD, SOCIAL_FEED, NEWS, or LIVE_REACTION media generation.

## 7. Exact target identity

A delayed operation that may attach after the current synchronous turn must bind to an exact durable target locator from CC-1.

Conceptual target:

```text
owner scope
namespace
durable object ID
```

Forbidden target substitutes:

```text
array ordinal
DOM position
CSS selector
current card index
display name / handle
content fingerprint alone
headline/title similarity
"the latest post"
```

If exact target resolution fails at commit time:

```text
STALE_TARGET_NOT_RESOLVED
→ DROP RESULT FROM MUTATION
```

No fuzzy retargeting is permitted.

## 8. Attachment slot identity

The first scope uses one owner-defined attachment slot per target.

Examples of conceptual slot kinds:

```text
OPTIONAL_ILLUSTRATION
OPTIONAL_AVATAR
OPTIONAL_THUMBNAIL
```

CC-8 does not freeze a universal slot registry.

Each consumer must define:

```text
slot owner
slot semantic/presentation role
whether one or many attachments may exist
whether a newer request supersedes an older request
whether attachment metadata is durable or view-local
what target fields the media depends on
```

First-scope default:

```text
ONE SLOT
ONE CURRENT ATTEMPT
NEWER ATTEMPT SUPERSEDES OLDER ATTEMPT
```

## 9. Operation token requirement

Because two media operations may target the same object revision and still race, exact revision equality is insufficient.

Example:

```text
P @ R3
A starts for slot S
B starts later for slot S
B becomes current
A finishes later
```

Both target R3.

Therefore:

```text
EXPECTED REVISION MATCH
!=
ATTACHMENT OPERATION STILL CURRENT
```

The attachment-slot owner must allocate an opaque operation authority token when overlap/supersession is possible.

Conceptually:

```text
slot S current token = TB
late result carries token = TA
TA != TB
→ STALE_SUPERSEDED_OPERATION
→ DROP RESULT
```

## 10. Operation token is not media identity

Canonical separation:

```text
operation token
!= durable source object ID
!= media asset reference
!= semantic revision
!= runtime epoch
!= provider request ID
```

A provider request ID may be diagnostic input but must not become SimCore mutation authority by itself.

## 11. Start-time gate

Before launching an asynchronous materialization operation, the future consumer must prove the bounded start contract.

Conceptual sequence:

```text
1. explicit current materialization request exists
2. resolve exact durable target T
3. target lifetime active
4. target support valid for the requested materialization basis
5. capture target semantic revision R
6. resolve owner-defined slot S
7. validate bounded materialization input policy
8. install current operation token O in slot S
9. capture runtime/presentation epoch only if live attachment depends on it
10. launch provider/effect work
```

No background source-history scan is permitted to discover work.

## 12. Materialization input boundary

M1 materialization input may use only consumer-authorized, validated, bounded source fields.

Forbidden default inputs:

```text
quarantined DENY/HOLD content
private Knowledge material
outside-root hidden history
raw full transcript
raw DOM
provider secrets
unbounded source history
arbitrary model-generated URL
```

If the materialization prompt/input is derived from source text, that derivation itself must use already eligible source semantics.

Canonical rule:

```text
MEDIA PROVIDER INPUT
MUST NOT BECOME A SECRET EXFILTRATION SIDE CHANNEL
```

## 13. Raw prompt persistence

Raw generation prompts or provider payloads are not durably stored by default.

If durable diagnostics are needed, prefer bounded metadata such as:

```text
materialization policy version
slot kind
input field-set identifier
input length
provider class
bounded reason/status code
```

Do not retain hidden source text merely because a provider request once consumed it.

## 14. Provider output is untrusted effect data

A successful provider response is not immediately attachable.

The result must pass provider/result validation appropriate to the consumer.

Potential checks may include:

```text
expected media class
safe content type
bounded byte size
bounded dimensions/duration
opaque asset reference validity
provider-result ownership
no executable payload
```

CC-8 freezes the requirement, not numeric limits or provider APIs.

Concrete limits must exist before runtime authorization.

## 15. Commit-time attachment gate

Immediately before any late result mutates durable attachment state or current presentation, re-check all required currentness predicates.

Safe default:

```text
exact target still resolves
AND target still alive
AND current target revision satisfies revision contract
AND slot still exists under same owner contract
AND operation token is still current
AND required source support is still current
AND result validation passed
AND runtime/presentation epoch is current if live UI effect depends on it
```

Only then:

```text
ATTACH RESULT
```

Otherwise:

```text
DROP / QUARANTINE RESULT FROM MUTATION
```

## 16. Late success rule

Canonical rule:

```text
PROVIDER SUCCESS
!=
ATTACHMENT AUTHORITY
```

A perfectly valid generated image that returns after its operation was superseded is stale.

A successful thumbnail fetched for a retired target is stale.

A completed avatar generated for an old replacement object must not jump to the new object.

The result may be discarded even though computation succeeded.

## 17. Late failure rule

A delayed failure also has no automatic authority to rollback or clear newer attachment state.

Example:

```text
A starts
B starts and succeeds
A later fails
```

A's failure must not clear B's attached result.

Canonical rule:

```text
OLD FAILURE
!=
CURRENT SLOT CLEANUP AUTHORITY
```

Any mutating cleanup must prove current operation ownership separately.

## 18. Exact revision is the default

Default delayed-effect compatibility:

```text
current revision == expected revision
```

If target revision changed:

```text
STALE_TARGET_REVISION
→ DROP RESULT
```

This is intentionally conservative.

## 19. Declared field-dependency compatibility

Some media may depend on only a subset of semantic fields.

Example:

```text
avatar generation depends on:
  actor appearance prompt

profile bio changes:
  does not affect avatar input
```

A future consumer may define a narrower compatibility predicate instead of exact whole-object revision equality.

Required form:

```text
explicit dependency field set
+
owner-defined equivalence/currentness proof
+
commit-time revalidation
```

Forbidden rule:

```text
revision changed but image still looks relevant
→ attach anyway
```

Visual/textual similarity is never compatibility proof.

## 20. Dependency fingerprint is not durable identity

A consumer may use a bounded fingerprint/hash of the exact media-dependent fields to detect whether those fields changed.

If so:

```text
dependency fingerprint
= compatibility evidence
```

not:

```text
dependency fingerprint
= object identity
= attachment identity
= source authority
```

This preserves CC-1's identity boundary.

## 21. Target edit semantics

If a target is edited in place:

```text
same durable ID
new semantic revision
```

Then:

```text
exact-revision attachment operation
→ stale by default
```

A declared field-dependency contract may preserve applicability only if the changed fields are outside the media dependency set and all other guards remain current.

No implicit attachment survival is inferred from same ID.

## 22. Target reroll-in-place

`REROLL_IN_PLACE` preserves identity but changes semantic revision.

Default:

```text
old media operation → stale
```

A future consumer may deliberately preserve a media slot across reroll only under an explicit compatibility contract.

No automatic preservation is selected here.

## 23. Target replacement

If target L1 is replaced by L2:

```text
L1 operation token
!= authority for L2
```

Default disposition:

```text
DETACH / DO NOT ATTACH TO REPLACEMENT
```

CC-7 structural descendant survival does not silently retarget an attachment operation to L2.

If product behavior later wants attachment transfer, that is a fresh current operation against L2 with explicit authority.

## 24. Target retirement/deletion

If target retires while work is in flight:

```text
late result must not revive target
late result must not create a replacement target
late result must not attach to tombstone as current media
```

Historical media retention is a separate question from current attachment.

## 25. Support invalidation

If M1 materialization depends on current supported source semantics, support must be re-proven at commit time.

```text
support valid at start
!= support guaranteed at finish
```

If current support is lost:

```text
STALE_TARGET_SUPPORT
→ no current attachment
```

A future historical-inspection media policy may retain a historically attached asset, but it may not imply current source validity.

## 26. Durable attachment versus view-only attachment

CC-8 distinguishes two result scopes.

### A. `VIEW_LOCAL_ATTACHMENT`

```text
bound to current presentation instance
not durably stored
lost on remount/reload
runtime epoch required when late
```

This may remain primarily an effect-plane concern.

### B. `DURABLE_OPTIONAL_ATTACHMENT`

```text
attached to exact durable object/slot
may survive presentation remount
requires Candidate C identity/currentness
persists only bounded attachment metadata/reference
still does not become source truth
```

CC-8 designs both scopes but does not implement either.

## 27. Durable attachment record concept

If a future consumer chooses durable optional attachment, the minimum conceptual record may include:

```text
target locator
slot kind
attachment status
opaque asset reference
media class
attachment-producing operation receipt / bounded token lineage
expected or compatible target revision evidence
created/attached lifecycle metadata as required by owner
```

This is conceptual only.

No generic serialized `MediaAttachmentV1` schema is frozen.

## 28. Asset reference boundary

An attached asset reference must be opaque from the semantic layer's perspective.

It must not expose or persist:

```text
provider credentials
signed secret URLs beyond their allowed lifecycle
internal request headers
provider account identifiers
raw authorization tokens
```

A future provider adapter owns translation from safe opaque asset reference to renderable material.

## 29. Media bytes storage is not selected

CC-8 does not choose:

```text
IndexedDB blobs
filesystem storage
remote object storage
base64 in source records
provider-hosted permanent URLs
```

The first design contract concerns attachment authority, not physical media storage.

## 30. Attachment state is not source truth

Canonical rules:

```text
IMAGE ATTACHED
!= EVENT PROVEN

AVATAR ATTACHED
!= CANONICAL CHARACTER APPEARANCE

THUMBNAIL FETCHED
!= LINK CLAIM VALIDATED

PROVIDER LABEL
!= SOURCE AUTHORITY
```

M1 attachments are presentation enhancement only.

## 31. No automatic media-to-text semantics

CC-8 does not authorize:

```text
OCR
auto-captioning
image classification
vision extraction
face recognition
media-derived assertion generation
```

A media result must not silently feed semantic source assertions.

Any future media-to-text semantic path is a new producer requiring exposure/provenance/validation contracts.

## 32. No automatic model context re-entry

Durable media attachment does not imply the next model request sees the media.

```text
ATTACHMENT STORED
!= MULTIMODAL MODEL CONTEXT
```

CC-4's text/source re-entry contract does not automatically cover image bytes or media references.

A future multimodal re-entry checkpoint must explicitly define:

```text
which media enters context
why
which object/revision it belongs to
current support
byte/token/image count budgets
deduplication
security/privacy policy
```

## 33. Runtime epoch requirement

Runtime/presentation generation is required only when the late effect mutates a live runtime/presentation instance.

For view-local attachment:

```text
runtime epoch current
presentation instance current
```

must be proven.

For a durable attachment commit that is valid independently of the current mounted UI, runtime epoch may not be part of durable semantic-adjacent commit authority.

However a subsequent live presentation update still requires current mount/runtime ownership.

Canonical separation:

```text
DURABLE ATTACHMENT COMMIT AUTHORITY
!=
CURRENT DOM MOUNT AUTHORITY
```

## 34. Reload / runtime replacement

Without a durable operation journal, safe default remains:

```text
runtime replacement / reload
→ revoke in-flight runtime-bound operation authority
```

A provider callback returning after reload must not assume its old in-memory token remains current.

CC-8 does not design cross-reload operation resumption.

Status:

```text
DEFER · DURABLE_IN_FLIGHT_OPERATION_RESUME
```

## 35. No operation journal

CC-8 does not create:

```text
provider job database
background retry queue
cross-reload operation journal
global attachment operation log
media-generation history ledger
```

The attachment operation token is bounded currentness authority, not an event-sourcing system.

## 36. Retry semantics

A retry after provider failure or stale rejection is a new current operation unless the owner explicitly proves continuation of the same still-current attempt.

Safe default:

```text
old attempt rejected/failed
→ re-resolve target
→ revalidate current support/revision
→ allocate new operation token
→ start new attempt
```

Do not refresh an old callback's expected revision in place.

## 37. Cancellation semantics

Cancellation revokes future mutation authority for the affected operation lane.

```text
cancel requested
!= provider computation guaranteed stopped
```

If the result still arrives later, current token checks decide whether it may attach.

A cancelled superseded operation normally fails currentness and is dropped.

## 38. Multi-result and gallery lanes are deferred

First scope is single-slot / superseding-lane only.

Not selected:

```text
multi-image gallery
multiple concurrent accepted attachments
ordered media collections
attachment append
attachment-level descendants
asset albums
```

These require explicit slot/item identity and ordering/deduplication rules.

Status:

```text
DEFER · MULTI_RESULT_MEDIA_COLLECTION
```

## 39. Provider/network URL boundary

Remote URL fetch is not authorized merely because M1 supports a thumbnail class.

Before runtime URL fetching exists, a dedicated policy must define:

```text
allowed URL origins/schemes
redirect handling
private-network blocking
size/type/time limits
cache behavior
credential behavior
user/model supplied URL handling
failure isolation
```

CC-8 therefore does not approve arbitrary user/model URLs.

## 40. Generated-media boundary

Generated media may be requested only through an explicit current materialization operation.

No rule in CC-8 authorizes:

```text
automatic image generation for every source card
background avatar enrichment
old history card regeneration
provider calls merely because a renderer supports media
```

A visible card is not a materialization request.

## 41. Dormancy / zero-background rule

Inherited 3M-9 dormancy remains strict.

When there is no current authorized materialization request:

```text
provider calls = 0
network calls = 0
background generation = 0
polling = 0
history scans = 0
attachment reconciliation scans = 0
retry workers = 0
```

Old attachments may render from already available accepted state without authorizing new semantic/effect work.

## 42. Presentation failure separation

If a durable optional attachment is validly committed but Presentation Renderer/Host fails to display it:

```text
PRESENTATION FAILURE
!= ATTACHMENT AUTHORITY FAILURE
```

Do not rollback the durable attachment merely because DOM reconciliation failed unless a higher-level product contract explicitly requires atomic presentation semantics.

## 43. Provider failure separation

For M1:

```text
PROVIDER FAILURE
!= SOURCE SEMANTIC FAILURE
```

Provider failure must not:

```text
invalidate source assertions
change Exposure
change source authority
retire the target
trigger hidden model retries
rewrite source text
```

The source remains valid without optional media.

## 44. Stale-result failure taxonomy

CC-8 freezes these conceptual reasons:

```text
NO_CURRENT_MATERIALIZATION_REQUEST
TARGET_NOT_FOUND
TARGET_RETIRED
TARGET_REVISION_MISMATCH
TARGET_DEPENDENCY_CHANGED
TARGET_SUPPORT_INVALID
SLOT_NOT_CURRENT
OPERATION_SUPERSEDED
OPERATION_CANCELLED
RUNTIME_EPOCH_STALE
PRESENTATION_INSTANCE_STALE
PROVIDER_FAILURE
INVALID_PROVIDER_RESULT
ATTACHMENT_COMMIT_FAILURE
PRESENTATION_RECONCILE_FAILURE
UNSUPPORTED_MEDIA_CLASS
UNSUPPORTED_SEMANTIC_MEDIA_REQUEST
```

The exact runtime enum is not frozen.

## 45. Stale result diagnostics

A bounded stale-result receipt may include:

```text
media class
slot kind
operation status
reason code
target kind
expected/current revision markers where safe
provider class
result byte/dimension metadata where safe
```

It must not retain:

```text
raw source secret text
full generation prompt
provider credentials
raw media bytes
quarantined assertion content
```

## 46. Orphan provider asset cleanup

A stale result may leave a provider-owned disposable resource.

CC-8 does not authorize a generic background cleanup worker.

A future provider adapter may perform immediate cleanup only when it can prove:

```text
this operation owns the disposable provider asset
asset is not shared/current elsewhere
cleanup affects provider resource only
cleanup does not mutate current source object
```

Otherwise provider TTL/manual cleanup policy remains provider-owned.

## 47. No hidden truth upgrade from persistence

A durable attachment that survives many turns remains M1 presentation material.

```text
PERSISTED IMAGE
!= CANONICAL EVIDENCE

USED MANY TIMES
!= MORE TRUE
```

Time does not upgrade its semantic authority.

## 48. CC-5 mutation interaction

If a mutation intentionally replaces media in the same durable slot, it must behave as a new current operation.

Conceptually:

```text
MEDIA_REPLACE
→ exact target
→ current slot
→ expected revision/compatibility
→ new operation token
→ old operation superseded
→ result commit under CC-8
```

A stale older media operation cannot overwrite the result.

## 49. CC-7 survivor interaction

Structural descendant survival does not automatically transfer optional media.

If a child survives as `SURVIVE_INDEPENDENT_ROOT`, its already committed attachment may remain only if the attachment owner defines that attachment as belonging to the child's durable identity and all support/lifetime rules remain satisfied.

If an object is reattached to a replacement parent, media dependent only on the child may survive under an explicit dependency contract.

Media dependent on old parent context must not survive merely because the child ID survived.

## 50. CC-6 lineage interaction

A media attachment is not a derived-source attribution parent by default.

```text
BOARD post has image
→ NEWS may cite BOARD post under CC-6
```

does not imply:

```text
NEWS may treat image as independent truth evidence
```

M2 provenance would require a separate semantic-media contract.

## 51. Historical inspection

A historical durable object may display a historically committed optional attachment if retention policy explicitly preserves it.

But:

```text
HISTORICAL MEDIA DISPLAY
!= CURRENT SUPPORT
```

If attachment asset is unavailable, historical source text remains semantically inspectable without the optional media.

## 52. Privacy / secret boundary

Media generation/fetch can create a new external data boundary.

Therefore no future provider call may receive source fields merely because they are stored.

Required principle:

```text
PERSISTED
!= AUTHORIZED_FOR_PROVIDER_DISCLOSURE
```

Provider input must have an explicit current materialization policy and bounded eligible field set.

## 53. Security boundary

Future renderer/provider integration must treat media as untrusted effect data.

Do not allow media result metadata to become:

```text
raw HTML
script
style injection
arbitrary event handlers
arbitrary filesystem paths
arbitrary privileged URL schemes
```

Presentation adapters remain responsible for safe rendering.

## 54. Cost shape

Desired first-scope cost:

```text
cost(materialization request)
≈ O(1 target)
+ O(1 slot)
+ O(1 current revision/support check)
+ provider work
```

Forbidden:

```text
scan all durable source objects
scan all prior attachments
rebuild all cards
materialize all visible historical objects
```

## 55. Runtime hard caps required before implementation

Before any CC-8 runtime lane is authorized, the concrete consumer must freeze numeric caps for at least:

```text
max concurrent operations per owner/slot
max provider input chars/bytes
max provider result bytes
max image dimensions or media duration
max retained asset references per target
max retry count if retries exist
max diagnostic receipt size
provider timeout
```

CC-8 does not invent numbers without a concrete provider/consumer.

## 56. First-scope operation classification

Conceptual first operation:

```text
operation name: MATERIALIZE_OPTIONAL_MEDIA_SLOT

target locator required: YES
semantic state affected: attachment metadata only if durable scope chosen
identity preserved or replaced: target identity preserved
expected revision required: YES by default
can overlap: YES
can be superseded: YES
operation token/currentness guard: YES, per target+slot lane
support revalidation required: YES when media input/applicability depends on current support
parent/descendant preconditions: consumer-owned; no automatic parent retarget
runtime lifecycle guard required: YES for live view attachment, not necessarily durable commit
commit effect: attach validated optional media reference to exact current target/slot
revision advance rule: consumer-owned; target semantic revision need not advance if attachment is presentation-only metadata
stale result behavior: DROP FROM MUTATION
rollback/restore behavior: no stale rollback; newer slot state wins only through current authority
```

## 57. Attachment revision policy

CC-8 does not force the target object's primary semantic revision to advance when M1 optional presentation metadata changes.

Reason:

```text
M1 attachment
!= source semantic assertion
```

A future durable owner may maintain a separate attachment-state generation/revision if persistent attachment updates themselves need concurrency/currentness.

Do not overload the source-text semantic revision with presentation metadata solely for convenience.

## 58. Separate attachment-state generation

If durable optional attachment metadata can itself be edited/replaced independently, a consumer may define an owner-scoped attachment-state revision/generation separate from the target semantic revision.

Conceptually:

```text
target semantic revision R
attachment slot generation G
operation token O
```

These answer different questions:

```text
R = is target semantic dependency current?
G = which committed attachment-slot state is current?
O = which attempt still owns late mutation authority?
```

No global attachment revision service is selected.

## 59. No last-write-wins by timestamp

Forbidden:

```text
latest provider completion timestamp wins
```

Completion time is diagnostic only.

A slower older operation must not beat a newer authorized operation merely because it completed later.

Current operation authority decides.

## 60. No value-equality escape hatch

If the current slot happens to contain the same asset reference or visually identical image, an old stale operation does not regain authority.

```text
CURRENT VALUE == OLD RESULT
!=
OLD OPERATION MAY MUTATE / ROLLBACK
```

This preserves RCR late-effect ownership.

## 61. No automatic attachment resurrection

If an attachment is removed/cleared under a current operation, a late old provider callback must not recreate it.

```text
CLEAR SLOT
→ revokes prior operation authority for that lane
```

A new attachment requires a fresh current operation.

## 62. No automatic materialization after source retrieval

CC-3 history retrieval does not authorize media regeneration.

```text
open old Board from archive
!= generate missing images
```

Historical cards may render without media or with already retained accepted attachment references.

## 63. No automatic materialization from CC-4 re-entry

A source object re-entering model context does not authorize provider media work.

```text
REENTRY REQUEST
!= MATERIALIZATION REQUEST
```

The two actions require independent authority.

## 64. No automatic cross-family attachment propagation

If BOARD and NEWS refer to the same underlying event:

```text
BOARD image attachment
!= NEWS image attachment
```

A sibling family needs its own authorized materialization operation and source-specific presentation policy.

No asset is copied merely because semantic event authority overlaps.

## 65. Reload-visible durable attachments

If a future durable attachment store exists, accepted attachment references may survive reload according to bounded lifetime policy.

But in-flight operation authority does not survive reload unless a later explicit journal/resume protocol is designed.

Canonical distinction:

```text
COMMITTED ATTACHMENT MAY SURVIVE
!= IN-FLIGHT OPERATION MAY RESUME
```

## 66. Runtime implementation blockers

CC-8 design does not remove existing 3M runtime blockers.

Runtime work additionally requires, at minimum:

```text
current materialization request authority
actual durable target implementation
actual revision/currentness implementation
actual attachment-slot owner
provider adapter policy
result validation/caps
host presentation mount authority
safe asset-reference rendering path
instrumentation for stale-result rejection
```

Until then:

```text
RUNTIME_CC8 = NOT READY / NOT AUTHORIZED
```

## 67. Validation scenarios for a future implementation

Minimum future evidence should include:

### V1 · ordinary no-media turn

```text
no request
→ zero provider/network/materialization work
```

### V2 · basic current attachment

```text
target current
revision current
token current
support current
→ attach
```

### V3 · superseded operation

```text
A starts
B starts later
A finishes
→ A dropped
```

### V4 · target edit

```text
A starts on R3
edit → R4
A finishes
→ drop unless declared dependency compatibility proves safe
```

### V5 · replacement

```text
A targets L1
L1 replaced by L2
A finishes
→ never attach to L2
```

### V6 · retirement

```text
A starts
target retired
A finishes
→ no resurrection
```

### V7 · support invalidation

```text
A starts with support
support lost
A finishes
→ no current attachment
```

### V8 · runtime remount

```text
view-local A starts
runtime/presentation replaced
A finishes
→ stale view effect dropped
```

### V9 · durable commit / presentation failure

```text
durable attachment validly commits
renderer fails
→ semantic/source truth unchanged; presentation failure isolated
```

### V10 · stale failure after newer success

```text
A starts
B starts and attaches
A fails late
→ A cannot clear B
```

### V11 · reload

```text
committed attachment may reload
old in-flight token does not resume by default
```

### V12 · historical source open

```text
archive opened
→ no automatic media regeneration
```

## 68. Failure taxonomy separation

Keep these classes independent:

```text
SOURCE_SUPPORT_FAILURE
TARGET_LIFETIME_FAILURE
TARGET_REVISION_FAILURE
ATTACHMENT_SLOT_CURRENTNESS_FAILURE
OPERATION_SUPERSESSION
PROVIDER_FAILURE
PROVIDER_RESULT_VALIDATION_FAILURE
DURABLE_ATTACHMENT_COMMIT_FAILURE
PRESENTATION_MOUNT_FAILURE
HISTORICAL_ASSET_UNAVAILABLE
```

No layer may collapse provider failure into source invalidity.

## 69. Design non-goals

CC-8 explicitly does not design:

```text
generic media library
asset search
content-addressed global media identity
cross-family asset sharing
semantic image evidence
OCR/caption extraction
multimodal model history
provider account management
background prefetch
CDN architecture
persistent provider queue
retry scheduler
multi-device synchronization
media moderation engine
```

Those require concrete consumers and separate authority contracts.

## 70. Candidate C state after CC-8

After this checkpoint:

```text
C1 survival          = DESIGN AVAILABLE
C2 stable identity   = DESIGN AVAILABLE
C3 item mutation     = DESIGN OPEN
C4 append / merge    = DESIGN OPEN
C5 derived lineage   = DESIGN OPEN
C6 context re-entry  = DESIGN OPEN
C7 partial survival  = DESIGN OPEN
C8 delayed effects   = DESIGN OPEN
```

But:

```text
ALL RUNTIME CAPABILITIES = NOT AUTHORIZED
```

## 71. Next checkpoint

Recommended next checkpoint:

```text
CC-9 · Integration / Cost / Dormancy
```

CC-9 should converge C1-C8 around:

```text
ordinary-turn zero-burden behavior
bounded store/retrieval cost
bounded mutation/currentness checks
bounded re-entry
bounded lineage depth
bounded survivor blast radius
bounded delayed-effect concurrency
failure isolation
feature-off vertical closure
```

## 72. Final frozen rules

```text
RULE 1
A delayed result targets an exact durable object, never a DOM/card resemblance.

RULE 2
Provider success does not grant attachment authority.

RULE 3
Exact revision equality is the default applicability rule.

RULE 4
Revision compatibility beyond equality must be explicit and field-owned.

RULE 5
One attachment slot has one current superseding operation in first scope.

RULE 6
A newer operation revokes an older operation's right to attach, clear, or rollback.

RULE 7
Target replacement never inherits the old operation token.

RULE 8
Target retirement never permits late-result resurrection.

RULE 9
Support may need revalidation at commit; start-time support is not permanent.

RULE 10
Runtime epoch and semantic revision remain different currentness dimensions.

RULE 11
M1 optional media does not become source truth or canonical evidence.

RULE 12
M2 semantic media remains deferred until a concrete semantic-media consumer exists.

RULE 13
Stored media does not automatically enter future model context.

RULE 14
No automatic OCR/captioning/media-to-text semantic path exists.

RULE 15
No current materialization request means zero provider/network/background work.

RULE 16
Committed attachment state may survive reload; in-flight operation authority does not by default.

RULE 17
Stale successful results are dropped rather than best-effort reattached.

RULE 18
Optional media failure never invalidates otherwise valid source semantics.
```

## 73. Closing statement

Candidate C CC-8 exists to solve temporal ownership for delayed effects, not to turn Source Intelligence into a media platform.

The design therefore selects the smallest useful durable attachment seam:

```text
exact target
+ bounded optional slot
+ exact revision or declared dependency compatibility
+ current operation authority
+ support/lifetime recheck
+ optional runtime epoch
```

Everything else remains consumer-driven.

Canonical close:

```text
A RESULT MAY BE BEAUTIFUL, CORRECTLY GENERATED, AND COMPLETELY STALE.

ONLY CURRENT AUTHORITY MAY ATTACH IT.
```
