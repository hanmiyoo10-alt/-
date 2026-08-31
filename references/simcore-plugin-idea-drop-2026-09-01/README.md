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
3. `lightboard-livechat.risum` — **COMPLETE**
   - original: `🔦라이트보드 - 라이브챗.risum`
   - bytes: `16979`
   - SHA-256: `bb299ded52a369c5cd5367ae5a90e56eaa2ee60af5cf3824b704668ceb7a5909`
   - transport: deterministic gzip → base64 → 2 verified text parts
   - gzip bytes: `5773`
   - gzip SHA-256: `5e528d99797fcaf355ab9bf9c530fcca91d1ba4685de36c6ffc920c26951561f`
   - restore: `./RESTORE-LIVECHAT.sh`
4. `lightboard-namuwiki-1.8.0.risum` — **COMPLETE**
   - original: `🔦라이트보드 나무위키 v1.8.0.risum`
   - bytes: `67786`
   - SHA-256: `beba5a303b2f9ed249f31acae5b9f84e50f8927204ca7bc7dfe5a40c793d7389`
   - transport: deterministic gzip → base64 → 4 verified text parts
   - gzip bytes: `17395`
   - gzip SHA-256: `f36808c07b3f2cc87cb378f54a869ef53d14402eea34d605b965bebbd7684d54`
   - restore: `./RESTORE-NAMUWIKI.sh`
5. `lightboard-light-status-window-2.0.0-inner-thoughts-always.module.charx` — **COMPLETE**
   - original: `[🔦😋가벼운 상태창 2.0.0 - 속마음 항상].module.charx`
   - bytes: `27017`
   - SHA-256: `ec099244aaee5bb3a0ac5cccc6658482cf082bac77d701b05cd041d4a20682c4`
   - transport: deterministic gzip → base64 → 6 verified text parts
   - gzip bytes: `8924`
   - gzip SHA-256: `6fc567293ac28e249c73e2711a84f146818ff29d87481919a3a41b377d2e46ad`
   - restore: `./RESTORE-LIGHT-STATUS-200.sh`
6. `lightboard-light-status-window-2.1.0-inner-thoughts-toggle.module.charx` — **COMPLETE**
   - original: `[🔦😋가벼운 상태창 2.1.0 - 속마음 온오프].module.charx`
   - bytes: `29046`
   - SHA-256: `20f5e14296a81db164adf2c6ca3dc710630e0d85521649a948fe461919f42bc9`
   - transport: deterministic gzip → base64 → 7 verified text parts
   - gzip bytes: `9408`
   - gzip SHA-256: `8d8108834417d04d5fd6314cee4bc0ea4e3335210f18abf9cc7360cb1228ea21`
   - restore: `./RESTORE-LIGHT-STATUS-210.sh`

`MANIFEST.json` records the exact source and transport identities.

## Batch closure

The currently supplied post-SNS LightBoard / MiniBoard intake is exhausted at artifact 6.

- all received source artifacts have been archived and analyzed,
- no seventh source artifact is present in the current intake,
- any later user-supplied reference should begin a new follow-on intake rather than silently extending this closed batch,
- production/release authority remains unchanged.

## Current disposition

`ARTIFACTS_1_6_COMPLETE · BATCH_COMPLETE · REFERENCE_ONLY · PRODUCTION_UNCHANGED`
