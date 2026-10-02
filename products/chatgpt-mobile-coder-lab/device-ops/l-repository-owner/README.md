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
