# SimCore Post-M2 Simplification Program Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · AUDIT FIRST · v0.70.2 PARKED, NOT CANCELLED · NO RUNTIME IMPLEMENTATION AUTHORITY**
Classification: **POST-M2 MAINTENANCE / MODULARITY + STABILITY + SIMPLIFICATION / NON-RUNTIME DESIGN**

## 1. Decision

The currently frozen v0.70.2 `Cache Observer Cold-Path Attribution` design is **parked temporarily, not cancelled**.

Before implementing it, SimCore will perform one bounded post-M2 simplification audit to determine whether the current plugin contains source-proven maintenance debt that can be removed with lower risk and higher long-term value than immediately continuing the cache-attribution lane.

This is not M2-7 and does not reopen the 2.0M architecture program.

Canonical posture:

```text
M2-6 architecture = FROZEN
M2-7 = NOT AUTHORIZED
v0.70.2 design = PRESERVED / PARKED
current new lane = POST_M2_SIMPLIFICATION_AUDIT
runtime implementation = NONE
```

## 2. Why pause briefly

SimCore has already completed the large ownership refactor through M2-6. The accepted architecture has zero Kernel upward-domain transition exceptions and a defined layer graph.

At the same time, previous post-M2 review already preserved several maintenance candidates:

```text
runtime-topology fingerprint primitive dedupe = DEFER / LOW-RISK SLIMMING
request-pipeline extraction                   = DEFER
turn-pipeline extraction                      = DEFER
generic foundation state module               = DEFER
```

The important distinction is that not every simplification requires another architecture stage.

A short audit can identify whether there are now safe opportunities to:

```text
delete dead compatibility or pass-through seams
reduce duplicated primitives
narrow public module APIs
reduce orchestration glue
remove redundant local work
make async/I/O ownership easier to see
reduce code that diagnostics must reason about
```

without changing semantic ownership.

## 3. Product principle

The program optimizes for **less structure, not more modules**.

Preferred order:

```text
DELETE
→ INLINE trivial pass-through seams
→ DEDUPE identical primitives
→ NARROW module APIs
→ SIMPLIFY orchestration
→ EXTRACT only if one physical owner demonstrably contains two independent responsibilities
```

A new module is a last resort, not a success metric.

Canonical rule:

```text
MODULARITY QUALITY != MODULE COUNT

GOOD MODULARITY
= clear owner
+ small dependency surface
+ bounded side effects
+ fewer duplicated contracts
+ easier differential verification
```

## 4. Frozen architecture boundary

The current M2-6 layer contract remains authoritative:

```text
Foundation
  contracts / store / kernel

Domain
  community / recurrence / lineage / handoff / state-reconcile
  evidence / time / frame / lifecycle / reaction

Validation
  structure

Representation
  representation

Application
  prompt / session / edit-reconcile
  output-compat / bootstrap-migration / output-finalize

Observability
  ops

Runtime
  runtime-contracts / runtime-host / runtime-cache
  runtime-topology / runtime-cache-candidates / runtime-telemetry
  runtime-session / runtime-mirror / runtime-hooks / runtime-probe
```

The simplification program may remove redundant code inside or between existing owners, but it may not silently change this ownership graph.

Any finding that genuinely requires a new layer edge, upward dependency, new semantic owner, or M2-7-scale extraction must be classified separately and must not be implemented under this program.

## 5. Audit questions

For every physical module and the outer runtime shell, record:

```text
A. RESPONSIBILITY
   What unique responsibility does this owner perform?

B. PUBLIC API
   Which exports are actually consumed?
   Are any exports pass-through aliases or compatibility leftovers?

C. DEPENDENCIES
   Which modules are required directly?
   Are any edges present only for one trivial helper?

D. DUPLICATION
   Are hashing, fingerprinting, parsing, formatting, guards, timestamps,
   bounded arrays, identity checks, or error containment duplicated?

E. SIDE EFFECTS
   Where are storage, chat writes, Host API calls, timers, network or awaits?
   Is the side-effect owner obvious at the call site?

F. HOT PATH
   Does the module execute on every request/output, only on cold init,
   only on recovery, or only in diagnostics?

G. STATE SURFACE
   Does it own durable state, request-scoped state, memory-only telemetry,
   or no state?

H. VERIFICATION COST
   How much code must be frozen/differentially compared when it changes?

I. DELETION TEST
   If this code disappeared, which observable contract would fail?
```

