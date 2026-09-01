# SimCore 3M-6 Current Projection Support / Invalidation Design — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-6 DESIGN FROZEN · CURRENT-PROJECTION SUPPORT GATE SELECTED · CANDIDATE C CONDITIONALLY READY / NOT ACTIVATED · NO PROVENANCE STORE · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-6 · PROVENANCE REASSESSMENT · WHOLE-PROJECTION INVALIDATION · CANDIDATE C ACTIVATION GATE**

## 0. Purpose

3M-6 freezes the invalidation contract for the concrete ephemeral Source Intelligence objects designed through 3M-5.

It answers:

```text
How is a current derived source projection proven still supported?
What happens when source authority changes?
Which failures are semantic invalidation versus policy quarantine versus presentation failure?
When must Candidate C be reopened?
```

This checkpoint is design-only.

It does not implement a support gate, add a provenance store, alter existing Lineage/Evidence/Handoff behavior, persist source objects, add prompt/output transport, change DOM/CSS, modify S7/v0.70.3, publish a release, or mutate `release-simcore`.

## 1. Authority chain

This design consumes:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_CONTRACTS_V2.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_PROVENANCE_INVALIDATION_REASSESSMENT_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_LIGHTBOARD_MINIBOARD_DESIGN_CANDIDATE_SHORTLIST_2026-09-01.md
docs/SIMCORE_3M_DESIGN_ONLY_LANGUAGE_CLARIFICATION_2026-09-01.md
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. 3M-6 primary decision

The selected design is:

```text
CURRENT_PROJECTION_SUPPORT_INVALIDATION_GATE
```

Candidate C is **not** promoted into a dedicated persisted lineage subsystem for the current objects.

Frozen current state:

```text
CANDIDATE_C = CONDITIONALLY_READY
CANDIDATE_C_ACTIVE = false
DERIVED_PROVENANCE_STORE = NONE
SOURCE_LINEAGE_LEDGER = NONE
```

Reason:

```text
current source objects are ephemeral snapshots
+ sourceAuthorityRef already points to existing authority
+ exact trusted join is available
+ no descendant must survive authority replacement
```

## 3. Current objects covered by 3M-6

The support gate contract covers conceptually:

```text
ValidatedSourceSemanticSidecarV1        # LIVE_REACTION
ValidatedBoardSemanticSidecarV1         # BOARD
family presentation read models derived from those validated sidecars
```

It does not create a generic contract for arbitrary future persistent source objects.

## 4. Support authority remains external

A derived object does not own the authority that supports it.

Current first-slice authority continues to come from existing owners:

```text
Lineage
Handoff
Evidence
```

and is normalized into trusted current `SourceAuthorityContextV1` facts for the validator/support boundary.

The derived object carries only its already-designed bounded ref:

```text
HandoffEvidenceAuthorityRefV1
```

Canonical rule:

```text
DERIVED OBJECT
REFERENCES AUTHORITY
BUT DOES NOT BECOME AUTHORITY
```

## 5. No second history/source resolver

3M-6 must not independently scan history to rediscover source identity.

Required flow:

```text
existing owners
→ trusted current authority context
→ support gate
```

Forbidden flow:

```text
support gate
→ rescan chat
→ guess current source again
```

This preserves existing ownership and prevents a second source resolver from drifting away from Handoff/Evidence/Lineage.

## 6. Support-at-use predicate

For the current direct-B-root slice, a derived projection is supported only when all authority fields required by its frozen ref exactly match the trusted current authority context.

Conceptual predicate:

```text
isCurrentProjectionSupported(derivedRef, trustedCurrentAuthority)
```

returns supported only if:

```text
kind matches expected HANDOFF_EVIDENCE
family/scope is supported
handoff eligibility is current
rootMode matches
parentMode matches
rootIndex matches
parentIndex matches
expected root/parent relation matches
depth matches
rootFingerprint matches
sourceAssistantIndex matches
sourceAssistantFingerprint matches
currentUserIndex matches
currentUserFingerprint matches
```

No fuzzy field exists.

## 7. Missing / UNKNOWN fails closed

If required current authority cannot be established:

```text
UNKNOWN
MISSING
MALFORMED
STALE
```

then the old projection is not considered currently supported.

Canonical rule:

```text
CANNOT PROVE CURRENT SUPPORT
→ DO NOT REUSE CURRENT DERIVED PROJECTION
```

This is intentionally stricter than best-effort salvage.

## 8. Support result vocabulary

