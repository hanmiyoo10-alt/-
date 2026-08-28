# SimCore Post-Publish State Receipt Durability Gap

Status: FIXED · VERIFIED · NON_RUNTIME

## Classification

Current v0.66.0 blocker:

`FIXED · POST_PUBLISH_STATE_RECEIPT_DURABILITY_GAP · NON_RUNTIME · PRODUCTION_UNCHANGED`

Historical v0.65.0 missing receipt:

`DEFER · HISTORICAL_ADMIN_AUDIT_DEBT · NON_BLOCKING_CURRENT`

## Original observation

Append-only recovery `simcore-v0.66.0-new-05-post-publish-02` completed successfully in `SimCore release state sync` run `33209851897` and made v0.66.0 manifest/release-record `LIVE_PENDING` truth durable.

However, the renderer's persistent payload contract also included:

`products/simcore/releases/state-receipts/simcore-v0.66.0-new-05.json`

while both permanent publication and permanent recovery writer lanes omitted that receipt from `git add` and `repo-main-write.py --allow`. Durable reobservation also omitted the receipt, allowing a successful transaction while one declared persistent payload member was absent.

The same historical omission is observable for:

`products/simcore/releases/state-receipts/simcore-v0.65.0-new-05.json`

## Fix

PR #790, `fix(simcore): make post-publish state receipts durable`, merged as:

`66afaba72d9beb23cea32e49d331276be1236bcc`

The fix is non-runtime and changes only release-system administrative durability boundaries:

1. permanent publication stages and allows the generated state receipt;
2. permanent recovery stages and allows the generated state receipt;
3. both durable reobserve lanes require the receipt to exist on `main`;
4. reobserve verifies release ID, publisher run ID, production commit/blob, previous production commit, live scenario, validation/lifecycle state, release-record path, production mutation, release authority, and PASS result against the immutable publication handoff;
5. permanent regression statically requires both writer lanes to preserve this durability contract.

PR #790 passed:

- trusted predecessor lane
- proposed permanent verifier
- stable `Required`

## Current v0.66.0 repair proof

Fresh append-only recovery request:

`products/simcore/releases/recoveries/simcore-v0.66.0-new-05-post-publish-03.json`

PR #791 merged as:

`6c5bb799b612533df58c8d2e4613b8d12accb527`

Merged-event recovery run:

`33210704360`

Result: `SUCCESS`

The current owner correctly detected that all existing v0.66.0 administrative surfaces were already converged except the missing receipt:

```text
stateReceiptPath = products/simcore/releases/state-receipts/simcore-v0.66.0-new-05.json
disposition = LIVE_PENDING_PAYLOAD_READY
changedPaths = [products/simcore/releases/state-receipts/simcore-v0.66.0-new-05.json]
```

The recovery created exactly one durable payload file and generated staging commit:

`7fed6cda970db4e7121032cf0090e184bf135c2f`

MAIN_HEALTH gateway:

- run `33210720015`
- result `SUCCESS`

The gateway landed the same commit on `main`.

## Durable receipt reobservation

`main` now contains:

`products/simcore/releases/state-receipts/simcore-v0.66.0-new-05.json`

Verified durable values:

- `releaseId = simcore-v0.66.0-new-05`
- `publisherRunId = 33206537749`
- `productionCommit = 4b6ae1a4c63f6be658c6163168cc46a1adef60aa`
- `previousProductionCommit = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1`
- `productionBlob = f0da13d4c47fd98e9065d7dbf253a3296151ee16`
- `liveScenarioId = 06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT`
- `validationStatus = PENDING_REAL_LONG_CHAT`
- `lifecycleState = REAL_RELEASE_LIVE_PENDING`
- `productionMutation = ALREADY_PUBLISHED_UPSTREAM`
- `releaseAuthority = RS2_4_PERMANENT`
- `result = PASS`

Recovery durable reobserve printed:

`RS2_4_POST_PUBLISH_RECOVERY_DURABLE_MAIN_PASS`

## Production safety proof

`release-simcore` remains unchanged at:

`4b6ae1a4c63f6be658c6163168cc46a1adef60aa`

The published runtime blob remains:

`f0da13d4c47fd98e9065d7dbf253a3296151ee16`

No runtime republish occurred during this repair.

## Historical v0.65.0 disposition

The missing v0.65.0 receipt is retained as documented historical administrative debt and is not backfilled inside the current v0.66.0 work item. Backfilling it would be a separate administrative-history task and must not be mixed with the current release live gate.

Classification:

`DEFER · HISTORICAL_ADMIN_AUDIT_DEBT · NON_BLOCKING_CURRENT`

## Gate result

The receipt durability blocker no longer blocks v0.66.0 real-long-chat validation.

Current release remains:

`LIVE_PENDING · PENDING_REAL_LONG_CHAT`

Next authority boundary:

`HUMAN_EVIDENCE · 06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT`
