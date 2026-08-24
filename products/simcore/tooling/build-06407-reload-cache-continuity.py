#!/usr/bin/env python3
from pathlib import Path
import re

VERSION_FROM = '0.64.6'
VERSION_TO = '0.64.7'
RELEASE_NAME = 'Cross-Reload Cache Observer Continuity'
FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'06407_PATCH_ANCHOR_INVALID {label} count={count}')
    return text.replace(old, new, 1)


OLD_TELEMETRY = '''SimCore.define("runtime-telemetry", function (require, module, exports) {
const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';
const MAX_AGE_MS = 10 * 60 * 1000;

function capture(input) {
  const locationKey = String(input?.locationKey || '');
  if (!locationKey) return null;
  return Object.freeze({
    schema: 1,
    sourceVersion: String(input?.sourceVersion || ''),
    locationKey,
    capturedAt: Number(input?.capturedAt || Date.now()),
    runtimePromptCache: input?.runtimePromptCache || null,
    requestTopology: input?.requestTopology || null,
    cacheCandidates: input?.cacheCandidates || null,
  });
}

function publish(root, capsule) {
  if (!root || !capsule) return false;
  try { root[KEY] = capsule; return true; } catch (_) { return false; }
}

function claim(root) {
  if (!root) return null;
  try {
    const capsule = root[KEY] || null;
    try { delete root[KEY]; } catch (_) { root[KEY] = undefined; }
    return capsule;
  } catch (_) { return null; }
}

function validate(capsule, locationKey, now = Date.now()) {
  if (!capsule) return { accepted: false, reason: 'no-compatible-handoff', capsule: null };
  if (Number(capsule.schema) !== 1) return { accepted: false, reason: 'schema-mismatch', capsule: null };
  if (String(capsule.locationKey || '') !== String(locationKey || '')) return { accepted: false, reason: 'location-mismatch', capsule: null };
  const ageMs = Math.max(0, Number(now) - Number(capsule.capturedAt || 0));
  if (!Number.isFinite(ageMs) || ageMs > MAX_AGE_MS) return { accepted: false, reason: 'expired', ageMs, capsule: null };
  return { accepted: true, reason: 'adopted', ageMs, capsule };
}
module.exports = { capture, publish, claim, validate };
});'''

