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
