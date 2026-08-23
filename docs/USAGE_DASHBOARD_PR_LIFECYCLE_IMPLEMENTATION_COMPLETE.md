# Local Usage Dashboard — PR Lifecycle Simplification E1–E4-B Implementation Closure

Status: **IMPLEMENTATION_COMPLETE**

Closure date: 2026-08-23

This document is durable historical evidence for the completed PR Lifecycle Simplification implementation. It records what was implemented, what was verified, what production state remained unchanged during the maintenance sequence, and what operational proof is intentionally deferred to the next real feature release.

This closure is historical evidence, not a pin that blocks later product releases or requires future releases to retain the 5.70 blob identities below.

## 1. Closed implementation scope

The following implementation stages are complete and merged:

| Stage | Purpose | PR | Squash merge SHA |
| --- | --- | --- | --- |
| E1 | Test Registry Authority | #153 | `cc4601675ad9d7716991d441da25cf21b0c44d36` |
| E2 | Candidate-Ready PR Entry Gate | #155 | `06cadf39a25831d78f7ccc9dac267dfc2f1e3b69` |
| E3 | Release / Maintenance Classifier | #156 | `a0156b1df8851fc3ae91ac2af0922bafdc4d3f5d` |
| E4-A | Legacy Release Writer Quarantine | #158 | `f49e961ae2bd0da58ebc90ef17a62221c2c538a6` |
| E4-B | Safe Candidate Preparation | #159 | `dab9ec98f07959dbe7b20ff4c60339f359e11568` |

The implementation boundary is therefore:

```text
E1  registry-backed test authority
 -> E2 exact-SHA candidate-ready preflight
 -> E3 production-blob-based release/maintenance classification
 -> E4-A legacy Usage Dashboard release writers retired
 -> E4-B read-only candidate preparation + constrained branch writer
```

## 2. Final full-regression evidence

E4-B PR #159 was the final implementation PR.

Authoritative full PR validation:

- workflow: `Usage Dashboard Candidate Validation`
- run number: `#44`
- run ID: `32640314796`
- conclusion: `success`
- registry result: `TEST_REGISTRY_GREEN:70`
- current release validation: Product `3.0.0-alpha.5.70` / Engine `1.6.21` / Manager `1.3.0` / contracts `1/1`
- P34 Request Duration Fidelity: GREEN
- new `candidate-preparation-contract.cjs`: GREEN
- release authority and classifier contracts: GREEN

No meaningful PR/CI anomaly occurred in the final E4-B run.

## 3. E4-B post-merge classifier evidence

After PR #159 merged, the generic E3 controller ran against the maintenance merge.

- workflow: `Usage Dashboard Exact-Byte Promotion`
- run number: `#10`
- run ID: `32640370297`
- `classify`: **SUCCESS**
- `promote`: **SKIPPED**
- `maintenance-release-control-smoke`: **SKIPPED**

This is the expected E3 result for an E4-B maintenance merge. The production write job did not execute.

## 4. Final production immutability evidence

After E1–E4-B implementation and merge, the five production artifact paths were re-read from both `main` and `release-usage-dashboard`.

| Production artifact | main Git blob | release Git blob | Result |
| --- | --- | --- | --- |
| `plugins/usage-dashboard/latest.js` | `e4175cac68cdce8dcb7841f9aaa1be3e3275c53f` | `e4175cac68cdce8dcb7841f9aaa1be3e3275c53f` | EXACT MATCH |
| `plugins/usage-dashboard/runtime/bridge-engine.mjs` | `82c67639529862fcc00f1f0bf1ff47cd5c4feb46` | `82c67639529862fcc00f1f0bf1ff47cd5c4feb46` | EXACT MATCH |
| `plugins/usage-dashboard/runtime/bridge-manager.cjs` | `15cdc440f465ffe3f8f51ad127ca2f88c0433bb6` | `15cdc440f465ffe3f8f51ad127ca2f88c0433bb6` | EXACT MATCH |
| `plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh` | `2ba27e51389296dcd0544517f964dd6e8fb7ee1c` | `2ba27e51389296dcd0544517f964dd6e8fb7ee1c` | EXACT MATCH |
| `plugins/usage-dashboard/runtime/product-manifest.json` | `b45db4e294dedefb655da09d715bd3aceda0a521` | `b45db4e294dedefb655da09d715bd3aceda0a521` | EXACT MATCH |

