# SimCore Post-3.0M LRE-6 Structured Presentation Cutover Design — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-6 DESIGN FROZEN · LC3 PRESENTATION-OWNER CUTOVER CONTRACT · DIRECT-B-ROOT LIVE_REACTION FIRST SLICE · DISPLAY_LOCAL_CHATINDEX_REBIND_V1 + HOST_CONDITIONAL_DISPLAY_TRANSFORM_V1 SELECTED · G5 TARGET-HOST EXECUTION PROOF PENDING · DESIGN-ONLY · RUNTIME / RELEASE UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-6 · STRUCTURED PRESENTATION CUTOVER · HOST PRESENTATION BINDING · LIVE_REACTION · DESIGN**

## 0. Purpose

LRE-6 freezes the detailed presentation-only contract for moving the first migrated LIVE_REACTION lane from LC2 legacy-compatible presentation to LC3 structured presentation.

It answers:

```text
How is one validated current Source projection joined to the exact committed assistant message?
How can the display phase recover message-local coordinates without transcript markers?
How is exact message identity revalidated before any presentation transform is armed?
How are structured LIVE_REACTION UI and legacy compatibility suppression made atomic?
How do reroll, edit, chat switch, reload and failure invalidate presentation state?
What evidence is still required before G5 may be declared PASS?
```

This checkpoint is design-only.

It does not implement display handlers, chat listeners, DOM adapters, CSS, presentation markup, Source persistence, transcript rewrites, release changes, or target-host tests.

## 1. Authority chain

Consumes:

```text
LRE master
LRE-1 Production + Host Coupling
LRE-2 Semantic Control
LRE-3 Family Caps + Instrumentation
LRE-4 Structured Shadow
LRE-5 Structured Semantic-Owner Cutover
LRE-6 Structured Presentation Cutover Impact Scope
3M-3 Structured Sidecar + Validation
3M-4 Presentation Renderer Architecture
3M-6 Provenance / Invalidation
3M-7 Context Re-entry / History
3M-9 Integration / Performance
MF-4 Presentation Stack / Mount Isolation
```

Runtime production remains independently authoritative on `release-simcore`.

## 2. Design-time snapshots

SimCore design snapshot:

```text
main = 9d1c533ab5e1df179c94203bdbcd77730056708b
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production = v0.70.1
```

Upstream RisuAI source snapshot inspected by LRE-6:

```text
kwaroran/RisuAI main
= 754af0ba5d546db9a8cc0c2676ba4c2693f3f72d
```

A runtime transaction must repeat G1 and host preflight against then-current identities.

## 3. LC3 changes one axis only

Inherited LC2:

```text
S = S1 STRUCTURED_VALIDATED_SEMANTIC
P = P0 LEGACY_COMPAT_PRESENTATION
H = transitional legacy host-context behavior
R = transitional legacy compatibility
```

LRE-6 target:

```text
S = S1 STRUCTURED_VALIDATED_SEMANTIC
P = P1 STRUCTURED_LIVE_REACTION_PRESENTATION
H = unchanged
R = unchanged except presentation-local suppression for the exact migrated message
```

Canonical law:

```text
LRE-6 CUTS P
LRE-6 DOES NOT REOPEN S
LRE-6 DOES NOT RETIRE H
LRE-6 DOES NOT ERASE HISTORICAL R
```

## 4. First supported slice

```text
family = LIVE_REACTION
mode = C
source scope = direct B root
semantic stage = PRIMARY, future runtime precondition
semantic disposition = PRIMARY_AVAILABLE only for ordinary card presentation
adapter = LIVE_REACTION_STREAM_V1
presentation profile = SOURCE_LOCAL_ADJACENT / VIEW_LOCAL_ONLY
persistence = NONE
future Source context re-entry = NONE
```

BOARD, NEWS and multi-family presentation remain outside LRE-6 first-slice runtime authority.

## 5. Selected host-binding architecture

LRE-6 freezes:

```text
DISPLAY_LOCAL_CHATINDEX_REBIND_V1
```

and selects the preferred first realization:

