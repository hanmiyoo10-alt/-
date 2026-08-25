# SimCore M-13 Evidence Index Generator — SAFE_NON_RUNTIME Implementation Evidence

Date: 2026-08-26
Status: `SAFE_NON_RUNTIME_IMPLEMENTED · MAIN MERGED · CI PASS · GENERATED INDEX ACTIVE · VERIFICATION-COVERAGE WATCH · NO RUNTIME CHANGE`

Frozen design: `docs/SIMCORE_EVIDENCE_INDEX_GENERATOR_DESIGN.md`
S-09 schema authority: `docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`

## Transaction

```text
working branch: work/m13-evidence-index-generator-harvest
implementation head: 7b1e2593ddcb2aaf99edea23c68ca4f64968ce01
PR: #408
main squash merge: 534cfbea9142988913fae5dbcabb322a892192e0
changed files: 5
```

Implemented artifacts:

```text
products/simcore/evidence/evidence-index-source-v1.json
products/simcore/evidence/evidence-index-source-v1.schema.json
products/simcore/tooling/evidence-index.mjs
products/simcore/tooling/test-evidence-index.mjs
docs/SIMCORE_EVIDENCE_INDEX.md
```

## Authority split implemented

```text
contract/evidence/gate/debt documents
= semantic + evidence authority

evidence-index-source-v1.json
= reviewed index-curation source only

docs/SIMCORE_EVIDENCE_INDEX.md
= deterministic generated human navigation view
```

M-13 performs mechanical validation and rendering only.

Forbidden logic remains absent:

```text
repo-wide evidence discovery
latest-evidence selection
Owner inference
PASS/WATCH/GAP inference
fixture existence → PASS inference
semantic contradiction reconciliation
auto-commit / auto-PR / release publication
```

## Mechanical validation implemented

The generator validates:

```text
schemaVersion = 1
exact source/entry fields
bounded unique lower-kebab Contract keys
PASS / WATCH / GAP status vocabulary
repository-relative Authority and Live Evidence paths resolve
fixtureId resolves in products/simcore/tests/registry.mjs
fixture coverage is EXECUTABLE or HYBRID_TRANSITIONAL
Live Evidence null ↔ Evidence Release null
Related identifiers are bounded and unique
WATCH has Live Evidence or Related context
```

Fixture execution class is not duplicated in the curation source. It is resolved from the current permanent registry at render time.

## CLI implemented

```text
node products/simcore/tooling/evidence-index.mjs --check
node products/simcore/tooling/evidence-index.mjs --write
```

`--check` is read-only and returns `INDEX_CLEAN` or `INDEX_RENDER_DRIFT` after all source/reference/fixture validation.

`--write` validates and renders in memory first, then atomically replaces only the generated Markdown target.

It does not mutate the source manifest, evidence authorities, fixture registry, roadmap/debt/WATCH docs, plugin files, or release branch.

## S-09 migration equivalence

The current six reviewed S-09 rows were transcribed without adding new rows or changing semantic projections:

```text
representation-fast
genuine-edit
community-reaction
broadcast-closure
diagnostic-copy
reload-cache-continuity
```

Preserved for every row:

```text
Contract
Owner
Authority
Live Evidence
Fixture ID
Evidence Release
Status
Related
```

The generated view now sorts rows lexically by Contract and Related identifiers lexically by ID.

Contract-specific interpretation prose from the prior hand-maintained index was not copied into generator logic. The referenced contract/evidence documents remain authority for those meanings and constraints.

## Verification

PR-level permanent CI:

```text
SimCore CI run: 32895316264
Verify: PASS
Required: PASS
```

Existing permanent static/architecture/regression behavior remained healthy.

## Verification-coverage WATCH

Focused source:

```text
products/simcore/tooling/test-evidence-index.mjs
```

Current permanent CI does not provide evidence that this focused standalone tooling test itself, or the generator `--check` mode, was directly invoked during the PR gate.

Therefore:

```text
focused M-13 semantic test execution by current CI: NOT CLAIMED
generator --check execution by current CI: NOT CLAIMED
```

Classification:

```text
WATCH_ONLY / VERIFICATION_COVERAGE / NON_RUNTIME / NON_BLOCKING
```

Do not restructure CI discovery/release authority inside M-13 merely to remove this WATCH.

## Runtime isolation

```text
plugins/simcore/latest.js: UNCHANGED
plugins/simcore/install.js: UNCHANGED
plugin version: UNCHANGED
release-simcore: UNCHANGED
runtime semantics: UNCHANGED
fixture registry: READ-ONLY dependency / UNCHANGED
```

## Verdict

```text
M-13 DESIGN = FROZEN
M-13 SAFE_NON_RUNTIME REVIEW = PASS
M-13 IMPLEMENTATION = COMPLETE
S-09 GENERATED MAINTENANCE = ACTIVE
REAL LONG-CHAT VALIDATION = NOT REQUIRED
```
