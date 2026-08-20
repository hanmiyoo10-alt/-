# SimCore 2.0M Major — M0 Architecture Audit

> Production baseline: `v0.63.55 — Representation Fast Reconcile`
>
> Scope: architecture/ownership/dependency audit only. **No production runtime behavior is changed by this document.**
>
> The purpose of M0 is to inspect the actual production implementation before deciding what the 2.0M Major modularization should move, split, preserve, or defer.

---

## 1. Audit Verdict

The current SimCore architecture is fundamentally healthy. Most domain modules already have clear responsibilities and should **not** be rewritten merely because this is a Major Update.

The main structural pressure is concentrated in five places:

1. `kernel` is a foundation module but imports several domain modules for state normalization.
2. `lifecycle` owns more than lifecycle: it composes recurrence, lineage, handoff, time, and the large cross-domain `pending` request DTO.
3. `recovery` contains three different time-axis responsibilities: output-envelope compatibility, history bootstrap, and legacy migration/repair.
4. `session` is no longer a thin orchestrator; it owns initialization, migrations, request/output sequencing, output finalization, persistence coordination, and the expensive fallback edit-reconcile path.
5. representation/edit responsibility is split across `kernel`, `runtime-mirror`, the outer runtime shell, and `CoreRulesetSession`.

The strongest 2.0M Major modularization candidate is therefore:

```text
Representation ownership consolidation
+
Edit Reconcile extraction
+
Recovery phase split
+
Contracts v2 dependency rules
```

This should be done mechanically first, preserving production behavior before any new long-chat feature is activated.

---

## 2. Current Production Module Inventory

### Core / domain modules

```text
contracts
store
community
recurrence
lineage
handoff
evidence
kernel
time
lifecycle
reaction
frame
structure
recovery
prompt
session
ops
```

### Runtime boundary modules

```text
runtime-contracts
runtime-host
runtime-cache
runtime-topology
runtime-cache-candidates
runtime-telemetry
runtime-session
runtime-mirror
runtime-hooks
runtime-probe
```

### Outer runtime shell

The final IIFE still owns a substantial application/observability layer, including:

```text
request/output handler composition
edit-origin attribution
v0.63.55 Representation Fast Reconcile gate
history/frontier observation
history-representation correlation
diagnostic state aggregation
panel / copied diagnostic rendering
```

This outer shell is currently much more than simple wiring.

---

## 3. Module-by-Module Audit

### `contracts` — KEEP, UPGRADE TO v2

Current role is metadata-only module ownership/non-goal declarations.

Verdict:

- keep the concept;
- expand it to cover the runtime modules as well as the original core modules;
- add dependency-direction rules, not only prose ownership labels;
- do not make Contracts itself own runtime policy.

Next candidate: `Contracts v2`.

---

### `store` — KEEP

Actual ownership is clean:

```text
snapshot serialization
pre/send/out persistence
turn bundle persistence
retention/prune
key scanning
clock-anchor storage query
```

It does not decide semantic state.

Potential note:

`clockAnchorsAtOrBelow()` is a clock-shaped query used only for legacy repair, but it is still fundamentally a persistence query. Do not move it merely for aesthetic purity unless the later migration split produces a clearly better adapter boundary.

---

### `kernel` — REDEFINE / POSSIBLE SPLIT

Current declared role:

```text
state schema + shared primitives / normalization glue
```

Actual dependencies include:

```text
community
recurrence
lineage
handoff
```

because `reconcileState()` invokes domain-specific normalizers.

This creates an inverted dependency:

```text
Foundation Kernel
    ↓
Domain modules
```

while domain modules also depend on Kernel elsewhere.

Kernel also owns:

```text
fingerprintText
initialState / reconcileState
message text helpers
Core handshake/config scan
control-tag helpers
Knowledge scanner
```

Recommendation for M1 design:

- define a pure foundation boundary for primitives (`clone`, exact fingerprint, text normalization/scanning primitives);
- consider a separate `state` ownership layer for state schema/reconciliation;
- do **not** decide yet whether this requires a new physical module or only a Contracts v2 boundary.

Strong rule:

> Foundation modules should not depend upward on domain modules.

---

### `time` — KEEP

Responsibility remains coherent:

```text
timestamp parsing/canonicalization
calendar transition resolution
broadcast airtime
narrative clock
world year / Korean-age offset
```

No split is currently justified.

---

### `frame` — KEEP

Responsibility is narrow and deterministic:

```text
visible frame parsing
Volume / Chapter / Chatindex sequence enforcement
```

Do not merge it into Structure or Time merely because they interact.

---

### `recurrence` — KEEP

Owns normalized request-template fingerprinting and bounded recurrence registry.

No meaningful ownership drift found.

---

### `lineage` — KEEP

Owns root / parent / depth / current source-chain state.

No need to merge with Handoff. Related state is not sufficient reason to merge modules.

---

### `handoff` — KEEP

Owns short-C source-reuse and parent-shift observation over Lineage output.

Dependency on Lineage data is intentional domain composition; ownership remains distinct.

---

### `evidence` — KEEP

Owns authoritative request-message mapping and bounded request-only fencing.

Important preserved boundary:

```text
no semantic source interpretation
no history search
no persistence
no output repair
```

This is already a good module boundary.

---

### `community` — KEEP

Owns COMMUNITY parsing and platform-family taxonomy.

No reason to merge with Reaction.

---

### `reaction` — KEEP

Owns reaction parsing, per-platform historical floors, and deterministic normalization.

It consumes Community taxonomy but remains a distinct policy.

---

### `structure` — KEEP

Structure is still correctly a judge:

```text
frame/envelope integrity
COMMUNITY shape
Knowledge position/shape
state-commit safety
mode-specific structural warnings
```

It composes parsers from Community, Reaction, Lifecycle, Time and Kernel. That is appropriate for a validation layer.

Do not make Structure repair content during the modularization.

---

### `lifecycle` — REDEFINE OR SPLIT REQUEST COMPOSITION

Declared ownership is mode/broadcast/episode request preparation.

Actual `prepareTurn()` also orchestrates:

```text
Time
Recurrence
Lineage
Handoff
secondary-character activation
calendar/progression preparation
large cross-domain pending DTO construction
```

This makes Lifecycle an application-level **request preparation coordinator**, not only a lifecycle domain module.

Two valid M1 options:

```text
Option A
Keep current code location but redefine the contract honestly:
Lifecycle = request-domain preparation coordinator + broadcast lifecycle

Option B
Keep mode/broadcast classification in Lifecycle
Extract cross-domain composition into Turn/Request Pipeline
```

M0 does not choose between A and B. Choose the lower-risk option during Contracts v2 design.

---

### `recovery` — SPLIT CANDIDATE

The current Recovery module contains three conceptually different phases.

#### A. Output envelope compatibility

```text
preamble classification
response-envelope candidate selection
canonicalization
Tail placement
Fresh-confirmation candidates
safe structural-boundary confirmation
prepareOutput
```

This runs on ordinary active outputs and is **not purely cold-path recovery anymore**.

#### B. History bootstrap

```text
bootstrapFromHistory
```

This reconstructs state for cold/legacy initialization.

#### C. Legacy migration / repair

```text
repairLegacyAgeClock
repairLegacyClockState
repairLatestGlobalFloorContamination
```

These are true migration/cold-repair responsibilities.

Recommended eventual ownership:

```text
output-compat / envelope
    → A

bootstrap / migration
    → B + C
```

Important correction to earlier architectural discussion:

> Manual edit reconcile is **not actually owned by Recovery in v0.63.55 production code**. Its responsibility is split between Session and the outer runtime shell.

This correction is now part of the durable architecture record.

---

### `prompt` — KEEP

Prompt remains a serializer over already-computed state.

It has no host/storage ownership and should stay that way.

Preserve compiler tier semantics and `TAIL_AFTER_CURRENT_USER` during mechanical refactoring.

---

### `session` — STRONG EXTRACTION CANDIDATE

Current Session owns much more than the original “thin orchestrator” contract.

Actual responsibilities include:

```text
session initialization from mirror/snapshot/fresh
narrative-clock migration
history bootstrap coordination
community-classifier migration/backfill
onSend pipeline
turn snapshot persistence
output state selection
output finalization
output snapshot persistence
deferred prune scheduling
clock seeding
manual-edit fallback reconcile/rebuild
portable state exposure
```

`finalizePreparedOutput()` also composes Frame, Time, Reaction and Structure commit behavior.

This is the clearest place where the original contract has drifted.

Recommended future direction:

```text
CoreRulesetSession
→ session identity/current-state holder + orchestration

Edit Reconcile service
→ extracted from reconcileEditedOutput + outer reconcileManualEdit

Output Finalize/Pipeline service
→ candidate extraction only if it materially improves ownership

Bootstrap/Migration service
→ remove migration logic from Session where safe
```

Do not split all of these at once. `Edit Reconcile` is the highest-value extraction because it already spans two layers and is under active `.55` validation.

---

### `ops` — KEEP, NARROW

Core `ops` itself is small and clean.

Longer-term rule:

```text
business/runtime modules produce bounded structured probes
OPS / runtime-probe render or summarize probes
```

Do not move state decisions into diagnostic formatting.

---

## 4. Runtime Module Audit

### `runtime-host` — KEEP

Clean host adapter boundary.

---

### `runtime-hooks` — KEEP

Clean lifecycle for named host hook registration/removal.

---

### `runtime-session` — KEEP

Owns host-facing CoreSession reuse/load/cold-init selection.

It should not absorb edit/output business logic.

---

### `runtime-cache` — KEEP

Owns runtime-prompt cache observation/identity only.

Provider cache remains `UNVERIFIED`.

---

### `runtime-topology` — KEEP, DEDUPE FINGERPRINT PRIMITIVE LATER

Owns request signatures/topology/host-prefix sketches.

Finding:

`outputCompatibleFingerprint()` duplicates the same normalization/hash identity concept as `kernel.fingerprintText()`.

This is a future Representation/Foundation deduplication candidate. Do not change it during M0.

---

### `runtime-cache-candidates` — KEEP

Bounded trajectory observer; no provider claim.

---

### `runtime-telemetry` — KEEP

Refreshless memory-only handoff capsule is isolated and bounded.

---

### `runtime-probe` — KEEP AS RENDERER

Mostly converts structured probes into diagnostic strings.

This is the desired observability direction.

---

### `runtime-mirror` — REDEFINE AFTER REPRESENTATION EXTRACTION

Deferred Mirror itself must remain frozen for safety.

However the module currently owns more than mirroring:

```text
memory-only provenance ledger
CANONICAL / HOST_RAW / FRESH identity records
Fresh exact matching
Fresh envelope confirmation application
safe-boundary confirmation application
representation-match vocabulary
```

Therefore it is currently the de facto representation-provenance owner.

Recommended future boundary:

```text
Representation
→ identity/provenance/match classification + bounded ledger

Runtime Mirror
→ fresh chat read + strict identity/location/staleness guard + mirror write
```

Mirror remains the place where Fresh is observed; Representation becomes the place where that observation is classified/stored as bounded metadata.

No raw Fresh body may be retained by the new subsystem.

---

## 5. Outer Runtime Shell Audit

Despite v0.63.36 runtime modularization, the outer shell remains an application/observability god layer.

It currently owns:

```text
history frontier observers
repeated-break ledger
history stabilization observer
history mutation ↔ output provenance correlation
request/output orchestration
edit-origin attribution
v0.63.55 representation fast-path gate
large diagnostic report construction
panel rendering
```

The most important ownership split is:

```text
Outer reconcileManualEdit
    +
CoreRulesetSession.reconcileEditedOutput
    ↓
Edit Reconcile subsystem
```

Today one edit decision spans two layers:

```text
runtime-mirror provenance
→ outer-shell representation classification / .55 fast gate
→ Session fallback reconcile/rebuild/storage
```

This is the strongest proof that Edit/Representation have grown into first-class architecture concerns.

A second, lower-priority extraction candidate is:

```text
runtime-history-observer
```

for OBSERVE_ONLY history/frontier/correlation helpers now living in the shell.

