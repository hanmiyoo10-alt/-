# Fixed landing branch repair owners

These owners repair only reviewed Mobile Coder Lab landing branch identity after
current D-013 and D-014 admission.

Fixed identities:
- S / S: `/root/nyang-repo` -> `server/work` -> `surface:mcl-landing-branch:S`
- M / M: `/data/data/com.termux/files/home/nyang-worktrees/mainphone-work` -> `mainphone/work` -> `surface:mcl-landing-branch:M`

Public CLIs:
    ./mcl-s-landing-branch-repair inspect <expected-main-sha>
    ./mcl-s-landing-branch-repair apply <expected-main-sha>
    ./mcl-m-landing-branch-repair inspect <expected-main-sha>
    ./mcl-m-landing-branch-repair apply <expected-main-sha>

There is no caller-selected route, repository, worktree, target branch, ref,
remote, command, or recovery policy.

Both owners require a clean fixed landing, the exact expected protected-main
object locally, live remote main equal to that SHA, an ancestor-safe local
target branch, an absent-or-ancestor remote target, and no other worktree using
the target branch. The M owner additionally admits only its reviewed historical
source branch. The S owner admits a current non-target `server/*` source branch
only when its local branch ref equals HEAD and HEAD is an ancestor of expected
main.

Apply re-runs all guards immediately before the effect. It compare-and-swaps
only the fixed local target ref to expected main and then performs one ordinary
non-force switch to that fixed target branch. Success proves final branch, HEAD
and clean worktree while preserving the source branch ref, remote target,
origin/main, every other ref, and every other worktree.

The owners never materialize Git objects and never update remote refs.
Exact-main object materialization remains owned by `mcl-main-object-materialize`.
Landing-freshness remains responsible for origin/main refresh after repair.

A late failure is reported truthfully and is not automatically rolled back.
These owners grant no merge, release, production, runtime, service,
auth/session, RDC, Tailscale, or PocketRisu authority.
