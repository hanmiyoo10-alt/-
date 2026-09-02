# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 Public Reference Search Master Design — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-0 MASTER DESIGN FROZEN · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · PUBLIC_REFERENCE_SEARCH · X2-0 MASTER**

## 0. Major decision

PK-X2 adds a bounded navigation/retrieval capability over already-addressable PK-X1 public-reference pages.

It does not add a new truth owner, settlement owner, semantic archive, revision system, global entity search engine, or automatic source activation mechanism.

Canonical definition:

```text
PK-X2
= FIND A CURRENTLY DISCOVERABLE PAGE ADDRESS

PK-X2
!= PROVE THE PAGE IS CURRENT
!= PROVE ITS CLAIMS ARE SETTLED
!= RESTORE OLD PAGE CONTENT
```

## 1. First capability boundary

The first PK-X2 profile is:

```text
ACTIVE_LIFETIME_PUBLIC_REFERENCE_SEARCH_V1
```

Search domain:

```text
trusted current lifetimeScopeRef = ACTIVE
namespace = PUBLIC_KNOWLEDGE_DOCUMENT
already-minted PK-X1 page identities only
```

No query may silently enlarge this domain to:

```text
other conversations
ended lifetimes
global targets
host transcript history
old rendered cards
NEWS / BOARD / SOCIAL_FEED corpora
network sources
unminted possible targets
```

## 2. Authority graph

```text
explicit current search intent / source-job authority
        ↓
trusted ACTIVE lifetime
        ↓
PK-X1 authoritative identity owner
        ↓ bounded read-only enumeration
DurablePublicReferencePageIdentityV1 locators
        ↓
trusted current target-label authority
        ↓
CurrentPublicReferenceSearchDescriptorV1
        ↓
query normalization / matching / ranking
        ↓
INTERNAL SEARCH CANDIDATES
        ↓
current discoverability gate
        ↓
VISIBLE SEARCH HITS
        ↓ user selects
navigation intent
        ↓
normal current PUBLIC_KNOWLEDGE activation
        ↓
PX1-1 stable target identity
        ↓
PX1-2 exact page resolution
        ↓
current PK generation + PK-2 validation
        ↓
PX1-3 current-view revalidation
        ↓
CURRENT PAGE SURFACE
```

No downstream search step may mint authority for an upstream step.

## 3. Search intent is explicit and current

PK-X2 runs only when the current authority explicitly selects a PUBLIC_REFERENCE_SEARCH operation.

Forbidden activation sources:

```text
old search state
old page card visible in UI
historical query text
keyword residue such as "wiki"
registry contains one or more pages
background refresh timer
```

Canonical rule:

```text
DURABLE PAGE EXISTS
!= SEARCH JOB ACTIVE
```

## 4. Retrieval owner

PK-X2 may ask the authoritative PK-X1 identity owner for a bounded enumeration of identity records under one exact active-lifetime namespace.

The retrieval owner returns locator metadata only.

It must not return or derive:

```text
old page body
old citations
old settlement state
old source authority
old render tree
last-known-good semantic document
revision text
```

An identity-store failure must fail closed. It must not trigger transcript scanning, cache inference, model search, network fallback, or optimistic reconstruction.

## 5. Current search descriptor

Conceptual ephemeral descriptor:

```text
CurrentPublicReferenceSearchDescriptorV1
  pageIdentity
  targetIdentityRef
  currentTrustedDisplayLabel
  labelAuthorityRef
```

A later child checkpoint may freeze exact fields and bounded receipts.

The descriptor is:

```text
EPHEMERAL
CURRENT SEARCH ACTIVATION ONLY
NON-CANONICAL
NON-SETTLEMENT
NON-MODEL-GENERATED AUTHORITY
```

It must never contain stored article text or historical snippets.

## 6. Current label authority

Searchable human-facing labels come from a trusted current label authority joined to the same `targetIdentityRef`.

They do not come from:

```text
old PK title cache
model-generated title
host transcript title
NEWS headline
BOARD nickname
SOCIAL_FEED profile text
```

Rename behavior:

```text
same targetIdentityRef
+ new trusted current label
→ same pageIdentity may match under new current label
```

Therefore label changes do not require mutating the PK-X1 durable identity record.

## 7. Candidate and visible-hit firewall

PK-X2 has two distinct result layers:

```text
INTERNAL SEARCH CANDIDATE
VISIBLE SEARCH HIT
```

