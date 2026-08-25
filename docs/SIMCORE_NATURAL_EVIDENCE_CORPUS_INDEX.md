# SimCore Natural Evidence Corpus Index

Status: `CANONICAL SPECIMEN NAVIGATION INDEX · S-12 MATERIALIZED · INITIAL BOUNDED COVERAGE · NON_RUNTIME`

Schema authority: `docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX_DESIGN.md`

Purpose: catalog reviewed **natural production real-chat specimens** without copying raw chat bodies and without replacing the source evidence documents that own interpretation, proof, and governance classification.

## Coverage rule

This first materialization is deliberately conservative.

```text
row present
= repository evidence establishes one natural production specimen + its bounded provenance

row absent
!= evidence gap
!= no natural occurrence
!= deprecated scenario
```

Controlled live tests, synthetic fixtures, CI/shadow evidence, and specimens whose naturalness or first-preservation date cannot be established are intentionally omitted.

## Canonical corpus

| Specimen | Captured | Scenario | Production | Observation | Role | Primary Source | Origin | Disposition | Contracts | Record State |
|---|---|---|---|---|---|---|---|---|---|---|
| NE-20260822-001 | 2026-08-22 | REPRESENTATION_FAST_RECONCILE | v0.64.3 | mt4giy5r-34f2jf · @2088→@2091 paired | REGRESSION_CONTROL | docs/SIMCORE_LIVE_06403_BROADCAST_SEQUENCE.md §3–4 | docs/SIMCORE_LIVE_06403_BROADCAST_SEQUENCE.md §3–4 | PASS | representation-fast, TD-01 | ACTIVE |
| NE-20260823-001 | 2026-08-23 | COMMUNITY_REACTION_ATTRIBUTION | v0.64.4 | @2096→@2097 | ANOMALY | docs/SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md §2 | docs/SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md §2 | FIX | community-reaction | ACTIVE |
| NE-20260823-002 | 2026-08-23 | COMMUNITY_REACTION_ATTRIBUTION | v0.64.4 | @2098→@2099 | ANOMALY | docs/SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md §2 | docs/SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md §2 | FIX | community-reaction | ACTIVE |
| NE-20260823-003 | 2026-08-23 | COMMUNITY_REACTION_ATTRIBUTION | v0.64.4 | @2100→@2101 | LIVE_GATE+ANOMALY | docs/SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md §2–4 | docs/SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md §2–4 | FIX | community-reaction | ACTIVE |
| NE-20260823-004 | 2026-08-23 | RELOAD_BOUNDARY_PROVENANCE_UNAVAILABLE_REBUILD | v0.64.5 | mt5f2ppq-s4v9mn · @2108 | ANOMALY+PERFORMANCE_SAMPLE | docs/SIMCORE_LIVE_06405_VALIDATION.md §4 | docs/SIMCORE_LIVE_06405_VALIDATION.md §4 | WATCH | WATCH:RELOAD_BOUNDARY_PROVENANCE_UNAVAILABLE_REBUILD, TD-01 | ACTIVE |
| NE-20260823-005 | 2026-08-23 | COMMUNITY_MULTILINE_REACTION_UNIT | v0.64.5 | mt5f2ppq-s4v9mn · @2110→@2111 | LIVE_GATE+REGRESSION_CONTROL | docs/SIMCORE_LIVE_06405_VALIDATION.md §2 | docs/SIMCORE_LIVE_06405_VALIDATION.md §2 | PASS | community-reaction | ACTIVE |
| NE-20260823-006 | 2026-08-23 | COMMUNITY_MULTILINE_REACTION_UNIT | v0.64.5 | mt5f2ppq-s4v9mn · @2112→@2113 | LIVE_GATE+REGRESSION_CONTROL | docs/SIMCORE_LIVE_06405_VALIDATION.md §2 | docs/SIMCORE_LIVE_06405_VALIDATION.md §2 | PASS | community-reaction | ACTIVE |
| NE-20260823-007 | 2026-08-23 | COMMUNITY_MULTILINE_REACTION_UNIT | v0.64.5 | mt5f2ppq-s4v9mn · @2116→@2117 | LIVE_GATE+REGRESSION_CONTROL | docs/SIMCORE_LIVE_06405_VALIDATION.md §2 | docs/SIMCORE_LIVE_06405_VALIDATION.md §2 | PASS | community-reaction, broadcast-closure | ACTIVE |
| NE-20260823-008 | 2026-08-23 | B_CONTINUE_FRESH_REPRESENTATION_DRIFT | v0.64.6 | mt5hq654-5fn0so · @2136→@2139 paired | LIVE_GATE+REGRESSION_CONTROL | docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md §3–5 | docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md §3–5 | PASS | representation-fast, broadcast-closure, TD-01, TD-12 | ACTIVE |

## Materialization notes

### v0.64.3 representation carryover

`NE-20260822-001` is one paired proof unit because the source explicitly relates the natural output representation mismatch at @2088→@2089 to the next B_END request @2090→@2091, where the visible body exactly matched prior Fresh and took `REPRESENTATION_FAST_RECONCILED` with snapshot unchanged.

The corpus stores only the bounded runtime/turn reference, not fingerprints or response bodies.

### v0.64.4 COMMUNITY recurrence

`NE-20260823-001` through `003` are separate specimen IDs because the same validator-attribution failure recurred on three independent natural production turns. Recurrence count is evidence and must not be collapsed into one row.

The source classifies the root cause as a `FIX`; the corpus projects that existing disposition without independently judging severity.

### v0.64.5 repaired multiline controls

`NE-20260823-005` through `007` are independent natural production controls for the multiline/bilingual logical-comment validation repair. They remain separate because each is a distinct real occurrence and the source presents them as separate direct positive controls.

### Reload-boundary performance WATCH

`NE-20260823-004` records only the bounded natural first-request reload-boundary observation. The source explicitly classifies it `WATCH / PERFORMANCE_ONLY` with no correctness failure established. The corpus therefore preserves `WATCH`; it does not promote the sample into a defect or optimization mandate.

### v0.64.6 paired representation/closure proof

`NE-20260823-008` is one bounded paired specimen. The source explicitly connects the B_CONTINUE output mismatch to the next B_END fast reconcile, and that same B_END also produced a clean closure. Because the real event is shared, the corpus keeps one specimen and links both materially informed contracts rather than inventing two IDs for the same request/output occurrence.

## Deliberate exclusions from initial materialization

The first index intentionally does not include:

```text
controlled genuine-edit validation specimens whose naturalness is not explicit enough
synthetic/permanent fixtures
CI/release/shadow transactions
provider-cache hypotheses without direct receipt
historical events whose first repository-preservation date was not re-established during this harvest
current v0.64.7 reload-cache gate before its required real-long-chat evidence exists
```

These exclusions are fail-closed indexing, not negative evidence.

## Update discipline

Add a new row only when all eleven frozen fields can be resolved from repository evidence without guessing.

For an existing specimen:

```text
Specimen ID    immutable
Captured       immutable
Origin         immutable
Primary Source may improve
Disposition    changes only with authority-backed reclassification
Contracts      changes only when an established relationship becomes explicit
Record State   remains ACTIVE unless RETRACTED or DUPLICATE is proven
```

Repeated occurrences of the same scenario receive new specimen IDs.
Multiple documents describing the same real event do not.

## Hard boundary

This corpus must never contain:

```text
raw user prose
raw assistant output
full COMMUNITY/Knowledge blocks
full diagnostics
raw Fresh bodies
prompt text
host chat objects
exception stacks
long warning prose
```

It is a repository navigation surface only.
