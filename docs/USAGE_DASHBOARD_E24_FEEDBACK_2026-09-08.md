# Local Usage Dashboard E24 — Post-Implementation Feedback

Date: 2026-09-08

Scope: `plugins/usage-dashboard/` release-control feedback only. This document does not change Product, Plugin, Engine, Manager, bootstrap, runtime, `main` release bytes, or `release-usage-dashboard`.

## 1. Executive verdict

E24 successfully closed the **pre-materialization validation seam** that E23 left open.

The first real post-E24 Product transaction, 5.105, proved that the new path is not decorative: E24 collected current repository release evidence, composed E9 -> E22 -> E23, rejected a stale accepted-baseline tuple before materialization, and later accepted the corrected exact authority tuple.

However, E24 has **not fully closed source-authoring automation**. The 5.105 release spec and its release-specific materializer still contain literal accepted-baseline Product/SHA/issue/comment identity values. The live 5.105 failure/repair shows that those duplicate literals can drift and still require source repair.

Therefore the correct post-implementation verdict is:

```text
E24 pure composition                         PASS
E22/E23 authority preservation              PASS
semantic note comparison                    PASS
transaction-local raw evidence capture      PASS
pre-materialization generic-preflight gate  PASS
fail-closed behavior                        PASS
byte-neutral E24 implementation             PASS
first real 5.105 E24 validation             PASS
source-authoring derivation                  PARTIAL / NOT CLOSED
release-specific tuple duplication           NOT CLOSED
fixture/status freshness                     NEEDS CLEANUP
```

E24 should be treated as **operationally successful but authoring-incomplete**.

## 2. Canonical implementation evidence

Canonical E24 records:

- issue: `#1854` — `[usage-dashboard] E24 Release Evidence Handoff Integration Closure`;
- design PR: `#1858`;
- design merge: `ba3b4b4f55761f3a509c79c2e57dcea6b584a536`;
- implementation PR: `#1863` — `feat(usage-dashboard): close E24 release evidence handoff integration`;
- exact implementation head: `eaae1bedd912af3e1b98dd894e1b88a1681f0a75`;
- implementation merge: `03f7301fdf0acb046fbbef89ea603cf65007ec59`.

The E24 terminal read-back recorded that after implementation merge:

- `release-usage-dashboard` stayed at `e1d1455592449bcad943e3dec6e1eb205136bd92`;
- Product stayed `3.0.0-alpha.5.104`;
- Engine stayed `1.6.38`;
- Manager stayed `1.3.6`;
- CLI stayed `1.10.0`;
- Models stayed `1.280.0`;
- contracts stayed `1/1`;
- `latest.js` and `product-manifest.json` remained exact-byte aligned between main and production;
- no release promotion or runtime mutation was caused by E24 itself.

This proves the byte-neutral maintenance boundary held.

## 3. Current implementation map

### 3.1 Pure E24 composer

`plugins/usage-dashboard/tools/release_evidence_handoff_e24.cjs` is correctly small and compositional.

It:

1. validates transaction enumeration metadata;
2. normalizes each durable release bundle through existing E9 request parsing;
3. calls existing `E22.projectReleaseClosure(...)`;
4. calls existing `E22.resolveLatestAccepted(...)`;
5. calls existing `E23.resolveAcceptedBaselineHandoff(...)`;
6. returns the existing E20-shaped `releaseEvidence` and accepted identity;
7. passes through precise E22/E23 findings rather than inventing a second authority model.

It does not own filesystem persistence, HTTP, GitHub mutation, process spawning, release promotion, or physical acceptance.

Verdict: **PASS**.

### 3.2 E23 semantic comparison repair

`plugins/usage-dashboard/tools/release_baseline_handoff_e23.cjs` now compares only authority-bearing fields after E20 validation:

```text
schemaVersion
acceptedBaseline.productVersion
acceptedBaseline.releaseSha
acceptedBaseline.verdict
acceptedBaseline.issue
acceptedBaseline.commentId
latestInstalled.productVersion
latestInstalled.releaseSha
latestInstalled.verdict
latestInstalled.issue
latestInstalled.commentId
```

`note` remains E20-valid descriptive prose and is no longer part of identity equality.

This matches the frozen E24 design and closes the E23 feedback finding that note comparison was too strict.

Verdict: **PASS**.

### 3.3 Generic preflight integration

`plugins/usage-dashboard/tools/release_generic_preflight.cjs` now imports E24 and, when supplied the transaction-local evidence context, validates the source release spec's `releaseEvidence` against the deterministic E22 -> E23 handoff.

The authoritative E7 path passes:

```text
--release-evidence-context "$RELEASE_EVIDENCE_CONTEXT"
```

before release-specific materialization is allowed.