A lexical/ID match creates only an internal candidate.

```text
MATCH
!= VISIBLE
```

Page existence can outlive current public semantic availability. Revealing a durable page merely because its locator still exists may leak stale page-existence metadata.

Therefore a future X2-2 contract must prove current discoverability before ordinary UI receives a candidate.

If discoverability is unknown, unavailable, stale, denied, held, or conflicting:

```text
candidate omitted / held
```

not:

```text
show old label + stale badge
show page existed before
show hidden-result count
```

## 8. Search does not prove settlement

Ranking, matching, or repeated discovery cannot upgrade claim authority.

```text
rank #1
!= most true

exact label match
!= claim settled

many searches
!= public-reference settlement

page has durable identity
!= current article valid
```

Settlement remains PK settlement authority only.

## 9. Search does not mint pages

Search corpus contains already-minted PK-X1 identities only.

```text
query matched target
!= pageIdentity may be created
```

First mint continues to require PX1-2 first-mint eligibility after a usable current PUBLIC_KNOWLEDGE document has succeeded.

PK-X2 is retrieval, not discovery-driven page creation.

## 10. Query family ownership

X2-0 reserves these bounded query families for X2-3 design:

```text
EXACT_PAGE_ID
EXACT_TARGET_ID
EXACT_CURRENT_LABEL
BOUNDED_PREFIX_OR_TOKEN_LABEL
BOUNDED_CURRENT_CORPUS_LIST
```

The first profile explicitly excludes:

```text
page-body full-text search
arbitrary regex / substring over semantic content
semantic embeddings
LLM reranking
network search
cross-conversation search
global entity search
historical revision search
```

Normalization, deterministic ranking, tie behavior, and hard caps belong to X2-3.

## 11. Result ranking is presentation/navigation metadata

A result order may help navigation but may not imply semantic quality, truth, public importance, settlement maturity, or canonical relevance.

Future ranking must be deterministic from approved query metadata unless a stronger authority is separately designed.

Preferred first principle:

```text
EXACT MATCH > PREFIX/TOKEN MATCH
```

but X2-0 does not freeze the full comparator.

## 12. Selection is navigation intent only

Selecting a visible search hit means:

```text
USER WANTS TO NAVIGATE TO THIS PAGE LOCATOR
```

It does not mean:

```text
page content is currently valid
source job is automatically authorized
settlement is proven
old content may be restored
```

A selected hit must re-enter the normal current PUBLIC_KNOWLEDGE path and pass PX1-3 current-view revalidation before semantic content is shown as current.

Canonical rule:

```text
SEARCH HIT SELECTED
!= CURRENT PAGE VALID
```

## 13. Stale-content firewall

PK-X2 must not have a last-known-good semantic fallback.

If selection later fails current validation:

```text
old body = not shown
old citations = not shown
old settlement = not shown
old snippets = not shown
```

Any feature that intentionally exposes historical page text belongs to a PK-D2/PK-D3 revision/history lane before search may consume it.

## 14. No persistent semantic search index in V1

The first design intentionally avoids a persistent mutable index of:

```text
titles
aliases
snippets
assertions
citations
settlement state
```

Reasons:

1. PK-X1 identity records already give bounded locators.
2. current labels can be projected from the current target-label authority.
3. persistent label/snippet indexes create mutation, stale-data, alias-history, and repair authority.
4. those pressures would require a fresh Candidate C reassessment.

Therefore:

```text
PK-X2 V1 SEARCH INDEX
= EPHEMERAL CURRENT-ACTIVATION DESCRIPTORS
```

## 15. Candidate C position

PK-X2 V1 adds no new Candidate C gate beyond PK-X1's C1+C2 design profile.

```text
C1 cross-turn identity survival = inherited from PK-X1
C2 stable identity              = inherited from PK-X1
C3 mutation                     = no new requirement
C4 append / merge               = no new requirement
C5 derived lineage              = no new requirement
C6 context re-entry             = no new requirement
C7 historical semantic survival = no new requirement
C8 delayed semantic effects     = no new requirement
```

A later durable mutable search index, alias history, revision retrieval, semantic cache, or cross-conversation index requires explicit reassessment before authorization.

## 16. Dormancy and performance

When no current PK-X2 search job is active:

```text
identity enumeration = 0
label projection = 0
query normalization = 0
matching / ranking = 0
candidate visibility checks = 0
search UI updates = 0
background indexing = 0
network calls = 0
extra model calls = 0
```

