# SimCore Gemini Cache Fact Schema Contract — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · CACHE FACT DATA ABI · CI-FIRST · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`

Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_OBSERVER_OWNERSHIP_REGISTRY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_TELEMETRY_BUDGET_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_SAMPLE_LIFECYCLE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_ADMISSION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_COMPATIBILITY_KEY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_RECEIPT_CORRELATOR_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_TRANSITION_MODEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_GEMINI_PROMPT_STABILITY_MANIFEST_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define one shared data-ABI contract for cache-observability facts so a registered producer and all downstream consumers agree on:

```text
fact identity
fact payload schema
status / unknown semantics
revision semantics
authority metadata
privacy / retention bounds
canonical serialization rules
schema evolution / compatibility
```

The Ownership Registry answers:

```text
Who owns this fact?
```

The Fact Schema Contract answers:

```text
What exactly does this fact look like and what does each field mean?
```

This contract prevents a consumer from depending on undocumented producer internals or silently reinterpreting missing/unknown values.

It is not a new runtime service and does not itself produce cache evidence.

## 2. Constitutional boundary

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

Fact schemas may describe bounded cache-observability metadata only. They must never require SimCore to:

```text
write renderer prose
retain raw user/assistant content
rewrite chat history
move prompt sections automatically
change model instructions for cache reasons
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

Fact envelopes and schema metadata must never be injected into the main-model prompt merely for observability.

## 3. Architecture decision — common envelope, fact-specific payload

Do not create one giant object containing every cache field.

Preferred structure:

```text
CacheFactEnvelope
= common transport/provenance/status contract

payload
= fact-specific schema owned by the registered producer
```

Conceptual envelope:

```json
{
  "envelopeSchemaVersion": 1,
  "factId": "CACHE_FIRST_BREAK",
  "factSchemaVersion": 1,
  "producerId": "cache-prefix-map",
  "authorityClass": "LOCAL_DIRECT",
  "status": "AVAILABLE",
  "sampleId": "...",
  "sampleRevision": 3,
  "payload": {},
  "reasonCodes": [],
  "provenanceRefs": []
}
```

Operational metadata such as `capturedAt` may exist when needed, but must be kept outside semantic equality/digest material unless a specific fact contract explicitly says otherwise.

## 4. Fact identity is stable semantic identity

`factId` must name a semantic fact, not an implementation file/function.

Good:

```text
CACHE_FIRST_BREAK
CACHE_RECEIPT_CORRELATION
CACHE_PROVIDER_RECEIPT
CACHE_COMPATIBILITY
CACHE_BASELINE_OBSERVATION
CACHE_REQUEST_VERDICT
CACHE_TEMPORAL_TRANSITION
CACHE_REGIME_SUMMARY
CACHE_SAMPLE_REVISION
CACHE_RETENTION_DECISION
CACHE_TELEMETRY_TIER
```

Bad:

```text
PREFIX_MAP_RESULT_V4_HELPER
CACHE_UTIL_27_OUTPUT
LINE_9182_HASH
```

A helper/file rename must not require fact identity changes when semantics are unchanged.

## 5. Envelope schema version and fact schema version are different

Required split:

```text
envelopeSchemaVersion
= shape shared by all cache facts

