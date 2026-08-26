# SYS-12 — Current-State Snapshot Page — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · CURRENT-ONLY PROJECTION · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-12
Idea          = Current-State Snapshot Page
Size          = SMALL
Importance    = 4 / HIGH
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct upstream boundaries:
- `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md`
- `docs/SIMCORE_SYS05_HISTORICAL_VS_LIVING_DOCUMENT_REGISTRY_DESIGN.md`
- `docs/SIMCORE_SYS04_STATUS_VOCABULARY_LINTER_DESIGN.md`
- `docs/SIMCORE_SYS02_DECISION_SUPERSESSION_GRAPH_DESIGN.md`

Related current authorities that SYS-12 must project from rather than replace:
- `product-manifest.json`
- `release-simcore`
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_SYSTEM_IDEA_CANDIDATE_INVENTORY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- current release/operator policy and gate authorities as selected by SYS-01

---

## 1. Problem

SimCore deliberately keeps different kinds of current truth in different authorities.

That is correct, but reconstructing the answer to a simple operator question such as:

> What is the exact current state of SimCore right now?

can require reading several living sources while also avoiding historical material preserved in those same documents.

`CURRENT_DEVELOPMENT.md` already provides the authoritative operational continuity document, but it intentionally contains both:

```text
current production / current action / roadmap context
+
historical release and regression evidence
```

It is therefore not intended to be the smallest possible current-only bootstrap surface.

Other current facts live elsewhere:

```text
production identity
→ product-manifest + release-simcore

current operational priority
→ CURRENT_DEVELOPMENT

current system-idea sweep counts / selected next design
→ system inventory + design progress ledger

current deferred/WATCH continuity
→ Deferred / Error Ledger and dedicated evidence/watch authorities

release-system operating state
→ current dedicated release/operator policy and evidence authorities
```

Without one bounded current-only projection, a new operator/session can still make avoidable mistakes:

```text
HISTORICAL BLEED
→ an old release ledger line is mistaken for current state

SUPERSEDED NEXT BLEED
→ a preserved predecessor instruction is mistaken for current NEXT

PARTIAL BOOTSTRAP
→ production is read correctly but the active live gate or parallel design sweep is missed

VALUE RECONSTRUCTION DRIFT
→ two sessions summarize the same authorities differently

SECOND-AUTHORITY DRIFT
→ a convenient summary silently becomes the place where state is decided
```

SYS-12 defines one compact **Current-State Snapshot Page** that projects a bounded set of current facts from their natural authorities.

It is a current-only navigation/value projection, not a new source of truth.

---

## 2. Core invariant

```text
reviewed current authority map
+ reviewed living/historical boundaries
+ reviewed supersession lineage
+ current values from owning authorities
→ one compact current-only projection

SYS-12
!= source of truth
!= replacement for CURRENT_DEVELOPMENT
!= product manifest
!= release identity authority
!= gate engine
!= roadmap authority
!= decision graph
!= stale-state scanner
!= evidence classifier
!= generated Evidence Index
!= repository writer
```

Canonical question:

> What small set of current SimCore facts should a human/session be able to see in one place, and where does each projected fact actually come from?

The page does not answer:

> Which value wins if the snapshot conflicts with its source?

The answer is always:

```text
owning authority wins
snapshot becomes stale / blocked
```

---

## 3. Distinction from CURRENT_DEVELOPMENT.md

This boundary is mandatory because the current operational continuity document already contains a production snapshot and current-state narrative.

```text
CURRENT_DEVELOPMENT.md
= living operational continuity authority
= current state + reasoning + roadmap context + historical validation ledger

SYS-12 snapshot
= thin current-only projection
= no historical ledger
= no independent reasoning
= no new sequencing decision
= every projected row names its owning source
```

SYS-12 may project the current action described by `CURRENT_DEVELOPMENT.md`, but it must never become the place where that action is selected.

If the two disagree:

```text
CURRENT_DEVELOPMENT / owning authority
→ remains authoritative

SYS-12
→ SNAPSHOT_STALE or SNAPSHOT_BLOCKED
```

