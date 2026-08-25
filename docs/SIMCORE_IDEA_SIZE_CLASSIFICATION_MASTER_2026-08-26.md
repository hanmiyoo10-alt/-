# SimCore Idea Size Classification Master — 2026-08-26

Status: `MASTER IDEA INVENTORY · LARGE / MEDIUM / SMALL · DESIGN-FIRST ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Purpose: consolidate the currently recorded SimCore idea space into one size-based inventory so future design work can be selected deliberately without confusing idea size, implementation priority, or readiness.

Canonical policy: `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`.

Broad architecture research remains closed. This inventory does not reopen generic architecture ideation.

---

## 1. Size means scope, not priority

Every idea receives a size based on the breadth of authority and verification it would eventually touch.

### SMALL

Typical shape:

```text
one primary user/operator problem
one bounded surface / report / receipt / projection
one primary owner, or a read-only projection over existing facts
no new persistence schema by default
no foundational ownership move
no new generic subsystem
usually one dedicated design document is enough to freeze it
```

A SMALL idea may still require runtime release work later. `SMALL` does not mean `safe to implement immediately`.

### MEDIUM

Typical shape:

```text
multiple existing owners or modules must cooperate
or one developer/repository tool must reconcile several authorities
or an external/provider boundary is involved
or meaningful new regression/static verification is required
but no broad foundational architecture rewrite is intended
```

A MEDIUM idea normally needs a more detailed contract, dependency map, failure model, and verification plan before design freeze.

### LARGE

Typical shape:

```text
changes development/build/storage architecture
or alters a foundational persistence strategy
or spans several major ownership domains and migration/compatibility concerns
or would naturally require multiple bounded implementation stages
```

Because broad architecture research is closed, LARGE ideas are deliberately rare and remain future/triggered candidates unless explicitly selected later.

---

## 2. Size and readiness are separate

Size never overrides readiness.

Examples:

```text
SMALL + POST_M2_3
= small idea, but cannot be safely frozen yet

MEDIUM + IDEA_READY_NOW
= design can be completed now, implementation still parked

