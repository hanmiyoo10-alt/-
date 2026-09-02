# Agent Skill Orchestrator O3-A Runtime Budget Profile Design — 2026-09-02

## Status

FROZEN_BEFORE_IMPLEMENTATION

O2-D first retrospective sequential live run `33613545316` passed its frozen mechanical gate with exactly four local calls, zero hosted-AI calls, valid per-role receipts/RoleArtifacts, and exact typed provenance. The run remains a diagnostic O2 baseline; its generic semantic labels are not tuned in O3-A.

O3 roadmap entry additionally requires versioned budget profiles. Existing O1 synthetic budget profile names are stable but not explicitly versioned, and successful O1/O2 receipts must not be rewritten merely to satisfy O3 entry.

## Baseline

- branch base: `da57a9734d133e5ea7d1223cbfe1b1c7ff5b7f87`
- O2-D merge: `ce04e1e18ee30cc466f6be0b79a862a87e42aca1`
- O2-D live run: `33613545316`
- final O2-D Synthesizer RoleArtifact: `ebd4f2a93a26d77ec66d66c32b22767ce3e31c3eb5c6ee5d335efa7866a0e59e`
- O3-A acceptance freeze: #1120 comment `5507430855`

Current main advancement after O2-D is SimCore documentation only. Agent Skill orchestrator/runtime bytes are unchanged.

## Purpose

Add a small immutable runtime-budget profile surface that future O3 root provenance can name and hash before any parallel model execution.

This is not the O3 scheduler and does not change O2 behavior.

## Initial profile

Profile id: `standard-cpu-v1`.

It binds, rather than redefines, the already frozen O2 lane:

- model profile id: `qwen2.5-3b-instruct-q4_k_m`
- transport: `llama-server-v1-chat-completions`
- llama.cpp release: `b10516`
- generation temperature: `0`
- generation seed: `42`
- generation n_predict: `768`
- CPU threads: `4`
- GPU layers: `0`
- maximum total role calls: `4`
- maximum hosted-AI calls: `0`
- maximum concurrent model workers: `2`

The profile must match the live constants in `runtime/generation.py`; duplicated registry values are therefore validated as identity assertions and cannot silently drift.

## Contract

Add a closed registry schema with:

- registry `schema_version = 1`;
- non-empty unique `profile_id` values;
- explicitly versioned profile ids ending in `-vN`;
- exact model/runtime/generation identity fields;
- integer call/concurrency ceilings;
- no additional fields.

Loader behavior:

- validate the registry through the existing schema validator;
- reject duplicate profile ids;
- reject profile ids without explicit version suffix;
- reject unknown profile ids;
- reject nonzero hosted-AI allowance;
- reject concurrency below 1 or above 2;
- reject total role-call ceiling other than the frozen four-role O2/O3 lane;
- reject any mismatch with `SCOUT_MODEL_PROFILE_ID`, `TRANSPORT`, `LLAMA_RUNTIME`, or `GENERATION`;
- return a defensive copy;
- expose a canonical SHA256 digest for the selected profile.

## Compatibility boundary

Unchanged:

- O1 `budget.py`, including `deterministic-only`, `fast-cpu`, `standard-cpu`, and synthetic strict profile ids;
- O2-A/O2-D model, generation, runtime and sequential workflow;
- Scout/Mapper/Critic/Synthesizer compact contracts;
- receipt schemas v1/v2;
- plugin/product/runtime/release/device bytes;
- validated scopes.

No model download or model call occurs in O3-A.

## Tests

Required focused tests:

- `standard-cpu-v1` loads and its digest is reproducible;
- loaded profile exactly matches frozen generation/runtime constants;
- duplicate profile id rejected;
- unversioned id rejected;
- unknown id rejected;
- extra field rejected by schema;
- hosted-AI allowance > 0 rejected;
- concurrency > 2 rejected;
- generation/runtime/model identity drift rejected;
- O1 synthetic budget default profile remains `standard-cpu` and unchanged.

Full Agent Skills CI and SimCore Required must pass before exact-head merge.

## Exit

O3-A exits only when `standard-cpu-v1` is a closed, reproducibly hashed runtime budget identity on merged main while all O1/O2 behavior remains unchanged.

Only then may O3-B freeze and implement parallel Mapper/Critic scheduling/workflow semantics.