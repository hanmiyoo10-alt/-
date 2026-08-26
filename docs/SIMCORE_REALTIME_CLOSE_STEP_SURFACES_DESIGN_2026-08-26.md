# SimCore Real-Time Close-Step Surfaces — Design — 2026-08-26

Status: `DESIGN FROZEN · REPOSITORY/OPERATIONS ONLY · NO RUNTIME CHANGE · PARTLY ALREADY ACTIVE THROUGH EXISTING AUTHORITIES`

Purpose: identify work that can be maintained during each SimCore task instead of accumulating a later cleanup backlog, while reusing existing authority/tooling and avoiding a second automation system.

Related authority:
- `docs/SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_ANOMALY_WATCH.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_EVIDENCE_INDEX.md`
- `docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX.md`
- `docs/SIMCORE_REGRESSION_FIXTURE_IMPLEMENTATION_PROGRESS_2026-08-26.md`
- `docs/SIMCORE_NR_DIFFICULTY3_HARVEST_VERIFICATION_WATCH_2026-08-26.md`
- `products/simcore/tooling/authority-drift-check.mjs`
- `products/simcore/tooling/stale-pr-hygiene.mjs`
- `products/simcore/tooling/evidence-index.mjs`
- `products/simcore/tooling/sync-state.mjs`

## 1. Design principle

Real-time maintenance means task-close maintenance, not background autonomous mutation.

```text
bounded SimCore work
→ evidence/verification result exists
→ evaluate only affected maintenance surfaces
→ repair/update bounded current-state artifacts immediately
→ preserve historical/frozen evidence
→ stop with repository state internally consistent
```

Do not create a new daemon, polling service, hidden writer, or duplicate release-state system.

## 2. Surface classes

```text
ALWAYS_CLOSE
= evaluate after every substantive SimCore work item

TRIGGERED_CLOSE
= evaluate only when the work touched the relevant evidence/authority surface

SEPARATE_PROTECTED_WORK
= useful idea, but cannot be silently activated as a close-step because it changes CI/release/repository authority

FORBIDDEN_AUTO
= requires semantic judgment, user evidence, or dangerous authority expansion; may be assisted but not mechanically promoted
```

## 3. Frozen surface inventory

### RT-01 Living-document consistency

Class: `ALWAYS_CLOSE / ACTIVE`

Behavior:
- synchronize affected current living authorities;
- remove stale current next-action/status statements;
- preserve frozen design/audit/evidence history.

Existing authority: `SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md`.

### RT-02 Current gate + queue recomputation

Class: `ALWAYS_CLOSE / PROCEDURAL_NOW`

Behavior:
- after a merge, live classification, design freeze, or dependency close, recompute the legitimate open NR/R design and apply queues;
- update `CURRENT GATE-OPEN`, `NEXT`, `EMPTY`, `CLOSED`, or newly opened incremental sweep states immediately;
- never open a gated item from importance score alone.

No new executable tool is required for the procedural version.

### RT-03 Authority-drift close check

Class: `TRIGGERED_CLOSE / EXISTING_TOOL_REUSE`

Trigger:
- production identity/current-priority/current-development/release-operator status changed or was referenced materially.

Behavior:
- reuse S-10 `authority-drift-check.mjs` / existing `sync-state.mjs` semantics;
- classify `AUTHORITY_CLEAN / AUTHORITY_DRIFT / AUTHORITY_BLOCKED`;
- repair bounded living-document drift when safe;
- never create a second production-state checker.

### RT-04 Production boundary receipt

Class: `TRIGGERED_CLOSE / PROCEDURAL_NOW`

Trigger:
- runtime/release work, fixture/tool work claiming production neutrality, or current production status sync.

Confirm as applicable:
```text
release-simcore identity
plugin version
latest.js == install.js
product-manifest production identity
live-gate status
```

A document/tool-only task must not silently claim production neutrality without checking the relevant boundary when the claim is material.

### RT-05 Evidence navigation synchronization

Class: `TRIGGERED_CLOSE / EXISTING_ARTIFACT+TOOL_REUSE`

Trigger:
- new qualifying contract evidence, fixture coverage change, evidence release, or evidence posture change.

Behavior:
- review whether the curated Evidence Index source needs a bounded semantic update;
- use the existing M-13 generator model for generated view consistency;
- do not infer PASS/WATCH/GAP or latest evidence mechanically.

### RT-06 Natural-evidence corpus intake

Class: `TRIGGERED_CLOSE / PROCEDURAL_NOW`

Trigger:
- a new natural production real-chat specimen qualifies under S-12.

Behavior:
- assign a new specimen only when all frozen corpus fields are supportable without guessing;
- preserve recurrence as separate specimen IDs;
- exclude controlled fixtures/CI/provider speculation/raw bodies.

### RT-07 Immediate anomaly capture + disposition propagation

Class: `ALWAYS_CLOSE WHEN LIVE EVIDENCE EXISTS / ACTIVE`

