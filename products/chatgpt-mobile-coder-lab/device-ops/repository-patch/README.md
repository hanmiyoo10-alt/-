# MCL repository patch owner

This directory owns the first Mobile Coder Lab ordinary repository mutation
primitive behind the reviewed dispatch/handoff chain.

It is deliberately S-only in v1 and operates only on an already-prepared exact
D-013 `repository` workspace:

```text
route=S
executor=S
branch=server/*
worktree=/root/nyang-worktrees/*
```

It does not replace `tools/repo-write/patch_branch.py`. The repository-wide
writer keeps its existing `agent-patch/**` namespace. This owner exists because
D-013 must describe the actual workspace being mutated.

## Components

`mcl-worktree-patch.py` is a fixed three-phase effect primitive:

```text
prepare
→ commit
→ push
```

The phases are intentionally separate so the host owner can re-check current
packet, lease, manifest, and workspace-holder evidence immediately before every
later effect boundary.

`mcl-repository-patch-owner-invoke.cjs` is the guarded host invoker. It accepts
only repository identity plus handoff/manifest/request/patch data files. It
does not accept a command, executable, owner selector, branch, worktree,
executor, base SHA, remote, retry count, or environment payload.

## Required upstream evidence

Before invocation the caller must already have:

1. current D-012 route `S` / executor `S`;
2. exact Work System `DISJOINT` scopes for the intended repository paths;
3. one active D-013 repository lease for the exact `server/*` branch/worktree;
4. one D-014 `REPOSITORY_MUTATION` manifest bound to the current packet body,
   exact lease/workspace/base and exact path scopes;
5. one workspace-holder claim from the existing holder owner;
6. one `mcl-execution-handoff.v1` `HANDOFF_READY / phase=1/1` receipt.

The patch request hash must also appear in D-014 `inputRefs` as:

```text
receipt:mcl-repository-patch-request:<patch-sha256>
```

## Patch request

Caller-owned request data is bounded:

```json
{
  "schema": "mcl-repository-patch-request.v1",
  "message": "docs: bounded edit",
  "expected_paths": ["docs/example.md"],
  "patch_sha256": "<64-hex>"
}
```

The patch is a separate bounded UTF-8 unified diff. Branch/worktree/base identity
comes only from D-014/D-013, never from this request.

## Primitive semantics

### prepare

Requires the exact clean leased worktree at the exact base and requires the
remote `server/*` branch to still equal that base. It validates the hash-bound
patch, runs `git apply --check` then `git apply --index`, derives actual changed
paths/modes from Git, requires exact expected-path equality, and runs
`git diff --cached --check`.

It does not commit or push.

### commit

Requires the same worktree/branch/base, no unstaged or untracked state, the exact
prepared staged-diff digest, and the same changed-path contract. It creates
exactly one commit using fixed bot identity and requires its parent to be the
exact old head.

It does not push.

### push

Requires the exact local new head whose parent is the old head, a clean worktree,
and a fresh remote branch read still equal to the exact old head. It performs one
ordinary non-force push to the same `server/*` branch and requires post-write
remote head to equal the new commit.

It does not open or merge a PR.

## Guarded invocation

The Node invoker re-reads the source packet and #2352 before `prepare`,
`commit`, and `push`. Every guard requires:

- packet native-open and nonterminal;
- packet Interaction stage `IMPLEMENTATION_PR`;
- exact packet-body digest still equal to D-014;
- exactly one active matching D-013 lease;
- route/executor/scopes/workspace/base equality;
- workspace-holder identity and raw ephemeral claim still valid.

The holder claim is read only from `MCL_WORKSPACE_HOLDER_CLAIM`. It is stripped
from the primitive child environment and must never be persisted in Git,
issues, receipts, or logs.

Request and patch files are also hash-rechecked between effect phases. A changed
input becomes explicit `CONFLICT` rather than being silently re-read as a new
instruction.

There is no automatic retry and no reset/stash/clean rollback. If a later guard
fails after prepare or commit, the real partial leased workspace is preserved
for explicit diagnosis/recovery.

## Generic execution receipt and agent-view output

Successful invocation is projected through repository-wide
`REPOSITORY_EXECUTION_RECEIPT v2` with independent lifecycle, attention and
result axes:

```text
primitiveId=mcl:repository-worktree-patch
executionSurface=MCL:S
stage=HOST_ORCHESTRATED_REPOSITORY_PATCH
executionLifecycle=FINISHED
attentionDisposition=COMPLETE
result=PASS
nextLegalAction=HOLDER_CHECK_THEN_RELEASE_D013_AND_RECORD_D014_COMPLETION
```

Only this owner migrates to v2 here; unrelated legacy v1 producers remain
unchanged. The receipt records bounded affected paths and the resulting commit
locator. All mutation/execution/merge/release/production/runtime/security
authority fields remain false. The receipt is evidence, not permission.

The CLI default remains `--format receipt` implicitly. The only optional
output selector is `--format agent-view`; no caller-selected output path,
owner, command, branch, worktree, base, executor, retry or environment payload
is accepted.

In `agent-view` mode the exact same fixed prepare → commit → push owner path
runs. After the canonical v2 receipt exists, the owner derives two fixed
secret-free evidence sidecars in the leased worktree's Git administrative
directory, outside tracked repository bytes:

- canonical v2 receipt JSON;
- `MCL_REPOSITORY_PATCH_EXECUTION_REPORT v1` JSON.

Sidecars use restrictive file mode, bounded content and deterministic
manifest-bound names. They never contain the raw workspace-holder claim,
credentials/tokens, environment dumps, raw patch bytes, arbitrary argv or full
stdout/stderr. If sidecar evidence cannot be materialized, the underlying
canonical effect receipt remains factual while the GPT-facing decision view
fails closed to UNKNOWN rather than inventing a complete locator.

Normal `agent-view` stdout is one final `REPOSITORY_AGENT_DECISION_VIEW v1`.
For PASS it exposes only bounded effect facts such as changed-file count,
commit-created, remote-head-exact and commit locator. `pr=null` is explicit
because this owner still does not create pull requests. The view proves only
`IMPLEMENTATION_EFFECT`, not whole `IMPLEMENTATION_PR` completion.

The invoker itself still does not release D-013, remove the holder, create D-014
completion evidence, open/merge a PR, touch main, or perform release/production
effects.

## Validation

```text
python3 products/chatgpt-mobile-coder-lab/device-ops/repository-patch/tests/test-worktree-patch.py -v
node products/chatgpt-mobile-coder-lab/device-ops/repository-patch/tests/test-owner-invoke.cjs
```

Existing repository patch writer, D-013, D-014, workspace-holder, coordination
operator and generic execution-receipt regressions remain independent owners and
must stay green.
