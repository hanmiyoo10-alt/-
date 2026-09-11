# Product Roots

This repository hosts multiple independently released products on one `main` branch, plus isolated product-adjacent operational/research roots that explicitly declare when they do not own a release authority.

Product ownership is separated under:

- `products/simcore/`
- `products/usage-dashboard/`
- `products/pocketrisu-helper-mod/`
- `products/chatgpt-mobile-coder-lab/`
- `products/app-api-mod-lab/`

The product roots define ownership and release boundaries. Existing runtime/install paths remain unchanged for compatibility.

`products/chatgpt-mobile-coder-lab/` is an **experiment/research root only**. It records the Android two-phone / two-ChatGPT-account local-coding-agent investigation and does not create a production, deployment, or release authority.

`products/app-api-mod-lab/` is an **independent app/API modification research root**. Until a concrete target declares its own authority, it does not create source, runtime, deployment, or release authority for any external app or service.

Isolation phase 1 keeps all compatibility paths stable while product ownership and main-write serialization are established.

## Main-write rule

Any workflow that can commit or push to `main` must participate in the shared GitHub Actions concurrency group:

```text
repo-main-write
```

Build/test work may remain product-specific and parallel. The shared lock is only for workflows/jobs that can mutate `main`.

Release channels remain independent:

- SimCore → `release-simcore`
- Local Usage Dashboard → `release-usage-dashboard`
- PocketRisu Helper Mod → documentation/operations product root; no automatic release-channel writes
- ChatGPT Mobile Coder Lab → experiment/research documentation only; no release channel and no runtime authority
- App API Mod Lab → research/modification product root; no release channel and no external runtime authority until a concrete target contract declares one

Do not move or merge release-channel ownership across product roots.