```text
HOST_CONDITIONAL_DISPLAY_TRANSFORM_V1
```

Conceptual pipeline:

```text
validated LIVE_REACTION sidecar
        ↓
LIVE_REACTION_STREAM_V1 presentation model
        ↓
current output-local PresentationCandidateV1
        ↓
Phase I committed output listener
        ↓
HostPresentationBindingRefV1
        ↓
Phase D display callback
        ↓
current chat/character revalidation
        ↓
exact chatId + freshness revalidation
        ↓
construct ORIGINAL and TRANSFORMED display branches
        ↓
host-local conditional using {{chatindex}}
        ↓
RisuAI resolves the real display chatID after plugin callback
        ↓
only exact target message receives TRANSFORMED branch
```

No stored identity marker is required.

## 6. Why host conditional transform is preferred

Current host facts establish:

```text
Phase I listener
→ exact characterIndex / chatIndex / messageIndex

Phase D plugin callback
→ content only

post-plugin host parser
→ still owns exact chatID

{{chatindex}}
→ host-resolved current message index
```

Therefore the narrowest first realization is to let the host perform the final message-index comparison inside the display-local transform rather than scanning the global DOM.

Preference order remains:

```text
identity-bearing official presentation callback/API, if added later
> HOST_CONDITIONAL_DISPLAY_TRANSFORM_V1
> bounded SafeDocument beacon adapter
> no structured mount
```

## 7. `PresentationCandidateV1`

Conceptual request/output-local object:

```text
PresentationCandidateV1
  schemaVersion = 1
  family = LIVE_REACTION
  presentationNonce
  sourceJobToken
  runtimeEpoch
  projectionGeneration
  sourceAuthorityRef
  validatedSidecarRef
  presentationModel
  semanticDisposition = PRIMARY_AVAILABLE
  legacyBridgeExpectation
```

It is memory-only, current-output-local, non-persistent, non-contextual and non-canonical.

## 8. `HostPresentationBindingRefV1`

Conceptual exact current-runtime binding:

```text
HostPresentationBindingRefV1
  schemaVersion = 1
  family = LIVE_REACTION
  characterIndex
  chatIndex
  messageIndex
  messageChatId
  runtimeEpoch
  projectionGeneration
  presentationNonce
  sourceJobToken
  sourceAuthorityRef
  sourceSupportFingerprint
  committedVisibleContentFingerprint
```

Identity law:

```text
messageChatId = identity guard
messageIndex = current lookup coordinate
committedVisibleContentFingerprint = freshness rejection only
```

Content equality never establishes identity.

## 9. Phase I binding creation

A future Phase I listener may create the binding only when semantic stage is PRIMARY, disposition is PRIMARY_AVAILABLE, one current renderable candidate exists, messageIndex is valid, message.chatId exists, runtime/projection generation matches, and Source support remains current.

Failure means no binding. No latest-message guessing or content search is permitted.

## 10. First-slice cardinality

The first LIVE_REACTION lane permits one current ordinary Source presentation candidate per current projection transaction. A newer projection invalidates the older pending/current binding before becoming ordinary presentation authority.

## 11. Phase D precondition

Without a current binding, return display input unchanged.

With a binding, revalidate conceptually through supported current-host APIs:

```text
getCurrentCharacterIndex()
getCurrentChatIndex()
getChatFromIndex(binding.characterIndex, binding.chatIndex)
```

Required matches:

```text
current character == binding.characterIndex
current chat == binding.chatIndex
message at binding.messageIndex exists
message.chatId == binding.messageChatId
current visible-content fingerprint == binding.committedVisibleContentFingerprint
runtime epoch matches
projection generation matches
Source support remains current
```

Any mismatch returns the original input unchanged and forbids structured mount or legacy hiding.

## 12. Current-selection proof obligation

The selected profile assumes that current-character/current-chat APIs correspond to the display context being rendered. Upstream source makes this plausible but does not prove every target-host lifecycle.

```text
WATCH · DISPLAY_CALLBACK_CURRENT_SELECTION_CONTEXT_REQUIRES_TARGET_HOST_PROOF
```

