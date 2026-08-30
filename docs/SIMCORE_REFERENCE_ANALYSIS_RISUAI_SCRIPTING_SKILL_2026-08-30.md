# SimCore Reference Analysis - RisuAI Scripting Skill Pack

Date: 2026-08-30 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
risuai-scripting-skill.zip
```

Archived source authority:

```text
references/simcore-plugin-idea-drop-2026-08-30/
```

Archived artifact SHA-256:

```text
bce7013f542b7947a48a192e971b7be20e2cea2d1061b4b9ea3e20ef79c90431
```

Local reconstruction during this analysis produced the same SHA-256, so archive reconstruction integrity is PASS.

Internal file set:

```text
risuai-scripting/SKILL.md
risuai-scripting/references/cbs.md
risuai-scripting/references/schemas.md
risuai-scripting/references/lua.md
risuai-scripting/references/triggers-and-regex.md
risuai-scripting/references/interop.md
risuai-scripting/references/plugins.md
```

Related LightBoard analyses:

```text
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_COMMENTS_4_0_0_2026-08-30.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_CORE_4_1_1_2026-08-30.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_MINIBOARD_4_1_1_2026-08-30.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_HUNTERNET_4_0_0_2026-08-30.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_NEWS_4_0_0_2026-08-30.md
```

This document analyzes the user-supplied skill pack as an external idea/reference source. It does not authorize copying third-party implementation and does not alter SimCore runtime behavior, `release-simcore`, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, v0.70.1, R2.9, current state/schema ownership, or release authority.

For correlation only, current public RisuAI source was inspected at:

```text
repo: kwaroran/Risuai
main observed: 984f46b7306ca38312a043e0ef28d447f2a92766
files inspected:
  src/ts/process/scriptings.ts
  src/ts/process/triggers.ts
  src/ts/plugins/apiV3/risuai.d.ts
```

The archived skill pack remains the reference artifact authority.

---

## 1. Executive finding

The RisuAI Scripting Skill Pack is more valuable to SimCore as a **host-extension authority map** than as an API catalog.

It organizes extension behavior into distinct surfaces:

```text
CBS
Trigger / Regex
Lua trigger scripting
Plugin API v3
Module packaging
```

The strongest transferable lesson is the repeated separation of:

```text
semantic scope
execution phase
mutation privilege
persistence target
host/global reach
```

Strongest SimCore research candidates:

1. **Hook Effect Matrix**
2. **Least-Power Extension Selection**
3. **Execution-Context Isolation**
4. **Capability-Scoped Privileged API Surface**
5. **Snapshot-vs-Authority Reference Contract**
6. **Progressive-Disclosure Developer Reference Pack**

The artifact also strongly reinforces existing SimCore decisions around immutable history/provenance, presentation non-authority, explicit state ownership, phase ordering and least privilege.

The strongest negative evidence is concrete: a full-chat identity round-trip can be lossy when the public scripting view does not carry all underlying message metadata.

---

## 2. Progressive-disclosure reference design

`SKILL.md` is intentionally a routing document rather than one enormous manual:

```text
CBS                   -> cbs.md
trigger / regex       -> triggers-and-regex.md
Lua                   -> lua.md
plugin v3             -> plugins.md
cross-layer ordering  -> interop.md
JSON object shapes    -> schemas.md
```

The top-level skill also tells the developer which layer to choose for each type of work.

This is a useful maintenance pattern by itself:

```text
small routing index
+ focused capability references
+ source-code locations
+ common-trap summaries
```

Classification:

```text
PROMISING / REINFORCING · PROGRESSIVE_DISCLOSURE_DEVELOPER_REFERENCE
REINFORCES EXISTING · OWNERSHIP_BOUNDED_READ_SCOPE
```

SimCore relevance:

A large plugin should not require every maintainer/agent to load the entire file before making a narrow change. A future documentation-only maintenance task could provide owner/module-specific reference sheets containing exact source files, invariants, forbidden effects and targeted validation commands.

This is documentation/tooling architecture, not runtime behavior.

---

## 3. Least-Power Extension Selection

The skill pack provides a clear extension-scope ladder.

Conceptually:

```text
prompt substitution / conditional text  -> CBS
text transform / display-process hook    -> regex or narrow edit hook
stateful character logic / interactions  -> trigger / Lua
LLM, network, image privileged action    -> low-level Lua capability
app-global UI/provider/request hooks      -> plugin API v3
reusable character-independent bundle    -> module
```

The reusable principle is:

> Choose the narrowest authority/effect surface that can perform the semantic job.

Classification:

```text
PROMISING · LEAST_POWER_EXTENSION_SELECTION
```

Potential SimCore form:

```text
architecture/review rule first
static CI metadata only if a real enforcement gap later appears
```

Not:

```text
new dynamic extension framework
```

---

## 4. Hook Effect Matrix

This is the strongest architectural synthesis from the skill pack.

RisuAI hooks with similar scripting power have materially different semantics by lifecycle phase.

Examples described by the pack:

```text
onInput
  runs before the new user message is appended
  cannot cancel send

