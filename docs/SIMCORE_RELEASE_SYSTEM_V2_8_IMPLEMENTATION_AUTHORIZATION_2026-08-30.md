# SimCore Release System R2.8 Implementation Authorization

Date: 2026-08-30 KST

Status: **IMPLEMENTATION AUTHORIZED · NON_RUNTIME · RELEASE-SIMCORE MUTATION NONE**

Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_8_HUMAN_EVIDENCE_TERMINAL_CONVERGENCE_DESIGN.md`

Predecessor closure:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_OPERATIONAL_CLOSURE_2026-08-29.md`

## Decision

Implementation of the frozen R2.8 Human-Evidence Terminal Convergence design is authorized on a dedicated working branch.

This authorization is intentionally narrow:

```text
HUMAN_EVIDENCE remains human authority
LIVE_PASS decision remains explicit human authority
checkpoint remains explicit evidence input
next priority remains explicit evidence input
machine may validate and project only deterministic consequences
existing admin-state-transition semantics are reused
existing sync-state rendering is reused
existing repo-main-write.py remains the only main writer
event model is explicit evidence arrival on main
no schedule / polling / auto retry
no publisher changes
no runtime/plugin mutation
no release-simcore mutation
```

## Authorized implementation owners

Implementation may add or modify only the bounded release-system surfaces required by the frozen design, including:

```text
products/simcore/tooling/release-terminal-transition.mjs
products/simcore/tests/suites/release-system-r2-8*.test.mjs
products/simcore/tests/fixtures/release-system-r2-8/**
products/simcore/tests/registry.mjs
products/simcore/tooling/ci/** only where required for classification/self-test
.github/workflows/<one thin R2.8 terminal convergence adapter>
products/simcore/releases/R_V2_8_*.json for implementation/living documentary state if needed
implementation worksheet/evidence/closure docs
```

Existing owners may be minimally adjusted only to route the new evidence-derived transition through established authority. Broad release-system refactors are not authorized.

## Required evidence envelope contract

Implementation must freeze an exact schema under:

```text
products/simcore/releases/live-evidence/<releaseId>.json
```

At minimum it must bind:

```text
schemaVersion = 1
product = SimCore
releaseId
productionCommit
productionBlob
liveScenarioId
decision = LIVE_PASS
checkpoint
nextPriority
humanEvidence[]
authorityConfirmation = HUMAN_EVIDENCE
```

The resolver must verify the envelope against the durable release record, state receipt, current manifest, current production identity, and current live gate.

The machine must not infer or synthesize human authority fields.

## Required resolver behavior

A pure/read-only resolver must emit only bounded dispositions:

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

For `ELIGIBLE_TO_PROJECT`, it must derive an exact expected->set transition compatible with the existing administrative transition semantics. It may not push, merge, publish, dispatch, retry, write main, create HUMAN_EVIDENCE, choose a checkpoint, or choose a next priority.

## Workflow boundary

The event adapter must be event-driven from explicit durable evidence arrival and must:

```text
checkout main
identify the exact changed live-evidence transaction
materialize/reobserve release-simcore identity
run the pure resolver
NOOP cleanly when already durable
apply the derived transition in workspace through existing transition semantics
render/check with existing sync-state
commit only bounded current-state paths
route the commit through repo-main-write.py + MAIN_HEALTH Required
re-read durable main and verify exact terminal claims
```

No schedule is authorized. No generic chat-history scan is authorized.

The first implementation may preserve predecessor command/one-shot paths as compatibility fallback. Retirement is not required until genuine post-implementation terminal convergence is proven.

## Mandatory regression matrix

Positive:

```text
valid explicit HUMAN_EVIDENCE + exact LIVE_PENDING state -> ELIGIBLE_TO_PROJECT
same explicit evidence after terminal convergence -> ALREADY_DURABLE
same checkpoint explicitly retained -> PASS
explicit allowed checkpoint advance -> PASS
nextPriority exact evidence binding -> PASS
current production identity unchanged -> PASS
```

Negative:

```text
missing/wrong HUMAN_EVIDENCE authority -> BLOCK
release binding mismatch -> BLOCK
production C/blob mismatch -> BLOCK
live scenario mismatch -> BLOCK
checkpoint regression -> BLOCK
missing nextPriority -> BLOCK
partial/contradictory terminal state -> BLOCK
conflicting second envelope for same release -> BLOCK
latest != install -> BLOCK
resolver gains push/publish/merge/retry/write authority -> FAIL CI
```

Historical v0.66/v0.67 predecessor closures should be regression examples only. They must not be rewritten.

## Qualification and activation

Implementation is complete only after:

```text
working-branch permanent SimCore Verify PASS
working-branch Required PASS
exact-head rerun PASS when qualification metadata changes
implementation PR merged to main
main SimCore Verify/Required PASS
release-simcore reobserved unchanged
latest.js == install.js reobserved
implementation closure/state recorded on main
```

Because this is a non-runtime release-system change:

```text
release-simcore deployment = N/A / VERIFY NO MUTATION
real long-chat validation of this implementation = N/A until a genuine future HUMAN_EVIDENCE terminal-close event exists
```

The current v0.68 product `PENDING_REAL_LONG_CHAT` gate remains separate and must not be inferred or closed by this implementation.

## Non-goals

Not authorized:

```text
automatic LIVE_PASS evaluation
automatic HUMAN_EVIDENCE creation
automatic checkpoint selection
automatic priority selection
automatic PR merge
automatic release approval/publication
second publisher
second main writer
background polling or retry
runtime/plugin change
release-simcore change
CURRENT_DEVELOPMENT history rollover
Node20 maintenance migration
full predecessor root-helper migration
```

## Authorization verdict

```text
R2_8_IMPLEMENTATION = AUTHORIZED
SCOPE = HUMAN_EVIDENCE_TERMINAL_CONVERGENCE_ONLY
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
HUMAN_AUTHORITY = PRESERVED
MAIN_WRITER = repo-main-write.py ONLY
PRODUCTION_PUBLISHER = RS2_4_PERMANENT ONLY
```
