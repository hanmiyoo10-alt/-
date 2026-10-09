# MCL L repository owner v1

`mcl-l-repository-owner` is the L-only mutable repository effect owner for the
explicit D-012 `L / L` route. It is a sibling of the existing S repository
owners, not a generalization or replacement of them.

## Fixed execution identity

```text
route/executor = L / L
landing/read clone = /home/alsl0/nyang-repo on main
feature branch = laptop/*
feature worktree = /home/alsl0/nyang-worktrees/*
repository = hanmiyoo10-alt/-
```

The landing clone is read/currentness input only. It is never a feature
workspace and this owner does not fetch, reset, rebase, stash, clean, switch,
or repair it. A clean landing on exact branch `main` may remain fast-forward
behind the manifest base only when live remote/protected main equal that base,
the exact base object is already present locally, and landing HEAD is an
ancestor of the base. `mcl-main-object-materialize L <sha>` is the separate
no-ref object-acquisition owner when that exact base object is missing. Ahead,
diverged/unrelated, dirty, branch-mismatched, or missing-object state blocks.

## Composition

The owner consumes, rather than replaces, current coordination authority:

```text
canonical main + packet overlap
→ D-013 exact L lease
→ D-014 exact L repository manifest
→ prepare-workspace
→ workspace-holder claim/check
→ exact prepared patch
→ fixed repository-owned validation
→ command-local commit identity
→ ordinary non-force push
→ one non-closing PR
→ existing D-013 release owner
→ existing holder release/cleanup owner
→ existing D-014 COMPLETE owner
```

`prepare-workspace` is the only workspace/ref creation surface. It is
create-only: the local branch, worktree path and remote branch must all be
absent. It creates one `laptop/*` worktree at the exact manifest base and one
matching remote ref at the same SHA. Partial state is preserved on failure.

## Commands

```text
node mcl-l-repository-owner.cjs inspect \
  --manifest <file> --ledger <file> --packet <file>

node mcl-l-repository-owner.cjs prepare-workspace \
  --manifest <file> --ledger <file> --packet <file> --apply

MCL_WORKSPACE_HOLDER_CLAIM=<ephemeral-claim> \
node mcl-l-repository-owner.cjs apply \
  --manifest <file> --ledger <file> --packet <file> \
  --request <file> --patch <file> --pr-request <file> --apply
```

The holder claim is never accepted as a CLI argument and must remain ephemeral.

## Patch request

```json
{
  "schema": "mcl-l-repository-owner-request.v1",
  "packet_ref": "#N",
  "message": "bounded commit message",
  "expected_paths": ["repo/relative/path"],
  "patch_sha256": "<64 lowercase hex>"
}
```

`expected_paths` must equal the D-014 manifest's exact path scopes. The patch
must be a bounded regular non-symlink file, must hash exactly, must apply cleanly,
must stage only ordinary `100644` paths, and must pass `git diff --check`.

## PR request

```json
{
  "schema": "mcl-l-pr-publication-request.v1",
  "title": "bounded title",
  "body": "Refs #N"
}
```

Closing keywords are rejected. Publication is always `base=main`, exact
manifest head branch, non-draft, and exact-head read back.

## Recovery-bound prepared continuation

The literal `continue-prepared` operation is the only reviewed re-entry for an
exact L candidate whose patch was already staged before an interrupted owner
apply. It does not replay normal `apply` and it is not a generic start-phase or
Git-command selector.

```text
MCL_WORKSPACE_HOLDER_CLAIM=<ephemeral-claim> \
node mcl-l-repository-owner.cjs continue-prepared \
  --manifest <recovery-rebind-manifest> --ledger <ledger> --packet <packet> \
  --continuation-request <request> --pr-request <pr-request> --apply
```

The continuation manifest must be an exact fresh L/L D-013/D-014 binding for
the existing feature branch/worktree and must carry exactly one reference each
for the prior manifest, prior blocked completion receipt, blocker-repair stage
receipt, and exact prepared-diff digest. Ordinary stage-entry manifests cannot
enter this path.

The request contains only a bounded commit message, exact expected paths, the
prepared digest and the three recovery-lineage digests. It cannot select a
branch, worktree, base, current-main SHA, remote, executable, Git command, merge
strategy, retry count or fallback. Current protected main is read independently.

Before any effect the owner requires the local and remote feature branch at the
reviewed prepared base, exact staged paths/digest/modes, no unstaged/untracked or
unmerged residue, current-main ancestry, and an already-local current-main commit
object. A missing current-main object blocks and hands off to the existing
`mcl-main-object-materialize L <sha>` owner.

