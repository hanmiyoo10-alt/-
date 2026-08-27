# Local Usage Dashboard — Lifecycle Stress Audit

Status: **IMPLEMENTED — repository stress harness added; physical B0–B3 evidence PENDING**

Idea: `NV-LIFECYCLE-STRESS`  
Design: #558  
Regression: `plugins/usage-dashboard/tests/p46-lifecycle-stress-ownership.cjs`  
Baseline: Product `3.0.0-alpha.5.81` · Engine `1.6.22` · Manager `1.3.0` · contracts `1 / 1`

## Goal

Prove that repeated Local Usage Dashboard lifecycle operations do not accumulate current timer/listener/in-flight ownership after the runtime settles.

This audit is evidence-only. It does not remove or change timers, listeners, schedulers, cache policy, refresh behavior, Engine, Manager, or product bytes.

Heap/RSS bytes remain **UNKNOWN**. This audit does not estimate memory usage from source structure.

## Repository evidence

P37 remains the static ownership authority. P46 adds a bounded repeated-ownership simulation and requires P37 to remain GREEN.

P46 performs **50 repository ownership cycles**. Every cycle models the current Plugin lifecycle contract:

1. one `visibilitychange` listener;
2. one listener for each interaction type `pointerdown`, `touchstart`, `wheel`, `keydown`;
3. current timer/idle ownership slots;
4. runtime epoch capture;
5. unload/dispose;
6. removal of prior-cycle DOM/listener ownership;
7. timer/idle handle release;
8. stale prior-epoch async rejection.

The simulation is deliberately labelled repository-only. It is not presented as Android heap evidence and does not replace physical lifecycle stress.

## Source contracts locked by P46

Current lifecycle installation must continue to own:

- `visibilitychange`;
- `pointerdown`;
- `touchstart`;
- `wheel`;
- `keydown`;
- resume long-task observer;
- UI stall probe;
- refresh scheduling.

Current unload must continue to:

- set `runtimeDisposed=true`;
- advance `runtimeEpoch`;
- clear refresh/reset timers;
- cancel panel-render / refresh-scheduler / resume-refresh work;
- stop long-task observer and UI stall probe;
- splice/remove `remoteListeners` and `domListeners`;
- clear `widgetRemoteListeners`.

Detailed Diagnostics Runtime Weight remains the physical observation surface for:

- timers `X/8`;
- idle handles `/2`;
- long-task observer;
- remote / widget remote / DOM listeners;
- refresh/resume current in-flight state;
- bridge cache in-flight;
- CLI active/queued;
- secondary queued/running;
- responsive style key count.

## Physical protocol

Physical evidence must use settled snapshots only.

### B0 — settled baseline

Capture Detailed Diagnostics before stress while READY/healthy and no foreground refresh/CLI job is active.

### B1 — visibility/resume lane

Perform **20 normal hidden→visible cycles**, wait for final visibility refresh to settle, then capture Detailed Diagnostics.

PASS target:

- current listener ownership baseline-compatible;
- no +1-per-cycle timer growth;
- refresh/resume current work idle after settle;
- CLI/secondary work returns to normal settled state;
- READY / Health ok / active errors 0 / failures 0.

### B2 — panel/Diagnostics lane

Open/close the Dashboard **30 times**; enter Detailed Diagnostics at least 10 times. After the final sequence settles, capture Detailed Diagnostics.

PASS target:

- no cycle-correlated remote/widget/DOM listener growth;
- panel/render scheduler settled;
- responsive-style key count does not grow linearly with identical repeated panel states;
- current timer/idle ownership remains baseline-compatible;
- no attributable runtime/render/persist errors.

### B3 — dwell/final lane

Keep the runtime active under ordinary use for at least **30 minutes** after the stress lanes, then take the final settled capture.

This is a retained-ownership stability check, not a heap test.

## Adoption/reconnect lane

Do not kill/restart Engine or Manager solely to satisfy this audit.

If a safe natural adoption/reconnect occurs, record it. Otherwise verdict is `NOT_EXERCISED`. No result is invented.

## Cumulative counters are not leak counters

The following may increase normally and are not failures by themselves:

- scheduler queued/merged/executed/deferred;
- refresh request/execution counts;
- persist writes;
- render/write/skip counters;
- power wakeups;
- stale-async-drop count when stale work is correctly rejected.

A leak finding requires retained/current ownership that fails to return to baseline-compatible settled state.

## Verdict table

| Lane | Evidence | Verdict |
| --- | --- | --- |
| Repository 50-cycle ownership simulation | P46 + P37 | **implemented; CI result required on PR** |
| B0 settled baseline | physical | `PENDING` |
| B1 visibility 20 cycles | physical | `PENDING` |
| B2 panel 30 / Detailed ≥10 | physical | `PENDING` |
| B3 30-minute dwell | physical | `PENDING` |
| Adoption/reconnect | safe natural/harness evidence only | `NOT_EXERCISED` until evidence exists |

## Failure rule

Use `FAIL_ACCUMULATION` only when repeated evidence shows a current owned resource increasing with cycle count or failing to release after settle. One transient spike is not accumulation proof.

If failure is found, this audit records diagnosis only. Any repair requires a separate bounded versioned design/release and this stress audit must be rerun afterward.

## Product-impact statement

This implementation adds a regression and documentation only. It must not modify shipped Plugin / Engine / Manager / bootstrap / release artifacts and consumes no product version.
