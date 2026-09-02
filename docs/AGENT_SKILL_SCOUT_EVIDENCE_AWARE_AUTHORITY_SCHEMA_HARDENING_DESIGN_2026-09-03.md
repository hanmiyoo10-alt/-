# Agent Skill Scout Evidence-Aware Authority Schema Hardening Design — 2026-09-03

## Status

**DESIGN READY — IMPLEMENTATION AUTHORIZED**

Tracking: issue #1120

Predecessor evidence:

- Scout source-selection schema hardening merged in PR #1362;
- O4-D diagnostic replay merged in PR #1363;
- O4-D run `33656712799` / artifact `9858121004`;
- O4-D evidence comment `5513450905`.

## Observed problem

O4-D proved that the first structured-generation gap was real and that the first hardening worked:

- both models now emitted `k=s` with the required fixed value `relevant_source`;
- Ministral completed a contract-valid Scout row;
- Qwen remained `INVALID` for a different reason.

Qwen emitted one authority record equivalent to:

```json
{
  "k": "a",
  "v": "domain_primary",
  "r": ["S1@L21", "S2@L749", "S3@L1"]
}
```

The frozen EvidencePackage identifies:

- `S1@L21` → `domain_primary`;
- `S2@L749` → `domain_primary`;
- `S3@L1` → `manifest`.

`validate_scout_wire()` correctly rejects that record because an authority record must reference exactly one supplied authority class and `v` must equal that class.

The current `scout_response_schema()` cannot express that correlation. It is intentionally evidence-agnostic: it knows the syntax of a source ref but not which supplied ref belongs to which authority class.

Therefore this is a second **generation-schema / validator constraint gap**, not a prompt failure, model transport failure, evidence error, or scoring error.

## Goal

Add a deterministic **evidence-aware Scout response-schema builder** that constrains generation to authority/ref combinations already permitted by the existing validator, without changing the Scout semantic contract.

The validator remains the final authority. The generation schema is only an earlier fail-closed projection of constraints that are already true.

## Non-goals

This slice does **not**:

- change `scout-compact-wire-v3`;
- change `role-contracts/scout.json`;
- change `build_scout_prompt()` or prompt bytes;
- change model profile, runtime, generation settings, CPU budget, timeout, or transport;
- change scoring policy or expected labels;
- rewrite or reinterpret O4-C/O4-D evidence;
- rerun O4-D;
- assign/rank a model or enter O5;
- change any plugin, product, release, device, or SimCore promotion state.

## Compatibility rule

Keep the existing `scout_response_schema()` byte-for-byte behavior as the **historical/static schema builder**.

Its O4-D canonical SHA256 remains:

`f7f8f6014251e8dc786182dbd68fd001e195dd5c4eca1a7a94c0bcbeb90f92d6`

Do not silently change this function because historical O4-C/O4-D execution provenance names it explicitly.

Add a second API:

```python
scout_response_schema_for_evidence(evidence_package, contract=None)
```

Live runtime may opt into the new function explicitly. Historical benchmark runners remain on the old function.

## Evidence-aware schema construction

The builder must first call `validate_evidence_package(evidence_package)`.

It then derives deterministically:

- the complete sorted supplied ref set;
- `authority_class -> sorted supplied refs`.

For source-selection records (`k=s`):

- `k` is fixed to `s`;
- `v` is fixed to the contract `source_selection_value` (`relevant_source`);
- `r` has `minItems=1`, contract-bounded `maxItems`, and item enum equal to the complete supplied ref set.

For authority records (`k=a`):

- create exactly one schema branch for each authority class actually supplied in the EvidencePackage;
- `k` is fixed to `a`;
- `v` is fixed to that branch's authority class;
- `r` has `minItems=1`, contract-bounded `maxItems`, and item enum containing only refs whose supplied `authority_class` equals that branch value.

Top-level records are a `oneOf` over:

1. the source-selection branch;
2. one authority branch per supplied authority class, sorted by authority-class string.

This makes the observed O4-D Qwen record unrepresentable by grammar: the `domain_primary` branch cannot include a `manifest` ref.

