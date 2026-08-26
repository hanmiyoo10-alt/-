# Canonical Main Phase K — Implementation Evidence

Phase K implements the v2 simplification and stability design from issue #433 without changing product/runtime/release authority.

## Implementation merge

- Implementation PR: #434
- Verified implementation head: `67cbffb9b3dc3c733176e14a31d9bc31e3f3376b`
- Squash merge on canonical `main`: `cc0c5e73f87832a4e0864ef1f5c53387490e9e50`
- Pre-merge Plugin Control Plane CI: run `32923104000`, contract job `98040447558` — SUCCESS
- Pre-merge SimCore CI: run `32923104075`
  - Verify `98040445325` — SUCCESS
  - Required `98040481923` — SUCCESS

## Exact-main healthy proof

For merge SHA `cc0c5e73f87832a4e0864ef1f5c53387490e9e50`:

- SimCore CI push run `32923252797`
  - Verify `98040893344` — SUCCESS
  - Required `98040944706` — SUCCESS
- Canonical Main Protection Guard run `32923281332`
  - Recover Failed Exact Main `98040974848` — SUCCESS
  - Attempt Native Protection `98040974918` — SUCCESS as bounded controller
- #305 converged to `CLEAR / STABLE`
- production authority remained `MATCH`
- bootstrap remained `COMPLETE` 6/6
- notification bridge remained `HEALTHY / ACTIVE_PROVEN`
- native GitHub branch protection remained truthfully `READY_TO_ACTIVATE / protected:false`; soft fallback remained active and explicitly non-equivalent.

## Phase K behavior now under proof

- public operator vocabulary remains exactly `CLEAR / ATTENTION / INCIDENT / UNKNOWN`;
- normal dependent work is explained by convergence metadata rather than a fifth state;
- protection-guard terminal fallback is `PROTECTION_GUARD_FAILED`, not `MEMORY_SYNC_FAILED`;
- active runtime policy no longer carries optional external-GitHub-App or completed rehearsal identity;
- incident records preserve cumulative open/recovery/flap diagnostics outside bounded display history;
- excessive recent reopens project bounded P2 `UNSTABLE_COMPONENT` attention instead of new P1 identities;
- #305 presents compact Tier-1 state while retaining full evidence under Operational details.

## Live incident-cycle proof

The first K5 proof exposed a rehearsal-only race rather than a canonical-main failure: the synthetic rehearsal began after `Canonical Main Operations` while exact-main Required was still legitimately converging, then a concurrent documentation commit advanced `main`. The interrupted synthetic #333 was explicitly cleaned up as recovered and retained as audit evidence.

Phase K finalization hotfix:

- Hotfix PR: #436
- Verified hotfix head: `56dc902112538d81b3dce6665756ca522b9d5dbb`
- Squash merge on canonical `main`: `8106eddf7b8400d39b31b06fb584cbf974f55e02`
- Pre-merge Plugin Control Plane CI: run `32924065551` — SUCCESS
- Pre-merge SimCore CI: run `32924065575`
  - Verify `98043257888` — SUCCESS
  - Required `98043301545` — SUCCESS
- Post-merge exact-main SimCore CI: run `32924158659`
  - Verify `98043518776` — SUCCESS
  - Required `98043559306` — SUCCESS
- Protection Guard follow-up run `32924179762`
  - Attempt Native Protection `98043579797` — SUCCESS as bounded controller
  - Recover Failed Exact Main `98043579983` — SUCCESS
- An earlier guard attempt `32924159537` failed only its exact-main confirmation after the target moved; the later exact-tip guard above succeeded and is the current proof.

The hotfix moves the synthetic rehearsal trigger behind successful `Canonical Main Protection Guard` convergence and adds bounded stale-main handling. If the exact proof SHA remains current, the rehearsal must complete the same-correlation `OPEN → RECOVERED` cycle. If `main` advances during the proof, it must instead recover any old-SHA synthetic OPEN and exit successfully as `CANONICAL_MAIN_REHEARSAL:STALE_MAIN_SKIP`, never leaving a synthetic P1 behind.

This final evidence-only transaction is intentionally merged with the `[phase-h-rehearsal]` marker. Final workflow outcome, #333 state, #305 state, and exact identifiers are recorded in issue #433 and audit issue #293 after completion. Native GitHub branch protection remains a separately read-back fact and must not be inferred from a passing guard or Required run.
