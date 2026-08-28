# SimCore v0.65.0 Candidate Required Architecture Contract Blocker

Date: 2026-08-28
Classification: `FIX · BLOCKER · PRODUCTION_EXPOSURE_NONE`
Status: `RECORDED · INVESTIGATION_ACTIVE · RELEASE_STOPPED`

## Release Identity

- release: `simcore-v0.65.0-new-02`
- approved candidate ref: `candidate/simcore/simcore-v0.65.0-intent-02`
- candidate commit: `ddae3dbe4860f2729bdef55fff9818eac5cf646f`
- expected production commit: `7765ad75359f8d9736a7dea65141e4e45b713c10`
- approved candidate release blob: `1b38e2b2874f2581edae8f1080edc39558febefa`
- approval merge: `14b0d059c80dba7cc8cbeb24ccc479a1f1f53c05`

## Trigger / Evidence

Exact approval activation run `33166865397` resolved the delegated approval boundary successfully and dispatched permanent release run `33166874822`.

Permanent release stopped before publication because `Candidate Required / Verify` failed.

Gate result from run `33166874822`:

| Gate | Result |
| --- | --- |
| `GATE_STATIC` | PASS |
| `GATE_ARCH` | **FAIL · `ARCH_CONTRACT_FAIL`** |
| `GATE_REGRESSION` | PASS |
| `GATE_STATE` | PASS |
| `GATE_COORDINATION` | PASS |
| `GATE_LEGACY_COMPAT` | PASS |

Candidate source identity reported by the Required verifier:

- `latestSha256 = 9771389188cddb7db4b51e36531af29f20e23f80d0a5cd78c07d74a119eb069e`
- `installSha256 = 9771389188cddb7db4b51e36531af29f20e23f80d0a5cd78c07d74a119eb069e`
- bytes: `552833`

Thus `latest.js == install.js` remained intact at the candidate boundary.

## Production Safety

`Publish Exact Candidate` and `Declare Published State` were both skipped. Production was not mutated.

At incident capture time `release-simcore` remains v0.64.11. This blocker therefore has `PRODUCTION_EXPOSURE_NONE`.

## Ownership-Scoped Diagnosis

Primary investigation owner: SimCore Contracts v2 architecture contract / architecture drift guard.

The permanent `GATE_ARCH` runs:

`python3 scripts/simcore-architecture-check.py --source <candidate latest> --source <candidate install>`

The current contract (`config/simcore-architecture-v2.json`) still describes `edit-reconcile` as `physical: planned` / `status: m2_next_after_representation_live_gate`, while v0.65.0 is the authorized M2-3 physical extraction and the candidate adds a direct Session -> `edit-reconcile` dependency. The current `session.allowed_dependencies` list does not yet include `edit-reconcile`.

This is the leading architecture-contract drift hypothesis and must be proven with the exact candidate graph before repair. Do not alter candidate bytes or bypass Required verification.

## Release Stop Rule

Until `GATE_ARCH` passes under the permanent `CANDIDATE_REQUIRED` verifier:

- do not mutate `release-simcore` manually;
- do not bypass or weaken the architecture gate;
- do not claim v0.65.0 published;
- do not begin real long-chat Stage A/B acceptance;
- preserve the approved candidate identity unchanged unless evidence requires a new runtime candidate.

## Repair Boundary

Preferred repair, if the hypothesis is confirmed: update only the architecture contract to reflect the already-authorized M2-3 physical ownership move, then run architecture/static/CI validation and re-enter the exact release transaction according to release-system authority rules.

If runtime candidate bytes require any change, create a new immutable candidate/receipt/spec/approval chain instead of mutating the approved candidate.

## Ownership-Scoped Workflow Feedback

This incident is also first-use evidence for ownership-scoped update work: the failure is isolated to the architecture owner while all other permanent gates pass. Read scope should remain bounded to the architecture contract, checker, M2-3 design/evidence, candidate dependency graph, and exact-release re-entry contract unless new evidence forces escalation.
