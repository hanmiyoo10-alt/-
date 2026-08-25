# SimCore Prompt / Runtime Boundary Cohesion Review — 2026-08-26

Status: `REVIEW COMPLETE · PROMPT REMAINS COHESIVE · TWO BOUNDARY DEBTS RECORDED · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Production authority: `release-simcore` v0.64.7.

Related:
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_APPLICATION_SERVICE_BOUNDARY_MAP_IDEA.md`
- `docs/SIMCORE_STATE_OWNERSHIP_REGISTRY_V2_IDEA.md`
- `docs/SIMCORE_CONTRACTS_V2_TRANSITION_DEBT_RETIREMENT_MAP_IDEA.md`
- `docs/SIMCORE_MODULE_COHESION_AUDIT_2026-08-26.md`
- `docs/SIMCORE_ARCHITECTURE_TESTABILITY_SURFACE_MAP_IDEA.md`
- current `release-simcore` v0.64.7 runtime source

## 1. Purpose

Review the boundary between the Application-layer `prompt` module and outer Runtime request handling.

The review asks:

```text
1. Does Prompt still primarily serialize already-decided authority facts?
2. Has Prompt acquired Store, Host, Runtime, history-scan, or semantic-state ownership?
3. Does Runtime treat rendered prompt bytes only as payload/observation, or as a control plane?
4. Are cache/topology observers consuming Prompt through a healthy structured boundary?
5. Does Evidence request fencing remain owned outside Prompt?
6. Does any current implementation detail violate the intended read-only serializer contract?
```

This is an ownership/cohesion review only.

It does not authorize:

```text
prompt wording changes
prompt byte changes
new generation guidance
new persistent state
new Host calls
new Store calls
new cache/provider claims
M2-3 implementation
M2-4 implementation
release-system changes
```

## 2. Constitutional target

Prompt's long-term identity remains:

```text
PROMPT
= PURE RUNTIME-PROMPT COMPILER / SERIALIZER
+ BOUNDED SERIALIZATION-METADATA PRODUCER
```

Prompt may:

```text
read already-established Core/Application state
query lower semantic owners through pure/bounded helpers
choose deterministic wording/ordering for frozen prompt contracts
partition rendered bytes into stable/slow/volatile identity tiers
return bounded projection metadata needed to describe what it rendered
```

Prompt must not:

```text
mutate semantic state
classify raw user input into new Core meaning
scan Host history to discover authority
read/write Store
read/write Host chat
own Evidence request-message mapping/fencing
own runtime cache/provider policy
own request placement in the Host message array
own Runtime lifecycle/epoch/location state
turn rendered prompt text into the authoritative source for non-rendering runtime decisions
```

Canonical distinction:

```text
SEMANTIC OWNER
→ decides the fact

PROMPT
→ serializes the fact

RUNTIME
→ places/observes/transports the compiled payload
```

## 3. Current v0.64.7 dependency shape

Current Prompt imports only:

```text
kernel
lifecycle
time
recurrence
```

No direct dependency was identified on:

```text
store
session
runtime-*
host
evidence
representation
output-compat
bootstrap-migration
ops
```

This is a healthy Application-to-lower-layer dependency shape.

Prompt does not directly call Host APIs, Store APIs, timers, network APIs, or history scanners.

Verdict:

```text
PROMPT_DEPENDENCY_COHESION
= PASS
```

## 4. Current compiler shape

`compileRuntimePromptParts(state)` currently:

```text
reconciles the supplied state through Kernel
reads `state.pending`
returns empty output when inactive
obtains expected Community block count from Lifecycle
compiles Stable / Slow / Mode / Conditional / Hot / Footer tiers
returns rendered text
returns stable/slow/volatile identity-tier text
returns a bounded Broadcast end projection receipt
```

The cache-aware compiler tier model remains cohesive with Prompt ownership because the tiering describes rendered prompt-byte identity, not provider-cache behavior.

Prompt does not claim provider cache hit/miss.

## 5. Healthy owner queries inside Prompt

### 5.1 Lifecycle query

Prompt calls the Lifecycle-owned `expectedCommunityBlocks(mode)` helper when serializing the expected output contract.

Classification:

```text
LOWER_OWNER_QUERY
= HEALTHY
```

Prompt does not independently reimplement the Community-block count decision.

### 5.2 Time query

Prompt calls the Time-owned `elapsedMinutes(start, previous)` helper to serialize bounded Broadcast elapsed-program metadata.

Classification:

```text
LOWER_OWNER_QUERY
= HEALTHY
```

Prompt does not own timestamp parsing/comparison arithmetic merely because it prints the result.

