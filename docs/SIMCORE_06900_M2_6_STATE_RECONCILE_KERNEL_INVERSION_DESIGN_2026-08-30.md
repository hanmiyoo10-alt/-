# SimCore v0.69.0 M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion Design

Date: 2026-08-30 KST
Status: **DESIGN FROZEN · IMPLEMENTATION BLOCKED ON POST_06800_ARCHITECTURE_AUTHORITY_PROJECTION_CONVERGENCE**
Classification: **M2-6 STRUCTURAL OWNERSHIP DESIGN · BEHAVIOR-PRESERVING**

## 1. Release identity

```text
Target version: 0.69.0
Release name: M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion
Major phase: M2
Target checkpoint: M2-6
Current production parent: v0.68.0 LIVE_PASS
```

Exact production source parent:

```text
release-simcore commit: 6b31a5265f67daf5a90222d6c08bb85f3abde538
latest/install blob: 5094755266444de311ec9cc8ffc7a4dd658e65b1
release: Community Parent-Local Alias Classification Repair
```

`main/plugins/simcore/*` is not runtime source authority. Candidate materialization must begin from exact `release-simcore` v0.68 production.

## 2. Why this release exists

Post-M2-5 roadmap reconciliation found one remaining source-proven structural debt important enough to justify M2-6.

Kernel is declared as a foundation owner, but exact v0.68 production still has four direct upward requires into domain modules:

```js
const { normalizePlatformMaxMap } = require('./community');
const recurrence = require('./recurrence');
const lineage = require('./lineage');
const handoff = require('./handoff');
```

These are exactly the four current architecture transition exceptions.

The calls are concentrated in portable-state initial assembly/reconciliation:

```text
initialState()
  requestLineage <- lineage.normalizeLineage(null)

reconcileState()
  templateRegistry       <- recurrence.normalizeRegistry(...)
  requestLineage         <- lineage.normalizeLineage(...)
  communitySourceRegistry<- handoff.normalizeRegistry(...)
  community.platformMax  <- community.normalizePlatformMaxMap(...)
```

This means the correct fix is not to teach Kernel more domain policy. The correct fix is to move the cross-domain composition to one application-level owner.

## 3. Selected ownership model

### 3.1 Kernel after v0.69

Kernel remains physical and remains foundation.

It owns only shared low-level primitives and constants such as:

- `STATE_VERSION` / `CORE_STATE_VERSION` identity constants;
- clone/fingerprint helpers;
- message text/index helpers;
- prompt handshake/config scanning;
- control-tag stripping and Knowledge block scanning;
- other pure normalization-free shared primitives already owned there.

Kernel must have:

```text
direct dependency on community = 0
direct dependency on recurrence = 0
direct dependency on lineage = 0
direct dependency on handoff = 0
transition exceptions = 0
```

### 3.2 New State Reconcile owner

Add one physical module:

```text
module: state-reconcile
layer: application
```

Ownership:

```text
portable-state initial assembly
portable-state cross-domain reconciliation composition
legacy field cleanup already performed by current reconcileState()
```

Allowed direct dependencies:

```text
kernel
community
recurrence
lineage
handoff
```

State Reconcile does **not** own the semantics of those domain normalizers. It only composes them. Community continues to own platform taxonomy/normalization; Recurrence, Lineage, and Handoff continue to own their own state shapes and normalizers.

### 3.3 Session after v0.69

Session remains the narrowed application state holder/orchestrator.

It may replace direct calls:

```text
kernel.initialState()
kernel.reconcileState(...)
```

with:

```text
stateReconcile.initialState()
stateReconcile.reconcileState(...)
```

and otherwise remains behaviorally unchanged.

No broad Session receipt/state rewrite is authorized.

## 4. Exact mechanical movement

Frozen target diff:

```text
exact v0.68 production
→ release identity 0.69.0
→ add physical application module state-reconcile
→ mechanically move current initialState()/reconcileState() composition into state-reconcile
→ remove Kernel's four domain requires
→ switch every proven direct initial/reconcile consumer to state-reconcile
→ remove Kernel transition exceptions from candidate architecture
→ update module contract/inventory/release ledger only where made stale by the move
→ preserve every state value, deletion rule, ordering rule and fallback decision
```

The implementation must not opportunistically clean adjacent code.

## 5. State compatibility contract

This release is ownership-only.

Therefore all of the following are frozen:

```text
persisted state field names
persisted state field meanings
SnapshotStore key shape
mirror portable-state shape
STATE_VERSION
CORE_STATE_VERSION
community classifier version
narrative clock version
clock repair version
recurrence version
lineage version
handoff version
```

`STATE_VERSION` or `CORE_STATE_VERSION` must **not** be bumped solely because code moved modules.

Any implementation discovery requiring a persistent schema/version bump is a stop condition and requires redesign.

