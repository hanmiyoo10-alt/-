# SimCore Reference Research Map - 2026-08-30

Date: 2026-08-30 KST

Status: **REFERENCE SYNTHESIS · RESEARCH BACKLOG ONLY · NO IMPLEMENTATION AUTHORITY**

## 1. Purpose

This document synthesizes the user-supplied LightBoard and RisuAI scripting references already analyzed in `main`.

It is not a feature specification, version plan, runtime RFC, release authorization, or permission to copy third-party implementation.

It exists to answer four questions:

1. Which ideas repeated across multiple references and are therefore worth keeping?
2. Which ideas are materially distinct and should not be merged into one vague concept?
3. Which ideas are promising, watch-only, deferred, or direct-transfer rejects?
4. What evidence would be required before any reference idea could become a real SimCore design?

This document does not alter:

- `release-simcore`,
- `plugins/simcore/latest.js`,
- `plugins/simcore/install.js`,
- the v0.70.1 frozen design,
- R2.9,
- current runtime state/schema/ownership,
- current release authority.

Reference research stays in `main` until a later explicit product design promotes a bounded idea.

---

## 2. Source authority

This synthesis derives from these six analysis records:

1. `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_COMMENTS_4_0_0_2026-08-30.md`
2. `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_CORE_4_1_1_2026-08-30.md`
3. `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_MINIBOARD_4_1_1_2026-08-30.md`
4. `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_HUNTERNET_4_0_0_2026-08-30.md`
5. `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_NEWS_4_0_0_2026-08-30.md`
6. `SIMCORE_REFERENCE_ANALYSIS_RISUAI_SCRIPTING_SKILL_2026-08-30.md`

Archived binaries remain under:

`references/simcore-plugin-idea-drop-2026-08-30/`

The individual analysis records remain the evidence authority for concrete upstream behavior. This synthesis is the authority only for the cross-reference research taxonomy and deduplication below.

---

## 3. Executive synthesis

The references converge on four major research domains rather than one monolithic future feature.

```text
A. CONTEXT PROJECTION
   What historical information should the current semantic job receive?

B. SOURCE PROJECTION
   What can a simulated source/audience know, publish, and react to, and when?

C. HOST INTEGRATION
   What may a runtime owner/hook observe, mutate, persist, and re-enter?

D. SEMANTIC SIDECAR & PRESENTATION
   How should generated semantic data, validation, derived presentation, and interaction be separated?
```

A fifth domain is maintenance architecture rather than product runtime:

```text
E. MAINTENANCE / DEVELOPER REFERENCE
   How can large-plugin ownership, effects, source locations, and validation be documented narrowly?
```

These domains are related but must not be collapsed.

For example:

- Source Projection is about fictional/semantic information flow.
- Host Integration is about actual plugin/runtime authority.
- Context Projection is about prompt contribution.
- Semantic Sidecar & Presentation is about representation and generated artifacts.

Mixing those axes would create ambiguous ownership.

---

# A. Context Projection

## 4. Context Projection family

### 4.1 Owner-Scoped Context Projection

Origin: LightBoard Core.

Concept:

```text
full conversation/state
→ semantic owner/job selection
→ only context relevant to that owner
```

The key lesson is not to give every semantic job the same historical aperture merely because all history exists.

Potential SimCore relevance:

- Current Task Primacy,
- long-chat stale-frame reduction,
- Community source-local context,
- continuity fact reuse without completed-task replay.

Classification:

`PROMISING · HIGH LONG_CHAT RELEVANCE`

### 4.2 Field-Level Context Projection

Origin: LightBoard News.

Concept:

```text
admitted historical object
→ keep semantic fields still needed
→ remove presentation-only / derived / completed-task fields
```

This is distinct from Owner-Scoped Context Projection.

```text
Owner-Scoped Projection = choose objects/messages
Field-Level Projection  = choose fields inside retained objects
```

Classification:

`PROMISING · HIGH LONG_CHAT RELEVANCE`

### 4.3 Bounded Context Aperture

Origins: Comments, Miniboard, HunterNet, News.

Concept:

```text
stored lifetime
!= model-context lifetime
!= active-render lifetime
```

Different source families may eventually need different apertures, but no per-platform runtime retention policy is authorized yet.

Classification:

`PROMISING PRINCIPLE · SOURCE-SPECIFIC POLICY DEFER`

### 4.4 Progress-Gated Follow-up

Origin: News, with relevance to Current Task Primacy.

Concept:

A completed prior topic should not re-enter merely because it exists in history. Re-entry can be legitimate only when either:

1. the current user explicitly requests continuation/reuse, or
2. future evidence establishes a materially new state of the old topic.

The second branch is dangerous because it can become a replay loophole.

Classification:

`PROMISING RESEARCH · IMPLEMENTATION DEFER`

### 4.5 Context Projection research priority

Priority order:

```text
P1  Owner-Scoped Context Projection
P1  Field-Level Context Projection
P2  Bounded Context Aperture
P3  Progress-Gated Follow-up
```

Reason:

The first two can potentially improve long-chat correctness while preserving existing semantic owners. The latter two imply policy choices that need stronger product evidence.

---

# B. Source Projection

## 5. Source Projection Envelope

The Community-oriented references progressively formed one general source model.

```text
SOURCE PROJECTION ENVELOPE

Channel Reachability
→ Knowledge / Evidence Boundary
→ Graded Exposure
→ Propagation / Publication Maturity
→ Source Coverage Lens
→ Source-Local Assertion Generation
→ Assertion Provenance
→ Epistemic Quarantine
→ Bounded / Field-Level Context Projection
```

This is a research model, not a current Community replacement.

### 5.1 Channel Reachability

Origin: HunterNet.

Question:

```text
Can this source/platform even receive or transmit information right now?
```

This precedes audience knowledge.

Classification:

`PROMISING`

### 5.2 Audience Knowledge Boundary

Origin: Comments, reinforced by Miniboard/HunterNet/News.

Rule:

```text
WORLD FACT
!=
AUDIENCE-EXPOSED FACT
```

The runtime may know a fact for continuity while a simulated audience remains unable to react to it.

Classification:

`PROMISING · STRONG COMMUNITY RELEVANCE`

### 5.3 Graded Audience Exposure

Origin: Miniboard, reinforced elsewhere.

Knowledge is not always binary. Publicness can depend on witnessability, publication, social reach, source access, and degree of detail.

Do not directly transfer the upstream manual privacy slider as a SimCore product surface.

Potential future SimCore form should derive exposure from existing source/handoff/frame evidence where possible.

Classification:

`PROMISING CONCEPT · MANUAL POLICY WATCH`

### 5.4 Reaction Propagation Window

Origin: HunterNet.

Question:

```text
Has enough narrative time passed for information to reach this source and for its users to react?
```

Any future adaptation must consume existing SimCore Frame/Time/Continuity authority. It must not create a competing clock.

Classification:

`PROMISING`

### 5.5 Publication Maturity Window

Origin: News.

This is not identical to Reaction Propagation.

```text
Propagation Window  = can the source know/react yet?
Publication Maturity = can the source plausibly publish this degree of detail/packaging yet?
```

Classification:

`PROMISING`

### 5.6 Source Coverage Lens

Origin: News.

Separate:

```text
SOURCE ACCESS        = what evidence can this source receive?
SOURCE COVERAGE LENS = what does this source choose to surface/emphasize?
```

This can explain why a live chat, anonymous board, professional community, local community, and newspaper select different aspects of the same world event without changing world truth.

Classification:

`PROMISING`

### 5.7 Source Assertion Provenance

Origin: News, reinforced by all Community-like references.

Potential conceptual assertion classes include:

```text
DIRECT REPORT
OFFICIAL STATEMENT
ATTRIBUTED CLAIM
RUMOR
OPINION
ADVERTORIAL
CORRECTION / DELETION
```

The key invariant is:

```text
SOURCE ASSERTION != WORLD FACT
```

A structured provenance schema is not authorized yet.

Classification:

`PROMISING CONCEPT · STRUCTURED SCHEMA DEFER`

### 5.8 Epistemic Sidecar Quarantine

Origins: Miniboard, HunterNet, News.

Generated source content can contain:

- rumor,
- joke,
- trolling,
- false reporting,
- opinion,
- advertising,
- social distortion.

Therefore source-like sidecars must not silently promote their claims into canonical world state.

Classification:

`REINFORCES EXISTING · HIGH CONFIDENCE`

### 5.9 Source-local identity affordance

Origin: Comments and HunterNet.

Different source types can expose different identity cues such as anonymous, fixed nickname, verified/professional role, partial IP, locality, or rank.

This can improve source texture but risks persistent-state growth.

Classification:

`WATCH / PROMISING`

### 5.10 Protagonist-Decentered Background Projection

Origin: News.

A source can become more believable when it reports ambient world activity instead of orbiting only the protagonist.

Risk:

```text
invented plausible background event
→ later mistaken for canon
```

Classification:

`WATCH · INVENTED BACKGROUND EVENTS DEFER`

### 5.11 Source Projection research priority

```text
P1  Audience Knowledge Boundary
P1  Channel Reachability + Propagation/Maturity
P1  Epistemic Quarantine
P2  Source Coverage Lens
P2  Source Assertion Provenance
P3  Source-local identity affordance
P3  Protagonist-Decentered Background Projection
```

---

# C. Host Integration

## 6. Host Integration Envelope

LightBoard Core and the RisuAI scripting skill converge on a separate runtime-authority model.

```text
HOST INTEGRATION ENVELOPE

Semantic Owner
→ Execution Phase
→ Read Scope
→ Capability / Effect Class
→ Authoritative Persistence Target
→ Mutation / Cancellation Rights
→ Re-entry Semantics
→ Observability / Reconciliation
```

This is not the Source Projection Envelope.

Source Projection describes fictional information flow.
Host Integration describes actual plugin/host authority.

### 6.1 Effect-Class Contract

Origin: LightBoard Core.

An owner should not merely have a layer name. It should be possible to reason about whether it may:

```text
observe host
write host
write portable state
write persistent state
mutate history
perform network/provider work
perform presentation-only work
```

Classification:

`PROMISING`

### 6.2 Hook Effect Matrix

Origin: RisuAI Scripting Skill, built on Effect-Class Contract.

A useful hook review matrix contains:

| Dimension | Question |
| --- | --- |
| Read scope | What may this hook observe? |
| Mutation scope | What may it change? |
| Persistence | Do its writes survive this invocation/render? |
| Cancellation | Can it stop the enclosing operation? |
| Host privilege | Can it call provider/network/DB/main-DOM effects? |
| Ordering | What ran before it and who consumes the result? |
| Re-entry | Does reroll/edit/reload/render call it again? |
| Authority | Is the observed object a snapshot, working copy, or canonical target? |

Classification:

`PROMISING · STRONG ARCHITECTURE/DOCS VALUE`

Recommended first adoption form, if later authorized:

```text
architecture documentation / static review vocabulary
```

Not:

```text
new runtime permission engine
```

### 6.3 Least-Power Extension Selection

Origin: RisuAI Scripting Skill, reinforced by least-privilege LightBoard frontends.

Rule:

> Choose the narrowest owner/effect surface capable of performing the semantic job.

Classification:

`PROMISING · ARCHITECTURE REVIEW RULE`

### 6.4 Execution-Context Isolation

Origin: RisuAI scripting engines separated by mode/phase.

Rule:

```text
EXECUTION-LOCAL MEMORY != DURABLE SEMANTIC STATE
```

This reinforces distinctions already important to SimCore:

```text
request-local prepared state
runtime-generation telemetry
host-local observation
portable/persistent state
canonical conversation evidence
```

Classification:

`REINFORCES EXISTING / PROMISING DOCUMENTATION`

### 6.5 Snapshot-vs-Authority contract

Origin: RisuAI scripting behavior and public persistence bugs.

Rule:

```text
OBSERVED OBJECT != AUTHORITATIVE WRITE TARGET
```

A callback or hook receiving a chat/state object must not imply that mutating the received object persists or that reconstructing canonical state from that view is lossless.

Classification:

`PROMISING / REINFORCES EXISTING`

### 6.6 Phase/Re-entry Matrix

Origin: RisuAI interop documentation.

A future documentation artifact could explicitly state whether each SimCore hook is exercised by:

```text
ordinary send
reroll
manual edit
reload
render-only refresh
stale diagnostic probe
```

Classification:

`PROMISING DOCUMENTATION FORM`

---

# D. Semantic Sidecar & Presentation

## 7. Structured semantic sidecars

Comments, Miniboard, HunterNet, and News all repeatedly use:

```text
model generation
→ structured semantic payload
→ deterministic/bounded normalization
→ validator
→ canonical source-local sidecar
→ renderer
```

This supports several distinct principles.

### 7.1 Structure as acceptance authority

Generated output is not accepted merely because it looks visually plausible. It must satisfy the downstream semantic structure.

Classification:

`REINFORCES EXISTING`

### 7.2 Semantic Payload / Renderer Decoupling

Rule:

```text
SEMANTIC OBJECT IDENTITY
!=
RENDERER / PRESENTATION
```

Classification:

`PROMISING / REINFORCING`

### 7.3 Derived presentation sidecar separation

Origin especially News.

Image prompt data, CSS, derived UI state, or other renderer requests do not need to become canonical semantic state or future prompt burden.

