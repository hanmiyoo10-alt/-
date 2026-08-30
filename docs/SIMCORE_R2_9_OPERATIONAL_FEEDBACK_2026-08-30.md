# SimCore R2.9 Operational Feedback

Date: 2026-08-30 KST

Status: **FEEDBACK RECORDED · KEEP/FROZEN CORE · NEXT IMPROVEMENT THEME BOUNDED**

Classification: **RELEASE-SYSTEM FEEDBACK · NON-RUNTIME · STABILITY/SIMPLICITY/BOUNDED AUTOMATION**

## 1. Why this feedback targets R2.9, not R2.8

R2.8 has now completed a second ordinary Human-Evidence terminal close on v0.70.0 with no recovery transaction. Its authority model remains proven and frozen:

- HUMAN_EVIDENCE stays human authority;
- terminal convergence remains derived bookkeeping after accepted evidence;
- publisher remains `RS2_4_PERMANENT`;
- main writer remains `repo-main-write.py`;
- no automatic LIVE_PASS, checkpoint selection, priority selection, polling, or retry was introduced.

Authority:
- `docs/SIMCORE_R2_8_V07000_SECOND_ORDINARY_TERMINAL_CLOSE_2026-08-30.md`

Therefore the highest-value current feedback is R2.9, because R2.9 has now been exercised by a real successor release path and exposed concrete validation-harness behavior.

## 2. Real-use outcome

R2.9 activated one projected normal path for the four version-sensitive stable contracts:

```text
reload-cache-continuity
operator-release-card
host-local-telemetry
bounded-telemetry-capsule
```

The active runner selects an exact release validation profile from the source metadata version and fails closed when the exact profile is absent.

For v0.70.1:

```text
profile = products/simcore/releases/validation-profiles/0.70.1.json
new per-version wrapper fanout = 0
Host-local exact-current authority = 0.70.1
Host-local predecessor rejection = 0.70.0
```

After the bounded R2.9 regression repairs described below, the ordinary v0.70.1 release completed publication through the unchanged Permanent Release path:

```text
releaseId = simcore-v0.70.1-new-01
production version = 0.70.1
production commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
publisher run = 33297991331
release state = LIVE_PENDING
production truth = PUBLISHED_IDENTITY_VERIFIED
state sync = PASS
```

This is sufficient evidence that the R2.9 projected normal path is compatible with a genuine successor runtime release after its validation-only repairs.

## 3. What worked

### KEEP · exact profile ownership

R2.9 removed the old implicit "current/latest" inference from version-sensitive validation.

The active source version must resolve to one exact validation profile. Unknown versions fail closed.

This is the correct stability direction and should remain frozen.

### KEEP · wrapper fanout reduction

v0.70.1 did not require another set of exact-version wrapper files for unchanged contracts.

The intended simplification was therefore realized:

```text
unchanged contract + new release identity
-> declarative exact profile
-> stable projected runner
-> no new wrapper fanout
```

### KEEP · builder/fixture closure principle

The builder/fixture topology is now checked as a structural validation concern instead of being left as a release-time manual seam.

This directly addresses the v0.70.0 candidate failure class where a builder fixture registration gap reached candidate qualification.

### KEEP · authority boundaries

R2.9 changed validation wiring only. It did not create a publisher, main writer, LIVE_PASS decider, background worker, automatic retry, or runtime mutation surface.

R2.8 authority remains untouched.

### KEEP · fail-closed behavior

All observed R2.9 defects failed before production mutation. The validation system did not compensate by widening authority or silently selecting another profile.

That behavior is correct.

## 4. What failed during implementation/activation

Three observed failures form one deeper pattern.

### FIX history 1 · synthetic loader identity

Evidence:
`docs/SIMCORE_RELEASE_SYSTEM_V2_9_IMPLEMENTATION_CI_FAILURE_01_SYNTHETIC_LOADER_IDENTITY_2026-08-30.md`

The shadow regression created:

```text
ctx.source = synthetic 0.70.1
ctx.loader = original 0.70.0
```

The projected contract received an internally contradictory validation context.

Classification:
`FIX · SHADOW_REGRESSION_CONTEXT_IDENTITY · REPAIRED`

### FIX history 2 · nested fixture ownership

Evidence:
`docs/SIMCORE_RELEASE_SYSTEM_V2_9_IMPLEMENTATION_CI_FAILURE_02_NESTED_FIXTURE_OWNERSHIP_2026-08-30.md`

The R2.9 meta-suite invoked a projected contract while retaining the meta-suite fixture set instead of the fixture authority owned by the projected contract.

The resulting context was structurally wrong even though the contract implementation itself was correct.

Classification:
`FIX · SHADOW_REGRESSION_FIXTURE_OWNERSHIP · REPAIRED`

### FIX history 3 · active source-version assumption

