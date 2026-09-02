# Agent Skill Orchestrator O4-C Scout Service-Tier Retrospective Benchmark Design — 2026-09-02

Date: 2026-09-02 KST

Status: **DESIGN FROZEN · RETROSPECTIVE ONLY · SCOUT ONLY · TWO MODEL CELLS · ZERO HOSTED AI · NO WINNER · NO ROLE ASSIGNMENT**

Tracking authority: issue #1120, O4-C acceptance freeze comment `5510435515`.

Baseline at freeze: `main=57606d6cc4fad8d6eb247e84de81b9d0a2712e79`.

## 1. Purpose

O4-C executes the first real role-isolated multi-family benchmark slice on top of the already-merged O4-A deterministic benchmark foundation and O4-B Ministral family admission.

This slice answers only whether the two admitted 3B local model profiles can execute the same frozen Scout task and what the pre-frozen Scout metrics/telemetry say. It does not select a family winner, alter role assignment, modify the O2/O3 runtime, change a plugin, or produce prospective evidence.

## 2. Source case provenance

Source case: `service-tier-fidelity`.

Source-case classification for O4: `RETROSPECTIVE_COMPATIBILITY`.

The case is eligible because its output has already been consumed by prior local zero-credit A/B work and recorded as diagnostic/qualitative evidence. O4-C does not claim the old case is unseen or prospective.

Frozen provenance artifact:

- workflow run: `33475188093`;
- artifact id: `9788031532`;
- artifact name: `agent-skill-zero-credit-eval-33475188093-1`;
- artifact digest: `sha256:e418b481ecac4f05302b352ec4f87013acbd7eb9f85d47c9351cb74962182b50`;
- historical target main: `f5dd31c0c5a0f0fc7f293d768ed402c304b1704f`;
- historical `release-usage-dashboard` commit observed in the artifact: `82c4f900cf548068d1eada957c982a5d78f1347b`.

O4-C fixture preparation may inspect those frozen bytes because the case is retrospective. Expected labels, source selection, distractor choice, atomization rules, generation parameters, and model cells must all be committed before O4-C model output is observed.

## 3. First slice matrix

Exactly two independent cells:

```text
scout × qwen2.5-3b-instruct-q4_k_m × service-tier-fidelity
scout × ministral-3-3b-instruct-2512-q4_k_m × service-tier-fidelity
```

The 1.5B Qwen profile is not part of this first slice. O4 may add other retrospective cells later under separate frozen slices.

Both cells use the same:

- benchmark case JSON bytes;
- EvidencePackage JSON bytes;
- Scout compact-wire contract `scout-compact-wire-v3`;
- generated Scout prompt bytes;
- llama.cpp runtime release;
- CPU/generation parameters;
- deterministic result adapter and scorer.

## 4. EvidencePackage preparation

The fixture contains only bounded source blocks frozen from the historical source snapshots.

The old zero-credit context's repository catalog and plugin-control-plane registry blocks are not copied into the O1 EvidencePackage because those paths are outside the registered Usage Dashboard domain evidence boundary.

Semantic relevant blocks are frozen from the consumed artifact for:

- Engine request provenance capture;
- Engine normalized source row;
- production product manifest;
- Plugin service-tier normalization/render helper;
- request ledger enrichment/identity surface;
- diagnostics rendering;
- P50 selection-source fidelity regression.

One same-snapshot Usage Dashboard domain-primary distractor block is allowed and frozen before inference so source-selection precision is observable rather than structurally guaranteed.

Sources are canonical-sorted by path/range/digest. Source ids and compact refs are derived only after that sorting.

No current repository source is substituted for the historical source bytes after fixture freeze.

## 5. Scout expected-label contract

The O4-A Scout expected-label kinds remain unchanged:

- `source_ref`;
- `authority`.

Expected labels identify only the relevant source refs and supplied authority classes. The distractor is a known source ref but is intentionally not an expected relevant-source label.

No natural-language assertion is executed as benchmark truth. Only committed typed label atoms are scored.

## 6. Compact-wire atomization

Production Scout compact wire is not modified.

The benchmark adapter deterministically projects one validated Scout wire into O4-A predicted atoms before scoring:

1. every unique ref appearing in `k=s` records becomes exactly one `{"kind":"source_ref","ref":...}` atom;
2. every unique `(authority_class, ref)` pair appearing in validated `k=a` records becomes exactly one single-ref `authority` atom;
3. duplicates collapse by canonical tuple identity;
4. resulting atoms sort deterministically;
5. no semantic text normalization beyond the already-frozen O4-A NFC+trim matching policy is added;
6. invalid Scout wire never receives semantic score.

This decomposition avoids making Scout's arbitrary compact-wire batching of up to three refs per record part of benchmark quality.

## 7. Runtime and model identity

Runtime is the already-attested local runtime:

- llama.cpp release: `b10516`;
- source digest: `b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9`;
- artifact: `llama-b10516-bin-ubuntu-x64.tar.gz`;
- artifact SHA256: `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`;
- CPU threads: `4`;
- GPU layers: `0`;
- temperature: `0`;
- seed: `42`.

