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

---

## Recurrence established — natural B session @2066 onward

The immediately following natural broadcast session produced the same compact-assistant frontier on every captured request while the reusable prefix window continued to grow.

Runtime generation remained:

```text
mt4bcgc3-5556z8
```

Observed first-change frontier:

```text
C @2064       → first change @23 · seen 1
B_START @2066 → first change @25 · seen 2
B_CONT @2068  → first change @27 · seen 3
B_CONT @2070  → first change @29 · seen 4
B_CONT @2072  → first change @31 · seen 5
B_CONT @2074  → first change @33 · seen 6
B_CONT @2076  → first change @35 · seen 7
```

Across the B samples:

```text
break owner: PRE_SIMCORE
break zone: CHAT_HISTORY
shape: SAME_SLOT_CHANGED
previous compact signature: assistant/text 21:4a852496
Host prefix: STABLE · SAME_FAMILY
History alignment: OBSERVE_ONLY
History stabilization: OBSERVE_ONLY · persistent NONE
Representation correlation: NO_MATCH
Mutation attribution: NO_PROVENANCE_MATCH · LOW
Rebuild attribution: PREEXISTING_REQUEST_MUTATION · HIGH
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
```

The common-prefix frontier moved forward rather than collapsing:

```text
@23  83,732 chars
@25  89,735 chars
@27  94,649 chars
@29 100,659 chars
@31 105,702 chars
@33 110,067 chars
@35 118,558 chars
```

Diagnostics repeatedly classified the effect as:

```text
Cache effect: REUSE_WINDOW_GROWING
```

with movement of approximately two messages per natural request and no host-prefix family reset.

### Updated interpretation

This recurrence establishes the *pattern*, not its external owner. The fixed compact predecessor signature remains present, but the break frontier marches forward with conversation growth while SimCore remains after the break and performs no request-history stabilization mutation.

This evidence therefore weakens any hypothesis that SimCore itself is progressively destroying the request prefix. It is more consistent with a host/history projection boundary that moves with the conversation window.

Updated classification:

```text
recurrence: ESTABLISHED IN SAME RUNTIME
user-visible correctness impact: NOT ESTABLISHED
prefix collapse: NO
reuse window: GROWING
host prefix reset: NO
SimCore first break: NO
request mutation by observer: NONE
provider-cache hit/miss claim: STILL UNVERIFIED
M2-3 blocker: NO
```

Do not use this recurrence to justify request-history mutation or cache-provider claims. Preserve it as a frozen observability control while M2-3 moves Edit Reconcile ownership.

Detailed B_START→B_END evidence is in `SIMCORE_LIVE_06402_BROADCAST_SEQUENCE.md`.
