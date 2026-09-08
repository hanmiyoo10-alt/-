# Local Usage Dashboard 5.106 — Shared Plugin System Feedback Re-evaluation

Date: 2026-09-08

Canonical policy: `docs/PLUGIN_SYSTEM_FEEDBACK_STANDARD.md`

Scope: re-evaluate the already-deployed Local Usage Dashboard 5.106 delivery transaction with the repository-wide eight-axis plugin-system feedback standard. This document does not replace or rewrite the original 5.106 live-release evidence. It changes only the evaluation frame.

This is documentation only. No Product, Engine, Manager, runtime, release spec, workflow, production branch, deployment authority, or physical-acceptance authority is changed.

## 1. Current evidence boundary

Fresh read-back at this re-evaluation checkpoint:

```text
main: 54bae05c669bae8671acb7fda5dfeb0c10b598da
production branch: release-usage-dashboard
production SHA: 77cf4524d230a907ab90c89ac7fd25e1f96a48f9
Product: 3.0.0-alpha.5.106
Engine: 1.6.40
Manager: 1.3.6
physical verification: PENDING
```

Deployment is therefore proven. Physical acceptance is not yet proven and must not be inferred.

Canonical 5.106 transaction identity:

```text
feature: #1874
design PR: #1875
final source SHA: e11e5a5c59e695d561420c07cd2dd58425a5ef1e
successful E7 transaction: 34182220278
candidate: a3576182f70de2a222bfe423ac1f689f71a7087d
durable release request: #1877
release PR: #1878
main release merge: c5d39f88227c2920638b99a95329c8669ed8e2cb
production: 77cf4524d230a907ab90c89ac7fd25e1f96a48f9
exact-byte parity: VERIFIED
```

## 2. Shared scorecard

```text
Stability / Safety              PASS
Automation                      PARTIAL
Simplification                  PASS
Correctness / Authority         PASS
Diagnosability / Observability  PARTIAL
Determinism / Reproducibility   PASS
Recoverability / Retry Safety   PASS
Scalability / Efficiency        WATCH
User intervention boundary      PASS
Cross-plugin portability        OPPORTUNITY
```

No axis is currently a `REGRESSION`.

## 3. Stability / Safety — PASS

**Evidence class: proven by real transaction.**

The first 5.106 E7 attempt used source SHA `ba1954a5cecbaed3c8272447ee01a67e30325b58`. Transaction `34181692223`, materialize job `101921934683`, successfully collected E24 evidence and passed generic release preflight, then failed on a release-specific materializer self-check:

```text
5.106 endpoint normalizer marker missing:state:'invalid-endpoints'
```

The failure occurred before the credentialed candidate writer path. No candidate was published from that failed attempt and production remained the accepted 5.105 baseline.

The successful transaction later passed the required gates before expected-head merge and monotonic exact-byte promotion.

The production receipt kept `physical_verification: PENDING`; CI and deployment did not manufacture physical acceptance.

Verdict: the failed source transaction cost time, not production integrity.

## 4. Automation — PARTIAL

**Evidence class: proven by real transaction.**

Automated in the 5.106 path:

- source intent is staged through the canonical E7 path;
- E24 release evidence is collected automatically;
- accepted-baseline authority is independently checked by generic preflight;
- deterministic materialization/build/reconcile runs automatically;
- candidate validation and exact-head full registry run automatically;
- merge can be guarded by the exact candidate head;
- main-to-production promotion and exact-byte verification are automatic;
- deployment receipts are generated without user command execution.

Remaining orchestration seam:

```text
UD_E9_PR_REQUIRED:<candidate>
next: assistant ensures exactly one deterministic PR and updates pr_number on this request
```

For the user this is already hands-off because the assistant performs the work. For the delivery system itself, deterministic PR ensure plus durable `pr_number` binding is not yet a fully reducer-owned transition.

Verdict: strong automation, but not fully closed at the control-plane level.

