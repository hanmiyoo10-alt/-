# Local Usage Dashboard — E9 Durable Release Transaction

Status: **COMPLETE — E9-A..E merged/regression-proven; E9-F real-release proof completed by 5.76**

Design authority: Issue `#356` — completed.
Implementation PR: `#357`.
Implementation merge: `67fe58d0e9cf358074814ef64f0bf1a70264e5f5`.
Real-release proof: Product `3.0.0-alpha.5.76`, durable request `#360`, release PR `#361`.
E8 retrospective: `docs/USAGE_DASHBOARD_E8_575_REAL_RELEASE_RETROSPECTIVE.md`.
E9 feedback / E10 input: Issue `#363`.

## Generation rule

```text
complete E(n)
→ real release evidence
→ feedback
→ E(n+1)
```

E9 inherited every still-valid E1–E8 safety guarantee and simplified orchestration around one durable transaction.

## E9 objective

```text
one durable release request
+ one exact source-readiness authority
+ one exact-SHA candidate validation authority
+ one deployment/closure convergence path
```

Events are wake-ups, never authority.

## Inherited guarantees — unchanged

E9 keeps:
- `release/usage-dashboard-*` source-of-intent branches;
- generated/runtime-output denial on source branches;
- controller-owned deterministic `stage/usage-dashboard-<version>` candidate refs;
- read-only candidate materialization and trusted writer only;
- CAS / fast-forward-only / postverify candidate writes;
- no force push and no connected-control candidate/production ref mutation;
- exact-SHA complete registered Usage Dashboard validation as merge authority;
- current PR head == validated SHA before expected-head squash merge;
- classifier + monotonic guard + exact-byte production promotion without rebuild;
- automatic deployment receipt;
- UNKNOWN/data/privacy/source-truth semantics;
- actual-device verification as a separate user boundary.

## E9-A — one durable release request

A normal E9 release uses one owner-authored issue:

```text
[usage-dashboard-release] 3.0.0-alpha.5.N
```

with strict fields. Under the later E15 handoff-hygiene baseline, the request also carries one canonical explicit classification line so the existing repository control plane can label the lane without manual repair:

```text
Plugin: usage-dashboard
release_version: 3.0.0-alpha.5.N
release_spec: .github/usage-dashboard/releases/5.N.json
source_branch: release/usage-dashboard-...
source_sha: <40-hex exact SHA>
feature_issue: #<number>
release_generation: E13
pr_number: PENDING
```

`Plugin: usage-dashboard` is classification metadata, not release authority. The durable transaction generation remains E13; E14/E15 are orthogonal candidate-DAG and handoff-hygiene baselines.

A source repair changes `source_sha` on the same issue. Attempt identity is `release_version + source_sha`; duplicate wake-ups converge on the same semantic attempt.

Public request states remain only:

```text
REQUESTED
CANDIDATE_READY
VALIDATED
DEPLOYED
```

`BLOCKED` is diagnostic state for the current exact source SHA only.

## E9-B — exact source-SHA readiness

Before candidate authority, the exact requested source SHA proves:

```text
SOURCE_SHA_READY:<source_sha>
```

The readiness gate performs cheap deterministic checks for source/release namespace, generated-output denial, monotonic policy, historical-literal hygiene, canonical A/M/D/R/T semantics, deleted-owner references and touched-part boundaries. Stage/materializer/full-registry checks remain defense in depth.

## E9-C — canonical source-change semantics

`source_change_semantics.cjs` owns A/M/D/R/T normalization and rename-side handling. Stage policy and readiness consume the same helper, closing the 5.75 deletion-semantics drift class.

## E9-D — one exact-SHA validation authority

The deterministic PR carries stable authority locators rather than creation-time moving SHA copies:

```text
Candidate authority: current PR head
Source authority: durable release request `source_sha`
Frozen-main authority: candidate trailer + E11 receipt
Validation authority: E9 exact-SHA receipt
Merge authority: fresh E11 receipt + expected-head merge

Usage-Dashboard-Release-Request: #<request-issue>
```

The request records `pr_number`; the reconciler binds PR base/repository/branch/head to the current candidate and dispatches the exact-SHA validator. The E15 handoff contract validates the locator-only PR body before authoritative full registered Usage Dashboard regression proceeds. No PR-body synchronization writer is needed after restage.

Full registered Usage Dashboard regression remains authoritative.

Merge invariant:

```text
VALIDATED_SHA == CURRENT_PR_HEAD_SHA == CURRENT_CANDIDATE_SHA
```

