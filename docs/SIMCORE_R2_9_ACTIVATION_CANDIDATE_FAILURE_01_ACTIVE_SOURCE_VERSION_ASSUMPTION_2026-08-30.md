# SimCore R2.9 Activation Candidate Failure 01: Active Source-Version Assumption

Date: 2026-08-30 KST

Status: **FIX REQUIRED · NON-RUNTIME · PRODUCTION UNCHANGED**

Classification: **FIX · R2_9_ACTIVE_REGRESSION_SOURCE_VERSION_ASSUMPTION · NON_RUNTIME · PRODUCTION_UNCHANGED**

## 1. Failed transaction

Candidate rerun PR:
- `#952 release(simcore): request v0.70.1 candidate rerun`
- head: `404d675332af35d1c1fd92dbc202a17559ca736a`
- base: `da6fed46ef32a7b4bc39aedc9060a016328647a9`

SimCore CI:
- run: `33297487548`
- Verify: `99219548293` = FAILURE
- Required: `99219611436` = FAILURE

Bounded gate result:

```text
GATE_CI_SELF    = PASS
GATE_PR1_DRY    = FAIL
GATE_STATIC     = PASS
GATE_ARCH       = PASS
GATE_REGRESSION = PASS
reasonCode      = PR1_DRY_QUALIFICATION_FAIL
```

Exact first failure:

```text
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED:
release-system-r2-9-validation-contract-projection:
active loader must bind current source to exact current profile:
expected="0.70.0"
actual="0.70.1"
```

## 2. Root cause

The R2.9 active profile loader behaved correctly.

During candidate dry qualification, `ctx.source` is the materialized v0.70.1 candidate. Therefore:

```text
extract source version = 0.70.1
exact profile loaded    = 0.70.1
```

The permanent R2.9 regression incorrectly treated the phrase "current source" as a synonym for deployed production v0.70.0 and hard-coded:

```text
loadedCurrent.releaseVersion == 0.70.0
```

That assumption is valid in MAIN_HEALTH against deployed production, but invalid in candidate qualification where the active source under test is intentionally the candidate identity.

The defect is therefore in the validation regression's context assumption, not in:

```text
v0.70.1 runtime implementation
v0.70.1 builder
R2.9 exact profile loader
R2.9 projected stable contract runner
release-simcore production
```

## 3. Required repair

Repair only the R2.9 permanent regression.

The active-source assertion must bind dynamically:

```text
actual source metadata version
== exact profile selected by loadActiveValidationProfile(ctx.source)
```

Required behavior:

```text
production source 0.70.0 -> exact profile 0.70.0 -> PASS
candidate source  0.70.1 -> exact profile 0.70.1 -> PASS
unknown source     0.70.2 -> exact profile absent -> FAIL CLOSED
```

The regression may retain explicit schema/contract checks for the known 0.70.0 and 0.70.1 profiles, but must not execute an arbitrary candidate source against a hard-coded 0.70.0 profile.

No nearest/latest profile inference is allowed.

## 4. Scope boundary

Authorized repair surface:

```text
products/simcore/tests/suites/release-system-r2-9-validation-contract-projection.test.mjs
associated R2.9 regression evidence/status only if required
```

Forbidden:

```text
plugin runtime mutation
builder semantic change
candidate intent change
release-simcore mutation
R2.8 authority change
publisher/main-writer change
new exact-version wrapper files
background retry/polling
```

## 5. Production safety

Throughout #952 failure:

```text
production version        = 0.70.0
release-simcore commit    = 13179cff70feaf7d12fe53c56e4735155fcf3eaa
latest blob               = addf07e273a6fc87f04cdadcb51fa3aa5d6fe298
install blob              = addf07e273a6fc87f04cdadcb51fa3aa5d6fe298
latest == install         = true
candidate publication     = NONE
production mutation       = NONE
```

The fail-closed system therefore behaved correctly.

## 6. Disposition

```text
FIX · R2_9_ACTIVE_REGRESSION_SOURCE_VERSION_ASSUMPTION · NON_RUNTIME · PRODUCTION_UNCHANGED
```

Next sequence:

```text
record this evidence on main
-> separate validation-only repair branch
-> SimCore Verify + Required
-> merge repair
-> clean rerun same immutable v0.70.1 intent from fresh main
```
