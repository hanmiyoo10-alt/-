#!/usr/bin/env python3
from pathlib import Path
import re

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.69.0'
TARGET_VERSION = '0.69.1'

RELEASE_NOTE = '''// v0.69.1 Refreshless Targeted Update Liveness Repair:\n// - Retires disposed runtime hooks and UI before optional UNLOAD telemetry so same-tab + replacement cannot be held behind Host-local I/O\n// - Keeps OUTPUT_COMMIT on the existing awaited Host-local durable publication path while UNLOAD uses only the existing bounded memory/session publish path\n// - Adds no detached Host write, retry, polling, timer, storage key, telemetry schema, persistent-state or M2 architecture change\n// - Preserves runtimeDisposed/runtimeEpoch stale-work defense and requires exactly-one active hook/UI surface after targeted replacement\n//\n'''


def fail(code, detail=''):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail('06901_PATCH_ANCHOR_INVALID', f'{label} count={count}')
    return text.replace(old, new, 1)


def patch(text):
    text = one(text, f'//@version {FROM_VERSION}', f'//@version {TARGET_VERSION}', 'metadata-version')
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.69.0';", "const SIMCORE_RUNTIME_VERSION = '0.69.1';", 'runtime-version')
    text = one(text, "const HOST_COMPAT_VERSION = '0.69.0';", "const HOST_COMPAT_VERSION = '0.69.1';", 'host-version')
    text = one(text, '// v0.69.0 M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion:', RELEASE_NOTE + '// v0.69.0 M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion:', 'release-note')

    host_publish = "      await runtimeTelemetryRules.publishWithHostLocal(globalThis, typeof window !== 'undefined' ? window : null, Risuai, capsule);"
    split_publish = """      if (normalizedTrigger === 'UNLOAD') {
        runtimeTelemetryRules.publish(globalThis, typeof window !== 'undefined' ? window : null, capsule);
      } else {
        await runtimeTelemetryRules.publishWithHostLocal(globalThis, typeof window !== 'undefined' ? window : null, Risuai, capsule);
      }"""
    text = one(text, host_publish, split_publish, 'trigger-split-publication')

    old_unload = """  await Risuai.onUnload(async () => {
    runtimeDisposed = true;
    runtimeEpoch += 1;
    await checkpointRuntimeTelemetry('UNLOAD');
    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);
    for (const part of simcoreUiParts.splice(0)) {
      if (!part?.id) continue;
      try { await Risuai.unregisterUIPart(part.id); } catch (_) {}
    }
    coreSession = null;"""
    new_unload = """  await Risuai.onUnload(async () => {
    runtimeDisposed = true;
    runtimeEpoch += 1;
    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);
    for (const part of simcoreUiParts.splice(0)) {
      if (!part?.id) continue;
      try { await Risuai.unregisterUIPart(part.id); } catch (_) {}
    }
    await checkpointRuntimeTelemetry('UNLOAD');
    coreSession = null;"""
    text = one(text, old_unload, new_unload, 'targeted-unload-order')

    # Keep operator-facing version identity current without changing the card's acceptance authority.
    text = one(text, "    version: '0.69.0',\n    name: 'M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion',", "    version: '0.69.1',\n    name: 'Refreshless Targeted Update Liveness Repair',", 'operator-card-identity')

    return text


def verify(before, after):
    ids = [
        re.search(r'^//@version\s+([^\s]+)\s*$', after, re.M),
        re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", after),
        re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", after),
    ]
    values = [m.group(1) if m else None for m in ids]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        fail('06901_RUNTIME_IDENTITY_SPLIT', repr(values))

    unload = after[after.index('  await Risuai.onUnload(async () => {'):]
    remove_i = unload.index('    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);')
    ui_i = unload.index('    for (const part of simcoreUiParts.splice(0)) {')
    telemetry_i = unload.index("    await checkpointRuntimeTelemetry('UNLOAD');")
    clear_i = unload.index('    coreSession = null;')
    if not (remove_i < ui_i < telemetry_i < clear_i):
        fail('06901_UNLOAD_ORDER_INVALID')

    if "normalizedTrigger === 'UNLOAD'" not in after:
        fail('06901_TRIGGER_SPLIT_MISSING')
    if "runtimeTelemetryRules.publish(globalThis, typeof window !== 'undefined' ? window : null, capsule);" not in after:
        fail('06901_LOCAL_UNLOAD_PUBLISH_MISSING')
    if after.count('publishWithHostLocal(globalThis') != before.count('publishWithHostLocal(globalThis'):
        fail('06901_HOST_DURABLE_SURFACE_COUNT_CHANGED')
    if after.count("checkpointRuntimeTelemetry('OUTPUT_COMMIT')") != before.count("checkpointRuntimeTelemetry('OUTPUT_COMMIT')"):
        fail('06901_OUTPUT_COMMIT_CALL_CHANGED')
    if after.count('const STATE_VERSION = 5;') != before.count('const STATE_VERSION = 5;'):
        fail('06901_STATE_VERSION_CHANGED')
    if after.count('const CORE_STATE_VERSION = 10;') != before.count('const CORE_STATE_VERSION = 10;'):
        fail('06901_CORE_STATE_VERSION_CHANGED')

    forbidden = ['Promise.race(', 'setTimeout(', 'setInterval(']
    # This patch must not add any new forbidden async-control surface.
    for token in forbidden:
        if after.count(token) != before.count(token):
            fail('06901_ASYNC_SURFACE_DELTA', token)


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail('06901_SOURCE_MISSING', str(path))
        originals.append(path.read_text(encoding='utf-8'))
    if originals[0] != originals[1]:
        fail('06901_PARENT_LATEST_INSTALL_DIVERGED')
    if f'//@version {FROM_VERSION}' not in originals[0]:
        fail('06901_PARENT_VERSION_MISMATCH')

    candidate = patch(originals[0])
    verify(originals[0], candidate)
    for path in FILES:
        path.write_text(candidate, encoding='utf-8')
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail('06901_OUTPUT_LATEST_INSTALL_DIVERGED')
    print('06901_BUILD_PASS')


if __name__ == '__main__':
    main()
