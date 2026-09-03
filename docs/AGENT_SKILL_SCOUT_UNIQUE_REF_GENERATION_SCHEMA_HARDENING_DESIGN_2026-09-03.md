# Agent Skill Scout Unique-Ref Generation-Schema Hardening Design — 2026-09-03

Date: 2026-09-03 KST

Status: **DESIGN FROZEN · O4-F DIAGNOSIS-DRIVEN · ZERO MODEL CALLS · HISTORICAL SCHEMAS PRESERVED · NO O5 POLICY CHANGE**

Tracking authority: issue #1120. O4-F terminal evidence is comment `5527136289`; this hardening decision is comment `5527215227`.

## 1. Observed O4-F failure

O4-F first live pair completed exactly once under run `33763047539` / attempt `1` with hosted AI call count `0` and local model call count `2`.

The pair is not assignment-eligible because Qwen2.5-3B produced parseable JSON that failed the canonical Scout wire contract. One `evidence` authority record repeated the same supplied ref three times:

```json
{"k":"a","v":"evidence","r":["S5@L2","S5@L2","S5@L2"]}
```

The frozen JSON Schema already carried `uniqueItems: true`, and `validate_scout_wire()` correctly rejected the duplicate refs. Ministral completed contract-valid. The aggregate therefore preserved the pair as terminal evidence only and emitted `paired_assignment_eligible=false`.

This is a constrained-generation capability gap, not a reason to weaken validation, repair output, tune O5, or rerun O4-F.

## 2. Pinned-runtime evidence

The pinned runtime remains llama.cpp release `b10516`, source `b95502ba9`, artifact SHA256 `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`.

The exact pinned llama.cpp grammar documentation lists JSON Schema `uniqueItems` as unsupported and advises that unsupported keywords may be skipped. The exact pinned `test-json-schema-to-grammar.cpp` also proves that non-string `enum` values, including an array value such as `["foo"]`, are converted to literal grammar alternatives.

Therefore the next narrowing must not rely on `uniqueItems`. It may instead express the allowed unique ref arrays directly as array-valued enum alternatives.

## 3. Historical compatibility boundary

Two historical schema builders are immutable provenance surfaces:

1. `scout_response_schema()` — O4-C/O4-D historical/static identity remains `f7f8f6014251e8dc786182dbd68fd001e195dd5c4eca1a7a94c0bcbeb90f92d6`.
2. `scout_response_schema_for_evidence()` — O4-E/O4-F historical evidence-aware behavior remains unchanged. For the frozen O4-F Termux evidence its schema SHA256 remains `c4c59b939875203b91580381664220a9305c922c4dda9aa685bd08cd207c0d61`.

Do not silently strengthen either function. Historical benchmark runners must continue to reproduce the schema identity they recorded.

Add a third explicit API:

```python
scout_response_schema_for_evidence_unique_refs(evidence_package, contract=None)
```

Live Scout runtimes opt into this strict builder. Future diagnostic measurements may opt in explicitly under a new measurement identity.

## 4. Strict unique-ref projection

The strict builder first calls the unchanged historical evidence-aware builder. For each generated record branch, its `r` schema already contains:

- `type=array`;
- contract `minItems` / `maxItems`;
- `uniqueItems=true` metadata;
- an item enum containing only supplied refs allowed by that branch.

The strict builder adds an **array-level `enum`** containing every canonical unique ref combination permitted by those existing constraints.

For allowed refs `[A,B,C]` and maximum length `2`, generated alternatives are:

```text
[A]
[B]
[C]
[A,B]
[A,C]
[B,C]
```

It never includes duplicate-member arrays such as `[A,A]`, and never includes alternate permutations such as `[B,A]`. Every array is lexicographically ordered.

This ordering is not a scoring semantic. Scout authority scoring canonicalizes predicted ref sets with `tuple(sorted(atom["refs"]))` before exact matching.

## 5. Bounds and fail-closed behavior

Repository evidence is already capped at `MAX_SOURCES=64`; the current Scout contract caps refs per record at `3`. The complete worst-case combination count is therefore:

`C(64,1) + C(64,2) + C(64,3) = 43,744`.

Set a deterministic strict expansion ceiling of `50,000` variants per record branch. Current maximum repository bounds fit below it. If future contracts expand beyond that envelope, the strict builder fails before inference instead of silently falling back to duplicate-permitting grammar.

The builder also fails closed when:

- evidence is invalid;
- the evidence-aware branch structure is absent;
- the supplied ref enum is empty, unsorted, or duplicated;
- ref-array bounds are malformed;
- no unique array is representable.

## 6. Validator authority remains unchanged

`validate_scout_wire()` remains final authority and retains all checks, including:

- exact JSON shape and duplicate object keys;
- response byte ceiling;
- max records / max refs;
- known ref membership;
- duplicate-ref rejection;
- source-selection fixed value;
- authority/ref-class agreement;
- canonical response-size ceiling.

Do not post-process or deduplicate a model response into validity. Generation narrowing prevents known-invalid candidates; validation still decides correctness.

## 7. Live-runtime adoption

Switch only current live Scout inference surfaces to the strict builder:

- `runtime/run_scout_pilot.py`;
- `runtime/run_sequential_pilot.py`;
- `runtime/run_parallel_pilot.py`.

Keep O4-E and O4-F benchmark runners on the historical evidence-aware builder. This PR performs no model inference.

## 8. Mechanical regressions

Zero-model-call tests must prove:

1. historical static schema SHA is unchanged;
2. frozen O4-F historical evidence-aware schema SHA is unchanged;
3. strict branches enumerate only sorted unique ref arrays;
4. exact O4-F Qwen duplicate triple is absent/unrepresentable;
5. valid multi-ref combinations remain representable in canonical sorted order;
6. authority-class partitioning is preserved;
7. strict output is deterministic across non-semantic evidence object ordering;
8. live Scout/sequential/parallel surfaces use the strict builder;
9. O4-E/O4-F historical runners still use the old evidence-aware builder;
10. Agent Skills CI and SimCore Required are green on the exact PR head.

## 9. Non-goals

This hardening does not:

- rewrite or rerun O4-F;
- make the historical Qwen row valid;
- change O5 thresholds, tie-breaks, weights, budget, or assignment state;
- change role-contract, prompt, model, runtime, generation, scorer, or expected labels;
- add hosted AI;
- change plugin, product, release, device, or `PILOT_VALIDATED_SCOPES` state;
- claim general JSON Schema grammar completeness.

## 10. Follow-up measurement

After exact-head merge and merged-main Agent Skills + SimCore gates are green, a separate diagnostic measurement may be frozen as **O4-G**.

O4-G may replay the frozen O4-F Termux case only to validate this newly observed uniqueness hardening. It must:

- have a new request/matrix/result identity;
- bind the strict schema SHA before inference;
- preserve the O4-F prompt, evidence, models, runtime, and generation settings unless a separately reviewed design says otherwise;
- call Qwen once and Ministral once;
- keep hosted AI at zero;
- preserve INVALID terminal rows rather than retrying/tuning;
- forbid winner/rank/assignment semantics;
- remain diagnostic-only and excluded from independent assignment-case counting.

O4-F remains immutable terminal evidence regardless of O4-G outcome.
