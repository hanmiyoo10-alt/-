# MCL repository workspace holder v1

`mcl-workspace-holder.cjs` is a deny-only, worktree-local concurrency guard for D-013 `repository` leases.
It is subordinate to current repository authority, Work System overlap, D-012 routing, an exact active D-013 lease, and an exact D-014 phase manifest. It never grants mutation authority and is not a second durable lease.

## Purpose

D-013 reserves a semantic packet/scope/workspace profile. A separate cooperative execution path that can already reach the same filesystem could otherwise reuse that valid lease profile. The holder adds one atomic local claimant boundary for the exact leased worktree.

The guard is not an OS or malicious same-UID security boundary. Raw shell access can bypass repository protocol just as it can bypass D-013. No account, device, RDC session, process identity, TTL, latest-wins rule, takeover, daemon, or second GitHub ledger is introduced.

## Composition

```text
current authority + overlap
→ D-012 route
→ D-013 exact repository lease
→ D-014 exact phase manifest
→ workspace-holder claim
→ ordinary Git/currentness checks
→ effect boundary
→ workspace-holder check before later effect boundaries
→ D-013 release
→ holder release or bounded stale cleanup
→ D-014 completion receipt
```

The helper validates current packet-body hash, D-013 ledger/lease identity, manifest identity, exact repository workspace shape, actual branch/worktree identity, and worktree-specific Git administrative location before a claim can succeed.

## Holder state and claim material

The holder record lives only in the exact worktree-specific Git administrative directory resolved by Git. Creation uses exclusive file creation, so the first valid claimant wins and a second claimant receives a fail-closed result even when packet, lease, manifest, branch, and worktree are otherwise identical.

The durable local record contains only:
- schema/mode;
- exact D-014 `manifestId`;
- exact D-013 `leaseId`;
- SHA-256 digest of a helper-generated opaque holder claim.

The raw holder claim is ephemeral capability material. `claim` writes it only to file descriptor 3. It is never emitted on stdout and must not be copied into Git, #2352, D-014 envelopes, issues, PRs, logs, or other durable evidence. `check` and holder-owned `release` consume it from `MCL_WORKSPACE_HOLDER_CLAIM`.

Machine-readable stdout contains bounded disposition, reason codes, non-secret correlation digests, and explicit false authority flags only.

## Operations

```text
node mcl-workspace-holder.cjs claim --manifest <manifest> --ledger <ledger> --packet <packet> 3>claim.secret
MCL_WORKSPACE_HOLDER_CLAIM=<ephemeral-secret> node mcl-workspace-holder.cjs check --manifest <manifest> --ledger <ledger> --packet <packet>
MCL_WORKSPACE_HOLDER_CLAIM=<ephemeral-secret> node mcl-workspace-holder.cjs release --manifest <manifest> --ledger <released-ledger> --packet <packet>
node mcl-workspace-holder.cjs cleanup-stale --manifest <manifest> --ledger <released-ledger>
```

`claim` and `check` require the exact referenced D-013 lease to remain active. Holder-owned `release` requires that exact lease to be absent first. This ordering prevents the local guard from becoming permission to mutate after durable reservation authority has ended.

`cleanup-stale` is recovery only. It removes an exact matching holder record only after current D-013 evidence proves the referenced lease is no longer active. It does not require or manufacture a holder claim, cannot operate while the lease remains active, and grants no new authority after cleanup.

## Fail-closed boundaries

The helper blocks on missing or malformed evidence, packet hash drift, missing/released lease when an active lease is required, lease/manifest profile mismatch, missing worktree, branch mismatch, symlink/alias worktree identity, malformed/foreign holder state, or wrong holder claim.

There is no TTL, age expiry, force break, automatic takeover, latest-wins behavior, commit/push/PR automation, worktree lifecycle management, route selection, lease dispatch, merge, release, runtime, service, or production effect.

Repository mutation remains owned by the surrounding packet and existing Git/currentness gates. A holder `CLAIMED` or `CHECK_PASS` result proves only the local cooperative holder condition at that observation point.

## Effect-boundary discipline

For repository-backed MCL mutation using this guard, re-check the exact holder immediately before commit, push, PR publication/update, and D-013 release boundaries. Unexpected HEAD, index, remote, PR, packet, manifest, or ledger movement remains conflict evidence and must not be normalized away by the holder.

V1 applies only to D-013 `workspace.kind=repository`. `landing_metadata` and non-repository contexts remain outside this holder contract.
