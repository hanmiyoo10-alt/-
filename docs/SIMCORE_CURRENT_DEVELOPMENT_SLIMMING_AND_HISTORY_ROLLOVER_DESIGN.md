# Current Development Slimming & Historical Rollover Architecture — Design

Date: 2026-08-27
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Design classification:

```text
Scope         = DOCUMENT_ARCHITECTURE
Target        = docs/CURRENT_DEVELOPMENT.md lifecycle split
Runtime Class = NON_RUNTIME
Apply Class   = NR_DOC_ONLY
Design Gate   = FROZEN
Application   = NOT AUTHORIZED BY THIS DOCUMENT
Open design questions = 0
```

Direct authority/contracts consumed by this design:
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_2_CLOSURE_INTEGRITY_DESIGN.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_2_IMPLEMENTATION_EVIDENCE_2026-08-28.md`
- `docs/SIMCORE_SYS05_HISTORICAL_VS_LIVING_DOCUMENT_REGISTRY_DESIGN.md`

This design is not a new SYS inventory item and does not reopen the closed gate-open SYS design sweep.
It is a bounded follow-up document-architecture contract requested after the current `CURRENT_DEVELOPMENT.md` growth problem became operationally relevant.

---

## 1. Problem

`docs/CURRENT_DEVELOPMENT.md` currently performs two lifecycle jobs with different mutation rules:

```text
CURRENT OPERATIONAL MEMORY
→ must change when current production / live gate / priority / active constraints change

HISTORICAL DEVELOPMENT MEMORY
→ must preserve old release evidence, old timings, old failure context,
  old acceptance records, and closed release narratives without semantic rewriting
```

R2.2-A correctly established machine-managed blocks inside `CURRENT_DEVELOPMENT.md` as the single current authority for release-cycle truth.
That solved downstream truth drift, but it intentionally did not solve document growth.

As release history accumulates, the same file therefore becomes simultaneously:
- a frequently-read current-state entry point,
- a frequently-mutated living authority host,
- a long-lived historical ledger,
- a large bounded-edit target,
- and a growing conflict surface for unrelated documentation work.

The root defect is not merely file byte size.
The root defect is lifecycle-role co-location.

```text
LIVING_CURRENT lifecycle
+
POINT_IN_TIME historical lifecycle
→ same physical document
→ unbounded growth + harder bounded edits + higher drift/conflict risk
```

R2.2 implementation evidence already recorded that the size of `CURRENT_DEVELOPMENT.md` complicated a bounded documentation edit enough to require a temporary workaround.
That is treated here as architectural evidence that the growth problem is no longer hypothetical.

---

## 2. Design Objective

Separate current operational memory from historical release memory while preserving the existing current release authority exactly where R2.2-A expects it.

Target invariant:

```text
CURRENT_DEVELOPMENT.md
= small, current, frequently read, frequently updated living surface

historical release-family documents
= preserved, rarely mutated point-in-time evidence collections

