# Local Plugins status checkpoint — 2026-09-01

This is a point-in-time repository read-back for the local-plugin workspace. It records current authority and handoff state only. It does not authorize runtime, release, or product changes.

## Repository baseline

- repository: `hanmiyoo10-alt/-`
- observed `main`: `75764f1446d55bd1dbf629b4f904516619f0ac02`
- visible plugin roots under `plugins/`: `_template`, `devpass`, `simcore`, `termux`, `test-a`, `test-b`, `usage-dashboard`

## Local Usage Dashboard

Primary development root remains `plugins/usage-dashboard/`.

Current production authority:

- branch: `release-usage-dashboard`
- production SHA: `82c4f900cf548068d1eada957c982a5d78f1347b`
- Product: `3.0.0-alpha.5.98`
- Engine: `1.6.34`
- Manager: `1.3.6`
- managed CLI: `1.10.0`
- managed Models: `1.280.0`
- contracts: `1/1`
- implementation PR: `#1060`, merged
- exact-byte promotion: verified
- full registry: `TEST_REGISTRY_GREEN:128`
- P64 / E18 / E19 / E20 / E21: GREEN
- main and `release-usage-dashboard` currently expose the same `latest.js` blob SHA: `307298741f43faed4c910a94b536aa190807cf44`

Handoff state:

- physical PocketRisu acceptance is still **PENDING**
- no further Usage Dashboard source/design/deployment movement is authorized before same-release real-device verification
- next user action remains normal PocketRisu `+` update and UI/Diagnostics capture; no artificial or chargeable traffic is required

## SimCore

Current production authority is the dedicated `release-simcore` channel, not the older main-tree installable artifact.

- `release-simcore` runtime version: `0.70.1`
- `release-simcore/plugins/simcore/latest.js` blob SHA: `8f332cfceed316d35954e353c2eaca38c2f34d95`
- main-tree `plugins/simcore/latest.js` remains `0.63.2`; this does not override release authority
- S7 cumulative `v0.70.3` staging PR `#1067` remains open and explicitly keeps `release-simcore` at `0.70.1` until the separate release transaction
- 3M design work has reached the 3M-10 convergence boundary; impact PR `#1182` is merged
- 3M-10 separates design convergence from runtime readiness and real target-host PASS; it does not itself mutate runtime or `release-simcore`

Therefore SimCore is in a late convergence/design-gate phase, but `v0.70.3` production publication and real runtime acceptance are not complete.

## Termux utilities

`plugins/termux/` is a utility family rather than one installable JS channel. Current subtrees include:

- `background-gpt`
- `large-doc-editor`
- `response-watch`
- `taskbridge`

Recent repository work includes foreground/UI completion signaling, race-safe response timing, interactive command-finish notifications, and a runit deployment/preflight design track. No single production-version claim is made by this checkpoint because the subtree contains multiple utilities with separate deployment concerns.

## DevPass

`plugins/devpass/` currently contains the update-channel README but no deployable `latest.js` artifact on main. The README still describes a future/stable `latest.js` channel. DevPass-related account/request truth is also consumed by Local Usage Dashboard, but this checkpoint does not infer an independent currently deployed DevPass plugin artifact where the repository does not provide one.

## Plugin control plane and agent skills

Repository-level plugin governance has advanced materially:

- Plugin Control Plane CP0–CP3 is implemented
- `plugin-authority-scan` was piloted for Local Usage Dashboard
- authority-plan resolution was generalized in PR `#1117`
- independent locator semantics remain preserved
- `PILOT_VALIDATED_SCOPES` is still exactly `{ "plugin:usage-dashboard" }`
- SimCore is mechanically discoverable/candidate-evaluable but is not promoted into the validated scope set yet

This keeps shared tooling from silently expanding authority across plugin families.

## Support/scaffolding roots

`plugins/_template`, `plugins/test-a`, and `plugins/test-b` remain support/scaffolding roots rather than primary production targets for the current development loop.

## Overall checkpoint

The repository is not at one uniform phase:

1. **Local Usage Dashboard** — implementation, regression, merge, materialization, and production promotion are complete for 5.98; only real-device physical acceptance remains.
2. **SimCore** — production is 0.70.1 while major convergence design has reached 3M-10; staged 0.70.3 work exists but production/runtime acceptance is not complete.
3. **Termux utilities** — active utility/deployment design and reliability work continues across multiple subprojects.
4. **DevPass** — standalone update-channel directory is presently documentation-only on main; do not invent a shipped artifact.
5. **Plugin governance** — control-plane and authority-scan infrastructure is substantially built, but validated-scope expansion remains intentionally conservative.

For future status reads, re-read production branches and current main rather than treating this checkpoint as mutable authority.
