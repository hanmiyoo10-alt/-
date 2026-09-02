# SimCore Post-3.0M PUBLIC_KNOWLEDGE PX1-5 Convergence / Candidate C Reassessment Design - 2026-09-02

Date: 2026-09-02 KST

Status: **PX1-5 DESIGN FROZEN · PK-X1 DESIGN CONVERGED · PK-D1 DURABLE_PAGE_IDENTITY · C1+C2 ONLY · C3-C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · REAL RUNTIME VALIDATION NOT RUN · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · PX1-5 · CONVERGENCE · CANDIDATE C REASSESSMENT**

## 0. Purpose

PX1-0 through PX1-4 define the first durable PUBLIC_KNOWLEDGE page-addressability design. PX1-5 freezes the final capability profile and closure boundary.

```text
PX1-0 durable page identity shell
PX1-1 stable target identity adapter
PX1-2 immutable identity record + atomic resolve-or-mint
PX1-3 current-view revalidation binding
PX1-4 lifetime / cleanup / presentation
PX1-5 convergence
```

This is design-only. It implements no runtime persistence, ID generator, cleanup hook, DOM/CSS, prompt transport, model/network call, or release change.

## 1. Final product contract

PK-X1 provides one bounded capability:

```text
same trusted target
+ same active conversation lifetime
→ same durable PUBLIC_KNOWLEDGE page identity may be resolved later
```

while:

```text
page semantic body
→ current activation only
→ freshly generated and revalidated every use
```

Canonical rule:

```text
DURABLE PAGE ADDRESS
!=
DURABLE PAGE CONTENT
```

## 2. Final Candidate C profile

PK-X1 is exactly the PK-5 profile:

```text
PK-D1 DURABLE_PAGE_IDENTITY

C1 cross-turn derived-object survival = YES
C2 stable derived identity            = YES
C3 semantic mutation                  = NO
C4 append / merge                     = NO
C5 derived-to-derived lineage         = NO
C6 future model-context re-entry      = NO
C7 historical semantic survival       = NO
C8 delayed effect targeting           = NO
```

C1+C2 are selected by the design contract. No Candidate C runtime capability is implemented or authorized here.

## 3. Why stronger gates remain closed

### C3 / C4

First mint creates identity metadata only. Lifetime cleanup reclaims expired identity metadata only. Current-view replacement replaces an ephemeral projection, not a persisted semantic revision.

```text
FIRST MINT != PAGE EDIT
CLEANUP != ACTIVE PAGE DELETE
NEW CURRENT VIEW != DURABLE REVISION
```

No assertion/citation/page body is appended or merged into durable state.

### C5

`pageIdentity` is target-centric. BOARD, NEWS, SOCIAL_FEED, LIVE_REACTION, or another derived object is not a formal semantic parent.

### C6

Persistence/addressability does not inject page identity, page text, citations, settlement, or page history into later model context.

### C7

Old page body/citations/settlement/source support are never reused as current or inspectable PK-X1 history. Old host transcript artifacts remain host history only.

### C8

No delayed generated/fetched effect is attached to an exact page or page generation.

## 4. Converged identity model

```text
targetRef
!= targetIdentityRef
!= pageIdentity
```

`targetIdentityRef` remains upstream-owned. PK-X1 cannot infer it from title, display label, wording, fingerprint, transcript position, or old page identity.

The durable record stays minimal and immutable:

```text
DurablePublicReferencePageIdentityV1
  schemaVersion
  namespace
  pageIdentity
  lifetimeScopeRef
  targetIdentityRef
```

It stores no page body, title, assertion, settlement, citation, source authority, revision, last-known-good content, or render state.

## 5. First mint and later reuse

First mint requires:

```text
lifetime ACTIVE
+ stable target identity READY
+ current source support
+ current Exposure / settlement / PK validation
+ usable current page projection
→ current-activation first-mint eligibility
→ atomic resolve-or-mint
```

An existing page identity proves only logical continuity:

```text
FOUND_EXISTING
!= CURRENT SEMANTICS VALID
```

Every later activation must re-prove current target identity, source support, Exposure, settlement, and PK validation before PX1-3 may bind a current view.

## 6. Stale-content firewall

Forbidden:

```text
last-known-good page body
old body + stale/archived badge
old citation fallback
old settlement fallback
pageIdentity-only semantic cache resurrection
reload-time semantic remount
```

Loss of current binding removes the old current semantic subtree before any bounded unavailable shell is shown.

## 7. Lifetime convergence

First lifetime remains:

```text
CONVERSATION_SCOPED_PUBLIC_REFERENCE_IDENTITY
```

