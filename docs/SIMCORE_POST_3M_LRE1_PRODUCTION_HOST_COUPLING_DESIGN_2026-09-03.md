# SimCore Post-3.0M LRE-1 Production / Host Coupling Design — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-1 DESIGN FROZEN · DESIGN-ONLY · HOST COUPLING PROFILE FROZEN · TRANSCRIPT / COMMITTED-IDENTITY / DISPLAY PHASES SEPARATED · DISPLAY IDENTITY GAP CONFIRMED · EPHEMERAL CURRENT-PROJECTION PRESENTATION PROFILE SELECTED CONDITIONALLY · G4 BLOCKED · G5 NARROWED BUT BLOCKED · NO RUNTIME AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · LEGACY / RUNTIME-ENABLING · LRE-1 · HOST COUPLING · DETAILED DESIGN**

## 0. Purpose

LRE-1 freezes the host-coupling contract that all later Legacy / Runtime-enabling checkpoints must obey.

It answers:

```text
What does current SimCore actually write into stored assistant transcript?

What presentation-only phase does current RisuAI expose?

Where can exact committed message identity be observed?

Can a structured Source projection be shown without storing it in assistant transcript?

What exact identity gap still blocks a safe source-local presentation mount?

What does reroll / edit / reload mean for a current-projection-only source card?

Which facts may LRE-2 and LRE-6 rely on without re-proving them?
```

This checkpoint does not select or implement the G4 structured sidecar transport.

It does not add a display handler, output listener, DOM adapter, message metadata, storage record, prompt/output tag, persistence layer, or release change.

## 1. Authority chain

LRE-1 consumes:

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_IMPACT_SCOPE_2026-09-03.md
docs/SIMCORE_LRE1_POST_MERGE_CANONICAL_DOC_PROMOTION_WATCH_2026-09-03.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
```

Production runtime authority remains `release-simcore`.

Host facts in this design were re-read from current upstream RisuAI source and are evidence for this checkpoint, not a permanent host-version guarantee.

## 2. Evidence snapshot

Design-time evidence snapshot:

```text
SimCore production branch
= release-simcore

SimCore production commit
= 861100f4771967aa5b8ab8811d06f11702c0d3ff

SimCore production version
= v0.70.1

production latest.js blob
= 8f332cfceed316d35954e353c2eaca38c2f34d95

production install.js blob
= 8f332cfceed316d35954e353c2eaca38c2f34d95

latest.js == install.js
= YES

RisuAI source snapshot
= 754af0ba5d546db9a8cc0c2676ba4c2693f3f72d
```

Future implementation must re-run G1 and host preflight against then-current identities.

## 3. Central LRE-1 finding

Current RisuAI is neither fully coupled nor already ready for structured source presentation.

Frozen conclusion:

```text
STORED OUTPUT
!=
DISPLAY OUTPUT
```

is physically true.

But:

```text
DISPLAY OUTPUT PHASE EXISTS
!=
IDENTITY-BEARING SOURCE MOUNT EXISTS
```

is also true.

Therefore:

```text
HOST_DECOUPLING
= PARTIAL_PROOF
```

## 4. `HostCouplingProfileV1`

LRE-1 freezes the following conceptual host profile.

```text
HostCouplingProfileV1

requestMutationPhase
= beforeRequest

storedOutputPhase
= editoutput

committedIdentityObservationPhase
= chat output listener

displayPhase
= editdisplay

displayPluginInput
= content only

hostChatReadWriteCapability
= exact-index getChat / setChat exists for existing runtime responsibilities

sourcePresentationMount
= not currently frozen

sourceSemanticPayloadCarrier
= not currently frozen
```

This is a design contract, not a runtime schema.

## 5. Phase Q · request mutation

Current SimCore uses:

```text
Risuai.addRisuReplacer('beforeRequest', ...)
```

for request-time behavior.

This phase may influence what the model receives.

Therefore:

```text
REQUEST PHASE
!=
PRESENTATION PHASE
```

A future source presentation feature must not use request mutation merely to make UI state renderable.

## 6. Phase O · stored output

Current SimCore uses:

```text
Risuai.addRisuScriptHandler('output', ...)
```

The current host processes this as `editoutput`, then stores the processed output in the assistant message record.

Current SimCore returns finalized `result.content` from this phase.

Frozen authority:

```text
PHASE O
= STORED ASSISTANT OUTPUT AUTHORITY
= TRANSCRIPT-COUPLED
```

Consequences:

```text
bytes added here
may become ordinary stored assistant message bytes
may participate in future host transcript/model context
```

Therefore Phase O is not a safe place to hide structured source payload merely because the UI does not show it.

## 7. Phase I · committed identity observation

Current RisuAI exposes an output chat listener path after the committed assistant message has been resolved in the current chat.

The host resolves the committed message index from the output message identity and calls output listeners with current chat plus message index.

Frozen authority:

```text
PHASE I
= COMMITTED HOST MESSAGE IDENTITY OBSERVATION
```

This is important because Phase O itself is primarily an output-content transform.

Conceptually:

```text
output becomes stored message
        ↓
