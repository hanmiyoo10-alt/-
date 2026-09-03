# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D4 D4-4 Historical / Search / Mutation Boundary Design — 2026-09-03

Date: 2026-09-03 KST

Status: **D4-4 DESIGN FROZEN · HISTORICAL CONTEXT V1 CLOSED · SEARCH DISCOVERY NON-AUTHORITATIVE · EXPLICIT SEARCH→D4 HANDOFF · CONTEXT READ AUTHORITY SEPARATE FROM D2 MUTATION AUTHORITY · RESPONSE-TO-MUTATION ESCALATION CLOSED · C1+C2+C3+C4+C6+C7 PRODUCT PROFILE · C5/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D4 · D4-4 · CANDIDATE C C6 · HISTORICAL / SEARCH / MUTATION BOUNDARY · DETAILED DESIGN**

## 0. Purpose

D4-0 through D4-3 establish the first bounded C6 profile:

```text
explicit D4 intent
→ one exact active pageIdentity
→ exact current head
→ fresh current revalidation
→ status-preserving semantic projection
→ REFERENCE_DATA role firewall
→ final currentness check
→ one model dispatch
```

D4-4 freezes how that profile interacts with adjacent PK-D3 historical inspection, PK-X2 search/discovery, and PK-D2 mutation/restore.

The central rule is:

```text
READABILITY / DISCOVERABILITY / MODEL CONSUMPTION
DO NOT AUTOMATICALLY CREATE NEW AUTHORITY CLASSES.
```

This document is design-only. No runtime, storage, search, prompt, renderer, mutation, or release implementation is authorized.

## 1. Frozen non-implication matrix

```text
historical revision visible
!= historical revision context-eligible

search result visible
!= search result context-selected

page selected for D4
!= page mutation authorized

model consumed page context
!= model response may mutate page

model mentions restore
!= restore operation

D4 operationRef
!= D2 mutation operationRef

search ranking metadata
!= semantic context
```

## 2. D4 V1 context source remains current-head only

D4 V1 accepts exactly one source class:

```text
CURRENT_DURABLE_PUBLIC_KNOWLEDGE_HEAD
```

It does not accept:

```text
historical revision body
historical compare result
search snippet
search ranking explanation
last-viewed page cache
model-mentioned page title
host transcript copy
restore seed
uncommitted candidate revision
```

## 3. Historical context remains explicitly closed

PK-D3 C7 allows older revisions to remain inspectable under historical authenticity and current disclosure rules.

That capability does not imply C6 for historical revisions.

```text
D3 exact historical body ALLOW
→ D3 UI/read/compare may use it
→ D4 V1 context source = NO
```

A future historical-context profile must independently freeze at least:

```text
intent class
historical revision exact address
historical authenticity requirement
current disclosure requirement
current-vs-historical truth framing
prompt-role grammar
bounded projection
staleness behavior
mutation/restore separation
```

Until then:

```text
HISTORICAL_CONTEXT_NOT_SUPPORTED
```

is fail-closed, not a request to silently substitute current head.

## 4. Historical/current coincidence

A historical navigation object may point at revision R8 while R8 also happens to be the current head.

This coincidence does not convert the historical navigation authority into D4 authority.

```text
D3 historical selector says R8
+ D2 current head happens to be R8
→ still no D4 context
```

If the user/trusted caller wants R8 as D4 context, D4 must independently resolve pageIdentity and current head through D4-1/D4-2.

## 5. Search-to-D4 handoff contract

Search may act only as a discovery precursor.

Conceptual envelope:

```text
PublicReferenceSearchSelectionHintV1
  schemaVersion
  selectedPageIdentity
  optionalDisplayLabel
  source = PK_X2_DISCOVERY
```

Authority rules:

```text
selectedPageIdentity
= exact candidate locator only

optionalDisplayLabel
= non-authoritative UX metadata

search score/rank/snippet
= MUST NOT enter D4 context authority
```

The handoff does not contain:

```text
revisionRef
current head guarantee
semantic body
citation body
settlement authority
prompt-ready text
mutation capability
```