### 5.3 Recurrence query

Prompt may fall back to `recurrence.modeFamily(p.mode)` while serializing recurrence guidance when the already-carried mode-family field is unavailable.

Because this calls the Recurrence owner rather than duplicating the classifier, it is not a second semantic producer.

Classification:

```text
LOWER_OWNER_QUERY / DEFENSIVE PROJECTION
= KEEP
```

Do not expand this fallback into Prompt-owned recurrence classification.

## 6. Broadcast end authority helper — projection, not owner transfer

Current Prompt contains `broadcastEndAuthority(s, p)`.

The helper derives only from already-established state:

```text
pending mode == B_END
→ ENDING / ALLOWED / explicit-b-end

else broadcastLocked
→ OPEN / DENIED

else
→ CLOSED / NOT_APPLICABLE
```

It does not:

```text
parse raw user input
choose whether a request qualifies as B_END
mutate broadcastLocked
commit B_END
inspect Host/history
```

The underlying mode and lock state are established by Lifecycle/Application state before Prompt compilation.

Therefore current classification is:

```text
PROMPT_BROADCAST_END_AUTHORITY_HELPER
= BOUNDED SERIALIZATION PROJECTION
= NOT AN INDEPENDENT LIFECYCLE OWNER
= KEEP_WITH_GUARD
```

The name `authority` is semantically strong, so the guard is important:

```text
Prompt may project an authority label from owner-produced facts.
Prompt must never become the place that decides whether raw input earns that authority.
```

The same bounded projection is returned by `compileRuntimePromptParts()` and forwarded through Session for diagnostics.

No extraction is justified.

## 7. Request placement boundary — healthy

Prompt returns a `promptBlock` value through Session.

The outer Runtime request path performs the actual Host-request mutation:

```text
messages.push({ role: 'system', content: result.promptBlock })
```

Runtime then performs request-topology observation after placement.

Therefore:

```text
Prompt
→ owns bytes

Runtime
→ owns placement into request transport

request-topology observer
→ observes resulting Runtime request shape
```

Classification:

```text
PROMPT_REQUEST_PLACEMENT_BOUNDARY
= PASS
```

Do not move `messages.push(...)` into Prompt.

## 8. Cache / topology boundary — healthy structured metadata

Prompt returns:

```text
identityTiers.stable
identityTiers.slow
identityTiers.volatile
```

Runtime passes this bounded compiler metadata into the runtime prompt-cache observer.

The runtime cache observer remains outside Prompt and provider cache remains `UNVERIFIED`.

This is a healthy precedent for the desired boundary:

```text
Prompt knows the structure of the bytes it compiled.
Runtime knows observation/cache-topology lifecycle.
Provider cache truth remains external unless authoritative evidence exists.
```

Classification:

```text
PROMPT_CACHE_BOUNDARY
= PASS
```

Do not move runtime cache state, trajectory, provider claims, or continuity transport into Prompt.

## 9. Finding P1 — Prompt calls mutating `kernel.reconcileState(state)`

Current `compileRuntimePromptParts(state)` begins by obtaining:

```text
const s = kernel.reconcileState(state)
```

Current Kernel `reconcileState(raw)` normalizes by assigning fields onto the supplied object rather than returning a guaranteed read-only copy.

Therefore Prompt currently has an implementation path capable of mutating the semantic state object it was asked only to serialize.

This may often be idempotent in healthy production because Session state has already been reconciled, and no current user-visible correctness failure is established from it.

However the physical capability conflicts with the architectural contract:

```text
Prompt = serializer
Prompt semantic-state mutation permission = NONE
```

Classification:

```text
P1_PROMPT_RECONCILE_INPUT_MUTATION
= FIX
= ARCHITECTURE / OWNERSHIP DRIFT
= NON-CORRECTNESS-INCIDENT
= NON-BLOCKING FOR CURRENT v0.64.7 LIVE GATE
= NO IMPLEMENTATION AUTHORIZED BY THIS REVIEW
```

### 9.1 Target rule

Future Prompt compilation must operate on a read-only-equivalent state view.

Acceptable mechanical directions include:

```text
A. reconcile a bounded clone locally before serialization

or

B. make the caller contract guarantee already-reconciled input and remove Prompt-side reconciliation

or

C. introduce another proven read-only normalization view if one naturally exists later
```

Do not globally redesign `kernel.reconcileState` merely to fix Prompt unless a separate Kernel/state-boundary task proves that wider change safe.

The smallest safe fix should preserve:

```text
prompt bytes
state schema
Session state values
Store behavior
request ordering
cache identity tiers
performance within existing tolerance
```

