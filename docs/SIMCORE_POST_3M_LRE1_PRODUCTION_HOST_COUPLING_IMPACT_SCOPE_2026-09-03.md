# SimCore Post-3.0M LRE-1 Production / Host Coupling Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-1 IMPACT SCOPE FROZEN · DESIGN-ONLY · CURRENT PRODUCTION RE-PREFLIGHTED · HOST DISPLAY/TRANSCRIPT PARTIAL DECOUPLING PROVEN · STRUCTURED SOURCE MOUNT/PAYLOAD CARRIER STILL UNPROVEN · NO RUNTIME AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · LEGACY / RUNTIME-ENABLING · LRE-1 · READ-ONLY IMPACT SCOPE**

## 0. Purpose

LRE-1 is the first child checkpoint of:

```text
SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
```

It answers one bounded question before any implementation-oriented design proceeds:

```text
At the then-current production and current RisuAI host,
which output/presentation/history seams are actually coupled,
which are actually separable,
and which remain unproven for structured Source Intelligence?
```

This document performs read-only impact scoping only.

It does not implement, patch, deploy, mutate history, add a display hook, add a sidecar transport, add persistence, or change prompt/output semantics.

## 1. Frozen evidence snapshot

Repository authority observed for this checkpoint:

```text
main
= 671bcadb399d86ee661893d789ea5cdc43d1bd69

release-simcore
= 861100f4771967aa5b8ab8811d06f11702c0d3ff

production version
= v0.70.1
```

Production file identity:

```text
plugins/simcore/latest.js blob
= 8f332cfceed316d35954e353c2eaca38c2f34d95

plugins/simcore/install.js blob
= 8f332cfceed316d35954e353c2eaca38c2f34d95

latest.js == install.js
= YES
```

Current upstream RisuAI host source inspected at:

```text
kwaroran/Risuai main
= 754af0ba5d546db9a8cc0c2676ba4c2693f3f72d
```

This RisuAI SHA is host-preflight evidence for this design checkpoint, not a permanent compatibility promise.

Future implementation must re-preflight both production and host again.

## 2. Existing SimCore production host seams

Current production physically defines a `runtime-host` adapter with bounded host operations:

```text
current character/chat indices
get current chat
get current character
set chat by exact indices
plugin storage backend
```

Current runtime hook registration is:

```text
beforeRequest
→ Risuai.addRisuReplacer('beforeRequest', ...)

output
→ Risuai.addRisuScriptHandler('output', ...)
```

Current UI registration is only:

```text
chat button
settings entry
fullscreen SimCore panel
```

No current production Source Intelligence display hook or source-local message-card mount exists.

## 3. Current production `output` hook is transcript-coupled

Current SimCore output processing:

```text
host output handler input
→ CoreRulesetSession.processOutput(...)
→ validated/finalized result.content
→ output handler returns result.content
```

Current RisuAI host executes the `editoutput` processing path and assigns the processed result to the message record's `data` field.

Therefore the existing SimCore output hook is not a presentation-only seam.

Canonical impact finding:

```text
CURRENT_SIMCORE_OUTPUT_HOOK
= STORED_OUTPUT / TRANSCRIPT COUPLED
```

This is compatible with existing SimCore behavior, where `<COMMUNITY>` is part of ordinary assistant output/history.

It is not the preferred seam for future presentation-only Source cards.

## 4. Current RisuAI exposes a distinct display-only phase

Current RisuAI host has a separate script mode:

```text
editdisplay
```

Current host processing calls the display-mode pipeline during rendering and allows plugin `display` handlers to transform the content used for presentation.

This is physically distinct from `editoutput`, which mutates the stored assistant message text.

The public host documentation describes:

```text
Risuai.addRisuScriptHandler('display', handler)
→ modify content before display
```

The existing SimCore reference analysis independently classifies `editDisplay` as presentation-time behavior whose writes are temporary/non-persistent.

Canonical finding:

```text
HOST_DISPLAY_ONLY_PHASE_EXISTS
= PROVEN
```

## 5. Partial decoupling verdict

