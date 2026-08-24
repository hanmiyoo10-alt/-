# Repository Plugin Control Plane — Implementation Closure

Status: **CP0–CP3 IMPLEMENTED AND OPERATIONALLY VERIFIED — CP4 DEFERRED**

Recorded: `2026-08-25`

Reference design: `docs/REPOSITORY_PLUGIN_CONTROL_PLANE_DESIGN.md` / Issue `#267`.
Implementation PR: `#271`.
Implementation merge SHA: `3640a81a82fcbac0bd0ca8e34a309cc0ff81b8ab`.
Plugin Control Plane CI: run `#1` — contract job GREEN.

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

Workflow: `.github/workflows/plugin-control-plane-pr.yml`.

The workflow uses `pull_request_target` only as a metadata event. It checks out the trusted default branch controller, reads changed filenames through the GitHub API, and does not checkout or execute PR-head code while metadata write permission is present.

Classification is deterministic and fail-closed:

- one plugin path → `plugin:<id>`;
- multiple plugin paths → all matching plugin labels + `scope:multi-plugin`;
- explicit shared/repository paths → `scope:shared` / `scope:repo`;
- unowned or ambiguous paths → `scope:unclassified`;
- test/template paths remain their non-operational scopes.

Classification failure is warning-only and is not a product/release gate.

### CP2 — Explicit issue classification

Issue form: `.github/ISSUE_TEMPLATE/plugin-work.yml`.
Workflow: `.github/workflows/plugin-control-plane-issue.yml`.

The controller consumes only explicit machine-readable scope (`### Plugin` or exact `Plugin:` marker) or an existing managed label. It does not infer ownership from arbitrary prose.

Operational canary Issue `#276` was created with explicit `usage-dashboard` scope. The trusted workflow applied `plugin:usage-dashboard` without manual labeling, and the canary was then closed completed.

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
- physical verification: `PENDING`, with the existing `5.67` verified-baseline source preserved.

#### SimCore

- Product: `0.64.7`;
- release branch: `release-simcore`;
- recorded and actual release SHA: `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`;
- release identity: `MATCH`;
- validation remains `PENDING_REAL_LONG_CHAT` from the existing SimCore authority.

#### DevPass

The existing README declares `plugins/devpass/latest.js` as the fixed update artifact, but that file is currently absent on `main`.

The control plane therefore renders:

- production version: `UNKNOWN`;
- artifact state: `DECLARED_MISSING`;
- authority ref: `main`.

No zero, stale version or inferred replacement is synthesized.

#### Termux Large Doc Editor

The source README explicitly states that the project is a prototype and not a production release.

The control plane therefore renders:

- lifecycle: `prototype`;
- production version: `N/A`;
- production authority: none, based on the source evidence.

## Repository hub

The root `README.md` now acts as a stable plugin operational hub. It contains durable architecture/scope links only; live production numbers remain in plugin-owned authorities and mutable status issues.

This preserves the central rule:

> **One integration truth, multiple operational views.**

## Security and independence

The control plane is a read/classification/presentation layer, not a release system.

It does not receive production-branch write authority, does not change Usage Dashboard E7 or SimCore release contracts, and does not become a required gate for product deployment.

Metadata/status failures degrade observability only.

## Regression evidence

`Plugin Control Plane CI` run `#1` passed the repository contracts covering:

- registry validation and mutable-truth-key prohibition;
- Usage Dashboard / SimCore / DevPass / Termux path classification;
- template/test-fixture classification;
- multi-plugin, shared, repo and unclassified behavior;
- explicit issue parsing;
- trusted-base PR workflow boundary;
- no PR-head execution with metadata write authority;
- no `contents: write` or `git push` in status refresh;
- source-faithful `UNKNOWN`, `DECLARED_MISSING`, prototype and physical-PENDING semantics.

Existing SimCore `Verify` and `Required` gates also completed GREEN on implementation PR `#271`. No existing plugin production artifact was changed by the implementation.

## CP4 decision

CP4 — path-aware CI noise reduction — is intentionally **not** enabled yet.

Reason: labels and classification should accumulate real repository evidence before existing plugin CI triggers consume them. This preserves all current authoritative validation while the control plane proves classification quality.

CP4 may be designed later only where it demonstrably removes unrelated CI noise without weakening plugin regression or release gates.

## Completion verdict

CP0–CP3 are complete and live.

The repository now keeps one canonical `main` while providing independent operational views for the currently evidenced plugin/project scopes. Missing or non-production authority is represented faithfully instead of being normalized into fake production state.
