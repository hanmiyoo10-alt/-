# SimCore Unified Idea Classification Policy

Status: `CANONICAL IDEA CLASSIFICATION POLICY · ALL IDEA FAMILIES · NO RUNTIME CHANGE`

Purpose: require every SimCore idea, regardless of subject family, to use one common classification model. Product/runtime ideas, repository/tooling ideas, release-system ideas, evidence ideas, architecture ideas, operator-workflow ideas, and future system ideas must not invent separate classification vocabularies.

Related authority:
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`

## 1. Universal rule

```text
IDEA SUBJECT FAMILY
!= classification system
```

The same classification axes apply to every idea.

Allowed namespaces such as `S-*`, `M-*`, `L-*`, or `SYS-*` may identify inventory lineage or family, but they do not create a different scoring/readiness system.

## 2. Canonical axes

Every recorded idea or candidate must carry these axes:

```text
SIZE
= SMALL / MEDIUM / LARGE

IMPORTANCE
= 5 VERY HIGH
= 4 HIGH
= 3 MEDIUM
= 2 LOW
= 1 VERY LOW

DIFFICULTY
= 1 VERY EASY
= 2 EASY
= 3 MODERATE
= 4 HARD
= 5 VERY HARD
```

`DIFFICULTY` always means effort to reach a complete frozen design, not implementation LOC.

```text
RUNTIME CLASS
= RUNTIME / NON_RUNTIME

DESIGN GATE
= NOW
= DEPENDENCY
= POST_M2_3
= POST_M2_4
= EVIDENCE
= EXTERNAL
= FUTURE
= FROZEN
= another explicitly named implementation-bound dependency when required
```

A closed design gate overrides score.

## 3. Apply classification

Apply classification is also universal, but its vocabulary depends only on Runtime Class, not idea family.

For a frozen `RUNTIME` idea:

```text
DOC_APPLICABLE
DOC_APPLIED
DOC_NOT_REQUIRED
DOC_UNASSESSED
```

For a `NON_RUNTIME` idea:

```text
NR_DOC_ONLY
NR_EXECUTABLE
NR_PROTECTED
NR_UNASSESSED
```

Before design freeze, a NON_RUNTIME candidate normally remains `NR_UNASSESSED`; a RUNTIME candidate remains `DOC_UNASSESSED`.

Do not invent parallel terms such as `TYPE=DOC/TOOL/PROTECTED`, `TIMING=NOW_DESIGNABLE`, or system-family-specific readiness classes when the canonical axes already express the same information.

## 4. Universal selection rule

Inside the legitimate candidate/idea lane:

```text
1. DESIGN GATE open
2. IMPORTANCE higher
3. DIFFICULTY lower
4. downstream leverage higher
```

`SIZE` describes scope breadth. It does not override readiness or importance.

## 5. Candidate versus accepted idea

A candidate may be scored/classified before design freeze so it can be compared consistently.

```text
candidate
= classified/scored
!= accepted frozen design
!= implementation authorization
```

Selection flow:

```text
candidate
→ inspect overlap / authority / gate
→ complete bounded design
→ OPEN DESIGN QUESTIONS = 0
→ DESIGN FROZEN
→ confirm/revise SIZE / IMPORTANCE / DIFFICULTY / RUNTIME CLASS / GATE
→ assign applicable freeze-time APPLY CLASS
→ stop design transaction
```

Any provisional classification may change at freeze only when source/design inspection establishes a materially different boundary.

## 6. Family-specific metadata

Idea inventories may carry additional descriptive metadata such as:

```text
Domain
Core value
Owner family
Evidence dependency
Related debt/watch IDs
```

These are metadata only and never replace the canonical classification axes.

## 7. Migration rule

Any existing/new inventory using a separate classification vocabulary must be migrated to this universal model when touched.

Historical point-in-time documents may preserve their old wording, but living candidate/priority inventories must use the unified axes.

## 8. Production boundary

This policy changes classification/administration only.

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
```

## 9. Verdict

```text
ONE IDEA CLASSIFICATION SYSTEM
= ALL SIMCORE IDEA FAMILIES

SIZE + IMPORTANCE + DIFFICULTY + RUNTIME CLASS + DESIGN GATE
+ freeze-time APPLY CLASS
```
