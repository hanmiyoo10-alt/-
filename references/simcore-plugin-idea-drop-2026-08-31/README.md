# SimCore plugin idea/reference source drop — 2026-08-31

This directory archives a new user-supplied Lightboard/MiniBoard reference batch for later SimCore idea analysis.

## Authority boundary

- Reference/archive only.
- Not SimCore runtime code.
- Not a dependency approval.
- Not a roadmap commitment.
- Does not modify `release-simcore`, `plugins/simcore/latest.js`, or `plugins/simcore/install.js`.
- This intake is deliberately separate from the active S7 release/convergence lane.
- Each source artifact is admitted one at a time and tracked by exact byte length and SHA-256.

## Intake batch

1. `lightboard-kakaotalk-v1.3-3.0.0-popover.risum` — **COMPLETE**
   - original: `🔦라이트보드 카카오톡 V1.3-3.0.0 팝오버.risum`
   - bytes: `54631`
   - SHA-256: `5578f4898fc19810aea93657c444e244e66485de5f8c7f9edc2e51ea576673cc`
   - authoritative transport: deterministic gzip → base64 → 5 verified parts
   - restore: `./RESTORE-KAKAOTALK.sh`
2. `miniboard-renderer-momotalk-1.0.0.charx` — **PENDING**
3. `lightboard-status-window-4.0.0.charx` — **PENDING**
4. `lightboard-annotations-4.0.0.charx` — **PENDING**

`MANIFEST.json` records original filenames, normalized repository filenames, byte lengths, SHA-256 identities, transport identities, and per-artifact completion state.

## Transport note

The initial raw-base64 KakaoTalk intake exposed one unverified slice-length mismatch. That slice was removed before authority was granted. The final KakaoTalk source representation is the five-part deterministic gzip-base64 set under `source-gzip-base64/`, whose Git blob identities were checked against locally computed blob identities before tree admission.

## Current disposition

`ARTIFACT_1_COMPLETE · ARTIFACTS_2_4_PENDING · REFERENCE_ONLY · PRODUCTION_UNCHANGED`
