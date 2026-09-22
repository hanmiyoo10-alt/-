# M landing branch repair owner

This owner repairs only the fixed Mobile Coder Lab M landing branch identity after
current D-013 and D-014 admission.

Fixed identity:
- route/executor: M / M
- worktree: /data/data/com.termux/files/home/nyang-worktrees/mainphone-work
- reviewed source branch: mainphone/rdc-prep-milestone-2213
- target branch: mainphone/work
- semantic scope: surface:mcl-landing-branch:M

Public CLI:
    ./mcl-m-landing-branch-repair inspect <expected-main-sha>
    ./mcl-m-landing-branch-repair apply <expected-main-sha>

There is no caller-selected route, repository, worktree, branch, ref, remote,
command, or recovery policy.

Both inspect and apply require the fixed landing to be clean, the exact expected
protected-main object to exist locally, live remote main to equal that SHA, the
historical source HEAD and local target branch to be ancestors of expected main,
the remote target branch to be absent or an ancestor of expected main, and the
target branch not to be checked out by another worktree.

Apply re-runs all guards immediately before the effect. It compare-and-swaps only
the local refs/heads/mainphone/work ref to expected main and then performs one
ordinary non-force switch of the fixed landing worktree to mainphone/work.
Success proves the final branch, HEAD and clean worktree while preserving the
remote target branch, origin/main, every other ref, and every other worktree.

The owner never materializes Git objects and never updates remote refs. Exact-main
object materialization remains owned by the existing mcl-main-object-materialize
owner. The separate landing-freshness owner remains responsible for origin/main
refresh after branch repair.

A late failure is reported truthfully and is not automatically rolled back.
This owner grants no merge, release, production, runtime, service, auth/session,
RDC, Tailscale, or PocketRisu authority.
