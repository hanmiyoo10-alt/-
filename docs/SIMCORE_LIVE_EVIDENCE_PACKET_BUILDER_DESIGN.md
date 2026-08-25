# SimCore Live Evidence Packet Builder Design

Status: `DESIGN FROZEN · PARKED FOR STABILIZATION · S-04 COMPLETE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `S-04`
Importance: `5 / VERY HIGH`
Design difficulty: `2 / EASY`
Design gate at selection: `NOW`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_IDENTITY_REVISION_BINDING_CONTRACT.md`
- `docs/SIMCORE_DIAGNOSTIC_OBSERVATION_ENVELOPE_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_SURFACE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`

---

## 1. Problem

SimCore's long-chat workflow intentionally preserves unusual runtime specimens in the repository before moving on.

The current manual path is often:

```text
copy full diagnostic
→ inspect many sections
→ identify the few facts that actually establish the specimen
→ manually transcribe version / runtime / turn / binding / path / timing / warning facts
→ classify WATCH / DEFER / FIX / BLOCKER
→ write a dedicated repo evidence/watch document
```

The forensic diagnostic must remain detailed, but repeated manual transcription creates avoidable friction and typo risk.

S-04 defines a small **Live Evidence Packet Builder** that produces one bounded, copyable evidence capsule from one coherent diagnostic observation.

The packet is a transport aid for evidence preservation.
It is not the final evidence authority and it is not an incident classifier.

---

## 2. Product / operator value

Primary flow:

```text
current diagnostic observation
→ Build Evidence Packet
→ bounded machine-fact capsule copied
→ operator/assistant reviews context
→ classify under normal SimCore evidence rules
→ preserve in dedicated main-branch evidence/watch document
```

Expected value:
- reduce repetitive transcription;
- preserve exact production/runtime/turn identity;
- make anomaly capture faster during long-chat use;
- reduce accidental mixing of facts from different observations;
- make later fixture/evidence work easier without copying raw chat bodies;
- keep the full diagnostic available for forensic review while giving repo documentation a compact starting point.

---

## 3. Constitutional boundary

Canonical principle:

```text
LIVE EVIDENCE PACKET
= BOUNDED PROJECTION / TRANSFER OBJECT
!= EVIDENCE VERDICT
!= INCIDENT CLASSIFIER
!= DIAGNOSTIC AUTHORITY
!= REPOSITORY AUTHORITY
```

Existing owners remain authoritative for every included fact.

The dedicated repository evidence/watch document remains authoritative for the final preserved interpretation and classification.

The Builder must never:
- decide runtime correctness;
- upgrade an observation to PASS;
- assign WATCH / DEFER / FIX / BLOCKER automatically;
- infer causality from correlation;
- decide M2 blocking status;
- mutate Core/Session/Store state;
- write directly to GitHub or the repository;
- create fixtures automatically.

---

## 4. Frozen v1 surface

S-04 v1 is one explicit action available from the existing diagnostic surface:

```text
BUILD EVIDENCE PACKET
→ COPY BOUNDED TEXT PACKET
```

It is NOT:

```text
automatic capture on every turn
background logger
persistent runtime history
repo writer
new diagnostic panel
full diagnostic replacement
fixture generator
```

The existing full diagnostic copy path remains unchanged and remains the lossless troubleshooting surface.

---

## 5. Source-observation rule

One packet is built from exactly one coherent `observationInstance` under the frozen Diagnostic Observation Identity / Revision / Binding contract.

Canonical rule:

```text
one observationIdentity
+ one observationRevision
→ one primary evidence packet
```

Forbidden:

```text
request timing from observation A
+ warning count from observation B
+ Mirror result from observation C
+ visible indices from observation D
→ one packet
```

If an operator needs neighboring-turn evidence, that belongs in explicit `Adjacent Controls` references after the primary observation, never by silently merging their fields.

---

## 6. Packet version and format

Frozen v1 format is bounded plain text suitable for clipboard transfer and Markdown evidence documents.

Header:

```text
=== SimCore Live Evidence Packet v1 ===
```

Footer:

```text
=== End SimCore Live Evidence Packet ===
```

The packet has exactly eight logical sections:

