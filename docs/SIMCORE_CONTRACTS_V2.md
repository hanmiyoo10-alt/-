# SimCore 2.0M Major — M1 Contracts v2

> Production baseline: `v0.63.55 — Representation Fast Reconcile`
>
> M1 status: **COMPLETE — DESIGN/CI ONLY, PRODUCTION RUNTIME UNCHANGED**
>
> M2 runtime refactor authorization: **BLOCKED until v0.63.55 real long-chat Representation Fast Reconcile is observed successfully.**

---

## 1. M1 Decision

M0 showed that SimCore does not need a whole-system rewrite. The 2.0M Major will preserve stable domain modules and concentrate refactoring on ownership drift.

M1 locks four architectural directions:

```text
Contracts v2 dependency rules
+
Representation as a first-class bounded subsystem
+
Edit Reconcile as one application service
+
Recovery split by execution phase
```

M1 is intentionally non-behavioral. It defines the target contract and adds a CI drift guard, but it does not move the v0.63.55 code currently under live validation.

---

## 2. Stable Modules — Preserve

These modules have coherent ownership and are not Major-Update rewrite targets:

```text
store
community
recurrence
lineage
handoff
evidence
time
frame
reaction
structure
prompt
ops

runtime-host
runtime-cache
runtime-topology
runtime-cache-candidates
runtime-telemetry
runtime-session
runtime-hooks
runtime-probe
```

`runtime-mirror`, `kernel`, `lifecycle`, `recovery`, and `session` stay operationally unchanged in M1 but have ownership debt or future narrowing work.

---

## 3. Layer Contract

```text
Foundation
  contracts / store / current kernel transition boundary
        ↓
Domain
  community / recurrence / lineage / handoff / evidence
  time / frame / lifecycle / reaction
        ↓
Validation
  structure
        ↓
Representation
  representation (planned)
        ↓
Application
  prompt / session / current recovery
  edit-reconcile / output-compat / bootstrap-migration (planned)
        ↓
Runtime
  host / session adapter / mirror / hooks / cache / topology / telemetry / probes
```

This diagram expresses allowed direction, not compulsory physical files.

### Dependency rules

1. Foundation may depend only on Foundation.
2. Domain may depend on Foundation or Domain.
3. Validation may depend on Foundation, Domain, or Validation.
4. Representation may depend only on Foundation/Representation.
5. Application may compose Foundation, Domain, Validation, Representation, and Application services.
6. Runtime may consume lower layers through explicit interfaces/adapters.
7. Core modules must never gain direct dependencies on Runtime modules.
8. Existing M0 debt is allowlisted explicitly and cannot expand silently.

### Current transition exception

`kernel` currently imports:

```text
community
recurrence
lineage
handoff
```

This is a known M0 inverted-dependency debt. Contracts v2 permits exactly these existing edges as transition exceptions. Any additional upward edge is a CI failure.

The exception is not a permanent design endorsement. When M2 removes an edge, the contract must remove the exception as well.

---

## 4. Lifecycle Decision

M0 left two choices:

```text
A. Keep Lifecycle as the request-domain preparation coordinator.
B. Extract a new Turn/Request Pipeline immediately.
```

M1 selects **Option A for the first M2 pass**.

Reason:

- the current Lifecycle behavior is stable;
- immediate extraction would widen the refactor surface without solving the highest-value ownership problem;
- Representation/Edit/Recovery have stronger evidence for extraction;
- a Turn Pipeline can be reconsidered after mechanical equivalence is proven.

Therefore M2 must not create a Turn Pipeline merely for aesthetic modularity.

---

## 5. Representation Contract

`representation` is a planned first-class subsystem.

### Owns

```text
exact fingerprint identity
CANONICAL / HOST_RAW / FRESH_CHAT relation taxonomy
representation-state classification
bounded provenance metadata/ledger
exact carryover shape classification
Fresh-confirmed identity/alias metadata
```

### Does not own

```text
raw response-body persistence
semantic envelope parsing or prose repair
chat writes
persistent Core state
history mutation
provider cache logic
network
timers
```

Canonical invariant:

> **Fresh is identity evidence, not a body source.**

The new subsystem may retain bounded fingerprints/metadata only. It must not copy or persist the Fresh body.

---

## 6. Edit Reconcile Contract

`edit-reconcile` becomes the single application service for the previous-assistant reconciliation decision tree.

It will eventually consolidate responsibility currently split between the outer runtime shell and `CoreRulesetSession.reconcileEditedOutput()`.

### Owns

```text
SAME_FAST / SAME_HOST_FAST selection
snapshot exact-match path selection
representation exact-carryover acceptance
USER_EDIT_CANDIDATE routing
REPRESENTATION_DRIFT_CORRELATED routing
AMBIGUOUS_CHANGE routing
manual rebuild fallback coordination
bounded reconcile telemetry result
```

### Does not own

```text
representation taxonomy/provenance storage
host Fresh reads
Deferred Mirror write scheduling
diagnostic text rendering
provider cache claims
```

