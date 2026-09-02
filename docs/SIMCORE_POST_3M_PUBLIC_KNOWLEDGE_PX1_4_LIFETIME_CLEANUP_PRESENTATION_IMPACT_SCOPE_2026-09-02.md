# SimCore Post-3.0M PUBLIC_KNOWLEDGE PX1-4 Lifetime / Cleanup / Presentation Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PX1-4 IMPACT SCOPE FROZEN · CONVERSATION LIFETIME OWNER · LOGICAL EXPIRY / PHYSICAL CLEANUP SEPARATION · FEATURE-OFF EPHEMERAL CLOSURE · NO STALE PAGE PRESENTATION · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · PX1-4 · LIFETIME · CLEANUP · PRESENTATION · IMPACT SCOPE**

## 0. Purpose

PX1-0 froze conversation-scoped durable PUBLIC_KNOWLEDGE page identity.
PX1-1 froze stable target identity admission.
PX1-2 froze the minimal immutable identity record and exact resolve-or-mint.
PX1-3 froze the ephemeral current-view revalidation binding.

PX1-4 must answer the remaining lifecycle and presentation questions without expanding into revision history, search, semantic persistence, or runtime implementation:

```text
who decides that a page-identity lifetime is still active?
what happens when the conversation scope ends?
what must be removed when the feature is disabled?
what may remain durable while the feature is temporarily off?
how is an existing page represented when no current semantic view is eligible?
how are old host transcript artifacts distinguished from a current page surface?
```

This transaction is design-only.

## 1. Current authority inputs

PX1-4 consumes:

```text
PK-X1 master
PX1-2 identity record / resolve-mint
PX1-3 current-view revalidation binding
PK-3 presentation grammar
PK-4 citation/presentation provenance
3M-4 Presentation Renderer boundary
3M-6 support-at-use invalidation
3M-9 source-irrelevant dormancy
trusted host/SimCore conversation lifetime owner
```

No new world-truth, target-identity, settlement, exposure, or page-content owner is introduced.

## 2. First impact decision

Selected lifecycle seam:

```text
TRUSTED_CONVERSATION_SCOPE_LIFETIME
+
IMMEDIATE_LOGICAL_EXPIRY
+
OWNER_SCOPED_PHYSICAL_RECLAMATION
+
FEATURE_OFF_EPHEMERAL_CLOSURE
+
NON_SEMANTIC_UNAVAILABLE_PRESENTATION
```

The durable identity record remains a locator only.

## 3. Lifetime authority

`lifetimeScopeRef` remains owned by a trusted host/SimCore scope owner.

PX1-4 must not infer lifetime from:

```text
wall-clock age
turn count
last access time
last render time
last source activity
page title
model statement
host transcript position
```

Conceptual lifetime states:

```text
ACTIVE
ENDED
UNKNOWN
```

Only trusted `ACTIVE` allows durable page identity use.

`ENDED` means the selected identity domain no longer exists for ordinary resolution.

`UNKNOWN` fails closed.

## 4. No guessed TTL

PX1-4 does not freeze an arbitrary TTL such as:

```text
30 minutes
24 hours
100 turns
```

Conversation-scoped identity ends when the trusted conversation lifetime owner says the scope ended.

A future physical backend may use maintenance TTLs only for storage reclamation after logical expiry. Such TTLs cannot define semantic lifetime.

## 5. Logical expiry versus physical deletion

These are distinct operations.

### Logical expiry

At trusted scope end:

```text
lifetimeScopeRef no longer ACTIVE
→ old pageIdentity records in that scope are not ordinary resolvable identities
→ no current page binding may survive
```

This semantic effect must not wait for storage garbage collection.

### Physical reclamation

Owner-scoped identity rows may then be deleted/reclaimed by a future backend.

Physical reclamation timing does not extend logical lifetime.

Canonical rule:

```text
ROW STILL PHYSICALLY PRESENT
!=
IDENTITY STILL ACTIVE
```

## 6. Conversation deletion

If the trusted host exposes explicit conversation deletion as a stronger lifetime-end event, PX1-4 treats it as:

```text
logical scope end
+
owner-scoped cleanup obligation
```

No PUBLIC_KNOWLEDGE-specific retention archive or tombstone is introduced.