historical navigation
= discovery aid only, never current authority
```

The design must make future release accumulation bounded by rollover instead of permanent in-place growth.

---

## 3. Non-Negotiable Authority Preservation

### 3.1 `CURRENT_DEVELOPMENT.md` remains the release-cycle authority host

This design does **not** relocate R2.2-A authority.

The following machine-managed blocks remain in `docs/CURRENT_DEVELOPMENT.md` with the same semantics and path:

```text
Current Production Snapshot
Current Release Live Gate
```

Any markers consumed by the R2.2-A synchronization path remain stable unless a separate release-system design explicitly changes that contract.

### 3.2 Historical documents never become current truth authority

A historical release-family document may contain a production version, gate state, next action, or priority that was true at the time it was recorded.
That wording remains historical evidence only.

No current production, current live gate, current priority, or current authorization may be inferred from:
- archive recency,
- archive filename,
- highest version number present,
- last modified time,
- index ordering,
- or historical wording.

### 3.3 Navigation never becomes authority

Any future historical index is a lookup projection only.

```text
INDEX ENTRY PRESENT
!= CURRENT
!= RELEASED
!= VALIDATED
!= AUTHORIZED
```

---

## 4. SYS-05 Lifecycle Role Mapping

This design consumes the frozen SYS-05 lifecycle vocabulary rather than inventing a competing role system.

### `docs/CURRENT_DEVELOPMENT.md`

```text
Primary Role = LIVING_CURRENT
```

Its current-state sections may change as operational truth changes.
Historical detail is retained only when it is still semantically necessary to operate the current state.

### Release-family history documents

Default future shape:

```text
docs/history/SIMCORE_RELEASE_HISTORY_063.md
docs/history/SIMCORE_RELEASE_HISTORY_064.md
docs/history/SIMCORE_RELEASE_HISTORY_065.md
...
```

SYS-05 primary role:

```text
Primary Role = POINT_IN_TIME_EVIDENCE
```

A family document is a physical collection of individually historical release records.
Aggregation does not turn the collection into a living authority and does not create a new lifecycle role.

### Historical evidence index

Future target:

```text
docs/SIMCORE_HISTORICAL_EVIDENCE_INDEX.md
Primary Role = GENERATED_NAVIGATION
```

The index may be introduced only when it has a deterministic source or an explicitly reviewed generation contract.
Until then, direct links from `CURRENT_DEVELOPMENT.md` to release-family history are sufficient.

This design does not apply the future SYS-05 lifecycle registry itself.
When SYS-05 application is separately authorized, these mappings should be registered there rather than re-inferred.

---

## 5. Target `CURRENT_DEVELOPMENT.md` Content Contract

After a future migration, `CURRENT_DEVELOPMENT.md` should contain only information required to resume or govern current work.

### 5.1 Required current content

The current document may retain:

```text
1. machine-managed current production authority
2. machine-managed current live-gate authority
3. current operational snapshot
4. immediate product priority / next bounded action
5. active blockers and active freeze constraints
6. currently operative acceptance / stop conditions
7. near-term roadmap needed to understand the next transition
8. compact reminders for still-active regression controls
9. a bounded historical-navigation section
```

### 5.2 Historical detail that becomes rollover-eligible

The current document should not permanently retain full detail for:

```text
closed release narratives
closed live-gate transcripts
old timing tables
old trigger-by-trigger evidence
superseded next-action prose
closed acceptance ledgers
old implementation walkthroughs
old failure reproductions whose operational consequence is already captured elsewhere
long historical regression narratives when only the current control remains operative
```

### 5.3 Active regression exception

A historical event may still impose an active present-day control.
In that case, `CURRENT_DEVELOPMENT.md` keeps only the operative rule plus a historical pointer.

Example shape:

```text
Active regression control:
- <current rule that still constrains work>
Evidence:
- <stable historical document / section pointer>
```

The historical cause, measurements, chronology, and old release context belong in the historical evidence surface.

---

## 6. Semantic Rollover Model

Rollover is governed by semantic state, not by file age or byte count.

Each historical candidate is reviewed under one of these states:

```text
ACTIVE_CURRENT
ACTIVE_REGRESSION_REFERENCE
ROLLOVER_ELIGIBLE
ROLLOVER_BLOCKED
ROLLED_OVER
```

### `ACTIVE_CURRENT`

The material directly defines current production, current gate, current priority, active acceptance, active blocker, or current freeze posture.
It stays in `CURRENT_DEVELOPMENT.md`.

### `ACTIVE_REGRESSION_REFERENCE`

The originating event is historical, but an operative control still constrains current work.
The full historical detail becomes rollover-eligible while a compact current reminder and pointer remain.

### `ROLLOVER_ELIGIBLE`

All of the following are true:

```text
- the detailed material no longer defines current operational truth
- its historical meaning can be preserved at a stable destination
- any still-current consequence can be represented by a compact current rule
- inbound references can be preserved or migrated
```

### `ROLLOVER_BLOCKED`

Migration would currently lose provenance, break required references, create ambiguous authority, or remove context still needed for an active decision.
Nothing is deleted merely to reduce size.

### `ROLLED_OVER`

The historical detail exists at its designated historical destination, provenance is preserved, references are verified, and `CURRENT_DEVELOPMENT.md` retains only the current-semantic residue that still belongs there.

---

## 7. Rollover Decision Rule

Use this decision sequence for each candidate section:

```text
Does this section define current production / gate / priority / blocker / freeze / acceptance?
YES → ACTIVE_CURRENT → keep
NO  → continue

Does a rule derived from it still constrain current work?
YES → keep compact current rule + historical pointer;
      full detail may roll over