The audit records facts. It does not automatically produce a runtime release.

## 6. Candidate classifications

Every finding must terminate in one of these buckets:

```text
KEEP
  owner is justified and already minimal enough

RETIRE
  dead compatibility, zero-caller facade, obsolete branch or redundant state

INLINE
  trivial pass-through indirection whose removal reduces seams without merging responsibilities

DEDUPE
  identical primitive or representation logic can be shared by an existing correct owner

NARROW
  public API/export surface can shrink without behavior change

SIMPLIFY
  same owner and same behavior, but control flow/state bookkeeping can be mechanically reduced

EXTRACT_CANDIDATE
  one owner demonstrably contains two independent responsibilities;
  requires separate architecture review before implementation

DEFER
  benefit exists but risk/evidence does not justify touching it now

BLOCK
  simplification would weaken correctness, persistence, representation identity,
  cache evidence, or frozen architecture
```

## 7. First-priority audit targets

### 7.1 Runtime topology / fingerprint primitive duplication

This is the strongest pre-existing low-risk slimming candidate because the post-M2 freeze review already named it explicitly.

Audit:

```text
fingerprint/hash helpers
request signature builders
representation/topology identity helpers
cache trajectory signature helpers
```

Goal:

```text
one existing owner per primitive family
no semantic broadening
no raw-body retention
no provider-cache inference
```

A dedupe is valid only if current variants are genuinely equivalent. Similar-looking hashes with different normalization contracts must remain separate.

### 7.2 Outer runtime shell orchestration

Audit the shell that sequences:

```text
host/chat/session acquisition
onSend
post-onSend accounting
runtime telemetry adoption
cache observers
diagnostics probes
output handling
telemetry checkpoint
```

The goal is **not** to create a generic `request-pipeline` module automatically.

Instead identify:

```text
pure local bookkeeping that can be collapsed
duplicate guard checks
pass-through state copies
repeated diagnostic object construction
unnecessarily wide variable lifetime
one-shot work embedded in ordinary warm-path orchestration
```

Only if the audit proves a coherent independent responsibility may an extraction be proposed later.

### 7.3 Runtime telemetry / diagnostics seam

Because v0.70.1 exposed a cold `PROMPT_ACCOUNTING` hotspot and v0.70.2 is currently parked, inspect whether telemetry/diagnostic plumbing has avoidable structural complexity independent of the measured latency cause.

Audit only:

```text
one-shot adoption state
Host-local claim boundaries
capsule import/export adapters
diagnostic probe duplication
formatting/accounting helper duplication
```

Do not move/remove the existing awaited Host-local claim in the simplification audit. That remains a behavior/performance decision for the cache lane unless a separate source-proven simplification contract is approved.

### 7.4 Module export surface

Identify exports that are:

```text
unused
single-caller aliases
compatibility remnants
re-exported without policy
used only by tests after runtime caller retirement
```

Prefer reducing exports over creating new common utility modules.

### 7.5 Session / state orchestration

Inspect but treat conservatively.

Session was intentionally narrowed during M2 and State Reconcile is the accepted Domain integration owner.

Therefore:

```text
generic foundation state module = NOT DEFAULT
state-reconcile facade restoration = FORBIDDEN
session semantic ownership expansion = FORBIDDEN
```

Only mechanical local simplification inside the frozen ownership boundary is in scope.

## 8. Explicit non-goals

This program is not authority for:

```text
M2-7
new architecture layer
new generic state subsystem
request-pipeline / turn-pipeline extraction by default
Prompt compiler semantic change
TAIL_AFTER_CURRENT_USER movement
history rewrite
Community feature work
Source Intelligence / 3M feature work
provider-cache tuning or billing claim
release-system R2/R3 redesign
persistent schema migration
new network request
autonomous background work
```

## 9. Stability requirements

A simplification implementation may be promoted only when it makes the runtime easier to reason about **without weakening safeguards**.

