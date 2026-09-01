# SimCore Post-3.0M Candidate C Durable Derived-Object Master Design — 2026-09-01

Date: 2026-09-01 KST

Status: **CANDIDATE C MASTER DESIGN FROZEN · DESIGN-ONLY · CAPABILITY-GATED · NO GENERIC DURABLE SOURCE DATABASE · RUNTIME / STORAGE / REENTRY / MUTATION NOT AUTHORIZED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · CANDIDATE C · DURABLE DERIVED OBJECTS · MASTER DESIGN · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

Candidate C is the post-3.0M lane for Source Intelligence objects that must outlive the current projection or evolve independently of the whole snapshot that created them.

It is not a single feature and not permission to build a universal source database.

This document freezes the overall architecture only. It does not implement persistence, IDs, revisions, history, mutation, re-entry, derived lineage, delayed media, runtime code, or release changes.

## 1. Authority chain

Candidate C consumes the frozen 3.0M contracts, especially:

```text
3M-3 structured sidecar / validator
3M-6 current-projection support / invalidation
3M-7 zero structured re-entry
3M-9 dormancy / bounded cost
3M-10 convergence
```

Existing Lineage / Handoff / Evidence remain source-support authorities.

Candidate C may reference them but must not become a second source resolver.

The 3M-6 activation gates remain authoritative:

```text
C1 cross-turn derived-object survival
C2 stable source-local identity across turns
C3 item-level reroll / edit / delete / replacement
C4 append / merge / partial survival
C5 derived-from-derived propagation
C6 controlled future-context re-entry
C7 descendants survive source replacement
C8 delayed/asynchronous effect targets a semantic object
```

## 2. Primary decision

Selected architecture:

```text
CAPABILITY_GATED_DURABLE_DERIVED_OBJECTS
```

Required flow:

```text
concrete product requirement
        ↓
activate exact C1..C8 gates
        ↓
freeze minimum capability profile
        ↓
freeze minimum metadata
        ↓
consumer-specific lifetime / reuse / mutation rules
```

Forbidden flow:

```text
Candidate C selected
→ persist every family
→ give everything permanent IDs
→ create one giant provenance graph
→ inject old source history into every prompt
```

Canonical rule:

```text
ONE OPENED GATE
!=
ALL CANDIDATE C CAPABILITIES AUTHORIZED
```

## 3. Candidate C is not Mode C

Candidate C is an internal durability/provenance design lane.

```text
MODE C
!=
CANDIDATE C
```

It is not a source family, renderer, canonical world-state owner, generic chat-memory system, or replacement for host transcript history.

## 4. Capability profile

Every child design must begin with an explicit profile:

```text
C1 survival         yes/no
C2 stable identity  yes/no
C3 item mutation    yes/no
C4 append/merge     yes/no
C5 derived lineage  yes/no
C6 context reentry  yes/no
C7 partial survival yes/no
C8 delayed effect   yes/no
```

Examples:

```text
source-history-only
→ C1 + optional C6

single-post reroll
→ C2 + C3

delayed image for persistent post
→ C2 + C8
→ C3 only if replacement/reroll is supported
```

A child design may not silently depend on an undeclared gate.

## 5. Common vocabulary, not a mega-schema

Candidate C freezes conceptual primitives only:

```text
Derived Object Identity
Revision / Generation
Supporting Authority Reference
Derived Parent / Origin Reference
Lifetime Policy
Mutation Policy
Re-entry Policy
Consumer-specific Semantic Payload
```

It does **not** freeze generic serialized objects such as:

```text
DerivedProvenanceV1
PersistentSourceObjectV1
UniversalSourceNodeV1
```

Canonical rule:

```text
COMMON VOCABULARY
!=
COMMON MEGA-SCHEMA
```

Concrete consumers decide the minimum actual fields.

## 6. Stable derived identity

When C2/C3/C4/C5/C7/C8 requires later targeting, derived identity must be explicit.

A stable derived ID is:

```text
stable only within its declared lifetime
owned by a bounded derived-object owner
namespaced by object type
```

It is not:

```text
array ordinal
host message index
content fingerprint
displayName / handle
canonical character ID
canonical world-event ID
```

Fingerprints remain support/equality evidence, not durable identity.

Possible future namespaces include only those actually required by child designs, such as:

```text
BOARD_POST
BOARD_REPLY
SOCIAL_ACTOR
SOCIAL_POST
NEWS_STORY
PUBLIC_KNOWLEDGE_DOCUMENT
MEDIA_ATTACHMENT
```

No namespace is runtime-authorized by this document.

## 7. Identity and revision are separate

Stable identity answers:

```text
which logical derived object?
```

Revision/generation answers:

```text
which current version / operation state?
```

C3/C4/C7/C8 designs must not conflate them.

Canonical rule:

```text
SAME OBJECT ID
!=
OLD RESULT MAY STILL APPLY
```

A late mutation or async effect may require both exact target identity and exact expected revision/generation.

## 8. Support authority after persistence

Persistence never makes a derived object self-supporting.

A durable object must carry only the minimum reference needed to re-prove required support later from existing authority owners.

Preferred chain remains:

```text
Lineage / Handoff / Evidence
→ trusted current authority
→ durable-object support-at-use check
```

Canonical rule:

```text
DURABLE DERIVED OBJECT
MUST RE-PROVE SUPPORT AT LATER USE
```

No arbitrary history rescan or fuzzy source reconstruction is allowed.

## 9. Derived-parent lineage

C5/C7 may require an explicit derived parent/origin reference.

Example:

```text
BOARD rumor object
→ later NEWS story about the existence of that rumor
```

The later projection may preserve attribution/lineage without promoting the rumor's content to canon.

Canonical rule:

```text
DERIVED PARENT
!=
CANONICAL TRUTH AUTHORITY
```

Any child design must distinguish canonical/current support refs from derived-parent refs.

## 10. Lifetime policy

Every durable object requires a bounded lifetime justified by its consumer.

Possible future policies include:

```text
until conversation end
N turns
N source operations
until authority invalidation
until replacement
until explicit deletion
```

Forbidden defaults:

```text
forever
unbounded archive
entire conversation by default
```

This master does not select a universal lifetime.

## 11. Persistence does not imply model memory

C1 and C6 are independent.

```text
persistent UI/history object
!=
future model-context memory
```

A source archive may exist without C6.

If C6 is activated, the child design must freeze at minimum:

```text
exact fields allowed to re-enter
freshness/support proof before insertion
prompt owner and ordering
bounded retention horizon
character/token budget
duplicate-entry prevention against host transcript
fallback when support cannot be proven
```

Whole-object prompt serialization is not the default.

## 12. Mutation policy

C3/C4 designs must define operations explicitly, for example:

```text
REPLACE
EDIT
REROLL
DELETE
APPEND_CHILD
DETACH
REORDER
MEDIA_REPLACE
```

Each operation must define:

```text
target identity
expected current revision/generation
operation authority
new semantic validation requirements
descendant effect
presentation reconciliation
stale-operation behavior
```

A UI button alone never authorizes a semantic mutation.

## 13. Descendant policy

Current 3M-6 behavior remains whole-projection invalidation.

C4/C7 may relax this only through an explicit child contract.

A child may select a strategy such as:

```text
CASCADE_INVALIDATE
REVALIDATE_DESCENDANTS
EXPLICIT_SURVIVOR_SET
REATTACH_BY_NEW_AUTHORITY
```

Default remains fail-closed.

Similarity is never enough to keep a descendant alive.

## 14. Source History lane · C1/C6

This lane serves exact historical continuity such as:

```text
continue the same old Board thread
retrieve an exact prior source object
intentionally re-enter bounded prior source data into a future prompt
```

It must preserve the 3M-7 firewall unless C6 is explicitly activated.

A durable UI archive with no model re-entry may use C1/C2 while leaving C6 off.

## 15. Stable Identity lane · C2

Use when a later product operation must address the **same** derived object or actor.

Examples:

```text
same social account across turns
same Board thread later
same post targeted by a later action
same public-knowledge document revision chain
```

Stable identity must not be inferred from wording, handle, ordinal, fingerprint, or transcript position.

## 16. Item Mutation lane · C3/C4

This lane covers:

```text
reroll one post
edit one reply
delete one item
append a child to an existing thread
merge a new projection into an existing durable object
```

Canonical separation:

```text
collapse/expand card
→ presentation-local state

reroll/edit post
→ semantic mutation
```

Only the second requires Candidate C mutation semantics.

## 17. Cross-family lineage lane · C5

Activate C5 only when a derived object intentionally becomes an attributed input to another derived source projection.

Example:

```text
persisted BOARD rumor R
→ later NEWS says "게시판에서 R이라는 주장이 돌았다"
```

The later NEWS may talk about the existence/attribution of R when authorized.

It may not treat R's underlying claim as canonical truth.

Required child questions include parent freshness, correction/deletion behavior, and whether historical attribution survives later invalidation.

## 18. Partial-survival lane · C7

C7 is needed when descendants must survive a source or parent replacement.

Example:

```text
old source snapshot replaced
but one independently supported manually-authored reply survives
```

The survivor needs explicit independent support.

Do not salvage children merely because text looks similar.

## 19. Delayed-effect lane · C8

C8 is for late results that must attach to an exact semantic object, such as:

```text
async generated avatar
remote image fetch
generated article image
late media attachment
```

Minimum concepts:

```text
target stable identity
operation generation/token
attachment authority
stale-result rejection
cleanup / failure isolation
```

Canonical rule:

```text
LATE RESULT
MAY NOT ATTACH
TO A NEWER OBJECT GENERATION BY ACCIDENT
```

## 20. Storage principles

Candidate C does not choose a physical storage backend.

If persistence is later authorized:

```text
records must be bounded
writes must be owner-scoped
unowned metadata must be preserved
schema/version migration must be explicit
cache must not become semantic authority
revision/generation invariants must survive reads and writes
```

A cache may accelerate retrieval, never establish truth/support.

## 21. Retrieval principles

Historical retrieval must be explicit and bounded.

Forbidden:

```text
scan arbitrary full transcript
fuzzy search until something looks similar
reconstruct durable identity from wording
silently revive invalidated objects
```

Future retrieval requires exact namespace plus an authorized durable locator/query, lifetime checks, freshness/support checks, and consumer-specific access policy.

## 22. Support-at-use after persistence

Conceptual later-use pipeline:

```text
retrieve durable object
        ↓
validate schema/version
        ↓
validate identity + revision/generation
        ↓
re-prove required supporting authority
        ↓
consumer-specific policy
        ↓
use
```

Failure is fail-closed unless a child design explicitly defines historical-attribution semantics.

## 23. Historical attribution is separate from current truth

A durable derived record may remain historically meaningful even after its content is disproven.

Example:

```text
"당시 게시판에서 X라는 루머가 돌았다"
```

This can remain a historical claim about the existence of a rumor while `X` itself is false.

Any such child design must separate:

```text
historical existence of derived claim
from
current validity of claim content
```

No generic historical-truth schema is frozen here.

## 24. Canonical authority firewall

Candidate C preserves:

```text
PERSISTED
!=
CANONICAL FACT

SURVIVED MANY TURNS
!=
CANONICAL FACT

HAS STABLE ID
!=
CANONICAL ENTITY

REPOSTED / REFERENCED
!=
CANONICAL FACT
```

Durability metadata is not epistemic promotion.

## 25. Family neutrality

Candidate C is triggered by lifetime/dependency requirements, not family names.

```text
SOCIAL_FEED snapshot-only
→ Candidate C may remain closed

PUBLIC_KNOWLEDGE snapshot-only
→ Candidate C may remain closed

BOARD persistent thread
→ Candidate C opens

NEWS revision history
→ Candidate C may open
```

The current SOCIAL_FEED and PUBLIC_KNOWLEDGE master scopes therefore remain snapshot-only and Candidate C remains unactivated for those frozen scopes.

## 26. Presentation boundary

Presentation may use durable IDs for UI reconciliation, but:

```text
presentation identity
!=
semantic support authority
```

A visually mounted object may still become semantically invalid.

Presentation success never rescues stale support.

## 27. Diagnostics boundary

Candidate C diagnostics may expose bounded metadata such as:

```text
namespace
object ID
revision/generation
capability profile
support status
lifetime status
last operation reason code
```

Diagnostics must not become a second hidden semantic archive.

## 28. Dormancy / cost

Candidate C inherits 3M-9 dormancy.

When no durable-source consumer is active:

```text
no Candidate C history scan
no retrieval
no persistence write
no re-entry bytes
no graph walk
no async polling
```

Future durable features must bound cost to the active object/query, not total conversation age.

## 29. Failure taxonomy

Future Candidate C designs should distinguish at least:

```text
OBJECT_NOT_FOUND
OBJECT_EXPIRED
SCHEMA_UNSUPPORTED
REVISION_MISMATCH
SUPPORT_UNAVAILABLE
SUPPORT_MISMATCH
PARENT_INVALID
OPERATION_STALE
REENTRY_NOT_AUTHORIZED
DESCENDANT_POLICY_BLOCKED
```

