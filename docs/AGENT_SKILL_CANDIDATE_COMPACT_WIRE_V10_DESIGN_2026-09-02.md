# Agent Skill Zero-Credit Eval — Candidate Compact Wire v10 Design

Status: **DESIGN FROZEN AFTER FIRST v9 EXECUTION FAILURE · IMPLEMENTATION IN PROGRESS**

Date: 2026-09-02

Original implementation baseline: `827ccfccf9a4c2883e708c779fca1fb84c73de8d`
Finalization baseline main: `88b3f0a84643ff9bc06ac597cd6094aa25f16b38`

Evidence authority:
- v9 implementation merge: PR #1219 / `b8323f8c1a5f047e5e36c93c019b9306c6d4f7f4`
- validated Usage Dashboard v8 regression: run `33538474451`, artifact `9812836158`, `PAIR_VALID`, with-skill `SUPPORTED`
- first DevPass v9 prospective one-shot: run `33539270383`, artifact `9813180229`, pair `EXECUTION_INCOMPLETE`
- first DevPass artifact ZIP SHA256: `6cd99782bf6cead221b5f55c09ff856f8cfc1bf1a00ca87323d202ff528b208c`
- diagnosis record: issue #1120 comment `5498085589`

## Proven failure

The first prospectively frozen DevPass candidate execution reached the local model successfully in both modes, but both completions consumed exactly the fixed `n_predict=768` budget and ended with `finish_reason=length`.

The failure is at the candidate grounded-report serialization/completion-budget layer. v9 remains immutable historical evidence and must stay supported unchanged.

## Hard boundary

Do not repair this by increasing `n_predict` or by rerunning DevPass as fresh independent proof.

The repair is additive under a new contract ID:

`candidate-grounded-impact-report-v10`

No hidden project answer may be introduced. The model still chooses authority interpretation, semantic owners, semantic flow edges, preservation boundaries, tests/contracts, generated/release boundary, and narrowest supported boundary. The evaluator owns source-locator validity, generic category completion, blockers, and final verdict.

## Source reference v10

Replace copied anchor prose with opaque source-line references such as `S4@L8`.

- `S4` is the supplied source-block ID.
- `L8` is an original line number already present in that exact extracted block.
- The evaluator proves only that the referenced supplied line exists; it does not treat line existence as semantic correctness.
- No expected owner, edge, path, line, assertion, or status is encoded in a v10 case contract.

## Compact wire

Conceptual mapping:

- `scope` -> `scope`
- `authority` -> `a`
- `semanticOwners` -> `o`
- `flowEdges` -> `f`
- `preservation.requestIdentity` -> `p.ri`
- `preservation.noExtraIo` -> `p.io`
- `preservation.otherBoundaries` -> `p.b`
- `testsContracts` -> `t`
- `generatedRelease` -> `g`
- `narrowestBoundary` -> `n`

Tuples:

- simple claim with value: `[STATUS, VALUE, SOURCE_REF]`
- simple claim without value: `[STATUS, SOURCE_REF]`
- named claim: `[LABEL, STATUS, SOURCE_REF]`
- flow edge: `[FROM, TO, STATUS, SOURCE_REFS]`

For `UNKNOWN` simple claims, affirmative value/reference must be empty. Optional collections use `[]`. The model never emits blockers or a verdict.

## Frozen generic bounds

- semantic owners: max 3
- flow edges: max 3
- other preservation boundaries: max 2
- tests/contracts: max 2
- source refs per flow: 1–2
- source refs per non-flow affirmative claim: exactly 1
- label/from/to/value: max 48 characters
- source ref grammar: `S1..S16@L<positive integer>`
- minified maximum-wire regression ceiling: `2400` UTF-8 bytes

Generation remains unchanged: `n_predict=768`, `ctx_size=16384`, `seed=42`, `temperature=0`.

## Mechanical validation

v10 expands the compact wire to the same normalized candidate semantic representation used for derived blockers/verdict.

Rules:
1. scope equals the candidate scope;
2. every non-UNKNOWN simple/named claim carries a valid supplied line reference;
3. every flow carries 1–2 valid supplied line references;
4. UNKNOWN simple claims carry no affirmative value/reference;
5. extra model-owned blocker/verdict/source-path/release-choice fields are rejected;
6. full support requires at least one resolved semantic owner and one resolved flow edge;
7. request identity, no-extra-I/O, tests/contracts, generated/release boundary, and narrowest boundary remain required generic completion categories;
8. CONFLICT remains evaluator-significant;
9. evaluator alone derives blockers and verdict.

`otherBoundaries` is not mechanically required for full support, matching v9 generic behavior.

## Compatibility

- v8 remains byte/meaning compatible for validated Usage Dashboard.
- v9 remains loadable/revalidatable unchanged; consumed DevPass remains bound to v9.
- only future newly frozen candidate cases may opt into v10.
- `PILOT_VALIDATED_SCOPES` remains unchanged.

## Regression gate

Before any new prospective model output:
1. Python compile;
2. all Agent Skill tests;
3. all live-eval harness tests;
4. v8 behavior unchanged;
5. v9 DevPass contract identity/shape unchanged;
6. v10 source-line accept/reject tests;
7. tuple/cardinality/UNKNOWN fail-closed tests;
8. deterministic SUPPORTED/PARTIAL/UNKNOWN/CONFLICT tests;
9. receipt persistence of v10 derived blockers/verdict;
10. largest schema-valid compact payload <= 2400 minified UTF-8 bytes;
11. no scope promotion.

After merge, a fresh Usage Dashboard v8 3B regression must remain `PAIR_VALID` with with-skill `SUPPORTED` before any new candidate proof.

Retired SimCore, Termux, Voyage, and DevPass held-outs are diagnostic only and are not reused as fresh independent proof.
