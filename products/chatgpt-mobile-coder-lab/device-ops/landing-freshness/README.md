# MCL landing freshness guard v1

`mcl-landing-freshness` is the Mobile Coder Lab owner for one narrow Git-currentness question on the fixed ordinary S/M landing surfaces.

It is not a sync tool, route selector, lease controller, worktree lifecycle helper, health authority, dispatcher, merge gate, release owner, or production owner.

## Fixed topology

V1 accepts only these already-selected routes:

| route | fixed landing | intended branch |
| --- | --- | --- |
| `S` | `/root/nyang-repo` | `server/work` |
| `M` | `/data/data/com.termux/files/home/nyang-worktrees/mainphone-work` | `mainphone/work` |

Both configured and effective `origin` URLs must resolve to the canonical `hanmiyoo10-alt/-` GitHub repository in one of the reviewed HTTPS/SSH forms; URL rewrites or custom origin upload/proxy overrides fail closed. No caller-supplied repository, remote, ref, branch, command, environment, or shell text is accepted.

## Authority composition

For mutable repository work, callers keep the existing order:

```text
D-012 semantic route
→ route-conditioned bounded preflight/status
→ current packet/PR scope overlap
→ D-013 lease acquire/validate
→ mcl-landing-freshness refresh when needed
→ existing feature-worktree/currentness guards
→ authorized mutation
```
A successful local guard never proves those earlier or later gates. In particular, `refresh` does not acquire or release a lease and does not compute packet/PR overlap. Its D-013 reservation must be the exact fixed `landing_metadata` profile for the selected executor and matching `surface:mcl-landing-origin-main:<executor>` scope.

## Commands

```text
./mcl-landing-freshness status S
./mcl-landing-freshness status M
./mcl-landing-freshness refresh S
./mcl-landing-freshness refresh M
```

Any other arity, operation, or route is rejected.

### `status`

`status` is read-only. It checks the fixed Git top-level and canonical origin, observes the actual branch, clean/dirty state, landing HEAD and local `origin/main`, then uses `git ls-remote` to observe the live remote `main` identity.

It never fetches or moves a ref. If the remote commit object is already available locally, it classifies the landing relation as `equal`, `behind_ff`, `ahead`, or `diverged`. If the intended branch does not match, the relation is `branch_mismatch`. Missing evidence stays `unknown`.

### `refresh`

`refresh` is a bounded Git-metadata mutation. The caller must already hold the applicable current external authority described above, including the exact D-013 `landing_metadata` reservation for this fixed landing and an observed landing HEAD SHA.

Before fetching it independently requires:
- the exact fixed landing Git top-level;
- the reviewed canonical `origin` URL;
- the exact intended landing branch;
- a clean worktree;
- a readable live remote `main` identity.
The only Git ref update it requests is:

```text
origin refs/heads/main:refs/remotes/origin/main
```

with tags disabled and without force. It never runs merge, pull, switch, checkout, reset, stash, clean, branch creation/deletion, or worktree creation/deletion.

After the fetch it re-observes landing HEAD, branch, worktree state, local `origin/main`, and live remote `main`. Any landing HEAD/branch/worktree drift makes the result `unknown`. A fetch failure is reported without raw Git output.

Branch mismatch or dirty state is a refusal condition, not repair authority. In particular, the known historical M landing mismatch must remain blocked until another separately authorized action changes that state.

## Receipt

Successful or bounded fail-closed observations use exactly these ordered fields:

```text
schema=mcl-landing-freshness.v1
operation=<status|refresh>
route=<S|M>
intended_branch=<server/work|mainphone/work>
actual_branch=<bounded-branch|unknown>
worktree=<clean|dirty|unknown>
landing_head=<sha|unknown>
origin_main=<sha|missing|unknown>
remote_main=<sha|unknown>
origin_remote_relation=<same|stale|unknown>
landing_relation=<equal|behind_ff|ahead|diverged|branch_mismatch|unknown>
refresh=<not_requested|refreshed|blocked|failed|unknown>
details=withheld
```
There is no aggregate cluster `PASS`, `READY`, `healthy`, or `safe_to_mutate` result. Every field is scoped to this guard observation.

Exit behavior:
- `0`: complete `status` observation, including known dirty or branch-mismatch state; or successful `refresh`;
- `2`: `status` contains unavailable/invalid context or remote evidence;
- `3`: `refresh` is blocked by a local precondition;
- `4`: the fixed fetch failed;
- `5`: post-fetch evidence is inconsistent or incomplete;
- `64`: unsupported invocation.

Raw Git/network error output, credentials/tokens, account/device/session identifiers, environment dumps, and free-form diagnostics are never part of the receipt.

## Proof boundary

Synthetic contract tests may copy this script and replace only its compile-time fixed topology constants (S/M paths and canonical origin) with temporary Git fixture values. The production CLI itself has no test-only path override, environment override, arbitrary command hook, or generic remote/ref input.

A later real-device experiment may run `status` on natural S/M state. `refresh` remains legal only when the naturally selected route already satisfies expected branch, clean state, current packet/PR overlap, the exact D-013 `landing_metadata` lease, and neighboring currentness guards. Do not switch a landing branch merely to make the proof pass.

## No-ref current-main object materialization

`mcl-main-object-materialize` is a sibling operation for a narrower pre-experiment need: make the exact current protected `main` commit object locally readable without moving any Git ref or landing/worktree state. It accepts exactly `S|M` plus one lowercase 40-hex expected current-main SHA. The caller must already have current main/#485 agreement, route selection, fresh overlap evidence, the matching D-013 `landing_metadata` reservation, and a D-014 mutable-phase manifest.

The command independently verifies the fixed canonical origin and live `refs/heads/main`, requires that remote SHA to equal the supplied expected SHA, requires a clean fixed landing, snapshots HEAD, actual branch, clean worktree status, the tracked-index identity, all refs, local `origin/main` through the ref snapshot, and `FETCH_HEAD`, then uses only a no-destination `git fetch --no-tags --no-write-fetch-head <validated-canonical-origin-url> refs/heads/main` when the expected commit object is absent. It rechecks every preservation assertion and live remote-main equality afterward.

Unlike `refresh`, this operation does not require the actual landing branch to equal the intended branch. This is deliberate so the preserved historical M branch mismatch can remain untouched while the object store is currentized. It never repairs or switches the branch. Dirty state, origin/effective-URL mismatch, uploadpack/proxy override, remote-main mismatch, fetch failure, ref/HEAD/branch/worktree/index/FETCH_HEAD movement, or incomplete post-fetch evidence fails closed.

Successful bounded output uses schema `mcl-main-object-materialize.v1` and reports only the expected/remote SHA, object-before/object-after state, preservation booleans, and `already_present|materialized`. The command has no route-selection, lease, worktree lifecycle, downstream proof, merge, release, runtime, or production authority.