Behavior:
- if a diagnostic/RAW review reveals an anomaly, preserve it before unrelated work;
- classify with the existing WATCH/DEFER/FIX/BLOCKER discipline;
- propagate a changed disposition into affected living queue/gate/debt documents;
- do not convert a one-off WATCH into runtime repair without evidence.

### RT-08 Verification-claim honesty propagation

Class: `ALWAYS_CLOSE WHEN VERIFICATION OCCURS / PROCEDURAL_NOW`

Behavior:
- distinguish `workflow PASS` from `focused semantic test actually executed`;
- if direct execution is not proved, preserve or update the appropriate verification-coverage WATCH;
- never upgrade coverage because a generic CI workflow is green.

This reuses the current S-10/S-11 and Difficulty-3 WATCH doctrine.

### RT-09 Fixture/coverage portfolio synchronization

Class: `TRIGGERED_CLOSE / PROCEDURAL_NOW`

Trigger:
- permanent suite added/expanded/promoted, coverage class changes, registry row changes, or M2 ownership opens a direct executable surface.

Behavior:
- synchronize registry consequence, coverage class, implementation-progress authority, Evidence Index projection if curated, and related migration/watch state;
- preserve `HYBRID_TRANSITIONAL` where the real owner is not directly executable;
- never copy production orchestration into tests just to mark a suite EXECUTABLE.

### RT-10 Work-transaction hygiene receipt

Class: `TRIGGERED_CLOSE / EXISTING_S11_REUSE + PROCEDURAL_NOW`

Behavior:
- after bounded branch/PR work, confirm intended PR state, merge identity/evidence, and whether the work left a clearly superseded/command-only/stale control object;
- reuse S-11 classifications where applicable;
- automatic closing/deleting of arbitrary PRs or branches is NOT authorized by this design.

### RT-11 Gate-unlock propagation

Class: `TRIGGERED_CLOSE / PROCEDURAL_NOW`

Trigger examples:
```text
M2-3 physically closes
M2-4 physically closes
R2.1 genuine release proof lands
new EVIDENCE requirement becomes satisfied
EXTERNAL authoritative receipt appears
```

Behavior:
- enumerate dependent gated ideas;
- move only legitimately unlocked items into a new incremental design sweep;
- perform their design/apply classification under existing policy;
- do not auto-implement newly unlocked items.

### RT-12 Canonical next-operation recomputation

Class: `ALWAYS_CLOSE / PROCEDURAL_NOW`

Behavior:
- end each substantive task with one current primary next operation plus any clearly conditional alternatives;
- completed queues must not remain advertised as next work;
- next operation must respect current gates and authority split.

## 4. What should NOT become an automatic close-step

### Generalized standalone-tool CI discovery

Class: `SEPARATE_PROTECTED_WORK`

Reason:
- changes permanent CI/harness authority;
- existing WATCH explicitly forbids silently widening CI to erase verification debt.

### Automatic PR/branch deletion or closure

Class: `SEPARATE_PROTECTED_WORK`

Reason:
- S-11 is a classifier/review aid, not repository deletion authority.

### Automatic release/publication

Class: `FORBIDDEN_AUTO`

Reason:
- R2.1 delegated operation still requires an explicit user-authorized release work item;
- no background/standing release authority exists.

### Automatic LIVE_PASS / anomaly severity promotion

Class: `FORBIDDEN_AUTO`

Reason:
- real long-chat evidence and semantic forensic review remain required;
- tool output/document consistency cannot manufacture runtime proof.

### Provider/cache/root-cause inference

Class: `FORBIDDEN_AUTO`

Reason:
- local observations do not establish provider/backend facts.

## 5. Recommended close-step order

```text
1. verification result / live evidence classification
2. anomaly capture if applicable
3. production-boundary check if material
4. authority-drift check if relevant
5. evidence / natural-corpus / fixture projections if triggered
6. gate + queue recomputation
7. living-document consistency repair
8. transaction-hygiene check when branch/PR work occurred
9. canonical next-operation recomputation
10. stop
```

This order prevents later derived documents from being updated before the evidence/authority decision they depend on.

## 6. Current adoption recommendation

The following can be treated as assistant operating discipline immediately without runtime/plugin/CI changes:

```text
RT-01 Living-document consistency
RT-02 Gate + queue recomputation
RT-04 Production boundary receipt when material
RT-06 Natural evidence intake when triggered
RT-07 Immediate anomaly capture
RT-08 Verification-claim honesty
RT-09 Fixture/coverage sync when triggered
RT-11 Gate-unlock propagation when triggered
RT-12 Canonical next-operation recomputation
```

The following reuse existing executable NR tools rather than creating new systems:

```text
RT-03 Authority drift → S-10 / sync-state
RT-05 Evidence generated view → M-13
RT-10 Stale PR review → S-11
```

Any effort to wire these into permanent CI, automatic repository mutation, or background scheduling is a separate protected design/implementation item.

## 7. Production boundary

This design changes no production behavior.

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = unchanged / PENDING_REAL_LONG_CHAT
```

## 8. Frozen verdict

```text
REAL-TIME MAINTENANCE
= task-close consistency and evidence discipline
!= background autonomous automation

OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
```
