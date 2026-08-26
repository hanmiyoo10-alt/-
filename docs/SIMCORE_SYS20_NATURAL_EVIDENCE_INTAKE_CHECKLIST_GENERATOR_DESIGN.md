# SYS-20 — Natural Evidence Intake Checklist Generator — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · NATURAL-SPECIMEN PRESERVATION / INTAKE CONTRACT · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-20
Idea          = Natural Evidence Intake Checklist Generator
Size          = SMALL
Importance    = 3 / MEDIUM
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX_DESIGN.md` / S-12
- `docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX.md`
- `docs/SIMCORE_LIVE_EVIDENCE_PACKET_BUILDER_DESIGN.md` / S-04
- `docs/SIMCORE_LIVE_DIAGNOSTIC_FIXTURE_SKELETON_GENERATOR_DESIGN.md` / M-10
- `docs/SIMCORE_SYS19_LIVE_GATE_HANDOFF_PACKET_DESIGN.md`
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS16_ANOMALY_RECURRENCE_CORRELATOR_DESIGN.md`
- `docs/SIMCORE_SYS15_WATCH_AGING_REVIEW_DESIGN.md`
- `docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md`
- `docs/SIMCORE_SYS28_VERIFICATION_DEBT_INDEX_DESIGN.md`
- `docs/SIMCORE_ANOMALY_WATCH.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`

Existing authorities SYS-20 must not replace:
- the exact live diagnostic / RAW / runtime observation as source evidence;
- S-04 Live Evidence Packet Builder as the bounded machine-fact projection from one coherent diagnostic observation;
- dedicated live evidence / WATCH / gate documents as final repository interpretation authority;
- S-12 Natural Evidence Corpus Index as reviewed natural-specimen navigation and stable `NE-*` identity authority after materialization;
- SYS-19 as pre-validation user/operator instruction authority for a selected live gate;
- SYS-13 as proof-kind × claim-kind authority;
- SYS-16 as recurrence family / specimen-independence / correlation authority;
- SYS-15 as later WATCH aging/review authority;
- SYS-21 as forensic classification-consistency authority;
- SYS-28 as verification debt / due / blocker authority;
- M-10 as reviewed evidence → deterministic fixture-skeleton planning tool;
- owning live/runtime/release/gate authority as PASS / WATCH / DEFER / FIX / BLOCKER authority.

---

## 1. Problem

SimCore already has a strong rule:

```text
suspicious natural behavior observed
→ preserve it immediately
→ do not wait for recurrence
```

The repository also already has good post-capture surfaces:
- S-04 can project one coherent diagnostic observation into a bounded machine-fact packet;
- dedicated evidence/WATCH documents own interpretation;
- S-12 can catalog a reviewed natural production specimen;
- SYS-16 can later decide whether another specimen is an independent recurrence of the same reviewed family;
- SYS-15 can later decide whether a preserved WATCH remains active, quiescent, review-due, or historicalization-eligible;
- M-10 can later project reviewed evidence into a fixture-planning skeleton.

The remaining weakness is the **intake moment**.

When a natural real-chat event first appears, later review may need to reconstruct from chat memory whether we captured:

```text
exact production identity
runtime generation / turn identity
mode / boundary context
what the user actually asked or constrained at a semantic level
what visible outcome was suspicious or useful
which copied diagnostic belongs to that exact observation
whether RAW/body review was required
whether a same-input reroll reproduced or cleared it
whether a neighboring healthy control exists
whether the next turn inherited the state
whether the event was ordinary natural use or a deliberately staged control
whether a candidate recurrence family was merely suggested or actually reviewed
what proof kind the specimen can support
what it explicitly does NOT prove
which repository sink should preserve it
what event should cause the next review
```

If those facts are omitted at intake, later work may over-interpret a specimen or spend time reconstructing evidence from chat history.

SYS-20 defines one bounded **Natural Evidence Intake Checklist** so the first preservation pass captures the minimum semantic and provenance information needed by later evidence systems without itself becoming an evidence classifier.

---

## 2. Core invariant

