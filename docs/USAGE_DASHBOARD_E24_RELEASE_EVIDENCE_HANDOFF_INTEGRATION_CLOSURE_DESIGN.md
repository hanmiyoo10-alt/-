# Local Usage Dashboard E24 — Release Evidence Handoff Integration Closure

Status: **DESIGN FROZEN / IMPLEMENTATION NOT STARTED**

Date: 2026-09-07  
Canonical issue: `#1854`  
Design branch: `design/usage-dashboard-e24-release-evidence-handoff-integration`  
Scope: `plugins/usage-dashboard/` release-control maintenance only

## 1. Why E24 exists

E23 is architecturally successful but operationally incomplete.

The post-implementation review records:

```text
E23 core projection        PASS
E22 -> E23 authority seam  PASS
E23 -> E20/E21 shape       PASS
fail-closed behavior       PASS
runtime/release neutrality PASS
release-spec auto handoff  PARTIAL
shift-left generic wiring  NOT CLOSED
note comparison semantics  TOO STRICT
```

The missing piece is not another baseline algorithm. It is the final connection from already-existing repository release evidence into the ordinary next-release source-readiness path.

E24 closes that seam while preserving E23's successful stability boundary.

E24 is a **maintenance/design generation label only**. It must never be added to the durable request `release_generation` axis, which remains the existing E9-E13 authority. E24 also does not reserve or imply a new Product version.

## 2. Fresh design-start evidence

At design start:

- `main` = `852f0a68f7c0fa417f7758d7e35a512e855d4e1e`;
- production branch = `release-usage-dashboard`;
- production SHA = `7fc4e31ab28d726cc355915a57f0be566dab2b25`;
- production Product = `3.0.0-alpha.5.103`;
- 5.103 durable release request = `#1836`;
- current 5.103 durable-request comments contain no `UD_PHYSICAL_ACCEPTANCE_V1` receipt at this checkpoint;
- therefore deployment 5.103 must not displace the previously exact physically accepted 5.102 baseline.

This is a real, current fixture for the central E22/E23 invariant:

```text
latest deployed production != latest physically accepted baseline
```

If 5.103 becomes physically accepted before E24 implementation begins, implementation must fresh-read the repository and advance the expected accepted identity through E22/E23. The design must not hard-code 5.102.

## 3. Core design thesis

**Automate transport and composition, not authority.**

The canonical direction is:

```text
GitHub / git repository evidence
        |
        | raw, read-only, complete transaction-local capture
        v
existing E9 request parser / locator helpers
        |
        | no acceptance decision
        v
E22 projectReleaseClosure + resolveLatestAccepted
        |
        | exact deployment/physical authority
        v
E23 resolveAcceptedBaselineHandoff
        |
        | existing E20 releaseEvidence shape
        v
E19/E20 + generic preflight / source readiness
        |
        v
materialization allowed or fail closed
```

No layer after E22 is allowed to infer a different accepted release.

## 4. Stability — frozen invariants

### S1. Preserve the authority graph

E24 must not reopen or replace:

- E17 write/transaction stability;
- E19 release-spec contract reuse;
- E20 structured `releaseEvidence` authority;
- E21 canonical evidence view;
- E22 deployment-vs-physical projection and latest-accepted selection;
- E23 accepted-baseline handoff;
- E7 materialization authority;
- E9 durable request authority;
- merge / exact-byte promotion authority;
- user-supplied physical acceptance authority.

### S2. Deployment is never acceptance

The following can never produce physical `ACCEPTED`:

- production branch head;
- successful CI;
- merged PR;
- exact-byte promotion;
- durable issue closure;
- elapsed time;
- healthy runtime diagnostics;
- absence of a failure report.

Only an exact structured user-real-device physical receipt accepted by E22 may do so.

### S3. Fail closed on incomplete evidence

Incomplete enumeration, missing PR identity, unreadable referenced production commit, ambiguous deployment identity, ambiguous accepted ordering, malformed physical receipt, or any E22/E23 contradiction must stop handoff validation.

No incomplete condition becomes:

- zero;
- `UNKNOWN -> accepted`;
- guessed version;
- guessed SHA;
- guessed issue/comment;
- previous value copied without proof.

### S4. No mutation authority

E24 logic itself may not:

