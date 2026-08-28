# Local Usage Dashboard — E15 Release-Handoff Hygiene Automation Design

Status: **DESIGN READY — MAINTENANCE-ONLY / IMPLEMENTATION NOT STARTED**

Tracking issue: #738  
Evidence: #727, #710, #632  
Scope: `plugins/usage-dashboard/` release-control lifecycle and its existing repository classification handoff

## 1. Design goal

E15 must make the existing Local Usage Dashboard release system **simpler to operate, harder to misclassify, and less dependent on mutable presentation**, without adding a new release engine.

The proven control chain remains authoritative:

```text
E13 durable transaction + authority-free wakes
-> E14 ancestry-aware deterministic candidate DAG
-> E9 exact-SHA validation
-> E11 frozen-main/DAG merge readiness
-> assistant fresh expected-head merge
-> monotonic exact-byte promotion
-> production parity
-> durable closure
```

E15 adds no new state between those stages.

## 2. Governance

E15 is deliberately a separate axis from the existing generation names.

- Durable transaction/wake generation: **E13**.
- Candidate DAG ancestry baseline: **E14**.
- Merge-readiness classifier: **E11**.
- E15 role: **release-handoff hygiene / first-write automation baseline**.

`release_generation` therefore remains `E13`. E15 must not be added to `DURABLE_TRANSACTION_GENERATION_RE` merely for naming symmetry.

## 3. Fresh baseline

At design time:

- Product: `3.0.0-alpha.5.84`.
- Engine: `1.6.25`.
- Manager: `1.3.0`.
- contracts: `1 / 1`.
- production branch: `release-usage-dashboard`.
- production SHA: `73cc537d6d5efe31177ed17906c87e5216d60afb`.
- current main observed at design start: `6297463049f3c942dad3b5d1951abda1290d1ffa`.

The shared repository issue classifier already supports explicit body identity through `Plugin: <value>` or `### Plugin`; no classifier rewrite is required.

The current PR bootstrap contract already says PR prose is a locator, not a mutable release-state database. E15 turns that documented rule into an executable release contract.

## 4. Live evidence motivating E15

### 4.1 Classification false start

5.84 request #724 initially received `scope:unclassified`. The Usage Dashboard reconciler intentionally searches only open requests already labeled `plugin:usage-dashboard`, so the request did not enter the normal lane until the label was corrected.

The fail-closed behavior was correct. The avoidable part was that the request itself did not contain the exact explicit metadata that the existing repository classifier already understands.

### 4.2 Stale mutable SHA prose

Release PRs for 5.82, 5.83 and 5.84 copied creation-time candidate/frozen-main SHA values into human-facing PR prose. Restaging correctly changed the authoritative PR head/candidate, but the prose remained stale.

Correctness was never affected because authority lived in:

- durable request `source_sha`;
- current PR head;
- candidate Git DAG/trailer;
- E9 validation receipt;
- E11 merge receipt;
- exact-byte promotion receipt.

Three consecutive releases prove that synchronizing mutable prose is the wrong abstraction. The simpler solution is to stop storing mutable facts in the prose.

## 5. E15 architecture

E15 follows a **first-write correctness** rule:

> Write stable metadata once, then let existing automation and authoritative receipts evolve independently.

There are only two behavioral changes.

### A. Canonical request identity line

Every new Usage Dashboard durable release request contains exactly:

```text
Plugin: usage-dashboard
```

This line is classification metadata, not release authority.

Effects:

1. the existing repository control plane automatically applies `plugin:usage-dashboard`;
2. the existing E9 reconciler can discover the request through its existing label query;
3. no manual relabel recovery is required on the normal path;
4. no unlabeled-issue scanning or ownership inference is added.

E9 parsing must fail closed if this declaration is missing, duplicated, or conflicts with `usage-dashboard`.

### B. Locator-only deterministic PR body

The deterministic PR body never contains creation-time candidate/source/frozen-main SHA values.

Canonical shape:

```text
## Local Usage Dashboard <version>

<bounded release summary>

- Product: `<product version>`
- Engine: `<engine version>`
- Manager: `<manager version>`
- contracts: `<snapshot>/<recent-request>`

Candidate authority: current PR head
Source authority: durable release request `source_sha`
Frozen-main authority: candidate trailer + E11 receipt
Validation authority: E9 exact-SHA receipt
Merge authority: fresh E11 receipt + expected-head merge

Usage-Dashboard-Release-Request: #<request>
```

That body remains correct when:

- candidate C0 becomes C1;
- frozen main M0 becomes M1;
- exact-SHA validation is repeated;
- unrelated main drift appears;
- the same deterministic PR is reused.

Therefore E15 adds **zero PR-body synchronization operations**.

## 6. Proposed implementation boundary

Prefer one tiny pure helper:

`plugins/usage-dashboard/tools/release_handoff_e15.cjs`

It may expose pure functions equivalent to:

```text
validateRequestPluginDeclaration(body)
renderStablePrBody(input)
validateStablePrBody(body, requestNumber)
```

The helper must have:

- no network calls;
- no GitHub API calls;
- no filesystem mutation outside ordinary test fixtures;
- no branch/ref mutation;
- no issue/PR write capability;
- no timer, polling or retry loop;
- no production authority.

If extending `release_request_e9.cjs` instead is materially smaller, that is acceptable, but E15 semantics should remain visibly separated in tests and documentation.

## 7. E9 integration

The E9 reducer already verifies deterministic PR identity before authoritative validation. E15 extends only that read-only check.

