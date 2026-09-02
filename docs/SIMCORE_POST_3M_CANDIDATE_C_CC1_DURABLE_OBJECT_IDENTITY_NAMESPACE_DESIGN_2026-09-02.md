# SimCore Post-3.0M Candidate C CC-1 Durable Object Identity / Namespace Design — 2026-09-02

Date: 2026-09-02 KST

Status: **CC-1 DESIGN FROZEN · DURABLE DERIVED IDENTITY / NAMESPACE CONTRACT · DESIGN-ONLY · NO RUNTIME ID ALLOCATION · NO STORE · NO REVISION ENGINE · NO MUTATION · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · CANDIDATE C · CC-1 · DURABLE DERIVED OBJECT IDENTITY · NAMESPACE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

CC-1 freezes the minimum identity contract required when a future Candidate C consumer needs to refer to the same logical derived object later than the projection that first created it.

It answers:

```text
what qualifies for stable derived identity?
who owns and allocates identity?
what namespace rules are required?
how identity differs from revision, fingerprints, ordinals, handles, and canonical entity IDs?
when is identity preserved versus replaced?
what lifetime does an identity have before a history-store design exists?
what exact locator shape may later consumers rely on conceptually?
```

CC-1 does not implement persistence or create a universal derived-object registry.

## 1. Authority chain

CC-1 consumes the frozen Candidate C master plus existing Source Intelligence support rules.

Primary authorities:

```text
SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01
SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01
Lineage / Handoff / Evidence authority ownership
```

Inherited rules remain:

```text
persisted != canonical fact
stable derived identity != canonical entity identity
fingerprint = support/equality evidence, not durable identity
indices = bounded locators, not durable identity
one Candidate C gate != all Candidate C capabilities
```

## 2. CC-1 primary decision

Selected identity architecture:

```text
OWNER_SCOPED_OPAQUE_DERIVED_IDENTITY
```

Canonical locator concept:

```text
DerivedObjectLocator
=
owner scope
+ namespace
+ opaque object ID
```

No generic serialized `DerivedObjectLocatorV1` schema is authorized by this document.

The tuple is conceptual vocabulary only.

## 3. Why identity exists

A durable identity exists only when a future operation must answer:

```text
"is this the same logical derived object?"
```

Examples that may justify stable identity:

```text
continue the same Board thread later
address the same Social post later
attach delayed media to the same semantic post
refer to the same derived actor/profile across multiple projections
mutate or append to one exact derived object
reference an exact derived parent from another derived family
```

Identity is not justified merely because an object is rendered on screen.

## 4. Identity qualification gate

An object qualifies for durable identity only when all conditions below hold conceptually:

```text
Q1 a concrete consumer requires later exact same-object addressing
Q2 projection-local ordinal/index is insufficient for that requirement
Q3 the object has a bounded semantic owner
Q4 the owner can define a bounded lifetime for the identity
Q5 the object kind has an admitted namespace
Q6 identity does not substitute for support/freshness authority
Q7 the requirement activates at least one Candidate C gate that truly needs targeting
```

Typical gates that pressure CC-1:

```text
C2 stable identity
C3 item mutation
C4 append / merge
C5 derived-parent targeting
C7 survivor targeting
C8 delayed effect targeting
```

C1 alone does not automatically require item-level IDs if a whole durable snapshot is sufficient.

C6 alone does not automatically require stable semantic IDs if bounded re-entry can be proven without them.

## 5. Default is no durable ID

Canonical rule:

```text
NO CONCRETE SAME-OBJECT REQUIREMENT
→ NO DURABLE ID
```

Current snapshot-only Source Intelligence objects therefore remain unchanged.

CC-1 does not retrofit IDs onto every BOARD, SOCIAL_FEED, NEWS, PUBLIC_KNOWLEDGE, or LIVE_REACTION object.

## 6. Derived identity is not canonical identity

A Candidate C ID names a derived product object.

It does not assert that the object corresponds one-to-one with a canonical world entity or event.

```text
DERIVED OBJECT ID
!=
CANONICAL CHARACTER ID
!=
CANONICAL EVENT ID
!=
WORLD STATE PRIMARY KEY
```

