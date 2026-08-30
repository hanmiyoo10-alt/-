# SimCore R2.8 Operational Feedback

Date: 2026-08-30 KST
Status: FEEDBACK REFRESHED · NO IMPLEMENTATION AUTHORIZATION
Classification: RELEASE-SYSTEM FEEDBACK · POST-FIRST-GENUINE-USE · NON-RUNTIME

## Authority snapshot

R2.8 remains `OPERATIONALLY_PROVEN_FIRST_GENUINE_USE_PASS` with disposition `STABILITY_SIMPLICITY_BOUNDED_AUTOMATION`.

This feedback does not authorize R2.9 and does not change runtime or `release-simcore`.

Preserved authorities remain correct:
- exactly one production publisher: `RS2_4_PERMANENT`
- exactly one main writer: `repo-main-write.py`
- HUMAN_EVIDENCE required for LIVE_PASS
- no automatic LIVE_PASS decision
- no automatic checkpoint/priority selection
- no background polling or retry

## Positive feedback

### KEEP: the R2.8 trust boundary is still correct

R2.8 cleanly separates human authority from machine bookkeeping. The human decides LIVE_PASS; the system may only derive and execute terminal convergence after accepted HUMAN_EVIDENCE exists.

The first genuine v0.68 use proved this boundary under failure as well as success. It failed closed on fixture-state contradiction, then converged successfully after the bounded correction and reached `ALREADY_DURABLE` without creating a second publication or main-write authority.

Disposition: `KEEP · FROZEN`.

## New operational evidence since the first feedback draft

### FIX strengthened: validation fixture / exact-version isolation is a recurring structural edge

The v0.70.0 candidate qualification again exposed the same broader family of release-system sharp edge, this time before publication:

1. PR #932 failed closed at `PR1_DRY_QUALIFICATION_FAIL` because the v0.70.0 candidate was routed into exact-version validation wrappers that terminated at v0.69.2.
2. After explicit v0.70 wrapper inheritance was added, the verifier failed closed again because `builder-v07000` had been registered without its required fixture directory.
3. Both failures were validation/control-plane only. Production stayed on v0.69.2 until the repair passed CI.
4. The repair landed separately via PR #933; the unchanged candidate intent was then reissued and qualified successfully.

This strengthens the earlier conclusion: release validation should make historical/current identity boundaries explicit and mechanically complete. A new runtime version should not require discovering scattered exact-version bridge omissions one by one through release qualification.

Recommended classification: `FIX · RELEASE_VALIDATION_VERSION_AND_FIXTURE_ISOLATION · SEPARATE_TASK`.

Do not mix this with runtime feature work or with R2.8 terminal-convergence semantics.

### WATCH improved: release-initiation ergonomics now has a proven ordinary path

The earlier v0.69.1 operation required a temporary one-shot fresh-dispatch bridge. That justified a WATCH for release initiation/control-plane ergonomics outside R2.8.

v0.70.0 provides positive counter-evidence:
- Generic Candidate Materialize created the immutable candidate and durable receipt/spec shadow.
- Exact Approval Activation accepted exactly the approval + machine-derived spec transaction.
- The activation workflow created a fresh `SimCore Permanent Release` workflow_dispatch automatically.
- Permanent Release completed authorization, Candidate Required, exact publication, published-state declaration and final required gate successfully.
- No temporary dispatch bridge was introduced.

This means the release-initiation gap is materially improved on the current canonical path.

Recommended classification: `WATCH · IMPROVEMENT_PROVEN · KEEP_VISIBLE_UNTIL_REPEATED`.

Do not mark fully retired from one success, but do not treat it as an active R2.8 defect.

### DEFER unchanged: predecessor fallbacks should remain for now

R2.8 still has only one completed genuine HUMAN_EVIDENCE terminal convergence recorded in its own operational proof. v0.70.0 is currently published `LIVE_PENDING`; its R2.8 terminal convergence has not yet been closed by human evidence.

Therefore the existing retirement candidates remain deferred:
- predecessor active admin transition retirement
- predecessor durable-memory sync command retirement
- full predecessor root-helper mechanical migration

Recommended classification: `DEFER · WAIT_FOR_ANOTHER_ORDINARY_HUMAN_EVIDENCE_TERMINAL_CLOSE`.

### WATCH unchanged: GitHub Actions Node20 action runtime deprecation

This remains nonblocking but should stay visible until the workflow dependency surface is fully clear of the deprecated runtime.

Recommended classification: `WATCH`.

## R2.8 posture after v0.70 publication

```text
R2.8 core architecture                   = KEEP / FROZEN
R2.9                                    = NOT JUSTIFIED
validation version + fixture isolation   = FIX / SEPARATE RELEASE-SYSTEM TASK
release-initiation ergonomics            = WATCH / IMPROVEMENT PROVEN
predecessor fallback retirement          = DEFER
Node20 action runtime deprecation         = WATCH
v0.70 R2.8 terminal convergence           = NOT YET EXERCISED / LIVE_PENDING
```

## Recommended next action

Do not start R2.9.

Finish the v0.70 real long-chat gate first. If HUMAN_EVIDENCE reaches LIVE_PASS, run the existing R2.8 terminal convergence unchanged. If that closes ordinarily without recovery surgery, record it as the second genuine-use proof and then reconsider predecessor fallback retirement as a separate cleanup task.

Separately, the validation version/fixture isolation issue is now recurrent enough to deserve its own bounded design task. That task should target release qualification mechanics only and must not alter R2.8 human authority or production publication ownership.

## Overall assessment

R2.8 remains a net success and should stay frozen.

The strongest new signal is that the control plane is becoming more ordinary around it: v0.70.0 candidate materialization, exact approval activation and Permanent Release all succeeded without a one-shot dispatch bridge. The strongest remaining weakness is not terminal convergence but the release-validation surface around new exact versions and fixtures.

Recommended disposition:

`KEEP R2.8 · DO NOT START R2.9 · FIX VALIDATION VERSION/FIXTURE ISOLATION SEPARATELY · KEEP RELEASE-INITIATION WATCH UNTIL REPEATED · DEFER PREDECESSOR RETIREMENT UNTIL SECOND ORDINARY TERMINAL CLOSE`.
