# SimCore Post-3.0M PUBLIC_KNOWLEDGE PX1-3 Current View Revalidation Binding Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PX1-3 IMPACT SCOPE FROZEN · EPHEMERAL CURRENT-VIEW BINDING GATE SELECTED · NO STALE SEMANTIC FALLBACK · DESIGN-ONLY · NO RUNTIME / RELEASE CHANGE**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · PX1-3 · CURRENT VIEW · REVALIDATION · IMPACT SCOPE**

## 0. Purpose

PX1-0 established a durable page-identity shell.
PX1-1 established upstream-owned stable target identity admission.
PX1-2 established the minimal immutable page-identity record and atomic resolve-or-mint contract.

PX1-3 answers the next bounded question:

```text
When a durable pageIdentity exists,
how may that identity be attached to the current PUBLIC_KNOWLEDGE view
without allowing old page semantics to become current merely because the ID survived?
```

This transaction is design-only. It changes no runtime, persistence backend, prompt/output bytes, DOM/CSS, model call, network call, S7/v0.70.3, or `release-simcore` state.

## 1. Fresh-read authority seam

The relevant existing owners are:

```text
PX1-1 Stable Target Identity Adapter
→ current exact targetIdentityRef admission

PX1-2 Page Identity Owner
→ durable locator state only

PK-2 PUBLIC_KNOWLEDGE Validator
→ current validated public-reference semantics

3M-6 Support-at-Use Gate
→ current source-authority support

PK-3 / PK-4 presentation + citation
→ current render-only view effects
```

Canonical separation:

```text
DURABLE PAGE IDENTITY
!=
CURRENT TARGET PROOF
!=
CURRENT SOURCE SUPPORT
!=
CURRENT VALIDATED DOCUMENT
!=
CURRENT RENDER INSTANCE
```

## 2. Primary impact finding

The dangerous shortcut is:

```text
pageIdentity found
→ therefore old page was valid
→ therefore reuse old body/title/citations
```

That shortcut is forbidden.

The narrow selected seam is:

```text
EPHEMERAL_CURRENT_VIEW_BINDING_GATE
```

A durable ID may be reused only as the identity label attached to a **newly current, independently validated view**.

## 3. Existing identity resolution does not imply semantic availability

Legal state:

```text
pageIdentity = FOUND_EXISTING
current PK document = INVALID / HOLD / VALID_EMPTY
```

In that state:

```text
identity continues to exist
current durable page view is not bound
old semantic page does not reappear
```

Canonical rule:

```text
IDENTITY SURVIVES
DOES NOT IMPLY
CONTENT SURVIVES
```

## 4. Candidate input classes

PX1-3 needs only current bounded inputs:

```text
A. current trusted PublicKnowledgeDocumentTargetContext
B. current PX1-1 StableTargetIdentityAdmission = READY_EXACT
C. PX1-2 exact identity resolve result
D. current trusted SourceAuthorityContext
E. current PK-2 validated document + bounded validator status
F. current 3M-6 support-at-use result
```

No old semantic page is an input.

## 5. Selected current-view ordering

Impact-scope ordering:

```text
current target authority
        ↓
PX1-1 exact stable target admission
        ↓
PX1-2 exact identity resolve / first mint
        ↓
current PUBLIC_KNOWLEDGE production + PK-2 validation
        ↓
3M-6 support-at-use currentness check
        ↓
PX1-3 current-view binding gate
        ↓ only if all required joins are current
presentation / citation for this current view
```

The exact future runtime scheduling may collapse adjacent pure checks, but no authority step may be omitted.

## 6. Bindable PK-2 states

First PX1-3 scope treats ordinary semantic view binding as available only when PK-2 produced current accepted semantic content.

Conceptually:

```text
VALID
VALID_WITH_QUARANTINE
→ candidate for current-view binding

VALID_EMPTY
QUARANTINED
INVALID
UNSUPPORTED_SCOPE
→ no ordinary durable current-view binding
```

`VALID_EMPTY` does not delete the durable identity; it means there is no current accepted semantic article body to attach.

Exact runtime enum mapping remains future implementation authority.

## 7. Target exactness requirement

A binding may exist only when all target identities align:

```text
current target context.targetRef
== PK-2 validated document.targetRef

PX1-1 admitted targetIdentityRef
== PX1-2 identity record.targetIdentityRef

current lifetimeScopeRef
== PX1-2 identity record.lifetimeScopeRef

namespace
== PUBLIC_KNOWLEDGE_DOCUMENT
```

No label/name/title comparison participates.

## 8. Source-currentness requirement

The current validated document's `sourceAuthorityRef` must remain supported by current trusted source authority under the frozen 3M-6 predicate.

Required state:

```text
SUPPORTED_CURRENT
```

Any:

```text
UNSUPPORTED_SCOPE
INVALID_AUTHORITY_UNAVAILABLE
INVALID_AUTHORITY_MISMATCH
```

means no current durable page-view binding.

## 9. No stale semantic fallback

If current validation/support fails after an identity has existed previously:

Forbidden fallback inputs include:

```text
last-known-good page body
previous validated document
previous citation bundle
previous sourceAuthorityRef
previous settlement context
previous displayLabel
previous rendered DOM
host transcript copy of an old page
```

Canonical rule:

```text
NO CURRENT BINDING
→ NO OLD SEMANTIC FALLBACK
```

