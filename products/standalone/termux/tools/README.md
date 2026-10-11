# Termux Migration Validator

Read-only, stdlib-only migration preflight for bounded Termux child-path moves.

It exists to catch the concrete failure modes observed during #2801 without
creating another work orchestrator or replacing repository authority.

## What it proves

Given an exact Git base ref, exact Git head ref, and one
`termux-migration-plan.v1` JSON file, the validator can check:

- logical changed-file count against one exact expected ceiling, bounded to 1000;
- every changed path endpoint against canonical exact/prefix authorization scopes,
  including both source and destination of detected renames/copies;
- base old-root inventory against head new-root inventory;
- Git mode/type preservation for relocated files;
- byte identity for relocated files except explicit content-edit exceptions;
- exact allowed residue under the old root;
- location-sensitive references such as
  `Path(__file__).resolve().parents[N]`, repeated `../`, and old-root text
  references as bounded warnings.

The Git diff uses migration-friendly rename detection (`--find-renames=20%`).
A detected rename/copy counts as one logical changed file, while both path
endpoints are still checked against the authorization ceiling.

## Read-only / no-network boundary

Before any diff/tree/content read, caller refs are resolved to commit object IDs.
Option-like refs are rejected. All later Git operations use those resolved IDs.

Every Git subprocess:
- clears ambient repository-selection/object-store overrides such as `GIT_DIR`,
  `GIT_WORK_TREE`, alternate object directories, namespaces, and injected
  `GIT_CONFIG_*` parameter variables;
- sets `GIT_NO_LAZY_FETCH=1` so a partial clone cannot demand-fetch missing objects;
- sets `GIT_NO_REPLACE_OBJECTS=1` so `refs/replace` cannot substitute evidence;
- sets `GIT_TERMINAL_PROMPT=0` and `GIT_OPTIONAL_LOCKS=0`;
- uses an explicit bounded rename-candidate policy and disables external diff helpers.

The supplied `--repo-root` must resolve to the exact Git work-tree root.
Missing objects, malformed Git evidence, noncanonical plan paths, non-UTF-8 Git
paths, and explicitly requested scan paths that are missing or unreadable fail
closed to `UNKNOWN`.
The validator never treats skipped evidence as `PASS`.

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

`authorized_paths` supports exact canonical POSIX repository-relative paths
and only one bounded prefix form: a trailing `/**`. Leading/trailing
whitespace, backslashes, duplicate separators, leading/trailing slashes, and
other path-normalization aliases are rejected rather than silently normalized.

`expected_changed_file_count` must be a JSON integer from 1 through 1000.
JSON booleans are rejected.

`content_edit_relpaths` are relative to the moved child root. Every other file
from the base old-root inventory must preserve the same Git object identity at
the head new root. Mode/type preservation is required for every moved file,
including declared content edits.

`allowed_old_root_relpaths` is an exact residue allowlist. Use an empty list
when the old root must disappear.

`scan_paths` is optional. When supplied, every listed path must be present and
UTF-8 readable at the head ref or the result is `UNKNOWN`. If omitted, the
validator performs a best-effort bounded scan of changed new-root, workflow,
Python, and shell paths that exist at the head.

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
- `UNKNOWN` — plan/Git evidence was missing, malformed, unreadable, or
  unavailable without network fetch.

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
repository mutation outside their temporary directories. They cover the
#2801-derived path-depth/parity cases plus rename-endpoint authorization,
unsafe refs, explicit scan failure, non-UTF-8 Git paths, mode/type parity,
lazy-fetch/replacement-object suppression, ambient Git repository isolation,
noncanonical plan rejection, boolean-count rejection, and rename-limit
independence.
