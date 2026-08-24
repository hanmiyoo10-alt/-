# SimCore v0.64.7 — Candidate Preparation Activation Evidence

Date: 2026-08-25
Status: **CANDIDATE READY · IMMUTABLE IDENTITY FROZEN · NON-PRODUCTION**
Parent production: `v0.64.6` / `47969d24771f6cc188df6e32150fc6fde519182d`
Candidate: `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`
Candidate release blob: `676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0`

## 1. Initial observability anomaly

The permanent v0.64.7 verifier/support PR `#234` and activation PR `#236` both passed permanent SimCore CI and merged, but the expected candidate transport ref was not immediately visible through the connected repository surface.

Classification:

```text
CANDIDATE_PREP_PUSH_RESULT_NOT_OBSERVABLE
= FIX / HARNESS / NON_RUNTIME
```

The one-shot observable workflow was therefore added by PR `#237` so candidate preparation runs could be inspected through pull-request-associated Actions evidence.

## 2. First observable activation

Run `32743819936` proved:

```text
exact v0.64.6 parent/blob binding PASS
v0.64.7 deterministic builder PASS
latest.js == install.js PASS
node syntax/source boundary PASS
```

The run stopped in permanent regression before candidate creation with:

```text
reload-cache-continuity: frozen fixture coverage: expected=10 actual=9
```

Classification:

```text
CANDIDATE_FIXTURE_COVERAGE_BOOKKEEPING_GAP
= FIX / TEST_HARNESS / NON_RUNTIME / DIRECT_EVIDENCE
```

PR `#240` converted the missing bookkeeping entry into a real compatibility assertion for the existing globalThis memory handoff and retained exact 10/10 fixture coverage.

## 3. Retry evidence and candidate discovery

After PR `#240` passed permanent `Verify / Required`, retry activation PR `#241` also passed permanent `Verify / Required` and merged.

Observable run `32744469902`, job `97486567099` then proved:

```text
v0.64.7 deterministic builder PASS
runtime source/static boundary PASS
RS2-1 batch-a PASS: 6 suites
reload-cache-continuity PASS
```

Its final candidate commit step stopped with:

```text
06407_CANDIDATE_REF_ALREADY_EXISTS
a7ce8ce33a97797630f885c6753415e4b2ccc7fc
```

This showed the original push-based candidate preparation had already produced the immutable candidate even though the connected surface had not exposed it during the earlier observation window.

Classification:

```text
CANDIDATE_RETRY_EXACT_REF_ALREADY_EXISTS
= WATCH / IDEMPOTENCY / R_FEEDBACK / NON_RUNTIME / NON_BLOCKING
```

Do not overwrite or regenerate the ref during this release. A later R hardening item may make an exact-existing candidate retry resolve as an explicit NOOP/PASS when identity matches, while continuing to fail on conflicting refs.

## 4. Frozen candidate identity

Direct repository verification proves:

```text
P = 47969d24771f6cc188df6e32150fc6fde519182d
C = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
parent(C) = P
ahead_by = 1
changed paths = plugins/simcore/latest.js + plugins/simcore/install.js only
latest blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
install blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
candidate version = 0.64.7
```

Candidate ref:

`candidate/simcore-06407-reload-cache-continuity`

The candidate is transport only and has no production authority.

## 5. Release authorization

The immutable release instance is:

`products/simcore/releases/specs/simcore-v0.64.7-new-01.json`

Publication must remain exclusively owned by permanent R:

```text
immutable spec on main
→ exact C/P CANDIDATE_REQUIRED
→ RS2_4_RELEASE permanent caller
→ release-simcore fast-forward P → C
→ exact C re-observation
→ post-publish LIVE_PENDING state sync
```

`LIVE_PASS`, permanent authority cutover, legacy retirement, and `RS2_4_CLOSED` remain forbidden until real long-chat evidence exists.

## 6. Temporary observable harness cleanup

`.github/workflows/product-simcore-06407-candidate-prep-observable.yml` is a temporary candidate-observability harness.

After candidate identity is durably preserved and production publication no longer depends on it, remove it as a separate non-runtime cleanup. Do not treat it as release authority.
