# SimCore Post-3.0M LRE-6 Structured Presentation Cutover Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-6 IMPACT SCOPE FROZEN · LC3 PRESENTATION CUTOVER ONLY · DIRECT-B-ROOT LIVE_REACTION ONLY · DISPLAY-LOCAL CHATINDEX REBIND SELECTED AS DESIGN CANDIDATE · G5 TARGET-HOST EXECUTION PROOF STILL REQUIRED · DESIGN-ONLY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-6 · PRESENTATION CUTOVER · HOST MOUNT · IMPACT SCOPE**

## 0. Purpose

LRE-6 maps the narrowest presentation-only change surface required to move the first migrated LIVE_REACTION lane from LC2 legacy-compatible presentation to LC3 structured presentation, while preserving the already-frozen LC2 structured semantic owner.

It answers:

```text
Where can exact current host-message identity be recovered for presentation without storing hidden transcript markers?
Can current RisuAI source supply a display-local message-index echo after the plugin callback?
What is the minimum ephemeral binding needed to join a validated sidecar to the exact committed assistant message?
How may the legacy compatibility representation be hidden in presentation without rewriting stored transcript bytes?
What remains blocked until target-host execution proof?
```

This checkpoint is design-only.

It does not implement a display handler, DOM observer, Source UI, CSS, host bridge, runtime stage, serializer change, transcript rewrite, persistence, Candidate C identity, release, or target-host test.

## 1. Authority chain

Consumes:

```text
LRE master
LRE-1 Production + Host Coupling
LRE-2 Semantic Control
LRE-3 Caps + Instrumentation
LRE-4 Structured Shadow
LRE-5 Structured Semantic-Owner Cutover
3M-4 Presentation Renderer Architecture
3M-6 Provenance / Invalidation
3M-7 Context Re-entry / History
3M-9 Integration / Performance
MF-4 Presentation Stack / Mount Isolation
```

Runtime production remains independently authoritative on `release-simcore`.

## 2. Design-time snapshots

SimCore:

```text
main = 741d33dc3eafe36fe9d9549841439101c4a0d9eb
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production = v0.70.1 / legacy native Source presentation
```

Upstream host source inspected for this impact scope:

```text
kwaroran/RisuAI main
= 754af0ba5d546db9a8cc0c2676ba4c2693f3f72d
```

A future runtime transaction must re-preflight the then-current target host and production release.

## 3. LC3 target axis only

LRE-6 changes presentation ownership only.

Target conceptual axes:

```text
S = S1 STRUCTURED_VALIDATED_SEMANTIC       // inherited from LC2
P = P1 STRUCTURED_LIVE_REACTION_PRESENTATION
H = unchanged from the current transitional context contract
R = transitional legacy compatibility
```

Canonical law:

```text
LRE-6 MAY CUT PRESENTATION OWNERSHIP
LRE-6 MAY NOT REOPEN SEMANTIC OWNERSHIP
LRE-6 MAY NOT SILENTLY RETIRE LEGACY CONTEXT
```

LRE-7 remains owner of prospective legacy-context retirement.

## 4. Current host facts inherited from LRE-1

Current RisuAI exposes distinct phases:

```text
Phase O  editoutput
→ stored assistant-output transformation

Phase I  chat output listener
→ exact committed characterIndex / chatIndex / messageIndex
→ chat snapshot contains current message.chatId

Phase D  editdisplay
→ presentation-only transform
→ Plugin V2/V3 compatibility handler signature receives content string only
```

Therefore:

```text
STORED OUTPUT != DISPLAY OUTPUT
```

but also:

```text
DISPLAY CALLBACK
!=
DIRECT EXACT MESSAGE IDENTITY API
```

The original G5 blocker remains materially real.

## 5. New upstream source finding: display-local `chatindex` echo seam

Current upstream `processScriptFull(...)` order shows:

```text
editdisplay
→ Plugin V2 display handler receives data
→ handler may return transformed display data
→ host then calls risuChatParser(data, { chatID, ... })
→ remaining display scripts / rendering continue
```

Current upstream CBS defines:

```text
{{chatindex}}
{{chat_index}}
→ matcherArg.chatID.toString()
```