A durable rumor post may have a stable derived ID while the rumor content remains false.

## 7. Identity is not support authority

A durable locator proves only which derived object is being addressed.

It does not prove the object's content is still supported.

Required later-use separation remains:

```text
exact derived locator
        ↓
find candidate object
        ↓
re-prove required source/support authority
        ↓
consumer-specific use
```

Canonical rule:

```text
FOUND BY ID
!=
SUPPORTED FOR USE
```

## 8. Identity is not revision

CC-1 freezes only logical object identity.

```text
object ID
= which logical object?

revision / generation
= which version or operation state?
```

The same logical object may later have multiple revisions if CC-2 authorizes that model.

CC-1 does not define revision counters, mutation generations, compare-and-swap, or stale-operation tokens.

## 9. Identity is not runtime effect generation

A runtime UI generation/token may reject stale async effects.

That ownership remains separate from semantic durable identity.

```text
SEMANTIC DERIVED OBJECT ID
!=
RUNTIME EFFECT GENERATION
```

Future C8 designs may require both.

## 10. Forbidden durable identity substitutes

None of the following may be promoted into stable derived identity by convenience:

```text
array ordinal
projection ordinal
host message index
source assistant index
current user index
DOM position
render key derived only from ordinal
content fingerprint
source fingerprint
display name
username / handle
headline text
post body hash
semantic similarity
canonical character/world ID without explicit mapping contract
```

They may remain useful in their existing bounded roles.

## 11. Fingerprints remain evidence

Fingerprints answer bounded equality/support questions such as:

```text
"is this source content exactly the authority content I expected?"
```

They do not answer:

```text
"is this the same logical derived object after an authorized edit?"
```

Canonical rule:

```text
CONTENT CHANGED
MAY KEEP OBJECT ID
IF A FUTURE MUTATION CONTRACT SAYS SAME LOGICAL OBJECT

CONTENT IDENTICAL
MUST NOT IMPLY SAME OBJECT ID
```

Two separately created posts may have byte-identical content and still be distinct objects.

## 12. Ordinals remain projection-local

Projection-local ordinals remain valid for ephemeral validation and presentation ordering.

They cannot become cross-turn identity.

```text
post ordinal 2 in projection A
!=
post ordinal 2 in projection B
```

A later exact target requires a durable locator when C2/C3/C4/C5/C7/C8 demands it.

## 13. Handles and names are attributes

User-facing names and handles are mutable semantic attributes unless a specific consumer freezes otherwise.

```text
@alice
!=
stable SOCIAL_ACTOR derived ID
```

A handle may change while the same derived actor survives.

Two actors may also collide on display labels across independent scopes.

## 14. Owner-scoped allocation

Every durable derived ID has exactly one semantic allocation owner.

The owner is the bounded component or future durable consumer responsible for the object's lifecycle.

The owner must answer:

```text
who creates the ID?
when is it first allocated?
when is it retired?
which object kinds may it allocate?
which lifetime policy governs it?
which later consumers may resolve it?
```

Forbidden architecture:

```text
all source families
→ one implicit global SimCore object-ID allocator
```

unless a future concrete integration design proves such centralization necessary.

## 15. Allocation timing

Future allocation must happen only after the semantic object is eligible to exist under its owning consumer's contract.

Conceptual order:

```text
trusted authority / input
        ↓
semantic validation / consumer admission
        ↓
identity qualification gate
        ↓
allocate durable derived identity if required
        ↓
future store / mutation / effect layers if separately authorized
```

Forbidden:

```text
allocate permanent ID to every raw model candidate before validation
```

Rejected/quarantined raw candidates do not gain durable identity merely because they appeared in model output.

A child consumer may explicitly choose whether a policy-hidden but semantically valid object receives identity, but that decision must be frozen by that consumer rather than implied by CC-1.

## 16. Opaque identifier rule

The object-ID component should be opaque to semantic consumers.

It must not require consumers to parse meaning from the token.

Forbidden semantic encoding dependencies include:

```text
object type encoded only inside token
source authority encoded only inside token
revision encoded only inside token
creation turn encoded as required semantic meaning
parent object encoded as required semantic meaning
```

