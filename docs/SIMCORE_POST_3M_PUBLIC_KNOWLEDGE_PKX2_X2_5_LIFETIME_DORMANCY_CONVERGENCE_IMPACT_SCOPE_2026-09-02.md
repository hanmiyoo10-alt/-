# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 X2-5 Lifetime / Dormancy / Convergence Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-5 IMPACT SCOPE FROZEN · ACTIVATION-SCOPED SEARCH STATE · FEATURE-OFF VERTICAL CLOSURE · NO AUTO-REPLAY · ZERO ORDINARY-TURN SEARCH WORK · C1+C2 INHERITED ONLY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · X2-5 · LIFETIME · DORMANCY · CONVERGENCE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

X2-0 through X2-4 freeze bounded current-lifetime PUBLIC_REFERENCE_SEARCH from locator retrieval through selected-result current navigation revalidation.

X2-5 is a convergence checkpoint, not a feature-expansion checkpoint.

It audits:

```text
search activation lifetime
search/navigation ephemeral-state teardown
feature-off behavior
reload behavior
conversation lifetime end
ordinary-turn dormancy
in-flight invalidation / supersession
Candidate C consumption
final PK-X2 capability profile
```

This document authorizes no runtime search engine, state store, UI controller, index, model/network call, background worker, release, S7/v0.70.3 work, or `release-simcore` mutation.

## 1. Selected impact seam

```text
CURRENT_ACTIVATION_SEARCH_LIFETIME_AND_VERTICAL_CLOSURE_V1
```

Canonical rule:

```text
PK-X1 PAGE IDENTITY MAY SURVIVE.
PK-X2 SEARCH EXECUTION STATE DOES NOT.
```

## 2. Durable versus ephemeral ownership

Durable state remains exclusively PK-X1 identity metadata:

```text
pageIdentity
targetIdentityRef
lifetimeScopeRef
namespace
```

PK-X2 must not durably own:

```text
query
normalized query
normalized label
search descriptor
match class
rank
candidate set
visible hit set
result count
truncation flag
discoverability receipt
search activation id
navigation admission
last search
last selected page
recent pages
search history
alias history
```

## 3. Search activation lifetime

One explicit current search/list request creates at most one bounded search activation.

Conceptual search-only state may exist during that activation:

```text
query mode
validated query
complete current descriptor corpus
normalized matching forms
internal matched candidates
current X2-2 receipts
visible candidate set
ranked projected hits
visible-results-truncated flag
```

All such state is ephemeral and loses authority when the activation ends, is cancelled, is superseded, or becomes invalidated.

## 4. Navigation is a new activation

X2-4 already freezes a selected visible hit as an untrusted locator proposal in a **new current navigation activation**.

Therefore X2-5 rejects hidden continuation state such as:

```text
old search activation object
old X2-2 receipt
old rank
old query
old candidate array
old current-label binding
```

Crossing from search to navigation carries only the bounded locator/control intent already frozen by X2-4.

Canonical rule:

```text
SEARCH ACTIVATION ENDS
BEFORE
CURRENT NAVIGATION AUTHORITY BEGINS
```

## 5. Search completion / teardown

After the current result surface is committed or the operation terminates:

```text
internal candidate state → no authority
visibility receipts       → no authority
normalized forms          → no authority
rank state                → no authority
```

A host may keep ordinary historical UI artifacts, but they are not current search authority and cannot wake X2 by themselves.

## 6. Feature-off behavior

Temporary PK-X2/search feature OFF must close the full active search vertical:

```text
cancel / invalidate current search activation
clear current interactive search/result surface
no identity enumeration
no label resolution
no normalization/matching
no X2-2 visibility work
no ranking
no navigation handoff from active search controller
no background refresh/index work
```

PK-X1 durable page identities remain governed by the still-active conversation lifetime and are **not deleted merely because search is OFF**.

Canonical separation:

```text
SEARCH FEATURE OFF
!=
PK-X1 PAGE IDENTITY LIFETIME END
```

## 7. Reload behavior

Reload does not restore search authority from old UI state.

Forbidden automatic behavior:

```text
reload → replay last query
reload → enumerate PK-X1 identities
reload → rebuild visible result set
reload → reuse discoverability receipts
reload → reopen last selected page through X2
```

If host history visibly preserves an old search card/result, it remains a historical UI artifact only.
A later explicit selection is processed through X2-4 as a new untrusted locator proposal with full current revalidation.

## 8. Conversation lifetime end

When trusted conversation lifetime state becomes `ENDED`:

```text
all current X2 activations become invalid immediately
all current X2 receipts lose authority immediately
no new X2 enumeration/navigation may begin for that scope
```

X2 owns no durable search rows requiring semantic cleanup.
PK-X1/PX1-4 remains authoritative for durable page-identity cleanup.

No ended/recycled lifetime may be searched or navigated through old X2 UI.

## 9. Unknown lifetime

If current trusted lifetime state is unknown/unavailable:

```text
X2 search activation = HOLD / unavailable
X2 navigation admission = HOLD / unavailable
```

X2 must not infer ACTIVE from old cards, existing page identities, elapsed time, or host UI presence.

## 10. No TTL authority

First-scope X2 does not use time-based authority such as:

```text
search receipt valid for 30 seconds
result card valid for 5 minutes
cached visibility valid until timeout
```

