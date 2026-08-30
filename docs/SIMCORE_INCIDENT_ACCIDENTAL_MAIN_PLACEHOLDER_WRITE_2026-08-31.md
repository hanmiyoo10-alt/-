# SimCore Incident — Accidental Main Placeholder Write

Date: 2026-08-31 KST
Classification: **FIX · ACCIDENTAL_MAIN_PLACEHOLDER_WRITE**
Status: **CLEANUP BRANCH PREPARED · RUNTIME/RELEASE UNAFFECTED**

## Incident

During documentation-only v0.70.1 Stage C evidence handling, two accidental repository writes were made directly to `main`:

```text
docs/placeholder
commit 8360f5d03bf657130991afb8db01498b04d74ada

docs/.tmp
commit 43ff302c121d724b6480ac7f98c1a16872ee30a4
```

Both files contained temporary text only.

## Impact

```text
runtime code changed          NO
release-simcore changed       NO
latest.js changed             NO
install.js changed            NO
deployment changed            NO
persistent schema changed     NO
product behavior changed      NO
```

The incident is a repository workflow violation only.

## Cleanup

A working branch was created from the contaminated main head:

```text
docs/simcore-07001-stage-c-verdict-20260831
```

The two accidental files were deleted on that branch before the Stage C evidence PR was prepared.

The cleanup PR must therefore contain:

```text
DELETE docs/placeholder
DELETE docs/.tmp
ADD Stage C / attribution evidence
ADD this incident record
```

No runtime/release changes are allowed in the cleanup PR.

## Disposition

```text
FIX · ACCIDENTAL_MAIN_PLACEHOLDER_WRITE
```

The incident is considered resolved only after:

1. exact-head CI passes,
2. cleanup PR merges,
3. `main` confirms both accidental files are absent.
