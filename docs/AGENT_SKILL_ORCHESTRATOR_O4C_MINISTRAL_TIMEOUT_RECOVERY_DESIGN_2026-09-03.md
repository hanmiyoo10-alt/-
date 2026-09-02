# Agent Skill Orchestrator O4-C Ministral timeout recovery design — 2026-09-03

## Status

Design-before-code checkpoint for a bounded second Ministral attempt after O4-C continuation run `33646050315` timed out during prompt processing.

Issue evidence checkpoint: #1120 comment `5512052999`.

## Immutable benchmark identities

- original benchmark target: `79a034d0fd589d13e536f7d54291773287d7b06e`
- case: `o4c-scout-service-tier-fidelity-v1`
- EvidencePackage canonical SHA256: `06c345cde924c8dc8e84d1c65a03d9ee8b2a477ea856f5abd0603444485b4d97`
- fixture SHA256: `196905603a4c291dbce17744c20bf004c1e9a05c331e1bb7acdd38cca9fa3c6f`
- matrix canonical SHA256: `bb1e4121dd23803c5d280e24e17f327faf7521dfb38a1939e8163fc35a6935b1`
- prompt SHA256: `8973db5c8ebf8c54a6dff2aee38769efab2c76999821084cdb4f5d240833a876`
- runtime: llama.cpp `b10516`, artifact SHA256 `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`
- Qwen result SHA256: `eb7e87bad1dbccc899e18672a9fea528b52b920cf4a82bc4db637014b07fbc08`
- Qwen score SHA256: `7741d4f44ca59079c56590f6aa0e0ff039688862928f998b2f8a6e1efc1966ad`

No fixture, evidence, prompt, generation parameters, model identities, runtime identity, scorer, role contract, or production Scout binding may change in this recovery.

## Observed timeout evidence

Continuation run `33646050315` / artifact `9853588539` failed closed before aggregate.

- artifact ZIP SHA256: `39a2c1a867bc0a0381856c49b77c5289fae728ca52032d31b33f6d31576495d4`
- `runner-error.json` raw SHA256: `9e849307f362d00916876a7e2deafada87b668adabad2523c18de070bb2b309e`
- Ministral `llama-server.log` raw SHA256: `f5d356e28d640bec2b71984d299bb354789a5c67f019be1111d7b88bec6efb54`
- error: `timed out`
- server accepted the request and recorded prompt checkpoints at 2048/4096/6144/8192 tokens, with 8192 at progress 0.77.
- task cancellation occurred at about 602.6 seconds.
- frozen `runtime/local_server.py::post_chat_completion()` default request timeout is exactly 600 seconds.
- no Ministral `result.json` or `score.json` was produced, so this attempt carries no quality/contract score.

## Call accounting before recovery attempt #2

- historical Qwen local request count: 1
- Qwen recovery re-execution count: 0
- Ministral local request attempts: 1, timed out during prompt processing
- hosted AI call count: 0

The timed-out Ministral request remains permanent evidence and MUST NOT be erased from cumulative accounting.

## Recovery decision

Create a separate, manual-only, one-shot timeout-recovery lane. It performs exactly one additional Ministral request and never executes Qwen.

The only execution-bound change is a benchmark-only request timeout of **1800 seconds**. Rationale:

1. the first request reached 77% prompt progress before the 600-second client cutoff;
2. the model download already consumes roughly eight minutes on the observed runner;
3. a 30-minute request bound plus download/setup remains inside the 45-minute workflow ceiling while leaving bounded time for aggregation and artifact upload;
4. the production/local-server default remains 600 seconds and is not modified.

## Implementation boundary

Add only:

1. `tools/agent-skill-orchestrator/benchmarks/run_scout_cell_timeout_recovery.py`
   - imports the frozen O4-C Scout prompt/build/result/scoring contracts;
   - permits only `ministral-3-3b-instruct-2512-q4_k_m`;
   - calls the same loopback `post_chat_completion()` with a hard-locked `timeout_seconds=1800.0`;
   - writes the same result/score/receipt/response artifacts as the frozen cell runner;
   - does not alter production runtime defaults.
2. `.github/workflows/agent-skill-orchestrator-o4c-scout-timeout-recovery.yml`
   - manual-only; run number 1 / attempt 1 gate before any model request;
   - checks out the recovery harness SHA, then proves frozen benchmark-core paths are byte-identical to the original target except for the new recovery adapter/workflow/test surfaces;
   - downloads and verifies continuation artifact `9853588539` by ZIP digest;
   - preserves attempt #1 under immutable history inside the new artifact;
   - verifies Qwen identity without executing Qwen;
   - executes exactly one Ministral attempt #2 with the recovery adapter;
   - accepts COMPLETED or INVALID as observed model outcomes, but fails closed on runner errors;
   - aggregates Qwen plus the attempt-2 Ministral result using the existing O4-C aggregator;
   - emits a separate recovery summary with cumulative counts: Qwen=1, Ministral attempts=2, total local requests=3, hosted=0.
3. focused regression tests and Agent Skills CI path coverage.

## Acceptance gates

Before model execution:

- design record merged;
- focused + full Agent Skills CI GREEN;
- SimCore Required GREEN;
- exact-head merge;
- merged-main Agent Skills + SimCore Required GREEN;
- timeout-recovery workflow execution history = 0;
- production Scout/budget bindings unchanged.

After model execution:

- timeout-recovery run number exactly 1, attempt exactly 1;
- Qwen was not executed;
- exactly one new Ministral request was made;
- hosted AI calls = 0;
- original timeout artifact identity revalidates;
- final result/score/receipt/summary digests independently recompute;
- any INVALID/EXECUTION_INCOMPLETE outcome is retained as evidence, not retried;
- no winner/recommendation/assignment semantics are introduced.

## Non-goals

- no production Scout rebind;
- no O2/O3 change;
- no fixture or prompt shortening;
- no generation tuning;
- no model replacement;
- no synthetic score for the timed-out first Ministral attempt;
- no hidden retry or rerun.