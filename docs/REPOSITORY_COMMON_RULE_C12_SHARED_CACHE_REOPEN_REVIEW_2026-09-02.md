# Repository Common Rule C12 Re-open Review — Shared Cache Consumer Ownership — 2026-09-02

Status: **HOLD CONFIRMED · NO RCR-C12 PROMOTION · OWNERSHIP FAMILY REFINED · POLICY/DOCS ONLY · NO PRODUCT/RUNTIME/RELEASE AUTHORITY**

## 0. Question

Re-open the prior C12 backing-ownership promotion review using the LATER candidate:

```text
shared cache value
+ multiple consumers
+ consumer-local mutable metadata
→ should consumers mutate the shared object directly?
```

Determine whether this new evidence satisfies the prior promotion re-open condition for a repository-wide `RCR-C12`.

## 1. Prior disposition remains the starting authority

The prior review froze:

```text
RCR-C12 = NOT CREATED
PROMOTION = HOLD
SHARED GUARDRAIL = KEEP
```

with the narrow durable/backing rule:

```text
new independently mutable / persisted logical object
+ descriptor/reference that grants access to source-owned mutable backing
→ implicit sharing is unsafe
→ SHARE / TRANSFER / DETACH semantics must be explicit in the owning contract
```

Promotion could be re-opened when a second independent registered project, an activated SimCore durable workflow, a cross-project shared subsystem, or a common validator independently required the same ownership separation.

## 2. New LATER evidence — strong correctness evidence

PocketRisu preserves the shared-cache ownership invariant in several documents, including:

```text
products/pocketrisu-helper-mod/docs/features/cache/shared-cache-copy-before-consumer-mutation/INVARIANT.md
products/pocketrisu-helper-mod/docs/features/memory/shared-cache-value-mutation-boundary/INVARIANT.md
products/pocketrisu-helper-mod/docs/features/memory/shared-cache-detached-metadata-ownership/INVARIANT.md
```

The concrete failure is:

```text
shared vector/embedding cache record
→ consumer A writes request-local metadata directly onto cached object
→ consumer B hits same cache key with different/no metadata
→ A's previously relied-on state is mutated/cleared
→ downstream similarity traversal can fail
```

The adopted repair is:

```text
cache-owned reusable payload
→ treat as shared/immutable from consumer perspective

consumer-local id / metadata / annotations
→ create the smallest consumer-owned detached envelope/view
→ mutate only the consumer-owned layer
```

Important performance boundary:

```text
DETACH MUTABLE OWNERSHIP
!=
DEEP-CLONE EVERY IMMUTABLE PAYLOAD
```

Large immutable vector/embedding payloads may remain shared when their fields are not mutated.

## 3. Evidence independence check — re-open threshold NOT met

The repository currently contains multiple documents describing this shared-cache rule, but document multiplicity is not independent evidence multiplicity.

The shared-cache documents above all trace to the same PocketRisu Hypa failure/fix family and the same upstream commit lineage.

Therefore:

```text
three invariant documents
!=
three independent product incidents
```

The prior C12 primary evidence also comes from PocketRisu, although from a different subsystem:

```text
character/module conversion
→ copied lazy manifest descriptor
→ independently editable destination still pointed at source mutable backing
```

This gives two distinct ownership failure shapes inside one product:

```text
A. durable/backing aliasing across independent logical objects
B. in-memory shared-reference mutation across independent consumers
```

That is meaningful architectural reinforcement, but it still does not satisfy the strongest cross-project promotion condition.

## 4. SimCore cross-check — applicable architecture, not independent runtime proof

SimCore contains several compatible ownership designs:

```text
single semantic producer
canonical typed fact shape
consumer reuse without private semantic reimplementation
small immutable request evidence capsule as an allowed transport shape
```

Candidate C also freezes:

```text
cache != semantic authority
owner-scoped writes
identity != revision/generation
support-at-use
bounded consumer-specific semantics
```

These are compatible with shared-cache detached ownership, but current SimCore does not yet authorize:

```text
persistent source-history cache
shared durable derived-object cache
multiple runtime consumers mutating cached semantic objects
```

So SimCore remains a **future applicability case**, not a second independent runtime occurrence.

## 5. Refined ownership family

The new evidence improves the taxonomy.

### 5.1 Durable backing ownership

Question:

```text
Does a new independently mutable/persisted logical object inherit source-owned mutable storage/backing identity?
```