Do not repair a source-authority conflict by editing only the snapshot.

---

## 4. Inputs and upstream consumption

### 4.1 SYS-01 Living Authority Map

SYS-01 answers where each current concern is owned.

SYS-12 consumes that mapping before projecting a field.

```text
SYS-01
= where to ask

SYS-12
= compact display of selected answers + source refs
```

A field without a resolved current authority is not guessed into the snapshot.

### 4.2 SYS-05 Historical-vs-Living Document Registry

SYS-12 may project only current values from resolved living/current scopes or other source types explicitly valid for the selected fact.

Historical sections are excluded from current-value selection.

Frozen rule:

```text
POINT_IN_TIME_EVIDENCE
HISTORICAL_PLAN
historical section exception
→ never selected merely because it contains a newer-looking or more specific value
```

### 4.3 SYS-02 Decision / Supersession Graph

When predecessor and successor instructions coexist in repository history, SYS-12 uses reviewed supersession lineage to avoid projecting a retired instruction.

It does not infer supersession itself.

### 4.4 SYS-04 Status Vocabulary Linter

SYS-04 may later lint registered structured status fields in a materialized snapshot.

A clean vocabulary result does not prove that a projected value is current or true.

---

## 5. v1 artifact form

The useful v1 application is one small reviewed living document, conceptually:

```text
docs/SIMCORE_CURRENT_STATE_SNAPSHOT.md
```

v1 is intentionally document-only.

No generator, parser, crawler, GitHub API reader, CI rule, automatic freshness monitor, repository writer, or runtime integration is required.

This establishes:

```text
APPLY CLASS = NR_DOC_ONLY
```

A later deterministic generator may be proposed only if manual synchronization cost becomes material and the required source fields are sufficiently structured. That is not SYS-12 v1.

---

## 6. Snapshot content contract

The page contains exactly these eight top-level current-state sections.

```text
1. Snapshot identity / health
2. Production identity
3. Active runtime/live gate
4. Architecture checkpoint / next physical move
5. Current legitimate non-runtime parallel work
6. Current idea-system progress / next design
7. Release-system operational proof posture
8. Immediate operator action / stop boundary
```

No historical release ledger, old roadmap, retired decision, raw diagnostic body, long WATCH corpus, fixture catalog, or implementation history belongs in SYS-12.

The page should normally remain readable without scrolling through large historical sections.

---

## 7. Required v1 projected fields

Minimum stable field IDs:

```text
SNAPSHOT_AS_OF
SNAPSHOT_STATE

PRODUCTION_VERSION
PRODUCTION_RELEASE_NAME
PRODUCTION_RELEASE_BRANCH
PRODUCTION_RELEASE_COMMIT
PRODUCTION_RELEASE_BLOB
PRODUCTION_VALIDATION_STATE

ACTIVE_LIVE_GATE
ACTIVE_MAJOR_PHASE
ACTIVE_ARCHITECTURE_CHECKPOINT
NEXT_PHYSICAL_ARCHITECTURE_MOVE

SAFE_PARALLEL_WORK_POSTURE
SYSTEM_DESIGN_SWEEP_STATE
SYSTEM_DESIGNS_FROZEN
SYSTEM_DESIGN_TOTAL
NEXT_SYSTEM_DESIGN

RELEASE_OPERATOR_STATE
GENUINE_RELEASE_PROOF_STATE

IMMEDIATE_PRIMARY_ACTION
HARD_STOP_BOUNDARY
```

A materialized v1 may omit one optional field when its owning authority says it is not applicable, but it must not invent a substitute value.

---

## 8. Row schema

Every projected current fact uses this conceptual schema:

```text
Field ID
Projected value
Owning authority ref
Supporting / physical ref (optional)
Projection note (optional, one line)
Freshness trigger
```

### 8.1 Projected value

The value is copied/projected from the current owning authority without semantic rewriting that changes meaning.

Examples:

```text
PENDING_REAL_LONG_CHAT
M2-2
SYS-12 Current-State Snapshot Page
ACTIVE · AWAITING GENUINE RELEASE PROOF
```

