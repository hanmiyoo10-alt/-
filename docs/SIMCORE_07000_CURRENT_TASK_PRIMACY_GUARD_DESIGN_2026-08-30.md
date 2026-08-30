# SimCore v0.70.0 Current Task Primacy Guard Design

Date: 2026-08-30 KST

Status: **DESIGN FROZEN · IMPLEMENTATION NOT AUTHORIZED**

Classification: **POST-M2 QUALITY / PROMPT CONTRACT MINI · PARTIAL_PREVIOUS_TURN_REPLAY MITIGATION**

## 1. Release identity

```text
Target version: 0.70.0
Release name: Current Task Primacy Guard
Release class: QUALITY / PROMPT CONTRACT MINI
Major checkpoint: remains M2-6
Parent production: v0.69.1 LIVE_PASS
```

Exact parent authority:

```text
release-simcore commit: 5dc5ec1099c6097a6a0e46effeb826889a4741c3
latest/install blob: de764f2c98174aa7f8ae8dc356d83aa6851b3745
latest.js == install.js: YES
```

Root-owner authority:

`docs/SIMCORE_07000_PARTIAL_PREVIOUS_TURN_REPLAY_PROMPT_SCOPE_GAP_ROOT_CAUSE_2026-08-30.md`

Historical symptom authority:

- `docs/SIMCORE_PARTIAL_PREVIOUS_TURN_REPLAY_RECURRENCE_2026-08-27.md`
- `docs/SIMCORE_06411_PARTIAL_PREVIOUS_TURN_REPLAY_REROLL_CONTROL_AND_POST_06500_DISPOSITION_2026-08-28.md`

Post-M2 selection authority:

`docs/SIMCORE_POST_M2_6_ARCHITECTURE_FREEZE_OBSERVATION_REVIEW_2026-08-30.md`

## 2. Problem statement

`PARTIAL_PREVIOUS_TURN_REPLAY` is a recurrent long-chat quality anomaly where a new user request changes or narrows the task but the generated response reuses the immediately preceding assistant response's completed semantic frame/categories before or after answering the current request.

The family has at least three independent natural specimens and same-input reroll clearance has been observed.

Current exact v0.69.1 evidence does not support an active SimCore request-history mutation as the cause:

```text
History stabilization = OBSERVE_ONLY
request order = FROZEN
runtime placement = TAIL_AFTER_CURRENT_USER
paired reroll control = History mutation NONE / runtime identity SAME / SimCore contribution NO_BREAK
```

The underlying model/provider mechanism therefore remains unclaimed.

The SimCore-controllable source gap is narrower and source-proven: Prompt already contains period-specific anti-replay/current-fact authority rules, but lacks a general rule that the **current user request owns the current task**, while the prior assistant response is continuity/reference context only unless the current request explicitly asks to continue/reuse it.

## 3. Current exact Prompt contract

Exact v0.69.1 Prompt:

```text
PROMPT_COMPILER_VERSION = 3
```

Relevant stable contract lines already present:

```text
period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline

do_not_replay_completed_prior_period_transition_as_current_period_transition=1

current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions
```

These remain intact.

## 4. Selected v0.70 change

### 4.1 Prompt compiler version

Advance only the non-persistent compiler contract identity:

```text
PROMPT_COMPILER_VERSION
3 -> 4
```

This is not a Core state/schema version.

The following remain unchanged:

```text
STATE_VERSION
CORE_STATE_VERSION
COMMUNITY_CLASSIFIER_VERSION
narrative clock versions
recurrence version
lineage version
handoff version
SnapshotStore schema/key
Host-local telemetry schema/key
```

### 4.2 Stable current-task primacy contract

Add the following constant stable-contract lines adjacent to the existing period/current-fact authority rules:

```text
current_input_task=primary_generation_authority
prior_assistant_output=continuity_reference_context_not_current_task_authority
do_not_replay_completed_prior_response_frame_or_task_unless_current_input_explicitly_requests_continuation_recap_comparison_or_reuse=1
```

The exact implementation wording may change only for syntax/escaping if the semantic contract remains byte-stable across turns.

The existing period-specific line remains present as a special-case regression anchor:

```text
do_not_replay_completed_prior_period_transition_as_current_period_transition=1
```

### 4.3 Meaning of the contract

The new rule means:

```text
previous assistant output
= usable for continuity, facts, established state and explicit references

current user input
= decides the task/output job for the present turn

completed previous response frame/task
= must not be reproduced merely because it is adjacent in history
```

It does **not** ban use of prior-turn information.

It does **not** force every response to be semantically isolated.

It does **not** prevent deliberate reuse when the current user requests:

```text
continue / 이어서 / 계속
recap / 다시 정리
comparison / 비교
reuse / 아까 형식으로 / 같은 형식으로
explicit continuation of an open broadcast/scene/task
```

