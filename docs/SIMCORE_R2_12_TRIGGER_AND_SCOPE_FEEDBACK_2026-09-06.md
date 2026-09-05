# SimCore R2.12 Trigger and Scope Feedback

Date: 2026-09-06 KST
Status: **FEEDBACK RECORDED · DESIGN TRIGGER SATISFIED · DESIGN-ELIGIBLE · IMPLEMENTATION NOT AUTHORIZED · NON-RUNTIME**
Classification: **RELEASE-SYSTEM / CONTROL-PLANE OPERATIONAL FEEDBACK**

## 1. Executive disposition

```text
R2.11 CORE = KEEP / FROZEN
R2.11 PROFILE INVENTORY = NOT IMPLICATED
R2.12 TRIGGER = SATISFIED
R2.12 DESIGN = ELIGIBLE / MAY START AS A SEPARATE TRANSACTION
R2.12 IMPLEMENTATION = NOT AUTHORIZED BY THIS FEEDBACK
PROVISIONAL NAME = RELEASE-CHANNEL-AWARE CANDIDATE SOURCE ROUTING
RUNTIME MUTATION = FORBIDDEN
release-simcore MUTATION = FORBIDDEN
CURRENT v0.70.8 HUMAN LIVE GATE BLOCKER = NO
```

The R2.12 trigger is no longer hypothetical.

The same canonical-documentation promotion / SimCore release-channel boundary mismatch occurred in two genuine successor runtime cycles, v0.70.7 and v0.70.8.

The v0.70.8 recurrence has already been classified as:

```text
FIX · RECURRING_CANONICAL_DOC_PROMOTION_SIMCORE_RELEASE_CHANNEL_BOUNDARY_MISMATCH · NON_RUNTIME
```

This satisfies the Release System v2 operational-closure criterion previously recorded in the R2.11 post-v0.70.7 feedback: do not increment R merely for sequence, but a concrete recurring operational defect may justify a new bounded release-system design.

## 2. Why the previous R2.12 decision changed

The prior R2.11 operational feedback concluded:

```text
R2.12 DESIGN = NOT AUTHORIZED
R2.12 IMPLEMENTATION = NOT AUTHORIZED
```

because the two R2.11-adjacent seams then available were either one observed profile-authoring semantic error or a non-blocking synthetic-proof-strength debt.

That same document explicitly excluded the canonical documentation promotion boundary mismatch from R2.11 itself.

The exclusion remains correct.

What changed is not R2.11 correctness. What changed is recurrence count and confidence in the separate control-plane defect.

Evidence sequence:

```text
v0.70.7
canonical docs promotion
-> CANDIDATE_SHADOW
-> main-derived historical SimCore v0.63.2 source
-> FROZEN_SURFACE_MISSING: REPRESENTATION_FAST_RECONCILED
-> FIX-ELIGIBLE / NON-RUNTIME

v0.70.8
canonical docs promotion
-> CANDIDATE_SHADOW
-> main-derived historical SimCore v0.63.2 source
-> FROZEN_SURFACE_MISSING: REPRESENTATION_FAST_RECONCILED
-> FIX / RECURRING / NON-RUNTIME
```

Therefore the evidence threshold for a dedicated R2.12 design is satisfied.

## 3. Exact owner seam

The current canonical documentation promotion workflow dispatches SimCore validation as:

```text
gh workflow run simcore-ci.yml --ref "$DOC_BRANCH" \
  -f profile=CANDIDATE_SHADOW \
  -f candidate_commit="$HEAD_SHA" \
  -f candidate_fetch_ref="refs/heads/$DOC_BRANCH"
```

The permanent SimCore CI contract for `CANDIDATE_SHADOW` then materializes:

```text
git show "$CANDIDATE:plugins/simcore/latest.js"
git show "$CANDIDATE:plugins/simcore/install.js"
```

and selects those candidate files as the runtime source under test.

For a genuine SimCore runtime candidate this is correct fail-closed behavior.

For `automation/canonical-main-docs`, however, the candidate commit is a main-derived documentation candidate. Main intentionally carries a historical release-channel-split plugin copy and is not deployed runtime byte authority.

The defect is therefore:

```text
candidate role = DOCUMENTATION CANDIDATE
validation route = RUNTIME CANDIDATE_SHADOW
source authority selected = candidate commit's main-side plugin copy
actual runtime byte authority = release-simcore
```

This is a routing/source-role mismatch upstream of the verifier assertions.

## 4. Provisional R2.12 problem statement

Provisional name:

**R2.12 Release-Channel-Aware Candidate Source Routing**

One-purpose problem statement:

> Canonical documentation candidates must not become SimCore runtime byte candidates merely because they are immutable candidate commits. Validation routing must preserve the main/release-simcore authority split while remaining fail-closed for genuine runtime candidates.

The design should be intentionally narrower than a generalized candidate framework rewrite.

## 5. Preferred minimal design direction

The preferred first design direction is to reuse existing permanent CI semantics instead of creating another profile.

For canonical documentation promotion:

```text
Plugin Control Plane exact-head validation
-> validates generated documentation candidate scope

SimCore MAIN_HEALTH dispatched on the same documentation branch head
-> verifier commit/head remains the exact documentation candidate head
-> runtime source is materialized from release-simcore
-> full SimCore production health remains fail-closed
```

