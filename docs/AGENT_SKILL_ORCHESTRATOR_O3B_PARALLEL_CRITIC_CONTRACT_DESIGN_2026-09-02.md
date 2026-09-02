# Agent Skill Orchestrator O3-B Parallel Critic Contract Design — 2026-09-02

## Status

FROZEN_BEFORE_IMPLEMENTATION

O3-A is merged and materialized at `4a36f245b45614644ac3ec9f48e3cd309183e1a0`. The versioned runtime budget profile `standard-cpu-v1` has canonical selected-profile SHA256 `87ccc9c5c0b86fb146f51a24fa583493673992252d8e3063c2cc85ccdac54ffe`.

O3-B resolves a dependency mismatch before any parallel scheduler exists.

## Problem

The O3 roadmap requires Mapper and Critic to run as separate sibling jobs over an identical EvidencePackage SHA after Scout when needed.

The frozen O2 Critic contract cannot be used for that topology:

- `critic-compact-wire-v1` challenge records contain Mapper claim ids;
- its prompt projection requires a validated Mapper RoleArtifact;
- its O2 execution envelope therefore has a direct Mapper dependency.

Pretending that contract is independent would create false provenance. O3 must not rewrite the successful O2 contract because O2 is the required rollback baseline.

## Decision

Add an O3-only parallel-compatible Critic contract, explicitly versioned as `critic-parallel-compact-wire-v2`.

O2 `critic-compact-wire-v1`, `roles/critic.py`, semantic receipt v2 Critic semantics, router O2 dependency graph, and O2 sequential workflow remain unchanged.

## Inputs

Parallel Critic v2 receives only:

- the bounded EvidencePackage used by its Mapper sibling;
- a validated Scout RoleArtifact projection;
- its own closed v2 compact contract.

It receives no Mapper RoleArtifact and no raw upstream model response.

The Scout projection contains typed claims/blockers/conflicts and Scout artifact digest only. The evidence blocks remain the direct grounding source.

## Compact wire v2

Exact top-level keys:

```json
{
  "b": [
    {"k": "lifecycle", "v": "lifecycle boundary", "r": ["S1@L4"]}
  ],
  "c": [
    {"k": "missing_evidence", "v": "consumer preservation evidence may be incomplete", "r": ["S2@L2"]}
  ],
  "u": [
    {"k": "unknown", "v": "release impact unresolved", "r": []}
  ]
}
```

`b` is an evidence-grounded boundary candidate. `c` is an independent concern/blocker candidate. `u` is an unresolved blocker candidate.

There is deliberately no Mapper claim id or semantic target-id field in v2. A concern is preserved as its own Critic-origin blocker. O3-B does not fabricate a relationship to a future Mapper claim.

## Rules

- top-level fields are exactly `b`,`c`,`u`;
- boundary records have exactly `k`,`v`,`r` and require at least one known evidence ref;
- concern records have exactly `k`,`v`,`r`; refs may be empty only when the concern is explicitly about missing/unknown evidence;
- unresolved records have exactly `k`,`v`,`r` and may have zero refs;
- boundary and blocker vocabularies remain the frozen O2 vocabularies;
- duplicate records fail closed;
- unknown evidence refs fail closed;
- model-visible status, confidence, verdict, release truth, device truth, mutation or patch instructions are forbidden by exact-field closure and prompt policy;
- empty arrays are valid; no semantic content is fabricated by the validator;
- deterministic projection assigns `SUPPORTED_LIKELY` to grounded boundaries;
- concern/unresolved items project to Critic-origin blockers;
- exact wire/canonical byte and record/ref/value ceilings are enforced.

Initial ceilings remain intentionally aligned with O2 where possible:

- max boundaries: 8
- max concerns: 8
- max unresolved: 8
- max refs per record: 3
- max value bytes: 128
- max wire bytes: 2400

## Prompt isolation

The prompt is deterministic for identical inputs and includes:

- `ROLE: critic` plus explicit O3 parallel-independent policy;
- validated Scout typed projection;
- bounded EvidencePackage blocks.

It does not contain a Mapper projection, Mapper claim ids, `response.txt`, raw Scout response text, chain-of-thought, or arbitrary upstream prose.

## RoleArtifact projection

A completed v2 response may be deterministically converted into the existing `role-artifact.schema.json` with:

- role = `critic`;
- model identity = existing frozen Qwen O2 identity;
- target_repository_sha/evidence_sha256 exact match;
- prompt/structured-response digests exact;
- upstream_artifact_sha256 = exactly `[Scout RoleArtifact SHA]`;
- records.claims = [];
- records.flow_edges = [];
- records.boundaries = deterministic v2 boundaries;
- records.blockers = concern + unresolved candidates with `origin_role = critic`;
- records.conflicts = [].

This RoleArtifact is independently valid even if the future Mapper sibling fails. That property is required for O3 failure containment.

## Scope boundary

O3-B implements only:

- new Critic v2 contract JSON;
- new deterministic validator/prompt/projection module;
- new independent Critic RoleArtifact builder/hash helper;
- focused synthetic tests;
- this design record.

O3-B does not implement:

- router topology changes;
- parallel scheduler or GitHub Actions workflow;
- root timing/provenance receipt;
- retry policy;
- Mapper execution changes;
- Synthesizer dependency changes;
- new receipt schema;
- model download/call;
- O2 semantic tuning;
- product/plugin/release/device changes.

## Required tests

- valid grounded boundary/concern/unresolved wire accepted;
- empty v2 output accepted without fabricated records;
- unknown refs, invalid kinds, duplicates, extra fields, status/confidence/verdict fields rejected;
- grounded boundary with no refs rejected;
- prompt contains validated Scout typed projection and no raw upstream response or Mapper dependency;
- RoleArtifact is deterministic and valid with upstream exactly Scout;
- target/evidence mismatch or non-Scout upstream rejected;
- v2 artifact stays valid independent of any Mapper result;
- O2 Critic v1 contract/module remain unchanged and their existing regressions stay green.

Full Agent Skills CI and SimCore Required must pass before exact-head merge.

## Exit

O3-B exits when current main can deterministically produce a valid Critic RoleArtifact from the same EvidencePackage plus Scout artifact used by Mapper, without any Mapper dependency and without altering O2 Critic v1.

Only after main read-back may O3-C freeze scheduler, root timing/provenance, retry metadata, sibling-failure isolation, Synthesizer gating and the first parallel retrospective workflow.