# S-family bounded environment status

`s-env-status` is a read-only projection over the server-phone Ubuntu `S`
environment. It is deliberately narrower than `sm-status` and does not become a
new Git, RDC, runtime, package, lease, merge, release, or production authority.

## Command

```sh
./s-env-status status
```

There is no no-argument alias and no mutation command. A successfully formed
receipt exits 0 even when a projected field is `unknown`, `blocked`, `missing`,
or `needs_manual`. Invalid invocation exits 2.

## Receipt

Output is exactly five ordered `key=value` lines:

```text
schema=mcl-s-env-status.v1
common_ubuntu_profile=<pass|missing|blocked|unknown>
github_cli_auth=<pass|needs_manual|unknown>
repository_access=<pass|missing|unknown>
details=withheld
```
## Projection boundary

`common_ubuntu_profile` invokes only the existing shared owner:

```text
device-bootstrap/verify.sh --profile common --context ubuntu
```

The child output is parsed strictly and never forwarded. Recognized missing or
blocking evidence remains scoped to this field; malformed output becomes
`unknown`. The adapter does not install or repair the common profile.

`github_cli_auth` is projected from the same shared-owner observation. A bounded
`PRESENT auth:github` becomes `pass`; recognized `NEEDS_MANUAL auth:github*`
evidence becomes `needs_manual`; ambiguous or malformed evidence becomes
`unknown`. The adapter never reads token values, account identity, scopes, or
credential files.

`repository_access` observes only the fixed baseline `/root/nyang-repo` and
checks that Git resolves it as that exact worktree top level. `pass` means only
that the fixed repository context is reachable. It does not prove branch,
cleanliness, origin/main freshness, free workspace, collision safety, lease
ownership, CI, merge, release, or production readiness.
## Hard boundaries

Version 1 does not inspect or mutate S-Termux, PocketRisu, provider/session
state, service logs, Android state, task leases, open PRs, CI, or release state.
It does not run Git fetch, pull, checkout, reset, clean, stash, commit, push, or
worktree lifecycle commands.

There is no aggregate `result`, `ready`, `healthy`, or `safe_to_mutate` field.
Each value is a point-in-time projection of its narrower owner or fixed locator.
A caller needing mutable repository work must still separately prove current
packet/PR overlap, D-013 lease ownership, and Git/worktree/currentness.

## Privacy and versioning

The receipt emits no device/session/account identifier, token, auth scope,
command line, PID, environment dump, private log, or free-form child output.
`details=withheld` is fixed.

The command spelling, schema, exact five-line field order, enums, fixed S
repository locator, child-output suppression, unknown preservation, read-only
behavior, and lack of aggregate readiness form the `mcl-s-env-status.v1`
compatibility contract. Incompatible semantics require a reviewed migration and
should prefer a new schema version over silent v1 drift.
