# SimCore v0.70.6 Candidate Qualification Failure 01 — R2.9 Active Version Projection — 2026-09-04

Date: 2026-09-04 KST
Status: **FIX · BLOCKER · RELEASE QUALIFICATION · NON_RUNTIME · PRODUCTION EXPOSURE NONE**
Classification: **SIMCORE · v0.70.6 · CANDIDATE QUALIFICATION · R2.9 VALIDATION PROJECTION**

## 1. Transaction

```text
candidate intent = simcore-v0.70.6-intent-01
release id = simcore-v0.70.6-new-01
candidate request PR = #1475
candidate request head = 3c52e0e30ad1e4891b5729af791187ee7905c70b
production parent = 4374bef29e28804750c05115258cc80f055a26f7
production version = 0.70.5
```

No candidate was published and `release-simcore` did not move.

## 2. Failed gate

SimCore CI run:

```text
run = 33872161801
profile = PR_MAIN
conclusion = FAIL
reasonCode = PR1_DRY_QUALIFICATION_FAIL
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
GATE_PR1_DRY = FAIL
```

Exact qualification assertion:

```text
SUITE_ASSERTION_FAILED: release-system-r2-9-validation-contract-projection:
R2.9 active regression source version unsupported: 0.70.6
```

## 3. Root cause

The v0.70.6 runtime builder and executable feature regression were already clean on the implementation PR. The candidate dry-run produced a 0.70.6 source and then entered the R2.9 validation-contract projection regression. That regression still recognized the previous active release identity set only through v0.70.5 and therefore failed closed when the active source version became 0.70.6.

This is a release-validation identity projection lag, not a plugin runtime behavior defect.

## 4. Safety disposition

```text
runtime candidate defect = NOT OBSERVED
production write = NONE
release-simcore movement = NONE
production remains = v0.70.5 / 4374bef29e28804750c05115258cc80f055a26f7
feature implementation = UNCHANGED
release-system redesign = FORBIDDEN
```

Classification is therefore:

```text
FIX / BLOCKER / RELEASE QUALIFICATION / NON_RUNTIME / PRODUCTION EXPOSURE NONE
```

## 5. Repair boundary

Allowed repair is narrowly limited to extending the existing R2.9 validation projection so it recognizes the already-defined v0.70.6 release identity and `products/simcore/releases/validation-profiles/0.70.6.json` contract.

Required invariants:

```text
no plugin runtime byte change
no builder behavior change
no candidate-request schema change
no release workflow/control-flow change
no release-system architecture refactor
no authority relaxation
unknown future versions remain fail-closed
```

After the repair merges through ordinary SimCore CI, candidate qualification must be rerun from fresh `main` against unchanged production.

## 6. Transaction disposition

The failed pre-merge `intent-01/new-01` attempt is preserved as evidence and must not be silently rewritten into a successful transaction. The recovery path should use a fresh append-only candidate intent after the R2.9 projection repair is authoritative on `main`.