3M-6 freezes a conceptual result vocabulary, not a persistent schema:

```text
SUPPORTED_CURRENT
UNSUPPORTED_SCOPE
INVALID_AUTHORITY_UNAVAILABLE
INVALID_AUTHORITY_MISMATCH
```

Meaning:

### `SUPPORTED_CURRENT`

Exact current authority join succeeds.

### `UNSUPPORTED_SCOPE`

The family/origin/projection shape is outside the currently designed support gate.

### `INVALID_AUTHORITY_UNAVAILABLE`

The current authority required to prove support is missing/unknown/unavailable.

### `INVALID_AUTHORITY_MISMATCH`

Current authority exists but differs from the derived object's supporting ref.

These states are validator/support diagnostics. They are not model-authored fields.

## 9. Whole-projection invalidation rule

For current ephemeral objects:

```text
support result != SUPPORTED_CURRENT
→ old derived projection is not ordinary consumer input
```

No partial semantic salvage is attempted.

```text
SOURCE AUTHORITY CHANGED
→ WHOLE PROJECTION INVALID
```

This includes all accepted assertions/entries in the old snapshot because their support was validated under the same source-authority projection boundary.

## 10. Why whole-projection invalidation is correct for V1

Current designs deliberately have no:

```text
cross-turn append
persistent source-object identity
item-level semantic mutation
partial survivor contract
source-to-source descendant graph
future context re-entry
```

Therefore item-level source-diff machinery would create complexity without product benefit.

If a later object needs partial survival, Candidate C must activate before that behavior is designed.

## 11. Policy quarantine is not source invalidation

3M-2/3/5 policy may produce:

```text
DENY
HOLD
QUARANTINED_DENY
QUARANTINED_HOLD
QUARANTINED_PARENT_NOT_ELIGIBLE
```

These mean:

```text
current source projection exists
but this semantic claim/entry is not eligible for ordinary consumption
```

They do **not** mean the source authority itself is stale.

Canonical distinction:

```text
POLICY QUARANTINE
!=
SOURCE SUPPORT INVALIDATION
```

## 12. BOARD parent quarantine is local structural dependency

BOARD's rule:

```text
child REPLY requires visible parent POST
```

remains validator-local.

A hidden parent may quarantine a child even while the Board's root source authority is fully current.

Therefore:

```text
PARENT_NOT_ELIGIBLE
!=
SOURCE_AUTHORITY_MISMATCH
```

Do not escalate one hidden Board post into whole-source invalidation.

## 13. Presentation failure is a third class

3M-4 presentation statuses such as:

```text
ADAPTER_FAILED
MOUNT_BLOCKED
MOUNT_FAILED
```

are downstream effect failures.

They do not imply semantic source invalidation.

Canonical three-way separation:

```text
A. SOURCE INVALIDATION
   support authority no longer current

B. POLICY QUARANTINE
   source current, claim not eligible

C. PRESENTATION FAILURE
   semantic data valid, UI effect failed
```

No layer may promote one class into another merely for recovery convenience.

## 14. Consumer ordering

A future active Source Intelligence consumer must conceptually respect:

```text
trusted current authority
        ↓
source support gate
        ↓ only SUPPORTED_CURRENT
validated semantic object
        ↓
consumer-specific rules
        ↓
presentation / other bounded consumer
```

Presentation must not receive a stale semantic object and then attempt to decide freshness itself.

## 15. Reroll and edit rules

### 15.1 Current C reroll

Recompute from current request authority.

Old derived object has no reuse right.

### 15.2 B source reroll/edit

If the source assistant fingerprint or other required authority ref changes:

```text
old object → INVALID_AUTHORITY_MISMATCH
```

A newly validated object may replace it in a separately authorized future runtime path.

### 15.3 Root/source switch

If Lineage/Handoff resolves a different root or source relationship:

```text
old object → unsupported/mismatch
```

No automatic identity migration.

### 15.4 Current user/request replacement

A different current user index/fingerprint invalidates reuse because current user disclosure/request scope can participate in exposure authority.

## 16. Indices are not durable identity

The current ref contains indices because they are bounded locators inside the current authority contract.

They do not become durable semantic IDs.

```text
same index
!=
same semantic source after edit/reroll
```

Fingerprint/authority equality remains required for the current slice.

Future persistent identity requires Candidate C reopening rather than reinterpreting an index as a database key.

## 17. Fingerprints are support evidence, not world IDs

Similarly:

```text
fingerprint
= bounded equality/support evidence
```