Trusted lifetime states:

```text
ACTIVE
ENDED
UNKNOWN
```

An ENDED `lifetimeScopeRef` must not be recycled for a future new conversation lifetime.

Logical expiry precedes physical cleanup:

```text
ACTIVE → ENDED
→ ordinary page-identity use stops
→ current binding/presentation clears
→ owner-scoped physical reclamation may follow
```

A cleanup failure does not reactivate an ended scope.

Temporary feature-off is not lifetime end. It clears current activity and performs no lookups/writes/generation while preserving the active-lifetime identity shell.

## 8. Presentation / dormancy convergence

Current presentation remains bounded to:

```text
CURRENT_PAGE_BOUND
CURRENT_PAGE_UNAVAILABLE
SNAPSHOT_ONLY_CURRENT
NO_CURRENT_PAGE_SURFACE
```

Unavailable presentation may use only current-safe status and current trusted labeling, never old semantic material.

On source-irrelevant turns:

```text
identity lookup = 0
identity write = 0
history/lifetime scan = 0
PK generation = 0
PK validation = 0
presentation update = 0
context re-entry bytes = 0
```

## 9. Escalation firewall

The following are outside PK-X1 and require a new explicit design:

```text
edit/remove/append assertion or citation
persist/restore revision chain
→ PK-D2 REVISIONED_PAGE
→ C3 + C4
```

```text
older revision remains inspectable across later support replacement
→ PK-D3 HISTORICAL_PAGE
→ C7 when justified
```

```text
prior durable page/revision enters later model context
→ PK-D4 CONTEXTUAL_DURABLE_PAGE
→ C6
```

```text
formal derived-source parentage
→ C5
```

```text
late generated/fetched attachment to exact page/revision
→ C8
```

PK-X2 search, global/cross-conversation page identity, alias/rekey migration, interactive editing, and async media are separate future lanes and are not automatic next steps.

## 10. Future runtime evidence gates

A future implementation cannot claim PK-X1 readiness without evidence for at least:

```text
R1 then-current production baseline
R2 trusted non-recyclable lifetime identity
R3 upstream stable target identity
R4 authoritative exact identity store
R5 atomic resolve-or-mint uniqueness under race
R6 current-activation first-mint gate
R7 fresh current-view validation + stale teardown
R8 feature-off / reload / scope-end lifecycle
R9 cleanup failure isolation
R10 ordinary-turn dormancy / bounded cost
```

Representative future scenarios include first mint, same-target reuse, label rename with same target identity, same-label different target, store failure, concurrent mint, semantic invalidation, feature off/on, reload, scope end, cleanup failure, new conversation lifetime, no prompt re-entry, and long-chat source-irrelevant baseline.

These tests are not run by this design closure.

## 11. Frozen invariants

```text
I1  PK-X1 = PK-D1 / C1+C2 only
I2  durable identity never becomes semantic truth authority
I3  target identity remains upstream-owned
I4  durable record contains locator metadata only
I5  first mint requires usable current semantics
I6  existing identity never proves current semantics
I7  current view is freshly revalidated every activation
I8  no stale semantic fallback
I9  current-view replacement is not a persisted revision
I10 lifetime cleanup is lifecycle reclamation, not semantic mutation
I11 lifetime identity is trusted and non-recyclable
I12 feature-off does not end an active lifetime
I13 persistence does not imply context re-entry
I14 host transcript artifacts are not PK-X1 revisions
I15 stronger behavior requires explicit capability escalation
I16 real runtime readiness requires future evidence
```

## 12. Final verdict

```text
PK_X1_DESIGN_PROGRAM       = CONVERGED
PK_X1_PROFILE              = PK-D1 DURABLE_PAGE_IDENTITY
C1                         = SELECTED IN DESIGN
C2                         = SELECTED IN DESIGN
C3                         = CLOSED
C4                         = CLOSED
C5                         = CLOSED
C6                         = CLOSED
C7                         = CLOSED
C8                         = CLOSED
DURABLE_SEMANTIC_PAGE_BODY = NONE
REVISION_HISTORY           = NONE
AUTOMATIC_CONTEXT_REENTRY  = NONE
NEXT_PX1_CHECKPOINT        = NONE
RUNTIME_IMPLEMENTATION     = NOT AUTHORIZED
REAL_RUNTIME_VALIDATION    = NOT RUN
PRODUCTION                 = UNCHANGED
release-simcore            = UNCHANGED
```

Canonical closing rule:

```text
PK-X1 MAKES THE PAGE ADDRESS DURABLE.
IT DOES NOT MAKE YESTERDAY'S ARTICLE TRUE TODAY.
```
