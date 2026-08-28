# Local Usage Dashboard — Long-Term Memory Canonical Idea Family

Status: **CANONICAL IDEA CONSOLIDATION / DESIGN PROVENANCE — NOT IMPLEMENTATION AUTHORITY**

Tracking issue: #653
Canonical idea warehouse: `docs/USAGE_DASHBOARD_IDEA_LIST.md`
Repository precedent: MEM-01 / #463

## Purpose

The long-term-memory brainstorm produced 90 useful atomic ideas. Keeping all 90 as permanent warehouse IDs would create overlapping owners and make design/implementation sequencing noisy.

This document compresses those atomic ideas into **14 canonical Local Usage Dashboard idea owners**. The atomic labels `M-01..M-90` remain provenance only.

Hard invariant:

> Every atomic brainstorm item maps to exactly one canonical owner. No duplicate owner, no missing item.

This is idea classification only. It does not create a runtime memory store, consume a product version, authorize implementation, or change release/production authority.

## Architectural principle inherited from repository memory

Canonical Main MEM-01 (#463) already established a useful repository-side memory principle:

`raw evidence -> distilled working memory -> durable accepted documentation`

and, critically:

`repository / Git / CI / release / project authority > remembered text`

Local Usage Dashboard may reuse that principle, but repository memory is **not** product runtime authority. A future product memory feature must define its own source, privacy, identity, lifecycle and persistence contracts.

The intended product principle is:

> Memory is an evidence-backed index and continuity aid. Remembering a fact never upgrades it above the authority that originally proved it.

## Canonical classification

### No product version update required

#### `NV-MEMORY-INTEGRITY-QUALITY` — Memory Integrity, Coverage & Quality Audit

- Importance: **높음**
- Difficulty: **높음**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-52, M-53, M-54, M-55, M-56, M-57, M-89, M-90

Scope:
- duplicate/orphan/broken-reference/chronology audits;
- memory coverage checks;
- retrieval regression corpus;
- long-chat continuity validation;
- quality scorecard;
- memory-system runtime/static self-audit.

Why no version:
- the canonical item is evidence/audit/test infrastructure only;
- it may inspect future memory behavior but does not itself change shipped Plugin/Engine/Manager bytes.

Boundary:
- if a discovered defect requires runtime repair, that repair belongs to a versioned memory owner below.

---

### Product version update required

#### `V-MEMORY-SESSION-CONTINUITY` — Session Checkpoint, Resume & Unresolved Threads

- Importance: **높음**
- Difficulty: **중간**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-02, M-21, M-22, M-42

Owns:
- session checkpoint/resume packets;
- unresolved-thread memory;
- open-question memory;
- bounded session bootstrap packet.

Does not own retrieval scoring or canonical truth reconciliation.

#### `V-MEMORY-OBSERVABILITY` — Search, Diff, Health & Retrieval Diagnostics

- Importance: **높음**
- Difficulty: **중간**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-07, M-41, M-48, M-49, M-50, M-51

Owns:
- last-seen memory delta;
- memory diff viewer;
- memory search UI;
- health capsule;
- retrieval diagnostics;
- retrieval trace.

Observability is read/presentation ownership. It must not mutate canonical memory merely because it detects a problem.

#### `V-MEMORY-CORE-TAXONOMY` — Layered Memory Core & Taxonomy

- Importance: **최상**
- Difficulty: **높음**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-01, M-10, M-11, M-12, M-13, M-14, M-18, M-19, M-20

Owns the basic logical model:
- layered memory architecture;
- episodic / semantic / procedural / decision classes;
- entity memory;
- topic memory;
- timeline relationships;
- dependency relationships.

It must not silently decide evidence truth, privacy eligibility or retention policy; those are separate owners below.

#### `V-MEMORY-POLICY-SCOPE` — Preference, Constraint & Scope Memory

- Importance: **최상**
- Difficulty: **높음**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-15, M-16, M-17

Owns:
- preference memory;
- stronger constraint/invariant memory;
- repo/plugin/feature/release/session scope isolation.

A preference must never be promoted into a hard constraint merely because it is repeated. Scope isolation must be explicit and fail closed on ambiguity.

#### `V-MEMORY-TRUTH-RECONCILIATION` — Provenance, UNKNOWN, Supersession & Conflict Reconciliation

- Importance: **최상**
- Difficulty: **높음**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-03, M-23, M-24, M-25, M-26, M-27, M-28, M-29, M-30, M-31

Owns:
- memory provenance graph;
- assumption vs proven-fact separation;
- explicit UNKNOWN memory;
- why-remembered provenance;
- confidence/evidence grade;
- stale-memory detection;
- supersession relations;
- conflict detection;
- contradiction resolution using authority/evidence ordering.

Hard rule:
- newer timestamp alone never overrides stronger authority;
- UNKNOWN is first-class and must not be collapsed into false/zero/default.

#### `V-MEMORY-PRIVACY-TRUST` — Privacy, Trust & Persistence Boundaries

- Importance: **최상**
- Difficulty: **높음**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-58, M-59, M-60, M-61, M-62, M-63

Owns:
- memory-poisoning guard;
- untrusted-memory quarantine;
- secret/PII scanner;
- privacy scope labels;
- local-only memory layer;
- repository-safe projection.

Default posture:
- untrusted text is not canonical memory;
- secrets/credentials are never durable memory;
- public-repo-safe and local-only memory are separate persistence classes.

#### `V-MEMORY-LIFECYCLE-COMPACTION` — Promotion, Compaction, Forgetting & History Lifecycle

- Importance: **최상**
- Difficulty: **높음**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-08, M-32, M-33, M-34, M-35, M-36, M-37, M-38, M-39

Owns:
- noise-suppressed memory digest;
- duplicate merge;
- compaction;
- promotion pipeline;
- demotion;
- forgetting policy;
- pinned memory;
- tombstones;
- memory revision history.

Deletion is never the default repair for conflict. Supersession/tombstones preserve historical intent where required.

#### `V-MEMORY-RETRIEVAL-CONTEXT` — Exact Retrieval, Routing & Context Budget

- Importance: **최상**
- Difficulty: **높음**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-43, M-44, M-45, M-46, M-47

Owns:
- intent-aware memory routing;
- bounded context budget management;
- deterministic retrieval scoring;
- exact-identity-first retrieval;
- bounded related-memory expansion.

Hard rule:
- exact version/SHA/issue identity outranks fuzzy semantic recall when the user asks about that exact identity.

#### `V-MEMORY-HUMAN-AUTOMATION` — Human Review, Suggestions & Evidence-reactivation Automation

- Importance: **높음**
- Difficulty: **높음**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-09, M-71, M-72, M-73, M-74, M-75, M-76, M-77

Owns:
- memory-backed idea inventory bridge;
- human review queue;
- suggested memory;
- suggested forgetting;
- decision revisit trigger;
- evidence-arrival reactivation;
- memory-to-idea bridge;
- memory-to-work bridge.

Automation may suggest and route. It does not gain implementation/release authority from memory confidence alone.

#### `V-MEMORY-RELEASE-DIAGNOSTIC` — Release, Physical, Diagnostic & Baseline Memory Integration

- Importance: **높음**
- Difficulty: **높음**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-78, M-79, M-80, M-81, M-82, M-83, M-84, M-85, M-86, M-87, M-88

Owns:
- post-release memory snapshots;
- physical evidence memory;
- failure->repair pairs;
- failed-attempt memory;
- operational playbook memory;
- memory-assisted update notes;
- user-feedback memory;
- diagnostic-evidence memory;
- performance baselines;
- behavior baselines;
- feature-adoption evidence.

This owner must preserve the existing separation between deployment completion and physical acceptance.

#### `V-MEMORY-CROSS-REPO-INDEX` — Cross-repo Canonical Knowledge Index

- Importance: **중간**
- Difficulty: **높음**
- State: **CAPTURED / CONSOLIDATED**
- Atomic provenance: M-04

Owns a higher-level searchable index across repositories/workspaces while preserving each repository's authority, permissions and privacy boundary.

It must not copy mutable production truth into a second global authority.

#### `V-MEMORY-SNAPSHOT-ROLLBACK` — Known-good Snapshot, Replay & Safe Memory Rollback

- Importance: **최상**
- Difficulty: **매우 높음**
- State: **CAPTURED / CONSOLIDATED / LATE**
- Atomic provenance: M-05, M-06, M-40

Owns:
- historical replay of memory state;
- known-good memory snapshots;
- rollback after proven memory corruption.

Rollback requires explicit identity, conflict handling, validation and idempotency. It is intentionally separated from ordinary compaction/history.

#### `V-MEMORY-PORTABILITY-SYNC` — Import/Export, Offline-first & Cross-device Sync

- Importance: **높음**
- Difficulty: **매우 높음**
- State: **CAPTURED / CONSOLIDATED / LATE**
- Atomic provenance: M-64, M-65, M-66, M-67, M-68, M-69, M-70

Owns:
- memory import/export;
- schema migration contract;
- cross-device synchronization;
- offline-first reconciliation;
- sync receipts;
- memory sync incidents;
- sync circuit breaker.

Cross-device synchronization is deliberately late because concurrent revisions, offline writes, privacy and conflict resolution must already be proven.

## Exact 90 -> 14 mapping

| Canonical owner | Atomic brainstorm provenance |
| --- | --- |
| `V-MEMORY-CORE-TAXONOMY` | M-01, M-10, M-11, M-12, M-13, M-14, M-18, M-19, M-20 |
| `V-MEMORY-POLICY-SCOPE` | M-15, M-16, M-17 |
| `V-MEMORY-TRUTH-RECONCILIATION` | M-03, M-23, M-24, M-25, M-26, M-27, M-28, M-29, M-30, M-31 |
| `V-MEMORY-PRIVACY-TRUST` | M-58, M-59, M-60, M-61, M-62, M-63 |
| `V-MEMORY-LIFECYCLE-COMPACTION` | M-08, M-32, M-33, M-34, M-35, M-36, M-37, M-38, M-39 |
| `V-MEMORY-RETRIEVAL-CONTEXT` | M-43, M-44, M-45, M-46, M-47 |
| `V-MEMORY-SESSION-CONTINUITY` | M-02, M-21, M-22, M-42 |
| `V-MEMORY-OBSERVABILITY` | M-07, M-41, M-48, M-49, M-50, M-51 |
| `V-MEMORY-PORTABILITY-SYNC` | M-64, M-65, M-66, M-67, M-68, M-69, M-70 |
| `V-MEMORY-HUMAN-AUTOMATION` | M-09, M-71, M-72, M-73, M-74, M-75, M-76, M-77 |
| `V-MEMORY-RELEASE-DIAGNOSTIC` | M-78, M-79, M-80, M-81, M-82, M-83, M-84, M-85, M-86, M-87, M-88 |
| `V-MEMORY-SNAPSHOT-ROLLBACK` | M-05, M-06, M-40 |
| `V-MEMORY-CROSS-REPO-INDEX` | M-04 |
| `NV-MEMORY-INTEGRITY-QUALITY` | M-52, M-53, M-54, M-55, M-56, M-57, M-89, M-90 |

Coverage invariant:

- atomic inputs: 90
- mapped inputs: 90
- duplicate mappings: 0
- missing mappings: 0

## Dependency spine

This is architecture dependency, not automatic release order:

```text
V-MEMORY-POLICY-SCOPE
+ V-MEMORY-PRIVACY-TRUST
+ V-MEMORY-TRUTH-RECONCILIATION
        ↓
V-MEMORY-CORE-TAXONOMY
        ↓
V-MEMORY-LIFECYCLE-COMPACTION
        ↓
V-MEMORY-RETRIEVAL-CONTEXT
        ↓
V-MEMORY-SESSION-CONTINUITY / V-MEMORY-OBSERVABILITY
        ↓
V-MEMORY-HUMAN-AUTOMATION / V-MEMORY-RELEASE-DIAGNOSTIC
```

Late branches:

```text
core + truth + lifecycle -> V-MEMORY-SNAPSHOT-ROLLBACK
core + privacy + truth + migration -> V-MEMORY-PORTABILITY-SYNC
mature scoped authorities -> V-MEMORY-CROSS-REPO-INDEX
```

`NV-MEMORY-INTEGRITY-QUALITY` can begin as repository-only design/test work whenever there is concrete memory surface to audit. Its results never authorize runtime mutation by themselves.

## Suggested design batches

The existing warehouse rule still applies: same importance + same difficulty items are designed as a group before implementation-batch promotion.

### Batch M-A — 최상 / 높음

- `V-MEMORY-CORE-TAXONOMY`
- `V-MEMORY-POLICY-SCOPE`
- `V-MEMORY-TRUTH-RECONCILIATION`
- `V-MEMORY-PRIVACY-TRUST`
- `V-MEMORY-LIFECYCLE-COMPACTION`
- `V-MEMORY-RETRIEVAL-CONTEXT`

This is the foundational design batch. **Design all six before implementing any one of them**, because each constrains the others' source, privacy, retention and context semantics.

### Batch M-B — 높음 / 중간

- `V-MEMORY-SESSION-CONTINUITY`
- `V-MEMORY-OBSERVABILITY`

### Batch M-C — 높음 / 높음

- `NV-MEMORY-INTEGRITY-QUALITY` belongs to no-version work and may be designed separately under its own version-impact class.
- `V-MEMORY-HUMAN-AUTOMATION`
- `V-MEMORY-RELEASE-DIAGNOSTIC`

Do not mix the NV item into a product release merely because importance/difficulty match.

### Batch M-D — late / very high

- `V-MEMORY-SNAPSHOT-ROLLBACK`
- `V-MEMORY-PORTABILITY-SYNC`

Different importance means separate batch readiness under the existing warehouse rule, despite both being very-high difficulty.

### Independent later item

- `V-MEMORY-CROSS-REPO-INDEX` — medium importance / high difficulty; only after local scope/authority boundaries are mature.

## Non-goals of this consolidation

- no 5.84 or other product version reservation;
- no storage schema selection;
- no database/vector-store choice;
- no embedding/model dependency selection;
- no automatic memory capture;
- no automatic memory deletion;
- no cross-device sync implementation;
- no runtime polling/background worker;
- no new network endpoint;
- no release-control E-generation change;
- no claim that Canonical Main #462/#463 memory is product memory.

## Next design trigger

The next safe step is not implementation. It is the **M-A foundational design batch**. Each of the six M-A ideas must independently define:

1. exact source/authority hierarchy;
2. persisted vs transient data model;
3. UNKNOWN/conflict/supersession rules;
4. privacy/secret retention boundary;
5. identity/dedupe semantics;
6. bounded lifecycle/retention behavior;
7. retrieval/context implications;
8. regression plan;
9. runtime audit impact;
10. physical acceptance where applicable.

Only after all six are `DESIGN READY` may the foundation be considered `IMPLEMENTATION BATCH READY` under the existing idea-warehouse process.