Current authority and activation boundaries dominate wall-clock freshness guesses.

## 11. In-flight invalidation

A search activation may span retrieval, label resolution, matching, discoverability, and ranking.

If the runtime knows before result commit that a bound current authority has become stale/mismatched, the activation must abort or re-evaluate.

Examples:

```text
lifetime ends
label authority invalidates
X2-1 corpus becomes invalid
X2-2 discoverability becomes stale
feature turns OFF
```

Canonical rule:

```text
VALID EARLIER IN SEARCH
!=
VALID AFTER KNOWN INVALIDATION
```

## 12. Superseded searches

If a new explicit search activation supersedes an older in-flight activation, the older activation must not later overwrite the newer current result surface.

Conceptually a current host/controller generation may distinguish the active request, but that generation is ephemeral UI/control state, not PUBLIC_KNOWLEDGE truth.

No persistent search-session identity is introduced.

## 13. Ordinary-turn dormancy

Without an explicit current PK-X2 search/list request or an explicit current selected-result navigation request:

```text
PK-X2 identity enumeration       = 0
PK-X2 label projection            = 0
query normalization               = 0
matching                           = 0
X2-2 discoverability evaluation   = 0
ranking                            = 0
search result projection          = 0
search-driven navigation resolver = 0
search-driven PK generation       = 0
background indexing               = 0
background polling                = 0
network/model calls                = 0
```

Old search history, old cards, existing PK-X1 identities, and prior successful searches cannot wake X2.

## 14. Explicit selection dormancy exception

One explicit current result selection may wake only the X2-4 one-selection/one-job navigation path.

It does not authorize:

```text
re-running the old whole search
refreshing sibling results
prefetching adjacent pages
re-ranking history
background page warming
```

## 15. Search cost remains bounded/current

X2-3 caps remain authoritative:

```text
current descriptor corpus <= 128
visible projected hits    <= 20
```

Cost scales with the current explicit search activation, not conversation history length.

No transcript/history scan is admitted.

## 16. No persistent index cleanup problem

Because V1 has no durable title/alias/snippet/vector index:

```text
feature OFF
reload
conversation END
rename
visibility change
```

do not require index mutation or historical repair.

Future persistent search index work would be a new design transaction with mutation/staleness/repair authority.

## 17. Candidate C reassessment

PK-X2 inherits the PK-X1 profile only:

```text
C1 cross-turn locator survival = inherited YES
C2 stable page identity        = inherited YES

C3 semantic mutation           = NO
C4 append / merge              = NO
C5 derived semantic lineage    = NO
C6 model-context reentry       = NO
C7 historical semantic survival= NO
C8 delayed semantic attachment = NO
```

Search does not itself add a new Candidate C consumer.

Reasons:

```text
no persistent mutable index
no search history store
no durable result set
no automatic semantic reentry
no search-hit truth lineage
no historical page preservation
no delayed attachment
```

## 18. Convergence blockers

PK-X2 may converge only if the final design preserves all of these:

```text
complete current-lifetime locator corpus
current trusted labels only
candidate visibility before ordinary display
visible-only deterministic ranking
bounded hard caps
search selection = locator intent only
fresh current navigation revalidation
no mint through search
no stale semantic fallback
no persistent search state
feature-off vertical closure
reload no auto-replay
scope-end immediate logical invalidation
ordinary-turn zero search work
C1+C2 inherited only
```

Any hidden persistent result/index/history authority blocks convergence.

## 19. Future stronger-profile triggers

A separate design is required before adding any of:

```text
persistent title/alias/snippet index
fuzzy / embedding / LLM semantic search
cross-conversation/global search
historical-label or revision search
search history / recently viewed pages
pagination cursor that survives activations
shareable deep links / external URLs
cross-device search state
background indexing / refresh
result analytics that affect ranking
```

These must not be smuggled into X2-5 convergence.

## 20. Runtime-readiness evidence remains separate

Design convergence does not imply runtime readiness.

A future implementation must prove at minimum:

```text
trusted complete current-lifetime enumeration
trusted current-label producer
current discoverability producer
mechanical bounded query/ranking implementation
anti-oracle visible-only result projection
current navigation-target resolver
one-selection/one-job handoff
full PK-2/support-at-use/PX1-3 path
activation teardown / supersession
feature-off closure
reload no replay
scope-end invalidation
ordinary-turn dormancy instrumentation
```

## 21. Impact verdict

```text
X2-5 IMPACT VERDICT = PROCEED
EXPECTED PK-X2 PROFILE = ACTIVE_LIFETIME_PUBLIC_REFERENCE_SEARCH_V1
EXPECTED CANDIDATE C = C1+C2 INHERITED ONLY
EXPECTED RUNTIME AUTHORITY = NONE
```

## 22. Transaction note

X2-4 previously recorded and closed:

```text
FIX · ACCIDENTAL_MAIN_PLACEHOLDER_WRITE_REVERTED
```

X2-5 inherits the clean post-X2-4 tree. The prior anomaly grants no new authority.

## 23. Status

```text
X2-5 IMPACT SCOPE = FROZEN
X2-5 DETAILED CONVERGENCE = NEXT
RUNTIME IMPLEMENTED = NO
RELEASE AUTHORIZED = NO
```