The benchmark runner loads exact model identity from `models/registry.json` and additionally requires the selected profile to be one of the two O4-C frozen ids.

The workflow verifies exact model SHA256 before starting `llama-server`.

## 8. Cell execution

Each cell performs exactly one OpenAI-compatible local chat-completions request to a loopback `llama-server`.

The request uses the existing `build_scout_prompt()` and `scout_response_schema()` contract. No hidden benchmark answer or expected label is included in the prompt.

A cell is `COMPLETED` only when:

- model download checksum matches;
- server starts successfully;
- HTTP response succeeds;
- finish reason is `stop`;
- assistant content is non-empty;
- compact Scout wire parses and validates against the frozen EvidencePackage.

Invalid or incomplete cells are retained in benchmark reliability evidence and are never rewritten as successful semantic rows.

## 9. Result adapter and scoring

The benchmark adapter writes a `role-benchmark-result-v1` result containing:

- exact fixture/policy identity;
- exact model identity;
- exact runtime identity;
- execution/parse/contract status;
- one local call and zero hosted-AI calls;
- prompt/response/receipt/artifact digests;
- deterministic predicted atoms;
- wall-clock telemetry;
- token telemetry when llama.cpp provides it;
- server CPU/RSS telemetry only when directly measured, otherwise JSON null.

O4-A `score_role_output()` produces the deterministic Scout score vector. No composite or weighted score is added.

The two scores may be aggregated using the existing O4-A aggregator only as a capability table. The aggregate must not contain `winner`, `recommended_model`, assignment, rank, or tie-break semantics.

## 10. Workflow boundary

The dedicated O4-C benchmark workflow is not part of ordinary PR CI model execution.

Allowed triggers:

- manual `workflow_dispatch` on an exact merged commit; and/or
- a narrowly namespaced benchmark request branch/file contract that resolves an exact target commit before inference.

The workflow must:

- use `contents: read` only;
- expose no repository secrets to model download/inference steps;
- reject `HF_TOKEN`, `HUGGING_FACE_HUB_TOKEN`, and equivalent model credentials when present;
- call no OpenAI/Copilot/hosted model endpoint;
- record `hosted_ai_call_count=0`;
- execute exactly the two frozen cells;
- upload bounded results/scores/raw envelopes/logs needed for independent read-back.

## 11. Implementation files

Expected additive implementation surface:

```text
tools/agent-skill-orchestrator/
  benchmarks/
    fixtures/o4c-scout-service-tier-fidelity-v1.case.json
    evidence/o4c-scout-service-tier-fidelity-v1.evidence.json
    run_scout_cell.py
    run_o4c_scout_matrix.py
  tests/
    test_o4c_scout_service_tier_benchmark.py
.github/workflows/
  agent-skill-orchestrator-o4c-scout-benchmark.yml
```

Names may be narrowed during implementation, but O2/O3 production runtime modules and role assignment surfaces must remain unchanged.

## 12. Focused regressions

Tests must prove before inference:

- fixture is retrospective and exact;
- evidence digest equals case `evidence_sha256`;
- known source refs equal the EvidencePackage refs;
- historical snapshot identities are exact;
- exactly one distractor is known but not expected as relevant;
- Scout atomization is deterministic and batching-independent;
- duplicate selections collapse;
- wrong/unknown refs fail through the production Scout validator;
- the matrix is exactly two model ids;
- both model ids are enabled, checksum-pinned, public unauthenticated profiles;
- `standard-cpu-v1` and `SCOUT_MODEL_PROFILE_ID` remain Qwen2.5 3B;
- ordinary Agent Skills CI never executes the benchmark model workflow;
- workflow contains zero hosted-AI/model-secret use;
- benchmark output schemas reject winner/assignment fields.

Full Agent Skills CI and SimCore required CI remain mandatory on the exact head.

## 13. Evidence handling

After merge, the two-cell benchmark artifact is independently downloaded and checked for:

- artifact archive digest;
- exact fixture/evidence bytes/digests;
- exact model and runtime identities;
- prompt equality across model cells;
- one local call per cell;
- zero hosted-AI calls;
- finish/parse/contract status;
- result digest recomputation;
- score digest recomputation;
- aggregate digest recomputation when produced.

Measured values are reported exactly. Missing CPU/RSS/token telemetry remains null rather than guessed or converted to zero.

## 14. Exit

This O4-C first slice passes only after:

1. design precedes implementation;
2. fixture/evidence/runner/workflow focused tests pass;
3. exact branch head passes Agent Skills CI and SimCore required CI;
4. exact tested head merges;
5. merged-main Agent Skills/SimCore regression passes;
6. main read-back shows no O2/O3 role rebind or product/plugin/release mutation;
7. the merged frozen two-cell benchmark executes exactly once as evidence;
8. artifact/results are independently read back and recorded in #1120;
9. only a raw capability table is stated.

A successful first slice authorizes the next O4 retrospective slice. It does not authorize O5 assignment.