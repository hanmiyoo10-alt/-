# Local Usage Dashboard E25 — Trusted PR Handoff Automation + Stage Failure Precision

Status: **DESIGN FROZEN / IMPLEMENTATION NOT STARTED**

Date: 2026-09-08

Canonical issue: #1884

Scope: `plugins/usage-dashboard/` release-control maintenance only.

This is a byte-neutral control-plane design. It does not consume a Product version and does not change Product, Engine, Manager, CLI, Models, runtime, plugin data semantics, accepted-baseline authority, merge authority, promotion authority, or physical-acceptance authority.

## 1. Fresh baseline

Design baseline read back before authoring:

```text
main: 9f1e7f0918fe73642eae3b64fc0f724db4094f41
production branch: release-usage-dashboard
production SHA: 77cf4524d230a907ab90c89ac7fd25e1f96a48f9
Product: 3.0.0-alpha.5.106
Engine: 1.6.40
Manager: 1.3.6
CLI: 1.10.0
Models: 1.280.0
contracts: 1/1
5.106 physical verification: PENDING at design freeze
```

The E25 design is based on real 5.106 release evidence, not on a synthetic failure scenario.

Shared-standard starting scorecard:

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
```

E25 is authorized specifically to improve Automation and Diagnosability while preserving every other line at least at the 5.106 baseline.

## 2. Real problems to solve

### 2.1 Automation seam

The durable E9 reducer currently reaches:

```text
UD_E9_CANDIDATE_READY:<candidate-sha>
UD_E9_PR_REQUIRED:<candidate-sha>
next: assistant ensures exactly one deterministic PR and updates pr_number on this request
```

The user remains hands-off, but the control plane still requires the authorized assistant to reconstruct two mechanical steps:

1. ensure/reuse the deterministic release PR;
2. bind the resulting `pr_number` into the same durable release request.

The current PR identity contract is already well-defined and must remain unchanged:

```text
base = main
head = stage/usage-dashboard-<release-version>
head repository = same repository
head SHA = exact current candidate SHA
PR body contains Usage-Dashboard-Release-Request: #<request>
exactly one PR per durable request
repair/restage reuses the same PR
```

The missing work is orchestration, not a missing identity model.

### 2.2 Diagnosability seam

The first 5.106 E7 attempt failed safely after E24/preflight and before candidate write.

The durable rejection was only:

```text
reason: E7_MATERIALIZE_OR_SMOKE_FAILED
```

while the materialize log showed the actionable class:

```text
5.106 endpoint normalizer marker missing:state:'invalid-endpoints'
```

The workflow currently has enough structural knowledge to distinguish major phases but does not project that distinction into the durable receipt.

The missing work is bounded failure attribution, not a new gate.

## 3. E25 design principle

E25 has two independent sub-slices under one release-control generation:

```text
E25-A = trusted deterministic PR handoff automation
E25-B = bounded E7 stage-failure projection
```

They share one rule:

> automation and observability may remove operator reconstruction, but they may not become new release truth or broaden credential exposure.

Implementation may land the sub-slices in separate commits or PRs if that gives clearer rollback and regression boundaries. E25 authority does not require them to be coupled in one code path.

## 4. E25-A — trusted deterministic PR handoff automation

### 4.1 Existing owner to extend

Prefer the existing trusted-main durable reconciler:

```text
.github/workflows/usage-dashboard-e9-release-reconcile.yml
```

Do not add a second reducer, queue, scheduler, durable state file, daemon, or token class.

The reconciler already:

- checks out trusted `main`;
- reads the durable request;
- verifies source identity;
- dispatches E7;
- observes deterministic candidate identity;
- validates recorded PR identity;
- dispatches authoritative exact-SHA validation;
- participates in the existing E11/E12/E13 handoff chain.

E25-A should fill the current `PR_REQUIRED` gap inside that owner rather than invent a new owner.

### 4.2 Pure deterministic helper

Add a small pure helper, working name:

```text
plugins/usage-dashboard/tools/release_pr_handoff_e25.cjs
```

The helper must not perform network or GitHub writes itself. It receives normalized request/candidate/PR facts and returns one bounded decision:

```text
REUSE_EXISTING
CREATE_ALLOWED
ASSISTANT_CREATE_REQUIRED
BLOCK_AMBIGUOUS
BLOCK_STALE
BLOCK_INVALID
```

Required input identity:

```text
request number
release version
candidate branch
candidate SHA
current request pr_number, if any
matching PR metadata discovered by trusted workflow
repository identity
```

The helper owns classification only. GitHub transport remains in the trusted-main workflow.

### 4.3 Unique PR discovery

When durable `pr_number` is absent, the trusted reconciler must enumerate only bounded plausible release PRs and mechanically classify them.

A reusable PR is valid only if all of these match:

```text
base.ref == main
head.repo.full_name == canonical repository
head.ref == deterministic candidate branch
body contains exact durable request marker
PR release identity is not for another request
```

Exact candidate-head handling:

- if one matching open PR has the current candidate SHA, reuse it;
- if one matching open PR is the same deterministic branch but a stale head, the current stage branch/PR refresh semantics apply and fresh validation is required;
- if more than one plausible PR exists, fail closed;
- if a closed-unmerged PR exists for the same durable request, do not silently create a replacement until policy explicitly classifies that state;
- a merged PR is terminal and cannot be rebound to an unmerged release request.

Do not select a PR from title similarity alone.

### 4.4 Durable `pr_number` binding

When exactly one valid PR is selected, E25-A may update the existing `pr_number` field on the same durable release request.

This update must use optimistic compare-and-reread semantics:

1. fetch the current durable request immediately before mutation;
2. parse it with the existing E9 request parser;
3. require the expected release version/source SHA/attempt identity and `pr_number == null`;
4. change only the `pr_number` field;
5. reread the request;
6. require the persisted value to equal the selected PR number;
7. let the ordinary reducer validation re-verify full PR identity before exact-SHA validation.

If the request changes concurrently, stop and reconcile again. Do not force-overwrite the body.

The durable request remains the single `pr_number` owner. Do not create a second persistent PR-binding database/comment authority.

### 4.5 Initial PR creation capability

The current repository has historical evidence that Actions-token initial PR creation once returned HTTP 403. Separately, trusted-main repository workflows have live-proven `pull-requests: write` for PR metadata mutation. Those are not equivalent proofs.

Therefore E25-A must not assume that current `GITHUB_TOKEN` may create PRs.

Implementation may add `pull-requests: write` to the trusted-main reconciler only if the code path remains trusted-main-only and never executes candidate/PR-head code with that authority.

Initial PR creation activation rule:

```text
no new PAT / GitHub App secret / token class
+ trusted-main code only
+ exact deterministic base/head/body contract
+ bounded live capability proof
= automatic initial PR creation may activate
```

If current repository policy denies creation:

```text
trusted create attempt receives the specific policy denial
-> classify E25_PR_CREATE_UNAVAILABLE
-> do not retry in a loop
-> emit the existing authorized assistant-create handoff
-> once the PR exists, automatically discover + bind pr_number
```

A platform-policy denial is not permission to bypass with a stronger credential.

If creation returns a race/validation error:

1. re-enumerate plausible PRs once;
2. if exactly one valid PR now exists, reuse it;
3. otherwise fail closed with a bounded reason.

### 4.6 Deterministic PR presentation

If trusted automatic creation is enabled, the PR presentation must use stable locators only.

Required body shape includes:

```text
Usage-Dashboard-Release-Request: #<request>
Candidate authority: current PR head
Source authority: durable release request source_sha
Frozen-main authority: candidate trailer + E11 receipt
Validation authority: E9 exact-SHA receipt
Merge authority: fresh E11 receipt + expected-head merge
```

Do not write creation-time candidate/source/frozen-main SHA literals into mutable prose as release authority.

### 4.7 Authority that remains outside E25-A

E25-A does not gain authority to:

- merge the PR automatically;
- declare ordinary PR CI authoritative;
- skip exact-SHA validation;
- rewrite source SHA;
- change frozen-main identity;
- publish candidate bytes;
- promote production;
- infer physical acceptance;
- close the durable request as accepted.

The existing expected-head merge boundary remains unchanged.

## 5. E25-B — bounded stage failure projection

### 5.1 Existing owner to extend

Keep the existing E7 stage workflow and its credential separation:

```text
uncredentialed/source-derived materialize_stage
-> only on success
-> credentialed write_candidate
```

Do not merge these jobs.

E25-B changes failure metadata only.

### 5.2 Stable phase + reason taxonomy

Before every major materialization phase, set a stable phase and reason fallback.

Initial required taxonomy:

```text
phase=source-intent     reason=E7_SOURCE_INTENT_APPLY_FAILED
phase=preflight         reason=E7_RELEASE_PREFLIGHT_REJECTED
phase=compile           reason=E7_MATERIALIZER_COMPILE_FAILED
phase=materializer      reason=E7_MATERIALIZER_EXEC_FAILED
phase=reconcile         reason=E7_RECONCILE_FAILED
phase=syntax            reason=E7_SYNTAX_CHECK_FAILED
phase=guidelines        reason=E7_GUIDELINE_SYNC_FAILED
phase=impact            reason=E18_RUNTIME_IMPACT_REJECTED
phase=smoke             reason=E7_BEHAVIOR_SMOKE_FAILED
phase=test-tree         reason=E7_TEST_TREE_MUTATED
phase=derived-verify    reason=E7_DERIVED_VERIFY_FAILED
phase=bundle            reason=E7_BUNDLE_BUILD_FAILED
```

Keep one broad terminal fallback for unexpected failures:

```text
phase=unknown
reason=E7_MATERIALIZE_OR_SMOKE_FAILED
```

The broad fallback is retained for safety and forward compatibility. It becomes rare, not deleted.

### 5.3 Output contract

`materialize_stage` should emit separate bounded outputs such as:

```text
failure_phase
failure_reason
failure_diagnostic_code
```

The final durable rejection should become:

```text
UD_STAGE_REJECTED
phase: <bounded phase>
reason: <bounded reason>
diagnostic: <optional bounded code>
transaction: <workflow run id>
```

If no safe diagnostic exists, omit the diagnostic line. Never substitute `unknown=0`, an inferred detail, or raw log text.

### 5.4 Diagnostic source policy

Diagnostics are convenience metadata only. They are never release authority.

Allowed durable diagnostic sources:

1. fixed workflow-owned codes;
2. structured reason codes emitted by trusted-main release-control tools;
3. a fixed allowlist mapping from known failure shapes to non-secret symbolic codes.

Forbidden durable diagnostic sources:

- arbitrary stdout/stderr forwarding;
- arbitrary release-specific materializer text;
- HTTP response body forwarding;
- environment dumps;
- tokens, credentials, cookies, auth/session material;
- raw org/account/private IDs;
- unbounded file paths or stack traces;
- user-controlled free-form text.

A source-controlled release materializer may influence the workflow conclusion but must not be allowed to inject arbitrary durable/public issue prose.

### 5.5 Optional materializer precision

For source-specific materializer failures, E25-B guarantees at least:

```text
phase=materializer
reason=E7_MATERIALIZER_EXEC_FAILED
```

A more specific diagnostic may be added only through a fixed trusted allowlist, for example:

```text
MATERIALIZER_TARGET_SELF_CHECK_FAILED
MATERIALIZER_BUILD_PARITY_FAILED
MATERIALIZER_SOURCE_PARITY_FAILED
```

Do not persist the original arbitrary message such as a full stack trace.

This is intentionally less verbose than the Actions log and more useful than the current broad terminal class.

### 5.6 Success observability

E25-B should keep success attribution bounded too.

The durable candidate-ready receipt may state stable completed phases or one compact success code, but must not duplicate the whole job log.

No new release authority is created by success diagnostics.

## 6. Security and credential boundary

E25 must preserve:

```text
candidate/source-derived code = no GitHub write credential during materialization
trusted-main reducer          = bounded metadata/control writes only
candidate writer              = existing stage-branch write authority only after materialization success
merge                         = existing expected-head authority
promotion                     = existing trusted monotonic exact-byte authority
physical acceptance           = real-device evidence only
```

PR automation must never justify checking out or executing PR-head code in a job with `pull-requests: write`.

Failure diagnostics must never justify exposing source logs into public/durable comments.

## 7. Determinism and retry rules

### PR handoff

Same authoritative request + same stage branch + same candidate identity must converge to the same PR identity.

Repair/restage:

```text
same durable request
same deterministic stage branch
same PR
new candidate head
fresh exact-SHA validation required
```

Never open a parallel PR merely because the candidate head advanced.

### Failure projection

Same failed phase must map to the same stable reason code independent of shell wording or log formatting.

Adding a new failure code is a contract change and requires regression coverage.

## 8. Required regression matrix

### E25-A tests

1. no `pr_number` + exactly one valid current PR -> `REUSE_EXISTING`;
2. no `pr_number` + no PR -> create path classified only when trusted creation mode is allowed;
3. platform PR-create policy denial -> bounded fallback, no loop, assistant handoff preserved;
4. duplicate plausible PRs -> fail closed;
5. wrong base -> fail closed;
6. wrong repository -> fail closed;
7. wrong durable-request marker -> fail closed;
8. stale candidate head -> no stale validation authority;
9. existing valid `pr_number` -> no rewrite;
10. concurrent durable-request body change -> CAS abort / reconcile again;
11. repair/restage -> same PR reused;
12. PR body contains stable authority locators and no mutable authority SHA copies;
13. reducer never executes candidate/PR-head code with write permission;
14. no new credential/token class;
15. no auto-merge authority added.

### E25-B tests

1. each major E7 phase maps to its stable reason code;
2. unknown/unclassified failures use the broad fallback;
3. materializer execution failure maps to `E7_MATERIALIZER_EXEC_FAILED`;
4. E24 preflight rejection remains distinguishable and fail closed;
5. E18 unknown/runtime impact rejection remains distinguishable;
6. behavior smoke failure is distinct from materializer failure;
7. test-tree mutation is distinct;
8. bundle/derived verification failures are distinct;
9. only allowlisted symbolic diagnostic codes reach durable receipt;
10. arbitrary stderr containing token-like text is never projected;
11. HTTP response body text is never projected;
12. raw org/private IDs are never projected;
13. transaction/run identity is present;
14. candidate writer remains skipped on materialization failure;
15. production remains unchanged on failure.

### Full regression

The complete existing Usage Dashboard regression registry remains required.

E25 implementation is not accepted by new unit tests alone.

## 9. Shared-standard preservation gates

Implementation must explicitly re-evaluate the eight axes before merge.

Required minimum post-implementation result:

```text
Stability / Safety              PASS
Automation                      >= current PARTIAL, demonstrably improved
Simplification                  PASS
Correctness / Authority         PASS
Diagnosability / Observability  PASS for the E7 bounded-failure slice
Determinism / Reproducibility   PASS
Recoverability / Retry Safety   PASS
Scalability / Efficiency        WATCH or better, never worse because of E25
User intervention boundary      PASS
```

Full Automation `PASS` may be claimed only if trusted initial PR creation is live-proven under the current repository policy. If platform policy still forbids it, report Automation honestly as improved `PARTIAL` and keep the safe assistant-create fallback.

## 10. Scalability is explicitly out of scope

E24 evidence collection measured roughly 37.6 seconds for 19 durable release requests in the 5.106 transaction.

E25 must not optimize that path.

Do not combine failure precision/PR automation with:

- E24 history indexing;
- accepted-baseline caches;
- persistent latest-accepted state;
- pagination redesign;
- release-history pruning.

That remains a separate WATCH item.

## 11. Cross-plugin primitive boundary

Repository-wide candidate:

```text
docs/PLUGIN_SHARED_PRIMITIVE_CANDIDATES.md
```

The reusable candidate is only:

```text
trusted phase -> bounded failure code -> sanitized optional diagnostic -> durable receipt
```

E25 must not generalize Usage Dashboard-specific:

- E-numbering;
- release request schema;
- candidate branch naming;
- E22/E23/E24 accepted-baseline model;
- exact-byte promotion model;
- physical acceptance rules.

Generalization waits for a second real consumer or a clearly shared repository responsibility.

## 12. Non-goals

E25 does not:

- consume Product 5.107 or any Product version;
- change Engine/Manager/CLI/Models/contracts;
- touch Credits/Gateway product behavior;
- change E22/E23/E24 truth selection;
- add a new accepted-baseline store/cache;
- add a scheduler/poller/DB;
- add a new release queue/reducer;
- add a new PAT/GitHub App secret/token;
- make ordinary PR CI release authority;
- auto-merge a release PR;
- weaken fresh-main or expected-head merge guards;
- rebuild artifacts during promotion;
- change monotonic exact-byte production promotion;
- infer physical acceptance from deployment;
- forward raw logs into durable comments;
- optimize E24 history enumeration.

## 13. Implementation sequence

When implementation is authorized, use this order:

```text
fresh main + production read-back
-> E25-A/E25-B exact implementation scope freeze
-> pure helper(s) + regressions
-> workflow wiring with minimum permissions
-> full Usage Dashboard regression
-> PR/CI
-> exact-head docs/control-plane merge
-> verify Product/runtime byte neutrality
-> exercise negative diagnostic canary
-> exercise PR discovery/binding canary
-> exercise trusted PR-create capability only if current policy permits
-> record shared-standard feedback
```

No PocketRisu `+` action is required for E25 because it is byte-neutral control-plane maintenance.

## 14. Acceptance

E25 design intent is complete only when implementation later proves all of the following:

1. durable E7 failure receipts identify bounded phase + stable reason;
2. arbitrary raw stderr/secrets cannot reach durable comments;
3. candidate writer still cannot run after materialization failure;
4. unique deterministic PR discovery is reducer-owned;
5. `pr_number` binding is reducer-owned with optimistic compare-and-reread protection;
6. duplicate/stale/ambiguous PR identity fails closed;
7. assistant manual `pr_number` editing is no longer required;
8. initial PR creation becomes trusted-automatic only if live capability is proven without a new credential;
9. if creation is platform-denied, the safe assistant-create fallback remains functional and bounded;
10. exact-SHA validation, merge guard, monotonic promotion, and physical truth boundaries are unchanged;
11. full regression is GREEN;
12. Product/Engine/Manager/runtime bytes remain unchanged;
13. shared-standard post-implementation feedback shows no regression outside the two target axes.

## 15. Frozen decision

E25 is intentionally a **precision and orchestration maintenance generation**, not a release-system rewrite.

Compact target:

```text
PR handoff:
assistant reconstructs PR + pr_number
-> trusted reducer discovers/reuses/binds automatically
-> trusted create only when platform capability is proven

stage failure:
broad E7 failure bucket
-> bounded phase + stable reason + safe optional diagnostic
```

Everything that already worked in 5.106 remains the baseline and is protected, not redesigned.