committed message is identifiable
        ↓
output listener observes exact current chat/message index
```

LRE-1 does not authorize a new listener yet.

It freezes only that an identity-observation seam physically exists in the current host.

## 8. Phase D · display

Current RisuAI has a distinct:

```text
editdisplay
```

processing phase.

Plugin documentation exposes:

```text
Risuai.addRisuScriptHandler('display', handler)
```

as a display-time content transformation.

Host source shows Plugin V2 display handlers invoked conceptually as:

```text
plugin(data)
```

Frozen authority:

```text
PHASE D
= PRESENTATION-ONLY TRANSFORM CANDIDATE
```

It is not the stored semantic output authority.

## 9. The display identity gap

The Plugin V2 display handler receives content, not an exact host message identity.

At the host-internal `processScriptFull(...)` level a `chatID` exists, but Plugin V2 handlers are invoked with the content string only.

Therefore a SimCore display handler cannot currently assume it receives:

```text
chatId
messageIndex
message UUID
assistant turn identity
projection identity
```

Frozen finding:

```text
DISPLAY_PLUGIN_CALLBACK_IDENTITY
= CONTENT_ONLY
```

This creates the central remaining G5 blocker.

## 10. Why content matching is not exact identity

Forbidden binding:

```text
stored text hash
→ find matching Source sidecar
→ render card
```

Reason:

```text
identical assistant messages may exist
same content may be re-rendered in more than one location
manual edit may recreate old text
format-only transforms may change presentation text
```

Canonical rule:

```text
CONTENT EQUALITY
!=
HOST MESSAGE IDENTITY
```

Therefore:

```text
BLOCKER · CONTENT_HASH_ONLY_DISPLAY_BINDING_TREATED_AS_EXACT_IDENTITY
```

## 11. Why display order is not identity

Forbidden binding:

```text
"the next display callback after output listener"
→ must be the new assistant turn
```

or:

```text
DOM/render order
→ message index
```

unless the exact target host contract proves that relationship.

Rendering can be repeated, virtualized, filtered, reparsed, or triggered by unrelated view changes.

Canonical rule:

```text
RENDER ORDER
!=
SEMANTIC MESSAGE IDENTITY
```

## 12. Why hidden transcript markers are forbidden

A tempting bridge would be:

```text
Phase O stores hidden source marker
→ Phase D reads marker
→ Phase D mounts card
```

LRE-1 rejects this.

```text
BLOCKER · HIDDEN_TRANSCRIPT_MARKER_USED_TO_BRIDGE_DISPLAY_IDENTITY
```

Reason:

```text
stored transcript contamination
model-context contamination risk
G4 transport/presentation conflation
legacy-context retirement defeated by a new hidden source channel
```

A hidden marker is still stored data if it lives in assistant transcript.

## 13. Why raw legacy prose cannot bridge identity

Forbidden:

```text
old <COMMUNITY> prose
→ parse content
→ infer source card identity
```

This would violate the existing rule that model/legacy prose cannot be promoted into trusted structured source semantics.

```text
BLOCKER · LEGACY_PROSE_PARSED_BACK_INTO_TRUSTED_SOURCE_SEMANTICS
```

## 14. Ephemeral presentation binding is not Candidate C identity

LRE-1 introduces a conceptual distinction:

```text
HostPresentationBindingRef
!=
DerivedObjectId / Candidate C durable identity
```

A first-major read-only source card needs only a bounded current-runtime host binding.

It does not need:

```text
cross-turn source identity
persistent source history
item mutation identity
revision ledger
future prompt retrieval
```

Therefore an ephemeral host binding may be designed without activating Candidate C for the read-only first-major lane.

## 15. Conceptual `HostPresentationBindingRef`

The minimum future presentation binding must prove, conceptually:

```text
host chat identity
host message identity
current runtime generation
current source projection generation
current source support fingerprint / authority binding
```

Exact runtime field names are not frozen here.

The binding is valid only while all relevant dimensions remain current.

## 16. Presentation binding law

Canonical future rule:

```text
CURRENT HOST MESSAGE
AND CURRENT RUNTIME GENERATION
AND CURRENT SOURCE PROJECTION
AND CURRENT SOURCE SUPPORT
→ PRESENTATION MAY ATTACH
```

Otherwise:

```text
NO SOURCE PRESENTATION
```

No fuzzy fallback.

## 17. `EPHEMERAL_CURRENT_PROJECTION_DISPLAY_V1`

LRE-1 selects the following first-major **presentation profile**, conditionally on an exact message-binding seam being proven later.

```text
EPHEMERAL_CURRENT_PROJECTION_DISPLAY_V1
```

Properties:

```text
semantic source object
= current validated projection only

