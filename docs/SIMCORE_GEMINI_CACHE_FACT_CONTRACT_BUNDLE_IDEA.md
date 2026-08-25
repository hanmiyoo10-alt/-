# SimCore Gemini Cache Fact Contract Bundle — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · MACHINE-READABLE CACHE CONTRACT BUNDLE · CI-FIRST · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`

Related:
- `docs/SIMCORE_GEMINI_CACHE_OBSERVER_OWNERSHIP_REGISTRY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_FACT_SCHEMA_CONTRACT_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_FACT_DEPENDENCY_GRAPH_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_TELEMETRY_BUDGET_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_RETENTION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_SAMPLE_LIFECYCLE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define one deterministic machine-readable bundle that compiles the cache-observability contracts already owned by separate design layers into a single CI/tooling view.

The Bundle exists so CI can answer, for every cache fact:

```text
Who owns it?
Which payload schema/version does it use?
Which upstream facts may it depend on?
What dependency edge classes are legal?
What authority/status semantics are expected?
What runtime observation-cost class applies?
What retention class applies?
What privacy boundary applies?
Which consumers are allowed?
Did any of those contracts drift without declaration?
```

The Bundle is a compiled contract index. It is not a new semantic authority, runtime service, event bus, cache controller, or prompt component.

## 2. Constitutional boundary

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The Contract Bundle may describe cache-observability contracts only. It must never authorize SimCore to:

```text
write or rewrite renderer prose
rewrite chat history
move prompt sections automatically
change model instructions because of cache telemetry
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

Bundle content is sidecar/CI material and must never be injected into the model prompt merely for observability.

## 3. Core architecture — compiled view, not new authority

The existing contracts retain their semantic ownership.

```text
Observer Ownership Registry
= WHO owns each fact

Fact Schema Contract
= WHAT each fact means / looks like

Fact Dependency Graph
= WHAT each fact may depend on

Telemetry Budget
= HOW EXPENSIVE observation may be

Retention Policy
= HOW LONG evidence may survive

Contract Bundle
= deterministic compiled view of the above
```

Required rule:

> A human must not be able to change cache semantics merely by editing the generated Bundle.

If Bundle content conflicts with the owning source contract, that is a CI/tooling error, not permission to reinterpret the source contract.

## 4. Avoid a second source of truth

Bad design:

```text
registry says producer = cache-prefix-map
bundle JSON says producer = cache-sentinel
runtime picks bundle JSON because it is newer
```

Required behavior:

```text
CONTRACT_BUNDLE_MISMATCH
→ CI FAIL
```

The Bundle must not become a hand-maintained duplicate of all source contracts.

Preferred future implementation options, in order:

```text
1. small machine-readable contract fragments owned beside their semantic producer
   → deterministic bundle compiler

2. checked-in canonical contract source
   + generated bundle materialization

3. documentation-derived generation only if parsing remains explicit and robust
```

Do not scrape arbitrary prose headings with brittle heuristics and call that contract authority.

Any migration from idea documents to machine-readable implementation authority must be a deliberate architecture step with fixtures and evidence.

## 5. Contract Bundle vs Prompt Stability Manifest

These are separate systems.

```text
Prompt Stability Manifest
= cache-critical model-prompt construction contract

Cache Fact Contract Bundle
= cache-observability data/ownership/dependency contract
```

Changing the Fact Contract Bundle schema must not itself count as a Gemini prompt ABI change.

Likewise changing prompt bytes does not automatically mean cache fact schemas changed.

The two may reference stable ABI identities where needed, but must not collapse into one version number or authority.

## 6. Bundle shape

Conceptual top-level form:

```json
{
  "bundleSchemaVersion": 1,
  "factEnvelopeSchemaVersion": 1,
  "facts": [
    {
      "factId": "CACHE_FIRST_BREAK",
      "producerId": "cache-prefix-map",
      "producerRole": "AUTHORITATIVE_PRODUCER",
      "factSchemaVersion": 1,
      "stage": "ATTRIBUTION",
      "runtimeCostClass": "T1_STANDARD",
      "retentionClass": "R2_ACTIVE_SAMPLE_WINDOW",
      "privacyClass": "BOUNDED_METADATA_ONLY",
      "fallbackStatus": "UNKNOWN",
      "dependencies": [],
      "allowedConsumers": [
        "cache-verdict-compiler",
        "cache-evidence-chain",
        "diagnostics"
      ]
    }
  ]
}
```

Exact enum spellings are implementation-time work. The important design is that the fields are deterministic, bounded, and cross-checkable.

## 7. Candidate per-fact fields

Initial machine-readable fields may include:

```text
factId
producerId
producerRole
factSchemaVersion
stage
authorityClass
runtimeCostClass
retentionClass
privacyClass
fallbackStatus
allowedStatuses
dependencies[]
allowedConsumers[]
forbiddenDuplicateWork[]
externalAuthorityId when applicable
correctionPolicyClass
```

Do not include raw prompt text, raw chat content, provider payload bodies, or source-code line numbers.

Implementation file paths may be useful as tooling metadata, but must not become semantic identity.

## 8. Stable semantic identity vs implementation location

The Bundle should remain stable across pure refactors.

Example:

```text
module file renamed
helper extracted
function moved

but
CACHE_FIRST_BREAK semantics/owner/schema/dependencies unchanged
```

Desired result:

```text
semantic contract bundle = SAME
```

Therefore:

```text
factId
producer semantic id
schema version
dependency contract
```

are ABI-relevant, while physical helper names and line numbers are not.

## 9. Dependency materialization

Dependencies should materialize the type-level graph, not request-instance evidence.

Example:

```json
{
  "factId": "CACHE_REQUEST_VERDICT",
  "dependencies": [
    {
      "factId": "CACHE_PROVIDER_RECEIPT",
      "edgeClass": "OPTIONAL_SAME_REVISION"
    },
    {
      "factId": "CACHE_RECEIPT_CORRELATION",
      "edgeClass": "OPTIONAL_SAME_REVISION"
    },
    {
      "factId": "CACHE_FIRST_BREAK",
      "edgeClass": "OPTIONAL_SAME_REVISION"
    },
    {
      "factId": "CACHE_BASELINE_OBSERVATION",
      "edgeClass": "OPTIONAL_SAME_REVISION"
    }
  ]
}
```

Whether an input is required for a particular strong verdict may also depend on Admission Policy / verdict rules. The Bundle should reference those declared policy classes rather than duplicate the full verdict decision tree.

Do not place concrete request IDs or evidence-instance edges in the Bundle; those belong to the Evidence Chain.

## 10. External authority handling

Facts originating outside SimCore need explicit external-authority metadata.

Conceptual:

```json
{
  "factId": "CACHE_PROVIDER_RECEIPT",
  "producerRole": "EXTERNAL_AUTHORITY",
  "externalAuthorityId": "approved-gateway-provider-receipt-source",
  "localNormalizer": "receipt-normalizer",
  "fallbackStatus": "UNVERIFIED"
}
```

This must preserve the rule:

```text
external fact unavailable
→ UNVERIFIED
```

not:

```text
local fingerprint infers provider HIT/MISS
```

The Bundle must fail validation if a local SimCore component is registered as authoritative producer for provider-only facts without a separate approved authority migration.

## 11. Cost and retention are contract dimensions, not implementation trivia

`runtimeCostClass` and `retentionClass` belong in the Bundle because they constrain legal implementation behavior.

Example:

```text
CACHE_FIRST_BREAK
runtimeCostClass = T1_STANDARD
forbiddenDuplicateWork = SECOND_FULL_HISTORY_WALK
fallbackStatus = WITHHELD_BY_BUDGET or UNKNOWN
```

```text
CACHE_REGIME_SUMMARY
retentionClass = R5_REGIME_SUMMARY
```

