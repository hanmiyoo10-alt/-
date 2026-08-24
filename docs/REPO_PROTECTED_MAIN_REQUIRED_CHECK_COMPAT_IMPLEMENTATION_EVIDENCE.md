# Protected-Main Required-Check Compatibility — Implementation Evidence

Date: 2026-08-24
Status: **SHADOW PROVED · FINAL CLEANUP PENDING · NON-RUNTIME**
Design authority: `docs/REPO_PROTECTED_MAIN_REQUIRED_CHECK_COMPAT.md`

## 1. Entry facts

```text
initial main base               8688c7b8f132dd055f44e3ac828b08888c1edcae
main protection                 OFF
required status checks          OFF
release-simcore                 unchanged
runtime mutation                NONE
```

The manual P4 Ruleset setup proved that `GitHub Actions` is not available as a bypass actor. Current automated state writers therefore require protected-main compatibility before enforcement can safely be activated.

PFFL evidence:

```text
RULESET_GITHUB_ACTIONS_BYPASS_UNAVAILABLE
= FIX / REPOSITORY_INFRASTRUCTURE / DIRECT_EVIDENCE
```

## 2. Local pre-commit proof

The proposed helper implementation was syntax-checked locally and the repository main-write self-test was extended before repository upload.

Observed result:

```text
legacy stale-base/disjoint tests  PASS
legacy race retry                 PASS
legacy conflict fail-close        PASS
legacy path allowlist             PASS
exact-candidate gate identity     PASS
required-job PASS                 PASS
wrong-candidate rejection         PASS
missing required job rejection    PASS
failed workflow rejection         PASS
staging prefix validation         PASS
```

## 3. Implementation finding 1

While transcribing the first protected-mode `simcore-release-state-sync.yml` branch version, a malformed `${RELEASE_COMMIT}` template string was detected before PR creation or execution.

Classification:

```text
PROTECTED_MAIN_WORKFLOW_TEMPLATE_TRANSCRIPTION_ERROR
= FIX / CI_WORKFLOW / DIRECT_EVIDENCE / NON_RUNTIME
```

Scope:

```text
working branch only
no main mutation
no release-simcore mutation
no runtime mutation
```

Disposition:

```text
record first
repair branch workflow
re-run static YAML/text validation before PR
```

This occurrence is eligible for the PFFL post-PR review. It is not a product regression.

## 4. GitHub shadow proof

Evidence PR:

```text
PR                              #196
proof workflow run              32718301857
proof job                       97404137732 / protected-main-shadow / SUCCESS
```

Static proof inside the GitHub-hosted runner:

```text
GITHUB_TOKEN Actions permission  write
GITHUB_TOKEN Contents permission write
repo-main-write self-test        PASS
protected writer static contract PASS
```

Exact immutable gate tuple:

```text
main/base before proof          c5b3eda05be6e49150180209a726a09f7f7f398b
candidate C                     5b4143a22b4ba2f587238f8536cdcda46bf0a768
staging namespace               repo-main-write-shadow-32718301857/...
permanent CI workflow run       32718319764
Verify job                      97404194393 / SUCCESS
Required job                    97404257925 / SUCCESS
```

Observed helper result:

```text
MAIN_WRITE_REQUIRED_GATE_PASS
MAIN_WRITE_GATE_ONLY_PASS
protected-main shadow proof: PASS
```

The permanent workflow executed `MAIN_HEALTH` against the exact staging candidate and the stable `Required` job succeeded.

Post-proof repository state:

```text
main after proof                c5b3eda05be6e49150180209a726a09f7f7f398b
main mutation                   NONE
staging ref                     CLEANED
runtime mutation                NONE
release-simcore mutation        NONE
```

This proves the current GitHub Actions token can:

```text
push a temporary unprotected staging ref
→ dispatch SimCore CI on that ref
→ observe the exact candidate SHA
→ wait for the stable Required job
→ clean the staging ref
```

without modifying `main`.

## 5. PR-level permanent CI proof

The same implementation head was verified by the installed permanent PR workflow:

```text
SimCore CI run                  32718301887
Verify job                      97404138025 / SUCCESS
Required job                    97404194496 / SUCCESS
```

## 6. Finalization requirements

Before merge:

```text
remove temporary shadow-proof job/workflow mutation      REQUIRED
preserve only permanent helper/tests/writer migration     REQUIRED
refresh onto latest main                                 REQUIRED
final permanent SimCore CI                               PASS REQUIRED
runtime/release diffs                                    NONE REQUIRED
```

After merge, the repository is ready for the user to activate the `main` Ruleset without a GitHub Actions bypass.

The Ruleset itself remains a separate P4 administrative action and must not be claimed active until read-back proves it.
