# Interrupted Effect Recovery Projection v1

This directory owns a pure repository-side semantic classifier for interrupted
effect recovery.

It compresses recovery **decision plumbing**. It does not own recovery effects.

## Purpose

Normal input is already-bounded structured evidence from existing owners:

```text
packet/stage identity
+ D-013 lease state
+ D-014 manifest state
+ workspace-holder identity
+ owning-session evidence
+ local workspace / dirty-scope / Git identity
+ remote branch / PR progress
+ D-013 release eligibility
→ effect-recovery.v1
→ REPOSITORY_EXECUTION_RECEIPT v2
→ REPOSITORY_AGENT_DECISION_VIEW v1
```

The classifier does not fetch or discover those facts itself.

## Authority boundary

**This is recovery compression, not recovery authority expansion.**

The implementation has no:

- GitHub or network client;
- filesystem or Git probe;
- process/session scanner;
- shell/command runner;
- clock, TTL, inactivity, age or latest-wins rule;
- D-013 release/acquire dispatch;
- D-014 writer;
- holder claim/check/release/cleanup effect;
- Git/PR/merge/runtime/device/release/production effect.

A PASS result proves only that the supplied structured evidence maps
deterministically to one reviewed recovery disposition.

All canonical receipt authority flags remain false.

## Recovery dispositions

The only disposition vocabulary is:

```text
SAME_SESSION_RESUME
ABANDONED_LEASE_RELEASE
CLEAN_ABORT
NEEDS_REVIEW
BLOCKED
UNKNOWN
CONFLICT
```

### SAME_SESSION_RESUME

Requires positive `sessionState=LIVE` plus exact current packet, active lease,
manifest, holder, workspace/dirty-scope and Git identity, with no unreviewed
remote/PR progress.

The result tells the caller to continue through the existing owner. It grants
no new execution authority and performs no effect.

### ABANDONED_LEASE_RELEASE

Requires positive `sessionState=ABSENT`, exact active D-013 lease, exact
manifest/holder/workspace/Git identity, exact preserved dirty scope when dirty,
no published/conflicting remote progress, and `releaseEligibility=PROVEN`.

The result is classification only. The existing D-013 owner must still perform
any release. Reacquire/rebind/holder recreation remains outside this module.

### CLEAN_ABORT

Applies only to an already absent exact lease with a clean workspace and no
published/conflicting progress.

If the exact holder record remains, the next action points to the existing
stale-holder cleanup owner. This module does not call it.

### Fail-closed routes

Unknown session authority, unresolved dirty scope, missing exact holder
identity, unreviewed remote/PR progress, blocked release, and explicit
authority conflicts remain `NEEDS_REVIEW`, `BLOCKED`, `UNKNOWN`, or
`CONFLICT`.

An active exact holder plus `sessionState=UNKNOWN` specifically becomes
`HOLDER_AUTHORITY_UNRESOLVED`; it can never imply abandonment.

## Input contract

`normalizeEvidence()` accepts exactly:

```text
schemaVersion = 1
mode = EFFECT_RECOVERY_EVIDENCE
subject
packetState
leaseState
manifestState
holderState
sessionState
workspaceState
dirtyScopeState
gitIdentityState
remoteBranchState
prState
releaseEligibility
locators
```

Every material fact carries one bounded evidence locator.

Unsupported fields fail closed. Therefore timestamps, ages, inactivity
durations, holder claims, commands, environment maps and arbitrary owner
selectors cannot become hidden authority inputs.

The classifier is a module surface rather than a live CLI in v1. A later
reviewed MCL adapter may acquire current evidence and call this module.

## Current session-evidence boundary

At the #2698 scope lock, the repository had no durable owner for RDC
execution-session liveness. `mcl-workspace-holder` explicitly does not own
RDC session/process identity or takeover semantics.

Therefore v1 accepts only bounded `sessionState=LIVE|ABSENT|UNKNOWN` evidence
from a future authorized adapter. It does not define how that evidence is
acquired and does not treat ordinary device online/presence as an owning
effect-session proof.

## Canonical receipt

`buildRecoveryReceipt(input)` projects the classification through the existing
`execution-receipt.cjs` schema v2.

```text
primitiveId = effect-recovery.v1
stage = EFFECT_RECOVERY
proofScope = INTERRUPTED_EFFECT_RECOVERY_CLASSIFICATION_V1
```

No generic receipt schema change is required.

## GPT-facing view

`projectRecoveryEvidence(input, locators)` composes the canonical receipt with
the existing Agent Decision View.

PASS output is intentionally small:

```text
phase = EFFECT_RECOVERY
recoveryDisposition = <reviewed disposition>
dirtyState = CLEAN | PRESERVED
operationAuthority = PROVEN_FOR_CLASSIFICATION
sessionState = LIVE | ABSENT
nextLegalAction = <existing-owner action>
```

Non-PASS results use the existing attention contract:

```text
subject
reasonCode
severity
constraint
nextPhase
locator
```

No new global attention schema is introduced.

Raw holder claims, ledger/manifest bodies, Git diffs/logs, session/process
dumps, commands, environment, credentials and private logs are not input or
output fields.

## Source case

#2693 supplied the motivating fixtures:

- exact active holder + unresolved former owner/session: preserve, no takeover;
- later positive session absence + exact preserved dirty state + release
  eligibility: classify `ABANDONED_LEASE_RELEASE`.

The fixture is source evidence only. This module does not mutate #2693 or own
its recovery lifecycle.

## Validation

```sh
node --check .github/plugin-control-plane/canonical-main/work-harness/effect-recovery/effect-recovery.cjs
node --test .github/plugin-control-plane/canonical-main/work-harness/effect-recovery/tests/effect-recovery-contract.cjs
node --test .github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs
node --test .github/plugin-control-plane/canonical-main/work-harness/tests/agent-decision-view-contract.cjs
git diff --check
```

A later integration packet must separately prove the live evidence adapter and
must not convert session absence alone into lease abandonment.