not:

```text
canonical world-event identity
persistent social object ID
```

Do not build cross-turn object graphs by treating content fingerprints as universal identities.

## 18. Runtime generation boundary remains separate

3M-4 already requires stale runtime-generation UI effects to be rejected/cleaned up.

3M-6 does not add runtime generation to semantic source provenance merely because both can cause stale output.

Canonical distinction:

```text
SEMANTIC SOURCE SUPPORT
!=
RUNTIME EFFECT GENERATION OWNERSHIP
```

A future Presentation Host must satisfy both before a source surface remains mounted.

## 19. Presentation invalidation propagation

If source support is lost:

```text
semantic object invalid
→ presentation read model invalid as current view
→ mount/update path must not retain it as current source surface
```

Allowed future effect:

```text
unmount stale source surface
or reject stale update
```

Forbidden:

```text
keep stale UI because rendering succeeded
```

Presentation success cannot rescue semantic staleness.

## 20. Diagnostic boundary

A future support check may expose bounded observability containing only fields such as:

```text
family
supportStatus
reasonCode
```

It must not require retaining:

```text
old assertion text
old Board content
raw source body
hidden quarantine content
```

No persistent invalidation tombstone is required for current ephemeral objects.

## 21. Candidate C activation matrix

Candidate C becomes a mandatory design prerequisite when any gate below is crossed.

| Gate | New requirement | Why current whole-object model fails |
| --- | --- | --- |
| C1 | cross-turn semantic object survival | support must be proven later than creation request |
| C2 | stable source-local identity across turns | projection-local ordinals are insufficient |
| C3 | item-level reroll/edit/delete/media replacement | one child needs identity/revision independent of whole snapshot |
| C4 | append/merge/partial survival | old and new derived revisions must coexist/reconcile |
| C5 | derived-from-derived propagation | downstream object needs explicit derived parent support |
| C6 | controlled future-context re-entry | freshness must be proven at later prompt construction |
| C7 | descendants survive source replacement | whole-projection invalidation is intentionally too coarse |
| C8 | delayed/asynchronous side effect targets semantic object | late result needs stable target + stale-operation rejection |

## 22. Candidate C activation semantics

The first observed gate does not authorize every Candidate C capability.

Rule:

```text
OPENED GATE
→ DESIGN MINIMUM METADATA FOR THAT CONCRETE CONSUMER ONLY
```

Examples:

```text
C6 only
→ design freshness/support proof needed for context re-entry
→ do not automatically create social identity persistence

C3 only
→ design item locator/revision for the mutable object
→ do not automatically create a multi-source graph
```

## 23. Candidate C minimum questions after activation

A future Candidate C design must answer:

```text
what concrete object survives?
who owns its derived identity?
what existing authority supports it?
what bounded locator identifies the child?
what revision/generation semantics are required?
which operations invalidate it?
what descendants may survive parent replacement?
what proof is required before reuse or re-entry?
```

It must still prefer existing Evidence/Lineage/Handoff refs over duplication.

## 24. No generic schema frozen today

3M-6 explicitly does **not** freeze:

```text
DerivedProvenanceV1
PersistentSourceObjectV1
DerivedLineageNodeV1
```

No such generic object has a concrete minimum field set yet.

Freezing it now would reverse the consumer-driven Candidate C rule.

## 25. 3M-7 hard gate

Current inherited rule remains:

```text
ordinary future source-context re-entry = NONE
```

3M-7 may explore source history/context policy, but:

```text
if proposed re-entry remains ZERO
→ Candidate C may remain inactive

if any derived source field may re-enter a later prompt
→ C6 ACTIVATED
→ Candidate C provenance design becomes prerequisite
```

Thus 3M-7 cannot authorize non-zero re-entry by relying only on current snapshot ordinals.

## 26. Future source families do not automatically activate Candidate C

A future family such as NEWS or PUBLIC_KNOWLEDGE may remain snapshot-only.

If it is:

```text
current-projection only
non-persistent
non-reentrant
non-mutable
```

then current support-at-use logic may still be sufficient.

Candidate C activation follows **lifetime/dependency requirements**, not family name.

## 27. SOCIAL_FEED relationship

SOCIAL_FEED is likely to pressure C2/C3/C4 because profile/post identity, repost relationships, or media enrichment may need stable derived targets.

That is a forecast, not authorization.

SOCIAL_FEED design must declare which Candidate C gate it actually crosses instead of assuming persistence by aesthetics.

