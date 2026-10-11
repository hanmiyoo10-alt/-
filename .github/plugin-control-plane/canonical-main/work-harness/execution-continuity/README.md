# Execution Continuity Projection v1

This directory owns the pure repository-side foundation for connection-independent
execution continuity.

Core invariant:

> Chat connection is observation transport, not execution authority or execution lifetime.

The module classifies already-bounded continuity evidence. It does not supervise
a process, inspect a machine, persist a journal, execute an effect, or perform
recovery.

## Composition

```text
bounded continuity evidence
→ execution-continuity.v1
→ resume disposition
→ REPOSITORY_EXECUTION_RECEIPT v2
→ REPOSITORY_AGENT_DECISION_VIEW v1
```

Existing generic receipt and Agent Decision View schemas remain unchanged.

## Identity

`operationId` remains the canonical receipt operation identity.

Continuity uses a distinct deterministic identity:

```text
activationDigest = sha256(exact reviewed semantic owner request)
runId = run-<sha256(packetRef + phase + ownerId + activationDigest)>
attemptId = positive monotonic integer within one run
```

PID, RDC session, Chat connection, lease, manifest, hostname, clock and age are
not run identity.

## Independent axes

Connection observation:

```text
ATTACHED
DETACHED
REATTACHED
UNKNOWN
```

Continuity lifecycle:

```text
QUEUED
RUNNING
WAITING
FINISHED
UNKNOWN
```

`DETACHED + RUNNING` is valid.

Changing only connection observation cannot create failure, abandonment,
cleanup, retry, lease-release or recovery authority.

## Resume dispositions

Exactly:

```text
OWNER_STILL_RUNNING
CONTINUE_FROM_CHECKPOINT
ALREADY_FINISHED
NEEDS_RECOVERY_INSPECT
BLOCKED
UNKNOWN
```

`OWNER_STILL_RUNNING` requires both a reviewed `DETACHED_CAPABLE` runtime and
exact positive owner liveness.

`CONTINUE_FROM_CHECKPOINT` requires an absent owner, exact checkpoint,
unambiguous effect truth, proven current continuation authority, and a proven
next primitive. It grants no effect authority. The next owner must rerun its own
currentness and authority barriers.

`ALREADY_FINISHED` requires an exact final canonical receipt.

Ambiguous interrupted-effect truth routes to the existing Phase 8.6.5 recovery
owner. This module does not duplicate recovery semantics.

## Checkpoint order

Initial rank:

```text
NONE                     0
WORKSPACE_READY          10
SOURCE_MUTATION_COMPLETE 20
VALIDATION_PASS          30
COMMIT_CREATED           40
PUSH_COMPLETE            50
REMOTE_HEAD_VERIFIED     60
PR_CREATED               70
COORDINATION_RELEASED    80
FINISHED                 90
```

Optional checkpoints may be skipped. A known checkpoint cannot regress.

## Lost acknowledgement

A missing local journal entry is never proof that an effect did not happen.

If remote authoritative evidence proves an exact effect while local journal
acknowledgement is absent, the classifier marks that effect duplicate-safe and
continues only from the separately proven next primitive.

If remote attribution is unknown or conflicting, it does not infer `NOT_RUN`.
The disposition becomes recovery/review instead.

## Pure CAS helpers

The module also owns pure validation helpers for the future persistence layer:

- generation increases exactly by one;
- `previousRecordDigest` binds the prior snapshot;
- attempt ID never decreases;
- checkpoint rank never decreases;
- finished records are immutable;
- deterministic effect keys are append-only/idempotent and cannot be rewritten
  to conflicting evidence.

Future effect key:

```text
sha256(runId + primitiveId + targetIdentity)
```

These helpers write no filesystem state.

## Future storage boundary

The first reviewed repository-workspace integration will store bounded
continuity evidence outside tracked Git under:

```text
<git-admin>/execution-continuity/<runId>/
```

with regular non-symlink files, restrictive permissions and atomic
temp-write/rename plus generation/digest CAS.

That persistence owner is not implemented here.

No global progress database is introduced.

## Runtime boundary

No current ChatGPT connector call, ordinary RDC command, Desktop Commander
service or external task runner is made `DETACHED_CAPABLE` by this module.

A future runtime integration must separately prove that an exact
repository/remote-owned supervised runner survives Chat transport detachment.

## Authority boundary

This module has no:

- filesystem writer;
- Git/GitHub/network client;
- process or shell runner;
- clock, timeout, TTL, age or randomness source;
- D-013/D-014 mutation;
- holder claim/check/release effect;
- source, commit, push, PR or merge effect;
- recovery effect;
- release, production, runtime or security authority.

All canonical receipt authority flags remain false.

## Validation

```sh
node --check .github/plugin-control-plane/canonical-main/work-harness/execution-continuity/execution-continuity.cjs
node --check .github/plugin-control-plane/canonical-main/work-harness/execution-continuity/tests/execution-continuity-contract.cjs
node --test .github/plugin-control-plane/canonical-main/work-harness/execution-continuity/tests/execution-continuity-contract.cjs

node .github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs
node .github/plugin-control-plane/canonical-main/work-harness/tests/agent-decision-view-contract.cjs
node --test .github/plugin-control-plane/canonical-main/work-harness/effect-recovery/tests/effect-recovery-contract.cjs

git diff --check
```

Refs #2745 #2698 #2706 #2577.
