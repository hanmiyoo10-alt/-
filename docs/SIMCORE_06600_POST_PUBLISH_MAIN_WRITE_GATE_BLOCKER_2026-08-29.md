# SimCore v0.66.0 Post-Publish Main Write Gate Blocker

Date: 2026-08-29 KST

Status:

`BLOCKER OPEN · ROOT CAUSE CONFIRMED · TRUSTED CI BOOTSTRAP REQUIRED · PRODUCTION PUBLISHED · MAIN LIVE_PENDING NOT DURABLE`

Final classification:

`FIX · BLOCKER · RELEASE_STATE_MARKER_TRANSITION · POST_PUBLISH_MAIN_STATE_SYNC · NON_RUNTIME · PRODUCTION_EXPOSURE_EXISTS`

## Trigger

Exact approval transaction:

`simcore-v0.66.0-new-05`

Exact Approval Activation:

`33206513419`

Permanent Release:

`33206537749`

The permanent release successfully passed:

```text
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify     = SUCCESS
Candidate Required / Required   = SUCCESS
Publish Exact Candidate         = SUCCESS
```

The exact candidate is already published to production:

```text
release-simcore commit = 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
version                = 0.66.0
latest blob            = f0da13d4c47fd98e9065d7dbf253a3296151ee16
install blob           = f0da13d4c47fd98e9065d7dbf253a3296151ee16
previous production P  = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
```

Therefore this incident occurs strictly after successful runtime publication.

## Exact failing stage

`Declare Published State` failed in:

`Commit and gate bounded main state`

The post-publish state tool successfully built a bounded LIVE_PENDING payload:

```text
releaseAuthority   = RS2_4_PERMANENT
productionMutation = ALREADY_PUBLISHED_UPSTREAM
mainMutation       = LOCAL_PAYLOAD_PENDING_GATEWAY
lifecycleState     = LIVE_PENDING
rLifecycleState    = REAL_RELEASE_LIVE_PENDING
currentPriority    = 06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT
disposition        = LIVE_PENDING_PAYLOAD_READY
```

The payload boundary check passed:

`RS2_4_POST_PUBLISH_PAYLOAD_BOUNDARY_PASS`

A local payload commit was created:

`92f6d331e175ad0c844f32cd14b1d897a4bace95` — `state(simcore): declare simcore-v0.66.0-new-05 live pending`

The repository main-write gateway rejected promotion because required MAIN_HEALTH run `33206619653` failed.

## MAIN_HEALTH diagnosis

Run:

`33206619653`

All non-regression release gates passed:

```text
GATE_STATIC        = PASS
GATE_ARCH          = PASS
GATE_STATE         = PASS
GATE_COORDINATION  = PASS
GATE_LEGACY_COMPAT = PASS
GATE_REGRESSION    = FAIL
```

Reason code:

`PERMANENT_REGRESSION_FAIL`

Exact failing assertion:

```text
SUITE_ASSERTION_FAILED: closure-integrity: single active release-state begin: expected=1 actual=2
```

The verifier observed the already-published v0.66.0 production commit and byte-identical latest/install successfully. This failure is therefore not a runtime, architecture, state-schema, coordination, or legacy-compatibility defect.

## Root cause

Current durable `main` before state convergence contains exactly one machine release-state block:

```text
SIMCORE_RELEASE_STATE:LIVE_PASS
release transaction = simcore-v0.65.0-new-05
```

`products/simcore/tooling/release-state-converge.mjs` currently defines only LIVE_PENDING-specific markers for its renderer:

```text
LIVE_BEGIN = SIMCORE_RELEASE_STATE:LIVE_PENDING:BEGIN
LIVE_END   = SIMCORE_RELEASE_STATE:LIVE_PENDING:END
```

`renderLiveBlock()` counts/replaces only an existing LIVE_PENDING block. When none exists, it inserts the new LIVE_PENDING block after the production snapshot. It does not detect or replace a predecessor LIVE_PASS block.

The generated local payload `92f6d331...` consequently contains two machine release-state blocks:

```text
SIMCORE_RELEASE_STATE:LIVE_PENDING
→ simcore-v0.66.0-new-05

SIMCORE_RELEASE_STATE:LIVE_PASS
→ simcore-v0.65.0-new-05
```

R2.2 permanent closure-integrity intentionally requires exactly one current machine release-state block regardless of mode:

```text
releaseBegins = match all SIMCORE_RELEASE_STATE:<mode>:BEGIN
releaseEnds   = match all SIMCORE_RELEASE_STATE:<mode>:END
require begins.length == 1
require ends.length == 1
require begin mode == end mode
```

Therefore the post-publish renderer and the permanent current-authority invariant are inconsistent during a terminal-to-live transition:

```text
LIVE_PASS predecessor
→ publish next release
→ release-state-converge inserts LIVE_PENDING instead of replacing predecessor state block
→ two current release-state markers
→ closure-integrity correctly rejects main write
```

## Missing regression coverage

`products/simcore/tests/post-publish-state-permanent.test.mjs` initializes `docs/CURRENT_DEVELOPMENT.md` with a production snapshot only and no predecessor `SIMCORE_RELEASE_STATE:LIVE_PASS` block.

