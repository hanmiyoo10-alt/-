# SimCore v0.70.0 Current Task Primacy Guard Rebased Design

Date: 2026-08-30 KST

Status: **DESIGN FROZEN · PARENT REBASED TO v0.69.2 LIVE_PASS · IMPLEMENTATION NOT AUTHORIZED**

Classification: **POST-M2 QUALITY / PROMPT CONTRACT MINI · PARTIAL_PREVIOUS_TURN_REPLAY MITIGATION**

Supersedes parent coordinates in:

`docs/SIMCORE_07000_CURRENT_TASK_PRIMACY_GUARD_DESIGN_2026-08-30.md`

The original document remains historical design evidence. This document is the current implementation-design authority for v0.70.0.

## 1. Release identity

```text
Target version: 0.70.0
Release name: Current Task Primacy Guard
Release class: QUALITY / PROMPT CONTRACT MINI
Owner: Prompt
Major checkpoint: M2-6 unchanged
Parent production: v0.69.2 LIVE_PASS
```

Exact parent authority:

```text
release-simcore commit: 2f7e6a55f89adb7a9b33f7306a47ca06a8baf18f
latest/install blob: 8132fc447e237f7f7a08a27126191a47dc6eac6f
latest.js == install.js: YES
size: 568,090 bytes
```

Terminal parent evidence:

- `docs/SIMCORE_LIVE_06902_RELEASE_CLOSE_2026-08-30.md`
- `docs/SIMCORE_06902_TERMINAL_DOCUMENTATION_SYNC_2026-08-30.md`
- `products/simcore/releases/live-evidence/simcore-v0.69.2-new-06.json`

Root-owner authority for the target symptom:

`docs/SIMCORE_07000_PARTIAL_PREVIOUS_TURN_REPLAY_PROMPT_SCOPE_GAP_ROOT_CAUSE_2026-08-30.md`

Historical symptom authority:

- `docs/SIMCORE_PARTIAL_PREVIOUS_TURN_REPLAY_RECURRENCE_2026-08-27.md`
- `docs/SIMCORE_06411_PARTIAL_PREVIOUS_TURN_REPLAY_REROLL_CONTROL_AND_POST_06500_DISPOSITION_2026-08-28.md`

## 2. Parent rebase audit

The exact production comparison from v0.69.1 to v0.69.2 is one release commit:

```text
v0.69.1 production
5dc5ec1099c6097a6a0e46effeb826889a4741c3

v0.69.2 production
2f7e6a55f89adb7a9b33f7306a47ca06a8baf18f

ahead_by: 1
behind_by: 0
changed production files: 2
  plugins/simcore/latest.js
  plugins/simcore/install.js
```

Observed semantic delta is bounded to:

```text
0.69.1 -> 0.69.2 release/version identity
+ MamsHolic Exact Brand Alias release ledger
+ exact/anchored 맘스홀릭 recognition in parentLocalAliasInfo
```

The comparison does not introduce a Prompt compiler/current-task-authority repair and does not alter the source-proven scope gap selected for v0.70.0.

Therefore:

```text
V07000_SELECTED_REPAIR_SURVIVES_PARENT_REBASE = YES
MAMSHOLIC_ALIAS_AND_V07000_PROMPT_CHANGE = ORTHOGONAL
M2_ARCHITECTURE_DELTA_REQUIRED = NO
```

Implementation preflight must reassert the exact parent Prompt compiler identity before mutation. The v0.69.1 -> v0.69.2 production diff contains no Prompt-contract change, so the selected compiler transition remains:

```text
PROMPT_COMPILER_VERSION 3 -> 4
```

## 3. Problem statement

`PARTIAL_PREVIOUS_TURN_REPLAY` is a recurrent long-chat quality anomaly in which a new user request changes or narrows the job, but the generated response reuses the immediately preceding assistant response's already-completed semantic frame/categories before or after addressing the current request.

Current durable evidence supports:

```text
natural recurrence count >= 3
same-input reroll clearance observed
History stabilization = OBSERVE_ONLY
request order = FROZEN
runtime placement = TAIL_AFTER_CURRENT_USER
active SimCore history mutation cause = NOT PROVEN
provider/model root cause = NOT CLAIMED
```

The SimCore-controlled gap is narrower and source-proven:

```text
existing Prompt has period-specific anti-replay authority
existing Prompt has current explicit fact authority
existing Prompt lacks a general current-task primacy rule
```

The target is therefore a stable Prompt-contract generalization, not history surgery or an output repair engine.

## 4. Selected v0.70 change

### 4.1 Prompt compiler identity

Advance only the non-persistent Prompt compiler contract identity:

```text
PROMPT_COMPILER_VERSION
3 -> 4
```

No Core/state schema version changes are authorized.

The following remain frozen:

```text
STATE_VERSION
CORE_STATE_VERSION
COMMUNITY_CLASSIFIER_VERSION = 3
SnapshotStore schema/key
Host-local telemetry schema/key
narrative clock versions
recurrence version
lineage version
handoff version
```

### 4.2 Stable current-task primacy contract

Add exactly one stable instance of each semantic rule adjacent to the existing period/current-fact authority rules:

```text
current_input_task=primary_generation_authority
prior_assistant_output=continuity_reference_context_not_current_task_authority
do_not_replay_completed_prior_response_frame_or_task_unless_current_input_explicitly_requests_continuation_recap_comparison_or_reuse=1
```

Escaping/syntax may vary only as required by the existing compiler representation. The semantic bytes produced by the stable tier must remain constant across turns.

Existing special-case anchors remain exactly once:

```text
period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline
do_not_replay_completed_prior_period_transition_as_current_period_transition=1
current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions
```

## 5. Contract meaning

```text
current user input
= primary authority for the present generation task

previous assistant output
= continuity / established-fact / reference context

completed previous response frame or task
= not automatically the present task
```

Prior context remains usable when it supplies:

```text
established world facts
continuity
state
explicit references
open scene/broadcast context
```

Prior task/frame reuse remains allowed when the current user explicitly requests it, including:

```text
continue / 이어서 / 계속
recap / 다시 정리
comparison / 비교
reuse / 아까 형식으로 / 같은 형식으로
explicit continuation of an open scene/broadcast/task
```

The guard separates continuity context from current-task authority. It is not a context-amnesia rule.

## 6. v0.69.2 regression freeze

v0.70.0 must preserve the now-live-proven Community alias repair byte-for-byte in behavior.

Required frozen controls:

```text
맘스홀릭 -> canonical key 맘카페
맘스홀릭 / 자유게시판 -> canonical key 맘카페
맘스홀릭 / 육아 이야기 -> canonical key 맘카페
shown label remains source label
canonical group remains 학부모/지역
COMMUNITY_CLASSIFIER_VERSION remains 3
맘카페 exact family remains exact
네이버 카페 exact family remains exact
맘스터치 remains unknown
게임홀릭 remains unknown
```

No Community classifier, alias, migration/backfill, reaction grammar, or diversity semantic change is authorized in v0.70.0.

The v0.69.2 live positive:

```text
visible [맘스홀릭 / 자유게시판]
reaction_max canonical family 맘카페
Warnings 0
```

becomes a permanent regression anchor for v0.70.0.

## 7. Why this rule stays in the stable tier

The rule is universal and not turn-specific.

Stable-tier ownership avoids:

```text
new semantic input classifier
new previous-output parser
new persistent replay state
new volatile replay labels
new cache-family churn from dynamic classification
new request-history mutation
```

Runtime placement remains:

```text
TAIL_AFTER_CURRENT_USER
```

Message ordering remains unchanged.

## 8. Explicit non-goals

v0.70.0 does not authorize:

- previous assistant body deletion/truncation;
- request-history rewriting or materialization;
- revival of old History stabilization mutation behavior;
- semantic similarity scoring or embeddings;
- output-side broad relevance censorship;
- a new semantic output validator;
- Recurrence / Lineage / Handoff redesign;
- Community classifier or alias changes;
- cache/provider tuning or provider-cache claims;
- Prompt relocation away from `TAIL_AFTER_CURRENT_USER`;
- M2-7 or any structural ownership move;
- Session / Kernel / State Reconcile changes;
- Representation / Edit Reconcile / Runtime Mirror changes;
- THOUGHTS / Knowledge compatibility changes;
- genuine-edit latency optimization;
- LONG_CHAT_STORAGE optimization;
- B_START warning repair;
- release-system R2.x work;
- CURRENT_DEVELOPMENT document architecture migration.