Concretely, the design should evaluate replacing the current canonical-doc SimCore dispatch:

```text
profile=CANDIDATE_SHADOW
candidate_commit=$HEAD_SHA
candidate_fetch_ref=refs/heads/$DOC_BRANCH
```

with the existing production-source route:

```text
profile=MAIN_HEALTH
```

while still dispatching the workflow with `--ref "$DOC_BRANCH"` so the child run is bound to the exact documentation candidate head and the parent workflow can continue matching `headSha == HEAD_SHA`.

Why this direction is preferred:

```text
new validation profile = 0
new runtime source owner = 0
new profile schema = 0
new release authority = 0
CANDIDATE_SHADOW semantic weakening = 0
release-simcore byte authority = preserved
exact candidate-head verifier identity = preserved
```

The existing `MAIN_HEALTH` route already materializes deployed production from `release-simcore` and selects those bytes as source under test.

## 6. Required regression boundary

Any R2.12 implementation should include a deterministic regression proving all of the following:

1. canonical-main documentation promotion does not dispatch SimCore `CANDIDATE_SHADOW`;
2. canonical-main documentation promotion dispatches the selected release-channel-aware SimCore route on the exact generated documentation head;
3. the generated documentation candidate's historical main-side `plugins/simcore/latest.js` / `install.js` cannot become current runtime source under test through this route;
4. genuine runtime candidate paths retain `CANDIDATE_SHADOW` and candidate-byte validation unchanged;
5. frozen-surface, architecture, state, coordination, legacy-compat and latest/install checks are not weakened;
6. Plugin Control Plane validation remains responsible for the generated documentation candidate's actual changed documentation scope.

The existing documentation stream contract test is a natural bounded regression owner if the frozen design confirms that no broader owner is required:

```text
.github/plugin-control-plane/canonical-main/tests/documentation-stream-contract.cjs
```

## 7. Changes that should be avoided

R2.12 should not solve this by:

```text
syncing main plugin bytes to release-simcore
making main a second runtime byte authority
weakening FROZEN_SURFACE checks
weakening architecture/state/legacy gates
teaching CANDIDATE_SHADOW to silently ignore candidate runtime bytes
auto-inferring runtime-vs-doc semantics from arbitrary content without an explicit caller contract
creating another release profile solely to rename MAIN_HEALTH behavior
changing R2.9 validation projection semantics
changing R2.10 context semantics
changing R2.11 profile inventory semantics
changing release publication or approval authority
changing runtime code
```

A new explicit profile should be considered only if the frozen design proves that existing `MAIN_HEALTH` cannot express the required source/verifier split without ambiguity.

## 8. Authority preservation

R2.12 must preserve:

```text
main = design / evidence / roadmap / administration authority
release-simcore = deployed SimCore runtime byte authority
CANDIDATE_SHADOW = genuine immutable runtime-candidate byte validation
MAIN_HEALTH = deployed-production health using trusted/current verifier source
latest.js == install.js = mandatory production identity rule
R2.9 = KEEP / FROZEN
R2.10 = KEEP / FROZEN
R2.11 = KEEP / FROZEN
human live acceptance = unchanged
release approval/publication semantics = unchanged
```

## 9. Runtime transaction separation

Current production remains:

```text
version = 0.70.8
release = Repeat-Send Representation Rewind Guard
production = 01010564649a033e02a0658a167f5f38a6a23632
validation = PENDING_REAL_LONG_CHAT
live gate = 07008_REPEAT_SEND_REPRESENTATION_REWIND_GUARD_REAL_LONG_CHAT
```

R2.12 is a non-runtime repository/control-plane lane.

It must not be mixed into the v0.70.8 runtime release transaction and must not mutate `release-simcore`.

The v0.70.8 human real-long-chat gate remains independent and non-blocked by this defect.

## 10. Recommended next step

```text
R2.12 TRIGGER RECORD = COMPLETE
NEXT = DESIGN-ONLY OWNER / IMPACT AUDIT
THEN = ONE-PURPOSE DESIGN FREEZE
THEN = SEPARATE IMPLEMENTATION AUTHORIZATION
```

Before implementation authorization, the design audit should prove whether exactly two implementation surfaces are sufficient:

```text
.github/workflows/canonical-main-doc-promotion.yml
.github/plugin-control-plane/canonical-main/tests/documentation-stream-contract.cjs
```

If a third permanent owner is required, the design must explain why the existing `MAIN_HEALTH` route cannot be reused directly.

## 11. Final feedback

```text
R2.12 = YES, DESIGN-ELIGIBLE
WHY = SAME CONTROL-PLANE SOURCE-AUTHORITY DEFECT RECURRED ACROSS v0.70.7 AND v0.70.8
PRIMARY OWNER = CANONICAL DOCUMENTATION VALIDATION ROUTING
PREFERRED REPAIR = REUSE MAIN_HEALTH FOR SIMCORE PRODUCTION-SOURCE HEALTH ON DOC CANDIDATES
R2.11 MODIFICATION = NO
RUNTIME MODIFICATION = NO
release-simcore MODIFICATION = NO
IMPLEMENTATION AUTHORIZATION = NOT YET
```
