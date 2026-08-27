# SimCore Current Development Memory

> Living operational memory for SimCore.
>
> `SIMCORE_GUIDELINES.md` contains durable principles. This file is the **continuity document for active development**: current production state, active live gate, immediate next action, active regression controls, hard freezes, near-term roadmap, and bounded historical navigation.
>
> A new conversation should be able to read this file and answer four questions quickly:
>
> 1. What is production now?
> 2. What are we doing next, and why?
> 3. What larger work is planned after that?
> 4. What must not be changed without new evidence?

---

<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.64.8`
- Release: `Output-Complete Telemetry Checkpoint Repair`
- Release branch: `release-simcore`
- Release commit: `f5e29464452728f859a1a6a8191a846468353531`
- Release blob: `bed3d5faff9641071cdd9003b67c45d42b3e32ee`
- Declared validation status: `PENDING_REAL_LONG_CHAT`
- Major update milestone: `2.0M`
- Major update phase: `M2`
- Major update checkpoint: `M2-2`

This block is machine-managed from verified declared release state. It does not determine the immediate next action.
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->

<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:BEGIN -->
## Current Release Live Gate

- Release transaction: `simcore-v0.64.8-new-02`
- Production commit: `f5e29464452728f859a1a6a8191a846468353531`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Current priority / live gate: `06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT`
- R lifecycle: `REAL_RELEASE_LIVE_PENDING`

This block is machine-managed by `release-state-converge` from immutable publication evidence.
<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:END -->

---

# 1. Current Operational State

## Authority rule

The two machine-managed blocks above are the sole authority in this document for current production identity and the active release live gate. Human-authored sections below interpret current work and preserve active constraints; they never override the machine-managed values.

Detailed closed release history is no longer accumulated here. The pre-rollover document is preserved byte-for-byte at `history/CURRENT_DEVELOPMENT_PRE_ROLLOVER_2026-08-27.md`, with minor-family historical manifests under `history/`.

## Active product gate — v0.64.8

Current production is:

```text
Version: 0.64.8
Release: Output-Complete Telemetry Checkpoint Repair
release-simcore: f5e29464452728f859a1a6a8191a846468353531
release blob: bed3d5faff9641071cdd9003b67c45d42b3e32ee
Validation: PENDING_REAL_LONG_CHAT
Live scenario: 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
Major checkpoint: 2.0M / M2-2
```

v0.64.8 is the narrow repair for the v0.64.7 live-gate failure `OUTPUT_CHECKPOINT_CALLSITE_OMITTED`. It adds the output-complete telemetry checkpoint durability edge and exposes the checkpoint write disposition in Last Turn Diagnostic. It does not redesign provider cache, Representation/Edit Reconcile, Core persistence, or M2 ownership boundaries.

Required live sequence:

```text
A. obtain one healthy natural v0.64.8 output before reload
B. confirm Last Turn Diagnostic exposes an OUTPUT_COMMIT telemetry checkpoint
   expected healthy session disposition: SESSION · WRITTEN
C. same-tab page refresh / compatible runtime reload
D. send first natural request and capture the full diagnostic
E. send second natural request without retry/edit/reroll and capture the full diagnostic
```

First post-boundary acceptance target:

```text
new Runtime boot / generation
Telemetry continuity: ADOPTED · via SESSION
compatible observer topology/runtime-prefix/trajectory restored where applicable
provider cache remains UNVERIFIED
normal Core semantics remain unchanged
```

Second post-boundary acceptance target:

```text
trajectory continues from the restored observer state
no artificial family reset caused by handoff
no repeated adoption of the same single-consumption capsule
normal request/output/binding/chronology behavior remains intact
```

A genuine host/history/prefix change may still be reported honestly. The release is not required to hide `PRE_SIMCORE` changes; it is required to preserve observer continuity across the runtime boundary when the sidecar is compatible.

Runtime changes remain frozen while this live gate is pending. M2-3 remains blocked until the gate is classified and closed.

## Current release-system posture

```text
release-simcore = runtime / publication authority
main            = design / evidence / roadmap / current-state authority
latest.js == install.js remains mandatory
R2.2 is NON_RUNTIME and changes state-expression / closure integrity, not product correctness
```

Do not infer current production or current gate state from history files, archive recency, version ordering, or old human prose.

---

# 2. Active Regression Controls

These are historical discoveries whose **current operative rule** still constrains work.

## Representation / Edit Reconcile

```text
confirmed prior OUTPUT_MISMATCH
+ current visible == prior FRESH_CHAT exact
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

