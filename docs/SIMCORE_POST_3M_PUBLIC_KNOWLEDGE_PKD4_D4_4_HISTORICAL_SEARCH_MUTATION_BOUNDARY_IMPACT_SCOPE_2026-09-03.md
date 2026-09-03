# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D4 D4-4 Historical / Search / Mutation Boundary Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **D4-4 IMPACT SCOPE FROZEN · HISTORICAL CONTEXT CLOSED FOR V1 · SEARCH DISCOVERY NON-AUTHORITATIVE FOR C6 · CONTEXT CONSUMPTION NON-MUTATION-AUTHORITY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D4 · D4-4 · CANDIDATE C C6 · HISTORICAL / SEARCH / MUTATION BOUNDARY**

## 0. Purpose

D4-0 through D4-3 activate a narrowly bounded C6 profile in which one exact current durable PUBLIC_KNOWLEDGE page head may enter one later model operation as `REFERENCE_DATA` after fresh current revalidation and final currentness checks.

D4-4 freezes the boundary between that capability and three adjacent product surfaces that must not become accidental context authority:

```text
PK-D3 historical inspection
PK-X2 current page search/discovery
PK-D2 mutation / restore
```

Canonical non-implications:

```text
HISTORICAL VIEWABLE
!= HISTORICAL CONTEXT-ELIGIBLE

SEARCH DISCOVERABLE
!= CONTEXT-SELECTED

MODEL CONSUMED CONTEXT
!= MUTATION AUTHORIZED
```

This transaction is design-only. No runtime, prompt, storage, search index, mutation, renderer, or release change is authorized.

## 1. First D4-4 seam

Selected seam:

```text
CURRENT_HEAD_ONLY_CONTEXT
+
SEARCH_AS_DISCOVERY_ONLY
+
EXPLICIT_D4_SELECTION_AFTER_DISCOVERY
+
NO_RESPONSE_TO_MUTATION_ESCALATION
+
RESTORE_REMAINS_D2_AUTHORITY
```

Not selected:

```text
historical revision prompt re-entry
history search for context
fuzzy page retrieval for context
ambient last-viewed-page context
model-proposed page edits
model-triggered restore
context-driven revision commits
cross-family derived lineage
async delayed context refresh
```

## 2. Historical boundary

PK-D3 authorizes exact historical inspection under authenticity and disclosure gates.

D4 V1 does not consume that authority as context authority.

```text
historical revision R4 authentic + disclosure ALLOW
→ may be shown in D3 historical UI
→ may be compared in D3
→ may be selected as restore seed under D2/D3 rules
→ MUST NOT enter D4 V1 model context
```

Historical context requires a future explicit child profile with its own:

```text
historical-context intent
exact historical revision addressing
current disclosure re-check
historical/current truth framing
prompt role grammar
budget
staleness semantics
```

No such profile is activated here.

## 3. Why historical visibility is insufficient

Historical body visibility proves a different proposition from current C6 eligibility.

```text
D3 historical visibility
= authentic past committed snapshot
+ current disclosure permission

D4 current-head context
= current exact head
+ current semantic support-at-use
+ current settlement/citation validation
+ D4 selection authority
```

Therefore:

```text
D3 ALLOW
!= D4 ALLOW
```

The system must not convert an already-open historical viewer into model context merely because the bytes are visible.

## 4. Search boundary

PK-X2 remains a page-level current discovery surface.

A search result may provide a trusted candidate page locator, but does not by itself authorize C6.

Preferred chain:

```text
PK-X2 search
→ candidate pageIdentity
→ user/trusted caller explicitly selects that page for D4
→ D4-1 exact address resolution
→ D4-2 current revalidation/composer
→ D4-3 role firewall
→ dispatch
```

Forbidden shortcut:

```text
search result
→ automatically inject result into model context
```

## 5. Search ranking is not context authority

The following are never sufficient C6 selection signals:

```text
rank #1
highest lexical score
highest embedding score
most recently viewed
most citations
most revisions
same title string
similar displayLabel
search snippet similarity
```

Search relevance may help a user or trusted caller choose a page, but the D4 operation must receive an explicit exact selected `pageIdentity`.

## 6. Search snippets do not enter D4 context

Search-result snippets, highlights, generated previews, or ranking explanations are not the D4 semantic projection.

```text
SEARCH SNIPPET
!= PUBLIC_KNOWLEDGE CURRENT HEAD
!= D4 CONTEXT PAYLOAD
```

After selection, D4 must resolve the exact current head and compose fresh validated semantics from current authority.

## 7. No multi-result automatic fan-in

D4 V1 keeps the one-page boundary.

```text
search returns P1, P2, P3
→ D4 must not inject all three
```

Multi-page contextual retrieval would require a separate selection, ordering, conflict, budget, and aggregation design.

## 8. Mutation boundary

D4 context is read-only reference data.

A model response that uses contextual page P does not acquire authority to mutate P.

```text
MODEL READ P
!= MODEL MAY EDIT P
```

No D4 output may directly perform:

```text
EDIT_ASSERTION
APPEND_ASSERTION
REMOVE_ASSERTION
APPEND_CITATION
REPLACE_CITATION
CORRECTION_UPDATE
RESTORE
head advance
revision commit
```

Those remain D2 mutation authorities with their own explicit operation contracts.

## 9. Model-proposed mutation is only proposal text

If a model response says:

```text
"the page should be updated"
"restore revision R4"
"replace this citation"
```

that statement is ordinary model output, not a trusted mutation intent.

Canonical rule:

```text
MODEL PROPOSES MUTATION
!= MUTATION OPERATION AUTHORIZED
```

A later trusted user/system operation may independently create a D2 mutation intent, but it must re-enter through D2's exact expected-revision, footprint, current validation, no-op, and commit-safety gates.

## 10. No response-to-operation token escalation

D4 context envelopes and model response metadata must not contain reusable authority that can be replayed as a mutation credential.

Forbidden:

```text
contextEnvelopeRef → edit capability
operationRef → restore capability
model response id → revision commit capability
```

Any later mutation operation must acquire its own current authority.

## 11. Restore separation

Historical restore remains:

```text
exact historical revision
→ explicit RESTORE intent
→ current revalidation
→ new D2 revision
```

D4 does not create a shorter path.

Even if the model consumed the current page and discussed historical R4 text supplied by the user separately, it cannot make R4 current.

## 12. Current-head context and mutation races

A D4 model request may be dispatched using current head R8 after final D4 currentness checks.

If a valid independent D2 mutation commits R9 afterward:

```text
D4 in-flight request remains an R8-context operation
D2 head becomes R9
```

The system must not:

```text
patch the in-flight context to R9
rewrite model output as if it saw R9
rollback R9 because D4 used R8
```

D4 and D2 remain separate authority classes.

## 13. Search changes after selection

Once D4 exact selection is established, later search-rank changes are irrelevant.

```text
P was rank #1 at selection
later P becomes rank #5
→ no effect on the already selected exact page
```

Only D4 currentness/semantic authority gates determine dispatch eligibility after exact selection.

## 14. Historical head coincidence does not broaden D4

If a user opens historical R8 and R8 happens to equal the current head:

```text
historical navigation object
!= D4 selection intent
```

D4 may only use R8 after an independent current-head selection path proves it as the current head under D4.

## 15. Current page unavailable

PK-X2 may still discover a page whose current semantic view is unavailable.

That does not permit D4 to fall back to an old revision.

```text
search hit P
+ current head/context validation unavailable
→ D4 HOLD / unavailable
→ no historical fallback
```

## 16. Source-irrelevant dormancy

Absent an explicit D4 operation:

```text
search query for context = 0
history scan = 0
context lookup = 0
context injection = 0
mutation write = 0
restore attempt = 0
background refresh = 0
```

D4 does not turn search or history into ambient retrieval memory.

## 17. Candidate C audit

This D4-4 seam preserves:

```text
C1 survival         = YES
C2 stable identity  = YES
C3 mutation         = YES, inherited PK-D2 only
C4 append/merge     = YES, inherited PK-D2 only
C5 lineage          = NO
C6 context re-entry = YES, explicit D4 current-head profile
C7 historical       = YES, PK-D3 product capability but NOT D4 V1 context source
C8 delayed effect   = NO
```

Important:

```text
C3 exists in product
!= C6 grants C3

C7 exists in product
!= C6 consumes C7
```

## 18. Failure taxonomy reserved for detailed design

Detailed D4-4 should distinguish at least:

```text
HISTORICAL_CONTEXT_NOT_SUPPORTED
SEARCH_RESULT_NOT_SELECTED
SEARCH_TARGET_NOT_EXACT
CURRENT_CONTEXT_UNAVAILABLE_AFTER_SEARCH
MUTATION_AUTHORITY_REQUIRED
RESTORE_AUTHORITY_REQUIRED
RESPONSE_NOT_OPERATION_AUTHORITY
```

These failures must not be collapsed into automatic fallback behavior.

## 19. Detailed-design questions

D4-4 detailed design should freeze:

1. exact search-to-D4 handoff envelope,
2. whether search may pass `pageIdentity` only or bounded non-authoritative display metadata,
3. operation identity separation between D4 and D2,
4. safe handling when model output requests a mutation,
5. historical-current coincidence handling,
6. current-view unavailable after search selection,
7. UI/navigation wording that avoids implying search or history grants context authority,
8. observability without storing prompt/context bodies.

## 20. Acceptance matrix

```text
historical R4 viewable
→ D4 context from R4 = NO

search finds P
→ automatic context = NO

search finds P + explicit D4 select P
→ exact D4 current-head path required

model used P as context
→ edit P = NO

model says "restore R4"
→ restore = NO until explicit D2 restore operation

current head invalid after search selection
→ no historical fallback
```

## 21. Sequence

```text
D4-0 Contextual Durable Page Master            ✅
D4-1 Context Selection / Exact Address         ✅
D4-2 Current Revalidation / Composer           ✅
D4-3 Prompt Role / Instruction Firewall        ✅
D4-4 Historical / Search / Mutation Impact     ✅ THIS DOCUMENT
D4-4 Detailed Boundary Design                  ← NEXT
D4-5 Lifetime / Bounds / Convergence
```

## 22. Final impact verdict

```text
PK-D4 D4-4 IMPACT
=
HISTORY / SEARCH / MUTATION ARE ADJACENT INPUT SURFACES,
NOT AUTOMATIC C6 AUTHORITY.

HISTORICAL CONTEXT V1 = CLOSED
SEARCH AUTO-INJECTION = CLOSED
MODEL-TO-MUTATION ESCALATION = CLOSED

RUNTIME IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```
