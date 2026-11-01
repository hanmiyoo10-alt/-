# Fixed landing branch repair owners

These owners repair only reviewed Mobile Coder Lab landing branch identity after
current D-013 and D-014 admission.

Fixed identities:
- S / S: `/root/nyang-repo` -> `server/work` -> `surface:mcl-landing-branch:S`
- M / M: `/data/data/com.termux/files/home/nyang-worktrees/mainphone-work` -> `mainphone/work` -> `surface:mcl-landing-branch:M`
- L / L: `/home/alsl0/nyang-repo` -> `main` -> `surface:mcl-landing-branch:L`

Public CLIs:
    ./mcl-s-landing-branch-repair inspect <expected-main-sha>
    ./mcl-s-landing-branch-repair apply <expected-main-sha>
    ./mcl-m-landing-branch-repair inspect <expected-main-sha>
    ./mcl-m-landing-branch-repair apply <expected-main-sha>
    ./mcl-l-landing-branch-repair inspect <expected-main-sha>
    ./mcl-l-landing-branch-repair apply <expected-main-sha>

There is no caller-selected route, repository, worktree, target branch, ref,
remote, command, or recovery policy.

All owners require a clean fixed landing, the exact expected protected-main
object locally, live remote main equal to that SHA, an ancestor-safe local
target branch when present, and no other worktree using the target branch.
The M owner additionally admits only its reviewed historical source branch.
The S owner admits a current non-target `server/*` source branch only when its
local branch ref equals HEAD and HEAD is an ancestor of expected main. The L
owner admits only the exact incident shape `detached HEAD -> main` or an already
converged `main`; a detached HEAD must be an ancestor of expected main. It never
admits an arbitrary named source branch or a symbolic local `main` target ref.
The L remote target is `main` itself and must already equal expected protected
main.

Apply re-runs all guards immediately before the effect. It compare-and-swaps
only the fixed local target ref to expected main and then performs one ordinary
non-force switch to that fixed target branch. Success proves final branch, HEAD
and clean worktree while preserving the source branch ref when one exists,
remote target, origin/main, every other ref, and every other worktree.

The owners never materialize Git objects and never update remote refs.
Exact-main object materialization remains owned by `mcl-main-object-materialize`.
Landing-freshness remains responsible for origin/main refresh after repair.

A late failure is reported truthfully and is not automatically rolled back.
These owners grant no merge, release, production, runtime, service,
auth/session, RDC, Tailscale, or PocketRisu authority.
