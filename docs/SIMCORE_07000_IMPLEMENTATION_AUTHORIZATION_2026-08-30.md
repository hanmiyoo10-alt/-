# SimCore v0.70.0 Implementation Authorization

Date: 2026-08-30 KST

Status: **IMPLEMENTATION AUTHORIZED · DESIGN FROZEN · RUNTIME CHANGE ONLY**

Target: `v0.70.0 Current Task Primacy Guard`

Design authority:

- `docs/SIMCORE_07000_CURRENT_TASK_PRIMACY_GUARD_REBASED_DESIGN_2026-08-30.md`
- `docs/SIMCORE_07000_PARTIAL_PREVIOUS_TURN_REPLAY_PROMPT_SCOPE_GAP_ROOT_CAUSE_2026-08-30.md`

Authorization source: explicit operator instruction on 2026-08-30 KST to proceed with the completed new-version design and update the plugin.

Exact parent production authority:

```text
release-simcore commit: 2f7e6a55f89adb7a9b33f7306a47ca06a8baf18f
version: 0.69.2
release name: MamsHolic Exact Brand Alias Repair
latest/install blob authority from rebased design: 8132fc447e237f7f7a08a27126191a47dc6eac6f
```

Authorized semantic delta is exactly:

```text
release identity 0.69.2 -> 0.70.0
PROMPT_COMPILER_VERSION 3 -> 4
current_input_task=primary_generation_authority
prior_assistant_output=continuity_reference_context_not_current_task_authority
do_not_replay_completed_prior_response_frame_or_task_unless_current_input_explicitly_requests_continuation_recap_comparison_or_reuse=1
required deterministic tests / release-ledger adjacency
```

Frozen boundaries:

```text
M2 checkpoint remains M2-6
no persistent schema/key change
no history mutation
no Prompt relocation
no new host/network/timer/provider behavior
no Recurrence/Lineage/Handoff ownership change
no Community classifier or alias semantic change
COMMUNITY_CLASSIFIER_VERSION remains 3
v0.69.2 MamsHolic exact alias behavior preserved
latest.js == install.js required
release-system R2.x work excluded
```

Implementation sequence authority:

1. build from exact `release-simcore` parent `2f7e6a55...`
2. apply only the authorized Prompt-contract and identity delta
3. verify static, architecture, regression, state, coordination and legacy compatibility gates
4. publish only through existing permanent SimCore release authority
5. independently verify production latest/install identity
6. run real long-chat Stages A/B/C/D and natural Community preservation control
7. classify every anomaly as WATCH / DEFER / FIX / BLOCKER
8. require explicit HUMAN_EVIDENCE LIVE_PASS before terminal main convergence

This authorization does not authorize M2-7, release-system redesign, storage/performance work, or any unrelated feature change.