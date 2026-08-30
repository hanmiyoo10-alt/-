# SimCore S1-1 Runtime-Cache FNV Primitive Convergence Implementation Evidence

Date: 2026-08-31 KST
Status: **IMPLEMENTATION BUILDER READY · IMMUTABLE CANDIDATE PENDING MAIN MATERIALIZATION · NO PRODUCTION MUTATION YET**
Classification: **POST-M2 SIMPLIFICATION / S1 / MECHANICAL DEDUPE**

## Authority

Design:

`docs/SIMCORE_S1_1_RUNTIME_CACHE_FNV_PRIMITIVE_CONVERGENCE_DESIGN_2026-08-31.md`

Production parent expected by the candidate request:

```text
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
version = 0.70.1
blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
```

## Implemented builder

`products/simcore/tooling/build-s1-1-runtime-cache-fnv-convergence.py`

The builder performs one bounded runtime transformation:

```text
runtime-cache complete-string FNV implementations
5 FNV offset/prime sites total before:
  cacheHash complete-string
  cacheSketch rolling-prefix
  cacheSketch line hash
  sketch-compare rolling-prefix
  current line hash

3 FNV offset/prime sites total after:
  private fnv1a32 complete-string
  cacheSketch rolling-prefix
  sketch-compare rolling-prefix
```

The two rolling-prefix loops are explicitly preserved. The line-hash callers become:

```text
lines.map(fnv1a32)
currentLines.map(fnv1a32)
```

## Runtime identity

The builder advances the implementation candidate identity from `0.70.1` to preferred simplification identity `0.70.3` at the same established identity surfaces:

```text
userscript metadata
SIMCORE_RUNTIME_VERSION
HOST_COMPAT_VERSION
operator release card
```

It inserts a bounded v0.70.3 release note before the preserved v0.70.1 note.

`v0.70.2 Cache Observer Cold-Path Attribution` remains parked and reserved; this transaction does not repurpose it.

## Mechanical equivalence proof built into the builder

The builder executes a Node reference differential check between the old complete-string FNV loop and the proposed helper for:

```text
null
undefined
empty string
ASCII
Korean BMP text
embedded LF
CRLF
surrogate-pair / emoji text
long repeated multi-line text
```

It separately compares old/new per-line hash arrays.

Candidate creation fails on any mismatch.

## Structural invariants enforced by the builder

The builder fails closed if any of these drift:

```text
Prompt module
Community module
runtime-topology module
runtime-session module
State Reconcile module
Representation module
Edit Reconcile module
runtime-mirror module
runtime-cache module.exports
runtime-cache require surface
rolling-prefix FNV loops
PROMPT_COMPILER_VERSION 4
COMMUNITY_CLASSIFIER_VERSION 3
STATE_VERSION 5
CORE_STATE_VERSION 10
TAIL_AFTER_CURRENT_USER markers
provider cache UNVERIFIED marker
Post-onSend attribution marker
await/timer/storage/network/chat-write side-effect marker counts
request system-message append marker
latest.js == install.js
```

## Candidate/release classification

The active release schema has no dedicated maintenance-only runtime class. The closest bounded class is:

```text
releaseMode = NEW_VERSION
changeClass = RUNTIME_CORRECTION
```

This classification does **not** imply a behavioral bug fix. S1-1 remains semantically neutral mechanical maintenance; `RUNTIME_CORRECTION` is the narrow available runtime-changing schema class.

Preferred release identity:

```text
v0.70.3 Runtime Cache Hash Primitive Convergence
```

If existing release policy rejects a `0.70.1 -> 0.70.3` publication while `0.70.2` is intentionally reserved/unreleased, publication must stop. Do not relabel this implementation as v0.70.2.

## Validation sequence

After this implementation PR is merged to main:

```text
candidate request merge
→ generic candidate materializer applies builder to exact release-simcore parent
→ syntax + latest/install identity + SimCore regression suite
→ immutable candidate receipt + derived spec shadow
→ exact approval transaction only if candidate is PASS
→ permanent release controller
→ real long-chat regression gate
```

No experiment-only runtime version is inserted.

## Current disposition

```text
S1_1_DESIGN = FROZEN
BUILDER = IMPLEMENTED
PRODUCTION = UNCHANGED v0.70.1
CANDIDATE = PENDING
RELEASE = PENDING
LIVE_REGRESSION = PENDING
```
