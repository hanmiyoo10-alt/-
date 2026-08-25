# SimCore Release System v2 Plan

Status: **HISTORICAL BASE PLAN · IMPLEMENTATION HAS ADVANCED BEYOND THIS SNAPSHOT · NON-RUNTIME**

Authority class: historical release-infrastructure design baseline

Current status note:

- this document preserves the original Release System v2 design and phased adoption rationale;
- it is **not** the current operational-status authority for RS2/R2.1;
- Release System v2 infrastructure has advanced through later dedicated design, implementation, qualification, promotion, and delegated-operator documents;
- R2.1 delegated operation is currently `ACTIVE · IMPLEMENTED · PERMANENT-CI QUALIFIED · AWAITING GENUINE RELEASE PROOF`;
- the next genuine runtime release must provide the remaining end-to-end operational proof;
- current production sequencing is defined by `docs/CURRENT_DEVELOPMENT.md`, not by historical “current action” prose preserved in this base plan.

Current authorities:

- runtime behavior: `release-simcore` production source
- release identity: `product-manifest.json`
- immediate development action: `docs/CURRENT_DEVELOPMENT.md`
- durable development principles: `docs/SIMCORE_GUIDELINES.md`
- current delegated release policy: `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md`

The plan text below remains useful as historical architecture/rationale. Where it uses phrases such as “current”, “planned”, or “next review point”, treat those as the state at the time this base plan was recorded unless a dedicated later RS2/R2.1 document says otherwise.

---

## 1. Purpose

Preserve SimCore's current safety model while reducing repeated release work, duplicated state, and documentation drift.

The design keeps:

- Evidence Before Repair
- narrow release scope
- hard freezes
- exact production identity
- static and live validation separation
- `main` / `release-simcore` responsibility separation
- fail-closed release behavior

The design reduces:

- per-version one-shot workflow creation
- per-version one-shot release scripts
- repeated manual version/commit/blob edits
- important fixtures disappearing with cleanup
- contradictory current-state sentences across documents

---

## 2. Non-goals

Release System v2 is not:

- a SimCore runtime feature
- an M2 behavioral change
- permission to modify request/output semantics
- permission to refactor the production bundle
- permission to move persistent state
- permission to change generation, prompt, store, mirror, recovery, reconcile, representation, broadcast, time, frame, or summary-scope behavior
- an automatic override of evidence-driven roadmap ordering

The first infrastructure phases must produce no production-runtime diff.

---

## 3. Authority boundaries

### 3.1 Canonical authorities

| Question | Canonical source |
|---|---|
| What version is deployed? | `product-manifest.json` |
| What code actually runs? | `release-simcore` |
| What is the immediate next action? | `docs/CURRENT_DEVELOPMENT.md` |
| What principles are durable? | `docs/SIMCORE_GUIDELINES.md` |
| What work is deferred? | `docs/SIMCORE_DEFERRED_LEDGER.md` |
| What incident evidence is preserved? | dedicated evidence/watch documents |

A document must not silently become authoritative for a question assigned to another source.

### 3.2 Generated facts versus human judgment

Repeated facts such as version, release name, commit, blob, validation status, and active checkpoint should live in machine-managed blocks generated from the manifest.

Human-authored sections should contain:

- evidence interpretation
- scope decisions
- unresolved questions
- promotion reasoning
- live-gate meaning

Generated sections should contain only bounded facts. Generation must preserve all text outside explicit begin/end markers.

---

## 4. Target repository structure

The target structure is directional and may be introduced gradually.

    products/simcore/
      src/
      tests/
        diagnostic-copy.test.mjs
        summary-scope.test.mjs
        representation.test.mjs
        broadcast-closure.test.mjs
        frozen-surfaces.test.mjs
      contracts/
        frozen-surfaces.json
      releases/
        release-schema.json
        planned/
      tooling/
        check.mjs
        build.mjs
        sync-state.mjs

    .github/workflows/
      simcore-ci.yml
      simcore-release.yml

Production delivery remains:

    release-simcore
      plugins/simcore/latest.js
      plugins/simcore/install.js

