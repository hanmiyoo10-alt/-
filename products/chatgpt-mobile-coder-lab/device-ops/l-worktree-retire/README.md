# MCL exact-L disposable residue retirement owner v1

`mcl-l-worktree-retire` retires exactly one disposable L `laptop/*` residue after current external authority has already selected that cleanup.

It supports only three auto-classified source-backed states:

1. `PRESENT_REMOTE_PRESENT` — the original exact clean worktree + exact remote/local refs;
2. `PRESENT_REMOTE_ABSENT` — the same exact clean worktree/local ref after partial creation left the matching remote ref absent;
3. `ABSENT_STALE_REGISTRATION` — the physical target is absent but one exact prunable linked-worktree registration/admin identity remains.

It is not a garbage collector, sweeper, retention policy, arbitrary Git wrapper, caller-selected recovery-profile surface, or lease owner.

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
-> inspect target path + exact linked-worktree registration + exact branch/HEAD/local ref
-> auto-classify one of the three reviewed residue profiles
-> for a present target: require clean status and reject hidden index state
-> for an absent target: require exactly one prunable registration and one readable exact admin mapping
-> for stale admin state: require exact HEAD identity, clean index, no hidden index flags, no lock and no holder
-> bind fetch and push to one exact canonical origin URL with no alternate push destination
-> accept remote only at exact expected HEAD or proven absent
-> snapshot L landing branch / HEAD / index / status / FETCH_HEAD
-> ordinary non-force worktree remove of the exact target
-> prove target + registration absent and local ref still exact
-> if remote was exact-present: expected-old CAS delete it
-> if remote was absent: prove it remains absent and perform no remote delete
-> local expected-old update-ref deletion with explicit no-dereference semantics
-> prove target / registration / remote ref / local ref all absent
-> prove landing snapshot preserved exactly
```

There is no caller-selected residue profile. Any target/registration/admin/holder/index/ref evidence outside the three exact profiles remains fail-closed.

The owner never acquires or releases D-013, changes the holder, selects a packet, closes a PR, merges, resets, rebases, stashes, cleans, broadly prunes, force-removes a worktree, recursively deletes files, or accepts arbitrary Git commands.

## Commands

```text
python3 mcl-l-worktree-retire inspect --target <basename> --expected-head <40hex>
python3 mcl-l-worktree-retire apply --target <basename> --expected-head <40hex> --apply
```

`inspect` is read-only. `apply` requires the explicit `--apply` boundary and repeats all identity/clean/holder checks before the first effect.

All receipts are bounded and authority-false. Any identity movement, dirty or hidden-index state, duplicate branch registration, remote URL/push-destination ambiguity, holder presence, delete rejection, or landing drift remains BLOCKED.
