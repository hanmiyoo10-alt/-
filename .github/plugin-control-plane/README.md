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

The workflow runs on relevant trusted-main changes, manual dispatch, and a bounded periodic schedule. It enumerates open PRs through the GitHub API, classifies changed paths with `registry.json`, and reconciles only managed `plugin:*`, `product:*`, and `scope:*` labels while preserving unrelated labels.

The separate `pull_request` observer is read-only evidence; it is not classification authority.

## Registered ownership namespaces

- plugins use `plugin:<id>`;
- independently modeled product roots use `product:<id>`;
- repository/shared/ambiguous/multi-owner conditions use `scope:<id>`.

The machine registry remains locator-only. Mutable production facts stay in each workstream's existing source of truth.
