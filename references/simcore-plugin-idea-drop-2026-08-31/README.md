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
2. `miniboard-renderer-momotalk-1.0.0.charx` — **COMPLETE**
   - original: `♦️미니보드 렌더러 · 모모톡 1.0.0.charx`
   - bytes: `17540`
   - SHA-256: `894392b57dedfff7a16d3367ed6affbbd9ef122f2afab4b735c88d9f2a9baac1`
   - authoritative transport: deterministic gzip → base64 → 6 verified parts
   - restore: `./RESTORE-MOMOTALK.sh`
3. `lightboard-status-window-4.0.0.charx` — **PENDING**
4. `lightboard-annotations-4.0.0.charx` — **PENDING**

`MANIFEST.json` records original filenames, normalized repository filenames, byte lengths, SHA-256 identities, transport identities, and per-artifact completion state.

## Transport note

The initial raw-base64 KakaoTalk intake exposed one unverified slice-length mismatch. That slice was removed before authority was granted. Completed artifacts use deterministic gzip-base64 parts under `source-gzip-base64/`; Git blob identities are checked against locally computed blob identities before tree admission.

## Current disposition

`ARTIFACTS_1_2_COMPLETE · ARTIFACTS_3_4_PENDING · REFERENCE_ONLY · PRODUCTION_UNCHANGED`
