# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 X2-3 Query Semantics / Ranking / Hard Caps Design — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-3 DESIGN FROZEN · CONSERVATIVE NORMALIZATION · CLOSED MATCH LATTICE · X2-2-BEFORE-RANKING · DETERMINISTIC VISIBLE-ONLY ORDER · CONCRETE FINITE CAPS · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · X2-3 · QUERY SEMANTICS · RANKING · HARD CAPS · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

X2-0 froze bounded PUBLIC_REFERENCE_SEARCH.
X2-1 froze complete current-lifetime page locator retrieval and exact current-label composition.
X2-2 froze current target/address discoverability before an internal candidate may become an ordinary visible hit.

The X2-3 impact scope selected:

```text
BOUNDED_VISIBLE_ONLY_DETERMINISTIC_LABEL_SEARCH_V1
```

X2-3 now freezes:

```text
1. explicit V1 query modes,
2. deterministic normalization,
3. closed mechanical match classes,
4. visible-only ranking order,
5. finite query/corpus/label/result caps,
6. overflow/failure semantics,
7. deterministic result truncation,
8. anti-oracle count boundaries.
```

This document is design-only. It implements no matcher, runtime schema, UI, pagination, index, model call, embedding, network request, storage mutation, release change, S7/v0.70.3 work, or `release-simcore` mutation.

## 1. Frozen architecture

```text
explicit PK-X2 search activation
        ↓
X2-1 READY_COMPLETE current descriptor corpus
        ↓
X2-3 query validation + matching
        ↓
internal matched candidates
        ↓
X2-2 discoverability admission
        ↓
VISIBLE_CURRENT candidates only
        ↓
X2-3 deterministic ranking
        ↓
visible projection cap
        ↓
search result surface
```

Canonical rule:

```text
MATCH
!= VISIBLE
!= HIGH RANK
!= CURRENT ARTICLE VALID
!= SETTLED FACT
```

## 2. Query modes

Frozen V1 modes:

```text
LABEL_QUERY
EXACT_PAGE_ID
EXACT_TARGET_ID
LIST_CURRENT
```

The mode is explicit trusted request framing for the search operation.

Forbidden:

```text
arbitrary text resembles UUID
→ silently route to EXACT_PAGE_ID

arbitrary text resembles target locator
→ silently route to EXACT_TARGET_ID
```

No model classifies query mode.

## 3. Empty query is not list-all

For `LABEL_QUERY`:

```text
normalized query == empty
→ INVALID_EMPTY_QUERY
```

It must not become `LIST_CURRENT` implicitly.

`LIST_CURRENT` is an explicit browse/navigation intent.

This avoids accidental whole-corpus enumeration from blank UI state.

## 4. Label-query raw input caps

Frozen:

```text
MAX_LABEL_QUERY_RAW_UTF8_BYTES = 128
```

The raw query must be valid UTF-8 and within the cap before normalization.

If exceeded:

```text
INVALID_QUERY_TOO_LARGE
```

No truncation is allowed.

Canonical rule:

```text
OVERSIZED QUERY
→ REJECT
not
→ SEARCH TRUNCATED PREFIX
```

## 5. Frozen normalization transform

For `LABEL_QUERY` and current trusted display labels used for matching only:

```text
1. decode valid UTF-8
2. Unicode NFC normalization
3. map Unicode whitespace runs to one U+0020 SPACE
4. trim leading/trailing U+0020 SPACE
5. map ASCII A-Z to a-z
6. leave all other Unicode code points unchanged
```

Conceptual function:

```text
normalizeSearchTextV1(text)
```

Important:

```text
NORMALIZED MATCH FORM
!= TRUSTED DISPLAY LABEL
```

The original X2-1 `currentTrustedDisplayLabel` remains the only display string.

The normalized form is ephemeral current-activation matching metadata.

## 6. Why normalization is intentionally conservative

Not performed in V1:

```text
NFKC compatibility folding
full Unicode case folding
locale-sensitive lowercasing
accent/diacritic stripping
width folding beyond NFC consequences
kana folding
Hangul romanization
transliteration
stemming
morphology
synonyms
edit distance
phonetic matching
substring-anywhere
semantic similarity
embedding
LLM query rewrite
```

Reason:

```text
SEARCH CONVENIENCE
MUST NOT CREATE AMBIGUOUS IDENTITY / LABEL AUTHORITY
```

Korean and other non-ASCII scripts remain directly searchable through their current NFC-normalized code points.
Basic English case-insensitivity is provided through ASCII folding only.

## 7. Normalized query caps

After normalization:

```text
MAX_NORMALIZED_QUERY_UTF8_BYTES = 128
MAX_NORMALIZED_QUERY_TOKENS     = 8
```

Tokens are non-empty substrings separated by U+0020 SPACE after normalization.

If normalized byte length exceeds the cap:

```text
INVALID_NORMALIZED_QUERY_TOO_LARGE
```

If token count exceeds the cap:

```text
INVALID_QUERY_TOKEN_LIMIT
```

No token truncation.

## 8. Searchable label caps

For X2-3 label matching/list ordering, every descriptor participating in a complete general label corpus must satisfy:

```text
MAX_NORMALIZED_LABEL_UTF8_BYTES = 256
MAX_NORMALIZED_LABEL_TOKENS     = 16
```

The cap applies to the ephemeral normalized matching form, not to mutation of the trusted label.

For `LABEL_QUERY` or `LIST_CURRENT`, if the admitted complete X2-1 descriptor corpus contains a descriptor whose current trusted label cannot be safely normalized within these caps:

```text
HOLD_LABEL_CORPUS_LIMIT_EXCEEDED
```

The operation must not silently omit that descriptor and claim complete search/list behavior.

Canonical rule:

```text
UNPROCESSABLE CURRENT LABEL
!= SAFE TO SKIP FROM COMPLETE LABEL SEARCH
```

## 9. Corpus cap

Frozen V1 complete descriptor corpus cap:

```text
MAX_CURRENT_SEARCH_CORPUS = 128
```

This is the maximum number of authoritative current X2-1 descriptors admitted into one X2-3 activation.

If the complete current corpus size is:

```text
0..128
→ eligible for bounded X2-3 processing

129+
→ HOLD_CORPUS_LIMIT_EXCEEDED
```

Forbidden:

```text
129 descriptors
→ search first 128
→ pretend complete
```

The cap is intentionally small because V1 has no persistent search index and may invoke X2-2 discoverability for matched/list candidates.

## 10. Mechanical match-count cap

Frozen:

```text
MAX_INTERNAL_MATCHED_CANDIDATES = 128
```

This equals the corpus cap, so an admitted corpus can always be fully mechanically evaluated.

No earlier top-K is allowed before X2-2.

This avoids hidden candidates crowding out visible candidates.

## 11. Exact locator input caps

For explicit locator modes:

```text
MAX_EXACT_LOCATOR_UTF8_BYTES = 256
```

The supplied locator must be non-empty valid UTF-8 within this cap.

No label normalization is applied to an opaque locator value.
No inner trimming, case folding, prefix matching, parsing, or semantic decoding is permitted.

Matching is exact equality only.

## 12. Exact locator matching semantics

### EXACT_PAGE_ID

```text
queryLocator == descriptor.pageIdentity
```

### EXACT_TARGET_ID

```text
queryLocator == descriptor.targetIdentityRef
```

The complete admitted current corpus is scanned mechanically in V1.

PX1-2 uniqueness expectations mean an exact page identity may identify at most one valid record.
An exact target identity likewise maps to at most one active PUBLIC_KNOWLEDGE page identity inside the same namespace/lifetime.

If corruption violates that expectation, X2-1/PX1-2 invalidity dominates rather than X2-3 choosing one.

## 13. Exact ID still has no visibility authority

Even a mechanically exact match continues to X2-2.

```text
EXACT ID MATCH
!= VISIBLE_CURRENT
```

Ordinary UI must preserve X2-2 anti-oracle behavior between:

```text
no matching locator
matching locator but DENY
matching locator but HOLD
matching locator but invalid discoverability binding
```

X2-3 must not return a special "exists but hidden" result.

## 14. Frozen label match lattice

For `LABEL_QUERY`, each descriptor's normalized current label receives the strongest applicable class from this closed ordered lattice:

```text
M1 EXACT_NORMALIZED_LABEL
M2 SINGLE_TOKEN_EXACT
M3 NORMALIZED_LABEL_PREFIX
M4 SINGLE_TOKEN_PREFIX
M0 NO_MATCH
```

Strength order:

```text
M1 > M2 > M3 > M4 > M0
```

No unlisted match class exists in V1.

## 15. M1 · exact normalized label

```text
normalizedLabel == normalizedQuery
→ M1
```

Example:

```text
label: "홍 길동"
query: "  홍   길동 "
→ after whitespace normalization, exact if code points otherwise match
```

## 16. M2 · single-token exact

Only when:

```text
queryTokenCount == 1
```

If normalized query exactly equals any full normalized label token:

```text
→ M2
```

Example:

```text
label = "alice smith"
query = "smith"
→ M2
```

## 17. M3 · full normalized label prefix

If:

```text
normalizedLabel startsWith normalizedQuery
```

and M1/M2 did not already win:

```text
→ M3
```

Example:

```text
label = "alice smith"
query = "alice s"
→ M3
```

## 18. M4 · single-token prefix

Only when:

```text
queryTokenCount == 1
```

If any normalized label token starts with the normalized query and no stronger match class applies:

```text
→ M4
```

Example:

```text
label = "alice smith"
query = "smi"
→ M4
```

## 19. Multi-token behavior

A multi-token query may match only through:

```text
M1 exact normalized full label
or
M3 normalized full-label prefix
```

V1 does not implement unordered token bags, all-token prefix matching, token permutation, or middle-of-label multi-token substring search.

This preserves a small deterministic semantics surface.

## 20. No substring-anywhere

Forbidden V1 example:

```text
label = "alice wonderland"
query = "ice"
→ no match solely because "ice" occurs inside "alice"
```

This is intentional.

A later quality-driven search profile may add bounded substring/fuzzy behavior only through separate design.

## 21. Matching precedes discoverability; ranking follows it

Frozen sequence:

```text
all admitted current descriptors
→ mechanical match class
→ internal matched set
→ X2-2 current discoverability for each matched candidate
→ discard all non-VISIBLE_CURRENT candidates from ordinary result domain
→ rank only VISIBLE_CURRENT candidates
```

For `LIST_CURRENT`, every admitted descriptor is an internal list candidate before X2-2.

Canonical rule:

```text
RANKING DOMAIN
= VISIBLE_CURRENT SET ONLY
```

## 22. Why pre-visibility top-K is forbidden

Forbidden:

```text
100 internal matches
→ rank
→ take top 20
→ 19 protected candidates fail X2-2
→ show only 1 visible hit
```

That result shape depends on hidden candidates.

Required conceptual behavior:

```text
100 internal matches
→ X2-2 all bounded matches
→ visible set
→ rank visible set
→ take first 20 visible
```

## 23. Ranking for LABEL_QUERY

For visible label-query candidates, total order is:

```text
1. match class strength
   M1 before M2 before M3 before M4

2. normalized current label
   lexicographic canonical UTF-8 byte order

3. targetIdentityRef
   lexicographic raw UTF-8 byte order

4. pageIdentity
   lexicographic raw UTF-8 byte order
```

All fields used here already exist in the current descriptor/locator path.

No locale collation service is used.

## 24. Ranking for LIST_CURRENT

`LIST_CURRENT` has no query relevance score.

Visible candidates are ordered by:

```text
1. normalized current label canonical UTF-8 byte order
2. targetIdentityRef raw UTF-8 byte order
3. pageIdentity raw UTF-8 byte order
```

This is deterministic browse order, not semantic importance.

## 25. Ranking for exact ID modes

An admitted exact ID mode should produce zero or one internal candidate under valid X2-1/PX1-2 uniqueness.

Therefore no relevance ranking is needed.

If the one candidate becomes `VISIBLE_CURRENT`, it is the sole visible hit.
Otherwise ordinary visible result set is empty.

## 26. Ranking inputs explicitly forbidden

Ranking may not inspect:

```text
settlement state
claim mode
sourceAuthorityRef
number of citations
citation strength
article length
article completeness
page mint time
page age
last viewed time
search frequency
click frequency
social popularity
NEWS frequency
BOARD/SOCIAL_FEED/LIVE_REACTION content
model score/confidence
hidden discoverability reason
```

