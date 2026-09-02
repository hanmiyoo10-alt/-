# SimCore Post-3.0M MF-2 Shared Current Authority Bundle + Family-Lane Isolation Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **IMPACT SCOPE FROZEN · DESIGN-ONLY · SHARED CURRENT AUTHORITY / MINIMAL FAMILY VIEWS · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-2 · IMPACT SCOPE**

## 0. Purpose

MF-0 selected same-current-authority sibling fanout.
MF-1 froze the admission boundary that turns requested family intent into an immutable admitted current plan.

MF-2 asks the next control-plane question:

```text
After a multi-family plan is legally admitted,
what current trusted authority may sibling family lanes share,
what must remain lane-private,
and how do we prevent one derived family from becoming
truth / policy / maturity evidence for another?
```

This checkpoint is design-only.

It does not implement runtime authority collection, source-job selection, model generation, sidecar transport, validation code, renderer mounting, DOM/CSS, persistence, context re-entry, media/network work, long-chat execution, release publication, or `release-simcore` mutation.

## 1. Authority chain reviewed

MF-2 reads the frozen contracts from:

```text
MF-0  Multi-Family Orchestration Master Design
MF-1  Fanout Plan + Family Entry Registry
3M-3  Structured Sidecar + Validation
3M-5  BOARD Source Family
3M-6  Current Projection Support Invalidation
3M-8  NEWS Publication Maturity
```

The relevant existing source-authority pattern is already narrow:

```text
HandoffEvidenceAuthorityRefV1
↕ exact join
SourceAuthorityContextV1
```

with current direct-B-root normalized facts owned by existing Handoff / Evidence / Lineage paths.

NEWS additionally consumes trusted time / continuity / source-reachability authority to derive its own maturity policy context.

## 2. Impact finding A — the shared object must contain trusted current authority, not derived family semantics

All initial fanout families already share the same first source relationship shape:

```text
source root = direct B root
sourceAuthorityRef.kind = HANDOFF_EVIDENCE
rootMode = B
parentMode = B
parentIndex = rootIndex
depth = 1
```

Therefore sibling fanout may safely reuse one immutable normalized current source-authority package.

However the package must not contain:

```text
LIVE_REACTION assertions
BOARD posts / replies / participants
NEWS headlines / body assertions / report kinds
validated family payloads
family validation receipts
DENY / HOLD quarantined content
presentation payloads
renderer state
```

Canonical impact rule:

```text
SHARED AUTHORITY
= TRUSTED CURRENT OWNER FACTS

SHARED AUTHORITY
!=
DERIVED FAMILY OUTPUT
```

## 3. Impact finding B — assertion-policy contexts are claim-specific and must remain lane-private

3M-3 freezes:

```text
SourceAssertionPolicyContextV1[]
```

as one trusted policy context per assertion ordinal.

These contexts are not generic source-wide truth receipts.
They correspond to a particular proposed claim in one semantic draft.

Therefore MF-2 must not allow:

```text
LIVE_REACTION assertion #0 ALLOW
→ BOARD entry #0 ALLOW
```

or:

```text
BOARD CONFIRMED_FACT public basis
→ NEWS headline public basis
```

merely because ordinals or subject matter look similar.

Canonical impact rule:

```text
SOURCE-LEVEL AUTHORITY MAY BE SHARED
CLAIM-LEVEL POLICY CONTEXT MUST BE REBUILT / VERIFIED PER LANE CLAIM
```

## 4. Impact finding C — NEWS timing/reachability authority is reusable input, but NEWS maturity disposition is lane-private

NEWS maturity uses trusted existing owner inputs such as:

```text
Frame
Time
Continuity
source reachability
```

Those trusted current facts may be reusable across sibling lanes as bounded read-only authority inputs when they already exist.

But the derived object:

```text
NewsPublicationMaturityPolicyContextV1
```

and the final maturity result:

```text
ALLOW / HOLD + reason
```

belong to the NEWS lane.

No sibling may treat NEWS maturity as evidence about its own eligibility or truth.

## 5. Impact finding D — one giant authority object exposed wholesale to every lane would create unnecessary coupling

The master design named a conceptual:

```text
SharedCurrentSourceAuthorityBundleV1
```

If every lane receives the entire bundle directly, future additions may accidentally expose authority that a family does not need.

Example:

```text
NEWS needs trusted time/reachability facts
LIVE_REACTION does not need NEWS maturity inputs
```

A safer seam is:

```text
immutable shared bundle
        ↓
family-specific minimal authority view
        ↓
family validator / policy path
```

This keeps the shared root singular while preserving least-authority lane inputs.

Selected impact seam:

```text
IMMUTABLE_SHARED_CURRENT_AUTHORITY_BUNDLE
+
MINIMAL_FAMILY_AUTHORITY_VIEWS
+
NO_SIBLING_DERIVED_READS
```

