# Canonical Main Automation — Phase B Shadow

This directory implements the shared, non-runtime canonical-main automation designed in issues #295, #297, #298, #301, and #302.

Phase A established the policy vocabulary, bootstrap contract, incident semantics, and `[repo-ops:main]` operator surface.

Phase B shadow adds trusted-main read-only observation adapters for:

- the permanent `SimCore CI / Required` result on the exact current `main` SHA;
- SimCore manifest ↔ `release-simcore` production-identity parity;
- active workflows that can integrate bounded durable/admin payloads through `scripts/repo-main-write.py`;
- registered project bootstrap descriptors.

Writer failures are classified from direct workflow/job evidence. Exact main-write failure vocabulary such as `MAIN_WRITE_CONTENT_CONFLICT`, `MAIN_WRITE_RETRY_EXHAUSTED`, and path-boundary failures outrank generic workflow-failure classification.

Normalized incidents use a deterministic correlation key. One GitHub issue represents one correlation key and is reused across `OPEN → RECOVERED → OPEN` transitions. Re-observing the same event ID is a no-op.

## Fail-closed shadow gate

`policy.json` keeps `operations.eventAdaptersComplete` set to `false` during the shadow proof. The operations controller may display adapter observations and incident evidence, but it cannot report repository operator state `CLEAR` until the adapter set has direct CI/live evidence and a later bounded activation change sets the flag to `true`.

## Trust boundary

`.github/workflows/canonical-main-ops.yml` runs trusted code checked out from `main` with only:

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

## Activation gate

Do not set `eventAdaptersComplete` to `true` until all configured adapters can be observed successfully from trusted `main`, existing Control Plane and SimCore required regressions are green, and the live operations surface proves that missing/stale observations remain `UNKNOWN` rather than becoming false `CLEAR`.
