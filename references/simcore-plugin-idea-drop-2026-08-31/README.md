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
3. `lightboard-status-window-4.0.0.charx` — **COMPLETE**
   - original: `🔦라이트보드 상태창 4.0.0.charx`
   - bytes: `10752`
   - SHA-256: `263d2827d1fda16164b44332e6533bad363b4dacf693db7ca9ae2eb30a7a1fee`
   - authoritative transport: deterministic gzip → explicit JSON byte arrays → 12 verified parts
   - gzip bytes: `10586`
   - gzip SHA-256: `767c0197f61d1efae968802d7f4b5eb3df33ec97ef73d24c361027662efb5dfe`
   - restore: `./RESTORE-STATUS-WINDOW.sh`
4. `lightboard-annotations-4.0.0.charx` — **COMPLETE**
   - original: `🔦라이트보드 주석 4.0.0.charx`
   - bytes: `16938`
   - SHA-256: `00c3aac1d5e0bdb0a4d8a9e8c97988761651d2b47dc937ec16abee0df9a86124`
   - authoritative transport: deterministic gzip → explicit JSON byte arrays → 5 verified parts
   - gzip bytes: `16747`
   - gzip SHA-256: `c6d8684693b64b82c91251f65a396a49c833163147cdbea70ad69d412bffa0d3`
   - restore: `./RESTORE-ANNOTATIONS.sh`

`MANIFEST.json` records original filenames, normalized repository filenames, byte lengths, SHA-256 identities, transport identities, and per-artifact completion state.

## Transport note

The initial raw-base64 KakaoTalk intake exposed one unverified slice-length mismatch. That slice was removed before authority was granted. KakaoTalk and MomoTalk use deterministic gzip-base64 parts under `source-gzip-base64/`.

For the Status Window intake, opaque base64 and hex transport attempts were rejected by the tool safety boundary before authority was granted. Those experimental/orphan blobs are non-authoritative and are not linked into the repository tree. The final Status Window representation uses transparent JSON arrays of gzip byte values under `source-gzip-json-bytes/`. Every linked part's Git blob identity matched the locally computed expected identity, and concatenating the byte arrays reconstructs the exact deterministic gzip stream and original SHA-256.

Annotations reuse the same transparent JSON-byte transport under `source-gzip-json-bytes/`, with five larger verified parts. Every linked part's Git blob identity matched the locally computed expected identity before tree admission.

## Current disposition

`ARTIFACTS_1_4_COMPLETE · BATCH_COMPLETE · REFERENCE_ONLY · PRODUCTION_UNCHANGED`
