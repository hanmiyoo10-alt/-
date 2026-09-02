# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 Public Reference Search Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-X2 IMPACT SCOPE FROZEN · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · PUBLIC_REFERENCE_SEARCH · IMPACT SCOPE**

## 0. Purpose

PK-6 reserved `PK-X2 PUBLIC_REFERENCE_SEARCH` as a separate expansion lane and explicitly stated:

```text
PERSISTENCE ALONE
!= SEARCH AUTHORITY

SEARCH RESULT FOUND
!= CLAIM SETTLED
```

PK-X1 subsequently converged `PK-D1 DURABLE_PAGE_IDENTITY` with C1+C2 only. PK-X1 authorizes exact identity resolution but explicitly forbids fuzzy title search, semantic similarity, transcript scanning, and registry-driven page resurrection.

PK-X2 therefore asks one narrow question:

> How can a user intentionally locate an already-addressable PUBLIC_KNOWLEDGE page without turning the durable page registry into a truth database, historical article cache, or unbounded search engine?

This transaction is design-only.

## 1. Existing authority remains unchanged

PK-X2 must consume, not replace:

```text
PK-X1 / PX1-1
→ trusted stable target identity

PK-X1 / PX1-2
→ authoritative durable page identity records

PK-X1 / PX1-3
→ current-view revalidation

PK-X1 / PX1-4
→ lifetime / feature-off / presentation lifecycle

PK-0..PK-4
→ settlement, document validation, presentation, citation provenance
```

Search must not become:

```text
world-truth authority
settlement authority
current source-job authority
target-identity authority
page-content authority
```

## 2. Candidate seams considered

### A. Persisted title/content search index

Rejected for the first seam.

A durable index containing titles, aliases, snippets, assertions, citations, or old semantic text would immediately create stale-content and mutation pressure.

```text
stored title changes
→ index mutation / alias history pressure

stored snippet changes
→ semantic cache / revision pressure
```

That risks C3/C4 and possibly C7 before the product requires them.

### B. Scan host transcript / prior rendered cards

Rejected.

Host transcript artifacts are historical output, not the PK-X1 page registry or current public-reference authority.

### C. Model/embedding semantic search

Rejected for the first seam.

It adds model/network/index authority, fuzzy identity matching, non-deterministic ranking, and cost on top of an identity feature that does not require them.

### D. Bounded active-lifetime locator retrieval + current trusted labels

Selected.

The first search seam may enumerate a bounded set of PK-X1 durable identity records in the **current ACTIVE lifetime only**, obtain the **current trusted display/search label** from the upstream target-identity/label authority, and perform bounded lexical matching over those current descriptors.

No semantic page body is stored or searched.

## 3. Selected seam

```text
ACTIVE_LIFETIME_PUBLIC_REFERENCE_SEARCH_CANDIDATE_RETRIEVAL_V1
```

Conceptual flow:

```text
explicit current PUBLIC_REFERENCE_SEARCH intent
        ↓
trusted ACTIVE lifetimeScopeRef
        ↓
PK-X1 owner bounded enumeration
        ↓
DurablePublicReferencePageIdentityV1 locators only
        ↓
trusted current target-label adapter
        ↓
CurrentPublicReferenceSearchDescriptorV1
        ↓
bounded lexical query policy
        ↓
INTERNAL SEARCH CANDIDATES
        ↓
current discoverability / PK revalidation gate
        ↓
VISIBLE SEARCH HITS
        ↓
selected hit
        ↓
normal PK-X1 exact resolution + PX1-3 current-view revalidation
```

## 4. Search candidate is not a page

A search candidate may contain only locator/search metadata such as:

```text
pageIdentity
targetIdentityRef
currentTrustedDisplayLabel
matchKind
```

Exact field names remain future child-contract work.

It must not contain:

```text
old page body
old title cache
old settlement state
old citation bundle
old sourceAuthorityRef
old rendered HTML
historical snippet
```

Canonical rule:

```text
SEARCH CANDIDATE
!= CURRENT PAGE VIEW
```

## 5. Search candidate is not automatically user-visible

Durable page existence may outlive current semantic availability. Therefore an internal locator match cannot automatically become a visible search result.

Canonical rule:

```text
LOCATOR MATCH
!= CURRENTLY DISCOVERABLE PUBLIC REFERENCE
```

A future PK-X2 child contract must define a bounded current visibility/discoverability receipt before a candidate may be surfaced to ordinary UI.

If current discoverability cannot be established, fail closed rather than revealing stale page-existence metadata.

## 6. Current labels only

PK-X2 does not persist title strings in the PK-X1 identity record.

Search labels must come from a trusted current target-label authority compatible with the same `targetIdentityRef`.

Therefore:

```text
same target + renamed current label
→ search may use current label
→ pageIdentity remains the same
```

Forbidden:

```text
old title cache as current search label
page title inferred from model prose
host transcript card title as identity proof
same visible label → same target
```

## 7. First query classes

The master lane may later freeze a bounded subset of:

```text
EXACT_PAGE_ID
EXACT_TARGET_ID
EXACT_CURRENT_LABEL
BOUNDED_PREFIX_OR_TOKEN_LABEL
BOUNDED_CURRENT_CORPUS_LIST
```

The impact scope does **not** authorize:

```text
semantic similarity
embedding search
arbitrary substring across page bodies
full-text assertion search
network search
historical revision search
cross-conversation search
global entity search
```

Exact lexical normalization/ranking belongs to a child checkpoint.

## 8. Bounded corpus only

First corpus boundary:

```text
current ACTIVE lifetimeScopeRef
+ namespace = PUBLIC_KNOWLEDGE_DOCUMENT
+ already-minted PK-X1 identities only
```

Search must not auto-mint page identities merely because a target matches a query.

```text
SEARCH MATCH
!= FIRST-MINT ELIGIBILITY
```

A page that has never satisfied PK-X1 first-mint rules does not become durable simply because search would like to return it.

## 9. Historical revision retrieval remains unsupported

PK-6 listed historical revision retrieval as a possible future PK-X2 requirement, but PK-X1/PK-D1 stores no semantic revisions.

Therefore first PK-X2 scope explicitly defers:

```text
historical revision retrieval
old article search
revision text search
restore/search old citations
```

Those require PK-D2/PK-D3 before search can consume them honestly.

## 10. Candidate C reassessment

The selected first seam does not require a new durable semantic index.

Current expectation:

```text
C1 = already selected by PK-X1
C2 = already selected by PK-X1
C3 = no new requirement
C4 = no new requirement
C5 = no new requirement
C6 = no new requirement
C7 = no new requirement
C8 = no new requirement
```

The bounded enumeration/search operation is a read/retrieval capability over existing PK-D1 locators, not a semantic mutation or historical page archive.

If a later design chooses a durable mutable title/alias/full-text index, Candidate C must be reassessed before that index is authorized.

## 11. Dormancy and cost

Search runs only under explicit current search intent/authority.

On ordinary source-irrelevant turns:

```text
PK-X2 lookup = 0
PK-X2 enumeration = 0
PK-X2 label resolution = 0
PK-X2 ranking = 0
PK-X2 presentation update = 0
network = 0
extra model call = 0
```

When active, work must be bounded to a concrete future cap over current-lifetime page identities and visible hits.

No background indexing or refresh is authorized.

## 12. Failure isolation

Conceptual failures include:

```text
lifetime UNKNOWN / ENDED
identity store unavailable
bounded enumeration unavailable
current label unavailable
ambiguous/conflicting target label binding
candidate visibility unproven
current page revalidation failure after selection
```

These must not be converted into:

```text
old title fallback
old page-body fallback
optimistic page creation
unbounded transcript scan
network/model search fallback
```

## 13. Presentation boundary

Search UI may eventually present a bounded list of current-safe page labels and navigation affordances.

It must not present:

```text
old snippets
settlement inferred from ranking
hidden/quarantined counts
opaque targetIdentityRef as semantic text
pageIdentity as factual page content
```

Selecting a hit expresses navigation intent only.

```text
SEARCH HIT SELECTED
!= CURRENT PAGE CONTENT VALID
```

The selected page still runs through current PK-X1/PX1-3 revalidation.

## 14. Explicit defers

```text
DEFER · DURABLE MUTABLE SEARCH INDEX
DEFER · HISTORICAL REVISION SEARCH
DEFER · FULL-TEXT PAGE-BODY SEARCH
DEFER · SEMANTIC / EMBEDDING SEARCH
DEFER · CROSS-CONVERSATION / GLOBAL SEARCH
DEFER · ALIAS / REKEY HISTORY SEARCH
DEFER · NETWORK REFERENCE SEARCH
DEFER · BACKGROUND INDEX REFRESH
DEFER · SEARCH-DRIVEN AUTO PAGE MINT
```

## 15. Recommended checkpoint ladder

```text
X2-0  Public Reference Search Master Design
X2-1  Retrieval / Label Authority Contract
X2-2  Candidate Visibility / Discoverability Gate
X2-3  Query Semantics / Ranking / Hard Caps
X2-4  Search Result Navigation + Current Revalidation
X2-5  Lifetime / Dormancy / Convergence
```

## 16. Selected verdict

```text
PK_X2 = OPEN AS DESIGN LANE
FIRST_SEAM = ACTIVE_LIFETIME_PUBLIC_REFERENCE_SEARCH_CANDIDATE_RETRIEVAL_V1
PERSISTED_SEMANTIC_INDEX = NO
CURRENT_TRUSTED_LABELS = REQUIRED
VISIBLE_RESULT_REQUIRES_CURRENT_DISCOVERABILITY = YES
SEARCH_RESULT_SETTLEMENT_AUTHORITY = NO
AUTO_MINT = NO
HISTORICAL_SEARCH = NO
CANDIDATE_C_NEW_GATES = NONE EXPECTED
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```

Canonical rule:

```text
SEARCH MAY FIND AN ADDRESS.
IT DOES NOT PROVE THE ARTICLE IS CURRENT, PUBLIC, OR TRUE.
```