## 7. Temporary feature-off is not scope expiry

Temporary disabling of PUBLIC_KNOWLEDGE / durable-page presentation must not silently re-key pages.

Selected rule:

```text
feature OFF
→ clear ephemeral current binding
→ unmount/clear feature-owned current presentation state
→ no identity lookup
→ no identity write
→ no PK generation/validation
→ durable identity record may remain while lifetimeScopeRef stays ACTIVE
```

Therefore:

```text
FEATURE OFF
!=
PAGE IDENTITY DELETION
```

Re-enabling the feature in the same still-active lifetime may later resolve the same page identity through the normal current-authority path.

## 8. Feature-off vertical closure

Even if the durable locator remains stored, feature-off must leave no active feature behavior:

```text
no current source surface
no stale DOM subtree
no current-view binding
no renderer update
no background refresh
no history scan
no cache-driven resurrection
no model/prompt effect
```

The stored identity record is inert metadata while the feature is off.

## 9. Current view unavailable

A legal state remains:

```text
pageIdentity exists
+
current target identity exact
+
current semantic page unavailable / HOLD / empty according to PX1-3
```

PX1-4 must not show old semantic content.

A future presentation may show only a bounded non-semantic availability shell when current identity/target authority is still proven.

## 10. Non-semantic availability shell

Candidate first presentation intent:

```text
PUBLIC_REFERENCE_PAGE_UNAVAILABLE_V1
```

Allowed inputs are bounded current trusted presentation facts only, such as:

```text
current trusted displayLabel
family = PUBLIC_KNOWLEDGE
availability = CURRENT_CONTENT_UNAVAILABLE
```

It must not include:

```text
old body
old title text if title authority is not current
old citation
old settlement state
old reference state
old sourceAuthorityRef
hidden quarantine count
DENY/HOLD text
internal reason detail that leaks private state
```

## 11. Identity-store failure presentation

If identity state is unavailable, ambiguous, corrupt, or conflicting:

```text
no durable page shell
```

A generic feature-unavailable surface may be allowed by product presentation policy, but it must not claim that a particular durable page identity exists.

If current semantics independently qualify for snapshot fallback under PX1-3, snapshot behavior remains separate.

## 12. Snapshot fallback remains semantic-current only

PX1-4 preserves the PX1-3 distinction:

```text
DURABILITY FAILURE
may degrade to explicitly authorized current snapshot

SEMANTIC AUTHORITY FAILURE
may not
```

No old durable page content is a snapshot fallback source.

## 13. Old host transcript artifacts

The host may retain old assistant/transcript PUBLIC_KNOWLEDGE artifacts.

PX1-4 does not rewrite them.

Frozen distinction:

```text
HISTORICAL_HOST_TRANSCRIPT_ARTIFACT
!=
CURRENT_PUBLIC_REFERENCE_PAGE_SURFACE
```

Old transcript content does not become current merely because the same `pageIdentity` is later resolved.

A future explicit historical/revision product is separate.

## 14. Current presentation ownership

The current page surface must consume only a PX1-3 `BOUND_CURRENT` view or a PX1-4 bounded unavailable shell.

Presentation must not independently:

```text
resolve page identity
revalidate source support
recover old semantics
scan host history
choose last-known-good content
```

Those remain upstream authority responsibilities.

## 15. Page identity is not semantic cache key

`pageIdentity` may key logical UI addressability.

It must not by itself authorize cached semantic subtree reuse.

```text
same pageIdentity
+
new activation
→ current binding still required
```

If current binding disappears, feature-owned semantic content must be removed from the current surface.

## 16. Reload boundary

Reload/restart clears ephemeral current-view and presentation state.

Reload does not itself end an ACTIVE conversation lifetime.

After reload:

```text
no automatic page regeneration
no automatic identity lookup on source-irrelevant turn
```

A later authorized current PUBLIC_KNOWLEDGE job may resolve the same durable page identity and build a newly validated current view.

## 17. Target identity conflict/rekey boundary

If PX1-1 can no longer prove the exact target identity bound to the page record:

```text
no current durable binding
```

PX1-4 does not delete, overwrite, or re-key the identity record automatically.

Alias/rekey/migration remains a separate design lane.

## 18. Corrupt identity state