Do not prioritize this before the Representation/Edit boundary is stabilized.

---

## 6. Representation Ownership — Proposed v2 Contract

A new `representation` subsystem is a **strong candidate**, but it should remain intentionally small.

### Representation MAY own

```text
exact fingerprint identity primitives
CANONICAL / HOST_RAW / FRESH_CHAT relation taxonomy
representation state classification
bounded provenance row/ledger
exact carryover shape classification
Fresh-confirmed alias/identity metadata
```

### Representation MUST NOT own

```text
raw response-body persistence
semantic envelope parsing
output prose repair
persistent Core state
chat writes
provider cache logic
history mutation
network/timers
```

Canonical principle:

> Fresh is identity evidence, not a body source.

This preserves the safety property already used by v0.63.55.

---

## 7. Edit Reconcile — Proposed v2 Contract

After `.55` live validation, consolidate edit reconciliation into one application service.

It should own the decision tree for:

```text
SAME_FAST
SAME_HOST_FAST
snapshot exact match
representation exact carryover
USER_EDIT_CANDIDATE
REPRESENTATION_DRIFT_CORRELATED
AMBIGUOUS_CHANGE
manual edit rebuild fallback
```

It may coordinate Store/Output-Compat/Bootstrap migration services as needed, but Representation classification itself should remain pure/bounded.

Critical positive control:

```text
Prior EXACT
current != canonical
current != Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
```

must remain unchanged.

---

## 8. Proposed Target Layers

```text
┌──────────────── Foundation ────────────────┐
│ Contracts v2                              │
│ pure primitives / exact fingerprint       │
│ State schema/reconciliation               │
│ Store                                     │
└───────────────────────────────────────────┘

┌──────────────── Domain ────────────────────┐
│ Lifecycle  Time  Frame                    │
│ Recurrence Lineage Handoff Evidence       │
│ Community Reaction Structure              │
└───────────────────────────────────────────┘

┌──────────── Representation Boundary ───────┐
│ Representation                            │
│ Edit Reconcile                            │
│ Output Compat / Envelope                  │
└───────────────────────────────────────────┘

┌──────────── Application / Recovery ────────┐
│ Request/Turn composition                  │
│ Output finalization/commit sequencing     │
│ Bootstrap / Migration                     │
│ CoreRulesetSession                        │
└───────────────────────────────────────────┘

┌──────────────── Runtime ───────────────────┐
│ runtime-host / session / mirror / hooks   │
│ runtime-cache / topology / telemetry      │
│ runtime-history observer (candidate)      │
│ runtime-probe / diagnostic renderer       │
└───────────────────────────────────────────┘

           Future optional extension seam
                         │
                  Context / Archive
                         │
          Vision/archive donor features
```

This is a target ownership map, **not yet an implementation commitment**.

---

## 9. Contracts v2 Candidate Dependency Rules

M1 should formalize at least these rules:

1. Foundation must not depend upward on Domain/Application/Runtime.
2. Domain modules must not call host/storage directly unless persistence ownership explicitly requires it.
3. Store owns persistence mechanics, not semantic decisions.
4. Application pipeline modules may compose Domain + Foundation + Store.
5. Representation should depend only on pure Foundation primitives and remain memory-only unless a later explicit design changes that rule.
6. Runtime may depend on Application/Domain through explicit interfaces, never the reverse.
7. Observability reads structured probes; it does not mutate business state to simplify diagnostics.
8. No circular imports.
9. Raw-body-retention policy remains unchanged.
10. Deferred Mirror strict identity/location/staleness/mismatch gates remain unchanged.

A future CI check may statically inspect `SimCore.define(...)` / `require(...)` relationships, but enforcement tooling should be designed only after the v2 dependency map is finalized.

---

## 10. Keep / Change / Defer Matrix

### KEEP

```text
Store
Time
Frame
Recurrence
Lineage
Handoff
Evidence
Community
Reaction
Structure
Prompt
OPS core
runtime-host
runtime-hooks
runtime-session
runtime-cache
runtime-cache-candidates
runtime-telemetry
runtime-probe
```

