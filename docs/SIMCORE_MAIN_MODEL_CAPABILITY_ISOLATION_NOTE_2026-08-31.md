# SimCore Main-Model Capability Isolation Note

Date: 2026-08-31 KST

Status: **REFERENCE/DESIGN CLARIFICATION · NO IMPLEMENTATION AUTHORITY**

## Question

Would future source-sidecar features inspired by references such as HunterNet reduce the main model's reasoning quality?

## Conclusion

Not inherently.

A source-sidecar feature does not reduce the underlying capability of the main model merely by existing. The practical risk comes from how much sidecar-specific prompt material, state, derived assertions, and auxiliary output are injected into the main request.

The desired SimCore invariant is:

```text
SOURCE FEATURE EXISTENCE
!=
MAIN MODEL CONTEXT POLLUTION
```

and, more strongly:

```text
MAIN MODEL SEMANTIC JOB
receives only the minimum source-derived information required for that job.
```

## Role-boundary invariant

The intended architecture keeps the main model and the SimCore plugin in distinct roles.

```text
MAIN MODEL
- semantic reasoning
- world / character interpretation
- natural-language generation for the active semantic job
- integration of the bounded evidence intentionally projected to that job

SIMCORE PLUGIN
- semantic-owner selection
- current-task / source eligibility
- context and field projection
- state ownership and lifecycle
- channel reachability / timing policy
- source-sidecar orchestration
- validation / deterministic normalization
- rendering / presentation
- reroll, edit, reload and reconciliation plumbing
- optional auxiliary-model dispatch where separately authorized
```

The design target is therefore not:

```text
new feature
→ add more instructions and more history to the main model
```

It is:

```text
new feature
→ give the plugin a bounded owner and policy
→ project only the evidence needed by that semantic job
→ invoke generative reasoning only where generative reasoning is actually required
→ validate and render the result outside the main semantic job
```

A plugin cannot manufacture rich semantic language or world interpretation deterministically when the feature genuinely requires model reasoning. In that case the plugin should remain the orchestrator and authority boundary while either:

1. dispatching a bounded auxiliary request/model, if later authorized, or
2. asking the main model to perform a narrowly scoped semantic sub-job without importing the full sidecar prompt/history into the ordinary main response path.

This distinction matters:

```text
WHO ORCHESTRATES THE FEATURE = plugin
WHO PERFORMS GENERATIVE SEMANTIC REASONING, WHEN NEEDED = model
```

The plugin may still perform a large fraction of a HunterNet-like feature without model reasoning, including eligibility, timing, persistence, identity bookkeeping, counters, deterministic formatting, validation, rendering and context projection.

The main-model role should remain stable as source features are added. Feature growth should primarily increase plugin-side orchestration and bounded sidecar work, not the ordinary main-model prompt surface.

## Safe architecture direction

A HunterNet-like feature should remain a bounded semantic sidecar/source owner:

```text
canonical world / conversation evidence
        ↓ bounded projection
source-local owner
        ↓
source-local semantic payload
        ↓
renderer / presentation
```

The main model should not be forced to ingest the full source prompt, full source history, renderer/CSS data, generated usernames, vote counts, interaction scaffolding, or other source-local presentation data on every turn.

Where the main model needs awareness of a source result, it should receive a bounded semantic projection rather than the entire sidecar representation.

## Real quality risks

A future implementation could make the main model appear less capable if it causes any of the following:

1. **Token-budget dilution**
   - large source prompts or historical sidecars occupy context that should be available to the current task and continuity evidence.

2. **Instruction competition**
   - source-specific instructions are placed in the same authority space as main-role instructions and compete for model attention.

3. **Epistemic contamination**
   - rumors, comments, news claims, or generated source assertions are fed back as canonical world facts.

4. **Completed-frame replay pressure**
   - old source content remains in future prompts and causes stale topics to re-enter.

5. **Presentation leakage**
   - CSS, renderer metadata, image prompts, vote counts, and other presentation-only fields are carried into semantic reasoning.

6. **State/ownership ambiguity**
   - source-local state becomes globally writable/readable without a clear semantic owner.

These are context and architecture failures, not reductions in the model's underlying intelligence.

## Relationship to reference research

This note reinforces existing reference-map candidates:

- Owner-Scoped Context Projection
- Field-Level Context Projection
- Bounded Context Aperture
- Epistemic Sidecar Quarantine
- Semantic Payload / Renderer Decoupling
- Least-Power Extension Selection

Together they imply a useful future rule:

```text
SIDE EFFECT / SOURCE COMPLEXITY MAY GROW
while
MAIN REQUEST COMPLEXITY SHOULD GROW ONLY WHEN SEMANTICALLY REQUIRED.
```

## Auxiliary-model nuance

If a source sidecar is generated by a separate auxiliary request/model, the main model's reasoning capability is still not intrinsically reduced. Possible costs are instead:

- extra latency,
- provider/request quota pressure,
- scheduling contention,
- more state/reconciliation complexity.

Those costs must be measured separately from main-model output quality.

The current v0.70.1 Cold First-Turn Tail Attribution work must remain isolated from any auxiliary-request or source-sidecar expansion so latency attribution stays interpretable.

## Acceptance principle for any future implementation

A future HunterNet-like feature should not be accepted merely because the sidecar itself looks good.

Validation must include a **main-model non-regression lane** showing that ordinary long-chat tasks without source relevance retain at least baseline quality and behavior, with particular attention to:

- Current Task Primacy,
- long-chat continuity,
- token/context pressure,
- stale-topic replay,
- source-to-world fact leakage,
- latency attribution.

If source-disabled or source-irrelevant turns become measurably worse, the feature has violated isolation even if its own UI/output is correct.

## Classification

```text
PROMISING / REINFORCING · MAIN_MODEL_CAPABILITY_ISOLATION
PROMISING / REINFORCING · MAIN_MODEL_PLUGIN_ROLE_BOUNDARY
WATCH · CONTEXT_BUDGET_DILUTION
WATCH · INSTRUCTION_COMPETITION
BLOCKER for future source feature · SOURCE_ASSERTION_CANON_LEAK
BLOCKER for future source feature · SOURCE_IRRELEVANT_MAIN_MODEL_REGRESSION
```

## Authority boundary

This note creates no runtime, release, schema, provider, deployment, v0.70.1, or R2.9 authority. Any concrete implementation requires a later bounded design backed by SimCore-native evidence and the normal SimCore workflow.
