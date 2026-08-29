# SimCore v0.66.0 terminal release-system retrospective

Date: 2026-08-29 KST

Status: **RETROSPECTIVE COMPLETE · R2.6 INPUT FROZEN · NON_RUNTIME · PRODUCTION UNCHANGED**

## What worked

The release authority shell protected runtime truth throughout the first genuine v0.66 release:

```text
exact candidate verification       = PASS
permanent publication              = PASS
release-simcore identity           = stable
latest.js == install.js            = preserved
human real-long-chat evidence      = accepted
canonical-main failed-tip guard    = fail-closed as designed
```

No administrative repair republished or mutated runtime bytes.

## What failed

The post-publish/control-plane path exposed several boundary gaps already preserved by R2.6 evidence:

1. post-publish LIVE_PASS → LIVE_PENDING marker transition originally lacked real predecessor-state coverage;
2. owner payload, workflow allow/stage logic, recovery vocabulary, and durable receipt checks were duplicated across boundaries;
3. the first terminal close projected exact production version identity into active human current-state prose, violating R2.2 closure-integrity;
4. the canonical-main soft guard correctly reverted that failed exact tip;
5. the first durable-memory recovery restored machine coordinates but did not itself convert the release-state marker to terminal LIVE_PASS, requiring the already-existing bounded `documentReplacements` authority for exact terminal convergence.

## Root-cause disposition of terminal auto-revert

```text
canonical-main protection bug = NO
SimCore runtime bug            = NO
release-simcore rollback       = NO
terminal document projection   = FIX
```

Exact failed assertion:

```text
closure-integrity: active human current-state prose duplicates version literal
```

The repair kept the invariant instead of weakening it.

## Lessons frozen into R2.6

The observed sequence strengthens, rather than changes, the frozen R2.6 design:

```text
PREPLAY BEFORE PUBLISH
ONE POST-PUBLISH STATE ENVELOPE
DERIVE WRITES FROM OWNER OUTPUT
WRITE THROUGH ONE GATE
REOBSERVE DURABLE TRUTH
NO NEW AUTHORITY
```

Additional terminal lesson:

```text
machine current-state blocks own exact release identity
human current-state prose remains identity-free
terminal projection must be covered by the same durable reobserver and closure-integrity contract
```

## R2.6 authorization consequence

The terminal-control-plane prerequisites are now satisfied at the evidence level:

```text
v0.66 terminal auto-revert root cause resolved        = YES
v0.66 terminal administrative truth durable           = YES
terminal release-system retrospective recorded        = YES
new evidence invalidating frozen R2.6 design           = NO
```

This retrospective does not itself authorize implementation. A separate explicit R2.6 implementation-authorization transaction must consume these facts before release-system code changes begin.
