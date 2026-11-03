# MCL exact-L clean worktree retirement owner v1

`mcl-l-worktree-retire` removes exactly one clean disposable L `laptop/*` worktree and its matching remote/local branch refs after current external authority has already selected that cleanup.

It is not a garbage collector, sweeper, retention policy, arbitrary Git wrapper, or lease owner.

## Fixed identity

- control repository: `/home/alsl0/nyang-repo`
- disposable root: `/home/alsl0/nyang-worktrees`
- remote: `origin`
- branch: derived only as `laptop/<target>`
- target: one safe basename directly below the fixed root
- exact expected HEAD: required

## Contract

```text
fresh external packet / overlap / D-013 cleanup reservation
-> inspect exact clean registered worktree
-> prove exact branch / HEAD / local ref / remote ref
-> prove workspace holder absent
-> snapshot L landing branch / HEAD / index / status / FETCH_HEAD
-> ordinary non-force worktree remove
-> prove worktree absent while refs remain exact
-> remote expected-old CAS deletion
-> prove remote absent while local ref remains exact
-> local expected-old update-ref deletion
-> prove worktree / remote ref / local ref all absent
-> prove landing snapshot preserved exactly
```

The owner never acquires or releases D-013, changes the holder, selects a packet, closes a PR, merges, resets, rebases, stashes, cleans, prunes, force-removes a worktree, recursively deletes files, or accepts arbitrary Git commands.

## Commands

```text
python3 mcl-l-worktree-retire inspect --target <basename> --expected-head <40hex>
python3 mcl-l-worktree-retire apply --target <basename> --expected-head <40hex> --apply
```

`inspect` is read-only. `apply` requires the explicit `--apply` boundary and repeats all identity/clean/holder checks before the first effect.

All receipts are bounded and authority-false. Any identity movement, dirty state, holder presence, remote ambiguity, delete rejection, or landing drift remains BLOCKED.
