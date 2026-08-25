# SimCore Gemini Cache Fact Migration Protocol — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · CACHE FACT CONTRACT MIGRATION · CI-FIRST · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`

Related:
- `docs/SIMCORE_GEMINI_CACHE_FACT_CONTRACT_BUNDLE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_OBSERVER_OWNERSHIP_REGISTRY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_FACT_SCHEMA_CONTRACT_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_FACT_DEPENDENCY_GRAPH_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_SAMPLE_LIFECYCLE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_RETENTION_POLICY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_COMPATIBILITY_KEY_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_COMPILER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_VERDICT_TRANSITION_MODEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_EVIDENCE_CHAIN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_CONFORMANCE_MATRIX_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Define one explicit migration protocol for cache-observability contracts when a future SimCore release intentionally changes any of the following:

```text
fact payload schema
envelope schema
fact producer ownership
dependency edges / required upstreams
authority semantics
status semantics
compatibility interpretation
consumer admission requirements
runtime cost class
retention class
```

The protocol answers:

```text
Can an old live fact be reused unchanged?
Can it be deterministically adapted?
Must it be recomputed from still-valid typed upstream evidence?
Must downstream consumers be invalidated/rebuilt?
Can an active Sentinel incident survive the migration?
Can a learned Baseline survive?
What happens to reload handoff capsules?
How is a producer ownership transfer cut over safely?
What happens on rollback to a version that does not understand the new contract?
```

This is an observability migration contract only. It is not semantic Core-state migration and does not authorize prompt/cache behavior changes.

## 2. Constitutional boundary

Permanent responsibility split remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

Cache-fact migration may adapt or invalidate bounded observability metadata. It must never:

```text
rewrite renderer prose
rewrite chat history
change prompt placement
change model instructions for cache reasons
weaken correctness/state protections
manage Gemini explicit cache resources
change provider routing
```

If cache telemetry cannot be migrated safely:

```text
cache observability
→ STALE / INVALID / UNVERIFIED / REBUILD_REQUIRED
```

not:

```text
Core semantic state degraded
prompt rewritten
history rewritten
renderer responsibility changed
```

## 3. Core rule — no silent reinterpretation

A stored/live fact created under contract A must not simply be read under contract B when its meaning changed.

Forbidden:

```text
CACHE_FIRST_BREAK v1
meaning: first local structural break

CACHE_FIRST_BREAK v2
meaning changed subtly

