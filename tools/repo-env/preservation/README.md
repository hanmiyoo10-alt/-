# Repository preservation snapshot + diff

This directory owns a small repository-common primitive for proving that a caller-declared filesystem baseline stayed the same across some separately-authorized work.

It does **not** decide what a project must preserve and it is not production, release, runtime, or environment authority. The owning packet chooses the baseline. This tool only fingerprints that bounded declaration and compares two snapshots.

## Commands

```sh
python tools/repo-env/preservation/preserve.py capture \
  --root /explicit/root \
  --spec /path/to/spec.json \
  --output /path/to/before.json

python tools/repo-env/preservation/preserve.py compare \
  --before /path/to/before.json \
  --after /path/to/after.json
```

`capture` reads the declared baseline and writes only the requested snapshot file. `compare` reads two snapshots and writes a bounded JSON result to stdout.

Exit status for compare:

- `0`: `SAME`
- `1`: `CHANGED`
- `2`: `BLOCKED`

## Spec v1

Schema: `repo-preservation-spec.v1`.

```json
{
  "schema": "repo-preservation-spec.v1",
  "entries": [
    {"label": "config", "kind": "file_sha256", "path": "config/app.conf"},
    {"label": "managed-tree", "kind": "tree_sha256", "path": "managed"},
    {"label": "optional-cache", "kind": "exists_type", "path": "cache"}
  ]
}
```

Paths are POSIX-style relative paths under the explicit `--root`. Absolute paths, `..`, non-normalized paths, backslash paths, symlinks, and special files fail closed.

Kinds:

- `file_sha256`: SHA-256, byte size, and executable-bit class for one regular file.
- `tree_sha256`: deterministic recursive digest plus regular-file count, directory count, and regular-file bytes.
- `exists_type`: only `missing`, `file`, or `directory`.

Labels are the only caller-defined names copied into public snapshot/diff output. Choose semantic labels that contain no sensitive information.

## Privacy and evidence boundary

Snapshots never contain the root path, source relative paths, file contents, hostname, username, device identity, cwd, environment variables, or timestamps. Tree path names participate only inside the one-way digest so add/remove/rename changes remain detectable.

Do not declare auth/session/token/private-log material as an input. A hash of secret material is still a secret-derived identifier and is outside this tool's approved evidence surface.

An unchanged snapshot proves only that the declared fingerprint set is unchanged. It does not prove whole-system health, service health, Git cleanliness, runtime correctness, or production state.

## Fixed v1 safety ceilings

The implementation owns fixed ceilings; callers cannot disable them with command flags:

- spec bytes: 64 KiB
- snapshot bytes: 256 KiB
- spec/snapshot entries: 64
- regular files hashed per capture: 4096
- total regular-file bytes hashed per capture: 512 MiB
- recursive tree nodes are additionally bounded relative to the file ceiling

Crossing a ceiling returns `BLOCKED` with no partial-success claim.

## Determinism

Snapshot schema is `repo-preservation-snapshot.v1`. Entries are sorted by label and serialized canonically without timestamps or host metadata. Identical declared state therefore produces byte-identical snapshot bytes.

Comparison schema is `repo-preservation-diff.v1`. Per-label status is one of `same`, `changed`, `added`, or `missing`.

## Deliberate non-goals

v1 has no glob/regex scan, arbitrary command execution, shell/eval surface, subprocess hook, network access, package-manager behavior, service/process inspection, environment identity inference, or resource-capacity measurement.

Resource guards, artifact provenance, download/cache policy, and environment capability capsules remain separate primitives. Project-specific verify/check scripts remain authoritative inside their own scope.

Keep the snapshot output outside a declared baseline when practical. If a caller deliberately fingerprints a directory that also contains the output snapshot, the later output file is itself a filesystem change and should not be hidden.

## Tests

The contract tests use synthetic temporary fixtures only and perform no package install or device/runtime mutation:

```sh
python -m unittest discover -s tools/repo-env/preservation/tests -p 'test_*.py' -v
```

Before adopting this primitive in a live packet, that packet must separately declare its approved root, spec, preservation set, and interpretation of `SAME`/`CHANGED` under its own authority.
