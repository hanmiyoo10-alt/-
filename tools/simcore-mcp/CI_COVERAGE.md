# SimCore MCP permanent CI coverage

`tools/simcore-mcp/**` is an owned non-runtime SimCore tooling surface.

Permanent pull-request validation is provided by the existing `SimCore CI` verifier:

```text
tools/simcore-mcp/**
-> MCP_TOOLING
-> GATE_MCP_TOOLING
-> editable install
-> Python compileall
-> full unittest discovery
-> bounded simcore-ci-report.json
-> existing CI_SUMMARY_V1 projection
```

The gate does not create runtime, release, production, mutation, or workflow-dispatch authority. It exists so an MCP-only implementation change cannot be reported as `NOOP_UNRELATED` without executing the MCP Python corpus.

`MAIN_HEALTH`, candidate, release, and product/runtime gate planning remain unchanged by this non-runtime PR-only tooling classification.
