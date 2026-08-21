# SimCore 2.0M Major — Live Evidence Ledger

This file records production diagnostics gathered during the staged 2.0M Major refactor. It is evidence-only: do not infer behavior that the captured diagnostics did not exercise.

## M2-1 — v0.63.56 Recovery Boundary Split

Production baseline:

```text
Version: 0.63.56
Release: M2-1 Recovery Boundary Split
Release commit: 222d6bd0c589c9dd4c469979daa42cefbd512a3e
Release blob: 6c828d5dadeb8a49f256afe1e54674cf5bd81803
```

### Sample 1 — first post-reload ordinary output path

Runtime:

```text
boot 2026-08-20T13:41:35.049Z
generation mt1kk4ax-jdnwks
request @1898 → output @1899
```

Observed:

```text
Session load: COLD_INIT
Edit reconcile: SAME_FAST · 0.0 ms · snapshot UNCHANGED
Output process recovery: 1.0 ms
Preamble: THOUGHTS_COMPAT · STRIPPED · SAFE_ENVELOPE_COMPAT
CANONICAL == FRESH_CHAT · EXACT
Deferred mirror: COMMITTED
Warnings: 0
Continuity: PASS
Frame sequence: PASS
History stabilization: OBSERVE_ONLY
provider cache: UNVERIFIED
```

Interpretation: the newly physical `output-compat` path executed successfully in production after the Recovery split. No M2-1 structural regression was observed. The history-bootstrap portion of `bootstrap-migration` was not meaningfully exercised in this sample (`bootstrap 0.0 ms`).

### Sample 2 — same-runtime regeneration / repeat-send path

Same runtime and same user/output slot:

```text
request @1898 → regenerated output @1899
Session load: LOCATION_REUSE
Pre snapshot: REPEAT-SEND · READ HIT
Edit reconcile: SAME_SNAPSHOT · snapshot UNCHANGED
```

Output compatibility remained active:

```text
Output process recovery: 1.0 ms
Preamble: THOUGHTS_COMPAT · STRIPPED · SAFE_ENVELOPE_COMPAT
Warnings: 0
Continuity: PASS
Frame sequence: PASS
```

The regenerated output naturally produced a conservative representation mismatch:

```text
CANONICAL 3787:234db05
FRESH_CHAT 3788:6240060
Δchars +1
Deferred mirror: OUTPUT_MISMATCH
Safe-envelope reconcile: REJECTED
setChat 0
```

Interpretation: M2-1 preserved the output-side fail-safe. The known structural confirmation gate did not falsely accept an unproven +1 representation, and Deferred Mirror remained conservative.

### Sample 3 — next natural request proves v0.63.55 fast-path regression control

Same runtime, next natural request:

```text
request @1900 → output @1901
Mode: C
Session load: LOCATION_REUSE
```

The exact prior Fresh carryover was recognized without a manual rebuild:

```text
Prior representation: OUTPUT_MISMATCH
prior canonical: 3787:234db05e
prior fresh:     3788:6240060a
current:         3788:6240060a
current match: FRESH_CHAT
Edit origin: REPRESENTATION_DRIFT_CORRELATED
Edit delta: vs canonical +1 · vs fresh +0 · FRESH_EXACT_CARRYOVER
Edit reconcile: REPRESENTATION_FAST_RECONCILED · 0.0 ms
snapshot UNCHANGED
representation fresh-exact-carryover
```

This is the exact regression gate inherited from v0.63.55. The previous multi-second false `MANUAL_EDIT_REBUILT` did not return after the M2-1 Recovery split.

The C-mode source/evidence path also remained stable:

```text
Short-C source lock: ON
Request lineage: CHAIN · root A@1898 · depth 1
Source handoff: NEW SOURCE
Evidence shape: TRANSFORMED
Evidence mode: DUAL
Evidence root fence: APPLIED
Evidence source fence: APPLIED
Continuity: PASS
Frame sequence: PASS
Warnings: 0
```

Output completed conservatively and exactly:

