# Repository Control Plane — CP0–CP3 Final Closure

Status: **COMPLETE — CP0–CP3 merged, regression-proven, and live self-healing ownership reconciliation verified**

Recorded: `2026-08-25`

Reference design: `docs/REPOSITORY_PLUGIN_CONTROL_PLANE_DESIGN.md` / Issue `#267`.

Implementation lineage:

- CP0–CP3 implementation PR `#271` → main merge `3640a81a82fcbac0bd0ca8e34a309cc0ff81b8ab`;
- first CP1 repair PR `#278` → main merge `c0a511a1a71bbdeec930f641c070976df2aa5597`;
- CP1 / ownership completion PR `#282` → main merge `796b8e85268353bd9d1567690d8376ed01f63809`;
- trusted-main activation/documentation PR `#287` → main merge `ffc6aeb38513fa50d0a9d6bcda7b7fbfb263a696`;
- trusted status-workflow reconciliation fallback PR `#288` → main merge `6df0d184a00e83c34aadb3a32937936e0a5fe60a`;
- final PR-label permission repair PR `#290` → main merge `d2fca70c5aa1ad7b8607affca6122f45036878af`.

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

The registry binds `products/simcore/**` to the existing SimCore owner. This prevents real SimCore release/tooling paths from falling through to `scope:unclassified` merely because they live under the repository product-root layout.

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

Final CP1 keeps the `pull_request` observer read-only for bounded evidence and places mutation authority only on trusted `main` workflows:

```text
trusted main
→ workflow_dispatch / relevant main push / bounded schedule
→ enumerate open PRs
→ read changed files through GitHub API
→ classify with trusted registry
→ converge managed plugin/product/scope labels
```

The dedicated reconciler and the status-workflow fallback both:

- checkout `ref: main` explicitly;
- never execute PR-head code with metadata write authority;
- preserve non-managed labels;
- use bounded pagination;
- fail closed to `scope:unclassified` for unknown or ambiguous paths;
- are observability-only and do not weaken or block product release gates.

The two trusted-main reconciliation invokers hold `pull-requests: write` because live evidence proved that PR label mutation did not succeed with the previous read-only PR permission boundary. The separate `pull_request` observer remains read-only and has no metadata write authority.

Final implementation owner: `.github/plugin-control-plane/pr-classifier.cjs`.

## CP2 — explicit issue scope

Issue form: `.github/ISSUE_TEMPLATE/plugin-work.yml`.

The form exposes a generic **Scope** choice covering registered plugins, registered products, shared work and repository work.

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

Those values are read from workstream-owned source files. UNKNOWN values remain UNKNOWN; the control plane does not synthesize zero or guessed state.

## Regression evidence

Final permission-repair candidate `#290` head `d8b8923303dc576d40163ff9fab755973f70b1e0` passed before exact-head merge:

- Plugin Control Plane CI run `32768189098` — SUCCESS;
- SimCore CI run `32768189254` — `Verify` SUCCESS and `Required` SUCCESS.

`#290` was squash-merged exact-head into main as:

```text
d2fca70c5aa1ad7b8607affca6122f45036878af
```

No Local Usage Dashboard, SimCore, Voyage, DevPass, Termux Large Doc Editor or PocketRisu runtime/release bytes were intentionally changed by this repository-control-plane work.

## Live CP1 proof

Closure PR `#285` changes only `docs/REPOSITORY_PLUGIN_CONTROL_PLANE_IMPLEMENTATION.md`, which classifies as `scope:repo` under the permanent contract test.

The final live sequence was:

```text
#285 open with zero managed labels
→ #290 exact-head merge to main at d2fca70c5aa1ad7b8607affca6122f45036878af
→ trusted-main reconciliation runs with corrected PR-label permission
→ #285 receives scope:repo automatically
```

Observed GitHub metadata for `#285` shows `scope:repo` applied and the PR updated at `2026-08-24T19:29:24Z`. No manual label was used for this proof.

This satisfies the final CP1 live acceptance gate.

## Failure / feedback record

Failures are retained as engineering evidence rather than rewritten out of history.

1. **Initial `pull_request_target` approach** — did not reliably activate for the connected-control-surface PR path. It was rejected rather than treated as authority.
2. **Observer → `workflow_run` approach** — the observer succeeded, but the chained event path did not produce reliable ownership convergence. The observer was retained only as read-only evidence.
3. **Dedicated trusted-main reconciler after `#282` / activation `#287`** — static classification contracts were GREEN, but live canary `#285` still had zero labels. This proved that classifier correctness alone was insufficient evidence of operational mutation.
4. **Trusted status-workflow fallback `#288`** — the status workflow demonstrably ran and refreshed status Issue `#284` at `2026-08-24T19:21:56.874Z`, while `#285` remained unlabeled. That separated workflow activation from PR-label mutation and narrowed the remaining fault to the mutation permission boundary.
5. **Permission repair `#290`** — changed only the trusted-main reconciliation invokers from `pull-requests: read` to `pull-requests: write`, while contracts continued to forbid PR-event write authority and PR-head execution. After merge, `#285` received `scope:repo` automatically at `2026-08-24T19:29:24Z`.

Feedback carried forward:

- a GREEN classifier contract is not sufficient closure evidence for metadata automation; retain a live canary;
- distinguish workflow activation evidence from mutation evidence;
- keep write authority on trusted-main code only;
- retain warning-only behavior so control-plane failures never weaken product release gates;
- record negative operational evidence instead of normalizing it into a success narrative.

## Superseded closure evidence

Old closure PR `#280` documents the superseded observer → `workflow_run` model. It must not merge and is closed as superseded historical evidence after this final closure lands.

## CP4

CP4 path-aware CI noise reduction remains deferred. Existing authoritative product CI/release gates remain unchanged until enough normal classification evidence exists to design noise reduction without weakening regression coverage.

## Verdict

**CP0–CP3 COMPLETE.**

The repository now has one canonical `main`, independent plugin/product ownership scopes, mutable operational views sourced from existing authorities, and live-proven self-healing PR ownership classification. Voyage remains a plugin scope; PocketRisu Helper Mod remains a distinct product scope. Missing or unknown data is never converted into guessed production state.