The guard separates **continuity context** from **current-task authority**.

## 5. Why the rule lives in the stable tier

The guard is universal and not turn-specific.

Therefore it belongs in Prompt's stable contract rather than a new per-turn volatile classifier.

Benefits:

```text
no semantic classifier needed
no new request scan
no new user-input parser
no added persistent state
no cache-family churn from dynamic replay labels
one stable prompt-byte delta per release
```

The runtime prompt remains at the existing:

```text
TAIL_AFTER_CURRENT_USER
```

placement.

No message ordering change is authorized.

## 6. Explicit non-goals

v0.70.0 does **not** authorize:

- previous assistant body deletion or truncation;
- request-history rewriting/materialization;
- revival of v0.63.46-v0.63.48 History stabilization mutations;
- semantic similarity scoring or embeddings;
- output-side broad relevance censorship;
- Structure repair/judgement expansion;
- Recurrence/Lineage/Handoff semantic redesign;
- cache/provider tuning or provider-cache claims;
- prompt relocation away from `TAIL_AFTER_CURRENT_USER`;
- M2-7 or any structural ownership move;
- Session/Kernel/State Reconcile changes;
- Representation/Edit Reconcile/Runtime Mirror changes;
- THOUGHTS/Knowledge compatibility repair;
- genuine-edit latency optimization;
- LONG_CHAT_STORAGE optimization;
- B_START warning repair;
- COMMUNITY diversity changes;
- release-system R2.x work.

The release is intentionally one Prompt contract change plus required identity/testing adjacency.

## 7. Architecture impact

```text
new module = NONE
module ownership changes = NONE
dependency graph changes = NONE
persistent schema changes = NONE
host/storage/network/timer surface changes = NONE
```

M2 remains frozen at M2-6.

`config/simcore-architecture-v2.json` should not need a structural graph delta for this release. Only version/release-ledger metadata may change through the normal release process if required by existing governance.

## 8. Static acceptance matrix

### 8.1 Identity / packaging

Require:

```text
userscript metadata version = 0.70.0
SIMCORE_RUNTIME_VERSION = 0.70.0
HOST_COMPAT_VERSION = 0.70.0
latest.js == install.js byte-for-byte
node --check latest.js PASS
node --check install.js PASS
```

### 8.2 Prompt contract

Require exact deterministic assertions that:

```text
PROMPT_COMPILER_VERSION = 4
current_input_task=primary_generation_authority appears exactly once
prior_assistant_output=continuity_reference_context_not_current_task_authority appears exactly once
general do_not_replay... line appears exactly once
existing period-specific do_not_replay line remains exactly once
current explicit event-fact authority line remains exactly once
```

### 8.3 Request/history invariants

Permanent fixtures must prove:

```text
runtime prompt placement remains TAIL_AFTER_CURRENT_USER
request message order unchanged
History stabilization disposition remains OBSERVE_ONLY
History stabilization applied = 0
no request-history body replacement
no visible chat write added on request path
no new raw-body retention
```

### 8.4 Prompt tier stability

The three new rules must live in the stable compiler tier.

Require repeated compile fixtures over different modes/state values to prove the new rule bytes do not vary by turn.

Only already-existing slow/volatile fields may vary.

### 8.5 Mode regression fixtures

Require existing deterministic prompt/state fixtures for:

```text
Mode A ordinary narrative
Mode B_START
Mode B_CONTINUE
Mode B_END
Mode C / COMMUNITY
Short-C source lock
Post-B_END C clock handoff
explicit historical/flashback allowance
Recurrence repeated-template state
Lineage / Handoff state
```

The new stable rules may appear, but all unrelated state/prompt fields and ordering remain unchanged.

### 8.6 Frozen safety controls

Continue requiring:

```text
SAME_FAST
REPRESENTATION_FAST_RECONCILED
USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT
Deferred Mirror strict guards
THOUGHTS compatibility fixtures
Structure judge-only fixtures
Community v3 classifier fixtures
Frame / Time / continuity fixtures
State Reconcile differential fixtures
```

## 9. Differential implementation proof

Implementation should use a deterministic builder from exact v0.69.1 production.

Candidate-vs-parent diff must be bounded to:

```text
release identity/header ledger
PROMPT_COMPILER_VERSION 3 -> 4
three stable current-task primacy lines
operator/release adjacency required by existing release tooling
```

No unrelated runtime owner body may change.

A builder test should extract Prompt's compiled stable contract from parent and candidate and prove the semantic diff is exactly the selected additions plus compiler version.

## 10. Real long-chat acceptance matrix

Because the target is nondeterministic generation behavior, static proof establishes scope while live evidence establishes product usefulness.

### Stage A: ordinary continuity control