old v1 payload
→ parse as v2 because fields look similar
```

Required:

```text
old contract
→ explicit compatibility classification
→ PRESERVE / ADAPT / RECOMPUTE / INVALIDATE / DROP
```

Schema resemblance is not proof of semantic compatibility.

## 4. Migration is not new evidence

This is a critical idempotency rule.

A semantics-preserving schema adapter must not cause one logical request to become a second cache sample or a second baseline observation.

Example:

```text
S42
CACHE_PROVIDER_RECEIPT v1
→ deterministic field rename
→ CACHE_PROVIDER_RECEIPT v2
```

If semantic meaning and authority are preserved:

```text
same logical sample
same request count
same provider evidence event
same side-effectful consumer-consumption identity
```

The migration may create a new materialized representation, but it must not be counted as a new provider receipt, new request, new regression sample, or new healthy baseline sample.

Conversely, when semantic interpretation or authority changes materially, the old fact must not be silently reused. That case requires a successor revision, reevaluation, or invalidation according to the migration class.

## 5. Migration dimensions must be classified separately

Do not use one global label such as:

```text
CACHE_SCHEMA_CHANGED
```

A contract diff should identify the exact changed dimensions.

Candidate dimensions:

```text
ENVELOPE_SCHEMA
FACT_SCHEMA
PRODUCER_OWNER
PRODUCER_ROLE
AUTHORITY_CLASS
STATUS_SEMANTICS
DEPENDENCY_REQUIRED
DEPENDENCY_OPTIONAL
DEPENDENCY_EDGE_CLASS
COMPATIBILITY_POLICY
ADMISSION_POLICY
COST_CLASS
RETENTION_CLASS
PRIVACY_CLASS
CONSUMER_SET
```

One release may change more than one dimension for a fact, but each must be explicitly declared and validated.

## 6. Migration strategy vocabulary

Initial candidate strategies:

```text
PRESERVE_EXACT
ADAPT_SEMANTICS_PRESERVING
RECOMPUTE_FROM_TYPED_UPSTREAM
REEVALUATE_DOWNSTREAM
INVALIDATE_AND_REBUILD
DROP_TO_UNVERIFIED
OWNERSHIP_TRANSFER
UNSUPPORTED
```

### 6.1 PRESERVE_EXACT

Use when the Bundle changed only in tooling/non-semantic material and the fact contract is still exactly compatible.

```text
fact meaning SAME
payload ABI SAME
owner SAME
authority SAME
```

No runtime migration work should be needed.

### 6.2 ADAPT_SEMANTICS_PRESERVING

Use only when a deterministic adapter can transform the old representation while preserving:

```text
semantic meaning
authority level
sample identity
evidence identity
consumer meaning
```

Examples may include a field rename or canonical representation change with proven one-to-one semantics.

The adapter must be pure, deterministic, bounded, network-free, and fixture-tested.

### 6.3 RECOMPUTE_FROM_TYPED_UPSTREAM

Use when the old derived fact cannot be safely adapted, but all required authoritative upstream typed facts remain available and compatible.

Example:

```text
new CACHE_REQUEST_VERDICT rule
→ old verdict cannot be reused
→ receipt/correlation/first-break/baseline facts still valid
→ recompile verdict
```

This is a reevaluation of the same logical request, not a new request.

### 6.4 REEVALUATE_DOWNSTREAM

Use when an upstream migration changes a fact that already fed downstream consumers.

Affected descendants may require:

```text
STALE
SUPERSEDED
REEVALUATION_REQUIRED
```

before bounded replay/rebuild.

Do not leave a downstream verdict/transition current when one of its semantically required upstream facts changed.

### 6.5 INVALIDATE_AND_REBUILD

Use when safe adaptation/recomputation cannot preserve the old consumer meaning.

Examples:

```text
Baseline statistic semantics changed
compatibility population definition changed materially
admission threshold/authority semantics changed
active transition state cannot be replayed under the new contract
```

Invalidate the smallest affected bounded state and rebuild from currently retained trusted evidence when possible.

### 6.6 DROP_TO_UNVERIFIED

Use when the telemetry is not worth risky migration or required evidence is no longer available.

This is an intentional safe outcome.

```text
old cache telemetry cannot be migrated
→ discard bounded observability state
→ provider/cache claim = UNVERIFIED until new evidence accumulates
```

### 6.7 OWNERSHIP_TRANSFER

Use for deliberate producer changes. See the dedicated cutover protocol below.

### 6.8 UNSUPPORTED

Use when no safe migration path exists and the artifact must not be consumed by the new version.

## 7. Migration compatibility classes

A candidate contract diff may be classified as:

```text
EXACT_COMPATIBLE
ADAPTER_COMPATIBLE
RECOMPUTABLE
CONSUMER_REBUILD_REQUIRED
INCOMPATIBLE_DROP_REQUIRED
UNKNOWN_MIGRATION_COMPATIBILITY
```

`UNKNOWN_MIGRATION_COMPATIBILITY` must fail closed. It is not permission to try parsing and see what happens.

## 8. Migration overlay — release-specific, not permanent fact property

Migration intent should be represented as a release/candidate overlay, not baked forever into the fact's ordinary schema.

Conceptual form:

```json
{
  "migrationSchemaVersion": 1,
  "fromBundleDigest": "...",
  "toBundleDigest": "...",
  "changes": [
    {
      "factId": "CACHE_FIRST_BREAK",
      "dimensions": ["FACT_SCHEMA"],
      "fromFactSchemaVersion": 1,
      "toFactSchemaVersion": 2,
      "strategy": "ADAPT_SEMANTICS_PRESERVING",
      "preservesSemanticMeaning": true,
      "preservesAuthority": true,
      "baselineAction": "PRESERVE",
      "sentinelAction": "PRESERVE_IF_REPLAY_EQUIVALENT",
      "reloadAction": "ADAPT_OR_DROP",
      "evidenceRef": "docs/..."
    }
  ]
}
```

Exact fields are implementation-time work.

Required principle:

> Migration declarations explain an intentional contract transition between two known Bundle identities. They are not a permanent `allow change` flag.

Do not create:

```text
allowAllCacheFactMigrations = true
```

## 9. Bundle drift must be fully covered

Future CI should compare:

```text
accepted Contract Bundle
vs
candidate Contract Bundle
```

For every semantic drift:

```text
changed fact
+ changed dimension
→ exact migration declaration required
```

If candidate Bundle drift is not covered:

```text
CACHE_FACT_MIGRATION_UNDECLARED
→ FAIL
```

If a migration declaration names a change that is not actually present:

```text
CACHE_FACT_MIGRATION_STALE_DECLARATION
→ FAIL / remove stale overlay
```

This prevents broad migration declarations from becoming permanent bypasses.

## 10. Fact-schema migration

### Semantics-preserving additive/change case

If:

```text
old required meaning preserved
new field is optional/derived
old authoritative values map exactly
```

then a deterministic adapter may be allowed.

However additive syntax alone does not prove compatibility.

Example danger:

```text
new optional authority field changes interpretation of old values
```

That may require reevaluation even though the wire shape is backward-readable.

### Semantic-change case

If a field's meaning, status interpretation, unit, normalization, or authority changes:

```text
in-place adaptation forbidden by default
```

Prefer:

```text
recompute from authoritative upstream
or invalidate/rebuild
```

## 11. Envelope-schema migration

The common envelope may evolve independently from individual fact payloads.

A pure envelope transport/provenance change may preserve fact meaning if proven.

Examples:

```text
new optional provenanceRefs field
new explicit envelope schema marker
```

Potentially semantics-preserving.

But changes to:

```text
status semantics
authorityClass semantics
sampleRevision semantics
producer identity semantics
```

are not merely envelope formatting changes and require explicit impact analysis across consumers.

## 12. Producer ownership transfer protocol

Ownership transfer is especially sensitive because two producers must not remain authoritative indefinitely.

Required conceptual sequence:

```text
1. declare ownership transfer
2. implement candidate new producer on work branch
3. run differential fixtures against old producer where equivalence is expected
4. if needed, run bounded diagnostic-only dual observation
5. prove normalized semantic equivalence or explicitly declare intended semantic difference
6. cut authority to NEW producer
7. OLD producer stops authoritative production
8. retain only adapter/legacy-read logic if still needed for bounded old telemetry
9. remove old duplicate computation when migration window closes
```

Production invariant:

```text
one semantic fact
→ one active authoritative producer
```

During differential migration testing, dual computation is evidence-only. Consumers must not choose whichever producer result looks preferable.

Forbidden:

```text
old result vs new result differ
→ pick one at runtime heuristically
```

If they differ unexpectedly:

```text
MIGRATION BLOCKED
→ investigate contract/equivalence defect
```

## 13. Dependency migration

When a fact gains a new required upstream dependency, old live facts may lack that input.

Example:

```text
CACHE_REQUEST_VERDICT v2
now requires authoritative route-scope fact

