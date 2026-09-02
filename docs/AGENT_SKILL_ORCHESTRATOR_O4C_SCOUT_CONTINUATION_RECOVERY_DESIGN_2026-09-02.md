# Agent Skill Orchestrator O4-C Scout Continuation Recovery Design — 2026-09-02

## Status

Design-before-code recovery record for the partial O4-C Scout service-tier retrospective benchmark execution.

The benchmark baseline remains commit `79a034d0fd589d13e536f7d54291773287d7b06e`. The original benchmark implementation, frozen case/evidence, prompt construction, generation policy, llama.cpp runtime pin, model registry, production Scout binding, and production runtime budget binding are not changed by this recovery.

## Observed partial execution

Original workflow run: `33643580938`.

The run executed exactly one local Qwen cell and then failed closed because the Qwen output was parseable JSON but did not satisfy the Scout compact-wire contract. The observed Qwen result is evidence, not a harness error and not a reason to rerun Qwen.

Frozen source evidence:

- source artifact id: `9852191711`
- source artifact ZIP SHA256: `ecc57672bd1b092956a7b181cc1f9887231f3ec9a8b346aea659a8e284b0d9e0`
- Qwen result SHA256: `eb7e87bad1dbccc899e18672a9fea528b52b920cf4a82bc4db637014b07fbc08`
- Qwen score SHA256: `7741d4f44ca59079c56590f6aa0e0ff039688862928f998b2f8a6e1efc1966ad`
- historical Qwen local model calls: `1`
- historical hosted AI calls: `0`
- Ministral calls in the original run: `0`

## Recovery objective

Complete the missing `ministral-3-3b-instruct-2512-q4_k_m` cell exactly once without executing Qwen again, then aggregate the immutable Qwen observation and the new Ministral observation with the original deterministic O4-C aggregator.

This is a continuation, not a rerun.

## Required invariants

1. The continuation workflow is manual-only and has no push, pull-request, schedule, or workflow-call trigger.
2. It is one-shot: only workflow run number `1`, attempt `1` may reach model execution.
3. It checks out exact benchmark target `79a034d0fd589d13e536f7d54291773287d7b06e` before any benchmark code executes, even though the continuation workflow itself is introduced by a later commit.
4. The original source artifact ZIP must match the frozen ZIP SHA256 before extraction.
5. The recovered Qwen cell must pass original result/score validation and deterministic score recomputation, preserve the frozen model/result/score/prompt identities, report `model_call_count=1`, `hosted_ai_call_count=0`, and preserve the observed `INVALID` status.
6. Qwen is copied as immutable evidence; no Qwen model download, server launch, or model call occurs in the continuation execution step.
7. Only the missing Ministral profile is downloaded and executed. A benchmark-level `INVALID` or `EXECUTION_INCOMPLETE` observation is preserved as data; a runner/harness failure remains fail-closed.
8. The pinned llama.cpp artifact and binary identity must match the source run runtime evidence.
9. Aggregation uses `run_o4c_scout_matrix.py` from the exact original benchmark target, not a recovery-specific scoring implementation.
10. Total accounting after successful continuation is historical Qwen local calls `1` + new Ministral local calls `1` = total local calls `2`; hosted AI calls remain `0`.
11. No winner, ranking, recommendation, assignment, or tie-break semantics are introduced.
12. Production Scout and runtime budget bindings remain unchanged.

## Implementation surface

- add `.github/workflows/agent-skill-orchestrator-o4c-scout-continuation.yml`
- add static/regression coverage under `tools/agent-skill-orchestrator/tests/`
- add the continuation workflow to Agent Skills CI path coverage
- do not modify benchmark core Python or frozen benchmark inputs

## Validation and execution sequence

1. Agent Skills CI on the exact PR head.
2. SimCore CI Verify + Required on the exact PR head.
3. SHA-locked merge.
4. Agent Skills CI + SimCore CI on merged main.
5. Confirm continuation workflow has zero prior dispatch runs.
6. Dispatch continuation once from merged main.
7. Inspect logs and bounded artifact; never blind-rerun a failed continuation.
8. Independently recompute source/recovery/result/score/summary identities.
9. Record the observed continuation result and accounting back to the repository issue/design trail.
