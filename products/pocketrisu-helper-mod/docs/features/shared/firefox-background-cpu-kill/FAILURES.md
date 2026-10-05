# Failure ledger — firefox-background-cpu-kill

Feature-ID: `firefox-background-cpu-kill`
Stages: `LOCAL_TEST | CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

No implementation/PR failure recorded yet.

Diagnostic note:
- Prior hypotheses around V3 iframe footprint and generic memory pressure did not establish deterministic causality.
- The 2026-10-06 Android `excessive cpu` kill evidence supersedes those as the leading mechanism for the visible Firefox reconstruction.
