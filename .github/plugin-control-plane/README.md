# Repository Control Plane

This directory owns the repository-level classification and operational-view controller for the independently managed workstreams that share canonical `main`.

## Boundary

The control plane is metadata infrastructure, not a product release authority.

It may:

- map changed paths to registered plugin/product/repository scopes;
- maintain managed GitHub labels;
- render mutable status issues from workstream-owned authority locators;
- preserve UNKNOWN rather than invent missing operational facts.

It must not:

- publish product runtime bytes;
- replace product-owned release or production authorities;
- weaken existing product CI/release gates;
- execute PR-head code while holding metadata write authority.

## Current PR classification model

PR ownership is converged from trusted `main` by `.github/workflows/plugin-control-plane-pr.yml`.

The dedicated reconciler runs on relevant trusted-main changes, manual dispatch, and a bounded periodic schedule. It enumerates open PRs through the GitHub API, classifies changed paths with `registry.json`, and reconciles only managed `plugin:*`, `product:*`, and `scope:*` labels while preserving unrelated labels.

`.github/workflows/plugin-control-plane-status.yml` also invokes the same trusted-main PR reconciler before refreshing operational views. This is an intentionally redundant metadata-only fallback: a stale or delayed dedicated workflow registration must not leave ownership labels permanently absent. Both invokers execute the same trusted controller and neither becomes product release authority.

The two trusted-main reconciliation invokers hold `pull-requests: write` only because GitHub Actions uses that permission for pull-request label mutation. They still check out `main` explicitly, never execute PR-head code, and expose no merge/review/publish operation in the classifier. The separate `pull_request` observer remains read-only evidence and holds no metadata write authority.

## Registered ownership namespaces

- plugins use `plugin:<id>`;
- independently modeled product roots use `product:<id>`;
- repository/shared/ambiguous/multi-owner conditions use `scope:<id>`.

## Registered fixed scopes

Repository-recognized roots that need deterministic routing but are not plugin/product authorities may be declared in `registry.scopes`.

- fixed scopes use `scope:<id>` labels;
- their descriptors may own path classification and explicit issue aliases only;
- descriptors are `routing-only` and must declare `statusProjection: false`;
- fixed scopes do not receive generated operational status issues and do not create runtime, device, release, deployment, or production authority;
- current fixed roots are `scope:study` for `study/**` and `scope:local-runtime` for `local/**`.

`scope:local-runtime` classifies the shared local operations root only. PocketRisu, Local Usage Dashboard, device, release, and production truth remain with their existing owners.

## Fixed managed label metadata

Entries returned by `labelDefinitions(registry)` are repository-owned fixed label definitions. Trusted-main metadata writers create a missing fixed label and idempotently reconcile an existing fixed label's color and description when they drift from that definition. Matching fixed metadata produces no write, and label names are identity keys rather than rename targets.

Dynamic custom `scope:<id>` labels are intentionally outside this reconciliation set. Existing custom labels keep the #2098 reuse-as-is contract: they are not rewritten or garbage-collected.

## Trusted custom issue scopes

Repository work issues may choose `Scope = custom` and provide a `Custom scope` machine ID. This is issue metadata only; it never creates product, release, deployment, or runtime authority.

Custom IDs use lowercase ASCII letters and digits with single hyphen separators. The repository bounds the final managed label name to 50 characters, so the custom ID is at most 44 characters after the `scope:` prefix. Fixed built-in scope IDs are reserved.

A new custom label is eligible only when the issue author's association is `OWNER`, `MEMBER`, or `COLLABORATOR`. Missing, invalid, reserved, or untrusted custom input fails closed to `scope:unclassified` and does not create a label. Existing custom labels are reused as-is; the controller does not rewrite or garbage-collect them. PR changed-path classification remains registry/path based and does not manufacture custom scopes.

The machine registry remains locator-only. Mutable production facts stay in each workstream's existing source of truth.

## Mutable status refresh safety

Generated status issues are derived metadata views. The trusted status refresh keeps one long-lived generated issue per registered owner and must fail closed when identity evidence is incomplete.

Status discovery is explicitly paginated and bounded. A broad-list miss does not authorize creation by itself: the controller performs an independent exact-title/status-label/generated-marker lookup immediately before create. A lookup failure or incomplete response blocks creation. A genuine create is followed by an exact identity read-back; duplicate or contradictory read-back is failure evidence, not success.

Owner refreshes are failure-isolated for evidence collection: one owner failure does not erase safe results from later owners, but any owner failure makes the overall controller exit nonzero. The status workflow preserves that nonzero result as a failed job. This failure does not change release or product authority; it means only that the derived status projection is incomplete and must not be treated as fresh.

Existing duplicate generated views are reconciled only through this trusted refresh path. Manual status-issue cleanup or manual #485 edits are not validation for the controller contract.
