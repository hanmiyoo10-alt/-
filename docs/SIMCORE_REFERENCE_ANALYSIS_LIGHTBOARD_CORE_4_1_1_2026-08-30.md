# SimCore Reference Analysis - LightBoard Core 4.1.1

Date: 2026-08-30 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
🔦라이트보드 - 4.1.1
```

Archived source authority:

```text
references/simcore-plugin-idea-drop-2026-08-30/
```

Archived artifact SHA-256:

```text
fd97f4dab7b5fd1749dc4984d723790485fe37d0b54b9140eb54b518a7d1d6f5
```

Related first-pass analysis:

```text
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_COMMENTS_4_0_0_2026-08-30.md
```

This document analyzes the archived LightBoard core as an idea source. It does not authorize copying third-party implementation, does not alter SimCore runtime behavior, and does not modify `release-simcore`, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, or the frozen v0.70.1 design.

A public source-correlated implementation was also inspected at:

```text
repo: enzi221/risumo
commit: a3f2cc1531e1c0d116ce73a0bb25c7631a9ccb8f
paths: lb--be/*, skills/lightboard/references/*
```

The public source declares LightBoard backend version `4.1.1`, namespace `lightboard`, and identifies itself as `🔦라이트보드 - 4.1.1`. This source correlation is useful for architecture analysis, but the archived user-supplied artifact remains the local reference authority.

The public Lua source headers inspected for the backend/prelude state `CC BY-NC-SA 4.0`. This analysis extracts concepts only. No third-party implementation is promoted into SimCore by this document.

---

## 1. Executive finding

LightBoard Core 4.1.1 is not primarily a visual board plugin.

It is a small framework for running **module-scoped auxiliary LLM jobs** around a main roleplay conversation.

Its main architecture is:

```text
frontend declares capability + prompt fragments
        ↓
backend discovers manifest
        ↓
backend projects bounded context for that frontend
        ↓
backend dispatches main/aux LLM request
        ↓
frontend validator judges structured result
        ↓
backend may retry/fix
        ↓
frontend post-processor normalizes result
        ↓
backend writes structured LBDATA sidecar
        ↓
renderer presents module-specific UI
        ↓
reroll / interaction can target one module later
```

The strongest SimCore-relevant concepts are not the auxiliary model calls themselves.

The strongest concepts are:

1. **Owner-Scoped Context Projection**
2. **Effect-Class Contract**
3. **Declarative Capability Manifest**
4. **Sidecar / Visible-Output Separation as a first-class protocol**

The first two are the highest-value research candidates.

The auxiliary-request framework, dynamic callback loading, concurrent provider routing, and direct history mutation should not be copied into the current SimCore runtime.

---

## 2. What the core owns

Public version-correlated `lb--be/charx.json` declares:

```text
name        = 🔦라이트보드 - 4.1.1
namespace   = lightboard
version     = 4.1.1
lowLevelAccess = true
```

The backend bundles:

```text
lorebooks
  LBDATA information
  character description adapter
  max-context adapter
  image utility
  lightboard-prelude
  TOON encode/decode

runtime trigger modules
  init
  constants
  manifest
  prompts
  pipeline
  lbdata
  sideeffect

regex presentation/process filters
  output removal
  display cleanup
  built-in icon rendering
  platform area rendering
  interaction metadata exclusion
  lazy/default compatibility filters
```

This is the shared machinery delegated to by LightBoard frontends such as Comments and Miniboard.

The Comments plugin therefore should not be interpreted as independently owning:

```text
request orchestration
context truncation
model routing
validation retry loop
LBDATA placement
reroll routing
interaction routing
shared XML/node helpers
shared HTML helper behavior
```

Those are backend responsibilities.

---

## 3. LightBoard as a microkernel-like frontend protocol

Every frontend is discovered through a lorebook named:

```text
manifest.lb
```

The manifest declares a unique identifier and optional capabilities/configuration.

Observed fields include:

```text
identifier
authorsNote
charDesc
personaDesc
loreBooks
maxCtx
maxLogs
multilingual
reiteration
sideEffect
lazy
thoughts
```

The backend also resolves optional callbacks by convention:

```text
{identifier}.lb.onInput
{identifier}.lb.onOutput
{identifier}.lb.onMutation
{identifier}.lb.onValidate
```

and prompt fragments such as:

```text
{identifier}.lb
{identifier}.lb.format
{identifier}.lb.job
{identifier}.lb.thoughts
{identifier}.lb.thoughts-interaction
{identifier}.lb.prefill
{identifier}.lb.prefill-user
{identifier}.lb.universe
{identifier}.lb.extra
```

This means a frontend mostly declares:

```text
what it needs
what it may do
how its result should look
how to validate it
how to render it
```

while the backend owns the execution lifecycle.

That is materially different from a monolithic plugin where every feature directly owns request, parsing, storage, interaction, and rendering code.

---

## 4. Owner-Scoped Context Projection

### 4.1 Mechanism

The prompt builder does not blindly hand every frontend the full chat plus every other module's data.

For each manifest, the backend can independently bound:

```text
maxLogs
maxCtx
include/exclude user messages
authors note inclusion
character description inclusion
persona description inclusion
lorebook inclusion
```

The prompt compiler also removes unrelated XML-style module nodes from supplied materials, retaining only the current frontend identifier where appropriate.

Conceptually:

```text
full conversation / world material
        ↓
frontend-specific projection
        ↓
auxiliary request
```

The projection is therefore both:

```text
temporal
  recent N logs / token budget

semantic
  retain current module's relevant nodes
  remove other structured module payloads
```

### 4.2 Why this matters for SimCore

SimCore already has ownership-scoped **developer read scope**:

```text
READ SCOPE = ownership-bounded by default
VALIDATION SCOPE = full applicable release guards
```

LightBoard applies a similar principle at runtime prompt construction:

```text
CONTEXT SCOPE = job-bounded by default
```

The idea is relevant to recurrent SimCore concerns:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
stale previous-task frame influence
Community source/audience relevance
long-chat context pressure
```

The direct LightBoard mechanism cannot simply be copied because SimCore is not currently a multi-request auxiliary-LLM framework.

The transferable concept is narrower:

> A semantic owner should consume the minimum bounded historical/context projection required to perform its current job, while continuity authority remains available through explicitly owned facts.

Potential future SimCore formulation:

```text
Current user task authority
        +
explicit continuity facts
        +
owner-relevant prior evidence
        -
completed unrelated task frames
        -
unrelated sidecar payloads
        ↓
Owner-Scoped Context Projection
```

This would be a prompt architecture research direction, not an authorized v0.70.1 change.

### 4.3 Classification

```text
PROMISING · OWNER_SCOPED_CONTEXT_PROJECTION
```

Reason:

- directly relevant to long-chat replay/context pressure;
- concept aligns with existing SimCore ownership discipline;
- can potentially be adapted without requiring auxiliary LLM calls;
- requires source-proven prompt ownership and live evidence before promotion.

---

## 5. Effect-Class Contract

### 5.1 LightBoard rule

LightBoard distinguishes two frontend classes.

Default pure frontend:

```text
sideEffect = false
```

A pure frontend may produce its own structured LBDATA block but may not modify the main chat body.

Advanced frontend:

```text
sideEffect = true
```

A side-effect frontend may return an edited full target chat and optional LBDATA payload.

The framework documentation explicitly describes `sideEffect` as an advanced capability.

### 5.2 Why this matters for SimCore

SimCore Contracts v2 already encode layer/dependency ownership, for example:

```text
Validation = judge-only
Representation = memory-only identity/provenance authority
Output Finalize = pure deterministic transition
Runtime Mirror = host observation/application transport owner
Observability = bounded facts, no business-state mutation
```

But the LightBoard pattern highlights a separate axis:

```text
WHAT MAY THIS OWNER MUTATE?
```

A future non-runtime architecture contract could make effect permissions explicit, for example:

```text
PURE
STATE_ONLY
OBSERVE_HOST
WRITE_HOST
PERSIST_STATE
HISTORY_MUTATION
```

This does not imply these exact labels should be adopted.

The useful concept is to make mutation privilege machine-auditable independently from layer placement.

A hypothetical architecture guard could then reject cases such as:

```text
judge-only validator performs host write
Domain helper writes chat history
Observability mutates business state
pure finalizer performs storage I/O
```

Many of these are already textually forbidden in SimCore design. The idea is to represent them as a more direct capability/effect contract.

### 5.3 Classification

```text
PROMISING · EFFECT_CLASS_CONTRACT
```

Best initial form if ever promoted:

```text
NON_RUNTIME architecture metadata / static checker first
```

Not:

```text
new dynamic runtime permission system
```

That distinction keeps it compatible with the current M2 architecture freeze.

---

## 6. Declarative Capability Manifest

### 6.1 LightBoard rule

Frontend behavior is discovered from a manifest instead of hard-coded per frontend in the backend.

The backend resolves:

```text
configuration
context needs
model mode
side-effect capability
lazy behavior
self-review count
validation callback
input/output/mutation callbacks
```

The execution lifecycle is generic.

### 6.2 SimCore relevance

SimCore already has:

```text
config/simcore-architecture-v2.json
ownership-scoped update workflow
module dependency checker
```

Therefore the useful adaptation is not dynamic runtime frontend registration.

The useful adaptation would be extending static architecture metadata, if future evidence justifies it, with machine-readable owner properties such as:

```text
layer
semantic owner role
effect class
host access allowance
persistence allowance
prompt participation
observability status
cross-cutting invariants
```

This could improve:

```text
ownership-scoped developer reading
static drift checks
future automated change-surface selection
review of illegal side effects
```

### 6.3 Classification

```text
WATCH / PROMISING · DECLARATIVE_CAPABILITY_MANIFEST
```

Why not immediate PROMISING implementation:

- M2 architecture is frozen at M2-6;
- current architecture JSON may already contain enough information for present needs;
- adding metadata without a source-proven enforcement gap would be architecture ceremony;
- runtime dynamic discovery is explicitly not needed.

Promotion requires a concrete SimCore maintenance problem that current architecture metadata cannot express.

---

## 7. LBDATA sidecar protocol

### 7.1 Mechanism

Generated auxiliary data is stored in a clearly delimited block:

```text
---
[LBDATA START]
...
[LBDATA END]
---
```

The backend can place this:

```text
below main output
above main output
in a separate assistant message
```

A regex can remove LBDATA from final main output processing, while renderers can still transform module nodes for display.

This creates three distinct concepts:

```text
main narrative text
structured auxiliary data
rendered presentation
```

### 7.2 SimCore comparison

SimCore already separates several representations:

```text
visible assistant output
portable state
host-local telemetry
canonical / host-raw / fresh identity facts
probe diagnostics
```

Therefore LBDATA does not reveal an entirely new architectural need.

Its value is mainly reinforcement:

> Storage/transport representation and user-facing presentation should remain separable contracts.

This reinforces the Comments analysis finding:

```text
Display / Model-Context Separation
```

### 7.3 Classification

```text
REINFORCES EXISTING · SIDECAR_PRESENTATION_SEPARATION
```

No new SimCore storage block is proposed.

---

## 8. Validation, retry, and reiteration pipeline

LightBoard pipeline stages include:

```text
prompt build
LLM request
output cleanup
optional reiteration/self-review
frontend validation
optional corrective retry
frontend output post-processing
```

A recoverable validator error is specially marked and can feed a correction request back to the model.

The backend also supports choosing the main or auxiliary model for retry.

### 8.1 Good concept

The strong concept is:

```text
generation does not define correctness
validation defines acceptance
```

SimCore already follows this philosophy strongly through:

```text
Structure judge-only validation
representation identity checks
strict mirror gates
frame/continuity guards
static/CI contracts
```

### 8.2 Why the retry loop should not transfer now

Automatic extra LLM requests would change:

```text
latency
cost
request count
provider/cache behavior
turn lineage
failure semantics
```

Current SimCore has an active cold first-turn performance attribution lane and frozen network/provider-routing policy.

Therefore model-based correction retries are not a safe near-term adaptation.

### 8.3 Classification

```text
REINFORCES EXISTING · VALIDATION_AS_AUTHORITY
DEFER · MODEL_BASED_AUTOFIX_RETRY
DEFER · REITERATION_SELF_REVIEW_LOOP
```

---

## 9. Lazy execution

A LightBoard frontend may be configured:

```text
lazy = true
```

Instead of immediately issuing an auxiliary LLM call, the backend writes a lightweight `<lb-lazy>` placeholder. A UI action later requests generation for that specific frontend.

### SimCore idea value

The concept is attractive for optional enrichment that should not burden every turn.

Possible abstract use cases in a different future architecture:

```text
optional deep Community expansion
optional detail card
optional diagnostics explanation
optional world-state visualization
```

But current SimCore semantics treat core output generation, continuity, Community behavior, lineage and state transitions as one authoritative turn lifecycle.

Adding post-turn semantic generation would require explicit decisions for:

```text
turn binding
lineage
reroll/edit reconciliation
state authority
frame/clock impact
history visibility
current-task primacy
```

### Classification

```text
DEFER · LAZY_OPTIONAL_ENRICHMENT
```

Interesting product idea, not current runtime work.

---

## 10. Per-module reroll and interaction protocol

LightBoard can reroll one frontend without rerolling the entire main assistant response.

It also supports targeted interactions:

```text
lb-interaction__{identifier}__{action}
```

with optional targeting/modifiers such as:

```text
id=...
preserve
immediate
```

This is a strong UX idea for structured sidecars.

The conceptual transaction is:

```text
select one structured object
+ action
+ optional user direction
→ regenerate/update only that object
```

### SimCore relevance

This resembles a future form of targeted Community or structured-state interaction, but the direct LightBoard implementation relies heavily on locating and rewriting prior chat contents with `setChat`.

That conflicts with SimCore's hard-earned lineage/edit/representation invariants.

If SimCore ever adopts a targeted interaction concept, the safe adaptation should look more like:

```text
new ordinary user turn
+ explicit target/action envelope
+ immutable prior history as evidence
+ new authoritative output
```

not:

```text
silent rewrite of historical assistant content
```

### Classification

```text
DEFER · TARGETED_SIDECAR_INTERACTION
DO_NOT_TRANSFER · DIRECT_HISTORICAL_CHAT_REWRITE
```

---

## 11. Concurrent module generation

LightBoard can execute multiple frontend pipelines concurrently with a configured bound:

```text
1..5 workers
```

Result order is preserved by manifest index.

This is sensible for independent auxiliary requests.

### SimCore relevance

Current SimCore does not have the same workload model.

Blindly introducing concurrent generation would create new questions around:

```text
provider routing
cache interaction
turn ordering
state commit order
host writes
failure isolation
latency attribution
```

Current v0.70.1 design is specifically attempting to identify cold first-turn tail ownership before optimization.

### Classification

```text
DEFER · CONCURRENT_SEMANTIC_GENERATION
```

Do not mix this idea into the current performance lane.

---

## 12. Main / auxiliary model routing

LightBoard manifests select main or auxiliary LLM mode, and the backend can emit a routing marker for provider plugins.

This makes each frontend independently routable.

### SimCore boundary

SimCore Contracts v2 currently freeze:

```text
network/timer/provider-routing policy
provider cache = UNVERIFIED
```

Therefore this mechanism is outside present SimCore authority.

### Classification

```text
DEFER · PER_OWNER_PROVIDER_ROUTING
```

This is an external architecture idea only.

---

## 13. Dynamic callback loading and low-level access

The backend loads module callback source from lorebooks using dynamic Lua loading.

The module itself declares:

```text
lowLevelAccess = true
```

This enables a flexible plugin framework but creates a very different trust model from SimCore's compiled single-runtime ownership graph.

### SimCore judgment

Do not transfer dynamic executable callback registration into SimCore.

It would weaken:

```text
static ownership proof
architecture dependency checks
release artifact determinism
change-surface review
CI reasoning
```

### Classification

```text
DO_NOT_TRANSFER · DYNAMIC_RUNTIME_CALLBACK_LOADING
```

If SimCore ever adopts manifest-like metadata, it should remain static data and compiled ownership, not runtime-loaded executable policy.

---

## 14. Direct history mutation is the largest incompatibility

The backend uses `setChat` in several lifecycle paths:

```text
insert/update LBDATA
sideEffect application
reroll preparation
reroll rollback
interaction application
force rerender
```

LightBoard's product model treats historical chat text as an editable application surface.

SimCore's current model is much stricter because it must distinguish:

```text
genuine user edit
reroll
host representation drift
Fresh identity evidence
canonical equivalence
current turn binding
stale probe contexts
```

Silently rewriting older assistant history would materially expand the state space and could invalidate representation/edit reconciliation assumptions.

### Classification

```text
DO_NOT_TRANSFER · HISTORICAL_SETCHAT_MUTATION_MODEL
```

This conclusion reinforces the Comments analysis.

---

## 15. Prompt projection details worth retaining as research patterns

LightBoard's prompt builder has several bounded techniques that are independently useful as ideas:

### 15.1 Explicit context reserve

It reserves space for instructions and a minimum chat budget before adding additional material.

Transferable principle:

```text
budget instructions and active-task evidence before optional historical material
```

### 15.2 Chronological bounded backfill

It scans recent chats backward under a token/log cap, then restores chronological order.

Transferable principle:

```text
recent evidence selection may be bounded independently from presentation order
```

### 15.3 User-message inclusion policy

Frontend request context can include or exclude user messages depending on job needs.

Transferable principle:

```text
context inclusion should be purpose-driven, not assumed universal
```

For SimCore, current user input remains primary authority and must never be accidentally excluded from present-task generation. Therefore this principle applies only to secondary projections, never to current-task authority.

### 15.4 Strip unrelated structured payloads

Module-specific context removes unrelated XML blocks.

Transferable principle:

```text
structured sidecars should not automatically become universal semantic context
```

This strongly aligns with the previous Comments `Community Sidecar Context Aperture` finding.

---

## 16. Relationship to the Comments 4.0.0 findings

Comments 4.0.0 identified:

```text
PROMISING · Audience Knowledge Boundary
PROMISING · Community Sidecar Context Aperture
DEFER     · Structured Community Sidecar + validator/renderer
DEFER     · Targeted Interaction Transaction
WATCH     · stable Community identities
DO NOT TRANSFER · direct historical setChat mutation
```

Core 4.1.1 clarifies where these actually live.

### Audience Knowledge Boundary

Mostly frontend semantic policy.

The backend provides the projection machinery that can enforce bounded inputs, but the frontend decides what its simulated audience is allowed to know.

### Community Sidecar Context Aperture

The backend framework strongly supports this concept through:

```text
maxLogs / maxCtx
node removal
process/display separation
lazy/sidecar representation
```

### Structured Sidecar

The backend is the general execution protocol that makes this reusable across multiple frontends.

### Targeted Interaction

The backend owns the common reroll/interaction transaction routing.

### Historical mutation warning

The incompatibility is not a Comments-specific quirk. It is a framework-level LightBoard assumption.

That increases confidence in the SimCore `DO NOT TRANSFER` classification.

---

## 17. Idea scorecard

| Idea | Classification | SimCore value | Near-term fit |
| --- | --- | --- | --- |
| Owner-Scoped Context Projection | PROMISING | High | Research/design only |
| Effect-Class Contract | PROMISING | High | Best as non-runtime metadata/checker first |
| Declarative Capability Manifest | WATCH / PROMISING | Medium-High | Only if a real architecture expression gap appears |
| Sidecar / presentation separation | REINFORCES EXISTING | Medium | Already substantially present |
| Validation as acceptance authority | REINFORCES EXISTING | High | Already core SimCore philosophy |
| Lazy optional enrichment | DEFER | Medium | Requires new lifecycle/lineage contract |
| Targeted sidecar interaction | DEFER | Medium-High | Must be new-turn based if ever adopted |
| Model-based autofix retry | DEFER | Medium | Latency/cost/provider semantics |
| Reiteration self-review | DEFER | Low-Medium | Extra model calls |
| Concurrent semantic generation | DEFER | Medium | Wrong time during cold-tail attribution |
| Per-owner provider routing | DEFER | Medium | Provider/network policy frozen |
| Dynamic runtime callbacks | DO NOT TRANSFER | Low for SimCore | Conflicts with static architecture authority |
| Historical setChat mutation model | DO NOT TRANSFER | Negative | Conflicts with lineage/edit/representation invariants |

---

## 18. Strongest future design seed: Context Projection by Owner

The most SimCore-shaped idea extracted from the backend is:

```text
Context Projection by Owner
```

Possible abstract contract:

```text
Current Task Projection
  current user input = mandatory primary authority
  explicit continuation request = preserved
  unrelated completed-task frame = excluded

Community Projection
  current exposed source evidence
  audience-visible world facts
  bounded relevant prior Community identity/context
  unrelated hidden world facts = excluded

Continuity Projection
  durable world facts
  open scene state
  frame/time facts
  completed response formatting/task frame = excluded unless explicitly reused
```

This is only a research seed.

It does not authorize new prompt sections, new state, or a v0.70.1 scope change.

Its value is that it generalizes two independent pieces of evidence:

```text
v0.70 Current Task Primacy
+
LightBoard owner-scoped context projection
```

into one future question:

> Can SimCore make continuity more reliable by explicitly projecting context according to semantic ownership instead of letting every historical representation remain equally eligible?

That question is worth preserving for post-v0.70.1 roadmap review.

---

## 19. Strongest future architecture seed: Effect Rights

A second research seed is:

```text
Effect Rights
```

Current SimCore architecture primarily encodes:

```text
layer
owner
dependency direction
```

A future static-only extension might encode:

```text
mayObserveHost
mayWriteHost
mayPersist
mayMutatePortableState
mustRemainPure
```

Again, exact fields are not proposed.

The research question is:

> Would explicit effect rights catch real SimCore ownership drift that dependency-layer rules alone cannot catch?

Promotion criteria should require an actual gap or recurrence.

Do not add architecture metadata merely because LightBoard has an analogous manifest field.

---

## 20. Preserved caution: architecture attraction is not evidence

LightBoard is elegant because it solves a different product problem:

```text
many independent auxiliary UI/data generators
```

SimCore solves:

```text
one authoritative long-running roleplay/runtime contract
with continuity, lineage, edit/reroll safety, representation identity,
Community semantics, state persistence and host observability
```

Therefore:

```text
similar-looking abstraction
!=
compatible implementation
```

The reference should be used to sharpen design questions, not to justify a framework rewrite.

---

## 21. Interaction with current v0.70.1 work

Current selected design:

```text
v0.70.1 Cold First-Turn Tail Attribution
```

This reference analysis does not alter it.

Specifically, do not add during v0.70.1:

```text
manifest registry
context projection refactor
auxiliary LLM calls
concurrent generation
lazy generation
provider routing
new sidecar protocol
new history mutation path
```

The only relationship is conceptual:

```text
LightBoard proves that auxiliary framework orchestration can become large and latency-sensitive.
```

That is additional reason not to mix new orchestration into a release whose job is attribution of an existing cold first-turn tail.

---

## 22. Next reference-analysis order

After Core 4.1.1, the best next artifact is:

```text
LightBoard Miniboard 4.1.1
```

Reason:

- Core now explains the shared execution protocol.
- Miniboard is a frontend that can be judged against that protocol.
- It should reveal how much UI/data composition can be achieved without owning backend orchestration.
- It provides a useful contrast with the Comments frontend.

Then:

```text
LightBoard Hunternet 4.0.0
```

Finally:

```text
risuai-scripting-skill.zip
```

The scripting skill is best read after the concrete modules so its API guidance can be interpreted against observed usage.

---

## 23. Final disposition

```text
REFERENCE_ANALYSIS = COMPLETE
RUNTIME_CHANGE = NONE
RELEASE_SIMCORE_CHANGE = NONE
LATEST_INSTALL_CHANGE = NONE
V07001_SCOPE_CHANGE = NONE

PROMISING
  OWNER_SCOPED_CONTEXT_PROJECTION
  EFFECT_CLASS_CONTRACT

WATCH / PROMISING
  DECLARATIVE_CAPABILITY_MANIFEST

REINFORCES_EXISTING
  SIDECAR_PRESENTATION_SEPARATION
  VALIDATION_AS_AUTHORITY

DEFER
  LAZY_OPTIONAL_ENRICHMENT
  TARGETED_SIDECAR_INTERACTION
  MODEL_BASED_AUTOFIX_RETRY
  REITERATION_SELF_REVIEW_LOOP
  CONCURRENT_SEMANTIC_GENERATION
  PER_OWNER_PROVIDER_ROUTING

DO_NOT_TRANSFER
  DYNAMIC_RUNTIME_CALLBACK_LOADING
  HISTORICAL_SETCHAT_MUTATION_MODEL
```

The main durable takeaway is:

> LightBoard's best lesson for SimCore is not "use a second model". It is "make context visibility and mutation privilege explicit per semantic owner."
