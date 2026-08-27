# SimCore v0.64.7 Real Long-Chat Validation — 2026-08-27

Status: **IN_PROGRESS · PRE-BOUNDARY BASELINE CAPTURED · LIVE GATE OPEN**
Scenario: `06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT`
Production: `v0.64.7 — Cross-Reload Cache Observer Continuity`
Release authority: `release-simcore` commit `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`
Release blob: `676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0` (`latest.js == install.js`)
Evidence source: user-supplied `SimCore Last Turn Diagnostic` packets from a real long chat

## 1. Classification

```text
current live-gate disposition:
WATCH / LIVE_GATE_INCOMPLETE_EVIDENCE / NON_BLOCKING_TO_RUNTIME_CORRECTNESS

gate status:
OPEN

reason:
required cross-runtime boundary has not been demonstrated in the supplied packet set
```

This is **not** a v0.64.7 product FIX finding. The supplied packets establish a useful healthy same-generation baseline, but they do not show the required new runtime generation adopting a compatible telemetry capsule.

The v0.64.7 activation contract requires:

```text
A. establish healthy cache trajectory in v0.64.7
B. confirm telemetry checkpoint exists before the boundary
C. refresh the page or perform a plugin runtime update
D. first natural request in the new runtime generation
E. second natural request
```

The supplied evidence covers substantial parts of A and normal-regression controls, but does not prove C/D/E.

## 2. Runtime identity and specimen sequence

All supplied packets report the same runtime generation:

```text
runtime boot: 2026-08-27T11:42:11.881Z
generation: mtbgdju1-fwtefm
reload safety: ARMED · epoch 1 · stale drops 0
version: 0.64.7
```

Observed diagnostic captures:

```text
2026-08-27T12:24:30.798Z · B_END
2026-08-27T12:29:32.168Z · C
2026-08-27T12:32:39.597Z · C
2026-08-27T12:34:52.078Z · C repeat-send shape
```

Because the generation identifier does not change across these packets, this packet set cannot itself establish the v0.64.7 cross-reload adoption contract.

## 3. Same-generation baseline evidence

### B_END specimen

Observed:

```text
Runtime status: ACTIVE · output COMMITTED
Mode: B_END
Warnings: 0
Broadcast lifecycle: ENDING
Broadcast end authority: ALLOWED · explicit-b-end
Broadcast closure: COMPLETE · terminal EXPLICIT · structure PASS
Continuity summary: PASS
Telemetry continuity: FRESH · no-compatible-handoff
Cache trajectory: ESTABLISHED
provider cache: UNVERIFIED
```

This is useful regression evidence for normal Core/Broadcast behavior, but `FRESH · no-compatible-handoff` is not a cross-reload PASS signal.

### Direct post-B_END C specimen

Observed:

```text
Mode: C
Edit reconcile: REPRESENTATION_FAST_RECONCILED
Edit origin: REPRESENTATION_DRIFT_CORRELATED
Continuity summary: PASS
Post-B_END clock handoff: APPLIED
Current-time authority: POST_B_END_FLOOR
Telemetry continuity: FRESH · no-compatible-handoff
provider cache: UNVERIFIED
```

This preserves the validated v0.64.6 post-B_END C behavior while running v0.64.7 and provides a useful frozen regression control.

### Subsequent C / repeat-send stabilization specimen

The later packets show the same runtime generation continuing normally. The final packet reports:

```text
Stability: OBSERVED
Cache topology: STABLE · 60/60 messages · 100.0%
Cache integrity: STABLE
Cache break: NONE
Cache effect: REUSE_WINDOW_STABLE
Runtime identity: stable/slow/volatile/full SAME
SimCore contribution: NO_BREAK
Telemetry continuity: FRESH · no-compatible-handoff
Warnings: 0
Compatibility diagnostics: 0
```

This is strong same-generation observer stability evidence, but it is still pre-boundary for the v0.64.7 release claim.

## 4. Genuine user-edit positive control

One supplied C packet reports:

```text
Edit reconcile: MANUAL_EDIT_REBUILT · 3.928 s
Edit origin: AMBIGUOUS_CHANGE
shape: NEW_VISIBLE_REPRESENTATION
current matches neither prior canonical nor prior Fresh identity
Rebuild attribution: PREEXISTING_REQUEST_MUTATION · HIGH
Mutation attribution: NO_PROVENANCE_MATCH · LOW
```

User clarification confirms that this visible change was an intentional manual edit.

Resolved classification:

```text
RESOLVED / EXPECTED_USER_EDIT_BEHAVIOR / POSITIVE_CONTROL / NON_06407
```

Therefore the 3.928 s `MANUAL_EDIT_REBUILT` event is **not an anomaly** and **not a v0.64.7 regression**. It is compatible with the frozen genuine-user-edit control: when the current visible representation matches neither prior canonical nor prior Fresh identity, the request remains eligible for the full manual-edit reconstruction path.

This specimen is retained as positive regression evidence that v0.64.7 did not incorrectly route a genuine user edit through `REPRESENTATION_FAST_RECONCILED`.

## 5. Storage/performance observations

The supplied packets include storage-dominated request/output timings, including request Turn Storage and output state storage in the hundreds of milliseconds.

Classification:

```text
OBSERVED / EXISTING_NON_GOAL / NON_06407
```

The v0.64.7 activation contract explicitly excludes Store write latency from this release scope. These timings therefore do not affect the cache-observer continuity gate unless separate evidence establishes a correctness consequence.

## 6. What is still required to close v0.64.7

Before classifying the live gate PASS, capture the actual boundary sequence:

```text
1. while still in the current healthy v0.64.7 runtime, preserve the pre-boundary state
2. refresh the page or perform a compatible runtime/plugin reload
3. confirm Runtime boot / generation changes
4. on the first natural request after that boundary, require:
   - Telemetry continuity: ADOPTED
   - transport SESSION or GLOBAL as appropriate
   - same location accepted
   - topology/runtime-prefix/trajectory restored where compatible
   - provider cache remains UNVERIFIED
   - normal Core request/output semantics unchanged
5. on the second natural request, require:
   - trajectory continues from restored state
   - no artificial family reset caused by handoff
   - no repeated adoption of the same capsule
```

A real PRE_SIMCORE host/history prefix break remains reportable and does not by itself fail v0.64.7; this release must preserve that truth rather than hide it.

## 7. Current verdict

```text
healthy same-generation long-chat baseline: OBSERVED
B_END closure regression control: PASS
post-B_END C regression control: PASS
genuine manual-edit control: PASS / EXPECTED_USER_EDIT_BEHAVIOR
same-generation cache observer stability: OBSERVED
new runtime generation: NOT OBSERVED IN SUPPLIED PACKETS
cross-reload telemetry adoption: NOT OBSERVED
second post-boundary continuation: NOT OBSERVED
provider cache claim: UNVERIFIED (correct)

06407 live gate: OPEN
classification: WATCH / INCOMPLETE_EVIDENCE
```

Do not begin M2-3 or another runtime release on the basis of this packet set alone. The next evidence should be the first and second natural requests after an actual same-tab refresh/runtime boundary.

## 8. Authority references

- `docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`
- `docs/SIMCORE_06407_IMPLEMENTATION_EVIDENCE.md`
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `release-simcore/plugins/simcore/latest.js`
