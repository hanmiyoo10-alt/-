# MCL stage-entry coordination harness v1

`mcl-stage-entry` is the Mobile Coder Lab repository-stage preparation owner for one
narrow V1 shape:

```text
source packet @ IMPLEMENTATION_PR
+ mcl-dispatch-plan.v1 route=S / executor=S / mutable
→ current main + #485
→ S preflight
→ complete Work System overlap discovery
→ S landing currentness
→ D-013 acquire/readback
→ D-014 manifest
→ deterministic S feature worktree + matching remote feature branch at exact main
→ mcl-execution-handoff.v1 / HANDOFF_READY
→ REPOSITORY_EXECUTION_RECEIPT v2
```

It does not execute the source/effect owner.

## Authority boundary

Existing owners remain authoritative:

- Work System owns packet lifecycle, stage projection, scope normalization and
  overlap semantics.
- `mcl-dispatcher` remains plan-only.
- `mcl-preflight` / `s-env-status` remains route/environment observation.
- `mcl-landing-freshness` owns the fixed S landing currentness observation.
- D-013 / #2352 owns reservation state.
- D-014 owns phase manifest identity.
- `mcl-execution-handoff.v1` owns the reviewed admission semantics.
- the generic Work Harness receipt projector owns lifecycle/disposition/result
  receipt semantics.
- the later fixed route/source owner still owns the actual source effect.

A PASS from this harness proves preparation only. All authority flags remain false.

## Commands

```text
node mcl-stage-entry.cjs inspect --packet '#N' --plan <regular-json-file>

node mcl-stage-entry.cjs apply \
  --packet '#N' \
  --plan <regular-json-file> \
  --apply
```

The repository is fixed to `hanmiyoo10-alt/-`. V1 accepts no caller repository,
remote, branch, worktree path, workflow, command, argv fragment, environment map,
owner selector, retry count, or fallback executor.

The supplied plan must be exactly the reviewed S/S mutable single-phase shape:

```text
schema=mcl-dispatch-plan.v1
phase=1/1
route=S
executor=S
preflight_owner=mcl-preflight
repository_effect=mutable
overlap_guard=required
lease_guard=required
handoff_guard=required
details=withheld
```

## Deterministic workspace

For packet `#N`:

```text
branch   = server/mcl-packet-N
target   = mcl-packet-N
worktree = /root/nyang-worktrees/mcl-packet-N
remote   = origin
base     = exact current protected main
```

Existing local branch, worktree path/registration, or remote branch blocks. V1
never reuses or takes over existing state.

`workspace-prepare.cjs` may create only:

1. one local branch/worktree at the exact already-present current-main object;
2. one matching remote branch using the fixed GitHub create-ref API
   (`POST /git/refs`) with exact ref + exact SHA create-only semantics.

It never fetches, pulls, merges, rebases, resets, stashes, cleans, switches the
landing branch, moves an existing ref, deletes a ref/worktree, or creates a PR.

## Inspect

`inspect` is read-only.

It requires:

1. direct main → #485 → direct main coherence;
2. #485 `CLEAR`, exact main, Required PASS, `UNKNOWN: NONE`;
3. current source packet `IN_PROGRESS / IMPLEMENTATION_PR`;
4. exactly one Work-System-recognized bounded write-scope section;
5. every requested scope normalized by current `scope-overlap.cjs`;
6. current S preflight PASS;
7. bounded complete open packet + open PR discovery;
8. current Work System overlap exactly `DISJOINT`;
9. fixed S landing `server/work` clean with both `origin/main` and live remote
   main equal to current protected main;
10. deterministic target workspace/ref absent.

Pagination is bounded. If issue or PR-file enumeration reaches the reviewed
page cap, discovery becomes partial/UNKNOWN rather than optimistic DISJOINT.

Unparseable nonterminal packets also remain UNKNOWN. The harness does not add
fuzzy compatibility parsing for legacy write-scope headings.

## Apply

`apply` requires literal `--apply` and reruns the full inspect barrier.

On PASS it:

1. delegates D-013 acquire/dispatch/readback to
   `mcl-coordination-operator.cjs`;
2. builds the D-014 `REPOSITORY_MUTATION` manifest through
   `task-handoff.cjs`;
3. posts that immutable manifest to the source packet;
4. creates the deterministic local worktree and matching remote feature ref;
5. verifies clean local/worktree/remote identity at exact current main;
6. posts one bounded `mcl-execution-handoff.v1 / HANDOFF_READY`;
7. returns a generic `REPOSITORY_EXECUTION_RECEIPT` v2.

Success intentionally leaves the D-013 lease active for the next fixed owner.

### Deterministic normal-stage manifest identity

