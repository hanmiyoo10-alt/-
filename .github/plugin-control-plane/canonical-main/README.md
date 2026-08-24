# Canonical Main Automation — Phase B Active

This directory implements the shared, non-runtime canonical-main automation designed in issues #295, #297, #298, #301, and #302.

Phase A established the policy vocabulary, bootstrap contract, incident semantics, and `[repo-ops:main]` operator surface.

Phase B adds trusted-main read-only observation adapters for:

- the permanent `SimCore CI / Required` result on the exact current `main` SHA;
- SimCore manifest ↔ `release-simcore` production-identity parity;
- active workflows that can integrate bounded durable/admin payloads through `scripts/repo-main-write.py`;
- registered project bootstrap descriptors.

Writer failures are classified from direct workflow/job evidence. Exact main-write failure vocabulary such as `MAIN_WRITE_CONTENT_CONFLICT`, `MAIN_WRITE_RETRY_EXHAUSTED`, and path-boundary failures outrank generic workflow-failure classification.

Normalized incidents use a deterministic correlation key. One GitHub issue represents one correlation key and is reused across `OPEN → RECOVERED → OPEN` transitions. Re-observing the same event ID is a no-op.

## Observation epoch

Writer-workflow incident observation starts at the Phase B shadow deployment epoch declared in `policy.json`.

Runs older than that epoch are historical baseline evidence and cannot open a new incident merely because they are the latest historical run for an infrequently invoked workflow. Runs at or after the epoch remain observable until a later matching recovery.

This boundary was added after the live shadow proof correctly exposed that a pre-adapter historical `SimCore Permanent Release` failure would otherwise be misclassified as a current incident.

## Refresh model

`.github/workflows/canonical-main-ops.yml` refreshes the operator surface through:

- `workflow_run` completion events for Required CI and active writer workflows, providing near-immediate re-observation;
- selected `main` pushes;
- a bounded schedule as self-healing fallback;
- manual workflow dispatch.

## Trust boundary

The workflow runs trusted code checked out from `main` with only:

- `contents: read`;
- `actions: read`;
- `issues: write`.

It never executes PR-head code with metadata-write authority, mutates product/release branches, or pushes Git refs.

## Bootstrap descriptor check

Registered descriptors live under `.github/plugin-control-plane/canonical-main/descriptors/`.

```bash
node .github/plugin-control-plane/canonical-main/bootstrap.cjs check \
  .github/plugin-control-plane/canonical-main/descriptors/voyage-token-check.json
```

## Guidelines render

Rendering is bounded to the exact `guidelines` path declared by the descriptor and refuses to overwrite an existing file.

```bash
node .github/plugin-control-plane/canonical-main/bootstrap.cjs render \
  path/to/project-descriptor.json \
  docs/PROJECT_GUIDELINES.md
```

## Operations state

`policy.json` sets `operations.eventAdaptersComplete=true` only after the shadow implementation passed Plugin Control Plane contracts, SimCore `Verify / Required`, and live trusted-main observation.

The operator state still fails closed to `UNKNOWN` whenever a required current observation is missing, pending, conflicting, or stale. `CLEAR` means only that the configured repository feedback coverage is current and has no unresolved actionable incident; it is not a claim that every product is bug-free.