Namespace, authority refs, revision, and parent lineage remain separate concepts.

The physical ID algorithm is not frozen by CC-1.

Future implementations may choose an appropriate collision-resistant local mechanism consistent with owner scope and storage requirements.

## 17. Namespace purpose

A namespace prevents unrelated derived object classes from becoming accidentally comparable.

Conceptually:

```text
(namespace, object ID)
```

must distinguish object kinds even if raw ID tokens collide.

Namespace is semantic type/domain separation, not truth authority.

## 18. Namespace admission rule

A namespace may be admitted only when a concrete consumer requires durable objects of that kind.

Required admission questions:

```text
what exact derived object kind does it name?
which Candidate C gate requires stable targeting?
who owns allocation?
what lifetime applies?
which operations may preserve the same ID?
which operations require a new ID?
which consumers may resolve the namespace?
```

No namespace is created for aesthetic symmetry.

## 19. No universal namespace explosion

CC-1 does not freeze every hypothetical namespace.

The Candidate C master listed possible future kinds such as:

```text
BOARD_POST
BOARD_REPLY
SOCIAL_ACTOR
SOCIAL_POST
NEWS_STORY
PUBLIC_KNOWLEDGE_DOCUMENT
MEDIA_ATTACHMENT
```

CC-1 classifies these as **candidate namespace names only**.

Runtime admission remains:

```text
NONE
```

until a concrete child/consumer design opens the necessary gate.

## 20. Initial namespace decision

Because the currently frozen Source Intelligence scopes remain snapshot-only and no runtime Candidate C consumer is authorized, CC-1 selects:

```text
RUNTIME_NAMESPACE_REGISTRY = NONE
RUNTIME_DURABLE_ID_ALLOCATOR = NONE
```

The first real namespace must be introduced by the first concrete durable consumer.

This avoids designing an unused taxonomy in advance.

## 21. Namespace naming constraints

A future namespace should be:

```text
stable within its declared contract
specific enough to prevent accidental cross-kind equality
consumer-legible in diagnostics
independent from UI labels
independent from source text
```

It should not encode volatile presentation details.

Examples of good conceptual distinctions:

```text
BOARD_THREAD vs BOARD_POST only if lifecycle semantics truly differ
SOCIAL_ACTOR vs SOCIAL_POST when later operations target each independently
MEDIA_ATTACHMENT only if attachment has independent durable lifecycle
```

Do not split namespaces merely because two components render differently.

## 22. Locator equality

Conceptually, two derived locators refer to the same logical object only when all identity dimensions required by the owner match.

Minimum conceptual equality:

```text
same owner scope
AND same namespace
AND same opaque object ID
```

Support refs, revision, presentation state, and content equality are separate predicates.

## 23. Owner scope is part of identity domain

An opaque ID token need not be globally unique across all SimCore forever if the owner scope and namespace already establish a bounded uniqueness domain.

Canonical rule:

```text
GLOBAL UNIVERSAL UNIQUENESS
IS NOT A PRODUCT REQUIREMENT BY DEFAULT
```

A future storage/integration design may choose globally unique tokens for operational simplicity, but CC-1 does not make that semantic authority.

## 24. Lifetime of identity

CC-1 freezes the logical rule:

```text
ID VALIDITY LIFETIME
=
THE DECLARED LIFETIME OF THE OWNED DERIVED OBJECT
```

An identity must not outlive its owner-defined object lifetime by default.

Possible future object lifetimes remain consumer-specific, for example:

```text
conversation lifetime
N turns
N operations
until replacement
until explicit deletion
until supporting authority invalidation
```

No universal lifetime is selected.

## 25. Before a history store exists

CC-1 does not create a storage mechanism.

Therefore the current runtime state is:

```text
logical durable identity contract = designed
physical durable identity retention = not implemented
cross-turn lookup = not implemented
```

A future consumer may not claim cross-turn durability from CC-1 alone.

CC-3 or another explicitly authorized bounded persistence owner must define how the locator is retained and resolved.

Canonical rule:

```text
IDENTITY CONTRACT
!=
IDENTITY STORAGE
```

