# SimCore v0.69.0 Post-Publish Main Gate R2.8 Fixture Production Identity Blocker

Date: 2026-08-30 (Asia/Seoul)

Status: `BLOCKER OBSERVED · FIX REQUIRED · CONTROL_PLANE · NON_RUNTIME`

## Summary

The genuine `simcore-v0.69.0-new-01` Permanent Release published the exact approved candidate to `release-simcore`, but the post-publish main-state transaction failed at the shared `repo-main-write.py` CI gate.

This is **not** a production publication failure. Production is already v0.69.0 and the exact `latest.js == install.js` invariant passed after publication. The failure is a permanent-regression fixture defect in the R2.8 terminal-convergence suite which blocks the administrative LIVE_PENDING projection after production has legitimately advanced.

## Exact production evidence

Permanent Release run:

- run: `33271301422`
- releaseId: `simcore-v0.69.0-new-01`
- candidate / production commit: `31b4c5075659a55861731c6fd73f999402321e94`
- previous production commit: `6b31a5265f67daf5a90222d6c08bb85f3abde538`
- release blob: `86954f4d7ff7dec9119e2a8c047bfbfa6f801d56`
- version: `0.69.0`
- release name: `M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion`

The Permanent Release jobs established:

- Resolve Permanent Authorization: PASS
- Candidate Required / Verify: PASS
- Candidate Required / Required: PASS
- Publish Exact Candidate: PASS
- PREPLAY BEFORE PUBLISH: PASS
- exact candidate publication: PASS
- post-publish production observation: PASS
- `latest.js` syntax: PASS
- `install.js` syntax: PASS
- `latest.js == install.js`: PASS
- production commit/blob binding: PASS

Current `release-simcore` reobservation confirms head `31b4c5075659a55861731c6fd73f999402321e94`, parent `6b31a5265f67daf5a90222d6c08bb85f3abde538`.

Therefore:

```text
V06900_PRODUCTION_PUBLICATION = PASS
V06900_RELEASE_SIMCORE_IDENTITY = PASS
V06900_LATEST_INSTALL_EQUALITY = PASS
PRODUCTION_MUTATION_REQUIRED_FOR_RECOVERY = NO
```

## Failed administrative boundary

`Declare Published State` generated the intended LIVE_PENDING payload and staged it through the single main gateway.

Generated state commit:

- `7370049656dff1c70d6befb2320c9f6fbeba2cf9`
- message: `state(simcore): declare simcore-v0.69.0-new-01 live pending`

Staging branch:

- `simcore-rs2-6-post-publish/7370049656df-1-33271301422-1-2337-1788032233316`

Main gateway CI run:

- run: `33271343639`
- profile: `MAIN_HEALTH`
- GATE_STATIC: PASS
- GATE_ARCH: PASS
- GATE_STATE: PASS
- GATE_COORDINATION: PASS
- GATE_LEGACY_COMPAT: PASS
- GATE_REGRESSION: FAIL
- reason: `PERMANENT_REGRESSION_FAIL`

Exact failing assertion:

```text
SUITE_ASSERTION_FAILED: release-system-r2-8-terminal-convergence:
valid human evidence projects:
expected="ELIGIBLE_TO_PROJECT"
actual="BLOCKED_PRODUCTION_MOVED"
```

Because the gateway gate failed, the intended v0.69 release record/state receipt did not become durable on main. Reobservation of current main found `products/simcore/releases/records/simcore-v0.69.0-new-01.json` absent.

## Root cause

The R2.8 terminal-convergence suite uses historical v0.68 release evidence as a permanent positive fixture.

PR #863 / commit `0b56877e043aebde38bd05f01745eac03d43ae57` previously repaired one repository-state coupling by synthesizing:

- a historical observed production identity from the historical record;
- a synthetic pre-terminal validation/current-priority/current-development state.

That repair was directionally correct but incomplete.

The fixture still builds its manifest by spreading the repository manifest:

```js
const manifest={
  ...repositoryManifest,
  validation_status:'PENDING_REAL_LONG_CHAT',
  current_priority:receipt.liveScenarioId,
  major_update_checkpoint:evidence.checkpoint,
};
```

`release-terminal-transition.mjs` independently validates manifest production identity:

```text
manifest.release_branch == release-simcore
manifest.release_commit == evidence.productionCommit
manifest.release_blob == evidence.productionBlob
```

During the v0.69 post-publish staged transaction, the repository manifest correctly describes v0.69 production while the permanent fixture intentionally describes historical v0.68. The fixture therefore inherits v0.69 `release_commit/release_blob`, pairs them with v0.68 evidence, and deterministically returns `BLOCKED_PRODUCTION_MOVED`.

This is a **fixture production-identity coupling**, not a resolver safety defect and not a v0.69 runtime defect.

## Required FIX

The historical positive fixture must synthesize its manifest production identity from the same historical record used for the evidence and synthetic observed identity.

Minimum bounded repair:

```text
manifest.release_branch = release-simcore
manifest.release_commit = historical record.productionCommit
manifest.release_blob = historical record.productionBlob
```

The existing resolver, production movement guard, negative control using a deliberately moved identity, HUMAN_EVIDENCE authority, publisher, schemas and runtime must remain unchanged.

The regression must prove both:

1. a historical positive terminal fixture remains `ELIGIBLE_TO_PROJECT` even when the repository's actual current release has advanced;
2. deliberate production-identity movement still returns `BLOCKED_PRODUCTION_MOVED`.

## Recovery rule

Do **not** republish v0.69.0 and do **not** create a fresh release identity merely to repair main bookkeeping.

Recovery must use the existing post-publish recovery authority after the harness FIX is permanent-CI qualified. It must:

1. reobserve production C/blob at `31b4c5075659a55861731c6fd73f999402321e94` / `86954f4d7ff7dec9119e2a8c047bfbfa6f801d56`;
2. regenerate or reuse the canonical post-publish state envelope for original publisher run `33271301422` according to existing recovery semantics;
3. route the durable write only through `repo-main-write.py`;
4. converge main to LIVE_PENDING / `PENDING_REAL_LONG_CHAT`;
5. leave `release-simcore` unchanged;
6. leave HUMAN_EVIDENCE pending.

## Classification

```text
V06900_POST_PUBLISH_MAIN_GATE = BLOCKER
DISPOSITION = FIX
LAYER = CONTROL_PLANE / VALIDATION_HARNESS
RUNTIME_DEFECT = NO
PRODUCTION_PUBLICATION_DEFECT = NO
RELEASE_SIMCORE_RECOVERY_MUTATION = FORBIDDEN / NOT REQUIRED
MAIN_STATE_RECOVERY = REQUIRED
HUMAN_EVIDENCE = STILL PENDING
```

## Next action

```text
incident evidence durable
→ working-branch minimal fixture identity repair
→ static / SimCore CI qualification
→ release-simcore reobserve unchanged
→ canonical post-publish recovery against current main
→ main LIVE_PENDING durability verification
→ real long-chat HUMAN_EVIDENCE
```
