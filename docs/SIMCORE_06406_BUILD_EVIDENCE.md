# SimCore v0.64.6 Build Evidence

Date: 2026-08-23
Release: `v0.64.6 — Post-B_END C Clock Handoff Authority`
Status: `DEPLOYED CANDIDATE · PRE-LIVE BLOCKER UNDER REPAIR`

## Attempt 1

Workflow: `SimCore v0.64.6 Post-B_END C Clock Handoff Build`
Run: `32625494413`
Job: `97160102697`
Result: `FAIL / BUILD_HARNESS_FALSE_NEGATIVE`

Observed stage results before failure:

```text
checkout production-parent work branch       PASS
load/compile scoped patch                    PASS
capture frozen surfaces                      PASS
apply v0.64.6 scoped patch                   PASS
node syntax latest/install                   PASS
latest.js == install.js                      PASS
version/release markers                      PASS
Contracts v2 architecture                    PASS
```

Failure occurred only when the ad-hoc fixture loader evaluated a broad module slice and rejected an unrelated `SimCore.define("recurrence", ...)` encountered between the requested module and the chosen end marker:

```text
Error: unexpected module recurrence
```

Classification:

```text
BUILD_HARNESS_FALSE_NEGATIVE
= FIX / DIRECT_EVIDENCE / NON_RUNTIME
```

Disposition:

- preserve the runtime patch script unchanged;
- replace only the ad-hoc module loader with a loader that ignores unrelated module definitions inside the bounded slice;
- rerun the complete v0.64.6 static/regression gate;
- do not deploy from the failed work tree.

---

## Attempt 2 — corrected v2 harness

Workflow: `SimCore v0.64.6 Post-B_END C Clock Handoff Build v2`
Run: `32625625999`
Job: `97160424303`
Result: `PASS`

Validated work commit:

```text
4badfd3cf25a1aab89d274cb7941c90a7a331f0e
parent 6c43c8167375b836a87277c005c63f93b028dde4
```

Observed gates:

```text
node syntax latest/install                         PASS
latest.js == install.js                           PASS
Contracts v2                                     PASS
timeline regression consolidation fixtures 1-18  PASS
v0.64.5 COMMUNITY multiline control              PASS
Representation exact / Fresh fast controls       PASS
genuine-edit relation controls                   PASS
Summary Scope controls                            PASS
B_END terminal airtime control                    PASS
frozen Community/Reaction/Representation regions PASS
protected host/storage/network/timer counts       PASS
persistent Broadcast->Narrative coupling          NONE
```

The validated candidate was deployed to `release-simcore` through PR #105.

Candidate deployment commit:

```text
f77af7ad180fc7f1806a759e73e68cfdadc0e712
```

This deployment has **not** received the real long-chat close gate and is not a completed release.

---

## Pre-live source review — closure-completion eligibility gap

After candidate deployment, the frozen v0.64.6 design was re-compared with the deployed source before live validation.

Frozen eligibility requires the direct first C to follow a **successfully completed** B_END, including:

```text
end authority ALLOWED
closure COMPLETE
terminal canonical timestamp valid
broadcast unlocked/closed
```

The deployed candidate currently derives the clock bridge from bounded state/lineage facts equivalent to:

```text
current mode C
previousMode B_END
broadcast unlocked
broadcastAirtime present
previous request family B
```

Direct source inspection also proves that B_END finalization can leave:

```text
state.broadcastLocked = false
state.lastMode = B_END
```

even when output Structure is quarantined or COMMUNITY validation is not clean. Therefore `previousMode + unlocked + terminal state` alone is not proof that the previous B_END had `Broadcast closure: COMPLETE`.

Classification:

```text
POST_B_END_CLOSURE_COMPLETION_GATE_GAP
= BLOCKER / FIX / DIRECT_SOURCE_EVIDENCE / PRE_LIVE
```

This is a scope-completeness defect in the initial v0.64.6 candidate, not a new product goal.

### Repair boundary

Keep version/release goal unchanged and harden the eligibility gate before live validation:

1. derive bounded facts from the directly preceding visible assistant output using existing owners;
2. Structure judges B_END COMMUNITY/output validity;
3. Time judges explicit monotonic B_END terminal timestamp;
4. Lifecycle alone decides whether those facts make the post-B_END C bridge eligible;
5. Time verifies the terminal source against the stored B_END airtime and selects the effective minimum floor;
6. Session only gathers/passes bounded prior-output facts; it does not own a second clock decision tree;
7. no raw prior output is retained in state or diagnostics;
8. no persistent field/schema/key is added;
9. reload remains fail-closed because prior-output facts are reconstructed from visible history rather than memory-only state.

### Required new negative controls

```text
B_END COMMUNITY/Structure invalid -> immediate C INELIGIBLE
B_END terminal missing/invalid    -> immediate C INELIGIBLE
B_END terminal != stored airtime  -> INVALID_SOURCE / ordinary Narrative
non-direct B_END -> ... -> C       -> INELIGIBLE
```

The earlier 18 regression controls remain required.

### Release disposition

```text
v0.64.6 COMPLETE      NO
real long-chat gate   BLOCKED UNTIL REPAIR DEPLOYED
v0.65.0 M2-3          BLOCKED
candidate f77af7ad... PRE-LIVE SUPERSEDED CANDIDATE after corrected v0.64.6 deployment
```

Do not perform final `CURRENT_DEVELOPMENT` / durable-memory close sync until the corrected v0.64.6 passes real long-chat validation.
