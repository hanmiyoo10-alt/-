# SimCore v0.69.1 Permanent Release Architecture Contract Blocker

Date: 2026-08-30 KST

Status: **BLOCKER · FIX AUTHORIZED · VALIDATION/CONTROL_PLANE · NON_RUNTIME · PRODUCTION UNCHANGED**

## Observation

The exact v0.69.1 release approval transaction reached the permanent release verifier but publication was stopped before any `release-simcore` mutation.

```text
releaseId          simcore-v0.69.1-new-06
permanent run      33284490320
main verifier      21a62c98edd6aa1031102a27a1cbbfe2fe006433
production         31b4c5075659a55861731c6fd73f999402321e94 / v0.69.0
candidate          5dc5ec1099c6097a6a0e46effeb826889a4741c3 / v0.69.1
candidate blob     de764f2c98174aa7f8ae8dc356d83aa6851b3745
```

Candidate Required result:

```text
GATE_STATIC         PASS
GATE_ARCH           FAIL / ARCH_CONTRACT_FAIL
GATE_REGRESSION     PASS
GATE_STATE          PASS
GATE_COORDINATION   PASS
GATE_LEGACY_COMPAT  PASS
```

Candidate source identity remained coherent:

```text
latest sha256  1cdae0f8371b95351455dcdf87227e7dbf647735a7b898adbc6e3a161f46de46
install sha256 1cdae0f8371b95351455dcdf87227e7dbf647735a7b898adbc6e3a161f46de46
latest == install YES
```

## Diagnosis

The architecture contract selector correctly canonicalizes patch release `0.69.1` to:

```text
config/simcore-architecture-v06901-candidate.json
```

That sidecar did not exist on the exact verifier commit. The selector therefore fell back to:

```text
config/simcore-architecture-v2.json
```

The default contract still represents the older pre-M2-6 architecture authority, so the already-qualified v0.69.1 candidate was checked against the wrong architecture graph and failed closed.

This is not evidence of a runtime regression. The v0.69.1 design freezes the complete v0.69.0 M2-6 State Reconcile architecture unchanged. The candidate also passed static, regression, state, coordination and legacy compatibility gates in the same exact permanent verification transaction.

## Authorized repair boundary

Repair only the missing version-bound architecture sidecar:

1. add `config/simcore-architecture-v06901-candidate.json`;
2. inherit the exact frozen v0.69.0 M2-6 module graph and dependency policy;
3. update only patch-release identity metadata to v0.69.1 / Refreshless Targeted Update Liveness Repair;
4. add executable selector coverage proving v0.69.1 resolves to the exact sidecar;
5. do not modify candidate runtime bytes;
6. do not modify `release-simcore` directly;
7. rerun permanent qualification only after main CI accepts the control-plane fix.

Forbidden in this fix:

```text
runtime/plugin semantic change
M2-7 work
module ownership movement
persistent schema/version changes
release-system topology redesign
selector fallback broadening
new publisher/main writer
```

## Classification

```text
V06901_PERMANENT_RELEASE_ARCH_CONTRACT = BLOCKER
DISPOSITION                            = FIX
FAULT_DOMAIN                           = VALIDATION_CONTROL_PLANE
RUNTIME_CAUSAL                         = NO EVIDENCE
RELEASE_SIMCORE_MUTATION               = NONE
CURRENT_PRODUCTION                     = v0.69.0
```
