# Terminal Residue Cleanup v1

Archive first. Verify twice. Cleanup only exact terminal residue.

This directory owns the repository-level V1 terminal cleanup transaction selected by
#2880 / #2881.

It is not a garbage collector, age policy, branch sweeper, or automatic issue-close hook.

## Public surface

```text
terminal-residue-cleanup-owner.cjs inspect --packet '#N' --pr N [--format receipt|agent-view]

terminal-residue-cleanup-owner.cjs apply --packet '#N' --pr N --apply [--format receipt|agent-view]
```

The caller cannot select repository, worktree path, branch/ref, archive root, remote,
expected SHA, glob, shell command, force mode, or retention policy.

V1 is fixed to:

```text
control repo      /root/nyang-repo
worktree root     /root/nyang-worktrees
remote            origin
branch family     server/*
permanent deny    server/work
archive root      <common-git-dir>/canonical-main-evidence-archive/
```

Non-S / mainphone targets are unsupported in V1.

## Authority chain

Inspect reads:

```text
direct main + #485
→ canonical packet projection
→ exact merged PR
→ candidate retention in current main
→ zero open PRs on feature branch
→ exact worktree/ref state
→ exact evidence/archive state
→ cleanup disposition
```

Packet lifecycle is parsed only by the existing Work System packet projection.

## Evidence registry

V1 recognizes packet/PR-bound sidecars only under:

```text
validation-attention-evidence
validation-continuation-evidence
validation-merge-evidence
```

A recognized file must be regular, non-symlink, mode 0600, directly under one
registered evidence directory, bounded in size, and named with the exact prefix:

```text
packet-<packet>-pr-<pr>.
```

An unrecognized packet-bound `*-evidence` directory remains UNKNOWN.

## Archive

Exact destination:

```text
<common-git-dir>/canonical-main-evidence-archive/packet-<packet>-pr-<pr>/
```

The timestamp-free manifest binds:

- packet and PR;
- candidate and merge commits;
- exact sorted relative evidence paths;
- byte sizes;
- SHA-256 values;
- file count;
- aggregate archive digest.

Directories are 0700. Evidence and manifest files are 0600.

Archive publication is temp-write → full verification → atomic rename. A matching
existing archive is reused. A mismatching existing archive is CONFLICT and is never
overwritten.

This is repository-local retention. It is not off-host backup or clone portability.

## Apply ordering

```text
archive + verify
→ fresh admission
→ exact clean worktree remove
→ archive reverify
→ fresh candidate reachability + open-PR proof
→ remote expected-old CAS delete
→ fresh admission
→ local expected-old update-ref delete
→ final archive verification
```

No deletion happens before the archive is verified.

Worktree removal never uses force.

Remote deletion uses exactly one expected-old lease for exactly one ref. Local deletion
uses `git update-ref -d <ref> <expected-old>`.

There is no wildcard, prune-all, multi-ref delete, retry loop, reset, stash, clean, or
broad force surface.

## Idempotence

Normal dispositions:

```text
ARCHIVE_REQUIRED
CLEANUP_READY
PARTIAL_CLEANUP_RECOVERY
ALREADY_CLEAN
COMPLETE
BLOCKED
UNKNOWN
CONFLICT
```

An already verified archive with absent worktree/refs is ALREADY_CLEAN. A second apply
is an effect-free PASS.

A dirty worktree, holder, open branch PR, unsupported branch, unretained candidate, or
nonterminal packet blocks. Stale ref/archive identity conflicts. Missing or unrecognized
evidence remains UNKNOWN.

A failed invocation never retries itself.

## GPT surface

The owner reuses:

```text
REPOSITORY_EXECUTION_RECEIPT v2
→ REPOSITORY_AGENT_DECISION_VIEW v1
```

All receipt authority flags remain false. The activated packet and the literal
`--apply` invocation supply effect admission.

Clean terminal output is bounded to archive/worktree/local-ref/remote-ref/residue state
plus disposition and evidence count.

## Rollout boundary

V1 is explicit inspect/apply only.

Not implemented here:

- automatic issue-close hook;
- scheduled cleanup;
- automatic apply after close;
- global terminal inventory.

Those belong to later V1.1/V1.2 adoption after V1 natural proof.

## Validation

```sh
node --check .github/plugin-control-plane/canonical-main/work-harness/terminal-residue-cleanup/terminal-residue-cleanup-owner.cjs
node .github/plugin-control-plane/canonical-main/work-harness/terminal-residue-cleanup/tests/terminal-residue-cleanup-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/work-system/tests/packet-projection-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/agent-decision-view-contract.cjs
node .github/plugin-control-plane/canonical-main/tests/work-system-contract.cjs
git diff --check
```

Historical source evidence: #2539, #2543, #2877 and #2879.