```text
new candidate natural production specimen
+ source-observation identity
+ bounded context / visible evidence
+ diagnostic / RAW / neighboring controls as actually required
+ naturalness review
+ reroll / next-turn facts when available
+ explicit proof-scope / non-claim handoff
+ explicit preservation sinks / next-review trigger
→ reviewed natural-evidence intake record

SYS-20
!= evidence verdict
!= naturalness auto-classifier
!= S-04 packet builder
!= S-12 corpus writer / ID allocator
!= recurrence engine
!= severity engine
!= root-cause engine
!= live-gate instruction packet
!= fixture generator
!= proof promotion engine
!= repository writer
!= background monitor
```

Canonical question:

> What must be preserved now so this candidate natural specimen can be reviewed later without reconstructing essential facts from chat memory?

SYS-20 does not answer:

> Is this a bug?

> Is this a recurrence?

> Is it a FIX or BLOCKER?

> Does it close the live gate?

> Should it become a fixture?

Those remain with their owning authorities.

---

## 3. Why v1 is `NR_DOC_ONLY` despite the word “Generator”

The title says Checklist Generator, but the useful v1 boundary is semantic and human-reviewed.

A machine can generate empty Markdown headings. That is not the hard problem.

The hard questions are:
- was the event truly natural production use rather than controlled validation?
- is RAW necessary to establish the visible symptom?
- is same-input regeneration a control or a second specimen? (it is not a second natural recurrence by itself);
- which semantic boundary was exercised without overclaiming causality?
- which evidence sink is appropriate?
- what must remain unknown / not claimed?

Automating those judgments would duplicate S-12/SYS-16/SYS-21 and create false authority.

Therefore v1 is a document contract/template, conceptually:

```text
docs/SIMCORE_NATURAL_EVIDENCE_INTAKE_CHECKLIST.md
```

The “generator” behavior in v1 is procedural:

```text
new candidate natural event
→ instantiate one checklist block from the frozen template
→ fill only source-backed fields
→ preserve/review under existing authorities
```

No Node/Python generator, runtime button, GitHub Action, background capture, automatic repo writer, LLM classifier, or chat-history crawler is required.

Apply class:

```text
NR_DOC_ONLY
```

A later convenience form-filler could be considered only if it remains a dumb projection of explicitly supplied fields and does not make semantic decisions. That would be a separate implementation decision.

---

## 4. Constitutional boundary with S-04 Live Evidence Packet Builder

S-04 already owns:

```text
one coherent diagnostic observation
→ bounded machine-fact packet
```

SYS-20 must not create a second diagnostic packet format.

Relationship:

```text
natural event occurs
→ if diagnostic machine facts are material, use/copy S-04 packet or full diagnostic authority
→ SYS-20 intake checklist references that packet/diagnostic
→ preserve complete evidence context
```

S-04 answers:

> Which bounded machine facts came from this one observation?

SYS-20 answers:

> Which evidence components do we need to preserve for this natural specimen, and which contextual/control facts accompany them?

SYS-20 may record:

```text
S-04 packet available = YES / NO / NOT_APPLICABLE
packet ref / observation identity
full diagnostic ref when required
```

It must not parse diagnostic prose to recreate an S-04 packet.

---

## 5. Constitutional boundary with S-12 Natural Evidence Corpus

S-12 is a **post-review navigation index**.

Its frozen unit is one reviewed natural specimen and its stable identity is:

```text
NE-YYYYMMDD-NNN
```

SYS-20 runs earlier.

Frozen order:

```text
candidate natural occurrence
→ SYS-20 intake / preserve source evidence
→ source evidence review decides naturalness and bounded interpretation
→ if S-12 eligibility is established
→ S-12 materialization assigns/reuses the canonical NE-* identity
```

Therefore SYS-20 must not:
- allocate an `NE-*` ID before S-12 materialization;
- guarantee that the candidate is corpus-eligible;
- fabricate `Captured`, `Scenario`, `Disposition`, or `Contracts` merely to satisfy the S-12 row shape;
- treat absence from S-12 as evidence that the event did not occur.

SYS-20 may carry a temporary intake identity such as:

```text
INTAKE-20260826-001
```