Do not automate this seam merely for aesthetic completeness if unique-PR and CAS guarantees would weaken.

## 5. Simplification — PASS

**Evidence class: proven by real transaction plus regression protection.**

The 5.106 slice reused existing owners instead of adding parallel machinery:

- existing selected Credits organization source;
- existing `/gateway-limits` local route and cache;
- existing auth owner;
- existing E7 stage path;
- existing E22/E23/E24 release-evidence chain;
- existing exact-byte promotion path.

Direct source intent remained exactly three files:

```text
.github/usage-dashboard/releases/5.106.json
plugins/usage-dashboard/tools/release_credits_endpoint_rpm_5106.py
plugins/usage-dashboard/tests/p72-credits-endpoint-rpm-limits.cjs
```

No new endpoint, timer, poller, scheduler, DB, persistent authority cache, Request Ledger owner, or physical-acceptance writer was added.

The E24 Authoring Closure also removed the need for the release-specific materializer to own accepted-baseline SHA/issue/comment literals as a second selector.

Verdict: the release added product capability without adding a new control-plane concept or authority owner.

## 6. Correctness / Authority Integrity — PASS

**Evidence class: proven by real transaction.**

The 5.106 transaction preserved authority boundaries:

- implementation began from a fresh 5.105 accepted baseline read-back;
- E24 transported complete release evidence but did not become a second truth selector;
- E22/E23-derived accepted-baseline identity was independently verified before materialization;
- release-specific tooling did not invent a different accepted baseline;
- exact candidate, main merge, and production identities are durable;
- exact-byte parity was verified;
- 5.106 deployment remains distinct from physical acceptance.

Product truth also stayed source-faithful: no synthetic RPM headroom/live usage was invented and unknown/not-applicable states were preserved by the frozen feature contract.

Verdict: current evidence shows correct authority selection and no guessed release truth.

## 7. Diagnosability / Observability — PARTIAL

**Evidence class: proven by real transaction.**

The first failed E7 attempt exposed the clearest remaining gap.

The durable stage output class was initialized as:

```text
E7_MATERIALIZE_OR_SMOKE_FAILED
```

while the first actionable cause was available only in the job log:

```text
5.106 endpoint normalizer marker missing:state:'invalid-endpoints'
```

The system therefore knows enough to fail safely but does not yet project a sufficiently precise bounded reason into the durable transaction receipt.

Desired direction, without leaking raw stderr or secrets:

```text
phase: materializer
reason: E7_MATERIALIZER_EXEC_FAILED
diagnostic: bounded trusted-tool token
```

Verdict: attribution exists, but operator-facing durable diagnosis is still coarser than the underlying trusted log.

## 8. Determinism / Reproducibility — PASS

**Evidence class: proven by real transaction.**

The path binds immutable identities:

- frozen trusted main/base;
- exact source SHA;
- bounded source file set;
- deterministic materialization;
- exact candidate SHA;
- exact-head validation;
- expected-head merge;
- exact-byte production parity.

After the source self-check repair, the canonical restage produced deterministic candidate:

```text
a3576182f70de2a222bfe423ac1f689f71a7087d
```

The final production artifacts matched the materialized release identities.

Verdict: the release can be reconstructed and attributed from repository evidence rather than ambient state.

## 9. Recoverability / Retry Safety — PASS

**Evidence class: proven by real transaction.**

The first attempt failed before writer credentials were used. The repair changed only the mismatched self-check marker expressions, creating final source SHA:

```text
e11e5a5c59e695d561420c07cd2dd58425a5ef1e
```

The same canonical stage path was then retried. No manual production cleanup, rollback surgery, candidate deletion, or authority rewrite was required.

The old production remained valid until the new release was fully merged and promoted.

Verdict: retry semantics are operationally safe and the failure left a clear recovery checkpoint.

## 10. Scalability / Efficiency — WATCH

**Evidence class: measured by real transaction.**

The first 5.106 materialize job collected the complete E24 evidence universe:

```text
E24_CAPTURE_COMPLETE:19
```

The live collector took roughly 37.6 seconds from start to completion for 19 durable release requests.

This is not currently a correctness or reliability defect. Completeness is more important than shaving seconds. It is a growth signal because the collector enumerates expanding release history.

Any future optimization should improve transport/computation only and must not introduce a persistent `latest accepted` cache or second authority store.

Verdict: no immediate change required, but keep measured latency/history growth under observation.

## 11. User intervention boundary — PASS

**Evidence class: proven by real transaction.**

The user was not asked to:

- edit source;
- run build/test commands;
- stage a release;
- create or update the release request;
- create the release PR;
- run CI;
- merge;
- deploy;
- repair the failed materializer attempt.

The only remaining user-owned step is the legitimately physical one: ordinary PocketRisu `+` update and real-device observation for 5.106.

This matches the repository-wide hard invariant.

## 12. Cross-plugin portability — OPPORTUNITY

This is descriptive, not a ninth score.

The best cross-plugin candidate exposed by 5.106 is **bounded failure-phase projection**, not wholesale copying of Usage Dashboard E-numbering or release topology.

Potential shared primitive:

```text
trusted stage phase
-> bounded machine-readable failure code
-> optional sanitized diagnostic token
-> durable receipt
```

Why it is a good candidate:

- the need is not inherently Usage Dashboard-specific;
- it can improve diagnosability without changing plugin truth authority;
- it can be adopted by another plugin without copying E22/E23/E24, branch names, versioning, or physical-acceptance rules.

A second possible reusable pattern is the separation of uncredentialed materialization from credentialed writer execution, but it should be generalized only after another real plugin demonstrates the same responsibility boundary.

Do not create a generic release framework merely because the mechanics look similar.

## 13. Evidence classification

### Proven by real transaction

- failed source assertion stopped before candidate write;
- production remained 5.105 during the failed attempt;
- E24/preflight ran before materializer execution;
- minimal repair and canonical restage succeeded;
- deterministic candidate identity was produced;
- exact-head validation and guarded merge succeeded;
- monotonic exact-byte promotion succeeded;
- deployment remained physical-PENDING;
- assistant-owned deterministic PR ensure seam was exercised;
- E24 19-release evidence collection cost was measured.

### Proven by regression test / CI

- P72 endpoint RPM semantics and data-minimization contract;
- E24 authoring/consumer contracts;
- full Usage Dashboard regression registry;
- source/build parity and syntax checks.

These tests reinforce the release evidence but do not substitute for the real transaction proof above.

### Historical evidence

- 5.105 accepted baseline and its physical receipt;
- earlier E22/E23/E24 design/implementation feedback;
- previous 5.106 live-release feedback document.

### Future hypothesis only

- `E25 Stage Failure Precision` as a working title;
- transport optimization for E24 history enumeration;
- cross-plugin shared bounded failure taxonomy.

None of these is frozen design authority merely because this feedback recommends it.

## 14. Priority after re-evaluation

Using the shared conflict order, no safety/correctness/recovery/determinism regression requires emergency work.

The highest-value next maintenance candidate remains:

```text
precise bounded stage-failure projection
```

because it improves Diagnosability from `PARTIAL` without weakening Stability, Correctness, Recoverability, or Determinism.

E24 history transport remains `WATCH`, below the diagnostic seam.

## 15. Final shared-standard verdict

The 5.106 delivery system is **safe, correct, reproducible, and retry-safe in real release traffic**. Its two material open seams are:

1. system-level PR orchestration remains partially assistant-owned rather than fully reducer-owned;
2. durable failure receipts are less precise than the trusted job logs.

The only measured growth pressure is E24 evidence transport latency.

Compact verdict:

```text
안정성        PASS
자동화        PARTIAL
단순화        PASS
정확성        PASS
진단성        PARTIAL
재현성        PASS
복구성        PASS
확장성        WATCH
사용자 개입   PASS
공통화        OPPORTUNITY
```
