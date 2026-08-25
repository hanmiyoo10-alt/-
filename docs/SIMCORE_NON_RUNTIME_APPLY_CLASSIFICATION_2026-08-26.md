# SimCore NON_RUNTIME Apply Classification — 2026-08-26

Status: `CANONICAL NON_RUNTIME SUBCLASSIFICATION · IMPLEMENTATION-FORM AXIS · NO RUNTIME CHANGE`

Purpose: classify NON_RUNTIME ideas by the form and authority-risk of their actual implementation so document-only repository memory, executable tooling, and protected repository/build/release surfaces are not treated as one undifferentiated class.

Related authority:
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`

This document does not change an idea's core Runtime Class. Every item listed here remains `NON_RUNTIME` unless the main classification authority is separately changed for a substantive reason.

---

## 1. Canonical two-axis model

NON_RUNTIME ideas are now tracked on two independent axes:

```text
CORE CLASS
= NON_RUNTIME

NR APPLY CLASS
= the implementation form / repository-authority risk of the non-runtime idea
```

Canonical rule:

```text
NON_RUNTIME
!= automatically document-only
!= automatically SAFE_NON_RUNTIME
```

The apply class exists to make that distinction explicit.

---

## 2. NR APPLY status vocabulary

```text
NR_DOC_ONLY
= the useful implementation is entirely non-executable repository memory / documentation
= no script/tool/test harness/build/release/CI authority is required
= examples: curated index, corpus, manual registry, checklist

NR_EXECUTABLE
= the useful implementation includes local executable tooling such as a script, generator, analyzer, formatter, or focused tooling test
= still no plugin/runtime behavior
= requires explicit static/semantic verification appropriate to the tool

NR_PROTECTED
= the idea remains non-runtime but its implementation can alter or police build, release, CI, repository-writer, branch, fixture-authority, or architecture-governance surfaces
= NON_RUNTIME alone does not authorize normal harvest
= requires its own gate and protected implementation transaction

NR_UNASSESSED
= design is not yet frozen or the gate is not sufficiently open to classify the final implementation form defensibly
= do not guess from the idea name alone
```

An idea may be reclassified only when its frozen design establishes a materially different implementation boundary.

---

## 3. Relationship to SAFE_NON_RUNTIME

NR APPLY CLASS and SAFE_NON_RUNTIME answer different questions.

```text
NR APPLY CLASS
= what kind of non-runtime implementation is this?

SAFE_NON_RUNTIME
= may this frozen item be implemented now under the pre-stabilization harvest exception?
```

Typical relationship:

```text
NR_DOC_ONLY
→ often easiest SAFE_NON_RUNTIME candidate

NR_EXECUTABLE
→ may still pass SAFE_NON_RUNTIME, but requires executable-tool verification

NR_PROTECTED
→ normally NOT ordinary SAFE_NON_RUNTIME harvestable merely because plugin bytes stay unchanged

NR_UNASSESSED
→ no implementation authorization
```

No apply class bypasses the design-freeze or gate rules.

---

## 4. Current NR inventory classification

| ID | Idea | Importance | Difficulty | Current state | NR Apply Class | Reason / implementation form |
|---|---|---:|---:|---|---|---|
| S-09 | Evidence Index Entry Format | 5 | 1 | IMPLEMENTED | NR_DOC_ONLY | frozen eight-field contract + initial repository index materialization |
| S-10 | Authority Drift Check / Scan | 5 | 2 | IMPLEMENTED | NR_EXECUTABLE | read-only local authority audit tool |
| M-11 | Architecture Dependency Snapshot Generator | 5 | 3 | IMPLEMENTED | NR_EXECUTABLE | optional deterministic snapshot output from existing checker |
| M-07 | Commit / Observation Separation Guard | 5 | 4 | GATED POST_M2_4 | NR_UNASSESSED | classify after frozen design; likely protected boundary but do not pre-freeze final form |
| M-12 | State Writer Static Audit | 5 | 4 | GATED POST_M2_3 | NR_UNASSESSED | classify after frozen design; static audit may become executable/protected |
| M-16 | Differential Architecture Fixtures | 5 | 4 | GATED M2 implementation slice | NR_UNASSESSED | fixture/test-authority form must be frozen before classification |
| S-12 | Natural Evidence Corpus Index | 4 | 2 | IMPLEMENTED | NR_DOC_ONLY | specimen-centric durable repository index |
| M-10 | Live Diagnostic → Fixture Skeleton Generator | 4 | 3 | IMPLEMENTED | NR_EXECUTABLE | local reviewed-evidence → skeleton generator + schemas/tests |
| M-13 | Evidence Index Generator | 4 | 3 | IMPLEMENTED | NR_EXECUTABLE | curated manifest → deterministic generated index tool |
| M-08 | Snapshot Schema Inventory Generator | 4 | 3 | GATED POST_M2_3 | NR_UNASSESSED | generator form is plausible but final boundary waits for design freeze |
| M-14 | Release Evidence Packet | 4 | 3 | GATED R2.1 genuine release proof | NR_UNASSESSED | evidence packet may be document/tooling; dependency must open first |
| M-15 | Fixture Coverage Matrix by Ownership | 4 | 3 | GATED POST_M2_3 | NR_UNASSESSED | matrix may be document or generated tooling; classify after freeze |
| L-01 | Development-source Modular Build | 4 | 5 | FUTURE / POST_M2 | NR_PROTECTED | build/source topology is inherently protected even without runtime semantics |
| S-11 | Stale PR Hygiene Classifier | 3 | 2 | IMPLEMENTED | NR_EXECUTABLE | offline local PR metadata classifier |

---

## 5. Current counts

```text
NON_RUNTIME total = 14