Therefore a display handler may conceptually emit a **display-only identity beacon template** containing `{{chatindex}}`; the host itself resolves that template under the exact message-local `chatID` after the plugin callback.

Canonical distinction:

```text
DISPLAY-LOCAL HOST INDEX ECHO
!=
PLUGIN CALLBACK DIRECTLY RECEIVES IDENTITY
```

This is a candidate bridge, not yet target-host execution proof.

## 6. Selected narrow candidate seam

LRE-6 selects for detailed design:

```text
DISPLAY_LOCAL_CHATINDEX_REBIND_V1
```

Conceptual participants:

```text
Validated LIVE_REACTION
        ↓
Presentation model preparation
        ↓
request/output-local pending presentation candidate
        ↓
Phase I exact committed identity
        ↓
HostPresentationBindingRefV1
        ↓
Phase D display-local chatindex beacon / conditional
        ↓
current chat re-read at resolved index
        ↓
exact message.chatId rebind
        ↓
Source Presentation Host
        ↓
LIVE_REACTION_STREAM_V1
```

No transcript marker is required.

## 7. Why `chatindex` alone is insufficient

A numeric message index is not durable identity.

Deletion, branch changes, reroll, edit/reconstruction, or other chat mutations may shift indices.

Therefore ordinary mount authority must require at least:

```text
characterIndex
chatIndex
messageIndex
message.chatId
runtime generation / epoch
current Source job/projection binding
current Source support/authority binding
```

The host-resolved display index is only a lookup coordinate.

Canonical law:

```text
CHAT INDEX
+ CURRENT CHAT RE-READ
+ EXACT CHAT ID MATCH
= MAY ESTABLISH CURRENT PRESENTATION BINDING
```

not:

```text
CHAT INDEX ALONE = MESSAGE IDENTITY
```

## 8. No use of host `x-hashed` as Source identity

Current upstream `Chats.svelte` creates `.chat-message-container` and an `x-hashed` value derived from a mix including message data, `chatId`, index, presentation flags and reload pointer.

LRE-6 rejects treating this internal render hash as Source identity.

Reasons:

```text
it is a host render-cache key, not a public semantic identity contract
it mixes presentation-local fields
its algorithm may change
it is not exposed as messageIndex/chatId
non-cryptographic hash collision is conceptually possible
```

Classification:

```text
BLOCKER · HOST_RENDER_HASH_TREATED_AS_SEMANTIC_MESSAGE_IDENTITY
```

## 9. No content or render-order binding

Inherited blockers remain:

```text
CONTENT_HASH_ONLY_DISPLAY_BINDING
RENDER_ORDER_AS_MESSAGE_IDENTITY
HIDDEN_TRANSCRIPT_MARKER_USED_TO_BRIDGE_DISPLAY_IDENTITY
LEGACY_PROSE_PARSED_BACK_INTO_TRUSTED_SOURCE_SEMANTICS
```

The new candidate must not weaken them.

## 10. Presentation-only beacon law

If a display-local beacon is used, it must be:

```text
created only in Phase D / display transformation
not present in stored assistant data
non-semantic
non-persistent
bounded
scoped to one pending Source presentation window
removed / inert after binding or invalidation
```

It may carry only correlation/presentation data such as:

```text
current Source job token or presentation nonce
host-resolved chat index template
presentation protocol version
```

It may not carry Source semantic bodies, support quotes, private/quarantined semantics, or future-context material.

## 11. Candidate host-materialization mechanism

The detailed design may use one of two equivalent display-local realizations if target-host proof supports it:

```text
A. host CBS conditional around one presentation transformation

or

B. display-only DOM beacon resolved by host CBS,
   followed by a bounded SafeDocument / mutation-observer rebind
```

Preference order:

```text
identity-bearing host callback/API if available later
> host-native CBS conditional/echo
> bounded SafeDocument adapter with exact rebind
> no mount
```

No unrestricted DOM scan is authorized.

## 12. Current upstream SafeDocument capability

Current RisuAI API 3.0 documentation/source exposes restricted main-application DOM access through `getRootDocument()` / `SafeDocument` and a Safe mutation observer API.

