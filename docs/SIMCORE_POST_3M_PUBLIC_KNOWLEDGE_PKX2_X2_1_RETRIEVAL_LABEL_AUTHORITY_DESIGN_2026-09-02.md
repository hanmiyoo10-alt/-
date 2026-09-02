# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 X2-1 Retrieval / Label Authority Design — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-1 DESIGN FROZEN · ACTIVE-LIFETIME AUTHORITATIVE LOCATOR CORPUS · CURRENT TRUSTED LABEL JOIN · COMPLETE-CORPUS / FAIL-CLOSED SEARCH INPUT · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · X2-1 · RETRIEVAL · CURRENT LABEL AUTHORITY · SEARCH DESCRIPTOR · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

X2-0 froze PUBLIC_REFERENCE_SEARCH as a bounded way to find already-minted PK-X1 page addresses inside the current active lifetime.

The X2-1 impact scope selected:

```text
ACTIVE_LIFETIME_IDENTITY_ENUMERATION_CURRENT_LABEL_JOIN_V1
```

X2-1 now freezes the exact semantic contract for:

```text
1. retrieving the current-lifetime page locator corpus,
2. proving that corpus is authoritative and complete,
3. obtaining trusted current human-facing labels without creating a label registry,
4. exact-joining locator identity to label authority,
5. assembling ephemeral search descriptors,
6. preserving incomplete/unavailable authority separately from legitimate empty/no-match states.
```

This document is design-only. It does not implement storage enumeration, pagination, label lookup, adapters, runtime schemas, matching/ranking, UI, model calls, network calls, background indexing, release changes, S7/v0.70.3 work, or `release-simcore` mutation.

## 1. Inherited authority stack

X2-1 preserves:

```text
upstream target semantic / identity owners
→ target sameness and current target naming where already owned

PX1-1 Stable Target Identity Adapter
→ admitted collision-safe targetIdentityRef

PX1-2 PK-X1 Identity Owner
→ DurablePublicReferencePageIdentityV1 locator records

PK-2 / current PK validation
→ current public-reference semantic disposition

X2-1
→ current search locator/label composition only

X2-2
→ candidate-to-visible discoverability gate

X2-3
→ query semantics / ranking / concrete caps

X2-4
→ selected-result navigation and current page revalidation
```

Canonical separation:

```text
TARGET IDENTITY AUTHORITY
!= PAGE IDENTITY AUTHORITY
!= CURRENT LABEL AUTHORITY
!= PAGE SEMANTIC AUTHORITY
!= SEARCH VISIBILITY AUTHORITY
```

## 2. Frozen first profile

```text
X2_1_PROFILE
= ACTIVE_LIFETIME_IDENTITY_ENUMERATION_CURRENT_LABEL_JOIN_V1
```

Required outer scope:

```text
current explicit PK-X2 search authority = active
trusted lifetimeScopeRef                = current ACTIVE PK-X1 lifetime
namespace                               = PUBLIC_KNOWLEDGE_DOCUMENT
```

No other lifetime or namespace may be silently searched.

## 3. Two corpus layers

X2-1 freezes two separate internal corpus concepts:

```text
A. Authoritative locator corpus
B. Current-label descriptor corpus
```

They are intentionally not collapsed.

Reason:

```text
page identity may exist
while
current trusted label authority is unavailable
```

Canonical rule:

```text
LOCATOR CORPUS READY
DOES NOT IMPLY
LABEL CORPUS READY
```

## 4. Locator corpus source

The sole source of page locator records is the authoritative PK-X1 identity owner frozen by PX1-2.

Frozen record semantics remain:

```text
DurablePublicReferencePageIdentityV1
  schemaVersion
  namespace
  pageIdentity
  lifetimeScopeRef
  targetIdentityRef
```

X2-1 may read these records. It may not add fields to them, repair them, rename them, mutate them, or persist search-specific metadata beside them under this contract.

## 5. Enumeration request semantics

Conceptual request:

```text
PublicReferenceIdentityEnumerationRequestV1
  namespace
  lifetimeScopeRef
```

Required values:

```text
namespace = PUBLIC_KNOWLEDGE_DOCUMENT
lifetimeScopeRef = exact trusted current active lifetime
```

The current search activation is authorization context around the call; it does not become durable record metadata.