Canonical rule:

```text
RANK
= NAVIGATION ORDER ONLY
```

## 27. Same label, different targets

Legal:

```text
P1 → T1 → "Alex"
P2 → T2 → "Alex"
T1 != T2
```

If both are `VISIBLE_CURRENT`, both remain independent visible results.

They receive the same label match class and label sort key; opaque target/page identities provide deterministic final ordering.

X2-3 does not invent disambiguation prose.

## 28. Visible result cap

Frozen:

```text
MAX_VISIBLE_RESULTS = 20
```

After the complete admitted internal candidate set is matched and X2-2 filtered, the visible set is fully deterministically ranked.

Then:

```text
first 20 visible results
→ projected
```

If visible set size is 21+:

```text
VISIBLE_RESULTS_TRUNCATED = true
```

may be exposed because it is derived only from already-`VISIBLE_CURRENT` candidates.

The exact visible total need not be exposed in V1.

## 29. No pagination/cursor in first profile

V1 freezes:

```text
pagination cursor = NO
next-page token   = NO
persistent result session = NO
```

When more than 20 visible hits exist, the first 20 deterministic results plus a visible-only truncation signal are sufficient for V1.

A later pagination design must preserve X2-2 visibility and current-activation freshness rather than persisting hidden candidate positions.

## 30. Hidden cardinality remains private

Ordinary UI may derive only from visible set cardinality.

Forbidden outputs:

```text
internal matches = 17
visible = 4
hidden = 13

"13 results unavailable"

"some private results omitted" when that statement depends on protected candidates
```

Allowed:

```text
0 visible results
1..20 visible results
visible-results-truncated boolean when visible set itself > 20
```

## 31. Search empty-result equivalence

For ordinary UI, these may all collapse to the same empty visible result surface under X2-2 anti-oracle policy:

```text
no mechanical match
mechanical matches but all DENY
mechanical matches but all HOLD
mechanical matches but discoverability bindings invalid
```

Internal diagnostics may retain bounded reason codes.
Ordinary search presentation must not expose protected candidate existence.

## 32. Operation result states

Conceptual X2-3 operation states:

```text
READY_VISIBLE_RESULTS
READY_VISIBLE_RESULTS_TRUNCATED
READY_NO_VISIBLE_RESULTS
INVALID_QUERY_MODE
INVALID_EMPTY_QUERY
INVALID_QUERY_TOO_LARGE
INVALID_NORMALIZED_QUERY_TOO_LARGE
INVALID_QUERY_TOKEN_LIMIT
INVALID_LOCATOR_QUERY
HOLD_CORPUS_LIMIT_EXCEEDED
HOLD_LABEL_CORPUS_LIMIT_EXCEEDED
HOLD_REQUIRED_CORPUS_NOT_READY
INVALID_CORPUS
```

Exact runtime enum spelling is implementation authority.

The ordinary UI representation of protected internal causes remains constrained by X2-2.

## 33. LIST_CURRENT completeness

`LIST_CURRENT` is legal only with:

```text
X2-1 complete current descriptor corpus
+
corpus size <= 128
+
all required current labels processable under X2-3 caps
```

Then every descriptor is passed through X2-2 before visible ordering.

A label-limit failure cannot be repaired by silently skipping one address.

## 34. Query text is not publication authority

Forbidden:

```text
user query contains private alias
→ treat alias as public

query equals current label
→ bypass X2-2

query repeats alleged fact
→ treat fact as settled/public
```

The query only selects match keys.

## 35. No persistent index / derived alias state

X2-3 continues V1 prohibition on persistent search-specific state:

```text
normalized labels persisted = NO
tokens persisted            = NO
aliases persisted           = NO
rank persisted              = NO
popularity persisted        = NO
query history persisted by SimCore search authority = NO
search result cache as semantic authority = NO
```

All normalization/matching/ranking products are current-activation ephemeral data.

## 36. Reload / repeated query semantics

Identical current trusted inputs and identical query mode/value must produce identical mechanical matching and visible ranking.

Reload does not authorize reuse of an old visible result set.

A new activation must rebuild current X2-1 descriptors and obtain current X2-2 discoverability receipts.

```text
DETERMINISTIC ORDER
!= PERSISTENT SEARCH SESSION
```