Classification:

`REINFORCES EXISTING`

### 7.4 Targeted Interaction Transaction

Origins: Comments, Miniboard, HunterNet.

Concept:

A UI interaction should target one semantic operation while preserving unrelated data.

Examples:

```text
add reply to one post
remove one source-local item
reroll one source-local sidecar
```

The references often implement this by rewriting historical chat text. That implementation model is rejected for SimCore.

The transaction concept itself remains interesting only if a future first-class sidecar/state owner exists.

Classification:

`DEFER · REQUIRES NEW STATE MODEL`

### 7.5 Structured Community sidecar

A future Community representation could theoretically become a structured semantic object rendered separately from prose.

This would affect representation, edit, reroll, history, mirror, and migration semantics.

Classification:

`DEFER · LARGE ARCHITECTURE`

---

# E. Maintenance / Developer Reference

## 8. Progressive-disclosure developer references

Origin: RisuAI scripting skill pack.

Pattern:

```text
small routing/index document
→ owner/capability-specific reference
→ exact source locations
→ invariants / forbidden effects
→ targeted validation commands
```

This aligns with SimCore's existing maintenance rule to read by module ownership and change surface rather than loading the full plugin monolithically.

Classification:

`PROMISING · DOCUMENTATION/TOOLING`

### 8.1 Declarative capability manifest

Origin: LightBoard Core.

A feature declares what context/capabilities it needs rather than quietly reaching into everything.

Potential SimCore adaptation, if later justified, should start as static documentation or CI metadata rather than dynamic runtime plugin discovery.

Classification:

`WATCH / PROMISING`

---

# 9. Deduplicated candidate register

## 9.1 Tier A - strongest research candidates

These have repeated evidence, strong SimCore fit, and relatively clear semantic boundaries.

| Candidate | Domain | Evidence strength | Likely first form |
| --- | --- | --- | --- |
| Owner-Scoped Context Projection | Context | High | research/design |
| Field-Level Context Projection | Context | High | research/design |
| Audience Knowledge Boundary | Source | High | Community research |
| Channel Reachability + Propagation/Maturity | Source | High | source validity research |
| Epistemic Sidecar Quarantine | Source | High | reinforce current invariants |
| Hook Effect Matrix | Host | High | docs/static architecture review |
| Least-Power Extension Selection | Host | High | architecture review rule |
| Snapshot-vs-Authority Contract | Host | High | docs/tests/invariants |

No Tier A item is automatically authorized for runtime implementation.

## 9.2 Tier B - promising, but needs product evidence or narrower design

| Candidate | Reason not Tier A |
| --- | --- |
| Source Coverage Lens | needs concrete source-family product need |
| Source Assertion Provenance | schema risk and canon-policy complexity |
| Bounded source-specific context aperture | requires retention evidence |
| Semantic Payload / Renderer Decoupling | useful but representation scope can become large |
| Phase/Re-entry Matrix | mainly maintenance/observability until a concrete gap appears |
| Declarative Capability Manifest | metadata can drift unless enforcement need is proven |
| Progress-Gated Follow-up | can reopen replay loopholes |

## 9.3 WATCH

```text
Stable/source-local Community identity
Manual privacy/exposure controls
Shared cross-layer state bus
Protagonist-decentered background projection
Platform-specific retention values
Old-source UI render suppression
```

WATCH means preserve the idea and look for real SimCore evidence. It is not a backlog commitment.

## 9.4 DEFER

```text
Structured Community sidecar runtime
Targeted sidecar transaction system
Per-platform runtime retention engine
Structured assertion-provenance schema
Auxiliary-model routing framework
Concurrent semantic generation
Runtime permission engine
Network/provider expansion
Invented background world events
Automatic LLM self-repair loop as acceptance authority
```

DEFER means potentially useful, but the cost/risk surface is larger than the current evidence justifies.

---

# 10. Direct-transfer reject register

The following upstream patterns must not be copied directly into SimCore without a new design that removes the stated hazard.

## 10.1 Historical chat mutation

```text
DO NOT TRANSFER · HISTORICAL_SETCHAT_MUTATION
DO NOT TRANSFER · FULL_HISTORY_REBUILD_FROM_PARTIAL_VIEW
```

Reason:

Directly rewriting historical assistant messages or reconstructing full history from a reduced scripting view can destroy identity/provenance metadata and destabilize reroll/edit/representation contracts.

This reject is reinforced by public RisuAI issue evidence where full-chat round-trip behavior could drop message metadata and break reroll/bookmark-related behavior.