Exact runtime serialization and call signature remain future implementation authority.

## 6. Enumeration owner must answer as an authority

The identity owner must distinguish these outcomes:

```text
READY_COMPLETE
EMPTY_COMPLETE
HOLD_UNAVAILABLE
HOLD_PARTIAL
INVALID_SCOPE
INVALID_NAMESPACE
INVALID_RECORD_SET
```

Exact runtime enum spellings are not frozen.

The important semantic distinction is frozen:

```text
EMPTY_COMPLETE
= owner authoritatively proved zero records in the exact admitted domain

HOLD_UNAVAILABLE / HOLD_PARTIAL
= owner did not prove the complete corpus
```

## 7. Complete bounded enumeration requirement

The first label-search corpus may only be built from an authoritative **complete** locator enumeration for the admitted domain.

If the physical backend uses pagination, shards, cursors, or batches, those are implementation details.

Semantically, X2-1 must not receive a supposedly searchable corpus until the bounded request is proven complete.

Forbidden:

```text
first page of storage results
→ silently treat as whole search corpus

backend timeout after 80%
→ search the 80% anyway

unknown truncation
→ call remaining absence "no match"
```

Canonical rule:

```text
PARTIAL CORPUS
!= SEARCHABLE COMPLETE CORPUS
```

Concrete maximum corpus size belongs to X2-3.

If the complete corpus exceeds the future admitted cap, the first profile must hold/fail closed rather than search an arbitrary prefix.

## 8. Empty corpus is a first-class success

Legal:

```text
READY exact search scope
+
authoritative enumeration
+
zero PK-X1 identities
→ EMPTY_COMPLETE
```

This may later support a legitimate empty search result.

It must not be confused with:

```text
store unavailable
scope invalid
partial read
corrupt record set
```

## 9. Locator record validation

Before a record enters the locator corpus, X2-1 requires mechanical validation against inherited PX1-2 invariants.

At minimum:

```text
record namespace == PUBLIC_KNOWLEDGE_DOCUMENT
record lifetimeScopeRef == trusted current lifetimeScopeRef
record schema version admitted
pageIdentity structurally present
opaque targetIdentityRef structurally present
```

The enumerated set must also preserve PX1-2 uniqueness expectations:

```text
one (namespace, lifetimeScopeRef, targetIdentityRef)
→ zero or one pageIdentity

one pageIdentity
→ one exact uniqueness key
```

Duplicate/conflicting records invalidate the corpus for X2-1.

X2 must not choose one duplicate heuristically.

## 10. Enumeration is read-only least authority

The X2 retrieval path may not:

```text
mint pageIdentity
delete pageIdentity
rewrite targetIdentityRef
move lifetimeScopeRef
repair duplicate records
attach labels to identity records
attach search rank
attach lastSeenAt semantic meaning
attach search popularity
```

It is a bounded read of owner-owned locator data only.

## 11. Locator corpus conceptual result

Conceptual internal object:

```text
AuthoritativePublicReferenceLocatorCorpusV1
  status
  namespace
  lifetimeScopeRef
  records[]
  reasonCode
```

`records[]` exists only for an admitted complete result.

No page semantic text is copied into this corpus.

No physical runtime object is authorized by this design.

## 12. No semantic payload in locator corpus

Forbidden fields/content:

```text
displayLabel
page title
article body
assertion text
citation bundle
referenceState
settlement basis
sourceAuthorityRef
old source support
revision body
renderer tree
DOM / HTML
host transcript data
```

The locator corpus is an address book of opaque page addresses, not a library shelf of article text.

## 13. Current label authority problem

Search by a human-facing name requires a current trusted display label.

But PX1-2 deliberately does not persist `displayLabel`, and PX1-1 deliberately says labels are not identity keys.

Therefore X2-1 must obtain labels from current upstream semantic authority, not from the durable page identity record.

Canonical rule:

```text
DURABLE ADDRESS
+
CURRENT NAME
```

not:

```text
DURABLE ADDRESS CONTAINS NAME
```

## 14. Frozen current-label authority contract

Conceptual binding:

```text
CurrentTargetSearchLabelBindingV1
  labelAuthorityRef
  targetIdentityRef
  validForLifetimeScopeRef
  currentTrustedDisplayLabel
  bindingState
```

This is conceptual vocabulary only.