factSchemaVersion
= payload contract for one specific factId
```

Changing the common envelope does not automatically mean every payload ABI changed.

Changing `CACHE_FIRST_BREAK` payload does not automatically mean `CACHE_PROVIDER_RECEIPT` payload changed.

Do not use one global version number that forces unrelated fact consumers to migrate together.

## 6. Explicit status semantics — never overload null

`null`, missing field, empty string, and zero must not be used interchangeably to mean "unknown".

Initial common status vocabulary:

```text
AVAILABLE
UNKNOWN
UNVERIFIED
NOT_APPLICABLE
WITHHELD_BY_BUDGET
PENDING
AMBIGUOUS
SUPERSEDED
INVALID
```

### AVAILABLE

The registered producer produced the fact under the fact's declared authority rules.

This does not imply every downstream claim is allowed; Admission Policy still applies.

### UNKNOWN

The producer cannot determine the fact from currently available admissible inputs.

Example:

```text
Prefix Map cannot determine first break from available bounded topology
→ CACHE_FIRST_BREAK status = UNKNOWN
```

### UNVERIFIED

A candidate value/evidence exists, but the required authority is not established.

Example:

```text
provider cache metrics appear in an unapproved/unverified source
→ provider fact = UNVERIFIED
```

### NOT_APPLICABLE

The fact does not apply to this sample/request under the active contract.

This is different from unknown.

### WITHHELD_BY_BUDGET

The fact could require work that the active Telemetry Budget does not permit.

Example:

```text
exact first-break attribution would require forbidden second full-history scan
→ WITHHELD_BY_BUDGET
```

Consumers must not bypass the registered producer and recompute the fact privately.

### PENDING

The fact may become available when already-expected asynchronous evidence arrives.

Example:

```text
provider receipt not surfaced yet
→ CACHE_RECEIPT_CORRELATION = PENDING
```

`PENDING` must have a bounded lifecycle under the Sample Lifecycle / Retention Policy.

### AMBIGUOUS

Multiple defensible candidates remain and the producer refuses to force one result.

### SUPERSEDED

A newer revision replaces this fact instance.

A superseded fact may remain as provenance but must not continue influencing active consumers as current evidence.

### INVALID

The input/envelope/payload failed a contract check and must not be consumed as valid evidence.

## 7. Missing field is a schema error unless explicitly optional

Within `status = AVAILABLE`, required payload fields must be present.

Do not silently interpret missing required fields as `UNKNOWN`.

Example:

```text
CACHE_FIRST_BREAK status AVAILABLE
but payload.owner missing
→ FACT_SCHEMA_INVALID
```

If the producer does not know the owner:

```text
status = UNKNOWN
```

or a specifically documented field-level unknown representation must be used.

Prefer envelope-level unknown status when the whole fact cannot be established.

## 8. Authority class is typed and claim-scoped

A fact envelope should carry a bounded authority class describing how the fact was produced.

Candidate vocabulary:

```text
EXTERNAL_AUTHORITATIVE
EXTERNAL_BOUNDED
LOCAL_DIRECT
LOCAL_DERIVED
POLICY_DERIVED
DIAGNOSTIC_ONLY
```

Examples:

```text
Gemini cachedReadTokens from approved provider/gateway receipt
→ EXTERNAL_AUTHORITATIVE or EXTERNAL_BOUNDED according to verified source semantics

Prefix Map firstBreakOwner from direct bounded local topology
→ LOCAL_DIRECT / LOCAL_DERIVED according to implementation contract

Verdict Compiler output
→ POLICY_DERIVED
```

Authority class does not replace Evidence Admission Policy.

It is one input into claim-specific admission.

## 9. Sample identity and revision are mandatory where request-bound

Request-level facts must bind to the Sample Lifecycle identity rather than floating independently.

Conceptual:

```text
sampleId
sampleRevision
```

Rules:

```text
same request
+ later evidence
→ same sampleId, higher revision

