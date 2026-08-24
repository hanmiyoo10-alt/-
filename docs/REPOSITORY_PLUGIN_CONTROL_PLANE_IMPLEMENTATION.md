# Repository Control Plane — CP0–CP3 Final Closure

Status: **CLOSURE CANDIDATE — implementation merged; final self-healing PR-label proof pending on this closure PR**

Recorded: `2026-08-25`

Reference design: `docs/REPOSITORY_PLUGIN_CONTROL_PLANE_DESIGN.md` / Issue `#267`.

Implementation lineage:

- CP0–CP3 implementation PR `#271` → main merge `3640a81a82fcbac0bd0ca8e34a309cc0ff81b8ab`;
- first CP1 repair PR `#278` → main merge `c0a511a1a71bbdeec930f641c070976df2aa5597`;
- final CP1 / ownership completion PR `#282` → main merge `796b8e85268353bd9d1567690d8376ed01f63809`.

The control plane is a repository classification and operational-view layer. It is not a release authority and does not replace any product-owned production source of truth.

## CP0 — ownership registry

Machine registry: `.github/plugin-control-plane/registry.json`.

The registry remains locator-only: it stores ownership paths, lifecycle descriptors and authority locators, but must not copy mutable production facts such as a current production version, release SHA or physical-verification truth.

### Registered plugin scopes

- `plugin:usage-dashboard` — Local Usage Dashboard;
- `plugin:simcore` — SimCore;
- `plugin:devpass` — DevPass;
- `plugin:termux-large-doc-editor` — Termux Large Doc Editor;
- `plugin:voyage-token-check` — Voyage Token Check.

Voyage is intentionally a plugin scope because its own product goal and design documents define the target as a plugin. Its current lifecycle is evidence validation, not production implementation. Status authority is therefore the existing `voyage-token-check/DESIGN_STATUS.md` evidence locator rather than a fabricated release version.

### Registered product scopes

- `product:pocketrisu-helper-mod` — PocketRisu Helper Mod.

PocketRisu Helper Mod is intentionally **not** normalized into `plugin:*`. Its own product root declares `products/pocketrisu-helper-mod/` as an independent ownership boundary and keeps the actual PocketRisu source in `hanmiyoo10-alt/PocketRisu`. The control plane therefore represents it with a separate `product:*` namespace.

### Existing product-root alignment

The registry now binds `products/simcore/**` to the existing SimCore owner. This prevents real SimCore release/tooling paths from falling through to `scope:unclassified` merely because they live under the repository product-root layout.

`products/usage-dashboard/**` is also reserved for the existing Usage Dashboard owner so the documented product-root boundary remains classification-compatible without changing current runtime/install paths.

### Non-operational / repository scopes

- templates → `scope:template`;
- test fixtures → `scope:test-fixture`;
- repository control-plane paths → `scope:repo`;
- stable shared repository surfaces → `scope:shared`;
- unknown or ambiguous ownership → `scope:unclassified`.

Multi-owner semantics are explicit:

- multiple registered plugins → `scope:multi-plugin`;
- multiple registered products → `scope:multi-product`;
- plugin + product in one PR → `scope:multi-owner`.

## CP1 — self-healing PR ownership reconciliation

Two event-driven variants produced negative live evidence:

1. initial `pull_request_target` classification did not reliably activate for connected-control-surface PR creation;
2. observer → `workflow_run` chaining still depended on GitHub event linkage as metadata authority.

Final CP1 keeps the `pull_request` observer read-only for bounded evidence, but moves ownership convergence to trusted `main`:

```text
trusted main
→ workflow_dispatch / relevant main push / 5-minute schedule
→ enumerate open PRs
→ read changed files through GitHub API
→ classify with trusted registry
→ converge managed plugin/product/scope labels
```

The reconciler:

- never executes PR-head code with metadata write authority;
- preserves non-managed labels;
- uses bounded pagination;
- fails closed to `scope:unclassified` for unknown or ambiguous paths;
- is observability-only: reconciliation failure does not weaken or block product release gates.

Final implementation owner: `.github/plugin-control-plane/pr-classifier.cjs`.

## CP2 — explicit issue scope

Issue form: `.github/ISSUE_TEMPLATE/plugin-work.yml`.

The form now exposes a generic **Scope** choice covering registered plugins, registered products, shared work and repository work.

The parser accepts:

- new `### Scope` / `Scope:` markers;
- legacy `### Plugin` / `Plugin:` markers for compatibility.

It does not infer ownership from arbitrary prose.

## CP3 — mutable operational views

Workflow: `.github/workflows/plugin-control-plane-status.yml`.

Status refresh writes mutable GitHub issues, never mutable production facts into `main`.

Existing plugin views remain intact and two newly evidenced views were created after `#282` merged:

- Issue `#283` — `[plugin-status:voyage-token-check]`;
  - lifecycle: `design-evidence-validation`;
  - status evidence: `PRESENT`;
  - evidence locator: `voyage-token-check/DESIGN_STATUS.md`.
- Issue `#284` — `[product-status:pocketrisu-helper-mod]`;
  - lifecycle: `operations-product-root`;
  - validation: `ACTIVE`;
  - current priority: `MAIN_PHONE_AUDIO_NOTIFICATION_CALL_HEADSET`;
  - source repo: `hanmiyoo10-alt/PocketRisu`;
  - current-state evidence: `PRESENT`.

Those values are read from the workstream-owned source files. UNKNOWN values remain UNKNOWN; the control plane does not synthesize zero or guessed state.

## Regression evidence

Final `#282` candidate head passed:

- Plugin Control Plane CI run `32766303005` — contract job `97556418334` SUCCESS;
- SimCore CI run `32766302942` — `Verify` SUCCESS and `Required` SUCCESS.

The final implementation was squash-merged exact-head into main as:

```text
796b8e85268353bd9d1567690d8376ed01f63809
```

No Local Usage Dashboard, SimCore, Voyage, DevPass, Termux Large Doc Editor or PocketRisu runtime/release bytes were intentionally changed by this repository-control-plane work.

## Final live proof gate

This closure PR is intentionally a repository-only changed path under `docs/REPOSITORY_PLUGIN_CONTROL_PLANE_*.md`.

Acceptance for final closure is:

```text
this PR remains open
→ trusted scheduled/main reconciler observes it
→ `scope:repo` appears without manual labeling
→ record the evidence in this document
→ exact-head merge this closure PR
```

The old closure PR `#280` describes the superseded observer → `workflow_run` model and must not be merged as the final authority. It is retained only as historical negative/superseded evidence until this final closure succeeds.

## CP4

CP4 path-aware CI noise reduction remains deferred. The control plane must first accumulate normal classification evidence; existing authoritative product CI/release gates remain unchanged.

## Verdict

CP0–CP3 implementation is merged and regression-proven. Final repository closure becomes COMPLETE only after this PR receives automatic `scope:repo` reconciliation evidence and the evidence is recorded before merge.
