# Agent Skill Orchestrator O3-D Live Parallel Retrospective Design — 2026-09-02

Date: 2026-09-02 KST

Status: **DESIGN FROZEN · LIVE RETROSPECTIVE ONLY · EXACT O2 EVIDENCE REPLAY · SCOUT-FIRST · MAPPER/CRITIC-V2 TRUE SIBLINGS · TWO LLAMA SERVER SLOTS · SYNTH GATED · ZERO HOSTED AI · O2 ROLLBACK UNCHANGED**

Tracking authority: issue #1120, acceptance freeze comment `5508665786`.

## 1. Goal

O3-D is the first bounded live execution of the O3 topology:

```text
Scout
  ├─> Mapper ─┐
  └─> Critic ─┼─> Synthesizer
              ┘
```

The purpose is not to redesign the product, alter Local Usage Dashboard, promote a validated scope, or replace O2. The purpose is to determine whether the already-designed O3 parallel control plane produces a mechanically grounded result while demonstrating real sibling overlap and measurable wall-clock benefit.

## 2. Frozen O2 comparison inputs

The live run must reuse the exact O2-D retrospective authority inputs:

- O2 harness SHA: `83ea895ca20137587731aca7ba39b184d6561a4a`
- evidence repository SHA: `7bd212b496111a628d249946d3a98b8c55d001ae`
- release repository SHA: `82c4f900cf548068d1eada957c982a5d78f1347b`
- expected evidence package SHA256: `88f85dd31748e80184152605b6be1b1e8faf49d30e7f6349c603bef23d8b7730`

The current role registry, domain registry, and router are byte-identical to the O2 harness versions. Therefore O3-D must build the same bounded task request, execution plan, authority snapshot, and evidence package bytes by reusing the existing O2 deterministic control-input builder. The O3 runtime topology is represented separately in O3 root provenance rather than by mutating the O2 evidence plan.

This preserves apples-to-apples grounding comparison.

## 3. Frozen runtime/model identity

O3-D keeps the O2 local model/runtime identity:

- llama.cpp release: `b10516`
- pinned llama.cpp tag commit: `b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9`
- runtime artifact: `llama-b10516-bin-ubuntu-x64.tar.gz`
- runtime artifact SHA256: `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`
- model repository: `Qwen/Qwen2.5-3B-Instruct-GGUF`
- model revision: `af75b7aaf5bb163ce4c5dab4e6b84d844e96265d`
- model file: `qwen2.5-3b-instruct-q4_k_m.gguf`
- model SHA256: `626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d`
- runtime budget profile: `standard-cpu-v1`
- maximum concurrent model workers: `2`
- maximum total role calls: `4`
- maximum hosted-AI calls: `0`

Pinned llama.cpp `b10516` defines server `-np/--parallel N` as the number of server slots. O3-D starts the server with exactly `--parallel 2`.

The existing O2 `runtime.llama_cpp.start_server()` remains unchanged. O3-D owns a separate bounded two-slot launch helper inside the new live runner so O2 remains a byte-stable rollback baseline.

## 4. Role semantics

### 4.1 Scout

Scout runs first with the exact O2 evidence package. It must complete and produce a validated Scout RoleArtifact before either sibling is launched.

### 4.2 Mapper

Mapper uses the existing Mapper v1 prompt/wire/artifact/receipt path and binds exactly the Scout RoleArtifact.

### 4.3 Critic v2

Critic uses the O3-B parallel Critic contract and binds exactly the same Scout RoleArtifact as Mapper.

The existing semantic-role execution receipt builder cannot be reused for Critic v2 because its v1 Critic topology explicitly requires Mapper upstream. O3-D therefore adds a narrow parallel-Critic receipt builder that:

- uses the existing `semantic-role-execution-receipt-v2.schema.json`,
- binds Scout as the sole upstream digest,
- delegates RoleArtifact construction to `parallel_critic_artifact.py`,
- preserves the same frozen model/runtime/generation identity,
- records exactly one local model call and zero hosted calls,
- never changes the v1 Critic receipt path.

### 4.4 Synthesizer

