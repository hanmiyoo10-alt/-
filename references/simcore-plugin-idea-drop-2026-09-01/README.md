# SimCore plugin idea/reference source drop — 2026-09-01

This directory archives the post-SNS user-supplied LightBoard / MiniBoard reference batch one artifact at a time.

## Authority boundary

- Reference/archive only.
- Not SimCore runtime code.
- Not a dependency approval.
- Not a roadmap commitment.
- Does not modify `release-simcore`, `plugins/simcore/latest.js`, or `plugins/simcore/install.js`.
- Deliberately separate from the active S7 release/convergence lane.
- Each source artifact is admitted only with exact byte length and SHA-256 identity.

## Intake

1. `lightboard-interview-2.0.risum` — **COMPLETE**
   - original: `🔦 라이트보드-인터뷰2.0.risum`
   - bytes: `14834`
   - SHA-256: `99bc6753b2cda7cfe8925aa8eca65d0699d96da644bdc7953abc79d6c8839506`
   - transport: deterministic gzip → base64 → 2 verified text parts
   - gzip bytes: `4613`
   - gzip SHA-256: `d6bb66dbfcce95d4445966413d1e8ce1d1bc812c98048c4ce4842a260b04a854`
   - restore: `./RESTORE-INTERVIEW.sh`
2. `lightboard-alter-store-1.03.1.risum` — **COMPLETE**
   - original: `🛒라이트보드 알터 스토어 Ver.1.03.1.risum`
   - bytes: `46348`
   - SHA-256: `c4dae1d170b6c9cd506f15f1c646a51639e745cbeb8851d30342f97714ca1bd9`
   - transport: deterministic gzip → base64 → 3 verified text parts
   - gzip bytes: `13712`
   - gzip SHA-256: `8887de19e2154e39553b2c69a763dab30c061f2a29446e4b7150ed421ab749ca`
   - restore: `./RESTORE-ALTER-STORE.sh`

`MANIFEST.json` records the exact source and transport identities.

## Current disposition

`ARTIFACTS_1_2_COMPLETE · BATCH_OPEN · REFERENCE_ONLY · PRODUCTION_UNCHANGED`
