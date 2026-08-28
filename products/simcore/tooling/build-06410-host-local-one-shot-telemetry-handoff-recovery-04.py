#!/usr/bin/env python3
import subprocess

SOURCE_COMMIT = 'c8117b3ff8caaab218187bed28c0f52a02f99c3b'
SOURCE_PATH = 'products/simcore/tooling/build-06410-host-local-one-shot-telemetry-handoff.py'


def load_immutable_builder_source():
    result = subprocess.run(
        ['git', 'show', f'{SOURCE_COMMIT}:{SOURCE_PATH}'],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        raise SystemExit('06410_RECOVERY04_SOURCE_UNAVAILABLE')
    source = result.stdout
    for marker in [
        "VERSION_TO = '0.64.10'",
        "HOST_LOCAL_KEY = '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__'",
        "def patch(text):",
        "if checks['host-api'] != 1:",
        "def main():",
    ]:
        if marker not in source:
            raise SystemExit(f'06410_RECOVERY04_SOURCE_INVALID marker={marker}')
    old = "    if checks['host-api'] != 1:\n"
    new = "    if checks['host-api'] != 2:\n"
    if source.count(old) != 1:
        raise SystemExit(f'06410_RECOVERY04_HARNESS_ANCHOR_INVALID count={source.count(old)}')
    source = source.replace(old, new, 1)
    if source.count("if checks['host-api'] != 2:") != 1:
        raise SystemExit('06410_RECOVERY04_HARNESS_PATCH_FAILED')
    return source


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'06410_RECOVERY04_PATCH_ANCHOR_INVALID {label} count={count}')
    return text.replace(old, new, 1)


def main():
    source = load_immutable_builder_source()
    scope = {
        '__name__': 'simcore_06410_builder_base',
        '__file__': SOURCE_PATH,
        '__package__': None,
    }
    exec(compile(source, SOURCE_PATH, 'exec'), scope, scope)

    scope['RELEASE_NOTE'] = scope['RELEASE_NOTE'].replace(
        'through Risuai.getLocalPluginStorage()',
        'through the authorized Host local plugin-storage API',
    )
    if scope['RELEASE_NOTE'].count('getLocalPluginStorage') != 0:
        raise SystemExit('06410_RECOVERY04_RELEASE_NOTE_NORMALIZATION_FAILED')

    base_patch = scope['patch']

    def release_patch(text):
        updated = base_patch(text)
        guard = "typeof hostApi.getLocalPluginStorage !== 'function'"
        call = "await hostApi.getLocalPluginStorage()"
        if updated.count(guard) != 1:
            raise SystemExit(f'06410_RECOVERY04_RUNTIME_GUARD_INVALID count={updated.count(guard)}')
        if updated.count(call) != 1:
            raise SystemExit(f'06410_RECOVERY04_RUNTIME_CALL_INVALID count={updated.count(call)}')
        if updated.count('getLocalPluginStorage') != 2:
            raise SystemExit(f'06410_RECOVERY04_RUNTIME_API_SURFACE_INVALID count={updated.count("getLocalPluginStorage")}')
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
            raise SystemExit('06410_RECOVERY04_PATCH_POSTCONDITION_INVALID serialization-probe')
        if updated.count('serialization ${lastTelemetryCheckpointProbe.serialization}') != 1:
            raise SystemExit('06410_RECOVERY04_PATCH_POSTCONDITION_INVALID serialization-diagnostic')
        return updated

    scope['patch'] = release_patch
    scope['main']()


if __name__ == '__main__':
    main()