The binding is issued by an admitted upstream current target/label authority capability.

X2-1 consumes it. X2-1 does not own the name.

## 15. Relationship to existing PUBLIC_KNOWLEDGE target context

Existing PUBLIC_KNOWLEDGE already freezes:

```text
PublicKnowledgeDocumentTargetContextV1
  targetRef
  displayLabel
```

with the trusted current target context owning visible title/display-label data.

X2-1 extends no new naming authority.

It requires a search-oriented read capability from the same semantic authority class so that an already-known stable `targetIdentityRef` can receive its current trusted human-facing label.

This does not redefine the single-target current PK context as a global directory.

## 16. No global label registry

X2-1 explicitly rejects:

```text
SimCoreGlobalEntityRegistry
GlobalTargetNameStore
CrossConversationAliasDB
UniversalCanonicalNameIndex
```

Different target kinds may remain owned by different upstream authorities.

The first contract only requires an admitted adapter/capability that can answer for a given opaque stable target identity:

```text
one current exact label binding
OR
an explicit unsupported / unavailable / ambiguous / conflict outcome
```

## 17. Opaque targetIdentityRef stays opaque

PX1-1 froze `targetIdentityRef` as an opaque collision-safe same-target locator.

X2-1 therefore may compare it for exact equality but may not parse it to infer:

```text
entity kind
human name
owner display name
world facts
page title
source family
settlement state
```

If future routing to a concrete label provider is necessary, that routing must be an admitted trusted adapter concern.

X2 cannot decode semantic facts from the opaque locator.

## 18. Exact label join

A label binding may attach to one locator record only when:

```text
binding.targetIdentityRef
== record.targetIdentityRef
```

and:

```text
binding.validForLifetimeScopeRef
== trusted current lifetimeScopeRef
```

and:

```text
binding.bindingState
== current exact admitted binding
```

No label-text join is permitted.

## 19. Label joins forbidden by text similarity

Forbidden:

```text
record for T1
+
old page title "Alex"
+
current label candidate "Alex"
→ assume same target
```

Forbidden join signals include:

```text
same string
prefix similarity
case-insensitive equality
semantic similarity
same NEWS wording
same BOARD nickname
same SOCIAL_FEED handle
same host transcript name
model assertion that names refer to same object
```

Only exact trusted `targetIdentityRef` binding is admitted.

## 20. Current label value semantics

`currentTrustedDisplayLabel` is human-facing addressing text owned by upstream current target authority.

It is not:

```text
stable identity key
canonical world fact bundle
article title history
search alias set
settlement proof
source evidence
```

The trusted original label value is what X2-1 carries into the ephemeral descriptor.

Normalization for query matching is deferred to X2-3 and must not mutate the authority-owned label value.

## 21. Rename behavior

Legal:

```text
Turn A
  pageIdentity = P
  targetIdentityRef = T
  currentTrustedDisplayLabel = "Old Name"

Later current search activation
  pageIdentity = P
  targetIdentityRef = T
  currentTrustedDisplayLabel = "New Name"
```

Result:

```text
same durable page address
same stable target identity
new current search label
```

No PK-X1 record mutation occurs.

No old name automatically becomes an alias.

## 22. Same label, different identities

Legal:

```text
P1 → T1 → "Alex"
P2 → T2 → "Alex"
T1 != T2
```

X2-1 produces two distinct descriptors if both label bindings are otherwise valid.

It must not merge them.

Disambiguation/ranking/presentation belongs downstream.

## 23. One identity, multiple competing current labels

The first profile requires one exact admitted current display label per target identity for label-corpus readiness.

If the trusted authority seam produces unresolved competing labels:

```text
HOLD_LABEL_AMBIGUOUS
or
HOLD_LABEL_CONFLICT
```

depending on the authority condition.

Forbidden repairs:

```text
pick first
pick lexicographically first
pick longest
pick shortest
pick most recent backend timestamp without authority
keep both as aliases
ask model to choose
```

## 24. Unsupported label capability

A target may have durable page identity support but no admitted current label lookup capability for search.

This is legal:

```text
locator exists
label search capability unsupported
```

Result:

```text
locator corpus remains valid
label corpus is not complete for general label search
```

X2 must not backfill from old PUBLIC_KNOWLEDGE content.

## 25. Label unavailability does not mutate identity

If current label authority is temporarily unavailable:

```text
pageIdentity remains untouched
targetIdentityRef remains untouched
identity record remains untouched
```

No deletion, rename, repair, or tombstone is implied.

The failure belongs to the current search activation only.

## 26. Frozen label result states

Conceptual states:

```text
LABEL_READY_EXACT
UNSUPPORTED_LABEL_CAPABILITY
HOLD_LABEL_UNAVAILABLE
HOLD_LABEL_AMBIGUOUS
HOLD_LABEL_CONFLICT
INVALID_LABEL_SCOPE
INVALID_LABEL_BINDING
INVALID_LABEL_VALUE
```

Exact runtime enum spelling remains implementation authority.

## 27. No stale label fallback

Forbidden fallback sources:

```text
old PK title
last successful search descriptor
old rendered card
host transcript
NEWS headline
BOARD nickname/title
SOCIAL_FEED handle/profile
LIVE_REACTION nickname
model-generated guess
query string
cached UI text
```

Canonical rule:

```text
NO CURRENT TRUSTED LABEL
→ NO TRUSTED CURRENT SEARCH LABEL
```

## 28. Descriptor schema

X2-1 freezes the semantic descriptor from X2-0:

```text
CurrentPublicReferenceSearchDescriptorV1
  pageIdentity
  targetIdentityRef
  currentTrustedDisplayLabel
  labelAuthorityRef
```

No extra semantic article fields are admitted.

Exact runtime serialization is not authorized here.

## 29. Descriptor field ownership

```text
pageIdentity
← PK-X1 identity owner

targetIdentityRef
← PK-X1 record, ultimately admitted through PX1-1 target identity authority

currentTrustedDisplayLabel
← admitted current label authority

labelAuthorityRef
← admitted current label authority
```

The X2 composer owns only the exact association of already-trusted values for the current search activation.

It may not rewrite, normalize-in-place, or persist upstream-owned fields.

## 30. Descriptor admission

A descriptor may be admitted only when:

```text
locator record is valid inside READY_COMPLETE locator corpus
+
exact current label binding is LABEL_READY_EXACT
+
record.targetIdentityRef == binding.targetIdentityRef
+
record.lifetimeScopeRef == binding.validForLifetimeScopeRef == current lifetime
```

Then:

```text
DESCRIPTOR_READY
```

Otherwise no label-bearing descriptor exists for that record.

## 31. Descriptor corpus coverage state

X2-1 freezes an important distinction between locator completeness and label coverage.

Conceptual label corpus state:

```text
LABEL_CORPUS_EMPTY_COMPLETE
LABEL_CORPUS_READY_COMPLETE
LABEL_CORPUS_INCOMPLETE
LABEL_CORPUS_UNAVAILABLE
LABEL_CORPUS_INVALID
```

Meaning:

```text
EMPTY_COMPLETE
→ locator corpus authoritatively empty; no labels required

READY_COMPLETE
→ every locator record needed for general label search has one exact current label descriptor

INCOMPLETE
→ locator corpus is complete but one or more records lack an admitted current label

UNAVAILABLE
→ required label authority path could not produce a current corpus

INVALID
→ conflict/invalid binding makes the label corpus unsafe
```

## 32. Why label-corpus completeness matters

Suppose locator corpus contains:

```text
P1 → T1 → label READY
P2 → T2 → label UNAVAILABLE
```

If the system searches only P1's label and then claims:

```text
"no match for query Q"
```

it may be wrong because T2's current name is unknown.

Therefore:

```text
INCOMPLETE LABEL CORPUS
MUST NOT BECOME
AUTHORITATIVE NO-LEXICAL-MATCH
```

X2-3 must consume this distinction.

## 33. Positive search under incomplete label coverage is not authorized by X2-1

X2-1 deliberately does not decide whether a future UI may show a known positive label match while admitting that overall search coverage is incomplete.

For the first safe profile, downstream design should assume:

```text
GENERAL LABEL SEARCH
requires LABEL_CORPUS_READY_COMPLETE
```

unless X2-3 explicitly designs a different user-visible incomplete-results contract.

No such contract is authorized here.

## 34. Exact opaque-ID queries remain separate

X2-0 reserved:

```text
EXACT_PAGE_ID
EXACT_TARGET_ID
```

Those operations may use the complete locator corpus even when label coverage is incomplete.

