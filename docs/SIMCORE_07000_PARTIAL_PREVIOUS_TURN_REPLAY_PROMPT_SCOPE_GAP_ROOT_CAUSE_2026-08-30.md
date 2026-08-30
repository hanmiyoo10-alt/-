# SimCore v0.70.0 Partial Previous-Turn Replay Prompt-Scope Gap Root Cause

Date: 2026-08-30 KST

Status: **SIMCORE-CONTROLLABLE CONTRACT GAP PROVEN · UNDERLYING MODEL/PROVIDER CAUSE UNPROVEN · v0.70 DESIGNABLE**

Classification: **POST-M2 QUALITY ROOT-OWNER INVESTIGATION · PROMPT CONTRACT GAP · NO RUNTIME MUTATION**

## 1. Production baseline

```text
Version: 0.69.1
Release: Refreshless Targeted Update Liveness Repair
release-simcore: 5dc5ec1099c6097a6a0e46effeb826889a4741c3
latest/install blob: de764f2c98174aa7f8ae8dc356d83aa6851b3745
validation: LIVE_PASS
checkpoint: M2-6
M2 architecture: FROZEN
```

This investigation follows terminal post-M2-6 architecture convergence. No M2-7 or structural refactor is implied.

## 2. Symptom authority

The repository already preserves `PARTIAL_PREVIOUS_TURN_REPLAY` as a recurrent user-visible family.

Observed family shape:

```text
new user request materially changes or narrows the task
→ first generation begins with or later reintroduces the immediately preceding assistant response frame/categories
→ current requested content may still appear
→ same-input reroll can clear the replay
```

Current evidence posture:

```text
independent natural specimens >= 3
symptom confidence = HIGH
same-input reroll clearance = OBSERVED
local SimCore representation/mirror state can remain healthy
```

Representative evidence is preserved in:

- `docs/SIMCORE_PARTIAL_PREVIOUS_TURN_REPLAY_RECURRENCE_2026-08-27.md`
- `docs/SIMCORE_06411_PARTIAL_PREVIOUS_TURN_REPLAY_REROLL_CONTROL_AND_POST_06500_DISPOSITION_2026-08-28.md`
- `docs/SIMCORE_POST_M2_6_ARCHITECTURE_FREEZE_OBSERVATION_REVIEW_2026-08-30.md`

## 3. Deterministic SimCore history mutation is not supported

The strongest paired control used the same user turn under the same runtime generation and reported:

```text
same user turn/index
same request recurrence hash
repeat-send read hit
History mutation: NONE
cache topology: 100% stable
runtime identities: SAME
SimCore contribution: NO_BREAK
→ rerolled generation no longer replayed the prior response frame
```

This excludes a large class of deterministic explanations.

The current exact v0.69.1 runtime further confirms that the old history-materialization repair experiments are not active generation behavior:

```text
History stabilization = OBSERVE_ONLY
source = REQUEST_SIGNATURE_OBSERVER
applied = 0
```

The observer scans the already-built request for the frozen compact-assistant signature and does not rewrite request history.

Current runtime contract also freezes:

```text
request order = FROZEN
runtime prompt placement = TAIL_AFTER_CURRENT_USER
provider cache = UNVERIFIED
```

Therefore this investigation does not support blaming an active SimCore request-history mutation, cache-topology repair, persistent-state rewrite, or prompt relocation for the recurrent symptom.

## 4. Exact Prompt contract audit

The exact v0.69.1 Prompt owner uses:

```text
PROMPT_COMPILER_VERSION = 3
```

The stable contract already contains narrow anti-replay/current-authority rules:

```text
period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline

do_not_replay_completed_prior_period_transition_as_current_period_transition=1

current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions
```

These rules prove that Prompt already owns one form of previous-turn/current-turn authority separation.

However, the protected scope is narrower than the recurrent symptom.

The current contract explicitly guards:

```text
completed prior PERIOD TRANSITION
vs
current period transition
```

and explicit current-event fact conflicts.

It does **not** state the more general task boundary required by the recurrent specimens:

```text
current user request defines the task to execute now
prior assistant output remains continuity/reference context
completed prior response frame / section taxonomy / task must not become the current task merely because it is adjacent in history
```

This distinction exactly matches the preserved specimens, which are often not period-transition failures and not simple fact conflicts. They are response-frame/task carryover failures.

## 5. Narrowest supported attribution

The evidence supports two different claims at different confidence levels.

