# SimCore live evidence — v0.65.0 pre-refresh identity convergence and bounded Host-local write

Date: 2026-08-28

Status: **SUBGATE A PRE-REFRESH PREREQUISITE SATISFIED · POST-REFRESH ADOPTION NOT YET EXERCISED · M2-3 ACCEPTANCE NOT YET AUTHORIZED**

## Production authority

`release-simcore` at evidence review time:

```text
v0.65.0 — M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence
release commit c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
```

The production release metadata therefore agrees with the live diagnostic header `Version: 0.65.0`.

## Ordered-gate authority

The combined-release decision requires two ordered live subgates:

```text
Subgate A — identity + durable reload handoff closure
Subgate B — M2-3 ownership acceptance
```

Subgate B cannot be accepted until Subgate A proves a compatible Host-local capsule can be consumed across an operator-observed same-tab refresh.

Reference: `docs/SIMCORE_06500_COMBINED_IDENTITY_M2_3_RELEASE_DECISION_2026-08-28.md`.

---

## Specimen 1 — first v0.65.0 boot after update / no current-turn probe

Diagnostic identity:

```text
Version: 0.65.0
Captured: 2026-08-28T13:01:27.017Z
Runtime boot: 2026-08-28T12:58:44.735Z
generation mtcyjudb-lz4388
Probe context: UNAVAILABLE
Request hook: n/a
Runtime status: n/a
```

The runtime identity defect from v0.64.11 is no longer present in the visible diagnostic header.

This boot did **not** have a current request/observer state available:

```text
Stability: NOT_EXERCISED
request 0
Telemetry capsule: COMPACT_V2 · 0/16,384
COMPACTION_FAILED
Host-local transport: API UNOBSERVED
Telemetry checkpoint:
MEMORY COMPACTION_FAILED
SESSION NOT_ATTEMPTED
HOST_LOCAL NOT_ATTEMPTED
```

Interpretation:

```text
current-turn observer state unavailable
→ no valid v0.65.0 capsule could be produced on this event
```

This is **not** a failure of the ordered Subgate A pre-refresh requirement because the required prerequisite is an ordinary natural request that produces `COMPACT_V2 OK + HOST_LOCAL WRITTEN` before refresh.

The same packet reports:

```text
Telemetry continuity: FRESH · no compatible handoff
```

which is consistent with entering v0.65.0 without an already-compatible v0.65.0 handoff capsule.

---

## Specimen 2 — later v0.65.0 boot sees old Host capsule as incompatible, then writes a valid current capsule

Diagnostic identity:

```text
Version: 0.65.0
Captured: 2026-08-28T13:12:27.078Z
Runtime boot: 2026-08-28T13:03:29.861Z
generation mtcypydh-c8k8co
request user @2256
output assistant @2257
mode A
```

At boot/runtime observation:

```text
Telemetry continuity: FRESH · host-local-incompatible
Host-local transport: API PRESENT · store USABLE · clear REMOVE · boot INCOMPATIBLE
```

This is an expected migration-boundary control rather than evidence that the v0.65.0 writer is broken. The immediately preceding durable capsule lineage can include pre-v0.65.0 source identity, while the corrected v0.65.0 classifier now requires the current compatible identity.

The current v0.65.0 natural request then produced the first valid current-version bounded checkpoint:

```text
Telemetry capsule:
COMPACT_V2 · 4,505/16,384 chars
prompt 1,079/4,096
topology 2,666/6,144
trajectory 450/2,048
prompt precision LINE_BOUND
topology precision PREFIX_FLOOR
OK

Telemetry checkpoint:
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
4505 chars
host 32.0 ms
34.0 ms total
trigger OUTPUT_COMMIT
```

Therefore the exact pre-refresh durable-write prerequisite is now satisfied in real v0.65.0 production.

### Semantic/control review for @2256 → @2257

User @2256 described a Running Man discussion about future child privacy, requiring that children remain completely undisclosed until they are old enough to understand the parents' work and personally request public exposure, and clarifying that the couple has not yet adopted children.

Assistant @2257 follows that request directly:

- Running Man members ask about future child exposure;
- Siwoo states no exposure before the child's own informed request;
- he says the policy was pre-agreed with Miwoo;
- he explicitly clarifies that they still live as a couple and are only preparing for parenthood.

No partial previous-turn replay is visible in this output.

Local runtime controls:

```text
Stability PASS
binding BOUND
out COMMITTED
mirror COMMITTED
Warnings 0
CANONICAL <-> FRESH EXACT
```