```text
1. Capture
2. Production
3. Binding
4. Runtime Path
5. Key Facts
6. Performance
7. Evidence Qualifiers
8. Classification Handoff
```

Exact whitespace and human labels may be refined at implementation time, but section semantics are frozen.

---

## 7. Section 1 — Capture

Purpose: identify the exact diagnostic observation without raw content.

Required/allowed fields:

```text
observation identity/digest
observation revision
capture kind
capturedAt if already available
location/chat scope digest if available
visible user index
visible assistant index
probe user index
probe assistant index
```

Rules:
- use bounded diagnostic identity facts only;
- do not include raw user/assistant bodies;
- `capturedAt` is operational metadata, not semantic identity;
- unavailable identity fields remain explicit `UNAVAILABLE` rather than guessed.

---

## 8. Section 2 — Production

Purpose: preserve the production context that produced the specimen.

Fields:

```text
SimCore version
release name if already available
runtime generation
runtime epoch if already part of the observation
production release commit/blob only if already available in bounded runtime metadata
```

Minimum required v1 fields:

```text
Version
Runtime generation
```

The Builder must not perform a network/repository lookup solely to enrich the packet.

If release commit/blob are not present in the current bounded diagnostic observation, omit or mark them `UNAVAILABLE`; the later repo document can link canonical release identity separately.

---

## 9. Section 3 — Binding

Purpose: state whether the packet can defensibly represent a current request/output observation.

Fields:

```text
binding state
request user index
output assistant index
probe context / applicability when already owner-produced
observation lifecycle/context marker
```

Canonical binding vocabulary remains:

```text
CURRENT_BOUND
PROBE_AHEAD
PROBE_BEHIND
NO_REQUEST_CONTEXT
UNBOUND
UNAVAILABLE
```

The Builder may show human wording, but it may not invent a new machine binding result.

A stale or unbound packet is still valid evidence of a stale/unbound condition. It must not be silently rejected or upgraded to current.

---

## 10. Section 4 — Runtime Path

Purpose: preserve the main already-produced route/outcomes that identify what SimCore did.

Candidate fields are included only when applicable and already present in the observation:

```text
Request hook
Core handshake
Runtime status
Mode
Stored last mode
Edit origin
Edit reconcile
Prior representation
Output representation
Output disposition
Deferred Mirror result
Broadcast lifecycle / end authority
Structure result
Narrative/current-time authority
Frame/continuity result
```

This is a bounded selection, not a requirement to include every diagnostic subject on every packet.

Selection rule:

```text
include owner-produced fields that materially describe the exercised path
omit NOT_APPLICABLE noise unless needed to interpret the specimen
never parse rendered prose to recreate missing machine facts
```

---

## 11. Section 5 — Key Facts

Purpose: provide the few bounded facts that support the observed specimen.

Frozen entry shape:

```text
<subject> = <result> [· reason <reasonId>] [· owner <semanticOwner>]
```

Examples, format only:

```text
CORE_HANDSHAKE = NOT_FOUND
RUNTIME_STATUS = INACTIVE · output BYPASSED
EDIT_RECONCILE = MANUAL_EDIT_REBUILT · reason USER_EDIT_CANDIDATE
OUTPUT_REPRESENTATION = EXACT
WARNING_SET = 0
```

Rules:
- maximum initial v1 target: 12 key-fact lines;
- facts must come from the same observation;
- owner/reason metadata are included only when already defensibly available;
- no raw warning text dumps by default;
- no arbitrary generated-summary prose from the model;
- if more detail is needed, the operator uses the full diagnostic and dedicated evidence document.

The implementation may choose fewer than 12 lines based on applicability. Twelve is a hard upper bound for the compact packet, not a target to fill.

---

## 12. Section 6 — Performance

Purpose: preserve bounded timing evidence when relevant without conflating model latency with plugin latency.

Allowed fields when already measured:

```text
request total
request hotspot + duration + share
edit reconcile duration
turn storage size / set latency
output handler total
output hotspot + duration + share
out storage latency
cache topology/candidate local cost
```

Rules:
- no new timer is required solely for S-04;
- request→output/model/gateway wait is labeled separately if included;
- never attribute external generation latency to SimCore;
- omit the section's detail lines when no local timing evidence is present.

---

## 13. Section 7 — Evidence Qualifiers