## 10.2 Dynamic runtime callback/code loading

```text
DO NOT TRANSFER · DYNAMIC_CALLBACK_LOADING_AS_ARCHITECTURE
```

Reason:

SimCore benefits from static ownership graphs, reviewable code paths, and CI enforcement.

## 10.3 Unowned stringly global state

```text
DO NOT TRANSFER · UNOWNED_STRINGLY_GLOBAL_STATE
```

Reason:

Cross-layer convenience must not replace schema-bounded state ownership and provenance.

## 10.4 Silent privilege no-op

```text
DO NOT TRANSFER · SILENT_PRIVILEGE_NOOP_AS_PRIMARY_DIAGNOSTIC
```

Reason:

A privileged operation failing closed is good, but observability must make the authority failure diagnosable.

## 10.5 Presentation-phase durable mutation

```text
DO NOT TRANSFER · PRESENTATION_PHASE_DURABLE_BUSINESS_WRITE
```

Reason:

Presentation/render re-entry must not become an accidental semantic state mutation path.

## 10.6 Model self-reported probability as authority

```text
DO NOT TRANSFER · MODEL_SELF_REPORTED_PROBABILITY_AS_ACCEPTANCE_AUTHORITY
```

Reason:

Generated numeric confidence is not calibrated correctness evidence.

---

# 11. Relationship to current SimCore product work

## 11.1 v0.70.1 remains isolated

The frozen v0.70.1 `Cold First-Turn Tail Attribution` design is an observability/performance attribution mini.

Nothing in this research map authorizes adding:

- context projection changes,
- Community source semantics,
- new structured sidecars,
- provider/auxiliary requests,
- new effect permissions,
- runtime state/schema,
- history mutation.

Mixing these ideas into v0.70.1 would destroy its attribution value.

## 11.2 R2.9 remains isolated

This map also creates no R2.9 activation or release-system authority.

Reference research and repository/release-system work remain separate tasks.

---

# 12. Promotion protocol

A reference idea may become a real SimCore feature only through an explicit promotion sequence.

```text
REFERENCE IDEA
→ SimCore-native problem/evidence observed
→ classify WATCH / FIX / BLOCKER as appropriate
→ bounded design document
→ explicit scope and owner selection
→ working branch implementation
→ static/CI validation
→ release-simcore deployment
→ real long-chat validation
→ main evidence/docs/long-term-memory sync
```

Reference popularity or elegance is not enough.

Promotion requires a SimCore-native problem statement.

For a candidate with no native problem evidence:

```text
keep PROMISING
but do not implement
```

---

# 13. Suggested future research order

If future product evidence opens room for reference-driven work, the least risky order is:

### Track 1 - Long-chat correctness

```text
Owner-Scoped Context Projection
→ Field-Level Context Projection
→ bounded context aperture
→ only then consider Progress-Gated Follow-up
```

### Track 2 - Community/source semantics

```text
Audience Knowledge Boundary
→ Channel Reachability / Propagation / Publication Maturity
→ Source Coverage Lens
→ Assertion Provenance
```

### Track 3 - Runtime architecture/documentation

```text
Hook Effect Matrix documentation
→ Phase/Re-entry Matrix
→ Least-Power owner review rule
→ static capability metadata only if drift evidence appears
```

### Track 4 - Representation

```text
keep semantic/render separation principle
→ gather concrete need for structured source sidecars
→ only then design transaction/reroll/edit/history semantics
```

This sequencing intentionally delays the most invasive state/history work.

---

# 14. Final state

```text
REFERENCE_SET_ANALYZED = SIX_ARTIFACTS
REFERENCE_SYNTHESIS = COMPLETE
RUNTIME_IMPLEMENTATION_AUTHORITY = NONE
RELEASE_SIMCORE_CHANGE = NONE
LATEST_INSTALL_CHANGE = NONE
V0701_CHANGE = NONE
R29_CHANGE = NONE
```

Top research candidates:

```text
CONTEXT:
  Owner-Scoped Context Projection
  Field-Level Context Projection

SOURCE:
  Audience Knowledge Boundary
  Channel Reachability / Propagation / Maturity
  Epistemic Sidecar Quarantine

HOST:
  Hook Effect Matrix
  Least-Power Extension Selection
  Snapshot-vs-Authority Contract
```

Top rejects:

```text
historical chat rewrite
full-history reconstruction from partial views
dynamic runtime callback loading
unowned shared state
presentation-phase durable mutation
```

The reference set is now a bounded research backlog rather than a collection of isolated plugin observations.