For the normal repository stage-entry path, D-014 binds lease acquisition through
one semantic locator derived only from the exact active lease identity and its
acquired ledger generation:

```text
receipt:mcl-task-lease:<leaseId>:generation:<acquiredGeneration>
```

The same locator is used in both `leaseEvidence.acquireEvidenceRef` and
`inputRefs`. Exact replay of the same lease/generation therefore produces the
same manifest identity even when the caller-side acquire workflow run differs.
A different leaseId or acquired generation remains a different manifest identity.

Caller-specific workflow-run identity remains execution provenance in the
stage-entry receipt/report. It is not part of the normal stage-entry semantic
D-014 identity. This does not change D-013 or D-014 schema or authority.

Expected next action:

```text
CLAIM_OWNER_LOCAL_HOLDER_IF_REQUIRED_THEN_INVOKE_EXISTING_ROUTE_OWNER
```

## Operational landing-currentness normalization

Stage-entry keeps authority admission outside the freshness effect:

```text
packet lifecycle/stage + exact source scopes
→ complete source overlap = DISJOINT
→ S preflight
→ fixed S landing status
→ optional bounded landing normalization
→ repository D-013/D-014 + workspace/ref preparation
```

For the fixed S/S V1.x profile, `inspect` remains read-only and classifies the
landing as either exact-current or normalization-required. Normalization-required
is accepted only when the landing is the fixed `server/work` checkout, clean,
the live remote main already equals the exact protected main, and only local
`origin/main` is stale or missing. Dirty state, branch mismatch, remote-main
mismatch, malformed evidence, or another non-reviewed state still fails closed.

Before the effect, stage-entry performs a second complete Work System overlap
classification for exactly:

```text
surface:mcl-landing-origin-main:S
```

Only `DISJOINT` can proceed. It then composes the existing owners without
redefining them:

```text
D-013 landing_metadata acquire
→ D-014 normalization manifest
→ mcl-landing-freshness refresh S
→ exact readback
→ D-013 normal release
→ D-014 COMPLETE
→ one full main/packet/source-overlap/preflight/landing/workspace revalidation
```

There is at most one normalization attempt per stage-entry invocation. A failed
release is not automatically retried; the separately reviewed explicit D-013
recovery owner remains the recovery surface.

The normal generic receipt exposes only bounded normalization summary evidence,
including whether normalization was required/performed and durable evidence
locators. Raw ledger, manifest, Git, or workflow transcripts remain behind
targeted drill-down.

This operational normalization never creates or advances packet lifecycle,
interaction-stage authority, source write scope, or overlap authority.

## Holder boundary

V1 does not claim, check, release, or export `mcl-workspace-holder`.

The holder raw claim is ephemeral capability material. Exporting that claim from
a short-lived stage-entry process to a later process would create a new
capability-transport boundary.

A later reviewed known-owner composition may put holder claim and fixed owner
invocation in one process so the raw claim never crosses the GPT-facing surface.

## Failure and cleanup

There is no generic retry loop.

- deterministic request/schema/construction errors require correction;
- overlap/currentness conflicts fail closed;
- D-013/D-014/workspace/ref failures remain explicit;
- the harness does not automatically call release-recovery;
- #2564 `lease-release-recover` remains a separately explicit owner.

If a failure occurs after D-013 acquire but before any workspace/ref state
changes, the harness attempts one normal exact D-013 release.

Once local workspace or remote-ref state changed, later failure preserves the
real partial state and active lease for targeted recovery. It never resets,
deletes, force-cleans, or rewrites state merely to return green.

## Receipt

Normal output is the merged generic receipt v2:

```text
executionLifecycle
attentionDisposition
result
steps
reasonCodes
artifactLocators
nextLegalAction
```

A successful receipt has:

```text
executionLifecycle=FINISHED
attentionDisposition=COMPLETE
result=PASS
```

This proves only `MCL_STAGE_ENTRY_COORDINATION_PREPARATION_V1`.

Repository mutation, execution, merge, release, production, runtime, and
security authority remain false.

## Validation

```text
node products/chatgpt-mobile-coder-lab/coordination/stage-entry/tests/test-workspace-prepare.cjs
node products/chatgpt-mobile-coder-lab/coordination/stage-entry/tests/test-stage-entry.cjs

node --check products/chatgpt-mobile-coder-lab/coordination/stage-entry/workspace-prepare.cjs
node --check products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs
node --check products/chatgpt-mobile-coder-lab/coordination/stage-entry/tests/test-workspace-prepare.cjs
node --check products/chatgpt-mobile-coder-lab/coordination/stage-entry/tests/test-stage-entry.cjs
```

No real source/effect-owner invocation is part of the V1 contract test suite.
