# SimCore LightBoard / MiniBoard Design Candidate Shortlist — 2026-09-01

Date: 2026-09-01 KST

Status: **DESIGN CANDIDATE SELECTION · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Source synthesis:

- `docs/SIMCORE_LIGHTBOARD_MINIBOARD_TOTAL_SYNTHESIS_2026-09-01.md`
- 16 LightBoard / MiniBoard artifacts analyzed
- 16 exact-source archives confirmed

This document turns the reference backlog into a bounded SimCore design shortlist. It does **not** authorize runtime implementation, does not alter the active release/S7 transaction, and does not modify `release-simcore`, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, or persistent runtime schema.

---

## 1. Selection rule

Do not promote a LightBoard idea because it is interesting or because upstream has a feature for it.

A candidate is promoted only when it can answer:

```text
What current SimCore problem does it solve?
Who is the semantic owner?
What source data may it read?
What derived data may it create?
Does it require persistence or new schema?
What happens on edit / reroll / source replacement?
How does failure preserve current behavior?
How can static and real-chat evidence prove it?
```

The selection objective is to gain useful semantic boundaries without creating a generic LightBoard subsystem.

---

## 2. Candidate consolidation

The sixteen-source synthesis produced many reusable principles, but they should not become one runtime project each.

The current shortlist intentionally consolidates related principles into a small number of contracts.

### Candidate A · Context Projection Contract

Combines:

```text
Owner-Scoped Context Projection
Bounded Context Aperture
Context Re-entry Firewall
```

Core shape:

```text
available continuity/history
→ current semantic owner
→ minimum owner-relevant source projection
→ bounded ephemeral context envelope
→ explicit rule for whether derived material can re-enter later context
```

Current problem fit:

- long-chat context pressure;
- replay of completed or owner-irrelevant material;
- derived sidecars surviving in model context longer than their semantic need;
- need to reduce context pressure without deleting canonical continuity.

Hard boundaries for a first design:

```text
NO new persistent memory system
NO destructive history deletion
NO generic summarization engine
NO semantic owner changes
NO new auxiliary-model call
NO runtime implementation during candidate-selection transaction
```

Preferred first design should attempt **zero persistent-schema change** and treat the projection as an ephemeral request-time envelope.

Classification:

```text
TIER A · DESIGN_READY
```

### Candidate B · Exposure Knowledge Contract

Combines:

```text
Audience / Public Knowledge Boundary
Source / Channel Projection
Private-State Provenance / Visibility Gate
```

Core shape:

```text
canonical/world fact
→ source/exposure evidence
→ audience/channel eligibility
→ reaction/public/private projection
```

Current problem fit:

- Community/public projections must not become omniscient merely because SimCore continuity knows a fact;
- hidden/private/inferred character state needs a different authority class from visible actions;
- a channel projection must not be promoted back into world truth.

Hard boundaries for a first design:

```text
NO social-network simulation
NO generic public/private world database
NO inferred private thought promoted to canonical truth
NO synthetic audience memory unless separately authorized
NO presentation/UI feature dependency
```

Preferred first design should derive eligibility from existing observable/source evidence and avoid new persistent social state.

Classification:

```text
TIER A · DESIGN_READY
```

### Candidate C · Derived Provenance and Reroll Lineage Contract

Combines:

```text
Source-Anchored Derived Metadata
Reroll-Aware Derived Lineage Truncation
source-local identity / locator discipline
```

Core shape:

```text
source identity + locator/span + owner + lineage
→ derived assertion/object
→ edit/reroll/source replacement
→ invalidate or truncate unsupported descendants
```

Current problem fit:

- derived sidecars can become stale after source replacement;
- future context projection and public projection both become safer when their derived objects retain source authority;
- diagnostics/evidence benefit from knowing which source still supports a derived assertion.

Why it is not first:

- it has broader representation/lineage implications;
- a careless implementation could create a second identity system;
- it may require bounded metadata ownership decisions that should be driven by a concrete consumer from Candidate A or B.

Classification:

```text
TIER A-DEPENDENCY · DESIGN_PREP
PROMOTE AFTER A/B DEFINE A CONCRETE DERIVED OBJECT
```

### Candidate D · Schema-First Derived Snapshot Contract

Combines:

```text
Schema-First Derived Snapshot
machine validation
presentation escaping / failure quarantine
Vertical Feature-Gate Closure
```

Core shape:

```text
bounded derived schema
→ machine validator
→ optional policy-aware fields
→ safe presentation adapter
```

Useful for future bounded status/diagnostic/sidecar objects, but no current evidence requires a new generic snapshot subsystem.

Classification:

```text
TIER B · HOLD FOR CONCRETE CONSUMER
```

### Candidate E · Derived Checkpoint + Recent Delta

Core shape:

```text
trusted derived checkpoint
+ bounded recent source delta
→ new derived checkpoint
```

Potentially valuable for long-chat scale, but it introduces checkpoint trust, invalidation, rebuild, and storage questions. Candidate A should first prove how much pressure can be removed by projection alone.

Classification:

```text
TIER B · DEFER UNTIL PROJECTION EVIDENCE
```

---

## 3. Evaluation model

Each candidate is scored from 0–5 on six dimensions.

| Dimension | Weight | Meaning |
| --- | ---: | --- |
| Current problem fit | 25 | Directly addresses an observed/current SimCore need |
| Correctness gain | 20 | Prevents semantic/authority errors |
| Architecture leverage | 20 | Reusable boundary without generic subsystem sprawl |
| Long-chat/performance gain | 15 | Can reduce request/context pressure or unnecessary work |
| Validation tractability | 10 | Can be proven with bounded fixtures + real-chat evidence |
| Change safety | 10 | Can begin with narrow effects and low schema/persistence risk |

