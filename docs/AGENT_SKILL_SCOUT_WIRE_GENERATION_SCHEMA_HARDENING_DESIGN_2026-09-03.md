# Agent Skill Scout Wire Generation-Schema Hardening Design — 2026-09-03

Date: 2026-09-03 KST

Status: **DESIGN FROZEN · DIAGNOSIS-DRIVEN · ZERO MODEL CALLS · NO O4-C REWRITE · NO ROLE-CONTRACT VERSION CHANGE · NO MODEL ASSIGNMENT**

Tracking authority: issue #1120. O4-C timeout recovery final observed evidence is comment `5512644062`.

Baseline at design start: `main=eb8d08da0ed55b5bb0ee6823dbbf98344a20ee3f`.

## 1. Why this design exists

The frozen O4-C Scout retrospective slice now has one completed observed row for each candidate family:

- Qwen2.5 3B: `INVALID`, parseable JSON, contract invalid;
- Ministral 3B attempt #2: `INVALID`, parseable JSON, contract invalid;
- Ministral attempt #1 is separately retained as `TIMEOUT_NO_RESULT` and is not erased by the completed second attempt.

The timeout recovery removed the infrastructure confounder. Independent artifact read-back showed both completed model responses fail the same Scout compact-wire contract class: a `k="s"` source-selection record carries semantic prose rather than the contract-fixed value `relevant_source`.

The current generation schema and the current deterministic validator do not express the same constraint set:

- `scout_response_schema()` constrains `k` to `a|s`, constrains `v` only as a bounded non-empty string, and constrains refs only by shape;
- `validate_scout_wire()` additionally requires `k=s -> v=relevant_source`, requires every ref to exist in the supplied EvidencePackage, and requires an authority record's value and refs to agree on one supplied authority class.

The observed failures therefore expose a **generation-schema / validator constraint gap**. This design closes only the mechanically expressible part of that gap. It does not reinterpret the frozen benchmark output as valid and it does not weaken the validator.

## 2. Frozen evidence that must not change

This work must not mutate or replace any O4-C observed evidence:

- original benchmark target: `79a034d0fd589d13e536f7d54291773287d7b06e`;
- frozen EvidencePackage canonical SHA256: `06c345cde924c8dc8e84d1c65a03d9ee8b2a477ea856f5abd0603444485b4d97`;
- frozen fixture SHA256: `196905603a4c291dbce17744c20bf004c1e9a05c331e1bb7acdd38cca9fa3c6f`;
- frozen prompt SHA256: `8973db5c8ebf8c54a6dff2aee38769efab2c76999821084cdb4f5d240833a876`;
- Qwen result SHA256: `eb7e87bad1dbccc899e18672a9fea528b52b920cf4a82bc4db637014b07fbc08`;
- Qwen score SHA256: `7741d4f44ca59079c56590f6aa0e0ff039688862928f998b2f8a6e1efc1966ad`;
- Ministral result SHA256: `195f66b52261d14d7cee81018e0888808a0fbc6233d29a3435fa9f607a2513b5`;
- Ministral score SHA256: `3e32550a33b5cf2daea19be74625aa8de888a55450418914be45c00055939820`;
- O4-C aggregate summary SHA256: `1a85edc7975aebf90d94e51166086c67d5d67067e9da47c0c125ff5c5f76f8ab`;
- recovery summary SHA256: `358199687d246ba4b22614452dd50e68da136a0bf12fe98d5e99c787b73350fb`;
- recovery artifact ZIP SHA256: `6566de64e3e6c8676834f11c3f51f4e906c4e94cf04e4334d5c3e1b603c43a64`.

No result or score is reclassified after this change. Any future benchmark run is a new measured slice with a new execution identity.

## 3. Authority and compatibility facts

Current Scout wire authority remains:

- `tools/agent-skill-orchestrator/role-contracts/scout.json` (`scout-compact-wire-v3`);
- `tools/agent-skill-orchestrator/roles/scout.py::validate_scout_wire()` for deterministic semantic validation;
- `tools/agent-skill-orchestrator/roles/scout.py::scout_response_schema()` for local structured-generation schema.

The pinned llama.cpp runtime is still release `b10516`, commit/source digest `b95502ba9`, and artifact SHA256 `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`.

Exact pinned upstream source `common/json-schema-to-grammar.cpp` at `b95502ba9` explicitly handles `oneOf`/`anyOf`, `const`, and `enum`. That is sufficient for the proposed disjoint record variants and exact string candidate sets. The same source does not provide evidence here that `uniqueItems` is enforced by grammar conversion, so this design does **not** claim grammar-level completeness. The deterministic validator remains mandatory.

## 4. Narrow implementation

Change only the Scout **generation schema construction and its call sites/tests**.

Do not change:

- `scout-compact-wire-v3` identity or fields;
- `validate_scout_wire()` acceptance semantics;
- the Scout prompt text;
- generation temperature/seed/n_predict/context/threads;
- llama.cpp runtime identity;
- model registry or Scout production model binding;
- O4 scorer/aggregator;
- plugin/product/release/device state.

