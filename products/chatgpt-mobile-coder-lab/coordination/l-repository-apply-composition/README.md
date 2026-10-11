# MCL L prepared apply composition v1

Completes one PREPARED `L / L` transaction by composing existing owners. Adds no Git, PR, lease, holder, merge, runtime, release, or production primitive.

```text
apply --packet '#N' --manifest <m> --request <r> --patch <p> --pr-request <pr> --apply
finalize --packet '#N' --manifest <m> --apply
```

Caller-selected repository/route/executor/branch/worktree, holder material, environment, Git command, PR number, merge strategy, retry, cleanup, runtime, release, or production target is forbidden.

`apply` requires current packet, exact D-014, active exact L/L D-013, PREPARED workspace, holder absent, request/path binding, and PR preflight. Request/patch/PR bytes are privately snapshotted.

Refresh packet/#2352 before holder acquisition and source effect. Source mutation delegates only to the existing L owner.

After PASS: retain final manifest-comment id, recheck holder, release D-013, require readback generation >= release generation, release holder, then publish D-014 COMPLETE. A secret-free activation binds manifest, commit/PR, comment id, and release evidence.

`finalize` resumes only the published, lease-released, holder-absent suffix. It requires matching activation/manifest, lease absence, clean exact local/remote head, and exact open PR, with no source/commit/push/PR-create/lease-release/holder effect.

Completion reuses exact receipts and reconciles ambiguous acknowledgement by exact-comment readback.

Partial failures preserve state. No reset/rebase/stash/clean/force-push/reapply/latest-wins/time takeover/automatic retry. Authority flags remain false.