Purpose: preserve uncertainty and evidence limits rather than making the packet look more certain than the underlying observation.

Allowed bounded qualifiers:

```text
cause = ESTABLISHED / UNESTABLISHED / UNATTRIBUTED
recurrence = FIRST_SPECIMEN / RECURRENT / UNKNOWN
recovery = OBSERVED / NOT_OBSERVED / NOT_APPLICABLE / UNKNOWN
state corruption = OBSERVED / NOT_OBSERVED / UNKNOWN
current-line applicability = CURRENT / HISTORICAL_COMPATIBLE / UNKNOWN
raw-context-required = YES / NO
adjacent-control-required = YES / NO
```

These are presentation/evidence qualifiers only when supported by existing observation or manually supplied bounded capture context.

Important:

```text
correlation
!= causality
```

The Builder must not infer `cause = ESTABLISHED` merely from fingerprint correlation, timing dominance, or a single warning.

If causality is not directly supported, use `UNESTABLISHED` / `UNATTRIBUTED`.

---

## 14. Section 8 — Classification Handoff

This section deliberately does **not** classify the specimen.

Frozen Builder output:

```text
Classification: CLASSIFICATION_PENDING
Repository disposition: REVIEW_REQUIRED
Blocker status: NOT_ASSESSED
```

The final repository preservation step then applies the project rule:

```text
inspect packet + full diagnostic + necessary RAW/neighbor context
→ classify WATCH / DEFER / FIX / BLOCKER
→ record that classification in the dedicated repo document
```

The Builder may never output:

```text
WATCH
DEFER
FIX
BLOCKER
PASS
```

as an independently generated final disposition.

Reason: those are evidence/governance judgments, not formatting results.

---

## 15. Adjacent Controls

Many SimCore findings require a nearest good/bad comparison.

S-04 v1 may support an optional small appendix:

```text
Adjacent Controls:
- previous: observation/ref <id> · relation <bounded label>
- next: observation/ref <id> · relation <bounded label>
```

Rules:
- references only by default;
- no field-level merge into the primary packet;
- maximum two adjacent controls: nearest previous + nearest next;
- each control retains its own observation identity;
- raw bodies are not copied into the packet.

If an adjacent control needs detailed proof, preserve it separately in the final evidence document.

---

## 16. RAW-context boundary

The Guidelines require full forensic review to cross-check RAW intent/output/state when needed.

S-04 does not attempt to compress arbitrary RAW content into a safe machine packet.

Frozen rule:

```text
packet says whether RAW context is required
→ full diagnostic / user-supplied RAW is reviewed separately
→ dedicated evidence document may preserve only the minimum bounded excerpt/facts necessary under existing repo policy
```

Forbidden inside the default packet:

```text
raw user body
raw assistant body
system prompt
full COMMUNITY body
full Knowledge block
full Fresh body
full host chat object
full diagnostic report
```

This preserves the distinction between:

```text
bounded evidence capsule
vs
forensic source material
```

---

## 17. Warning handling

Warnings are represented by bounded result/count/code data when available.

Default:

```text
Warnings = <count>
warning reason/code IDs = bounded optional list
```

Forbidden by default:
- full warning message dump;
- arbitrary exception stack;
- repeating raw output that triggered the warning;
- deriving severity from warning wording.

Compatibility diagnostics remain a separate fact family and are not silently added to `Warnings`.

---

## 18. Unknown / unavailable discipline

S-04 must preserve weak evidence states explicitly.

Use existing vocabulary where available:

```text
UNKNOWN
UNAVAILABLE
UNATTRIBUTED
NOT_APPLICABLE
NOT_EXERCISED
UNBOUND
```

Do not convert weak states into:

```text
0
NONE
PASS
CURRENT
```

unless the underlying owner actually established that value.

A packet with unknowns can be more valuable than a falsely complete packet because it shows exactly what follow-up evidence is needed.

---

## 19. Boundedness / resource contract

S-04 is intentionally cheap.

Frozen requirements:

```text
one explicit user action per packet
no polling
no intervals
no background capture
no persistent packet history
no SnapshotStore writes
no network
no GitHub API
no second history scan solely for packet construction
no new Fresh read solely for packet construction
```

Packet construction should consume an already-coherent diagnostic observation.

