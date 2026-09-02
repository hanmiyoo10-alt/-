# SimCore Post-3.0M PUBLIC_KNOWLEDGE PX1-4 Lifetime / Cleanup / Presentation Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PX1-4 DESIGN FROZEN · TRUSTED CONVERSATION LIFETIME · NON-RECYCLABLE SCOPE GENERATION · IMMEDIATE LOGICAL EXPIRY · OWNER-SCOPED RECLAMATION · FEATURE-OFF VERTICAL CLOSURE · BOUNDED UNAVAILABLE PAGE SHELL · NO STALE SEMANTIC FALLBACK · C1+C2 ONLY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · PX1-4 · LIFETIME · CLEANUP · HOST PRESENTATION BOUNDARY · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PX1-0 froze the durable page-identity shell.
PX1-1 froze stable target identity admission.
PX1-2 froze minimal immutable identity records and atomic resolve-or-mint.
PX1-3 froze the ephemeral current-view revalidation binding.
The PX1-4 impact scope selected trusted conversation lifetime, logical expiry, owner-scoped reclamation, feature-off closure, and bounded unavailable presentation.

PX1-4 freezes the detailed lifecycle contract that prevents a durable locator from outliving its trusted identity domain or becoming stale semantic UI.

This is design-only. It implements no lifetime producer, storage backend, cleanup hook, DOM/CSS, mount host, cache, runtime schema, timer, background worker, model call, network call, release, S7/v0.70.3, or `release-simcore` mutation.

## 1. Authority chain

```text
trusted host / SimCore lifetime owner
→ lifetimeScopeRef + ACTIVE / ENDED / UNKNOWN

PX1-1
→ current targetIdentityRef

PX1-2
→ durable pageIdentity locator

PK-2 + 3M-6
→ current validated PUBLIC_KNOWLEDGE semantics + current support

PX1-3
→ current pageIdentity ↔ current validated-view binding

PX1-4
→ lifecycle admission, expiry handoff, cleanup policy, current presentation state selection

PK-3 / 3M-4
→ presentation grammar / mount effect
```

Canonical separation:

```text
LIFETIME AUTHORITY
!=
PAGE IDENTITY AUTHORITY
!=
PAGE SEMANTIC AUTHORITY
!=
PRESENTATION EFFECT AUTHORITY
```

## 2. Final architecture decision

Selected architecture:

```text
EXTERNAL_TRUSTED_LIFETIME_STATE
+
IMMUTABLE_DURABLE_IDENTITY_RECORDS
+
EPHEMERAL_CURRENT_VIEW_BINDING
+
EVENT_DRIVEN_OWNER_CLEANUP
+
CURRENT_ONLY_PRESENTATION
```

No active/expired bit is added to the immutable PX1-2 record.

Logical lifetime remains external to the record.

## 3. Lifetime state vocabulary

Conceptual trusted states:

```text
ACTIVE
ENDED
UNKNOWN
```

### ACTIVE

The exact `lifetimeScopeRef` is a current valid conversation identity domain.

### ENDED

The scope has ended or been explicitly deleted/revoked by its owner.

### UNKNOWN

The caller cannot currently prove whether the scope is active.

`UNKNOWN` is not treated as ACTIVE and not treated as authoritative ENDED.

## 4. Lifetime admission rule

Durable identity operations require exact trusted ACTIVE state.

```text
ACTIVE
→ durable resolve/mint may continue subject to PX1-1/PX1-2/PX1-3

ENDED
→ durable resolve/mint/current binding forbidden

UNKNOWN
→ durability HOLD / fail closed
```

A current semantic snapshot may remain separately eligible only when the current source/Exposure/PK contracts independently allow it and product fallback policy explicitly permits snapshot mode.

## 5. `lifetimeScopeRef` non-reuse invariant

This is mandatory.

A scope reference that has reached ENDED must not later be recycled to represent a new conversation lifetime inside the identity owner domain.

Canonical rule:

```text
ENDED scopeRef X
!=
future new conversation scopeRef X
```