old sample
has no route-scope evidence
```

Required behavior:

```text
old verdict cannot be upgraded by assumption
→ UNKNOWN / UNVERIFIED / REEVALUATION_REQUIRED
```

Do not synthesize the new required upstream from downstream behavior.

When a required dependency is removed, old downstream facts are not automatically invalid. The candidate semantics must prove whether the old result is equivalent under the new rule.

Any same-revision graph change must remain acyclic under the Fact Dependency Graph validator.

## 14. Status / authority migration

Changes to status or authority semantics are high-risk even when payload bytes are unchanged.

Example:

```text
v1 HEURISTIC_MATCH
allowed diagnostic-only

v2 same stored string
now interpreted as baseline-admissible
```

This is a semantic migration, not a no-op.

Existing samples must not silently gain authority because software was upgraded.

Required invariant:

```text
migration alone
must never upgrade evidence authority
```

An authority upgrade requires genuinely stronger/new authoritative evidence, not only a new parser version.

## 15. Baseline migration

Fact migration does not automatically imply Gemini cache behavior changed.

Therefore distinguish:

```text
OBSERVABILITY CONTRACT MIGRATION
!=
CACHE REGIME CHANGE
```

Baseline actions:

### PRESERVE

Allowed only when all baseline inputs and statistical meaning remain equivalent and the migrated material does not create duplicate consumption.

### REBUILD_FROM_BOUNDED_WINDOW

Use when current baseline statistics/eligibility meaning changed but enough trusted retained samples exist to reconstruct safely.

### STALE_RESET_REQUIRED

Use when compatibility/admission/metric semantics changed materially or old samples cannot be safely reinterpreted.

Important:

```text
baseline reset caused by telemetry contract migration
→ does NOT itself confirm new CACHE_REGIME
```

A new regime still requires new runtime evidence under the normal Regime Ledger rules.

## 16. Sentinel / Transition migration

An active incident may survive only if its temporal semantics remain equivalent.

Possible actions:

```text
PRESERVE_IF_REPLAY_EQUIVALENT
REPLAY_FROM_BOUNDED_INCIDENT_WINDOW
MOVE_TO_EVIDENCE_GAP
INVALIDATE_INCIDENT_STATE
```

Forbidden:

```text
migration occurs
→ active regression silently marked RECOVERED
```

and:

```text
migration occurs
→ one old request re-counted as a new regression sample
```

If transition semantics changed and bounded replay cannot establish an equivalent state:

```text
EVIDENCE_GAP / REBUILD_REQUIRED
```

is safer than inventing persistence/recovery.

## 17. Regime Ledger migration

A cache-fact contract migration is not itself a `CACHE_REGIME` boundary.

The Regime Ledger may record a bounded annotation such as:

```text
observability contract changed here
baseline comparability temporarily reset
```

but must not conclude:

```text
new provider cache regime confirmed
```

without repeated trusted post-migration runtime evidence.

If old regime summaries use a schema that is no longer interpretable, preserve only a compact historical summary or mark the old material schema-incompatible; do not rewrite history into the new semantics.

## 18. Evidence Chain migration

Evidence lineage should preserve the migration/correction relationship.

Conceptual:

```text
E17 old fact instance
→ MIGRATED_SCHEMA_ONLY_BY M3
→ E17' adapted representation
```

or:

```text
E17 old semantic fact
→ INVALIDATED_BY migration M4
→ E29 recomputed successor fact
```

Do not erase that an earlier verdict was produced under the old contract.

When old conclusions become invalid after migration, use correction/supersession edges rather than deleting history.

## 19. Reload handoff migration

Reload capsules are bounded operational continuity artifacts, not durable semantic truth.

Rules:

```text
same/adapter-compatible schema
→ bounded deterministic migration may be attempted