## 6. Search handoff acceptance

A D4 operation may accept a search-derived `selectedPageIdentity` only when the user/trusted caller explicitly chooses that result for the current D4 operation.

```text
search hit merely rendered
→ no D4 operation

search hit explicitly selected for context
→ D4-1 exact selection begins
```

There is no hover, rank, recency, or visibility based implicit selection.

## 7. Search result freshness does not matter after handoff

After exact `pageIdentity` is selected, search state is discarded from authority.

```text
rank changes
snippet changes
query changes
search index refresh
```

must not alter an already established D4 exact target.

Only D4 currentness and semantic revalidation determine dispatch eligibility.

## 8. Search result cannot pin revision

PK-X2 search is page-level discovery.

It may not pin or smuggle a stale revision into D4.

```text
search result observed when head = R8
later explicit D4 selection
current head = R9
→ D4 considers R9 through current-head path
```

If exact current head cannot be proven, D4 fails closed.

## 9. No search snippet reuse

Search snippets are presentation/discovery artifacts.

Forbidden:

```text
search snippet
→ copy directly into model context
```

Required:

```text
selected pageIdentity
→ exact current head
→ fresh D4-2 semantic projection
```

This prevents stale, truncated, generated, highlighted, or ranking-specific text from becoming semantic authority.

## 10. One-page fan-in remains frozen

Search may return many results, but D4 V1 accepts one exact selected page.

```text
P1, P2, P3 search hits
→ trusted caller selects P2
→ only P2 enters D4 resolution
```

No automatic top-k fan-in, union, reranking injection, or embedding retrieval is authorized.

## 11. Search failure taxonomy

D4-4 freezes:

```text
SEARCH_RESULT_NOT_SELECTED
SEARCH_TARGET_NOT_EXACT
SEARCH_SELECTION_PAGE_UNAVAILABLE
CURRENT_CONTEXT_UNAVAILABLE_AFTER_SEARCH
```

No failure may trigger automatic historical fallback or another search result substitution.

## 12. D4 operation identity is context-only

Conceptual D4 operation identity:

```text
D4ContextOperationRef
```

It binds one context selection/composition/dispatch attempt.

It authorizes only the bounded C6 read-context flow.

It does not authorize:

```text
revision writes
head changes
restore
edit
append
remove
citation mutation
correction update
```

## 13. D2 mutation operation identity remains independent

Any mutation must begin under a separate D2 authority class, conceptually:

```text
D2MutationOperationRef
```

Canonical separation:

```text
D4ContextOperationRef
!= D2MutationOperationRef
```

The same opaque token, host request id, or model invocation id must not be reused as both authority classes by implication.

## 14. Context consumption never grants mutation authority

If model operation M receives page P current head R8 as D4 context:

```text
M has reference data about P/R8
```

but does not gain:

```text
write access to P
ability to commit R9
ability to restore R4
ability to change citations
ability to alter current head
```

The model is a semantic consumer, not a revision owner.

## 15. Model output requesting mutation

Model output may naturally contain text such as:

```text
"This page should be corrected."
"Add citation X."
"Restore the earlier version."
```

D4-4 classifies these as:

```text
MODEL_MUTATION_SUGGESTION
```

which is ordinary output content only.

It has zero direct mutation authority.

## 16. Safe handoff from suggestion to later user action

A UI may show a model suggestion to the user.

If the user later explicitly chooses to perform a mutation, the system must create a fresh D2 operation.

Required chain:

```text
model suggestion
→ user/trusted caller explicit mutation intent
→ fresh D2 expectedRevision resolution
→ D2 mutation footprint
→ current validation
→ no-op check
→ atomic commit
```

Forbidden shortcut:

```text
model suggestion
→ hidden automatic edit
```

## 17. No hidden pre-filled authority

A future UI may pre-fill human-readable draft text from model output, but prefill data is not authority.

```text
prefilled edit text
!= mutation approved
```

Before commit, D2 must validate the final explicit operation payload from the trusted mutation surface.