## 13. Host conditional transform

After precondition revalidation, the handler may conceptually return:

```text
IF host-local {{chatindex}} == binding.messageIndex
  → TRANSFORMED TARGET DISPLAY
ELSE
  → ORIGINAL DISPLAY INPUT
```

The exact serialization is implementation-specific and target-host-tested.

## 14. Double-rebind law

Required chain:

```text
Phase I chatId identity
+ current exact chat reread
+ current chatId equality
+ content freshness guard
+ runtime/projection guard
+ host-local chatindex equality
```

Only the full chain may arm target presentation.

```text
BLOCKER · CHAT_INDEX_CONDITIONAL_WITHOUT_EXACT_CHATID_REVALIDATION
```

## 15. Atomic target display

For the exact target, the transformed branch is prepared as one unit:

```text
original display
→ optional exact structural legacy-bridge suppression
+ structured LIVE_REACTION materialization
→ transformed target display
```

Legacy must not be hidden before structured presentation has been prepared successfully.

## 16. Mechanical legacy expectation

LRE-6 consumes LRE-5's mechanically derived bridge expectation. It does not infer bridge ownership from prose.

Direct-B-root first slice:

```text
bridge enabled + PRIMARY_AVAILABLE → expected bridge blocks = 1
bridge disabled → expected bridge blocks = 0
```

## 17. Structural suppression only

Suppression may identify the expected `<COMMUNITY>` structural boundary only to remove its presentation. It may not parse reactions into assertions, infer public facts, reconstruct Source semantics, or repair from Knowledge.

```text
STRUCTURAL PRESENTATION SUPPRESSION != LEGACY SEMANTIC PARSING
```

## 18. Suppression mismatch fails closed

If one bridge is expected but structural count is zero, greater than one, malformed, or ambiguous:

```text
hide nothing
mount no structured Source UI
return original display unchanged
PRESENTATION_ABORTED_LEGACY_SUPPRESSION_MISMATCH
```

## 19. Presentation failure is not semantic fallback

On safe-transform failure, structured semantic authority remains S1 while the original compatibility presentation may remain visible because the original display is preserved.

```text
ORIGINAL LEGACY DISPLAY REMAINS VISIBLE
!=
LEGACY SEMANTIC AUTHORITY RESTORED
```

Repeated failure is an LC3 runtime/release blocker.

## 20. Materialization input boundary

`LIVE_REACTION_STREAM_V1` consumes only validated ALLOW semantic fields plus presentation policy. It cannot consume DENY/HOLD content, supportQuote, private Knowledge, raw proposal JSON, legacy prose as semantic input, or Source history.

## 21. Text safety

Model-authored semantic strings remain untrusted markup input. Static presentation grammar may be plugin-owned, but semantic values require safe text-node or equivalent escaping semantics.

## 22. Source-scoped namespace

First surface remains source-scoped conceptually:

```text
[data-simcore-source-family="live-reaction"]
sc-source
sc-source__header
sc-source__list
sc-source__item
sc-source__empty
```

No global host styling authority is introduced.

## 23. No invented presentation semantics

Nickname, avatar, likes, views, timestamp, platform identity, badge or other richer UI data cannot be invented by presentation cutover.

## 24. Repeated display is idempotent

Same current stored message + same current binding + same validated sidecar must yield the same display transform. Display invocation may not append stored cards, mutate semantic state, persist Source data, or accumulate observers.

## 25. No hidden transcript bytes

Any host conditional or display protocol exists only in the display transform and must not persist into assistant `message.data`.

```text
BLOCKER · DISPLAY_TRANSFORM_BYTES_PERSISTED_TO_ASSISTANT_TRANSCRIPT
```

## 26. Preferred runtime DOM budget

Preferred host-conditional profile requires no ordinary global DOM observer and no Source global DOM scan.

A one-shot SafeDocument proof harness may be used only for target-host validation evidence.

## 27. Fallback profile

If host conditional materialization fails target-host proof, a separately authorized fallback may consider:

```text
DISPLAY_LOCAL_BEACON_SAFE_DOM_V1
```

with a display-only `{{chatindex}}` beacon, restricted SafeDocument, one-shot observer and exact chatId rebind. LRE-6 does not automatically authorize that broader effect surface.

## 28. Host render hash remains non-authoritative

`.chat-message-container[x-hashed]` remains a host render-cache implementation detail and cannot become Source/message identity authority.

## 29. Reroll invalidation

A newer output projection invalidates old candidate, binding and presentation generation. New projection requires a new Phase I exact binding. Numeric index equality cannot preserve the old card.

## 30. Manual edit invalidation

Inherited law:

```text
manual edit → old presentation binding invalid
```

Changed content is safely rejected by committed-visible-content fingerprint mismatch.

Equal-value edit cannot be proven by fingerprint alone.

```text
WATCH · EQUAL_VALUE_MANUAL_EDIT_EVENT_NOT_PROVEN_BY_CONTENT_FINGERPRINT
BLOCKER · MANUAL_EDIT_INVALIDATION_SIGNAL_REQUIRED_IF_TARGET_HOST_CAN_COMMIT_EQUAL_VALUE_EDIT_WITHOUT_OTHER_REVISION_SIGNAL
```

Target-host proof must resolve this before G5 PASS.

## 31. Source/currentness invalidation

Host identity match is insufficient when sourceAuthorityRef, support fingerprint, projection generation or runtime epoch is stale. Any such mismatch invalidates presentation.

## 32. Chat / branch switch

Current character/chat mismatch returns original display and arms no Source transform. First-slice ephemeral card restoration when navigating back is not claimed.

## 33. Reload / unload

Runtime reload, plugin unload or epoch change clears candidate, binding and presentation receipts. No hidden persistence may resurrect the card.

## 34. Presentation disposition vocabulary

```text
PRESENTATION_NOT_REQUESTED
PRESENTATION_NO_BINDING
PRESENTATION_BINDING_CURRENT
PRESENTATION_STALE_HOST_CONTEXT
PRESENTATION_STALE_MESSAGE_ID
PRESENTATION_STALE_CONTENT
PRESENTATION_STALE_SOURCE_SUPPORT
PRESENTATION_ABORTED_LEGACY_SUPPRESSION_MISMATCH
PRESENTATION_ADAPTER_FAILED
PRESENTATION_TRANSFORM_ARMED
PRESENTATION_TRANSFORM_BYPASSED_NON_TARGET
PRESENTATION_TRANSFORM_FAILED
```

These do not alter semantic `PRIMARY_*` disposition.

## 35. No false mounted claim

The handler may know a transform was armed but does not receive a default post-render confirmation callback.

```text
PRESENTATION_TRANSFORM_ARMED != PRESENTATION_VISIBLE_MOUNT_CONFIRMED
```

Visible confirmation belongs to target-host evidence.

## 36. Bounded evidence extension

Future presentation evidence may contain scalar/status data only:

```text
presentationProfile
bindingCreated
bindingStatus
bindingMessageIndex
chatIdMatch
contentFreshnessMatch
sourceSupportCurrent
legacySuppressionExpected
legacySuppressionStatus
transformDisposition
presentationAdapterStatus
```

No semantic body, Community body, markup body or support quote is stored.

## 37. DORMANT budget

Without a binding:

```text
Source host chat reread = 0
Source suppression scan = 0
Source presentation build = 0
Source DOM query = 0
Source observer = 0
Source persistent read/write = 0
```

Only a bounded stage/binding check is allowed.

## 38. ACTIVE budget

For one current binding:

```text
one exact host chat reread
one exact message lookup
one bounded structural bridge check if expected
one bounded presentation materialization
one display-local host conditional
```

No Source history scan is authorized.

## 39. Failure matrix

### Binding absent/stale

Original display only; semantic sidecar may remain valid.

### Legacy suppression mismatch

Original display only; structured UI absent; semantic owner unchanged.

### Adapter failure

Original display only; structured UI absent; semantic owner unchanged.

