# SimCore Release-State Marker Transition Fix

Date: 2026-08-29 KST
Status: `IMPLEMENTATION REBUILT AFTER BOOTSTRAP · PERMANENT CI PENDING · NON_RUNTIME`

## Trigger

v0.66.0 permanent publication succeeded, but post-publish MAIN_HEALTH run `33206619653` rejected the generated LIVE_PENDING administrative payload with:

```text
PERMANENT_REGRESSION_FAIL
closure-integrity: single active release-state begin: expected=1 actual=2
```

Durable incident authority:

`docs/SIMCORE_06600_POST_PUBLISH_MAIN_WRITE_GATE_BLOCKER_2026-08-29.md`

Production is already published and is not part of this repair:

```text
release-simcore = 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
blob            = f0da13d4c47fd98e9065d7dbf253a3296151ee16
version         = 0.66.0
```

## Root cause

`release-state-converge.mjs` recognized only LIVE_PENDING-specific markers when rendering a new post-publish state. A predecessor LIVE_PASS block therefore survived while a new LIVE_PENDING block was inserted. R2.2 closure-integrity correctly rejects two active machine release-state blocks.

## Frozen correction

Treat the entire `SIMCORE_RELEASE_STATE:<MODE>` marker family as one active authority slot:

1. zero existing release-state blocks -> insert new LIVE_PENDING after the production snapshot;
2. exactly one well-formed existing block of any mode -> replace that whole block with new LIVE_PENDING;
3. mismatched begin/end modes, invalid ordering, or more than one active block -> fail closed with `LIVE_PENDING_DOC_MARKER_INVALID`;
4. rerunning the same LIVE_PENDING state remains idempotent.

Permanent regression coverage must include:

```text
predecessor LIVE_PASS
→ post-publish convergence
→ predecessor block removed
→ exactly one LIVE_PENDING begin/end pair
→ new releaseId / production commit / live gate present
```

and a mixed-mode negative control:

```text
LIVE_PASS BEGIN + LIVE_PENDING END
→ LIVE_PENDING_DOC_MARKER_INVALID
```

## First implementation attempt and bootstrap cycle

The first implementation PR was:

```text
#781 fix(simcore): replace predecessor release-state marker on live pending
head = c1041f9c8e5100bcf57b6d192b6f55d1dcc4c9d4
CI   = 33207571791
```

That run did not execute the proposed verifier. Because production was already v0.66.0 while durable main still declared the predecessor production identity, the CI-self trusted predecessor lane terminated with `INFRA_ERROR` before proposed code execution.

This repeated the known post-publish trusted-CI bootstrap cycle and was recorded on main before proceeding.

Canonical durable-memory bootstrap:

```text
transport PR       = #783
transport title    = SimCore durable memory sync command
state-sync run     = 33207875924
result             = SUCCESS
durable main       = 0405c70afe5d8ee1090a5a8f40feef7dffa99f17
transport merge    = NONE / closed without merge
```

The bootstrap changed only administrative production identity. It did not create v0.66 LIVE_PENDING release authority and did not mutate `release-simcore`.

After bootstrap:

```text
production snapshot = v0.66.0 / 4b6ae1a4... / f0da13d4...
release-state block = predecessor v0.65 LIVE_PASS, exactly one
```

PR #781 was closed as superseded because its PR base identity remained pre-bootstrap.

## Fresh implementation authority

Fresh branch:

`fix/simcore-r-release-state-marker-transition-v2`

Fresh base:

`0405c70afe5d8ee1090a5a8f40feef7dffa99f17`

The implementation is intentionally rebuilt on synchronized main using the exact already-reviewed file blobs from #781:

```text
release-state-converge modified blob = 6f98a5814775858b79a59b3d59418b72ab1ada3c
post-publish permanent test blob     = cb04364b44675544bd2401f2c1051ba51755d4ca
```

This preserves the previously reviewed minimal logic while giving trusted predecessor CI the coherent v0.66 administrative production baseline it requires.

## Scope

Allowed implementation files:

```text
products/simcore/tooling/release-state-converge.mjs
products/simcore/tests/post-publish-state-permanent.test.mjs
```

Plus this design/evidence document.

Forbidden and unchanged:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
runtime behavior
candidate / approval identity
publication authority boundaries
human live evidence
```

## Gate

The fresh PR must prove both trust lanes:

```text
trusted predecessor verifier = PASS
proposed permanent verifier   = PASS
Required                      = PASS
```

Only after this FIX reaches main may the installed one-shot permanent post-publish recovery lane be invoked for exact transaction `simcore-v0.66.0-new-05` and original publisher run `33206537749`.
