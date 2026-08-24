# Canonical Main Automation — Phase A

This directory implements the shared, non-runtime foundation designed in issues #295, #297, #298, #301, and #302.

Phase A provides:

- a canonical policy vocabulary for bootstrap, event classes, feedback dispositions, alert severity, and operator-state freshness;
- a bootstrap descriptor validator and durable-guidelines renderer;
- the repository-standard durable guidelines template;
- deterministic event validation, correlation keys, severity mapping, incident OPEN/RECOVERED handling, and operator-state derivation;
- a trusted-main operations controller that maintains a single `[repo-ops:main]` mutable issue;
- contract tests and one real `check-only` descriptor proof using Voyage Token Check evidence.

Phase A deliberately does **not** connect product/release workflows to the event engine yet. `policy.json` therefore keeps `operations.eventAdaptersComplete` set to `false`, which prevents the repository operator surface from reporting `CLEAR` before event coverage is proved.

## Bootstrap descriptor check

```bash
node .github/plugin-control-plane/canonical-main/bootstrap.cjs check \
  .github/plugin-control-plane/canonical-main/examples/voyage-token-check.check-only.json
```

## Guidelines render

Rendering is bounded to the exact `guidelines` path declared by the descriptor and refuses to overwrite an existing file.

```bash
node .github/plugin-control-plane/canonical-main/bootstrap.cjs render \
  path/to/project-descriptor.json \
  docs/PROJECT_GUIDELINES.md
```

## Operations surface

`.github/workflows/canonical-main-ops.yml` runs trusted code from `main` with `contents: read` and `issues: write`. It never mutates product/release branches or commits status snapshots to `main`.

The generated issue is a derived operator view, not a production authority.

## Phase B gate

Do not set `eventAdaptersComplete` to `true` until adapters for canonical main-write results, Required CI transitions, production-authority mismatch/recovery, durable-memory sync, and bootstrap state transitions have direct evidence and regression coverage.