The production bundle may remain a single file even after development sources are eventually modularized.

---

## 5. Declarative release record

Each promoted release should have bounded metadata rather than a new executable one-shot program.

Example shape:

    {
      "version": "0.64.x",
      "releaseName": "Release Name",
      "expectedParentVersion": "0.64.2",
      "scope": ["named-surface"],
      "exactBodyFreeze": ["namedFunction"],
      "behaviorFreeze": ["namedSubsystem"],
      "forbiddenNewCalls": [
        "pluginStorage",
        "setChat",
        "fetch",
        "setTimeout",
        "setInterval"
      ],
      "staticGates": ["named-fixture"],
      "liveGate": "ONE_REAL_LONG_CHAT"
    }

The final schema must be bounded, validated, and treated as data. A release declaration must never execute arbitrary repository code merely because it came from a trigger PR.

---

## 6. Permanent CI

Important tests must survive the version that introduced them.

Every SimCore change should run:

1. JavaScript syntax validation.
2. Deterministic build validation.
3. `latest.js === install.js`.
4. Architecture Contracts v2.
5. M2 frozen-marker validation while M2 is active.
6. Summary Scope regression fixtures.
7. Diagnostic Copy Resilience fixtures.
8. Accumulated subsystem regression fixtures.
9. Exact-body freeze checks for explicitly frozen functions.
10. Forbidden side-effect/API surface checks.
11. Documentation/manifest consistency checks.

New correctness fixes add permanent regression tests unless the behavior is intentionally removed later.

---

## 7. Frozen-surface verification

Use three distinct freeze classes.

### 7.1 Exact body freeze

Use when a function must remain byte-identical for attribution.

Example:

- `buildLastTurnDiagnosticReport()` during v0.64.2 attribution

### 7.2 Behavioral contract freeze

Use when formatting or file position may change but externally observable behavior must remain stable.

Examples:

- Summary Scope authority
- Representation ownership
- Broadcast terminal closure
- recovery and mirror contracts

### 7.3 Forbidden new side effects

Detect newly introduced calls or access to protected APIs.

Examples:

- persistent storage writes
- host chat writes
- network access
- timers
- background jobs

Simple call counts may remain a supplemental check, but durable validation should prefer explicit static contracts where practical.

---

## 8. Permanent release workflow

The eventual permanent workflow should:

1. Resolve and verify the expected production parent.
2. Validate the release declaration.
3. Build the candidate deterministically.
4. Run all permanent tests and frozen contracts.
5. Verify protected surfaces.
6. Produce identical `latest.js` and `install.js`.
7. Commit production atomically to `release-simcore`.
8. Record the exact production commit and blob.
9. Update the manifest.
10. Synchronize machine-managed documentation blocks.
11. mark the release `LIVE_PENDING`.
12. close any command-only trigger PR without merging it.

Any failure before the production commit must leave production unchanged. Any administrative failure after production commit must be recoverable and must not misreport the old version as current.

Concurrency must remain repository-wide for any workflow that writes `main` or `release-simcore`.

---

## 9. Validation state model

Static deployment success and real PocketRisu/WebView validation are separate states.

    PLANNED
      -> STATIC_PASS
      -> DEPLOYED
      -> LIVE_PENDING
      -> LIVE_PASS

Failure states should identify the bounded stage where evidence permits:

    STATIC_FAILED
    DEPLOY_FAILED
    LIVE_FAILED

A live result record should contain only bounded metadata such as:

- version
- result/status
- validation scenario
- timestamp
- evidence document reference

Raw diagnostic reports and unbounded exception payloads must not be copied into persistent release telemetry by default.

---

## 10. Development-source modularization

Modularization is a later phase, not an initial requirement.

Safe order:

1. Establish permanent tests against the current single-file source.
2. Establish deterministic bundle generation.
3. Preserve the current production bundle byte-for-byte where required.
4. Extract one subsystem at a time behind existing contracts.
5. Compare generated output and run the full accumulated suite.
6. Stop extraction if attribution becomes ambiguous.