NO  → continue

Is durable historical destination + provenance available?
NO  → ROLLOVER_BLOCKED
YES → continue

Can inbound references be preserved or migrated without ambiguity?
NO  → ROLLOVER_BLOCKED
YES → ROLLOVER_ELIGIBLE
```

A large file, old timestamp, old version number, or long section may trigger review, but none of them authorize rollover by themselves.

```text
SIZE / AGE / VERSION AGE
= REVIEW SIGNAL ONLY
!= SEMANTIC DISPOSITION
```

---

## 8. Historical Partitioning Rule

Default physical partitioning is one release-history file per SimCore minor-version family.

Examples:

```text
0.63.x → docs/history/SIMCORE_RELEASE_HISTORY_063.md
0.64.x → docs/history/SIMCORE_RELEASE_HISTORY_064.md
0.65.x → docs/history/SIMCORE_RELEASE_HISTORY_065.md
```

Why this granularity is the default:
- one file per patch would create excessive file-count fragmentation,
- one global history file would recreate the same unbounded-growth problem,
- minor-version families are stable release identities without claiming current authority.

A family document must not be automatically split merely because it crosses a byte threshold.
If a family becomes operationally unwieldy, further semantic partitioning requires a separately reviewed amendment that defines the split boundary and stable naming.

---

## 9. Historical Entry Preservation Contract

The first migration of existing material is preservation work, not editorial cleanup.

Each migrated historical unit must preserve enough provenance to reconstruct where it came from.

Minimum provenance metadata:

```text
Source path
Source commit
Original section heading / bounded section identity
Release or phase identity when applicable
Migration destination
Migration status
```

Initial copy rule:

```text
COPY HISTORICAL MEANING FIRST
NORMALIZE LATER ONLY UNDER SEPARATE REVIEW
```

During initial migration, historical prose should be copied verbatim where practical.
Formatting changes necessary for stable Markdown nesting are allowed only when they do not alter semantic content.

Do not silently:
- modernize old version wording,
- replace old NEXT statements with current NEXT,
- correct old gate status because the gate later changed,
- merge distinct incidents,
- collapse failed and passed evidence,
- rewrite old measurements into summaries and discard originals.

---

## 10. Reference-Preserving Migration Contract

Moving historical sections can invalidate anchors and cross-document references even when the text itself is preserved.
A future migration therefore treats references as part of the evidence contract.

Required order:

```text
1. inventory candidate historical sections
2. inventory inbound references to moved path/anchors
3. create historical destination with stable section identities
4. copy historical content + provenance
5. update verified inbound references where required
6. verify destination coverage and links
7. only then remove detailed source copy from CURRENT_DEVELOPMENT.md
8. retain compact current pointer where current semantics require one
```

A section with unresolved required inbound references is `ROLLOVER_BLOCKED`, not "close enough".

This contract may later consume SYS-07 Cross-Reference Integrity Auditor if that design is applied, but migration does not depend on SYS-07 implementation existing.
Manual/deterministic repository verification is sufficient if it satisfies the same bounded reference obligation.

---

## 11. R2.2-A Compatibility Contract

The migration must leave release-cycle synchronization semantics unchanged.

Required compatibility checks after a future migration:

```text
- CURRENT_DEVELOPMENT.md path unchanged
- Current Production Snapshot markers unchanged in semantic identity
- Current Release Live Gate markers unchanged in semantic identity
- R2.2-A parser still resolves exactly one authoritative block of each type
- downstream generated release truth is unchanged for the same current input
- historical files are not introduced as fallback current authority
- historical index is not consumed as current release truth
```

A successful historical migration may alter surrounding human-readable prose and file size, but it must not alter the meaning of current machine-managed authority.

---

## 12. Future Application Sequence

This design intentionally does not perform the migration.
A separately authorized application should be decomposed into bounded units.

### Unit A — Destination establishment

```text
create docs/history/ if absent
create required release-family history file(s)
define stable headings / provenance envelope
optionally establish navigation only if its generation source is ready
```

No source historical detail is removed in this unit.

### Unit B — Preservation copy

```text
copy rollover-eligible historical detail
record provenance
verify text/section coverage
```

The old source remains intact until verification closes.

### Unit C — Reference migration

```text
update verified inbound references
verify no required old anchor is stranded
```

### Unit D — CURRENT slimming

```text
remove only already-preserved detailed history
retain active current rules / pointers
retain R2.2-A machine-managed blocks
re-run current-release synchronization / guards
```

### Unit E — Close evidence

Record:
- before/after current-authority values,
- migrated section inventory,
- destination coverage,
- reference verification,
- R2.2-A deterministic result,
- exact bounded files changed.

These units may be combined only when the resulting mutation remains auditable and race-safe.

---

## 13. Current-Document Growth Policy After Migration

The lasting fix is not a one-time cleanup.
Every future release close must apply the same lifecycle rule.

At release transition:

```text
new release becomes current
→ current authority updates normally