Weighted score is normalized to 100.

| Rank | Candidate | Fit | Correctness | Leverage | Long-chat | Validation | Safety | Score |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | A · Context Projection Contract | 5 | 4 | 5 | 5 | 4 | 4 | **92** |
| 2 | B · Exposure Knowledge Contract | 5 | 5 | 5 | 2 | 5 | 5 | **91** |
| 3 | C · Derived Provenance + Reroll Lineage | 4 | 5 | 5 | 3 | 4 | 3 | **83** |
| 4 | D · Schema-First Derived Snapshot | 3 | 4 | 4 | 2 | 5 | 4 | **71** |
| 5 | E · Derived Checkpoint + Recent Delta | 3 | 3 | 4 | 4 | 3 | 3 | **67** |

The one-point gap between A and B is not a claim that A is categorically more important. It reflects different value profiles:

```text
A = strongest long-chat / context-pressure leverage
B = strongest semantic-correctness / low-risk leverage
```

Both clear the current design-promotion threshold.

---

## 4. Promotion decision

### PROMOTE TO DESIGN

```text
A · Context Projection Contract
B · Exposure Knowledge Contract
```

These are now the two legitimate first design transactions from the LightBoard / MiniBoard research line.

They may be designed in parallel at the document level, but runtime implementation must remain a separate authorization after the active release/S7 lane is ready for such a change.

### PREPARE AS SUPPORTING CONTRACT

```text
C · Derived Provenance and Reroll Lineage Contract
```

Do not design a generic lineage platform in isolation. Let Candidate A or B identify the first concrete derived object, then specify the minimum provenance/lineage metadata that object actually needs.

### KEEP IN BACKLOG

```text
D · Schema-First Derived Snapshot
E · Derived Checkpoint + Recent Delta
```

These remain useful patterns, not current standalone product work.

---

## 5. Implementation disciplines, not standalone candidates

The following high-value findings should be treated as rules applied to future designs rather than separate feature projects:

```text
Presentation Failure Quarantine
Intent-Only Renderer Boundary
Semantic Payload / Renderer Decoupling
Orthogonal Projection Axes
Vertical Feature-Gate Closure
Optional Enrichment Degradation
Media Materialization Boundary
Least-Power Capability Choice
Namespace Isolation
Fail-Closed Presentation
```

Creating separate runtime subsystems for each would recreate the subsystem sprawl this research is intended to avoid.

---

## 6. Recommended design order

### Design 1 · Context Projection Contract

First design target:

```text
request-time ephemeral projection only
zero persistent schema if possible
one concrete semantic owner
one measurable long-chat/context-pressure hypothesis
strict fallback to current full-context behavior on uncertainty
```

The design must answer:

```text
projection input authority
owner selection authority
minimum required fields/history
what is excluded and why
uncertainty fallback
edit/reroll behavior
context re-entry rule
prompt/accounting observability
static fixtures
real long-chat A/B evidence
```

### Design 2 · Exposure Knowledge Contract

First design target:

```text
one current Community/public projection path
observable/exposed fact eligibility only
private/inferred facts fail closed
zero new persistent audience state if possible
```

The design must answer:

```text
what counts as exposed evidence
who owns exposure classification
how source/channel scope is represented
how private/inferred facts are marked
how reroll/edit changes exposure eligibility
how Community consumes the projection without gaining authority
negative fixtures for hidden facts
real-chat evidence for exposed vs hidden cases
```

### Design 3 · Provenance support, only when demanded

When Design 1 or 2 reaches a concrete derived object, define the minimum C contract needed for:

```text
source anchor
lineage identity
owner identity
invalidated-by edit/reroll/source replacement
```

No broader ledger is authorized by this shortlist.

---

## 7. Success conditions for promotion beyond design

A candidate may move from `DESIGN_READY` to implementation consideration only when its design proves all of the following:

```text
CONCRETE_CURRENT_PROBLEM
SINGLE_CLEAR_OWNER
BOUNDED_READ_SET
BOUNDED_WRITE/EFFECT_SET
NO_UNNECESSARY_PERSISTENT_SCHEMA
EDIT_REROLL_BEHAVIOR_EXPLICIT
UNCERTAINTY_FAILS_SAFE
CURRENT_BEHAVIOR_FALLBACK_DEFINED
STATIC_VALIDATION_PLAN
REAL_LONG_CHAT_VALIDATION_PLAN
S7 / RELEASE ATTRIBUTION BOUNDARY PRESERVED
```

If one of these is missing, keep the candidate in design rather than implementation.

---

## 8. Final selection state

```text
LIGHTBOARD_MINIBOARD_RESEARCH       = COMPLETE
ANALYZED_ARTIFACTS                  = 16
EXACT_SOURCE_ARCHIVES               = 16

DESIGN_READY_A                      = CONTEXT_PROJECTION_CONTRACT
DESIGN_READY_B                      = EXPOSURE_KNOWLEDGE_CONTRACT
DESIGN_PREP_C                       = DERIVED_PROVENANCE_REROLL_LINEAGE
BACKLOG_D                           = SCHEMA_FIRST_DERIVED_SNAPSHOT
BACKLOG_E                           = DERIVED_CHECKPOINT_RECENT_DELTA

IMPLEMENTATION_AUTHORITY            = NONE
PERSISTENT_SCHEMA_AUTHORITY         = NONE
PRODUCTION_CHANGE                   = NONE
S7_CHANGE                           = NONE
```

Next legitimate action:

```text
write the dedicated Context Projection Contract design
```

The Exposure Knowledge Contract remains co-equal `DESIGN_READY` and should follow as the second dedicated design transaction unless new evidence changes priority.
