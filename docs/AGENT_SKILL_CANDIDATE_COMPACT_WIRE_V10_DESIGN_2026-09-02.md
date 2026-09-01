# Agent Skill Zero-Credit Eval — Candidate Compact Wire v10 Design

Status: **DESIGN FROZEN AFTER FIRST v9 EXECUTION FAILURE · IMPLEMENTATION NOT STARTED**

Date: 2026-09-02

Implementation baseline main: `827ccfccf9a4c2883e708c779fca1fb84c73de8d`

Evidence authority:
- v9 implementation merge: PR #1219 / `b8323f8c1a5f047e5e36c93c019b9306c6d4f7f4`
- validated Usage Dashboard v8 regression: run `33538474451`, artifact `9812836158`, `PAIR_VALID`, with-skill `SUPPORTED`
- first DevPass v9 prospective one-shot: run `33539270383`, artifact `9813180229`, pair `EXECUTION_INCOMPLETE`
- first DevPass artifact ZIP SHA256: `6cd99782bf6cead221b5f55c09ff856f8cfc1bf1a00ca87323d202ff528b208c`
- diagnosis record: issue #1120 comment `5498085589`

## 1. Proven failure

The first prospectively frozen DevPass candidate execution reached the local model successfully in both modes, but both completions consumed exactly the fixed `n_predict=768` budget and ended with `finish_reason=length`.

Therefore:

```text
candidate source routing/materialization = PASS
pinned runtime/model verification = PASS
local inference transport = PASS
structured completion = FAIL
pair = EXECUTION_INCOMPLETE
mechanical impact verdict = unavailable
qualitative promotion evidence = unavailable
```

The failure is at the candidate grounded-report serialization/completion-budget layer.

The current v9 wire permits:
- up to 6 semantic owners;
- up to 6 flow edges;
- up to 6 other preservation boundaries;
- up to 4 test/contract entries;
- up to 3 repeated `{sourceBlockId, sourceAnchor}` objects per claim;
- long repeated field names and verbatim anchors.

The DevPass output also demonstrated a secondary diagnostic weakness: copying verbatim anchor strings consumes output budget and can itself be malformed or copied against the wrong block. Because the responses were truncated, this secondary observation is diagnostic only; it is not a qualitative held-out verdict.

## 2. Hard boundary

Do **not** repair this by increasing `n_predict` and rerunning DevPass as independent proof.

The first DevPass held-out is consumed and retired to diagnostic/regression use. Its v9 contract and artifact provenance remain immutable evidence.

`candidate-grounded-impact-report-v9` must remain supported unchanged for historical revalidation.

The repair is additive under a new contract ID:

```text
candidate-grounded-impact-report-v10
```

## 3. Goal

Keep the same generic semantic report categories while replacing the verbose candidate wire representation with a bounded compact representation that can finish under the existing zero-credit generation budget.

No hidden project answer may be introduced.

The model still chooses:
- authority interpretation;
- semantic owners;
- semantic flow edges;
- preservation boundaries;
- tests/contracts;
- generated/release boundary;
- narrowest supported boundary.

The evaluator still owns:
- source-locator validity;
- required generic category completion;
- blockers;
- final `SUPPORTED | PARTIAL | UNKNOWN | CONFLICT` verdict.

## 4. Source reference v10

### 4.1 Replace copied anchor prose with opaque source-line references

Every bounded context block already contains original source line prefixes such as:

```text
8: - Current observed artifact state: `DECLARED_MISSING`
```

v10 source references use only:

```text
S4@L8
```

where:
- `S4` is the opaque supplied source-block ID;
- `L8` is the original line number already present in that exact extracted block.

The evaluator verifies mechanically:

```text
source block S4 exists
AND
that supplied block contains a line whose prefix is exactly `8:`
```

It may attach the resolved line text to validation output for auditability.

This does **not** prove the model's semantic claim. It proves only that the claim points to a concrete supplied source line.

### 4.2 No hidden answer injection

The evaluator does not publish or preselect which `S#@L#` references are correct for a case.

The model sees the same bounded source evidence with line numbers and chooses its own references.

No expected owner, edge, path, line, assertion, or status is encoded in the v10 case contract.

## 5. Compact wire shape

The semantic field names remain the conceptual authority, but the evaluation-only wire uses compact aliases and tuples.

Conceptual mapping:

```text
scope                 -> scope
authority             -> a
semanticOwners        -> o
flowEdges             -> f
preservation          -> p
  requestIdentity     -> ri
  noExtraIo           -> io
  otherBoundaries     -> b
testsContracts        -> t
generatedRelease      -> g
narrowestBoundary     -> n
```

### 5.1 Claim tuples

Simple claim with value:

```text
[STATUS, VALUE, SOURCE_REF]
```

Simple claim without value:

```text
[STATUS, SOURCE_REF]
```

Named claim:

```text
[LABEL, STATUS, SOURCE_REF]
```

Flow edge:

```text
[FROM, TO, STATUS, SOURCE_REFS]
```