This makes a restricted DOM adapter structurally plausible if direct conditional materialization cannot complete the mount.

However:

```text
API EXISTS
!=
TARGET MOUNT CONTRACT PROVEN
```

Target-host proof must still demonstrate sanitizer survival, correct subtree binding, reroll/edit/reload behavior and cleanup.

## 13. Presentation candidate lifetime

First slice remains ephemeral/current-projection only.

```text
pending presentation candidate
→ current output transaction/runtime generation only

HostPresentationBindingRefV1
→ current runtime generation only

reload
→ binding may disappear
```

No durable Source object or Candidate C identity is created by LRE-6.

## 14. LC3 legacy bridge relationship

LRE-5 may retain a temporary `LegacyCommunityCompatibilitySerializerV1` while P0 is still active.

At LC3:

```text
structured LIVE_REACTION UI
= primary visible Source presentation
```

For the exact matched migrated message, the legacy compatibility representation must not remain simultaneously visible by default.

Canonical rule:

```text
ONE SOURCE PROJECTION
→ ONE ORDINARY VISIBLE SOURCE PRESENTATION
```

The stored legacy bridge may continue temporarily for the separate H/R compatibility axis until LRE-7/LRE-8 decide otherwise.

## 15. Presentation suppression is not transcript retirement

If the stored bridge continues for context compatibility, LRE-6 may suppress its **displayed representation** only inside the exact matched message presentation subtree.

This must not:

```text
rewrite message.data
remove historical <COMMUNITY> bytes
change host message identity
claim newLegacyContextCharsThisTurn = 0
```

Canonical law:

```text
LEGACY BLOCK NOT VISIBLE
!=
LEGACY CONTEXT RETIRED
```

## 16. No global Community hiding

Forbidden:

```text
LC3 enabled
→ hide every <COMMUNITY> in every displayed historical message
```

Reason:

- old chats remain mixed-era compatibility content;
- exact migrated-message binding is required;
- LRE-8 owns old-chat/mixed-era close.

Only the exact current migrated projection may receive ordinary presentation suppression in the first slice.

## 17. Presentation failure law

Presentation failure must not rewrite semantic disposition.

```text
PRIMARY_AVAILABLE semantic sidecar
+ mount failure
→ semantic sidecar remains valid for current request-local lifetime
→ Source presentation = unavailable/failed
```

Forbidden:

```text
mount failed
→ downgrade semantic ALLOW
→ regenerate legacy semantics
→ parse Community back into sidecar
```

If exact binding cannot be proven, do not fuzzy-mount or globally hide legacy UI.

The runtime/evidence transaction must classify the failure and release-level rollback may be required before continued LC3 operation.

## 18. Reroll/edit/reload invalidation

First-slice mount must inherit LRE-1 invalidation:

```text
reroll
→ old HostPresentationBindingRef invalid

manual edit
→ old binding invalid

source support/current authority mismatch
→ unmount / no remount

runtime reload
→ ephemeral binding lost
```

Historical replay after reload is not claimed by this first slice.

LRE-8 remains responsible for mixed-era/history compatibility semantics.

## 19. DORMANT isolation

When no current presentation candidate/binding exists:

```text
display handler returns input unchanged
no display beacon emitted
no Source DOM scan
no Source mutation observer remains armed
no Source mount/update/unmount work
```

Any observer used for a pending mount must be bounded and disconnected on:

```text
successful bind/mount
candidate invalidation
runtime generation change
plugin unload
```

No always-on Source DOM crawler is permitted.

## 20. Scope selected for detailed LRE-6 design

Selected first slice:

```text
family = LIVE_REACTION
mode = C
source = direct B root
semantic stage = PRIMARY (future precondition)
presentation adapter = LIVE_REACTION_STREAM_V1
mount profile candidate = DISPLAY_LOCAL_CHATINDEX_REBIND_V1
persistence = NONE
future Source context re-entry = NONE
interaction = VIEW_LOCAL_ONLY
```

Out of scope:

```text
BOARD / NEWS mount
multi-family stack runtime
Source history replay
persistent cards
stable cross-turn Source identity
item mutation
LRE-7 legacy context retirement
LRE-8 old-chat migration
```

