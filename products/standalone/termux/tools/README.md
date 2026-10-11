# Termux Migration Validator

Read-only, stdlib-only migration preflight for bounded Termux child-path moves.

It exists to catch the concrete failure modes observed during #2801 without
creating another work orchestrator or replacing repository authority.

## What it proves

Given an exact Git base ref, exact Git head ref, and one
`termux-migration-plan.v1` JSON file, the validator can check:

- changed-file count against one exact expected ceiling;
- every changed path against exact/prefix authorization scopes;
- base old-root inventory against head new-root inventory;
- byte identity for relocated files except explicit content-edit exceptions;
- exact allowed residue under the old root;
- location-sensitive references such as
  `Path(__file__).resolve().parents[N]`, repeated `../`, and old-root text
  references as bounded warnings.

The Git diff uses migration-friendly rename detection (`--find-renames=20%`) so
a content-edited move can still count as one logical changed file when Git can
identify the rename.

## What it never does

The validator does not:

- call GitHub or any network service;
- mutate Git, branches, files, issues, PRs, labels, CI, releases, runtime, or devices;
- execute caller-selected validation commands;
- grant mutation, merge, release, or production authority;
- replace Work System scope, Required, Control Plane, project guidelines, or
  postmerge convergence.

All authority flags in the result are always `false`.

## Plan shape

```json
{
  "schema": "termux-migration-plan.v1",
  "old_root": "plugins/termux/example",
  "new_root": "products/standalone/termux/example",
  "authorized_paths": [
    "plugins/termux/example/**",
    "products/standalone/termux/example/**",
    ".github/workflows/example.yml"
  ],
  "expected_changed_file_count": 12,
  "content_edit_relpaths": ["README.md"],
  "allowed_old_root_relpaths": [],
  "allow_old_root_reference_paths": [],
  "scan_paths": [
    "products/standalone/termux/example/README.md",
    ".github/workflows/example.yml"
  ]
}
```

`authorized_paths` supports exact repository-relative paths and only one bounded
prefix form: a trailing `/**`.

`content_edit_relpaths` are relative to the moved child root. Every other file
from the base old-root inventory must have the same blob identity at the head
new root.

`allowed_old_root_relpaths` is an exact residue allowlist. Use an empty list
when the old root must disappear.

`scan_paths` is optional. If omitted, the validator scans the changed new-root,
workflow, Python, and shell paths it can read as UTF-8 text.

## Command

```sh
python products/standalone/termux/tools/migration_validator.py \
  --repo-root . \
  --base-ref <exact-base> \
  --head-ref <exact-head> \
  --plan /path/to/plan.json
```

Result vocabulary:

- `PASS` — no fail or warning finding;
- `WARN` — structural migration checks pass but location-sensitive references
  require human/source review;
- `FAIL` — one or more deterministic migration contracts failed;
- `UNKNOWN` — plan/Git evidence was missing, malformed, or unreadable.

Exit codes:

- `0` — `PASS` or `WARN`;
- `1` — `FAIL`;
- `2` — `UNKNOWN`.

Warnings do not authorize ignoring the reference. They exist to force targeted
review before an external validator/CI owner is relied on.

## Regression

```sh
python -m unittest discover \
  -s products/standalone/termux/tools/tests \
  -p 'test_migration_validator.py' \
  -v
```

The tests use temporary local Git repositories and perform no network or
repository mutation outside their temporary directories.
