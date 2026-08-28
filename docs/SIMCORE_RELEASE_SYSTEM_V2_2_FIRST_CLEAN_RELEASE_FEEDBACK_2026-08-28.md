# SimCore Release System v2.2 — First Clean Runtime Release Feedback

Date: 2026-08-28 KST
Status: **CLEAN-PATH LIVE_PENDING PROOF RECORDED · NON-RUNTIME**
Scope: v0.64.9 `Session Transport Root Resolution`, from explicit release work item through permanent publication and durable `REAL_RELEASE_LIVE_PENDING`
Runtime mutation from this feedback: **NONE**
`release-simcore` mutation from this feedback: **NONE**

## 1. Executive verdict

R2.2 achieved its primary design goal on the first clean runtime release after implementation: it preserved R2.1 safety and simplicity while removing the two closure-integrity problems that motivated R2.2.

Observed clean path:

```text
explicit release work item #660
→ PR1 #663 product + release intent
→ generic candidate + durable machine receipt/spec shadow
→ PR2 #664 exact approval
→ permanent release run 33140598953
→ release-simcore = v0.64.9 exact candidate
→ main automatic LIVE_PENDING convergence
```

Observed PRs to LIVE_PENDING: **2**.
Observed recovery PRs: **0**.
Observed user manual pre-live GitHub actions: **0**.
Observed manual `release-simcore` mutation: **0**.

Human LIVE_PASS is still pending, so R2.2 is proven through LIVE_PENDING on this release but the full three-PR path through human closure is not yet re-proven by v0.64.9.

## 2. Clean release identity

```text
releaseId = simcore-v0.64.9-new-01
PR1 = #663
PR1 merge = 437ef403978bea05933ef8d239372edbd88c4d9a
candidate / production commit = 1c1037e44d6b3e903b3d622b579095b1f315758e
previous production = f5e29464452728f859a1a6a8191a846468353531
candidate / production blob = 7d2731d256b8aa18598c389fd919550cf3bbf146
PR2 = #664
PR2 merge = e9855cd915bc9c8049b1e1ab8de845fa81a74a4e
Permanent Release run = 33140598953
LIVE_PENDING main commit = c40e4ab434ee56300a91697d47f1ae43d9a217a7
live gate = 06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

Permanent Release jobs all completed successfully:

```text
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify = SUCCESS
Candidate Required / Required = SUCCESS
Publish Exact Candidate = SUCCESS
Declare Published State = SUCCESS
Permanent Release Required = SUCCESS
```

## 3. R2.2-A — Single Current-State Authority

Verdict: **PASS · GENUINE CLEAN RELEASE PROOF**

After v0.64.9 publication, `CURRENT_DEVELOPMENT.md` converged automatically to the new version, release commit/blob and active live gate through the machine-managed current-state blocks.

The human-authored operational section remained identity-free and explicitly subordinate to the machine-managed blocks. The v0.64.8-style duplicated human production verdict did not reappear.

Classification:

```text
R2_2_A_SINGLE_CURRENT_STATE_AUTHORITY
= PASS / CLEAN_RELEASE_PROVEN / PERMANENT_REGRESSION_OWNED
```

No follow-up implementation is required from this release.

## 4. R2.2-B — Blocker / work-item closure integrity

Verdict: **PASS ON CLEAN-PATH NON-CLOSURE · BLOCKER RECOVERY PATH NOT RE-EXERCISED**

Both runtime implementation and exact approval PRs used `Refs #660`; neither accidentally auto-closed the release work item.

After publication and LIVE_PENDING convergence, issue #660 remained open and received a durable publication handoff that explicitly records the remaining human live evidence requirement.

This confirms the useful clean-path property that code/release merges do not silently close the active work item.

However, v0.64.9 did not encounter a release-system blocker, so the full R2.2-B historical sequence:

```text
BLOCKER_ACTIVE
→ DEFECT_FIXED / RELEASE_RECOVERY_PENDING
→ RECOVERED / PRODUCTION_REOBSERVED
→ CLOSED
```

was not re-exercised by this release. That behavior remains qualified by the permanent `closure-integrity` historical replay and the v0.64.8 incident evidence.

