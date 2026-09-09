# Repository Native Protected-Main Writer Recovery — Implementation Evidence

Date: 2026-09-09
Status: **PRE-MERGE VERIFIED · NON-RUNTIME**
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

No SimCore runtime, product release branch, publisher, candidate bytes, manifest release identity, or production files are changed by this implementation branch.

The helper now performs a read-only branch metadata observation after exact staging Required success and an unchanged-main identity check.

Observed-state handling is frozen as:

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

## Regression coverage added

`scripts/test-repo-main-write.py` now includes a fake GitHub CLI plus real temporary bare repositories to verify both sides of the new boundary.

Native-enforced specimen asserts:

```text
exact Required gate PASS
helper return = recovery-required
main ref unchanged
main content unchanged
exact staging recovery ref remains
recovery ref resolves to exact candidate commit
MAIN_WRITE_CHECKED_PR_REQUIRED coordinates parse exactly
```

Native-off specimen asserts:

```text
exact Required gate PASS
existing direct landing still succeeds
main content advances
staging ref is cleaned
no checked-PR recovery output is emitted
```

Unit read-back parsing also asserts the live GitHub branch shape used by the real contradiction:

```text
protected = true
enforcement = everyone
checks = [{ context: Required, app_id: 15368 }]
```

Canonical main writer contracts now require the helper to retain the native-protection read-back and recovery vocabulary, preventing a later helper regression from silently restoring direct protected-main assumptions.

## Pre-PR static scope read-back

Branch diff from design-merged main `826a1ac98383dcc1940daf9807e74bc8160cf761` is limited to three implementation files plus this evidence record:

```text
.github/plugin-control-plane/canonical-main/protected-main.cjs
scripts/repo-main-write.py
scripts/test-repo-main-write.py
docs/REPO_NATIVE_PROTECTED_MAIN_WRITER_RECOVERY_IMPLEMENTATION_EVIDENCE_2026-09-09.md
```

Production remains v0.70.10. The immutable v0.70.11 candidate remains `01769eb6db7244e3682bb8ba6001d89aea4e0ed8`; no new candidate is authorized by this repository-infrastructure repair.

## First implementation-head CI evidence

PR: `#1952`

Head before this evidence-only refresh:

```text
a0babca01c306c1e0d4960d309b6aa5d797a1175
```

Observed checks:

```text
Plugin Control Plane CI run 34316326536
  contract job 102353204751 = SUCCESS

SimCore CI run 34316326592
  Verify   job 102353204820 = SUCCESS
  Required job 102353253856 = SUCCESS
```

This proves the implementation and regression pack passed both repository control-plane contracts and the stable SimCore required gate before the evidence-only refresh.

Because this document update changes the PR head, the final merge head must receive a fresh successful CI pass. The earlier green run is preserved as implementation evidence but is not reused as final-head merge authority.

## Post-merge evidence still required

Before #1950 is closed:

```text
final PR head Plugin Control Plane CI = PASS
final PR head SimCore CI / Verify = PASS
final PR head SimCore CI / Required = PASS
merged main SHA = exact
post-merge main native protection read-back = still enforced
release-simcore = unchanged
```

After #1950 lands, #1949 recovery must use the exact preserved/generated receipt payload through a normal checked PR. No manual receipt reconstruction is authorized.