LARGE + FUTURE_EXPERIMENT
= preserve the candidate only; do not promote it into present work
```

For every selected idea:

```text
SELECT
→ COMPLETE FULL DESIGN
→ DESIGN FROZEN
→ PARKED FOR STABILIZATION
→ STOP
```

No implementation follows automatically.

---

# 3. SMALL ideas

Current count: `12`

## S-01 MINI_WARNING_WIDGET_V1

Domain: `PRODUCT_UX / DIAGNOSTIC`

Why SMALL:
- one compact warning surface;
- existing warning facts only;
- no second validator or polling authority.

Readiness: `DESIGN_READY_NOW`.

## S-02 Diagnostic Quick Summary

Domain: `PRODUCT_UX / DIAGNOSTIC`

Surface:

```text
ACTIVE / INACTIVE
Mode
binding
Warnings
request hotspot
mirror result
```

Why SMALL: read-only projection over already-existing bounded diagnostic facts.

Readiness: `DESIGN_READY_NOW`.

## S-03 Diagnostic Copy Profiles

Domain: `PRODUCT_UX / OPERATOR`

Profiles may include:

```text
FULL
CURRENT_TURN
PERFORMANCE
STRUCTURE
CACHE_HISTORY
```

Why SMALL: formatting/filtering of one authoritative diagnostic observation; no semantic recomputation.

Readiness: `DESIGN_READY_NOW`.

## S-04 Live Evidence Packet Builder

Domain: `DIAGNOSTIC_OBSERVABILITY / EVIDENCE`

Why SMALL: produces one bounded copyable evidence packet from an existing diagnostic observation; does not create new runtime truth.

Readiness: `DESIGN_READY_NOW`.

## S-05 Reconcile Differential Receipt

Domain: `CORRECTNESS / DIAGNOSTIC`

Routes:

```text
SAME_FAST
REPRESENTATION_FAST_RECONCILED
USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT
HISTORICAL_RESTORE
REROLL_REPLACEMENT
```

Why SMALL: one bounded decision receipt owned by the eventual `edit-reconcile` service.

Readiness: `CANDIDATE ONLY · POST_M2_3 PHYSICAL OWNER STABLE`.

## S-06 Persistence Footprint Watch

Domain: `STATE_PERSISTENCE / OBSERVABILITY`

Why SMALL: bounded serialized-size/snapshot-count trend only; no raw body retention and no storage redesign.

Readiness: `EVIDENCE_TRIGGERED_ONLY`.

## S-07 Host Capability Receipt

Domain: `HOST_PROVIDER_BOUNDARY / DIAGNOSTIC`

Possible facts:

```text
Fresh read available
setChat available
sessionStorage available
clipboard path available
request handshake observed
```

Why SMALL: capability observation receipt only; no claims about Host/provider internals.

Readiness: `DESIGN_READY_NOW`, implementation requires a concrete product/debug need.

## S-08 History Frontier Confidence Surface

Domain: `HOST_PROVIDER_BOUNDARY / PRODUCT`

Why SMALL: presentation of already-bounded PRE_SIMCORE / CHAT_HISTORY confidence; no new provenance algorithm.

Readiness: `DESIGN_READY_NOW · LOW PRIORITY`.

## S-09 Evidence Index Entry Format

Domain: `EVIDENCE / REPO_MEMORY`

Entry contract:

```text
contract ID
semantic owner
latest live evidence
fixture/suite ID
release/version
PASS / WATCH / GAP
related debt/watch ID
```

Why SMALL: defines the index schema only; existing evidence documents remain authority.

Readiness: `DESIGN_READY_NOW`.

## S-10 Authority Drift Check / Scan — bounded first version

Domain: `RELEASE_REPO_OPERATIONS / REPO_SAFETY`

Initial current-authority set:

```text
product-manifest identity
CURRENT_DEVELOPMENT production/live gate
release-simcore observed production identity
R2.1 current operational status
```

Why SMALL: read-only contradiction report; no automatic rewrite and historical documents are excluded.

Readiness: `DESIGN_READY_NOW / NON_RUNTIME`.

## S-11 Stale PR Hygiene Classifier

Domain: `RELEASE_REPO_OPERATIONS`

Classes:

```text
ACTIVE
CONTROL_ONLY
HISTORICAL
SAFE_TO_CLOSE_CANDIDATE
UNKNOWN
```

Why SMALL: non-destructive classification report only; never closes by age automatically.

Readiness: `DESIGN_READY_NOW / NON_RUNTIME`.

## S-12 Natural Evidence Corpus Index

Domain: `TEST_EVIDENCE / REPO_MEMORY`

Why SMALL: indexes natural live specimens by scenario/document without copying unbounded raw chat bodies.

Readiness: `DESIGN_READY_NOW / NON_RUNTIME`.

---

# 4. MEDIUM ideas

Current count: `17`

## M-01 Turn Transaction Receipt / Turn Phase Receipt

Domain: `DIAGNOSTIC_OBSERVABILITY`

Phases may include:

```text
bootstrap
edit reconcile
turn prepare
request snapshot
prompt
output compat
structure
finalize
output snapshot
mirror
```

Why MEDIUM: one receipt spans many application/runtime owners even though it must remain observation-only.

Readiness: `POST_M2_3 PHYSICAL FLOW STABLE`.

## M-02 Ownership-aware Diagnostic Attribution

Domain: `DIAGNOSTIC_OBSERVABILITY / ARCHITECTURE EVIDENCE`

Example:

```text
semantic owner = Time
application phase = Output Finalize
persistence holder = Session / Store
```

Why MEDIUM: must reconcile several ownership registries/maps with actual post-M2 physical placement.

Readiness: `POST_M2_3`.

## M-03 Genuine Edit Rebuild Performance Study

Domain: `PERFORMANCE`

Question:

```text
where do the observed ~11–12 second rebuilds spend time?
```

Why MEDIUM: performance attribution may cross edit-reconcile, history reconstruction, Store, normalization, and application sequencing.

Readiness: `POST_M2_3`, separate from mechanical M2-3 extraction.

## M-04 Store Write Cost / Commit Budget

Domain: `PERFORMANCE / STATE_PERSISTENCE`

Scope:

```text
send snapshot commit
out snapshot commit
prune / housekeeping
backend set variance
```

Why MEDIUM: needs representative measurements and several persistence operations, but does not redesign Store.

Readiness: `EVIDENCE_TRIGGERED_ONLY`.

## M-05 Phase Performance Budget

Domain: `PERFORMANCE / OBSERVABILITY`

Why MEDIUM: requires stable physical phase ownership plus regression thresholds across several deterministic local phases.

Readiness: `POST_M2_3`.

## M-06 State Invariant Snapshot

Domain: `CORRECTNESS_RELIABILITY / DIAGNOSTIC`

Potential invariant projections:

```text
broadcast lock ↔ mode
narrative floor ↔ committed timestamp
Frame monotonicity
trusted output identity tuple coherence
pending cleared after commit
```

Why MEDIUM: reports cross-owner invariants and therefore must avoid becoming a second validator.

Readiness: `POST_M2_4` preferred.

## M-07 Commit / Observation Separation Guard

Domain: `CORRECTNESS_RELIABILITY / STATIC SAFETY`

Why MEDIUM: static/contract checks must distinguish semantic writes, observer-only modules, and Host transport across multiple module classes.

Readiness: `POST_M2_4`.

## M-08 Snapshot Schema Inventory Generator

Domain: `STATE_PERSISTENCE / DEVELOPER_TOOLING`

Inventory:

```text
field
semantic owner
persistent/transient
migration owner
introduced version
retirement status
```

Why MEDIUM: machine-generated inventory reconciles source shape with ownership and migration metadata.

Readiness: `POST_M2_3 / POST_M2_4` after ownership settles.

## M-09 Provider Cache Receipt Integration

Domain: `HOST_PROVIDER_BOUNDARY`

Why MEDIUM: runtime integration may be mechanically small, but authority is external and the contract must preserve `provider cache UNVERIFIED` when trustworthy receipt evidence is absent.

Readiness: `EXTERNAL_RECEIPT_REQUIRED / EVIDENCE_TRIGGERED_ONLY`.

## M-10 Live Diagnostic → Fixture Skeleton Generator

Domain: `DEVELOPER_TOOLING / TEST_EVIDENCE`

Output skeleton:

```text
fixture id
production version
input facts
expected owner/path
protected invariants
unknowns intentionally unasserted
```

Why MEDIUM: bridges live diagnostic evidence into test structure and requires careful prevention of over-assertion.

Readiness: `DESIGN_READY_NOW / NON_RUNTIME`.

## M-11 Architecture Dependency Snapshot Generator

Domain: `DEVELOPER_TOOLING / ARCHITECTURE EVIDENCE`

Why MEDIUM: extracts production dependency edges and compares them against Contracts v2, including before/after M2 proofs.

Readiness: `DESIGN_READY_NOW / NON_RUNTIME`.

## M-12 State Writer Static Audit

Domain: `DEVELOPER_TOOLING / CORRECTNESS`

Potential classes:

```text
AUTHORIZED_OWNER_WRITE
AUTHORIZED_MIGRATION_WRITE
SESSION_ADOPTION_WRITE
UNKNOWN_WRITER
```

Why MEDIUM: reconciles physical writes with State Ownership Registry v2 and migration/application exceptions.

Readiness: `POST_M2_3` preferred.

## M-13 Evidence Index Generator

Domain: `DEVELOPER_TOOLING / REPO_MEMORY`

Why MEDIUM: automation over the SMALL `Evidence Index Entry Format`; must discover/update links without becoming a second roadmap/evidence authority.

Readiness: `DESIGNABLE AFTER S-09 FORMAT IS FROZEN`.

## M-14 Release Evidence Packet

Domain: `RELEASE_REPO_OPERATIONS / EVIDENCE`

Packet may link:

```text
candidate
approval
publication
manifest convergence
latest/install identity
LIVE_PENDING gate
```

Why MEDIUM: presentation only, but spans several release authorities and machine receipts.

Readiness: `AFTER R2.1 GENUINE_RELEASE_PROOF` preferred.

## M-15 Fixture Coverage Matrix by Ownership

Domain: `TEST_EVIDENCE`

Map:

```text
contract → physical owner → fixture mode → live evidence → remaining gap
```

Why MEDIUM: crosses architecture ownership, permanent fixtures, and live evidence status.

Readiness: `POST_M2_3` for the useful frozen form.

## M-16 Differential Architecture Fixtures

Domain: `TEST_EVIDENCE / ARCHITECTURE`

Why MEDIUM: must prove behavioral equivalence while separately proving dependency/call-site ownership changed as intended.

Readiness: `M2_IMPLEMENTATION_BOUND`; candidate design should freeze only against the actual implementation slice being prepared.

## M-17 Pure State Seam

Domain: `FUTURE_ARCHITECTURE_EXPERIMENT`

Why MEDIUM rather than LARGE: the target seam should remain deliberately narrow and only retire specific Kernel upward dependency edges; it is not a new StateManager or schema framework.

Readiness: `TRIGGERED_BY_TD_09`; not standalone current work.

---

# 5. LARGE ideas

Current count: `2`

The small number is intentional. Broad architecture research is closed, so the repository should not accumulate many speculative large rewrites.

## L-01 Development-source Modular Build

Domain: `FUTURE_ARCHITECTURE_EXPERIMENT / BUILD`

Concept:

```text
modular authored development source
→ deterministic build
→ single-file SimCore delivery artifact
```

Why LARGE:
- changes source-authoring/build topology;
- touches architecture testing and release verification;
- must preserve deterministic `latest.js == install.js` delivery;
- must not be mixed with runtime behavior changes;
- likely needs staged adoption and rollback/equivalence proof.

Readiness: `FUTURE_EXPERIMENT / POST_M2`.

## L-02 Performance-aware SnapshotStore Evolution

Domain: `FUTURE_ARCHITECTURE_EXPERIMENT / STATE_PERSISTENCE / PERFORMANCE`

Potential future questions only if evidence warrants them:

```text
compaction
bounded indexing
write strategy
retention behavior
migration compatibility
```

Why LARGE:
- changes foundational persistence mechanics;
- may affect migration, retention, long-chat performance, and failure recovery;
- would require strong natural performance evidence and multi-stage regression/live proof.

Readiness: `EVIDENCE_TRIGGERED_ONLY / FUTURE_EXPERIMENT`.

No present design is authorized merely from the existence of this candidate.

---

# 6. Items intentionally NOT treated as new ideas

These may be real future work, but they already belong to an established roadmap/debt/fix track and should not inflate the idea inventory.

```text
M2-3 Edit Reconcile extraction
M2-4A/B/C/D/E ownership narrowing
summary-scope / narrative-clock / frame permanent fixture implementation
broadcast-closure fixture expansion
TD-13 Prompt read-only compile cleanup
TD-14 structured Evidence eligibility handoff
TD-05 Representation/Output Compat label coupling
Recovery facade retirement
Store housekeeping relocation
Diagnostic Snapshot Freshness repair
current natural WATCH specimens
R2.1 genuine release proof
```

Rule:

```text
already-mapped work/debt/fix
≠ new idea candidate
```

`Store Housekeeping Isolation`, for example, remains transition debt rather than a new medium-sized idea.

---

# 7. Master count

```text
SMALL   = 12
MEDIUM  = 17
LARGE   = 2
----------------
TOTAL SIZE-CLASSIFIED IDEA UNITS = 31
```

The count includes the SMALL evidence-index contract and its separate MEDIUM automation follow-on because they are independently selectable design units:

```text
S-09 Evidence Index Entry Format
→ freeze the authority/schema contract first

