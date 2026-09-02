# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X1 Durable Page Identity Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-X1 IMPACT SCOPE FROZEN · DURABLE IDENTITY SHELL SELECTED · C1+C2 DESIGN PROFILE REQUIRED · SEMANTIC CONTENT REMAINS CURRENT-PROJECTION ONLY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · DURABLE_PUBLIC_REFERENCE_PAGE · IMPACT SCOPE · CANDIDATE C**

## 0. Purpose

PUBLIC_KNOWLEDGE V1 converged at PK-6 as a current-projection snapshot family.

PK-6 preserved the first explicit expansion lane:

```text
PK-X1 DURABLE_PUBLIC_REFERENCE_PAGE
```

This impact scope selects the narrowest useful first slice of that lane.

The design question is not:

```text
How do we persist a complete wiki page and all of its revisions?
```

It is:

```text
How may the same logical PUBLIC_KNOWLEDGE page remain addressable across turns
without allowing old semantic content to become persistent truth authority?
```

This is design-only. It does not implement storage, runtime IDs, revision history, mutation, prompt re-entry, search, indexing, DOM/CSS, model calls, network calls, release publication, S7/v0.70.3, or `release-simcore` changes.

## 1. Fresh authority chain

PK-X1 consumes and does not replace:

```text
PK-0 settlement master design
PK-1 settlement context authority
PK-2 document sidecar / validator
PK-3 presentation grammar
PK-4 citation / provenance boundary
PK-5 revision / durable-page boundary
PK-6 family convergence / expansion registry
Candidate C durable-derived-object master design
```

Existing owners remain authoritative:

```text
Frame / Continuity / Time
→ canonical/current world semantics

Evidence / Lineage / Handoff
→ exact current support

3M-2 Exposure
→ public/source assertion eligibility

PK-1 Settlement Context
→ current bounded settlement basis

PK-2 Validator
→ current public-reference disposition

PK-3 Renderer
→ presentation only
```

PK-X1 must not become a second world-state, settlement, source, or citation authority.

## 2. Selected first expansion seam

Selected seam:

```text
DURABLE_PUBLIC_REFERENCE_PAGE_IDENTITY_SHELL_V1
```

The durable object in this first slice is deliberately small:

```text
stable logical page identity
+
trusted target binding
+
bounded lifetime metadata
```

The durable object does **not** own validated article assertions, settlement states, citation bundles, or historical revision bodies.

Canonical rule:

```text
DURABLE PAGE IDENTITY
!=
DURABLE PAGE CONTENT
```

## 3. Why identity shell first

PK-5 already freezes the minimal durability profile:

```text
PK-D1 DURABLE_PAGE_IDENTITY
C1 = YES
C2 = YES
C3..C8 = NO
```

The narrowest product value is therefore:

```text
same logical public-reference page
→ same durable page identity later
```

without yet requiring:

```text
edit
append
revision history
restore
historical page bytes
context re-entry
cross-family derived lineage
async media attachment
```

This avoids prematurely selecting PK-D2/PK-D3/PK-D4.

## 4. Candidate C profile

PK-X1 requires a consumer-specific Candidate C design profile:

```text
C1 cross-turn derived-object survival = YES
C2 stable derived identity            = YES
C3 item/page mutation                 = NO
C4 append / merge                     = NO
C5 derived-to-derived lineage         = NO
C6 future context re-entry            = NO
C7 historical partial survival        = NO
C8 delayed effect targeting           = NO
```

Important distinction:

```text
PK-X1 DESIGN REQUIRES C1+C2
!=
CANDIDATE C RUNTIME IMPLEMENTED
```

No runtime capability is authorized by this document.

## 5. Durable shell versus current semantic projection

The first architecture separates two lifetimes.

### Durable shell

May survive across turns within its explicitly bounded lifetime:

```text
pageIdentity
namespace
trusted target binding
lifetime scope
owner/version metadata as required
```

### Current semantic projection

Remains governed by the existing PUBLIC_KNOWLEDGE V1 pipeline:

```text
current source authority
→ current Exposure
→ current settlement context
→ current document draft
→ current PK validation
→ current citation validation
→ current presentation
```