### Underlying generation mechanism

```text
model/provider generation mechanism = UNPROVEN
provider context-selection mechanism = UNPROVEN
deterministic reproduction = NOT ESTABLISHED
```

Same-input reroll variability is compatible with generation/result variability, but SimCore cannot claim a specific provider/model internal cause.

### SimCore-controllable contract surface

```text
owner = Prompt
existing anti-replay authority = PRESENT but period-specific
missing general current-task primacy rule = PROVEN
```

This is enough to design a bounded mitigation without pretending to have diagnosed provider internals.

The repair target is therefore **not** “fix the model.”

The repair target is:

```text
extend the already-existing Prompt authority contract
from period-transition anti-replay
into general current-task primacy / completed-prior-frame non-replay
```

## 6. Why other owners are rejected

### History stabilization

Rejected as repair owner.

It is currently diagnostic `OBSERVE_ONLY`, and paired evidence already shows `History mutation NONE` while the symptom can clear on reroll.

### Representation / Edit Reconcile / Runtime Mirror

Rejected.

Natural replay specimens can show healthy binding/output/mirror/representation. These owners determine identity, compatibility and state safety, not generation task selection.

### Recurrence / Lineage / Handoff

Rejected as primary repair owners.

They track request-template recurrence and source-chain/short-C handoff state. Existing evidence explicitly warns that recurrence matches do not prove previous-response semantic injection.

### Structure

Rejected.

Structure remains judge-only for deterministic envelope/COMMUNITY/Knowledge/state-commit safety. Semantic task relevance is not a deterministic structural validation contract and must not be converted into a broad output censor.

### Provider cache / PRE_SIMCORE topology

Rejected.

Provider cache remains `UNVERIFIED`, and multiple specimens point to no proven SimCore first-break ownership.

## 7. Root-owner classification

```text
PARTIAL_PREVIOUS_TURN_REPLAY
symptom recurrence = CONFIRMED / HIGH

DETERMINISTIC_SIMCORE_HISTORY_MUTATION
= NOT SUPPORTED

UNDERLYING_MODEL_PROVIDER_CAUSE
= UNPROVEN

SIMCORE_CONTROLLABLE_GAP
= PROMPT CURRENT-TASK AUTHORITY SCOPE
= PROVEN

REPAIR TYPE
= NARROW PROMPT CONTRACT GENERALIZATION
= QUALITY / SEMANTIC GUARD MINI

M2 ARCHITECTURE CHANGE
= NONE
```

Name for the controllable gap:

```text
PARTIAL_PREVIOUS_TURN_REPLAY_PROMPT_SCOPE_GAP
```

## 8. Repair requirements derived from the evidence

A valid repair must:

1. keep current input as primary generation-task authority;
2. preserve prior assistant output as continuity/reference context rather than deleting or rewriting history;
3. forbid replay of a completed prior response frame/task when the new request does not ask for it;
4. explicitly allow continuation, recap, comparison or reuse when the current request asks for those behaviors;
5. retain the existing period-specific anti-replay rule as a stronger special case;
6. keep `TAIL_AFTER_CURRENT_USER` placement unchanged;
7. keep History stabilization `OBSERVE_ONLY`;
8. add no request-history mutation;
9. add no persistent state/schema/key;
10. add no provider-cache claim, network call, timer, polling or host routing change;
11. preserve B continuation, C/COMMUNITY continuity, Lineage/Handoff and all M2 owners.

## 9. Version selection consequence

The post-M2 freeze review reserved `v0.70.x` until one quality/performance lane acquired a source-proven owner and bounded repair contract.

This investigation satisfies that threshold for the Prompt contract gap.

Therefore the selected next design target may be:

```text
v0.70.0
Current Task Primacy Guard
QUALITY / PROMPT CONTRACT MINI
checkpoint remains M2-6
```

Implementation remains a separate authorization decision.

## 10. Verdict

```text
V07000_SOURCE_PROVEN_OWNER
= PROMPT

V07000_CONTROLLABLE_GAP
= GENERAL CURRENT-TASK PRIMACY MISSING BEYOND EXISTING PERIOD-SPECIFIC ANTI-REPLAY RULE

UNDERLYING_PROVIDER_ROOT_CAUSE
= UNPROVEN / NO CLAIM

V07000_DESIGNABLE
= YES

V07000_IMPLEMENTATION_AUTHORIZED
= NO

RELEASE_SIMCORE_MUTATION
= NONE
```
