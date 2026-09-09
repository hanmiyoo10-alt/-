# SimCore v0.70.11 Resume Tooling Note — Workflow-Specific Fetch Route Rejection

Date: 2026-09-09 KST
Status: **FIX · TOOLING READ ROUTE · FAIL-CLOSED · CLOSED**
Scope: administrative tooling only

## Incident

After merging the candidate-failure evidence transaction, an exact merged-main health lookup attempted to query a workflow-specific GitHub Actions URL through the connected fetch surface.

The connector rejected that read with HTTP 400 / `INVALID_ARGUMENT` because that workflow-filter URL form was not in the connector's allowed public GitHub endpoint set.

No write was attempted and no repository state changed.

The same exact merged-main required check was then resolved through the supported commit check-runs endpoint:

```text
main = 1c2b61b66533dcfced4f2fbc371fa715b5b92f19
check = Required
status = completed
conclusion = success
```

## Disposition

```text
CLASSIFICATION = FIX / TOOLING_READ_ROUTE / ADMIN ONLY
REPOSITORY_MUTATION = NONE
RUNTIME_IMPACT = NONE
RELEASE_SIMCORE_IMPACT = NONE
STATUS = CLOSED AFTER SUPPORTED READBACK
```

Operational guard:

```text
prefer commit check-runs filtering for exact required-check readback
avoid unsupported workflow-specific Actions filter URLs through the connector
```

This note is distinct from substantive validation FIX #1941.