Replay proof uses a private temporary Git index loaded from exact current main.
The staged patch must apply there with the same changed-path/change-kind, stable
patch semantics and exact blob+mode identities. No feature-worktree bytes or refs
are changed by replay proof.

Effect order is fixed and exactly-once aware:

```text
PREPARED
→ current-source fixed validation
→ candidate commit with fixed command-local identity
→ ordinary non-force merge of exact current main when stale
→ exact current-main-relative path/blob/mode proof
→ current-source fixed validation again
→ ordinary non-force push
→ one exact non-closing PR
```

Exact COMMITTED, CURRENTIZED and PUSHED states suppress duplicate effects after
a lost acknowledgement. A different currentization parent, remote-head movement,
merge conflict, payload/mode drift or ambiguous PR fails closed. No reset,
restore, stash, clean, rebase, cherry-pick, force push or patch reapplication is
part of this operation.

Because the preserved feature workspace may predate the continuation owner, the
owner and coordination contract checks run from the exact current-source snapshot
that invoked the owner. Changed candidate CJS syntax and Git diff checks run
against the real feature workspace.

## Workflow-file OAuth preflight

When the actual candidate diff touches a path below `.github/workflows/`,
GitHub requires an OAuth credential with the `workflow` scope to add, update,
delete, or rename that workflow through Git transport. Workflow-touch detection
is derived from Git's rename-aware `--name-status -z -M` candidate diff and
includes both source and destination paths for rename/copy records.

Normal `apply` performs this classification after the patch has been staged
but before commit, so a missing or unknown workflow capability fails closed in
the existing PREPARED state. `continue-prepared` derives the same candidate
paths from the staged PREPARED diff or from the original candidate commit
relative to the reviewed base, never from later current-main merge noise.

For workflow-touch candidates the owner reads the effective push URL with
`git remote get-url --push --all origin`. Exactly one push URL must exist and
it must equal `https://github.com/hanmiyoo10-alt/-.git`. The owner then probes
OAuth scopes with fixed `/usr/bin/gh api -i user` under the sanitized child
environment. The actual workflow-path push is explicitly bound to that same gh
credential by first clearing inherited generic and fixed-GitHub HTTPS
`http.extraHeader` values, then resetting inherited GitHub HTTPS credential
helpers for the push command and installing exactly
`!/usr/bin/gh auth git-credential`.

The preflight parses only the `X-OAuth-Scopes` response header and never reads,
emits, refreshes, or changes token/password/header credential material.

```text
no workflow-touch path -> existing behavior unchanged
workflow touch + effective push URL not exactly fixed HTTPS origin
  -> BLOCKED / GITHUB_PUSH_CREDENTIAL_BINDING_REQUIRED
workflow touch + push URL evidence unavailable
  -> UNKNOWN / GITHUB_WORKFLOW_ORIGIN_UNOBSERVED
workflow touch + known workflow scope absent
  -> BLOCKED / GITHUB_WORKFLOW_SCOPE_REQUIRED
workflow touch + scope evidence unavailable/ambiguous
  -> UNKNOWN / GITHUB_AUTH_SCOPE_UNOBSERVED
workflow touch + exact push URL + workflow scope
  -> continue through existing owner gates
```

The owner never runs `gh auth refresh`, opens an authorization flow, or mutates
GitHub credentials. Adding `workflow` remains an explicit user-controlled
prerequisite. Existing non-force push, remote-head readback, holder, D-013/D-014,
PR, merge, release and production boundaries are unchanged.

## Fixed validation

Before commit the owner always runs repository-owned checks for:

- this owner source syntax;
- this owner contract tests;
- D-013 task-lease tests;
- D-014 task-handoff tests;
- workspace-holder tests;
- syntax for every changed `.cjs` path;
- staged diff whitespace/mode/path integrity.

There is no caller command, argv, shell fragment, validation profile selector,
repository selector, route selector, executor selector, retry count, or fallback.

## Authority boundary

A successful owner receipt proves only the bounded L repository effect through
PR publication. It does not release D-013, release the holder, publish D-014
COMPLETE, merge the PR, write main, release software, mutate runtime/device
state, or prove Step-C live L execution. Those remain separately owned gates.

Model selection is orthogonal and remains
`UNPINNED / TASK_SELECTED / BENCHMARK_REQUIRED` until representative L
workloads are benchmarked.
