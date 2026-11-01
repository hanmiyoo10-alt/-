# MCL L landing exact residue cleanup v1

`mcl-l-landing-residue-cleanup` owns one narrow effect on the fixed L landing:
remove the exact generated Python bytecode residue for Repository Patch Write
currentness replay after fresh D-013/D-014 evidence has selected that exact
operation.

It is not a generic cleaner, worktree repair tool, Git synchronizer, Python
cache sweeper, or repository writer.

## Fixed effect

V1 is permanently bound to exact `L / L`, intended landing identity `main + /home/alsl0/nyang-repo`, and exactly one reviewed profile.

Legacy currentness-replay profile:

```text
cleanup path = tools/repo-write/__pycache__/currentness_replay.cpython-312.pyc
surface      = surface:mcl:l-landing-residue-cleanup-currentness-replay-pyc
evidence     = receipt:mcl-l-landing-residue-sha256:<64-lowercase-hex>
```

Multi-owner validation-bytecode profile:

```text
cleanup paths = exact eight #4000 MCL/Termux .pyc paths
surface       = surface:mcl:l-landing-residue-cleanup-multi-owner-validation-pyc
evidence      = receipt:mcl-l-landing-residue-set-sha256:<64-lowercase-hex>
```

The multi-owner digest is SHA-256 of path-sorted `path + NUL + file_sha256 + LF`. It may run while the physical landing is detached or on `main`; the observed branch state is data that must be preserved exactly. The legacy profile keeps its existing physical `main` requirement.

No CLI argument selects the repository, landing, branch, path, parent, hash, glob, shell command, force mode, or alternate effect.

## Authority composition

The live effect is legal only after:

```text
current packet @ EXPERIMENT_CLOSE
→ current main/#485 and complete overlap
→ D-013 landing_residue_cleanup lease
→ exact D-014 REPOSITORY_MUTATION manifest
→ owner inspect
→ owner apply --apply
→ exact readback
→ normal D-013 release
→ D-014 COMPLETE with workspaceResult=clean
```

Workspace-holder does not apply to this fixed landing workspace kind. The
effect owner does not acquire/release D-013 and does not publish D-014 evidence.

## Admission

Immediately before deletion, require:

- exact D-014 integrity and packet-body SHA;
- current nonterminal packet at `EXPERIMENT_CLOSE`;
- valid ACTIVE D-013 ledger with exact manifest lease;
- exact L/L fixed workspace, scopes, branch, landing and observed HEAD;
- canonical configured/effective origin with no uploadpack/proxy override;
- complete Git status containing exactly one untracked fixed cleanup path;
- empty tracked and staged diffs;
- regular non-symlink `0644` residue, untracked and absent from HEAD;
- exact manifest-bound residue SHA-256;
- exact parent `__pycache__` containing only that file.

HEAD, branch, index bytes, all refs and `FETCH_HEAD` are snapshotted before
the effect.

## Effect and preservation

The only file effect is to unlink the exact fixed residue and then remove the
exact parent directory only after proving it is empty.

No recursive deletion and no `git clean`, reset, stash, checkout, switch,
commit, push, PR, merge or ref mutation is owned here.

Post-effect requires a clean worktree, empty tracked/staged diffs, absence of
the fixed file and parent directory, and exact preservation of HEAD, branch,
index, refs and FETCH_HEAD. Drift fails closed.

## CLI

```text
node mcl-l-landing-residue-cleanup.cjs inspect \
  --manifest <file> --ledger <file> --packet <file>

node mcl-l-landing-residue-cleanup.cjs apply \
  --manifest <file> --ledger <file> --packet <file> --apply
```

Evidence files are read-only locators. They do not select the target.

## Validation

```text
node products/chatgpt-mobile-coder-lab/device-ops/l-landing-residue-cleanup/tests/test-mcl-l-landing-residue-cleanup.cjs
node products/chatgpt-mobile-coder-lab/coordination/tests/test-task-lease.cjs
node products/chatgpt-mobile-coder-lab/coordination/tests/test-task-handoff.cjs
```

Synthetic tests inject only a temporary physical landing profile in process.
The production CLI has no path/environment override.
