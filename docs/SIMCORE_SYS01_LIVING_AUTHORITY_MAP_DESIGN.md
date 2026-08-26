# SYS-01 — Living Authority Map — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-01
Idea          = Living Authority Map
Size          = SMALL
Importance    = 5 / VERY HIGH
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`

Existing authority systems that this design must compose with rather than replace:
- `product-manifest.json`
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md`
- `docs/SIMCORE_REALTIME_CLOSE_STEP_OPERATING_ROUTINE.md`
- S-10 Authority Drift Check / `sync-state.mjs`
- M-13 Evidence Index Generator

---

## 1. Problem

SimCore intentionally splits authority by concern:

```text
release-simcore
= deployed plugin code / release bytes

product-manifest.json
= declared production identity / current machine-readable release state

CURRENT_DEVELOPMENT.md
= active operational continuity / current work context

policy / contract / ledger / evidence documents
= concern-specific authority
```

That split is healthy, but it forces each new work session to remember which current-state question belongs to which source.

The recurring failure mode is not merely stale text. It is **authority lookup ambiguity**:

```text
question: "what is production?"
→ release bytes + manifest identity

question: "what do we do next?"
→ current operational / selection authority

question: "is this evidence PASS/WATCH/GAP?"
→ evidence authority, not manifest

question: "is a runtime behavior really deployed?"
→ release-simcore + real diagnostics, not main mirror prose
```

SYS-01 defines one compact living map from **state family / question** to the authority that owns the answer.

It is a navigation contract only. It does not duplicate the values owned by those authorities.

---

## 2. Core invariant

```text
Living Authority Map
= where to ask
!= the answer itself
```

The map may say:

```text
PRODUCTION_IDENTITY
→ primary authority: product-manifest.json
→ physical runtime confirmation: release-simcore latest/install
```

but must not itself become the canonical holder of:

```text
production_version = 0.64.7
release_commit = ...
live gate = ...
```

Those values stay in their owning sources.

A stale map entry is `AUTHORITY_MAP_DRIFT`; the map never wins a conflict against the authority it points to.

---

## 3. Distinction from related systems

### 3.1 product-manifest `source_of_truth`

`product-manifest.json` already contains a useful bounded source-of-truth map for production/development concerns.

SYS-01 must not replace or duplicate that machine identity surface.

```text
product-manifest.source_of_truth
= machine-readable release/current product authority relationships required by release-state management

SYS-01
= broader human/operator navigation across all living SimCore concern families
```

Where the manifest already names an authority, SYS-01 references that relationship rather than creating a competing one.

### 3.2 S-10 Authority Drift Check

```text
SYS-01
= declares which source owns which family

S-10
= checks selected current authorities for contradiction
```

SYS-01 does not perform release identity verification or drift scans.
S-10 may later use the map as reviewed metadata only if separately designed; v1 creates no executable dependency.

### 3.3 SYS-05 Historical-vs-Living Document Registry

```text
SYS-01 key
= STATE FAMILY / QUESTION
→ authority source(s)

SYS-05 key
= DOCUMENT
→ lifecycle / document-role classification
```

SYS-01 is not a repository-wide document catalog.
A document absent from SYS-01 is not therefore historical or unimportant.

### 3.4 M-13 Evidence Index

```text
SYS-01
= where evidence authority/navigation lives

M-13 Evidence Index
= curated/generated navigation among contract evidence rows
```

SYS-01 must not duplicate evidence rows, fixture IDs, PASS/WATCH/GAP judgments, or latest evidence selection.

---

## 4. v1 artifact form

The useful v1 implementation is one reviewed living repository document, conceptually:

```text
docs/SIMCORE_LIVING_AUTHORITY_MAP.md
```

No executable generator, parser, schema file, CI rule, or writer is required for v1.

The document is updated through the active SimCore close-step routine when an authority relationship materially changes.

Historical/frozen evidence is never rewritten merely to keep this map current.

---

## 5. Entry schema

Each v1 entry has exactly these fields:

```text
Family ID
Question
Primary authority
Supporting / physical authority
Branch / authority domain
Authority role
Update trigger
Explicit non-authorities
Notes / dependency
```

