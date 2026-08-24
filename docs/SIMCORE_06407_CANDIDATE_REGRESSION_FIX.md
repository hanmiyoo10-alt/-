# SimCore v0.64.7 — Candidate Regression Harness Fix

Date: 2026-08-25
Status: **FIX ACTIVE · TEST HARNESS · NON-RUNTIME**

## 1. Direct failure evidence

Observable candidate-preparation run:

- workflow run: `32743819936`
- job: `97484387957`
- production parent: `47969d24771f6cc188df6e32150fc6fde519182d`

The following phases passed before the failure:

```text
exact release-simcore checkout PASS
frozen parent/blob binding PASS
v0.64.7 deterministic builder PASS
latest.js == install.js PASS
node syntax checks PASS
v0.64.7 source markers PASS
runtime diff allowlist PASS
```

The failure occurred only in `reload-cache-continuity` permanent regression:

```text
SUITE_ASSERTION_FAILED:
reload-cache-continuity: frozen fixture coverage: expected=10 actual=9
```

Candidate commit creation was therefore skipped and `release-simcore` remained unchanged.

## 2. Classification

```text
CANDIDATE_FIXTURE_COVERAGE_BOOKKEEPING_GAP
= FIX / TEST_HARNESS / NON_RUNTIME / DIRECT_EVIDENCE
```

This is not evidence of a v0.64.7 runtime defect.

Cause: the frozen fixture list includes `unchanged-reload-control`. The v0.64.6 baseline path recorded that control, while the v0.64.7 candidate path validated the existing in-memory transport behavior but did not record the fixture id. The final exact fixture-count assertion therefore produced `9/10`.

## 3. Repair

For the v0.64.7 candidate path:

```text
assert __SIMCORE_TELEMETRY_HANDOFF_V1__ memory key remains present
→ record unchanged-reload-control PASS
→ continue all new sessionStorage transport cases
→ require exact frozen fixture coverage 10/10
```

This turns the missing bookkeeping entry into a real compatibility assertion rather than weakening the fixture count.

## 4. Frozen boundaries

No runtime builder/source change is made by this fix.

```text
runtime semantics: UNCHANGED
candidate payload intent: UNCHANGED
release-simcore mutation: NONE
provider cache authority: UNVERIFIED
SnapshotStore / Session / Prompt / Representation / Edit Reconcile: FROZEN
```

After permanent CI passes, rerun the observable candidate-preparation transaction. Any new failure must be preserved before retry.
