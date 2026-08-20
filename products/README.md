# Product Roots

This repository hosts multiple independently released products on one `main` branch.

Product ownership is separated under:

- `products/simcore/`
- `products/usage-dashboard/`

The product roots define ownership and release boundaries. Existing runtime/install paths remain unchanged for compatibility.

## Main-write rule

Any workflow that can commit or push to `main` must participate in the shared GitHub Actions concurrency group:

```text
repo-main-write
```

Build/test work may remain product-specific and parallel. The shared lock is only for workflows/jobs that can mutate `main`.

Release channels remain independent:

- SimCore → `release-simcore`
- Local Usage Dashboard → `release-usage-dashboard`

Do not move or merge release-channel ownership across product roots.
