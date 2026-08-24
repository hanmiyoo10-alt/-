# Local Usage Dashboard — E8 Early-Failure & Orchestration-Noise Hardening

Status: **IMPLEMENTED CANDIDATE — regression/merge evidence pending**

Recorded: `2026-08-25`

Design authority: Issue `#312`.
E7 design/history: Issue `#261` and `docs/USAGE_DASHBOARD_PR_LIFECYCLE_E7_CONFIG_FREE_ORCHESTRATION.md`.
Real-release evidence: Product `3.0.0-alpha.5.74`, Issue `#303`, PR `#306`.
E7 retrospective: `docs/USAGE_DASHBOARD_E7_574_REAL_RELEASE_RETROSPECTIVE.md`.

## Generation transition

E7-E real-release proof: COMPLETE via the 5.74 release.

E8 is now the latest cohesive release-system generation. The earlier E1–E7 documents remain historical evidence for how the inherited contracts were established; their old point-in-time status lines are not current operational authority.

The E-series rule is now explicit:

```text
complete E(n)
→ use a real release/operation as evidence
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

# 1. Inherited E7 guarantees — unchanged

E8 does not redesign the proven E7 core:

- source branches remain source-of-intent only;
- generated/runtime output remains denied on source branches;
- deterministic candidate branches remain `stage/usage-dashboard-<product-version>`;
- stage freezes exact trusted-main and source SHA authority;
- materialization runs without repository write credentials;
- candidate writer executes trusted control-plane code only;
- candidate writes remain exact digest/path/mode/parent checked, CAS guarded, fast-forward-only and postverified;
- ordinary repair reuses the same source branch, same `/usage-dashboard stage` command, same candidate branch and same PR;
- PR ensure remains connected-control-surface owned rather than Actions-token bootstrap;
- authoritative validation remains exact-SHA and full-registry;
- merge still requires `VALIDATED_SHA == CURRENT_PR_HEAD_SHA` and expected-head protection;
- production classifier + monotonic guard + exact-byte promotion remain unchanged;
- production is never rebuilt during promotion;
- UNKNOWN/data/privacy/cache/CLI/scheduler/runtime semantics are untouched by E8 maintenance;
- deployment receipt remains automatic after a real product promotion;
- repository evidence closure remains assistant-owned;
- physical verification remains user/device-owned and separate.

---

# 2. E8-A — Generation closure & evidence authority

5.74 supplied the real operational evidence E7-E required:

1. preflight failed closed before candidate mutation;
2. source repair reused the same stage command;
3. one deterministic candidate branch was created;
4. one deterministic PR was created through the connected GitHub control surface;
5. first exact-SHA full validation returned RED;
6. source-only repair reused the same source/stage/candidate/PR;
7. candidate history fast-forwarded with CAS/postverify;
8. exact-SHA full validation returned GREEN without close/reopen;
9. exact-head merge succeeded;
10. exact-byte monotonic promotion and deployment receipt succeeded.

Therefore E7 is a proven completed generation. E8 supersedes it as the current runbook without rewriting history.

---

# 3. E8-B — Pre-candidate release-memory gate

5.74 proved that materialization can be structurally valid while durable release memory is stale. The first candidate reached PR validation before `current-release-contract.cjs` caught the missing verified-baseline synchronization.

E8 moves that cheap contract into the shared reconciliation path that stage already executes before candidate tree/bundle creation.

Implemented order:

```text
source intent
→ E7-D release-generic historical-literal preflight
→ version materializer
→ generic two-pass reconciliation
   → build/check generated product + Engine
   → synchronize release memory / project guidelines
   → validate product identity + hashes
   → validate materialized release candidate
   → current-release-contract.cjs with exact UD_RELEASE_SPEC