But:

```text
locator found
!= visible search hit
```

A result still cannot bypass X2-2 current discoverability rules, and ordinary human-facing presentation without a trusted current label remains an X2-2/X2-4 question.

X2-1 does not authorize exposing opaque IDs as article text.

## 35. Label freshness horizon

A descriptor is current-search-activation scoped only.

It may not be reused as a trusted label in:

```text
later unrelated turn
later search activation
another lifetime
another conversation
after scope teardown
```

If a new search activation occurs, label authority must be re-read/re-established according to the current contract.

Canonical rule:

```text
DESCRIPTOR CACHE HIT
!= CURRENT LABEL AUTHORITY
```

## 36. No cross-activation label persistence

The first profile does not persist:

```text
label snapshots
aliases
rename history
last successful descriptor
labelAuthorityRef history
search terms
search popularity
```

Persistent alias/title history would introduce mutation/history ownership and trigger a fresh Candidate C reassessment.

## 37. Support-at-use principle

X2-1 inherits the broader SimCore rule that support must still be current when a derived result is used.

Therefore a descriptor assembled earlier in the same active search path does not gain durable authority.

Before ordinary UI exposure, X2-2 must prove the candidate is currently discoverable under its own contract.

If the current label binding can no longer be supported at that stage, the safe response is to rebuild/hold according to future design, not to rely on the old descriptor as canonical truth.

## 38. X2-1 is not the discoverability gate

X2-1 answers:

```text
what durable page addresses exist in this active lifetime?
what are their current trusted human-facing labels, where authoritatively available?
```

It does not answer:

```text
may the existence of this page be revealed to the user now?
```

That remains X2-2.

Canonical rule:

```text
DESCRIPTOR_READY
!= VISIBLE_HIT
```

## 39. X2-1 is not settlement authority

None of these imply article validity:

```text
pageIdentity exists
current label exists
descriptor exists
exact query match later occurs
```

Current page semantics still require the normal current PK path and PK-2/X2-4 revalidation.

## 40. Search composer conceptual component

Selected conceptual component:

```text
PublicReferenceSearchDescriptorComposer
```

Authority:

```text
consume complete locator corpus
consume admitted current label bindings
exact-join by targetIdentityRef
preserve lifetime equality
produce ephemeral label-bearing descriptors
produce bounded non-semantic status metadata
```

It does not:

```text
own target naming
own target identity
own page identity
query semantic article bodies
rank results
make results visible
validate settlement
mint pages
persist aliases
repair upstream data
```

## 41. Composer properties

First profile:

```text
PURE OR EFFECTIVELY READ/COMPOSE-ONLY
CURRENT-ACTIVATION-ONLY
BOUNDED
DETERMINISTIC GIVEN TRUSTED INPUTS
FAIL-CLOSED
NO PERSISTENT WRITES
```

Implementation form is not frozen.

## 42. Model boundary

The semantic model cannot be an authority for:

```text
pageIdentity
targetIdentityRef
currentTrustedDisplayLabel
labelAuthorityRef
label binding state
locator corpus completeness
label corpus completeness
```

The model does not need to emit X2-1 authority fields.

## 43. Network boundary

X2-1 authorizes no network discovery.

It may not search the web for a current target name merely because the upstream label owner is unavailable.

Any future network-backed upstream owner would require its own admitted authority contract outside this design.

## 44. Derived-family boundary

The following are not current label authority:

```text
NEWS headline
BOARD title / nickname
SOCIAL_FEED profile / handle
LIVE_REACTION nickname
old PUBLIC_KNOWLEDGE title/body
cross-family naming agreement
```

Derived content cannot bootstrap X2 trusted labels.

## 45. Host transcript boundary

X2-1 must not scan host transcript history to reconstruct:

```text
old page names
likely aliases
last visible title
most recent mention
```

This preserves the structured-memory/reentry boundaries frozen earlier.

## 46. Query normalization boundary

X2-1 carries the trusted original current display label.

It does not decide:

```text
Unicode normalization
case folding
whitespace folding
tokenization
prefix behavior
locale collation
punctuation stripping
```

Those belong to X2-3.

Search normalization must later produce comparison keys without rewriting the authority-owned label value.

## 47. Label length / corpus cap boundary

X2-1 requires bounded operation but does not freeze numeric values.

