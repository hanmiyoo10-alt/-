# Fortune Golf 3D Target

This directory is the concrete App API Mod Lab target root for the legacy Fortune Golf compatibility work.

- ecosystem: Risu X / `standalone`
- kind: `app`
- category: `game`
- migration authority: issue #2602
- source provenance: branch `fortune-golf-apk` at `62a2e4bab3aa272e021440f05c18c237ea6c592f`
- runtime status: `PARTIAL_HISTORICAL_EVIDENCE`
- release/deployment authority: `UNASSIGNED`

## What moved

The first migration slice preserves only target-owned material from the legacy branch:

- `docs/` — 17 Fortune Golf-specific investigation/handoff documents
- `probe/` — WIE overlay, MC_DB, image/resource/selection diagnostics, and target-specific Ghidra helpers
- `android/README.md` — historical Android build entrypoint notes
- `tools/analysis_env.py` — Fortune Golf analysis helper

The original branch remains historical provenance and is not merged wholesale.

## What did not move

The following remain outside this target:

- original proprietary Com2uS game ZIP/JAR/APK/native payloads
- legacy branch-only Fortune Golf GitHub Actions workflows
- generic Ghidra provisioning/transfer workflows
- unrelated WIE source or behavior
- any release/deployment channel

Old branch-only workflows encode path/ref assumptions and require a separate migration before they can run from this target root.

## Authority boundary

The repository owns the target-local overlay/probe code, diagnostics, sanitized notes, and future target-local adaptations.

The original Fortune Golf game artifact remains external/private input. WIE upstream authority remains with `dlunch/wie`; the legacy work pins `1ed8710956e727629e67db762ddc1e6bd6151a1f`.

Materialization does not prove a working port or current device compatibility.

Historical handoff evidence says the title/menu was reached after compatibility patches, while actual round/save completion was not verified, graphics corruption remained, and first-run memory/EventQueue behavior remained unresolved.

## Next validation

Before claiming current compatibility, migrate or replace the old branch-only build/test workflow under a separately authorized packet, then re-run the strongest available build/unit/device validation against this target-local layout.