### 5.1 Family ID

Stable upper-snake identifier, e.g.:

```text
PRODUCTION_RUNTIME_BYTES
PRODUCTION_IDENTITY
CURRENT_OPERATIONAL_PRIORITY
CURRENT_DESIGN_SELECTION
CURRENT_IDEA_PROGRESS
CURRENT_ANOMALY_DISPOSITION
EVIDENCE_NAVIGATION
NATURAL_EVIDENCE_CORPUS
ARCHITECTURE_CONTRACT
RELEASE_OPERATOR_POLICY
PERMANENT_FIXTURE_REGISTRY
```

Family IDs identify lookup concerns only; they are not semantic owner IDs inside plugin runtime.

### 5.2 Question

One short operator question answered by the authority family, e.g.:

```text
"What plugin bytes are actually deployed?"
"What is the declared production version/release identity?"
"What is the current legitimate next work?"
"Where is the current WATCH/FIX/BLOCKER disposition recorded?"
```

### 5.3 Primary authority

Exactly one primary source when the concern has one.

If the concern intentionally requires a composite authority, represent it explicitly as a bounded tuple rather than choosing a fake winner.

Example:

```text
PRODUCTION_RUNTIME_BEHAVIOR
primary/composite:
- release-simcore production code
- real long-chat diagnostics for observed runtime behavior
```

### 5.4 Supporting / physical authority

Optional secondary source used for confirmation or physical realization.

Examples:
- `release-simcore` bytes supporting manifest identity;
- generated Evidence Index view supporting curated evidence source navigation;
- registry implementation supporting fixture-progress documentation.

Supporting authority must never be described as co-equal if the source contract says otherwise.

### 5.5 Branch / authority domain

Allowed v1 values:

```text
RELEASE_SIMCORE
MAIN
COMPOSITE
EXTERNAL
```

This is navigation metadata only.

### 5.6 Authority role

Allowed v1 vocabulary:

```text
PRIMARY
COMPOSITE_PRIMARY
PHYSICAL_AUTHORITY
LIVING_OPERATIONAL
POLICY_AUTHORITY
CONTRACT_AUTHORITY
EVIDENCE_AUTHORITY
GENERATED_NAVIGATION
REGISTRY_AUTHORITY
SUPPORTING_EVIDENCE
```

The vocabulary describes the relation within the entry and does not replace future SYS-05 document lifecycle classification.

### 5.7 Update trigger

One bounded event class that requires map review, such as:

```text
release publication / rollback
current priority change
new canonical queue authority
policy authority replacement
new generated-navigation authority
fixture registry authority change
architecture contract replacement
```

The map is not updated merely because a referenced document receives an ordinary content edit.

### 5.8 Explicit non-authorities

This field prevents common mistakes.

Examples:

```text
main/plugins/simcore/* mirror
historical release evidence
frozen design docs
generated navigation view when semantic source exists elsewhere
old audit snapshots
```

Do not create an exhaustive blacklist; record only high-risk confusions relevant to the family.

---

## 6. Required v1 authority families

The first materialized map must cover at least these families.

### A. Production / release

```text
PRODUCTION_RUNTIME_BYTES
PRODUCTION_IDENTITY
PRODUCTION_RUNTIME_BEHAVIOR
CURRENT_LIVE_GATE
RELEASE_PUBLICATION_AUTHORITY
RELEASE_OPERATOR_POLICY
```

### B. Current work / idea system

```text
CURRENT_OPERATIONAL_PRIORITY
UNIFIED_IDEA_CLASSIFICATION
CURRENT_IDEA_SELECTION
CURRENT_IDEA_DESIGN_PROGRESS
CURRENT_DESIGN_SWEEP
NR_APPLY_CLASSIFICATION
R_DOC_APPLY_CLASSIFICATION
```

### C. Evidence / anomaly

```text
CURRENT_ANOMALY_DISPOSITION
EVIDENCE_SEMANTIC_AUTHORITY
EVIDENCE_NAVIGATION
NATURAL_EVIDENCE_CORPUS
VERIFICATION_COVERAGE_WATCH
```

### D. Architecture / fixtures