for local continuity, but that ID is not evidence/corpus authority and may be replaced by a cited `NE-*` identity after materialization.

---

## 6. Naturalness boundary

S-12 already freezes the critical distinction:

```text
LIVE != NATURAL
```

SYS-20 must preserve that distinction at intake.

### Candidate natural use

May include ordinary real-chat behavior such as:
- normal long-chat request/output;
- naturally occurring representation mismatch;
- ordinary B_START/B_CONTINUE/B_END use;
- an ordinary user edit that was not staged solely for validation;
- ordinary reload/refresh boundary use when it occurs as part of normal operation;
- natural warning/anomaly/recovery/performance/quality observation.

### Controlled live action

A deliberately staged live control is not automatically natural simply because it ran in production.

Examples:
- edit a prior response solely to trigger `MANUAL_EDIT_REBUILT` for validation;
- intentionally corrupt state to force a fault;
- run a pre-scripted action whose only purpose is to satisfy a validation specimen.

Those may still be valid live evidence, but SYS-20 uses:

```text
NATURALNESS_CONTROLLED_LIVE
```

and routes them outside S-12 unless a separate authority says the event qualifies as ordinary natural operation.

### Frozen naturalness review vocabulary

```text
NATURALNESS_ESTABLISHED
NATURALNESS_CANDIDATE
NATURALNESS_CONTROLLED_LIVE
NATURALNESS_NOT_APPLICABLE
NATURALNESS_UNRESOLVED
```

`NATURALNESS_CANDIDATE` means the event looks like ordinary use but source review has not yet established S-12 eligibility.

`NATURALNESS_UNRESOLVED` fails closed. Do not index as natural yet.

SYS-20 does not invent naturalness from filenames/version numbers.

---

## 7. Intake object and proof-unit boundary

One intake record represents one candidate source-defined evidence unit.

Allowed proof-unit shapes:

```text
SINGLE
PAIRED
SEQUENCE
```

Rules:
- use SINGLE for one bounded request/output observation;
- use PAIRED when the evidence inherently requires an adjacent observation, e.g. mismatch → next-turn carryover;
- use SEQUENCE only when the source/gate contract treats a bounded sequence as one proof unit;
- do not split one source-defined sequence to inflate recurrence counts;
- do not merge unrelated events merely because they share a scenario;
- duplicate documents describing the same event remain one source event.

This matches S-12 and SYS-16 boundaries.

---

## 8. Frozen v1 checklist sections

One intake block contains exactly these 12 semantic sections:

```text
1. Intake identity / source event
2. Production / runtime provenance
3. Observation binding / proof unit
4. Naturalness review
5. User-intent / contract boundary
6. Visible symptom or useful observation
7. Diagnostic / RAW evidence requirements
8. Reroll / neighboring / next-turn controls
9. Recurrence-family handoff
10. Proof-scope / explicit non-claims
11. Preservation routing / repository sinks
12. Follow-up / next-review trigger
```

The checklist may be rendered compactly, but these semantic sections must not be silently omitted when applicable.

---

## 9. Section 1 — Intake identity / source event

Fields:

```text
Temporary intake ID
Observed / first-preserved date
Source chat / runtime context (bounded)
Candidate scenario label if one already exists
Existing evidence/gate/WATCH ID when available
S-12 specimen ID after materialization, otherwise UNASSIGNED
```

Rules:
- temporary intake ID is navigation only;
- do not invent a new scenario alias when an existing WATCH/gate/contract family exists;
- scenario naming must remain observational when causality is unproven;
- S-12 `NE-*` identity stays UNASSIGNED until S-12 materialization legitimately assigns it.

---

## 10. Section 2 — Production / runtime provenance

Capture when available:

```text
SimCore production version
release name when source-backed
runtime generation
runtime epoch when material
request user index
output assistant index
neighbor turn indices when material
boundary type (ordinary / refresh / runtime update / reload / other source-defined)
```

If release commit/blob are not already present in runtime evidence, the intake may later cite canonical production identity from repository authority, but must distinguish:

```text
observed runtime fact
vs
repository-enriched identity fact
```

Never guess a historical production version from current production.