- update main;
- update `release-usage-dashboard`;
- post physical receipts;
- close/reopen release requests;
- create/merge PRs;
- promote releases;
- edit a release spec during CI validation.

Source authoring may consume E24-derived output before the source transaction is frozen, but CI/readiness remains validation-only.

### S5. Byte neutrality

E24 must not change Product/Plugin/Engine/Manager/bootstrap/runtime artifacts.

No PocketRisu validation is required for E24 by itself.

## 5. Simplicity — one truth path

### C1. No persistent latest-baseline state

Forbidden:

```text
latest-accepted.json
accepted-baseline.json
baseline-cache.json
release-evidence-state.json
new DB/cache/issue state family
```

The latest accepted baseline is recomputed from repository evidence when needed.

### C2. No second parser or selector

E24 must reuse:

- `release_request_e9.cjs` for durable request parsing and any existing deployment locator helper;
- `release_closure_e22.cjs` for release-state projection and accepted selection;
- `release_baseline_handoff_e23.cjs` for E20 handoff construction;
- E19/E20 for shape/semantic validation.

E24 must not implement its own regex-based physical verdict parser, latest-accepted sorter, or releaseEvidence schema.

### C3. One optional pure composer

Preferred implementation owner, only if it remains the smallest shape:

```text
plugins/usage-dashboard/tools/release_evidence_handoff_e24.cjs
```

Its job is composition, not new semantics.

Tentative pure interface:

```js
resolveReleaseEvidenceHandoff({
  enumeration,
  releases,
  targetProductVersion,
})
```

where `releases` contains **already-fetched** repository objects, for example:

```js
{
  issue: {number, title, body},
  comments: [...],
  pr: {...} | null,
  productionSha: '...',
  productionManifest: {...} | null,
  releaseSpecIdentity: {...} | null,
}
```

E24 composition should:

1. normalize the durable request with existing E9 parsing;
2. build the existing E22 input object;
3. call `E22.projectReleaseClosure()` for each release bundle;
4. call `E22.resolveLatestAccepted()` once over those projections;
5. call `E23.resolveAcceptedBaselineHandoff()` once for the target Product;
6. return the existing E23/E20 handoff plus deterministic findings.

It must not perform HTTP, GitHub API, filesystem persistence, issue mutation, git push, or process spawning.

If implementation evidence shows a separate E24 file adds more indirection than it removes, the same composition may live as one small exported helper in an existing release-control owner. A second semantic owner is not allowed.

## 6. Transaction-local evidence capture

### T1. Existing E7/E9 caller owns fetch, not interpretation

The existing workflow caller may fetch raw repository evidence with minimum read permissions.

The caller may:

- enumerate canonical Usage Dashboard durable release requests;
- fetch comments;
- fetch exact PR metadata;
- fetch the production branch/commit objects needed to read an exact historical production manifest;
- write temporary JSON under `$RUNNER_TEMP` for the current job only.

The caller may not decide which release is accepted.

### T2. Complete enumeration contract

A single "recent issue" lookup is not sufficient.

The caller must enumerate the full canonical durable-request set relevant to current Local Usage Dashboard release history using pagination-aware repository APIs and the existing canonical request title/plugin envelope.

Tentative transport metadata:

```js
{
  enumeration: {
    complete: true,
    repository: 'hanmiyoo10-alt/-',
    durableRequestCount: <integer>,
  },
  releases: [...]
}
```

`complete !== true`, pagination/API failure, duplicate exact durable release identity, or a matching durable issue that cannot be normalized must fail closed.

`complete: true` is a transaction-local capture assertion, not a new source of release truth. E22 still decides deployment/physical identity.

### T3. Existing locator helpers are transport-only

Historical production manifests may require locating the release SHA named by existing deployment evidence.

If the implementation reuses `release_request_e9.latestDeployment()` or another existing helper to obtain a commit locator for `git show`, that locator is **not authority**. Full comments still go to E22, and E22 must independently reject conflicting deployment receipts.

This preserves the independent-locator rule:

```text
locator helps fetch evidence
!=
locator decides truth
```

### T4. No durable transport artifact

Allowed:

```text
$RUNNER_TEMP/usage-dashboard-e24-evidence.json
stdin / process argument JSON
in-memory object
```

Forbidden:

```text
committed evidence snapshot
workflow artifact used as baseline authority
cache entry surviving the transaction
issue comment containing a derived latest-baseline state only for E24
```