Existing checks remain mandatory:

- PR base is `main`;
- head repository is `hanmiyoo10-alt/-`;
- head branch is `stage/usage-dashboard-<release>`;
- PR head SHA equals current candidate SHA;
- body contains `Usage-Dashboard-Release-Request: #<request>`.

E15 adds:

- body contains all stable authority locator lines;
- body does not advertise mutable candidate/source/frozen-main SHA copies as current facts.

No body rewrite is performed by the reducer.

## 8. Automation flow

```text
assistant creates request
  containing Plugin: usage-dashboard
        |
        v
existing repository issue classifier
  automatically applies plugin:usage-dashboard
        |
        v
existing E9 reducer discovers request
        |
        v
E13/E14 stage + candidate flow unchanged
        |
        v
assistant ensures deterministic PR once
  using locator-only body
        |
        v
E9 validates PR identity + body contract
        |
        v
exact-SHA validation / E11 / expected-head merge
        |
        v
exact-byte promotion / parity / closure
```

The user remains outside GitHub release mechanics.

## 9. Why this is simpler than alternative automation

Rejected alternatives:

### Auto-refresh PR prose after every restage

Rejected because it creates a new synchronization writer for data that is not authoritative.

### Make E9 scan all unlabeled release-like issues

Rejected because it broadens lane discovery and weakens fail-closed ownership classification.

### Resolve plugin identity by fetching the linked feature issue

Rejected because it adds another API dependency and cross-issue inference path when the request can carry one explicit stable line itself.

### Add E15 as a new durable transaction generation

Rejected because no new reducer/wake/state transition exists.

### Auto-merge after E11

Rejected because assistant fresh expected-head merge remains an intentional authority boundary.

## 10. Failure behavior

E15 must fail closed for:

1. missing `Plugin: usage-dashboard`;
2. duplicate or conflicting explicit Plugin declarations;
3. missing durable request marker in PR body;
4. missing stable authority locators;
5. mutable candidate/source/frozen-main SHA prose presented as current state;
6. existing PR base/head/repository/head-SHA mismatch;
7. stale E9 validation;
8. stale E11 merge receipt.

A classification failure must not trigger ownership guessing.

## 11. Regression plan

Add a focused E15 contract test, proposed:

`plugins/usage-dashboard/tests/e15-release-handoff-hygiene-contract.cjs`

It must prove:

1. `Plugin: usage-dashboard` is recognized by the existing shared issue classifier as `plugin:usage-dashboard`;
2. missing plugin declaration fails E9/E15 request validation;
3. conflicting plugin declaration fails closed;
4. current `release_generation: E13` remains accepted;
5. `release_generation: E15` remains rejected;
6. E14 governance regression remains GREEN;
7. canonical locator-only PR body passes;
8. a creation-time candidate/frozen-main SHA body fails E15 body validation;
9. the exact same canonical PR body remains valid for C0 and later C1 heads;
10. the exact same body remains valid when main advances M0 -> M1;
11. current PR head SHA, not body prose, remains candidate authority;
12. no workflow gains a PR-body update loop;
13. no new reducer/state/queue/poller/schedule/token class appears;
14. no Product/Plugin/Engine/Manager/bootstrap production bytes change;
15. full Usage Dashboard registry remains GREEN.

Where practical, reuse existing E9/E13/E14 fixtures rather than create a second synthetic release machine.

## 12. Runtime audit impact

E15 adds no runtime Plugin or Engine path, so the runtime audit expectation is intentionally boring:

- memory growth: none introduced;
- listeners/timers: none introduced;
- event-loop work: no runtime change;
- async race surface: no runtime change;
- resource lifecycle: no runtime change;
- network/API calls: no new release-control API loop.

Any implementation that adds polling, repeated PR-body writes, or linked-issue lookup should be treated as design drift and re-reviewed.

## 13. Product/release impact

E15 maintenance implementation must be byte-neutral for production artifacts:

- Product remains 5.84 during maintenance implementation;
- Engine remains 1.6.25;
- Manager remains 1.3.0;
- contracts remain 1 / 1;
- no exact-byte production promotion is expected from the maintenance PR.

## 14. Live proof gate

After implementation, one subsequent real Local Usage Dashboard product release must prove:

1. canonical release request is automatically labeled `plugin:usage-dashboard` with no manual relabel;
2. deterministic PR is created with locator-only body;
3. E9 validates that body without granting it authority;
4. no PR-body rewrite is needed;
5. E13/E14/E11 behavior remains unchanged;
6. expected-head merge succeeds only after fresh authority re-read;
7. exact-byte promotion/parity/closure complete normally.

A release without restage is sufficient for initial E15 proof because locator-only presentation is already restage-independent by construction. A later real restage remains useful observational confirmation.

## 15. Non-goals

E15 does not:

- add a new `release_generation`;
- auto-merge `main`;
- move PR-write credentials into candidate code;
- add an automatic PR-body updater;
- add another release request or PR;
- replace E9 exact-SHA validation;
- replace E11 merge guard;
- remove E14 candidate ancestry;
- remove the E13 anti-loss schedule;
- infer unknown ownership;
- change product/runtime behavior.

## 16. Final design

E15 is intentionally small:

```text
explicit scope once
+ stable PR locators once
+ fail-closed contract checks
= less manual recovery and zero metadata synchronization
```

The best E15 automation is the automation we do **not** have to build: by making request classification explicit and PR prose immutable with respect to moving SHAs, the already-proven E13/E14/E11 system can continue operating without new orchestration.