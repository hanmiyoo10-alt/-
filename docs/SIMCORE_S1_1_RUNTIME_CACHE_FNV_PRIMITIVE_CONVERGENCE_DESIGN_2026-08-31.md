# SimCore S1-1 Runtime-Cache FNV Primitive Convergence Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · DIRECT IMPLEMENTATION AUTHORIZED BY PROGRAM CADENCE · NO EXPERIMENT STAGE**
Classification: **POST-M2 SIMPLIFICATION / S1 / DEDUPE / MECHANICAL RUNTIME MAINTENANCE**

## 1. Parent authority

Production authority at design freeze:

```text
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
version = 0.70.1
release = Cold First-Turn Tail Attribution
release blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
latest.js == install.js
```

Program authority:

`docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`

The parked `v0.70.2 Cache Observer Cold-Path Attribution` identity remains reserved and is not repurposed by this mini.

## 2. Problem

The existing `runtime-cache` module repeats the same complete-string FNV-1a 32-bit primitive in three local places:

```text
A. cacheHash(text)
B. cacheSketch(text) lineHashes
C. buildRuntimePromptCacheProbeFromSketch(...) currentLineHashes
```

Each complete-string loop uses the same:

```text
offset basis = 0x811c9dc5
prime = 0x01000193
input coercion = String(value == null ? '' : value)
per-code-unit update = xor charCodeAt -> Math.imul
unsigned result = h >>> 0
```

The module also contains rolling-prefix FNV loops. Those are intentionally distinct because they emit cumulative prefix state per character and are not complete-string helper calls.

## 3. Exact transaction

Add one private, non-exported helper inside `runtime-cache`:

```js
function fnv1a32(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
```

Then:

```text
cacheHash(text)
  -> fnv1a32(text).toString(16).padStart(8, '0')

cacheSketch lineHashes
  -> lines.map(fnv1a32)

currentLineHashes
  -> currentLines.map(fnv1a32)
```

Do not modify either rolling-prefix FNV loop.

## 4. Ownership

Before:

```text
runtime-cache owns runtime prompt cache observation and identity
and locally repeats one complete-string hash primitive three times
```

After:

```text
runtime-cache keeps exactly the same semantic ownership
and owns one private complete-string FNV primitive used by its local callers
```

No new module, export, require edge, layer edge or semantic owner is introduced.

## 5. Explicitly frozen

```text
runtime-topology exactHash = unchanged
runtime-topology request/family fingerprint = unchanged
runtime-probe fingerprint parsing = unchanged
representation fingerprint parsing = unchanged
bounded telemetry adapter fnv helper = unchanged
rolling-prefix FNV loops = unchanged
Prompt = byte-identical
Community = byte-identical
Session / State Reconcile = unchanged
Host-local telemetry claim = unchanged
provider cache posture = UNVERIFIED
TAIL_AFTER_CURRENT_USER = unchanged
persistent schema/state = unchanged
```

Cross-module hash convergence is deliberately deferred because current Contracts v2 gives `runtime-cache` and `runtime-topology` zero allowed module dependencies. S1-1 must not create a dependency merely to share a utility.

## 6. Side-effect contract

Before and after must be identical for:

```text
await/async boundaries
pluginStorage reads/writes
chat reads/writes
setChat calls
network/fetch calls
timers
host-local mailbox operations
persistent field names
runtime state field names
message ordering
prompt bytes/order
```

The new helper is pure and local.

## 7. Differential proof

The implementation builder/verifier must prove the old loop and new helper produce identical unsigned 32-bit results and identical hex output for representative values including:

```text
empty string
ASCII
Korean BMP text
embedded newline
CRLF characters
surrogate-pair text
null/undefined coercion boundary where applicable
long multi-line text
```

It must also verify that line-hash arrays are identical for representative multi-line strings.

## 8. Structural proof

Required gates:

```text
latest.js == install.js
node syntax PASS
Contracts v2 / architecture PASS
runtime-cache module.exports unchanged
runtime-cache require set unchanged
no new module
no new dependency edge
no new async/I/O
protected semantic markers unchanged
Prompt module byte-identical
Community module byte-identical
rolling-prefix hash loops preserved
```

## 9. Release identity posture

`v0.70.2` is reserved for the parked cache-attribution design.

The simplification release must therefore use a distinct later patch identity selected by the release transaction. Preferred identity, if current release-contract monotonic rules accept it:

```text
v0.70.3 Runtime Cache Hash Primitive Convergence
```

If the release system rejects skipping the reserved but unreleased `0.70.2`, do not repurpose `0.70.2`; classify the release identity as a scheduling BLOCKER and preserve the implemented candidate without mutating production.

## 10. Live regression gate

This is not an experiment. After production deployment, use a narrow regression acceptance matrix:

```text
ordinary long-chat request
same-generation warm follow-up
one refresh/new-runtime request
runtime identity/cache diagnostics remain structurally healthy
Representation exactness PASS
Deferred Mirror healthy
continuity/frame/time sentinels healthy
Warnings: no new S1-related warning
```

No cache-hit or monetary-saving claim is part of S1-1.

## 11. Rollback condition

Rollback/block if any of these occur:

```text
hash differential mismatch
line-hash differential mismatch
runtime-cache export/dependency drift
rolling-prefix logic altered
prompt/community semantic drift
new persistence/I/O/async boundary
Contracts v2 failure
latest/install divergence
real-long-chat regression on touched cache/identity surfaces
```

## 12. Disposition

```text
S1_1 = DESIGN FROZEN
TRANSFORMATION = DEDUPE
OWNER BEFORE/AFTER = runtime-cache
SEMANTIC CHANGE = NONE
NEW MODULE = NONE
NEW EXPORT = NONE
NEW REQUIRE EDGE = NONE
PERSISTENCE CHANGE = NONE
ASYNC/I/O CHANGE = NONE
EXPERIMENT STAGE = NONE
NEXT = IMPLEMENT DIRECTLY
```
