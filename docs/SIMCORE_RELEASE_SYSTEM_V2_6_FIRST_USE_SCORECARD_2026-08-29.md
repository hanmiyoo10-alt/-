# SimCore Release System R2.6 First-Use Scorecard

Date: 2026-08-29 KST

Status: **FIRST-USE SCORECARD · CORE PASS · ADMIN CONVERGENCE REMAINS**

Primary evidence:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_V06700_FIRST_USE_OPERATIONAL_FEEDBACK_2026-08-29.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_POST_PUBLISH_BOUNDARY_CONVERGENCE_DESIGN.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_6_IMPLEMENTATION_CLOSURE_2026-08-29.md`

## Overall score

```text
R2.6 FIRST GENUINE USE SCORE = 91 / 100
GRADE = A-
DISPOSITION = KEEP CORE / CLOSE ADMIN DEBT
```

This score treats first-use safety behavior as more important than first-attempt smoothness. R2.6 caught a genuine control-plane defect before publication and preserved zero production mutation. The score is held below the mid-90s because the first use exposed a real cross-root topology defect and because activation/status truth remains stale after genuine production use.

## Category scores

| Category | Score | Verdict |
|---|---:|---|
| Core architecture / ownership convergence | 9.7 / 10 | STRONG PASS |
| Preplay fail-before-publish safety | 10.0 / 10 | DIRECT OPERATIONAL PROOF |
| Authority preservation / candidate immutability | 9.8 / 10 | STRONG PASS |
| Post-publish shared convergence | 9.3 / 10 | PASS AFTER FIX |
| Durable reobservation / evidence quality | 9.5 / 10 | STRONG PASS |
| Regression / topology coverage | 8.4 / 10 | IMPROVE ROOT-AWARE COVERAGE |
| Recovery / rerun operator ergonomics | 8.3 / 10 | WATCH |
| Administrative truth / activation semantics | 7.2 / 10 | FIX REQUIRED |
| Maintainability / duplication reduction | 9.6 / 10 | STRONG PASS |
| Operational closure readiness | 8.2 / 10 | NOT YET CLOSED |

## Why the score is high

1. `PREPLAY BEFORE PUBLISH` proved itself under genuine release pressure.
2. A real control-plane defect produced zero `release-simcore` mutation.
3. The same immutable candidate survived the control-plane repair.
4. No second publisher, force publication, candidate rebuild, new lifecycle state, or automatic HUMAN_EVIDENCE authority was introduced.
5. The repaired fresh Permanent Release completed through shared owner, main gate, and durable reobserver.
6. The architecture removed duplicated workflow-local post-publish semantics instead of weakening verification.

## Why it is not 95+

### -4 points: first-use cross-root topology defect

The first genuine preplay failed because a root-aware tool path was tested primarily under `cwd == root`, while GitHub Actions exercised `cwd != root`.

The specific path was fixed and the failure itself demonstrated preplay safety, but a first-use control-plane failure still counts against implementation polish.

Classification:

```text
CROSS_ROOT_REPORT_BINDING_DEFECT = FIXED
GENERAL_ROOT_AWARE_TOOLING_CONTRACT = FOLLOW-UP HARDENING
```

### -3 points: activation/status truth drift

R2.6 has genuinely executed in production, while living status still says activation pending and its regression still encodes `activationAuthorized=false`.

Classification:

```text
R2_6_ACTIVATION_STATUS_DRIFT = FIX REQUIRED
R2_6_ACTIVATION_GATE_SEMANTICS = FIX / CLARIFY
```

This does not invalidate the release path, but it prevents clean R2.6 operational closure.

### -2 points: frozen-verifier rerun ergonomics

After Resolve freezes verifier identity, a later control-plane fix requires a fresh Permanent dispatch rather than rerunning only failed jobs. The authority behavior is correct, but the operator-facing diagnostic is not yet explicit enough.

Classification:

```text
R2_6_FROZEN_VERIFIER_RERUN_ERGONOMICS = WATCH
```

## Threshold interpretation

```text
95-100 = operationally polished and administratively converged
90-94  = strong production architecture with bounded follow-up debt
85-89  = sound but meaningful operational rough edges remain
80-84  = usable with notable control-plane risk/debt
<80    = redesign or substantial stabilization recommended
```

R2.6 lands in the `90-94` band because its safety architecture succeeded under real failure, while its administrative/control-plane lifecycle still needs convergence.

## Path to 95+

The score can reasonably rise to approximately 96 after all of the following are demonstrated:

```text
activation/status truth converged
activation semantics explicitly defined
root-aware tooling contract covered with cwd != root regressions
bounded stale-verifier rerun guidance added
next genuine release completes preplay -> publish -> main gate -> reobserve first try
```

The next clean-path release is confirmation, not a prerequisite for recognizing v0.67 as valid first-use proof.

## Final verdict

```text
CORE DESIGN          = KEEP
SAFETY               = EXCELLENT
FIRST-USE VALUE      = PROVEN
IMPLEMENTATION POLISH= GOOD, ONE REAL DEFECT FIXED
ADMIN TRUTH          = NEEDS FIX
OPERATOR UX          = WATCH
OVERALL               = 91 / 100 (A-)
```

R2.6 is not a failed release-system revision. Its strongest feature already paid for itself: a real defect became a prepublication failure instead of a production incident. The remaining deductions are mainly for control-plane polish and administrative truth convergence, not for the core release safety model.
