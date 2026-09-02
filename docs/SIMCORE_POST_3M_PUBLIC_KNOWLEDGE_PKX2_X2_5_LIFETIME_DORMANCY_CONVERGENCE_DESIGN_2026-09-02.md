# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 X2-5 Lifetime / Dormancy / Convergence Design — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-5 DESIGN FROZEN · PK-X2 DESIGN CONVERGED · ACTIVE-LIFETIME SEARCH ONLY · EPHEMERAL SEARCH STATE · FEATURE-OFF VERTICAL CLOSURE · RELOAD NO AUTO-REPLAY · ZERO ORDINARY-TURN SEARCH WORK · C1+C2 INHERITED ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · X2-5 · LIFETIME · DORMANCY · CONVERGENCE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-X2 now has all first-scope design checkpoints:

```text
X2-0 Search Master
X2-1 Retrieval / Label Authority
X2-2 Candidate Visibility / Discoverability
X2-3 Query Semantics / Ranking / Hard Caps
X2-4 Navigation / Current Revalidation
X2-5 Lifetime / Dormancy / Convergence
```

X2-5 performs no new product expansion. It closes lifecycle and convergence questions and freezes the final first-scope capability profile.

This document is design-only. It implements no runtime search engine, search controller, label adapter, discoverability producer, matcher/ranker, navigation resolver, storage backend, persistent index, UI, model/network call, background worker, release, S7/v0.70.3 work, or `release-simcore` mutation.

## 1. Final capability profile

Frozen profile:

```text
ACTIVE_LIFETIME_PUBLIC_REFERENCE_SEARCH_V1
```

Capability statement:

```text
Within one trusted ACTIVE conversation lifetime,
PK-X2 may boundedly discover already-minted PK-X1 PUBLIC_KNOWLEDGE page addresses,
compose current trusted labels,
mechanically match/rank only currently discoverable candidates,
and hand one selected address into a fully current PUBLIC_KNOWLEDGE revalidation path.
```

It does not create a durable search corpus or semantic search memory.

## 2. Final end-to-end architecture

```text
explicit current search/list intent
        ↓
trusted ACTIVE lifetime
        ↓
X2-1 complete current PK-X1 locator enumeration
        ↓
current trusted label exact joins
        ↓
X2-3 bounded mechanical query matching
        ↓
internal candidates
        ↓
X2-2 fresh current discoverability
        ↓
visible candidates only
        ↓
X2-3 deterministic ranking + visible result cap
        ↓
current search result surface
        ↓ explicit selection
bounded untrusted locator intent
        ↓
X2-4 current target re-resolution
        ↓
PX1-1 current stable target identity
        ↓
PX1-2 existing page exact confirmation, never mint
        ↓
current label + fresh X2-2 discoverability
        ↓
current source-job authority
        ↓
one PUBLIC_KNOWLEDGE job
        ↓
current PK semantic production / PK-2
        ↓
3M-6 support-at-use
        ↓
PX1-3 current view binding
        ↓
current presentation / citation
```

Canonical rule:

```text
SEARCH FINDS A CURRENTLY VISIBLE ADDRESS.
SEARCH NEVER BECOMES ARTICLE TRUTH AUTHORITY.
```

## 3. Checkpoint audit

### X2-0

Frozen:

```text
bounded navigation over already-minted PK-X1 addresses
no persistent semantic search index
no NEWS/BOARD/SNS truth promotion
```

Convergence result: **PASS**.

### X2-1

Frozen:

```text
authoritative complete active-lifetime locator enumeration
current trusted label exact join
locator corpus completeness separate from label corpus completeness
no old-title fallback
```

Convergence result: **PASS**.

### X2-2

Frozen:

```text
MATCH != VISIBLE
current target/address + exact current-label discoverability
visible-hit admission is ephemeral
anti-oracle behavior for hidden / unavailable / nonexistent addresses
```

Convergence result: **PASS**.

### X2-3

Frozen:

```text
conservative deterministic normalization
closed match lattice
X2-2 before ranking
visible-only deterministic order
finite query/corpus/result caps
no pagination persistence
```

Convergence result: **PASS**.

### X2-4

Frozen:

```text
selection = untrusted navigation locator intent only
current target re-resolution
PX1-1 + PX1-2 exact confirmation
fresh current label + discoverability
search navigation never mints
one selection → at most one current PK job
full current PK-2 / support-at-use / PX1-3 revalidation
```

Convergence result: **PASS**.

## 4. Search state lifetime

PK-X2 search execution state is activation-scoped only.

One explicit search/list request may temporarily own:

```text
query mode
validated query
normalized query
current complete descriptor corpus
ephemeral normalized labels
match classes
internal candidate set
current X2-2 receipts
visible candidate set
rank ordering
visible result projection
visible-results-truncated flag
```