Positive control that must never regress:

```text
Prior EXACT
current != canonical
current != prior Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
```

v0.63.55 success behavior that must be preserved after live validation:

```text
Prior OUTPUT_MISMATCH
current == prior FRESH_CHAT EXACT
same slot/location + canonical CoreSession identity still trusted
→ representation-only fast acceptance
→ snapshot UNCHANGED
→ no full state rebuild
```

---

## 7. Recovery Phase Split

Current `recovery` is a legacy container with two real execution phases.

### Planned `output-compat`

Owns:

```text
preamble compatibility classification
response-envelope candidate selection
canonical output compatibility
Tail placement compatibility
bounded Fresh-confirmation candidate metadata
safe structural-boundary confirmation
```

It does not own edit attribution or history bootstrap.

### Planned `bootstrap-migration`

Owns:

```text
history bootstrap
legacy clock/age repair
legacy contamination repair
cold/migration coordination
```

It does not run ordinary output compatibility.

This split should initially be mechanical: move responsibility without changing decisions, ordering, storage behavior, output bytes, or diagnostics meaning.

---

## 8. Session and Runtime Mirror Target

### `session`

Long-term target:

```text
session identity/current-state holder
+
bounded orchestration
```

The following responsibilities are extraction candidates:

```text
edit reconcile
bootstrap/migration coordination
possibly output-finalize composition later
```

Do not split output-finalize during the first M2 pass unless mechanical extraction produces a clear ownership win with identical regression results.

### `runtime-mirror`

Keep:

```text
Fresh chat read
strict identity/location/staleness gates
mirror write scheduling
```

Move later:

```text
representation relation classification
bounded representation provenance ownership
```

Deferred Mirror safety behavior itself remains frozen.

---

## 9. M2 Authorization Gate

M1 deliberately blocks physical runtime refactoring until live v0.63.55 evidence exists.

Required gate:

```text
Version 0.63.55
same-runtime continuity
Prior representation: OUTPUT_MISMATCH
current previous assistant == recorded prior FRESH_CHAT EXACT
Edit reconcile: REPRESENTATION_FAST_RECONCILED
snapshot UNCHANGED
Edit origin: REPRESENTATION_DRIFT_CORRELATED
small reconcile cost; no 4–6 s MANUAL_EDIT_REBUILT
```

Genuine-user-edit positive control must remain:

```text
USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
```

Until the fast-path gate succeeds, `runtime_refactor_authorized` stays `false` in the machine-readable contract and planned M2 modules are forbidden from appearing physically in plugin source.

---

## 10. CI Architecture Drift Guard

Machine-readable contract:

```text
config/simcore-architecture-v2.json
```

Checker:

```text
python3 scripts/simcore-architecture-check.py
```

CI workflow:

```text
.github/workflows/simcore-architecture-contracts.yml
```

The checker enforces:

```text
all physical SimCore modules are declared
all required baseline modules remain present
no undeclared direct require edge appears
layer-direction rules
known transition exceptions cannot expand
stale transition exceptions must be removed when the source edge disappears
core → runtime direct dependency is forbidden
deferred modules cannot appear without contract promotion
planned M2 modules cannot appear while runtime_refactor_authorized=false
latest.js and install.js expose the same module dependency graph
```

This is a **drift guard**, not a style linter. It is designed to stop architecture debt from silently increasing while M2 is staged.

---

## 11. M2 Mechanical Order

After live authorization:

```text
M2.1
Create target module boundaries/adapters with no behavior change.

M2.2
Split Recovery:
recovery → output-compat + bootstrap-migration.

M2.3
Extract Representation ownership from runtime-mirror / outer shell.

M2.4
Extract Edit Reconcile from outer shell + Session.

M2.5
Narrow Session and Runtime Mirror contracts.

M2.6
Remove old transition code only after equivalence/regression evidence.

M2.7
Shrink Contracts v2 transition exceptions as actual source edges disappear.
```

Each step gets its own checkpoint. New feature behavior must not be mixed into a mechanical move.

---

## 12. Frozen During M1/M2 Mechanical Work

```text
Broadcast lifecycle semantics
Frame / Continuity / Evidence / Lineage / Handoff / Recurrence
Structure as judge-only
COMMUNITY quarantine behavior
TAIL_AFTER_CURRENT_USER
History stabilization = OBSERVE_ONLY
Host Prefix Attribution
provider cache = UNVERIFIED
persistent schema unless separately approved
Deferred Mirror identity/location/staleness safety
Fresh-body non-retention
v0.63.53/.54 envelope recovery behavior
v0.63.55 genuine-edit positive control
```

If a later modularization idea requires violating one of these, it is a contract conflict and must be surfaced before implementation.

---

## 13. M1 Completion Condition

M1 is complete when:

```text
ownership map is explicit
dependency direction is machine-readable
known debt is explicit and non-expandable
M2 target ownership is explicit
M2 live gate is explicit
CI guard is installed
production runtime remains byte-for-byte untouched by M1
```

Status: **COMPLETE**.