persistence
= none

source history
= none

historical replay
= none

future model-context re-entry
= none

reload restoration
= none
```

The profile is compatible with 3M-7/3M-9 current-projection-only semantics.

It is not yet G5-ready because exact display-message binding remains unsolved.

## 18. Reload semantics

For this selected profile:

```text
runtime reload
→ in-memory presentation binding disappears
→ historical source card does not reconstruct
→ stored assistant prose remains
```

This is intentional first-major behavior, not data corruption.

Canonical rule:

```text
RELOAD LOSS OF EPHEMERAL SOURCE CARD
!=
LOSS OF CANONICAL WORLD STATE
```

because the source card is a current derived projection, not canonical state.

If product requirements later demand exact historical source-card replay after reload, that is a different durability product and must reopen Candidate C/persistence requirements as applicable.

## 19. Reroll semantics

A reroll may replace the semantic output supporting a current source projection.

Default LRE-1 rule:

```text
REROLL START / SOURCE REPLACEMENT
→ OLD PRESENTATION BINDING INVALID
```

The old source card must not survive merely because:

```text
same DOM slot remains
same message index appears to remain
same text prefix remains
```

Future target-host proof must determine exact host identity behavior during reroll.

Until then:

```text
WATCH · REROLL_HOST_MESSAGE_IDENTITY_SEMANTICS_UNPROVEN
```

## 20. Manual edit semantics

A manual edit changes stored assistant representation.

The current source presentation was validated against earlier current support/output conditions.

Default safe rule:

```text
MANUAL EDIT OF BOUND ASSISTANT MESSAGE
→ OLD SOURCE PRESENTATION BINDING INVALID
```

unless a later edit-reconcile design proves a narrower safe revalidation path.

Presentation must not silently remain attached to edited content simply because the display hook still runs.

## 21. Render-only refresh semantics

Display may rerun without semantic mutation.

For a still-current exact binding:

```text
render refresh
→ presentation adapter must be idempotent
```

It must not:

```text
append duplicate cards
increment semantic counters
create new source assertions
persist new source history
```

## 22. Runtime replacement / unload semantics

Current SimCore already has runtime-generation and cleanup principles for replacers/handlers/UI parts.

LRE-1 carries forward:

```text
old runtime generation
→ old source presentation effect invalid
```

A future display/listener integration must be cleanup-owned and generation-bound.

No orphan source presentation handler may retain semantic authority after runtime replacement.

## 23. Host phase matrix

Frozen conceptual matrix:

| Host event | Phase O stored output | Phase I committed identity | Phase D display | LRE-1 source rule |
| --- | --- | --- | --- | --- |
| ordinary generation | runs | committed identity observable | renders | bind only with exact proven message identity |
| reroll | new stored output path | new/current identity must be observed | rerenders | stale old binding first |
| manual edit | stored message changes outside source producer | exact edit lifecycle not yet exposed to Source lane | rerenders | old source binding invalid by default |
| reload | stored message survives | runtime observer state resets | display reruns | no card for memory-only profile |
| render refresh | no stored mutation | no new semantic identity | reruns | idempotent display only |
| runtime replacement | hook ownership changes | old observer stale | old display handler stale | generation fence required |

## 24. Three distinct identity domains

Do not collapse:

```text
A. SimCore request/output turn identity
B. RisuAI committed host message identity
C. Source projection identity/support
```

A future host binding joins them.

None is automatically interchangeable with another.

Example forbidden shortcut:

```text
SimCore says "current assistant turn"
→ assume arbitrary display callback is that exact host message
```

## 25. Existing output listener is promising but insufficient by itself

The current host output listener provides exact committed message location information.

This can potentially establish:

```text
SimCore current projection
↔ committed host message
```

in runtime memory.

But Phase D still needs a safe way to know which host message it is rendering.

Therefore:

```text
COMMITTED IDENTITY OBSERVER
+ CONTENT-ONLY DISPLAY HANDLER
!=
COMPLETE PRESENTATION BINDING
```

## 26. LRE-6 must solve the second half of the join

LRE-6 structured presentation cutover cannot close G5 until it proves:

```text
Phase I exact committed message identity
        ↓