Evidence:
- `docs/SIMCORE_R2_9_ACTIVATION_CANDIDATE_FAILURE_01_ACTIVE_SOURCE_VERSION_ASSUMPTION_2026-08-30.md`
- `docs/SIMCORE_R2_9_ACTIVE_SOURCE_VERSION_BINDING_REPAIR_EVIDENCE_2026-08-30.md`

Candidate qualification correctly loaded the exact v0.70.1 profile from the v0.70.1 candidate source, but the permanent R2.9 regression hard-coded the assumption that "current source" meant deployed v0.70.0.

Classification:
`FIX · R2_9_ACTIVE_REGRESSION_SOURCE_VERSION_ASSUMPTION · REPAIRED / QUALIFIED`

## 5. Common root cause

The three failures are not evidence that projected contracts or exact profiles are the wrong design.

They reveal one remaining validation-harness seam:

```text
source
loader
fixture owner
exact validation profile
execution context
```

These values are semantically one coherent contract context, but some regression paths still assemble them independently.

That allows impossible combinations to be constructed in test code, such as:

```text
source 0.70.1 + loader 0.70.0
projected reload contract + R2.9 meta fixture
candidate 0.70.1 + hard-coded expected profile 0.70.0
```

The next stability/simplicity improvement should target this context-construction seam rather than adding more wrappers, more profile modes, or more release authority.

## 6. Recommended next design theme

### Candidate theme: Context-Coherent Validation Harness

Preferred invariant:

```text
one validation-context constructor
-> binds source identity
-> constructs loader from that exact executable source when required
-> resolves exact validation profile from source identity
-> resolves fixture authority from the projected contract owner
-> exposes the completed immutable context to the contract runner
```

The desired property is stronger than another assertion:

```text
invalid source/loader/profile/fixture combinations should be difficult or impossible to construct through the normal test API
```

This would turn three repaired assumptions into one structural invariant.

### Simplicity budget

A future design should prefer:

```text
new publisher                         0
new main writer                       0
new lifecycle state                   0
new background workflow               0
new approval step                      0
new exact-version wrapper              0
new profile inference rule             0
one bounded validation-context owner  +1 maximum
existing R2.9 projected runners       reused
existing exact profiles               reused
existing contract fixtures            reused
```

## 7. R2.8 feedback disposition

R2.8 itself does not currently justify another authority-system version.

The second ordinary terminal close makes predecessor fallback retirement review-eligible, but that remains a separate cleanup transaction:

`DEFER · PREDECESSOR_RETIREMENT_REVIEW_ELIGIBLE · SEPARATE_CLEANUP_TASK`

Do not mix that cleanup with the next validation-harness improvement.

## 8. Status/document semantics watch

`R_V2_8_HUMAN_EVIDENCE_TERMINAL_CONVERGENCE_STATUS.json` and `R_V2_9_VALIDATION_CONTRACT_PROJECTION_STATUS.json` preserve activation/qualification-time production boundaries rather than the current v0.70.1 production identity.

This is safe while those fields are interpreted as historical qualification snapshots, because current product truth is separately owned by the release record and product state.

However the filename `STATUS` can invite live-dashboard interpretation.

Classification:

`WATCH · RELEASE_SYSTEM_STATUS_SNAPSHOT_SEMANTICS`

Before editing these files, decide explicitly whether they are immutable activation snapshots or current-state summaries. Do not silently turn one model into the other.

## 9. Current verdict

```text
R2.8 CORE                          = KEEP / FROZEN
R2.8 SECOND ORDINARY CLOSE        = PASS
R2.8 PREDECESSOR FALLBACK CLEANUP = DEFER / SEPARATE TASK

R2.9 CORE                          = KEEP / FROZEN
R2.9 EXACT PROFILE MODEL           = KEEP
R2.9 PROJECTED CONTRACT MODEL      = KEEP
R2.9 WRAPPER FANOUT REDUCTION      = PROVEN ON v0.70.1
R2.9 FAIL-CLOSED SAFETY            = PROVEN
R2.9 REAL SUCCESSOR RELEASE        = PASS THROUGH v0.70.1 PUBLICATION

NEXT IMPROVEMENT OWNER             = VALIDATION CONTEXT COHERENCE
NEXT RELEASE-SYSTEM VERSION        = NOT YET NAMED / DESIGN NOT AUTHORIZED
RUNTIME CHANGE                     = NONE
RELEASE-SIMCORE CHANGE             = NONE
```

## 10. Recommendation

Do not rewrite R2.9 and do not expand release authority.

Freeze the R2.9 architecture as the normal path and, if another release-system increment is authorized, spend it on a single bounded context-construction owner that makes source/loader/profile/fixture ownership coherent by construction.

That is the most direct continuation of the stated stability + simplicity + bounded automation direction.