# SimCore Idea Space Classification — 2026-08-26

Status: `IDEA MENU · BROAD ARCHITECTURE RESEARCH REMAINS CLOSED · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Purpose: classify future SimCore ideas without reopening already-closed horizontal architecture research or mixing product, runtime, evidence, and repository concerns.

Current authority remains:

```text
production = release-simcore v0.64.7
current runtime gate = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
next physical architecture checkpoint after gate close = M2-3 Edit Reconcile
broad architecture research = CLOSED
current doc-only drift sweep = CLOSED
```

## 1. Two-axis idea classification

Every new idea should receive both a DOMAIN and a READINESS class.

### DOMAIN

```text
PRODUCT_UX
DIAGNOSTIC_OBSERVABILITY
PERFORMANCE
CORRECTNESS_RELIABILITY
STATE_PERSISTENCE
HOST_PROVIDER_BOUNDARY
DEVELOPER_TOOLING
RELEASE_REPO_OPERATIONS
TEST_EVIDENCE
FUTURE_ARCHITECTURE_EXPERIMENT
```

### READINESS

```text
IDEA_READY_NOW
DESIGN_READY_NOW
IMPLEMENTATION_READY_NON_RUNTIME
LIVE_GATE_BLOCKED
POST_M2_3
POST_M2_4
EVIDENCE_TRIGGERED_ONLY
FUTURE_EXPERIMENT
```

The readiness class is not priority. It only states when useful work is legitimate.

## 2. PRODUCT_UX ideas

### 2.1 MINI_WARNING_WIDGET_V1

Existing narrow candidate.

```text
fixed compact warning badge
hidden when healthy
click opens existing diagnostic surface
uses existing bounded warning observation
no second validator
no polling
```

Readiness: `DESIGN_READY_NOW / RUNTIME_PRODUCT_WHEN_SELECTED`.

### 2.2 Diagnostic Quick Summary

A very small user-facing summary surface for the current finalized observation only.

Possible contents:

```text
runtime ACTIVE/INACTIVE
mode
request/output binding
warning count
current hotspot
mirror status
freshness/binding state
```

It must project existing diagnostic facts rather than recompute them.

Readiness: `IDEA_READY_NOW`.

### 2.3 Diagnostic Copy Profiles

Instead of one monolithic copy target, offer bounded profiles such as:

```text
FULL
CURRENT_TURN
PERFORMANCE
STRUCTURE
CACHE_HISTORY
```

No new semantic authority; only different projections of the same observation instance.

Readiness: `IDEA_READY_NOW`, but should follow the existing Diagnostic UX conformance contracts.

## 3. DIAGNOSTIC_OBSERVABILITY ideas

### 3.1 Turn Transaction Receipt

Expose a bounded application-phase receipt for one completed turn:

```text
bootstrap
edit reconcile
turn prepare
snapshot commit
prompt compile
output compat
structure
finalize
out commit
mirror
```

This is not a new pipeline owner. It is an observation projection over already-existing phases.

Potential value: makes long-chat regressions and ownership migration easier to compare before/after M2.

Readiness: `POST_M2_3` preferred because physical phase ownership will be clearer.

### 3.2 Ownership-aware diagnostic attribution

When a warning or timing hotspot is shown, also expose the canonical semantic owner/application owner from the State Ownership Registry / Application-Service map.

Example:

```text
Narrative clock warning
semantic owner = Time
application phase = Output Finalize
persistence holder = Session/Store
```

Readiness: `POST_M2_3` preferred; do not hard-code speculative ownership before rebase.

### 3.3 Live Evidence Packet Builder

Generate a bounded copyable evidence packet from the current diagnostic observation with identifiers, important facts, and classification placeholders.

Goal: reduce manual transcription when preserving WATCH/FIX/BLOCKER specimens.

Must not retain raw bodies persistently by default.

Readiness: `IDEA_READY_NOW`.

## 4. PERFORMANCE ideas

### 4.1 Genuine Edit Rebuild Performance Study

Direct live evidence already shows genuine manual rebuild around 11–12 seconds in long chat.

Future research question:

```text
where is rebuild time spent?
history scan?
bootstrap reconstruction?
Store reads/writes?
normalization?
application orchestration?
```

This must remain separate from mechanical M2-3 ownership extraction.

Readiness: `POST_M2_3` preferred.

### 4.2 Store Write Cost / Commit Budget

Define bounded performance expectations for:

```text
send snapshot commit
out snapshot commit
prune/housekeeping
backend set variance
```

Do not optimize until natural measurements establish a stable target.

Readiness: `EVIDENCE_TRIGGERED_ONLY`.

### 4.3 Phase Performance Budget

After phase ownership becomes physical, establish regression budgets for deterministic local phases.

Possible use:

```text
warn when a previously local O(1)/bounded phase becomes history-sized
compare pre/post architecture movement
```

Not a user-visible timeout and not a correctness authority.

Readiness: `POST_M2_3`.

## 5. CORRECTNESS_RELIABILITY ideas

### 5.1 State Invariant Snapshot

A bounded debug-only projection of cross-owner invariants after commit, e.g.:

```text
broadcast lock ↔ mode
narrative floor ↔ committed timestamp
frame counters monotonic
trusted output identity tuple coherent
pending cleared after output commit
```

Important: invariant owners remain the domain modules; the snapshot only reports owner-produced facts and must not become a second validator.

Readiness: `POST_M2_4` preferred.

### 5.2 Safe Reconcile Differential Receipt

After M2-3, expose which mutually-exclusive edit route fired:

```text
SAME_FAST
REPRESENTATION_FAST_RECONCILED
USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT
HISTORICAL_RESTORE
REROLL_REPLACEMENT
```

and the bounded reasons/fingerprints that selected it.

This would make genuine-edit vs representation-drift regression evidence much easier to inspect.

Readiness: `POST_M2_3`.

### 5.3 Commit/Observation Separation Guard

Static or diagnostic assurance that observational modules cannot write semantic state and semantic owners cannot silently perform Host transport.

Best implemented as contract/static checking where possible rather than runtime wrappers.

Readiness: `POST_M2_4`.

## 6. STATE_PERSISTENCE ideas

### 6.1 Snapshot Schema Inventory Generator

Generate a human-readable inventory from the actual production state shape:

```text
field
owner
persistent/transient
migration owner
introduced version
retirement status
```

This is developer tooling, not schema redesign.

Readiness: `POST_M2_3` or `POST_M2_4` after ownership settles.

### 6.2 Store Housekeeping Isolation

Already mapped transition debt: deferred prune/running mechanics should eventually live with Store housekeeping rather than constitutional Session state.

This is not a new idea requiring broad research; it is a bounded future cleanup.

Readiness: `POST_M2_3 / M2_4_REBASE`.

### 6.3 Persistence Footprint Watch

Track bounded metadata such as state serialized size / snapshot count trend without storing raw chat bodies.

Useful only if long-chat storage growth becomes an observed problem.

Readiness: `EVIDENCE_TRIGGERED_ONLY`.

## 7. HOST_PROVIDER_BOUNDARY ideas

### 7.1 Host Capability Receipt

A bounded runtime receipt describing only capabilities actually observed in the current host/runtime, not inferred internals.

Examples:

```text
Fresh read available
setChat available
sessionStorage available
clipboard primary/fallback
request handshake observed
```

No provider-internal claims.

Readiness: `IDEA_READY_NOW`, but implementation should be justified by a concrete product/debug need.

### 7.2 Provider Cache Receipt Integration

If a future provider/gateway exposes trustworthy cache metadata, ingest it as external evidence rather than infer cache hit/miss from prompt shape.

Readiness: `EVIDENCE_TRIGGERED_ONLY / EXTERNAL_RECEIPT_REQUIRED`.

### 7.3 History Frontier Confidence Surface

Show the bounded confidence of PRE_SIMCORE / CHAT_HISTORY observation without claiming exact external mutation provenance.

Existing Host/History research already defines evidence limits; this would be a presentation/product slice, not new provenance logic.

Readiness: `IDEA_READY_NOW`, low priority unless users need it.

## 8. DEVELOPER_TOOLING ideas

### 8.1 Live Diagnostic → Fixture Skeleton Generator

Take a manually supplied/captured bounded diagnostic specimen and produce a fixture skeleton with:

```text
fixture id
production version
input facts
expected owner/path
protected invariants
unknowns left intentionally unasserted
```

Human review remains mandatory before permanent test inclusion.

Readiness: `IDEA_READY_NOW`.

### 8.2 Architecture Dependency Snapshot Generator

Generate module dependency edges from production source and compare them to Contracts v2.

Useful for M2-3/M2-4 to prove an extraction removed the intended edge without adding forbidden dependencies.

Readiness: `IDEA_READY_NOW / NON_RUNTIME`.

### 8.3 State Writer Static Audit

Search production source for writes to important state families and compare them against State Ownership Registry v2.

Potential classifications:

```text
AUTHORIZED_OWNER_WRITE
AUTHORIZED_MIGRATION_WRITE
SESSION_ADOPTION_WRITE
UNKNOWN_WRITER
```

Readiness: `POST_M2_3` preferred because the registry requires writer rebase after M2-3.

### 8.4 Evidence Index Generator

Create/update a machine-readable index linking:

```text
contract
live evidence
fixture
release
watch/debt id
status
```

Goal: make long-term repo memory easier to navigate without replacing the evidence documents themselves.

Readiness: `IDEA_READY_NOW / NON_RUNTIME`.

## 9. RELEASE_REPO_OPERATIONS ideas

### 9.1 Automatic Current-Authority Drift Scan

Static check that current-authority docs do not contradict machine-managed production identity and promoted next action.

Historical evidence docs remain exempt.

Readiness: `IDEA_READY_NOW / NON_RUNTIME`.

### 9.2 Stale PR Hygiene Classifier

Non-destructive report that classifies old open PRs as:

```text
ACTIVE
CONTROL_ONLY
HISTORICAL
SAFE_TO_CLOSE_CANDIDATE
UNKNOWN
```

It must never close PRs automatically merely based on age.

Readiness: `IDEA_READY_NOW / NON_RUNTIME`.

### 9.3 Release Evidence Packet

At deployment, create one bounded machine-linked packet containing candidate, approval, publication, manifest convergence, latest/install identity and pending live gate.

R2.1 already owns the release path; this would be evidence presentation, not another release mechanism.

Readiness: `AFTER R2.1 GENUINE_RELEASE_PROOF` preferred.

## 10. TEST_EVIDENCE ideas

### 10.1 Fixture Coverage Matrix by Ownership

Instead of only listing suites, map:

```text
contract → physical owner → fixture mode → live evidence → remaining gap
```

This can immediately show which HYBRID_TRANSITIONAL cases should become EXECUTABLE after M2-3/M2-4.

Readiness: `POST_M2_3` for the most useful version.

### 10.2 Differential Architecture Fixtures

For mechanical ownership moves, encode before/after externally observable equivalence while asserting changed dependency/call-site ownership.

Useful for M2-3 and M2-4.

Readiness: `M2_IMPLEMENTATION_BOUND`.

### 10.3 Natural Evidence Corpus Index

Index natural live specimens by scenario without copying raw unbounded chat content into test fixtures.

Readiness: `IDEA_READY_NOW / NON_RUNTIME`.

## 11. FUTURE_ARCHITECTURE_EXPERIMENT ideas

These are deliberately not current roadmap work.

### 11.1 Development-source modular build

Move from one authored production bundle toward modular development source while keeping deterministic single-file delivery.

Requires M2 behavioral architecture to stabilize first.

Readiness: `FUTURE_EXPERIMENT / POST_M2`.

### 11.2 Pure State Seam

A small lower-level state/schema seam may eventually help retire Kernel upward dependency exceptions.

The seam is not a goal by itself and must be justified by actual dependency inversion work.

Readiness: `TRIGGERED_BY_TD_09`, not standalone.

### 11.3 Performance-aware SnapshotStore evolution

Only after sustained evidence shows Store/backend cost is a real user-facing bottleneck.

Possible future questions include compaction, bounded indexing, write strategy, and migration behavior, but no design is authorized from current evidence.

Readiness: `EVIDENCE_TRIGGERED_ONLY / FUTURE_EXPERIMENT`.

## 12. Ideas explicitly NOT recommended now

Do not create by default:

```text
Generic TurnPipeline
ApplicationManager
StateManager
RuntimeEventBus
second diagnostic validator
second persistence layer
provider cache guesser
background polling system
raw-body long-term telemetry
large generic recovery subsystem
```

These either conflict with already-frozen ownership, duplicate existing authority, or lack evidence.

## 13. Suggested idea-exploration order

If the goal is to continue ideation rather than implementation, the strongest distinct tracks are:

```text
1. DEVELOPER_TOOLING
   architecture dependency snapshot / live→fixture / evidence index

2. PRODUCT_UX
   diagnostic quick summary / copy profiles / warning surface

3. PERFORMANCE
   genuine-edit rebuild study design, but implementation after M2-3

4. CORRECTNESS_RELIABILITY
   post-M2-3 reconcile differential receipt

5. RELEASE_REPO_OPERATIONS
   authority drift scan / PR hygiene classifier

6. FUTURE_ARCHITECTURE_EXPERIMENT
   only as explicitly future, non-promoted exploration
```

## 14. Verdict

```text
BROAD ARCHITECTURE RESEARCH
= REMAINS CLOSED

NEW IDEA SPACE
= OPEN, BUT VERTICAL / BOUNDED

BEST CURRENT IDEA FAMILIES
= DEVELOPER TOOLING
+ PRODUCT UX
+ EVIDENCE PRESENTATION
+ POST-M2 PERFORMANCE
+ RELEASE/REPO SAFETY

IDEA != PROMOTED WORK
IDEA != IMPLEMENTATION AUTHORITY
RUNTIME CHANGE = NONE
```