Corrupt/duplicate identity state is not cleanup authority.

Forbidden repair:

```text
corrupt record
→ delete whichever looks older
→ continue
```

Result remains fail-closed until a separately authorized integrity/migration path exists.

## 19. Cleanup must preserve unrelated metadata

Any future host/plugin cleanup must remove only PX1/Source-Intelligence-owned state.

It must not rebuild host records in a way that erases unrelated metadata.

Canonical rule:

```text
OWNER-SCOPED CLEANUP
→ DELETE/CLEAR OWNED STATE ONLY
```

## 20. No tombstone/history model

PX1-4 does not add:

```text
pageDeletedAt
expiredAt semantic history
page tombstone
revision tombstone
lastSeenAt
lastAccessedAt
expiry reason history
restore pointer
```

A future backend may have non-semantic operational metadata, but no consumer may treat it as page semantics.

## 21. Dormancy after cleanup design

On source-irrelevant turns, including turns where durable page identities exist:

```text
identity lookup = 0
identity write = 0
cleanup scan = 0
PK generation = 0
PK validation = 0
presentation update = 0
```

Cleanup is triggered by an explicit trusted lifetime lifecycle event or owner operation, not by scanning every ordinary turn.

## 22. Candidate C profile

PX1-4 remains within:

```text
C1 YES
C2 YES
C3-C8 NO
```

Lifecycle expiry and owner-scoped locator cleanup do not create semantic page mutation or revision history.

## 23. Explicit non-goals

PX1-4 does not design:

```text
revision history
historical page viewing
stale-content badge over old body
search/indexing
cross-conversation identity
page edit/delete semantics
user-authored mutation
alias/rekey migration
NEWS/BOARD/SOCIAL_FEED propagation
future prompt re-entry
runtime storage implementation
runtime renderer implementation
```

## 24. Impacted owners

### Direct design owners

```text
PK-X1 durable page identity owner
PX1-3 current-view binding
PK-3/3M-4 presentation boundary
trusted lifetime-scope owner
```

### Explicitly not modified

```text
PK-0 settlement policy
PK-1 settlement composer
PK-2 semantic validator
3M-2 Exposure
Evidence / Lineage / Handoff
production runtime
```

## 25. Failure classes to preserve

PX1-4 must keep these distinct:

```text
LIFETIME_ENDED
LIFETIME_UNKNOWN
FEATURE_DISABLED
CURRENT_VIEW_UNAVAILABLE
IDENTITY_STATE_UNAVAILABLE
IDENTITY_STATE_CORRUPT
SEMANTIC_AUTHORITY_INVALID
PRESENTATION_EFFECT_FAILED
```

No class may be collapsed into another merely for fallback convenience.

## 26. First validation matrix

Design acceptance must cover at least:

```text
A. active lifetime + bound current view
B. active lifetime + current view unavailable
C. active lifetime + temporary feature off
D. feature re-enabled in same lifetime
E. trusted scope end
F. conversation deletion event
G. reload while lifetime remains active
H. identity store unavailable
I. identity corruption/duplicate state
J. current semantics valid but durability unavailable → snapshot policy
K. semantic authority invalid → no snapshot laundering
L. old host transcript card remains visible but is not current surface
```

## 27. Implementation blockers retained

PX1-4 design completion will not authorize runtime.

Future implementation still requires concrete answers for:

```text
trusted lifetimeScopeRef producer / end event
physical identity storage backend
atomic PX1-2 operation
presentation host mount authority
feature-off teardown hook
reload reconstruction boundary
owner-scoped purge capability
hard caps / instrumentation
```

## 28. Impact verdict

```text
PX1_4_IMPACT_SCOPE = FROZEN
SELECTED = TRUSTED_SCOPE_LIFETIME_AND_FEATURE_OFF_PRESENTATION_CLOSURE
RUNTIME_IMPLEMENTATION = NOT_AUTHORIZED
RELEASE = UNCHANGED
```

## 29. Next transaction

After CI acceptance of this impact scope, freeze the detailed PX1-4 design covering:

```text
lifetime state machine
expiry / purge ordering
feature-off and reload semantics
unavailable page presentation grammar
old-card/current-surface distinction
cleanup integrity/failure policy
PX1-5 handoff
```
