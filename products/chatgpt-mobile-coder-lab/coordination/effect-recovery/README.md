# MCL interrupted-effect recovery inspect v1

`mcl-effect-recovery-inspect.cjs` is the S-only read-only evidence adapter for the
repository-wide interrupted-effect recovery classifier.

Its normal shape is:

```text
current packet / main / #485
+ D-013 lease + release plan
+ D-014 manifest
+ workspace-holder identity
+ local worktree / dirty scope / Git identity
+ remote branch / PR state
+ bounded local RDC command-session absence
→ merged effect-recovery.v1 classifier
→ canonical execution receipt v2
→ Agent Decision View v1
```

This owner compresses recovery inspection. It does not perform recovery.

## Invocation

```sh
node products/chatgpt-mobile-coder-lab/coordination/effect-recovery/mcl-effect-recovery-inspect.cjs \
  inspect --packet '#N' --format agent-view
```

`--format receipt` returns the canonical receipt instead.

V1 accepts no caller-selected repository, route, executor, workspace, branch,
manifest, holder, PR, command, process, session or owner selector.

The repository is fixed to `hanmiyoo10-alt/-`; the packet selects the fixed
`server/mcl-packet-N` repository workspace through current D-013 evidence.

## Authority boundary

A PASS proves only the merged recovery classifier's decision from current bounded
evidence.

The inspector never:
- releases or acquires D-013;
- cleans, claims, checks or releases the holder;
- writes D-014;
- mutates Git refs, index or worktree;
- creates, updates, comments on, reviews, closes or merges a PR;
- kills, restarts or takes over a process/session;
- repairs RDC, device, runtime, release or production state.

D-013 release eligibility is obtained only through the existing plan-only release
planner. No dispatch path is reachable from this owner.

## Session evidence

The local RDC observation answers exactly one question:

> Is there another RDC command-session shell under the same verified S command
> agent besides the current inspector command root?

Projection:

```text
no other command-session shell
→ sessionState=ABSENT

another command-session shell
→ sessionState=UNKNOWN

topology/read ambiguity
→ sessionState=UNKNOWN
```

V1 never emits `LIVE`. Presence of another RDC command does not prove it owns the
interrupted effect, so it cannot manufacture `SAME_SESSION_RESUME`.

This observation has no TTL, elapsed-time, inactivity, latest-wins or takeover
semantics. A later positive owner-session binding requires separate reviewed
authority.

## Current evidence composition

The inspector composes existing owners rather than defining replacement truth:

- Work System packet projection and deterministic path/surface scope;
- direct main and #485 currentness;
- D-013 #2352 active lease identity and plan-only release eligibility;
- D-014 immutable manifest verification selected by exact lease/holder identity;
- workspace-holder record identity, never the raw holder claim;
- read-only local Git/worktree state;
- bounded remote branch and PR reads;
- merged repository `effect-recovery.v1` classification.

Manifest selection is identity-based. There is no latest-comment-wins rule.

PR discovery is bounded and paginated. Incomplete discovery is `UNKNOWN`, never
proof that a PR is absent.

Dirty state is `DIRTY_PRESERVED / EXACT` only when every changed or untracked
path is inside the packet's current deterministic path scope and Git identity
remains exact to the active lease evidence.

## Privacy boundary

Raw PID/PPID/cmdline/process tree, device/session/account identity, holder claim,
holder claim digest, ledger/manifest bodies, Git diff/log content, credentials,
environment and raw GitHub responses are not durable report or GPT-facing fields.

The durable report contains only bounded semantic dispositions/reason codes and
the canonical classifier result.

Evidence artifacts are derived local files written under the exact worktree Git
administrative directory when available, otherwise under a fixed `/tmp`
fallback. They grant no repository or recovery authority.

## Failure semantics

Missing/stale/conflicting packet, lease, manifest, holder, workspace, remote, PR,
release-plan or session evidence remains `UNKNOWN`, `CONFLICT` or `BLOCKED`.

Important fail-closed cases include:
- duplicate or partial manifest/comment discovery;
- holder/manifest/lease identity mismatch;
- dirty path outside current packet scope;
- local branch/HEAD mismatch;
- remote branch advancement;
- open/merged/ambiguous PR state;
- partial PR pagination;
- blocked or unreadable D-013 release plan;
- another RDC command session or ambiguous local agent topology.

The inspector never normalizes these into a stronger recovery disposition.

## Recovery effects

A result such as `ABANDONED_LEASE_RELEASE` is classification only. The caller
must use the existing reviewed recovery owners under fresh authority.

For the reviewed abandoned-active-lease path that means, at most:

```text
existing D-013 release owner
→ exact stale-holder cleanup
→ fresh overlap/currentness
→ existing D-013 reacquire
→ fresh D-014 rebind
→ holder recreation
```

The inspector itself performs none of those effects.

## Validation

```sh
node --check products/chatgpt-mobile-coder-lab/coordination/effect-recovery/mcl-effect-recovery-inspect.cjs
node --check products/chatgpt-mobile-coder-lab/coordination/effect-recovery/tests/test-effect-recovery-inspect.cjs
node --test products/chatgpt-mobile-coder-lab/coordination/effect-recovery/tests/test-effect-recovery-inspect.cjs
node --test .github/plugin-control-plane/canonical-main/work-harness/effect-recovery/tests/effect-recovery-contract.cjs
git diff --check
```

Neighbor D-013, D-014, holder and coordination-operator contract suites must also
stay green before the implementation PR is considered complete.

Natural interrupted-effect proof belongs to the later EXPERIMENT_CLOSE stage.
Do not manufacture an interruption solely to close that observation.