A consumer must not quietly upgrade a fact's runtime cost by recomputing it through a more expensive path.

A retention implementation must not keep a fact forever merely because the Bundle lists it.

The Bundle points to the class; Telemetry Budget and Retention Policy still own the class semantics.

## 12. Privacy is first-class

Every fact should be classifiable by a bounded privacy/data-shape contract.

Candidate classes:

```text
BOUNDED_ENUM_ONLY
BOUNDED_NUMERIC_METADATA
BOUNDED_DIGEST_METADATA
BOUNDED_PROVENANCE_REFS
BOUNDED_SUMMARY_METADATA
EXTERNAL_EPHEMERAL_RAW_ONLY
```

The exact vocabulary is future design work.

Hard invariant:

```text
raw prompt/history/user/assistant body
= not legal persistent Bundle payload material
```

The Bundle itself must contain no user-specific runtime evidence.

## 13. Bundle canonicalization

Generated Bundle materialization must be deterministic.

Required:

```text
fixed fact ordering
fixed field ordering or canonical serializer
stable enum spellings
explicit bundleSchemaVersion
explicit factSchemaVersion per fact
no generation timestamp inside semantic digest
no random UUID
no runtime generation
no machine path in semantic digest
no host-specific ordering
```

Operational metadata such as `generatedAt` may exist outside the canonical semantic payload if tooling truly needs it.

## 14. Bundle digest

A deterministic digest may provide one compact identity for the cache-observability contract set.

Conceptual:

```text
cacheFactContractBundleDigest
= HASH(canonical semantic Bundle payload)
```

Use cases:

```text
CI comparison
fixture provenance
release evidence
fast contract equality
```

Do not use this digest as:

```text
Gemini prompt Cache ABI identity
request identity
CACHE_REGIME identity
provider cache key
```

Those are separate concepts.

## 15. Anti-self-certification rule

The Bundle must not allow a candidate build to certify itself merely by regenerating expected output from its own current implementation.

Bad workflow:

```text
implementation changes
→ regenerate Bundle
→ expected Bundle overwritten
→ CI PASS
```

Required separation:

```text
accepted contract/reference
vs
candidate materialization
```

A candidate materialization may be generated automatically, but semantically meaningful drift from the accepted reference requires explicit declaration/evidence.

## 16. Contract change intent

Use a narrow release-specific overlay rather than permanent `changeAllowed: true` flags.

Conceptual:

```text
CACHE_FACT_CONTRACT_INTENT = PRESERVE
```

Default:

```text
ownership/schema/dependency/cost/retention/privacy drift
→ FAIL if undeclared
```

For intentional change:

```text
CACHE_FACT_CONTRACT_INTENT = CHANGE_DECLARED
factId = CACHE_FIRST_BREAK
changeDimensions = [FACT_SCHEMA_VERSION, DEPENDENCY]
reason = <design/evidence ref>
```

Avoid:

```text
allowAllCacheContractChanges = true
```

Change intent is release/work-item evidence, not a permanent property of the fact.

## 17. Cross-contract validation

The Bundle compiler/validator should eventually prove at least:

```text
1. every registered fact has exactly one semantic producer contract
2. every fact references a known fact schema version
3. producerId matches Ownership Registry
4. external authority facts preserve external authority role
5. all dependency factIds exist
6. dependency edge classes are legal
7. same-revision dependency graph is acyclic
8. stage ordering is legal
9. consumer does not bypass registered producer
10. runtime cost class exists in Telemetry Budget contract
11. retention class exists in Retention Policy contract
12. fallbackStatus is legal under Fact Schema status vocabulary
13. privacy class is allowed for the fact payload
14. no superseded schema is marked current without migration
15. no implementation-only rename causes semantic drift
```

## 18. Candidate failure vocabulary

Possible CI errors:

```text
CACHE_CONTRACT_BUNDLE_SCHEMA_INVALID
CACHE_CONTRACT_BUNDLE_DUPLICATE_FACT
CACHE_CONTRACT_BUNDLE_OWNER_MISMATCH
CACHE_CONTRACT_BUNDLE_SCHEMA_MISSING
CACHE_CONTRACT_BUNDLE_SCHEMA_VERSION_MISMATCH
CACHE_CONTRACT_BUNDLE_UNKNOWN_DEPENDENCY
CACHE_CONTRACT_BUNDLE_DEPENDENCY_CYCLE
CACHE_CONTRACT_BUNDLE_STAGE_INVERSION
CACHE_CONTRACT_BUNDLE_EXTERNAL_AUTHORITY_COLLAPSE
CACHE_CONTRACT_BUNDLE_COST_CLASS_UNKNOWN
CACHE_CONTRACT_BUNDLE_RETENTION_CLASS_UNKNOWN
CACHE_CONTRACT_BUNDLE_STATUS_INVALID
CACHE_CONTRACT_BUNDLE_PRIVACY_CLASS_INVALID
CACHE_CONTRACT_BUNDLE_UNDECLARED_DRIFT
CACHE_CONTRACT_BUNDLE_REFERENCE_MATERIALIZATION_MISMATCH
```

These are contract/CI failures, not runtime defect severities.

## 19. Conformance Matrix relationship

The Bundle validates structural contract consistency.

The Cache Conformance Matrix validates behavior.

```text
Contract Bundle
= static architecture/data ABI consistency

Conformance Matrix
= executable input → admission → verdict → transition behavior
```

Both are required because a structurally valid contract can still implement the wrong behavior, and behavior fixtures can pass while architecture ownership silently duplicates work.

Future fixtures should include deliberate Bundle-invalid cases such as:

```text
duplicate producer
unknown dependency
same-revision cycle
external authority replaced by local inference
WITHHELD_BY_BUDGET fallback removed
retention class missing
privacy class widened without declaration
pure helper rename with no semantic Bundle drift
```

## 20. No runtime registry engine

The Bundle should not become a runtime graph interpreter.

Avoid:

```text
per-request Bundle traversal
runtime service locator
runtime dependency injection based on JSON
new event bus
graph database
semantic SnapshotStore expansion
```

Preferred implementation:

```text
CI/build validates Bundle
→ generated static facts/types/constants if helpful
→ ordinary direct module calls at runtime
```

Runtime overhead target from the Bundle itself should be effectively zero.

## 21. Release workflow relationship

If future implementation changes cache-observability contracts, normal SimCore workflow still applies:

```text
main design/evidence
→ work branch implementation
→ static/CI validation
→ release-simcore deployment if runtime code changed
→ real long-chat validation
→ main evidence sync
```

A docs-only Bundle idea does not authorize runtime implementation or deployment.

Do not mix a Cache Contract Bundle implementation with unrelated release-system restructuring.

## 22. Suggested rollout

```text
Phase 0
→ inventory currently planned facts and semantic owners

Phase 1
→ define tiny canonical machine-readable fragments for implemented facts only
→ no empty placeholder universe

Phase 2
→ deterministic Bundle compiler + static cross-contract validator
→ report-only first

Phase 3
→ make ownership/schema/dependency violations CI-blocking

Phase 4
→ add cost/retention/privacy contract validation

Phase 5
→ integrate with Cache Conformance Matrix and release evidence
```

Do not implement every cache idea merely because the Bundle can describe it.

## 23. Current classification

```text
GEMINI_CACHE_FACT_CONTRACT_BUNDLE
= HIGH VALUE
= MACHINE-READABLE CACHE OBSERVABILITY CONTRACT INDEX
= COMPILED VIEW, NOT NEW SEMANTIC AUTHORITY
= OWNERSHIP + SCHEMA + DEPENDENCY + COST + RETENTION CROSS-CHECK
= ANTI-SELF-CERTIFICATION
= CI-FIRST
= NEAR-ZERO RUNTIME OVERHEAD TARGET
= IDEA / DESIGN CANDIDATE

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```