The packet string exists only long enough for presentation/copy unless the operator explicitly pastes/preserves it elsewhere.

---

## 20. Clipboard behavior

S-04 should reuse the established Diagnostic Copy Resilience transport pattern rather than invent a second clipboard subsystem.

Conceptual flow:

```text
BUILD packet exactly once
→ primary clipboard path
→ existing bounded fallback copy path if needed
```

Required property:

```text
primary and fallback copy the exact same already-built packet bytes
```

Packet building must not rerun between primary and fallback attempts.

If packet build fails, clipboard is not attempted with a partial packet.

---

## 21. Failure vocabulary

Future implementation may use narrow result classes such as:

```text
PACKET_COPIED
PACKET_COPIED_FALLBACK
PACKET_BUILD_FAILED
PACKET_OBSERVATION_UNAVAILABLE
PACKET_CLIPBOARD_WRITE_FAILED
```

These are operation results, not SimCore runtime warnings and not WATCH/FIX/BLOCKER classifications.

A Builder failure must not change output processing or Core state.

---

## 22. Relationship to S-09 Evidence Index

S-04 and S-09 solve different stages.

```text
S-04 Live Evidence Packet Builder
= capture-time bounded evidence transfer object

S-09 Evidence Index Entry Format
= repository navigation row after evidence has been preserved/classified
```

Canonical sequence later:

```text
live observation
→ S-04 packet
→ human/assistant forensic review + classification
→ dedicated evidence/watch document
→ S-09 index may point to that document
```

S-04 must not write or update the Evidence Index directly.

---

## 23. Relationship to M-10 Live Diagnostic → Fixture Skeleton Generator

S-04 is not a fixture generator.

Potential future dependency:

```text
S-04 bounded packet
+ dedicated reviewed evidence document
→ may become one input to M-10 fixture-skeleton tooling
```

But M-10 must still perform its own assertion-boundary design and human review.

S-04 does not decide what is safe to turn into a permanent regression assertion.

---

## 24. Relationship to Diagnostic Copy Profiles

`FULL` diagnostic copy and S-04 packet are separate products.

```text
FULL diagnostic
= forensic source surface

S-04 packet
= bounded evidence-preservation capsule

future S-03 Copy Profiles
= user-selected views of the diagnostic
```

Do not implement S-04 merely as another profile whose semantics can drift with presentation filtering.
It has its own frozen evidence-transfer contract.

S-03 may expose a shortcut to S-04 later, but may not redefine the packet schema.

---

## 25. Repository preservation rule

S-04 itself never writes a repo file.

When a packet identifies a meaningful anomaly/control:

```text
packet copied
→ full context reviewed
→ dedicated evidence/watch document created or updated on main under normal workflow
→ WATCH / DEFER / FIX / BLOCKER classification recorded there
→ related roadmap/debt/current-development authority updated only if the classification requires it
```

This preserves the existing project rule that plugin findings live in the repository without giving runtime UI direct repository authority.

---

## 26. Design example — transient handshake specimen

Format example only; not a new authority record:

```text
=== SimCore Live Evidence Packet v1 ===

[Capture]
Version: 0.64.2
Runtime generation: mt4bcgc3-5556z8
Visible user: @2062
Binding: REQUEST_ONLY / bounded legacy equivalent

[Runtime Path]
Request hook: SEEN
Core handshake: NOT FOUND
Runtime status: INACTIVE
Output: BYPASSED
Mirror: NOT_EXERCISED

[Key Facts]
CORE_HANDSHAKE = NOT_FOUND
RUNTIME_STATUS = INACTIVE
OUTPUT_DISPOSITION = BYPASSED

[Evidence Qualifiers]
cause = UNESTABLISHED
recurrence = FIRST_SPECIMEN
recovery = UNKNOWN
raw-context-required = NO
adjacent-control-required = YES

[Classification Handoff]
Classification: CLASSIFICATION_PENDING
Repository disposition: REVIEW_REQUIRED
Blocker status: NOT_ASSESSED

=== End SimCore Live Evidence Packet ===
```

Only after reviewing the adjacent same-runtime recovery evidence would the repository document classify this as the preserved `WATCH_ONLY` transient handshake specimen.

The example demonstrates why Builder output must not make that classification by itself.

---