X2-3 owns exact caps for:

```text
identity records
label lookups
descriptors
query length
label length
visible hits
```

X2-1's semantic requirement is:

```text
if complete safe processing cannot fit the admitted cap
→ do not silently truncate and pretend completeness
```

## 48. Failure taxonomy

Frozen semantic categories:

### Locator retrieval

```text
RETRIEVAL_READY_COMPLETE
RETRIEVAL_EMPTY_COMPLETE
HOLD_IDENTITY_ENUMERATION_UNAVAILABLE
HOLD_IDENTITY_ENUMERATION_PARTIAL
INVALID_ENUMERATION_SCOPE
INVALID_ENUMERATION_NAMESPACE
INVALID_IDENTITY_RECORD_SET
```

### Label binding

```text
LABEL_READY_EXACT
UNSUPPORTED_LABEL_CAPABILITY
HOLD_LABEL_UNAVAILABLE
HOLD_LABEL_AMBIGUOUS
HOLD_LABEL_CONFLICT
INVALID_LABEL_SCOPE
INVALID_LABEL_BINDING
INVALID_LABEL_VALUE
```

### Descriptor/corpus

```text
DESCRIPTOR_READY
DESCRIPTOR_OMITTED_LABEL_NOT_READY
LABEL_CORPUS_EMPTY_COMPLETE
LABEL_CORPUS_READY_COMPLETE
LABEL_CORPUS_INCOMPLETE
LABEL_CORPUS_UNAVAILABLE
LABEL_CORPUS_INVALID
```

Exact enum names remain runtime design work.

## 49. Failure precedence

Conceptual precedence:

```text
invalid active scope / namespace
→ stop

identity enumeration unavailable / partial / invalid
→ no locator corpus
→ no label corpus

locator corpus empty complete
→ label corpus empty complete

locator corpus ready complete
→ resolve current labels

all required labels ready exact
→ label corpus ready complete

any unsupported/unavailable required label
→ label corpus incomplete/unavailable

any conflicting/invalid binding
→ label corpus invalid
```

X2-3 must not convert upstream authority failure into `NO_LEXICAL_MATCH`.

## 50. Diagnostic receipt minimization

A future bounded X2-1 receipt may carry control metadata such as:

```text
stage status
namespace
lifetime binding status
record count bounded by admitted cap
label coverage state
reason code classes
```

It should not persist:

```text
article content
assertions
citations
old labels
hidden current labels
settlement prose
source prose
query history
```

Any diagnostic counts are internal and do not authorize user-facing hidden-result counts.

## 51. No user-facing hidden counts

Even if diagnostics know:

```text
N locator records
M label-ready records
```

X2-1 does not authorize UI such as:

```text
"3 hidden results"
"1 unavailable page"
```

because page existence itself may be sensitive until X2-2 discoverability succeeds.

## 52. Owner-write rule

X2-1 performs no persistent write in V1.

It therefore cannot:

```text
fill missing labels into PK-X1 records
remove unknown fields from upstream records
replace owner metadata with projected subsets
write null for fields it does not own
```

The common invariant remains:

```text
omission of unowned metadata != delete
```

## 53. Search activation dormancy

When X2 is not explicitly active:

```text
identity enumeration = 0
label reads = 0
descriptor assembly = 0
corpus validation = 0
persistent writes = 0
background jobs = 0
network calls = 0
model calls = 0
```

Existing durable page identities are passive state, not activation signals.

## 54. Search activation teardown

At the end of the current X2 search activation, ephemeral X2-1 objects are discardable:

```text
locator corpus snapshot
ephemeral label bindings as consumed by X2
descriptor corpus
diagnostic working state
```

The underlying PK-X1 identity records remain owned by PK-X1 and are not deleted by X2 teardown.

Exact teardown mechanics belong to X2-5.

## 55. Candidate C reassessment

X2-1 introduces no new Candidate C gates.

```text
C1 = inherited PK-X1 cross-turn page identity
C2 = inherited PK-X1 stable derived identity
C3 = no new mutation requirement
C4 = no append/merge
C5 = no derived-to-derived lineage
C6 = no model-context reentry
C7 = no semantic history survival
C8 = no delayed semantic effect
```

Persistent aliases, mutable title indexes, revision search, or cross-conversation indexes would require a fresh reassessment.