If a value is compound in its source, the snapshot may render a compact equivalent only when the source meaning remains exact.

### 8.2 Owning authority ref

Required for every semantic field.

The snapshot itself can never be listed as its own owning authority.

### 8.3 Supporting / physical ref

Use when a concern intentionally has a physical/composite confirmation layer, e.g.:

```text
production identity
→ product-manifest declared state
→ release-simcore physical bytes / commit
```

### 8.4 Freshness trigger

One bounded event class requiring snapshot review, e.g.:

```text
release publish / rollback
live-gate classification
checkpoint close/open
current NEXT change
system-design freeze
release-operator proof-state change
safe-parallel-work posture change
```

Ordinary unrelated document edits do not require snapshot changes.

---

## 9. Snapshot state vocabulary

Exactly four v1 page states:

```text
SNAPSHOT_READY
SNAPSHOT_STALE
SNAPSHOT_BLOCKED
SNAPSHOT_REBUILD_REQUIRED
```

### `SNAPSHOT_READY`

All required projected fields have resolved owning authorities and the page has been synchronized with those current values.

Important:

```text
SNAPSHOT_READY
!= runtime PASS
!= live PASS
!= release authorization
!= implementation authorization
```

### `SNAPSHOT_STALE`

At least one owning source has materially changed and the snapshot has not yet been synchronized, while the correct source remains identifiable.

The source wins immediately; the stale page must not be used to override it.

### `SNAPSHOT_BLOCKED`

A required current field cannot be projected without guessing because:
- required authorities conflict;
- lifecycle role is unresolved;
- predecessor/successor currentness is unresolved;
- the current source is missing or ambiguous.

Fail closed.

### `SNAPSHOT_REBUILD_REQUIRED`

The page structure itself no longer matches the current authority model, for example a new canonical state family replaces the old source topology.

This is stronger than one stale value and requires reviewed structural revision rather than clerical synchronization.

---

## 10. Conflict precedence

SYS-12 has no conflict-winning power.

Frozen precedence:

```text
natural owning authority / current policy / physical release authority
> snapshot projection
```

When two upstream current authorities disagree:

```text
SYS-12 must not choose the more recent-looking value
SYS-12 must not average/combine values
SYS-12 must not silently choose the value already displayed

→ SNAPSHOT_BLOCKED
→ resolve underlying authority conflict first
```

When the upstream authority is clear but the page is outdated:

```text
→ SNAPSHOT_STALE
→ synchronize snapshot after the authority is already correct
```

---

## 11. Current SimCore example validating the design

Current repository state demonstrates the useful shape of a snapshot.

Conceptually, a current projection may show:

```text
Production
= v0.64.7 Cross-Reload Cache Observer Continuity

Validation
= PENDING_REAL_LONG_CHAT

Active live gate
= 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT

Checkpoint
= M2-2

Next physical architecture move
= M2-3 Edit Reconcile extraction only after current live-gate close

Safe parallel work
= system-idea NON_RUNTIME design sweep active; application/implementation held

System-design progress
= projected from current system inventory / progress ledger

R2.1
= delegated operation active / genuine release E2E proof pending on next genuine runtime release
```

These are design examples of field families, not authorization to materialize or refresh the page inside this design transaction.

The exact values in a future snapshot must be read from current authorities at application time.

---

## 12. Explicit exclusions

SYS-12 must never contain or become:

```text
historical validation ledger
full roadmap
all deferred/WATCH entries
full evidence index
all fixture status
all design candidates
all PR/branch state
raw diagnostic payloads
release publication command
implementation plan body
supersession graph body
gate dependency graph body
source-of-truth value ownership
```

If a human needs the full context, the snapshot points to the owning source.

The page is intentionally small.

---

## 13. Update discipline

Snapshot update order is frozen:

```text
1. owning authority changes / closes / publishes
2. owning authority is verified
3. SYS-01 / SYS-05 / SYS-02 implications reviewed when material
4. snapshot fields synchronized
5. snapshot state returns to SNAPSHOT_READY
```

