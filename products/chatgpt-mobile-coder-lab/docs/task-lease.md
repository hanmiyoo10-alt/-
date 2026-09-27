# Mobile Coder Lab task lease v1

Status: `ACTIVE V1 / owner #2350 / state ledger #2352`

This contract owns only short-lived coordination reservation state for Mobile Coder Lab work. It does not own repository write authority, device health, Git currentness, CI, main write, release, or production truth.

## Authority composition

Use the existing owners in this order for repository mutation:

```text
semantic route (`device-routing.md`)
→ bounded current status when relevant (`sm-status` / device owner)
→ current packet/PR write-scope overlap (canonical-main Work System)
→ MCL task lease acquire/validate
→ existing Git/worktree/currentness guards
→ authorized mutation
```

For D-013 `repository` workspaces that opt into the reviewed workspace-holder guard, acquisition is followed by one exact D-014 phase manifest and then an atomic worktree-local holder claim before mutation. The holder is deny-only cooperative safety state in the worktree-specific Git administrative area; it is not a second durable lease, does not add write authority, and must be fresh-checked before later commit/push/PR/release effect boundaries.

The holder may correlate only the exact manifest id, lease id, and a digest of local ephemeral claim material. Raw holder claim material, account identity, RDC/device/session identity, TTL/latest-wins/takeover semantics, and arbitrary caller-selected state paths are forbidden. Holder cleanup is permitted only after current D-013 evidence proves the referenced lease is absent and cleanup never restores or transfers mutation authority. See `workspace-holder.md`.

A lease never upgrades `UNKNOWN`, bypasses an overlap, or proves that an executor is healthy or safe to write.

## State owner

V1 uses exactly one MCL-only GitHub issue ledger: **#2352**.

The ledger is not #465 and is not a repository-global active-work registry. The controller accepts no caller-selected issue number.

Before controller merge the ledger remains:
- `status=INACTIVE`;
- `generation=0`;
- `controllerCommit=null`;
- zero active leases.
Activation is a separate owner-only operation after merge. It requires the supplied controller commit to equal current protected `main`; workflow checkout is pinned to `main`. Activation advances the ledger generation and records that exact controller commit.

## Lease identity

An active lease records bounded coordination metadata only:
- deterministic `leaseId` derived from the normalized lease profile;
- current source packet ref and SHA-256 of the complete observed packet body;
- durable routing class and exact selected executor;
- normalized `path:` / `surface:` scopes using Work System grammar;
- deterministic scope fingerprint;
- fresh scope-overlap disposition, which must be `DISJOINT`;
- exact workspace kind plus branch/worktree identity: isolated feature workspace, fixed landing-metadata workspace, fixed M landing-branch-repair workspace, or explicit non-repository `not_applicable`;
- optional observed base SHA as evidence only;
- bounded source refs.

The controller never stores ChatGPT account identity, RDC/device/session identifiers, auth material, tokens, private logs, command lines, or environment dumps.

## Routing and workspace rules

Acquisition cannot use an ambiguous `either` holder. Exact executor values are:
`S`, `M`, `S_TERMUX`, `M_PRIVATE_LAB`, `M_VM_LAB`, `S_PRIVATE_LOCAL`.

`S` routing may resolve to exact executor `S` or the documented device-agnostic fallback `M`. Every semantic-context-specific route must resolve to the same exact context.

Repository-backed S work must use a `server/*` feature branch and an isolated worktree under `/root/nyang-worktrees/`. Repository-backed M work must use `mainphone/*` and `/data/data/com.termux/files/home/nyang-worktrees/`. Landing branches/worktrees remain invalid **feature** workspaces.

The additive `landing_metadata` kind is reserved only for reviewed fixed ordinary landing Git-metadata/object-store mutation owned by `landing-freshness`: executor `S` binds `server/work` + `/root/nyang-repo` + exact scope `surface:mcl-landing-origin-main:S`; executor `M` binds `mainphone/work` + `/data/data/com.termux/files/home/nyang-worktrees/mainphone-work` + exact scope `surface:mcl-landing-origin-main:M`. It requires a non-null observed landing HEAD SHA and accepts no caller-selected landing identity. Route `S` may use the documented exact executor `M` fallback, which binds only the M identity.

The additive `landing_branch_repair` kind binds only reviewed exact landing identities: route/executor `S / S` binds `server/work` + `/root/nyang-repo` + `surface:mcl-landing-branch:S`; route/executor `M / M` binds `mainphone/work` + `/data/data/com.termux/files/home/nyang-worktrees/mainphone-work` + `surface:mcl-landing-branch:M`. It requires a non-null observed landing HEAD SHA. It reserves the Git worktree for the reviewed local landing branch-repair effect only; it does not grant route fallback, remote-ref, merge, release, runtime, or production authority.