same Compatibility Key
+ different request
→ different sampleId
```

Consumers must not treat revision 2 as a second request observation.

When a fact revision is superseded, dependent consumers must revoke/re-evaluate according to Sample Lifecycle rules.

## 10. Fact payloads must be bounded and privacy-safe

Hard default exclusions:

```text
raw prompt body
raw chat history
raw user text
raw assistant text
raw system prompt
full gateway log row
full provider response payload
unbounded request snapshot
```

Preferred payload material:

```text
enums
counts
lengths
digests/fingerprints
bounded reason codes
normalized model/provider family
bounded token metrics
segment IDs
compatibility identity
small numeric summaries
```

If raw/linkable data is temporarily needed to produce a fact, normalize it immediately and apply the Retention Policy.

## 11. Canonical serialization and semantic digest

Where a fact needs a deterministic digest/identity, define a canonical semantic payload.

Rules:

```text
fixed field order or canonical serializer
stable enum spellings
explicit schema version
no random values
no machine paths
no incidental object insertion order
no wall-clock timestamps in semantic digest by default
no runtime generation ID unless the fact's semantics genuinely require it
```

Important:

```text
fact semantic digest
!=
serialized entire envelope digest
```

Operational fields such as:

```text
capturedAt
retention pin
UI expansion state
local diagnostic sequence
```

must not cause a semantically unchanged fact to appear changed.

## 12. Initial fact contracts

The exact payloads remain implementation-time work, but the following ownership/schema boundaries are preferred.

### 12.1 CACHE_FIRST_BREAK

Producer:

```text
Cache Prefix Map
```

Candidate payload:

```text
owner
regionId
classification
firstBreakOrdinal / bounded location metadata
cacheShadowAfterBreak
localReusablePrefixMeasure when available
```

Must not include raw history/message bodies.

A consumer must not recompute first-break ownership.

### 12.2 CACHE_PROVIDER_RECEIPT

External authority:

```text
Usage Dashboard / approved receipt source
```

Candidate bounded payload:

```text
requestIdentityDigest when available
providerFamily
modelFamily
inputTokens
cachedReadTokens
cacheWriteTokens
cacheWrite5mTokens
cacheWrite1hTokens
metricSource
receiptSchemaVersion
```

Only fields whose semantics are verified by the receipt source may be `AVAILABLE`.

Gateway request HIT/replay and provider cached-token Read remain separate facts/fields.

### 12.3 CACHE_RECEIPT_CORRELATION

Producer:

```text
Cache Receipt Correlator
```

Candidate payload:

```text
correlationClass
matchedReceiptEvidenceId
signals[]
candidateCount
requestIdentityVerified
```

Correlation payload must not duplicate provider token metrics as newly-owned values; it may reference the matched provider fact.

### 12.4 CACHE_COMPATIBILITY

Producer:

```text
Cache Compatibility Key comparator
```

Candidate payload:

```text
compatibilityClass
keyDigestA
keyDigestB
reasonCodes[]
unknownDimensions[]
consumerPolicyId
```

The fact must preserve the rule:

```text
same compatibility population
!=
same request identity
```

### 12.5 CACHE_BASELINE_OBSERVATION

Producer:

```text
Cache Baseline Profile
```

Candidate payload:

```text
baselineState
sampleCount / recentWindowCount
materialDeviationClass
baseline summary metrics
comparison population identity
```

It must not expose an unbounded historical sample list.

### 12.6 CACHE_REQUEST_VERDICT

Producer:

```text
Cache Verdict Compiler
```

Candidate payload:

```text
verdictClass
verdictAuthority
reasonCodes[]
evidenceRefs[]
negativeEvidenceRefs[]
missingEvidence[]
contradictionRefs[]
```

This fact is request-local and severity-free.

It must not contain `WATCH / FIX / BLOCKER` as verdict state.

### 12.7 CACHE_TEMPORAL_TRANSITION

Live owner:

```text
Cache Regression Sentinel
```

Specification:

```text
Cache Verdict Transition Model
```

Candidate payload:

```text
previousTemporalState
nextTemporalState
transitionEvents[]
heldStateBeforeGap when relevant
compatibleSequenceIdentity
```

Do not turn request-level verdicts into temporal state names.

### 12.8 CACHE_REGIME_SUMMARY

Producer:

```text
Cache Regime Ledger
```

Candidate payload:

```text
regimeId
previousRegimeId
compatibilityPopulationIdentity
baselineBeforeSummary
baselineAfterSummary
regimeStatus
supportingEvidenceRefs[]
```

Do not require `regimeId` equality inside the structural Compatibility Key.

## 13. Fact references, not payload copying

Prefer references between facts over repeatedly copying the same authoritative values.

Example:

```text
CACHE_PROVIDER_RECEIPT
→ contains cachedReadTokens

CACHE_RECEIPT_CORRELATION
→ references matched provider fact