If the host uses a reusable slot/index, the trusted lifetime identity must include a non-recycled generation component or another collision-safe opaque lifetime identity.

Reason:

```text
recycled scopeRef
+
physically retained old identity row
→ accidental old pageIdentity resurrection
```

A runtime lacking this guarantee is not PX1-4 ready.

## 6. Human labels are not lifetime identity

Forbidden lifetime keys include:

```text
conversation title
room name
visible chat label
list index
open-tab position
model-provided session name
```

Visible labels may repeat.

`lifetimeScopeRef` must be a trusted opaque machine identity for one bounded lifetime generation.

## 7. No TTL-derived semantic expiry

PX1-4 freezes no semantic TTL.

Forbidden authority inference:

```text
idle 30 minutes → ended
100 turns → ended
not viewed today → ended
last access old → ended
```

Only the lifetime owner ends the identity domain.

A storage backend may later use operational reclamation TTL after trusted logical expiry, but that TTL cannot make an ACTIVE scope semantically expire.

## 8. Logical expiry event

At the first trusted transition:

```text
ACTIVE → ENDED
```

all PK-X1 durable page identities in that scope immediately cease to be ordinary resolvable identities.

This does not require mutating each identity record.

The lifetime authority itself makes them inactive.

## 9. Expiry ordering

Frozen conceptual ordering:

```text
1. receive trusted scope-end event/state
2. make lifetime logically ENDED for ordinary PX1 operations
3. clear/reject ephemeral current-view binding
4. tear down feature-owned current presentation
5. request owner-scoped physical identity reclamation
6. emit bounded operational cleanup result if needed
```

Physical deletion must not occur first and serve as the proof that the lifetime ended.

## 10. Why logical expiry precedes physical reclamation

Storage cleanup can fail.

Therefore:

```text
DELETE FAILED
!=
SCOPE STILL ACTIVE
```

Once the trusted lifetime owner says ENDED, a surviving physical row is inert residue.

It must not be resolvable through normal PX1 operations.

## 11. Owner-scoped cleanup operation

Future implementation must expose an owner operation conceptually equivalent to:

```text
reclaimPublicReferencePageIdentitiesForScope(lifetimeScopeRef)
```

Requirements:

```text
owner scoped
idempotent
no semantic page reconstruction
no history scan
no unrelated metadata mutation
bounded by the records owned by that exact scope
```

The physical API shape is not frozen.

## 12. Cleanup idempotency

Repeated cleanup for the same ended scope must be safe.

```text
first cleanup → rows removed
second cleanup → already absent / no-op
```

It must not mint, restore, or infer missing page identities.

## 13. No tombstone requirement

PX1-4 does not create durable page tombstones.

No semantic fields such as:

```text
expiredAt
expiredReason
deletedAt
restorableUntil
previousPageIdentity
```

are introduced.

Operational systems may log bounded cleanup diagnostics outside page semantic authority.

## 14. Bounded cleanup receipt

If operational observability is needed, a future ephemeral receipt may contain only bounded metadata such as:

```text
scopeCleanupStatus
recordsAffectedCount
reasonCode
```

It must not contain:

```text
old page bodies
old citation bodies
quarantined content
target display labels
settlement payloads
```

This receipt is not a durable page history object.

## 15. Cleanup result vocabulary

Conceptual operational states:

```text
CLEANUP_COMPLETE
CLEANUP_ALREADY_EMPTY
CLEANUP_FAILED_STORAGE
CLEANUP_UNSUPPORTED
```

These describe physical reclamation only.

They do not change the already-decided logical lifetime state.

## 16. Conversation deletion

Explicit trusted conversation deletion is treated as a scope-ending lifecycle event.

Required semantic effect:

```text
logical expiry immediately
current binding cleared
current presentation removed
owner-scoped identity metadata becomes cleanup-eligible
```

PUBLIC_KNOWLEDGE introduces no private archive or restore copy.

If host deletion semantics require stronger immediate physical purge, the future backend must satisfy that host policy before runtime authorization.

## 17. Temporary feature-off state

Temporary feature disable while lifetime remains ACTIVE is deliberately different from scope end.