onStart
  runs every send during prompt construction
  can cancel send

editRequest
  may transform request messages
  low-level access is suppressed

onOutput
  runs after response storage + variable pass
  may write durable chat state

editDisplay
  reruns for presentation
  writes are temporary/non-persistent
  privileged mutation is heavily restricted

plugin output listener
  observes a committed snapshot
  listener arguments are not themselves write-through authority
```

A hook contract therefore needs more than a name and chronological position.

Useful abstract matrix:

| Dimension | Question |
| --- | --- |
| Read scope | What state/evidence may this hook observe? |
| Mutation scope | What may it change? |
| Persistence | Do writes survive this execution/render? |
| Cancellation | Can it stop the enclosing operation? |
| Host privilege | Can it access network/model/DB/main DOM? |
| Ordering | What ran before it and who consumes its result? |
| Re-entry | Does reroll/edit/reload/render execute it again? |
| Authority | Is the object a snapshot, working copy, or canonical target? |

Classification:

```text
PROMISING · HOOK_EFFECT_MATRIX
```

Relationship to LightBoard Core:

```text
Effect-Class Contract
+ phase-specific semantics
= Hook Effect Matrix
```

Potential SimCore value:

- prevents observability from drifting into state mutation;
- sharpens request/output/display ownership;
- makes reroll/edit/reload re-entry explicit;
- gives static review a direct vocabulary for host observation vs host mutation;
- helps reason about hook cleanup/reload safety.

No runtime change is authorized here.

---

## 5. Execution-Context Isolation

The pack emphasizes that Lua engines are separated by trigger mode.

Conceptually:

```text
onInput engine != onOutput engine != editDisplay engine
manual trigger names may identify separate engines
```

Lua globals therefore are not durable cross-phase state.

State that must survive or cross phases goes through an explicit chat-state surface.

Current public RisuAI source correlates this by maintaining scripting engine state keyed by mode and reusing/recreating mode-specific engines.

Transferable rule:

```text
EXECUTION_LOCAL_MEMORY != DURABLE_SEMANTIC_STATE
```

Classification:

```text
PROMISING / REINFORCING · EXECUTION_CONTEXT_ISOLATION
```

This maps to distinctions already important in SimCore:

```text
request-local prepared values
runtime-generation local telemetry
portable state
host-local observation
canonical conversation/history evidence
```

---

## 6. Shared variable bus: useful interop, wrong direct storage model

CBS, Lua and trigger variables share one chat-variable storage surface. This makes cross-layer interop convenient.

The cost is that the interface is heavily string/namespace oriented and allows multiple execution layers to address the same bag.

Classification:

```text
WATCH · SHARED_CROSS_LAYER_STATE_BUS
DO NOT TRANSFER · UNOWNED_STRINGLY_GLOBAL_STATE
```

SimCore should preserve:

```text
one semantic owner per state field
schema-bounded mutation
explicit provenance
```

The transferable lesson is to define intentional interoperability points, not to create one giant shared global variable store.

---

## 7. Capability-scoped privileged APIs

The pack identifies `triggerId` as an access key supplied to scripting APIs.

Current public `scriptings.ts` maintains distinct capability sets for ordinary/safe execution, display execution and low-level execution. APIs verify the supplied id before allowing effects.

Low-level access gates capabilities such as:

```text
LLM / auxiliary LLM
network request
image generation
similarity
active lorebook loading
```

The network surface stays bounded even after privilege is granted:

```text
HTTPS only
URL-length bound
request-rate bound
selected internal domains blocked
```

Plugin API v3 separately permission-gates sensitive app-global capabilities such as DB, main DOM, request replacers/interceptors, fetch logs, provider registration, send-chat and inlay access.

Classification:

```text
PROMISING / REINFORCING · CAPABILITY_SCOPED_PRIVILEGED_API
```

This reinforces the earlier Effect-Class/Least-Privilege findings.

If SimCore ever needs stronger machine-readable architecture metadata, one useful question is:

```text
which privileged effects may this owner invoke?
```

Recommended first form is static metadata/CI, not a new runtime permission engine.

---

## 8. Phase order is semantic authority

`interop.md` documents a detailed per-turn pipeline containing input triggers, text transforms, variable passes, prompt/lore construction, start hooks, process/request hooks, HTTP replacers, output transforms, output triggers, committed-output listeners and display transforms.

The important transferable point is:

> Two transforms touching the same text are not interchangeable when they run on opposite sides of state capture, prompt construction, response commit, variable evaluation or display sanitization.

Reroll also re-enters only a subset of the pipeline, so side effects in those phases may repeat.

Classification:

```text
REINFORCES EXISTING · PHASE_ORDER_IS_SEMANTIC_AUTHORITY
PROMISING DOCUMENTATION FORM · PHASE_REENTRY_MATRIX
```

This directly reinforces SimCore's focus on request/output timing, reroll lineage, edit reconciliation, reload generations and stale-probe freshness.

A future documentation artifact could explicitly mark which hooks are re-exercised by ordinary send, reroll, manual edit, reload and render-only refresh.

---

## 9. Presentation is intentionally non-authoritative

The pack distinguishes display/editDisplay behavior from persistent semantic state changes.

`editDisplay` is presentation-time work; its variable writes are temporary and privileged mutation is restricted.

Plugin v3 similarly recommends iframe-local UI and restricts/sanitizes main-DOM access.

Transferable principle:

```text
PRESENTATION EFFECT != SEMANTIC STATE WRITE
```

Classification:

```text
REINFORCES EXISTING · PRESENTATION_NONAUTHORITY
```

This aligns with previous LightBoard findings:

```text
Semantic Payload / Renderer Decoupling
Derived Presentation Sidecar Separation
Display / Model-Context Separation
```

---

## 10. Snapshot vs authority reference contract

Plugin v3 output listeners receive committed character/chat snapshots. The pack explicitly warns that mutating those callback arguments does not persist; indexed write APIs must be used for an actual write.

Useful rule:

```text
OBSERVED OBJECT != AUTHORITATIVE WRITE TARGET
```

This is reinforced by upstream RisuAI issue #1041, where `upsertLocalLoreBook` behaved differently across event paths because one path mutated a different chat object reference from the scripting engine's authoritative state.

Classification:

```text
PROMISING / REINFORCING · SNAPSHOT_VS_AUTHORITY_REFERENCE_CONTRACT
```

SimCore relevance:

- Runtime Mirror remains transport/application authority;
- Observability should return bounded facts, not mutate business state;
- stale/derived copies must not silently become write targets;
- freshness/current-generation authority must be explicit.

---

## 11. Full-history partial-view rebuild is a concrete anti-pattern

The pack exposes both individual chat mutation and whole-chat convenience APIs.

Current public RisuAI source shows a critical asymmetry:

```text
getFullChatMain
  exposes role, data, time