Synthesizer runs only if both Mapper and Critic v2 complete with RoleArtifacts.

It consumes canonical upstream RoleArtifacts in this order:

1. Scout
2. Mapper
3. Critic

The existing Synthesizer validates each artifact by role/schema/evidence and does not require the Critic artifact itself to have Mapper as its internal upstream, so the O3-B Critic artifact is compatible without changing Synthesizer contracts.

## 5. True sibling concurrency

The live runner uses `ThreadPoolExecutor(max_workers=2)` only for Mapper and Critic.

For each sibling, the runner records monotonic nanosecond timestamps immediately around the blocking HTTP model call and converts them to integer milliseconds:

- `start_monotonic_ns`
- `end_monotonic_ns`
- `wall_clock_ms`

The persisted comparison summary derives:

```text
overlap_ms = max(0, min(mapper_end, critic_end) - max(mapper_start, critic_start))
serial_sibling_ms = mapper_wall_ms + critic_wall_ms
parallel_sibling_ms = max(mapper_end, critic_end) - min(mapper_start, critic_start)
benefit_ratio = 1 - parallel_sibling_ms / serial_sibling_ms
```

Acceptance requires:

- `overlap_ms >= 1000`
- `parallel_sibling_ms * 10 <= serial_sibling_ms * 9`

The integer inequality avoids floating-point threshold ambiguity.

The runner does not claim server-side concurrency solely from thread creation. The server itself is launched with exactly two slots, and both client calls must have overlapping monotonic request windows.

## 6. Retry policy

The first O3-D live acceptance run has no retry.

Every invoked role has exactly one attempt. A model/runtime exception or non-completed/invalid result makes the run non-qualifying. Remaining dependency-gated stages are persisted as blocked where applicable.

This prevents a retry from hiding the first live parallel behavior or exceeding the frozen four-call O3 budget.

## 7. Telemetry policy

O3-C distinguishes wall clock, worker CPU, and RSS telemetry.

O3-D measures wall-clock time only. CPU and peak-RSS are not inferred from process-wide Python values because those values cannot be reliably attributed to one concurrent model request. They remain `null`.

Per-attempt O3-C telemetry:

```json
{
  "wall_clock_ms": 123,
  "cpu_ms": null,
  "peak_rss_bytes": null
}
```

Root telemetry records measured total live-run wall time and keeps CPU/RSS unknown as `null`.

Unknown values are never converted to zero.

## 8. O3-C root provenance binding

After role execution, the live runner constructs four scheduler job records in O3-C form and calls `build_parallel_root_provenance()`.

Every invoked completed/non-completed role includes:

- role
- terminal state
- exact evidence SHA
- canonical upstream artifact SHA list
- one attempt
- receipt SHA
- RoleArtifact SHA or `NONE`
- one local model call
- zero hosted calls
- measured wall-clock telemetry

A dependency-blocked role uses `blocked_dependency_job()` and therefore fabricates no attempt, digest, or telemetry.

The live output persists:

- `parallel-root-provenance.json`
- `parallel-root-provenance-sha256.txt`

The root must validate through deterministic O3-C recomputation.

## 9. Grounding metric

O2 baseline: `14/14 = 100%` ref-bearing RoleArtifact records used non-empty refs present in the evidence package.

O3-D computes grounding mechanically from completed RoleArtifacts only.

For every record family in every completed RoleArtifact, any record containing a `refs` field contributes one ref-bearing record. Such a record passes only if:

- `refs` is non-empty, and
- every ref belongs to `evidence_source_refs(evidence_package)`.

Persist:

```json
{
  "ref_bearing_record_count": N,
  "grounded_ref_bearing_record_count": N,
  "grounding_ratio_basis_points": 10000
}
```

Acceptance requires at least one ref-bearing record and exactly `10000` basis points.

No semantic quality score is invented.

## 10. Output layout

Bounded artifact root:

```text
.agent-skill-orchestrator-parallel-pilot/
  request.json
  task-request.json
  execution-plan.json
  authority-snapshot.json
  evidence-package.json
  llama-runtime-version.txt
  llama-server.log
  summary.json
  concurrency-summary.json
  grounding-summary.json
  parallel-root-provenance.json
  parallel-root-provenance-sha256.txt
  pilot-exit-code.txt
  roles/
    scout/...
    mapper/...
    critic/...
    synthesizer/...
```

Role persistence mirrors the O2 bounded prompt/response/receipt/artifact evidence layout where possible.

## 11. Live request contract

A new request resolver accepts exactly:

- `schema_version`
- `mode = o3d_parallel_retrospective_live`
- `harness_repository_sha`
- `evidence_repository_sha`
- `release_repository_sha`

Evidence and release SHAs are frozen to the O2 values above.

The workflow is triggered only by a one-file request commit on:

```text
agent-skill-orchestrator-parallel-pilot-request/**
```

with request path:

```text
.agent-skill-orchestrator-parallel-pilot-requests/*.json
```

The request commit parent must equal `harness_repository_sha`, exactly matching the O2 request provenance pattern.

## 12. Workflow gating

The O3-D workflow downloads and SHA-verifies the same pinned runtime and model as O2-D, prepares the frozen evidence worktree and exact release branch identity, then runs the live runner.

The final mechanical workflow gate requires all of the following:

- process exit code `0`
- exact evidence SHA256 `88f85dd31748e80184152605b6be1b1e8faf49d30e7f6349c603bef23d8b7730`
- overall execution status `COMPLETED`
- canonical role order `[scout, mapper, critic, synthesizer]`
- exact four local model calls
- zero hosted-AI calls
- each role completed with `finish_reason=stop`
- Mapper upstream = `[Scout SHA]`
- Critic upstream = `[Scout SHA]`
- Synth upstream = `[Scout SHA, Mapper SHA, Critic SHA]`
- server parallel slots = `2`
- overlap at least `1000 ms`
- sibling stage at least `10%` faster than the same two measured calls serialized
- grounding ratio exactly `10000` basis points
- O3 root provenance validates and its persisted SHA matches recomputation

## 13. Test plan

Unit/contract tests must cover:

1. parallel Critic receipt binds Scout directly and reproduces its SHA.
2. parallel Critic invalid wire yields `INVALID` and no RoleArtifact.
3. request resolver rejects unknown keys, wrong mode, unfrozen evidence SHA, unfrozen release SHA, and malformed commit SHA.
4. concurrency metric accepts genuine overlap/benefit and rejects non-overlap or <10% benefit.
5. grounding metric rejects empty/unknown refs and preserves exact 10000-bps calculation.
6. O3-C job conversion preserves one attempt, exact upstream, receipt/artifact digests, wall-clock telemetry, and null CPU/RSS.
7. server command adds exactly `--parallel 2` without modifying the O2 helper.
8. live runner dependency gate blocks Synth if either sibling is not completed.

Agent Skills CI remains the implementation regression authority. SimCore CI remains an independent repository-wide required gate.

## 14. Non-goals

O3-D does not:

- change `plugins/usage-dashboard/**`,
- change `release-usage-dashboard`,
- deploy a plugin version,
- perform Android/PocketRisu device truth,
- mutate a product or repository during inference,
- call hosted AI,
- alter O1/O2 contracts,
- alter O2 sequential workflow/runner,
- alter router scope promotion,
- change model identity or generation defaults,
- generalize parallelism beyond two sibling workers.

## 15. Rollback

Rollback is the existing successful O2-D sequential scheduler and workflow with unchanged contracts.

O3-D cannot remove or rewrite that baseline. If O3-D fails live acceptance, record diagnosis only and leave O2 as the operationally proven path.

## 16. Exit

O3-D exits only after:

1. implementation PR CI passes,
2. exact tested head merges,
3. merged-main Agent Skills and SimCore regression passes,
4. main read-back confirms the live harness/workflow,
5. one bounded live O3-D request is executed from merged main,
6. uploaded evidence is independently inspected,
7. exact-evidence, topology, call accounting, root provenance, grounding, overlap, and >=10% sibling benefit all pass,
8. exit evidence is recorded on #1120.

Until all eight are true, O3 is not live-validated.