These are separate from Exposure DENY/HOLD and Presentation failures.

## 30. No implicit repair

When identity/revision/support validation fails, no layer may silently:

```text
rewrite IDs
replace revision numbers
guess a new parent
copy the old object under a new authority
reconstruct lineage from text similarity
```

Any migration or reconciliation behavior requires its own explicit design.

## 31. Child-design catalog

Recommended design checkpoints:

```text
CC-0  Candidate C Master Architecture                ← this document
CC-1  Durable Object Identity / Namespace
CC-2  Revision / Generation / Operation Safety
CC-3  Source History Store / Lifetime / Retrieval
CC-4  Controlled Context Re-entry
CC-5  Item Mutation / Append / Reconciliation
CC-6  Derived-to-Derived Lineage
CC-7  Partial Descendant Survival
CC-8  Delayed Effect / Media Attachment
CC-9  Integration / Cost / Dormancy
CC-10 Convergence / Runtime Validation Protocol
```

This is a design catalog, not a requirement to implement every checkpoint.

A concrete consumer may skip irrelevant checkpoints.

## 32. First recommended child

The next design checkpoint should be:

```text
CC-1 · DURABLE OBJECT IDENTITY / NAMESPACE
```

It should answer:

```text
what qualifies for stable derived identity?
who allocates identity?
what initial namespaces are justified?
how identity differs from revision, fingerprint, ordinal, and canonical entity ID?
what lifetime attaches to an ID before a history store exists?
```

It must not yet design a full source-history database.

## 33. Explicit non-goals

```text
NO persistent source database
NO source-history store
NO cross-turn account registry
NO durable runtime IDs
NO item reroll/edit/delete implementation
NO future-context injection
NO cross-family propagation implementation
NO async media pipeline
NO generic graph database
NO universal provenance schema
NO runtime implementation
NO release transaction
```

## 34. Frozen invariants

```text
I1  Candidate C activates only from a concrete C1-C8 requirement
I2  activation is capability-profile scoped
I3  no universal durable source schema is frozen by the master
I4  stable derived identity is not canonical identity
I5  persistence never upgrades truth authority
I6  object identity and revision/generation are separate
I7  durable objects re-prove required support at later use
I8  C1 persistence does not imply C6 model re-entry
I9  C5 derived lineage does not imply canonical truth promotion
I10 mutation requires explicit operation/reconciliation semantics
I11 survivor behavior is never similarity-based by default
I12 delayed effects require stale-result rejection
I13 storage/cache never becomes semantic authority
I14 retrieval is exact/bounded, not fuzzy transcript resurrection
I15 Candidate C remains dormant when no durable consumer is active
I16 failure classes remain separate from Exposure and Presentation failures
I17 child designs freeze only metadata required by their concrete consumer
```

## 35. Frozen verdict

```text
CANDIDATE_C_MASTER_DESIGN       = FROZEN
ARCHITECTURE                    = CAPABILITY_GATED_DURABLE_DERIVED_OBJECTS
GENERIC_DERIVED_DATABASE        = NOT_SELECTED
GENERIC_PROVENANCE_SCHEMA       = NOT_FROZEN
C1..C8                          = INDEPENDENT_CAPABILITIES
CURRENT_3M_FIRST_MAJOR          = STILL_CLOSED
SOCIAL_FEED_CURRENT_SCOPE       = STILL_SNAPSHOT_ONLY
PUBLIC_KNOWLEDGE_CURRENT_SCOPE  = STILL_SNAPSHOT_ONLY
FIRST_RECOMMENDED_CHILD         = CC-1 DURABLE OBJECT IDENTITY / NAMESPACE
RUNTIME_IMPLEMENTATION          = NOT_AUTHORIZED
PERSISTENCE                     = NOT_AUTHORIZED
CONTEXT_REENTRY                 = NOT_AUTHORIZED
MUTATION                        = NOT_AUTHORIZED
PRODUCTION                      = UNCHANGED
release-simcore                 = UNCHANGED
```

Canonical closing rule:

```text
DURABILITY EXISTS TO SERVE A CONCRETE CONSUMER.
THE CONSUMER DOES NOT EXIST TO JUSTIFY A DURABILITY PLATFORM.
```