The host provides enough evidence to reject both extremes.

Too pessimistic:

```text
"RisuAI necessarily stores exactly what it visually renders"
= FALSE
```

Too optimistic:

```text
"SimCore can already mount a durable structured source card beside any message"
= NOT PROVEN
```

Frozen LRE-1 impact verdict:

```text
HOST_OUTPUT / PRESENTATION DECOUPLING
= PARTIALLY PROVEN

stored output seam
= coupled to transcript

display-only transform phase
= exists

structured source-local mount authority
= unproven

structured semantic payload carrier for display
= unproven
```

## 6. Why the display phase does not close G5 by itself

A display transform takes current message text and produces presentation text.

3M-4 requires more than generic text transformation:

```text
ValidatedSourceSemanticSidecar
→ family adapter
→ source-scoped presentation
```

The display phase alone does not answer:

```text
where the validated sidecar physically lives
how a display pass resolves the exact sidecar for this exact message
how reroll/edit invalidates the old binding
how reload behaves
how stale runtime generations are rejected
whether historical source cards replay after reload
whether malformed/missing presentation data fails safely
```

Therefore:

```text
G5 PRESENTATION HOST MOUNT
= STILL BLOCKED
```

but the blocker is narrowed from:

```text
"host may have no separable presentation phase"
```

to:

```text
"display phase exists; exact source payload binding/mount lifecycle is not yet frozen"
```

## 7. Payload-carrier options observed by impact scope

LRE-1 does not select a carrier, but classifies the obvious options.

### A. Hidden in-band assistant transcript payload

```text
assistant message
contains hidden JSON / source sidecar
→ display hook reads it
```

Disposition:

```text
BLOCKER / NOT AUTHORIZED
```

Reasons:

```text
G4 already forbids unproven hidden in-band transport
would contaminate transcript/model context
would blur semantic payload with visible/output representation
```

### B. Runtime-memory-only current projection

```text
current validated sidecar in runtime memory
→ display current matching message while runtime lives
```

Disposition:

```text
PROMISING FIRST-MAJOR CANDIDATE
```

Properties:

```text
no persistence
no automatic re-entry
no source history
reload loses presentation replay
```

This is compatible with the current first-major `CURRENT_PROJECTION_ONLY` design if the product explicitly accepts ephemeral source-card replay.

### C. Plugin-storage sidecar by message identity

Disposition:

```text
DEFER / NOT FIRST-MAJOR BY DEFAULT
```

Reason:

```text
introduces durable source history/persistence semantics
may activate Candidate C requirements
```

### D. Rebuild sidecar by parsing old assistant prose

Disposition:

```text
BLOCKER
```

Reason:

```text
legacy/community/model prose cannot be promoted back into trusted structured semantics
```

### E. Host message metadata / custom durable attachment

Disposition:

```text
UNPROVEN HOST CONTRACT
```

Before use, exact host metadata ownership, prompt visibility, edit/reroll preservation and unowned-field safety would have to be proven.

## 8. First safe presentation profile candidate

The narrowest viable first-major presentation profile emerging from current evidence is:

```text
EPHEMERAL_CURRENT_PROJECTION_DISPLAY_V1
```

Conceptually:

```text
current accepted source projection
+ current exact output/message binding
+ current runtime generation
        ↓
display-only presentation transform
        ↓
source card visible while binding remains current
```

Properties:

```text
persistent replay after reload = NOT REQUIRED
historical source-card archive = NONE
source history = NONE
context re-entry = NONE
```

This is a candidate for later LRE-6/G5 design, not an implementation authorization.

## 9. Historical replay profile is a different product

A requirement such as:

```text
"after reload, every old BOARD/NEWS/LIVE_REACTION card must reconstruct exactly"
```

would require a durable/reconstructible semantic carrier.

That is not free presentation work.

It would pressure:

```text
Candidate C C1/C2
possibly source persistence/history
stable message/source binding
revision/invalidation semantics
```

Therefore LRE-1 separates:

```text
EPHEMERAL CURRENT-PROJECTION PRESENTATION
!=
HISTORICAL REPLAYABLE SOURCE PRESENTATION
```

