# SimCore Release-State Marker Transition Fix

Date: 2026-08-29 KST
Status: `IMPLEMENTED · PERMANENT CI PENDING · NON_RUNTIME`

## Trigger

v0.66.0 permanent publication succeeded, but post-publish MAIN_HEALTH run `33206619653` rejected the generated LIVE_PENDING administrative payload with:

```text
PERMANENT_REGRESSION_FAIL
closure-integrity: single active release-state begin: expected=1 actual=2
```

Durable incident evidence:

`docs/SIMCORE_06600_POST_PUBLISH_MAIN_WRITE_GATE_BLOCKER_2026-08-29.md`

Production is already published and must not be republished during this repair:

```text
release-simcore = 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
blob            = f0da13d4c47fd98e9065d7dbf253a3296151ee16
version         = 0.66.0
```

## Root cause

`release-state-converge.mjs` owned only the `LIVE_PENDING` marker pair when rendering the next post-publish state. If `CURRENT_DEVELOPMENT.md` already contained a predecessor terminal `LIVE_PASS` release-state block, the renderer inserted a new `LIVE_PENDING` block instead of replacing the existing active release-state block.

R2.2 closure integrity intentionally requires exactly one active machine release-state block across all modes.

## Frozen correction

Change only the administrative release-state renderer and its permanent regression test.

The renderer must treat the existing `SIMCORE_RELEASE_STATE:<MODE>` block as one generic active slot:

1. zero existing release-state blocks -> insert the new LIVE_PENDING block after the production snapshot;
2. exactly one well-formed existing release-state block, regardless of mode -> replace that whole block with the new LIVE_PENDING block;
3. mismatched begin/end modes, malformed markers, or more than one active release-state block -> fail closed;
4. rerunning against the same LIVE_PENDING state remains idempotent.

Required positive regression:

```text
predecessor CURRENT_DEVELOPMENT = one LIVE_PASS block
post-publish-state(new release)
-> predecessor LIVE_PASS removed
-> exactly one LIVE_PENDING begin/end pair remains
-> new release transaction / production commit / live gate present
```

Required preserved controls:

```text
zero-marker insertion
same LIVE_PENDING idempotency
observed production identity checks
newer-release recovery protection
state receipt conflict protection
release-simcore mutation = NONE
```

## Implementation evidence

Work branch:

`fix/simcore-r-release-state-marker-transition`

Implementation commits:

```text
877fe92ab3c0b00aa5b150cc04dc996f0e8de37a
  release-state-converge: generic active release-state slot replacement

540d042aeb1a723f711e6b781ab9cbf658b861ee
  permanent post-publish regression: LIVE_PASS -> LIVE_PENDING + mixed-marker negative control
```

Implementation behavior:

```text
existing generic begin/end markers are enumerated
0 pairs  -> insert LIVE_PENDING after production snapshot
1 pair   -> require matching mode and order, then replace whole active block
>1 pairs -> fail LIVE_PENDING_DOC_MARKER_INVALID
mode mismatch / malformed order -> fail LIVE_PENDING_DOC_MARKER_INVALID
```

The positive regression constructs a predecessor `LIVE_PASS` fixture and requires exactly one `LIVE_PENDING` begin/end pair after post-publish convergence. It also requires the predecessor LIVE_PASS marker/lifecycle text to be absent and the new release transaction, production commit, and live gate to be present.

## Scope

Changed implementation files:

```text
products/simcore/tooling/release-state-converge.mjs
products/simcore/tests/post-publish-state-permanent.test.mjs
```

Plus this design/evidence document.

Forbidden and unchanged in this work item:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore mutation
runtime behavior changes
candidate or approval regeneration
publication controller weakening
human live evidence claims
```

## Recovery after merge

After this FIX passes permanent CI and reaches `main`, use the already-installed one-shot permanent post-publish recovery lane for exact transaction `simcore-v0.66.0-new-05` and original permanent publisher run `33206537749`.

Recovery must reobserve the already-published production identity and establish durable main `LIVE_PENDING` truth before real-long-chat validation begins.
