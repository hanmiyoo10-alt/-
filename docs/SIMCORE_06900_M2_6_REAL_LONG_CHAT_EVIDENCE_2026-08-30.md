# SimCore v0.69.0 M2-6 Real Long-Chat Evidence

Date: 2026-08-30 KST
Status: **M2-6 LIVE MATRIX PASS · TERMINAL LIVE_PASS HELD BY SEPARATE REFRESHLESS `+` UPDATE FIX CANDIDATE**
Classification: **HUMAN REAL-LONG-CHAT EVIDENCE / PERFORMANCE WATCH PRESERVED**

## 1. Production authority

```text
Version: 0.69.0
Release: M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion
release-simcore: 31b4c5075659a55861731c6fd73f999402321e94
latest/install blob: 86954f4d7ff7dec9119e2a8c047bfbfa6f801d56
latest.js == install.js: YES
machine validation state before this evidence: PENDING_REAL_LONG_CHAT
```

This evidence evaluates only the published M2-6 runtime behavior. The separately recorded refreshless targeted `+` update/unload concern remains an independent runtime-lifecycle FIX candidate and prevents terminal v0.69 LIVE_PASS until resolved or disproven.

Separate authority:

- `docs/SIMCORE_06900_REFRESHLESS_PLUS_UPDATE_RECHECK_2026-08-30.md`

## 2. Operator packet and specimen ordering

The operator supplied four diagnostic contexts from one long-running chat/runtime generation:

```text
runtime generation: mtf0srpl-grjj8v
runtime boot: 2026-08-29T23:37:12.777Z
version: 0.69.0
```

Ordering:

1. one copied diagnostic with `Probe context: STALE`;
2. first current natural A turn, operator marked as after refresh/re-entry;
3. second same-generation natural A turn;
4. natural Mode C turn after a deliberate visible hand edit of the preceding assistant output.

The stale diagnostic is preserved but excluded from acceptance counting because it truthfully reported:

```text
Probe context: STALE
Request hook: n/a
Runtime status: n/a
Stability: NOT_EXERCISED
```

This is fail-closed observability, not a runtime failure.

## 3. Stage A — ordinary warm continuity

### A1 — user @2446 -> assistant @2447

```text
Version: 0.69.0
Probe context: CURRENT TURN
Request hook: SEEN
Core handshake: FOUND
Runtime status: ACTIVE / COMMITTED
Mode: A
Binding: BOUND
Mirror: COMMITTED
Stale drops: 0
Warnings: 0
Continuity summary: PASS
Frame sequence: PASS
Frame guard: PASS / NONE
```

Representation/edit positive continuity:

```text
Edit reconcile: SAME_FAST
Prior representation: EXACT
Edit origin: NONE
Fresh carryover: EXACT
Snapshot: UNCHANGED
Deferred mirror: COMMITTED
```

State/clock continuity remained coherent:

```text
Narrative previous: 2034-02-04 10:30 AM
Narrative committed: 2034-02-04 02:30 PM
Broadcast: CLOSED / UNLOCKED
```

A1 verdict:

```text
PASS
```

### A2 — user @2448 -> assistant @2449

Same runtime generation and normal forward request:

```text
Version: 0.69.0
Probe context: CURRENT TURN
Request hook: SEEN
Core handshake: FOUND
Runtime status: ACTIVE / COMMITTED
Mode: A
Binding: BOUND
Mirror: COMMITTED
Stale drops: 0
Warnings: 0
Continuity summary: PASS
Frame sequence: PASS
Frame guard: PASS / NONE
```

Representation/edit control again remained exact:

```text
Edit reconcile: SAME_FAST
Prior representation: EXACT
Edit origin: NONE
Snapshot: UNCHANGED
Deferred mirror: COMMITTED
```

Narrative state advanced coherently from the immediately preceding accepted state:

```text
Previous: 2034-02-04 02:30 PM
Committed: 2034-03-06 08:30 AM
```

A2 verdict:

```text
PASS
```

Stage A overall:

```text
ORDINARY_WARM_CONTINUITY = PASS
SAME_GENERATION_SECOND_TURN = PASS
M2_6_ATTRIBUTABLE_FAILURE = NONE
```

## 4. Stage B — persisted-state rehydration / re-entry