```text
FEATURE OFF
+
lifetime ACTIVE
```

means:

```text
durable identity record may remain
current semantic binding = cleared
current presentation = cleared/unmounted
identity lookup = 0
identity write = 0
PK generation = 0
PK validation = 0
renderer update = 0
background refresh = 0
```

The identity is dormant, not deleted.

## 18. Why feature-off does not delete identity

Deleting on every temporary toggle would cause:

```text
OFF → page identity destroyed
ON → same target gets new page identity
```

which violates the selected conversation-scoped durability semantics.

Therefore:

```text
FEATURE DISABLE
!=
IDENTITY DOMAIN END
```

unless a separate trusted product action explicitly ends/revokes the underlying lifetime scope.

## 19. Feature re-enable

Re-enable does not automatically resurrect a page view.

Required flow:

```text
feature ON
→ remain dormant
→ wait for a current authorized PUBLIC_KNOWLEDGE source job
→ prove lifetime ACTIVE
→ PX1-1 current target identity
→ PX1-2 exact page resolve
→ fresh PK validation/support
→ PX1-3 new current binding
→ current presentation
```

Old semantics are not reloaded merely because the feature became enabled.

## 20. Feature-off current DOM rule

A feature-owned current page surface must not remain mounted as an active source surface while the feature is off.

Future presentation host behavior must achieve one of:

```text
unmount feature-owned current root
or
clear feature-owned semantic subtree and deactivate the root
```

Exact DOM APIs remain implementation work.

## 21. Host transcript is not feature-owned current DOM

An old assistant/transcript artifact belongs to host history, not the current source-surface owner.

Therefore PX1-4 does not rewrite historical host messages on feature-off.

Canonical distinction:

```text
CURRENT FEATURE SURFACE
→ teardown required

HISTORICAL HOST TRANSCRIPT ARTIFACT
→ not rewritten by PX1-4
```

## 22. Reload semantics

Reload clears all ephemeral PX1-3 current-view bindings and PX1-4 presentation instances.

Reload alone does not change lifetime state.

If the trusted conversation scope remains ACTIVE, durable identity rows may remain.

After reload:

```text
no automatic identity scan
no automatic current-page generation
no automatic renderer remount from old semantic cache
```

A later current authorized job must rebuild the view through the normal authority chain.

## 23. Cache after reload

A cache may accelerate a later exact identity lookup only if the owning storage contract allows it.

It may not restore page semantics.

```text
cached pageIdentity
!=
cached current page body authority
```

Any semantic cache keyed only by `pageIdentity` is outside the frozen contract.

## 24. Current presentation states

PX1-4 freezes a bounded presentation selection vocabulary:

```text
CURRENT_PAGE_BOUND
CURRENT_PAGE_UNAVAILABLE
SNAPSHOT_ONLY_CURRENT
NO_CURRENT_PAGE_SURFACE
```

These are presentation-selection states, not durable identity-record fields.

## 25. `CURRENT_PAGE_BOUND`

Required conditions include:

```text
lifetime ACTIVE
PX1-1 target identity exact
PX1-2 identity exact
PX1-3 BOUND_CURRENT
current semantic support valid
feature enabled
```

Presentation receives only current validated semantics and current presentation/citation material.

## 26. `CURRENT_PAGE_UNAVAILABLE`

This state is allowed only when:

```text
feature enabled
lifetime ACTIVE
exact current target identity proven
exact durable page identity proven
no eligible current semantic document binding
```

It represents:

```text
same logical page exists in this active lifetime
but no current semantic body is available for ordinary display
```

It never authorizes old body fallback.

## 27. Unavailable shell grammar

Conceptual presentation adapter:

```text
PUBLIC_REFERENCE_PAGE_UNAVAILABLE_V1
```

Allowed semantic inputs:

```text
current trusted displayLabel
family = PUBLIC_KNOWLEDGE
availability = CURRENT_CONTENT_UNAVAILABLE
```

Optional presentation-only local labels may express a generic message equivalent to:

```text
current public-reference content is unavailable
```

No detailed internal reason is required.