```text
CANONICAL 2749:d9bd7b5
FRESH_CHAT 2749:d9bd7b5
Δchars +0 · EXACT
Deferred mirror: COMMITTED
```

Timing was storage-dominated rather than reconcile-dominated:

```text
request total: 293 ms
edit reconcile: 0 ms
turn storage: 248 ms
output handler: 322 ms
output storage: 300 ms
```

Interpretation: **M2-1 representation-fast regression control PASS.** This sample also provides a natural Mode-C / source-handoff / dual-evidence cross-check with no observed structural regression. Storage latency remains a separate measured concern and is intentionally not repaired inside M2-1.

### Sample 4 — cache frontier after prompt-fragment placement change

A later long-chat sample in runtime `mt2cejv0-fcumha` showed:

```text
request @1920 → output @1921
Mode: A
Session load: LOCATION_REUSE
Edit reconcile: SAME_FAST · 0.0 ms · snapshot UNCHANGED
Warnings: 0
```

Local prefix telemetry:

```text
Cache topology: COMMON_PREFIX
common: 30/59 messages
common chars: 98,523/141,701
ratio: 69.5%
first change: @30 assistant→assistant
Cache break: PRE_SIMCORE · CHAT_HISTORY · @30
Cache effect: REUSE_WINDOW_GROWING
frontier movement: +2 messages / +2,836 chars
Cache trajectory: ESTABLISHED
floor: 26 messages / 92,817 chars
frontier: 30 messages / 98,523 chars
streak: 4
Host prefix attribution: STABLE · SAME_FAMILY
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
```

Important attribution caveat: the user clarified that the **Core Ruleset is a SimCore-connected prompt fragment**, not part of the runtime-tail block measured by the `SimCore contribution` field. Therefore `PRE_SIMCORE` / `NOT_FIRST_BREAK` means only that the first local prefix break occurs **before the runtime-tail injection**. It does **not** prove that every prompt fragment belonging to the broader SimCore product is uninvolved.

This distinction matters when the Core Ruleset fragment is physically placed earlier in host prompt composition and may vary with globals/mode/activation. Moving that fragment later can change prefix topology without changing the runtime-tail identity. The current sample's later frontier (`@30`, 98,523 chars) is consistent with a healthier local reuse window than earlier samples that broke around `@10`, but causality is **not yet proven** because the runtime, history size, and intervening turns also changed.

Do not promote this into a provider-cache claim. The only safe conclusions are:

```text
local reusable prefix: growing / established
runtime-tail SimCore: not the first observed break
connected Core Ruleset fragment: still a possible upstream contributor
provider cache: UNVERIFIED
```

The same output again ended with a conservative +1 representation mismatch:

```text
CANONICAL 3176:af64ce2
FRESH_CHAT 3177:7154990
Δchars +1
Deferred mirror: OUTPUT_MISMATCH
Safe-envelope reconcile: REJECTED
```

If the next natural request sees the exact prior Fresh body, the expected request-side control remains `REPRESENTATION_FAST_RECONCILED` with snapshot unchanged.

### Current M2-1 validation status

Confirmed in production:

```text
ordinary post-reload A path                    PASS
output-compat / SAFE_ENVELOPE_COMPAT           PASS
same-slot regeneration fail-safe               PASS
Deferred Mirror conservative OUTPUT_MISMATCH   PASS
v0.63.55 representation-fast regression gate   PASS
natural C-mode source/evidence path             PASS
continuity / frame guards                       PASS
```

Still not exercised by these samples:

```text
bootstrap-migration history-bootstrap cold path
natural B-mode cross-check after M2-1
genuine user-edit positive control
```

The genuine-user-edit control becomes mandatory again before/when M2 moves the Edit Reconcile implementation itself; it is not inferred from the representation-fast pass.

### Immediate next validation gate

Continue with a new natural turn rather than regenerating or intentionally editing the previous output. Prefer a natural B-mode path when available. Confirm that Broadcast lifecycle, output compatibility, continuity, and frame guards remain stable under the split.

If a later cold/reload path naturally invokes history bootstrap, capture it separately; do not force state mutation solely to exercise it.