Required disposition vocabulary remains:

```text
SHARE
TRANSFER
DETACH
```

### 5.2 Shared reusable value ownership

Question:

```text
Does a reusable cache/shared value also become storage for consumer-local mutable state?
```

Default guardrail:

```text
shared reusable value
→ consumer treats it as immutable unless an owning contract grants mutation authority

consumer-local mutable decoration
→ consumer-owned detached envelope/view
```

### 5.3 Relationship

These two patterns share the same higher-level integrity lesson:

```text
REFERENCE REUSE
!=
MUTATION OWNERSHIP
```

But they are not yet one universal implementation rule.

A durable object may need backing ownership disposition.
A cache consumer may need a detached local wrapper.
A copy-on-write implementation may satisfy either without eager deep cloning.

## 6. Counterexamples remain valid

Do not promote wording that would prohibit any of the following:

### Same logical object, new revision

```text
OBJECT A rev7
→ OBJECT A rev8
```

May intentionally retain durable identity/backing lineage.

### Shared immutable backing

```text
Object A ─┐
          ├→ immutable/content-addressed blob
Object B ─┘
```

Safe when neither consumer has mutation authority over the shared blob.

### Copy-on-write

Physical sharing before mutation is valid when ownership detaches before conflicting mutation.

### Explicit jointly mutable ownership

A project may intentionally define shared mutable ownership if authority, synchronization, and validation are explicit.

### Read-only consumers

A consumer that never mutates the shared object does not need a detached wrapper merely to read it.

## 7. Existing common rules already carry surrounding protections

Applicable repository-wide rules include:

```text
RCR-H02  preserve owning authority
RCR-D11  choose the narrowest capable semantic owner/effect surface
RCR-D12  map state/data/effect flow before multi-layer mutation
RCR-D13  validate contracts across boundaries
RCR-C10  partial/projected representations do not gain destructive omission authority
RCR-C11  late effects require current operation authority
```

None fully states shared-reference mutation ownership, so the concept is not redundant.

However, a new repository constitutional rule is still not justified merely because the concept is useful.

## 8. SimCore future acceptance pattern

If Candidate C later introduces a shared source-history or derived-object cache with multiple consumers, the following becomes an immediate child-design acceptance condition:

```text
cache-owned semantic payload
→ shared/read-only from consumer perspective

presentation consumer local state
→ presentation-owned wrapper

context re-entry consumer local state
→ re-entry-owned wrapper

diagnostics local state
→ diagnostics-owned wrapper
```

For example, fields such as:

```text
expanded
selected
presentationGeneration
contextInsertionReason
diagnosticDisplayFlags
```

must not be written directly into a shared semantic cache record unless the semantic cache contract explicitly owns them.

This future rule does not authorize Candidate C, persistence, caching, re-entry, or runtime implementation.

## 9. Updated promotion re-open conditions

Keep C12 on promotion watch. Re-open again when at least one of these occurs:

1. a second independent registered project reproduces or formally prevents cross-consumer/shared-reference mutable aliasing;
2. SimCore activates an actual shared durable/cache consumer boundary and independently needs detached mutation ownership;
3. a common/shared subsystem serves reusable structured objects to multiple registered-project consumers and requires immutable-base/local-wrapper semantics;
4. a common validator needs a project-neutral ownership classification to catch accidental mutable aliasing across multiple scopes.

Repeated documentation of the same upstream failure does not count as independent evidence.

## 10. Decision

```text
RCR-C12 = NOT CREATED
C12 PROMOTION = HOLD CONFIRMED
SHARED-CACHE EVIDENCE = STRONG SUPPORTING EVIDENCE
INDEPENDENT CROSS-PROJECT PROOF = NOT YET
OWNERSHIP FAMILY = REFINED
```

Selected portable principle:

```text
REFERENCE REUSE
DOES NOT BY ITSELF GRANT MUTATION OWNERSHIP
```

Selected cache specialization:

```text
When a reusable cache/shared value is consumed by multiple independent consumers, consumer-local mutable state belongs in a consumer-owned layer unless the owning contract explicitly grants shared mutation authority.
```

No change to `docs/REPOSITORY_COMMON_RULES.md` is authorized by this review.

## 11. Transaction scope

This review is documentation/policy only.

```text
runtime change        = NONE
storage change        = NONE
cache implementation  = NONE
SimCore implementation= NONE
release change        = NONE
production change     = NONE
```