None is durable PUBLIC_KNOWLEDGE state.

Canonical distinction:

```text
PK-X1 PAGE IDENTITY MAY SURVIVE ACROSS TURNS.
PK-X2 SEARCH EXECUTION STATE MAY NOT.
```

## 5. Search-to-navigation lifetime boundary

Search result selection starts a new current navigation activation.

Only bounded locator intent crosses the boundary:

```text
pageIdentity
targetIdentityRef
lifetimeScopeRef
selection origin
```

The following do not cross as authority:

```text
query
normalized query
rank
match class
old current label
old labelAuthorityRef
old X2-2 receipt
old result list
old visible count
old truncation state
old search activation object
```

Canonical rule:

```text
SEARCH RESULT HISTORY
!=
NAVIGATION AUTHORITY
```

## 6. Search activation terminal conditions

A search activation loses authority on any of:

```text
successful current result-surface commit
explicit cancellation
supersession by a newer current search activation
feature OFF
trusted lifetime END
known authority invalidation requiring abort
fatal validation/HOLD/INVALID terminal outcome
```

After terminal state, old internal candidate and receipt objects cannot be reused for a later search or navigation.

## 7. Supersession rule

If search activation B supersedes in-flight activation A:

```text
A later completes
→ A must not overwrite B's current result surface
```

A host/controller may use an ephemeral generation/token to enforce this.

That token is:

```text
control/UI state only
non-persistent
non-canonical
non-model-context
```

PK-X2 introduces no durable search-session identity.

## 8. Current-at-commit rule

Search evaluation may span multiple current authority reads.

If a known invalidation occurs before ordinary result commit:

```text
lifetime ended
feature turned OFF
complete corpus invalidated
current label binding invalidated
current discoverability invalidated
```

then the stale activation must abort or re-evaluate.

Canonical rule:

```text
VALID EARLIER
!=
VALID AFTER KNOWN CURRENT INVALIDATION
```

No TTL guess replaces current authority.

## 9. No TTL / freshness cache authority

First-scope PK-X2 does not freeze:

```text
receipt valid for N seconds
search result valid for N minutes
visibility cache TTL
label cache TTL
```

Wall-clock age alone neither proves validity nor invalidity.

Current activation and trusted current authority dominate.

## 10. Feature-off contract

When PK-X2/search is OFF:

```text
current X2 search activation → invalidated/closed
current interactive search result surface → cleared/disabled according to host policy
PK-X2 identity enumeration = 0
PK-X2 label resolution = 0
query normalization/matching = 0
X2-2 discoverability work = 0
ranking = 0
search-driven navigation handoff = 0
background indexing/refresh = 0
```

PK-X1 durable page identity is not deleted solely because search is OFF.

Canonical separation:

```text
SEARCH FEATURE OFF
!=
CONVERSATION LIFETIME END
```

## 11. Feature re-enable

Re-enabling PK-X2 does not resurrect the old active search computation.

Required:

```text
new explicit search/list intent
→ new current activation
→ fresh enumeration / labels / visibility / ranking
```

Forbidden:

```text
OFF then ON
→ restore old X2-2 receipts
→ restore old current candidate set as authority
→ silently replay last query
```

## 12. Reload contract

Reload destroys current PK-X2 search authority.

Reload must not automatically:

```text
replay last query
enumerate PK-X1 identities
rebuild result list
reuse current-label bindings
reuse X2-2 receipts
reopen last result
run search-driven PK generation
```

Host-visible historical UI may remain according to host transcript/UI behavior, but is not current search authority.

## 13. Old result selection after reload

If host UI retains a selectable old result card after reload, selecting it may create only a new X2-4 locator proposal.

The full current navigation chain runs again.

Canonical rule:

```text
OLD CARD CAN SUPPLY BOUNDED LOCATOR INPUT.
OLD CARD CANNOT SUPPLY CURRENT VISIBILITY OR SEMANTICS.
```

## 14. Conversation lifetime end

When trusted lifetime becomes `ENDED`:

```text
current X2 search activation → invalid immediately
current X2 navigation admission → invalid immediately
all X2 current receipts → no authority
new enumeration/search/navigation for that scope → forbidden
```

PK-X2 has no durable search rows to clean.

PK-X1/PX1-4 remains authoritative for durable page identity cleanup.

## 15. Lifetime unknown/unavailable

If trusted current lifetime cannot be proven ACTIVE:

```text
new X2 search = HOLD / unavailable
new X2 navigation = HOLD / unavailable
```

Old cards or existing page identities cannot be used to infer ACTIVE.

## 16. Non-recyclable lifetime inheritance

