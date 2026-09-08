# Local Usage Dashboard E26 - Autonomous Retry Convergence + Reducer Simplification

Status: **DESIGN FROZEN / IMPLEMENTATION NOT STARTED**

Date: 2026-09-08 KST

Canonical issue: #1895

Scope: `plugins/usage-dashboard/` release-control maintenance only.

E26 is a byte-neutral control-plane design. It does not consume a Product, Engine, Manager, CLI, Models, or contract version. It does not add a new release authority gate.

## 1. Fresh baseline

Design baseline read back before authoring:

```text
main: d5a8a89e3b17028484bddba95815ed86976f1679
production branch: release-usage-dashboard
production SHA: b5ff566fdf164580b0edfa6e2db1d07cc88992bf
Product: 3.0.0-alpha.5.107
Engine: 1.6.41
Manager: 1.3.6
CLI: 1.10.0
Models: 1.280.0
contracts: 1/1
5.107 exact-byte deployment: VERIFIED
5.107 physical verification: PENDING
```

The design is based on the actual 5.107 release transaction and `docs/USAGE_DASHBOARD_5107_E_SYSTEM_RETROSPECTIVE.md`.

## 2. Preservation rule

E26 preserves the current authority graph exactly:

```text
E13 -> E14 -> E15 -> E9 -> E11 -> E16
-> assistant fresh reread
-> expected-head merge
-> monotonic exact-byte promotion
-> separate physical acceptance
```

E26 is a maintenance generation, not a new node in this graph.

Specifically:

- do not add `E26` to the durable `release_generation` matcher;
- do not replace or weaken E15;
- do not merge E9, E11, or E16 into ordinary PR CI;
- do not give E26 merge authority;
- do not change expected-head merge semantics;
- do not change monotonic exact-byte promotion;
- do not change deployment != physical acceptance;
- do not create a new credential or token class.

The current `release_request_e9.cjs` transaction `attemptId`, derived from release version + source SHA, remains the source/candidate transaction identity. E26 must not repurpose it as a validation retry counter.

## 3. Real 5.107 problem statement

PR #1893 initially contained mutable 40-character SHA prose. E15 correctly rejected the handoff with `E15_PR_MUTABLE_SHA_PROSE` during E9 exact-SHA validation.

The PR body was then repaired without changing:

- source SHA;
- candidate SHA;
- candidate branch;
- release request;
- product/runtime bytes.

The same candidate was still correct, but the durable reducer already had:

```text
UD_E9_VALIDATION_DISPATCHED:<candidate-sha>
```

Because that marker is candidate-scoped and has no validation-attempt generation, the reducer did not automatically dispatch a fresh E9 validation after the handoff repair. Recovery required an explicit GitHub Actions rerun.

The release remained safe. The weakness was automation and convergence ergonomics, not correctness.

## 4. E26 design principle

> Remove mechanical operator seams before adding any new gate.

E26 uses the existing trusted-main Durable Release Reconciler as the only orchestration owner.

Do not add:

- a new workflow owner;
- a second reducer;
- a queue;
- a daemon;
- a durable state file;
- a new scheduler;
- a new database;
- a new release request field merely to count retries.

The existing 5-minute schedule remains a fallback, not the primary convergence mechanism.

## 5. E26-A - shift E15 handoff validation left

### 5.1 Pre-dispatch handoff check

After E25 has discovered/bound the deterministic PR and before E9 exact-SHA dispatch, the trusted-main reconciler must re-read the current PR and run the existing E15 stable PR-body validation.

The exact-SHA workflow must still validate E15 again. This is shift-left duplication of a deterministic safety check, not a transfer of authority.

If E15 fails before dispatch:

```text
state: HANDOFF_BLOCKED
reason: bounded E15 code
E9 dispatch: none
candidate bytes: unchanged
production: unchanged
```

Do not dispatch an expensive exact-SHA validation that is already known to fail its handoff contract.

### 5.2 Automatic wake after repair

The Durable Release Reconciler currently observes `pull_request` close events but not normal PR body repair as a primary wake source.

E26 should extend the existing trusted-main workflow trigger to bounded relevant PR events such as:

```text
opened
edited
synchronize
reopened
closed
```

The reducer still re-checks that the PR belongs to a valid Usage Dashboard durable request before taking action.

A PR edit is only a wake signal. It is not release truth.

This gives the desired path:

```text
invalid handoff
-> reducer blocks before E9
-> assistant repairs stable PR body
-> pull_request edited wakes reducer
-> E15 preflight passes
-> E9 attempt 1 dispatches automatically
```

No workflow rerun is needed for the 5.107 class of failure.

## 6. E26-B - validation-attempt ledger

### 6.1 Separate validation attempt from transaction attempt

Keep existing:

```text
attemptId = hash(releaseVersion + sourceSha)
```

Add a derived validation attempt index scoped to:

```text
request number + PR number + candidate SHA
```

The validation attempt index is not stored as a mutable release-request field. It is derived from append-only durable validation receipts.

Example:

```text
candidate C
validation attempt 1
validation attempt 2
```

If candidate SHA changes, validation attempt numbering restarts at 1 for the new candidate.

### 6.2 Structured dispatch receipt

Future validation dispatches should publish a structured receipt such as:

```text
UD_E9_VALIDATION_ATTEMPT_V2
candidate_sha: <sha>
pr: #<number>
attempt: 1
state: DISPATCHED
reason: first-validation
```

A retry may add:

```text
retry_of: 1
reason: retryable-validation-failure
```

Never delete or rewrite an earlier dispatch/failure receipt.

The current legacy marker remains readable for backward compatibility but should not be the sole future validation-attempt state model.

### 6.3 Bounded result classification

E9 exact-SHA validation should publish a bounded result class in addition to GREEN/RED.

Minimum classes:

```text
GREEN
RED_LOGICAL
RED_RETRYABLE
```

`RED_LOGICAL` means the exact immutable candidate or current release contract failed a deterministic check and should not be re-run unchanged.

`RED_RETRYABLE` is limited to trusted workflow/infrastructure classes where repeating the same immutable validation can legitimately change the outcome without changing release truth.

Do not classify arbitrary test failure as retryable.

Do not use raw log text as the durable reason.

## 7. E26-C - one bounded automatic retry

Automatic same-candidate retry is intentionally narrow.

Rules:

1. attempt 1 `GREEN` -> continue to E11;
2. attempt 1 `RED_LOGICAL` -> stop, diagnose, require a new candidate or handoff repair as appropriate;
3. attempt 1 `RED_RETRYABLE` -> automatically dispatch attempt 2;
4. attempt 2 `GREEN` -> continue to E11;
5. attempt 2 `RED_RETRYABLE` -> stop and diagnose, no loop;
6. any ambiguous/missing failure class -> fail closed, no automatic retry;
7. a retry receipt never implies GREEN;
8. E11 and E16 must be regenerated fresh after the successful validation attempt.

The automatic retry budget is therefore:

```text
maximum total attempts for unchanged candidate = 2
```

This is enough to remove a transient operator rerun without turning the reducer into an unbounded retry engine.

## 8. E26-D - reducer decision simplification

Add one small pure deterministic helper, working name:

```text
plugins/usage-dashboard/tools/release_validation_convergence_e26.cjs
```

The helper performs no GitHub I/O and owns no credentials.

It receives normalized facts already read by the trusted reducer:

```text
request identity
candidate identity
bound PR identity
current E15 verdict
validation attempt receipts
latest validation result
```

It returns exactly one bounded action:

```text
BLOCK_HANDOFF
DISPATCH_FIRST
WAIT_IN_FLIGHT
RETRY_ONCE
BLOCK_LOGICAL_RED
BLOCK_RETRY_EXHAUSTED
CONTINUE_GREEN
BLOCK_AMBIGUOUS
```

The workflow shell should perform transport only after this decision.

This replaces candidate-marker-specific branching for validation convergence with one explicit state classifier while leaving source readiness, E7 staging, E25 PR discovery/binding, E11, E16, merge, promotion, and physical acceptance in their existing owners.

Do not rewrite the whole reducer in E26.

## 9. Direct workflow completion wake

To reduce schedule latency, the existing Durable Release Reconciler may add the existing E9 exact-SHA validation workflow as a `workflow_run: completed` wake source.

This does not create a new workflow or authority.

Desired normal path:

```text
E9 validation completes
-> reducer wakes immediately
-> reads authoritative result receipt
-> if GREEN, evaluates E11
-> if RED_RETRYABLE and retry budget remains, dispatches retry
-> otherwise blocks
```

The 5-minute schedule remains as self-heal fallback.

Concurrency remains single-owner and idempotent.

## 10. E25 trusted PR creation remains unchanged

E26 does not weaken or bypass E25's trusted PR creation policy.

If current Actions policy still does not live-prove initial PR creation:

```text
assistant creates exactly one deterministic PR
-> E25 discovers/binds it automatically
-> E26 owns all post-bind handoff preflight and validation convergence
```

No PAT, stronger GitHub App credential, or new secret may be introduced merely to claim Full Automation PASS.

If E25's already-authorized trusted creation path is later live-proven under current repository policy, E26 can consume that result without changing its design.

## 11. Durable evidence rules

E26 evidence must be append-only and monotonic.

Allowed new receipt information:

```text
validation attempt number
retry_of attempt number
bounded result class
bounded reason code
candidate SHA
PR number
workflow transaction/run identity
```

