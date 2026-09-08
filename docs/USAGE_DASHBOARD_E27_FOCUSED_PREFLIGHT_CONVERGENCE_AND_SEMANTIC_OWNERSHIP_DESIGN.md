# Local Usage Dashboard E27 — Focused Preflight Convergence + Semantic Ownership

Date: 2026-09-08 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Authority: #1908  
Design transaction: #1909  
Scope: `plugins/usage-dashboard/` release-control maintenance only

## 1. Fresh baseline

Design start repository state:

- canonical repository: `hanmiyoo10-alt/-`
- canonical integration branch: `main@ced5c412cbd08158f9f786bd2b650810d501b348`
- production branch: `release-usage-dashboard@05862999df0521c73b6890fbc561c01be3f9f36e`
- Product `3.0.0-alpha.5.108`
- Engine `1.6.42`
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- exact-byte deployment: VERIFIED
- 5.108 physical acceptance: PENDING at design freeze

E27 is byte-neutral release-control maintenance. It does not reserve Product 5.109, Engine 1.6.43, a new P-number, or any runtime/release schema version.

## 2. Trigger evidence from 5.108

The 5.108 retrospective proves that E26 fixed the 5.107 retry-convergence problem. Candidate-scoped attempts, bounded result classes, and `RED_LOGICAL` behavior worked correctly.

The remaining cost moved earlier in the pipeline.

Observed 5.108 source/candidate churn:

1. materializer targeted the wrong DevPass render owner;
2. P75 directly consumed `releaseEvidence` instead of the E21 canonical evidence view;
3. P75 over-constrained one JavaScript declaration syntax although runtime behavior was correct;
4. P75 asserted DevPass placement against the wrong source-part owner.

Three distinct E9 candidates ended `RED_LOGICAL` before the final candidate reached GREEN.

Those failures were useful and correctly blocked release, but they were deterministic authoring/source-shape failures that did not require E9 full-registry authority to discover.

## 3. E27 objective

Preserve every current release authority boundary while moving only the cheap deterministic focused checks left into the already-existing E7 materialization path.

Target flow:

```text
source intent
-> existing source-readiness / evidence checks
-> existing E7 transaction-local materialization + second-pass/idempotence
-> E27 non-authoritative focused preflight
     - declared focused regression
     - E21 evidence-consumer convergence guard
     - semantic/derived source-owner checks used by that focused regression
-> candidate publish
-> E25 deterministic PR discovery/binding
-> E15 handoff preflight
-> E9 exact-SHA full registry
-> E11 fresh no-drift proof
-> E16 merge authority capsule
-> assistant fresh reread
-> expected-head merge
-> monotonic exact-byte promotion
-> separate physical acceptance
```

E27 is an efficiency/convergence layer inside E7. It is not a new release gate and has no independent authority after E7 completes.

## 4. Authority graph remains unchanged

The canonical authority graph stays:

```text
E13 -> E14 -> E15 -> E9 -> E11 -> E16
-> assistant fresh reread
-> expected-head merge
-> monotonic exact-byte promotion
-> separate physical acceptance
```

Hard preservation rules:

- do not add E27 to durable `release_generation`;
- do not create a new merge or promotion authority;
- do not make E7 focused preflight equivalent to E9 GREEN;
- do not weaken E15;
- do not collapse E9/E11/E16 into ordinary CI;
- do not remove assistant fresh reread;
- do not remove expected-head merge;
- do not change exact-byte promotion;
- do not infer physical acceptance from deployment/CI;
- do not widen E26 retry count or retry classes.

## 5. Placement: inside existing E7, before candidate publication

The current E7 stage already:

- freezes exact source SHA and trusted main;
- collects transaction-local E24 evidence;
- materializes the candidate without write credentials;
- runs deterministic validation/smoke;
- only later hands exact materialized bytes to the trusted candidate writer.

E27 must reuse this exact read-only worktree.

The focused preflight executes **after the materializer has produced the derived tree and after materializer idempotence is proven, but before any candidate branch write is authorized**.

This placement gives E27 the exact tree that E9 would later see while keeping failures cheap and non-authoritative.

If focused preflight fails:

```text
E7 = RED
candidate branch = unchanged
PR = not created/advanced for this source
E9 = not dispatched
production = unchanged
```