## 10. Prospective legacy-context retirement becomes structurally plausible

The current host split implies the following architecture is structurally possible in principle:

```text
stored assistant semantic prose
without newly generated <COMMUNITY>
        +
current structured source sidecar in runtime memory
        ↓
editdisplay presentation
        ↓
source UI shown without adding legacy source text to future transcript
```

This means the LRE-0 target:

```text
new legacy context growth stops prospectively
old historical <COMMUNITY> remains untouched
```

is not contradicted by the current host architecture.

Frozen finding:

```text
PROSPECTIVE LEGACY CONTEXT RETIREMENT
= STRUCTURALLY PLAUSIBLE
= NOT RUNTIME READY
```

## 11. Old-chat compatibility remains independent

Old assistant messages already contain `<COMMUNITY>` in stored text.

The existence of a display-only phase does not require historical rewrite.

LRE-1 preserves:

```text
old stored Community
→ read/display compatibility

new structured source
→ no requirement to generate new Community
```

No full-history rebuild is authorized.

This is reinforced by current RisuAI evidence that rebuilding full chat records from a partial public view may lose unowned message metadata.

## 12. Host write safety

Current SimCore already has exact-index host `getChat` / `setChat` transport capability for existing reconciliation behavior.

That does not authorize Source Intelligence to perform broad chat rewrites.

Frozen rule:

```text
HOST WRITE CAPABILITY EXISTS
!=
SOURCE PRESENTATION WRITE AUTHORITY
```

Any future Source host mutation must preserve unowned fields by construction.

No:

```text
read partial chat
→ reconstruct whole chat
→ set whole chat
```

for Source presentation.

## 13. Hook/re-entry matrix to carry forward

Future detailed design must reason separately about:

| Operation | Stored output path | Display path | Source sidecar binding |
| --- | --- | --- | --- |
| ordinary generation | `editoutput` | `editdisplay` | must bind current output |
| reroll | re-enters output generation | re-renders | old binding must stale |
| manual edit | stored message may change | re-renders | old source presentation must not survive blindly |
| reload | stored message survives | display reruns | memory-only sidecar absent unless separately restored |
| render-only refresh | no stored semantic mutation | display may rerun | presentation must be idempotent |

No row is allowed to infer semantic authority from visual success.

## 14. Current SimCore runtime-generation protection is reusable conceptually

Production already tracks runtime disposal/epoch and removes before/output hooks plus registered UI parts on unload/replacement.

This supports a future requirement:

```text
stale display handler / stale presentation instance
→ no source effect
```

But current runtime has no source-display hook yet.

Reuse the generation-safety principle, not accidental implementation details.

## 15. Host surface priority

For future source presentation, least-power ordering is:

```text
1. supported display-phase transform
2. bounded supported plugin UI API where sufficient
3. restricted/sanitized main-DOM access only if a concrete missing capability proves necessary
```

Direct main-DOM mutation is not the first-choice mount seam.

## 16. Current production impact map

Relevant owners/surfaces:

```text
Prompt / beforeRequest
→ model request construction

Output Compat / Structure / Output Finalize / Session
→ stored semantic output transform

runtime-hooks output
→ current `editoutput` transport

Representation / Edit Reconcile / Runtime Mirror
→ host representation identity / edit reconciliation

runtime-host
→ exact host chat transport and plugin storage

runtime generation / unload cleanup
→ stale hook/UI defense

RisuAI editdisplay
→ distinct presentation-only phase candidate
```

## 17. Non-impact boundaries

LRE-1 does not change:

```text
Core mode semantics
Frame / Time / Continuity
Lineage / Handoff / Evidence
Exposure policy
Community classifier
Reaction normalization
SnapshotStore
Candidate C design
SOCIAL_FEED
PUBLIC_KNOWLEDGE
Multi-Family
Interaction / Materialization
release-simcore
```

## 18. LRE-1 blocker set

