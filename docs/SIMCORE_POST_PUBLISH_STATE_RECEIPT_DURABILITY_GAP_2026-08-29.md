# SimCore Post-Publish State Receipt Durability Gap

Status: OBSERVED · FIX REQUIRED · NON_RUNTIME

## Classification

`FIX · BLOCKER · POST_PUBLISH_STATE_RECEIPT_DURABILITY_GAP · NON_RUNTIME · PRODUCTION_UNCHANGED`

## Current v0.66.0 evidence

Append-only recovery `simcore-v0.66.0-new-05-post-publish-02` completed successfully in `SimCore release state sync` run `33209851897`.

The recovery lane passed all of the following:

- immutable recovery request resolution
- immutable publication handoff download and verification
- exact production observation
- bounded LIVE_PENDING payload rebuild
- MAIN_HEALTH gated main write
- durable main reobservation

Durable main advanced to `54c7002197c392ecf24b8d2c4a3b41c1c6ddfdc0`, commit message `state(simcore): recover simcore-v0.66.0-new-05 live pending`.

`product-manifest.json` and the release record now persist v0.66.0 `PENDING_REAL_LONG_CHAT` / `LIVE_PENDING` truth.

However, the renderer's persistent payload contract includes:

`products/simcore/releases/state-receipts/simcore-v0.66.0-new-05.json`

and the permanent regression fixture asserts that receipt is generated with `REAL_RELEASE_LIVE_PENDING`, `PASS`, publisher run ID, and live scenario identity. The path is absent from durable `main` after the successful recovery.

## Systemic evidence

The same durable receipt path is absent for the previous genuine release:

`products/simcore/releases/state-receipts/simcore-v0.65.0-new-05.json`

Both permanent publication and permanent recovery writer lanes currently stage the manifest, CURRENT_DEVELOPMENT, SIMCORE_GUIDELINES, and release record, but omit the generated state receipt from `git add` / repo-main-write allowlists.

This creates a parity gap between:

1. `release-state-converge` persistent payload declaration,
2. permanent regression fixture expectations,
3. durable main writer payload.

## Safety impact

- Runtime production bytes are unchanged.
- `release-simcore` remains the published v0.66.0 identity.
- LIVE_PENDING manifest/record truth is durable.
- The administrative audit receipt promised by the release-state owner is not durable.
- Current recovery reobservation does not check the receipt, so the lane can report SUCCESS while dropping one declared persistent payload member.

## Required fix

A separate non-runtime release-system fix must:

1. include the state receipt in both permanent post-publish and permanent recovery staging/allowlists;
2. make durable reobservation verify the receipt exists and matches release ID, production identity, lifecycle state, result, publisher run ID, and live scenario;
3. add a static/permanent regression that fails if either writer lane omits the receipt;
4. repair the current v0.66.0 receipt through an append-only/admin-safe recovery path without republishing runtime bytes;
5. decide separately whether historical v0.65.0 receipt backfill is required or should remain documented historical debt.

## Gate

Do not advance to v0.66.0 real-long-chat acceptance until the current v0.66.0 durable receipt is present and reobserved.