previous release detail ceases to be current
→ review for ACTIVE_REGRESSION_REFERENCE vs ROLLOVER_ELIGIBLE

historical detail is preserved at release-family destination
→ CURRENT keeps only still-operative residue + pointer
```

This makes historical growth occur in bounded history families instead of permanently accumulating in the living current entry point.

No fixed `CURRENT_DEVELOPMENT.md` byte ceiling is authoritative.
A future size watch may trigger maintenance review, but semantic classification remains the only rollover authority.

---

## 14. Failure Modes This Design Forbids

```text
AUTHORITY MOVE BY CLEANUP
→ moving the R2.2-A current blocks into history or an index

HISTORY BECOMES CURRENT
→ inferring production/gate truth from the newest archive entry

DELETE-TO-SLIM
→ removing historical detail before preservation/reference verification

SUMMARY-AS-EVIDENCE-REPLACEMENT
→ replacing detailed historical evidence with a short summary and discarding the source

BYTE-THRESHOLD AUTHORIZATION
→ treating file size as permission to move/delete a section

VERSION-AGE AUTHORIZATION
→ treating an old version number as proof that content is non-current

ANCHOR AMNESIA
→ moving sections without checking inbound references

DUAL CURRENT AUTHORITY
→ keeping parallel current production/gate truth in history/index as another source

SYS-05 BYPASS
→ inventing lifecycle roles from filenames rather than using the frozen vocabulary
```

---

## 15. Acceptance Contract For A Future Application

The architecture is considered successfully applied only if all of the following hold:

```text
A. CURRENT_DEVELOPMENT.md remains sufficient to resume current work without reading history first.
B. R2.2-A current production and live-gate authority remain exactly singular and machine-readable.
C. Every removed historical detail unit has a verified historical destination and provenance.
D. Still-active regression controls remain visible in compact current form with stable pointers.
E. Required inbound references to migrated material resolve to the new destination.
F. Historical documents contain no newly-created current authority semantics.
G. Historical navigation, if present, is explicitly non-authoritative.
H. No runtime/plugin/release branch mutation is required by the document migration itself.
I. Migration evidence identifies exact files and source/destination sections changed.
J. The migration does not claim release validation, live-gate closure, or runtime correctness.
```

---

## 16. Non-Goals

This frozen design does not authorize or perform:

```text
- the actual CURRENT_DEVELOPMENT.md split
- historical section movement
- release-history file creation
- SYS-05 registry application
- generated index tooling
- CI/linter integration
- R2.2-A authority relocation
- runtime/plugin changes
- release-simcore changes
- v0.64.8 live-gate closure
- M2-3 implementation
- historical evidence reinterpretation
```

Any of those requires its own bounded authorization where applicable.

---

## 17. Decision

Freeze the following architecture:

```text
CURRENT_DEVELOPMENT.md
= LIVING_CURRENT
= current authority + current operational memory only

closed detailed release history
= rollover to minor-version-family POINT_IN_TIME_EVIDENCE collections

still-operative historical consequence
= compact current rule + stable historical pointer

historical discovery index
= GENERATED_NAVIGATION only when a deterministic source exists
= never current authority

rollover authorization
= semantic lifecycle review
!= age
!= version age
!= byte threshold
```

The central rule is:

```text
SEPARATE CURRENT MEMORY LIFECYCLE FROM HISTORICAL MEMORY LIFECYCLE
WITHOUT MOVING CURRENT RELEASE AUTHORITY.
```

Design status after this document:

```text
FROZEN
Open design questions = 0
Implementation / migration = NOT STARTED
Application authorization = NONE
Runtime effect = NONE
```
