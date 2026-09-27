# MCL local branch-ref cleanup v1

`mcl-local-branch-ref-cleanup` is the narrow Mobile Coder Lab effect owner for
removing exactly one proven-disposable **local branch ref** during nonterminal
stage-entry re-entry after the matching worktree and remote ref are already absent.

It is not a branch sweeper, retention policy, worktree remover, remote-ref
deleter, PR closer, generic Git manager, or terminal-residue cleanup owner.

## Fixed profiles

The CLI accepts only semantic executor `S` or `M`:

- `S`: control `/root/nyang-repo`, branch family `server/*`.
- `M`: control `/data/data/com.termux/files/home/nyang-repo`,
  branch family `mainphone/*`.

The permanent branches `server/work` and `mainphone/work` are denied.
Branches outside the fixed family are denied.

No caller-selected repository root, remote, URL, ref prefix, command, shell
string, environment payload, credential, or arbitrary executable is accepted.
## Commands

```text
python3 products/chatgpt-mobile-coder-lab/device-ops/local-branch-ref-cleanup/mcl-local-branch-ref-cleanup inspect \
  --executor S|M --branch <server/*|mainphone/*> --expected-head <40hex>

python3 products/chatgpt-mobile-coder-lab/device-ops/local-branch-ref-cleanup/mcl-local-branch-ref-cleanup apply \
  --executor S|M --branch <server/*|mainphone/*> --expected-head <40hex> --apply
```

`inspect` is read-only. `apply` requires literal `--apply` and reruns the
complete eligibility proof immediately before the deletion effect.

## Eligibility

A target is eligible only when:
- the branch belongs to the fixed executor family and is not permanent;
- `expected-head` is one exact 40-hex identity;
- the exact local branch exists at that expected head;
- no registered worktree uses the branch;
- direct fixed-`origin` observation proves the matching remote ref is absent.

A present remote ref is `REMOTE_BRANCH_PRESENT`. A transport/read failure is
`REMOTE_HEAD_READ_FAILED`. Missing local state never impersonates success.
## Exact-head deletion

The only mutation is equivalent to:

```text
git -C <fixed-control> update-ref -d refs/heads/<branch> <expected-head>
```

The expected old SHA is the atomic deletion precondition. A moved local ref
therefore rejects the delete instead of deleting the new value.

After success the owner requires:
- the local ref is absent;
- the matching remote ref is still absent;
- the fixed control checkout is unchanged;
- the protected landing checkout, when separate, is unchanged.

A failed delete also rechecks preservation and remote absence before returning.

## Worktree and remote boundaries

The normal composition is:

```text
current packet + overlap/currentness + exact D-013 cleanup reservation
→ existing worktree cleanup
→ existing remote branch-ref cleanup or proven remote absence
→ prove no registered worktree uses the branch
→ local branch-ref cleanup
→ fresh stage-entry
```
This owner never removes a worktree and never deletes a remote ref. Terminal
residue cleanup remains a separate terminal-only composition and is not widened
by this owner.

## Coordination boundary

The helper grants no mutation authority by itself and does not acquire or
release D-013, D-014, or the workspace holder. A real `apply` must remain
wrapped by current owning packet evidence, fresh overlap/currentness evidence,
and the exact cleanup reservation required by the surrounding workflow.

All repository/device/merge/release/production authority flags remain false.

## Validation

```text
python3 products/chatgpt-mobile-coder-lab/device-ops/local-branch-ref-cleanup/tests/test-contract.py -v
python3 -m py_compile \
  products/chatgpt-mobile-coder-lab/device-ops/local-branch-ref-cleanup/mcl-local-branch-ref-cleanup \
  products/chatgpt-mobile-coder-lab/device-ops/local-branch-ref-cleanup/tests/test-contract.py
```

Synthetic tests use temporary local repositories and a bare remote. They prove
successful expected-old local deletion and stale-expected race rejection without
touching any real repository ref.