The CLI still supports context-free use for legacy/standalone stale-literal checks. This is not currently a correctness gap because the authoritative E7 candidate-materialization path explicitly requires the context file and tests lock that barrier. Do not make the CLI globally context-mandatory unless another candidate-producing path is discovered.

Verdict: **PASS for the authoritative release path**.

### 3.4 Transaction-local raw capture

`.github/workflows/usage-dashboard-stage-e7.yml` collects canonical durable request evidence read-only and writes only to:

```text
$RUNNER_TEMP/usage-dashboard-e24-evidence.json
```

The collector:

- uses `issues: read` and `pull-requests: read`;
- paginates repository issues/comments;
- identifies canonical Usage Dashboard durable requests through the existing request envelope;
- fetches exact PR metadata when the durable request names a PR;
- uses existing deployment locator logic only to fetch historical production identity;
- passes full raw comments to E22 for actual truth projection;
- sets an explicit complete-enumeration count;
- does not gain PR write, physical receipt, release, merge, or promotion authority.

Verdict: **PASS**.

## 4. First real transaction proof: 5.105

5.105 is the first Product transaction that exercised E24 after implementation.

Current deployed identities at this feedback checkpoint:

- main: `16c2b3d7e189ad6cb17a6231f7ba5ce78b2c517c`;
- production: `release-usage-dashboard@0e6eea0232fce4ffa1ceb51dca03d0f88d1ea13c`;
- Product: `3.0.0-alpha.5.105`;
- Engine: `1.6.39`;
- Manager: `1.3.6`;
- CLI: `1.10.0`;
- Models: `1.280.0`;
- contracts: `1/1`;
- exact-byte promotion: VERIFIED;
- 5.105 physical acceptance: PENDING at this checkpoint.

### 4.1 What E24 caught

During 5.105 staging, E7 transaction `34174062286` recorded:

```text
E24 captured 18 durable release requests
RELEASE_PREFLIGHT_E24_GREEN:3.0.0-alpha.5.105
RELEASE_PREFLIGHT_GREEN:3.0.0-alpha.5.105
```

The next failure was not in E24. It was in the release-specific 5.105 materializer, which still expected a pre-E22 feature-level 5.104 evidence tuple.

The canonical E22/E23 accepted identity had advanced to the durable release-request authority:

```text
Product 3.0.0-alpha.5.104
release SHA e1d1455592449bcad943e3dec6e1eb205136bd92
release request #1861
structured handoff / physical comment 5577292772
verdict accepted
```

The materializer had to be repaired to expect that exact tuple.

This is important positive evidence: E24 prevented the stale tuple from quietly reaching materialization/production.

Verdict: **E24 validation works in production release traffic**.

### 4.2 What 5.105 exposed

The same event exposes the remaining authoring gap.

Current `.github/usage-dashboard/releases/5.105.json` contains the accepted identity as literal source values.

Current `plugins/usage-dashboard/tools/release_credits_next_tier_5105.py` also duplicates the same identity through release-specific constants/validation:

```text
BASE_PRODUCT = 3.0.0-alpha.5.104
BASE_RELEASE_SHA = e1d1455592449bcad943e3dec6e1eb205136bd92
expected issue = 1861
expected commentId = 5577292772
expected verdict = accepted
```

So the authority tuple currently exists in at least two release-specific source locations:

1. the release spec;
2. the release-specific materializer validation.

E24 validates those values, but it does not currently author them into the source transaction.

This means the frozen E24 success criterion:

```text
accepted baseline identity came from E22 physical truth
-> E23 handoff supplied/validated it
-> no human reconstructed Product/SHA/issue/comment tuple
-> source readiness rejected contradiction before materialization
```

is only partially satisfied.

The first, second, and fourth lines are proven. The third line is not repository-proven.

Verdict: **source-authoring derivation remains NOT CLOSED**.

## 5. Regression assessment

`plugins/usage-dashboard/tests/e24-release-evidence-handoff-integration-contract.cjs` strongly covers:

- accepted baseline composition;
- note-only semantic differences;
- Product/SHA/issue/comment/verdict mismatches;
- newer PENDING preserving prior accepted;
- REJECTED preserving prior accepted;
- CONFLICT failing closed;
- exact newer ACCEPTED advancing;
- incomplete enumeration failing closed;
- duplicate/invalid durable request identity;
- missing/wrong PR identity;
- no persistent baseline state;
- no E24 network parser in the composer/preflight;
- E7 transaction-local capture wiring;
- deterministic repeated composition.

This is good coverage.

However, required design regression #22 was:

```text
source authoring can consume derived E20 JSON without manually reconstructing the identity tuple
```

The current test proves that E24 can **derive** the E20 block and that preflight can **validate** it. It does not prove an actual source-authoring owner writes/constructs the next release spec from that derived block.

The 5.105 literal tuple confirms this is a real missing integration, not merely a test naming issue.

Verdict: **regression matrix coverage is strong but authoring proof is incomplete**.