No old semantic payload is sufficient merely because the page identity survived.

Canonical rule:

```text
PAGE IDENTITY SURVIVED
!=
OLD ASSERTIONS REMAIN VALID
```

## 6. Current view is regenerated, not restored

A later activation of the same durable page must regenerate/revalidate its visible semantic view from current authority.

Preferred conceptual flow:

```text
exact durable page identity
+
current target/source job authority
        ↓
current PUBLIC_KNOWLEDGE pipeline
        ↓
new current validated projection
        ↓
render under same durable page identity
```

Forbidden first-slice flow:

```text
load old page body
→ treat old validated text as current page
```

Likewise:

```text
current validation fails
→ fall back to last known good page body
```

is forbidden.

## 7. Durable identity namespace

The first page identity uses a bounded derived namespace conceptually equivalent to:

```text
PUBLIC_KNOWLEDGE_DOCUMENT
```

A durable page ID must not be inferred from:

```text
title
displayLabel
targetRef text
content fingerprint
citationRef
first assertion
host message index
renderInstanceKey
```

Canonical rule:

```text
DURABLE PAGE IDENTITY MUST BE EXPLICIT
```

## 8. Target authority is upstream

A durable page identity needs a stable reason to represent the same target later.

PK-X1 must not invent canonical entity identity.

Therefore the page identity owner may bind only to an upstream target identity/locator that is already authorized for durable exact matching.

Conceptual relation:

```text
pageIdentity
→ trusted targetIdentityRef
```

where `targetIdentityRef` is owned by the appropriate existing target/canonical identity authority.

Forbidden:

```text
same display title
→ same durable target

same targetRef-looking string
→ same durable target
```

If no stable trusted target identity exists:

```text
PK-X1 durable page creation = HOLD / UNSUPPORTED
```

A snapshot PUBLIC_KNOWLEDGE page may still be generated under V1.

## 9. `targetRef` remains current-projection binding

PK-0 through PK-2 use `targetRef` for current projection exact joins.

PK-X1 preserves:

```text
targetRef
!=
targetIdentityRef
!=
pageIdentity
```

A future runtime may bridge current `targetRef` to a stable upstream target identity through an authorized exact adapter, but it may not infer the bridge from prose.

## 10. Identity owner

The narrowest conceptual owner is a PUBLIC_KNOWLEDGE durable-page identity registry under the Candidate C derived-object layer.

Its authority is limited to:

```text
mint / resolve durable page identity
bind it to one trusted target identity within one lifetime scope
return exact page identity for later authorized lookup
expire owner-scoped identity records
```

It does not own:

```text
page truth
settlement
exposure
article content
citation support
search ranking
revision history
```

## 11. One active identity per target per lifetime scope

Within the selected first lifetime scope, the identity owner must prevent accidental duplicate logical pages for the same trusted target.

Conceptual uniqueness rule:

```text
(namespace, lifetimeScope, trustedTargetIdentityRef)
→ at most one ACTIVE pageIdentity
```

A repeated exact resolve should return the existing page identity rather than mint a second sibling.

This is an identity invariant, not a semantic merge operation.

## 12. Lifetime selection

PK-X1 requires a bounded lifetime because C1 is now selected.

First design direction:

```text
CONVERSATION_SCOPED_PUBLIC_REFERENCE_IDENTITY
```

Meaning:

- the durable page identity may survive across turns within the current conversation/session scope;
- it does not claim global or permanent identity outside that scope;
- it expires through owner-governed lifecycle cleanup at scope end;
- the lifetime does not authorize content retention or model-context re-entry.

This is an explicit consumer choice, not a generic Candidate C default.

## 13. Persistence backend remains unselected

A durable identity requires some future state mechanism, but PK-X1 must not choose storage prematurely.

Possible physical mechanisms remain implementation decisions.

The design contract requires only:

```text
bounded owner-scoped records
schema/versioned reads and writes
preservation of unowned host metadata
no cache-as-authority
exact identity lookup
bounded cleanup
```

Canonical rule:

```text
STORAGE MECHANISM
!=
SEMANTIC AUTHORITY
```