NR_DOC_ONLY    = 2
NR_EXECUTABLE  = 5
NR_PROTECTED   = 1
NR_UNASSESSED  = 6
```

Current implemented NR set:

```text
DOC_ONLY
S-09
S-12

EXECUTABLE
S-10
S-11
M-10
M-11
M-13
```

Current protected/future known boundary:

```text
L-01
→ NR_PROTECTED
→ FUTURE / POST_M2
```

Gated ideas remain `NR_UNASSESSED` until their own design freeze rather than being guessed into executable/protected categories from their names.

---

## 6. Verification expectations by apply class

### NR_DOC_ONLY

Minimum verification:

```text
referenced paths/IDs resolve
terminology matches frozen authority
no executable/runtime file changed
no fabricated current runtime fact
no release-simcore change
```

### NR_EXECUTABLE

Minimum verification adds:

```text
syntax/static validation
focused deterministic/semantic test where applicable
bounded input/output behavior
failure/fail-closed behavior
no network/writer/runtime authority unless explicitly frozen
CI coverage claim must distinguish actual focused-test execution from generic PR gate PASS
```

### NR_PROTECTED

Minimum treatment:

```text
separate design/gate explicitly authorizing protected authority change
separate implementation transaction
permanent CI / repository / release authority review as applicable
no bundling with product/runtime feature work
```

`NR_PROTECTED` is not a negative label; it means the work has a higher repository-governance blast radius despite remaining non-runtime.

---

## 7. Selection / freeze rule

For every newly frozen NON_RUNTIME idea, the same design-close transaction must now end with:

```text
DESIGN FROZEN
→ classify NR APPLY CLASS
   NR_DOC_ONLY
   NR_EXECUTABLE
   NR_PROTECTED
→ record classification
→ STOP DESIGN WORK
```

If the idea is not frozen:

```text
NR_UNASSESSED
```

Actual implementation remains a later bounded transaction under the normal tier/gate policy.

---

## 8. Relationship to R document classification

The R and NR axes deliberately solve different problems.

```text
R DOC APPLY CLASS
= can a RUNTIME idea have a useful document-only preparation before runtime implementation?

NR APPLY CLASS
= what form does the NON_RUNTIME implementation itself take?
```

Therefore:

```text
RUNTIME + DOC_APPLICABLE
→ runtime core parked; document slice may apply

NON_RUNTIME + NR_DOC_ONLY
→ the non-runtime idea itself is primarily a document/durable-memory implementation
```

Do not collapse the two systems into one status vocabulary.

---

## 9. Current operating verdict

```text
NR is no longer treated as one homogeneous implementation bucket.

NR_DOC_ONLY
→ lowest implementation-form blast radius

NR_EXECUTABLE
→ local executable tooling; stronger verification required

NR_PROTECTED
→ repository/build/release/CI authority boundary; separate protected work

NR_UNASSESSED
→ wait for design freeze
```

Current open NR remains empty because all remaining unimplemented items are gated/future. This classification changes visibility and future handling, not their gates.