The operator explicitly marked the first current-turn specimen as occurring after refresh/re-entry.

The first accepted current turn reported:

```text
Session load: LOCATION_REUSE
chat fallback: 0.0 ms
init scan: 0.0 ms
init: 0.0 ms
```

`LOCATION_REUSE` is one of the frozen v0.69 Stage-B accepted non-fresh state-source specimens.

Observed state integrity after re-entry:

```text
Stored last mode: A
request/output binding: BOUND / COMMITTED
snapshot exact carryover: SAME_FAST / UNCHANGED
narrative clock: coherent and forward
broadcast state: CLOSED / UNLOCKED
unexpected history bootstrap: none surfaced
schema/version migration warning: none
stale drops: 0
warnings: 0
```

The immediately following ordinary turn also committed normally in the same generation, satisfying the next-turn health control.

Telemetry itself reported:

```text
Telemetry continuity: FRESH / host-local-incompatible
Session surface: WINDOW ACCESS_ERROR / GLOBAL_THIS ACCESS_ERROR
Host-local transport: API PRESENT / store USABLE
```

This does not invalidate M2-6 Stage B because Core state re-entry used `LOCATION_REUSE`; v0.69 does not require Host-local telemetry adoption when another legitimate non-fresh Core session source is present. The incompatible telemetry capsule failed closed and did not disturb Core state.

Stage B verdict:

```text
PERSISTED_STATE_REHYDRATION = PASS
NON_FRESH_SOURCE = LOCATION_REUSE
NEXT_ORDINARY_TURN = PASS
UNSAFE_STATE_ADOPTION = NONE
```

Important scope boundary:

This Stage-B result is ordinary refresh/re-entry evidence. It does not close the separately identified no-page-refresh targeted `+` install/update lifecycle concern.

## 5. Bonus genuine visible-edit positive control

Before the Mode C request, the operator deliberately hand-edited the preceding assistant output.

The next request correctly classified the changed visible body even though character length was unchanged:

```text
Prior canonical: 2809:a3c11f0f
Prior Fresh:     2809:a3c11f0f
Current visible: 2809:5a087de0

Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT
Snapshot: UPDATED
Rebuild attribution: PREEXISTING_REQUEST_MUTATION / HIGH
```

This is the frozen genuine-edit positive control and proves that v0.69 State Reconcile extraction did not collapse a real user edit into SAME_FAST or representation drift.

Functional verdict:

```text
GENUINE_EDIT_CLASSIFICATION = PASS
MANUAL_EDIT_REBUILD = PASS
SNAPSHOT_UPDATE = PASS
```

### Performance classification

The semantic path was correct but expensive:

```text
Edit reconcile: 18.476 s
Request prepared: 19.708 s
Edit reconcile share: 93.6%
```

Classification:

```text
WATCH · PERFORMANCE · GENUINE_EDIT_REBUILD_LATENCY
M2_6_CAUSALITY = NOT ESTABLISHED
FUNCTIONAL_BLOCKER = NO
```

This belongs to the pre-existing genuine-edit latency investigation lane. v0.69 explicitly did not authorize Edit Reconcile performance work.

## 6. Stage C — Community continuity

The post-edit natural Community request:

```text
user @2450: [커뮤니티] 런닝맨 반응
assistant @2451
Mode: C
```

Runtime result:

```text
Probe context: CURRENT TURN
Request hook: SEEN
Core handshake: FOUND
Runtime status: ACTIVE / COMMITTED
Binding: BOUND
Mirror: COMMITTED
Stale drops: 0
Warnings: 0
Short-C source lock: ON
Request lineage: CHAIN / root A@2448 / parent A@2448 / depth 1
Source handoff: NEW SOURCE
Continuity summary: REPAIRED
Frame sequence: REPAIRED
Frame guard: REPAIRED / CHATINDEX_SAME
```

Visible output retained the expected Community structure with multiple canonical platform families and one final Knowledge block. No Structure/Reaction warning was emitted.

The Evidence boundary conservatively applied only the root fence:

```text
Evidence mode: ROOT_ONLY
root fence: APPLIED
source fence: SKIPPED / unsafe-source-boundary
```

The skipped transformed-source fence is a fail-closed boundary decision after the deliberate prior visible edit. It did not cause unsafe source mutation or output failure and is not classified as an M2-6 defect.

