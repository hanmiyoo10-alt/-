# SimCore Release System v2 — PR Activation Adapter Implementation Evidence

Date: 2026-08-25
Status: **IMPLEMENTED · CI PENDING · NON-RUNTIME**
Parent design: `docs/SIMCORE_RELEASE_SYSTEM_V2_PR_ACTIVATION_ADAPTER.md`
First consumer: `simcore-v0.64.7-new-01`

## 1. Finding

The first genuine R release exposed an operator invocation gap:

```text
PERMANENT_CALLER_OPERATOR_DISPATCH_SURFACE_UNAVAILABLE
= FIX / R_FEEDBACK / AUTOMATION / NON_RUNTIME
```

The permanent release controller itself was already release-ready. The missing surface was only an operator-accessible way to invoke its `workflow_dispatch` input contract from the connected repository environment.

## 2. Implemented adapter

Added:

`.github/workflows/simcore-release-pr-activation.yml`

The adapter accepts one newly merged activation JSON under:

`products/simcore/releases/activations/*.json`

and only performs:

```text
validate merged activation shape
→ bind existing immutable release spec
→ bind candidate transport ref to spec.candidateCommit
→ dispatch simcore-release-permanent.yml on main
→ observe that permanent run to terminal success
```

Publication authority remains exclusively:

`SimCore Permanent Release / RS2_4_RELEASE`

## 3. Permanent classification and self-test

`products/simcore/tooling/ci/classify.mjs` classifies the adapter as:

```text
CI_SELF + HARNESS
```

and explicitly excludes it from `LEGACY_VERIFICATION`.

`products/simcore/tooling/ci/self-test.mjs` permanently asserts:

```text
required:
- pull_request closed activation trigger
- contents: read
- actions: write
- gh workflow run simcore-release-permanent.yml
- gh run watch
- RS2_4_RELEASE

forbidden:
- contents: write
- release-publish.mjs
- repo-main-write.py
- git push
- force update primitives
```

The adapter is also excluded from the legacy-workflow retirement inventory because it is new permanent invocation infrastructure, not a legacy validator.

## 4. Implementation corrections before PR validation

### SAME_STEP_GITHUB_OUTPUT_READ

Classification:

```text
FIX / HARNESS / NON_RUNTIME / PRE_CI
```

The initial implementation attempted to consume a step output expression inside the same step that produced it. This was corrected before PR validation by teeing the validated activation key/value set to both `$GITHUB_OUTPUT` and a local env file used by the remainder of the step.

### ACTIVATION_HISTORY_MERGE_TRAVERSAL

Classification:

```text
FIX / HARNESS / NON_RUNTIME / PRE_CI
```

Activation immutability initially counted path history across all merge parents. It was narrowed to `git log --first-parent` so the one-touch rule measures canonical `main` history rather than the activation work branch history.

### ADAPTER_INSTALLATION_SELF_TRIGGER_MARKER

Classification:

```text
FIX / HARNESS / NON_RUNTIME / PRE_CI
```

A temporary `products/simcore/releases/activations/.gitkeep` marker would itself have matched the adapter's activation path filter when the adapter installation PR closed. The marker was removed before PR creation. The activation directory is therefore created only by a real immutable activation JSON, preventing the installation PR from self-triggering the release adapter.

### ACCIDENTAL_WORK_BRANCH_PR_MARKER

Classification:

```text
FIX / TOOLING / WORK_BRANCH_ONLY
```

A temporary `docs/.simcore-r-pr-adapter-pr-marker` file was accidentally created while preparing the PR payload. It was immediately removed before PR creation.

Impact:

```text
main mutation: NONE
runtime mutation: NONE
release-simcore mutation: NONE
residual file: NONE
```

## 5. Runtime/release boundary

This infrastructure mini changes no SimCore runtime bytes and performs no publication while being introduced.

```text
runtime mutation: NONE
release-simcore mutation: NONE
candidate mutation: NONE
release spec mutation: NONE
```

The already-authorized v0.64.7 tuple remains frozen:

```text
releaseId: simcore-v0.64.7-new-01
P: 47969d24771f6cc188df6e32150fc6fde519182d
C: a7ce8ce33a97797630f885c6753415e4b2ccc7fc
blob: 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
```

## 6. Promotion gate

Before the first activation file may be merged:

```text
adapter PR SimCore CI / Verify = PASS
adapter PR SimCore CI / Required = PASS
adapter merged to main
release-simcore still equals P
candidate ref still equals C
immutable release spec still exists exactly once on main
```

After those gates, the v0.64.7 activation transaction may proceed through the permanent caller.
