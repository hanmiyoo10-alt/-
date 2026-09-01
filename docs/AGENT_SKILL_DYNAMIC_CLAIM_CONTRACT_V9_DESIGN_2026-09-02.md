# Agent Skill Zero-Credit Eval — Dynamic Claim Contract v9 Design

Status: **DESIGN FROZEN BEFORE IMPLEMENTATION**

Date: 2026-09-02

Baseline main: `3869b454daa6ddc04d72317e22e063784e086f0b`

## Problem statement

The current structured zero-credit response contract proves a useful pattern for `plugin-impact-scope`, but only the `service-tier-fidelity` Usage Dashboard case has a structured contract. Candidate scopes without a contract fall back to free-form output. That free-form lane can be mechanically `PAIR_VALID` while still allowing a small local model to declare `Blocked claims: none` / an impact-scoped conclusion without proving source-specific authority, flow, preservation, security, lifecycle, completeness, validation, or release boundaries.

The failure is not candidate frozen-ref materialization. Termux and Voyage both materialized frozen candidate evidence successfully. The missing control is a fixture-agnostic structured grounding surface with evaluator-owned blockers and verdict.

## Design goal

Add a new response-contract family that can represent the essential claims of any impact-scope case without hard-coding Usage Dashboard field names into evaluator code.

The evaluator, not the model, remains the final authority for:

- whether required source-backed flow edges were selected;
- whether required claim slots were grounded in compatible evidence;
- unresolved blockers; and
- the derived impact verdict.

## Non-goals

- Do not alter `PILOT_VALIDATED_SCOPES`.
- Do not promote SimCore, Termux, Voyage, DevPass, or any other scope.
- Do not change normal plugin-impact-scope invocation authority.
- Do not change product/runtime/release code.
- Do not rerun Termux or Voyage and relabel them as independent generalization proof; their previous outputs are diagnostic/training evidence only.
- Do not put answer-specific source paths, claim IDs, or expected values into generic Python control flow.
- Do not let the model emit the final verdict or authoritative blocker list.

## Compatibility boundary

`impact-scope-grounded-flow-v8` remains supported exactly as-is for the existing Usage Dashboard `service-tier-fidelity` case.

For v8:

- schema shape remains unchanged;
- prompt wording/layout remains unchanged;
- claim-status compatibility remains unchanged;
- derived-verdict behavior remains unchanged.

The new contract is additive and uses a distinct ID: `impact-scope-grounded-claims-v9`.

## v9 raw contract shape

A v9 case contains:

- `id`
- `expected_scope`
- `prompt_instruction`
- `evidence_registry`
- `flow_edge_registry`
- `required_flow_edge_ids`
- `claim_registry`
- `required_claim_ids`

### Evidence registry

Same fail-closed `E# -> {source_path, source_anchor}` contract as v8. Every anchor must exist verbatim in the bounded source context.

### Flow registry

Same fail-closed registered `F#` edge contract as v8. Model output may select only registered IDs. Required flow coverage is evaluator-owned.

### Dynamic claim registry

Each `C#` entry contains:

- `label`: short neutral semantic boundary name used only in the prompt legend;
- `evidence_status_allowlist`: one or more compatible `E# -> [DIRECT|SUPPORTED_LIKELY|CONFLICT]` mappings.

Generic evaluator code must not know what a claim means. Meaning and evidence compatibility live in the case contract.

`required_claim_ids` determines which claim slots must resolve for a fully supported verdict. Every registered claim still appears in the JSON schema; non-required claims may remain `UNKNOWN` without blocking the final verdict.

## v9 model output shape

The model returns exactly:

```json
{
  "scope": "<expected scope>",
  "flow_edges": ["F1"],
  "claims": {
    "C1": "DIRECT:E1",
    "C2": "UNKNOWN"
  }
}
```

Rules:

- no source paths or anchors in model output;
- no free-form flow endpoints;
- no unregistered claim IDs;
- no model-owned verdict;
- no model-owned blocker list;
- `UNKNOWN` has no evidence suffix;
- non-UNKNOWN bases must be a claim-compatible `STATUS:E#` pair.

## Mechanical derivation

For each required `C#`:

- `DIRECT` and `SUPPORTED_LIKELY` are resolved;
- `UNKNOWN` blocks `claim:C#`;
- `CONFLICT` is allowed only when explicitly listed for that claim/evidence and forces final `CONFLICT`.

For each required `F#` not selected, derive `flow:F#`.

Derived verdict:

1. any grounded required/optional claim with `CONFLICT` -> `CONFLICT`;
2. no selected flow edge and every claim is `UNKNOWN` -> `UNKNOWN`;
3. every required claim resolved, every required flow edge selected, and no derived blockers -> `SUPPORTED`;
4. otherwise -> `PARTIAL`.

The structured-validation file and pair receipts continue to carry evaluator-derived verdict/blockers. `PAIR_VALID` remains execution/provenance validity, not a quality winner declaration.

## Prompt compatibility

Prompt composition must dispatch by contract ID.

- v8 uses its existing wording byte-for-byte.
- v9 receives a dynamic `CLAIM REGISTRY` / claim-compatibility legend and generic wording such as “registered claim basis”.
- candidate scope projection remains unchanged and remains evaluation-only.

## Mechanical regression plan

Add tests that prove:

1. existing v8 contract/prompt/derivation remains unchanged;
2. v9 rejects malformed claim IDs, unknown evidence, invalid status compatibility, duplicate/unknown flow IDs, and model-owned extra fields;
3. v9 derives `SUPPORTED`, `PARTIAL`, `UNKNOWN`, and `CONFLICT` mechanically from synthetic neutral contracts;
4. v9 claim labels and evidence compatibility are contract data, not hard-coded Python branches;
5. receipts revalidate v9 output and carry derived verdict/blockers;
6. candidate scopes remain unpromoted.

## First prospective proof after merge

The first independent v9 proof must use a scope whose model output has not already been observed in this lane. DevPass is selected because it is already registered but not pilot-promoted, and current source exposes a bounded declared-update-channel / missing-artifact boundary.

Prospective source snapshot for the DevPass case will be frozen before any DevPass model output is produced. The case will test source-backed impact scoping around a missing declared `plugins/devpass/latest.js` update artifact without creating a placeholder or inventing a new release authority.

The prospective case/contract must preserve, at minimum:

- declared update-channel authority on `main`;
- the difference between an artifact locator and artifact presence (`DECLARED_MISSING`);
- the fixed GitHub HTTPS update URL;
- no placeholder artifact merely to make validation green;
- secret-material exclusion;
- no invented published behavior/version while the artifact is missing;
- validation of the real artifact if it later exists;
- no new publisher/release authority/writable durable-memory path inferred from bootstrap metadata;
- no implementation/release-version/deployment choice in the eval answer.

If the first DevPass v9 output is `PARTIAL`, `UNKNOWN`, `CONFLICT`, or execution-invalid, stop at evidence freeze + diagnosis. Do not tune and rerun the same held-out as independent proof.
