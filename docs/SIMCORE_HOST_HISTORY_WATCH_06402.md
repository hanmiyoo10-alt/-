# SimCore v0.64.2 — Host / History Prefix Watch

Purpose: preserve the natural v0.64.2 recurrence of the long-lived compact-assistant/history-frontier anomaly family without attributing provider cache behavior or changing SimCore runtime semantics.

## Observation — C @2064 → @2065

Production: `v0.64.2 — Diagnostic Copy Resilience`
Runtime generation: `mt4bcgc3-5556z8`
Mode: `C`
Turn: user `@2064` → assistant `@2065`

The turn itself was healthy:

```text
Core handshake: FOUND
Runtime status: ACTIVE · output COMMITTED
Stability: PASS
Edit reconcile: SAME_FAST · 0.0 ms · snapshot UNCHANGED
Deferred mirror: COMMITTED
Output representation: EXACT
Warnings: 0
Compatibility diagnostics: 0
Frame sequence: PASS
Frame guard: PASS
Continuity summary: PASS
```

However the request-prefix observer reported a pre-SimCore history break:

```text
Cache topology: COMMON_PREFIX · messages 23/53 · chars 83,732/154,989 · ratio 54.0%
Cache integrity: DEGRADED
Cache break: PRE_SIMCORE · CHAT_HISTORY · @23 assistant→assistant
Host prefix attribution: STABLE · shape NONE · confidence HIGH
Host prefix delta: system/text 1277:bdfcdec7 → 1277:bdfcdec7 · Δchars +0 · SAME_FAMILY
History mutation: @23 · SAME_SLOT_CHANGED · prev assistant/text 21:4a852496 → current assistant/text 5543:df844968
History alignment: OBSERVE_ONLY · target assistant/text 21:4a852496 · candidates 1 · request mutation NONE
History stabilization: OBSERVE_ONLY · source REQUEST_SIGNATURE_OBSERVER · persistent NONE
Repeated break: assistant/text 21:4a852496 · seen 1 · first @23 · latest @23
Representation correlation: NO_MATCH
Mutation attribution: NO_PROVENANCE_MATCH · LOW
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
```

## Interpretation

This is a natural recurrence of the already-known host/history compact-assistant frontier family. The changed slot appears before the SimCore runtime block, while the host system prefix remains stable and SimCore explicitly reports `NOT_FIRST_BREAK`. No current evidence supports blaming SimCore prompt compilation, Representation, Recovery, or provider cache behavior.

The observer remained non-mutating:

```text
History alignment: OBSERVE_ONLY
History stabilization: OBSERVE_ONLY
request mutation: NONE
persistent mutation: NONE
```

## Classification

```text
status: WATCH_ONLY / DIRECT OBSERVATION
family: HOST_HISTORY_PREFIX_BREAK / COMPACT_ASSISTANT_SIGNATURE
runtime correctness defect: NOT ESTABLISHED
host-prefix reset: NO
SimCore first-break attribution: NO
provider cache attribution: UNVERIFIED
representation provenance match: NO
request/history repair: NONE
M2 blocker: NO
```

## Recurrence rule

Preserve future samples with:

```text
runtime generation
mode / turn indices
common-prefix message+char frontier
break slot and role/kind
previous/current slot signature
host-prefix family and delta
Representation correlation
whether the same compact signature 21:4a852496 recurs
provider cache remains UNVERIFIED unless authoritative telemetry exists
```

Promote only if repeated evidence establishes either a narrow host-history composition failure with user-visible impact or a SimCore-owned first-break/mutation. Do not restart the retired request-history repair experiments from this observation alone.