## 56. Security / leakage invariants

Frozen invariants:

```text
S1. identity existence alone is not user-visible authority
S2. label readiness alone is not discoverability authority
S3. no stale label fallback
S4. no partial corpus represented as complete
S5. no unavailable authority represented as empty search
S6. no label text used to repair stable identity
S7. no model-generated trusted label
S8. no derived-family naming substitution
S9. no transcript reconstruction
S10. no hidden-result count UI from internal corpus diagnostics
```

## 57. X2-2 handoff contract

X2-1 hands X2-2 only internal current-search candidate material that has passed X2-1 authority composition.

For label-bearing candidates:

```text
CurrentPublicReferenceSearchDescriptorV1
```

X2-2 must still answer:

```text
may this candidate's existence and safe navigation label be exposed now?
```

X2-1 must not pre-answer that question.

## 58. X2-3 handoff contract

X2-3 receives:

```text
complete authoritative locator corpus state
+
label corpus coverage state
+
READY descriptors where available
```

It must preserve the difference between:

```text
NO MATCH
vs
SEARCH CORPUS NOT AUTHORITATIVELY COMPLETE FOR THIS QUERY FAMILY
```

This is a hard downstream requirement.

## 59. X2-4 handoff contract

X2-1 does not create current page validity.

After result selection, X2-4 still must re-enter:

```text
normal current PUBLIC_KNOWLEDGE activation
→ PX1-1
→ PX1-2
→ current PK validation
→ PX1-3 current-view revalidation
```

No descriptor or search hit may serve as last-known-good page semantic content.

## 60. Explicit defers

```text
DEFER · X2-2 CANDIDATE VISIBILITY / DISCOVERABILITY RECEIPT
DEFER · X2-3 NORMALIZATION / MATCH CLASSES / RANKING / HARD CAPS
DEFER · X2-4 SELECTION / NAVIGATION / CURRENT REVALIDATION
DEFER · X2-5 LIFETIME / DORMANCY / CONVERGENCE DETAILS
DEFER · DURABLE MUTABLE SEARCH INDEX
DEFER · ALIAS / RENAME HISTORY
DEFER · HISTORICAL LABEL SEARCH
DEFER · PAGE BODY SEARCH
DEFER · SEMANTIC / EMBEDDING SEARCH
DEFER · GLOBAL / CROSS-CONVERSATION DIRECTORY
DEFER · NETWORK LABEL DISCOVERY
DEFER · MODEL LABEL RECONSTRUCTION
DEFER · SEARCH-DRIVEN PAGE MINT
```

## 61. X2-1 frozen verdict

```text
X2_1_DESIGN = FROZEN
PROFILE = ACTIVE_LIFETIME_IDENTITY_ENUMERATION_CURRENT_LABEL_JOIN_V1
LOCATOR_OWNER = PK-X1 AUTHORITATIVE IDENTITY OWNER
LOCATOR_SCOPE = EXACT CURRENT ACTIVE LIFETIME + PUBLIC_KNOWLEDGE_DOCUMENT
LOCATOR_CORPUS_MUST_BE_COMPLETE = YES
PARTIAL_CORPUS_SEARCH = NO
CURRENT_LABEL_OWNER = ADMITTED UPSTREAM CURRENT TARGET/LABEL AUTHORITY
LABEL_JOIN = EXACT targetIdentityRef
LABEL_IS_IDENTITY = NO
STALE_LABEL_FALLBACK = NO
GLOBAL_LABEL_REGISTRY = NO
PERSISTENT_LABEL_INDEX = NO
DESCRIPTOR = EPHEMERAL CURRENT SEARCH ACTIVATION ONLY
LABEL_CORPUS_COVERAGE_STATE = REQUIRED
INCOMPLETE_LABEL_CORPUS_CAN_CLAIM_NO_MATCH = NO
X2_2_DISCOVERABILITY_GATE = REQUIRED
SETTLEMENT_AUTHORITY = NO
NEW_CANDIDATE_C_GATES = NONE
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```

Final rule:

```text
X2-1 BUILDS A SEARCHABLE MAP ONLY WHEN
THE ADDRESS BOOK IS COMPLETE
AND THE NAMES COME FROM THEIR CURRENT OWNERS.

A MISSING NAME IS NOT PERMISSION TO READ YESTERDAY'S SIGN.
```