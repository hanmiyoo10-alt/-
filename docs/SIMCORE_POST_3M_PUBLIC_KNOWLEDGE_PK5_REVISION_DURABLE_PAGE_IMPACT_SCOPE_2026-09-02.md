# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-5 Revision / Durable Page Boundary Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **DESIGN-ONLY · PK-5 IMPACT SCOPE · SNAPSHOT V1 REMAINS VALID · DURABLE PAGE PATH RESERVED · CANDIDATE C REASSESSMENT REQUIRED · NO RUNTIME / STORAGE / REENTRY / MUTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-5 · REVISION · DURABLE PAGE · CANDIDATE C BOUNDARY**

## 0. Purpose

PK-0 through PK-4 produced a complete current-projection PUBLIC_KNOWLEDGE reference surface:

```text
settlement semantics
→ settlement context authority
→ validated bounded document
→ status-preserving presentation
→ user-visible citation provenance
```

All of those contracts are intentionally current-projection-only.

PK-5 asks the first durability question:

> Does PUBLIC_KNOWLEDGE V1 need durable page identity and revision history to be considered complete, or can the first family converge as a snapshot while reserving a later durable wiki lane?

This impact scope selects the latter unless a concrete product requirement demands durability.

Canonical decision target:

```text
PUBLIC_KNOWLEDGE V1
= CURRENT_PROJECTION REFERENCE DOCUMENT
= COMPLETE WITHOUT DURABILITY

DURABLE PUBLIC REFERENCE PAGE
= SEPARATE FUTURE CAPABILITY PROFILE
= CANDIDATE C CONSUMER
```

## 1. Existing authority

PK-5 consumes without reopening:

```text
PK-0 Settlement Master Design
PK-1 Settlement Context Authority
PK-2 Document Sidecar + Validator
PK-3 Presentation Grammar
PK-4 Citation / Provenance Boundary
3M-6 current-projection support invalidation
3M-7 zero automatic structured-source re-entry
Candidate C Durable Derived-Object Master Design
```

Candidate C remains capability-gated. Opening one durability requirement must not authorize every durable-source capability.

## 2. Snapshot completion question

The first PUBLIC_KNOWLEDGE family can already represent:

```text
settled public reference
attributed-but-unsettled record
contested record
corrected current record
withdrawn/retracted record
bounded citations / references
```

Nothing in those semantics requires that the rendered page survive into a later turn.

Therefore:

```text
REFERENCE DOCUMENT EXISTS NOW
!=
DURABLE PAGE MUST EXIST LATER
```

Current-projection regeneration from current authority remains semantically valid.

## 3. Durability triggers

The following requirements are not cosmetic extensions. They cross the Candidate C boundary:

```text
"show me the same page next turn"
"this is the same article/page as before"
"edit only this public-knowledge page"
"add one citation to the existing page"
"show the previous revision"
"restore revision 3"
"compare old and current revisions"
"keep the old revision even though current source support changed"
"use the previous page as model context later"
```

These require durable object identity, revision/generation, mutation semantics, or controlled re-entry.

## 4. Candidate C mapping

PK-5 freezes the following future requirement mapping.

### 4.1 Durable page identity only

Requirement:

```text
same logical PUBLIC_KNOWLEDGE page survives across turns
```

Minimum gates:

```text
C1 cross-turn survival       = YES
C2 stable derived identity   = YES
C3 mutation                  = NO
C4 append / merge            = NO
C5 derived propagation       = NO
C6 context re-entry          = NO
C7 partial survival          = NO
C8 delayed effect            = NO
```

This profile preserves a page identity without yet creating revision history.

### 4.2 Revisioned page

Requirement:

```text
same page may be edited, corrected, appended, or restored as a logical object
```

Minimum gates:

```text
C1 = YES
C2 = YES
C3 = YES
C4 = YES
C5 = NO
C6 = NO by default
C7 = NO by default
C8 = NO
```

A revision is a version/generation of one durable page, not a new canonical world object.

### 4.3 Historical revision preservation

Requirement:

```text
old revisions remain inspectable after the current source/support basis changes
```

This may require:

```text
C7 = YES
```

but only if the future child design explicitly defines how historical revisions remain available while current support is re-proved.

C7 is not automatically implied merely because revision numbers exist.

### 4.4 Controlled future-context use

Requirement:

```text
future model generation receives a prior durable PUBLIC_KNOWLEDGE page/revision as context
```

Then:

```text
C6 = YES
```

Durability alone never authorizes re-entry.

### 4.5 Cross-family derivation

Requirement:

```text
NEWS / BOARD / SOCIAL_FEED derived object becomes formal provenance parent of a durable PUBLIC_KNOWLEDGE object
```

Then:

```text
C5 reassessment required
```

PK-5 does not activate C5 merely because citations or settlement evidence came from public records.

### 4.6 Delayed media / asynchronous attachment

If a future page image, media block, or remote materialization must attach later to an exact durable page or revision:

```text
C8 reassessment required
```

PK-5 does not activate it.

## 5. Stable page identity boundary