unknown/incompatible schema
→ discard capsule
→ cache observer continuity = unavailable / UNVERIFIED
```

Do not run expensive repair or network retrieval merely to save an old cache-observer capsule.

Existing handoff TTL remains local to its mechanism and must not be extended merely to make migration easier.

Reload migration must never upgrade:

```text
HEURISTIC → EXACT
UNVERIFIED → VERIFIED
UNKNOWN → known
```

without new authoritative evidence.

## 20. Rollback policy — fail closed, prefer telemetry loss over downgrade complexity

Rollback deserves an explicit rule.

A previous SimCore version may encounter cache telemetry written by a newer contract version.

Default posture:

```text
older runtime cannot prove compatibility
→ do not reinterpret newer telemetry
→ discard / ignore bounded incompatible cache sidecar
→ restart cache observability as UNVERIFIED / cold
```

Do not require every cache-fact migration to support a reverse/down migration.

Reasons:

```text
cache telemetry is observational
raw history/prompt must not be retained merely for downgrade support
complex downgrade logic increases risk
Core semantic correctness has higher priority than cache-observer continuity
```

A reverse adapter may be added only if it is deterministic, semantics-preserving, low-risk, and justified by real operational need.

## 21. Idempotency

Migration must be idempotent.

Conceptual:

```text
migrate(oldArtifact, migration M)
→ result R