Do not persist:

```text
raw logs
raw stderr
HTTP response bodies
tokens/cookies/session material
arbitrary user-controlled prose as reason codes
organization/account private IDs
fabricated status
```

Historical RED remains historical RED even if a later attempt becomes GREEN.

## 12. Candidate and handoff change rules

### Candidate changes

A new candidate SHA always requires fresh E9 exact-SHA validation attempt 1.

Old GREEN never transfers to a new candidate.

### PR body repair before dispatch

If E15 preflight is blocked and the PR body is repaired while candidate SHA is unchanged:

- no retry is counted because E9 was never dispatched;
- the repaired PR is re-read and validated;
- normal attempt 1 dispatch follows.

### PR mutation after dispatch

If a PR mutates after E9 dispatch, the exact workflow and reducer must re-read identity and fail closed under existing E15/E9 rules.

E26 must not treat an arbitrary PR edit as permission to retry a logical RED.

## 13. Required regression matrix

E26 focused coverage must prove at minimum:

1. E15-invalid PR body is blocked before E9 dispatch;
2. `E15_PR_MUTABLE_SHA_PROSE` remains rejected;
3. repairing the PR body and emitting `pull_request edited` wakes the reducer;
4. repaired valid handoff dispatches E9 automatically with unchanged candidate;
5. first validation attempt records attempt 1;
6. GREEN attempt 1 proceeds to fresh E11;
7. RED_LOGICAL attempt 1 does not retry unchanged candidate;
8. RED_RETRYABLE attempt 1 dispatches exactly one attempt 2;
9. RED_RETRYABLE attempt 2 does not dispatch attempt 3;
10. GREEN attempt 2 proceeds to fresh E11/E16;
11. unknown/ambiguous result class fails closed;
12. candidate SHA change resets validation attempt to 1;
13. legacy `UD_E9_VALIDATION_DISPATCHED:<sha>` history remains readable;
14. prior historical RED receipts are never deleted or rewritten;
15. duplicate/ambiguous PR identity remains fail closed under E25;
16. E11 `MERGE_READY_NO_DRIFT` semantics remain unchanged;
17. E16 capsule semantics remain unchanged;
18. expected-head merge remains assistant-owned and fresh-reread protected;
19. monotonic exact-byte promotion remains unchanged;
20. physical acceptance remains actual-device-only;
21. no new token/credential class exists;
22. no new workflow/queue/daemon/state file exists;
23. reducer schedule remains fallback rather than sole wake mechanism;
24. full discovered Usage Dashboard regression registry remains GREEN.

Do not freeze a total test-count integer.

## 14. Shared-standard target

Required post-implementation minimum:

```text
Stability / Safety              PASS
Automation                      improved over E25
Simplification                  PASS
Correctness / Authority         PASS
Diagnosability / Observability  PASS
Determinism / Reproducibility   PASS
Recoverability / Retry Safety   PASS
Scalability / Efficiency        WATCH or better
User intervention boundary      PASS
```

Automation may be called full `PASS` only if all remaining release-control seams are live-proven under current repository policy. If initial trusted PR creation still requires the authorized assistant fallback, report Automation honestly as improved `PARTIAL`.

## 15. Expected operational result

For the 5.107 failure class, the future path becomes:

```text
PR created/bound
-> E15 preflight catches invalid handoff before E9
-> PR body repaired
-> PR edit wakes reducer
-> E15 preflight GREEN
-> E9 attempt 1 GREEN
-> E11
-> E16
-> assistant fresh reread
-> expected-head merge
-> exact-byte promotion
-> user only performs + update and physical validation
```

For a retryable validation infrastructure failure:

```text
E9 attempt 1 RED_RETRYABLE
-> reducer wakes
-> E9 attempt 2 automatically
-> GREEN or terminal block
```

The canonical path must not require a human/operator workflow rerun.

## 16. Out of scope

E26 does not authorize:

- auto-merge;
- removal of assistant fresh reread;
- removal of E11 or E16;
- ordinary PR CI as release authority;
- automatic repair of candidate code;
- automatic mutation of release request source SHA;
- unbounded retries;
- new credentials;
- synthetic physical acceptance;
- Product/runtime feature changes.

## 17. Design conclusion

E26 should make the current E-system feel smaller without making it weaker.

The design does that by:

1. preventing known-invalid handoffs before E9 dispatch;
2. waking automatically when the handoff is repaired;
3. representing validation attempts explicitly and append-only;
4. permitting exactly one bounded retry only for retryable validation failures;
5. consolidating validation convergence into one pure decision helper;
6. preserving every existing release authority boundary.

Implementation authority remains **false** until this design is merged and a separate implementation checkpoint is recorded on #1895.