## 14. No revision semantics in PK-X1 first slice

Because C3/C4 are off:

```text
page edit       = NOT AUTHORIZED
append assertion = NOT AUTHORIZED
remove assertion = NOT AUTHORIZED
append citation  = NOT AUTHORIZED
restore revision = NOT AUTHORIZED
```

A fresh validated projection shown later under the same page identity is not automatically a persisted revision.

```text
SAME PAGE IDENTITY
+
NEW CURRENT PROJECTION
!=
REVISION HISTORY
```

PK-D2 remains the explicit future step for revision semantics.

## 15. No old semantic content lookup

PK-X1 exact lookup may retrieve only the durable page identity shell needed to address the same logical page.

It must not imply:

```text
retrieve previous page assertions
retrieve prior citations
retrieve prior reference states
retrieve historical renderer model
```

Those capabilities belong to PK-D2/PK-D3 and search/retrieval expansion lanes.

## 16. Support-at-use remains mandatory

When the same page is activated later:

```text
pageIdentity exact resolve
→ current target/source authority join
→ current Exposure
→ current settlement context
→ current PK validation
```

If support cannot be re-proven:

```text
current page view = unavailable / quarantined / HOLD as appropriate
```

The identity shell may remain addressable until lifetime expiry, but it cannot supply stale semantic content as fallback.

## 17. Durable identity does not imply current availability

The product must tolerate:

```text
pageIdentity exists
+
current authority no longer supports a valid PUBLIC_KNOWLEDGE projection
```

Result:

```text
logical page identity exists
but no current validated page content is available
```

That is legal and safer than resurrecting old text.

## 18. No model context re-entry

C6 remains off.

Therefore:

```text
durable page identity
!=
future prompt memory
```

Neither the page shell nor old page content is automatically injected into future model requests.

If a future consumer needs page-derived context re-entry, PK-D4 / C6 must be opened explicitly.

## 19. No user mutation

Visible page controls such as:

```text
edit
restore
delete revision
append citation
```

remain out of scope.

Presentation-only controls may navigate/display current state if separately authorized, but a button cannot create C3/C4 authority.

## 20. Search remains separate

PK-X1 exact page identity resolution is not public-reference search.

Canonical separation:

```text
EXACT DURABLE PAGE LOOKUP
!=
SEARCH / INDEX / FUZZY RETRIEVAL
```

`PK-X2 PUBLIC_REFERENCE_SEARCH` remains a separate expansion lane.

## 21. Citation identity remains non-durable by default

PK-X1 does not promote PK-4 `citationRef` into cross-turn identity.

A newly generated current projection may produce a newly validated current citation bundle.

```text
SAME PAGE IDENTITY
!=
SAME CITATION IDENTITY
```

Stable citation records require a separate consumer-specific durability design.

## 22. Presentation binding

A current `PUBLIC_REFERENCE_DOCUMENT_V1` render may receive a non-semantic page identity handle for navigation/addressability.

The renderer may expose a stable page-local UI affordance only if doing so does not turn the visible label into authority.

Presentation still must consume only current validated semantics.

## 23. Old visible cards

An older rendered PUBLIC_KNOWLEDGE card may remain in host transcript/presentation history according to host behavior.

Its continued visibility does not make it the current durable page body.

Canonical rule:

```text
OLD VISIBLE CARD
!=
CURRENT PAGE CONTENT
!=
CURRENT AUTHORITY
```

PK-X1 does not rewrite host transcript history.

## 24. Failure domains

First-slice failure separation:

```text
identity lookup/mint failure
!=
current source support failure
!=
Exposure failure
!=
settlement failure
!=
PK validation quarantine
!=
presentation failure
```

A page identity failure must not silently mint a title-derived fallback ID.

A semantic validation failure must not delete the durable identity merely because the current view is unavailable.

## 25. Performance boundary

Dormant turns remain governed by 3M-9.

No current PUBLIC_KNOWLEDGE durable-page operation:

```text
→ durable page lookup = NONE
→ durable page write = NONE
→ PK semantic work = NONE
```

When active, identity work must be exact and bounded.