Frozen controls include:

```text
Current Task Primacy
Representation exact identity/provenance
Edit Reconcile positive controls
Deferred Mirror strict gates
State Reconcile ownership
Evidence / Lineage / Handoff / Recurrence
Frame / Time / Broadcast lifecycle
Structure judge-only behavior
Community classifier v3
history stabilization OBSERVE_ONLY
provider cache UNVERIFIED
runtime reload stale-work defense
Host-local telemetry one-shot semantics
latest.js == install.js
```

## 10. Quantitative acceptance bias

For maintenance-only simplification, prefer deltas that satisfy most of:

```text
runtime source lines: decrease or stay neutral
module count: decrease or stay neutral
public exports: decrease
require edges: decrease or stay neutral
side-effect token counts: unchanged unless explicitly retiring dead side effect
persistent fields: unchanged
async boundaries: unchanged or fewer
hot-path loops/scans: unchanged or fewer
semantic output: differential-equivalent
```

A refactor that adds files, adapters, wrappers and contracts while producing no measurable ownership or verification benefit is rejected as complexity laundering.

## 11. Audit deliverable

The next work product is one source-grounded inventory, not runtime code.

Required table per candidate:

```text
candidate
current owner
exact source/callers
dependency/API impact
hot-path disposition
side-effect disposition
expected deletion/reduction
risk
classification KEEP/RETIRE/INLINE/DEDUPE/NARROW/SIMPLIFY/EXTRACT_CANDIDATE/DEFER/BLOCK
recommended transaction boundary
```

At the end, rank only source-proven candidates.

## 12. Promotion rule

After audit:

```text
if no meaningful low-risk simplification exists:
    close audit
    resume frozen v0.70.2 cache attribution

if one or more low-risk mechanical candidates exist:
    select the smallest coherent simplification transaction
    design it separately
    implement on a work branch
    static/CI verify
    publish through release-simcore only if runtime changed
    real-long-chat validate touched surfaces
    sync main authority
    then resume cache program

if only architecture-scale candidates exist:
    DEFER them
    do not reopen M2 automatically
    resume v0.70.2
```

## 13. Relationship to v0.70.2

v0.70.2 remains a valid frozen design and retains all its evidence.

This document changes its scheduling posture only:

```text
before:
  next selected implementation candidate = v0.70.2 after authority gates

after:
  v0.70.2 = PARKED / PRESERVED
  next immediate task = simplification audit
```

No version number is reassigned yet.

If the audit yields a runtime simplification release, its version identity must be selected in a separate design decision. Do not silently reuse `v0.70.2` for unrelated work while `Cache Observer Cold-Path Attribution` remains the frozen v0.70.2 design.

## 14. Recommended philosophy

```text
M2 made ownership clearer.
Post-M2 simplification should make the same ownership cheaper to maintain.

Do not modularize because a file is large.
Do not abstract because two lines look similar.
Do not extract because a name sounds architectural.

Delete proven redundancy.
Collapse needless seams.
Keep side effects obvious.
Keep semantic owners boring.
```

## 15. Disposition

```text
POST_M2_SIMPLIFICATION_PROGRAM = DESIGN FROZEN
NEXT TASK = SOURCE-GROUNDED SIMPLIFICATION AUDIT
RUNTIME CHANGE = NONE
RELEASE_SIMCORE CHANGE = NONE
M2_6 = FROZEN
M2_7 = NOT AUTHORIZED

v0.70.2 CACHE OBSERVER COLD-PATH ATTRIBUTION
= PRESERVED
= PARKED TEMPORARILY
= NOT CANCELLED

DEFAULT STRATEGY
= DELETE / INLINE / DEDUPE / NARROW BEFORE EXTRACT

FIRST AUDIT PRIORITY
= runtime-topology/fingerprint dedupe
+ outer runtime shell bookkeeping
+ telemetry/diagnostic seam
+ module export surface

REQUEST/TURN PIPELINE EXTRACTION = DEFER UNLESS SOURCE-PROVEN
GENERIC FOUNDATION STATE MODULE = DEFER
IMPLEMENTATION AUTHORITY = NONE
```
