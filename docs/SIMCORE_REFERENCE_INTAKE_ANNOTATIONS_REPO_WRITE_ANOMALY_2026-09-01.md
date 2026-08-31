# SimCore Reference Intake — Annotations Repo Write Anomaly — 2026-09-01

## Classification

`FIX · REFERENCE_INTAKE_ACCIDENTAL_EMPTY_SENTINEL_PATH · NON_RUNTIME · PRODUCTION_UNCHANGED`

## Context

While completing artifact 4 (`🔦라이트보드 주석 4.0.0.charx`) in the separate reference/archive lane, an incorrect GitHub contents write was invoked against the repository root path `__invalid__` instead of moving the prepared Git commit into `main`.

## Observed effect

- Accidental commit: `2d3dcac8556009861bc81dd5ef3070984194e4ea`
- Accidental path: `__invalid__`
- Content: empty file
- SimCore runtime paths changed: none
- `release-simcore` changed: no
- `plugins/simcore/latest.js` changed: no
- `plugins/simcore/install.js` changed: no

## Immediate repair

History was not rewritten. The accidental empty file was removed in the next commit:

- cleanup commit: `a2f45eaeb8e9e2a6aa44c25c20ff6ee967dbe21c`
- resulting tree returned to the pre-anomaly tree: `3a50c8260c81168e0b8f059c1e2e08549b4aaf1c`

The prepared annotations archive was then required to be re-based mechanically on the cleaned `main` before admission.

## Disposition

`RESOLVED · FIXED_FORWARD · NO_HISTORY_REWRITE · REFERENCE_ONLY · PRODUCTION_UNCHANGED`