Do not combine large modularization with M2 behavioral work. A single production bundle may remain the delivery artifact indefinitely.

---

## 11. Adoption phases

The phase list below is the original adoption plan. Actual implementation/proof status is recorded by the dedicated `SIMCORE_RELEASE_SYSTEM_V2_RS2_*` and R2.1 policy/evidence documents.

### Phase RS2-0 — Plan only

- preserve this document
- no runtime change
- no release-order change
- no new production authority

### Phase RS2-1 — Durable tests

- move valuable one-shot fixtures into permanent test files
- keep current release mechanism available
- verify tests against the production baseline
- no runtime change

### Phase RS2-2 — State synchronization

- define machine-managed documentation blocks
- generate repeated release facts from `product-manifest.json`
- add contradiction/staleness checks
- no runtime change

### Phase RS2-3 — Permanent CI

- introduce stable `simcore-ci.yml`
- run the accumulated suite on SimCore changes
- preserve existing release behavior
- no runtime change

### Phase RS2-4 — Permanent release workflow

- replace per-version executable one-shot tooling
- retain command-PR compatibility only if direct workflow dispatch is unavailable
- enforce expected-parent, atomic deployment, and shared concurrency
- retire the old mechanism only after a successful shadow run and rollback rehearsal

### Phase RS2-5 — Optional source modularization

- begin only after the active M2 behavioral phase is stable
- extract one subsystem per independently gated change
- keep production output compatibility explicit

---

## 12. Promotion and rollback rules

Release System v2 work may begin only when:

- the current production live gate is resolved or explicitly deferred by evidence
- its phase is promoted in `CURRENT_DEVELOPMENT.md`
- the phase has a no-runtime-change contract where applicable
- rollback or fallback to the existing release mechanism is defined

Do not delete the current working release path before the permanent workflow has completed at least one shadow validation and one real release.

If Release System v2 blocks an urgent correctness mini, use the last verified release path and repair the infrastructure separately.

---

## 13. Relationship to the current roadmap

### Historical note

The original base-plan roadmap at the time of recording centered on the v0.64.2 diagnostic-copy live result and deciding whether RS2-1 should start before M2-3. That decision point has been superseded by later work and must not be treated as current authority.

Current roadmap authority is `docs/CURRENT_DEVELOPMENT.md`.

As of this documentation refresh:

```text
production = v0.64.7 Cross-Reload Cache Observer Continuity
current runtime gate = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT / PENDING_REAL_LONG_CHAT
M2-3 physical implementation = blocked until that gate is classified and closed
R2.1 delegated operation = ACTIVE / IMPLEMENTED / PERMANENT-CI QUALIFIED
R2.1 genuine release end-to-end proof = PENDING on the next genuine runtime release
```

The old v0.64.2-specific decision text remains represented by repository history and earlier evidence documents; it is no longer repeated here as a current instruction.

---

## 14. Success criteria

Release System v2 succeeds when:

- release identity has one canonical source
- current-state duplication no longer creates stale instructions
- important fixtures accumulate permanently
- routine releases do not require new executable workflow files
- production commits remain exact and traceable
- failures identify their stage
- the previous release path remains available until replacement is proven
- runtime behavior changes only when an explicit runtime release authorizes them

---

## 15. Current disposition

Status: **HISTORICAL BASE PLAN · CURRENT OPERATIONAL STATUS OWNED BY LATER RS2/R2.1 DOCUMENTS**

Current operational facts:

```text
Release System v2 implementation = advanced beyond this base plan
R2.1 delegated operator policy = ACTIVE
permanent CI qualification = PASS
genuine runtime release end-to-end proof = PENDING
human real-long-chat LIVE_PASS boundary = PRESERVED
```

Immediate action from this document: **NONE**.

Use:

- `docs/CURRENT_DEVELOPMENT.md` for immediate product/release sequencing;
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md` for current delegated-operation policy;
- dedicated `SIMCORE_RELEASE_SYSTEM_V2_RS2_*` evidence/contract documents for phase-specific implementation truth.

Last base-plan record: 2026-08-22
Documentation-status refresh: 2026-08-26