migrate(R, migration M)
→ NO-OP / already migrated
```

It must not:

```text
increment request count twice
consume baseline twice
increment regression persistence twice
create duplicate correction edges
create duplicate regime entries
```

A bounded migration identity may include:

```text
fromBundleDigest
toBundleDigest
factId
fromSchemaVersion
toSchemaVersion
strategy
```

Exact encoding is implementation-time work.

## 22. Migration ordering

When several changes occur together, migration order must follow the fact dependency graph rather than arbitrary file order.

Preferred conceptual order:

```text
1. validate source artifact schema/identity
2. migrate external/root normalized facts when allowed
3. migrate/recompute upstream local facts
4. recompute downstream derived facts topologically
5. reevaluate admission
6. rebuild/revalidate baseline if required
7. replay temporal transition state if required
8. update retention pins / compact superseded material
```

Do not migrate a downstream verdict first and later discover that its required upstream changed.

Same-revision migration work must remain acyclic.

## 23. Boundedness and performance

Migration must honor the Telemetry Budget and Retention Policy.

Default prohibitions:

```text
full lifetime chat replay
full-history second scan solely for cache migration
network polling to recover old cache evidence
raw prompt reconstruction
unbounded old-version archive
permanent dual producer computation
```

If the only possible safe migration requires unavailable or too-expensive evidence:

```text
DROP_TO_UNVERIFIED
or INVALIDATE_AND_REBUILD from future evidence
```

is the correct result.

## 24. Privacy

Migration adapters may only consume the bounded fields permitted by the old/new fact contracts.

Do not solve migration by retaining extra raw material "just in case".

Forbidden migration support stores:

```text
raw model prompt
raw user/assistant history
full gateway log archive
full provider response bodies
```

Prefer:

```text
fact IDs
schema versions
digests
enums
bounded token metrics
provenance refs
migration reason codes
```

## 25. Suggested migration reason / result codes

Candidate vocabulary:

```text
MIG_EXACT_COMPATIBLE
MIG_ADAPTER_APPLIED
MIG_RECOMPUTED_FROM_UPSTREAM
MIG_DOWNSTREAM_REEVALUATED
MIG_BASELINE_PRESERVED
MIG_BASELINE_REBUILT
MIG_BASELINE_RESET_REQUIRED
MIG_SENTINEL_REPLAYED
MIG_SENTINEL_EVIDENCE_GAP
MIG_RELOAD_CAPSULE_DROPPED
MIG_OWNER_TRANSFER_COMPLETE
MIG_OWNER_TRANSFER_DIFFERENTIAL_MISMATCH
MIG_AUTHORITY_UPGRADE_FORBIDDEN
MIG_INCOMPATIBLE_DROPPED
MIG_ALREADY_APPLIED
MIG_UNSUPPORTED
```

These are migration outcomes, not defect severities.

## 26. Suggested CI failure vocabulary

```text
CACHE_FACT_MIGRATION_UNDECLARED
CACHE_FACT_MIGRATION_STALE_DECLARATION
CACHE_FACT_MIGRATION_SOURCE_BUNDLE_MISMATCH
CACHE_FACT_MIGRATION_TARGET_BUNDLE_MISMATCH
CACHE_FACT_MIGRATION_ADAPTER_NONDETERMINISTIC
CACHE_FACT_MIGRATION_SEMANTIC_EQUIVALENCE_FAILED
CACHE_FACT_MIGRATION_AUTHORITY_UPGRADE
CACHE_FACT_MIGRATION_DUPLICATE_CONSUMPTION
CACHE_FACT_MIGRATION_DEPENDENCY_ORDER_VIOLATION
CACHE_FACT_MIGRATION_OWNER_TRANSFER_INCOMPLETE
CACHE_FACT_MIGRATION_DOWNSTREAM_STALE
CACHE_FACT_MIGRATION_BASELINE_POISONING
CACHE_FACT_MIGRATION_TEMPORAL_DOUBLE_COUNT
CACHE_FACT_MIGRATION_PRIVACY_BOUNDARY_VIOLATION
CACHE_FACT_MIGRATION_RUNTIME_BUDGET_VIOLATION
CACHE_FACT_MIGRATION_RELOAD_SCHEMA_UNSAFE
```

## 27. Conformance Matrix integration

Future fixtures should cover at least:

```text
1. exact-compatible Bundle
   → no migration mutation