```text
BLOCKER · ACTIVE_STRUCTURED_SIDECAR_TRANSPORT_NOT_AUTHORIZED
BLOCKER · ACTIVE_SOURCE_PRESENTATION_PAYLOAD_BINDING_UNPROVEN
BLOCKER · HISTORICAL_REPLAYABLE_SOURCE_CARD_WITHOUT_DURABLE_AUTHORITY
BLOCKER · HIDDEN_INBAND_SIDECAR_IN_ASSISTANT_TRANSCRIPT
BLOCKER · LEGACY_PROSE_PARSED_BACK_INTO_TRUSTED_SOURCE_SEMANTICS
BLOCKER · SOURCE_PRESENTATION_REBUILDS_FULL_CHAT_FROM_PARTIAL_VIEW
BLOCKER · DISPLAY_SUCCESS_USED_AS_SEMANTIC_AUTHORITY
```

Existing Exposure target-host/model-compliance blockers remain separate and binding.

## 19. WATCH / DEFER

```text
WATCH · REROLL_EDIT_RELOAD_DISPLAY_REENTRY_NEEDS_TARGET_HOST_PROOF
WATCH · DISPLAY_HANDLER_SANITIZATION_AND_SOURCE_MARKUP_SHAPE_NEEDS_TARGET_HOST_PROOF

DEFER · HISTORICAL_SOURCE_CARD_REPLAY
DEFER · PERSISTENT_SOURCE_PRESENTATION_STORE
DEFER · MAIN_DOM_SOURCE_MOUNT
DEFER · LEGACY_PARSER_FULL_RETIREMENT
DEFER · HISTORICAL_TRANSCRIPT_REWRITE
```

## 20. Impact-scope selection

Selected LRE-1 architecture seam:

```text
CURRENT_HOST_OUTPUT_DISPLAY_COUPLING_MATRIX_V1
```

Its purpose is to keep four questions separate:

```text
A. what bytes become stored assistant transcript?
B. what transform is presentation-only?
C. where does structured semantic data live?
D. what lifecycle proves the exact presentation binding current?
```

## 21. Gate consequences

### G1

For this design checkpoint only:

```text
G1 DESIGN-TIME RE-PREFLIGHT
= PASS
```

because exact current production and latest/install identity were re-read.

This does not pre-satisfy future implementation-time G1.

### G4

```text
G4 STRUCTURED PRODUCER/TRANSPORT
= BLOCKED / UNCHANGED
```

### G5

```text
G5 PRESENTATION HOST MOUNT
= NARROWED BUT BLOCKED
```

Evidence now proves a display-only host phase exists, but not the exact semantic payload binding/lifecycle required by Source Intelligence.

## 22. Recommended LRE-1 detailed-design question

The detailed design should freeze:

```text
HostCouplingProfileV1

stored transcript authority
presentation-only phase authority
current-projection presentation binding
reroll/edit/reload invalidation expectations
minimum host facts LRE-2/LRE-6 may rely on
what must still be proven in target-host execution
```

It must not prematurely select the G4 transport.

## 23. Final impact disposition

```text
LRE_1_IMPACT_SCOPE                         = FROZEN
CURRENT_PRODUCTION                         = v0.70.1 / release-simcore 861100f...
LATEST_INSTALL_IDENTITY                    = PASS
CURRENT_SIMCORE_OUTPUT_TRANSFORM            = TRANSCRIPT_COUPLED
RISUAI_DISPLAY_ONLY_PHASE                  = PROVEN
HOST_DECOUPLING                            = PARTIAL_PROOF
PROSPECTIVE_CONTEXT_RETIREMENT             = STRUCTURALLY_PLAUSIBLE
SOURCE_PRESENTATION_PAYLOAD_BINDING        = UNPROVEN
G4                                         = BLOCKED
G5                                         = NARROWED_BUT_BLOCKED
HISTORICAL_CHAT_REWRITE                    = NOT_AUTHORIZED
RUNTIME_IMPLEMENTATION                     = NOT_AUTHORIZED
PRODUCTION                                 = UNCHANGED
NEXT                                       = LRE-1 HOST COUPLING DETAILED DESIGN
```