`Pre snapshot: REPEAT-SEND · READ HIT` and `Prior representation: UNAVAILABLE / NEW_VISIBLE_REPRESENTATION` are recorded as request-history context for this specimen; they do not by themselves prove an M2-3 failure.

---

## Specimen 3 — consecutive natural C turn writes another valid current-version capsule

Diagnostic identity:

```text
Version: 0.65.0
Captured: 2026-08-28T13:16:44.675Z
same runtime boot 2026-08-28T13:03:29.861Z
generation mtcypydh-c8k8co
request user @2258
output assistant @2259
mode C
```

The natural request is a short community reaction to the immediately preceding Running Man scene. The visible assistant response stays on that source and reacts to the privacy/consent policy and the joke that the couple has not yet adopted children.

Semantic review: **PASS**.

Representation/Edit Reconcile controls:

```text
Edit reconcile: SAME_FAST
snapshot UNCHANGED
Prior representation: EXACT
mirror CANONICAL
canonical 1800:31f15a4
fresh 1800:31f15a4
Edit origin: NONE
shape FRESH_EXACT_CARRYOVER

Stability: PASS
mirror COMMITTED
Warnings: 0
CANONICAL <-> FRESH EXACT
```

This is a useful live **normal exact-carryover** control for the M2-3 behavior contract.

However, by combined-release policy it is preserved as evidence only; **M2-3 live acceptance is not yet declared** because Subgate A post-refresh adoption remains open.

Telemetry remains bounded and durable:

```text
Telemetry capsule:
COMPACT_V2 · 4,879/16,384 chars
prompt 1,413/4,096
topology 2,667/6,144
trajectory 489/2,048
OK

Telemetry checkpoint:
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
4879 chars
host 47.0 ms
```

The current Host-local mailbox should therefore now contain a current v0.65.0-compatible bounded capsule from this generation, subject to the implementation's normal one-shot mailbox semantics.

---

## Current Subgate A verdict

Supported now:

```text
Version: 0.65.0                        LIVE PROVEN
runtime identity visible convergence   LIVE PROVEN
COMPACT_V2 <= 16,384                   LIVE PROVEN
Host API/store usable                  LIVE PROVEN
current-version HOST_LOCAL WRITTEN     LIVE PROVEN, repeated
ordinary A/C semantics                 healthy in supplied specimens
normal exact carryover                 healthy live control
```

Not yet proven:

```text
same-tab refresh after a v0.65.0 HOST_LOCAL WRITTEN checkpoint
new generation consumes compatible Host-local capsule
Telemetry continuity: ADOPTED · via host-local
second post-refresh natural request does not re-adopt/reset
fresh bounded checkpoint continues after adoption
M2-3 genuine hand-edit positive control
M2-3 representation-fast-reconcile control when naturally available
```

Exact current disposition:

```text
06500_SUBGATE_A_PREFRESH
= PASS

06500_SUBGATE_A_POSTREFRESH_ADOPTION
= READY_TO_EXERCISE
= NOT YET PROVEN

06500_SUBGATE_B_M2_3_ACCEPTANCE
= NOT YET AUTHORIZED
```

## Operator next step

A refresh is now **eligible and required** for the next proof step.

Do not generate additional pre-refresh evidence merely to reconfirm the write. The current generation has already produced repeated current-version bounded Host-local checkpoints.

Next sequence:

```text
1. same-tab refresh now
2. issue one ordinary natural request
3. copy diagnostic
   expect:
   - Version: 0.65.0
   - generation changed
   - Host-local boot compatible/consumed
   - Telemetry continuity: ADOPTED · via host-local
4. issue a second ordinary natural request without another refresh
5. copy diagnostic
   expect:
   - no second adoption/replay/reset
   - normal same-generation telemetry
   - fresh COMPACT_V2 checkpoint
   - HOST_LOCAL WRITTEN again
```

If the first post-refresh diagnostic reports `INCOMPATIBLE`, `EMPTY`, failed consume/adoption, compaction/write failure, or another non-adoption state instead of the expected compatible adoption, stop Subgate B acceptance and preserve/classify that failure.

## Relationship to PARTIAL_PREVIOUS_TURN_REPLAY

Neither supplied v0.65.0 natural output replays the preceding response frame. This is useful observation only; it does **not** prove that the previously confirmed replay family is fixed. The family remains a post-v0.65.0 reassessment item under its separate evidence record.