The repair path is a new source SHA, not a same-candidate retry.

## 6. E27-A — Canonical focused-regression selection

Forward product release specs already declare a focused regression through the release-spec field conceptually represented by `newRegression`.

E27 must resolve the focused regression from the exact frozen release spec rather than from:

- conversation memory;
- inferred P-number sequencing;
- branch naming;
- newest test file heuristics;
- issue prose.

Requirements:

1. path must be repository-relative;
2. path must remain under `plugins/usage-dashboard/tests/`;
3. path must identify exactly one existing test file in the materialized tree;
4. path traversal / absolute paths / shell fragments fail closed;
5. the same exact path must be discoverable by the ordinary full registry later;
6. no E27-maintained duplicate list of P-tests.

E27 does not reserve a future P-number.

Maintenance transactions with no declared product-focused regression must not invent one. Their existing maintenance regression path remains authoritative.

## 7. E27-B — Reuse the E9 test environment, not a second test dialect

Focused preflight must execute the declared test using the same Node/runtime assumptions and canonical test executor primitives already used by the Usage Dashboard registry.

Do not create:

- a second assertion library;
- a second release-spec parser;
- a second test registry;
- a custom transpilation path;
- E27-only environment variables that make focused tests pass differently from E9.

Passing the focused test in E7 should mean only:

> this deterministic test passed on the materialized tree in the ordinary test environment.

It does not prove the other registry tests and therefore does not imply E9 GREEN.

## 8. E27-C — Shift the E21 evidence-consumer guard left

The 5.108 P75 direct `releaseEvidence` access was deterministic and should have been rejected before candidate publication.

E27 therefore runs the existing E21 consumer-convergence/static ownership guard against the materialized tree as part of focused preflight.

Rules:

- reuse the current E21 implementation and allowlists;
- do not fork E21 rules into an E27 copy;
- generic/current regressions must consume the canonical evidence view;
- historical frozen tests/materializers remain governed by existing bounded E21 historical exceptions;
- an E21 finding in focused preflight fails E7 before candidate publication;
- E9 still reruns the same E21 guard inside the full registry.

The same rule runs twice for different purposes:

- E7: cheap convergence optimization;
- E9: authoritative exact-SHA full-registry proof.

## 9. E27-D — Semantic ownership over remembered filenames

5.108 exposed two variants of the same authoring weakness:

- the materializer assumed a render owner from memory;
- P75 checked a placement invariant in a different source-part file than the real render owner.

E27 freezes the following test-authoring rule for newly declared focused regressions:

### Preferred assertion order

1. **assembled/runtime semantic output** when user-visible/runtime behavior is the authority;
2. **materializer-derived unique marker ownership** when source ownership itself matters;
3. exact source file path only when that filename/path is itself an explicit architecture contract.

A focused test must not use an exact source-part filename merely because it was remembered from a previous release when the actual invariant is placement/behavior.

### Derived owner resolution

When a test must prove ownership of a semantic marker in modular source parts, the helper should resolve ownership from the current materialized source graph:

```text
search bounded allowed source roots
-> require exactly one semantic owner
-> return owner path + marker identity
```

Zero matches => fail closed.  
Multiple matches => fail closed.  
The result is diagnostic/test evidence only, not runtime authority.

Do not introduce a manually maintained map such as:

```text
"DevPass account render" -> "54-dashboard-markup.part.js"
```

because that recreates the same stale ownership problem.

## 10. E27-E — Prefer semantic markers over syntax-shape assertions

The 5.108 regression also over-constrained one JavaScript declaration shape while the actual semantic call was correct.

New focused regression assertions should prefer stable semantic evidence such as:

- function/call presence;
- exact source truth field binding;
- route ownership;
- output schema/value behavior;
- unique assembled markup relationship;
- generated bundle/runtime behavior.

They should avoid exact incidental syntax such as:

- local variable name;
- `const` versus `let`;
- one whitespace/line shape;
- an arbitrary declaration form;
- exact helper-local spelling when not part of public/architecture contract.

E27 does **not** introduce a magical generic linter that claims to classify all brittle tests. The executable protection is that the focused test runs early; semantic-owner helpers are provided only for cases that need them.

