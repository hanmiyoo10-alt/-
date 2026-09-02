# Agent Skill Orchestrator O2-A Scout Deterministic Status v3 Design — 2026-09-02

## Status

FROZEN_BEFORE_IMPLEMENTATION

## Triggering evidence

The third O2-A Scout diagnostic used request commit `6a846b03153443f75f1803f51aca7b80057cdcfe`, target `7b7db631656abb4a668a9aed40b8eedb5a58a58b`, Usage Dashboard release authority `82c4f900cf548068d1eada957c982a5d78f1347b`, run `33603211175`, and artifact `9836000681` (`sha256:5a49811a6c89ba7e0888b79e37fe226170dd752fdef1c62e0918c825425a9a77`).

The model finished with `stop`, used 47 completion tokens, produced 103 wire bytes, made exactly one local model call and zero hosted-AI calls, and returned two separate authority-class records. This confirms v2 removed the previous class-diversity-as-conflict failure. However, both records used `s=U` while carrying known authority classes and exact refs, so validation correctly failed with `UNKNOWN must have no refs and value=unknown`.

Diagnosis: `SCOUT_MODEL_CHOSEN_STATUS_CROSS_FIELD_INVARIANT_GAP`.

## Design decision

Scout is a source/authority locator, not a confidence/status classifier. A model-selected `D|L|U` field is unnecessary discretion and creates a cross-field invariant that a small local model can violate even when its evidence selection is otherwise correct.

`scout-compact-wire-v3` therefore removes model-selected status entirely.

### Model-visible wire

Known grounded selection:

```json
{"r":[{"k":"a","v":"guidelines","r":["S1@L1"]}]}
```

No grounded selection:

```json
{"r":[]}
```

Each non-empty record contains exactly:

- `k`: `a` (authority selection) or `s` (source selection);
- `v`: exact supplied authority class for `k=a`, or literal `relevant_source` for `k=s`;
- `r`: one to three exact supplied source refs.

The model does not output status, confidence, conflict, UNKNOWN prose, blockers, verdicts, owners, flows, release truth, or device truth.

### Deterministic status projection

After wire validation:

- every valid non-empty grounded record is projected to RoleArtifact status `DIRECT` by deterministic code;
- an empty validated record list is projected to one role-level `UNKNOWN` claim with value `unknown` and no refs;
- no model-selected `SUPPORTED_LIKELY`, `UNKNOWN`, or `CONFLICT` status enters the Scout RoleArtifact;
- semantic conflict remains outside Scout and stays deterministic/downstream.

This does not invent repository truth. `DIRECT` means only that the Scout selection exactly references supplied evidence and, for authority records, exactly matches supplied `authority_class` metadata. Empty selection means no model-grounded selection and therefore stays UNKNOWN rather than becoming an optimistic default.

## Closed-schema rules

- top-level object contains exactly `r`;
- maximum 12 records;
- each non-empty record contains exactly `k`, `v`, `r`;
- each non-empty record must contain 1–3 unique known refs;
- authority refs in one record must all share exactly one supplied authority class and `v` must equal it;
- source-selection `v` must equal `relevant_source`;
- legacy `s` status fields fail closed;
- placeholder `unknown` records fail closed; only exact empty `r` represents the deterministic UNKNOWN path;
- duplicate JSON keys, unknown refs, mixed authority classes, extra fields, semantic prose, and >2400-byte wire fail closed.

## Preserved envelope

Unchanged:

- Qwen2.5-3B model/revision/file/SHA;
- llama.cpp release/artifact/SHA;
- temperature 0, seed 42, `n_predict=768`, `ctx_size=16384`, threads 4, GPU layers 0;
- 2400-byte wire ceiling, 12-record ceiling, 3-ref ceiling;
- bounded Usage Dashboard evidence construction;
- exact target/release authority checks;
- hidden artifact retention;
- one local model call / zero hosted-AI calls;
- RoleArtifact schema, shared evidence bus, Mapper/Critic/Synthesizer semantics, deterministic judge/conflict handling;
- Usage Dashboard product/runtime/release/device bytes and validated scopes.

## Mechanical acceptance before another model call

1. contract identity is `scout-compact-wire-v3`;
2. response schema has no model-visible `s` status field;
3. valid grounded authority/source selections validate and deterministically become `DIRECT` RoleArtifact claims;
4. exact `{"r":[]}` validates and deterministically becomes one `UNKNOWN` role-level claim with no refs;
5. legacy v2 `s` fields fail closed;
6. non-empty records with zero refs fail closed;
7. mixed authority classes, unknown refs, wrong authority values, semantic source-selection prose, duplicate keys, extra fields, and byte-ceiling violations fail closed;
8. prompt explicitly says not to output status and to return `{"r":[]}` when no supplied evidence can support a selection;
9. full Agent Skills CI and SimCore required gate are green on the exact head;
10. exact tested head is merged and read back from main.

Only after these gates may a separately frozen fourth retrospective diagnostic request be considered. The first three O2-A diagnostics remain immutable and are never relabeled.