# Local Usage Dashboard — E8 Early-Failure & Orchestration-Noise Hardening

Status: **IMPLEMENTED — E8-A..E regression-proven; E8-F real-release proof pending**

Recorded: `2026-08-25`

Design authority: Issue `#312`.
E7 history: Issue `#261` and `docs/USAGE_DASHBOARD_PR_LIFECYCLE_E7_CONFIG_FREE_ORCHESTRATION.md`.
5.74 real-release evidence: Issue `#303`, PR `#306`, production `3.0.0-alpha.5.74`.
E7 retrospective: `docs/USAGE_DASHBOARD_E7_574_REAL_RELEASE_RETROSPECTIVE.md`.

## Generation transition

E7-E real-release proof: COMPLETE via the 5.74 release.

E8 is the latest cohesive release-system generation. E1–E7 remain historical evidence, not separate runbook fragments an operator must mentally compose.

The E-series generation rule is explicit:

```text
complete E(n)
→ real update / operation
→ retrospective / feedback
→ design and implement E(n+1)
```

There is no normal `E7.1`, `E8.1`, or same-generation hardening suffix after a completed feedback pass. Feedback advances exactly one integer generation.

Operationally:

```text
E(n+1)
=
all still-valid proven E(n) contracts
+
only newly evidenced hardening/removals
```

The user remains responsible only for PocketRisu `+` and actual-device verification when requested. Development, tests, PR, merge, deployment, receipts and repository evidence closure remain assistant-owned.

---

## 1. Inherited E7 guarantees — unchanged

E8 preserves the proven E7 core:

- source branches remain source-of-intent only;
- generated/runtime output remains denied on source branches;
- deterministic candidate branches remain `stage/usage-dashboard-<product-version>`;
- stage freezes exact trusted-main and exact source SHA authority;
- materialization receives no repository write credentials;
- candidate writer executes trusted control-plane code only;
- candidate writes remain exact digest/path/mode/parent checked, CAS guarded, fast-forward-only and postverified;
- ordinary repair reuses the same source branch, same `/usage-dashboard stage` command, same candidate branch and same PR;
- deterministic PR ensure remains connected-control-surface owned, not Actions-token bootstrap;
- authoritative validation remains exact-SHA and the complete registered Usage Dashboard regression;
- merge still requires current PR head == validated SHA plus expected-head protection;
- classifier + monotonic guard + exact-byte production promotion remain unchanged;
- production is never rebuilt during promotion;
- UNKNOWN/data/privacy/cache/CLI/scheduler/runtime semantics are unchanged;
- deployment receipt remains automatic for real product promotion;
- repository evidence closure is assistant-owned;
- physical verification is user/device-owned and separate.

---

## 2. E8-A — Generation Closure & Evidence Authority

5.74 completed E7-E operational proof:

1. preflight failed closed before candidate mutation;
2. source repair reused the same stage command;
3. one deterministic candidate branch was created;
4. PR #306 was created through the connected GitHub control surface rather than Actions-token bootstrap;
5. first exact-SHA validation returned RED;
6. source-only repair reused the same source/stage/candidate/PR;
7. the candidate branch advanced fast-forward with CAS/postverify;
8. exact-SHA full validation returned GREEN without close/reopen;
9. exact-head merge succeeded;
10. exact-byte monotonic promotion and deployment receipt succeeded.

Therefore E7 is PROVEN / COMPLETE and E8 is the current generation authority.

---

## 3. E8-B — Pre-Candidate Release-Memory Gate

5.74 showed that structural materialization could be valid while durable release memory remained stale. E8 moves the existing `current-release-contract.cjs` into the shared read-only reconciliation path before candidate tree/bundle/write.

Current order:

```text
source intent
→ release-generic historical-literal preflight
→ version materializer
→ generic two-pass reconciliation
   → generated product / Engine build+parity
   → project/release-memory synchronization
   → product identity/hash validation
   → materialized release validation
   → current-release-contract.cjs with exact UD_RELEASE_SPEC
→ focused behavior smoke
→ candidate tree + immutable bundle
→ trusted candidate writer
```

