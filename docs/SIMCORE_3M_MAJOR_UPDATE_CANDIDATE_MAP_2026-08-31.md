# SimCore 3.0M Major Update Candidate Map

Date: 2026-08-31 KST
Status: CANDIDATE MAP ONLY · NO VERSION SCOPE FROZEN · NO IMPLEMENTATION AUTHORITY
Classification: PRODUCT ROADMAP / MAJOR-UPDATE EXPLORATION

## Context

The 2.0M M-series structural program is complete and frozen at M2-6. A future 3.0M major should therefore use that stabilized architecture to unlock a new capability surface rather than default to another broad internal rewrite.

Major selection criteria:

- qualitatively new SimCore capability;
- preserve or improve main-model isolation;
- absorb related medium-update goals naturally;
- decompose into bounded fail-closed checkpoints;
- keep product runtime and release-system restructuring separate.

## Candidate A · Source Intelligence / Multi-Source Sidecar Runtime

Classification: `TOP MAJOR CANDIDATE`

Generalize Community-like output into source-aware semantic sidecars such as live comments, anonymous/public boards, professional networks, news/media, local communities, and future source families.

Core envelope:

```text
Channel Reachability
→ Knowledge Boundary
→ Graded Exposure
→ Reaction Propagation / Publication Maturity
→ Source Coverage Lens
→ Source Assertion
→ Assertion Provenance
→ Epistemic Quarantine
→ Bounded / Field-Level Context Projection
→ Validation
→ Renderer
```

Why major-sized:

- can absorb HunterNet-like and News-like surfaces;
- can absorb source identity, provenance, history aperture, maturity, structured validation, and semantic/presentation separation;
- gives current reference research a SimCore-native product home;
- plugin can own timing/state/visibility/validation/rendering while the main model remains focused on the primary response.

Main-model invariant:

```text
source sidecar exists
!=
main model consumes source history
```

Primary risks: scope explosion, canon pollution, state growth, interaction/reroll complexity, auxiliary-call latency.

## Candidate B · Context Intelligence / Long-Chat Projection Engine

Classification: `STRONG MAJOR CANDIDATE · POSSIBLE FOUNDATION FOR A`

Core ideas:

```text
Owner-Scoped Context Projection
Field-Level Context Projection
Bounded Context Aperture
Progress-Gated Follow-up
Current Task Primacy integration
```

Value: strongest direct long-chat quality candidate; can reduce stale-task replay and context dilution while preserving continuity.

Risk: incorrect projection can silently remove needed facts and semantic regressions are harder to validate.

Likely best role: early 3.0M checkpoint absorbed into Candidate A rather than the public identity of the whole major.

## Candidate C · Semantic Sidecar Runtime / Auxiliary Job Platform

Classification: `STRONG SUBSTRATE · LIKELY ABSORBED INTO A`

Conceptual pipeline:

```text
semantic job
→ bounded projection
→ optional model call
→ structured payload
→ normalization
→ validator
→ sidecar state
→ renderer
→ bounded reconciliation
```

Useful for Community, source surfaces, summaries, world-status panels, and future non-primary-response features.

Risk: over-engineering into a generic second plugin framework; lineage/persistence must remain explicit.

## Candidate D · Auxiliary Semantic Compute

Classification: `PROMISING · NOT RECOMMENDED AS THE 3.0M THEME BY ITSELF`

Separate narrow model jobs from the primary response request.

```text
main response model = primary roleplay/current task
auxiliary job       = source-side semantic generation
plugin              = policy/projection/state/validation/rendering
```

Value: strongest main-model workload isolation.

Risk: latency, cost, concurrency, stale result, cancellation, reload/reroll complexity. Do not introduce request fanout until current cold-first-turn attribution work is closed.

## Candidate E · Ambient World / Autonomous World Projection

Classification: `HIGH UPSIDE · TOO EARLY FOR FIRST CHECKPOINT`

Background news/events/community activity can make the world feel alive beyond direct protagonist actions.

Risk: invented plausible events becoming accidental canon and autonomous generation competing with user intent.

Dependency: Source Intelligence plus provenance/quarantine first.

## Candidate F · Host Capability / Effect Architecture

Classification: `GOOD ENGINEERING PROGRAM · WEAK PRODUCT-MAJOR THEME`

Possible dimensions:

```text
owner
execution phase
read scope
mutation scope
persistence target
cancellation rights
re-entry
snapshot vs authority
```

High maintainability value, but mostly internal and risks becoming M-series structural surgery again without fresh evidence. Prefer incremental docs/static-review adoption first.

## Candidate G · Release System R3

Classification: `SEPARATE PROGRAM`

The release-system direction around context-coherent validation must remain orthogonal to a product 3.0M runtime major.

```text
product 3.0M != release-system R3.x
```

## Current ranking

```text
1. Source Intelligence / Multi-Source Sidecar Runtime      ★★★★★
2. Context Intelligence / Long-Chat Projection Engine      ★★★★½
3. Semantic Sidecar Runtime / Auxiliary Job Platform       ★★★★
4. Auxiliary Semantic Compute                              ★★★
5. Ambient World / Autonomous World Projection             ★★★
6. Host Capability / Effect Architecture                   ★★½ as product major
7. Release System R3                                       separate axis
```

## Preferred 3.0M hypothesis

```text
3.0M · SOURCE INTELLIGENCE MAJOR

Foundation
  Context Projection contracts
  Source Projection contract
  main-model isolation baseline

Core
  structured semantic source sidecar
  plugin-owned state / validation / presentation
  one generalized source family

Expansion
  HunterNet-like specialized community
  News-like source
  source-local identity / provenance / maturity

Later optional
  auxiliary semantic dispatch
  bounded target-local interaction
  ambient world projection
```

This matches a recurring SimCore pattern: a major establishes one capability surface, while related medium-update goals become natural internal checkpoints instead of being artificially left for later version numbers.

## Guardrails before any freeze

Any real 3.0M design must prove:

- ordinary main-model chat quality does not regress when sidecars are irrelevant;
- source state does not leak into canonical world truth;
- old source data does not create stale-task replay pressure;
- source timing uses existing Time/Frame/Handoff authorities rather than competing clocks;
- no direct historical-chat rewrite;
- no unbounded source identity/history accumulation;
- `latest.js == install.js` remains enforced for runtime releases;
- release-system changes remain separate;
- current v0.70.x performance attribution closes before auxiliary request fanout.

## Disposition

```text
3.0M CANDIDATE MAP = RECORDED
TOP CANDIDATE = SOURCE INTELLIGENCE / MULTI-SOURCE SIDECAR RUNTIME
SECOND = CONTEXT INTELLIGENCE
THIRD = GENERIC SEMANTIC SIDECAR SUBSTRATE
3.0M SCOPE = NOT FROZEN
IMPLEMENTATION = NOT AUTHORIZED
```