This release is one Prompt contract change plus required release identity/testing adjacency.

## 9. Architecture impact

```text
new module = NONE
module ownership change = NONE
dependency graph change = NONE
persistent schema change = NONE
host/storage/network/timer surface change = NONE
M2 checkpoint = M2-6 unchanged
M2-7 = NOT AUTHORIZED
```

`config/simcore-architecture-v2.json` should require no structural graph change. Only normal release/version ledger metadata may move where existing governance requires it.

## 10. Allowed implementation diff

Implementation must start from exact v0.69.2 production authority, not the historical v0.69.1 parent.

Candidate-vs-parent semantic delta is bounded to:

```text
release identity 0.69.2 -> 0.70.0
release ledger adjacency required by existing tooling
PROMPT_COMPILER_VERSION 3 -> 4
three stable current-task primacy rules
required deterministic tests/fixtures
```

Frozen negative delta:

```text
v0.69.2 MamsHolic alias bytes/behavior changed = FORBIDDEN
Community classifier body changed = FORBIDDEN
M2 ownership graph changed = FORBIDDEN
history mutation added = FORBIDDEN
persistent schema changed = FORBIDDEN
new host/network/timer/provider API behavior = FORBIDDEN
```

A deterministic builder should compare the v0.69.2 parent and v0.70 candidate and prove the Prompt semantic diff is exactly the compiler version plus three selected stable rules.

## 11. Static acceptance matrix

### Identity / packaging

Require:

```text
userscript metadata = 0.70.0
SIMCORE_RUNTIME_VERSION = 0.70.0
HOST_COMPAT_VERSION = 0.70.0
latest.js == install.js byte-for-byte
node --check latest.js PASS
node --check install.js PASS
```

### Prompt contract

Require:

```text
PROMPT_COMPILER_VERSION = 4
current_input_task rule appears exactly once
prior_assistant_output rule appears exactly once
general do_not_replay rule appears exactly once
period-specific anti-replay line remains exactly once
current explicit event-fact authority remains exactly once
```

### Request/history invariants

Require:

```text
runtime prompt placement = TAIL_AFTER_CURRENT_USER
request message order unchanged
History stabilization disposition = OBSERVE_ONLY
History stabilization applied = 0
request-history body replacements = 0
new visible-chat write on request path = 0
new raw-body retention = 0
```

### Stable-tier proof

Compile over multiple modes/state values and prove the three new rule bytes are stable. Only already-existing slow/volatile fields may vary.

### Mode regressions

Retain deterministic controls for:

```text
Mode A ordinary narrative
B_START
B_CONTINUE
B_END
Mode C / COMMUNITY
Short-C source lock
Post-B_END C clock handoff
historical/flashback allowance
Recurrence repeated-template state
Lineage / Handoff state
```

### Frozen product controls

Continue requiring:

```text
SAME_FAST
REPRESENTATION_FAST_RECONCILED
USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT
Deferred Mirror strict guards
THOUGHTS compatibility
Structure judge-only behavior
Community v3 classifier
v0.69.2 MamsHolic exact alias fixtures
Frame / Time / continuity fixtures
State Reconcile differential fixtures
```

## 12. Real long-chat acceptance matrix

Because the target symptom is stochastic generation behavior, static proof establishes scope and live evidence evaluates usefulness.

### Stage A: ordinary continuity control

Use a natural long-chat turn where the current request legitimately depends on prior context.

Acceptance:

```text
prior established facts remain usable
no artificial context amnesia
continuity/frame/state remain PASS
attributable warnings = 0
```

### Stage B: task-shift replay control

Use a controlled ordinary pair:

```text
turn N: broad structured task with completed categories/sections
turn N+1: materially narrower or different task sharing world/topic context
```

Acceptance on turn N+1:

```text
current task answered directly
completed prior task/category frame not reintroduced without request
no broad previous-task suffix after current job is complete
```

### Stage C: second independent task shift

Require a second ordinary task-shift pair, preferably from another mode/family or semantic distance.

Acceptance matches Stage B.

### Stage D: explicit reuse/continuation positive control

Use one ordinary current input explicitly asking to continue, recap, compare, or reuse the immediately previous response/task.

Acceptance:

```text
requested previous-frame reuse still works
continuity is not suppressed by the new guard
```