## 27. Verification obligations for future implementation

Minimum static/fixture coverage:

```text
1. one CURRENT_BOUND observation
   → packet uses exactly one observation instance

2. stale observation
   → stale/unbound facts preserved
   → no current upgrade

3. unavailable required source
   → PACKET_OBSERVATION_UNAVAILABLE or explicit weak states
   → no guessed fields

4. warning count 0
   → 0 only when finalized warning set is defensibly available

5. warning count unavailable
   → UNAVAILABLE, not 0

6. performance sample
   → local SimCore timings separated from request→output external gap

7. representation/edit sample
   → path facts preserved without causality invention

8. optional adjacent controls
   → references remain distinct observation identities
   → no merged primary fields

9. key-fact cap
   → <= 12 lines

10. raw user/assistant/Fresh bodies
    → absent from default packet

11. classification section
    → always CLASSIFICATION_PENDING / REVIEW_REQUIRED / NOT_ASSESSED
    → never automatic WATCH/FIX/BLOCKER/PASS

12. packet builder called once
    → primary and fallback clipboard payload byte-identical

13. packet build failure
    → no partial clipboard payload

14. clipboard transport failure
    → runtime/output processing unaffected

15. no SnapshotStore writes
16. no Host chat writes
17. no new Fresh read solely for packet
18. no polling/timers/network/GitHub API
19. full diagnostic copy behavior unchanged
20. latest.js == install.js if runtime implementation later changes plugin bytes
```

Reuse the existing permanent SimCore fixture harness; do not create a second test system.

---

## 28. Live-validation obligation

If S-04 is later implemented in plugin runtime, it is a product/runtime UI change and follows the normal release workflow.

Natural live validation should verify at least one ordinary healthy packet and, when a natural anomaly/control appears, one meaningful evidence packet.

Required checks:

```text
packet corresponds to the same diagnostic observation shown by the panel
packet is bounded and copyable
no raw body leakage
full diagnostic remains available
classification remains pending in the packet
operator can use packet + full context to create the repository evidence record
chat/runtime behavior is unchanged
```

Do not intentionally corrupt a production long chat merely to obtain an anomaly packet.

If no anomaly naturally occurs, healthy packet transport can be live-proven while anomaly-specific behavior remains statically proven / NOT_EXERCISED.

---

## 29. Future implementation boundary

Implementation class:

```text
NARROW PRODUCT / DIAGNOSTIC UX
```

If plugin bytes change later:

```text
main design/evidence
→ dedicated work branch
→ static/CI
→ release-simcore
→ natural long-chat validation
→ main evidence/long-term-memory sync
```

Do not combine S-04 implementation with:
- M2-3 ownership extraction;
- release-system restructuring;
- S-03 Copy Profiles;
- M-10 Fixture Skeleton Generator;
- warning-widget implementation;
- diagnostic freshness repair unless independently required and separately scoped.

---

## 30. Open design questions

```text
NONE
```

All currently known questions necessary for the SimCore idea-design freeze policy are resolved.

---

## 31. Final frozen contract

```text
S-04 LIVE EVIDENCE PACKET BUILDER

PURPOSE
= reduce manual transcription when preserving live SimCore evidence

SOURCE
= exactly one coherent diagnostic observation instance

OUTPUT
= bounded copyable plain-text packet v1

SECTIONS
= Capture
+ Production
+ Binding
+ Runtime Path
+ Key Facts
+ Performance
+ Evidence Qualifiers
+ Classification Handoff

KEY FACT CAP
= 12 lines maximum

ADJACENT CONTROLS
= optional references only
= max previous + next
= never merged into primary observation

RAW BODIES
= forbidden by default

CLASSIFICATION
= CLASSIFICATION_PENDING
= Builder never assigns WATCH / DEFER / FIX / BLOCKER / PASS

FINAL INTERPRETATION
= full diagnostic + RAW/neighbor context review
→ dedicated repository evidence/watch document

PERSISTENCE
= none by Builder

REPO WRITE
= none by Builder

SECOND SCAN / FRESH READ / NETWORK / POLLING
= forbidden solely for packet construction

IMPLEMENTATION NOW
= NONE

DESIGN STATUS
= FROZEN

PARKING STATUS
= PARKED FOR STABILIZATION
```