CACHE_REQUEST_VERDICT
→ references receipt + correlation + prefix + baseline facts
```

Avoid:

```text
receipt copied into correlation
copied again into verdict
copied again into sentinel
```

because duplicated values can drift during corrections/revisions.

A consumer may materialize a compact display view, but the authoritative fact lineage must remain reference-based.

## 14. Schema evolution rules

Classify changes before bumping versions.

### Compatible additive change

Example:

```text
new optional diagnostic field
old consumers safely ignore it
semantic meaning of existing fields unchanged
```

May remain compatible under the same major fact schema policy if the implementation format supports explicit optional fields.

### Breaking semantic change

Examples:

```text
field meaning changes
unit changes
required field removed/renamed
status interpretation changes
same enum name gains different semantics
```

Requires a fact schema version bump and migration/compatibility handling.

### Producer implementation change only

If output semantics and canonical payload remain identical:

```text
factSchemaVersion stays the same
```

A helper refactor is not a data-ABI change.

## 15. No self-certifying schema migrations

A producer must not silently emit a new schema and teach all consumers to accept it in the same uncontrolled runtime path.

Preferred release discipline:

```text
design evidence
→ schema change declared
→ fixtures updated narrowly
→ producer candidate emits new schema
→ compatibility/migration tests
→ consumers updated
→ old schema retirement only after evidence
```

Do not use:

```text
acceptAnySchema = true
```

or generic best-effort coercion for cache evidence used in strong claims.

Unknown schema should fail closed toward:

```text
UNKNOWN / UNVERIFIED / NOT_CONSUMABLE
```

according to consumer context.

## 16. Schema contract vs Prompt Cache ABI

Keep these version domains separate.

```text
Cache Fact Schema ABI
= telemetry data exchanged between producers/consumers

Prompt Cache ABI
= actual SimCore prompt bytes/segment contract relevant to Gemini caching
```

A cache-fact schema change with identical prompt bytes must not be reported as a prompt Cache ABI drift.

Likewise a prompt Cache ABI change does not automatically require every telemetry fact schema to change.

## 17. Schema contract vs Evidence Chain

The Fact Schema Contract defines valid fact shapes.

The Evidence Chain defines provenance relationships among fact instances.

Conceptual:

```text
Fact Schema
= node type contract

Evidence Chain
= edges / derivation provenance
```

A valid fact with broken provenance may still be insufficient for a strong claim.

A strong provenance chain cannot repair an invalid fact schema.

Both gates are required.

## 18. Schema contract vs Ownership Registry

Required relationship:

```text
Ownership Registry
→ factId -> producer / consumers / forbidden duplicate work

