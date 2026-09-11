# SimCore #2006 PR_RECOVERY Verifier Profile Projection Recovery Evidence

Date: 2026-09-11 KST
Status: **CLOSED · KEEP · FIX RESOLVED · POSTMERGE CI PASS · NATURAL R2.8 END-TO-END PASS · NONRUNTIME**
Tracking: #2006
Related checked transports: #2005 (pre-fix evidence), #2011 (post-fix proof)
Authority: `docs/SIMCORE_1959_CHECKED_PR_CALLER_CONSUMPTION_DESIGN_2026-09-09.md` · `docs/SIMCORE_1990_R2_8_ACTIONS_PR_CREATE_POLICY_FALLBACK_DESIGN_2026-09-11.md` · `docs/SIMCORE_2000_R2_8_DUAL_COMMIT_IDENTITY_DESIGN_2026-09-11.md`

## 1. Classification

```text
BLOCKER · PR_RECOVERY_VERIFIER_PROFILE_PROJECTION · RELEASE-SYSTEM / CONTROL-PLANE · NONRUNTIME
```

The v0.70.11 R2.8 terminal transport produced an exact checked state PR, but its explicit `PR_RECOVERY` validation failed before the proposed permanent verifier could run.

## 2. Live failure evidence

Checked transport coordinates:

```text
PR                    = #2005
frozen base           = f6327214b322752424233d083facb33eb68571dd
exact checked head    = ce0d1e084029ad7a928208c5a23687d9e3525a46
production commit     = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production blob       = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
```

Two workflow-dispatch runs on the same checked head proved the distinction:

```text
34542993530 · MAIN_HEALTH · Verify SUCCESS · Required SUCCESS
34543094153 · PR_RECOVERY · Verify FAILURE · Required FAILURE
```

The failing PR_RECOVERY run successfully proved the exact checkout, frozen base, base ancestry, `STATE_SYNC` path classification, expected production identity, and unchanged production authority. It then failed only at the proposed verifier boundary:

```text
resolver output: verifier_profile=PR_MAIN
proposed verifier env: PROFILE=PR_RECOVERY
check.mjs: CI_PROFILE_INVALID: unsupported profile
bounded result: INFRA_ERROR / REPORT_MISSING
```

## 3. Frozen contract

The already-frozen #1959 design requires `PR_RECOVERY` to remain a workflow-dispatch transport profile that reproduces `PR_MAIN` validation semantics. In particular, the proposed permanent verifier must run with the same verifier profile as `PR_MAIN` while retaining explicit PR base/head identities.

No new runtime, release, HUMAN_EVIDENCE, or LIVE_PASS semantics are introduced by this repair.

## 4. Minimal repair

Implementation PR #2007 changed only:

```text
.github/workflows/simcore-ci.yml
products/simcore/tests/suites/release-system-r2-6.test.mjs
```

Repair:

```text
Run proposed permanent verifier
PROFILE = steps.profile.outputs.verifier_profile
```

The regression now scopes the actual proposed-verifier workflow section and proves both:

```text
resolved verifier profile is consumed
outer PR_RECOVERY transport profile does not leak into check.mjs
```

## 5. Qualification

Implementation head:

```text
8526b0639c4a29f9cb9cce38d910ae890a247266
```

PR #2007 qualification:

```text
SimCore CI run 34546850110
Verify   SUCCESS
Required SUCCESS
Plugin Control Plane PR observe 34546850033 SUCCESS
```

Merged main:

```text
0cd33102d2d82361594db7ae4b71fc804f9301cd
```

Merged-main SimCore CI:

```text
run 34546986975
Verify   SUCCESS
Required SUCCESS
```

## 6. Preserved authority

```text
runtime mutation                  NONE
release-simcore mutation          NONE
production identity change        NONE
HUMAN_EVIDENCE semantic change    NONE
LIVE_PASS semantic change         NONE
PR_RECOVERY base/head guards      PRESERVED
STATE_SYNC classification         PRESERVED
Required public gate              PRESERVED
```

`release-simcore` deployment and real long-chat validation are **N/A** for this transaction because it is a release-system/control-plane-only repair and does not modify runtime bytes or live behavior.

## 7. Fresh operational reproof

The old #2005 head remains closed and unmerged as pre-fix failure evidence. It was not rewritten or reused as post-fix proof.

The repaired-main reproof was triggered from:

```text
PR #2008 merge / frozen R2.8 base
0c3abb6feb6d7414f0e833a910e215248c4bd141
```

Fresh terminal convergence authority:

```text
R2.8 run                 34547337280
successful attempt       3
terminal job             103113641551 · SUCCESS
accepted HUMAN_EVIDENCE  products/simcore/releases/live-evidence/simcore-v0.70.11-new-03.json
production commit        01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production blob          a1721dcdd9a34f3398c0c5899e8981ba1143ead4
frozen base              0c3abb6feb6d7414f0e833a910e215248c4bd141
exact checked head       e8731f7015396d8dc99e9256bade063d71d08b3c
checked PR               #2011
merge / durable main     ce2ca0b99ba0d3ec6aadf4f6f471d7698e9468bd
```

Attempts 1 and 2 reached the already-frozen #1990 assistant-create fallback but did not receive the connector-created checked PR inside the bounded consumer window. Attempt 2 was repo-recorded as:

```text
DEFER · R2_8_BOUNDED_ASSISTANT_BRIDGE_TIMING · NON-CORRECTNESS
```

