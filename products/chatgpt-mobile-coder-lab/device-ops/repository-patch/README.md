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
   exact lease/workspace/base and full normalized coordination scopes;
5. one workspace-holder claim from the existing holder owner;
6. one `mcl-execution-handoff.v1` `HANDOFF_READY / phase=1/1` receipt.

The patch request hash must also appear in D-014 `inputRefs` as:

```text
receipt:mcl-repository-patch-request:<patch-sha256>
```

Repository-byte authority remains path-only. The manifest may additionally carry
reviewed semantic `surface:` scopes for coordination/effect identity, but the
manifest's complete `path:` subset must equal the request's `expected_paths`
exactly. A surface never substitutes for, adds, or removes a writable path.

Late-effect guards still require the active D-013 lease scopes to equal the full
manifest scope set, including any semantic surfaces.

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

## Recovery-bound prepared continuation

The normal owner path remains unchanged:

```text
prepare
→ optional fixed prepared validation
→ commit
→ push
```

A separately reviewed recovery-rebind manifest may instead use the literal
`continue-prepared` entrypoint when Phase 8.6.5 preserved exact staged bytes.

This path is intentionally not a generic phase selector. It accepts one strict
`mcl-repository-prepared-continuation-request.v1` and requires the active D-014
manifest to bind both the exact prior task manifest and exact effect-recovery
receipt.

The host classifies the physical Git state before any effect:

```text
PREPARED
  HEAD == base
  remote == base
  exact staged paths + prepared digest
  → commit only

COMMITTED
  HEAD^ == base
  exact committed paths/digest/message/fixed bot identity
  remote == base
  → skip commit, push only

PUSHED
  same committed proof
  remote == exact local HEAD
  → skip commit and push
```

No PREPARE runs in continuation mode.

The prepared digest is always the SHA-256 of the exact binary Git diff bytes.
For lower-primitive reuse the host writes those already-proven bytes to a
restrictive ephemeral patch file and uses the same digest as the ordinary
primitive request patch hash. The primitive therefore receives truthful patch
bytes/hash evidence without reapplying them.

The host still requires the fresh process-local workspace-holder claim and
re-runs current packet/D-013/D-014/holder guards before every missing later
effect. A continued effect never gains authority from the continuation receipt
itself.

Lost acknowledgement is fail-safe:

- an exact COMMITTED state suppresses a second commit;
- an exact PUSHED state suppresses a second push;
- a third/conflicting remote head, changed digest/path/message/identity, or
  unresolved state fails closed;
- missing acknowledgement is never interpreted as proof that an effect did not
  happen.

The continuation path never reset/restores/stashes/cleans/reapplies the
workspace, never force-pushes, and never auto-retries.

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


## Manifest-bound prepared-state validation interlock

The owner also exposes one **in-process only** validation seam for the Phase 8.6b
coordinator. The public CLI is unchanged and does not accept a validation
command, profile, script, argv, path, working directory or environment.

The caller supplies a strict data-only request object to `invokeLive()`:

```json
{
  "schema": "mcl-repository-validation-request.v1",
  "profile": "mcl:d014-completion-set:v1"
}
```

Its exact file bytes are SHA-256 bound in the current D-014 manifest as:

```text
receipt:mcl-repository-validation-request:<sha256>
```

If that binding is missing, conflicting, ambiguous or changes during the
invocation, the owner fails closed. A manifest that carries such a binding
cannot silently fall back to the legacy no-validation path.

V1 has one repository-owned fixed profile only:

```text
mcl:d014-completion-set:v1
```

It is admitted only for the exact reviewed completion-set patch paths. After
`PREPARE` succeeds and before `COMMIT`, the owner runs this fixed sequence in
the already-authorized leased worktree:

```text
node --check products/chatgpt-mobile-coder-lab/coordination/completion-receipt-set.cjs
node --check products/chatgpt-mobile-coder-lab/coordination/tests/test-completion-receipt-set.cjs
node --test  products/chatgpt-mobile-coder-lab/coordination/tests/test-completion-receipt-set.cjs
node --test  products/chatgpt-mobile-coder-lab/coordination/tests/test-task-handoff.cjs
```

The executable and argv are repository source, not caller data. Children run
with `shell=false`, a bounded timeout/output ceiling, the manifest worktree as
cwd, and the same sanitized child environment used by the patch primitive.
Holder claims, GitHub tokens and arbitrary caller environment values are not
propagated.

The guarded effect ordering for validation-enabled in-process calls is:

```text
currentness/holder guard
→ PREPARE
→ currentness/holder guard
→ fixed prepared-state validation
→ currentness/holder guard
→ COMMIT with the original prepared_digest
→ currentness/holder guard
→ PUSH
```

The Python primitive remains unchanged. Its existing commit phase recomputes
the exact staged paths, rejects unstaged/untracked residue, and recomputes the
prepared digest. A validator that unexpectedly changes index/worktree/ref state
therefore cannot gain commit authority.

Validation-enabled canonical receipts add one conditional
`prepared-validation` step between `patch-prepare` and `patch-commit`. The
legacy no-validation receipt retains its existing three-step shape.

A validator failure preserves the real prepared state, returns bounded
BLOCKED/UNKNOWN/CONFLICT evidence, leaves commit/push skipped, and does not
reset, stash, clean, force-push or auto-retry. Abandoned partial-state recovery
remains owned by the existing interrupted-effect recovery contracts.

Adding another validation profile is a reviewed source/authority change, not
caller configuration.


## Validation

```text
python3 products/chatgpt-mobile-coder-lab/device-ops/repository-patch/tests/test-worktree-patch.py -v
node products/chatgpt-mobile-coder-lab/device-ops/repository-patch/tests/test-owner-invoke.cjs
```

Existing repository patch writer, D-013, D-014, workspace-holder, coordination
operator and generic execution-receipt regressions remain independent owners and
must stay green.