## 10. Snapshot fallback remains separate

PX1-1/PX1-0 preserved baseline snapshot PUBLIC_KNOWLEDGE for targets where durability is unavailable.

PX1-3 preserves the distinction:

```text
DURABLE PAGE VIEW BINDING FAILED
!=
CURRENT PK-2 SEMANTICS INVALID
```

If current PK-2 semantics are independently valid but durable identity state is unavailable, a future orchestrator may choose the existing snapshot-only PUBLIC_KNOWLEDGE path **only when explicitly authorized as snapshot fallback**.

It must not present that result as the durable page.

## 11. Page identity must not become a semantic cache key

A UI/cache optimization keyed only by `pageIdentity` would be unsafe:

```text
pageIdentity P
→ component/cache already has old body
→ new activation reuses body before current binding
```

Forbidden.

Canonical rule:

```text
PAGE IDENTITY
MAY KEY LOGICAL PAGE CONTINUITY
BUT MUST NOT ALONE KEY CURRENT SEMANTIC CONTENT
```

A new current binding must replace/clear old semantic presentation state.

## 12. Citation boundary

PK-4 citations are current-render evidence projections.

Therefore:

```text
same pageIdentity
!=
same citation bundle
```

Every current page view consumes current validated citation/provenance inputs.
Old citation markers cannot be resurrected from durable identity.

## 13. Display label boundary

Visible title data remains current trusted target-context presentation data.

```text
same pageIdentity
+ changed trusted displayLabel
→ current view may show the new label
```

The durable identity record does not store or restore the old label.

## 14. First-mint relationship

When PX1-2 returns `MINTED_NEW`, the same activation already had a valid first-mint eligibility basis.

PX1-3 may attach that new identity to the same current validated page only if:

```text
same current activation
same targetIdentityRef
same lifetimeScopeRef
same validated document
support-at-use still current
```

A mint result from an older activation cannot bootstrap a later current view without ordinary revalidation.

## 15. Existing-identity relationship

When PX1-2 returns `FOUND_EXISTING`:

```text
pageIdentity continuity proven
```

only.

The current view still requires all current semantic/support checks.

## 16. No current-view persistence in PX1-3

Selected scope remains:

```text
current view binding = EPHEMERAL
```

PX1-3 does not persist:

```text
current validated document
binding receipt
last-known-good document
current source ref
current settlement ref
render state
view revision
```

This prevents PX1-3 from accidentally becoming PK-D2 revision history.

## 17. No semantic revision activation

A page may produce different validated content on later activations while retaining the same `pageIdentity`.

PX1-3 does not call those revisions.

```text
same pageIdentity
+ new current validated projection
→ new ephemeral current view
```

not:

```text
revision 1 → revision 2
```

C3/C4 remain closed.

## 18. Failure classes remain separate

PX1-3 must preserve:

```text
A. IDENTITY FAILURE
   identity store / exact key / corruption problem

B. TARGET IDENTITY FAILURE
   PX1-1 unavailable / ambiguous / conflict

C. SOURCE SUPPORT FAILURE
   3M-6 current support lost

D. PK POLICY / VALIDATION FAILURE
   current assertions not reference-eligible

E. PRESENTATION FAILURE
   semantic current view valid, UI effect failed
```

No class may be used as a substitute for another.

## 19. Candidate C impact

PX1-3 continues the PK-X1 profile:

```text
C1 cross-turn page identity survival = YES
C2 stable page/target identity        = YES
C3 semantic mutation                  = NO
C4 append/merge                       = NO
C5 derived-to-derived propagation     = NO
C6 context re-entry                   = NO
C7 historical survivor semantics      = NO
C8 delayed semantic effect targeting  = NO
```

The ephemeral current-view gate does not open additional Candidate C capabilities.

## 20. Dormancy

No current PUBLIC_KNOWLEDGE durable-page job means:

```text
no page identity lookup
no PK-X1 revalidation binding
no old page scan
no old semantic read
```

3M-9 source-irrelevant dormancy remains intact.

## 21. Impact blocker set for future implementation

Before runtime implementation, the following require concrete primitives:

```text
current activation identity / request boundary
trusted PX1-1 adapter transport
PX1-2 authoritative identity store
PK-2 structured producer/transport
3M-6 support-at-use runtime gate
actual presentation host mount/update contract
bounded current-view cleanup/replacement behavior
```

This design does not authorize any of them.

## 22. Selected design seam

PX1-3 detailed design should freeze:

```text
EPHEMERAL_CURRENT_PUBLIC_REFERENCE_PAGE_VIEW_BINDING
+
EXACT_TARGET_IDENTITY_JOIN
+
CURRENT_SOURCE_SUPPORT_AT_USE
+
NO_STALE_SEMANTIC_FALLBACK
+
SNAPSHOT_FALLBACK_AS_SEPARATE_NON-DURABLE_PATH
```

## 23. Out of scope

Still deferred:

```text
page revision history
last-known-good semantic cache
old revision restore
cross-turn semantic body persistence
search
navigation archive
context re-entry
item-level edit
async media enrichment
identity migration / rekey
```

## 24. Expected next checkpoint

After this impact scope:

```text
PX1-3 Current View Revalidation Binding Design
```

should freeze the exact current-binding status vocabulary, fail-closed join order, presentation handoff, and stale-view cleanup contract.

Runtime implementation remains unauthorized.