That classification remains correct. The attempt-2 exact staging state was not landed late as a substitute for the same-run contract. Attempt 3 re-ran the failed R2.8 job from the same frozen main and the exact checked PR was created while the bounded consumer was active.

## 8. Exact PR_RECOVERY verifier proof

Attempt 3 generated:

```text
staging ref
simcore-r2-8-terminal-convergence/e8731f701539-1-34547337280-3-2378-1789090274584

checked head
e8731f7015396d8dc99e9256bade063d71d08b3c

changed paths
docs/CURRENT_DEVELOPMENT.md
product-manifest.json
```

The checked head was exactly one commit ahead of frozen base and changed only terminal administrative state toward `LIVE_PASS` / `POST_07011_NEXT_STEP_REVIEW`.

The active same-run helper consumed exact PR #2011 and launched the explicit protected validation:

```text
SimCore CI validation run  34551077059
transport profile           PR_RECOVERY
Verify job                  103113924875 · SUCCESS
Required job                103113968876 · SUCCESS
```

The direct Verify logs prove the repaired projection boundary:

```text
INPUT_PROFILE                 PR_RECOVERY
resolver verifier_profile     PR_MAIN
Select source PROFILE         PR_MAIN
Run proposed verifier PROFILE PR_MAIN
PR base                       0c3abb6feb6d7414f0e833a910e215248c4bd141
PR head                       e8731f7015396d8dc99e9256bade063d71d08b3c
expected production           01769eb6db7244e3682bb8ba6001d89aea4e0ed8
scope labels                  STATE_SYNC
GATE_STATIC                   PASS
GATE_STATE                    PASS
reasonCodes                   []
conclusion                    PASS
```

The original `CI_PROFILE_INVALID` failure is absent. `PR_RECOVERY` remains the transport profile, while the proposed permanent verifier now receives exactly the frozen `PR_MAIN` verifier semantics required by #1959.

## 9. Same-run protected merge and durable reobservation

The R2.8 attempt itself, not a manual merge, performed the protected transition after `Required` succeeded.

Observed chain:

```text
CHECKED_PR_REQUIRED
→ exact PR #2011 discovered inside bounded window
→ PR_RECOVERY / Required PASS
→ frozen base/head revalidation PASS
→ CHECKED_PR_MERGED
→ durable main ce2ca0b99ba0d3ec6aadf4f6f471d7698e9468bd
→ ALREADY_DURABLE
→ CHECKED_PR_CLEANUP_PASS
→ staging ref deleted
→ TERMINAL_CONVERGENCE_PASS
```

PR #2011 exact identity:

```text
base        0c3abb6feb6d7414f0e833a910e215248c4bd141
head        e8731f7015396d8dc99e9256bade063d71d08b3c
merge       ce2ca0b99ba0d3ec6aadf4f6f471d7698e9468bd
changed     2 files
runtime     NONE
```

Durable main now records:

```text
production version  0.70.11
validation           LIVE_PASS
priority             POST_07011_NEXT_STEP_REVIEW
terminal disposition LIVE_PASS
R lifecycle          REAL_RELEASE_LIVE_PASS
```

## 10. Production authority reobservation

Final operational readback confirms production never moved during this control-plane repair or terminal administrative landing:

```text
release-simcore commit 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
latest.js blob         a1721dcdd9a34f3398c0c5899e8981ba1143ead4
install.js blob        a1721dcdd9a34f3398c0c5899e8981ba1143ead4
version                0.70.11
latest == install      PASS
```

No new runtime deployment is applicable. No new real-long-chat session is required by #2006 because this transaction changes only release-system/control-plane profile projection. The HUMAN_EVIDENCE used by R2.8 is the already-accepted v0.70.11 live evidence and was re-read exactly, not manufactured by this repair.

## 11. Three-lens closure

### Stabilization

**STRONGER**

The outer transport identity and inner verifier identity are now explicit and fail-closed. Exact PR base/head, expected production, public Required, protected merge, durable re-readback, and cleanup were all exercised naturally.

### Automation

**MORE AUTOMATIC AND SAFER**

The existing resolver output is consumed directly by the proposed verifier. Attempt 3 also proves the frozen #1990 connector fallback can complete the same-run chain without bypassing Required or manually merging the checked PR.

### Simplification

**SIMPLER**

The repair removes accidental duplicate ownership of verifier profile at the call boundary and reuses the already-authoritative `verifier_profile` primitive. No new profile, truth source, compatibility layer, or runtime state was added.

Material tradeoff: **NONE OBSERVED**.

## 12. Final disposition

```text
#2006 blocker                     FIX RESOLVED
PR_RECOVERY transport             PRESERVED
resolved verifier profile         PR_MAIN
natural explicit validation       PASS
Required                           PASS
protected checked-state merge      PASS
ALREADY_DURABLE readback           PASS
staging cleanup                    PASS
runtime / release-simcore change   NONE
attempt-2 timing DEFER             RESOLVED BY ATTEMPT 3
R2.8 terminal convergence          PASS
final disposition                  CLOSED / KEEP
```

A separate `CURRENT_DEVELOPMENT` human-current-state drift recurrence was discovered during final readback and tracked under #1545. It is a documentation continuity defect only and does not weaken the #2006 correctness verdict or production identity.

Do not reopen #2006 unless new independent evidence shows that `PR_RECOVERY` again leaks its outer transport profile into the proposed permanent verifier or another frozen exact-identity guard fails.