## 28. Unavailable shell forbidden data

It must not reveal:

```text
old page body
old title if current title authority is absent
old source
old citations
old settlement state
old reference state
last successful timestamp
number of hidden assertions
DENY/HOLD reason content
quarantined text
```

The shell cannot become a side-channel for hidden validation state.

## 29. Unavailable shell identity display

The opaque `pageIdentity` is not ordinary user-facing semantic text.

Presentation may use it internally for exact UI addressability but must not display it as meaningful page content unless a separate product/debug contract explicitly authorizes that surface.

## 30. Accessibility requirement

Unavailable/current status must be understandable without color alone.

A future renderer must use textual/structural status semantics, not only muted colors or badges.

This does not authorize any specific CSS.

## 31. `SNAPSHOT_ONLY_CURRENT`

This remains a separate PX1-3 fallback lane.

It is allowed only when:

```text
current PK semantics independently valid
+
durability unavailable/unsupported in a way explicitly eligible for snapshot fallback
```

Examples may include:

```text
stable target identity unsupported
bounded identity-store availability failure under explicit product policy
```

The snapshot does not inherit a durable page handle.

## 32. Semantic failure cannot degrade to snapshot

Forbidden:

```text
source stale
Exposure DENY/HOLD
PK validation invalid
settlement unsupported
→ display snapshot anyway
```

Canonical rule remains:

```text
DURABILITY FAILURE
MAY DEGRADE TO CURRENT SNAPSHOT

SEMANTIC AUTHORITY FAILURE
MAY NOT
```

## 33. Identity corruption cannot create a page-specific shell

If the identity store returns corrupt, conflicting, or duplicate state:

```text
CURRENT_PAGE_UNAVAILABLE with claimed durable page identity
```

is not allowed.

The system cannot safely claim which logical durable page exists.

Possible product behavior is a generic feature-unavailable surface or an independently eligible snapshot, subject to explicit policy.

## 34. Lifetime UNKNOWN presentation

If current lifetime state is UNKNOWN:

```text
no durable page binding
no durable page-specific unavailable shell
```

An independently eligible current snapshot may remain possible if the durability fallback policy permits it.

Unknown lifetime cannot be guessed from presence of an old identity row.

## 35. Lifetime ENDED presentation

An ENDED scope has no current durable page surface.

```text
ENDED
→ NO_CURRENT_PAGE_SURFACE
```

A stale renderer must not keep a page surface alive because the DOM already exists.

## 36. Presentation replacement semantics

For the same durable page identity across two authorized activations:

```text
old current binding A
new current binding B
```

presentation must treat B as a new current semantic instance.

It must not merge old and new assertion trees unless a future mutation/revision contract explicitly authorizes that behavior.

Conceptual rule:

```text
NEW CURRENT VIEW
→ REPLACE CURRENT SEMANTIC SUBTREE
NOT MERGE WITH OLD
```

## 37. Loss of current binding

If a previously `BOUND_CURRENT` page later becomes unbound:

```text
remove old semantic subtree first
then optionally render bounded unavailable shell
```

Forbidden ordering:

```text
keep old semantic subtree
+ overlay unavailable badge
```

because that still exposes stale semantics.

## 38. Old visible card distinction

An old host transcript card may remain visible as historical assistant output.

PX1-4 does not claim it is current, refresh it, or attach current page status to it.

```text
old transcript card visible
!=
current durable page body visible
```

A true historical/revision browsing product remains PK-D2 or another explicit future lane.

## 39. No stale badge product

PX1-4 does not authorize:

```text
old content + "stale" badge
old content + "archived" badge
old content + "last known" badge
```

Those behaviors intentionally preserve historical semantics and therefore require a stronger Candidate C / revision contract.

## 40. Current display label

When a current page-specific surface exists, its visible target label must come from current trusted target authority.

A durable identity record has no display label and cannot supply one.

If current display-label authority is unavailable, presentation must not recover the old title from previous page content.

## 41. Target rekey conflict

If the current stable target identity no longer exact-matches the immutable PX1-2 page record:

```text
no current durable page binding
```

PX1-4 does not:

```text
delete old identity
retarget old identity
merge identities
alias old/new identities
```

Rekey/alias migration remains separate.

## 42. Corrupt identity cleanup non-shortcut

Corrupt state must not be repaired by ordinary cleanup heuristics.

Forbidden:

```text
duplicate rows
→ keep newest/delete oldest
```

or:

```text
same pageIdentity bound to two keys
→ choose one based on current title
```

Integrity repair requires separate authority.

## 43. Cleanup and corruption are different classes

```text
scope ended
→ ordinary owner cleanup

store corrupt
→ integrity failure
```

Do not use scope cleanup APIs as an implicit corruption resolver.

## 44. Cleanup failure after scope end

If physical reclamation fails after logical expiry:

```text
scope remains ENDED
identity remains non-resolvable
current view remains absent
presentation remains absent
```

Operational retry may occur according to the future storage owner, but Source Intelligence must not run per-turn cleanup scans.

## 45. No per-turn garbage collection

On ordinary turns:

```text
scan expired scopes = 0
scan all page identities = 0
reconcile records = 0
refresh pages = 0
```

Lifecycle cleanup is event-driven or explicit owner maintenance, not conversation-turn work.

## 46. Cleanup hard-cap requirement

A future implementation must define concrete caps for page identities per lifetime scope and bounded owner cleanup work.

PX1-4 does not freeze the numeric values.

Without a bounded storage/cleanup profile, runtime authorization remains blocked.

## 47. Owner-write preservation

Cleanup/write paths must mutate only data owned by the durable page identity owner.

They may not reconstruct broader host/plugin records from a partial projection and erase unrelated metadata.

```text
PX1 CLEANUP
→ OWNED IDENTITY RECORDS ONLY
```

## 48. Feature-off and persistence privacy boundary

Temporary feature disable does not mean user-requested deletion.

Therefore retaining the minimal identity locator while lifetime remains ACTIVE is legal under this design.

Any product setting that promises data deletion rather than temporary disable is a different lifecycle authority and must route through scope/purge semantics, not the ordinary feature toggle.

## 49. No background source resurrection

Durable identities never initiate source work.

```text
identity exists
→ no current job
→ do nothing
```

This remains true after feature re-enable and reload.

## 50. No context re-entry

Neither lifetime state, page identity, unavailable-shell state, nor old page content automatically re-enters future model context.

C6 remains off.

## 51. No historical semantic survival

The durable locator survives source replacement only because it is target-centric.

No old semantic page body survives.

C7 remains off.

## 52. Candidate C profile after PX1-4

```text
C1 cross-turn durable locator survival = YES
C2 stable derived identity             = YES
C3 semantic mutation                   = NO
C4 append / merge                      = NO
C5 derived-to-derived lineage          = NO
C6 context re-entry                    = NO
C7 historical semantic survival        = NO
C8 delayed semantic effect             = NO
```

PX1-4 does not broaden the Candidate C capability set.

## 53. Concurrent main advance WATCH

During the PX1-4 impact transaction, main advanced from the PX1-3 merge baseline through unrelated Agent Skill orchestrator work.

Fresh compare showed:

```text
PX1-3 baseline is an ancestor of then-current main
concurrent files are Agent Skill orchestrator workflow/runtime/test/docs
no PUBLIC_KNOWLEDGE / Candidate C / lifetime / presentation authority file changed
```

Classification:

```text
WATCH · MAIN_ADVANCED_DURING_PX1_4_TRANSACTION · NON_BLOCKING
```

The impact PR was evaluated against the newer main and passed SimCore Verify + Required before merge.

## 54. Failure taxonomy

PX1-4 preserves distinct categories:

```text
LIFETIME_ENDED
LIFETIME_UNKNOWN
FEATURE_DISABLED
CURRENT_VIEW_UNAVAILABLE
IDENTITY_UNSUPPORTED
IDENTITY_STATE_UNAVAILABLE
IDENTITY_STATE_CORRUPT
TARGET_IDENTITY_MISMATCH
SEMANTIC_AUTHORITY_INVALID
PRESENTATION_EFFECT_FAILED
PHYSICAL_CLEANUP_FAILED
```

