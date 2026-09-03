# SimCore v0.70.3 Activation Main Supersession Watch

Date: 2026-09-03 KST

Status: **WATCH RECORDED · NON-RUNTIME · PRODUCTION UNCHANGED**

Classification: **WATCH · SUPERSEDED_MAIN_BASE · RELEASE ACTIVATION TRANSACTION**

## Observation

The prepared permanent-release activation PR `#1426` for `simcore-v0.70.3-new-12` remains open and its exact head `54d56221bc22b2f4249eb941291f4f7429de3868` has qualified SimCore CI.

Its recorded base at creation time was:

```text
4d40f648d9b9889c0c83ae6b3161bfd68e35940d
```

Current `main` at the fresh 2026-09-03 execution preflight is:

```text
41efd6b03ea7d6f24dc793ba7ca367165a626099
```

Current production authority remains:

```text
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
version = 0.70.1
```

The immutable v0.70.3 candidate remains:

```text
releaseId = simcore-v0.70.3-new-12
candidateCommit = d37b9b4f03b0dee64d7fbcc1c6be6a62ea189e3f
candidateReleaseBlob = 068df0d6b792b2878c0c745949e0b9d38fc667fa
candidate receipt result = PASS
productionMutation = NONE
```

## Disposition

Do not merge the stale-base activation PR solely because its earlier CI is green.

Preserve `#1426` as valid historical activation preparation evidence and clean-restage the exact same activation payload from fresh current `main`, with no release identity, candidate, approval, spec, or authority change.

The clean restage must contain exactly the activation JSON and must receive fresh Verify/Required qualification before merge.

This WATCH does not indicate a product defect and does not authorize any runtime or release-system semantic change.

```text
WATCH = SUPERSEDED_MAIN_BASE
RUNTIME MUTATION = NONE
RELEASE_SIMCORE MUTATION = NONE
REPAIR TYPE = CLEAN ACTIVATION RESTAGE ONLY
```
