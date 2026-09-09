# Repository Native Protected-Main Writer Recovery — Implementation Evidence

Date: 2026-09-09
Status: **IMPLEMENTED · POST-MERGE VERIFIED · NON-RUNTIME**
Design authority: `docs/REPO_NATIVE_PROTECTED_MAIN_WRITER_RECOVERY_DESIGN_2026-09-09.md`
Tracking: #1950
Trigger specimen: #1949

## Implemented bounded behavior

Changed shared repository writer surfaces only:

```text
scripts/repo-main-write.py
scripts/test-repo-main-write.py
.github/plugin-control-plane/canonical-main/protected-main.cjs
```

No SimCore runtime, product release branch, publisher, candidate bytes, manifest release identity, or production files were changed by this repair.

The helper performs read-only branch metadata observation after exact staging Required success and an unchanged-main identity check.

Observed-state handling:

```text
native Required enforcement OFF
→ preserve existing fast-forward-only direct landing
→ clean staging ref after successful landing

native Required enforcement ON
→ do not attempt direct main push
→ preserve exact already-gated staging ref
→ emit MAIN_WRITE_NATIVE_PROTECTION_ACTIVE
→ emit MAIN_WRITE_CHECKED_PR_REQUIRED with exact base/commit/ref
→ exit fail-closed with recovery-required code

protected branch with ambiguous/missing Required read-back
→ clean staging ref
→ fail closed

protection metadata read failure/invalid payload
→ clean staging ref
→ fail closed
```

## Regression coverage

`scripts/test-repo-main-write.py` includes a fake GitHub CLI plus real temporary bare repositories.

Native-enforced specimen proves:

```text
exact Required gate PASS
helper return = recovery-required
main ref unchanged
main content unchanged
exact staging recovery ref remains
recovery ref resolves to exact candidate commit
MAIN_WRITE_CHECKED_PR_REQUIRED coordinates parse exactly
```

Native-off specimen proves:

```text
exact Required gate PASS
existing direct landing succeeds
main content advances
staging ref is cleaned
no checked-PR recovery output is emitted
```

The parser regression covers the live GitHub branch shape:

```text
protected = true
enforcement = everyone
checks = [{ context: Required, app_id: 15368 }]
```

Canonical main writer contracts require the native-protection read-back and recovery vocabulary, preventing later silent restoration of the disproven direct protected-main assumption.

## Implementation PR evidence

PR: `#1952`

First implementation head:

```text
a0babca01c306c1e0d4960d309b6aa5d797a1175
Plugin Control Plane CI run 34316326536
  contract job 102353204751 = SUCCESS
SimCore CI run 34316326592
  Verify   job 102353204820 = SUCCESS
  Required job 102353253856 = SUCCESS
```

Final PR head after evidence refresh:

```text
0dcc516b5119efcdcb7eeb306110d7fca95f9ddc
Plugin Control Plane CI run 34316392978
  contract job 102353394422 = SUCCESS
SimCore CI run 34316392870
  Verify   job 102353393720 = SUCCESS
  Required job 102353464146 = SUCCESS
```

Exact-head merge:

```text
main merge SHA = 645f32e8591fd5b898b182ce5f82de4f7317bed3
```

## Post-merge live verification

Exact merged-main SimCore CI:

```text
run 34316443573 = SUCCESS
Verify   job 102353556221 = SUCCESS
Required job 102353665112 = SUCCESS
```

Direct branch read-back on the same merged main:

```text
main protected = true
required status enforcement = everyone
required context = Required
required app = GitHub Actions / 15368
```

Production authority remained unchanged:

```text
release-simcore = ecc55f026315c6482c34d267aba2adb97527cdbc
production version = 0.70.10
runtime mutation = NONE
release mutation = NONE
```

The immutable v0.70.11 candidate remains valid and untouched:

```text
candidate commit = 01769eb6db7244e3682bb8ba6001d89aea4e0ed8
release blob = a1721dcdd9a34f3398c0c5899e8981ba1143ead4
```

## Tooling anomalies retained

Two bounded tool-order mistakes occurred during this repair and were recorded on #1950. Both produced zero repository mutation:

```text
TOOLING_DUPLICATE_WRITE              FIX / CLOSED / NONRUNTIME
TOOLING_PR_BEFORE_BRANCH             FIX / CLOSED / NONRUNTIME
TOOLING_WRITE_BEFORE_BRANCH          FIX / CLOSED / NONRUNTIME
```

They do not alter the repair verdict.

## Final verdict

```text
NATIVE_PROTECTED_MAIN_DIRECT_GATED_PUSH_ASSUMPTION = RETIRED
NATIVE_ENFORCEMENT_READBACK                         = REQUIRED
CHECKED_PR_RECOVERY_REF                             = IMPLEMENTED
LEGACY_NATIVE_OFF_DIRECT_LANDING                    = PRESERVED
FORCE_PUSH / BYPASS / PAT / DEPLOY KEY              = NONE
RUNTIME / RELEASE MUTATION                          = NONE
#1950                                                   = ELIGIBLE TO CLOSE
```

#1949 remains a separate SimCore release-administration BLOCKER. Its receipt/spec-shadow recovery must use the exact generated payload bytes from commit `df4b3bcfa02b2dfceabce11621243555ef8004a1` through a normal checked PR. No manual receipt reconstruction is authorized.