current HostPresentationBindingRef
        ↓
Phase D or another supported presentation mount
receives/resolves the SAME exact message identity
```

The missing lower edge is the present blocker.

## 27. Accepted mount directions for future investigation

LRE-1 does not choose one, but allows later LRE-6 to investigate in least-power order:

### Direction A · supported identity-bearing display/mount API

Preferred if current/future RisuAI exposes one.

```text
exact message identity supplied by host
+ presentation-only output
```

This is the cleanest path.

### Direction B · bounded supported message-local presentation API

Allowed if a supported plugin UI API can attach to an exact message without rewriting transcript.

### Direction C · restricted main-DOM adapter

Only if A/B cannot satisfy the product and exact DOM identity/lifecycle is proven.

It must use supported/sanitized document access and a narrow namespace.

Direct DOM access is not selected by LRE-1.

### Direction D · upstream host capability amendment

If the plugin API fundamentally lacks an identity-bearing display seam, an upstream/host API addition may be cleaner than transcript markers or brittle DOM inference.

This is a design option, not a SimCore runtime change.

## 28. Forbidden mount directions

```text
hidden JSON in assistant transcript
hidden HTML comments in assistant transcript
content-hash-only exact binding
render-order identity inference
parse legacy Community into trusted sidecar
full-chat rewrite from partial public chat view
persistent Source DB merely to solve a current-turn display problem
```

## 29. Main-DOM boundary

Current RisuAI provides powerful main-document access capabilities, but LRE-1 preserves least-power selection.

Canonical ordering:

```text
supported identity-bearing presentation API
→ supported bounded plugin UI API
→ restricted main-DOM adapter only if required
```

Before a main-DOM path is ever selected, future evidence must prove:

```text
exact message node identity
mount/unmount lifecycle
virtualization/re-render behavior
reroll/edit behavior
sanitization boundaries
namespace isolation
cleanup on runtime replacement
```

## 30. Host chat write boundary

Current SimCore runtime can read and write exact chats for existing representation/edit reconciliation responsibilities.

This does not grant Source presentation authority to rewrite chat records.

Canonical rule:

```text
HOST WRITE CAPABILITY
!=
SOURCE PRESENTATION WRITE AUTHORITY
```

LRE-1 forbids using `setChat` merely to attach presentation metadata unless a later explicit host metadata contract proves ownership and preservation safety.

## 31. Old-chat behavior

Old stored assistant messages containing `<COMMUNITY>` remain historical compatibility data.

LRE-1 does not alter them.

```text
OLD COMMUNITY
→ readable historical transcript
```

It does not become:

```text
structured sidecar
current source authority
presentation binding authority
Candidate C durable object
```

## 32. Prospective context retirement proof status

Because stored output and display output are physically separate host phases, the master target is structurally plausible:

```text
new assistant transcript
without new legacy <COMMUNITY>
        +
current structured sidecar outside transcript
        ↓
