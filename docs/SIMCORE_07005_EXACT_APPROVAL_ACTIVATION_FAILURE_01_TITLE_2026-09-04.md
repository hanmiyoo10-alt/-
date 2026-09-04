# SimCore v0.70.5 Exact Approval Activation Failure 01 — Title Contract

Date: 2026-09-04
Classification: `FIX · BLOCKER · PRODUCTION_EXPOSURE_NONE`
Status: `RECORDED · RELEASE STOPPED · APPEND_ONLY_RECOVERY REQUIRED`

## Transaction

- release: `simcore-v0.70.5-new-01`
- candidate intent: `simcore-v0.70.5-intent-01`
- candidate commit: `649b20e274647d0c4d76089d4bedc72f1d375390`
- expected production parent: `df282f18a0035b03be30af8d0ee2174f58b3bcd3`
- candidate release blob: `c72802234d265337f2558420c84882148e633325`
- exact approval PR: `#1465`
- exact approval head: `4d6415714dea772292b95ea6010dfdb1d2d5fd7f`
- approval merge: `bb0a2a7fe61b57a44b160c7f3adb0d456df8640f`
- SimCore CI on approval PR: `Verify PASS · Required PASS`
- Exact Approval Activation run: `33833244734`

## Failure

`SimCore Exact Approval Activation` failed in `Resolve exact delegated approval transaction` before permanent caller dispatch.

Exact failure:

```text
SIMCORE_RELEASE_APPROVAL_TITLE_INVALID
```

The activation workflow requires the exact PR title:

```text
SimCore exact release approval: <releaseId>
```

For this transaction the required title was:

```text
SimCore exact release approval: simcore-v0.70.5-new-01
```

PR #1465 was instead created with:

```text
release(simcore): exact approval v0.70.5 new-01
```

This is an operator-side activation-envelope error. The candidate bytes, candidate receipt, exact spec values, ordinary SimCore CI, implementation, and runtime behavior are not implicated.

## Production Safety

The activation job skipped `Dispatch and observe permanent caller`, so no permanent publication transaction was started from this approval.

Direct readback after the failure confirmed `release-simcore` remained:

```text
df282f18a0035b03be30af8d0ee2174f58b3bcd3
SimCore v0.70.4 Manual Edit Rebuild Attribution
```

Therefore classification remains `PRODUCTION_EXPOSURE_NONE`.

## Precedent

`docs/SIMCORE_06500_APPROVAL_ACTIVATION_TITLE_BLOCKER_2026-08-28.md` records the same failure class and proves that editing a merged PR title and rerunning the failed workflow does not repair the transaction because GitHub Actions preserves the original pull-request event payload.

Accordingly, `simcore-v0.70.5-new-01` is treated as burned for activation and MUST NOT be edited or reused.

## Recovery Boundary

Recovery is append-only and must preserve runtime behavior:

1. do not edit the already-merged `new-01` approval/spec files;
2. create fresh `simcore-v0.70.5-intent-02` / `simcore-v0.70.5-new-02` against the unchanged production parent `df282f18a0035b03be30af8d0ee2174f58b3bcd3`;
3. reuse the frozen v0.70.5 builder and verification profile without runtime feature changes;
4. require the regenerated candidate to reproduce release blob `c72802234d265337f2558420c84882148e633325` exactly, otherwise stop and classify a new blocker;
5. create the complete approval/spec package for `new-02` in one first-touch transaction;
6. the approval PR title MUST be exactly `SimCore exact release approval: simcore-v0.70.5-new-02` before merge;
7. require ordinary SimCore CI, Exact Approval Activation, permanent `CANDIDATE_REQUIRED`, publication, and `release-simcore` readback to pass;
8. do not change release-system implementation as part of this recovery.

## Disposition

- runtime code change: `NONE`
- release-system code change: `NONE`
- production mutation: `NONE`
- next action: `APPEND_ONLY_INTENT_02_NEW_02_RECOVERY`
