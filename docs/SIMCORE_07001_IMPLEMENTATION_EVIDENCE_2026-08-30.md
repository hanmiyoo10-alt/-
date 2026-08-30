# SimCore v0.70.1 Cold First-Turn Tail Attribution Implementation Evidence

Date: 2026-08-30 KST
Status: **IMPLEMENTED · STATIC CI PASS · CANDIDATE PUBLICATION NOT YET STARTED**
Classification: **RUNTIME OBSERVABILITY MINI · OPS + OUTER REQUEST SHELL ONLY**

## Preconditions

The frozen implementation prerequisites closed before this branch began:

```text
v0.70.0 HUMAN LIVE_PASS = PASS
R2.8 second ordinary terminal close = PASS
v0.70.1 operator authorization = GRANTED
production parent commit = 13179cff70feaf7d12fe53c56e4735155fcf3eaa
production parent blob   = addf07e273a6fc87f04cdadcb51fa3aa5d6fe298
```

Authority:
- `docs/SIMCORE_07001_COLD_FIRST_TURN_TAIL_ATTRIBUTION_DESIGN_2026-08-30.md`
- `docs/SIMCORE_07001_IMPLEMENTATION_AUTHORIZATION_2026-08-30.md`
- `docs/SIMCORE_R2_8_V07000_SECOND_ORDINARY_TERMINAL_CLOSE_2026-08-30.md`

## Exact source audit

The v0.70.0 outer request shell currently measures the whole residual with:

```text
const postOnSendStart = perfNow()
...
perf.postOnSendMs = perfMs(postOnSendStart)
```

Inside that interval, exact source audit found:

```text
history stabilization              previously unnamed
runtime prompt accounting/cache    previously unnamed
cache topology                     already measured as perf.cacheTopologyMs
cache candidate observation        already measured as lastCacheCandidateCostMs
remaining outer-tail statements    not separately owned
```

The selected instrumentation therefore does not invent an owner for the remainder. It names only the exact enclosed SimCore spans above and leaves the rest as `unattributedMs`.

## Implemented delta

Builder:
`products/simcore/tooling/build-07001-cold-first-turn-tail-attribution.py`

Regression:
`products/simcore/tests/suites/builder-v07001.test.mjs`

Fixture:
`products/simcore/tests/fixtures/builder-v07001/basic.json`

Registry:
`products/simcore/tests/registry.mjs`

Runtime candidate delta produced by the builder:

```text
metadata/runtime/Host identity 0.70.0 -> 0.70.1
release card -> Cold First-Turn Tail Attribution
OPS adds pure timingCheckpoint / timingSpan / postOnSendAttribution helpers
outer request shell adds monotonic reads around:
  HISTORY_STABILIZATION
  PROMPT_ACCOUNTING
reuses existing:
  CACHE_TOPOLOGY
  CACHE_CANDIDATE
existing postOnSendMs remains authoritative total
UNATTRIBUTED = total - exact named segments
confidence = BOUNDED only for valid non-negative closure
checkpoint/closure failure = UNRESOLVED diagnostics only
Last Turn Diagnostic adds one bounded Post-onSend attribution line
```

No raw prompt/chat body is retained by the new record.

## Frozen behavior proof

Executable builder regression proves candidate-vs-v0.70.0 preservation for:

```text
Prompt module byte-identical
Community module byte-identical
Runtime Session module byte-identical
Store module byte-identical
Lifecycle module byte-identical
Representation module byte-identical
Edit Reconcile module byte-identical
Output Finalize module byte-identical
Runtime Mirror module byte-identical
PROMPT_COMPILER_VERSION 4 unchanged
Current Task Primacy rules unchanged
COMMUNITY_CLASSIFIER_VERSION 3 unchanged
STATE_VERSION 5 unchanged
CORE_STATE_VERSION 10 unchanged
M2-6 State Reconcile owner unchanged
runtime prompt insertion count unchanged
```

Protected side-effect token counts are also candidate-equal to v0.70.0 for:

```text
await
setTimeout
setInterval
pluginStorage
setChat
fetch
XMLHttpRequest
history.splice
messages.splice
```

No new async boundary or I/O surface is introduced.

## Instrumentation failure proof

The executable OPS fixture proves:

```text
finite monotonic checkpoint -> value
throwing checkpoint source -> null, exception contained
negative checkpoint span -> null
missing checkpoint span -> null
valid 10 ms total / 7 ms named -> BOUNDED + 3 ms unattributed
missing named checkpoint -> UNRESOLVED
named sum exceeding total -> UNRESOLVED
```

Attribution failure does not change request correctness or throw through the request path.

## First permanent CI qualification

PR: `#948 feat(simcore): implement v0.70.1 cold first-turn tail attribution`

Head qualified:
`e48017661c003c1020bedb573ef01a32d2fde5fe`

SimCore CI run:
`33296430312`

```text
Verify   job 99216781189 = SUCCESS
Required job 99216828554 = SUCCESS
```

The permanent verifier materialized deployed production exactly once and executed the proposed verification lane successfully.

## Production boundary

This implementation PR does not mutate `release-simcore`.

Production remains:

```text
version = 0.70.0
commit  = 13179cff70feaf7d12fe53c56e4735155fcf3eaa
blob    = addf07e273a6fc87f04cdadcb51fa3aa5d6fe298
latest == install = YES
```

Publication must use the existing candidate -> exact approval -> Permanent Release path after final implementation-head CI.

## Release-system boundary

No R2.x mechanics are changed here. R2.9 validation projection remains a separate control-plane lane. Predecessor R2.8 fallback retirement remains deferred to a separate cleanup transaction.

## Current disposition

```text
V07001_IMPLEMENTATION = PASS
STATIC/PERMANENT_CI = PASS ON FIRST IMPLEMENTATION HEAD
RUNTIME_SCOPE = OPS + OUTER REQUEST TIMING ONLY
SEMANTIC_CHANGE = NONE
RELEASE_SIMCORE = UNCHANGED
NEXT = FINAL HEAD CI -> MERGE -> CANDIDATE PUBLICATION
```
