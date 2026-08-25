# SimCore S-12 Natural Evidence Corpus — SAFE_NON_RUNTIME Implementation Evidence

Date: 2026-08-26
Status: `SAFE_NON_RUNTIME_IMPLEMENTED · STATIC VERIFIED · MAIN MATERIALIZED · NO RUNTIME CHANGE · NO PLUGIN VERSION CHANGE`

Frozen design: `docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX_DESIGN.md`
Materialized artifact: `docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX.md`
Harvest policy: `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`

## 1. Transaction

```text
working branch: work/s12-natural-evidence-corpus-harvest
implementation commit: c0f8c483da47648612ae0281efb36c22b99317a3
PR: #399 — SimCore: materialize S-12 natural evidence corpus
main squash merge: 0b9113f4d619471167b20077da4e522406665e75
```

The branch added exactly one implementation artifact:

```text
docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX.md
```

## 2. Initial materialization

The first corpus assigns stable specimen IDs only where natural production provenance and first repository-preservation date are established from existing evidence.

Initial rows:

```text
NE-20260822-001
NE-20260823-001
NE-20260823-002
NE-20260823-003
NE-20260823-004
NE-20260823-005
NE-20260823-006
NE-20260823-007
NE-20260823-008
```

Covered natural families include:

```text
representation fast reconcile
COMMUNITY reaction attribution recurrence
reload-boundary provenance-unavailable rebuild WATCH
multiline COMMUNITY repair positive controls
v0.64.6 paired representation-drift/B_END closure control
```

## 3. Frozen schema verification

Expected eleven fields:

```text
Specimen
Captured
Scenario
Production
Observation
Role
Primary Source
Origin
Disposition
Contracts
Record State
```

Materialized table uses exactly those eleven fields and no free-form Notes column.

Verified vocabulary use:

```text
Role ⊆ LIVE_GATE / REGRESSION_CONTROL / ANOMALY / RECOVERY_CONTROL / PERFORMANCE_SAMPLE / QUALITY_SAMPLE
Disposition ⊆ PASS / WATCH / DEFER / FIX / BLOCKER / N/A
Record State = ACTIVE for all initial legitimate records
```

No row uses more than two Roles or more than four Contract/WATCH/debt identifiers.

## 4. Provenance / recurrence verification

The materialization preserves:

```text
Specimen ID = immutable corpus identity
Captured = first repository-preservation date from source evidence
Production = historical production version that produced the event
Origin = first preserved source location
Primary Source = current best direct source
```

Independent natural COMMUNITY attribution recurrences at @2096→@2097, @2098→@2099, and @2100→@2101 receive separate specimen IDs because recurrence count is evidence.

The v0.64.6 B_CONTINUE mismatch + next B_END fast reconcile/closure is represented as one paired specimen because the source explicitly binds the observations into one proof relation and the real B_END occurrence is shared.

## 5. Fail-closed exclusions

The initial corpus deliberately excludes:

```text
controlled genuine-edit validation with ambiguous naturalness
synthetic/permanent fixtures
CI/shadow/release-system evidence
provider cache speculation
historical events whose first-preservation date was not re-established
v0.64.7 reload-cache gate before its required real-long-chat proof exists
```

Canonical interpretation:

```text
row absent != evidence gap
```

## 6. Raw-data boundary

The corpus stores navigation metadata only.

Verified absent by construction:

```text
raw user bodies
raw assistant bodies
full COMMUNITY/Knowledge blocks
full diagnostics
raw Fresh bodies
prompt text
host chat objects
exception stacks
long warning prose
```

## 7. CI / repository verification

PR #399 branch diff:

```text
changed files: 1
docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX.md only
```

SimCore CI:

```text
run: 32891281807
Verify: PASS
Required: PASS
```

The change is repository documentation/navigation only and requires no runtime live validation.

## 8. SAFE_NON_RUNTIME proof

```text
plugins/simcore/latest.js changed: NO
plugins/simcore/install.js changed: NO
plugin version: UNCHANGED
release-simcore: UNCHANGED
runtime semantics: UNCHANGED
Host/prompt/state/schema: UNCHANGED
release workflow authority: UNCHANGED
repo writer authority: UNCHANGED
network behavior: NONE
real long-chat validation: NOT REQUIRED FOR INDEX MATERIALIZATION
current v0.64.7 live gate: UNCHANGED / STILL PENDING
```

## 9. Final disposition

```text
S-12 DESIGN = FROZEN
S-12 IMPLEMENTATION = SAFE_NON_RUNTIME_IMPLEMENTED
MATERIALIZED CORPUS = docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX.md
STATIC / REPO VERIFICATION = PASS
MAIN MERGE = 0b9113f4d619471167b20077da4e522406665e75
RUNTIME CHANGE = NONE
PLUGIN VERSION CHANGE = NONE
release-simcore = UNCHANGED
```