Fact Schema Contract
→ factId -> envelope / payload / status / privacy / version semantics
```

Future machine-readable material should cross-check both.

Example failure:

```text
CACHE_FIRST_BREAK
registered producer = cache-prefix-map
fact envelope producerId = cache-sentinel
→ CACHE_FACT_PRODUCER_SCHEMA_MISMATCH
```

## 19. Telemetry Budget integration

Schema availability must respect cost bounds.

If an `AVAILABLE` payload would require forbidden work:

```text
status = WITHHELD_BY_BUDGET
```

or a lower-cost documented partial fact must be used.

Do not fabricate required fields from heuristics merely to satisfy the schema.

Do not let a consumer bypass budget by producing a private substitute fact.

## 20. Retention integration

Every fact schema should declare a retention/privacy class or inherit one from the Ownership Registry/Retention Policy.

Candidate classes:

```text
EPHEMERAL_LINKABLE
PENDING_BOUNDED
ACTIVE_WINDOW_BOUNDED
INCIDENT_BOUNDED
SUMMARY_PERSISTENT
CI_ONLY
```

This is a policy classification, not a storage backend.

A fact becoming `SUPERSEDED` should release active-consumer authority while preserving only the compact lineage required by the Retention Policy.

## 21. Machine-readable contract candidate

Future CI may maintain a compact contract file, for example:

```json
{
  "envelopeSchemaVersion": 1,
  "facts": {
    "CACHE_FIRST_BREAK": {
      "producerId": "cache-prefix-map",
      "factSchemaVersion": 1,
      "allowedStatuses": [
        "AVAILABLE",
        "UNKNOWN",
        "WITHHELD_BY_BUDGET",
        "SUPERSEDED",
        "INVALID"
      ],
      "requiredWhenAvailable": [
        "owner",
        "regionId",
        "classification"
      ],
      "privacyClass": "ACTIVE_WINDOW_BOUNDED"
    }
  }
}
```

This file would be CI/design contract material, not a runtime service locator.

Do not make request hot paths repeatedly parse a large registry/schema document.

## 22. CI / Conformance Matrix integration

Future fixtures should cover at least:

```text
1. valid AVAILABLE fact with all required fields
2. AVAILABLE fact missing required field -> invalid
3. UNKNOWN is not equivalent to null/missing
4. UNVERIFIED is not treated as AVAILABLE
5. NOT_APPLICABLE does not count as evidence gap for unrelated claims
6. WITHHELD_BY_BUDGET does not trigger private consumer recomputation
7. PENDING later resolves under same sampleId with higher revision
8. SUPERSEDED revision no longer influences current verdict
9. producerId mismatches Ownership Registry -> fail
10. unknown fact schema version -> fail closed
11. compatible optional additive field does not break old consumer
12. breaking unit/semantic change requires version bump
13. capturedAt change does not change semantic digest
14. helper/module rename with same semantics keeps factId/schema stable
15. provider receipt facts preserve gateway-hit vs provider-read distinction
16. correlation fact references provider receipt rather than owning copied metrics
17. request verdict remains severity-free
18. fact schema change does not falsely report prompt Cache ABI drift
19. no raw prompt/chat/gateway row retained in payload
20. renderer boundary unchanged
```

## 23. Suggested failure vocabulary

Candidate CI/runtime contract failures:

```text
CACHE_FACT_SCHEMA_UNKNOWN
CACHE_FACT_SCHEMA_INVALID
CACHE_FACT_REQUIRED_FIELD_MISSING
CACHE_FACT_STATUS_INVALID
CACHE_FACT_NULL_SEMANTICS_AMBIGUOUS
CACHE_FACT_PRODUCER_SCHEMA_MISMATCH
CACHE_FACT_SCHEMA_BREAK_UNDECLARED
CACHE_FACT_SCHEMA_MIGRATION_UNSAFE
CACHE_FACT_PAYLOAD_UNBOUNDED
CACHE_FACT_PRIVACY_BOUNDARY_VIOLATION
CACHE_FACT_SEMANTIC_DIGEST_NONDETERMINISTIC
CACHE_FACT_OPERATIONAL_METADATA_IN_SEMANTIC_DIGEST
CACHE_FACT_SUPERSEDED_STILL_ACTIVE
CACHE_FACT_EXTERNAL_AUTHORITY_COPIED_AS_LOCAL
```

These are contract failures, not `WATCH / FIX / BLOCKER` operational severity by themselves.

## 24. Rollout order

Recommended future sequence:

```text
Phase 0
inventory fact vocabulary from current cache design docs

Phase 1
freeze common envelope + explicit status semantics in CI/docs only

Phase 2
freeze v1 payload contracts for first implemented facts
likely Prefix Map / Compatibility / request-local Verdict

Phase 3
cross-check machine-readable schemas with Ownership Registry

Phase 4
add Conformance Matrix fixtures for schema/version/privacy failures

Phase 5
only when live integrations exist, add receipt/correlation and temporal/regime fact schemas
```

Do not define dozens of empty runtime fact types before their producers exist.

## 25. Non-goals

```text
new runtime event bus
new service locator
new semantic SnapshotStore
raw telemetry warehouse
schema-driven prompt generation
provider cache management
explicit Gemini cache lifecycle
automatic provider routing
renderer behavior changes
history rewriting
prompt relocation
```

## 26. Target relationship

```text
Observer Ownership Registry
= WHO owns each cache fact

Cache Fact Schema Contract
= WHAT each cache fact means on the wire / sidecar

Telemetry Budget
= HOW MUCH work may be spent producing it

Sample Lifecycle
= WHICH revision is current

Retention Policy
= HOW LONG it may survive

Evidence Chain
= WHY downstream conclusions depend on it

Admission Policy
= WHETHER it may support a particular claim

Conformance Matrix
= whether all those rules still agree after changes
```

## 27. Current classification

```text
GEMINI_CACHE_FACT_SCHEMA_CONTRACT
= HIGH VALUE
= CACHE OBSERVABILITY DATA ABI
= CI-FIRST
= EXPLICIT UNKNOWN / UNVERIFIED SEMANTICS
= VERSIONED / PRIVACY-BOUNDED
= OWNERSHIP-ALIGNED
= NO RUNTIME SERVICE REQUIRED
= IDEA / DESIGN CANDIDATE

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```