→ focused behavior smoke
→ candidate tree + immutable bundle
→ trusted candidate writer
```

The shared reconciliation path exports the exact release spec through `UD_RELEASE_SPEC`, so the pre-candidate gate cannot silently validate a different release.

If this contract fails, reconciliation emits:

```text
RELEASE_MEMORY_CONTRACT_REJECTED
```

The candidate bundle/write step is not reached. The full authoritative registry still runs after PR creation; this is an earlier duplicate gate, not a replacement.

The outer legacy stage receipt may still group a reconciliation failure under its materialization failure class, while the exact E8 diagnostic marker is present in the read-only materialization log. A future generation may promote that marker into the outer receipt only if doing so remains a narrow, evidence-backed improvement.

---

# 4. E8-C — Continuous historical-literal hygiene

E7-D caught unannotated historical release assertions correctly, but 5.74 showed that waiting until release staging is unnecessarily late.

E8 registers `e8-early-failure-orchestration-contract.cjs` in the normal fail-closed Usage Dashboard registry. On every ordinary regression it runs the same `release_generic_preflight.cjs` inspection against the current release spec and requires zero findings.

Intentional historical test data remains legal only with the existing marker:

```text
UD_HISTORICAL_VERSION_LOCK
```

The contract also contains generated in-memory fixtures proving:

- an unannotated stale current-release assertion is rejected;
- the same intentional historical assertion is accepted when explicitly locked.

E7-D release staging remains defense in depth.

Conceptual failure identity:

```text
HISTORICAL_VERSION_LOCK_REQUIRED
```

The underlying scanner continues to report its existing actionable file/line/literal diagnostics.

---

# 5. E8-D — Deterministic candidate PR signal normalization

For ordinary non-stage PRs, `Usage Dashboard Candidate Validation` still runs the complete reusable validator.

For deterministic controller-owned heads matching:

```text
stage/usage-dashboard-*
```

the ordinary `pull_request` lane is explicitly non-authoritative. When GitHub executes that workflow it emits a small successful note job:

```text
CANDIDATE_PR_EVENT_NONAUTHORITATIVE:deterministic-stage-pr
Authoritative gate: owner-triggered exact-SHA full registry.
```

and does not duplicate the full registry in that ordinary event lane.

The authoritative gate remains the owner-triggered exact-SHA controller and the same reusable full registry. No close/reopen choreography is reintroduced.

GitHub may still suppress or classify some controller-authored PR events at the platform/event layer before workflow jobs execute. E8 does not attempt to manufacture trusted events to defeat that platform behavior. In those cases the deterministic PR status block and exact-SHA validation receipt remain the authority.

Conceptual status:

```text
CANDIDATE_PR_EVENT_NONAUTHORITATIVE
```

This is not merge permission by itself; exact-SHA GREEN is still mandatory.

---

# 6. E8-E — Connected control-surface ref mutation boundary

The 5.74 retrospective exposed an operator-side mistake where an unrelated transient branch was created through the wrong connected action. It did not affect release bytes, but E8 turns the lesson into an explicit boundary.

After `CANDIDATE_READY`, the connected assistant control surface may normally:

- search/create/reuse the deterministic PR;
- update the machine-owned PR status block;
- post evidence/comments;
- activate exact-SHA validation;
- re-read PR head and mergeability;
- merge with expected-head protection.

After `CANDIDATE_READY`, the connected assistant control surface **must not create or advance release Git refs**.

Specifically it must not:

- create/advance/rewrite `stage/usage-dashboard-*` refs;
- force-push candidate refs;
- mutate `release-usage-dashboard` directly.

Candidate ref mutation belongs only to the trusted stage writer. Production ref mutation belongs only to the trusted promoter.

Conceptual denial identity:

```text
CONNECTED_REF_MUTATION_DENIED
```

E8 does not add broader GitHub permissions to enforce this rule. The normal path already requires no connected ref mutation, so the boundary is locked by runbook + contract evidence while trusted writer/promoter ownership remains machine-enforced in workflows.

---

# 7. E8 normal flow

```text
assistant implements source/tests/spec/materializer
→ ordinary regression already proves historical-literal hygiene
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
→ same candidate branch advances fast-forward
→ same PR reused
→ exact-SHA full validation for the new head
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

# 8. E8 failure/status additions

E8 adds or clarifies these identities without renaming proven E7 failures:

- `RELEASE_MEMORY_CONTRACT_REJECTED` — materialized workspace violates durable/current release contract before candidate write;
- `HISTORICAL_VERSION_LOCK_REQUIRED` — conceptual continuous-regression identity for unannotated stale current-release assertions;
- `CANDIDATE_PR_EVENT_NONAUTHORITATIVE` — ordinary deterministic-stage PR event is not validation authority;
- `CONNECTED_REF_MUTATION_DENIED` — wrong authority surface attempted a release-ref mutation.

Existing source-policy, preflight, CAS, postverify, validation-identity and promotion failures remain fail-closed.

---

# 9. E8-F — next real-release proof

E8-A through E8-E are release-control maintenance only. They must not intentionally change `latest.js`, Engine, Manager, manifest tuple or production `release-usage-dashboard` bytes.

The next real Local Usage Dashboard product release is the E8-F proof and must demonstrate:

```text
continuous historical hygiene GREEN before release day
→ stage
→ materialize
→ pre-candidate release-memory gate
→ CANDIDATE_READY
→ deterministic PR ensure
→ exact-SHA full registry
→ ordinary repair reuses same source/stage/candidate/PR when needed
→ exact-head merge
→ exact-byte production promotion
→ deployment receipt
```

Acceptance requires:

- the 5.74 stale verified-baseline omission class cannot become a candidate SHA;
- unannotated historical current-release assertions fail normal regression;
- no Actions-token PR bootstrap;
- no close/reopen workaround;
- no replacement branch/PR for ordinary repair;
- connected control surface performs no candidate/production ref mutation;
- full exact-SHA registry remains mandatory;
- exact-byte production promotion remains unchanged.

Until that next real-release evidence exists:

```text
E8-A..E: implementation/regression authority
E8-F: real-release proof pending
```

---

# 10. Non-goals

E8 does not include:

- product runtime slimming;
- parser consolidation;
- timer/listener pruning;
- Request Ledger changes;
- generic materializer architecture rewrite;
- removal of exact-SHA validation;
- removal of full regression;
- force push;
- automatic merge redesign;
- broader write permissions;
- user GitHub settings/actions.

## Verdict

E8 keeps the proven E7 security and identity model, but moves one expensive-to-discover deterministic failure earlier, makes historical fixture hygiene continuous, clarifies candidate PR authority, and tightens the assistant/ref ownership boundary.

> **Move deterministic failures earlier, remove misleading coordination noise, and keep exact identity/byte guarantees intact.**