No recovery layer may collapse these into one generic "page missing" state if doing so grants extra authority.

## 55. Design validation scenarios

Required design fixtures include:

```text
L1 active lifetime + existing page + bound current view
L2 active lifetime + existing page + current semantic HOLD
L3 active lifetime + feature OFF
L4 feature ON again, no current job
L5 feature ON + new current job + same page identity + fresh content
L6 trusted scope END while current page mounted
L7 physical cleanup failure after scope END
L8 explicit conversation deletion
L9 reload while scope ACTIVE
L10 store unavailable with current semantics valid
L11 identity corrupt with current semantics valid
L12 source/Exposure invalid with identity valid
L13 old host transcript card visible after new current binding
L14 old host transcript card visible after current view becomes unavailable
L15 attempted lifetimeScopeRef reuse after END
L16 target display label changes while targetIdentityRef remains same
L17 target identity mismatch/rekey pressure
L18 source-irrelevant long-chat turns with durable identities present
```

## 56. Runtime blockers after PX1-4

Design completion does not authorize implementation.

Open implementation gates remain at least:

```text
trusted non-recyclable lifetimeScopeRef producer
trusted scope-end/deletion lifecycle event
physical durable identity backend
PX1-2 atomic resolve-or-mint
owner-scoped purge operation
feature-off teardown hook
reload boundary integration
presentation host mount authority
bounded record/cleanup caps
observability/instrumentation
```

## 57. PX1-5 handoff

PX1-5 may now converge the complete PK-X1 design package:

```text
PX1-0 durable identity master
PX1-1 stable target identity adapter
PX1-2 immutable identity record / atomic resolve-mint
PX1-3 current-view revalidation binding
PX1-4 lifetime / cleanup / presentation
```

PX1-5 must reassess:

```text
whether C1+C2 remain sufficient
whether any hidden C3-C8 requirement leaked in
whether runtime-readiness gates are complete
whether snapshot PUBLIC_KNOWLEDGE remains a safe fallback
whether PK-X1 can be declared DESIGN CONVERGED without claiming runtime proof
```

## 58. Explicit deferred lanes

```text
DEFER · PK-D2 REVISIONED_PAGE
DEFER · PK-X2 PUBLIC_REFERENCE_SEARCH
DEFER · TARGET_ALIAS_REKEY_MIGRATION
DEFER · CROSS_CONVERSATION_PUBLIC_REFERENCE_IDENTITY
DEFER · USER_SEMANTIC_PAGE_DELETE_EDIT
DEFER · HISTORICAL_STALE_PAGE_PRESENTATION
DEFER · NON_ZERO_CONTEXT_REENTRY
```

## 59. Final PX1-4 design verdict

```text
PX1_4_LIFETIME = TRUSTED_CONVERSATION_SCOPE
PX1_4_SCOPE_REF_REUSE = FORBIDDEN
PX1_4_LOGICAL_EXPIRY = IMMEDIATE_ON_TRUSTED_END
PX1_4_PHYSICAL_RECLAMATION = OWNER_SCOPED / NON_AUTHORITATIVE_FOR_LIFETIME
PX1_4_FEATURE_OFF = EPHEMERAL_CLOSURE_WITH_DURABLE_LOCATOR_INERT
PX1_4_UNAVAILABLE_PAGE = NON_SEMANTIC_CURRENT_SHELL_ONLY
PX1_4_STALE_BODY_FALLBACK = FORBIDDEN
PX1_4_OLD_TRANSCRIPT_ARTIFACT = NOT_CURRENT_PAGE
CANDIDATE_C = C1+C2 ONLY
RUNTIME_IMPLEMENTATION = NOT_AUTHORIZED
RELEASE = UNCHANGED
```

## 60. Next checkpoint

```text
PX1-5 · PK-X1 CONVERGENCE / CANDIDATE C REASSESSMENT
```

No runtime implementation is authorized by proceeding to PX1-5.