## 26. Identity creation versus persistence

An implementation may eventually allocate an ID before writing durable storage, but cross-turn semantics exist only if a separately authorized owner retains and resolves that identity.

CC-1 alone authorizes neither allocation nor retention.

## 27. Preservation rule

Identity may be preserved across an operation only when that future operation contract explicitly states that the result remains the same logical derived object.

Examples requiring later CC-2/CC-5 policy:

```text
EDIT same post
REROLL replacement content
MEDIA_REPLACE
REORDER
APPEND_CHILD
```

CC-1 does not decide these operations globally.

Default without an operation contract:

```text
CANNOT PROVE SAME LOGICAL OBJECT
→ DO NOT ASSUME ID PRESERVATION
```

## 28. Replacement rule

A new semantic object receives a new identity when the owning contract declares replacement rather than revision of the same logical object.

Source authority replacement does not automatically migrate identity.

```text
old source authority
→ new source authority
```

must not silently cause:

```text
old derived ID copied onto newly generated object
```

Any migration/reconciliation requires later explicit design.

## 29. Reroll ambiguity is deferred

Product UIs use the word `reroll` ambiguously.

Possible semantics include:

```text
same logical slot, new revision
new logical object replacing old one
new alternative object beside old one
```

CC-1 does not pick one universal interpretation.

The concrete mutation design must declare whether identity survives.

## 30. Delete and retirement

A future delete operation may retire an identity.

Retired IDs must not be silently recycled for a different logical object inside the same owner/lifetime domain.

Canonical rule:

```text
RETIRED LOCATOR
MUST NOT LATER NAME AN UNRELATED OBJECT
```

Whether tombstones are required is deferred to the concrete store/mutation design.

## 31. Identity reuse prohibition

Raw token reuse that could make an old locator resolve to a new unrelated object is forbidden.

This remains true even after content deletion if later delayed effects, references, or diagnostics could still carry the old locator.

A future implementation must choose an allocation strategy consistent with its stale-reference horizon.

## 32. Parent/child identity

A child derived object may later have its own identity independent from its parent's identity.

Example:

```text
BOARD_POST P
BOARD_REPLY R
```

If R must be targeted independently, R needs its own admitted namespace/ID or another explicit bounded child locator contract.

Parent identity does not automatically identify a child ordinal across revisions.

Derived-parent lineage itself remains CC-6 territory.

## 33. Cross-family reference rule

If C5 later allows one derived family to reference another derived object, the reference must point to an exact admitted durable locator rather than rediscovering the parent by text similarity.

```text
NEWS_STORY
→ exact derived parent locator for BOARD_POST
```

still does not promote the BOARD claim to canonical truth.

CC-1 only supplies identity vocabulary; support semantics remain external.

## 34. Delayed effect target rule

If C8 later attaches a delayed result to a semantic object, stable identity is necessary but not sufficient.

Conceptually:

```text
target locator
+ CC-2 operation/revision generation
+ support/lifetime checks
```

may be required.

CC-1 alone cannot prove a late effect is current.

## 35. Partial-survivor rule

C7 may later preserve a descendant after parent/source replacement.

A survivor's stable ID may remain only if its owning contract independently proves that the same logical child survives.

Text similarity never establishes survivor identity.

## 36. Re-entry rule

C6 context re-entry must not use durable ID as a truth/freshness shortcut.

```text
object has stable ID
!=
object eligible for prompt re-entry
```

Future CC-4 must separately prove exact fields, support, freshness, lifetime, budget, and duplicate prevention.

## 37. Storage-key caution

A future physical store may use a durable locator as part of a key.

That does not make storage layout part of semantic identity.

Do not force semantic consumers to know table names, key prefixes, file paths, JSON offsets, or cache keys.

## 38. Cache rule

A cache may map locators to objects for performance.

```text
cache hit
!=
identity/support proof
```

Cache eviction must not redefine whether two locators are semantically equal.

## 39. Serialization versioning

CC-1 does not freeze a serialized ID schema.

A future store must version its record/locator representation explicitly if needed.

Representation migration must preserve logical identity or fail closed; it may not silently assign new meanings to old IDs.

