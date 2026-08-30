# SimCore v0.70.1 Cold First-Turn Tail Attribution Design

Date: 2026-08-30 KST

Status: **DESIGN FROZEN · IMPLEMENTATION NOT YET AUTHORIZED · REQUIRES v0.70.0 HUMAN LIVE CLOSE**

Classification: **POST-M2 PERFORMANCE / ATTRIBUTION MINI · RUNTIME OBSERVABILITY ONLY · NO SEMANTIC CHANGE**

## 1. Release identity

```text
Target version: 0.70.1
Release name: Cold First-Turn Tail Attribution
Release class: PERFORMANCE / ATTRIBUTION MINI
Primary owner: OPS + outer request hook timing boundary
Major checkpoint: M2-6 unchanged
Expected production parent: v0.70.0 Current Task Primacy Guard
Parent release commit: 13179cff70feaf7d12fe53c56e4735155fcf3eaa
Parent latest/install blob: addf07e273a6fc87f04cdadcb51fa3aa5d6fe298
```

Current authority boundary at design time:

```text
v0.70.0 acceptance matrix = A/B/C/D PASS recorded on main
v0.70.0 HUMAN_EVIDENCE LIVE_PASS = not inferred by this design
R2.8 terminal convergence = must remain unchanged and separate
R2.9 shadow validation projection = non-runtime release-system lane, already separate
```

This design may be frozen before v0.70.0 terminal closure, but implementation/publication is blocked until the existing v0.70.0 human live gate closes normally.

## 2. Why this is the next candidate

Post-M2 review previously retained `LONG_CHAT_STORAGE / COLD_INIT cost` as a performance WATCH because recurrence existed but a bounded SimCore-owned redundant-work owner had not been proven.

The v0.70.0 live window strengthens one specific subfamily: first-request tail latency after a fresh runtime/session boundary.

Cross-version evidence:

```text
v0.65.0 first post-refresh
request total     4.510 s
handshake         980 ms
onSend            494 ms
post-onSend       3.035 s
next same-generation request total 270 ms

v0.69.1 full-refresh evidence
cold request      4.720 s
character load    1.035 s
turn storage      637 ms
post-onSend       3.002 s
output storage    745 ms
next warm request 454 ms

v0.70.0 generation mtfc7tze-9mosvb first captured request
request total     10.435 s
handshake         929 ms
onSend            508 ms
post-onSend       8.997 s
next warm request 394 ms

v0.70.0 generation mtfdi2i2-4w4l48 first captured request
request total     9.878 s
handshake         1.056 s
onSend            389 ms
post-onSend       8.433 s
next warm request 289 ms
```

The shape is now recurrent across multiple runtime generations and versions:

```text
fresh/cold first request -> multi-second residual tail
same-generation warm request -> sub-second request preparation
```

The latest two v0.70 samples are materially larger than the earlier ~3 s specimens.

However existing diagnostics expose the long interval only as a residual `post-onSend` bucket. They do not prove whether that elapsed time is:

- explicit SimCore-owned work after the current `onSend` timer;
- an awaited host/storage boundary already hidden outside the named sub-breakdown;
- host callback/event-loop scheduling between SimCore checkpoints;
- or a mixed boundary.

Therefore a direct optimization patch would still be speculative.

## 3. Selected v0.70.1 goal

v0.70.1 does **not** attempt to make the first request faster.

It closes the attribution gap so the next decision can be evidence-backed.

Selected goal:

```text
split the current residual post-onSend interval into bounded named checkpoints
without changing request order, awaited operations, storage semantics, prompt bytes, state, or output behavior
```

The release succeeds if a real fresh/cold first request can be classified into one of:

```text
SIMCORE_NAMED_TAIL
HOST_OR_SCHEDULER_GAP
MIXED_OR_UNRESOLVED
```

with enough timing evidence to decide whether a later performance fix is justified.

## 4. Ownership scope record

Initial semantic owner:

```text
OPS diagnostics
+ outer request hook timing shell only
```

Allowed source inspection/mutation scope:

```text
request hook timestamp collection
existing request breakdown accounting
existing diagnostic report formatting
bounded in-memory timing state required for the current request only
release/version adjacency and deterministic fixture code
```

Scope must expand only if exact source audit proves that an existing named post-onSend operation lives in another owner and cannot be timed from the outer shell without changing behavior.

Forbidden scope expansion without a new design revision:

```text
Session behavior
Store durability policy
Prompt compiler semantics
Lifecycle semantics
Representation/Edit Reconcile
Output Finalize/Mirror
Community/Frame/Time/Recurrence/Lineage/Handoff
persistent telemetry capsule schema
host-local mailbox schema
release-system R2.x
```

## 5. Timing contract

Implementation must begin by locating the exact request-shell statements that currently define:

```text
hook start
handshake complete
prepared
onSend timing
request done
post-onSend residual
```

The exact source audit must then insert read-only monotonic checkpoints around existing boundaries. No new `await`, callback, yield, timer, storage operation, or host call may be introduced merely to measure time.

The final names may adapt to actual source topology, but the semantic model must remain:

```text
POST_ONSEND_TOTAL
= sum(NAMED_SIMCORE_SEGMENTS)
+ UNATTRIBUTED_GAP
```

Required diagnostic properties:

```text
all segment durations >= 0
sum named + unattributed ~= existing post-onSend total within clock-rounding tolerance
no segment may claim ownership of time outside its surrounding exact checkpoints
if no SimCore statement executes across a long interval, keep it UNATTRIBUTED rather than labeling it SimCore
```

Suggested output shape, subject to exact source audit:

```text
Post-onSend attribution:
  simcore tail <n> ms
  host/scheduler gap <n> ms
  unattributed <n> ms
  first-request COLD_INIT|LOCATION_REUSE|other
  confidence EXACT_CHECKPOINT|BOUNDED|UNRESOLVED
```

Do not expose raw prompt/chat bodies, stack traces, host internals, or unbounded event logs.

## 6. Bounded data rule

The attribution record is current-request memory only.

```text
persistent state change = NONE
SnapshotStore schema/key change = NONE
Host-local telemetry schema/key change = NONE
raw body retention = NONE
new chat write = NONE
new network I/O = NONE
new storage read/write = NONE
new interval/timeout = NONE
```

Existing durable telemetry may continue unchanged. v0.70.1 must not persist the new tail-attribution sample across reloads.

## 7. Explicit non-goals

v0.70.1 does not authorize:

- reducing or skipping state persistence;
- batching, delaying, or removing a required write;
- changing `setChat`, SnapshotStore, Host-local, or Session durability behavior;
- changing request ordering;
- moving the runtime prompt;
- changing Current Task Primacy rules;
- changing compatibility/preamble behavior;
- provider-cache tuning;
- event-loop monkeypatching;
- background timers or polling;
- broad performance refactor;
- genuine-edit rebuild optimization;
- R2.9 activation or release-system mutation;
- M2-7 architecture work.

This is an attribution release, not a speed claim.

## 8. Static acceptance matrix

### Identity and packaging

```text
userscript metadata = 0.70.1
SIMCORE_RUNTIME_VERSION = 0.70.1
HOST_COMPAT_VERSION = 0.70.1
latest.js == install.js byte-for-byte
node --check both PASS
```

### Behavioral freeze

Candidate-vs-v0.70.0 source proof must establish:

```text
Prompt compiler semantic bytes unchanged
Current Task Primacy rules unchanged
request message order unchanged
persistent state/schema versions unchanged
Community classifier unchanged
M2 architecture graph unchanged
existing storage/chat/network/timer call counts unchanged
```

### Instrumentation safety

Permanent fixture must prove:

```text
new checkpoint reads cannot throw request execution
checkpoint failure degrades attribution to UNRESOLVED, never request correctness
no new await/yield/callback/timer introduced
no new storage/network/chat write introduced
post-onSend accounting preserves the previous total
negative or impossible durations fail closed in diagnostics only
```

### Regression controls

Keep the full applicable v0.70.0 gate, including:

```text
Current Task Primacy deterministic fixture
Mode A / B_START / B_CONTINUE / B_END / C
Short-C source lock
Frame/Time continuity
Representation SAME_FAST and fast-reconcile controls
THOUGHTS compatibility
MamsHolic v0.69.2 alias controls
Contracts v2 / M2-6 freeze
R2.9 release-validation profile compatibility where applicable
```

## 9. Real long-chat acceptance matrix

### Stage A: fresh runtime first request

Obtain one true new runtime generation and send one ordinary long-chat request.

Require:

```text
CURRENT TURN
ACTIVE / COMMITTED / BOUND
Warnings attributable to v0.70.1 = 0
continuity/frame/state correctness PASS
Post-onSend attribution present
```

### Stage B: same-generation warm request

Send the next ordinary request without refresh/reload.

Require:

```text
LOCATION_REUSE or equivalent warm session state
same generation
correctness PASS
attribution present
```

### Stage C: second independent fresh runtime

Repeat the fresh-boundary control in another generation.

This is required because the target is a cold-first-turn recurrent class.

## 10. Attribution verdict rules

After two fresh samples plus warm controls, classify conservatively.

### `SIMCORE_NAMED_TAIL`

Use only if the large first-turn interval is repeatedly enclosed by a named exact SimCore operation/checkpoint span, and warm controls show the same named span materially collapsing.

Result:

```text
FIX candidate justified
follow-up optimization design may target that exact owner
v0.70.1 itself still makes no optimization claim
```

### `HOST_OR_SCHEDULER_GAP`

Use if the dominant delay occurs between SimCore checkpoints with no intervening SimCore-owned work that can account for it.

Result:

```text
no SimCore optimization release authorized from this lane
retain host/platform performance WATCH
```

Do not claim a specific host subsystem unless independently observable.

### `MIXED_OR_UNRESOLVED`

Use if samples disagree, timing closure is incomplete, or multiple boundaries contribute materially without one repeatable owner.

Result:

```text
WATCH / further investigation
no speculative optimization
```

## 11. Failure classification

### BLOCKER

```text
instrumentation changes request/output semantics
new timing code introduces waits/yields/I/O
latest.js != install.js
persistent schema changes unexpectedly
current-task/continuity regression
new warning/quarantine attributable to timing code
```

### FIX / DESIGN REVISION

```text
existing residual cannot be split without invasive cross-owner changes
timing closure cannot preserve current request accounting
measurement overhead becomes material
```

### WATCH

```text
one isolated timing anomaly with correctness intact
host/scheduler gap with insufficient external attribution
```

## 12. Performance overhead budget

The measurement itself must be effectively negligible relative to the target.

Design requirement:

```text
monotonic timestamp reads only on existing execution boundaries
no arrays of per-event history
no raw trace persistence
bounded fixed-size current-request record
```

Static benchmark/fixture should compare the same request-shell path with instrumentation enabled and ensure no deliberate asynchronous boundary was added. Live evidence should report measured instrumentation/accounting cost when available rather than inventing a provider-independent percentage claim.

## 13. Relationship to other open work

### v0.70.0

The product remains governed by the current manifest until explicit HUMAN_EVIDENCE closes the live gate.

This design does not change that status.

### R2.8

Terminal convergence remains the existing unchanged human-evidence path. No R2.8 semantics are modified here.

### R2.9

R2.9 shadow validation projection is a release-system/control-plane lane. It must remain physically and semantically separate from v0.70.1 runtime instrumentation.

### Existing WATCH items

The natural output representation mismatch and stale diagnostic-probe observations from the v0.70 live window remain separately preserved. They are not part of v0.70.1 scope.

## 14. Implementation sequence if separately authorized

```text
1. require v0.70.0 explicit HUMAN LIVE_PASS and ordinary terminal close
2. re-read current main + release-simcore authority
3. exact source audit of request timing ownership only
4. create runtime work branch from exact v0.70.0 production parent
5. add read-only checkpoints with zero control-flow/I/O changes
6. update diagnostic builder/output for bounded attribution
7. add deterministic timing-accounting fixture
8. run syntax/latest-install identity/full applicable CI
9. publish exact candidate through current release system
10. verify release-simcore latest == install
11. real long-chat fresh/warm/fresh matrix
12. classify result SIMCORE_NAMED_TAIL / HOST_OR_SCHEDULER_GAP / MIXED_OR_UNRESOLVED
13. human live decision
14. only then decide whether a speed-fix successor is justified
```

## 15. Design verdict

```text
NEXT_VERSION_CANDIDATE = 0.70.1
RELEASE_NAME = Cold First-Turn Tail Attribution
TARGET = recurrent cold first-request post-onSend latency attribution
CURRENT_EVIDENCE = recurrent and materially strengthened
SIMCORE_ROOT_OWNER = NOT YET PROVEN
OPTIMIZATION = NOT AUTHORIZED
OBSERVABILITY_MINI = DESIGN FROZEN
IMPLEMENTATION = BLOCKED UNTIL v0.70.0 HUMAN LIVE CLOSE
M2 = FROZEN AT M2-6
RELEASE_SYSTEM = OUT OF SCOPE
```

The engineering objective is to turn the current multi-second black box into a named ownership result without perturbing the request path. Once that result exists, the next performance decision can be mechanical instead of speculative.