### 4.1 Evidence-bound schema API

Replace the context-free generation schema call with an evidence-bound form:

```python
scout_response_schema(evidence_package)
```

The function validates the EvidencePackage first, then derives only bounded candidates already present in that package.

Every production/pilot/benchmark call site that already owns the same EvidencePackage passes it to the schema builder. No new repository read, network request, model call, or dynamic authority lookup is added.

### 4.2 Record variants

The `r.items` schema becomes a disjoint `oneOf` union.

**Source-selection variant**

- `k` is exactly `s`;
- `v` is exactly the contract's `source_selection_value` (`relevant_source`);
- each ref candidate is drawn only from source refs present in the supplied EvidencePackage;
- existing min/max ref bounds and object closure remain.

**Authority variants**

Generate one variant for each authority class actually present in the supplied EvidencePackage:

- `k` is exactly `a`;
- `v` is exactly that supplied authority class;
- each ref candidate is drawn only from refs whose supplied `authority_class` equals that variant's class;
- existing min/max ref bounds and object closure remain.

This lets the grammar express the observed missing cross-field constraint without copying project-specific mutable paths, versions, or source facts into the role contract.

### 4.3 What remains validator-only

The schema is a generation aid, not the final contract authority.

`validate_scout_wire()` continues to enforce at least:

- exact top-level and record fields;
- byte ceiling;
- record count;
- ref count;
- ref existence;
- duplicate-ref rejection;
- `k=s -> relevant_source`;
- authority value/ref-class agreement;
- canonical wire size.

Any property not proven enforced by the pinned grammar converter remains validator-owned. In particular, do not claim `uniqueItems` is grammar-enforced merely because it appears in JSON Schema.

## 5. Empty and degenerate EvidencePackage behavior

A valid EvidencePackage may still contain zero relevant model selections, but its source inventory itself is bounded and validated before prompt execution.

Schema construction must fail closed if it cannot build a valid candidate set from a malformed EvidencePackage. It must never widen refs to a regex-only arbitrary `S#@L#` universe as a fallback.

If the supplied package has source refs but only one authority class, only that authority variant is emitted. No absent authority class is invented.

The existing valid empty model response `{"r":[]}` remains possible and still projects deterministically to UNKNOWN downstream.

## 6. Regression proof

Focused tests must prove mechanically, without model calls:

1. the source-selection branch permits only `k=s`, `v=relevant_source`, and refs present in the supplied EvidencePackage;
2. authority branches contain only authority classes actually present and refs belonging to each class;
3. the two observed O4-C failure shapes are outside the generated schema candidate space because their `k=s` values are semantic prose;
4. a valid compact-wire response remains accepted by `validate_scout_wire()`;
5. an authority record cannot use a ref from another authority-class branch at generation-schema level;
6. UNKNOWN/empty `r` remains representable;
7. role contract bytes and contract id remain unchanged;
8. Scout prompt bytes for the same EvidencePackage remain unchanged;
9. no model registry/generation/runtime/scorer/aggregator constant changes;
10. all call sites pass the exact EvidencePackage they already use to build the Scout prompt;
11. existing Agent Skills CI and SimCore required CI remain green.

A source-level compatibility regression should also pin the design assumption that the frozen llama.cpp converter supports the selected schema vocabulary (`oneOf` plus `enum`/`const`). This proof may be repository-source/document based; it must not silently download or execute a model in normal CI.

## 7. Rollout boundary

Implementation/CI is zero-model-call work.

After exact-head PR CI and merged-main regression are green, do **not** rerun the frozen O4-C rows and do not call their new output a repair of old evidence.

A future live/runtime or retrospective evaluation using the hardened schema requires a separately frozen execution plan, exact request accounting, and new result identities. O5 assignment remains blocked until O4 has semantically scorable evidence sufficient for a threshold/assignment policy.

## 8. Non-goals

This design does not:

- make either O4-C INVALID row valid;
- retry Qwen or Ministral;
- choose Qwen vs Ministral;
- create O5 thresholds or assignments;
- change the Scout compact-wire contract version;
- loosen deterministic validation;
- shorten the historical prompt or alter frozen evidence;
- add a hosted AI path;
- expand `PILOT_VALIDATED_SCOPES`;
- promote SimCore;
- touch Local Usage Dashboard Product/Plugin/Engine/Manager/release bytes;
- assert that JSON Schema grammar enforcement is complete.

## 9. Exit

This design slice exits when:

1. the design is recorded before implementation;
2. the evidence-bound schema change is minimal and validator-preserving;
3. focused regressions prove the observed semantic-prose failure shape cannot be generated by the hardened candidate grammar;
4. all known Scout call sites are updated coherently;
5. Agent Skills CI and SimCore required CI pass on the exact PR head;
6. the exact tested head is merged and merged-main regressions/read-back pass;
7. no model calls occur in the implementation/CI slice;
8. issue #1120 records the resulting boundary and explicitly keeps O4-C historical evidence frozen.

Only after that exit may a separate measured evaluation slice be designed.