setFullChatMain
  rebuilds messages from role, data
```

Metadata outside the scripting view can therefore be destroyed by an apparently identity-preserving round-trip.

Open upstream issue `kwaroran/Risuai #1564` reports loss of fields including:

```text
chatId
time
generationInfo
promptInfo
saying
name
```

and observable consequences for bookmarks, generation metadata, reroll candidates, speaker identity and timestamp-dependent behavior.

Classification:

```text
DO NOT TRANSFER · FULL_HISTORY_REBUILD_FROM_PARTIAL_VIEW
STRONG EXTERNAL SUPPORT · IMMUTABLE_HISTORY / REPRESENTATION CONTRACT
```

This is one of the strongest external confirmations in the reference set for SimCore's existing history discipline.

A SimCore updater must never mean:

```text
read a lossy public view
-> reconstruct canonical message/history object
```

Fields not owned by an updater must be preserved by construction.

---

## 12. Silent privilege no-op is not a desirable diagnostic model

The skill warns that an incorrect/missing `triggerId` can make APIs quietly do nothing, and callback errors may be logged while the surrounding pipeline continues.

That can be acceptable in a user scripting environment, but it does not fit SimCore's evidence-first release process as a primary diagnostic model.

Classification:

```text
DO NOT TRANSFER · SILENT_PRIVILEGE_NOOP_AS_PRIMARY_DIAGNOSTIC
```

