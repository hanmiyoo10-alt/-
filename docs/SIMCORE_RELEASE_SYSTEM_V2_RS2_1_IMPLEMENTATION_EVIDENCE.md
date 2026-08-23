# SimCore Release System v2 — RS2-1 Durable Tests Implementation Evidence

Date: 2026-08-23
Status: **CLOSED · PASS · NON-RUNTIME**
Phase: `RS2-1 — Durable Tests`

Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1C_FIRST_REGRESSION_PACK.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1D_BASELINE_EQUIVALENCE_PROOF.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1E_PROMOTION_CLOSE_GATE.md`

## 1. Scope result

This work item implemented **RS2-1 only**.

No production/runtime source was modified. No `release-simcore` write, `product-manifest.json` write, RS2-2 implementation, RS2-3 permanent-CI implementation, RS2-4 release-controller implementation, runtime semantic change, or historical release-path deletion occurred.

The known stale `product-manifest.json` state remains separate RS2-2 evidence and was intentionally not repaired here.

## 2. Frozen production baseline

Close proof source:

```text
branch              release-simcore
commit              47969d24771f6cc188df6e32150fc6fde519182d
version             0.64.6
latest blob         34da01aa131f760b92d65d961a7843e9cc0d37d6
install blob        34da01aa131f760b92d65d961a7843e9cc0d37d6
sha256              1f07668f418faf0029c37409c31545f146c27592ac37eff39fea8cdd0e599aac
latest == install   YES
```

Production release identity remains owned by `release-simcore`; the RS2-1 status record is infrastructure state only.

## 3. Implemented durable assets

Permanent infrastructure now exists under:

```text
products/simcore/tooling/
products/simcore/tests/
products/simcore/contracts/
```

Implemented capabilities include:

- production bundle module/function extraction with fail-closed ambiguity handling;
- isolated fixture execution contexts;
- bounded reports without raw production source retention;
- fixture registry and schema checks;
- harness self-test coverage;
- Batch A suite execution;
- historical equivalence adapters/records;
- explicit retained-control ledger;
- machine-readable RS2-1 close state.

Batch A:

| Suite | Coverage | Close result |
|---|---|---|
| `representation-fast` | `HYBRID_TRANSITIONAL` | PASS / retained |
| `genuine-edit` | `HYBRID_TRANSITIONAL` | PASS / retained |
| `community-reaction` | `EXECUTABLE` | PASS / `COMPATIBLE_SUPERSET` |
| `broadcast-closure` | `HYBRID_TRANSITIONAL` | PASS / retained |
| `diagnostic-copy` | `EXECUTABLE` | PASS / `COMPATIBLE_SUPERSET` |

## 4. Final validation authority

Final implementation validation:

```text
workflow run   32634645909
job            97182455929
result         SUCCESS
permissions    contents: read
```

Validated steps all PASS:

```text
scope guard
static syntax + harness self-test
frozen production materialization
historical equivalence source materialization
permanent Batch A against v0.64.6 production
COMMUNITY historical differential equivalence
Diagnostic Copy historical owner equivalence
legacy robust v0.64.6 fixtures 1-25
read-only / no-production-mutation proof
```

Harness self-test:

```text
11 / 11 PASS
```

Permanent Batch A:

```text
5 / 5 suites PASS
```

## 5. COMMUNITY differential proof

Pinned historical/current result:

```text
v0.64.4
commit c11216310938a090f5c81cc6e81e9ca8535e002f
blob   58aa3ff60bad4ab487230a96718c4ae1a1cc0c2d
bounded bilingual 4-top + 1-reply shape
→ units 5 / missing 5 / pass 0

v0.64.5
commit 6c43c8167375b836a87277c005c63f93b028dde4
blob   a4b4633343cd856954857e7c490528fc713620da
same bounded shape
→ units 5 / missing 0 / pass 5

