# Local Usage Dashboard — E7 5.74 Real-Release Retrospective

Status: **FEEDBACK CLOSED — findings promoted to E8 design #312**

Recorded: `2026-08-25`

Evidence basis:
- 5.74 product issue: `#303`
- deterministic release PR: `#306`
- final exact-SHA candidate: `02b440aec5715b6d42f929fdf01a35d08485730a`
- exact-SHA validation transaction: `32774436983`
- authoritative registry: `TEST_REGISTRY_GREEN:81`
- main merge: `0c3cd21d6c4bc07df71f4b0f6c69024835375601`
- production `release-usage-dashboard`: `0a97ea22a9f4f15c13de379099e175d0043d385a`
- promoted next-generation design: Issue `#312` / E8

## Verdict

E7 succeeded at its core purpose.

It did **not** make real releases failure-free. Instead, 5.74 proved the stronger and more useful property:

```text
fail closed
→ repair source only
→ reuse the same stage command
→ reuse the same deterministic candidate branch
→ reuse the same PR
→ validate the new exact SHA
→ merge exact validated head
→ promote exact bytes
```

That is the correct release-system direction. The next generation should reduce avoidable coordination/noise without removing validation layers.

## What E7 proved successfully

### 1. Preflight failed before candidate mutation

The first 5.74 stage attempt found two intentional historical version fixtures lacking `UD_HISTORICAL_VERSION_LOCK` and stopped with `RELEASE_PREFLIGHT_REJECTED` before candidate write.

This proved E7-D fail-closed ordering is correct.

### 2. Reentrant repair actually works

After source repair, the same `/usage-dashboard stage <source-branch>` command was reused.

Later, after full validation found a materializer durable-memory synchronization omission, the same source branch was repaired again and the same deterministic candidate branch fast-forwarded from:

```text
691bc38a5348a88331c1f202f729e805bc70adcb
→
02b440aec5715b6d42f929fdf01a35d08485730a
```

No `-v2/-v3` branch, no replacement PR and no force push were required.

### 3. PR bootstrap left the Actions-token failure path

PR `#306` was ensured through the connected GitHub control surface rather than Actions-token PR creation.

The 5.73 HTTP-403 bootstrap failure mode was therefore absent from the normal stage transaction.

### 4. Exact-SHA validation removed close/reopen dependence

After the controller-authored candidate branch advanced, ordinary PR-triggered workflows became `action_required`.

E7-C still bound PR `#306` to the exact new candidate SHA and ran the full authoritative registry successfully without close/reopen.

This is the strongest 5.74 E7 proof.

### 5. Exact-head merge and exact-byte promotion remained intact

The final candidate SHA equaled the current PR head immediately before merge, the merge used expected-head protection, and production promotion rebuilt nothing.

Deployment receipt and direct Git blob checks confirmed exact-byte parity.

## Friction found by the real release

### F1. Historical-fixture debt was discovered too late

The first real 5.74 stage had to stop because pre-existing historical fixtures had not yet been annotated.

The preflight was correct to stop, but the repository should ideally prevent this debt from surviving until the next release starts.

**Feedback:** add a permanent repository contract/lint that rejects new stale current-release literals unless they are explicitly historical. Then release staging is not the first place historical fixture debt is discovered.

### F2. A cheap release-memory contract is missing from stage

The first candidate passed materialization, source parity, idempotency and focused behavior smoke, but full validation later failed because the 5.74 materializer did not synchronize the durable `Last verified real-device baseline` line.

The existing `current-release-contract.cjs` caught this correctly, but only after candidate creation and PR bootstrap.

**Feedback:** run the cheap current-release/release-memory contract during read-only stage validation **before candidate bundle/write**. This would have kept the broken materialization from ever becoming a candidate SHA.

This is the highest-value next-generation hardening item.

### F3. Ordinary PR `action_required` remains noisy

E7-C made this state non-authoritative, which is good, but a controller-authored candidate branch repair can still leave noisy `action_required` workflow results on the PR.

That noise can look like a broken release even when exact-SHA authority is GREEN.

**Feedback:** make ordinary PR workflows candidate-aware so deterministic Usage Dashboard stage branches either run only when they provide independent value or surface an explicitly benign/non-authoritative signal. Do not weaken the full exact-SHA registry.

### F4. E7 documentation closure became stale/inexact

The E7 implementation document was written before the 5.74 real-release proof and therefore retained a point-in-time `E7-E pending` status.

The release also proved that deployment receipt is automatic while final repository evidence closure is assistant-owned and physical verification is user/device-owned.

**Feedback:** the next generation must become the current cohesive runbook, explicitly mark E7-E complete, and state those three closure authorities accurately. Historical E7 documents remain evidence rather than current authority.

### F5. Connected-control-surface ref mutation needs a tighter operator invariant

During final merge handling an accidental transient branch `tmp-noop-should-not-create` was created by an incorrect connector action. It did not change source, candidate, main or production bytes and was not release authority, but it exposed a useful operator-safety rule.

**Feedback:** after `CANDIDATE_READY`, the connected control surface should be allowed to manage PR metadata/comments/validation activation/exact-head merge, but must not create or rewrite release Git refs. Candidate ref creation/advancement remains controller-owned and production ref mutation remains promoter-owned.

## E-series promotion rule

This retrospective closes the E7 feedback pass. Per the release-system generation convention:

```text
complete E(n)
→ real release / operation
→ retrospective / feedback
→ E(n+1)
```

Therefore these findings are **not** an `E7.1` or same-generation hardening suffix. They are promoted directly to **E8**, design Issue `#312`.

## E8 mapping

- **E8-A — Generation Closure & Evidence Authority:** close E7-E using 5.74 evidence and establish the exact integer generation rule.
- **E8-B — Pre-Candidate Release-Memory Gate:** run current-release/release-memory validation in the read-only materialization path before candidate write.
- **E8-C — Continuous Historical-Literal Hygiene:** make unannotated stale current-release assertions fail normal regression rather than waiting for release day.
- **E8-D — Deterministic Candidate PR Signal Normalization:** reduce misleading ordinary PR noise while preserving exact-SHA authority.
- **E8-E — Connected Control-Surface Ref Mutation Boundary:** connected assistant operations do not mutate candidate/production refs after `CANDIDATE_READY`.
- **E8-F — Next Real Release Proof:** prove E8 in the next real product release.

## Deliberately deferred

Do **not** use E8 to redesign the product materializer architecture wholesale.

The materializer omission suggests a future generic release-memory synchronization helper could reduce per-version scripting risk, but that is larger than the minimum E8 hardening justified by 5.74.

Do not combine product runtime slimming, parser consolidation, timer/listener pruning or unrelated S1 cleanup into release-system work.

## Recommended next state

```text
E7 core architecture: PROVEN / COMPLETE
E7 retrospective: CLOSED
E8 design authority: #312
E8 implementation: proceeds separately from product bytes
5.74 physical verification: separate and still PENDING until PocketRisu evidence exists
```

The guiding principle remains:

> Simplify by moving cheap failures earlier and removing coordination/noise, not by removing exact-SHA or exact-byte guarantees.