### Non-target callback

Host conditional selects original branch.

### Exact target success

Expected legacy bridge presentation suppressed, structured LIVE_REACTION visible, stored bytes unchanged, one ordinary visible Source presentation.

## 40. No dual visible Source surface on success

If legacy suppression cannot be safely prepared, structured target transform must not arm.

## 41. Rollback scope

Presentation BLOCKER is recorded in repo and handled through explicit stage/release rollback. Per-request semantic owner switching is forbidden.

## 42. G5 target-host proof protocol

Before G5 PASS:

```text
P1  display transform bytes not stored
P2  {{chatindex}} resolves to actual displayed message index
P3  current character/chat APIs correspond to rendered display context
P4  Phase I identity + reread + display index converge on same message.chatId
P5  identical-content messages do not cross-bind
P6  repeated display is idempotent
P7  reroll invalidates/replaces old binding
P8  content-changing manual edit invalidates old binding
P9  equal-value edit behavior resolved
P10 reload does not resurrect stale card
P11 chat/branch switch cannot cross-bind
P12 exact-message suppression leaves historical Community intact
P13 success is not dual-visible
P14 presentation failure does not alter semantic authority
P15 DORMANT performs no Source chat reads/scans/DOM work
P16 unload/reload leaves no stale presentation state
P17 no Source semantic or protocol bytes persist to future model context
```

## 43. G5 disposition

```text
G5_DESIGN_PROFILE = FROZEN
G5_PROFILE = DISPLAY_LOCAL_CHATINDEX_REBIND_V1
G5_FIRST_REALIZATION = HOST_CONDITIONAL_DISPLAY_TRANSFORM_V1
G5_UPSTREAM_SOURCE_PREFLIGHT = STRUCTURALLY_PLAUSIBLE
G5_TARGET_HOST_EXECUTION_PROOF = PENDING
G5_RUNTIME_PASS = NOT_CLAIMED
```

## 44. BLOCKER set

```text
BLOCKER · CHAT_INDEX_CONDITIONAL_WITHOUT_EXACT_CHATID_REVALIDATION
BLOCKER · CONTENT_HASH_USED_AS_MESSAGE_IDENTITY
BLOCKER · HOST_RENDER_HASH_USED_AS_MESSAGE_IDENTITY
BLOCKER · DISPLAY_TRANSFORM_BYTES_PERSISTED_TO_ASSISTANT_TRANSCRIPT
BLOCKER · STRUCTURED_UI_ARMED_BEFORE_LEGACY_SUPPRESSION_IS_SAFELY_PREPARED
BLOCKER · LEGACY_SUPPRESSION_MISMATCH_BEST_EFFORT_HIDING
BLOCKER · GLOBAL_LEGACY_COMMUNITY_HIDING
BLOCKER · PRESENTATION_FAILURE_REOPENS_LEGACY_SEMANTIC_AUTHORITY
BLOCKER · LEGACY_PROSE_PARSED_BACK_INTO_TRUSTED_SOURCE_SEMANTICS
BLOCKER · REROLL_REUSES_OLD_PRESENTATION_BINDING
BLOCKER · MANUAL_EDIT_INVALIDATION_SIGNAL_REQUIRED_IF_TARGET_HOST_CAN_COMMIT_EQUAL_VALUE_EDIT_WITHOUT_OTHER_REVISION_SIGNAL
BLOCKER · SOURCE_SUPPORT_STALE_BUT_CARD_REMAINS_CURRENT
BLOCKER · UNBOUNDED_SOURCE_DOM_SCAN_OR_ALWAYS_ON_OBSERVER
BLOCKER · LC3_CLAIMS_LEGACY_CONTEXT_RETIREMENT
```

## 45. WATCH set

