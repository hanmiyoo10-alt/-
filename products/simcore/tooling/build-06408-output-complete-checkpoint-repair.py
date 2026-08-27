#!/usr/bin/env python3
from pathlib import Path
import re

VERSION_FROM = '0.64.7'
VERSION_TO = '0.64.8'
RELEASE_NAME = 'Output-Complete Telemetry Checkpoint Repair'
FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'06408_PATCH_ANCHOR_INVALID {label} count={count}')
    return text.replace(old, new, 1)


RELEASE_NOTE = '''// v0.64.8 Output-Complete Telemetry Checkpoint Repair:
// - Repairs the confirmed v0.64.7 live-gate omission where same-tab session telemetry was published only from onUnload and no output-complete checkpoint existed before a full page refresh
// - Adds one best-effort outer-runtime telemetry checkpoint wrapper shared by active authoritative OUTPUT_COMMIT and UNLOAD; the existing runtime-telemetry capsule schema, memory-first/session-fallback transport, 10-minute age bound and 16,384-character session bound remain unchanged
// - OUTPUT_COMMIT checkpointing occurs only after CoreRulesetSession.processOutput returns active from its authoritative out save, requires the runtime generation to remain current and a known location key, and never downgrades or throws through an already committed output
// - Adds one bounded Last Turn Diagnostic checkpoint line exposing session write disposition, serialized character count, local checkpoint cost and trigger only; no exception message or raw capsule/body content is retained
// - Provider cache remains explicitly UNVERIFIED; no provider-cache control/claim, network call, timer loop, pluginStorage write, SnapshotStore semantic write, host chat write or request-history mutation is introduced
// - Representation/Edit Reconcile, Recovery, Broadcast/Frame/Time/Evidence/Lineage/Handoff/Recurrence/Summary/Structure/COMMUNITY/Reaction/Prompt semantics and M2-3 ownership remain frozen
//
'''

PROBE_ANCHOR = '''  let lastDiagnosticRequestProbe = null;
  let lastDiagnosticCopyProbe = null;

  const { perfNow, perfMs } = ops;
'''

PROBE_REPLACEMENT = '''  let lastDiagnosticRequestProbe = null;
  let lastDiagnosticCopyProbe = null;
  let lastTelemetryCheckpointProbe = null;

  const { perfNow, perfMs } = ops;
'''

TRACKER_ANCHOR = '''  let pendingTelemetryHandoff = runtimeTelemetryRules.claim(globalThis, typeof window !== 'undefined' ? window : null);
  let telemetryAdoptionAttempted = false;
  const runtimeSession = runtimeSessionRules.createSessionRuntime({
'''

TRACKER_REPLACEMENT = '''  let pendingTelemetryHandoff = runtimeTelemetryRules.claim(globalThis, typeof window !== 'undefined' ? window : null);
  let telemetryAdoptionAttempted = false;

  function checkpointRuntimeTelemetry(trigger) {
    const normalizedTrigger = trigger === 'UNLOAD' ? 'UNLOAD' : 'OUTPUT_COMMIT';
    try {
      const locationKey = String(coreKey || coreLocationKey || '');
      if (!locationKey) return null;
      const startedAt = perfNow();
      const capsule = runtimeTelemetryRules.capture({
        sourceVersion: SIMCORE_RUNTIME_VERSION,
        locationKey,
        capturedAt: Date.now(),
        runtimePromptCache: runtimePromptCache.exportState(),
        requestTopology: requestTopology.exportState(),
        cacheCandidates: cacheCandidates.exportState(),
      });
      if (!capsule) return null;
      runtimeTelemetryRules.publish(globalThis, typeof window !== 'undefined' ? window : null, capsule);
      const write = runtimeTelemetryRules.diagnostics().write || null;
      const probe = Object.freeze({
        trigger: normalizedTrigger,
        memory: write?.memory || 'UNAVAILABLE',
        session: write?.session || 'UNAVAILABLE',
        serializedChars: Number(write?.serializedChars || 0),
        elapsedMs: perfMs(startedAt),
        retainedBodies: false,
      });
      lastTelemetryCheckpointProbe = probe;
      return probe;
    } catch (_) {
      const probe = Object.freeze({
        trigger: normalizedTrigger,
        memory: 'FAILED',
        session: 'FAILED',
        serializedChars: 0,
        elapsedMs: 0,
        retainedBodies: false,
      });
      lastTelemetryCheckpointProbe = probe;
      return probe;
    }
  }

  const runtimeSession = runtimeSessionRules.createSessionRuntime({
'''

OUTPUT_ANCHOR = '''    if (!result.active) {
      markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'BYPASSED', outputAt: Date.now() });
      return content;
    }
    markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'COMMITTED', outputAt: Date.now() });
'''

OUTPUT_REPLACEMENT = '''    if (!result.active) {
      markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'BYPASSED', outputAt: Date.now() });
      return content;
    }
    if (runtimeIsCurrent() && String(coreKey || coreLocationKey || '')) {
      checkpointRuntimeTelemetry('OUTPUT_COMMIT');
    }
    markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'COMMITTED', outputAt: Date.now() });
'''