## 6. Impact finding E — lane isolation is semantic/authority isolation, not necessarily one physical model call per family

MF-0 deliberately deferred physical model-call topology.

Future implementation may use:

```text
one model call producing several drafts
or
one model call per family
```

MF-2 must therefore define isolation at the semantic contract level rather than requiring process isolation.

Canonical rule:

```text
LOGICAL FAMILY-LANE ISOLATION
!=
MANDATORY SEPARATE MODEL PROCESSES
```

Even if drafts are co-generated physically, they must validate independently against the same trusted current root and may not cite sibling derived output as authority.

## 7. Impact finding F — bundle construction failure and lane-local authority gaps have different blast radius

Plan-wide authority failures include:

```text
missing / invalid current source root
sourceAuthorityRef mismatch
unsupported multi-root composition
bundle bound to a different admitted plan/root
```

These invalidate the whole fanout before family work can be trusted.

By contrast, family-specific required authority may be unavailable without invalidating siblings.

Example:

```text
shared direct-B source root valid
LIVE_REACTION authority inputs sufficient
BOARD authority inputs sufficient
NEWS trusted maturity inputs unavailable
```

The safe result is lane-local NEWS HOLD / unsupported behavior under its family contract, not forced failure of LIVE_REACTION and BOARD.

Canonical rule:

```text
SHARED ROOT FAILURE
→ PLAN-WIDE

FAMILY-SPECIFIC AUTHORITY GAP
→ FAMILY-LOCAL
```

## 8. Impact finding G — raw source bodies must not be copied into a new authority bundle by default

Existing source references intentionally carry bounded indices/fingerprints rather than raw root/source/current-user bodies.

MF-2 should preserve that discipline.

The shared authority bundle is not a new prompt payload or source-text cache.

Canonical rule:

```text
AUTHORITY BUNDLE
!=
RAW SOURCE TRANSCRIPT DUPLICATE
```

If future producer transport needs bounded source excerpts, that must be separately designed and must not be smuggled into MF-2 as authority metadata.

## 9. Impact finding H — sibling outputs must be write-only to their own result slot during semantic execution

A family lane may consume:

```text
its admitted family identity
its minimal trusted authority view
its own semantic draft
its own family-specific policy contexts
```

It must not consume:

```text
sibling draft
sibling validated payload
sibling receipt
sibling quarantine counts/content
sibling presentation state
sibling textual consensus
```

The orchestration layer may aggregate bounded outcomes only after lane evaluation for presentation/diagnostics.

Those aggregated outcomes must not be fed back as semantic authority into sibling validation.

## 10. Support-at-use boundary

MF-2 inherits 3M-6 and MF-0:

```text
all admitted sibling projections
share one current sourceAuthorityRef
```

Before ordinary use/presentation:

```text
shared authority ref
↕ exact support-at-use comparison
current trusted authority
```

Mismatch means:

```text
WHOLE CURRENT FANOUT INVALID
```

No family text survives because it still looks plausible.

## 11. Candidate C status

The selected seam remains:

```text
CURRENT PROJECTION ONLY
READ-ONLY
NON-PERSISTENT
NO DERIVED-TO-DERIVED LINEAGE
NO CROSS-TURN RE-ENTRY
NO PARTIAL DESCENDANT SURVIVAL
```

Therefore Candidate C remains:

```text
NOT ACTIVATED
```

Derived family output becoming sibling authority would instead be a later cross-family propagation design and would trigger C5 reassessment.

## 12. Selected MF-2 design seam

Freeze the next design around:

```text
SharedCurrentSourceAuthorityBundleV1
        ↓ pure bounded projections
LiveReactionAuthorityViewV1
BoardAuthorityViewV1
NewsAuthorityViewV1
        ↓
independent family semantic lanes
```

with these invariants:

```text
one admitted current plan
one current trusted source root
one immutable shared authority bundle
minimal read-only authority view per admitted family
claim-specific policy contexts remain lane-private
NEWS maturity disposition remains lane-private
no sibling-derived reads
family output writes only to its own result slot
shared-root invalidation is plan-wide
family-specific authority gap is family-local
no persistence/history/re-entry
```

## 13. Design-only target deltas

MF-2 design work must leave:

```text
runtime code delta                 = 0
release-simcore delta              = 0
persistent storage delta           = 0
prompt/output transport delta      = 0
model-call count delta             = 0
network-call delta                 = 0
DOM/CSS delta                      = 0
history scan delta                 = 0
source context re-entry delta      = 0
```

## 14. Next design output

The MF-2 design document should freeze:

```text
1. shared authority bundle ownership and lifetime
2. exact shared-vs-private authority matrix
3. minimal family authority-view contracts
4. plan/bundle binding rules
5. lane read/write isolation
6. bundle-level vs family-local failure taxonomy
7. support-at-use behavior
8. physical topology neutrality
9. bounded diagnostics
10. MF-3 handoff requirements
```

No runtime implementation authority is implied.
