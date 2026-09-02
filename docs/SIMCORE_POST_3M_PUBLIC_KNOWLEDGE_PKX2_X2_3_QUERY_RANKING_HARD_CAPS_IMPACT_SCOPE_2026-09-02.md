# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 X2-3 Query Semantics / Ranking / Hard Caps Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-3 IMPACT SCOPE FROZEN · BOUNDED DETERMINISTIC CURRENT-LABEL SEARCH · VISIBLE-ONLY RANKING / CARDINALITY · CONCRETE CAP DESIGN NEXT · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · X2-3 · QUERY SEMANTICS · RANKING · HARD CAPS · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

X2-0 froze PUBLIC_REFERENCE_SEARCH as bounded navigation over already-minted PK-X1 page identities.
X2-1 froze complete active-lifetime locator enumeration and current trusted label composition.
X2-2 froze current target/address discoverability before any ordinary visible hit may exist.

X2-3 now selects the narrow seam for:

```text
query mode
→ deterministic query normalization
→ bounded mechanical matching over X2-1 descriptors
→ X2-2 discoverability filtering
→ deterministic ranking over visible candidates only
→ bounded visible result projection
```

This transaction is design-only. It does not implement a search function, UI, storage index, background indexer, model call, embedding, network request, release change, S7/v0.70.3 work, or `release-simcore` mutation.

## 1. Selected seam

```text
BOUNDED_VISIBLE_ONLY_DETERMINISTIC_LABEL_SEARCH_V1
```

The seam must preserve:

```text
MATCH AUTHORITY
!= DISCOVERABILITY AUTHORITY
!= ARTICLE AUTHORITY
!= SETTLEMENT AUTHORITY
```

Matching only selects internal candidate addresses. X2-2 remains the sole current candidate-to-visible gate for this lane.

## 2. Search modes in scope

The first X2-3 design will freeze mechanical semantics for these explicit modes:

```text
LABEL_QUERY
EXACT_PAGE_ID
EXACT_TARGET_ID
LIST_CURRENT
```

`LIST_CURRENT` is an explicit browse/list mode. An empty or whitespace-only label query must not silently become a corpus enumeration request.

Mode routing is mechanical and explicit. Arbitrary natural-language text must not be guessed into an opaque-ID mode merely because it resembles an identifier.

## 3. Normalization direction

The first profile should remain conservative and implementation-portable.

Selected normalization direction for detailed freeze:

```text
Unicode NFC
+ leading/trailing whitespace trim
+ internal Unicode-whitespace collapse to U+0020
+ ASCII A-Z → a-z only
```

Important:

```text
normalization is a MATCHING TRANSFORM
not an authority transform
```

The original `currentTrustedDisplayLabel` from X2-1 remains the visible trusted label.

Not selected for V1:

```text
NFKC compatibility folding
locale-specific case mapping
full Unicode case folding
accent stripping
transliteration
romanization
stemming
morphological analysis
edit distance
phonetic matching
semantic embedding
LLM rewrite / rerank
```

These may be separately designed later if a real search-quality requirement justifies their ambiguity/cost.

## 4. Proposed bounded label match classes

The detailed design should freeze a small deterministic lattice, likely no stronger than:

```text
EXACT_NORMALIZED_LABEL
NORMALIZED_LABEL_PREFIX
SINGLE_TOKEN_EXACT
SINGLE_TOKEN_PREFIX
NO_MATCH
```

Multi-token queries remain useful through full-label exact/prefix matching.
Token-exact/token-prefix behavior is intended only for a normalized single-token query in the first profile.

No substring-anywhere, edit-distance, alias-history, body-text, citation-text, source-text, or semantic similarity search is admitted by this impact scope.

## 5. Matching occurs on current X2-1 descriptors only

Input is the complete current X2-1 label descriptor corpus for the admitted current lifetime.

Forbidden matching surfaces:

```text
old PUBLIC_KNOWLEDGE title
old rendered card
host transcript
article body
citation text
settlement text
NEWS headline
BOARD title/nickname
SOCIAL_FEED handle/profile
LIVE_REACTION nickname
model-produced alias
persistent alias history
```