Never:

```text
edit snapshot first
→ use snapshot as permission to change the source later
```

A close-step that changes one of the registered freshness triggers must review SYS-12 once materialized.

Clerical formatting changes that do not change values or source relationships do not create a new decision.

---

## 14. Relationship to stale-state tooling

SYS-12 is not S-10 Authority Drift Check and not SYS-10 Stale Next-Action Scanner.

```text
S-10
= selected authority contradiction/drift checking

SYS-10
= stale NEXT/action scanning

SYS-12
= one current-only projection page
```

A future tool may use S-10/SYS-10 outputs to warn that the snapshot needs review, but SYS-12 v1 has no executable coupling.

---

## 15. Relationship to user handoff

SYS-47 User Handoff Card answers:

```text
what does the user need to do / decide / wait for in this bounded task?
```

SYS-12 answers:

```text
what is the compact current repository/project state across selected concern families?
```

A user handoff may cite the snapshot for convenience but must still derive task identity/action posture from SYS-46/SYS-47 and exact live experiment semantics from SYS-19.

Snapshot state never creates a user action requirement by itself.

---

## 16. Verification plan for later NR_DOC_ONLY application

When `SIMCORE_CURRENT_STATE_SNAPSHOT.md` is materialized, verify at least:

```text
1. every projected field has an explicit owning authority ref
2. every owning path/ref resolves
3. production identity matches product-manifest + release-simcore physical authority
4. current validation/gate matches current operational authority
5. current checkpoint / next physical move matches CURRENT_DEVELOPMENT
6. system-design counts and NEXT match the current inventory/progress ledger
7. historical sections are not used as current-value sources
8. reviewed superseded decisions are not projected as current instruction
9. no snapshot field becomes a new source-of-truth owner
10. no large history/evidence corpus is copied into the page
11. unresolved upstream conflicts yield SNAPSHOT_BLOCKED rather than guessed values
12. no runtime/plugin/release/CI/repository-writer behavior changes
```

No real long-chat validation is required solely for SYS-12.

---

## 17. Why NR_DOC_ONLY

The provisional classification resolves to:

```text
SIZE          = SMALL
IMPORTANCE    = 4
DIFFICULTY    = 2
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Reason:
- the core value is one concise human/operator current-state projection;
- current facts already exist in reviewed authorities;
- v1 requires no parser/generator to establish useful navigation value;
- automation would increase source-parsing and freshness complexity beyond the SMALL/D2 design intent;
- no CI/release/repository-writer/runtime authority is required.

---

## 18. Downstream leverage / next-selection effect

SYS-12 closes the first compact current-state projection on top of:

```text
SYS-01 authority ownership
SYS-05 lifecycle roles
SYS-04 status namespace hygiene
SYS-02 explicit supersession lineage
```

Later systems may consume the snapshot as a navigation surface, but they must not treat it as semantic authority.

In particular:
- SYS-07 Cross-Reference Integrity Auditor may validate snapshot refs later;
- SYS-06 Evidence-to-Decision Trace Map may expose links from current decisions into evidence without embedding evidence in SYS-12;
- workflow handoffs may use the page as a fast orientation surface.

After SYS-12 freeze, recompute the remaining gate-open I4/D2 edge rather than assuming a fixed order.

Current provisional downstream-leverage recommendation after SYS-12:

```text
NEXT = SYS-28 Verification Debt Index
```

Reason: SYS-28 can compose the already-frozen proof-scope, required-evidence-slot, test-intent, and current-state surfaces into a bounded view of known verification debt without conflating WATCH/non-claim with current blockers. It has broader immediate pre-M2-3 / pre-release leverage than the remaining I4/D2 candidates.

---

## 19. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
APPLICATION = NOT STARTED
```

Per Design Sweep First, stop this idea here.

Materialization of `docs/SIMCORE_CURRENT_STATE_SNAPSHOT.md` is a later separate NR application transaction after the active system-idea design sweep closes or priority explicitly changes.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