M-13 Evidence Index Generator
→ later automation must conform to S-09
```

---

# 8. Recommended design order by size

Current idea/design phase should normally consume the smallest fully designable candidates first.

Recommended pattern:

```text
SMALL designable-now
→ freeze one by one
→ then MEDIUM designable-now
→ milestone-gated SMALL/MEDIUM only when their gate opens
→ LARGE only after explicit future selection + prerequisites
```

Best immediate SMALL design queue:

```text
S-02 Diagnostic Quick Summary
S-09 Evidence Index Entry Format
S-10 Authority Drift Check
S-03 Diagnostic Copy Profiles
S-04 Live Evidence Packet Builder
S-11 Stale PR Hygiene Classifier
S-12 Natural Evidence Corpus Index
S-07 Host Capability Receipt
S-08 History Frontier Confidence Surface
```

`S-01 MINI_WARNING_WIDGET_V1` is also small and designable, but it already has substantial prior Diagnostic UX research and should be handled as its own dedicated frozen product design when selected.

Best current MEDIUM designable-now candidates:

```text
M-10 Live Diagnostic → Fixture Skeleton Generator
M-11 Architecture Dependency Snapshot Generator
```

Most other MEDIUM candidates should wait for M2-3/M2-4 or evidence gates so their designs can genuinely satisfy the freeze policy.

---

# 9. Selection discipline

Do not select several ideas at once merely because they share a size.

Canonical workflow:

```text
pick exactly one idea ID
→ create/fill its dedicated design document
→ resolve all applicable design-freeze checklist items
→ DESIGN FROZEN
→ PARKED FOR STABILIZATION
→ STOP
→ only then select another idea
```

If a SMALL idea expands until it needs several owners, migrations, or broad architecture changes, stop and reclassify it before freezing.

If a MEDIUM idea starts demanding a generic subsystem or foundational rewrite, stop and determine whether it has become LARGE or is simply a bad abstraction.

---

# 10. Forbidden size inflation

Do not combine multiple small/medium ideas into one fake LARGE initiative such as:

```text
Diagnostic Platform
Evidence Platform
Authority Manager
Developer Tools Framework
Observability Pipeline
State Management Rewrite
```

The size map exists to preserve independent bounded designs, not to justify umbrella systems.

---

# 11. Verdict

```text
CURRENT IDEA SPACE
= 31 SIZE-CLASSIFIED DESIGN UNITS

SMALL
= 12

MEDIUM
= 17

LARGE
= 2

LARGE SPACE INTENTIONALLY SPARSE
= YES

BROAD ARCHITECTURE RESEARCH
= STILL CLOSED

SELECTED IDEA RULE
= FULL DESIGN → FROZEN → PARKED → STOP

IMPLEMENTATION DURING CURRENT IDEA PHASE
= NONE
```
