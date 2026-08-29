# SimCore Release System R2.8 Implementation Worksheet

Date: 2026-08-30 KST

Status: **IN IMPLEMENTATION · NON_RUNTIME**

Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_8_HUMAN_EVIDENCE_TERMINAL_CONVERGENCE_DESIGN.md`

Authorization authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_8_IMPLEMENTATION_AUTHORIZATION_2026-08-30.md`

Working branch:
- `release-system/simcore-r2-8-human-evidence-terminal-convergence`

## Frozen ownership boundary

```text
NEW pure owner
  products/simcore/tooling/release-terminal-transition.mjs

NEW permanent regression
  products/simcore/tests/suites/release-system-r2-8-terminal-convergence.test.mjs

NEW bounded fixtures
  products/simcore/tests/fixtures/release-system-r2-8-terminal-convergence/**

THIN event adapter
  .github/workflows/simcore-r2-8-terminal-convergence.yml

MINIMAL registry / CI self-classification edits only as required

PRESERVE
  products/simcore/tooling/admin-state-transition.mjs semantics
  products/simcore/tooling/sync-state.mjs semantics
  scripts/repo-main-write.py authority
  RS2_4_PERMANENT publisher authority
  predecessor active-admin-transition / command-PR path as compatibility fallback until genuine first use
```

## Exact evidence envelope to implement

Canonical path:

```text
products/simcore/releases/live-evidence/<releaseId>.json
```

Schema v1:

```json
{
  "schemaVersion": 1,
  "product": "SimCore",
  "releaseId": "simcore-vX.Y.Z-new-NN",
  "productionCommit": "<40hex>",
  "productionBlob": "<40hex>",
  "liveScenarioId": "<frozen scenario>",
  "decision": "LIVE_PASS",
  "checkpoint": "M<number>-<number>",
  "nextPriority": "<bounded explicit token>",
  "humanEvidence": ["docs/<durable reviewed evidence>.md"],
  "authorityConfirmation": "HUMAN_EVIDENCE"
}
```

No field is inferred by the machine.

## Resolver inputs

The pure resolver consumes parsed values for:

```text
terminal evidence envelope
release record
state receipt
current product-manifest
current production identity
```

It validates release/live/production binding and returns a derived admin transition plan without touching the filesystem or network.

## Resolver outputs

```text
ELIGIBLE_TO_PROJECT
ALREADY_DURABLE
BLOCKED_PRODUCTION_MOVED
BLOCKED_RELEASE_BINDING_MISMATCH
BLOCKED_LIVE_GATE_MISMATCH
BLOCKED_CURRENT_STATE_CONTRADICTION
BLOCKED_CHECKPOINT_REGRESSION
BLOCKED_EVIDENCE_INVALID
```

`ELIGIBLE_TO_PROJECT` must include exact expected/set values compatible with `admin-state-transition.mjs`.

## Checkpoint policy

For R2.8 v1, checkpoint syntax is the existing SimCore major-checkpoint form `M<major>-<ordinal>`.

The machine only checks that the human-selected checkpoint does not regress relative to current manifest state. It does not choose, infer, or auto-advance the checkpoint.

## Event adapter contract

Trigger only on `push` to `main` touching:

```text
products/simcore/releases/live-evidence/*.json
```

No schedule. No generic polling. No auto retry.

For one exact added/changed evidence file, the adapter must:

```text
1. checkout main with history
2. identify exact changed evidence path and reject ambiguous multi-evidence transactions
3. read canonical release record and state receipt
4. fetch/materialize exact release-simcore latest/install and verify equality
5. build current production identity
6. run pure resolver
7. clean NOOP on ALREADY_DURABLE
8. on ELIGIBLE, materialize a temporary derived admin transition
9. apply existing admin-state-transition.mjs in workspace
10. run existing sync-state.mjs write + check
11. commit only bounded terminal state files
12. route through scripts/repo-main-write.py / MAIN_HEALTH / Required
13. fetch main and reobserve exact terminal fields
```

The evidence file itself is already durable main authority and must not be rewritten by the projection workflow.

## Compatibility rule

The predecessor `active-admin-transition.json` / `SimCore durable memory sync command` path remains present in this first implementation. Retirement is deferred until a genuine post-implementation HUMAN_EVIDENCE terminal close proves the new path operationally.

## Qualification gate

```text
resolver positive/negative matrix PASS
workflow boundary regression PASS
predecessor regression remains PASS
SimCore Verify PASS
SimCore Required PASS
release-simcore unchanged
latest.js == install.js
runtime mutation NONE
```

Any observed anomaly is recorded before continuing as WATCH / DEFER / FIX / BLOCKER.