PK-X2 inherits PX1-4's rule that ended conversation lifetime identity is non-recyclable for durable page identity semantics.

Therefore an old X2 locator from lifetime A cannot become valid merely because a later conversation happens to reuse a human-facing conversation label or UI slot.

All X2 current joins remain exact to current trusted `lifetimeScopeRef`.

## 17. Ordinary-turn dormancy

Without explicit current PK-X2 search/list intent or explicit selected-result navigation intent:

```text
identity enumeration            = 0
current label projection         = 0
query validation/normalization   = 0
matching                         = 0
discoverability checks           = 0
ranking                          = 0
result projection                = 0
search navigation resolution     = 0
search-driven PK jobs            = 0
persistent index reads/writes    = 0
history scans                    = 0
background polling               = 0
background indexing              = 0
network calls                    = 0
model calls                      = 0
```

Existing PK-X1 durable page identities do not wake PK-X2.
Old visible search UI does not wake PK-X2.

## 18. Explicit-selection narrow wakeup

An explicit current selection may wake only:

```text
one X2-4 navigation activation
→ at most one current PUBLIC_KNOWLEDGE job
```

It does not authorize replay of the old search, sibling refresh, adjacent prefetch, or multi-family fanout.

## 19. Cost profile

X2-3 remains the first concrete bounded cost profile:

```text
MAX_CURRENT_SEARCH_CORPUS = 128
MAX_VISIBLE_PROJECTED_RESULTS = 20
```

First-scope cost is a function of one current explicit search activation and admitted current corpus, not accumulated conversation length.

No transcript/history scan is allowed.

## 20. Why no search cleanup store exists

PK-X2 V1 deliberately has no durable:

```text
label index
alias index
snippet index
embedding index
query history
result history
navigation history
recently viewed store
ranking cache authority
visibility cache authority
```

Therefore lifecycle closure does not require a second mutable database or index-repair subsystem.

## 21. Candidate C final reassessment

Final PK-X2 Candidate C profile:

```text
C1 cross-turn locator survival = INHERITED FROM PK-X1
C2 stable page identity        = INHERITED FROM PK-X1

C3 semantic mutation           = NOT ACTIVATED
C4 append / merge              = NOT ACTIVATED
C5 derived semantic lineage    = NOT ACTIVATED
C6 model-context reentry       = NOT ACTIVATED
C7 historical semantic survival= NOT ACTIVATED
C8 delayed semantic attachment = NOT ACTIVATED
```

PK-X2 itself adds **zero new Candidate C gate**.

## 22. Why X2 does not activate C3/C4

Search matching/ranking state is ephemeral.
There is no mutable persistent search document/index to edit, append, or merge.

Current label changes are projected fresh from upstream authority rather than mutating a durable X2 alias/title record.

## 23. Why X2 does not activate C5

A visible search hit is navigation metadata only.

The selected hit does not become a semantic parent/source of the downstream PUBLIC_KNOWLEDGE article.

Current article authority comes from normal current target/source/Exposure/settlement/validator paths.

## 24. Why X2 does not activate C6

Old search state is not automatically inserted into model context.

A user selection carries bounded locator/control intent, not reentry of a prior structured semantic search object.

## 25. Why X2 does not activate C7

Search does not preserve historical article bodies or historical search truth.

Historical UI may remain as host artifact, but it has no current semantic authority.

## 26. Why X2 does not activate C8

No delayed media, async semantic attachment, or late result mutation attaches to a durable search object.

A future async search/index product requires separate design.

## 27. Final invariant set

```text
SEARCH IS ACTIVE-LIFETIME ONLY

SEARCH STATE IS CURRENT-ACTIVATION ONLY

PK-X1 PAGE IDENTITY MAY SURVIVE; PK-X2 EXECUTION STATE DOES NOT

COMPLETE CURRENT LOCATOR CORPUS IS REQUIRED

CURRENT TRUSTED LABELS ONLY

MATCH != VISIBLE

VISIBILITY PRECEDES RANKING

RANKING USES VISIBLE CANDIDATES ONLY

BOUNDED HARD CAPS ARE FAIL-CLOSED

SEARCH RESULT SELECTION IS LOCATOR INTENT ONLY

CURRENT TARGET MUST BE RE-RESOLVED

SEARCH NAVIGATION NEVER MINTS

FRESH DISCOVERABILITY IS REQUIRED AT NAVIGATION

DOWNSTREAM ARTICLE RUNS FULL CURRENT PK VALIDATION

NO OLD SEARCH STATE ENTERS MODEL/SEMANTIC CONTEXT

FEATURE OFF CLOSES THE SEARCH VERTICAL

RELOAD DOES NOT AUTO-REPLAY SEARCH

CONVERSATION END INVALIDATES X2 IMMEDIATELY

ORDINARY TURNS DO ZERO PK-X2 WORK

NO PERSISTENT SEARCH INDEX / HISTORY

C1+C2 ARE INHERITED ONLY; C3-C8 REMAIN CLOSED
```