Required natural turn sequence in a long chat where the current request legitimately depends on prior context.

Examples include ordinary story continuation or C/COMMUNITY follow-up.

Acceptance:

```text
prior established facts remain usable
no artificial context amnesia
continuity/frame/state remain PASS
warnings attributable to guard = 0
```

This proves the guard did not interpret “prior assistant is not current-task authority” as “ignore history.”

### Stage B: task-shift replay control

Required controlled ordinary pair matching the historical symptom shape:

```text
turn N: broad structured task with several completed categories/sections
turn N+1: materially narrower or different task that still shares world/topic context
```

Acceptance for turn N+1:

```text
current task answered directly
completed prior category/frame not reintroduced without request
no broad prior-task suffix after current task is complete
```

This may use a natural operator request; malformed output or hidden prompt manipulation is not required.

### Stage C: second independent task shift

Require one additional ordinary task-shift pair, preferably from another mode/family or another semantic distance.

Goal: reduce the chance that one clean generation is mistaken for proof against a recurrent stochastic family.

Acceptance is the same as Stage B.

### Stage D: explicit reuse/continuation positive control

Required one ordinary current input that explicitly asks to continue, recap, compare or reuse the immediately previous response/task.

Acceptance:

```text
requested reuse/continuation still works
new guard does not suppress explicitly authorized previous-frame use
```

### Bonus

If a same-input reroll is naturally used during validation, both generations should respect current-task primacy. A reroll is not mandatory if Stages B/C already provide clean independent controls.

## 11. Live failure classification

### BLOCKER

Promote to BLOCKER for v0.70 release acceptance if:

```text
new guard causes clear context amnesia in ordinary continuity
explicit continuation/reuse is suppressed
B_CONTINUE or C follow-up semantics regress
new request-history mutation appears
persistent/schema/host behavior changes unexpectedly
latest/install diverge
```

### FIX / design revision

If the historical replay shape recurs in both Stage B and Stage C despite exact v0.70 prompt presence, classify:

```text
CURRENT_TASK_PRIMACY_GUARD_INSUFFICIENT
= FIX / DESIGN REVISION
```

Do not respond by stacking ad-hoc semantic rules during the same release transaction.

### WATCH

One ambiguous generation with unclear current-vs-prior task boundaries may be preserved as WATCH rather than automatically failing the release.

## 12. Performance/cache boundary

The new stable lines add a small constant prompt-size delta.

Implementation evidence must record exact character/line increase.

No claim may be made that the release improves or harms provider cache because provider cache remains unverified.

The relevant invariant is only:

```text
new contract bytes = stable across turns
runtime placement = unchanged
no dynamic per-turn replay classifier = added
```

## 13. Implementation stop conditions

Stop and redesign if preflight shows any requirement for:

- parsing previous assistant semantics dynamically;
- mutating request history;
- moving the runtime prompt;
- adding persistent replay state;
- changing Recurrence/Lineage/Handoff ownership;
- adding a semantic output validator;
- weakening existing continuity rules to make the new guard work;
- introducing provider/model-specific API behavior;
- changing M2 architecture;
- mixing performance/storage work into the same release.

The selected repair must remain a stable Prompt-contract generalization.

## 14. Release sequence after authorization

If implementation is separately authorized:

```text
1. re-read current main and exact release-simcore v0.69.1
2. create dedicated v0.70 runtime work branch
3. materialize exact v0.69.1 parent
4. apply only frozen Prompt contract + identity change
5. run builder/static/full regression/permanent CI
6. publish exact candidate through current release system
7. verify release-simcore latest == install
8. perform real long-chat Stage A/B/C/D
9. classify any anomaly WATCH / DEFER / FIX / BLOCKER
10. human LIVE_PASS decision
11. terminal main state/document convergence
```

No release-system redesign is part of this work.

## 15. Frozen design verdict

```text
V07000_VERSION
= 0.70.0

V07000_RELEASE_NAME
= Current Task Primacy Guard

V07000_CLASS
= QUALITY / PROMPT CONTRACT MINI

V07000_OWNER
= Prompt

V07000_CHANGE
= PROMPT_COMPILER_VERSION 3 -> 4
+ stable current-task primacy contract

PARTIAL_PREVIOUS_TURN_REPLAY
= recurrent symptom / high confidence

UNDERLYING_PROVIDER_CAUSE
= UNPROVEN / NO CLAIM

SIMCORE_CONTROLLABLE_PROMPT_SCOPE_GAP
= PROVEN

M2_CHECKPOINT
= M2-6 UNCHANGED

M2_7
= NOT AUTHORIZED

V07000_DESIGN
= FROZEN

V07000_IMPLEMENTATION
= NOT AUTHORIZED

RELEASE_SIMCORE_MUTATION_THIS_DOCUMENT
= NONE
```