## 28. Media materialization relationship

The SNS Forme reference showed the value of separating semantic object from expensive media materialization.

If future SimCore media generation is synchronous and purely ephemeral, Candidate C may still remain unnecessary.

If a media result can arrive later and must attach to an existing semantic object:

```text
C8 activates
```

A future design should then consider bounded operation generation/token semantics for stale effect rejection, but no such mechanism is frozen by 3M-6.

## 29. Context Projection non-shortcut

Provenance cannot prove arbitrary old conversation context is removable.

```text
CURRENT DERIVED OBJECT SUPPORTED
!=
ROOT PREFIX SEMANTICALLY INDEPENDENT
```

The parked Context Projection blocker remains intact.

## 30. Failure policy

Current-source support validation is fail-closed.

```text
exact current support proven
→ eligible to continue

not proven
→ do not consume old object
```

Do not fall back to:

```text
old object because it looks similar
old object because renderer already mounted it
old object because user likely will not notice
```

## 31. No semantic repair

3M-6 does not authorize repair of a stale projection.

It does not:

```text
rewrite source refs
replace fingerprints in place
salvage matching assertions
rename participant ordinals
reparent Board replies
merge old/new snapshots
```

A supported new projection must be newly validated under the current authority path.

## 32. Feature-gate closure implication

If future Source Intelligence presentation/structured feature is disabled or current source support disappears:

```text
no stale renderer dispatch
no stale mount/update
no stale view-state ownership
```

This reinforces 3M-4 vertical feature-gate closure without adding a new persistent invalidation subsystem.

## 33. Design invariants

```text
I1  derived object never owns canonical source authority
I2  no second source/history resolver
I3  exact authority support, never fuzzy similarity
I4  unknown support fails closed
I5  current ephemeral source mismatch invalidates whole projection
I6  policy quarantine != source invalidation
I7  source invalidation != presentation failure
I8  Presentation Renderer cannot decide semantic freshness
I9  indices/fingerprints are bounded support evidence, not universal IDs
I10 Candidate C activation is consumer/lifetime driven
I11 no non-zero future-context re-entry without C6 reassessment
I12 no generic provenance schema before an activation gate proves its fields
```

## 34. Design-only validation matrix

The eventual contract should be statically/evidence-tested against scenarios such as:

```text
same exact authority ref                              → SUPPORTED_CURRENT
source fingerprint changed                           → INVALID_AUTHORITY_MISMATCH
root changed                                         → INVALID_AUTHORITY_MISMATCH
current user changed                                 → INVALID_AUTHORITY_MISMATCH
required authority unavailable                       → INVALID_AUTHORITY_UNAVAILABLE
unsupported source family/origin                     → UNSUPPORTED_SCOPE
Board parent quarantined but source current          → source supported; child locally quarantined
renderer fails while source current                  → source supported; presentation failure only
runtime generation stale while semantic source same  → semantic support separate; effect rejected by runtime-generation rule
```

No runtime test/tool implementation is authorized by this document.

## 35. Explicit non-goals

```text
NO provenance database
NO persistent source identity registry
NO new Lineage owner
NO new Evidence owner
NO invalidation tombstones
NO source semantic diff
NO fuzzy source salvage
NO persistent Board
NO item-level reroll
NO future source-context re-entry
NO runtime implementation
NO release transaction
```

## 36. Frozen verdict

```text
3M_6 = DESIGN_FROZEN
FIRST_INVALIDATION_MODEL = CURRENT_PROJECTION_SUPPORT_INVALIDATION_GATE
CURRENT_SUPPORT_RULE = EXACT_EXISTING_AUTHORITY_JOIN
CURRENT_MISMATCH_RULE = INVALIDATE_WHOLE_PROJECTION
CANDIDATE_C = CONDITIONALLY_READY / NOT ACTIVATED
GENERIC_PROVENANCE_SCHEMA = NOT AUTHORIZED
PERSISTENCE = NONE
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
```

## 37. Next checkpoint handoff

The next master checkpoint is 3M-7 Context Re-entry / Source History.

3M-7 begins under this hard inherited boundary:

```text
ordinary derived source re-entry = NONE
```

If 3M-7 can remain useful with zero re-entry, Candidate C remains closed.

If it proposes any bounded derived-source re-entry, it must classify:

```text
C6 · CONTROLLED_FUTURE_CONTEXT_REENTRY = ACTIVATED
```

and stop before authorization until minimum concrete provenance/freshness ownership is separately designed.