### REDEFINE / SPLIT CANDIDATES

```text
Contracts → Contracts v2
Kernel → pure foundation + state boundary candidate
Lifecycle → lifecycle domain vs request-composition boundary
Recovery → output compatibility + bootstrap/migration
Session → remove edit/migration/output-pipeline overload incrementally
runtime-mirror → mirror I/O/safety vs representation provenance
outer runtime shell → edit reconcile + history observer extraction
runtime-topology → share exact fingerprint primitive later
```

### NEW STRONG CANDIDATES

```text
Representation
Edit Reconcile
Output Compat / Envelope
Bootstrap / Migration
Contracts v2 dependency map
```

### NEW OPTIONAL CANDIDATES

```text
State module
Request/Turn Pipeline
Output Finalize/Pipeline
Runtime History Observer
```

These should only be created if the dependency map demonstrates a real ownership benefit.

### DEFER

```text
Context / Archive implementation
Vision Archive transplant
Provider feature transplant
provider-cache engineering
new history mutation behavior
```

Future donor capabilities remain optional and should not be bundled into the first mechanical architecture refactor.

---

## 11. Safety / Freeze During the Major Refactor

The following are not modularization targets unless new evidence explicitly requires them:

```text
Broadcast End Authority
Broadcast lifecycle semantics
Frame behavior
Continuity
Evidence behavior
Lineage semantics
Handoff semantics
Reaction semantics
Recurrence semantics
Structure acceptance / COMMUNITY quarantine
TAIL_AFTER_CURRENT_USER
Prompt compiler tier semantics
Deferred Mirror strict safety
History stabilization OBSERVE_ONLY
provider cache UNVERIFIED
persistent schema
network policy
timer policy
raw-body retention policy
```

Mechanical refactor is not permission to alter these contracts.

---

## 12. Current Conflict / Sequencing Checkpoint

There is one deliberate sequencing constraint.

`v0.63.55 Representation Fast Reconcile` is production but still waiting for natural real long-chat activation validation.

Therefore:

### Safe to do now

```text
M0 Architecture Audit          ← COMPLETE
M1 Contracts v2 design
module dependency map
ownership contracts
CI enforcement design
```

### Wait until `.55` live validation before moving runtime behavior

```text
Edit Reconcile extraction
Representation fast-path relocation
Recovery/Session code movement touching edit behavior
```

Reason:

> If the `.55` subsystem is refactored before its production behavior is observed, a later failure cannot be cleanly attributed to `.55` itself versus the modularization.

This is not a reason to pause the 2.0M Major architecture program; it is an attribution guard on the order of implementation.

---

## 13. 2.0M Major Internal Phases

Current proposed sequence after M0:

```text
M0 — Architecture Audit
     COMPLETE

M1 — Contracts v2
     ownership + dependency architecture
     no behavior movement required

M2 — Mechanical Boundary Refactor
     Recovery phase split
     Session responsibility reduction
     behavior-equivalent only

M3 — Representation / Edit Consolidation
     after v0.63.55 live validation
     preserve genuine-edit positive control

M4 — Observability Boundary Cleanup
     structured probes → renderer
     optional runtime-history observer

M5 — Long-Chat Extension Seam
     only if justified after core architecture settles
     default disabled / request behavior unchanged

M6 — Full Regression + Real Long-Chat Validation
```

Phase boundaries may be reordered by production evidence, but unrelated feature work should not silently expand a mechanical phase.

---

## 14. M0 Final Recommendation

Proceed to **M1 — Contracts v2 design** now.

Do not begin by physically creating many new modules. First define the target dependency graph and ownership contracts, then let that design determine which modules actually deserve extraction.

The most likely 2.0M Major center of gravity is:

```text
Contracts v2
    ↓
clean Foundation direction
    ↓
Representation as first-class identity/provenance boundary
    ↓
Edit Reconcile consolidated from runtime shell + Session
    ↓
Recovery reduced to explicit output-compat and bootstrap/migration responsibilities
    ↓
thinner Session and outer runtime shell
```

This direction addresses real ownership drift visible in production code while preserving the large amount of already-stable domain behavior.