NEW_TELEMETRY = '''SimCore.define("runtime-telemetry", function (require, module, exports) {
const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';
const SESSION_KEY = '__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__';
const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_SESSION_CHARS = 16384;
let lastWriteProbe = null;
let lastClaimProbe = null;

function capture(input) {
  const locationKey = String(input?.locationKey || '');
  if (!locationKey) return null;
  return Object.freeze({
    schema: 1,
    sourceVersion: String(input?.sourceVersion || ''),
    locationKey,
    capturedAt: Number(input?.capturedAt || Date.now()),
    runtimePromptCache: input?.runtimePromptCache || null,
    requestTopology: input?.requestTopology || null,
    cacheCandidates: input?.cacheCandidates || null,
  });
}

function sessionStorageOf(windowLike) {
  try {
    const storage = windowLike?.sessionStorage || null;
    return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function' && typeof storage.removeItem === 'function'
      ? storage
      : null;
  } catch (_) { return null; }
}

function publish(root, windowLike, capsule) {
  if (!capsule) return false;
  let memory = 'UNAVAILABLE';
  let session = 'UNAVAILABLE';
  let serializedChars = 0;
  if (root) {
    try { root[KEY] = capsule; memory = 'WRITTEN'; }
    catch (_) { memory = 'FAILED'; }
  }
  const storage = sessionStorageOf(windowLike);
  if (storage) {
    try {
      const encoded = JSON.stringify(capsule);
      serializedChars = encoded.length;
      if (serializedChars > MAX_SESSION_CHARS) {
        session = 'OVERSIZE';
        try { storage.removeItem(SESSION_KEY); } catch (_) {}
      } else {
        storage.setItem(SESSION_KEY, encoded);
        session = 'WRITTEN';
      }
    } catch (_) { session = 'FAILED'; }
  }
  lastWriteProbe = Object.freeze({ memory, session, serializedChars, maxSessionChars: MAX_SESSION_CHARS, retainedBodies: false });
  return memory === 'WRITTEN' || session === 'WRITTEN';
}

function takeMemory(root) {
  if (!root) return { status: 'unavailable', capsule: null };
  try {
    const capsule = root[KEY] || null;
    try { delete root[KEY]; } catch (_) { root[KEY] = undefined; }
    return { status: capsule ? 'available' : 'empty', capsule };
  } catch (_) { return { status: 'failed', capsule: null }; }
}

function takeSession(windowLike) {
  const storage = sessionStorageOf(windowLike);
  if (!storage) return { status: 'unavailable', capsule: null, serializedChars: 0 };
  let raw = null;
  try { raw = storage.getItem(SESSION_KEY); }
  catch (_) { return { status: 'failed', capsule: null, serializedChars: 0 }; }
  if (raw == null) return { status: 'empty', capsule: null, serializedChars: 0 };
  try { storage.removeItem(SESSION_KEY); } catch (_) {}
  const serializedChars = String(raw).length;
  if (serializedChars > MAX_SESSION_CHARS) return { status: 'oversize', capsule: null, serializedChars };
  try { return { status: 'available', capsule: JSON.parse(String(raw)), serializedChars }; }
  catch (_) { return { status: 'malformed', capsule: null, serializedChars }; }
}

function claim(root, windowLike) {
  const memory = takeMemory(root);
  const session = takeSession(windowLike);
  lastClaimProbe = Object.freeze({
    memory: memory.status,
    session: session.status,
    sessionChars: Number(session.serializedChars || 0),
    memoryValidation: 'PENDING',
    sessionValidation: 'PENDING',
    selected: 'NONE',
    retainedBodies: false,
  });
  return Object.freeze({ claimSchema: 1, memory: memory.capsule, session: session.capsule, sessionStatus: session.status });
}

function validateCapsule(capsule, locationKey, now) {
  if (!capsule) return { accepted: false, reason: 'no-compatible-handoff', capsule: null };
  if (Number(capsule.schema) !== 1) return { accepted: false, reason: 'schema-mismatch', capsule: null };
  if (String(capsule.locationKey || '') !== String(locationKey || '')) return { accepted: false, reason: 'location-mismatch', capsule: null };
  const ageMs = Math.max(0, Number(now) - Number(capsule.capturedAt || 0));
  if (!Number.isFinite(ageMs) || ageMs > MAX_AGE_MS) return { accepted: false, reason: 'expired', ageMs, capsule: null };
  return { accepted: true, reason: 'adopted', ageMs, capsule };
}

function validationClass(result) {
  if (result?.accepted) return 'exact';
  if (result?.reason === 'expired') return 'stale';
  if (result?.reason === 'no-compatible-handoff') return 'empty';
  return 'mismatch';
}

function validate(claimed, locationKey, now = Date.now()) {
  if (!claimed || Number(claimed.claimSchema) !== 1) {
    const legacy = validateCapsule(claimed, locationKey, now);
    return { ...legacy, transport: legacy.accepted ? 'memory' : null, fallbackFrom: null };
  }
  const memory = validateCapsule(claimed.memory, locationKey, now);
  if (memory.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: 'exact', sessionValidation: claimed.session ? 'standby' : 'empty', selected: 'memory' });
    return { ...memory, transport: 'memory', fallbackFrom: null };
  }
  const session = validateCapsule(claimed.session, locationKey, now);
  if (session.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: 'exact', selected: 'session' });
    return { ...session, transport: 'session', fallbackFrom: memory.reason };
  }
  const sessionReason = claimed.sessionStatus === 'malformed'
    ? 'session-malformed'
    : (claimed.sessionStatus === 'oversize' ? 'session-oversize' : session.reason);
  lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: validationClass(session), selected: 'NONE' });
  const primary = claimed.memory ? memory : { ...session, reason: sessionReason };
  return { ...primary, transport: null, fallbackFrom: claimed.memory ? sessionReason : null };
}

function diagnostics() {
  return Object.freeze({ write: lastWriteProbe, claim: lastClaimProbe, sessionKey: SESSION_KEY, maxSessionChars: MAX_SESSION_CHARS });
}
module.exports = { capture, publish, claim, validate, diagnostics };
});'''

