# SimCore Post-3.0M MF-7 Cross-Family Propagation Reassessment Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **MF-7 IMPACT SCOPE · READ-ONLY DESIGN REVIEW · CROSS-FAMILY PROPAGATION NOT YET SELECTED · CANDIDATE C C5 REASSESSMENT · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-7 · CROSS-FAMILY PROPAGATION · CANDIDATE C C5 · IMPACT SCOPE**

## 0. Purpose

MF-0 through MF-6 now define a complete current-root sibling fanout surface across LIVE_REACTION, BOARD, SOCIAL_FEED, NEWS, and PUBLIC_KNOWLEDGE.

MF-7 asks whether Multi-Family should now open a different capability:

```text
derived family object
→ another derived family object
```

Examples include BOARD rumor → NEWS story, SOCIAL_FEED post → NEWS attributed report, and NEWS story → PUBLIC_KNOWLEDGE provenance.

This is not sibling fanout. It is Candidate C gate C5 territory.

This impact review is design-only. It implements nothing.

## 1. Primary impact finding

Current MF product scope has a concrete requirement for CURRENT_ROOT_SIBLING_FANOUT. It does not yet contain a selected requirement naming an exact source derived object and exact target derived object that must form a provenance edge.

Candidate C requires exact capability activation from a concrete consumer.

Therefore:

```text
C5 TECHNICAL PRESSURE = RECOGNIZED
C5 PRODUCT CONSUMER = NOT SELECTED
C5 ACTIVATION = DEFER
```

MF-7 should freeze the activation boundary, not invent a generic cross-family graph.

## 2. Sibling fanout remains sufficient

```text
trusted current authority E
  ├→ LIVE_REACTION(E)
  ├→ BOARD(E)
  ├→ SOCIAL_FEED(E)
  ├→ NEWS(E)
  └→ PUBLIC_KNOWLEDGE(E)
```

No already-frozen MF-0..MF-6 capability requires a sibling derived object as another lane's semantic parent.

## 3. Future lineage is not truth propagation

If a future child design opens C5:

```text
DERIVED PARENT EXISTS
!= PARENT CONTENT IS TRUE
```

A BOARD rumor may prove that a rumor object existed; it cannot make the rumor proposition a confirmed NEWS fact.

A NEWS object may become provenance for a later PUBLIC_KNOWLEDGE object; it cannot by itself create SETTLED_PUBLIC_REFERENCE.

## 4. Minimum activation question

Before C5 may open, the request must name at minimum:

```text
source family
source derived object type
target family
target derived object type
why direct current-root sibling derivation is insufficient
same-turn or cross-turn propagation
whether parent must survive source replacement
whether target may later re-enter model context
```

These answers determine whether only C5 is needed or C1/C2/C6/C7/C8 also activate.

## 5. Candidate C interaction matrix

```text
same-turn derived → derived lineage, operation-local only
→ C5 likely YES
→ C1 may remain NO

cross-turn derived → derived lineage
→ C5 YES
→ C1 YES
→ C2 YES

parent/descendant survives root replacement
→ C7 pressure

late effect targets propagated object
→ C8 pressure

propagated object re-enters future model context
→ C6 pressure
```

C5 never opens other gates automatically.

## 6. Reserved vocabulary only

A future child may need concepts such as:

```text
DerivedParentRef
parentFamily
parentObjectType
parentDerivedId
expectedParentRevision?
parentSupportRef
```

This is vocabulary, not a generic runtime schema.

Forbidden:

```text
UniversalCrossFamilyNodeV1
UniversalDerivedGraphV1
```

## 7. Support-at-use separation

Future propagation must keep:

```text
canonical/current support refs
!= derived-parent lineage refs
```

Derived parent lineage can support claims about the existence/content of the derived object itself, not automatically the underlying proposition's canonical truth.

## 8. PUBLIC_KNOWLEDGE settlement remains independent

Even a future legal chain:

```text
BOARD → NEWS → PUBLIC_KNOWLEDGE
```

must still pass Exposure + trusted PUBLIC_KNOWLEDGE settlement context + PK validator.

Lineage is provenance, not settlement authority.

## 9. Same-turn lineage need not imply history

C5 may eventually support same-operation lineage without C1/C6 if a concrete child proves that direct-root sibling derivation is insufficient and exact operation-local object identity is enough.

## 10. Presentation cannot create lineage

Forbidden parent discovery includes DOM cards, render order, slot identity, string similarity, old transcript text, and screen position.

Parent refs must come from trusted semantic derived-object identity.

## 11. Cost/failure boundary

Future C5 work must use exact bounded parent refs and support/revision checks. Generic graph scans, fuzzy history retrieval, and text-similarity parent search are forbidden.

Missing/stale parent provenance causes the target propagation path to HOLD/fail. Siblings cannot repair it heuristically.

## 12. Selected impact seam

```text
CROSS_FAMILY_PROPAGATION_ACTIVATION_GATE
```

Responsibilities:

```text
confirm concrete consumer
freeze exact Candidate C gate profile
freeze parent/child semantic roles
preserve truth/settlement non-promotion
freeze lifetime/lookup bounds
prove direct-root sibling derivation is insufficient
```

It remains CLOSED without a concrete consumer.

## 13. Impact verdict

```text
MF-7 IMPACT VERDICT = DEFER_C5_ACTIVATION
Candidate C C5 = REASSESSMENT COMPLETE / NOT ACTIVATED
```

Reason: current Multi-Family product requirement is fully satisfied by current-root sibling fanout, and no exact cross-family parent/child consumer is selected.

## 14. Runtime consequence

None. Runtime, production, and release-simcore remain unchanged.

## 15. Main-design task

The MF-7 main design should freeze the closed C5 decision, exact reopen prerequisites, minimum lineage invariants if reopened, no generic provenance graph, and handoff to MF-8 convergence.