presentation-only source UI
```

Frozen status:

```text
PROSPECTIVE_LEGACY_CONTEXT_RETIREMENT
= STRUCTURALLY PLAUSIBLE
```

But it cannot be activated until structured presentation is proven and the LC ordering is respected.

## 33. What LRE-2 may rely on

LRE-2 selector / producer / transport design may rely on:

```text
current SimCore output path is transcript-coupled
hidden in-band sidecar is forbidden
presentation can be conceptually separate from storage
committed output identity can be observed after host commit
G5 remains independent from G4
```

LRE-2 must not assume an exact display mount exists.

## 34. What LRE-4 may rely on

LRE-4 structured shadow does not require visible presentation.

Therefore:

```text
G5 unresolved
!=
LRE-4 shadow impossible
```

As long as G2/G3/G4/G6/G8 applicable shadow gates are solved later, structured semantic shadow can be evaluated without a visible source card.

## 35. What LRE-5 may rely on

LRE-5 semantic owner cutover can conceptually precede final structured presentation if an approved compatibility representation remains.

This preserves the master ordering:

```text
semantic owner first
→ presentation second
```

It must not create two independent semantic owners.

## 36. What LRE-6 must prove

LRE-6 must close the identity-bearing presentation problem.

Required proof categories:

```text
exact host message identity at mount
current projection identity
runtime generation
support-at-use
reroll invalidation
manual-edit invalidation
reload behavior
render idempotency
cleanup/unload
failure isolation
```

## 37. What LRE-7 may not do early

Prospective legacy-context retirement is downstream of presentation proof.

Forbidden sequence:

```text
stop generating new Community transcript
→ hope a structured card can be mounted later
```

Required sequence remains:

```text
semantic owner proven
→ structured presentation proven
→ then prospective legacy context retirement
```

## 38. Future target-host proof matrix

LRE-1 freezes the following future execution protocol categories.

No execution is performed now.

```text
H1 · editoutput persistence proof
H2 · editdisplay non-persistence proof
H3 · identical-message display ambiguity proof
H4 · output-listener committed identity proof
H5 · reroll identity/invalidation proof
H6 · manual-edit identity/invalidation proof
H7 · reload memory-only presentation loss/re-render proof
H8 · runtime unload/replacement display/listener cleanup proof
```

### H1

Prove whether output handler result becomes stored assistant data under the target host version.

### H2

Prove display-handler transformation does not mutate stored message data.

### H3

Create two semantically distinct messages with identical visible/stored text and prove a content-only display handler cannot safely identify them.

### H4

Prove output listener exposes exact committed message location after generation.

### H5

Observe exact host message identity behavior across reroll.

### H6

Observe exact host message identity and display behavior across manual edit.

### H7

Prove runtime-memory-only source presentation disappears on reload and does not reconstruct from transcript.

### H8

Prove old handlers/listeners cannot affect presentation after runtime replacement/unload.

## 39. Test interpretation

A future target-host PASS must not be inferred from:

```text
"the card looked right once"
```

It must prove identity/lifecycle contracts.

A visually correct card on the wrong duplicate message is a failure.

## 40. Failure-domain separation

LRE-1 preserves:

```text
semantic validation failure
!=
host binding failure
!=
presentation render failure
!=
legacy compatibility failure
```

Examples:

```text
validated sidecar exists but exact message binding missing
→ no source card
→ semantic object not corrupted

source card render throws
→ stored assistant transcript unchanged
→ validated semantics remain authoritative for current runtime only
```

## 41. Source-irrelevant baseline

On a DORMANT turn:

```text
no Source projection
→ no presentation binding
→ no source display work beyond unavoidable bounded hook branching if such a hook later exists
```

LRE-1 does not authorize a display pipeline that scans all historical messages for Source data on every render.

## 42. Performance boundary

Future presentation binding must be bounded by current projection/current message, not chat history.

Forbidden:

```text
on every display callback
→ scan entire chat for matching sidecar
```

or:

```text
on every source generation
→ rebuild bindings for all old messages
```

## 43. Candidate C boundary

The post-3M Interaction lane has separately triggered Candidate C for durable mutation consumers such as `BOARD_APPEND_REPLY`.

That does not change this read-only LRE-1 profile.

```text
TIER A READ-ONLY SOURCE PRESENTATION
= ephemeral current projection
= no Candidate C durability requirement by default

TIER B INTERACTIVE/DURABLE SOURCE
= applicable Candidate C contracts required
```

Do not solve Tier A G5 by importing Tier B persistence gratuitously.

## 44. G1 consequence

For this design transaction:

```text
G1 DESIGN-TIME RE-PREFLIGHT
= PASS
```

because current production and latest/install identity were freshly verified.

Future implementation-time G1 remains mandatory.

## 45. G4 consequence

LRE-1 deliberately does not select structured producer/transport.

```text
G4
= BLOCKED / OWNED BY LRE-2
```

## 46. G5 consequence

LRE-1 narrows G5 into an exact question.

Before:

```text
ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

After LRE-1:

```text
PRESENTATION-ONLY HOST PHASE EXISTS
BUT
IDENTITY-BEARING MESSAGE-LOCAL PRESENTATION BINDING IS UNPROVEN
```

Frozen state:

```text
G5
= NARROWED_BUT_BLOCKED
```

## 47. LRE-1 blocker set