Non-repository contexts use explicit `not_applicable` branch/worktree identity instead of inventing a repository path.

## Conflict rules

Acquire fails closed when the ledger, expected generation, packet evidence, route/executor relation, workspace, or required scope-overlap evidence is invalid or stale.

It also conflicts when:
- the same packet already holds a materially different lease profile;
- any active MCL lease overlaps the requested normalized scopes;
- another active Git-workspace lease (`repository`, `landing_metadata`, or `landing_branch_repair`) reserves the same branch or worktree.

The same executor may hold multiple leases when packets, normalized scopes, and workspace identities are disjoint. V1 does not lock an entire phone.

An exact retry of the immediately preceding successful acquire is idempotent and returns the existing lease without advancing generation again.

## Release and lifetime

V1 has no TTL, renewal timer, inactivity takeover, or age-based supersession. Time passage does not prove that an owner disappeared.

Release requires the current ledger generation, exact active lease id, and matching source packet ref. It removes the active reservation, advances generation, and retains only one bounded `lastRelease` identity so a current-generation retry can return an idempotent no-op.

Recovery from an abandoned lease is therefore an explicit owner action against current evidence, not automatic expiration. Any future TTL design requires separate authority.

The coordination operator also exposes one explicit release-only transport recovery command, `lease-release-recover`. It does not change the normal `lease-release --dispatch` path, which still fails closed without semantic auto-retry when its workflow run fails.

Recovery is eligible only for a caller-supplied failed workflow run whose bounded GitHub Actions evidence proves all of the following: workflow `MCL Task Lease`, event `workflow_dispatch`, completed failure, exact `release` operation, exact source packet ref, exact lease id, and the exact transient marker `mcl-task-lease fatal: fetch failed`. The operator never returns raw workflow logs or stderr as recovery output.

After proving that failure class, the operator re-reads the current packet and ledger and reuses the existing release planner. If the exact lease is already represented by current `lastRelease`, recovery completes as an idempotent no-op with no new workflow dispatch. If the exact lease remains active, its stored packet-body digest must still equal the current packet digest; only an exact current `RELEASE_READY` plan may be dispatched, using the fresh current generation. With `--dispatch`, at most one new release workflow run is created. A failed recovery run is terminal for that invocation and is not retried again.

Packet terminality, packet-body drift, lease/packet mismatch, malformed or unreadable run evidence, another workflow failure class, semantic `BLOCKED`/`CONFLICT`, missing lease without matching `lastRelease`, or any recovery-dispatch failure remains fail-closed. The recovery command does not add acquire retry, generic workflow retry, TTL, backoff, a retry daemon, or shared GitHub-client retry policy.
## Mutation path

Supported ledger mutation is only `.github/workflows/mcl-task-lease.yml` plus the fixed controller. The workflow:
- is `workflow_dispatch` only;
- admits repository-owner dispatches only;
- has exactly `contents: read` and `issues: write` permissions;
- uses one fixed `mcl-task-lease-v1` concurrency group with `cancel-in-progress: false`;
- checks out trusted `main`, not a caller-selected controller ref;
- accepts only `activate`, `acquire`, or `release`;
- cannot select another state issue or pass arbitrary shell/command text;
- admits only the reviewed fixed workspace kinds, including `landing_metadata` and exact S/M `landing_branch_repair`, without adding any new permission, state issue, or generic writer.

The controller re-reads #2352 and its exact generation before a PATCH, re-reads again immediately before writing, and validates post-write readback. Manual/out-of-protocol ledger edits are not serialized by GitHub itself; any body drift or malformed marker is `CONFLICT`/`UNKNOWN`, never an inferred free lease.

For acquire, the controller also re-reads the source packet and requires its full body SHA-256 and nonterminal packet lifecycle to match the supplied evidence. The separate Work System remains responsible for producing the fresh repository overlap disposition; the lease controller only accepts `DISJOINT` and never computes a stronger repository authority claim.

## Bounded result

Controller stdout is a compact result object containing operation status, generation, optional lease id, stable reason codes, and explicit `false` values for repository/device/merge/release/production authorization. Ledger body contents are never echoed in the outward result.

## Non-goals

No dispatcher, scheduler, task manifest, worktree creator/cleaner, device repair, health inference, secret store, global queue database, Git writer, merge gate, release publisher, or production authority is introduced by this contract.
