# SimCore Release System v2 — RS2-3 Permanent CI Implementation Evidence

Date: 2026-08-23
Status: **IMPLEMENTING · NON-RUNTIME**
Phase: `RS2-3 — Permanent CI`
Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3A_PERMANENT_CI_TOPOLOGY_TRUST_BOUNDARY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3B_TRIGGER_CHECK_MATRIX_PATH_CLASSIFICATION.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3C_PERMISSIONS_CONCURRENCY_REPORT_ARTIFACT_SAFETY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3D_SHADOW_EQUIVALENCE_LEGACY_GATE_RETIREMENT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3E_PROMOTION_CLOSE_GATE_RS2_4_HANDOFF.md`

## Entry authority

```text
implementation base main = 1dcf86a8af4ba3feb3a17d5a1817da647ce6137e
RS2-2 phase            = CLOSED
RS2-3 entry authorized = YES
release-simcore        = 47969d24771f6cc188df6e32150fc6fde519182d
production version     = 0.64.6
production blob        = 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

`release-simcore` is read-only input to this work item. No runtime/plugin source mutation is authorized.

## Scope lock

Allowed:

```text
.github/workflows/simcore-ci.yml
products/simcore/ci/**
products/simcore/tooling/check.mjs
products/simcore/tooling/ci/**
permanent-harness enrollment needed to preserve existing verification strength
RS2-3 implementation / shadow / promotion evidence
pure check-only predecessor retirement only after its frozen parity gate is satisfied
```

Forbidden:

```text
plugins/simcore/latest.js mutation
plugins/simcore/install.js mutation
release-simcore mutation
runtime semantic change
product-manifest repair by CI
sync-state --write from permanent CI
repo-main-write.py from permanent CI
repository ref mutation by permanent CI
release transaction replacement
RS2-4 implementation
```

## Entry administration evidence

At implementation start, GitHub reports:

```text
main protected = false
required status checks = off
```

The available repository connector exposes no branch-protection or repository-ruleset mutation action.

Classification:

```text
REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
= BLOCKER / ADMINISTRATION / TOOL_SURFACE
```

This does **not** block installing and shadow-verifying permanent read-only CI. It blocks only the RS2-3E claims that require actual repository enforcement:

```text
REQUIRED_CI_ACTIVE = YES
REQUIRED_CI_ENFORCEMENT_VERIFIED = YES
RS2_3_CLOSED = YES
RS2_4_ENTRY_AUTHORIZED = YES
```

The implementation therefore proceeds through the frozen `PROMOTION_READY` boundary and must not fabricate enforcement evidence.

## Permanent action pins selected

```text
actions/checkout   = 11d5960a326750d5838078e36cf38b85af677262
actions/setup-node = 49933ea5288caeca8642d1e84afbd3f7d6820020
actions/setup-python = a26af69be951a213d495a4c3e4e4022e16d87065
actions/upload-artifact = ea165f8d65b6e75b540449e92b4886f43607fa02
```

All permanent workflow external actions must remain full-SHA pinned.

## Required implementation outcomes before PROMOTION_READY

```text
permanent workflow installed                      PASS required
contents:read / no secrets / no writes            PASS required
PR classifier + explicit NOOP                      PASS required
MAIN_HEALTH full baseline                          PASS required
immutable candidate profiles                       PASS required
Batch A permanent regression                       PASS required
architecture/static gate                           PASS required
RS2-2 sync-state --check                           PASS required
legacy responsibility map complete                 PASS required
bounded legacy-compat ownership                    PASS required
3 positive shadows / diversity rules               PASS required
mandatory negative parity                          PASS required
no PERMANENT_GATE_WEAKER                           PASS required
runtime diff                                        NONE required
release-simcore diff                                NONE required
```

## Permanent CI first execution

Implementation PR: `#151`

```text
workflow       = SimCore CI
run            = 32637087508
Verify job     = 97188369974 / SUCCESS
Required job   = 97188394793 / SUCCESS
profile        = PR_MAIN
scope          = CI_SELF + HARNESS + SIMCORE_DOC_ONLY
production     = 47969d24771f6cc188df6e32150fc6fde519182d
source sha256  = 1f07668f418faf0029c37409c31545f146c27592ac37eff39fea8cdd0e599aac
Node           = 22.23
Python         = 3.12
report artifact= 9492595979
```

Executed permanent gates:

```text
GATE_CI_SELF    PASS
GATE_STATIC     PASS
GATE_ARCH       PASS
GATE_REGRESSION PASS
```

The base branch had no permanent predecessor verifier, so the current-trusted-lane step correctly recorded an initial-install condition rather than inventing a base permanent result.

The stable GitHub job name `Required` is operational. Repository enforcement is still inactive and is not inferred from the successful check.

## Shadow proof anomalies preserved before repair

### A. Unsupported legacy stdout detail

Observed run:

```text
workflow       = SimCore CI
run            = 32637377662
Verify job     = 97189053827 / FAILURE
profile        = PR_MAIN
permanent core = STATIC PASS / ARCH PASS / REGRESSION PASS
failure gate   = GATE_CI_SELF
reason         = RS2_3_SHADOW_PROOF_FAIL
```

Direct runner evidence showed the temporary shadow proof aborted only on this assertion:

```text
legacy robust runner exit = 0
proof parser expectation  = stdout contains literal `fixture 21: PASS`
actual result              = literal marker absent
```

Classification:

```text
RS2_3_SHADOW_EVIDENCE_PARSER_ASSUMPTION
= FIX / TEST_EVIDENCE / NON_RUNTIME
```

Source inspection established the actual stable legacy output contract:

```text
all 1-25 assertions pass
→ stdout: `v0.64.6 closure + timeline regression fixtures 1-25: PASS`
```

Fixture 21 itself directly asserts `INVALID_SOURCE` with reason `terminal-stored-airtime-mismatch`; the repair therefore checks the aggregate PASS signal rather than inventing per-fixture presentation output.

### B. Over-destructive COMMUNITY negative fixture

Observed run:

```text
workflow       = SimCore CI
run            = 32637534610
Verify job     = 97189427435 / FAILURE
permanent core = STATIC PASS / ARCH PASS / REGRESSION PASS
failure gate   = GATE_CI_SELF
reason         = RS2_3_SHADOW_PROOF_FAIL
```

The first parser repair worked far enough to reach the controlled COMMUNITY negative. That negative renamed the entire `reaction` module, causing the durable harness loader to lose a required module and correctly classify the case as infrastructure/fixture failure:

```text
expected proof result = semantic FAIL / exit 1
actual harness result = infrastructure error / exit 2
```

Classification:

```text
RS2_3_SHADOW_NEGATIVE_FIXTURE_OVERDESTRUCTIVE
= FIX / TEST_EVIDENCE / NON_RUNTIME
```

This again is **not** `PERMANENT_GATE_WEAKER`: the permanent core gates remained green in the same run. The repair preserves module loadability and mutates only the reaction predicate so both the durable suite and legacy semantic control reject the same behavior as a semantic failure.

Secondary evidence from both failed proof runs:

```text
Required receives Verify failure transitively
→ stable required job cannot report success when Verify fails
```

This proves fail propagation of the workflow graph. It does **not** prove repository merge enforcement because `main` remains unprotected.

Repair rule:

```text
do not change runtime
do not weaken permanent gates
repair only temporary evidence fixtures/parsers
rerun full shadow + negative parity
```

## First complete shadow parity pass

Observed run:

```text
workflow       = SimCore CI
run            = 32637669371
Verify job     = 97189755999 / SUCCESS
Required job   = 97189808457 / SUCCESS
verifier       = bdfcfdc5533a701fe5dd7624d1f928af2ec37c61
report artifact= 9492748252
```

Positive shadow identities:

```text
DEPLOYED_PRODUCTION
  source = 47969d24771f6cc188df6e32150fc6fde519182d
  permanent CANDIDATE_SHADOW = PASS
  legacy architecture       = PASS
  legacy robust 1-25        = PASS

HISTORICAL_CORRECTION_CANDIDATE
  source = db14a61862c3730582ad102a70d109348b7e1cb7
  permanent CANDIDATE_SHADOW = PASS
  legacy architecture       = PASS
  legacy robust 1-25        = PASS
```

Mandatory negative parity:

```text
latest/install mismatch            legacy FAIL · permanent FAIL · LATEST_INSTALL_MISMATCH
forbidden architecture module      legacy FAIL · permanent FAIL · ARCH_CONTRACT_FAIL
COMMUNITY reaction predicate       legacy FAIL · permanent FAIL · SEMANTIC_FAIL
closure terminal/stored mismatch   legacy expected INVALID_SOURCE · permanent expected INVALID_SOURCE
```

The permanent candidate profile used by the proof is the full candidate baseline, including:

```text
GATE_STATIC
GATE_ARCH
GATE_REGRESSION
GATE_STATE
GATE_COORDINATION
GATE_LEGACY_COMPAT
```

The proof records:

```text
permanentStrength = EQUIVALENT_OR_STRICTER_WITH_DURABLE_BATCH_A_PLUS_BOUNDED_LEGACY_COMPAT
runtimeMutation   = NONE
repositoryWrite   = NONE
```

This supplies two qualifying positive records under one verifier identity. The frozen diversity rule still requires another independent verifier identity before shadow verification can be promoted.

## Validation record

Permanent PR execution: **PASS**.
Shadow positive records: **2 qualifying**.
Shadow verifier identities: **1 qualifying**.
Mandatory negative parity: **PASS**.
`PERMANENT_GATE_WEAKER`: **NONE OBSERVED**.
Shadow equivalence status: **COLLECTING — diversity proof pending**.
Shadow evidence parser anomaly: **FIX / PRESERVED**.
Shadow semantic-negative fixture anomaly: **FIX / PRESERVED**.