SimCore should continue preferring:

```text
fail-closed authority
bounded diagnostic facts
explicit WATCH / DEFER / FIX / BLOCKER evidence
```

---

## 13. Plugin v3 sandbox reinforces least privilege

The skill describes Plugin API v3 as:

```text
sandbox iframe
all API calls asynchronous
restricted main-DOM wrappers
sanitized HTML
permission-gated sensitive APIs
explicit unload cleanup
```

Current public `risuai.d.ts` independently states that all API calls cross an iframe/postMessage boundary and return Promises, and recommends avoiding main-document access where other APIs suffice.

Classification:

```text
REINFORCES PROMISING · LEAST_PRIVILEGE_HOST_INTEGRATION
```

SimCore should prefer bounded supported host/plugin APIs over fragile direct DOM/history manipulation.

---

## 14. Auxiliary model/network capability is not an adoption signal

RisuAI scripting can call extra models, network endpoints, image generation and similarity services; plugins can also add providers.

That demonstrates platform capability, not SimCore product need.

Additional calls change:

```text
latency
cache topology
provider behavior
cost
lineage/failure semantics
re-entry behavior
```

Classification:

```text
DEFER · AUXILIARY_MODEL_OR_NETWORK_RUNTIME_EXPANSION
```

Any future use needs an independent design/evidence lane and must not be mixed into unrelated correctness/performance work.

---

## 15. Two distinct research families

The prior LightBoard analyses primarily built a **Source Projection Envelope** around:

```text
knowledge boundary
exposure
reachability
propagation/publication maturity
source lens
assertion provenance
context aperture
```

The scripting skill is orthogonal. It builds a host/execution authority model around:

```text
where code runs
when it runs
what it may read
what it may mutate
what persists
what requires privilege
which object is authoritative
```

These should remain separate research families:

```text
SOURCE PROJECTION ENVELOPE
!=
HOST INTEGRATION / EFFECT ENVELOPE
```

Mixing them early would blur semantic source policy with runtime host authority.

---

## 16. Emerging Host Integration Envelope

A useful research-only synthesis is:

```text
Semantic Owner
      ↓
Execution Phase
      ↓
Read Scope
      ↓
Capability / Effect Class
      ↓
Authoritative Persistence Target
      ↓
Mutation / Cancellation Rights
      ↓
Re-entry Semantics
      ↓
Observability / Reconciliation
```

Questions:

```text
A. Who owns this semantic operation?
B. At what lifecycle phase does it execute?
C. What current/history/host material may it read?
D. Which effects are permitted?
E. Is the object a snapshot, working copy, or canonical authority?
F. What writes persist and where?
G. Can reroll/edit/reload/render re-enter it?
H. How is failure or stale authority observed?
```

Classification:

```text
PROMISING RESEARCH SYNTHESIS · HOST_INTEGRATION_ENVELOPE
```

This is a design/review lens, not a request to rebuild SimCore architecture.

---

## 17. Direct-transfer rejects

```text
DO NOT TRANSFER · FULL_HISTORY_REBUILD_FROM_PARTIAL_VIEW
DO NOT TRANSFER · UNOWNED_STRINGLY_GLOBAL_STATE
DO NOT TRANSFER · SILENT_PRIVILEGE_NOOP_AS_PRIMARY_DIAGNOSTIC
DO NOT TRANSFER · INCIDENTAL_REFERENCE_AS_PERSISTENCE_AUTHORITY
DO NOT TRANSFER · PRESENTATION_PHASE_DURABLE_BUSINESS_WRITE
DEFER          · AUXILIARY_MODEL_OR_NETWORK_RUNTIME_EXPANSION
```

Reasons:

- partial history views cannot safely reconstruct canonical message identity;
- cross-layer string bags weaken semantic ownership/schema control;
- silent no-op makes product evidence ambiguous;
- incidental object references can represent stale/snapshot state;
- display/render phases may re-enter and must not advance durable semantic state;
- additional model/network calls are architecture/performance changes.

---

## 18. Idea extraction matrix