The release branch remained:

- `release-usage-dashboard` HEAD: `80bcddd0bf486cedfaf38f21db0342991272e089`
- release commit: `release: promote Local Usage Dashboard 3.0.0-alpha.5.70 exact artifacts`
- Product: `3.0.0-alpha.5.70`
- Engine: `1.6.21`
- Manager: `1.3.0`
- snapshot contract: `1`
- recent-request contract: `1`

Therefore E1–E4-B maintenance did **not** move or rewrite production release bytes.

## 5. E2 / E4-B workflow_dispatch operational proof boundary

`E2` and `E4-B` permanent `workflow_dispatch` entrypoints were intentionally **not** exercised end-to-end during this maintenance closure.

**E2/E4-B workflow_dispatch end-to-end: `DEFERRED_TO_NEXT_FEATURE_RELEASE`.**

What is already verified now:

- workflow structure and permissions,
- exact-SHA binding,
- E2 read-only candidate completeness contract,
- E4-B read/write privilege split,
- immutable Git bundle boundary,
- single-parent payload validation,
- changed-path allowlist,
- regular-file mode validation,
- candidate-branch CAS guard,
- denial of `main` and `release-usage-dashboard` as candidate write targets,
- no force push,
- post-write remote SHA verification,
- full PR regression,
- E4-B temporary Git repository integration tests.

What remains for the next real feature release is operational proof of the permanent flow against an actual feature candidate.

That release must demonstrate, in order:

```text
feature branch source/tests/spec/materializer changes
 -> E4-B safe candidate preparation on exact expected branch SHA
 -> candidate branch advances only by the constrained CAS writer
 -> E2 candidate-ready preflight on the resulting exact SHA
 -> E2 GREEN while branch HEAD still equals that ready SHA
 -> PR opens only after candidate-ready GREEN
 -> first PR CI resolves the intended release spec immediately
 -> first PR CI does not fail CANDIDATE_NOT_MATERIALIZED
 -> full PR CI GREEN on the exact PR head
 -> expected-head merge
 -> E3 classifies RELEASE_CANDIDATE
 -> generic exact-byte promotion
 -> production verification
```

`temporary staging workflow: FORBIDDEN` for that proof. The first real feature release after this closure is the operational adoption test for E2 + E4-B.

The deferred operational proof is **not an implementation gap** and does not reopen E1–E4-B maintenance. If the first feature-release exercise reveals a real defect, it is handled as a new anomaly/fix under the existing PR/CI anomaly contract.

## 6. User / device boundary

This closure changes release infrastructure only. Product/runtime bytes remain the already-deployed 5.70 bytes.

**PocketRisu validation: `NOT_REQUIRED_FOR_THIS_MAINTENANCE_CLOSURE`.**

The user does not need to press `+` for this closure. Device-only validation becomes relevant again only when a future product/runtime release changes bytes that are actually delivered to PocketRisu.

## 7. Final closure statement

E1 through E4-B are **implementation complete**.

The repository now has:

- one registry authority for Usage Dashboard tests,
- a permanent exact-SHA pre-PR candidate-ready gate,
- production-byte-based maintenance/release classification,
- no active legacy `release-local-usage-*` production writer,
- one generic exact-byte production release authority,
- a separate constrained candidate-branch writer that does not execute candidate code with write credentials,
- explicit CAS / path / mode / parent guards for candidate preparation,
- durable PR/CI anomaly review rules,
- preserved production 5.70 exact-byte identity across the complete maintenance sequence.

**E1–E4-B maintenance closure: COMPLETE.**
