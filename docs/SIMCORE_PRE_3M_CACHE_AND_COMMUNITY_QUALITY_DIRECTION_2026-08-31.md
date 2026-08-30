# SimCore Pre-3.0M Cache + Community Quality Direction

Date: 2026-08-31 KST
Status: DIRECTION ONLY · NO VERSION ASSIGNED · NO DESIGN FREEZE · NO IMPLEMENTATION AUTHORITY
Classification: PRODUCT ROADMAP / PRE-3M MINI CANDIDATES

## Context

The 2.0M M-series architecture is complete and frozen at M2-6. A separate candidate map currently ranks Source Intelligence as the strongest future 3.0M major theme.

Before freezing 3.0M, two smaller product directions are worth considering:

1. cost-oriented cache/prefix optimization;
2. higher-quality Community rendering without defining a separate HunterNet product surface.

These are direction records only. They do not authorize a runtime release or modify the current v0.70.1 live gate.

## Sequence rule

Current production authority must close its existing real-long-chat gate before a new behavioral mini is selected.

Preferred sequence hypothesis:

```text
close current v0.70.1 live gate
→ cache/prefix cost mini, if source audit proves controllable savings surface
→ Community Quality mini, if separately authorized
→ freeze 3.0M scope later
```

Do not combine cache changes and Community semantic changes in one release.

# A. Cache / Cost Efficiency Mini

## Goal

Reduce avoidable uncached prompt/input cost where SimCore can actually control the request prefix, without weakening correctness or changing semantic behavior merely to chase a cache metric.

The monetary target is provider/gateway prompt-cache reuse when available. Local JavaScript caching alone can reduce CPU latency but does not prove or imply token-billing savings.

## Existing foundation

SimCore already has substantial cache-readiness architecture:

```text
Prompt/cache guidance in SIMCORE_GUIDELINES
full-prefix first-break ownership vocabulary
CHAT_HISTORY / CURRENT_USER / SIMCORE_RUNTIME attribution
runtime-cache / runtime-cache-candidates ownership
cache topology timing
cache candidate cost observation
stable / slow / volatile / full compiler tiers
representation fingerprinting and history stability controls
```

v0.70.1 additionally names cache topology and cache candidate spans inside bounded post-onSend attribution.

Therefore a future cache mini should not begin by inventing another cache subsystem. It should begin from exact source and request-shape evidence.

## Hard distinction

```text
LOCAL PREFIX STABILITY
!= PROVIDER CACHE HIT
!= BILLED CACHED TOKENS
```

Provider cache remains `UNVERIFIED` until authoritative provider/gateway telemetry or billing evidence exists.

If the host/provider exposes cached-token usage, capture it as bounded observational evidence. If it does not, use provider-side billing/dashboard evidence where available. Do not infer monetary savings from local fingerprints alone.

## First design question

```text
Where is the earliest avoidable prefix break that SimCore owns?
```

If the first break is consistently:

```text
PRE_SIMCORE / HOST_PREFIX
or
CHAT_HISTORY outside a SimCore-controlled representation
```

then a SimCore runtime rewrite is not justified merely for cache savings.

If exact audit instead finds a SimCore-owned unstable prefix or avoidable compiler volatility, a bounded mini can stabilize only that surface.

## Preferred scope

Potentially valid work, subject to exact source audit:

- remove unnecessary volatility from an already stable/slow compiler tier;
- prevent semantically identical SimCore prefix components from changing representation;
- reuse existing bounded fingerprints/topology data rather than rescanning solely for diagnostics;
- preserve history representation identity where SimCore already owns it;
- add bounded cache-cost receipts only where they are observational and cheap;
- measure billed/provider cache evidence when the host actually exposes it.

Not automatically valid:

- moving the runtime prompt from its current verified tail placement;
- changing semantic ordering for cache metrics;
- weakening Deferred Mirror or edit-reconcile safety;
- rewriting history to make a prefix look stable;
- claiming provider cache hits from local prefix equality;
- adding network/provider calls merely to query cache state.

## Success criteria

A monetary optimization mini should ideally prove both:

```text
SEMANTIC NON-REGRESSION = PASS
CACHE/COST EFFECT = OBSERVED WITH AUTHORITATIVE EVIDENCE
```

If provider cost evidence cannot be observed, the release may still be justified as a measured prefix-stability or local-performance mini, but it must not be sold as proven token-cost reduction.

# B. Community Quality, Not HunterNet Productization

## Direction

Do not define `HunterNet` as a new universal SimCore product primitive.

Instead, treat the useful HunterNet qualities as evidence for improving the existing Community surface.

Canonical product direction:

```text
<COMMUNITY> remains the user-visible semantic family

SimCore decides:
- what the audience can know;
- what source/community context is active;
- what communication culture is plausible;
- which claims are fact, attribution, rumor, opinion, joke, or noise;
- how much historical Community context is relevant.

Main model renders:
- natural posts/comments/reactions inside those constraints.
```

## Why this is preferable

A named HunterNet runtime would overfit one reference/world style and create unnecessary parallel contracts.

A richer Community system can express HunterNet-like quality when appropriate while also supporting:

```text
anonymous occupational board
professional forum
public social feed
local neighborhood board
live broadcast comments
fan/community forum
institutional discussion space
other world-specific community cultures
```

The reference artifact supplies design inspiration, not the product ontology.

## Community Source Profile concept

A future bounded Community Quality design can describe source texture through generic dimensions rather than copied platform names.

Illustrative dimensions only:

```text
identity model
  anonymous / pseudonymous / role-visible / public

source scope
  local / occupational / broad-public / event-local

reaction cadence
  live / near-real-time / delayed

credibility cues
  none / role-based / attributed / mixed

discourse style
  short-reaction / thread-discussion / professional / chaotic-social

exposure boundary
  derived from existing evidence/handoff/frame authority
```

These are not yet a frozen schema.

## Quality improvements that fit the current Community family

Promising first-wave qualities:

- stronger source-local voice diversity;
- more coherent post/comment relationships;
- realistic identity affordances without requiring a permanent account database;
- less generic repeated reaction phrasing;
- source-appropriate slang/formality/status cues;
- audience knowledge boundaries applied before style generation;
- rumor/joke/opinion kept epistemically quarantined from world truth;
- time-aware reaction availability using existing Time/Frame/Handoff owners;
- bounded old-Community context rather than unlimited replay.

## Important invariant

```text
COMMUNITY STYLE
must not modify
WORLD KNOWLEDGE AUTHORITY
```

A professional-looking post is not more true because it sounds authoritative. An anonymous rumor is not canon because it is repeated. Style/profile never grants exposure or factual authority.

## First implementation should stay light

If promoted as a pre-3M mini, prefer:

```text
existing <COMMUNITY> surface
existing main response request
existing world/time/evidence owners
ephemeral or bounded identity texture
no new historical chat mutation
no separate provider request
no autonomous background event generation
no unbounded persistent user registry
```

That keeps the update a Community quality improvement rather than prematurely building the whole Source Intelligence major.

## Relationship to 3.0M

A successful Community Quality mini would be useful evidence for 3.0M, not a substitute for it.

```text
pre-3M Community Quality
= prove richer source-local Community semantics on one existing surface

3.0M Source Intelligence
= later generalize proven semantics into a multi-source sidecar/runtime contract
```

This gives the future major real SimCore-native evidence instead of designing the entire source runtime from reference material alone.

# C. Preferred pre-3M ordering

Current hypothesis:

```text
1. close v0.70.1 real-long-chat gate

2. CACHE / COST MINI
   - exact first-break/source audit first
   - stabilize only SimCore-owned avoidable volatility
   - prove provider/billing savings only with authoritative evidence

3. COMMUNITY QUALITY MINI
   - keep <COMMUNITY>
   - generic source profile, not HunterNet naming
   - improve realism/identity/thread texture/epistemic boundaries
   - no auxiliary call in the first pass

4. 3.0M DESIGN FREEZE
   - use actual cache + Community evidence
   - decide how much Context Projection / Semantic Sidecar / Source Intelligence to absorb
```

The cache and Community minis must remain separate release transactions.

# D. Why this sequencing is attractive

Cost optimization before a source/sidecar major reduces financial pressure before any future feature that could increase prompt complexity or auxiliary computation.

Community Quality before a generalized source major gives us a narrow proving ground for:

- source-local style;
- audience knowledge boundaries;
- provenance/quarantine;
- bounded context;
- main-model isolation.

That means 3.0M can generalize behavior already proven in SimCore rather than importing a large speculative framework at once.

## Disposition

```text
PRE_3M_CACHE_MINI = STRONG CANDIDATE, EVIDENCE-GATED
PRE_3M_COMMUNITY_QUALITY = STRONG CANDIDATE
HUNTERNET_AS_SEPARATE_PRODUCT_PRIMITIVE = NOT PREFERRED
HUNTERNET_QUALITY_PATTERNS = REUSE AS GENERIC COMMUNITY INSPIRATION
CACHE + COMMUNITY IN ONE RELEASE = FORBIDDEN
3.0M SCOPE = STILL UNFROZEN
IMPLEMENTATION AUTHORITY = NONE
```

No runtime, `release-simcore`, `latest.js`, `install.js`, release-system, v0.70.1 semantics, or 3.0M implementation authority is changed by this direction record.