```text
BLOCKER · ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
BLOCKER · DISPLAY_PHASE_LACKS_EXACT_MESSAGE_IDENTITY_FOR_PLUGIN_HANDLER
BLOCKER · HIDDEN_TRANSCRIPT_MARKER_USED_TO_BRIDGE_DISPLAY_IDENTITY
BLOCKER · CONTENT_HASH_ONLY_DISPLAY_BINDING_TREATED_AS_EXACT_IDENTITY
BLOCKER · RENDER_ORDER_USED_AS_SEMANTIC_MESSAGE_IDENTITY
BLOCKER · LEGACY_PROSE_PARSED_BACK_INTO_TRUSTED_SOURCE_SEMANTICS
BLOCKER · HISTORICAL_REPLAYABLE_SOURCE_PRESENTATION_WITHOUT_DURABLE_AUTHORITY
BLOCKER · SOURCE_PRESENTATION_REBUILDS_FULL_CHAT_FROM_PARTIAL_VIEW
BLOCKER · DISPLAY_SUCCESS_USED_AS_SEMANTIC_AUTHORITY
```

## 48. WATCH set

```text
WATCH · REROLL_HOST_MESSAGE_IDENTITY_SEMANTICS_UNPROVEN
WATCH · MANUAL_EDIT_PRESENTATION_INVALIDATION_MECHANICS_UNPROVEN
WATCH · DISPLAY_HANDLER_SOURCE_MARKUP_SANITIZATION_NEEDS_TARGET_HOST_PROOF
WATCH · CANONICAL_DOC_PROMOTION_CONTROL_PLANE_CLASSIFICATION_DRIFT
```

The canonical documentation promotion WATCH is repository-admin only and is tracked separately.

## 49. DEFER set

```text
DEFER · HISTORICAL_SOURCE_CARD_REPLAY
DEFER · PERSISTENT_SOURCE_PRESENTATION_STORE
DEFER · HOST_MESSAGE_METADATA_SIDECAR
DEFER · MAIN_DOM_SOURCE_MOUNT
DEFER · LEGACY_PARSER_FULL_RETIREMENT
DEFER · HISTORICAL_TRANSCRIPT_REWRITE
DEFER · INTERACTIVE_SOURCE_DURABILITY_IN_TIER_A
```

## 50. LRE-1 close criteria

LRE-1 design is complete when:

```text
current production re-preflight recorded
stored output coupling classified
presentation-only phase proven
committed identity observation seam proven
content-only display identity gap recorded
first-major ephemeral presentation profile frozen
reroll/edit/reload default semantics frozen
G4/G5 ownership handed forward
no runtime implementation performed
```

All are satisfied by this design checkpoint.

## 51. Handoff to LRE-2

Next design checkpoint:

```text
LRE-2
Exposure / Source-Job Selector / Structured Producer-Transport Contracts
```

LRE-2 should not attempt to solve presentation mounting.

Its bounded task is to freeze:

```text
who decides source ACTIVE/DORMANT/UNSUPPORTED
who produces the structured draft
how the draft crosses from semantic generation into validator ownership
how visible assistant prose remains separate
how missing/malformed draft fails
how G2 Exposure host/model evidence enters the program
```

The LRE-1 host profile remains an input, especially the rule:

```text
DO NOT USE STORED ASSISTANT TRANSCRIPT AS A HIDDEN SIDECAR BUS
```

## 52. Final freeze

```text
LRE_1_DESIGN                              = FROZEN
HOST_PROFILE                              = HostCouplingProfileV1
CURRENT_STORED_OUTPUT                     = TRANSCRIPT_COUPLED
COMMITTED_IDENTITY_OBSERVER               = EXISTS
DISPLAY_ONLY_PHASE                        = EXISTS
DISPLAY_PLUGIN_CALLBACK_IDENTITY          = CONTENT_ONLY
HOST_DECOUPLING                           = PARTIAL_PROOF
FIRST_PRESENTATION_PROFILE                = EPHEMERAL_CURRENT_PROJECTION_DISPLAY_V1
FIRST_PRESENTATION_PROFILE_G5_READY       = NO
PROSPECTIVE_CONTEXT_RETIREMENT            = STRUCTURALLY_PLAUSIBLE
HISTORICAL_REPLAY                         = DEFER
G1_DESIGN_TIME                            = PASS
G4                                        = BLOCKED / LRE-2
G5                                        = NARROWED_BUT_BLOCKED / LRE-6
RUNTIME_IMPLEMENTATION                    = NOT_AUTHORIZED
PROMPT_OUTPUT_CHANGE                      = NONE
DOM_CSS_CHANGE                            = NONE
PERSISTENCE_CHANGE                        = NONE
HOST_HISTORY_CHANGE                       = NONE
PRODUCTION                                = UNCHANGED
NEXT                                      = LRE-2
```