## 11. E27-F — One bounded preflight decision

The E7-focused runner should resolve to one bounded result:

```text
GREEN
RED_SPEC
RED_FOCUSED_REGRESSION
RED_E21_CONSUMER
RED_OWNER_AMBIGUOUS
RED_OWNER_MISSING
RED_EXECUTION
```

Names may be normalized during implementation, but there must be no unbounded raw-log text as durable state.

A RED result is always deterministic source-authoring failure for that source SHA. It must not be classified as E26 `RED_RETRYABLE` because no E9 attempt has occurred.

Unknown/ambiguous result => fail closed.

## 12. Receipts and durable evidence

Do not add a second durable release state machine.

Preferred evidence shape:

- E7 existing failure projection gains bounded `focused-preflight` phase/reason when RED;
- existing candidate-ready receipt may include a compact statement that focused preflight was GREEN;
- no standalone E27 durable dispatch marker is required;
- no retry ledger is created for E27;
- no source receipt is rewritten after later success.

Allowed durable facts:

- source SHA;
- release version;
- declared focused regression path;
- bounded focused-preflight result/reason;
- E7 transaction ID.

Forbidden durable payloads:

- raw full logs;
- arbitrary stack traces;
- auth/session material;
- private account/org/project IDs;
- test fixture secrets;
- raw upstream API response bodies.

## 13. Source revision behavior

If focused preflight fails, the canonical repair is:

```text
source SHA A
-> E7 materialize
-> focused preflight RED
-> record bounded reason
-> repair source/test/materializer
-> source SHA B
-> fresh E7
```

Do not:

- publish candidate A anyway;
- dispatch E9 for A;
- retry E7 against unchanged A merely to seek a different logical result;
- rewrite A's RED receipt after B succeeds.

This keeps source revision history monotonic and auditable, matching the successful 5.108 source-revision practice while avoiding expensive candidate/E9 churn.

## 14. E26 retry semantics remain sealed

E27 changes nothing about post-candidate E26 validation convergence.

After candidate publication:

- attempt ID remains candidate/source transaction identity;
- each new candidate starts E9 validation attempt 1;
- `RED_LOGICAL` stops;
- only the existing narrow `RED_RETRYABLE` class may retry once;
- no attempt 3;
- E11/E16 are fresh after final GREEN.

E27 must not reinterpret a focused-preflight RED as an E9 attempt.

## 15. E25 PR creation seam remains unchanged

E27 does not attempt to solve the remaining E25 trusted initial PR-create seam.

If trusted Actions PR creation is still not live-proven:

```text
candidate ready
-> assistant creates exactly one deterministic PR
-> E25 discovers/binds pr_number
-> E15/E9 continue
```

No new PAT, GitHub App secret, credential class, or write authority is introduced merely to improve an automation score.

## 16. No new workflow or scheduler

Implementation must reuse the current E7 workflow.

Not allowed:

- `usage-dashboard-e27-*.yml` new workflow;
- second stage workflow;
- scheduled focused-preflight bot;
- queue/daemon;
- persistent worktree service;
- database/cache/state file;
- external CI service;
- new credential/token owner.

A small pure helper and focused regression tests are allowed if they reduce shell complexity.

## 17. Maximum expected implementation surface

Subject to mandatory fresh implementation-time readback, the intended upper bound is approximately:

```text
.github/workflows/usage-dashboard-stage-e7.yml
plugins/usage-dashboard/tools/<small-focused-preflight-helper>.cjs   # only if needed
plugins/usage-dashboard/tools/<existing E21 helper>                  # reuse/import, avoid semantic rewrite
plugins/usage-dashboard/tests/<E27 maintenance regression>.cjs
```

Possible bounded updates to an existing registry/executor helper are allowed only if needed to select and execute one declared focused test without duplicating registry ownership.

Do not broadly refactor E7/E9 in E27.

Forbidden implementation surface without a new design amendment:

```text
plugins/usage-dashboard/latest.js
plugins/usage-dashboard/src/**
plugins/usage-dashboard/runtime/**
scripts/bootstrap-usage-dashboard.sh
.github/usage-dashboard/releases/<future-product>.json solely for E27
release-usage-dashboard
new release-generation enum/value
new credential/secret
new persistent data owner
```