Detailed migration design is deferred.

## 40. Diagnostics

Future diagnostics may expose bounded identity metadata such as:

```text
owner
namespace
opaque object ID
lifetime state
```

If CC-2 later exists, revision/generation may appear separately.

Diagnostics must not expose identity as evidence of canonical truth.

## 41. Failure vocabulary

CC-1 recommends identity-specific conceptual failures:

```text
IDENTITY_NOT_REQUIRED
NAMESPACE_NOT_ADMITTED
OWNER_UNAVAILABLE
LOCATOR_MALFORMED
LOCATOR_NOT_FOUND
LOCATOR_EXPIRED
LOCATOR_RETIRED
IDENTITY_SCOPE_MISMATCH
IDENTITY_KIND_MISMATCH
```

These do not replace Candidate C support failures such as `SUPPORT_UNAVAILABLE` or `SUPPORT_MISMATCH`.

They also remain separate from Exposure DENY/HOLD and Presentation failures.

## 42. No fuzzy recovery

If exact durable identity resolution fails, forbidden recovery includes:

```text
search transcript for similar wording
guess by nearest handle
guess by ordinal
guess by fingerprint only
select latest object of same type
reattach by DOM position
```

Identity resolution is exact or fail-closed.

## 43. No implicit canonical mapping

A future derived actor may correspond to a canonical character, but CC-1 does not infer such equivalence.

A mapping like:

```text
SOCIAL_ACTOR derived locator
↔ canonical character ID
```

requires a separate explicit authority contract if ever needed.

The two identities remain independent by default.

## 44. No global graph requirement

Stable locators do not require a universal graph database.

A concrete consumer may need only:

```text
one owner
one admitted namespace
one bounded locator
one bounded lifetime
```

No parent edges, reverse indices, graph traversal, or global registry are implied.

## 45. Dormancy

When no Candidate C consumer requiring durable identity is active:

```text
no ID allocation
no namespace lookup
no identity registry initialization
no cross-turn resolution
no identity-related storage read/write
```

CC-1 inherits the Candidate C dormancy rule.

## 46. Cost boundary

Future identity lookup cost must be bounded to the requested owner/namespace/locator domain.

Forbidden default:

```text
resolve ID
→ scan total conversation history
```

Exact lookup mechanisms are deferred to CC-3 or consumer-specific storage design.

## 47. Consumer admission template

A future consumer opening CC-1 behavior should declare at minimum:

```text
consumer:
Candidate C gates:
derived object kind:
identity required: yes/no
allocation owner:
namespace:
logical lifetime:
same-ID preservation operations:
new-ID replacement operations:
resolvable by:
support authority owner:
storage owner if any:
```

This is a design checklist, not a frozen serialized schema.

## 48. Example: persistent Board thread

If a future Board feature requires exact continuation of the same thread:

```text
C1 + C2
```

may be activated.

Possible consumer design:

```text
owner = persistent Board feature
namespace = BOARD_THREAD or BOARD_POST, depending on actual object model
object ID = opaque
lifetime = bounded by that feature
```

CC-1 does not admit the namespace until that concrete feature is frozen.

## 49. Example: social actor

If a future Social feature needs the same derived account across turns:

```text
C2
```

may justify a `SOCIAL_ACTOR`-like namespace.

The stable derived actor ID remains separate from:

```text
handle
profile name
avatar URL
canonical character ID
```

A profile edit may keep identity only if the consumer's later operation contract says the logical actor persists.

## 50. Example: delayed image

If a delayed generated image must attach to an already-existing derived post:

```text
C2 + C8
```

stable post identity is required.

But stale-result rejection still requires CC-2/C8 generation semantics; object ID alone is insufficient.

## 51. Example: source replacement

Suppose an old source projection produced derived object `D` and later authority changes.

CC-1 does not permit:

```text
new projection looks similar
→ reuse D's ID
```

Identity continuity requires an explicit future reconciliation/survivor contract.

Otherwise the safe default is a new logical object.

## 52. Interaction with current 3M-6

Current 3M-6 remains authoritative for snapshot objects:

```text
same index != same source after edit/reroll
fingerprint = support evidence
whole-projection invalidation remains current default
```

CC-1 does not modify those rules.

It merely defines what a future durable identity must look like once a concrete Candidate C consumer genuinely needs one.

## 53. What CC-1 deliberately does not decide

Deferred to later checkpoints:

```text
CC-2 revision/generation counters and stale operation safety
CC-3 storage backend, retention, retrieval, tombstones, indexes
CC-4 prompt re-entry
CC-5 edit/reroll/delete/append reconciliation
CC-6 derived-parent lineage semantics
CC-7 survivor semantics
CC-8 delayed-effect attachment protocol
CC-9 integration/dormancy implementation
CC-10 convergence/runtime validation
```

## 54. Explicit non-goals

```text
NO runtime ID allocator
NO runtime namespace registry
NO durable storage
NO database schema
NO source history store
NO cross-turn lookup implementation
NO mutation semantics
NO revision counter
NO generation token
NO tombstone implementation
NO canonical entity registry
NO derived-to-canonical identity map
NO universal provenance graph
NO release transaction
```

## 55. Frozen invariants

```text
I1  durable identity exists only for a concrete later same-object requirement
I2  default for snapshot-only objects remains no durable ID
I3  derived identity is owner-scoped
I4  namespace separates object kind/domain from opaque ID token
I5  object ID must be semantically opaque to consumers
I6  fingerprint is evidence, not durable identity
I7  ordinal/index is projection-local, not durable identity
I8  handle/display name is an attribute, not durable identity
I9  stable derived ID is not canonical character/event identity
I10 found-by-ID does not imply supported-for-use
I11 identity and revision/generation are separate
I12 identity and runtime effect generation are separate
I13 namespace admission is consumer-driven, not taxonomy-driven
I14 no runtime namespace is admitted by CC-1 alone
I15 ID lifetime equals the declared owned-object lifetime
I16 identity contract does not imply persistence/storage
I17 ID preservation across edit/reroll/replacement requires an explicit later operation contract
I18 retired IDs are not recycled to unrelated objects within stale-reference horizon
I19 source-authority replacement does not silently migrate derived identity
I20 cross-family identity references remain non-canonical
I21 delayed effects need more than stable identity
I22 exact identity resolution fails closed; no fuzzy transcript recovery
I23 no universal global ID service or graph is required by default
I24 dormancy means zero identity work when no durable consumer is active
```

## 56. Frozen verdict

```text
CC1_DESIGN                         = FROZEN
IDENTITY_ARCHITECTURE              = OWNER_SCOPED_OPAQUE_DERIVED_IDENTITY
LOCATOR_CONCEPT                    = OWNER + NAMESPACE + OPAQUE_OBJECT_ID
DEFAULT_DURABLE_ID                 = NONE
RUNTIME_NAMESPACE_REGISTRY        = NONE
RUNTIME_ID_ALLOCATOR               = NONE
GLOBAL_ID_SERVICE                  = NOT_SELECTED
GENERIC_ID_SCHEMA                  = NOT_FROZEN
IDENTITY_SUPPORT_AUTHORITY         = NONE
IDENTITY_EQUALS_CANONICAL_ID       = FALSE
IDENTITY_EQUALS_REVISION           = FALSE
IDENTITY_EQUALS_FINGERPRINT        = FALSE
IDENTITY_EQUALS_ORDINAL            = FALSE
IDENTITY_STORAGE                   = NOT_AUTHORIZED
IDENTITY_RUNTIME                   = NOT_AUTHORIZED
PRODUCTION                         = UNCHANGED
release-simcore                    = UNCHANGED
NEXT_RECOMMENDED_CHECKPOINT        = CC-2 REVISION / GENERATION / OPERATION SAFETY
```

Canonical closing rules:

```text
GIVE AN OBJECT A STABLE ID ONLY WHEN A REAL CONSUMER MUST FIND THE SAME LOGICAL OBJECT AGAIN.

THE ID NAMES THE DERIVED OBJECT.
IT DOES NOT PROVE THE OBJECT IS TRUE, CURRENT, SUPPORTED, OR CANONICAL.
```