A genuine user edit must remain conservative:

```text
current visible differs from the known canonical/Fresh identity
+ genuine edit evidence / no exact representation proof
→ MANUAL_EDIT_REBUILT
```

The 2026-08-27 same-length hand-edit positive control remains useful evidence: changing visible content without changing its character length still produced a distinct fingerprint and the genuine-edit rebuild path. Do not substitute character-count equality for identity proof.

Historical detail: `history/SIMCORE_RELEASE_HISTORY_063.md` and the exact pre-rollover snapshot.

## Summary Scope Authority

For summary requests, the established scope classifier remains authoritative:

```text
NONE / ANNUAL_ONLY / CUMULATIVE_YOY
Summary factual authority > Recurrence factual carryover
```

Do not let older recurrence/history values replace a requested comparison baseline.

Historical detail: `history/SIMCORE_RELEASE_HISTORY_064.md`.

## Broadcast / Time / Frame

Preserve the validated contracts for:

```text
Broadcast End Authority and closure structure
post-B_END C current-time handoff authority
Narrative terminal-time observability / monotonic floor
Frame sequence / continuity guards
explicit historical-scene allowance
```

Do not combine those contracts with unrelated cache-observer or M2 ownership changes.

## Diagnostic review discipline

A diagnostic `PASS`, `STABLE`, `COMMITTED`, `Warnings: 0`, or `SimCore contribution: NO_BREAK` is subsystem-scoped evidence, not a guarantee that the visible answer semantically matched the current request.

Review diagnostic episodes using:

```text
RAW current user input
+ RAW visible output
+ previous/next turn
+ retry/reroll/edit/reload identity
+ changed fields
+ unchanged fields
+ subsystem diagnostics
```

Authority: `SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`.

## Provider cache wording

Provider behavior remains:

```text
provider cache UNVERIFIED
```

Local reusable-prefix/cache-topology telemetry is an observer proxy and must not be promoted into provider cache hit/miss claims.

---

# 3. Immediate Next / Stop Conditions

Current promoted action:

```text
Run v0.64.8 real-long-chat live validation.
Scenario: 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
Do not change runtime bytes while the live result is pending.
```

Required pre-refresh proof:

```text
Telemetry checkpoint: SESSION · WRITTEN · <bounded chars> · <bounded cost> · trigger OUTPUT_COMMIT
```

If the checkpoint is not written, preserve the exact diagnostic and classify the cause before refreshing repeatedly.

Post-refresh result routing:

```text
ADOPTED on first natural request
+ clean second-turn continuation
→ record LIVE_PASS evidence
→ close the v0.64.8 live gate through the durable main state path
→ only then select M2-3 implementation work

FRESH / rejected / missing handoff
→ preserve exact evidence
→ classify WATCH / DEFER / FIX / BLOCKER
→ unresolved FIX or BLOCKER stops advancement

new unrelated anomaly
→ preserve separately
→ do not silently fold it into v0.64.8 attribution
```

Do not start another runtime release merely because the current gate is pending. A new repair release is justified only by a bounded defect demonstrated by this gate.

---

# 4. Near-Term Roadmap

## M2-3 — Edit Reconcile Ownership Extraction

Status: **DESIGN FROZEN / IMPLEMENTATION BLOCKED BY CURRENT LIVE GATE**.

After v0.64.8 LIVE_PASS, the next planned runtime architecture checkpoint is the physical Edit Reconcile ownership extraction. It must preserve all active Representation/edit positive controls and must not absorb unrelated latency/cache work.

## Request latency work

Known storage/cold-init latency remains a later performance track. Hundreds-of-ms storage costs and occasional larger host/storage delays are evidence, but they are not part of v0.64.8 correctness scope.

## Provider cache investigation

Status: **EVIDENCE BLOCKED**.

Resume provider cache engineering only when authoritative provider-level cached-token/hit-miss evidence exists. Until then, preserve local observer telemetry and `provider cache UNVERIFIED`.

---

# 5. Deferred / Watches

Keep these separate from the active v0.64.8 gate unless new evidence proves direct causality:

- `PARTIAL_PREVIOUS_TURN_REPLAY`: recurrence is confirmed at the symptom-family level; root cause and SimCore attribution remain unproven. Same-input reroll is a control, not a second natural recurrence.
- refresh-boundary host-prefix shape changes: preserve as `PRE_SIMCORE / HOST_PREFIX_SHAPE_CHANGE` when observed; do not call them v0.64.8 failure by themselves.
- v0.63.53/v0.63.54 narrow envelope/safe-boundary special paths: do not force malformed output merely to exercise historical recovery branches.
- COMMUNITY structural compatibility: keep isolated from representation/envelope attribution unless recurrence independently proves it.
- turn/output storage latency: observed existing performance debt, not a v0.64.8 live-gate criterion without correctness consequence.

Evidence navigation:

- `SIMCORE_EVIDENCE_INDEX.md`
- `SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX.md`
- `SIMCORE_LIVE_06407_VALIDATION_2026-08-27.md`
- `SIMCORE_06407_OUTPUT_CHECKPOINT_LIVE_FAILURE_2026-08-27.md`
- `SIMCORE_06408_OUTPUT_COMPLETE_TELEMETRY_CHECKPOINT_REPAIR_ACTIVATION.md`
- `SIMCORE_06408_IMPLEMENTATION_EVIDENCE.md`

---

# 6. Current Hard Freeze

Unless new direct production evidence authorizes a narrower exception, do not change these while the active v0.64.8 gate is pending:

```text
Broadcast End Authority
Broadcast lifecycle / modes
Frame
Continuity
Evidence
Lineage
Source Handoff
Reaction
Recurrence
Structure acceptance / COMMUNITY quarantine
TAIL_AFTER_CURRENT_USER
compiler tiers
Deferred Mirror strict output gates
History stabilization OBSERVE_ONLY
Host Prefix Attribution
Cache trajectory semantics
provider cache UNVERIFIED wording
Representation fast-reconcile positive control
genuine-user-edit rebuild semantics
Summary Scope authority
persistent Core schema
network / timers / provider routing
raw-body retention policy
M2-3 physical ownership extraction
```

The only product behavior under current live validation is the already-published v0.64.8 output-complete telemetry checkpoint repair. `release-simcore` is immutable evidence until a separately authorized publication transaction occurs.

---

# 7. Historical Navigation

Historical detail moved out of this living document under the frozen rollover architecture.

Primary preservation surfaces:

- `history/CURRENT_DEVELOPMENT_PRE_ROLLOVER_2026-08-27.md` — byte-identical pre-rollover snapshot; preserves every old section and wording from source commit `ec52c7510f9a12a24c6d1bac6cf655a7b645193b`.
- `history/SIMCORE_RELEASE_HISTORY_063.md` — 0.63.x point-in-time release/evidence family manifest.
- `history/SIMCORE_RELEASE_HISTORY_064.md` — 0.64.x point-in-time release/evidence family manifest; current v0.64.8 remains current authority here, not historical authority there.

Repository-wide discovery remains available through existing evidence indexes and dedicated design/evidence files.

Historical files are **not** current production, gate, priority, or authorization authority even when they contain newer-looking or point-in-time `PRODUCTION` wording.

Architecture authority: `SIMCORE_CURRENT_DEVELOPMENT_SLIMMING_AND_HISTORY_ROLLOVER_DESIGN.md`.
Migration evidence: `SIMCORE_CURRENT_DEVELOPMENT_ROLLOVER_IMPLEMENTATION_EVIDENCE_2026-08-27.md`.

---

# 8. Quick Resume Checklist

When continuing SimCore development in a new conversation:

```text
1. Read Current Production Snapshot.
2. Read Current Release Live Gate.
3. Read Active product gate — v0.64.8.
4. Read Immediate Next / Stop Conditions.
5. Check Current Hard Freeze before editing runtime code.
6. Review any supplied diagnostics as a complete episode, including RAW input/output.
7. Implement only work authorized after the active gate state is resolved.
```

Current action in one line:

```text
v0.64.8 natural output checkpoint proof
→ same-tab refresh
→ first natural request diagnostic
→ second natural request diagnostic
→ classify/close live gate
```

Current advancement rule:

```text
v0.64.8 LIVE_PASS
→ close durable live state
→ then M2-3 may be selected for implementation

unresolved v0.64.8 FIX/BLOCKER
→ no M2-3
→ no unrelated runtime bundling
```