where `SOURCE_REFS` is an array with 1–2 `S#@L#` strings.

For an `UNKNOWN` simple claim:
- value, when present, must be the empty string;
- source reference must be the empty string.

Arrays represent unresolved optional collections as `[]`.

The model does not emit blockers or a verdict.

## 6. Bounds

The v10 wire is intentionally smaller than v9:

```text
semantic owners:       max 3
flow edges:             max 3
other boundaries:       max 2
tests/contracts:        max 2
source refs / flow:     max 2
source refs / non-flow: exactly 1 for non-UNKNOWN claims
label/from/to/value:    max 48 characters
source ref:             bounded `S1..S16@L<positive integer>`
```

These are generic report bounds, not case-specific expected-answer counts.

A mechanical regression must construct the largest schema-valid compact payload and prove its minified UTF-8 representation stays under a frozen conservative byte ceiling. The ceiling is an engineering guardrail against serialization drift; it is not a semantic score and does not claim an exact tokenizer mapping.

Initial ceiling:

```text
MAX_COMPACT_WIRE_BYTES = 2400
```

The fixed runtime generation policy remains unchanged:

```text
n_predict = 768
ctx_size = 16384
seed = 42
temperature = 0
```

## 7. Mechanical validation

v10 expands the compact wire into the same normalized semantic representation used by candidate evaluation.

Evaluator rules remain generic:

1. scope must equal the case's candidate scope;
2. every non-UNKNOWN simple/named claim must carry a valid supplied line reference;
3. every flow edge must carry 1–2 valid supplied line references;
4. `UNKNOWN` simple claims carry no affirmative value/reference;
5. no source path, blocker list, final verdict, implementation code, or release choice is accepted as extra wire fields;
6. at least one resolved semantic owner is required for full support;
7. at least one resolved flow edge is required for full support;
8. request identity, no-extra-I/O, tests/contracts, generated/release boundary, and narrowest boundary remain required generic completion categories;
9. `CONFLICT` remains evaluator-significant;
10. evaluator derives blockers and verdict exactly from normalized state.

`otherBoundaries` remains optional for mechanical full support, matching v9 behavior; hidden qualitative assertions may still require domain-specific boundaries after execution.

## 8. Compatibility

### v8

`impact-scope-grounded-flow-v8` remains byte/meaning compatible for the validated Usage Dashboard lane.

### v9

`candidate-grounded-impact-report-v9` remains loadable and revalidatable exactly as historical evidence. The DevPass case remains bound to v9 and is never silently migrated to v10.

### v10

Only future newly frozen candidate cases may opt into v10.

## 9. Regression plan

Before any new prospective model output:

1. Python compile passes;
2. all existing Agent Skill tests pass;
3. all existing live-eval harness tests pass;
4. v8 schema/prompt/derived verdict behavior remains unchanged;
5. v9 DevPass contract SHA/shape remains unchanged in the repository data path;
6. v10 synthetic tests cover valid source-line resolution and reject unknown block IDs, absent line numbers, malformed refs, invalid tuples, oversized cardinalities, model-owned extra fields, and UNKNOWN-with-affirmative-data;
7. v10 synthetic tests mechanically derive `SUPPORTED`, `PARTIAL`, `UNKNOWN`, and `CONFLICT`;
8. receipt revalidation persists v10 derived blockers/verdict;
9. compact-wire maximum-size regression remains <= 2400 minified UTF-8 bytes;
10. `PILOT_VALIDATED_SCOPES` remains exactly unchanged.

After merge:

11. fresh Usage Dashboard v8 3B regression must remain `PAIR_VALID` with with-skill `SUPPORTED` before any new candidate proof;
12. retired SimCore, Termux, Voyage, and DevPass held-outs are not reused as fresh independent proof.

## 10. Next independent proof boundary

A new prospective held-out must be selected and frozen **after v10 implementation is green but before any model output for that case**.

Its task, hidden assertions, candidate scope, source snapshot, and bounded context profile must be recorded before inference.

The new case must not reuse the exact SimCore 3M-3, Termux background-autosave, Voyage visible-refresh, or DevPass missing-artifact-recovery held-outs as independent evidence.

No candidate scope promotion follows automatically from one future PASS.

## 11. Non-goals

This repair does not:
- increase AI/model credits;
- increase the fixed generation token budget;
- change Qwen/llama pins;
- add product/plugin runtime code;
- create DevPass `latest.js`;
- change publisher/release authority;
- change any device behavior;
- add a semantic fact checker;
- encode hidden expected semantic answers;
- promote any candidate scope.

## 12. Current conclusion

```text
v8 validated Usage Dashboard lane = PASS
v9 candidate infrastructure = mechanically implemented
v9 first DevPass independent execution = EXECUTION_INCOMPLETE / retired
proven next gap = candidate structured serialization budget
selected repair = v10 compact tuple wire + opaque source-line refs
implementation = NOT STARTED
new independent held-out = NOT YET SELECTED
scope promotion = NONE
```