---

## 11. Section 3 — Observation binding / proof unit

Capture:

```text
proof unit = SINGLE / PAIRED / SEQUENCE
primary observation identity
binding state when available
adjacent observation identities when the proof inherently requires them
sequence rationale
```

If the primary diagnostic is stale/unbound, preserve that state; do not silently substitute a neighboring current diagnostic.

One intake must not combine fields from several different observation revisions as if they came from one observation.

S-04 observation identity/revision rules remain authoritative.

---

## 12. Section 4 — Naturalness review

Required field:

```text
Naturalness = one frozen value from section 6
Basis = exact source-backed reason
```

Examples:

```text
ordinary user request in ongoing production chat
ordinary user-chosen B_END
same-chat first request after a naturally occurring refresh boundary
controlled genuine-edit validation action
naturalness not yet resolvable from preserved evidence
```

The intake record must not hide controlled validation behind the word “natural”.

---

## 13. Section 5 — User-intent / contract boundary

Do not copy the full user prompt by default.

Capture only the bounded semantic constraint needed to interpret the observation.

Examples:

```text
source/scene-only output requested
current-timeline continuation; no flashback requested
ordinary B_CONTINUE
ordinary B_END
annual-only summary request
explicit comparison request
normal user edit occurred
```

Also capture the relevant owner/contract reference when known.

Frozen privacy/minimization rule:

```text
semantic boundary summary
> raw prompt duplication
```

Raw user text is preserved only when exact wording is required by the evidence authority and the repository policy permits it.

---

## 14. Section 6 — Visible symptom or useful observation

Capture one bounded observation statement.

Good examples:

```text
output visibly left the requested source-only scene
visible timestamp regressed below current narrative floor
current visible representation matched neither canonical nor Fresh
first post-refresh request reported expected telemetry continuity result
COMMUNITY structure emitted one block with six platform sections
```

Bad:

```text
SimCore broke
M2 caused it
provider cache failed
model went crazy
```

unless the stronger causal statement is already source-established.

Separate:

```text
observable symptom
from
attribution / cause
```

Attribution field is optional and defaults to:

```text
UNPROVEN
```

when source evidence does not establish it.

---

## 15. Section 7 — Diagnostic / RAW evidence requirements

Each evidence component uses:

```text
REQUIRED
CAPTURED
NOT_REQUIRED
UNAVAILABLE
```

Components:

```text
S-04 bounded live evidence packet
full diagnostic copy
RAW visible output/body excerpt
neighbor diagnostic
next-turn diagnostic
state/history snapshot already exposed by the diagnostic
operator observation of a physical action/boundary
```

Rules:
- request minimum sufficient evidence, not maximal transcript;
- full RAW/body is not required when machine facts fully establish the bounded claim;
- RAW becomes required when the symptom is visible-semantic/structural and cannot be inferred from diagnostics alone;
- do not infer hidden provider/cache facts from local telemetry;
- do not copy full chat history by default.

SYS-20 does not create a new packet format; S-04 remains the machine-fact packet authority.

---

## 16. Section 8 — Reroll / neighboring / next-turn controls

Capture when available:

```text
same-input reroll/regeneration performed? YES / NO
reroll result = REPRODUCED / CLEARED / CHANGED_DIFFERENTLY / NOT_DONE / UNRESOLVED
neighbor healthy control available? ref / NONE
next-turn inheritance observed? YES / NO / NOT_APPLICABLE / UNRESOLVED
next-turn result summary + ref when material
```

Critical frozen rule:

```text
same-input reroll/regeneration
!= second independent natural recurrence
```

A reroll can provide reproduction/clearance evidence and should be preserved as a control.

Likewise a healthy neighboring turn may disprove a sufficiency hypothesis without disproving the original event.

SYS-20 captures the facts; SYS-16 later decides specimen independence/recurrence semantics.

---

## 17. Section 9 — Recurrence-family handoff

SYS-20 does not assign `RECURRENCE_CONFIRMED`.

Fields:

```text
Existing reviewed family ID / NONE / CANDIDATE_UNRESOLVED
Candidate match dimensions observed
Candidate exclusion dimensions / differences
Potential same-event duplicate refs
SYS-16 review required? YES / NO
```