## 6. Freshness findings

### 6.1 Frozen design status

`docs/USAGE_DASHBOARD_E24_RELEASE_EVIDENCE_HANDOFF_INTEGRATION_CLOSURE_DESIGN.md` still begins:

```text
Status: DESIGN FROZEN / IMPLEMENTATION NOT STARTED
```

This is historically correct for the frozen design artifact, so do not rewrite the frozen authority document merely to make it look current.

Use this feedback document as the post-implementation addendum.

### 6.2 E24 regression comment is now stale

The E24 regression currently labels the fixture:

```text
Current-shaped live boundary: 5.103 is physically accepted; newer 5.104 is deployed but still pending physical.
```

That was true at E24 implementation time, but is no longer current. 5.104 later became accepted and 5.105 is now deployed.

The fixture itself remains valuable and should stay unchanged. Only the comment should be relabeled as a historical implementation-time fixture.

Recommended wording:

```text
Historical E24 implementation fixture: 5.103 accepted while 5.104 was deployed/pending.
```

Verdict: **NEEDS CLEANUP, no semantic defect**.

## 7. Scalability watch, not a blocker

The E7 collector currently enumerates all repository issues and then fetches comments/PR evidence for every matching durable Usage Dashboard release request.

At the 5.105 transaction it handled 18 durable requests successfully.

This is correctness-first and satisfies the completeness requirement, but its API work grows with repository history. Do not optimize prematurely, because a narrower search/index can accidentally become a second authority boundary.

If staging latency or API limits become material, optimize only with a design that preserves:

```text
complete canonical enumeration
-> raw transport only
-> E22 remains truth selector
```

Verdict: **WATCH only**.

## 8. Recommended follow-up: E24 Authoring Closure

This should be a **byte-neutral release-control maintenance slice**, not a Product release, not `release_generation: E24`, and not automatically a new E-number.

Goal:

```text
remove release-specific manual reconstruction of accepted-baseline identity
while preserving the already-successful E24 validation barrier
```

### AC1. One derived source-authoring path

Before a source transaction is frozen, source-authoring automation should obtain the deterministic E24 result and construct the release spec `releaseEvidence` authority fields from:

```text
resolveReleaseEvidenceHandoff(...).releaseEvidence
```

Release-specific notes may still be supplied separately and remain E20-bounded.

Do not add a second latest-accepted selector or persistent baseline state.

### AC2. Remove duplicate identity from release-specific materializers

A release-specific materializer should not hard-code:

```text
accepted baseline release SHA
accepted baseline issue
accepted baseline commentId
```

as a second independent copy of release authority.

It may validate that the spec already passed the generic E24 barrier, or validate release-local Product/runtime baseline bytes, but E22/E23 evidence identity should have one source owner.

Preferred outcome:

```text
E24/E23 derives authority tuple
-> release spec contains the derived tuple
-> generic preflight independently re-derives and verifies it
-> release-specific materializer does not duplicate issue/comment authority
```

### AC3. Add actual authoring regression

Add a regression proving that a synthetic next release spec can be constructed from E24-derived evidence without a hand-entered Product/SHA/issue/comment tuple.

Required cases:

1. accepted N produces releaseEvidence for N+1 source authoring;
2. newer PENDING leaves N as the authored baseline;
3. newer REJECTED leaves N;
4. CONFLICT fails before authoring;
5. exact newer ACCEPTED advances automatically;
6. valid custom note wording is preserved;
7. authority fields cannot be overridden by caller-supplied conflicting literals;
8. no persistent baseline artifact is created;
9. generic preflight independently verifies the authored result;
10. no Product/runtime bytes change.

### AC4. Historical fixture label cleanup

Relabel only stale comments such as `Current-shaped live boundary` to explicitly historical wording.

Do not rewrite frozen historical identities.

### AC5. Keep the existing E24 gate unchanged unless evidence demands otherwise

The current E7 transaction-local capture and generic-preflight barrier worked in 5.105. Avoid redesigning that successful path while closing source authoring.

## 9. Non-goals

Do not add:

- a new Product version;
- `release_generation: E24`;
- `latest-accepted.json` or equivalent persistent state;
- a database/cache for accepted baseline;
- a scheduler/poller;
- a new physical acceptance writer;
- a new merge/promotion writer;
- a second E22 selector;
- runtime/Product/Engine/Manager/bootstrap changes;
- automatic deployment -> physical acceptance inference;
- UNKNOWN/PENDING -> ACCEPTED fallback.

## 10. Final assessment

E24 materially improved the release system and proved its value during 5.105.

The strongest evidence is not that its tests pass. The strongest evidence is that it caught a real stale authority tuple before production.

The remaining task is narrower than E24 itself:

```text
validation closure = done
source-authoring closure = still open
```

Close that authoring seam without touching the successful authority graph or production bytes.