### 9.2 Required proof for eventual fix

At minimum:

```text
input state deep-equivalent before vs after Prompt compile
A / B_START / B_CONTINUE / B_END / C prompt bytes unchanged
recurrence prompt bytes unchanged
source-handoff/source-lock prompt bytes unchanged
summary-scope prompt bytes unchanged
Narrative/post-B_END clock prompt bytes unchanged
identityTiers unchanged
no new Store/Host/network/timer surface
```

## 10. Finding P2 — rendered Prompt bytes are used as Runtime control signal for Evidence

Current outer Runtime creates `runtimeBudgetLines` by splitting the rendered `result.promptBlock`.

It then derives several observations by matching literal rendered lines.

Most of those are diagnostic observations such as:

```text
community guidance emitted
narrative progression line emitted
recurrence line emitted
handoff line emitted
lineage anchor emitted
```

For diagnostics that specifically answer "what bytes were actually emitted?", inspecting rendered bytes is legitimate.

However one derived flag is operational:

```text
sourceAnchor = rendered prompt contains
`short_community_source_is_authoritative=1`
```

and Runtime then gates Evidence execution with:

```text
sourceAnchor
? evidence.inspectAndFence(...)
: null
```

This means a rendered Prompt line is currently part of the control plane for whether Evidence request fencing runs.

Canonical problem:

```text
semantic owner facts
→ Prompt wording
→ Runtime parses wording back into a boolean
→ boolean controls Evidence behavior
```

Prompt bytes should be a serialization product, not the authoritative transport for application/runtime control facts that already exist structurally.

Classification:

```text
P2_PROMPT_BYTE_CONTROL_COUPLING
= FIX
= APPLICATION / RUNTIME CONTROL-PLANE COUPLING
= NON-CORRECTNESS-INCIDENT
= NON-BLOCKING FOR CURRENT v0.64.7 LIVE GATE
= NO IMPLEMENTATION AUTHORIZED BY THIS REVIEW
```

## 11. P2 target boundary

Evidence eligibility should come from an owner-produced structured fact, not from re-parsing Prompt wording.

Current state already contains bounded request facts from Lifecycle/Handoff such as the source-handoff eligibility used by Prompt to emit the source-lock contract.

Preferred conceptual flow:

```text
Handoff/Lifecycle-owned request fact
→ Session/application result or bounded pending fact
├─ Prompt serializes source-lock wording
└─ Runtime invokes Evidence from the structured fact
```

NOT:

```text
owner fact
→ Prompt wording
→ Runtime regex/string scan
→ recover owner fact
→ invoke Evidence
```

Exact API is intentionally not frozen here.

Possible implementations after the required rebase include:

```text
Runtime reads the already-bounded pending eligibility directly

or

Session returns a bounded request-control receipt produced from owner facts
```

Do not make Prompt the producer of the control receipt merely because Prompt also serializes the related line.

### 11.1 Critical equivalence invariant

The future structured eligibility and the existing emitted source-lock contract must remain equivalent:

```text
Evidence fencing runs
IFF the same owner-produced request condition that currently emits the authoritative source-lock contract is active
```

No wider Evidence fencing scope is authorized.

### 11.2 Required proof for eventual fix

At minimum:

```text
eligible Short-C source-lock request
→ exact same Prompt bytes
→ Evidence fence invoked exactly as before

ineligible Short-C
→ no source-lock Prompt line
→ no Evidence fence

recurrence-owned C
→ existing behavior unchanged

ordinary long C
→ existing behavior unchanged

A / Broadcast
→ existing behavior unchanged

Prompt wording-only refactor simulation
→ Evidence decision remains tied to structured owner fact, not literal line spelling

no additional request scan
no new history scan
no raw body retention
```

## 12. Prompt self-parsing for diagnostics — not automatically debt

Runtime currently derives several diagnostic booleans from rendered Prompt lines.

This review deliberately distinguishes:

```text
A. rendered-byte observation used only to describe what was emitted
B. rendered-byte observation used to decide another subsystem's behavior
```

A is legitimate when the diagnostic question is about actual emitted prompt bytes.

B is the P2 control-plane debt.

Therefore do not "clean up" every prompt-line scan merely for aesthetic consistency.

Classification:

```text
PROMPT_BYTE_DIAGNOSTIC_OBSERVATION
= KEEP / OBSERVATION

PROMPT_BYTE_OPERATIONAL_CONTROL
= FIX / P2
```

## 13. Evidence ownership remains separate

Prompt owns source-lock wording only.

Evidence owns:

```text
authoritative request-message resolution
root/source mapping
safe bounded request-only fencing
fence result/receipt
```

Runtime owns sequencing of the Evidence call against the actual request array.

Target boundary:

```text
Handoff/Lifecycle fact
→ Prompt serialization

same owner fact
→ Runtime call eligibility
→ Evidence mapper/fencer
```

Prompt must not import Evidence or inspect/mutate request message arrays itself.

## 14. No Prompt extraction selected

Despite P1 and P2, the Prompt module itself remains cohesive.

The problems are boundary mechanics, not multiple independent Prompt responsibilities.

Verdict:

```text
PROMPT_MODULE_COHESION
= COHESIVE
= KEEP
= NO NEW PROMPT SUBMODULE
```

Do not create by default:

```text
prompt-policy
prompt-authority
prompt-runtime-controller
prompt-evidence
prompt-cache-manager
```

P1 is solved by restoring read-only compilation.
P2 is solved by replacing a byte-derived control signal with a structured owner fact.

Neither justifies fragmenting Prompt.

## 15. Relationship to existing architecture maps

### Application-Service Boundary Map

This review strengthens:

```text
Prompt state mutation permission = NONE
Runtime owns request placement
Evidence owns bounded request fencing
```

P1 is a current physical violation of the first rule.
P2 is a current control-coupling violation of the Prompt/Runtime/Evidence handoff rule.

### State Ownership Registry v2

Prompt may read semantic state but owns none of its semantic fields.

P1 confirms why:

```text
STATE HOLDER / SERIALIZER
!= SEMANTIC WRITER
```

### Transition-Debt Retirement Map

This review adds two explicit debt candidates:

```text
TD-13 Prompt reconcile-input mutation
TD-14 Prompt-byte Evidence control coupling
```

They are architecture cleanup debts, not current production correctness blockers.

### Module Cohesion Audit

The audit classification for Prompt remains `COHESIVE_LARGE / KEEP`.

P1/P2 do not change that verdict.

### Testability Surface Map

Prompt compilation is already directly executable.

The eventual P1 proof should add/retain a non-mutation invariant.
The eventual P2 proof should be differential request-control coverage rather than a new fixture system.

## 16. Sequencing constraints

No runtime patch is authorized now.

Current sequencing remains:

```text
v0.64.7 real-long-chat gate closes
→ active planned M2 work proceeds according to its own staged gate
→ re-read actual request shell / Prompt call site after M2-3 where relevant
→ schedule P1/P2 as separate mechanical architecture cleanup
```

Because P2 lives in the outer request shell that M2-3 also touches, implementation should prefer a post-M2-3 source rebase rather than creating avoidable branch conflict.

P1 may be independently mechanical, but should still not create a new runtime release before the current production live gate is classified.

Do not combine P1/P2 with:

```text
new prompt semantics
cache optimization
Evidence semantic widening
M2-3 algorithm changes
M2-4 output-finalize extraction
Runtime Mirror refactor
release-system redesign
```

## 17. Eventual implementation slices

If selected after rebase, keep the two fixes independent unless source reality proves a single mechanical patch is strictly safer.

### Slice PR-1 — Prompt read-only compilation

```text
remove Prompt's ability to mutate caller state
→ prove byte identity + input non-mutation
→ normal runtime release workflow
```

### Slice PR-2 — Structured Evidence eligibility

```text
replace prompt-line-derived Evidence gate
with owner-produced structured fact
→ preserve exact fence eligibility + prompt bytes
→ normal runtime release workflow
```

Do not treat either as a feature release.

## 18. Final verdict

```text
PROMPT
= COHESIVE
= KEEP AS APPLICATION-LAYER SERIALIZER / COMPILER
= NO HOST
= NO STORE
= NO RUNTIME STATE
= NO EVIDENCE MAPPING OWNERSHIP
= NO PROVIDER CACHE POLICY

healthy boundaries
= lower-owner pure queries
= Runtime request placement
= structured identityTiers to cache observer
= Prompt-byte diagnostics when observation-only

P1_PROMPT_RECONCILE_INPUT_MUTATION
= FIX
= NON-BLOCKING
= ARCHITECTURE OWNERSHIP DRIFT
= IMPLEMENT LATER WITH BYTE-IDENTITY + NON-MUTATION PROOF

P2_PROMPT_BYTE_CONTROL_COUPLING
= FIX
= NON-BLOCKING
= CONTROL-PLANE COUPLING
= REPLACE WITH STRUCTURED OWNER FACT AFTER REBASE

new Prompt module extraction
= NO

runtime change now
= NONE

release-simcore change now
= NONE
```