current v0.64.6
same bounded shape
→ units 5 / missing 0 / pass 5
```

Additional current permanent controls preserve historical single-line reaction formats and required malformed/tail negatives.

Disposition:

```text
community.multiline-bilingual-logical-unit-pass
= COMPATIBLE_SUPERSET
= retirement eligible at mapped deterministic assertion-family level only
```

Historical workflow files are not deleted by this disposition.

## 6. Diagnostic Copy equivalence proof

Pinned v0.64.2 source:

```text
commit 7a1f1692920abbc890c6663b40e38a24676c3de9
blob   3058e5bafa7f3abd15277ceabd0bd9d8518f52dc
sha256 81084f375cccf64fa17794ba49eb382082d9891c0195d13ae8c219ec0920d93b
```

The permanent suite executes the actual `runDiagnosticCopy` / `fallbackCopyText` owner behavior and preserves:

```text
COPIED
COPIED_FALLBACK
REPORT_BUILD_FAILED
CLIPBOARD_WRITE_FAILED
builder once / identical payload semantics
DOM fallback cleanup controls
```

Disposition:

```text
diagnostic-copy.transport-state-and-fallback
= COMPATIBLE_SUPERSET
= retirement eligible at mapped deterministic assertion-family level only
```

Real WebView/clipboard live authority remains separate where required.

## 7. Transitional retained controls

The following are explicitly retained and are not represented as fully replaced:

```text
representation-fast.decision-path
missing surface: OUTER_RECONCILE_SEQUENCE
upgrade trigger: M2-3 edit-reconcile service


genuine-edit.rebuild-path
missing surface: OUTER_EDIT_RECONCILE_SEQUENCE
upgrade trigger: M2-3 edit-reconcile service

broadcast-closure.state-transition
missing surface: B_END_STATE_COMMIT_AND_UNLOCK
upgrade trigger: later executable lifecycle/state boundary or explicit disposition
```

Authority record:

`products/simcore/tests/equivalence/retained-controls.json`

Therefore aggregate equivalence is intentionally:

```text
PARTIAL_REPLACEMENT_ONLY
```

## 8. Evidence-first implementation findings

During implementation, three harness/fixture findings were detected before any production mutation and repaired only in RS2-1 infrastructure:

```text
VM_REALM_REFERENCEERROR
= FIX / HARNESS_SELF_TEST

FUNCTION_BODY_BOUNDARY_DEFAULT_OBJECT
= FIX / HARNESS / PRE_PRODUCT_ASSERTION

B_END_FIXTURE_SHAPE_UNDERSPECIFIED
= FIX / FIXTURE / PRE_EQUIVALENCE
```

The B_END fixture was corrected to the real Structure envelope grammar already proven by the robust v0.64.6 fixture family. After correction the direct Structure valid/quarantine controls and all legacy robust fixtures passed.

No finding justified a production/runtime patch.

## 9. Close records

Machine-readable authority for this infrastructure phase:

```text
products/simcore/tests/equivalence/legacy-map.json
products/simcore/tests/equivalence/batch-a.equivalence.json
products/simcore/tests/equivalence/retained-controls.json
products/simcore/tests/RS2_1_STATUS.json
```

Final operational claims:

```text
DURABLE_TESTS_AVAILABLE         YES
PARTIAL_REPLACEMENT_AUTHORIZED  YES
FULL_REPLACEMENT_AUTHORIZED     NO
RS2_1_CLOSED                    YES
```

Retirement-eligible mapped deterministic assertion families:

```text
community.multiline-bilingual-logical-unit-pass
diagnostic-copy.transport-state-and-fallback
```

Retained controls remain authoritative exactly as recorded above.

## 10. Handoff boundary

RS2-1 is complete.

This close does **not** activate RS2-2, RS2-3, or RS2-4 by itself and does not modify the current release mechanism. It only satisfies the frozen RS2-1E entry condition that permits RS2-2 work to begin as a separate future infrastructure change.

The temporary RS2-1 implementation-validation workflow used to collect the immutable proof is removed from the final payload. Permanent CI remains RS2-3 scope.
