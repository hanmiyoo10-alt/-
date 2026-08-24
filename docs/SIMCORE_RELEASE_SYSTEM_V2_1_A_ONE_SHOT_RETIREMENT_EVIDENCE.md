# SimCore Release System v2.1 — A One-Shot Retirement Evidence

Date: 2026-08-25
Status: **CI VERIFIED · NON-RUNTIME · READY TO MERGE**
Scope: retire v0.64.7-only candidate orchestration after the first real R release

## Decision

The following executable one-shot workflows are retired:

- `.github/workflows/product-simcore-06407-candidate-prep.yml`
- `.github/workflows/product-simcore-06407-candidate-prep-observable.yml`

Historical builders, candidate identity, release spec, release record, and retrospective evidence remain durable.

## Safety boundary

This work does not modify:

- `plugins/simcore/latest.js`
- `plugins/simcore/install.js`
- `release-simcore`
- candidate `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`
- the current human live gate `06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT`

Classification:

```text
06407_CANDIDATE_ONE_SHOT_WORKFLOWS_STILL_ACTIVE
= FIX / R2.1-A / NON_RUNTIME
```

## Permanent CI evidence

PR `#266` initial permanent CI:

```text
run      32760672505
Verify   97538492831  PASS
Required 97538636908  PASS
```

The removal is therefore accepted by the permanent verifier. Final merge must still be followed by durable-main absence re-observation before R2.1-A is called closed.
