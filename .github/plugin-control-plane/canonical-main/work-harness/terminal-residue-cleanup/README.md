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

V1.1 resolves packet/PR-bound sidecars across one bounded fixed checkout set:

```text
fixed control repo /root/nyang-repo
+ Git-registered direct children of /root/nyang-worktrees
→ each exact checkout Git-admin directory
→ fixed evidence directories only
```

Registered worktrees outside that fixed root are not admitted or scanned. A registered
candidate inside the fixed root must resolve to a real non-symlink directory with a
Git-admin directory directly under the fixed common Git `worktrees/` area. Discovery is
count-bounded and has no caller-selected checkout/path/registry surface.

V1.1 recognizes packet/PR-bound sidecars only under:

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

The archive uses one logical relative evidence identity. Identical copies of that
logical file in more than one admitted checkout may coalesce only when size and SHA-256
are exact; every exact source location remains bound for post-archive cleanup. A
conflicting duplicate is CONFLICT. There is no timestamp/latest-wins choice.

An unrecognized packet-bound `*-evidence` directory in an admitted checkout remains
UNKNOWN.

When the bounded registered-worktree scan proves **zero** recognized local validation
sidecars, cleanup does not treat zero as validation success. It enters one alternate
provenance profile and requires an exact canonical `EXPERIMENT_CLOSE` checkpoint pair:

```text
packet issue exact v1 checkpoint comment
+ fixed audit issue #293 exact v1 checkpoint comment
→ same packet / stage / digest
→ fixed owner + OWNER association
→ unedited and created before packet native close
→ byte-equal payload after fixed packet/audit envelopes
→ digest recomputed by stage-checkpoint.cjs
→ payload has exactly one source-owned merge identity line:
   `merged main` or `merged/current main`
→ recognized merge SHA == exact PR merge
→ payload has exactly one source-owned required-state line with value NONE:
   `required EXPERIMENT_CLOSE UNKNOWN / conflict / blocker`
   or `required UNKNOWN / conflict / blocker`
```

The pair is discovered from bounded packet/#293 comments. The caller cannot supply
comment ids, audit issue, digest, author, payload, zero-evidence flag, merge-field label,
or alternate location. The merge identity parser recognizes only the two exact
repository-emitted merge labels above. The required-state parser likewise recognizes
only the two exact repository-emitted labels above and requires value `NONE`. For each
field family, zero recognized lines remains UNKNOWN; more than one recognized line is
CONFLICT even when semantically identical; near-match/fuzzy wording is not accepted.
Missing, duplicate, edited, post-close, mismatching, malformed, or pagination-unknown
checkpoint evidence fails closed. The checkpoint is cleanup
provenance only; it does not grant validation, merge, release, or production authority.

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

Normal local-sidecar archives remain schema v1 and byte/digest compatible.

For the zero-local-sidecar profile only, schema v2 additionally binds:
- `evidenceProfile = DURABLE_TERMINAL_CHECKPOINT`;
- exact canonical checkpoint digest;
- exact packet and #293 comment ids;
- exactly two archived comment snapshots under
  `terminal-stage-checkpoint-evidence/`.

Those two files are the exact GitHub checkpoint comment bodies, not synthetic
validation sidecars. They are hashed and retained locally so later cleanup recovery
does not depend on refetching the remote comments after archive publication.

Directories are 0700. Evidence, checkpoint snapshots, and manifest files are 0600.

Archive publication is temp-write → full verification → atomic rename. A matching
existing archive is reused. A mismatching existing archive is CONFLICT and is never
overwritten.

This is repository-local retention. It is not off-host backup or clone portability.

## Apply ordering

```text
locate exact packet/PR local evidence sources
→ if local evidence exists:
     archive unique logical sidecars + verify
     → re-prove exact source path/size/SHA-256
     → delete only exact archived sidecar source files
     → prove exact evidence sources absent
   else:
     prove exact dual EXPERIMENT_CLOSE checkpoint pair
     → snapshot both exact comment bodies into schema-v2 archive
     → verify checkpoint archive
→ archive reverify
→ fresh admission
→ exact clean feature-worktree remove when present
→ archive reverify
→ fresh candidate reachability + open-PR proof
→ remote expected-old CAS delete
→ fresh admission
→ local expected-old update-ref delete
→ final archive verification
```

No sidecar, worktree or ref deletion happens before the archive is verified. Evidence
source cleanup never removes evidence directories and a source identity change fails
closed before deletion. Failure to clear the exact archived source sidecars prevents
later worktree/ref effects.

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
node .github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/agent-decision-view-contract.cjs
node .github/plugin-control-plane/canonical-main/tests/work-system-contract.cjs
git diff --check
```

Historical source evidence: #2539, #2543, #2877 and #2879.