## 18. Restore remains separate

Historical restore keeps the existing D2/D3 contract:

```text
exact historical revision
→ explicit restore intent
→ current authority revalidation
→ new revision if accepted
```

D4 context can neither skip nor weaken this path.

If model output says "restore R4":

```text
RESPONSE_NOT_RESTORE_AUTHORITY
```

until a separate trusted restore operation exists.

## 19. No context-driven auto-refresh mutation

D4 fresh revalidation may discover that the current persisted revision is no longer suitable for context.

That does not authorize D4 to mutate the page to make it suitable.

Forbidden:

```text
R8 fails D4 current support
→ automatically regenerate/commit R9
→ use R9 as context
```

D4 must instead HOLD/deny context. Page mutation, regeneration, or correction remains an explicit D2-family operation.

## 20. Independent mutation race after dispatch

Frozen behavior:

```text
head = R8
D4 final currentness PASS
model dispatch with R8
independent D2 operation commits R9 afterward
```

Result:

```text
in-flight D4 operation remains R8-context-bound
current page head is R9
```

No retroactive prompt patch, output rewrite, R9 rollback, or automatic second model call is authorized.

## 21. Mutation before dispatch

If an independent D2 mutation changes R8→R9 before the final D4 dispatch edge:

```text
D4 final currentness check fails
→ D4_STALE_CONTEXT_HEAD
→ no dispatch with R8
```

A retry is a new bounded D4 operation, not silent rebasing of the old context envelope.

## 22. Context body never returns as trusted mutation payload

The model-facing semantic projection may be transformed, summarized by the model, quoted, or partially referenced in output.

None of those forms may be used as authoritative expected current page state for D2.

```text
model's recollection of context
!= revision record
```

D2 always reads authoritative current revision state independently.

## 23. Historical text supplied by user

A user may paste historical text into an ordinary prompt.

That is user-supplied input, not D3 historical authority and not D4 durable-context authority.

The system must not infer exact historical revision identity from pasted text similarity.

## 24. PK-X2 and D4 dormancy

D4 must not cause background PK-X2 queries.

Absent an explicit search action or explicit D4 selection:

```text
PK-X2 query = 0
D4 lookup = 0
history lookup = 0
mutation write = 0
```

Search remains user/request driven, not ambient retrieval memory.

## 25. UI/navigation language boundary

A future UI may expose actions conceptually equivalent to:

```text
Use current page as context
View history
Search pages
Edit page
Restore revision
```

These actions must remain visibly separate.

Forbidden implication:

```text
View history → automatically use as context
Search page → automatically use as context
Use as context → automatically enable edit
```

## 26. Response attribution

A response may record bounded ephemeral attribution that D4 context was used, such as:

```text
contextUsed = true
pageIdentity = P
revisionRef = R8
```

if permitted by the relevant response/presentation contract.

But this attribution is not reusable authority and must not contain the semantic body as durable diagnostic storage.

## 27. Observability

Future implementation may emit bounded operational diagnostics:

```text
D4_SELECTION_SOURCE = DIRECT | PK_X2_DISCOVERY
D4_SELECTED_PAGE_COUNT = 1
D4_CONTEXT_REVISION_REF
D4_CONTEXT_DISPATCHED = true/false
D4_BOUNDARY_FAILURE_CODE
```

It must not log by default:

```text
full context body
full search snippet set
full model prompt
hidden historical body
mutation draft text
```

## 28. Failure taxonomy

Frozen D4-4 failures:

```text
D4_HISTORICAL_CONTEXT_NOT_SUPPORTED
D4_SEARCH_RESULT_NOT_SELECTED
D4_SEARCH_TARGET_NOT_EXACT
D4_SEARCH_SELECTION_PAGE_UNAVAILABLE
D4_CURRENT_CONTEXT_UNAVAILABLE_AFTER_SEARCH
D4_MUTATION_AUTHORITY_REQUIRED
D4_RESTORE_AUTHORITY_REQUIRED
D4_RESPONSE_NOT_OPERATION_AUTHORITY
D4_CONTEXT_SOURCE_CLASS_UNSUPPORTED
```