DIAGNOSTIC_ANCHOR = '''      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,
      `Cache topology cost: ${requestBreakdown ? diagnosticFormatMs(requestBreakdown.cacheTopologyMs) : 'n/a'} · candidate ${lastCacheCandidateCostMs == null ? 'n/a' : diagnosticFormatMs(lastCacheCandidateCostMs)} · provider cache UNVERIFIED`,
'''

DIAGNOSTIC_REPLACEMENT = '''      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,
      `Telemetry checkpoint: ${lastTelemetryCheckpointProbe ? `SESSION · ${lastTelemetryCheckpointProbe.session || 'UNAVAILABLE'} · ${Number(lastTelemetryCheckpointProbe.serializedChars || 0)} chars · ${diagnosticFormatMs(lastTelemetryCheckpointProbe.elapsedMs)} · trigger ${lastTelemetryCheckpointProbe.trigger || 'UNKNOWN'}` : 'n/a'}`,
      `Cache topology cost: ${requestBreakdown ? diagnosticFormatMs(requestBreakdown.cacheTopologyMs) : 'n/a'} · candidate ${lastCacheCandidateCostMs == null ? 'n/a' : diagnosticFormatMs(lastCacheCandidateCostMs)} · provider cache UNVERIFIED`,
'''

UNLOAD_ANCHOR = '''    try {
      runtimeTelemetryRules.publish(globalThis, typeof window !== 'undefined' ? window : null, runtimeTelemetryRules.capture({
        sourceVersion: SIMCORE_RUNTIME_VERSION,
        locationKey: String(coreKey || coreLocationKey || ''),
        capturedAt: Date.now(),
        runtimePromptCache: runtimePromptCache.exportState(),
        requestTopology: requestTopology.exportState(),
        cacheCandidates: cacheCandidates.exportState(),
      }));
    } catch (_) {}
'''

UNLOAD_REPLACEMENT = '''    checkpointRuntimeTelemetry('UNLOAD');
'''


def patch(text: str) -> str:
    text = replace_once(text, '//@version 0.64.7', '//@version 0.64.8', 'metadata-version')
    text, count = re.subn(r"const SIMCORE_RUNTIME_VERSION = '0\.64\.7';", "const SIMCORE_RUNTIME_VERSION = '0.64.8';", text)
    if count != 1:
        raise SystemExit(f'06408_PATCH_ANCHOR_INVALID runtime-version count={count}')
    text = replace_once(
        text,
        '// v0.64.7 Cross-Reload Cache Observer Continuity:\n',
        RELEASE_NOTE + '// v0.64.7 Cross-Reload Cache Observer Continuity:\n',
        'release-note',
    )
    text = replace_once(text, PROBE_ANCHOR, PROBE_REPLACEMENT, 'checkpoint-probe')
    text = replace_once(text, TRACKER_ANCHOR, TRACKER_REPLACEMENT, 'checkpoint-helper')
    text = replace_once(text, OUTPUT_ANCHOR, OUTPUT_REPLACEMENT, 'output-commit-callsite')
    text = replace_once(text, DIAGNOSTIC_ANCHOR, DIAGNOSTIC_REPLACEMENT, 'checkpoint-diagnostic')
    text = replace_once(text, UNLOAD_ANCHOR, UNLOAD_REPLACEMENT, 'unload-redundancy')

    checks = {
        "output-checkpoint-call": text.count("checkpointRuntimeTelemetry('OUTPUT_COMMIT')"),
        "unload-checkpoint-call": text.count("checkpointRuntimeTelemetry('UNLOAD')"),
        "checkpoint-diagnostic": text.count('`Telemetry checkpoint: ${lastTelemetryCheckpointProbe ?'),
        "checkpoint-helper": text.count('function checkpointRuntimeTelemetry(trigger)'),
        "session-key": text.count("__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__"),
    }
    for label, count in checks.items():
        if label == 'session-key':
            if count < 2:
                raise SystemExit(f'06408_PATCH_POSTCONDITION_INVALID {label} count={count}')
        elif count != 1:
            raise SystemExit(f'06408_PATCH_POSTCONDITION_INVALID {label} count={count}')
    if "const MAX_AGE_MS = 10 * 60 * 1000;" not in text:
        raise SystemExit('06408_PATCH_POSTCONDITION_INVALID max-age')
    if "const MAX_SESSION_CHARS = 16384;" not in text:
        raise SystemExit('06408_PATCH_POSTCONDITION_INVALID max-session-chars')
    return text


def main() -> None:
    original = FILES[0].read_text(encoding='utf-8')
    mirror = FILES[1].read_text(encoding='utf-8')
    if original != mirror:
        raise SystemExit('06408_PRECONDITION_LATEST_INSTALL_MISMATCH')
    if '//@version 0.64.7' not in original:
        raise SystemExit('06408_PRECONDITION_VERSION_MISMATCH')
    updated = patch(original)
    for path in FILES:
        path.write_text(updated, encoding='utf-8', newline='\n')
    print('SIMCORE_06408_PATCH_PASS')


if __name__ == '__main__':
    main()
