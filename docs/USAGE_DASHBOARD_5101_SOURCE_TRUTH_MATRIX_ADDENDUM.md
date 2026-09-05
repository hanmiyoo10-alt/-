# Local Usage Dashboard 5.101 — Source Truth Matrix Addendum

Date: 2026-09-06 KST  
Status: **CANONICAL 5.101 MATRIX ADDENDUM · SOURCE PROVEN · IMPLEMENTATION NOT STARTED**  
Feature authority: #1598  
Parent matrix: `docs/USAGE_DASHBOARD_SOURCE_TRUTH_MATRIX.md`

## Purpose

The parent matrix requires source/UNKNOWN/privacy/I/O boundaries to be frozen before a versioned feature becomes implementation-ready.

This addendum records the exact new row for `V-DEVPASS-NO-TRAINING-STATUS` without rewriting the full historical matrix during the docs-only design transaction. Before 5.101 implementation is authorized, the implementation transaction must materialize this exact meaning into the parent matrix or prove an equivalent canonical matrix representation.

This addendum does **not** authorize implementation or release by itself.

## Frozen matrix row

| Feature ID | User surface | Authoritative source | Exact source fields | Capture owner | Allowed normalization / derivation | UNKNOWN rule | Forbidden inference | Privacy / retention | Extra I/O | Contract impact | Evidence | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `V-DEVPASS-NO-TRAINING-STATUS` | existing DevPass account read-only box + Diagnostics | authenticated LLMGateway `GET /dev-plans/status` | exact resolved boolean `blockApiTraining` | existing Engine account capture tap `runtime-src/bridge-engine/30-cli-runtime.part.mjs` `sanitizeStatus()` + `40-sources.part.mjs` `loadDevPassStatus()` / `normalizeIndependentDevPassStatus()` | exact boolean `true` => enabled; exact boolean `false` => disabled; no truthy/falsy coercion | missing/null/non-boolean/status unavailable => UNKNOWN / `—`; missing must never become false | provider/model catalogue `noTraining`, public `no_training` model filter, plan/service-tier/routing/model/provider/request outcome/failure/cache evidence => setting state; no historical request attribution | retain one normalized tri-state account field/source label only; do not expose/persist raw `providerCompliancePolicy`, org/project/account IDs, auth/session/cookies, provider lists, prompts/responses | `none`; reuse existing `/dev-plans/status` capture; no new endpoint/CLI/poller/cache family | additive account snapshot/UI only; candidate contracts remain snapshot/recent-request `1/1` | #1598; `docs/USAGE_DASHBOARD_5101_NO_AI_TRAINING_DESIGN.md`; official upstream `apps/api/src/routes/dev-plans.ts` at `72c3c18096eeafcf1ce80e80763432553b9fe849`; current Engine `30-cli-runtime.part.mjs` + `40-sources.part.mjs` | `PROVEN` |

## Source proof

Official upstream `GET /dev-plans/status` declares and returns `blockApiTraining: boolean`. The active DevPass result is resolved from:

```text
personalOrg.providerCompliancePolicy?.enabled === true
&& personalOrg.providerCompliancePolicy.blockApiTraining === true
```

The same upstream write owner accepts a `blockApiTraining` setting and stores the DevPass no-training requirement independently. The wider organization route constrains DevPass compliance writes to the no-API-training requirement rather than the enterprise policy set.

Local Usage Dashboard already captures `/dev-plans/status` in the healthy account-capture path. The current safe status allowlist simply does not retain this field yet.

## Parent-matrix materialization gate

5.101 implementation may not be marked `IMPLEMENTATION READY` until all of the following are true:

1. fresh production remains the accepted 5.100 baseline or a newer accepted monotonic baseline is explicitly reconciled;
2. the parent source-truth matrix contains this row or an equivalent row with identical source/UNKNOWN/privacy/I/O semantics;
3. the detailed design on #1598 is still current;
4. source behavior remains compatible;
5. `P67` remains available or a fresh replacement regression ID is reserved.

If materializing the parent matrix would change any semantic boundary above, stop and amend the design rather than silently changing the addendum.

## Separate adjacent source

The same `/dev-plans/status` response also exposes `providerCacheControlMode`. That is **not** part of this row and must remain a separate feature/matrix row/release candidate.
