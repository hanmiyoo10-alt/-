# SimCore v0.70.0 Implementation Evidence

Date: 2026-08-30 KST

Status: **IMPLEMENTED ON WORK BRANCH · CI PENDING · PRODUCTION UNCHANGED**

Release: `v0.70.0 Current Task Primacy Guard`

## Authorities

- Design: `docs/SIMCORE_07000_CURRENT_TASK_PRIMACY_GUARD_REBASED_DESIGN_2026-08-30.md`
- Root cause: `docs/SIMCORE_07000_PARTIAL_PREVIOUS_TURN_REPLAY_PROMPT_SCOPE_GAP_ROOT_CAUSE_2026-08-30.md`
- Implementation authorization: `docs/SIMCORE_07000_IMPLEMENTATION_AUTHORIZATION_2026-08-30.md`

Exact production parent:

```text
release-simcore commit = 2f7e6a55f89adb7a9b33f7306a47ca06a8baf18f
version = 0.69.2
release name = MamsHolic Exact Brand Alias Repair
M2 checkpoint = M2-6
```

## Implementation shape

Permanent deterministic builder:

`products/simcore/tooling/build-07000-current-task-primacy-guard.py`

Permanent regression suite:

`products/simcore/tests/suites/builder-v07000.test.mjs`

The builder starts only from exact v0.69.2 plugin identity and applies the frozen semantic delta:

```text
0.69.2 -> 0.70.0 release/runtime/Host identity
PROMPT_COMPILER_VERSION 3 -> 4
+ current_input_task=primary_generation_authority
+ prior_assistant_output=continuity_reference_context_not_current_task_authority
+ do_not_replay_completed_prior_response_frame_or_task_unless_current_input_explicitly_requests_continuation_recap_comparison_or_reuse=1
```

The new rules are inserted once in the stable Prompt tier adjacent to the existing period/current-event authority rules.

## Scope guards

Builder verification requires:

```text
Prompt module delta = compiler identity + exactly three selected stable rules
Community module byte-identical to v0.69.2 parent
MamsHolic exact brand alias marker count unchanged
COMMUNITY_CLASSIFIER_VERSION = 3 unchanged
STATE_VERSION = 5 unchanged
CORE_STATE_VERSION = 10 unchanged
State Reconcile physical owner retained
latest.js == install.js after materialization
```

No request-history mutation, persistent state/schema, Host API, network, timer, provider, Recurrence, Lineage, Handoff or M2 architecture change is authorized or introduced by the builder.

## Regression intent

The executable suite verifies:

- exact v0.69.2 predecessor activation;
- metadata/runtime/Host identity convergence on 0.70.0;
- latest/install byte identity;
- Prompt compiler v4;
- three new current-task primacy rules exactly once;
- period-specific anti-replay and current-event authority lines retained exactly once;
- Prompt module change bounded to the selected semantic delta;
- v0.69.2 MamsHolic positive aliases preserved;
- unrelated MamsHolic false-positive controls preserved;
- Community classifier/state/M2-6 ownership frozen.

## Release boundary

This implementation branch does **not** mutate `release-simcore` and does not create a release approval by itself. After CI passes, the existing candidate/release system remains the only publication path.

```text
07000_IMPLEMENTATION = WORK_BRANCH_PREPARED
07000_CI = PENDING
07000_PRODUCTION = STILL_0.69.2
07000_RELEASE_SYSTEM_CHANGE = NONE
```