Allowed intake wording:

```text
possible recurrence candidate for FAMILY-X
```

Forbidden intake wording without SYS-16 authority:

```text
confirmed recurring bug
systemic issue
same root cause
```

If the new event is independently natural and plausibly matches an existing family, route it to SYS-16 review rather than incrementing a recurrence count locally.

---

## 18. Section 10 — Proof scope / explicit non-claims

Every intake must distinguish what kind of evidence is being captured.

Typical proof-kind candidate:

```text
PK-09 NATURAL_LIVE_VALIDATION
```

only after naturalness and source scope support that description.

A controlled live action must not be mislabeled as natural simply to obtain PK-09 semantics.

Each intake preserves at least these non-equivalences when applicable:

```text
one natural specimen != recurrence
observable symptom != root cause
natural occurrence != current-gate PASS automatically
natural anomaly != FIX / BLOCKER automatically
reroll reproduction != independent natural recurrence
reroll clearance != DISMISSED_NO_DEFECT
machine diagnostic PASS != visible semantic correctness
fixture/CI evidence != this natural specimen
repository capture completeness != proof that the underlying behavior is correct
```

SYS-13 remains the proof-fit authority.

---

## 19. Section 11 — Preservation routing / repository sinks

One intake specifies where the evidence should be preserved.

Allowed sink classes:

```text
DEDICATED_LIVE_EVIDENCE
SIMCORE_ANOMALY_WATCH
SIMCORE_DEFERRED_LEDGER
CURRENT_LIVE_GATE_EVIDENCE
S12_CORPUS_AFTER_REVIEW
EXISTING_FOCUSED_INBOX
NO_NEW_FILE_NEEDED_USE_EXISTING_SOURCE
```

Multiple sinks may be selected when each has a distinct role, but avoid duplicate narrative copies.

Canonical order for a suspicious natural specimen:

```text
preserve exact source evidence first
→ preserve anomaly/deferred classification in its natural authority
→ add S-12 navigation row only after naturalness and all required row fields are reviewable
```

Do not write directly to `CURRENT_DEVELOPMENT.md` as the only evidence source for a detailed specimen when a more direct evidence sink is appropriate.

SYS-20 itself is not a repository writer. The operator/assistant performs the normal bounded repo transaction.

---

## 20. Section 12 — Follow-up / next-review trigger

Capture one of:

```text
NO_FOLLOWUP_REQUIRED
ON_NATURAL_RECURRENCE
ON_SYS16_REVIEW
ON_NEXT_TURN_CONTROL
ON_POST_MITIGATION_NATURAL_SAMPLE
ON_NAMED_LIVE_GATE_REVIEW
ON_POST_M2_3_REVALIDATION
ON_NEXT_GENUINE_RELEASE
ON_NEW_CONTRARY_EVIDENCE
OTHER_NAMED_EVENT
```

This is a routing hint, not a scheduler.

If the specimen becomes a WATCH, SYS-15 later owns the durable aging/review posture and may refine the trigger.

Do not create a vague `check later` trigger.

---

## 21. Frozen top-level intake states

Exactly four:

```text
NATURAL_INTAKE_COMPLETE
NATURAL_INTAKE_REVIEW_REQUIRED
NATURAL_INTAKE_BLOCKED
NATURAL_INTAKE_NOT_APPLICABLE
```

### `NATURAL_INTAKE_COMPLETE`

All source-backed fields needed for the intended preservation route are captured, unresolved facts are explicit, and no required evidence component is silently missing.

Meaning only:

```text
intake preservation record is complete
```

It does not establish PASS, natural corpus eligibility, recurrence, root cause, fixture readiness, or gate close.

### `NATURAL_INTAKE_REVIEW_REQUIRED`

The source event is preserved, but one or more non-fatal semantic routing facts require human review, e.g. naturalness candidate vs controlled-live distinction or possible family match.

### `NATURAL_INTAKE_BLOCKED`

A material evidence identity required for trustworthy preservation cannot be resolved.