Normal E9 needs no `/usage-dashboard validate ...` command and no PR close/reopen activation choreography.

## E9-E — idempotent production closure

Promotion remains classifier → monotonic guard → exact-byte promoter. After expected-head merge, the reducer independently checks requested production version and main/release blob parity before recording `DEPLOYED` and closing the durable request. Physical verification stays separate.

## E9-F — real-release proof — COMPLETE

5.76 proved the E9 transaction with exact identities:

```text
Product: 3.0.0-alpha.5.76
Engine: 1.6.22
Manager: 1.3.0
Contracts: 1 / 1
source SHA: 5833a65a21c9ce5b7ae346a4e9523a5718a1cff7
durable request: #360
stage transaction: 32834367261 — GREEN
candidate SHA: 22da0cef846623d5d5d09150b87149238e198cac
release PR: #361
authoritative validation: 32834686344 — GREEN
TEST_REGISTRY_GREEN:85
main merge SHA: ab59b81e058b6aea48f15d2ecfc0e83ee9d6311a
production SHA: 8635e8265ad183b4355c6a1e727262e7dee1c099
exact-byte parity: VERIFIED
Engine SHA256: 85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69
```

The real release used one durable request, one candidate branch and one PR. No user GitHub action, stage/validate slash command, PR close/reopen choreography or connected candidate/production ref mutation was required. Issue #356 received `E9_F_RELEASE_PROOF` and closed completed.

## Observed E9 feedback

5.76 also exposed one safe convergence gap:

```text
merge wake
→ production still 5.75
→ DEPLOYMENT_PENDING
→ exact-byte promoter advances 5.76
→ no direct promotion-complete reducer wake
```

The 5-minute schedule would eventually recover, and a same-request no-op edit accelerated closure during the proof. This was **not a safety failure**: exact identities and production parity remained authoritative. It became E10 input #363/#365.

Before the durable request existed, static inspection also caught a smart-quote Python syntax typo in the 5.76 materializer. No candidate/main/production ref existed for that bad source. E10 moves that syntax class into exact source readiness.

## Normal E9 flow proven by 5.76

```text
assistant implements source/spec/tests/materializer
→ one durable request
→ SOURCE_SHA_READY
→ trusted stage
→ one deterministic candidate
→ assistant ensures/reuses one deterministic PR
→ exact-SHA full registry
→ assistant expected-head merge
→ exact-byte promoter
→ production parity
→ DEPLOYED closure
→ user called only for + / physical verification
```

If RED, repair remains source-only: update `source_sha` on the same request, reuse the same candidate branch and PR, and validate the new exact head.

## Event model and idempotency

```text
transient event != authority
durable request + exact SHA + receipt == authority
```

Schedules and events wake the reducer; they do not define release truth.

## Legacy compatibility

E7/E8 stage and validation command paths remain diagnostic/emergency compatibility surfaces. E9 reuses the proven E7 stage materializer/writer rather than rewriting candidate/ref mutation.

## E9 implementation regression evidence

Implementation final head:

```text
125c6f2f9572da86e6ad1ce29373856edf804289
Usage Dashboard Candidate Validation: 32826996735 — SUCCESS
SimCore CI: 32826996456 — Verify SUCCESS / Required SUCCESS
TEST_REGISTRY_GREEN:84
```

Main implementation merge:

```text
67fe58d0e9cf358074814ef64f0bf1a70264e5f5
```

The E9-A..E maintenance implementation changed no deployed product bytes. Production at that maintenance boundary remained 5.75 with exact main/release blob parity.

## Retained negative operational evidence

During initial E9 tool setup, `docs/E9_PLACEHOLDER` was accidentally created directly on main and immediately removed. It changed no product/runtime/release bytes. Issue #356 retains the lesson: content writes must never be used as branch-existence probes or setup checks.

## Current generation state

```text
E9-A..E: IMPLEMENTED / REGRESSION-PROVEN
E9-F: COMPLETE — 5.76 REAL-RELEASE PROOF
E9 feedback: COMPLETE — #363
E10 design authority: #365
```

5.76 PocketRisu physical verification remains a separate boundary in #359 and is never inferred from repository proof.

## Non-goals

E9 does not change product runtime behavior, Engine/Manager semantics, product data contracts, full-registry coverage, promotion bytes, merge protection or PocketRisu update UX. It adds no force push, connected ref mutation, broad automatic merge authority or inferred physical verification.

## Principle

> **Durable state over transient events; exact source readiness before candidate authority; one exact-SHA validation lane; exact bytes remain sacred.**