2. fact v1 -> v2 field rename with identical semantics
   → adapter succeeds
   → sample/request count unchanged
   → baseline not consumed twice

3. same wire shape but changed authority semantics
   → in-place reuse forbidden

4. derived verdict algorithm changes with valid typed upstream retained
   → recompute same logical sample

5. new required dependency unavailable in old sample
   → UNKNOWN/UNVERIFIED, never synthesized

6. ownership transfer old -> new with equivalent outputs
   → differential pass
   → new becomes sole authority

7. ownership transfer mismatch
   → cutover blocked

8. baseline-compatible schema migration
   → preserve without duplicate learning

9. baseline metric/admission meaning changes
   → bounded rebuild or STALE_RESET_REQUIRED

10. active Sentinel incident + semantics-preserving migration
    → replay-equivalent state preserved

11. active Sentinel incident + incompatible transition semantics
    → EVIDENCE_GAP / rebuild, not RECOVERED

12. migration does not create CACHE_REGIME by itself

13. compatible reload capsule migrates deterministically

14. incompatible reload capsule drops safely to UNVERIFIED

15. rollback old runtime sees unknown newer schema
    → ignore/drop cache telemetry, Core behavior unchanged

16. migration applied twice
    → idempotent no-op on second application

17. downstream fact whose upstream changed
    → stale/recompute enforced

18. no raw prompt/history retained for migration

19. no network calls added for migration

20. renderer boundary unchanged
```

## 28. Implementation-time rollout candidate

Do not implement all migrations at once merely because the protocol exists.

Preferred future rollout:

```text
Phase 0
→ first real Contract Bundle drift appears
→ classify exact changed dimensions

Phase 1
→ write migration overlay + golden fixtures

Phase 2
→ implement only required adapter/recompute/invalidation logic on dedicated work branch

Phase 3
→ Contract Bundle diff gate
→ migration fixtures
→ Cache Conformance Matrix
→ existing SimCore static/CI regression suite

Phase 4
→ release through normal SimCore workflow
→ live long-chat validation

Phase 5
→ preserve anomalies / migration evidence in repo
→ classify WATCH / DEFER / FIX / BLOCKER / DISMISS as appropriate
```

A migration protocol is not permission to combine unrelated runtime feature changes with release-system restructuring.

## 29. Relationship to existing cache contracts

```text
Cache Fact Contract Bundle
= detects exactly what contract changed

Cache Fact Migration Protocol
= defines how that intentional change crosses live bounded observability state

Sample Lifecycle
= preserves logical sample/revision/idempotency identity

Evidence Chain
= preserves migration/correction provenance

Retention Policy
= determines which legacy material is still available to migrate

Telemetry Budget
= bounds migration cost

Baseline Profile
= may preserve, rebuild, or reset learned normal state

Transition Model / Sentinel
= may replay or move to evidence gap

Regime Ledger
= does not treat contract migration itself as provider cache-regime proof
```

## 30. Current classification

```text
GEMINI_CACHE_FACT_MIGRATION_PROTOCOL
= HIGH VALUE ON FIRST REAL CONTRACT EVOLUTION
= EXPLICIT CONTRACT TRANSITION
= IDEMPOTENT
= DEPENDENCY-ORDERED
= AUTHORITY-PRESERVING
= ANTI-SILENT-REINTERPRETATION
= ROLLBACK FAIL-CLOSED
= OBSERVABILITY MAY RESET TO UNVERIFIED
= CI-FIRST / FIXTURE-FIRST
= IDEA / DESIGN CANDIDATE

runtime change: NONE
prompt byte change: NONE
SnapshotStore semantic change: NONE
renderer responsibility change: NONE
release-system change: NONE
```
