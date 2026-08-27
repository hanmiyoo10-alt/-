# SimCore v0.64.7 — Refresh Host-Prefix Shape Watch

Date: 2026-08-27
Classification: **WATCH / PRE_SIMCORE / HOST_PREFIX_SHAPE_CHANGE / ATTRIBUTION_UNPROVEN / NON_ROOT_CAUSE_FOR_06407_FIX**
Related scenario: `06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT`

## 1. Observation

The same-tab refresh experiment that exposed the v0.64.7 telemetry-handoff failure also shows a large change in the host-composed request prefix across the runtime boundary.

Last stable pre-refresh packet:

```text
runtime generation: mtbgdju1-fwtefm
Cache topology: STABLE · 60/60 · 553,896/553,896 chars · 100.0%
Host prefix attribution: STABLE
Host prefix: system/text 358694:5861753e
Host prefix family: 5f46325a
```

First post-refresh natural request:

```text
runtime generation: mtbjm1kl-1lbkiq
Cache topology: BASELINE · messages 62 · chars 201,708
Host prefix attribution: BASELINE
Host prefix: system0 system/text 1277:bdfcdec7
Host prefix family: 2a715208
```

Second post-refresh request remains in the new family:

```text
Host prefix delta: prev 1277:bdfcdec7 → current 1277:bdfcdec7
family 2a715208→2a715208 · SAME_FAMILY
Cache topology: COMMON_PREFIX · 33/64 · 129,896/204,648 chars · 63.5%
Cache break: PRE_SIMCORE · CHAT_HISTORY
SimCore contribution: NOT_FIRST_BREAK
```

## 2. Bounded interpretation

The cross-boundary comparison establishes that the host-visible request shape after refresh is not byte/topology-identical to the final pre-refresh request shape.

It does **not** establish why.

Possible categories that remain unproven include host context rebuilding, host compaction/truncation, prompt/lore composition timing, model/context-window policy, or another pre-SimCore request-assembly boundary.

Do not infer one of those mechanisms from this packet set.

## 3. Relationship to v0.64.7 failure

This WATCH is separate from the confirmed v0.64.7 implementation defect.

Confirmed v0.64.7 defect:

```text
required output-complete telemetry checkpoint callsite omitted
+ same-tab refresh produced no adopted handoff
→ 06407 live gate FAIL
```

This host-prefix WATCH:

```text
manual cross-packet comparison shows host prefix family/size changed across refresh
→ preserve as PRE_SIMCORE sequence evidence
```

A real host-prefix change is explicitly allowed to remain visible under the v0.64.7 contract. The telemetry repair must not hide it.

If a repaired release successfully adopts the pre-refresh observer capsule, the first post-refresh diagnostic should be able to compare the restored prior family against the actual new host request and report the resulting frontier/break truth instead of starting from BASELINE.

## 4. Current disposition

```text
status: WATCH
root cause: UNPROVEN
SimCore contribution to host prefix change: NOT ESTABLISHED
provider cache effect: UNVERIFIED
06407 repair blocker by itself: NO
preservation value: HIGH for repair revalidation
```

Do not turn this into a separate runtime patch without recurrence or narrower source-backed attribution.

## 5. Revalidation target

During the repair-release live experiment, preserve:

```text
pre-boundary host prefix identity/family
pre-boundary topology/trajectory
pre-boundary Telemetry checkpoint result
post-boundary ADOPTED transport
first post-boundary host prefix identity/family
restored-vs-current topology/frontier comparison
second-request trajectory continuation
```

This will distinguish successful local observer continuity from any genuine PRE_SIMCORE host request-shape change.

## 6. Cross references

- `docs/SIMCORE_06407_OUTPUT_CHECKPOINT_LIVE_FAILURE_2026-08-27.md`
- `docs/SIMCORE_LIVE_06407_VALIDATION_2026-08-27.md`
- `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
- `docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`