These failures must preserve authority distinctions rather than collapsing into generic cache/retrieval errors.

## 29. Fail-closed fallback matrix

```text
historical context requested
→ NO current-head substitution unless caller explicitly starts new current-head D4 operation

search-selected page unavailable
→ NO next-ranked-result substitution

current head invalid
→ NO old revision fallback

model suggests edit
→ NO automatic D2 operation

model suggests restore
→ NO automatic restore
```

## 30. Candidate C capability audit

D4-4 does not expand the capability profile beyond what prior child designs already justify:

```text
C1 cross-turn survival        = YES
C2 stable identity            = YES
C3 mutation                   = YES, PK-D2 only
C4 append/merge               = YES, PK-D2 only
C5 derived lineage            = NO
C6 model-context re-entry     = YES, D4 current-head only
C7 historical survival        = YES, PK-D3 only
C8 delayed semantic effects   = NO
```

Important product separation:

```text
C3 + C6 both exist
!= C6 grants mutation

C7 + C6 both exist
!= historical revisions are D4 context sources
```

## 31. Security properties

D4-4 preserves:

```text
search result cannot smuggle stale semantic text into prompt
historical viewer cannot smuggle unsupported history into prompt
model output cannot smuggle mutation authority back into storage
D4 operation token cannot be replayed as D2 authority
```

Combined with D4-3:

```text
stored page content cannot become instruction authority
+
model output cannot become storage authority
```

This closes the read/write privilege loop for D4 V1.

## 32. Acceptance matrix

```text
CASE A
D3 R4 visible
no D4 current selection
→ no context

CASE B
PK-X2 returns P
no explicit selection
→ no context

CASE C
PK-X2 returns P
explicit D4 select P
head/current authority valid
→ current head may enter context

CASE D
PK-X2 returns P observed at R8
current head becomes R9 before D4 selection
→ D4 considers R9, never cached R8

CASE E
model consumes P/R8 and says edit P
→ response text only, no mutation

CASE F
model says restore R4
→ no restore without fresh D2 restore operation

CASE G
R8 selected; R9 commits before dispatch
→ stale HOLD

CASE H
R8 dispatched; R9 commits afterward
→ in-flight request remains R8-bound; no retroactive effects

CASE I
current page unavailable after search selection
→ no historical/next-result fallback
```

## 33. Runtime blockers preserved

D4-4 adds no runtime authorization. Future implementation still requires at least:

```text
trusted D4 operation intent producer
exact page/current-head resolver
D4-2 current composer
D4-3 prompt-role firewall
PK-X2 exact pageIdentity handoff
separate D2 mutation operation authority
bounded ephemeral operation identity
observability without body persistence
```

## 34. Sequence

```text
D4-0 Contextual Durable Page Master               ✅
D4-1 Context Selection / Exact Address            ✅
D4-2 Current Revalidation / Composer              ✅
D4-3 Prompt Role / Instruction Firewall           ✅
D4-4 Historical / Search / Mutation Boundary      ✅ DESIGN FROZEN
D4-5 Lifetime / Bounds / Convergence              ← NEXT
```

## 35. Final verdict

```text
PK-D4 D4-4 DESIGN = FROZEN

HISTORICAL CONTEXT V1 = CLOSED
SEARCH AUTO-INJECTION = CLOSED
SEARCH SNIPPET CONTEXT = CLOSED
MODEL-TO-MUTATION ESCALATION = CLOSED
D4-TO-D2 TOKEN ESCALATION = CLOSED

D4 CURRENT-HEAD C6 = PRESERVED
PK-D2 MUTATION AUTHORITY = PRESERVED
PK-D3 HISTORICAL AUTHORITY = PRESERVED
PK-X2 DISCOVERY AUTHORITY = PRESERVED

NEXT = D4-5 LIFETIME / BOUNDS / CONVERGENCE

RUNTIME IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```