A future durable page identity must not be inferred from:

```text
title text
target display label
content fingerprint
citation set
host message index
presentation render key
current targetRef formatting alone
```

Future identity must be explicit and bounded by the durable-page owner.

Candidate namespace reservation:

```text
PUBLIC_KNOWLEDGE_DOCUMENT
```

is already compatible with Candidate C vocabulary, but PK-5 does not authorize a runtime ID format.

## 6. Page identity != revision identity

Future contract must preserve:

```text
same page
!= same revision
```

Conceptually:

```text
pageId = PKDOC:42
revision = 7
```

and later:

```text
pageId = PKDOC:42
revision = 8
```

may name the same logical page at different generations.

No actual serialization format is selected here.

## 7. Revision != settlement state

A newer revision is not automatically more true or more settled.

```text
REVISION 8
!= STRONGER SETTLEMENT THAN REVISION 7
```

Every current revision must still consume current authority and settlement rules.

Revision order is object history, not epistemic ranking.

## 8. Correction state != revision history

PK-2/3 already support:

```text
CORRECTED_CURRENT_RECORD
```

That does not mean a prior revision exists.

Canonical separation:

```text
CORRECTED_CURRENT_RECORD
= current semantic state

REVISION HISTORY
= durable object history
```

A corrected assertion may appear in snapshot V1 with no durable history at all.

## 9. Citation identity boundary

PK-4 citation identity remains current-projection-only.

A future durable revision may need a revision-bound citation set, but PK-5 does not silently promote:

```text
citationRef
```

into permanent global citation identity.

Future durable citation requirements must answer:

```text
same citation across revisions?
source record replaced?
locator changed?
withdrawn citation preserved historically?
```

before persistence is authorized.

## 10. Historical revision safety

A future revision UI must not imply that historical text remains current truth.

Required future distinction:

```text
HISTORICAL REVISION CONTENT
!= CURRENT REFERENCE STATE
```

If historical revisions are ever rendered, the UI must visibly identify them as historical snapshots and must not silently reuse old reference-state labels as current validation.

## 11. Restore semantics

A future `restore revision N` operation must not mean:

```text
copy old bytes
→ automatically current-valid
```

Restore would require a new current revision/generation whose semantic assertions are revalidated against current authority.

Canonical future rule:

```text
RESTORE INTENT
→ NEW CURRENT VALIDATION
→ NEW REVISION
```

not resurrection of old authority.

## 12. Revision comparison

A future diff/compare feature is presentation/analysis over two explicit revisions.

It must not infer:

```text
added text = newly true
removed text = false
later text = more settled
```

Revision diff is change evidence, not truth evidence.

## 13. No hidden history reconstruction

Even when a future durable lane exists, the system must not construct page history by scanning ordinary host transcript text.

Forbidden:

```text
search old messages for similar title
→ guess page history
```

or:

```text
same content fingerprint
→ same durable page
```

Durable history must come only from the future bounded durable-page owner.

## 14. No automatic prompt re-entry

Even a persistent page must remain dormant unless the current request/authority explicitly consumes it.

Canonical rule:

```text
PERSISTED PAGE
!= AUTOMATIC MODEL CONTEXT
```

3M-7 remains authoritative until C6 is explicitly designed and activated.

## 15. No generic wiki database

PK-5 does not authorize:

```text
global page registry
full-text search index
cross-character wiki corpus
unbounded article archive
background page updating
internet scraping
automatic source refresh
```

A future durable child design must stay consumer-specific and bounded.

## 16. V1 decision

Selected PK-5 impact decision:

```text
PUBLIC_KNOWLEDGE SNAPSHOT V1
= SEMANTICALLY COMPLETE
= NO CANDIDATE C ACTIVATION REQUIRED

DURABLE / REVISIONED PUBLIC_KNOWLEDGE
= FORMAL FUTURE EXPANSION PATH
= CANDIDATE C CONSUMER WHEN REQUIRED
```

This preserves future wiki-like capability without making first implementation pay durability cost before a concrete requirement exists.

## 17. Impacted seams

Future durability would touch at least:

```text
Candidate C identity/lifetime owner
support-at-use invalidation
revision/generation contract
mutation / append / restore semantics
PK-4 citation lifetime
PK-3 historical-revision presentation
optional C6 re-entry
optional C7 historical survival
```

Current PK-0..PK-4 snapshot contracts remain unchanged.

## 18. Non-goals

This transaction does not implement or authorize:

```text
persistent page storage
page IDs
revision IDs
revision history UI
edit / restore
revision diff
cross-turn retrieval
prompt re-entry
background refresh
network calls
source crawling
runtime schema
release change
```

## 19. Acceptance boundary for detailed PK-5

The detailed design should freeze:

1. final snapshot-vs-durable verdict;
2. formal future capability profiles;
3. page identity vs revision identity;
4. revision-bound validation and support-at-use rules;
5. restore semantics;
6. citation/revision boundary;
7. C1..C8 activation matrix;
8. what remains explicitly deferred.

No runtime implementation authority follows from acceptance.