RELEASE_NOTE = '''// v0.64.7 Cross-Reload Cache Observer Continuity:
// - Extends the existing metadata-only runtime telemetry handoff from globalThis memory to a two-tier same-tab transport: globalThis first, window.sessionStorage fallback
// - sessionStorage uses __SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__ with a 16,384-character serialized bound; malformed, oversized, unavailable, disabled, quota-failed, stale, schema-mismatched and location-mismatched capsules fail open without affecting Core state
// - Claims both transport candidates once at runtime boot, validates memory first and session second, and consumes stored session data so a refresh fallback cannot replay indefinitely
// - Retains only the existing runtime-prefix sketch, request-topology signatures and cache-trajectory metadata; raw request/output bodies, prompts, hooks, sessions, Core SnapshotStore state and provider cache controls are never persisted in the handoff
// - Adds transport attribution to continuity diagnostics while provider cache remains explicitly UNVERIFIED; no provider hit/miss claim, network call, timer, pluginStorage call, request-history mutation or generation semantic change is introduced
// - Scope is runtime-telemetry transport only; Representation/Edit Reconcile, Recovery, Broadcast/Frame/Time/Evidence/Lineage/Handoff/Recurrence/Structure/COMMUNITY/Reaction and M2-3 ownership remain frozen
//
'''


def patch(text: str) -> str:
    text = replace_once(text, '//@version 0.64.6', '//@version 0.64.7', 'metadata-version')
    text, count = re.subn(r"const SIMCORE_RUNTIME_VERSION = '0\.64\.6';", "const SIMCORE_RUNTIME_VERSION = '0.64.7';", text)
    if count != 1:
        raise SystemExit(f'06407_PATCH_ANCHOR_INVALID runtime-version count={count}')
    text = replace_once(text, '// v0.64.6 Post-B_END C Clock Handoff Authority:\n', RELEASE_NOTE + '// v0.64.6 Post-B_END C Clock Handoff Authority:\n', 'release-note')
    text = replace_once(text, OLD_TELEMETRY, NEW_TELEMETRY, 'runtime-telemetry-module')
    text = replace_once(text, 'let pendingTelemetryHandoff = runtimeTelemetryRules.claim(globalThis);', "let pendingTelemetryHandoff = runtimeTelemetryRules.claim(globalThis, typeof window !== 'undefined' ? window : null);", 'claim-call')
    text = replace_once(text, "          sourceVersion: adoption.capsule?.sourceVersion || null, ageMs: adoption.ageMs ?? null,\n          runtimePrefix: restoredRuntimePrefix, topology: restoredTopology, trajectory: restoredTrajectory,", "          sourceVersion: adoption.capsule?.sourceVersion || null, ageMs: adoption.ageMs ?? null,\n          transport: adoption.transport || null, fallbackFrom: adoption.fallbackFrom || null,\n          claim: runtimeTelemetryRules.diagnostics().claim,\n          runtimePrefix: restoredRuntimePrefix, topology: restoredTopology, trajectory: restoredTrajectory,", 'continuity-probe')
    text = replace_once(text, "  return `ADOPTED · from ${probe.sourceVersion || '?'} · age ${cadence(probe.ageMs)} · topology ${probe.topology ? 'RESTORED' : 'FRESH'} · runtime-prefix ${probe.runtimePrefix ? 'RESTORED' : 'FRESH'} · trajectory ${probe.trajectory ? 'RESTORED' : 'FRESH'}`;", "  return `ADOPTED · via ${probe.transport || 'memory'} · from ${probe.sourceVersion || '?'} · age ${cadence(probe.ageMs)} · topology ${probe.topology ? 'RESTORED' : 'FRESH'} · runtime-prefix ${probe.runtimePrefix ? 'RESTORED' : 'FRESH'} · trajectory ${probe.trajectory ? 'RESTORED' : 'FRESH'}`;", 'continuity-label')
    text = replace_once(text, 'runtimeTelemetryRules.publish(globalThis, runtimeTelemetryRules.capture({', "runtimeTelemetryRules.publish(globalThis, typeof window !== 'undefined' ? window : null, runtimeTelemetryRules.capture({", 'publish-call')
    return text


def main() -> None:
    original = FILES[0].read_text(encoding='utf-8')
    mirror = FILES[1].read_text(encoding='utf-8')
    if original != mirror:
        raise SystemExit('06407_PRECONDITION_LATEST_INSTALL_MISMATCH')
    if '//@version 0.64.6' not in original:
        raise SystemExit('06407_PRECONDITION_VERSION_MISMATCH')
    updated = patch(original)
    for path in FILES:
        path.write_text(updated, encoding='utf-8', newline='\n')
    print('SIMCORE_06407_PATCH_PASS')


if __name__ == '__main__':
    main()
