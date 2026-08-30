# SimCore v0.69.1 Fresh Dispatch Bridge Retirement

Status: `PASS · ONE-SHOT BRIDGE CONSUMED · RETIREMENT AUTHORIZED · RUNTIME UNCHANGED`

## Outcome

The temporary control-plane bridge introduced to satisfy R2.7 `FRESH_PERMANENT_DISPATCH_REQUIRED` completed its only intended use.

- bridge merge commit: `67fe47af61866bbcbfe6c5a7aa88a699d864ad1a`
- bridge workflow run: `33285495546` · `SUCCESS`
- fresh permanent release run: `33285500779`
- release id: `simcore-v0.69.1-new-06`
- candidate / production commit: `5dc5ec1099c6097a6a0e46effeb826889a4741c3`
- production blob: `de764f2c98174aa7f8ae8dc356d83aa6851b3745`
- `latest.js == install.js`: `YES`
- version: `0.69.1`
- post-publish declared-main commit: `6334450723cd9a5698b6f724b02fe2511471db30`
- declared lifecycle: `LIVE PENDING`

The bridge did not publish production itself. It only dispatched the existing permanent release controller after exact production/candidate/request validation. The existing RS2_4 permanent publisher remained the sole production publisher.

## Retirement

Remove:

- `.github/workflows/product-simcore-v06901-fresh-dispatch-bridge.yml`
- `products/simcore/releases/dispatch-requests/simcore-v0.69.1-new-06.json`

Retain the design/fix and retirement evidence documents as durable audit history.

## Remaining gate

`HUMAN_EVIDENCE` is still required for the real same-tab `+` targeted-update liveness scenario. Publication success does not imply `LIVE_PASS`.
