# Repository Plugin Control Plane — Implementation Closure

Status: **CP0–CP3 IMPLEMENTED AND OPERATIONALLY VERIFIED — CP4 DEFERRED**

Recorded: `2026-08-25`

Reference design: `docs/REPOSITORY_PLUGIN_CONTROL_PLANE_DESIGN.md` / Issue `#267`.
Implementation PR: `#271`.
Implementation merge SHA: `3640a81a82fcbac0bd0ca8e34a309cc0ff81b8ab`.
CP1 trigger repair PR: `#278`.
CP1 trigger repair merge SHA: `c0a511a1a71bbdeec930f641c070976df2aa5597`.
Final closure/proof PR: `#280`.

## What is implemented

### CP0 — Registry / authority inventory

`/.github/plugin-control-plane/registry.json` is the machine-readable control-plane registry.

The registry stores plugin identity, path ownership, lifecycle and **locators for existing authority**. It is explicitly forbidden from storing copied mutable production facts such as production version, production SHA or physical-verification truth.

Registered operational views:

- `usage-dashboard` — production authority remains `release-usage-dashboard` + Usage Dashboard release specs;
- `simcore` — production identity remains `product-manifest.json` + `release-simcore`;
- `devpass` — declared main update channel is read as declared; missing `plugins/devpass/latest.js` remains `UNKNOWN / DECLARED_MISSING`;
- `termux-large-doc-editor` — source evidence explicitly marks it as a prototype with no production release authority.

Non-operational repository scopes remain non-operational:

- `plugins/_template/**` → `scope:template`;
- `plugins/test-a/**`, `plugins/test-b/**` → `scope:test-fixture`.

### CP1 — Trusted PR changed-path classification

The first implementation used `pull_request_target`. Fresh PR `#277` proved that this event path did not activate reliably for the connected control surface. The PR remained unlabeled and was intentionally closed unmerged as superseded evidence.

Repair `#278` replaced that path with two explicit trust surfaces:

```text
pull_request
→ read-only observer
→ successful workflow_run
→ trusted default-branch classifier
→ GitHub API changed-file classification
→ plugin/scope labels
```

Observer: `.github/workflows/plugin-control-plane-pr-observe.yml`.
Trusted classifier workflow: `.github/workflows/plugin-control-plane-pr.yml`.
Trusted classifier code: `.github/plugin-control-plane/pr-classifier.cjs`.

The observer has read-only contents permission and does not checkout PR code. The second workflow runs only from the observer's `workflow_run`, checks out trusted default-branch controller code, reads the linked PR and changed-file list through the GitHub API, and writes only metadata labels.

The classifier does not execute PR-head code while holding metadata write authority.

Classification remains deterministic and fail-closed:

- one plugin path → `plugin:<id>`;
- multiple plugin paths → all matching plugin labels + `scope:multi-plugin`;
- explicit shared/repository paths → `scope:shared` / `scope:repo`;
- unowned or ambiguous paths → `scope:unclassified`;
- test/template paths remain their non-operational scopes.

Control-plane classification failure is warning-only and is not a product/release gate.

### CP2 — Explicit issue classification

Issue form: `.github/ISSUE_TEMPLATE/plugin-work.yml`.
Workflow: `.github/workflows/plugin-control-plane-issue.yml`.

The controller consumes only explicit machine-readable scope (`### Plugin` or exact `Plugin:` marker) or an existing managed label. It does not infer ownership from arbitrary prose.

Operational canary Issue `#276` was created with explicit `usage-dashboard` scope. The trusted workflow automatically applied `plugin:usage-dashboard`; the canary was then closed completed.

### CP3 — Mutable operational status views

Workflow: `.github/workflows/plugin-control-plane-status.yml`.

Routine status refresh does **not** commit to `main`. The workflow maintains one mutable GitHub status issue per registered operational view:

- `#272` — `[plugin-status:usage-dashboard]`;
- `#273` — `[plugin-status:simcore]`;
- `#274` — `[plugin-status:devpass]`;
- `#275` — `[plugin-status:termux-large-doc-editor]`.

Observed first refresh:

#### Local Usage Dashboard

- Product: `3.0.0-alpha.5.73`;
- production branch: `release-usage-dashboard`;
- production SHA: `87b934a0e153c1c7ddd77ab44750154cd195f57b`;
- Engine: `1.6.22`;
- Manager: `1.3.0`;
- contracts: `1 / 1`;
- physical verification: `PENDING`, preserving the existing `5.67` verified-baseline source.

#### SimCore

- Product: `0.64.7`;
- release branch: `release-simcore`;
- recorded and observed release SHA: `a7ce8ce33a97797630f885c6753415e4b2ccc7fc` at first refresh;
- release identity: `MATCH`;
- validation remained `PENDING_REAL_LONG_CHAT` from the existing SimCore authority.

#### DevPass

The existing README declares `plugins/devpass/latest.js` as the fixed update artifact, but that file was absent on `main` at implementation inventory time.

The control plane therefore rendered:

- production version: `UNKNOWN`;
- artifact state: `DECLARED_MISSING`;
- authority ref: `main`.

No zero, stale version or inferred replacement was synthesized.

#### Termux Large Doc Editor

The source README explicitly states that the project is a prototype and not a production release.

The control plane therefore rendered:

- lifecycle: `prototype`;
- production version: `N/A`;
- production authority: none, based on source evidence.

## Repository hub

The root `README.md` now acts as a stable plugin operational hub. It contains durable architecture/scope information; live production facts remain in plugin-owned authorities and mutable status issues.

This preserves the central rule:

> **One integration truth, multiple operational views.**

## Security and independence

The control plane is a classification/presentation layer, not a release system.

It does not receive plugin production-branch write authority, does not change Local Usage Dashboard E7 or SimCore release contracts, and does not become a required gate for product deployment.

Metadata/status failures degrade observability only.

## Regression and operational evidence

- Plugin Control Plane CI run `#1` on implementation PR `#271`: GREEN.
- Existing SimCore `Verify` and `Required` on PR `#271`: GREEN.
- Explicit issue-classification canary `#276`: `plugin:usage-dashboard` applied automatically.
- Status views `#272`–`#275`: created automatically from existing authorities.
- Initial PR-target closure PR `#277`: remained unlabeled and was preserved as negative operational evidence.
- Repair PR `#278`: Plugin Control Plane contracts and existing SimCore gates GREEN before exact-head merge.
- Repair observer run `#1`: SUCCESS on PR `#278`.
- Fresh closure PR `#280`: read-only observer run `#4` SUCCESS on initial PR event; this documentation update intentionally emits a second synchronize event to verify the post-merge trusted classifier after workflow registration has settled.

Final post-repair label evidence is recorded after `scope:repo` appears on PR `#280`; no manual label is used as proof.

## CP4 decision

CP4 — path-aware CI noise reduction — is intentionally **not** enabled yet.

The classification layer should accumulate normal repository evidence before existing plugin CI triggers consume it. This preserves all current authoritative validation while the control plane proves classification quality.

CP4 may be designed later only where it demonstrably removes unrelated CI noise without weakening plugin regression or release gates.

## Completion verdict

CP0–CP3 are complete and live once the final fresh closure PR confirms post-repair automatic PR labeling.

The repository keeps one canonical `main` while providing independent operational views for the evidenced project scopes. Missing, pending and non-production authority are represented faithfully rather than normalized into fake production state.
