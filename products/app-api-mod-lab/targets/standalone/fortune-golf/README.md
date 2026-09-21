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
- generic Ghidra provisioning/transfer workflows
- unrelated WIE source or behavior
- any release/deployment channel

The target-specific APK and web build workflows are migrated separately under issue #2606 and consume this target-local `probe/` source. Generic Ghidra provisioning/transfer workflows remain outside this target.

## Build validation

Canonical target-specific workflows:
- `.github/workflows/fortune-golf-apk.yml`
- `.github/workflows/fortune-golf-web-probe.yml`

Both keep WIE pinned at `1ed8710956e727629e67db762ddc1e6bd6151a1f` and apply `probe/` from the triggering repository candidate. The historical Probe 11 overlay commit `cefe56950c8a31066d05dc844c493958ec752fbe` remains provenance only; all six probe blobs matched the migrated target source at #2606 scope lock.

A successful workflow proves only the scoped build/unit/artifact checks. It does not prove current game/device compatibility.

## Authority boundary

The repository owns the target-local overlay/probe code, diagnostics, sanitized notes, and future target-local adaptations.

The original Fortune Golf game artifact remains external/private input. WIE upstream authority remains with `dlunch/wie`; the legacy work pins `1ed8710956e727629e67db762ddc1e6bd6151a1f`.

Materialization does not prove a working port or current device compatibility.

Historical handoff evidence says the title/menu was reached after compatibility patches, while actual round/save completion was not verified, graphics corruption remained, and first-run memory/EventQueue behavior remained unresolved.

## Next validation

Before claiming current compatibility, first re-establish build/unit/artifact evidence through the canonical target workflows, then run a separately bounded device experiment with the user-held original game input.
