# SimCore v0.66.0 Post-Publish Recovery Disposition Parity Fix

Status: IMPLEMENTED · CI PENDING · NON_RUNTIME

## Scope

This work repairs only the post-publish recovery assertion contract. It does not mutate SimCore runtime code, candidate identity, release-simcore, publication authority, or the already-published v0.66.0 bytes.

## Evidence

Recovery run `33208706569` successfully rebuilt the v0.66.0 LIVE_PENDING administrative payload through the current `release-state-converge` owner, then failed in the workflow-local assertion because the workflow still accepted legacy disposition vocabulary.

Current owner dispositions are:

- changed bounded payload: `LIVE_PENDING_PAYLOAD_READY`
- already durable/converged: `ALREADY_CONVERGED`

Legacy workflow dispositions removed by this fix are:

- `POST_PUBLISH_PAYLOAD_READY`
- `ADMIN_STATE_ALREADY_SYNCED`

## Fix contract

1. `.github/workflows/simcore-release-state-sync.yml` accepts exactly the current owner dispositions for the permanent recovery lane.
2. `products/simcore/tests/post-publish-state-permanent.test.mjs` asserts `LIVE_PENDING_PAYLOAD_READY` for the changed-payload case and already asserts `ALREADY_CONVERGED` for the idempotent case.
3. The permanent regression statically binds the recovery workflow to the same current vocabulary and rejects the two legacy terms.
4. Publication safety boundaries remain unchanged.

## Classification

`FIX · BLOCKER · POST_PUBLISH_RECOVERY_DISPOSITION_PARITY · NON_RUNTIME · PRODUCTION_UNCHANGED`

## Next gate

`CI_SELF trusted predecessor -> proposed permanent verifier -> Required -> main merge -> append-only recovery -02 -> durable LIVE_PENDING reobserve`
