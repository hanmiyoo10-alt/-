# L stale linked-worktree recovery

This directory owns one narrow recovery effect for an L repository worktree whose
physical directory is already absent while Git still retains exactly one linked
worktree registration.

It exists for recovery cases such as #3333. It is not a garbage collector, branch
sweeper, retention policy, lease controller, workspace creator, or replacement for
the existing S/M completed-worktree cleanup owner.

## Fixed topology

Production identity is compiled in:

- control/landing repository: `/home/alsl0/nyang-repo`
- disposable worktree root: `/home/alsl0/nyang-worktrees`
- allowed branch family: `laptop/*`
- canonical origin: `hanmiyoo10-alt/-`

The CLI accepts only a safe target basename, exact expected `laptop/*` branch,
exact expected 40-hex HEAD, and a local file containing current D-013 ledger
evidence. The ledger file is evidence input only; it cannot select a repository,
worktree root, Git command, branch mutation, or network destination.

## Commands

```text
python3 products/chatgpt-mobile-coder-lab/device-ops/l-stale-worktree-recovery/mcl-l-stale-worktree-recovery inspect \
  --target <basename> \
  --expected-branch <laptop/*> \
  --expected-head <40hex> \
  --ledger-file <current-ledger-body>

python3 products/chatgpt-mobile-coder-lab/device-ops/l-stale-worktree-recovery/mcl-l-stale-worktree-recovery apply \
  --target <basename> \
  --expected-branch <laptop/*> \
  --expected-head <40hex> \
  --ledger-file <current-ledger-body> \
  --apply
```

`inspect` is read-only. The tracked owner intentionally remains mode `100644`; invoke it through the explicit `python3` entry point shown above. `apply` repeats the entire admission check immediately before one effect.

## Eligibility

The exact target is eligible only when all of these are true:

- the fixed L control repository and worktree root resolve without aliasing;
- the origin is one reviewed canonical GitHub URL;
- the landing is clean;
- the target basename resolves directly below the fixed root;
- the physical target path does not exist, including no symlink;
- `git worktree list --porcelain` contains exactly one registration for that path;
- the registration is explicitly prunable and carries the exact expected branch/HEAD;
- the local branch ref exists at the exact expected HEAD;
- exactly one linked-worktree Git-admin directory points to the target;
- its HEAD points to the exact expected branch;
- it has no `locked` marker and no `mcl-workspace-holder.v1.json`;
- supplied D-013 evidence is structurally valid and has no active Git-workspace
  lease reserving the exact target worktree or branch.

Missing, malformed, ambiguous, active-reservation, holder, lock, identity-drift,
or preservation evidence blocks. Time/age/name similarity never creates
eligibility.

## Effect

The only effect is the equivalent of:

```text
git -C /home/alsl0/nyang-repo worktree remove <exact fixed-root target>
```

There is no `--force`, broad `git worktree prune`, reset, clean, checkout,
stash, branch delete, remote-ref delete, recursive filesystem delete, or arbitrary
Git command surface.

After removal the owner requires:

- target remains physically absent;
- target registration is absent;
- target Git-admin mapping is absent;
- local feature branch ref still equals the exact expected HEAD;
- landing branch, HEAD, clean status, index, FETCH_HEAD and all refs are unchanged;
- every unrelated linked-worktree registration is unchanged.

A successful receipt proves only this stale-registration cleanup. It grants no
source mutation, task lease, holder takeover, merge, release, production, device,
runtime, credential, Cloudflare, or OpenAI tunnel authority.

## Receipt

Output is one bounded JSON object with semantic target basename, expected/observed
branch and HEAD, registration/lease/holder state, stable reason codes,
`details=withheld`, and explicit false authority flags. It never emits arbitrary
absolute paths, holder claim material, raw ledger bodies, dirty filenames,
credentials, device/session/account identifiers, or raw Git stderr.

## Validation

```text
python3 -m py_compile \
  products/chatgpt-mobile-coder-lab/device-ops/l-stale-worktree-recovery/mcl-l-stale-worktree-recovery \
  products/chatgpt-mobile-coder-lab/device-ops/l-stale-worktree-recovery/tests/test_contract.py

python3 products/chatgpt-mobile-coder-lab/device-ops/l-stale-worktree-recovery/tests/test_contract.py -v
```

Refs #3333 #3334 #3313 #2352.
