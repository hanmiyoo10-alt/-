# MCL worktree cleanup v1

`mcl-worktree-cleanup` is a narrow operator-facing helper for removing exactly one
completed disposable Mobile Coder Lab Git worktree after current external authority
has already selected and reserved that cleanup operation.

It is not a garbage collector, retention policy, task lease owner, branch sweeper,
remote-ref writer, tmp cleaner, receipt cleaner, scheduler, or repository readiness
authority.

## Fixed profiles

The CLI accepts only semantic executor `S` or `M` and a safe target basename.
Repository and worktree roots are compiled into the helper:

- `S`: control `/root/nyang-repo`, disposable root `/root/nyang-worktrees`, branches `server/*`.
- `M`: control `/data/data/com.termux/files/home/nyang-repo`, disposable root
  `/data/data/com.termux/files/home/nyang-worktrees`, branches `mainphone/*`.
- M protected landing `mainphone-work` is never a cleanup target.

No caller-supplied repository root, worktree root, absolute deletion path, command,
or shell string is accepted.

## Commands

```text
mcl-worktree-cleanup inspect --executor S|M --target <basename> \
  --expected-branch <server/*|mainphone/*> --expected-head <40hex>

mcl-worktree-cleanup apply --executor S|M --target <basename> \
  --expected-branch <server/*|mainphone/*> --expected-head <40hex> --apply
```

`inspect` is read-only. `apply` requires the literal `--apply` effect flag and
reruns the complete eligibility proof immediately before removal.

## Eligibility

A worktree is eligible only when all reviewed evidence agrees:

- the basename resolves directly below the fixed disposable root with no symlink/alias escape;
- the target is registered as a linked worktree of the fixed control repository;
- it is not a protected landing/control target;
- branch family, exact expected branch, HEAD, and local branch ref all match;
- tracked, staged, untracked, and ignored residue are all absent;
- the worktree Git-admin area has no `mcl-workspace-holder.v1.json` record.

Time, age, mtime, naming convention, or a completed issue alone never makes a target
eligible. A holder record is only detected; this helper never removes or reconciles
it because `mcl-workspace-holder` owns that state.

## Effect boundary

The single allowed deletion effect is equivalent to:

```text
git -C <fixed-control-repository> worktree remove <exact-fixed-root-target>
```

No force flag is used. The helper has no reset, clean, checkout, stash, prune-all,
filesystem recursive-delete, local-branch-delete, remote-ref-delete, PR-close, tmp,
receipt, or experiment-staging cleanup path.

After removal, it proves the target is no longer registered/present, the local
branch ref still exists at the exact expected SHA, and the fixed control/landing
branch, HEAD, and status digest are unchanged.

## Coordination boundary

This helper grants no mutation authority and does not acquire or release D-013.
A real `apply` must be wrapped by a current work packet, fresh overlap/currentness
evidence, and an exact D-013 repository-workspace reservation for the cleanup target.
D-014 evidence, when used by the surrounding phase, remains separately owned.

A successful local eligibility or removal receipt does not mean the repository,
device, merge, release, or production state is healthy or authorized.

## Output / privacy

The helper emits one compact JSON receipt with fixed schema/mode/status/reason
vocabulary, semantic executor, sanitized basename, and expected/observed Git identity.
It never emits an arbitrary absolute path, raw `git status`, dirty file names, holder
claim material, device/session/account identifiers, credentials, environment dumps,
or free-form diagnostics. `details` is always `withheld`.

## Validation

```text
python3 products/chatgpt-mobile-coder-lab/device-ops/worktree-cleanup/tests/test-contract.py -v
python3 -m py_compile products/chatgpt-mobile-coder-lab/device-ops/worktree-cleanup/mcl-worktree-cleanup \
  products/chatgpt-mobile-coder-lab/device-ops/worktree-cleanup/tests/test-contract.py
```
