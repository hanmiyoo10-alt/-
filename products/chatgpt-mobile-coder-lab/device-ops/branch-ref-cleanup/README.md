# MCL remote branch-ref cleanup v1

`mcl-branch-ref-cleanup` is the narrow Mobile Coder Lab effect owner for
removing exactly one completed disposable **remote branch ref** after current
external authority has already selected that branch for cleanup.

It is not a branch sweeper, retention policy, worktree remover, local-branch
deleter, PR closer, generic GitHub administration surface, or repository
readiness authority.

## Fixed profiles

The CLI accepts only semantic executor `S` or `M`:

- `S`: control `/root/nyang-repo`, remote `origin`, branch family `server/*`.
- `M`: control `/data/data/com.termux/files/home/nyang-repo`, remote `origin`,
  branch family `mainphone/*`.

The permanent branches `server/work` and `mainphone/work` are denied.
Branches outside the executor family are denied, which also excludes `main`,
release/production refs, tags, and arbitrary `refs/*` identities.

No caller-selected repository root, remote, URL, ref prefix, command, shell
string, environment payload, credential, or arbitrary executable is accepted.

## Commands

```text
python3 products/chatgpt-mobile-coder-lab/device-ops/branch-ref-cleanup/mcl-branch-ref-cleanup inspect --executor S|M \
  --branch <server/*|mainphone/*> --expected-head <40hex>

python3 products/chatgpt-mobile-coder-lab/device-ops/branch-ref-cleanup/mcl-branch-ref-cleanup apply --executor S|M \
  --branch <server/*|mainphone/*> --expected-head <40hex> --apply
```

`inspect` is read-only. `apply` requires the literal `--apply` flag and
reruns the complete eligibility proof immediately before the deletion effect.

## Eligibility

A target is eligible only when all local and remote identity checks agree:

- the branch is valid and belongs to the fixed executor family;
- the branch is not the fixed permanent landing branch;
- the expected head is one exact 40-hex commit identity;
- direct `origin` observation reports exactly that branch at that head;
- the same local branch ref exists at the exact expected head;
- no registered worktree of the fixed control repository is using the branch.

A missing remote branch is `REMOTE_BRANCH_MISSING`. A transport/read failure is
`REMOTE_HEAD_READ_FAILED`. Absence is never converted into success.

Time, age, branch naming, issue closure, PR state, cleanliness, or ref existence
alone never creates cleanup authority.

## Exact-head deletion

The only remote mutation is one explicit expected-old ref deletion equivalent to:

```text
git -C <fixed-control> push \
  --force-with-lease=refs/heads/<branch>:<expected-head> \
  origin :refs/heads/<branch>
```

The lease names the exact destination ref and exact value that must still be
present. A read-then-unconditional-delete sequence is not used. Broad
`--force`, implicit lease state, wildcard deletion, and multi-ref deletion are
not supported.

After a successful push the helper performs a fresh direct remote read and
requires the exact ref to be absent. It also requires the local branch ref to
remain present at the expected SHA.

The fixed control repository and protected landing checkout are snapshotted
before the effect. Branch, HEAD, and worktree-status digest must be unchanged
after success. Failed deletion also checks preservation before returning.

## Worktree boundary

Remote branch cleanup and worktree cleanup are separate destructive effects.

The normal MCL order is:

```text
external retention decision
→ current packet / overlap / D-013 reservation
→ mcl-worktree-cleanup removes the exact eligible worktree
→ prove no registered worktree uses the branch
→ mcl-branch-ref-cleanup removes the exact remote ref
→ surrounding coordination cleanup
```

This helper never calls `mcl-worktree-cleanup` and never deletes a local branch.
If a matching registered worktree still exists, it returns
`REGISTERED_WORKTREE_PRESENT`.

## Coordination / authority boundary

The helper grants no mutation authority and does not acquire or release D-013.
A real `apply` must be wrapped by current owning packet evidence, fresh
overlap/currentness evidence, and an exact cleanup reservation. D-014 and
workspace-holder evidence remain owned by their existing contracts when the
surrounding phase requires them.

A successful receipt proves only the declared remote-ref cleanup transaction.
All repository/device/merge/release/production authority flags remain false.

## Output

The helper emits one compact JSON receipt with:

- fixed schema/mode/operation/status;
- semantic executor and short branch identity;
- expected, observed remote, and local branch SHAs;
- stable reason codes;
- `details=withheld`;
- all authority flags false.

It does not emit absolute paths, remote URLs, raw Git stderr, credentials,
environment dumps, account/device/session identity, or free-form diagnostics.

## Validation

```text
python3 products/chatgpt-mobile-coder-lab/device-ops/branch-ref-cleanup/tests/test-contract.py -v
python3 -m py_compile \
  products/chatgpt-mobile-coder-lab/device-ops/branch-ref-cleanup/mcl-branch-ref-cleanup \
  products/chatgpt-mobile-coder-lab/device-ops/branch-ref-cleanup/tests/test-contract.py
```

Synthetic tests use temporary local repositories and bare remotes. They prove
both successful expected-old deletion and stale-expected race rejection without
touching any real repository ref.
