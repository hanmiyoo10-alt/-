# SimCore Anomaly Watch

This file preserves low-confidence anomalies that are worth correlating if they recur. An entry here is not a confirmed SimCore bug and must not be used to justify a runtime change without repeated evidence.

## GENERATION_SEMANTIC_EXCURSION — WATCH_ONLY

First observed: 2026-08-20
Production: `v0.63.56 — M2-1 Recovery Boundary Split`
Runtime: `mt1kk4ax-jdnwks`
Turn: user `@1898` → assistant `@1899`, first generation before regeneration

### Observable symptom

The user explicitly bounded the requested output to the supplied behind-the-scenes interview video only. The first generation ignored that source/scene boundary and instead produced an unrelated private domestic continuation, including an additional character and scene material outside the requested interview.

A regeneration of the exact same user turn returned to the requested behind-the-scenes interview scope.

### Diagnostic state of the anomalous first generation

```text
Version: 0.63.56
Edit reconcile: SAME_FAST · 0.0 ms · snapshot UNCHANGED
Preamble: THOUGHTS_COMPAT · STRIPPED · SAFE_ENVELOPE_COMPAT
CANONICAL == FRESH_CHAT · EXACT
Deferred mirror: COMMITTED
Warnings: 0
Continuity summary: PASS
Frame sequence: PASS
Frame guard: PASS
Output process recovery: 1.0 ms
History stabilization: OBSERVE_ONLY
provider cache: UNVERIFIED
```

No captured diagnostic supports attributing this event to the M2-1 Recovery boundary split, output compatibility, representation reconciliation, state corruption, or frame/continuity failure.

### Current classification

```text
GENERATION_SEMANTIC_EXCURSION
confidence: LOW / WATCH_ONLY
M2-1 attribution: UNPROVEN
runtime repair: NONE
```

Treat the event as a preserved one-off semantic-generation anomaly unless it recurs.

### Correlation trigger — “찾았다 이녀석” condition

Promote this from WATCH_ONLY to an active investigation if another natural turn shows the same family of behavior, especially when:

- the user gives an explicit source-only / scene-only / `~만 보여줘` boundary;
- generation abandons that boundary and invents a different continuation or unrelated scene;
- SimCore diagnostics remain otherwise healthy (`Warnings 0`, continuity/frame pass, no state/recovery fault);
- regeneration or a neighboring turn returns to the requested scope.

If recurrence is confirmed, investigate Prompt/instruction adherence, long-chat semantic pressure, context selection and generation semantics as a separate attribution track. Do not silently blame Recovery/Representation or change M2 architecture merely because the anomaly happened during M2.

### Preservation rule

Do not delete this entry when M2 advances. Future similar events should be appended with runtime ID, turn indices, exact scope restriction category, relevant diagnostics, and whether regeneration reproduced or corrected the excursion.
