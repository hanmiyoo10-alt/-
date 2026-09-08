# Repository Patch Write

`REPO-PATCH-WRITE-V1` is a repository-native branch-edit transport for bounded
UTF-8 unified diffs.

It exists to avoid retransmitting an entire large existing file through a
whole-file connector write when the semantic change is small. It is not a
source, release, production, or `main` authority.

## Scope

V1 targets existing ordinary work branches under:

```text
agent-patch/**
```

It does not create branches. It does not write `main`, release/production refs,
or arbitrary existing branches. It does not execute code from the target
branch.

The writer accepts normal UTF-8 text patches for create/update/delete/rename
operations when all touched Git objects remain regular `100644` files. Binary
patches, Git LFS/binary payloads, symlinks, gitlinks/submodules, mode changes,
and self-modification of the writer/controller are rejected.

## Core write contract

`patch_branch.py` requires:

- exact target branch;
- exact 40-hex expected remote head;
- caller commit message;
- exact expected changed-path set;
- SHA-256-bound unified diff.

The transaction is:

```text
remote exact-head read
→ fetch exact target
→ detached isolated worktree
→ git apply --check
→ git apply --index
→ derive actual changed paths/modes from Git
→ git diff --cached --check
→ one commit whose parent is the exact expected head
→ re-read remote exact head
→ ordinary non-force fast-forward push
→ post-write remote-head verification
```

A stale target, content conflict, changed-path mismatch, unsupported mode, push
race, or failed post-write verification fails closed.

The machine result is compact JSON. Success is `PATCH_APPLIED`; failures are
`PATCH_REJECTED` with a stable reason code.

## Connected-assistant bridge

Permanent transport queue:

```text
#1876 [control] Repository Patch Write Queue
```

Only one owner-authored comment envelope is eligible:

````text
<!-- repo-patch-request:v1 -->
{"schemaVersion":1,"branch":"agent-patch/example","expectedHead":"<40-hex>","workIssue":123,"patchSha256":"<64-hex>","message":"docs: bounded edit","expectedPaths":["docs/example.md"]}
---PATCH---
diff --git a/docs/example.md b/docs/example.md
...
<!-- /repo-patch-request:v1 -->
````

Rules include:

- queue issue must be exactly `#1876`;
- comment actor must be the repository owner with `OWNER` association;
- one envelope only, with no surrounding text;
- patch size at most 64 KiB, at most 4000 lines, at most 20 expected paths;
- patch hash must match exactly;
- branch must be under `agent-patch/**`;
- receipt comments are bot-authored and therefore ineligible for recursive
  execution.

The workflow checks out the writer from trusted `main`, not from the target
branch. Event/comment text is read from `GITHUB_EVENT_PATH` as data and is
never interpolated into shell source.

## Direct CLI transport

An authenticated local/Work environment can skip the issue-comment adapter and
call the same engine directly:

```bash
python tools/repo-write/patch_branch.py \
  --repo . \
  --remote origin \
  --request-file request.json \
  --patch-file request.patch \
  --result-out result.json
```

The transport changes, but patch semantics do not.

## Tests

Offline tests use temporary local Git repositories and bare remotes:

```bash
python -m unittest discover -s tools/repo-write/tests -p 'test_*.py' -v
```

They cover owner request parsing, wrong-issue/non-owner rejection, branch/hash
guards, atomic multi-file commit behavior, stale-head rejection without
mutation, binary rejection, and writer self-modification denial.

## Concurrency and future reconciliation

V1 intentionally rejects a stale `expected_head`. This makes currentness
explicit and safe.

A later repository-wide reconciler may replay a preserved semantic patch onto
a newer compatible base and keep the same work branch/PR alive when concurrent
work advances `main`. That is a separate capability and must preserve
fail-closed behavior for semantic overlap, authority changes, and real content
conflicts. V1 itself does not silently rebase, merge, or invent conflict
resolution.

## Compactness boundary

The selected write payload can be proportional to the semantic diff rather
than the old/new whole-file body. No exact ChatGPT host-card, token, credit, or
Work-usage saving is claimed.