```text
ARCHITECTURE_CONTRACT
ARCHITECTURE_MACHINE_CONTRACT
PERMANENT_FIXTURE_REGISTRY
FIXTURE_IMPLEMENTATION_PROGRESS
```

### E. Operating policy

```text
DEVELOPMENT_GUIDELINES
DOCUMENT_CONSISTENCY_POLICY
REALTIME_CLOSE_STEP_ROUTINE
```

The v1 list is bounded. New families are added only when repeated lookup ambiguity justifies them.

---

## 7. Conflict / ambiguity behavior

### AUTHORITY_MAP_CLEAN

Use when every listed family has a resolvable authority relationship and all referenced sources exist.

### AUTHORITY_MAP_DRIFT

Use when the map points to a source that is no longer the current owner or describes the wrong authority relationship.

Example:

```text
map says old priority document owns CURRENT_IDEA_SELECTION
but a newer canonical queue explicitly superseded it
→ AUTHORITY_MAP_DRIFT
```

### AUTHORITY_MAP_BLOCKED

Use when the current repository cannot determine a unique or explicitly composite authority without guessing.

Rule:

```text
ambiguity
!= choose newest-looking document
```

Repair the underlying authority conflict first, then update the map.

These are map-maintenance states only; they do not replace project anomaly severity `WATCH / DEFER / FIX / BLOCKER`.

---

## 8. Update discipline

The map is a living document and therefore participates in the active close-step routine.

Review it when a task changes any of:

```text
canonical authority document
release/deployment ownership
current selection/queue authority
policy authority
fixture/evidence navigation authority
branch authority split
```

Do not touch it for ordinary implementation details that leave authority relationships unchanged.

Recommended close-step relation:

```text
authority relationship changed
→ update owning source first
→ verify owning source state
→ update Living Authority Map
→ recompute NEXT / living-doc consistency
```

Never update the map first and then treat it as permission to change the real authority.

---

## 9. Hard boundaries

SYS-01 must never become:

```text
second product manifest
second sync-state registry
release identity checker
repo-wide document registry
historical-document classifier
Evidence Index replacement
roadmap / priority authority
automatic document writer
GitHub/repository writer
release publisher
runtime/plugin feature
source-of-truth value cache
```

The map carries **references and relationships**, not duplicated current values.

---

## 10. Verification plan for later document application

When `SIMCORE_LIVING_AUTHORITY_MAP.md` is materialized, verify at least:

```text
1. every primary/supporting path exists or is an explicit branch/code authority
2. release-simcore is the physical production code/deployment authority
3. product-manifest remains declared release identity authority
4. CURRENT_DEVELOPMENT remains living operational continuity authority where current work context is concerned
5. current idea selection points to the actual canonical queue/inventory authority, not an old audit
6. frozen/historical documents are not presented as current authority
7. generated navigation is labelled as navigation when a separate semantic authority exists
8. composite authorities are explicit and bounded
9. no production values are copied merely for convenience
10. no plugin/runtime/release/CI/repo-writer behavior changes
```

A manual table review is sufficient for v1.
No real long-chat validation is required solely for SYS-01.

---

## 11. Future automation boundary

If maintaining the map manually later becomes materially costly, a separate idea may propose:

```text
reviewed authority-map source
→ bounded cross-reference/path validation
→ deterministic human view
```

That future tool must not infer semantic ownership from filenames, timestamps, or newest commits.
It must also compose with S-10/sync-state rather than duplicate production-state verification.

Automation is not part of SYS-01 v1.

---

## 12. Unified classification freeze verdict

Source/design inspection confirms the provisional classification:

```text
SIZE          = SMALL
IMPORTANCE    = 5
DIFFICULTY    = 2
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- the useful v1 implementation is a living navigation document;
- authority values stay in existing sources;
- no executable checker/generator is needed to obtain the core value;
- no CI/release/repository writer authority changes are required.

---

## 13. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION/APPLICATION = NOT STARTED
```

Per Design Sweep First, stop this idea here. Materialization of `docs/SIMCORE_LIVING_AUTHORITY_MAP.md` is a separate NR application transaction after the active system-idea design sweep closes.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
