# Agent Skill Orchestrator O4-A Retrospective Role Benchmark Foundation Design — 2026-09-02

Date: 2026-09-02 KST

Status: **DESIGN FROZEN · RETROSPECTIVE ONLY · ROLE-ISOLATED · DETERMINISTIC SCORING · ZERO MODEL CALLS · NO FAMILY WINNER · NO ROLE ASSIGNMENT**

Tracking authority: issue #1120, O4-A acceptance freeze comment `5508921908`.

## 1. Purpose

O4-A creates the inert benchmark data model, deterministic scorer, and deterministic aggregator required before O4 may compare model families.

It does not benchmark a new model yet. It does not download a model. It does not assign a model to a role. It does not alter O3/O2 execution, Local Usage Dashboard, release state, validated scopes, or device truth.

O4-A exists to prevent benchmark rules from changing after model outputs are observed.

## 2. Benchmark matrix

Future O4 executions use independent cells:

```text
role × model_profile × retrospective_case
```

Cells are role-isolated rather than full-DAG runs:

- Scout receives a frozen EvidencePackage.
- Mapper receives a frozen EvidencePackage plus a frozen validated Scout RoleArtifact.
- Critic receives a frozen EvidencePackage plus a frozen validated Scout RoleArtifact and uses Critic-v2 semantics.
- Synthesizer receives a frozen EvidencePackage plus frozen validated Scout/Mapper/Critic RoleArtifacts.

This removes cascading upstream-model error from downstream role comparisons.

## 3. Retrospective-only provenance

A case is eligible only when it is explicitly retrospective/consumed/retired. Existing SimCore, Termux, Voyage, and DevPass held-outs are permitted benchmark sources because repository documents already label them diagnostic/retrospective after consumption.

Every benchmark case records:

- `case_id`
- `case_version`
- `retrospective_only: true`
- `source_case_id`
- `source_case_kind`
- frozen repository/source snapshot entries
- target role
- role contract id
- EvidencePackage canonical SHA256
- ordered upstream RoleArtifact SHA256 list
- deterministic expected labels
- canonical fixture SHA256

A future O6 held-out cannot be imported into O4 until it has been consumed/retired and separately reclassified as retrospective evidence.

## 4. Expected labels

Natural-language assertions are source material for fixture preparation, not executable benchmark truth.

O4 fixtures contain explicit typed label atoms. All label ids are unique within one case.

### Scout labels

- `source_ref`: one exact expected evidence ref.
- `authority`: one exact authority class plus exact expected refs.

### Mapper labels

- `owner`: canonical value plus zero or more frozen exact aliases.
- `edge`: canonical from/to values plus frozen exact aliases for each endpoint.

### Critic labels

- `boundary`: exact boundary kind plus canonical subject and frozen aliases.
- `blocker`: exact blocker kind plus canonical subject and frozen aliases.
- each blocker may set `required_uncertainty=true` when its preservation is required for UNKNOWN/CONFLICT safety scoring.

### Synthesizer labels

Synthesizer fixtures use frozen upstream typed records and label their canonical record fingerprints as:

- `required`
- `optional_useful`
- `required_blocker_or_conflict`

The benchmark scorer compares selected upstream record fingerprints, not free-form semantic prose.

## 5. Deterministic text normalization

The only normalization allowed before matching fixture text is:

1. Unicode NFC;
2. trim leading/trailing whitespace.

Case folding, stemming, fuzzy matching, embedding similarity, semantic judges, generated aliases, and model-authored aliases are forbidden.

A predicted text field matches when it equals the fixture canonical value or one of the fixture-owned exact aliases after the same deterministic normalization.

## 6. Ratio representation

Every ratio is represented as:

```json
{
  "numerator": 3,
  "denominator": 5,
  "basis_points": 6000
}
```

When denominator is zero:

```json
{
  "numerator": 0,
  "denominator": 0,
  "basis_points": null
}
```

Formula:

```text
floor(10000 * numerator / denominator)
```

Undefined ratios remain null. They are never converted to 0 or 10000.

## 7. Common cell result

A benchmark cell result records immutable execution identity and measured role output:

- benchmark schema/scoring policy id and digest;
- fixture id/version/digest;
- role;
- exact model profile id, family, repository, revision, file, SHA256;
- exact llama.cpp/runtime identity;
- execution status and finish reason;
- parse/contract validity;
- invalid-ref count;
- local/hosted call counts;
- prompt/response/receipt/artifact digests;
- telemetry:
  - wall-clock ms;
  - server CPU ms or null;
  - server peak RSS bytes or null;
  - prompt tokens or null;
  - completion tokens or null;