Examples:
- production/runtime/turn identity cannot be bound;
- diagnostic fields being cited come from mixed observation revisions;
- the visible symptom is claimed but no RAW/source evidence was preserved and cannot be recovered;
- naturalness is being asserted with contradictory source evidence;
- the primary event may be a duplicate of an existing specimen but same-event identity cannot be resolved.

Fail closed. Do not invent missing evidence.

### `NATURAL_INTAKE_NOT_APPLICABLE`

No candidate natural production specimen is being preserved.

Examples:
- pure CI failure;
- synthetic fixture result;
- repository-only release transaction;
- purely controlled validation that is intentionally routed to a different live-evidence process.

---

## 22. Current v0.64.7 live-gate relationship

SYS-19 owns the current experiment instruction:

```text
healthy pre-boundary trajectory
→ checkpoint WRITTEN
→ refresh/runtime boundary
→ first natural request
→ second natural request
```

SYS-20 must not rewrite or add steps to that experiment.

When the user returns evidence:
- SYS-19 tells us what evidence the gate expected;
- SYS-20 may be used to ensure any newly observed natural specimen/anomaly within that returned evidence is preserved completely;
- the gate review authority classifies PASS / WATCH / FIX / BLOCKER;
- if a new natural anomaly exists, preserve it immediately even if the overall gate eventually passes.

Therefore:

```text
SYS-19 = experiment semantics before action
SYS-20 = generic specimen intake completeness when natural evidence appears
```

---

## 23. Representative intake examples

These examples validate the model; they do not materialize a v1 checklist in this transaction.

### 23.1 `GENERATION_SEMANTIC_EXCURSION`

A strong intake would preserve:

```text
production/runtime/turn
bounded user semantic constraint = source/scene-only
visible symptom = unrelated continuation outside requested scene
full diagnostic = CAPTURED
RAW visible evidence = REQUIRED/CAPTURED
same-input regeneration = CLEARED
next-turn inheritance = not a state-corruption claim
attribution = UNPROVEN
naturalness = ESTABLISHED ordinary production generation
recurrence family = existing GENERATION_SEMANTIC_EXCURSION
follow-up = ON_NATURAL_RECURRENCE
```

The reroll is a control, not specimen #2.

### 23.2 representation fast paired control

A natural representation mismatch followed by next-turn exact Fresh carryover may use:

```text
proof unit = PAIRED
primary observation = mismatch turn
adjacent observation = next request fast reconcile
RAW = maybe not required when exact fingerprints/results are already preserved in evidence authority
naturalness = ESTABLISHED
preservation = dedicated live evidence + S-12 row after review
```

### 23.3 visible chronology regression

Because the user-visible body contains the defect while persisted state may remain protected:

```text
RAW visible evidence = REQUIRED
full diagnostic = REQUIRED
current frame/timeline context = REQUIRED
semantic user-intent boundary = no flashback requested
state safety outcome and visible-output outcome kept separate
attribution = UNPROVEN unless separately established
```

A diagnostic saying `REPAIRED` cannot replace visible RAW evidence in this case.

### 23.4 controlled genuine-edit validation

If the user deliberately edits a response solely because a validation plan requires `MANUAL_EDIT_REBUILT`:

```text
Naturalness = NATURALNESS_CONTROLLED_LIVE
S-12 route = NO
controlled live evidence route = YES
```

The evidence may still be valuable, but SYS-20 must not inflate the natural corpus.

### 23.5 focused CI result

A permanent/focused CI result with no real-chat specimen:

```text
NATURAL_INTAKE_NOT_APPLICABLE
```

It belongs to deterministic/CI evidence, not natural evidence intake.

---

## 24. Relationship to SYS-16 and SYS-15

### SYS-16

SYS-20 captures recurrence-discriminating facts early:

```text
source identity
naturalness
same-input reroll vs new event
neighbor controls
candidate family discriminators/exclusions
```

SYS-16 later consumes them to review recurrence.

SYS-20 never increments recurrence counts itself.

### SYS-15

SYS-20 captures an initial follow-up trigger.

If the event becomes a living WATCH:

```text
intake trigger
→ later SYS-15 aging/relevance review
→ durable ACTIVE / QUIESCENT / REVIEW_REQUIRED / HISTORICALIZE_CANDIDATE posture
```

SYS-20 does not manage long-term aging.

---

## 25. Relationship to SYS-21 and SYS-28

SYS-21 can later audit whether the stored classification overstates the intake evidence.

The intake helps by preserving:
- symptom vs attribution separation;
- exact proof/evidence refs;
- naturalness/control status;
- recurrence non-claims;
- missing/unavailable evidence explicitly.

SYS-28 may later carry a verification obligation exposed by the specimen.

SYS-20 itself does not create debt or blocker posture merely because an evidence component is missing. Intake completeness and verification obligation are separate.

---

## 26. Relationship to M-10 fixture skeleton generator

Frozen direction:

```text
natural specimen
→ SYS-20 complete intake
→ dedicated evidence review / S-12 as appropriate
→ if a deterministic regression candidate is later selected
→ reviewed live-fixture source descriptor
→ M-10 fixture-skeleton-v1
```

Forbidden shortcut:

```text
natural symptom observed
→ SYS-20
→ automatic golden fixture
```

SYS-20 never marks observational/unknown facts as executable assertions.

---

## 27. Intake minimization / privacy discipline

Default repository intake must prefer bounded identities/facts over raw content.

Do not routinely preserve:
- full user prompts;
- full assistant outputs;
- full COMMUNITY/Knowledge blocks;
- full Fresh bodies;
- host chat objects;
- long unrelated diagnostic sections.

Preserve raw excerpts/body only when necessary to establish a visible semantic/structural symptom and according to repository evidence practice.

The checklist should explicitly mark why RAW was required.

---

## 28. No automatic classification or remediation

The checklist may carry source-owned provisional/current labels, but never computes:

```text
PASS
WATCH
DEFER
FIX
BLOCKER
```

from checklist completeness, naturalness, recurrence candidate, or elapsed time.

Likewise it must never propose a runtime patch solely because an intake is `COMPLETE` or `BLOCKED`.

A blocked intake usually means evidence preservation is incomplete, not that runtime is defective.

---

## 29. Later v1 application discipline

Later application should be one bounded doc-only transaction.

Preferred artifact:

```text
docs/SIMCORE_NATURAL_EVIDENCE_INTAKE_CHECKLIST.md
```

It should include:
- the 12 frozen sections;
- compact field vocabulary;
- four intake states;
- naturalness boundary;
- S-04/S-12/SYS-16/SYS-15/SYS-19/M-10 routing notes;
- one example block.

Do not implement a runtime capture button or Node generator just to satisfy the idea name.

Do not backfill every historical natural specimen. Apply prospectively, and backfill only when an existing living WATCH genuinely benefits from the intake metadata and the facts can be source-backed without guessing.

---

## 30. Later verification

Minimum later application verification:

```text
all referenced authority paths resolve
no second diagnostic packet format created
no NE-* identity minted by the checklist
natural vs controlled-live distinction preserved
same-input reroll never counted as independent recurrence
RAW requirements are conditional/minimized
proof non-claims preserve SYS-13
no automatic WATCH/FIX/BLOCKER output
no fixture generation / registry mutation / CI change
no runtime/plugin/release file changed
release-simcore unchanged
```

No live-chat validation is required solely for applying the document-only checklist.

---

## 31. Freeze verdict

```text
SYS-20 NATURAL EVIDENCE INTAKE CHECKLIST GENERATOR
= DESIGN FROZEN
= SMALL / I3 / D2
= NON_RUNTIME
= NR_DOC_ONLY
= NATURAL-SPECIMEN INTAKE / PRESERVATION CONTRACT
= NO SECOND S-04 PACKET FORMAT
= NO S-12 ID ALLOCATION
= NO RECURRENCE / SEVERITY / ROOT-CAUSE CLASSIFICATION
= NO FIXTURE GENERATION
= NO REPOSITORY WRITER
= NO RUNTIME CHANGE
= OPEN DESIGN QUESTIONS 0
```

Application remains a later transaction under the active Design Sweep First hold.