Classification:

```text
R2_2_B_BLOCKER_INCIDENT_CLOSURE_SEMANTICS
= CLEAN_PATH_PASS / HISTORICAL_REPLAY_QUALIFIED / NO_NEW_BLOCKER_RUNTIME_PROOF
```

## 5. R2.2-C — Durable evidence first observability

Verdict: **PASS · NO REDESIGN NEEDED**

Final authority was established from durable release artifacts and exact identities rather than transient workflow observation:

```text
candidate receipt/spec shadow
→ exact candidate commit + parent + blob
→ permanent release result
→ release-simcore production identity
→ main LIVE_PENDING state
```

No wrong-run binding or release identity ambiguity was observed. Transient workflow status polling remained operational observation only and did not become release authority.

Classification:

```text
R2_2_C_DURABLE_EVIDENCE_FIRST_OBSERVABILITY
= WATCH_STAYS_WATCH / CLEAN_RELEASE_PASS / NO_IMPLEMENTATION_REQUIRED
```

## 6. Simplicity result

R2.2 promised not to turn closure correctness into extra release machinery. v0.64.9 confirms that promise held.

```text
steady-state PRs to LIVE_PENDING = 2  PASS
new clean-path approval step = 0      PASS
new publisher = 0                     PASS
new polling controller = 0            PASS
user manual pre-live GitHub action = 0 PASS
append-only candidate history = preserved
exact parent/candidate/blob binding = preserved
latest.js == install.js = preserved
human LIVE_PASS requirement = preserved
```

Compared with the R2.1 first genuine proof, there was no contract-drift learning tax and no recovery transaction.

## 7. Minor operational friction observed

### 7.1 Release work-item closure wording

Issue #660's original body says the issue remains open through LIVE_PENDING convergence, while the post-publication handoff states that HUMAN_EVIDENCE should be recorded before closure.

This is not a runtime or release-safety defect. The actual behavior is conservative and safe: the issue remains open.

Classification:

```text
WATCH / WORK_ITEM_CLOSURE_WORDING / NON_RUNTIME / NON_BLOCKING
```

Recommendation: do not add a new controller. When the next release-system design is opened, make the work-item lifecycle wording explicit: either `LIVE_PENDING handoff complete` or `HUMAN LIVE_PASS closure complete`, with one chosen close authority.

### 7.2 `scope:unclassified` label on the explicit release work item

Issue #660 received `scope:unclassified` from the repository control-plane classifier even though its SimCore release-work-item purpose is explicit.

No release gate, candidate, approval or publication behavior was affected.

Classification:

```text
WATCH / CONTROL_PLANE_SCOPE_LABEL_NOISE / NON_RUNTIME / NON_BLOCKING
```

Recommendation: leave this as WATCH unless it causes actual routing, authority or automation errors. Do not add classification machinery solely for cosmetic label cleanup.

## 8. Recommendation for the next release-system version

Do **not** redesign the R2.2 clean path now.

The highest-value next evidence is the remaining v0.64.9 human live gate and its PR3/closure behavior. R2.2 has now shown a clean two-PR path to LIVE_PENDING; the next system iteration should use actual LIVE_PASS closure evidence before changing the three-PR end-to-end contract.

Preserve as hard constraints:

```text
2 PRs to LIVE_PENDING
3 PRs through LIVE_PASS
0 manual pre-live GitHub actions for the user
1 permanent publisher
exact immutable candidate identity
fail-closed publication
machine-managed current-state authority
no new polling without wrong-run evidence
```

If a next release-system version is justified after LIVE_PASS, prefer a tiny lifecycle-language / closure ergonomics refinement over new automation.

## 9. Final classification

```text
R2_2_FIRST_CLEAN_RUNTIME_RELEASE
= PASS
  / LIVE_PENDING_PATH_CLEANLY_PROVEN
  / STABILITY_PRESERVED
  / SIMPLICITY_PRESERVED
  / TWO_PR_TARGET_MET
  / ZERO_RECOVERY_PR
  / ZERO_USER_PRELIVE_GITHUB_ACTION
  / HUMAN_LIVE_PASS_PENDING
```