The reconciliation path exports the exact release spec through `UD_RELEASE_SPEC`. A failure emits:

```text
RELEASE_MEMORY_CONTRACT_REJECTED
```

and candidate write is never reached. The full post-PR registry remains mandatory; this is an earlier duplicate gate, not a smaller replacement suite.

The outer E7-stage receipt may still group such a failure under the broader materialization failure class while the exact E8 marker appears in the read-only materialization log. That receipt-detail refinement is not required for E8 safety.

---

## 4. E8-C — Continuous Historical-Literal Hygiene

E7-D correctly caught unannotated historical release assertions at stage time. E8 also runs the same narrow inspection during ordinary registered regression through `e8-early-failure-orchestration-contract.cjs`.

Intentional historical fixtures remain allowed only with:

```text
UD_HISTORICAL_VERSION_LOCK
```

The E8 contract proves both sides with in-memory fixtures:

- unannotated stale current-release assertion → rejected;
- explicitly historical locked assertion → accepted.

E7-D staging preflight remains defense in depth.

Conceptual failure identity:

```text
HISTORICAL_VERSION_LOCK_REQUIRED
```

---

## 5. E8-D — Deterministic Candidate PR Signal Normalization

Ordinary non-stage Usage Dashboard PRs still run the complete reusable validator.

For deterministic controller-owned heads matching `stage/usage-dashboard-*`, the ordinary `pull_request` lane is non-authoritative. When GitHub executes the workflow it emits a small successful note:

```text
CANDIDATE_PR_EVENT_NONAUTHORITATIVE:deterministic-stage-pr
Authoritative gate: owner-triggered exact-SHA full registry.
```

The exact-SHA controller still invokes the same complete reusable registry. Close/reopen choreography is not reintroduced.

GitHub may still suppress some controller-authored PR events at the platform layer before a job starts. E8 does not manufacture trust events to bypass that platform behavior. The deterministic PR status block and exact-SHA receipt remain authority.

`CANDIDATE_PR_EVENT_NONAUTHORITATIVE` is informational only; it never authorizes merge. Exact-SHA GREEN remains mandatory.

---

## 6. E8-E — Connected Control-Surface Ref Mutation Boundary

After `CANDIDATE_READY`, the connected assistant control surface may normally:

- search/create/reuse the deterministic PR;
- update machine-owned PR status text;
- post evidence/comments;
- activate exact-SHA validation;
- re-read PR head and mergeability;
- merge using expected-head protection.

It **must not create or advance release Git refs** after `CANDIDATE_READY`.

Specifically it must not:

- create/advance/rewrite `stage/usage-dashboard-*`;
- force-push candidate refs;
- mutate `release-usage-dashboard` directly.

Candidate refs belong to the trusted stage writer. Production refs belong to the trusted promoter.

Conceptual denial identity:

```text
CONNECTED_REF_MUTATION_DENIED
```

E8 does not broaden GitHub permissions to implement this rule. The normal release path already requires no connected-control-surface ref mutation; runbook and contract evidence lock the operator boundary while workflow permissions preserve machine ownership.

---

## 7. Current E8 normal flow

```text
assistant implements source/tests/spec/materializer
→ ordinary regression proves historical-literal hygiene
→ /usage-dashboard stage <source-branch>
→ release-generic preflight
→ trusted read-only materialization/reconciliation
→ pre-candidate release-memory gate
→ focused behavior smoke
→ constrained candidate CAS write
→ CANDIDATE_READY
→ assistant ensures exactly one deterministic PR
→ assistant activates full exact-SHA validator
```

If RED:

```text
fix source only
→ same stage command
→ same candidate branch fast-forwards
→ same PR reused
→ full exact-SHA validation on the new head
```

If GREEN:

```text
re-read PR head
→ require current PR head == validated SHA
→ re-read mergeability
→ expected-head squash merge
→ classifier + monotonic guard
→ exact-byte promotion
→ automatic deployment receipt
→ assistant repository evidence closure
→ user PocketRisu + / physical verification only when product bytes changed
```

---

## 8. E8 failure/status additions

E8 adds or clarifies these identities without renaming proven E7 failures:

- `RELEASE_MEMORY_CONTRACT_REJECTED`
- `HISTORICAL_VERSION_LOCK_REQUIRED`
- `CANDIDATE_PR_EVENT_NONAUTHORITATIVE`
- `CONNECTED_REF_MUTATION_DENIED`

Existing source-policy, preflight, materialization, CAS, postverify, validation-identity and promotion failures remain fail-closed.

---

## 9. Implementation / regression evidence

Implementation PR: `#314`.

Pre-closure validated branch head:

```text
fde3c8dce0e7efce81e0d6844f8c05fbba684dad
```

Usage Dashboard Candidate Validation:

```text
run: 32777437539
result: SUCCESS
RELEASE_MEMORY_CONTRACT_GREEN:.github/usage-dashboard/releases/5.74.json
RELEASE_MEMORY_CONTRACT_GREEN:.github/usage-dashboard/releases/5.74.json
usage-dashboard E8 early-failure/orchestration contract: OK
TEST_REGISTRY_GREEN:82
validated 3.0.0-alpha.5.74 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1
```

The two release-memory GREEN markers prove both reconciliation passes validate the exact current release contract before candidate writing. The E8 contract is part of the fail-closed registry, not an external ad-hoc check.

The validation also retained Engine SHA-256:

```text
85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69
```

The implementation branch intentionally changes release-control/test/docs only; no `latest.js`, Engine, Manager, manifest tuple, product release spec or product runtime source is part of the E8 implementation diff.

Parallel main movement during implementation was SimCore-only and was merged into the E8 maintenance branch without overlapping Usage Dashboard files. Two rejected low-level Git-object attempts (invalid remembered blob SHA; stale remembered parent SHA) caused no ref mutation; exact current identities were re-read before the successful fast-forward integration. The detailed negative evidence is retained on Issue #312.

This document-status update changes the PR head after the pre-closure validation, so the final PR head must pass the complete registry again before merge.

---

## 10. E8-F — Next Real Release Proof

E8-A through E8-E are maintenance-only. E8-F remains pending until the next real Local Usage Dashboard product release.

That release must prove:

```text
continuous historical hygiene GREEN before release day
→ stage
→ materialize
→ pre-candidate release-memory gate
→ CANDIDATE_READY
→ deterministic PR ensure
→ exact-SHA full registry
→ if repair is required: same source/stage/candidate/PR
→ exact-head merge
→ exact-byte production promotion
→ deployment receipt
```

Acceptance requires:

- the 5.74 stale verified-baseline omission class cannot become a candidate SHA;
- historical fixture debt is caught in ordinary regression;
- no Actions-token PR bootstrap;
- no close/reopen workaround;
- no replacement branch/PR for ordinary repair;
- connected control surface performs no candidate/production ref mutation;
- full exact-SHA registry remains mandatory;
- exact-byte production promotion remains unchanged.

Until then:

```text
E8-A..E: IMPLEMENTED / REGRESSION-PROVEN
E8-F: REAL-RELEASE PROOF PENDING
```

---

## 11. Non-goals

E8 does not include product runtime slimming, parser consolidation, timer/listener pruning, Request Ledger changes, a generic materializer rewrite, removal of exact-SHA validation, removal of full regression, force push, automatic merge redesign, broader write permissions, or user GitHub settings/actions.

## Verdict

E8 keeps E7's proven identity/security model while moving deterministic failures earlier, making historical fixture hygiene continuous, clarifying candidate PR authority, and tightening release-ref ownership.

> **Move deterministic failures earlier, remove misleading coordination noise, and keep exact identity/byte guarantees intact.**
