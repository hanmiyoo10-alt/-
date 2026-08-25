# SimCore Renderer Boundary Constitution

Date: 2026-08-25
Status: `CONSTITUTIONAL · DURABLE DESIGN BOUNDARY · NO RUNTIME CHANGE`
Authority: complements `docs/SIMCORE_GUIDELINES.md` Part I

## 1. Constitutional split

```text
SimCore
= state
= policy
= boundary
= validation
= runtime coordination

Main Model
= renderer
= final prose / scene / dialogue / broadcast / community rendering
```

This boundary is permanent unless an explicit architecture-level decision supersedes it with evidence.

## 2. Canonical flow

```text
User input
   ↓
SimCore
(state / authority / boundaries / runtime guidance)
   ↓
Main Model
(actual rendered response)
   ↓
SimCore
(validation / state commit / diagnostics / mirror handling)
```

SimCore determines the conditions under which rendering is allowed and expected.
The Main Model performs the actual natural-language rendering inside those conditions.

## 3. Forbidden responsibility drift

Do not move renderer work into SimCore merely because doing so appears easier for:

```text
cache optimization
prompt stability
latency reduction
diagnostics
UI convenience
state recovery
validation
```

Likewise, the Main Model must not independently override SimCore-owned authority, state, lifecycle, exposure, character-control, or commit decisions.

Examples of forbidden drift:

```text
SimCore writes the final narrative/prose instead of constraining the renderer
→ FORBIDDEN

Main Model invents an authority/state transition that SimCore denied
→ FORBIDDEN

Cache optimization duplicates renderer semantics inside a stable prompt block
→ FORBIDDEN

Performance optimization weakens SimCore state/safety boundaries
→ FORBIDDEN
```

## 4. Cache-specific application

Gemini implicit caching and prompt-caching friendliness are important optimization axes, but they do not change the responsibility split.

SimCore may own:

```text
prompt structure and runtime guidance
stable / slow / volatile compiler tiers
byte-stability and Cache ABI protection
first-break observation and attribution
cache-regression diagnostics
correlation with bounded gateway/provider cache evidence
```

SimCore must not own merely for cache purposes:

```text
final prose generation
scene/dialogue authoring
renderer creative decisions
semantic duplication of the Main Model's rendering job
```

Rule:

> Cache friendliness may optimize how SimCore communicates constraints, but must never turn SimCore into the renderer.

## 5. Idea-review gate

Every future SimCore idea must be checked against this question before activation:

```text
Does this feature improve state/policy/boundary/validation/runtime coordination,
or does it quietly move final rendering responsibility into SimCore?
```

If the latter:

```text
classification = REJECT / RESPONSIBILITY_BOUNDARY_VIOLATION
```

unless a dedicated architecture redesign with explicit evidence intentionally changes the constitutional boundary.

## 6. Relationship to optimization priorities

Canonical priority remains:

```text
Correctness
→ Safety
→ State stability
→ Prompt stability
→ Cache efficiency
→ Performance
→ Convenience
```

Therefore cache, performance, diagnostics, or UI work may never justify responsibility drift across the SimCore/Main Model boundary.

## 7. Durable memory rule

When designing or reviewing SimCore, always remember:

> SimCore is not the prose author. SimCore makes sure the prose is generated under the correct conditions. The Main Model is the renderer.

This rule applies to minis, major architecture work, cache research, diagnostics, UI, recovery, and performance optimization alike.
