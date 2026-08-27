# SimCore v0.64.7 — Telemetry Checkpoint Diagnostic Surface Gap

Date: 2026-08-27
Classification: **FIX / DIAGNOSTIC_SURFACE_GAP / REPAIR_CO_FINDING / BLOCKING_RELEASE_CONTEXT**
Related live gate: `06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT` — **CLOSED FAIL**
Production: `v0.64.7 — Cross-Reload Cache Observer Continuity`

## 1. Original finding

The frozen v0.64.7 activation design specifies a bounded checkpoint diagnostic surface such as:

```text
Telemetry checkpoint: SESSION · WRITTEN · <chars> · <ms>
```

or a bounded `SKIPPED / UNAVAILABLE` reason.

The released v0.64.7 runtime implements the session telemetry helper and retains a bounded internal write probe:

```text
SESSION_KEY = __SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__
MAX_SESSION_CHARS = 16384
lastWriteProbe = { memory, session, serializedChars, maxSessionChars, retainedBodies: false }
```

But `SimCore Last Turn Diagnostic` emits `Telemetry continuity` without emitting the checkpoint write probe.

The finding was initially preserved as non-blocking WATCH while the actual refresh experiment was still pending.

## 2. New live evidence

The required same-tab refresh experiment has now occurred.

Pre-refresh:

```text
runtime generation mtbgdju1-fwtefm
cache trajectory ESTABLISHED
healthy long-chat baseline
```

Post-refresh first natural request:

```text
new runtime generation mtbjm1kl-1lbkiq
Telemetry continuity: FRESH · no-compatible-handoff
Prompt/cache/history/runtime telemetry: BASELINE
```

Second natural request:

```text
same new generation mtbjm1kl-1lbkiq
Telemetry continuity: FRESH · no-compatible-handoff
Cache trajectory: OBSERVING · distinct 2
```

Thus no pre-refresh capsule was adopted and the observer restarted fresh.

## 3. Source-level co-finding

Source inspection establishes a stronger implementation gap than the original diagnostic-only WATCH.

The activation design requires:

```text
completed output/state commit
→ session telemetry checkpoint

onUnload
→ last-chance session/global checkpoint
```

The deterministic v0.64.7 builder extends the existing telemetry helper and modifies the existing outer publish call, but that outer call is only in the `Risuai.onUnload(...)` path.

Released v0.64.7 contains no completed-output checkpoint callsite.

Therefore:

```text
OUTPUT_CHECKPOINT_CALLSITE_OMITTED
= CONFIRMED DESIGN/IMPLEMENTATION DRIFT
```

The missing diagnostic line is not itself the transport root cause, but it prevented direct pre-boundary observation of whether the unload-only write was `WRITTEN`, `UNAVAILABLE`, `FAILED`, or `OVERSIZE`.

The live failure demonstrates that this observability surface is required for an unambiguous repair validation.

## 4. Current impact

```text
v0.64.7 cross-reload live gate: FAIL / CLOSED
runtime repair required: YES
checkpoint diagnostic repair: YES, co-travel with runtime repair
Core semantic state corruption: NOT OBSERVED
normal request/output semantics: remained usable
provider cache claim: UNVERIFIED (correct)
release-simcore identity: immutable / unchanged
```

## 5. Repair requirement

The repair release should expose the actual completed-output checkpoint result in copied diagnostics.

Required bounded forms include:

```text
Telemetry checkpoint: SESSION · WRITTEN · <chars> · <ms>
Telemetry checkpoint: SESSION · SKIPPED · oversized
Telemetry checkpoint: SESSION · UNAVAILABLE · <bounded error class>
Telemetry checkpoint: SESSION · FAILED · <bounded error class>
```

No raw exception message, raw chat body, prompt body, or generated output may be retained.

The diagnostic should let the next live experiment prove both sides explicitly:

```text
pre-boundary checkpoint WRITTEN
→ refresh
→ post-boundary Telemetry continuity ADOPTED via SESSION/GLOBAL
```

## 6. Disposition

```text
previous disposition: WATCH / NON_BLOCKING
current disposition:  FIX / REPAIR_CO_FINDING
```

Do not patch the immutable v0.64.7 release in place. Carry this diagnostic surface together with the narrow output-checkpoint repair release before M2-3 resumes.

## 7. Cross references

- `docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`
- `docs/SIMCORE_06407_IMPLEMENTATION_EVIDENCE.md`
- `docs/SIMCORE_LIVE_06407_VALIDATION_2026-08-27.md`
- `docs/SIMCORE_06407_OUTPUT_CHECKPOINT_LIVE_FAILURE_2026-08-27.md`
- `products/simcore/tooling/build-06407-reload-cache-continuity.py`
- `release-simcore/plugins/simcore/latest.js`