## Remaining validator authority

The new schema does not replace `validate_scout_wire()`.

In particular, retain validator checks for all constraints, including:

- exact object fields;
- response byte ceiling;
- max record count;
- max refs per record;
- known evidence refs;
- duplicate refs;
- semantic authority/ref correlation;
- canonical response size.

`uniqueItems` may remain present in JSON Schema, but correctness must not depend on llama.cpp enforcing it. The Python validator remains final.

## Live-runtime adoption boundary

Only live Scout execution surfaces should switch to the evidence-aware builder in this hardening PR:

- `runtime/run_scout_pilot.py`;
- `runtime/run_sequential_pilot.py`;
- `runtime/run_parallel_pilot.py`.

Each already holds the exact EvidencePackage used to construct the Scout prompt, so there is no new discovery or network dependency.

Historical benchmark/recovery runners stay unchanged, including:

- `benchmarks/run_scout_cell.py`;
- `benchmarks/run_scout_cell_timeout_recovery.py`;
- `benchmarks/run_o4d_scout_cell.py`;
- O4-C/O4-D matrix code.

This preserves their historical schema identity and prevents accidental provenance drift.

## Determinism

For semantically identical valid EvidencePackages, schema generation must be independent of source ordering where ordering is not semantically meaningful:

- authority-class branches sorted lexicographically;
- refs in every enum sorted lexicographically.

The schema must contain no expected benchmark labels, relevance answers, winner information, or hidden scoring data. It may encode only facts already supplied in the EvidencePackage itself: ref identity and authority class.

## Fail-closed behavior

The evidence-aware builder must fail before inference when:

- the EvidencePackage is invalid;
- there are no valid supplied refs needed to build the allowed branches;
- an internal derived authority mapping is inconsistent.

It must never invent an authority class or source ref.

## Mechanical regressions

Add focused tests proving at minimum:

1. the historical `scout_response_schema()` canonical SHA remains exactly `f7f8f601...f92d6`;
2. source-selection branch fixes `v=relevant_source` and permits only supplied refs;
3. a `domain_primary` authority branch permits only supplied `domain_primary` refs;
4. a `manifest` authority branch permits only supplied `manifest` refs;
5. the O4-D Qwen mixed-class authority record is excluded by branch construction;
6. equivalent evidence source ordering produces the same evidence-aware schema;
7. invalid EvidencePackage input fails closed;
8. live Scout pilot passes its EvidencePackage to the new builder;
9. sequential pilot passes its EvidencePackage to the new builder;
10. parallel pilot passes its EvidencePackage to the new builder;
11. historical O4-C/O4-D runners still call the static builder;
12. no model profile, generation, contract, prompt, scoring, plugin, or release file changes are introduced by the PR.

## CI and merge

Run ordinary Agent Skills CI and SimCore Required only. This implementation PR performs **zero model calls**.

Merge only the exact tested head SHA.

After merge, require merged-main Agent Skills CI and SimCore Verify/Required to be green before any new model execution.

## Follow-up measurement identity

Do not rerun O4-D after this hardening.

If implementation merges cleanly, the next measurement must have a new identity, provisionally **O4-E: Scout authority-correlation schema validation**.

O4-E may reuse the same O4-C retrospective case strictly as a diagnostic replay because it is validating the second observed generation-schema gap. It must:

- bind the new evidence-aware response-schema SHA before inference;
- preserve the same frozen prompt/case/evidence/model/runtime/generation settings;
- run Qwen once and Ministral once, hosted AI zero;
- preserve terminal `INVALID` rows rather than stopping after the first model;
- forbid winner/rank/assignment semantics;
- remain excluded from independent capability aggregation because it reuses the same historical case.

Conservative O4-E hardening acceptance is both cells `parse_valid=true` and `contract_valid=true`. If another validator-only constraint appears, record it and diagnose rather than tuning/retrying.

Even if O4-E validates the hardening, model assignment still cannot use repeated replays of the same case. Before O5, freeze and execute a separate retrospective/held-out Scout case not used to design either schema hardening.