Its positive LIVE_PENDING test therefore proves insertion into an empty release-state surface, but not the real steady-state transition:

```text
LIVE_PASS → LIVE_PENDING
```

The defect escaped because this transition fixture was absent.

## Recovery-path implication

The installed permanent post-publish recovery lane is not safe to invoke yet for this incident.

That lane rebuilds the administrative payload through the same `post-publish-state.mjs → release-state-converge.mjs` owner. Without fixing marker transition semantics first, a recovery request would deterministically recreate the same two-marker payload and fail the same closure-integrity gate.

Therefore:

`DO_NOT_RERUN_PERMANENT_RECOVERY_UNTIL_MARKER_TRANSITION_FIX_REACHES_MAIN`

## Trusted CI bootstrap cycle observed on FIX PR

Narrow marker-transition implementation PR:

`#781 fix(simcore): replace predecessor release-state marker on live pending`

Latest head tested:

`c1041f9c8e5100bcf57b6d192b6f55d1dcc4c9d4`

SimCore CI run:

`33207571791`

The PR was correctly classified as CI-self/state-sync work:

```text
CI_SELF
HARNESS
STATE_SYNC
SIMCORE_DOC_ONLY
```

Because this is a CI-self change, the permanent PR workflow first ran the trusted predecessor verifier from PR base `9b204178d2f74cd451e6dd049347ef6e9e1c1f45` against the already-published production commit `4b6ae1a4c63f6be658c6163168cc46a1adef60aa`.

The trusted predecessor lane exited before proposed code execution:

```text
Current trusted lane for CI self-change = FAILURE
Run proposed permanent verifier          = SKIPPED
trusted conclusion                        = INFRA_ERROR
```

This repeats the previously documented post-publish recovery bootstrap cycle from the first real R release:

```text
production already advanced
→ main administrative production identity still predecessor
→ trusted predecessor MAIN_HEALTH cannot establish coherent current production/admin truth
→ CI-self repair cannot reach proposed verifier
```

Classification:

```text
POST_PUBLISH_RECOVERY_TRUSTED_CI_BOOTSTRAP_CYCLE
= FIX / BLOCKER / CI_TRUST_BOUNDARY / ADMIN_STATE / NON_RUNTIME / REPEATED_KNOWN_PATTERN
```

This is not evidence that the proposed marker-transition implementation failed. In run `33207571791`, the proposed verifier was never executed.

Required handling follows the existing canonical precedent rather than bypassing trusted CI:

```text
canonical durable-memory bootstrap
→ synchronize only production/admin identity to already-published v0.66.0
→ keep runtime publication untouched
→ close transport command PR without merge
→ rebuild marker-transition FIX from synchronized current main
→ rerun permanent PR verification
```

The stale-base #781 PR must not be treated as approval evidence after bootstrap because its pull-request base identity remains the pre-bootstrap main state.

## Authorized repair boundary

Repair as a separate non-runtime release-system blocker fix. Do not mutate the already-published v0.66.0 runtime.

Required narrow correction:

1. `release-state-converge` must treat the entire `SIMCORE_RELEASE_STATE:<mode>` block family as one current-authority slot.
2. When transitioning to LIVE_PENDING, exactly one well-formed existing release-state block of any mode must be replaced by the new LIVE_PENDING block.
3. If no release-state block exists, insertion after `PRODUCTION_SNAPSHOT:END` remains allowed.
4. Multiple/mismatched existing release-state markers must fail closed rather than guessing.
5. Add permanent regression coverage for real `LIVE_PASS → LIVE_PENDING` replacement and resulting single-marker truth.
6. Preserve publication authority, persistent payload allowlist, state receipt semantics, release records, main-write gateway, and `release-simcore` untouched.

This is a release-state renderer/current-authority repair only, not a weakening of closure-integrity.

## Safety interpretation

This is not a runtime publication rollback condition. The exact runtime candidate passed CANDIDATE_REQUIRED and was published by the single permanent publisher.

Do not mutate or republish runtime bytes while repairing this incident.

The inconsistent authority state is administrative:

```text
release-simcore says v0.66.0 is production
main still reflects pre-publication v0.65 LIVE_PASS administrative truth
```

Because `main` is the authority for design/evidence/roadmap/administrative records, this divergence remains a blocker before human real-long-chat acceptance may begin.

## Required recovery sequence

```text
record this incident on main
→ canonical durable-memory bootstrap to already-published v0.66 production identity
→ rebuild narrow release-state marker transition fix from synchronized main
→ permanent static/CI validation
→ merge fix to main
→ create one-shot permanent published-state recovery request for exact new-05 publication
→ recovery reobserves release-simcore C/blob
→ rebuild LIVE_PENDING payload using fixed renderer
→ MAIN_HEALTH / Required PASS
→ durable main write
→ verify manifest + CURRENT_DEVELOPMENT + GUIDELINES + release record + state receipt agreement
→ only then begin human real-long-chat validation
```

Do not fabricate human live evidence and do not treat successful runtime publication as final release closure.