## 7. E23 semantic comparison repair

Current E23 compares full serialized `releaseEvidence`, which makes `note` prose part of identity equality.

E24 authorizes one bounded E23 repair.

### Authority-bearing comparison fields

These must match exactly:

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

### Descriptive fields

`acceptedBaseline.note` and `latestInstalled.note`:

- remain governed by E20 shape/bounds;
- may differ for truthful release-specific wording;
- must not change identity semantics;
- must not cause `E23_RELEASE_EVIDENCE_MISMATCH` by themselves.

Preferred comparison order:

```text
actual releaseEvidence
-> E20 validate actual
-> derive expected with E23
-> normalize authority-bearing fields only
-> exact semantic identity compare
```

Malformed actual evidence still fails; this is not a relaxation of E20.

## 8. Automation — derive once, validate independently

### A1. Source authoring

Before a new source transaction is frozen, ChatGPT/source-authoring automation should consume the E24/E23 deterministic output rather than manually reconstructing:

```text
Product version
release SHA
physical issue
physical comment
accepted verdict
```

The derived E20 block may then be written into the new release spec together with release-specific truthful notes.

This is source authoring automation, not CI mutation authority.

### A2. Source readiness

The exact source SHA must be checked against the same deterministic authority projection before candidate materialization.

The validation path must not trust the fact that ChatGPT authored the spec correctly.

### A3. Generic preflight

Current E7 materialization executes:

```text
release_generic_preflight.cjs --spec <release-spec>
```

E24 should extend this existing barrier rather than add a new workflow stage.

Tentative CLI shape, subject to implementation-time minimization:

```text
release_generic_preflight.cjs \
  --spec <release-spec> \
  --release-evidence-context <transaction-local-json>
```

or an equivalent stdin/context interface.

If context is required for an E24-enabled source transaction and is missing, preflight must fail closed.

### A4. Single validation helper

Do not duplicate E24 validation between generic preflight and `source_readiness_e9.cjs`.

Preferred shape:

- one pure `inspectReleaseEvidenceHandoff(...)`/preflight helper;
- generic-preflight CLI calls it;
- source-readiness calls the same helper when it has the same transaction context.

If only one existing barrier is proven to be the authoritative pre-materialization gate, implementation should wire only that barrier and lock the behavior with regression rather than touching both for symmetry.

## 9. Deterministic findings

E22 and E23 finding codes should pass through whenever they already describe the failure.

E24 should add only transport/composition findings that do not already exist.

Tentative bounded codes:

```text
E24_EVIDENCE_ENUMERATION_INCOMPLETE
E24_DURABLE_REQUEST_INVALID
E24_EVIDENCE_BUNDLE_INCOMPLETE
E24_HANDOFF_CONTEXT_MISSING
E24_HANDOFF_COMPOSITION_FAILED
```

Do not remap a precise E22/E23 identity conflict into a generic E24 code.

## 10. Maximum implementation surface

Expected maximum, subject to fresh implementation-time readback:

```text
plugins/usage-dashboard/tools/release_baseline_handoff_e23.cjs
plugins/usage-dashboard/tools/release_evidence_handoff_e24.cjs      # optional pure composer only
plugins/usage-dashboard/tools/release_generic_preflight.cjs         # bounded integration
plugins/usage-dashboard/tools/source_readiness_e9.cjs               # only if required by proven gate ownership
.github/workflows/usage-dashboard-stage-e7.yml                       # raw read-only capture/transport only
plugins/usage-dashboard/tests/e24-release-evidence-handoff-integration-contract.cjs
plugins/usage-dashboard/tests/e23-accepted-baseline-handoff-contract.cjs
plugins/usage-dashboard/tests/release-generic-preflight-contract.cjs # only if existing test is the direct owner
plugins/usage-dashboard/tests/test-registry.cjs                     # only if explicit registration is required
```

A bounded change to `release_closure_e22.cjs` is **not pre-authorized**. If implementation cannot provide E22's current input bundle without duplicating authority parsing, stop and amend the design rather than silently changing E22 semantics.

Forbidden without design amendment:

```text
plugins/usage-dashboard/latest.js
plugins/usage-dashboard/src/**
plugins/usage-dashboard/runtime/**
plugins/usage-dashboard/runtime-src/**
scripts/bootstrap-usage-dashboard.sh
new scheduled workflow
new workflow stage
new state file / DB / cache
new release writer
new merge/promotion writer
new physical acceptance writer
new Product version
release_generation: E24
direct release-usage-dashboard mutation
```

## 11. Regression matrix

Implementation must prove at least:

1. current real pattern: deployed 5.103 + no valid 5.103 physical receipt preserves exact accepted 5.102 baseline;
2. exact later 5.103 physical acceptance automatically advances the handoff without editing E24 logic;
3. newer deployed PENDING preserves prior accepted baseline;
4. newer REJECTED preserves prior accepted baseline;
5. newer CONFLICT preserves prior accepted baseline;
6. E22 ambiguous accepted ordering fails closed;
7. incomplete evidence enumeration fails closed;
8. invalid canonical durable request fails closed;
9. missing referenced PR/production evidence fails closed when E22 requires it;
10. exact E23 output is valid E20 evidence;
11. actual evidence with different valid notes passes semantic handoff validation;
12. Product mismatch fails;
13. release SHA mismatch fails;
14. issue mismatch fails;
15. commentId mismatch fails;
16. verdict mismatch fails;
17. caller/locator cannot override an E22 deployment conflict;
18. no E23/preflight network or GitHub parser appears;
19. no persistent baseline artifact appears;
20. repeated composition is byte-for-byte deterministic;
21. ordinary E7 preflight rejects mismatched handoff before materializer execution;
22. source authoring can consume derived E20 JSON without manually reconstructing the identity tuple;
23. E17/E19/E20/E21/E22/E23 focused contracts remain GREEN;
24. candidate-stage/E7/E9 transaction contracts remain GREEN;
25. full discovered Usage Dashboard registry remains GREEN;
26. Product/Plugin/Engine/Manager/bootstrap/runtime bytes are unchanged;
27. `release-usage-dashboard` is unchanged by E24.

Do not freeze a global test-count integer.

## 12. Historical fixture cleanup

The E23 5.100 accepted / 5.101 pending fixture remains useful history.

Implementation may relabel its comment from "Real current repository shape" to "historical regression fixture" without changing historical identities.

The current real fixture for E24 must be discovered at test time or represented as a bounded design-start fixture without claiming it will remain current forever.

## 13. Implementation entry condition

Implementation may begin only after:

1. this design PR is merged to main;
2. fresh main and `release-usage-dashboard` are re-read;
3. current 5.103 durable request `#1836` is re-read for any newly recorded physical receipt;
4. current E22/E23/preflight/E7 owners are re-read for drift;
5. no competing E24 implementation exists.

If 5.103 is still PENDING, expected baseline remains the latest exact E22-accepted release.

If 5.103 is ACCEPTED, expected baseline advances through the same E22 -> E23 path.

No design amendment is needed merely because the accepted version advanced; the identity is data, not E24 code.

## 14. User contract

User burden does not increase.

```text
ChatGPT: release read-back -> design -> implementation -> tests -> PR/CI -> merge -> deploy
user: press + -> inspect PocketRisu -> send observations/screenshots
ChatGPT: record structured physical evidence -> next baseline derives automatically
```

The user never needs to:

- run developer commands;
- copy Product/SHA/issue/comment tuples;
- operate GitHub Actions;
- edit release specs;
- create acceptance receipts.

## 15. E24 completion criterion

E24 is complete only when a next-release source transaction can demonstrate:

```text
complete raw repository evidence capture
-> existing E22 exact physical truth
-> existing E23 accepted-baseline handoff
-> E20-valid releaseEvidence authored without manual tuple reconstruction
-> independent source-readiness/preflight comparison
-> materialization only after exact semantic match
```

and simultaneously demonstrate:

```text
no new authority
no persistent baseline state
no Product/runtime bytes
no inferred physical acceptance
no extra user action
```

## 16. Frozen verdict

**KEEP E23'S STABILITY. CLOSE ONLY ITS INTEGRATION SEAM.**

E24 priorities are ordered:

1. **Stability first** — E22/E23 remain the only truth/hand-off owners and every ambiguity fails closed.
2. **Automation second** — derive the accepted baseline for source authoring and validate it automatically before materialization.
3. **Simplicity third** — one composition path, one validation helper, transaction-local evidence only, no second state system.

That is the full E24 design boundary.