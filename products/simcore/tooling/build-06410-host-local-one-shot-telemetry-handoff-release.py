#!/usr/bin/env python3
import importlib.util
from pathlib import Path

BASE = Path(__file__).with_name('build-06410-host-local-one-shot-telemetry-handoff.py')
spec = importlib.util.spec_from_file_location('simcore_06410_builder_base', BASE)
if spec is None or spec.loader is None:
    raise SystemExit('06410_RELEASE_BUILDER_IMPORT_FAILED')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# The draft builder counted getLocalPluginStorage across the complete bundle,
# so its release-note mention collided with the one executable Host API use.
# Keep the runtime implementation intact and make the note generic; the base
# postcondition then verifies the executable API surface exactly once.
mod.RELEASE_NOTE = mod.RELEASE_NOTE.replace(
    'through Risuai.getLocalPluginStorage()',
    'through the authorized Host local plugin-storage API',
)

base_patch = mod.patch


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'06410_RELEASE_PATCH_ANCHOR_INVALID {label} count={count}')
    return text.replace(old, new, 1)


def release_patch(text):
    updated = base_patch(text)
    updated = replace_once(
        updated,
        "        host: runtimeTelemetryRules.diagnostics().host || null,\n        serializedChars: Number(write?.serializedChars || 0),",
        "        host: runtimeTelemetryRules.diagnostics().host || null,\n        serialization: write?.serialization || 'UNKNOWN',\n        serializedChars: Number(write?.serializedChars || 0),",
        'checkpoint-serialization-attribution',
    )
    updated = replace_once(
        updated,
        "        host: runtimeTelemetryRules.diagnostics().host || null,\n        serializedChars: 0,",
        "        host: runtimeTelemetryRules.diagnostics().host || null,\n        serialization: 'FAILED',\n        serializedChars: 0,",
        'checkpoint-failure-serialization-attribution',
    )
    updated = replace_once(
        updated,
        " · HOST_LOCAL ${lastTelemetryCheckpointProbe.hostLocal || 'UNAVAILABLE'} · ${Number(lastTelemetryCheckpointProbe.serializedChars || 0)} chars${lastTelemetryCheckpointProbe.hostElapsedMs > 0 ?",
        " · HOST_LOCAL ${lastTelemetryCheckpointProbe.hostLocal || 'UNAVAILABLE'}${lastTelemetryCheckpointProbe.serialization && lastTelemetryCheckpointProbe.serialization !== 'OK' ? ` · serialization ${lastTelemetryCheckpointProbe.serialization}` : ''} · ${Number(lastTelemetryCheckpointProbe.serializedChars || 0)} chars${lastTelemetryCheckpointProbe.hostElapsedMs > 0 ?",
        'checkpoint-serialization-diagnostic',
    )
    if updated.count("serialization: write?.serialization || 'UNKNOWN'") != 1:
        raise SystemExit('06410_RELEASE_PATCH_POSTCONDITION_INVALID serialization-probe')
    if updated.count('serialization ${lastTelemetryCheckpointProbe.serialization}') != 1:
        raise SystemExit('06410_RELEASE_PATCH_POSTCONDITION_INVALID serialization-diagnostic')
    return updated


mod.patch = release_patch

if __name__ == '__main__':
    mod.main()
