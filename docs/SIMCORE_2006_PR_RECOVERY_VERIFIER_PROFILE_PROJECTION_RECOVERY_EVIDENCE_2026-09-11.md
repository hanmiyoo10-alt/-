# SimCore #2006 PR_RECOVERY Verifier Profile Projection Recovery Evidence

Date: 2026-09-11 KST
Status: **CLOSED · FIXED · POSTMERGE CI PASS · FRESH R2.8 OPERATIONAL REPROOF PASS · NONRUNTIME**
Tracking: #2006
Related pre-fix checked transport: #2005, CLOSED / UNMERGED / SUPERSEDED EVIDENCE
Successful checked transport: #2011
Authority: `docs/SIMCORE_1959_CHECKED_PR_CALLER_CONSUMPTION_DESIGN_2026-09-09.md`

## 1. Classification

Original live blocker:

```text
BLOCKER · PR_RECOVERY_VERIFIER_PROFILE_PROJECTION · RELEASE-SYSTEM / CONTROL-PLANE · NONRUNTIME
```

Final disposition:

```text
RESOLVED · FIXED · OPERATIONALLY REPROVED · NONRUNTIME
```

The v0.70.11 R2.8 terminal transport originally produced an exact checked state PR, but its explicit `PR_RECOVERY` validation failed before the proposed permanent verifier could run. The narrow workflow regression has now been repaired, qualified, merged, and naturally exercised through the full checked-PR terminal-convergence path.

## 2. Original live failure evidence

Pre-fix checked transport coordinates:

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

No new runtime, release, HUMAN_EVIDENCE, or LIVE_PASS semantics were introduced by this repair.

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

## 5. Deterministic qualification

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

## 6. Fresh R2.8 operational reproof

A semantic-neutral evidence-path append in PR #2008 retriggered R2.8 from repaired main without changing the accepted HUMAN_EVIDENCE decision. PR #2008 merged to:

```text
0c3abb6feb6d7414f0e833a910e215248c4bd141
```

Fresh R2.8 authority:

```text
run                    = 34547337280
frozen main            = 0c3abb6feb6d7414f0e833a910e215248c4bd141
release transaction    = simcore-v0.70.11-new-03
production commit      = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
production blob        = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
terminal decision      = LIVE_PASS
next priority          = POST_07011_NEXT_STEP_REVIEW
```

Attempt 2 reached the frozen #1990 assistant-create fallback and timed out only after its bounded discovery window. That was recorded as:

```text
DEFER · R2_8_BOUNDED_ASSISTANT_BRIDGE_TIMING · NON-CORRECTNESS
```

No late attempt-2 transport was used as proof.

Attempt 3 then completed the exact same-run chain. Parent job:

```text
job                    = 103113641551
staging head           = e8731f7015396d8dc99e9256bade063d71d08b3c
checked PR             = #2011
checked PR base        = 0c3abb6feb6d7414f0e833a910e215248c4bd141
checked PR head        = e8731f7015396d8dc99e9256bade063d71d08b3c
changed paths          = docs/CURRENT_DEVELOPMENT.md, product-manifest.json
runtime paths changed  = NONE
```

The checked transport dispatched exact `PR_RECOVERY` validation run `34551077059` on head `e8731f7015396d8dc99e9256bade063d71d08b3c`.

Its live verifier boundary proves the repair:

```text
outer workflow profile       = PR_RECOVERY
resolved verifier profile    = PR_MAIN
proposed verifier PROFILE    = PR_MAIN
verifier result              = PASS
reason codes                 = NONE
scope                        = STATE_SYNC
Verify job 103113924875      = SUCCESS
Required job 103113968876    = SUCCESS
```

The proposed permanent verifier also revalidated:

```text
prBaseCommit              = 0c3abb6feb6d7414f0e833a910e215248c4bd141
prHeadCommit              = e8731f7015396d8dc99e9256bade063d71d08b3c
productionCommit          = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
expectedProductionCommit  = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
GATE_STATIC               = PASS
GATE_STATE                = PASS
```

PR #2011 merged through the checked transport to durable main:

```text
merge / durable main = ce2ca0b99ba0d3ec6aadf4f6f471d7698e9468bd
```

The R2.8 parent then reset to fresh `origin/main`, reran terminal resolution, and obtained:

```text
SIMCORE_R2_8_TERMINAL_ALREADY_DURABLE
CHECKED_PR_CLEANUP_PASS
staging ref deleted = true
SIMCORE_R2_8_TERMINAL_CONVERGENCE_PASS
```

Fresh repository readback also confirms the attempt-3 staging branch no longer exists.

## 7. Durable terminal state

At durable main `ce2ca0b99ba0d3ec6aadf4f6f471d7698e9468bd`:

```text
production_version = 0.70.11
validation_status  = LIVE_PASS
current_priority   = POST_07011_NEXT_STEP_REVIEW
R lifecycle        = REAL_RELEASE_LIVE_PASS
```

Independent production reobservation confirms:

```text
release-simcore = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
latest.js blob  = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
install.js blob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
latest == install = PASS
version = 0.70.11
```

The accepted real long-chat HUMAN_EVIDENCE is unchanged. R2.8 only projected that already-authorized decision into durable administrative state.

## 8. Preserved authority

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

`release-simcore` deployment is **N/A / FORBIDDEN BY SCOPE** for #2006 because the repair is control-plane-only and does not modify runtime bytes. A new real long-chat run is **N/A** because accepted HUMAN_EVIDENCE already exists and was not altered by this repair; production identity was instead independently reobserved before and after terminal projection.

## 9. Three-lens final verdict

```text
STABILIZATION  = STRONGER
AUTOMATION     = MORE AUTOMATIC AND SAFER
SIMPLIFICATION = NEUTRAL
TRADEOFF       = NONE MATERIAL OBSERVED
```

Stabilization is stronger because the live checked transport now preserves exact base/head and production guards while executing the intended verifier semantics. Automation is safer because the recovery transport can complete without weakening `Required` or accepting a transport-only profile as a verifier profile. Simplification is neutral because the fix reuses the already-frozen resolver instead of adding a new profile or authority source.

## 10. Closure

```text
#2006 blocker              = RESOLVED / FIXED
pre-fix #2005              = CLOSED / UNMERGED / EVIDENCE ONLY
post-fix #2011             = MERGED
PR_RECOVERY operational    = PASS
R2.8 durable reobservation = ALREADY_DURABLE / PASS
staging cleanup            = PASS
production                 = UNCHANGED
next #2006 action          = NONE
```

A separate, already-tracked `CURRENT_DEVELOPMENT` human current-state drift recurrence remains a documentation-authority issue and does not reopen #2006 or weaken the terminal machine-managed state.