## 37. Candidate C reassessment

No new Candidate C gate is activated.

```text
C1 = inherited PK-X1 durable page locator
C2 = inherited PK-X1 stable page identity
C3 = NO
C4 = NO
C5 = NO
C6 = NO
C7 = NO
C8 = NO
```

The following future search changes would require reassessment:

```text
persistent alias/index mutation
cross-turn search sessions
historical names
revision search
cross-conversation corpus
async index refresh attached to stable results
```

## 38. Runtime performance proof requirements

Future implementation must prove bounded work consistent with the frozen caps.

For admitted V1:

```text
current descriptor corpus <= 128
mechanical matching <= 128 descriptors
X2-2 discoverability fanout <= 128 candidates for LIST_CURRENT
visible sort <= 128 candidates
projected result cards <= 20
```

No model call, network search, embedding call, or background index is authorized by X2-3.

## 39. Dormancy

Without explicit current PK-X2 search/list authority:

```text
query validation = 0
normalization = 0
matching = 0
search corpus read = 0
search discoverability fanout = 0
ranking = 0
result projection = 0
background indexing = 0
model call = 0
network = 0
```

## 40. Future runtime validation matrix

Must include at least:

```text
Q01 Korean NFC-equivalent label/query → same normalized match
Q02 ASCII English case difference → same normalized match
Q03 repeated whitespace → collapse deterministically
Q04 whitespace-only label query → INVALID_EMPTY_QUERY
Q05 128-byte raw query boundary accepted when otherwise valid
Q06 129-byte raw query → reject, no truncation
Q07 normalized token count 8 accepted
Q08 normalized token count 9 → reject
Q09 corpus size 128 admitted
Q10 corpus size 129 → HOLD, no prefix search
Q11 normalized label 256-byte boundary admitted
Q12 label over cap in complete label corpus → HOLD label search/list
Q13 exact full label ranks before token exact
Q14 token exact ranks before full-label prefix
Q15 full-label prefix ranks before token prefix
Q16 substring-only match rejected
Q17 multi-token middle substring rejected
Q18 same label/different target returns distinct visible rows
Q19 hidden high-strength candidate cannot crowd visible weaker match
Q20 exact page ID hidden candidate remains ordinary empty/non-confirming
Q21 exact target ID hidden candidate remains ordinary empty/non-confirming
Q22 visible set 20 → no truncation
Q23 visible set 21 → first 20 deterministic + visible-only truncation
Q24 hidden candidates never affect visible truncation flag
Q25 identical current inputs/query → identical ordering
Q26 reload rebuilds current visibility rather than reusing old results
Q27 LIST_CURRENT applies X2-2 before label ordering/output
```

No runtime test is performed by this design transaction.

## 41. WATCH carried from impact transaction

Before X2-3 work, main advanced from X2-2 merge `cf9a5627...` to `21eaf2fb...` via unrelated Agent Skill Orchestrator PR #1313.

Disposition remains:

```text
WATCH · MAIN_ADVANCED_BEFORE_X2_3_TRANSACTION · NON_BLOCKING
```

The impact scope was merged from the then-current main; this detailed branch is based on impact merge `8220154c...`.

## 42. Runtime blockers

```text
X2_1_RETRIEVAL_LABEL_RUNTIME_NOT_IMPLEMENTED
X2_2_DISCOVERABILITY_AUTHORITY_RUNTIME_NOT_PROVEN
X2_3_NORMALIZATION_RUNTIME_NOT_IMPLEMENTED
X2_3_COMPLETE_CORPUS_CAP_RUNTIME_NOT_PROVEN
X2_3_VISIBLE_ONLY_RANKING_RUNTIME_NOT_PROVEN
X2_3_HIDDEN_CARDINALITY_NONLEAKAGE_RUNTIME_NOT_PROVEN
X2_3_DETERMINISTIC_ORDER_RUNTIME_NOT_PROVEN
```

## 43. Exit

X2-3 design exits when this contract is merged with SimCore `Verify` + `Required` PASS and exact-main post-merge CI confirms the docs-only transaction.

After X2-3:

```text
X2-4 · Search Result Navigation + Current Revalidation
```

remains the next design checkpoint.

No runtime implementation is authorized by this exit.