- role-specific raw predicted atoms needed by the scorer.

O4-A only validates/scorers synthetic fixture/results. Future O4 execution produces these cell receipts.

## 8. Role metrics

### Scout

- source-selection precision and recall;
- authority precision and recall;
- invalid-ref count;
- authority-overclaim count = unmatched predicted authority atoms.

### Mapper

- owner precision and recall;
- edge precision and recall;
- false-edge count = unmatched predicted edges;
- grounding precision over predicted owner/edge records carrying valid refs.

### Critic

- boundary precision and recall;
- blocker precision and recall;
- required-uncertainty preservation recall;
- false-blocker count;
- optimism-violation count = false positive boundaries + required-uncertainty misses.

### Synthesizer

- required-record preservation recall;
- required blocker/conflict preservation recall;
- optional-useful selection recall;
- excess optional selection count;
- forbidden-new-claim count;
- compact-completion status.

## 9. No composite score in O4

O4 may not compute one weighted quality score, family winner, permanent role winner, or assignment recommendation.

The capability table is a vector of raw counts, ratio objects, execution reliability, and telemetry. O5 freezes thresholds, weighting/tie-breaks, runtime constraints, family-diversity policy, and assignments only after O4 evidence exists.

## 10. Aggregation

Aggregation validates every cell result against its exact fixture and scoring-policy digests before including semantic totals.

Rules:

- failed/incomplete/invalid cells remain in execution reliability denominators;
- semantic ratio aggregation is micro aggregation from summed raw numerators/denominators, never an average of basis-point percentages;
- undefined aggregate ratio remains null;
- per-case rows remain available;
- aggregate snapshot records the ordered contributing result SHA256 list;
- aggregate snapshot is deterministic independent of result arrival order by canonical sorting on `(role, model_profile_id, case_id, case_version, result_sha256)`;
- duplicate cell identities are rejected.

`models/benchmark_scores.json` is future derived benchmark evidence only. It never changes model eligibility by itself and O4-A does not create a measured score file from synthetic unit fixtures.

## 11. Schemas and Python semantic validation

Repository schema validation intentionally supports a small JSON-schema subset. O4 uses closed schemas for shape plus Python semantic validators for constraints that need nullable integers or role-dependent fields.

Unknown telemetry uses JSON null. Python validators require every nullable telemetry field to be either null or a non-negative integer; bool is rejected as integer.

## 12. O4-A files

Additive implementation target:

```text
tools/agent-skill-orchestrator/
  benchmarks/
    __init__.py
    score_role_output.py
    aggregate_role_scores.py
  schemas/
    role-benchmark-case-v1.schema.json
    role-benchmark-result-v1.schema.json
    role-benchmark-score-v1.schema.json
    role-benchmark-aggregate-v1.schema.json
  tests/
    test_o4a_role_benchmark_foundation.py
```

No model registry modification and no benchmark workflow in O4-A.

## 13. Tests

Focused tests prove:

- case/result/score/aggregate shapes are closed;
- case/result canonical digest reproducibility;
- tampered fixture digest rejected;
- NFC+trim is the only matching normalization;
- aliases are fixture-owned and exact;
- no fuzzy/casefold behavior;
- precision/recall counts and basis points exact;
- zero denominator -> null;
- Scout/Mapper/Critic/Synth role metrics exact on synthetic fixtures;
- invalid refs fail or count deterministically according to result status;
- required uncertainty misses increase Critic optimism violations;
- aggregation micro-sums numerators/denominators;
- failed/incomplete/invalid results remain in reliability totals;
- arrival order does not change aggregate digest;
- duplicate cell identity rejected;
- nullable telemetry stays null;
- weighted/composite score field is impossible under the closed schemas;
- hosted-AI call count must be zero.

Full Agent Skills CI and repository required CI remain mandatory.

## 14. Non-goals

O4-A does not:

- download or run any model;
- add Gemma/Llama/Phi/Mistral or another new family;
- choose the first new family;
- modify Qwen profiles;
- generate a production role assignment;
- establish O5 thresholds;
- create prospective evidence;
- touch plugin/product/release/device bytes;
- change O3/O2 workflows or runtime behavior.

## 15. Exit

O4-A passes only after deterministic schemas/scorer/aggregator and focused tests merge from an exact tested head, merged-main Agent Skills/SimCore regression passes, main read-back confirms only inert benchmark foundation was added, and the implementation path performs zero model calls.

After O4-A exit, O4-B may select and freeze exactly one new local model family using exact artifact revision/SHA/license/access/llama.cpp CPU-smoke evidence before that family enters the retrospective matrix.
