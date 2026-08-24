# Protected-Main Required-Check Compatibility — Implementation Evidence

Date: 2026-08-24
Status: **IN PROGRESS · NON-RUNTIME**
Design authority: `docs/REPO_PROTECTED_MAIN_REQUIRED_CHECK_COMPAT.md`

## Entry facts

```text
main base                     8688c7b8f132dd055f44e3ac828b08888c1edcae
main protection               OFF
required status checks        OFF
release-simcore               unchanged
runtime mutation              NONE
```

The manual P4 Ruleset setup proved that `GitHub Actions` is not available as a bypass actor. Current automated state writers therefore require protected-main compatibility before enforcement can safely be activated.

## Local pre-commit proof

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

## Implementation finding 1

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
