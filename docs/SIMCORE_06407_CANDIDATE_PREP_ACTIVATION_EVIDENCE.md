# SimCore v0.64.7 — Candidate Preparation Activation Evidence

Date: 2026-08-25
Status: **FIX ACTIVE · NON-RUNTIME · PRE-CANDIDATE**
Parent production: `v0.64.6` / `47969d24771f6cc188df6e32150fc6fde519182d`

## 1. Observed anomaly

The permanent v0.64.7 verifier/support PR `#234` merged successfully and the first activation PR `#236` also passed `SimCore CI / Verify` and `SimCore CI / Required` before merge.

After both main pushes, the expected transport ref:

`candidate/simcore-06407-reload-cache-continuity`

was still absent when checked through the connected repository surface.

Classification:

```text
CANDIDATE_PREP_PUSH_RESULT_NOT_OBSERVABLE
= FIX / HARNESS / NON_RUNTIME
```

No evidence supports a runtime defect. No `release-simcore` mutation occurred.

## 2. Narrow repair

Install a one-shot observable candidate-preparation workflow:

`.github/workflows/product-simcore-06407-candidate-prep-observable.yml`

It is deliberately constrained to a merged same-repository PR whose exact title is:

`SimCore v0.64.7 candidate activation`

The workflow:

```text
checks out exact v0.64.6 production P
→ loads the already-merged product builder from main
→ builds v0.64.7 latest/install
→ requires latest == install
→ runs node syntax checks
→ runs permanent batch-a including reload-cache-continuity
→ creates only candidate/simcore-06407-reload-cache-continuity
```

It does not write `release-simcore` and has no release authority.

Because the run is attached to a pull-request event, its run/jobs/logs are observable through the connected GitHub surface if it fails.

## 3. Cleanup rule

The observable workflow is temporary release harness only.

After an immutable candidate is successfully created and its identity/evidence are preserved, remove the observable workflow before or with release-state cleanup. Do not promote it into permanent R architecture during the v0.64.7 runtime work item.

## 4. Authority boundary

Production publication remains exclusively owned by permanent R:

```text
candidate C
→ immutable release spec on main
→ exact C/P CANDIDATE_REQUIRED
→ RS2_4_RELEASE permanent caller
→ release-simcore fast-forward
→ post-publish LIVE_PENDING state sync
```

`LIVE_PASS`, authority cutover, legacy retirement, and `RS2_4_CLOSED` remain forbidden until real long-chat evidence exists.