## 28. Convergence blockers audit

No blocker remains in the **design semantics** for first-scope X2.

The following would reopen design:

```text
persistent mutable search index
persistent alias/title history
semantic/fuzzy/embedding search
cross-conversation/global retrieval
historical/revision search
persistent pagination cursor
search/session history
recently viewed pages
shareable/deep-link routing
background indexing
analytics-driven ranking
cross-device search state
```

None is implicitly authorized by convergence.

## 29. Runtime-readiness gaps remain

Design convergence does not mean runtime-ready.

Future runtime requires evidence for at least:

```text
R-X2-1 authoritative complete active-lifetime enumeration
R-X2-2 admitted current label producer
R-X2-3 admitted current discoverability producer
R-X2-4 deterministic matcher/ranker implementing X2-3 exactly
R-X2-5 anti-oracle visible-result projection
R-X2-6 current navigation-target resolver
R-X2-7 existing page exact confirmation with no mint
R-X2-8 one selection → one source-job handoff
R-X2-9 full current PK-2 / support-at-use / PX1-3 path
R-X2-10 activation teardown and supersession
R-X2-11 feature-off vertical closure
R-X2-12 reload no auto-replay
R-X2-13 lifetime-end immediate invalidation
R-X2-14 ordinary-turn zero-work instrumentation
R-X2-15 no persistent search/index residue
```

Until implementation and evidence exist:

```text
PK-X2 RUNTIME READY = NO
```

## 30. Future validation protocol minimums

A future implementation validation window must include at minimum:

```text
1. exact label search → visible current hit
2. prefix/token search → deterministic order
3. hidden high-score candidate cannot crowd out visible candidates
4. incomplete locator corpus → HOLD, never partial no-match
5. incomplete label corpus → no authoritative general no-match
6. exact hidden page ID → anti-oracle generic result
7. query/corpus cap overflow → fail closed
8. visible >20 → deterministic visible-only truncation
9. search then target rename then click → current label/navigation succeeds if still discoverable
10. search then discoverability DENY → click does not materialize article
11. old X2-2 receipt replay → rejected
12. reload → no automatic search work
13. old card after reload → new X2-4 current revalidation only
14. feature OFF during search → stale activation cannot commit
15. feature OFF ordinary turn → zero search work
16. feature ON again → no old search auto-replay
17. new search supersedes old in-flight search → old cannot overwrite new surface
18. conversation END → all X2 current state invalid immediately
19. old ended-scope result → cannot navigate current scope
20. no search/list/selection intent → zero X2 work in long chat
21. repeated searches → no accumulating search/index state
22. selected result → at most one current PK job
23. search metadata absent from downstream semantic/model input
24. release/reload leaves no X2 persistent residue beyond PK-X1 identity ownership
```

## 31. Transaction history note

X2-4 recorded and immediately closed one transaction anomaly:

```text
FIX · ACCIDENTAL_MAIN_PLACEHOLDER_WRITE_REVERTED
```

X2-5 began from the clean post-X2-4 main and creates no runtime/release mutation.

During X2-5 preparation, branch-targeted write attempts against nonexistent branches returned 404 and created no repository mutation. They grant no authority and require no tree repair.

## 32. Final roadmap state

```text
X2-0 Search Master                            ✅
X2-1 Retrieval / Label Authority              ✅
X2-2 Candidate Visibility / Discoverability   ✅
X2-3 Query Semantics / Ranking / Hard Caps    ✅
X2-4 Navigation / Current Revalidation        ✅
X2-5 Lifetime / Dormancy / Convergence        ✅ DESIGN FROZEN
```

## 33. Final program verdict

```text
PK-X2 DESIGN PROGRAM = CONVERGED
PK-X2 CAPABILITY PROFILE = ACTIVE_LIFETIME_PUBLIC_REFERENCE_SEARCH_V1
PK-X2 DURABLE SEARCH STATE = NONE
PK-X2 CANDIDATE C DELTA = NONE
PK-X2 C1+C2 = INHERITED FROM PK-X1 ONLY
NEXT X2 DESIGN CHECKPOINT = NONE
```

## 34. Implementation status

```text
PK-X2 DESIGN CONVERGED = YES
PK-X2 RUNTIME IMPLEMENTED = NO
PK-X2 RUNTIME READY = NO
REAL LONG-CHAT VALIDATION = NOT RUN
RELEASE AUTHORIZED = NO
PRODUCTION CHANGED = NO
```

Convergence is a design closure only and must not auto-transition into implementation.