Canonical rule:

```text
CURRENT TRUSTED SEARCH LABEL
IS THE ONLY HUMAN-FACING LABEL MATCH SURFACE IN V1
```

## 6. Exact locator modes are separate from label normalization

For `EXACT_PAGE_ID` and `EXACT_TARGET_ID`:

```text
opaque locator exact equality
```

is the only match operation.

Do not lowercase, Unicode-normalize, trim inside, parse, decode, partially match, or semantically interpret opaque IDs beyond an implementation-defined outer input framing contract.

Even an exact locator match still enters X2-2 and may remain ordinary-UI non-visible.

## 7. Visibility precedes ranking

X2-2 froze that hidden/internal candidates must not leak through counts, pagination, or visible result metadata.

Therefore X2-3 freezes this ordering boundary:

```text
mechanical match
→ internal matched candidates
→ X2-2 discoverability admission
→ visible candidate set
→ ranking
→ visible hit cap/projection
```

Forbidden:

```text
rank all internal candidates
→ take top K
→ then visibility filter
```

That order can let protected candidates crowd visible ones out and make output shape depend on hidden candidate rank.

Canonical rule:

```text
RANKING DOMAIN = VISIBLE CANDIDATES ONLY
```

## 8. Ranking authority

Ranking is navigation convenience only.

It must not use or imply:

```text
settlement strength
truth confidence
source authority strength
article completeness
number of citations
visibility strength
page age
creation time
last access time
click popularity
search popularity
model confidence
social popularity
NEWS frequency
```

Canonical rule:

```text
HIGHER SEARCH RANK
!= STRONGER PUBLIC KNOWLEDGE
```

## 9. Deterministic tie-breaking direction

The detailed design should freeze a total order based only on safe current search metadata, likely:

```text
1. match-class strength
2. normalized current label code-point order
3. opaque targetIdentityRef deterministic byte/string order
4. opaque pageIdentity deterministic byte/string order
```

Opaque IDs may provide deterministic final tie-breaking but must not be exposed as semantic relevance signals.

No random ordering in V1.

## 10. Same-label collisions remain distinct

Legal:

```text
P1 → T1 → "Alex"
P2 → T2 → "Alex"
T1 != T2
```

If both candidates are `VISIBLE_CURRENT`, both may appear.

X2-3 must not merge them, infer sameness, invent disambiguation prose, or rank one as more truthful.

A future UI may need bounded trusted disambiguation metadata, but that is not authorized by this seam.

## 11. Hard-cap families selected

X2-3 detailed design must freeze concrete finite maxima for at least:

```text
raw query bytes
normalized query bytes
normalized query token count
current locator/descriptor corpus size
normalized searchable label bytes/tokens
internal mechanical match count
visible result count
```

The first profile should prefer one small complete corpus cap rather than arbitrary backend-prefix truncation.

If the authoritative current corpus exceeds the admitted corpus cap:

```text
HOLD / LIMIT_EXCEEDED
```

not:

```text
search first N records and pretend complete
```

## 12. Completeness and caps

X2-1 requires complete locator/label corpus authority for general label search.

Therefore:

```text
COMPLETE CORPUS SIZE > HARD CAP
→ bounded search operation not admitted
```

This is different from visible result truncation after the entire admitted corpus has been safely matched and filtered.

Legal distinction:

```text
corpus cap exceeded
→ operation HOLD

visible result count exceeds presentation cap
→ deterministic visible-only truncation may be allowed
```

Exact behavior and signaling belong to detailed X2-3 design.

## 13. No hidden-count leakage through caps

The UI must not expose:

```text
internal matched candidate count
number denied by X2-2
number held by X2-2
number with invalid discoverability binding
```

Visible pagination/truncation metadata, if any, may only derive from the `VISIBLE_CURRENT` set.

## 14. Empty query and list mode

Selected boundary:

```text
LABEL_QUERY normalized to empty
→ INVALID / EMPTY_QUERY
```

It does not mean `LIST_CURRENT`.

`LIST_CURRENT` must be an explicit search/navigation mode and still applies X2-2 to every candidate before any visible ordering/count is produced.

## 15. Query does not become model context or truth

Query text is navigation input only.

Forbidden promotion:

```text
user searched "secret alias"
→ therefore alias is public

query string
→ current trusted label fallback

query string
→ article fact
```

The query may participate in deterministic matching only.

## 16. No persistent search index in X2-3

This impact scope continues X2-0/X2-1 V1:

```text
persistent search-specific label index = NO
persistent normalized label = NO
persistent token list = NO
persistent popularity = NO
persistent alias set = NO
persistent rank = NO
```

Descriptors and normalized matching forms remain current-activation ephemeral data.

## 17. Candidate C assessment

No new Candidate C gate is selected.

```text
C1 = inherited from PK-X1
C2 = inherited from PK-X1
C3 = NO
C4 = NO
C5 = NO
C6 = NO
C7 = NO
C8 = NO
```

A future persistent alias/index/history product would require explicit reassessment rather than being smuggled in as a search optimization.

## 18. Performance / dormancy boundary

When no explicit current PK-X2 search/list activation exists:

```text
query normalization = 0
corpus enumeration for search = 0
label matching = 0
discoverability fanout for search = 0
ranking = 0
search result projection = 0
background indexing = 0
model call = 0
network = 0
```

X2-3 must not create an always-on indexer.

## 19. Real-validation cases reserved

Future runtime validation must include at least:

```text
Korean NFC-equivalent query/label
ASCII case-insensitive English label
whitespace collapse
empty query rejection
explicit LIST_CURRENT
exact label beats prefix
prefix beats token-prefix under frozen lattice
same-label distinct targets remain distinct
exact page/target ID still passes X2-2
hidden high-ranked candidate cannot crowd visible candidate
no hidden candidate counts
corpus exactly at cap
corpus cap + 1 → HOLD, not prefix search
query exactly at cap
query cap + 1 → reject/HOLD as frozen
visible result cap deterministic
reload/repeat produces identical ordering for identical current inputs
```

No such runtime validation is performed here.

## 20. WATCH · main advanced before X2-3 transaction

Fresh read before this transaction observed:

```text
previous X2-2 merge = cf9a5627a8985c9673f05ae94bae6486ccdaf99f
current main        = 21eaf2fba2c423e1f0d03eaacaaba4b75320598d
```

The intervening merge is PR #1313, Agent Skill Orchestrator O3 parallel Critic work. Its changed files are under Agent Skill documentation/tooling and do not alter PUBLIC_KNOWLEDGE, PK-X1, PK-X2, Exposure, or SimCore production authority.

Disposition:

```text
WATCH · MAIN_ADVANCED_BEFORE_X2_3_TRANSACTION · NON_BLOCKING
```

The X2-3 impact branch is based on the then-current main `21eaf2fb...`.

## 21. Blockers for future implementation

At minimum:

```text
X2_3_QUERY_NORMALIZATION_NOT_IMPLEMENTED
X2_3_CONCRETE_CAPS_NOT_IMPLEMENTED
X2_3_VISIBLE_ONLY_RANKING_NOT_PROVEN
X2_3_HIDDEN_CARDINALITY_NONLEAKAGE_NOT_PROVEN
X2_3_COMPLETE_CORPUS_CAP_HANDLING_NOT_PROVEN
X2_2_DISCOVERABILITY_RUNTIME_AUTHORITY_NOT_PROVEN
```

## 22. Exit

This impact checkpoint exits when the detailed X2-3 design freezes:

```text
exact V1 query modes
exact normalization transform
exact match lattice
exact ranking total order
concrete finite caps
visible-only truncation/count rules
failure states
runtime validation matrix
```

without changing production runtime.

Next detailed checkpoint after this impact transaction:

```text
X2-3 · Query Semantics / Ranking / Hard Caps Design
```
