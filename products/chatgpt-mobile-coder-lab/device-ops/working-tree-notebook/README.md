# Working-tree notebook reader

`mcl-notebook-read` is the Mobile Coder Lab read-only adapter for inspecting a
saved `.ipynb` in an explicitly selected Git working tree through an authorized
Remote Desktop Commander endpoint.

It observes filesystem state at invocation time. It can see saved uncommitted or
untracked notebook changes, but it cannot see an unsaved editor or Colab buffer.

## Invocation

Always select the RDC device explicitly and pass the absolute worktree root:

```text
products/chatgpt-mobile-coder-lab/device-ops/working-tree-notebook/mcl-notebook-read \
  --repo-root /absolute/worktree \
  --path relative/notebook.ipynb \
  [--start-cell N] [--max-cells N] [--include-outputs]
```

The remote process current directory is not authority. The supplied root must be
an actual Git worktree top-level.

## Result identity

A successful result includes:

- `source_kind=working_tree`;
- repository-relative `path`;
- `size_bytes` and `content_sha256` for the exact saved bytes projected;
- current `git_head_sha` when available;
- `path_state`: `tracked-clean`, `tracked-modified`, `untracked`, `ignored`, or `unknown`;
- bounded notebook metadata, cell window, sources, and optional textual saved outputs.

`git_head_sha` describes repository HEAD only. It must never be treated as the
identity of dirty or uncommitted notebook bytes. `content_sha256` is the local
saved-content identity.

## Safety contract

The adapter rejects relative/non-Git roots, path traversal, non-`.ipynb` paths,
symlinked notebook paths, files outside the worktree, oversized input, malformed
or unsupported notebooks, and files whose stat identity changes during the
bounded read.

It reuses the Repository Read MCP notebook projection for nbformat validation,
cell pagination, source limits, output limits, and attachment/rich-payload
omission. Outputs are source-only by default. `--include-outputs` exposes only
the same bounded textual saved output forms. Base64 images, arbitrary binary
attachments, and HTML/JavaScript bodies are not returned.

The command performs no notebook execution, filesystem write, Git mutation,
sync, checkout, reset, stash, clean, commit, push, service action, release, or
production action.

## Validation

```text
python3 products/chatgpt-mobile-coder-lab/device-ops/working-tree-notebook/tests/test-contract.py -v
cd tools/repo-ci-mcp && python3 -m unittest discover -s tests -p 'test_*.py' -v
```

## Disposable live-proof harness

`mcl-notebook-live-proof` is a notebook-specific operational proof harness. It
mechanizes the saved-uncommitted A -> B sequence already proven manually on M
and S; it is not a generic worktree manager or remote command runner.

Use it only after the surrounding task has already established current Work
System scope evidence, selected the exact D-012 executor, acquired the matching
D-013 repository-workspace lease, and recorded the D-014 phase manifest.

```text
products/chatgpt-mobile-coder-lab/device-ops/working-tree-notebook/mcl-notebook-live-proof \
  --executor S|M \
  --base-sha <exact-40-hex-commit> \
  --branch <server/*|mainphone/*> \
  --worktree <absolute-disposable-worktree>
```

The executor selects fixed repository, landing, worktree-root, and branch-prefix
profiles. The CLI does not accept an arbitrary repository root, landing root,
reader path, fixture path, command, shell string, or environment payload. The
base commit must already exist locally; the harness does not fetch or sync it.

The fixed proof creates one namespaced disposable branch/worktree at the exact
base, writes a bounded untracked nbformat-4 fixture with marker A, reads it with
the repository-owned `mcl-notebook-read`, saves marker B, and reads again. PASS
requires both observations to remain `untracked` at the unchanged base HEAD,
with different exact content hashes and no notebook/shared-reader cache delta.

Cleanup removes only harness-owned state whose identities still match. The
fixture is deleted only when its bytes match one of the two fixed fixture
hashes; the worktree is removed without force only when clean and unchanged;
the branch is deleted with an exact expected-SHA ref update. Foreign files,
branch/HEAD movement, or unexpected `.pyc`/`__pycache__` artifacts block cleanup
instead of being reset, cleaned, or overwritten.

The bounded JSON receipt reports semantic executor/base identity, reader and
harness source hashes, A/B content hashes, cache disposition, cleanup and
landing/control preservation. It intentionally omits absolute worktree paths,
notebook bodies, raw command output, device/session/account identifiers,
credentials, and environment dumps.

The harness never acquires or releases D-013, creates D-014 envelopes, selects a
route, fetches/syncs a landing workspace, commits, pushes, opens/merges a PR, or
mutates a service/runtime/release/production surface. It proves saved filesystem
state only and does not claim access to unsaved editor or Colab buffers.

## Fixed S owner invocation bridge

`mcl-notebook-owner-invoke.cjs` is the first host-orchestrated owner-invocation
pilot layered after the reviewed `mcl-execution-handoff.v1` admission contract.
It is intentionally fixed to route `S`, executor `S`, and the existing
`mcl-notebook-live-proof` owner. It is not a generic shell or owner registry.

The CLI accepts only repository identity plus caller-owned handoff and D-014
manifest files:

```text
node products/chatgpt-mobile-coder-lab/device-ops/working-tree-notebook/mcl-notebook-owner-invoke.cjs \
  --repo owner/repo \
  --handoff-file /path/to/handoff.json \
  --manifest-file /path/to/manifest.md
```

The handoff must be `HANDOFF_READY / phase=1/1 / route=S / executor=S` with
`mutation_authorized=false` and `execution_authorized=false`. The D-014 manifest
must independently verify as one `EXPERIMENT` phase with a required active D-013
repository lease. Immediately before invoking the owner, the bridge re-reads the
source packet and #2352 through the existing coordination operator, requires the
packet to remain at `EXPERIMENT_CLOSE`, rechecks the exact packet-body digest, and
requires one active lease whose route/executor/scopes/workspace/base match D-014.

Only then does it invoke the fixed notebook owner once with executor/base/branch/
worktree values derived from D-014. There is no caller-provided command, arbitrary
argv, executable path, owner selector, environment injection, retry count, fetch,
sync, reset, clean, lease mutation, or D-014 writer surface. The child receives a
small allowlisted environment and is spawned with `shell=false`.

The bounded owner result is validated for its existing cleanup and preservation
contract and projected through the repository-wide `REPOSITORY_EXECUTION_RECEIPT`
projector. A PASS receipt points the caller to `RELEASE_D013_AND_RECORD_D014_COMPLETION`;
the invoker performs neither action itself. All execution/mutation/release/production
authority flags remain false.

Validation:

```text
node products/chatgpt-mobile-coder-lab/device-ops/working-tree-notebook/tests/test-owner-invoke.cjs
```