| Idea | Classification | SimCore value |
| --- | --- | --- |
| Hook Effect Matrix | PROMISING · HIGH | phase, mutation, persistence and re-entry become auditable |
| Least-Power Extension Selection | PROMISING | keep changes inside narrow semantic/effect owner |
| Execution-Context Isolation | PROMISING / REINFORCING | prevents ambient cross-phase state leakage |
| Capability-Scoped Privileged API | PROMISING / REINFORCING | sharpens Effect-Class / least-privilege metadata |
| Snapshot-vs-Authority Contract | PROMISING / REINFORCING | prevents writes through stale/derived copies |
| Progressive-Disclosure Developer Reference | PROMISING / REINFORCING | reduces large-plugin maintenance/read cost |
| Phase/Re-entry Matrix | PROMISING documentation form | clarifies reroll/edit/reload/render behavior |
| Shared Cross-Layer State Bus | WATCH | useful interop concept, wrong direct storage model |
| Plugin iframe sandbox | REINFORCES EXISTING | prefer bounded supported host APIs |
| Full-history partial-view rebuild | DO NOT TRANSFER | metadata/identity destruction risk |
| Silent permission no-op | DO NOT TRANSFER | weak evidence/diagnostics |
| Presentation durable write | DO NOT TRANSFER | renderer re-entry/state drift risk |
| Extra model/network calls | DEFER | separate architecture/performance work |

---

## 19. Recommended research promotion order

If future SimCore evidence justifies promotion:

1. **Hook Effect Matrix**
   - documentation/static-review value without runtime mutation.
2. **Progressive-Disclosure Developer Reference**
   - directly addresses large-plugin maintainability.
3. **Capability/effect metadata refinement**
   - only if a concrete architecture-checking gap appears.
4. **Host Integration Envelope**
   - use as a design lens when a genuinely new hook/effect surface is proposed.

Do not create architecture ceremony solely because an external reference demonstrates a concept.

---

## 20. Product boundary

This analysis creates no implementation authority for:

```text
new Lua/CBS integration
new plugin API usage
new runtime permission engine
new provider/model calls
new network calls
history mutation
new persistent state/schema
v0.70.1 scope changes
R2.9 activation/release changes
release-simcore changes
```

Any promoted idea requires its own design/evidence record and ordinary SimCore lifecycle.

---

## 21. Final classification

```text
REFERENCE QUALITY                              = HIGH
ARCHIVE RECONSTRUCTION                         = PASS
DIRECT CODE REUSE AUTHORITY                    = NONE
SIMCORE FEATURE AUTHORITY                      = NONE

HOOK_EFFECT_MATRIX                             = PROMISING · HIGHEST ARCHITECTURE VALUE
LEAST_POWER_EXTENSION_SELECTION                = PROMISING
EXECUTION_CONTEXT_ISOLATION                    = PROMISING / REINFORCING
CAPABILITY_SCOPED_PRIVILEGED_API               = PROMISING / REINFORCING
SNAPSHOT_VS_AUTHORITY_REFERENCE                = PROMISING / REINFORCING
PROGRESSIVE_DISCLOSURE_DEVELOPER_REFERENCE     = PROMISING / REINFORCING
PHASE_REENTRY_MATRIX                           = PROMISING DOCUMENTATION FORM
HOST_INTEGRATION_ENVELOPE                      = PROMISING RESEARCH SYNTHESIS

SHARED_CROSS_LAYER_STATE_BUS                   = WATCH
AUXILIARY_MODEL_OR_NETWORK_EXPANSION           = DEFER

FULL_HISTORY_REBUILD_FROM_PARTIAL_VIEW         = DO NOT TRANSFER
UNOWNED_STRINGLY_GLOBAL_STATE                  = DO NOT TRANSFER
SILENT_PRIVILEGE_NOOP_DIAGNOSTIC               = DO NOT TRANSFER
INCIDENTAL_REFERENCE_AS_PERSISTENCE_AUTHORITY  = DO NOT TRANSFER
PRESENTATION_PHASE_DURABLE_BUSINESS_WRITE      = DO NOT TRANSFER

UPSTREAM_SET_FULL_CHAT_METADATA_LOSS            = EXTERNAL SUPPORTING EVIDENCE
UPSTREAM_EVENT_PATH_PERSISTENCE_DIVERGENCE      = EXTERNAL SUPPORTING EVIDENCE

RUNTIME / RELEASE-SIMCORE MUTATION              = NONE
```
