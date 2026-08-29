# SimCore v0.69.0 Post-Publish Bounded Cycle-Break Design

Date: 2026-08-30 (Asia/Seoul)

Status: `FROZEN · IMPLEMENTATION AUTHORIZED · ONE-SHOT RECOVERY TRANSPORT · NON_RUNTIME`

## Problem

The genuine v0.69 publication is already healthy on `release-simcore`, but durable main remains predecessor-bound because the R2.8 historical terminal-convergence fixture inherits mutable repository production identity.

Two ordinary recovery lanes form a deterministic cycle:

```text
CI-self fixture repair
→ trusted predecessor MAIN_HEALTH needs synchronized main
→ blocked while main declares predecessor production

DURABLE_MEMORY_SYNC
→ proposed MAIN_HEALTH sees the stale historical fixture against staged v0.69 manifest
→ blocked before main can become synchronized
```

Canonical incident authorities:

- `docs/SIMCORE_06900_POST_PUBLISH_MAIN_GATE_R2_8_FIXTURE_PRODUCTION_IDENTITY_BLOCKER_2026-08-30.md`
- `docs/SIMCORE_06900_POST_PUBLISH_TRUSTED_CI_BOOTSTRAP_CYCLE_2026-08-30.md`
- `docs/SIMCORE_06900_DURABLE_MEMORY_BOOTSTRAP_R2_8_FIXTURE_CYCLE_BLOCKER_2026-08-30.md`

## Authority findings

`repo-main-write.py` remains the single main integration gateway. Its protected mode already defines the required cycle-break primitive:

```text
exact bounded payload commit
→ temporary staging ref
→ SimCore CI workflow_dispatch
→ profile MAIN_HEALTH
→ Required PASS
→ verify main base did not move
→ fast-forward exact checked commit to main
```

There is no permanent adapter on current main that can assemble the required combined payload. Existing active writer adapters are intentionally scope-bounded, and the state-sync adapter can carry only the three registered administrative state surfaces.

Therefore a new **permanent** writer or gateway is forbidden. The only authorized addition is an ephemeral one-shot transport on a recovery branch whose own workflow file is excluded from the candidate integrated to main.

This transport does not create a second main writer. The only component permitted to land main is still `scripts/repo-main-write.py` in protected mode.

## Frozen production identity

```text
releaseId       = simcore-v0.69.0-new-01
production C    = 31b4c5075659a55861731c6fd73f999402321e94
production blob = 86954f4d7ff7dec9119e2a8c047bfbfa6f801d56
previous P      = 6b31a5265f67daf5a90222d6c08bb85f3abde538
publisher run   = 33271301422
version         = 0.69.0
```

The cycle-break transaction must reobserve this exact production identity before any main mutation. `latest.js == install.js` must pass. Any movement blocks the transaction.

## Exact combined main payload

The protected candidate integrated to main may change **exactly four files**:

```text
products/simcore/tests/suites/release-system-r2-8-terminal-convergence.test.mjs
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
```

### Fixture correction

The historical v0.68 terminal fixture must pin all manifest production identity surfaces to the same historical release record used by its evidence and synthetic observed identity:

```text
release_branch = release-simcore
release_commit = historical record.productionCommit
release_blob   = historical record.productionBlob
```

The regression must simulate an actually moved repository manifest and still prove the historical positive fixture is `ELIGIBLE_TO_PROJECT`.

The deliberate moved-observed-identity and moved-manifest negative controls must remain `BLOCKED_PRODUCTION_MOVED`.

Resolver semantics are unchanged.

### Administrative identity synchronization

The other three files must be derived by the existing state-sync owners from the exact already-published v0.69 production C/blob. The cycle-break transport may not hand-edit lifecycle truth.

This synchronization is transitional only. It must not fabricate the missing v0.69 release record/state receipt, must not create LIVE_PENDING authority, and must not consume or synthesize HUMAN_EVIDENCE.

## Ephemeral transport boundary

A recovery branch may contain a one-shot GitHub Actions workflow solely to execute the existing gateway. That workflow is transport, not durable authority.

Required properties:

1. trigger only on one exact recovery branch;
2. `contents: write` and `actions: write` only as required by the existing gateway;
3. freeze expected main base at execution start and require the payload to be replayable on current main;
4. reobserve exact v0.69 `release-simcore` C/blob and latest/install equality;
5. derive the three admin surfaces through existing `simcore-sync-memory.py` / `sync-state.mjs` owners;
6. construct a payload commit based on current main containing the fixture FIX plus derived admin state, but **not** the transport workflow file;
7. require the resulting diff to equal the exact four-file allowlist;
8. invoke `scripts/repo-main-write.py` with:
   - `--required-workflow simcore-ci.yml`
   - `--required-profile MAIN_HEALTH`
   - `--required-job Required`
   - a dedicated recovery staging prefix;
9. allow the helper to land main only after MAIN_HEALTH / Required PASS and final base-currentness check;
10. reobserve main and production after landing;
11. retire/delete the recovery branch after evidence is durable.

The transport must not call `git push ... main` directly, `GitHub.update_ref` on main, force push, a second publisher, or any release mutation primitive.

## Why the combined candidate is safe

The cycle exists because each half is invalid only when evaluated without the other:

```text
stale fixture + v0.69 admin identity → false BLOCKED_PRODUCTION_MOVED
fixed fixture + v0.68 admin identity → trusted predecessor/admin incoherence
```

The combined candidate is the smallest self-consistent state:

```text
fixed historical fixture
+
v0.69 administrative production identity
→ ordinary MAIN_HEALTH evaluates one coherent candidate
```

No gate is skipped. The ordinary permanent verifier becomes the approval evidence for the combined state itself.

## Forbidden scope

```text
release-simcore mutation                       FORBIDDEN
runtime byte mutation                          FORBIDDEN
candidate / approval identity mutation         FORBIDDEN
publisher rerun / republish                    FORBIDDEN
new durable main writer                        FORBIDDEN
repo-main-write.py bypass                      FORBIDDEN
MAIN_HEALTH / Required bypass                  FORBIDDEN
force push                                     FORBIDDEN
automatic HUMAN_EVIDENCE                       FORBIDDEN
LIVE_PASS projection                           FORBIDDEN
release record/state receipt fabrication       FORBIDDEN
persistent workflow installation on main       FORBIDDEN
```

## Qualification and recovery sequence

```text
this design durable on main
→ fresh recovery branch from current main
→ exact fixture repair
→ ephemeral branch-only cycle-break transport
→ construct exact four-file combined candidate
→ repo-main-write protected MAIN_HEALTH / Required PASS
→ exact combined candidate lands main
→ verify release-simcore unchanged
→ retire stale #875 and failed #877 transports
→ invoke canonical one-shot permanent post-publish recovery
→ reobserve original publisher handoff run 33271301422
→ durable v0.69 release record + state receipt + LIVE_PENDING
→ verify latest.js == install.js and main/release authority agreement
→ only then begin real long-chat HUMAN_EVIDENCE
```

## Verdict

```text
V06900_BOUNDED_CYCLE_BREAK = AUTHORIZED
TRANSACTION_CLASS = CONTROL_PLANE RECOVERY / NON_RUNTIME
PERMANENT_NEW_AUTHORITY = NONE
MAIN_GATEWAY = repo-main-write.py ONLY
REQUIRED_GATE = SimCore CI MAIN_HEALTH / Required
MAIN_PAYLOAD_FILE_COUNT = 4 EXACT
RELEASE_SIMCORE_MUTATION = NONE
HUMAN_EVIDENCE = PENDING
```
