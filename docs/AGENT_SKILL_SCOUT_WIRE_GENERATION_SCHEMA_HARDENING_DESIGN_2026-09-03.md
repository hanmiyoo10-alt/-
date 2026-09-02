# Agent Skill Scout Wire Generation-Schema Hardening Design — 2026-09-03

Date: 2026-09-03 KST

Status: **DESIGN FROZEN · DIAGNOSIS-DRIVEN · ZERO MODEL CALLS · NO O4-C REWRITE · NO ROLE-CONTRACT VERSION CHANGE · NO MODEL ASSIGNMENT**

Tracking authority: issue #1120. O4-C timeout recovery final observed evidence is comment `5512644062`.

Baseline at design start: `main=eb8d08da0ed55b5bb0ee6823dbbf98344a20ee3f`.

## 1. Diagnosis

The frozen O4-C Scout retrospective slice has two completed candidate rows and both are parseable JSON but contract-invalid:

- Qwen2.5 3B: `INVALID`;
- Ministral 3B attempt #2: `INVALID`;
- Ministral attempt #1 remains separately retained as `TIMEOUT_NO_RESULT`.

Independent artifact read-back shows the same failure class in both completed responses: a `k="s"` source-selection record carries semantic prose instead of the contract-fixed value `relevant_source`.

Current code has a narrow generation-schema / validator gap:

- `scout_response_schema()` allows `v` to be any bounded non-empty string for both record kinds;
- `validate_scout_wire()` correctly requires `k=s -> v=relevant_source`.

The validator is behaving correctly. The generation schema is weaker than the already-frozen wire contract.

## 2. Frozen evidence boundary

This change must not mutate, retry, or reclassify O4-C evidence.

Frozen identities include:

- benchmark target `79a034d0fd589d13e536f7d54291773287d7b06e`;
- EvidencePackage canonical SHA256 `06c345cde924c8dc8e84d1c65a03d9ee8b2a477ea856f5abd0603444485b4d97`;
- fixture SHA256 `196905603a4c291dbce17744c20bf004c1e9a05c331e1bb7acdd38cca9fa3c6f`;
- prompt SHA256 `8973db5c8ebf8c54a6dff2aee38769efab2c76999821084cdb4f5d240833a876`;
- Qwen result/score `eb7e87bad1dbccc899e18672a9fea528b52b920cf4a82bc4db637014b07fbc08` / `7741d4f44ca59079c56590f6aa0e0ff039688862928f998b2f8a6e1efc1966ad`;
- Ministral result/score `195f66b52261d14d7cee81018e0888808a0fbc6233d29a3435fa9f607a2513b5` / `3e32550a33b5cf2daea19be74625aa8de888a55450418914be45c00055939820`;
- aggregate summary `1a85edc7975aebf90d94e51166086c67d5d67067e9da47c0c125ff5c5f76f8ab`;
- recovery summary `358199687d246ba4b22614452dd50e68da136a0bf12fe98d5e99c787b73350fb`;
- recovery artifact ZIP `6566de64e3e6c8676834f11c3f51f4e906c4e94cf04e4334d5c3e1b603c43a64`.

Any future measured run is a new slice with a new harness/result identity.

## 3. Minimal implementation

Change only:

- `tools/agent-skill-orchestrator/roles/scout.py::scout_response_schema()`;
- focused Scout runtime tests.

Do **not** change call-site API. Existing `scout_response_schema()` callers remain untouched.

Do not change:

- `scout-compact-wire-v3` bytes or identity;
- `validate_scout_wire()` semantics;
- Scout prompt text;
- evidence construction;
- model registry or production Scout binding;
- generation parameters;
- llama.cpp runtime identity;
- O4 scorer/aggregator;
- Local Usage Dashboard, SimCore, release, or device state.

### 3.1 Record schema

Replace the single broad record object with a disjoint `oneOf` containing exactly two closed record shapes.

Source-selection branch:

- `k` enum is exactly `["s"]`;
- `v` enum is exactly `["relevant_source"]`, read from the existing role contract's `source_selection_value`;
- `r` keeps the existing ref shape/min/max constraints.

Authority branch:

- `k` enum is exactly `["a"]`;
- `v` keeps the existing bounded non-empty string constraint;
- `r` keeps the existing ref shape/min/max constraints.

This closes the exact observed failure without inventing a second authority registry or widening the change into evidence-bound schema plumbing.

Authority value/ref-class agreement, known-ref membership, duplicate refs, byte ceiling, and all other semantic checks remain deterministic-validator responsibilities.

## 4. Pinned runtime compatibility

The pinned llama.cpp identity remains release `b10516`, source commit/digest `b95502ba9`, artifact SHA256 `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`.

Exact pinned upstream `common/json-schema-to-grammar.cpp` explicitly handles `oneOf`/`anyOf`, `const`, and `enum`. The proposed schema uses only the already-used object/array/string constraints plus `oneOf` and `enum`.

The converter evidence does not establish grammar enforcement for every JSON Schema keyword such as `uniqueItems`; therefore the deterministic validator remains final authority and this design makes no grammar-completeness claim.

## 5. Regression proof

Zero-model-call focused tests must prove:

1. the response schema is still closed and capped at 12 records;
2. it contains exactly two disjoint record branches;
3. the `s` branch permits only `v=relevant_source`;
4. the `a` branch preserves the previous bounded string surface;
5. both branches preserve required fields and 1..3 ref bounds;
6. the observed Qwen and Ministral `k=s` semantic-prose shapes are outside the source-selection branch candidate space;
7. valid compact wire still validates and produces the same deterministic RoleArtifact semantics;
8. invalid semantic prose still fails `validate_scout_wire()`;
9. Scout prompt bytes, role-contract bytes/id, generation constants, model binding, scorer, and aggregator remain unchanged;
10. Agent Skills CI and SimCore required CI pass on the exact head.

No runtime model download or inference belongs in normal CI for this slice.

## 6. Rollout

After implementation:

1. focused regressions;
2. Agent Skills CI + SimCore required CI on exact PR head;
3. exact-head merge;
4. merged-main regression/read-back;
5. record zero model calls and unchanged O4-C evidence in #1120.

Do **not** rerun frozen O4-C as part of this change. A future live or retrospective test using the hardened generation schema must be separately frozen and counted as new measured evidence.

O5 assignment remains blocked until O4 has semantically scorable evidence sufficient for an assignment policy.

## 7. Non-goals

This design does not:

- make old INVALID rows valid;
- retry Qwen or Ministral;
- select a model family;
- create O5 thresholds/weights/tie-breaks;
- change the wire contract version;
- weaken validation;
- alter the historical prompt/evidence;
- add hosted AI;
- expand validated plugin scopes;
- promote SimCore;
- touch plugin/product/runtime release bytes;
- claim full validator equivalence from JSON Schema grammar.

## 8. Exit

PASS requires a minimal schema-only implementation, focused tests, exact-head CI, merged-main regression, zero model calls, frozen O4-C preservation, and a repository evidence record in #1120. Only then may a separate measured evaluation slice be designed.