Forbidden:

```text
full transcript scan
all-page scan
fuzzy title matching
history mining
```

## 26. First evidence requirements for future implementation

Before runtime authorization, a future implementation design must prove at least:

```text
one exact target → one stable page identity within lifetime
same target later → same page identity
same display label but different target → different identity
changed display label for same target → same identity
unknown/non-durable target → no durable mint
old semantic content never used as current fallback
identity survives current-view quarantine without becoming semantic authority
lifetime cleanup removes only owner-scoped records
source-irrelevant turns pay no durable-page cost
```

These are future acceptance conditions, not evidence claimed now.

## 27. BLOCKER / WATCH / DEFER

```text
BLOCKER · PAGE_ID_DERIVED_FROM_TITLE_OR_CONTENT
BLOCKER · DURABLE_IDENTITY_CACHES_OLD_PAGE_AS_CURRENT_TRUTH
BLOCKER · PAGE_IDENTITY_OWNER_CREATES_CANONICAL_TARGET_IDENTITY
BLOCKER · SAME_TARGET_MINTS_MULTIPLE_ACTIVE_PAGE_IDENTITIES
BLOCKER · OLD_PAGE_BODY_USED_AS_CURRENT_FALLBACK
BLOCKER · C6_REENTRY_ACTIVATED_BY_PERSISTENCE_ALONE
BLOCKER · SEARCH_OR_FUZZY_MATCH_REQUIRED_FOR_EXACT_PAGE_RESOLUTION
BLOCKER · STORAGE_CACHE_BECOMES_SEMANTIC_AUTHORITY

WATCH · TARGET_IDENTITY_AUTHORITY_MAY_NOT_EXIST_FOR_ALL_PK_TARGETS
WATCH · CONVERSATION_SCOPE_LIFETIME_NEEDS_HOST_SCOPE_MAPPING_AT_IMPLEMENTATION
WATCH · OLD_VISIBLE_HOST_CARD_MAY_LOOK_CURRENT_WITHOUT_CLEAR_PRESENTATION_CUE

DEFER · PK-D2 REVISIONED_PAGE
DEFER · PK-D3 HISTORICAL_PAGE
DEFER · PK-D4 CONTEXTUAL_DURABLE_PAGE
DEFER · PK-X2 PUBLIC_REFERENCE_SEARCH
DEFER · PK-X3 PUBLIC_REFERENCE_ENTITY_LINKS
DEFER · PK-X4 PUBLIC_REFERENCE_INFOBOX
DEFER · PK-X5 PUBLIC_REFERENCE_MEDIA
DEFER · PK-X6 PUBLIC_REFERENCE_METRICS
DEFER · PK-X7 PUBLIC_REFERENCE_INTERACTION
```

## 28. Selected full-design seam

The next PK-X1 design transaction should freeze:

```text
DURABLE_PUBLIC_REFERENCE_PAGE_IDENTITY_SHELL_V1
```

with responsibilities limited to:

```text
page identity ownership
trusted stable target binding
conversation-scoped lifetime
exact resolve-or-mint semantics
current-view revalidation binding
identity/current-content separation
bounded cleanup / failure isolation
Candidate C C1+C2 only
```

## 29. Frozen verdict

```text
PK_X1_IMPACT_SCOPE                 = FROZEN
SELECTED_SEAM                      = DURABLE_PUBLIC_REFERENCE_PAGE_IDENTITY_SHELL_V1
DURABLE_OBJECT                     = IDENTITY SHELL ONLY
SEMANTIC_CONTENT_LIFETIME          = CURRENT PROJECTION ONLY
DURABLE_LIFETIME                   = CONVERSATION SCOPED
C1                                 = REQUIRED BY DESIGN
C2                                 = REQUIRED BY DESIGN
C3..C8                             = NOT SELECTED
REVISION_HISTORY                   = DEFERRED
SEARCH                             = DEFERRED
CONTEXT_REENTRY                    = NONE
RUNTIME_IMPLEMENTATION             = NOT AUTHORIZED
PRODUCTION                         = UNCHANGED
release-simcore                    = UNCHANGED
```