## 6. Exact reconciliation semantics that must remain equivalent

The candidate must preserve current v0.68 behavior for at least:

- missing/non-object state falls back to fresh initial state;
- history bootstrap flags/stats normalization;
- template recurrence version/registry normalization;
- request lineage version and `normalizeLineage` behavior;
- community source handoff version/registry normalization;
- broadcast lock, airtime, start airtime and episode normalization;
- Community activation count, `platformMax`, last normalization and classifier version;
- deletion of obsolete `community.globalReactionMax`;
- `narrativeYear -> worldYear` migration;
- Korean age offset normalization;
- narrative timestamp/version/clock repair normalization;
- last mode and pending normalization;
- deletion of old content-memory fields:
  - `narrativeYear`
  - `currentEpisodeSegments`
  - `lastCompletedEpisode`
  - `exposed`
  - `community.recent`
  - `community.commenters`

No value-level semantic change is permitted.

## 7. Architecture contract target

After the separate post-v0.68 architecture-authority projection prerequisite is closed, the v0.69 candidate contract must express:

```text
kernel
  layer foundation
  allowed_dependencies []
  transition_exceptions []
  status current_foundation_zero_upward_edges

state-reconcile
  physical required
  layer application
  allowed_dependencies [kernel, community, recurrence, lineage, handoff]
  owns portable-state initial assembly + cross-domain reconciliation composition

session
  remains application
  consumes state-reconcile
```

The previously deferred generic `state` module remains deferred and must not be silently repurposed.

## 8. Explicit non-goals

v0.69 does **not** authorize:

- Lifecycle request-side composition redesign;
- creation of `request-pipeline` or `turn-pipeline`;
- generic foundation `state` module creation;
- Session receipt shell redesign;
- Runtime Topology fingerprint dedupe;
- Output Compat / Bootstrap Migration redesign;
- Representation, Edit Reconcile, Output Finalize or Runtime Mirror changes;
- Structure or Reaction semantic changes;
- Community platform-family diversity repair;
- `PARTIAL_PREVIOUS_TURN_REPLAY` repair;
- genuine-edit latency optimization;
- B_START wording/closure heuristic repair;
- `THOUGHTS_UNRESOLVED_KNOWLEDGE_QUARANTINE` repair;
- provider-cache engineering or claims;
- cache-placement policy change;
- history stabilization mutation;
- persistent schema/key changes;
- host API changes;
- network calls, polling or new timers;
- release-system R2.x changes.

## 9. Implementation preflight gate

Before writing candidate runtime code, the work branch must prove against exact v0.68 production:

1. every `kernel.initialState` direct runtime consumer;
2. every `kernel.reconcileState` direct runtime consumer;
3. every direct `require('./kernel')` consumer affected by export removal;
4. no test/public seam intentionally depends on Kernel being the state-reconcile facade;
5. the four upward Kernel dependencies are used only by the state assembly/reconciliation seam;
6. the candidate graph can be acyclic with `state-reconcile` at application layer.

If any consumer requires a compatibility barrel in Kernel, stop and redesign. Do not recreate transition debt under a wrapper.

## 10. Static and differential proof requirements

### 10.1 Identity / packaging

```text
userscript metadata version == 0.69.0
SIMCORE_RUNTIME_VERSION == 0.69.0
HOST_COMPAT_VERSION == 0.69.0
latest.js == install.js byte-for-byte
node --check latest.js PASS
node --check install.js PASS
```

### 10.2 Architecture

```text
state-reconcile physical module present exactly once
Kernel requires community = absent
Kernel requires recurrence = absent
Kernel requires lineage = absent
Kernel requires handoff = absent
Kernel transition exceptions = zero
no undeclared edge
no forbidden layer edge
no dependency cycle
no new foundation upward dependency
```

### 10.3 State equivalence fixtures

Run exact v0.68 baseline and v0.69 candidate over the same fixtures and require deep equality for:

- fresh `initialState()`;
- empty object;
- malformed scalar fields;
- legacy `narrativeYear` state;
- legacy content-memory contamination;
- recurrence registry normalization;
- lineage null/legacy normalization;
- handoff registry normalization;
- Community platformMax normalization;
- stale global reaction floor deletion;
- pending inactive/active portable state;
- current v0.68 healthy persisted state.

### 10.4 Session-path differential fixtures

Require decision-equivalent results for:

- fresh init;
- verified mirror-fast init;
- stored snapshot init;
- existing mirror fallback;
- broken mirror -> fresh fallback;
- narrative current-time-floor migration;
- Community classifier migration no-op/current path;
- recurrence bootstrap path;
- `stateForOutput()` memory-fast path;
- `stateForOutput()` storage-fallback path;
- `portableState()` serialization.

### 10.5 Frozen positive controls

Still require:

```text
ordinary SAME_FAST
REPRESENTATION_FAST_RECONCILED fixture
USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT fixture
Deferred Mirror one-Fresh-read strict guards
THOUGHTS compatibility fixtures
Structure judge-only fixtures
Community v3 parent/local alias classifier fixtures
Frame / Time / B_END chronology fixtures
Recurrence / Lineage / Handoff fixtures
```

### 10.6 Surface expansion checks

Require no delta in:

```text
persistent storage keys/schema
host API surface
network calls
polling loops
new timers
provider-cache claims
request-history mutation policy
```

## 11. Real long-chat acceptance matrix

Because v0.69 changes state construction/reconciliation ownership, live proof must prioritize state hydration rather than rare creative labels.

### Stage A — ordinary warm continuity

Required natural A or C turn:

```text
Version 0.69.0
CURRENT TURN
request hook SEEN
core handshake FOUND
binding BOUND
output COMMITTED
stale 0
continuity PASS
frame PASS or not-applicable
no new Structure warning attributable to state extraction
```

### Stage B — persisted-state rehydration

Required one genuine reload/re-entry specimen that exercises a non-fresh state source, such as:

```text
LOCATION_REUSE
mirror-fast
snapshot
compatible mirror fallback
host-local telemetry adoption followed by normal Core state load
```

Acceptance:

```text
state fields preserved
no unexpected history bootstrap
no version/schema migration invented
current mode/clock/broadcast state remains coherent
next ordinary turn commits normally
```

Do not force a malformed state merely to exercise fallback.

### Stage C — Community continuity

Required natural Mode C specimen after Stage B or in the same live window:

```text
Community state available
classifier v3 remains current
reaction/platform maxima behavior unchanged
warnings 0 or any unrelated warning separately classified
```

### Bonus controls

Preserve if naturally encountered:

- genuine visible edit;
- recurrence repeated template;
- Lineage chained C;
- Handoff eligible/ineligible specimen;
- B lifecycle.

Do not fabricate rare outputs solely for live evidence when permanent deterministic fixtures already own the branch.

## 12. Anomaly handling during live validation

Any anomaly must be preserved immediately and classified:

```text
WATCH
DEFER
FIX
BLOCKER
```

Existing WATCH items remain separate unless the new State Reconcile owner is directly proven causal.

In particular, recurrence of `THOUGHTS_UNRESOLVED_KNOWLEDGE_QUARANTINE`, `PARTIAL_PREVIOUS_TURN_REPLAY`, Community diversity misses, or edit latency must not automatically be blamed on v0.69.

## 13. Stop conditions

Stop implementation/publication and preserve evidence if any of the following occurs:

- architecture-authority projection prerequisite is still stale;
- a real runtime consumer requires Kernel to remain a state-reconcile facade;
- state extraction requires a persistent schema/key/version change;
- candidate state fixture differs from v0.68 baseline;
- initialization/reconciliation ordering changes observable behavior;
- Kernel retains any of the four upward domain requires;
- a new foundation upward dependency appears;
- a cycle or undeclared architecture edge appears;
- Session must absorb broad new orchestration to make extraction work;
- a generic catch-all `state`/pipeline module becomes necessary;
- network, host, polling, timer or provider-cache surface expands;
- unrelated WATCH repair becomes necessary to make the candidate pass;
- `latest.js` and `install.js` diverge.

## 14. Work and release sequence

After the prerequisite is closed and implementation is explicitly activated:

1. re-read exact current `main` and `release-simcore`;
2. create a fresh runtime work branch;
3. materialize exact v0.68 production source as the parent;
4. perform only the frozen State Reconcile / Kernel inversion transform;
5. run static, differential and permanent CI proof;
6. publish through current authorized release machinery to `release-simcore`;
7. verify `latest.js == install.js` and exact production identity;
8. perform real long-chat Stage A/B/C;
9. classify and preserve every anomaly;
10. only after human LIVE_PASS, converge terminal state through current R2.8 human-evidence authority;
11. sync main architecture/docs/long-term state;
12. run post-M2-6 architecture-freeze review. No automatic M2-7.

## 15. Current authorization verdict

```text
V06800_PRODUCTION
= LIVE_PASS / M2-5

POST_M2_5_ROADMAP_RECONCILIATION
= COMPLETE

M2_6_SCOPE
= STATE_RECONCILE_OWNERSHIP_EXTRACTION_PLUS_KERNEL_DEPENDENCY_INVERSION

V06900_DESIGN
= FROZEN

V06900_IMPLEMENTATION
= NOT AUTHORIZED YET

BLOCKER
= POST_06800_ARCHITECTURE_AUTHORITY_PROJECTION_CONVERGENCE

RUNTIME_MUTATION_THIS_DOCUMENT
= NONE

RELEASE_SIMCORE_MUTATION_THIS_DOCUMENT
= NONE
```