### Stage E: v0.69.2 Community alias preservation control

One natural Mode C turn is sufficient if Community output appears during the validation window.

If `맘스홀릭` naturally appears, require:

```text
shown label preserved
canonical family = 맘카페
unknown-platform warning attributable to exact brand = 0
```

Do not force generation solely to obtain this label. Deterministic fixtures remain classifier authority.

## 13. Failure classification

### BLOCKER

```text
clear context amnesia introduced
explicit continuation/reuse suppressed
B_CONTINUE or C follow-up semantics regress
request-history mutation appears
v0.69.2 MamsHolic alias regresses
persistent/schema/host behavior changes unexpectedly
latest.js != install.js
```

### FIX / DESIGN REVISION

If the historical replay shape recurs in both Stage B and Stage C despite exact v0.70 Prompt presence:

```text
CURRENT_TASK_PRIMACY_GUARD_INSUFFICIENT
= FIX / DESIGN REVISION
```

Do not stack ad-hoc semantic rules in the same release transaction.

### WATCH

One ambiguous generation with unclear current-vs-prior task boundaries may remain WATCH.

Existing unrelated performance/cache/storage observations remain separate unless causal evidence changes.

## 14. Performance/cache boundary

The new rules add a small constant stable Prompt delta.

Implementation evidence must record exact line/character increase.

No provider-cache improvement or regression claim is authorized because provider cache remains `UNVERIFIED`.

Relevant invariant:

```text
new contract bytes stable across turns
runtime placement unchanged
no dynamic per-turn replay classifier
```

## 15. Stop conditions

Stop and redesign if implementation appears to require:

- parsing previous assistant semantics dynamically;
- mutating request history;
- moving the runtime Prompt;
- adding persistent replay state;
- changing Recurrence / Lineage / Handoff ownership;
- adding an output semantic repair engine;
- weakening existing continuity rules;
- provider/model-specific API behavior;
- modifying Community classifier semantics;
- changing M2 architecture;
- mixing performance/storage or release-system work into this release.

## 16. Implementation sequence if separately authorized

```text
1. re-read current main and exact release-simcore v0.69.2
2. create dedicated v0.70 runtime work branch from exact parent
3. materialize exact v0.69.2 latest/install authority
4. apply only Prompt compiler v4 + three stable rules + identity adjacency
5. preserve v0.69.2 MamsHolic alias exactly
6. run builder/static/full regression/permanent CI
7. publish exact immutable candidate through the existing release system
8. independently verify release-simcore latest == install
9. perform real long-chat Stages A/B/C/D plus Community preservation when natural
10. classify anomalies WATCH / DEFER / FIX / BLOCKER
11. obtain explicit human LIVE_PASS decision
12. project terminal main state/document convergence
```

No release-system redesign is part of this sequence.

## 17. Rebased design verdict

```text
V07000_VERSION = 0.70.0
V07000_RELEASE_NAME = Current Task Primacy Guard
V07000_CLASS = QUALITY / PROMPT CONTRACT MINI
V07000_OWNER = Prompt

PARENT_VERSION = 0.69.2 LIVE_PASS
PARENT_COMMIT = 2f7e6a55f89adb7a9b33f7306a47ca06a8baf18f
PARENT_BLOB = 8132fc447e237f7f7a08a27126191a47dc6eac6f

SELECTED_CHANGE = PROMPT_COMPILER_VERSION 3 -> 4
+ stable current-task primacy contract

V06902_MAMSHOLIC_ALIAS = FROZEN REGRESSION CONTROL
COMMUNITY_CLASSIFIER_VERSION = 3 UNCHANGED

PARTIAL_PREVIOUS_TURN_REPLAY = RECURRENT / HIGH-CONFIDENCE SYMPTOM
UNDERLYING_PROVIDER_CAUSE = UNPROVEN / NO CLAIM
SIMCORE_CONTROLLABLE_PROMPT_SCOPE_GAP = PROVEN

M2_CHECKPOINT = M2-6 UNCHANGED
M2_7 = NOT AUTHORIZED

V07000_PARENT_REBASE_REVIEW = PASS
V07000_DESIGN = FROZEN
V07000_IMPLEMENTATION = NOT AUTHORIZED
RELEASE_SIMCORE_MUTATION_THIS_DOCUMENT = NONE
```