## 18. Required E27 regression matrix

Implementation must prove at minimum:

1. current E26 authority graph unchanged;
2. E27 is absent from durable `release_generation`;
3. no new workflow exists;
4. exact source SHA + trusted main are frozen before focused preflight;
5. materializer second pass/idempotence still runs before focused preflight result is trusted;
6. declared focused regression is selected from release spec, not P-number inference;
7. path outside `plugins/usage-dashboard/tests/` fails closed;
8. missing declared focused regression file fails closed;
9. focused regression GREEN permits candidate writer path to continue;
10. focused regression RED blocks candidate publication;
11. E21 direct release-evidence consumer violation is caught before candidate publication;
12. E21 rule implementation is reused, not copied;
13. unique semantic owner resolution succeeds for one owner;
14. zero semantic owners fails closed;
15. multiple semantic owners fails closed;
16. no fixed conversational filename map is introduced;
17. semantic behavior assertion is accepted without requiring one incidental declaration syntax;
18. focused-preflight RED does not create an E9 validation attempt receipt;
19. source revision after RED starts a fresh E7 transaction;
20. old RED remains immutable after newer source GREEN;
21. candidate publication still precedes E25 PR binding and E15;
22. E15 behavior unchanged;
23. E9 still runs the full discovered Usage Dashboard registry for exact candidate SHA;
24. E9 GREEN remains required regardless of focused-preflight GREEN;
25. E26 `RED_LOGICAL` / `RED_RETRYABLE` / max-two-attempt behavior unchanged;
26. E11 `MERGE_READY_NO_DRIFT` unchanged;
27. E16 capsule unchanged;
28. assistant fresh reread + expected-head merge unchanged;
29. exact-byte promotion and monotonic release branch unchanged;
30. physical acceptance remains real-device-only;
31. no Product/Plugin/Engine/Manager/bootstrap/runtime byte change from E27 maintenance;
32. full discovered Usage Dashboard regression registry GREEN.

Do not freeze a total registry test count integer.

## 19. Live proof expectations

E27 acceptance can be split honestly:

### Regression-proven

- focused regression selection;
- E21 shift-left behavior;
- candidate writer blocking;
- semantic owner ambiguity handling;
- authority preservation;
- byte-neutrality.

### Live forward-release proof

The next legitimate Product release should prove that:

- its declared Pxx runs in E7 before candidate publication;
- a valid focused preflight reaches candidate publication without extra user action;
- if a real deterministic focused defect occurs, it is rejected before E9;
- final E9 still independently proves the full registry.

Do not manufacture a fake production release or intentionally broken source merely to claim live proof.

## 20. Success metrics

E27 target scorecard:

| Dimension | Target |
| --- | --- |
| Safety / authority | PASS |
| E26 retry semantics preservation | PASS |
| Candidate churn reduction | PASS |
| E9 full-registry preservation | PASS |
| Focused-test convergence | PASS |
| E21 shift-left convergence | PASS |
| Semantic ownership robustness | PASS |
| Simplicity | PASS |
| New workflow count | 0 |
| New credential count | 0 |
| Product/runtime byte impact | 0 |
| User intervention boundary | PASS |
| Full autonomous initial PR creation | remains E25 PARTIAL unless separately live-proven |

## 21. Non-goals

E27 does not:

- design Product 5.109;
- choose the next user-facing feature;
- reserve a P-number;
- widen E26 retry classes;
- add retry attempts;
- solve E25 trusted PR creation;
- auto-merge;
- auto-accept physical validation;
- replace E9 with a focused test;
- run the complete registry twice;
- rewrite historical P-tests repository-wide;
- create a source ownership database;
- make filenames invisible when filename identity is itself the contract.

## 22. Frozen verdict

**KEEP E26 SEALED. MOVE CHEAP DETERMINISTIC FOCUSED CONVERGENCE LEFT INTO E7. ADD NO NEW RELEASE GATE.**

E27's job is to make the final authority path quieter, not weaker.

The user contract remains unchanged:

```text
ChatGPT handles source/design/implementation/tests/PR/merge/deploy
-> user presses +
-> user provides actual-device evidence
```