When active, all work is bounded to future concrete caps over:

```text
maximum identities enumerated
maximum descriptors materialized
maximum query length
maximum visible hits
maximum label length
```

No per-turn background maintenance is authorized.

## 17. Failure taxonomy

Future child contracts must preserve at least these failure classes without collapsing them into `no results`:

```text
SEARCH_SCOPE_NOT_ACTIVE
LIFETIME_UNAVAILABLE
IDENTITY_ENUMERATION_UNAVAILABLE
LABEL_AUTHORITY_UNAVAILABLE
LABEL_BINDING_CONFLICT
QUERY_INVALID_OR_OVER_CAP
NO_LEXICAL_MATCH
MATCH_NOT_CURRENTLY_DISCOVERABLE
SELECTION_CURRENT_REVALIDATION_FAILED
```

User-facing presentation may simplify states, but diagnostics must not confuse unavailable authority with a legitimate empty search result.

## 18. Presentation boundary

The first search UI may ultimately show only bounded, currently safe navigation data, such as:

```text
current trusted display label
optional non-semantic match affordance
open/select action
```

It must not surface:

```text
historical snippets
old settlement badges
hidden-result counts
opaque targetIdentityRef as factual text
pageIdentity as article content
rank as truth score
```

Search UI is navigation UI, not a mini article cache.

## 19. Historical revision search remains deferred

PK-6 listed historical revision retrieval as a possible future search requirement. PK-X1 / PK-D1 intentionally stores no semantic revisions.

Therefore:

```text
HISTORICAL REVISION SEARCH
= DEFER UNTIL REVISION/HISTORY AUTHORITY EXISTS
```

PK-X2 must not invent revision storage merely to satisfy search.

## 20. Child checkpoint ownership

```text
X2-0  Public Reference Search Master Design
      ✅ THIS DOCUMENT

X2-1  Retrieval / Label Authority Contract
      exact enumeration owner
      trusted current label join
      descriptor schema

X2-2  Candidate Visibility / Discoverability Gate
      when page existence may be surfaced
      fail-closed visibility receipts

X2-3  Query Semantics / Ranking / Hard Caps
      normalization
      match classes
      deterministic ordering
      concrete bounded limits

X2-4  Search Result Navigation + Current Revalidation
      selection contract
      current source-job handoff
      PX1-3 binding
      stale teardown

X2-5  Lifetime / Dormancy / Convergence
      feature-off / reload / scope-end behavior
      Candidate C reassessment
      final X2 capability profile
```

## 21. Explicit defers

```text
DEFER · DURABLE MUTABLE SEARCH INDEX
DEFER · PAGE-BODY FULL-TEXT SEARCH
DEFER · HISTORICAL REVISION SEARCH
DEFER · SEMANTIC / EMBEDDING SEARCH
DEFER · LLM RERANKING
DEFER · GLOBAL / CROSS-CONVERSATION SEARCH
DEFER · NETWORK REFERENCE SEARCH
DEFER · ALIAS / REKEY HISTORY SEARCH
DEFER · BACKGROUND INDEX REFRESH
DEFER · SEARCH-DRIVEN AUTO PAGE MINT
DEFER · SEARCH RESULT AS SETTLEMENT AUTHORITY
```

## 22. X2-0 frozen verdict

```text
PK_X2_DESIGN_LANE = OPEN
X2_0_MASTER = FROZEN
FIRST_PROFILE = ACTIVE_LIFETIME_PUBLIC_REFERENCE_SEARCH_V1
SEARCH_DOMAIN = ACTIVE CURRENT-LIFETIME PK-X1 IDENTITIES ONLY
PERSISTENT_SEMANTIC_INDEX = NO
CURRENT_TRUSTED_LABELS = YES
INTERNAL_CANDIDATE != VISIBLE_HIT
VISIBLE_HIT_REQUIRES_CURRENT_DISCOVERABILITY = YES
SELECTION_REQUIRES_CURRENT_PAGE_REVALIDATION = YES
AUTO_MINT = NO
SETTLEMENT_AUTHORITY = NO
NEW_CANDIDATE_C_GATES = NONE
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```

Final rule:

```text
PK-X2 CAN HELP THE USER FIND THE DOOR.
PK-X1 + CURRENT PK AUTHORITY STILL DECIDE WHAT MAY BE BEHIND IT NOW.
```