```text
WATCH · DISPLAY_CALLBACK_CURRENT_SELECTION_CONTEXT_REQUIRES_TARGET_HOST_PROOF
WATCH · HOST_CONDITIONAL_SERIALIZATION_REQUIRES_TARGET_HOST_PROOF
WATCH · DISPLAY_HTML_SANITIZER_AND_MARKUP_SURVIVAL_REQUIRES_TARGET_HOST_PROOF
WATCH · EQUAL_VALUE_MANUAL_EDIT_EVENT_NOT_PROVEN_BY_CONTENT_FINGERPRINT
WATCH · EPHEMERAL_CARD_NOT_RESTORED_AFTER_RELOAD
WATCH · PRESENTATION_TRANSFORM_ARMED_IS_NOT_VISIBLE_MOUNT_CONFIRMATION
```

## 46. DEFER set

```text
DEFER · DISPLAY_LOCAL_BEACON_SAFE_DOM_V1 FALLBACK UNTIL NEEDED
DEFER · DURABLE_SOURCE_CARD_REPLAY
DEFER · PERSISTENT_HOST_PRESENTATION_BINDING
DEFER · BOARD_PRESENTATION_CUTOVER
DEFER · NEWS_PRESENTATION_CUTOVER
DEFER · MULTI_FAMILY_PRESENTATION_STACK_RUNTIME
DEFER · LEGACY_CONTEXT_RETIREMENT_TO_LRE7
DEFER · OLD_CHAT_MIXED_ERA_CLOSE_TO_LRE8
```

## 47. Future implementation ownership surface

If separately authorized after target-host proof, the narrow first implementation may add/extend only presentation binding coordination, Phase I exact-binding listener, Phase D transform handler, LIVE_REACTION materializer and bounded presentation evidence.

It must not require Source DB, new network/model calls, Source-history scan, Candidate C durable identity, whole-chat rewrite or legacy semantic promotion.

## 48. Relationship to LRE-7

LRE-6 only moves P to structured presentation. LRE-7 separately owns stopping new legacy Community bytes from entering ordinary host transcript/context.

```text
P1 STRUCTURED PRESENTATION != H2 PROSPECTIVE LEGACY CONTEXT RETIREMENT
```

## 49. Final freeze

```text
LRE_6_DESIGN = FROZEN
LRE_6_IMPLEMENTATION = NOT_AUTHORIZED
LC3_AXIS = PRESENTATION_ONLY
FIRST_FAMILY = LIVE_REACTION
FIRST_SCOPE = DIRECT_B_ROOT_MODE_C
SEMANTIC_OWNER = STRUCTURED_PRIMARY / INHERITED_FROM_LRE5
PRESENTATION_PROFILE = DISPLAY_LOCAL_CHATINDEX_REBIND_V1
FIRST_REALIZATION = HOST_CONDITIONAL_DISPLAY_TRANSFORM_V1
PHASE_I_IDENTITY = EXACT_MESSAGE_INDEX_PLUS_CHAT_ID
PHASE_D_LOCAL_SELECTOR = HOST_RESOLVED_CHATINDEX
CHAT_ID_REVALIDATION = REQUIRED
CONTENT_FINGERPRINT_ROLE = FRESHNESS_REJECTION_ONLY
LEGACY_SUPPRESSION = EXACT_TARGET / STRUCTURAL / ATOMIC
GLOBAL_COMMUNITY_HIDE = FORBIDDEN
TRANSCRIPT_MARKER = NONE
PERSISTENT_PRESENTATION_BINDING = NONE
SOURCE_HISTORY = NONE
CONTEXT_REENTRY = NONE
DOM_OBSERVER_DEFAULT = NONE
SAFE_DOM_FALLBACK = DEFER_UNTIL_NEEDED
REROLL_INVALIDATION = REQUIRED
MANUAL_EDIT_INVALIDATION = REQUIRED / TARGET_HOST_SIGNAL_PROOF_PENDING
RELOAD_REPLAY = NONE
G5_UPSTREAM_PREFLIGHT = STRUCTURALLY_PLAUSIBLE
G5_TARGET_HOST_PROOF = PENDING
G5_RUNTIME_PASS = NOT_CLAIMED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
NEXT_DESIGN = LRE-7 PROSPECTIVE LEGACY CONTEXT RETIREMENT
```

No runtime implementation is authorized by this design.