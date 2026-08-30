# SimCore v0.69.1 Fresh Permanent Dispatch Bridge Fix

Status: `FIX · CONTROL-PLANE ONLY · RUNTIME UNCHANGED`

## Problem

The authorized v0.69.1 permanent release transaction reached pre-publication qualification and failed on `ARCH_CONTRACT_FAIL`. The architecture contract defect was fixed and merged to main through PR #900. R2.7 recovery policy now requires `FRESH_PERMANENT_DISPATCH_REQUIRED` because the frozen verifier of the failed run is stale while production remains unchanged at v0.69.0.

The connected operator surface available to this maintenance session can re-run existing workflow jobs, but does not expose creation of a fresh workflow dispatch. Re-running the failed permanent job is explicitly forbidden by the R2.7 recovery decision matrix.

## FIX classification

`FIX · OPERATIONAL TOOLING GAP`

This transaction must remain separate from the v0.69.1 runtime feature. It may not change candidate bytes, release-simcore, release specification identity, publisher authority, HUMAN_EVIDENCE authority, or release-system decision semantics.

## Bounded bridge design

Add a temporary push-triggered workflow that reacts only to one exact request file:

`products/simcore/releases/dispatch-requests/simcore-v0.69.1-new-06.json`

The workflow:

1. checks out `main`;
2. validates the request against exact frozen values;
3. verifies production still equals `31b4c5075659a55861731c6fd73f999402321e94`;
4. verifies candidate transport ref still equals `5dc5ec1099c6097a6a0e46effeb826889a4741c3`;
5. uses only GitHub Actions `actions: write` authority to POST a fresh dispatch to `.github/workflows/simcore-release-permanent.yml` on `main`;
6. passes exactly the already-authorized inputs:
   - `release_spec_path=products/simcore/releases/specs/simcore-v0.69.1-new-06.json`
   - `candidate_fetch_ref=candidate/simcore/simcore-v0.69.1-intent-06`
   - `authority_confirmation=RS2_4_RELEASE`.

The bridge does not publish production directly. The existing permanent publisher remains the only production publisher.

## Safety walls

- production publisher count remains one;
- release approval remains the already-merged exact approval transaction;
- no release-simcore write primitive is added to the bridge;
- no retry/polling/background loop is added;
- no runtime/plugin source changes;
- no change to latest.js or install.js;
- bridge is eligible for retirement after the fresh dispatch is observed.
