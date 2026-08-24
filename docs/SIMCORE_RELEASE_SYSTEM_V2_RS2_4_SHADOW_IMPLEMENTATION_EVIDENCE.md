# SimCore Release System v2 — RS2-4 Shadow Implementation Evidence

Date: 2026-08-24
Status: **IN PROGRESS · SHADOW_ONLY · NON-RUNTIME**
Sequencing authority: `docs/SIMCORE_RS2_3_P4_DEFER_RS2_4_SHADOW_ENTRY_PROPOSAL.md`
Frozen design: RS2-4A / RS2-4B / RS2-4C

## Entry state

```text
RS2-1 durable tests              CLOSED
RS2-2 state synchronization      CLOSED
RS2-3 permanent CI               PROMOTION_READY
requiredCiActive                 false
requiredCiEnforcementVerified    false
RS2_3_CLOSED                     false
RS2_4_ENTRY_AUTHORIZED           false
release authority                SHADOW_ONLY
release-simcore mutation         FORBIDDEN
runtime work-item mutation       NONE
```

Implementation branch started from latest observed `main`:

```text
aa7d572fc1f008c2e5a9076fa5d6154e99ce7aba
```

Current deployed authority remains `release-simcore` and is not modified by this work item.

## PFFL START PRECHECK

Controls carried into implementation:

```text
workflow/template transcription errors → split implementation and syntax/static proof before PR
negative fixture over-destruction       → prefer semantic identity mutations over loader destruction
stale main / concurrent writers         → fresh-main integration before exact-head merge
```

## Implementation finding 1

While constructing the candidate materializer before PR creation, the initial local helper shape attempted to pass the canonical commit message to `git commit-tree` without a corresponding stdin/input option in the helper wrapper.

Classification:

```text
RS2_4_MATERIALIZER_COMMIT_TREE_INPUT_PLUMBING
= FIX / TOOLING / DIRECT_EVIDENCE / PRE_PR / NON_RUNTIME
```

Scope:

```text
working branch only
candidate refs not created
main not mutated
release-simcore not mutated
runtime not mutated
```

Disposition:

```text
record first
extend helper wrapper with bounded stdin input
cover in release self-test before PR
```

## Implementation finding 2

The first permanent CI execution for implementation PR `#207` reached the proposed permanent verifier and failed only `GATE_RELEASE_INFRA`.

Evidence:

```text
workflow run   32722939935
Verify job     97418021946
GATE_CI_SELF   PASS
GATE_STATIC    PASS
GATE_ARCH      PASS
GATE_REGRESSION PASS
GATE_STATE     PASS
GATE_RELEASE_INFRA FAIL
reasonCode     RELEASE_INFRA_SELF_TEST_FAIL
```

The release self-test wrote temporary `resolved.json` / `receipt.json` files inside its synthetic Git worktree. A later negative test committed those scratch files as part of an intentional production-moved fixture; a subsequent finalize call modified them, so the next checkout correctly refused to overwrite local changes.

Classification:

```text
RS2_4_SELF_TEST_WORKTREE_SCRATCH_CONTAMINATION
= FIX / HARNESS / DIRECT_EVIDENCE / PR_207 / NON_RUNTIME
```

Scope:

```text
synthetic temporary Git repository only
permanent CI correctly rejected the implementation PR
main not mutated by this failure
release-simcore not mutated
runtime not mutated
```

Disposition:

```text
move controller receipt/transaction scratch files outside the synthetic repository
retain semantic negative fixtures unchanged
rerun the same permanent release-infra gate
```
