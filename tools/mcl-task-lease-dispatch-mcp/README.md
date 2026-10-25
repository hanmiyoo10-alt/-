# MCL D-013 Task-Lease Dispatch MCP

Fixed-purpose sibling MCP for the canonical repository `hanmiyoo10-alt/-`.

This service exists only to expose the already-reviewed MCL D-013 lease workflow through a bounded connected surface. It does not replace #2352, `task-lease.cjs`, `mcl-coordination-operator.cjs`, Work System overlap, D-014, workspace-holder, Git/PR validation, merge, release, runtime, or production authority.

## Public tools

Exactly two tools are exposed:

- `d013_acquire`
- `d013_release`

There is no caller-selected repository, workflow, ref, URL, REST endpoint, HTTP method, token, shell command, executable, retry count, merge operation, or arbitrary GitHub action.

The fixed effect identity is:

```text
repository = hanmiyoo10-alt/-
workflow   = .github/workflows/mcl-task-lease.yml
ref        = main
```

## Semantic ownership

The service directly imports the merged repository owner:

`products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs`

and delegates packet/ledger parsing plus acquire/release plan construction to its exported `planAcquire`, `planRelease`, and `readContext` functions.

The new code owns transport only:

```text
caller supplies exact reviewed D-013 inputs
→ existing operator builds exact plan/lease identity
→ require supplied expected_generation == fresh operator ledger generation
→ fixed GitHub workflow_dispatch
→ bounded fresh-run attribution
→ exact workflow/job/log/input/result identity
→ fresh #2352 readback
→ existing authority-false operator receipt
```

No source file patches #2352 directly.

## Dedicated credential

Live calls require only:

`GITHUB_D013_DISPATCH_TOKEN`

The service deliberately does not read `GITHUB_TOKEN`, `GH_TOKEN`, host `gh` credentials, token files, Repo Cockpit credentials, or caller-provided credentials.

The deployment credential must be separately provisioned after repository implementation converges. It must be least privilege for the fixed repository and sufficient for:

- reading the source packet and #2352;
- dispatching/reading the fixed Actions workflow;
- reading bounded run/job logs needed for exact attribution.

Credential provisioning is not part of IMPLEMENTATION_PR.

## Acquire contract

`d013_acquire` requires:

- exact packet ref;
- exact expected ledger generation;
- route / executor;
- normalized requested scopes;
- literal `DISJOINT` overlap disposition;
- reviewed workspace kind, branch, worktree;
- optional exact observed-base SHA where the existing D-013 profile permits/requires it.

The existing operator validates route/executor/workspace/scope semantics and computes the lease id. The MCP never infers overlap or routing.

## Release contract

`d013_release` requires:

- exact packet ref;
- exact expected ledger generation;
- exact 64-hex active lease id.

The existing operator verifies the lease belongs to the packet before a workflow is dispatched.

## Dispatch attribution

The REST transport follows the existing operator semantics:

1. inventory at most 20 recent fixed workflow-dispatch runs;
2. dispatch exactly once;
3. inspect only fresh runs;
4. require exact workflow name/path, event, main ref, and the single `mutate-ledger` job;
5. require every normalized workflow input in the bounded job log;
6. require exactly one matching canonical `MCL_TASK_LEASE` result;
7. perform exact fresh ledger readback;
8. never automatically dispatch a second workflow.

If no fresh/unknown run is observed, exact generation+1 durable-effect reconciliation is allowed only under the same acquire/release identity constraints as #3203. Ambiguity stays UNKNOWN.

## Rate limit

The MCP effect surface shares one in-process default bound of 3 tool effects per 60 seconds. Rate limiting never performs a workflow dispatch.

## Deployment boundary

IMPLEMENTATION_PR is repository source only.

Later stages separately own:

1. dedicated credential provisioning;
2. separate Railway service deployment from exact merged source;
3. separate private sibling plugin/MCP connection;
4. natural D-013 acquire/release proof, preferably consumer #3762.

The existing `repo-cockpit-aggregator` remains strictly read-only.

## Validation

```sh
cd tools/mcl-task-lease-dispatch-mcp
npm test
node --check src/core.mjs
node --check src/server.mjs
```

Tests use fake GitHub transport only. No live workflow dispatch or credential is required.