Stage C verdict:

```text
COMMUNITY_CONTINUITY = PASS
LINEAGE_CHAIN = PASS
SOURCE_HANDOFF = HEALTHY
STRUCTURE_REACTION_WARNING = NONE
M2_6_ATTRIBUTABLE_FAILURE = NONE
```

Community classifier-v3 identity remains deterministic/static release authority; this natural live packet supplies continuity evidence, not a replacement for the permanent classifier fixture.

## 7. Separate cache/history observations

The A/C specimens repeatedly reported:

```text
Cache integrity: DEGRADED
Cache break: PRE_SIMCORE / CHAT_HISTORY
SimCore contribution: NOT_FIRST_BREAK
History stabilization: OBSERVE_ONLY
provider cache: UNVERIFIED
```

These are preserved as existing cache/history observation lanes. The packet itself says SimCore was not the first break, and no request-history mutation by SimCore was reported.

Classification:

```text
WATCH / DEFER · PRE_SIMCORE CACHE-HISTORY FRONTIER
M2_6_CAUSALITY = NOT ESTABLISHED
LIVE_GATE_BLOCKER = NO
```

## 8. Long-chat storage latency observation

Even ordinary turns showed elevated persistence cost in this very long chat:

```text
A1 turn storage set: 536 ms
A1 out storage:      1.591 s

A2 turn storage set: 266 ms
A2 out storage:      1.631 s

C turn storage set:  1.178 s
C out storage:       1.829 s
```

This does not alter semantic acceptance because every state/output commit succeeded and mirror completion followed. Preserve as performance observation rather than attributing it to State Reconcile ownership movement.

Classification:

```text
WATCH · LONG_CHAT_STORAGE_LATENCY
M2_6_CAUSALITY = NOT ESTABLISHED
FUNCTIONAL_FAILURE = NONE
```

## 9. M2-6 live-matrix verdict

Against the frozen v0.69 design acceptance matrix:

```text
Stage A ordinary warm continuity       PASS
Stage B non-fresh state rehydration    PASS via LOCATION_REUSE
Stage B next ordinary turn             PASS
Stage C natural Community continuity   PASS
Bonus genuine visible edit             PASS semantically
M2-6-attributable warning              NONE
M2-6-attributable FIX/BLOCKER          NONE
```

Therefore:

```text
V06900_M2_6_REAL_LONG_CHAT_MATRIX = PASS
STATE_RECONCILE_LIVE_EQUIVALENCE = SUPPORTED
KERNEL_INVERSION_RUNTIME_REGRESSION = NOT OBSERVED
```

## 10. Why terminal v0.69 LIVE_PASS is not declared yet

A separate current-production concern was already preserved before this packet:

```text
V06900_REFRESHLESS_PLUS_UPDATE
= FIX CANDIDATE
= RUNTIME LIFECYCLE / TARGETED UNLOAD
```

That track concerns no-page-refresh targeted plugin replacement and an asynchronous telemetry await before physical hook retirement. It is not a State Reconcile failure, but its authority currently states:

```text
v0.69 LIVE_PASS = MUST NOT be declared
```

Accordingly this evidence advances the product to:

```text
M2-6 HUMAN REAL-LONG-CHAT MATRIX = PASS
TERMINAL RELEASE LIVE_PASS = HELD
HOLD REASON = SEPARATE REFRESHLESS TARGETED-UPDATE FIX CANDIDATE
```

Do not run terminal release-state convergence until the targeted `+` update lane is resolved or disproven under its own evidence/implementation workflow.

## 11. Preserved classifications

```text
PASS  M2-6 ordinary warm continuity
PASS  M2-6 LOCATION_REUSE state rehydration
PASS  M2-6 next-turn continuity
PASS  natural Mode C Community continuity
PASS  genuine-edit semantic positive control

WATCH PERFORMANCE genuine-edit rebuild 18.476 s
WATCH LONG_CHAT_STORAGE_LATENCY
WATCH/DEFER PRE_SIMCORE cache-history frontier

FIX CANDIDATE refreshless targeted `+` update/unload lifecycle
BLOCKER to terminal v0.69 LIVE_PASS only: unresolved targeted-update lane
```

No runtime mutation, release-simcore mutation, or release-state terminal convergence is performed by this evidence document.