## 21. G5 disposition after source preflight

LRE-6 impact scope narrows G5 to:

```text
G5_DESIGN_SEAM
= DISPLAY_LOCAL_CHATINDEX_REBIND_V1 SELECTED

G5_UPSTREAM_SOURCE_PREFLIGHT
= STRUCTURALLY_PLAUSIBLE

G5_TARGET_HOST_EXECUTION_PROOF
= PENDING

G5_RUNTIME_PASS
= NOT CLAIMED
```

The target-host proof must establish actual rendering order/lifecycle rather than infer it from source alone.

## 22. Required future target-host proof classes

At minimum:

```text
P1 display callback output is not stored in transcript
P2 host resolves display-local {{chatindex}} to the actual displayed message index
P3 Phase I exact identity and display-local resolved index can be rebound to the same current message.chatId
P4 identical-content messages do not cross-bind
P5 reroll invalidates old binding
P6 manual edit invalidates old binding
P7 reload does not resurrect stale structured card from hidden state
P8 legacy bridge display suppression is exact-message-local only
P9 ordinary DORMANT display does no Source DOM work
P10 plugin unload/reload cleans handlers/observers/mounts
P11 no structured semantic bytes/beacon bytes enter stored transcript
P12 mount failure does not alter semantic authority
```

## 23. BLOCKER set

```text
BLOCKER · CHAT_INDEX_ALONE_TREATED_AS_MESSAGE_IDENTITY
BLOCKER · HOST_RENDER_HASH_TREATED_AS_SEMANTIC_MESSAGE_IDENTITY
BLOCKER · CONTENT_MATCH_OR_RENDER_ORDER_USED_FOR_MOUNT
BLOCKER · DISPLAY_BEACON_ENTERED_STORED_TRANSCRIPT
BLOCKER · DISPLAY_BEACON_CARRIES_SOURCE_SEMANTIC_BODY
BLOCKER · UNBOUNDED_SOURCE_DOM_SCAN_OR_ALWAYS_ON_OBSERVER
BLOCKER · LEGACY_COMMUNITY_GLOBALLY_HIDDEN_WITHOUT_EXACT_BINDING
BLOCKER · PRESENTATION_FAILURE_REOPENS_LEGACY_SEMANTIC_AUTHORITY
BLOCKER · STRUCTURED_AND_LEGACY_SOURCE_SURFACES_DUAL_VISIBLE_BY_DEFAULT
BLOCKER · REROLL_OR_EDIT_REUSES_STALE_PRESENTATION_BINDING
BLOCKER · LC3_CLAIMS_LEGACY_CONTEXT_RETIREMENT
```

## 24. WATCH set

```text
WATCH · DISPLAY_CALLBACK_TO_PHASE_I_TIMING_REQUIRES_TARGET_HOST_PROOF
WATCH · DISPLAY_BEACON_SANITIZER_SURVIVAL_REQUIRES_TARGET_HOST_PROOF
WATCH · SAFE_DOM_CLOSEST_MESSAGE_SUBTREE_CONTRACT_REQUIRES_TARGET_HOST_PROOF
WATCH · EPHEMERAL_CARD_NOT_RESTORED_AFTER_RELOAD
```

## 25. DEFER set

```text
DEFER · DURABLE_SOURCE_CARD_REPLAY
DEFER · PERSISTENT_HOST_PRESENTATION_BINDING
DEFER · BOARD_PRESENTATION_CUTOVER
DEFER · NEWS_PRESENTATION_CUTOVER
DEFER · MULTI_FAMILY_PRESENTATION_STACK_RUNTIME
DEFER · LEGACY_CONTEXT_RETIREMENT_TO_LRE7
DEFER · OLD_CHAT_MIXED_ERA_CLOSE_TO_LRE8
```

## 26. Selected next design seam

Proceed to LRE-6 detailed design around:

```text
HostPresentationBindingRefV1
+ DisplayLocalIdentityBeaconV1
+ exact current-chat rebind
+ LIVE_REACTION_STREAM_V1 materialization
+ exact-message-local legacy presentation suppression
+ mount invalidation / cleanup
```

No runtime implementation is authorized by this impact scope.
