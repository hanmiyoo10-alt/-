#!/usr/bin/env python3
from pathlib import Path
import re

TARGETS = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.63.59'
TO_VERSION = '0.64.0'

RELEASE_NOTE = '''// v0.64.0 M2-2 Representation Ownership Split:
// - Starts the next staged 2.0M Major checkpoint from the v0.63.59 production baseline; this checkpoint is mechanical ownership movement, not a feature release
// - Introduces Representation as a first-class memory-only module owning the bounded CANONICAL / HOST_RAW / FRESH_CHAT provenance ledger, prior representation taxonomy, exact visible carryover classification and fingerprint-length deltas
// - Runtime Mirror still owns Fresh chat observation plus strict identity/location/staleness guards and mirror writes, but no longer owns the provenance ledger or exposes provenance through its runtime API
// - The outer request shell consumes Representation facts directly; v0.63.55 representation-fast eligibility and edit-origin routing remain unchanged in decision semantics
// - Genuine user edits remain the frozen positive control: Prior EXACT + current matches neither canonical nor Fresh continues to route USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT
// - Fresh remains identity evidence, never a body source: no raw Fresh body retention, persistent representation state, chat/history mutation, network call or timer is introduced
// - Recovery/output-compat/bootstrap-migration, Deferred Mirror safety, Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence/Structure, cache/history observation, storage schema and prompt placement remain frozen
//
'''

REPRESENTATION_MODULE = r'''SimCore.define("representation", function (require, module, exports) {
const EXACT_PRIOR_MATCHES = Object.freeze([
  'CANONICAL',
  'FRESH_CONFIRMED_SUFFIX',
  'BOUNDARY_CONFIRMED_SUFFIX',
  'SAFE_BOUNDARY_CONFIRMED',
]);

function fingerprintChars(value) {
  const match = String(value || '').match(/^(\d+):/);
  return match ? Number(match[1]) : null;
}

function priorRepresentation(row) {
  if (!row) return 'UNAVAILABLE';
  const match = String(row.fingerprintMatch || '');
  if (EXACT_PRIOR_MATCHES.includes(match)) return 'EXACT';
  if (match === 'HOST_RAW') return 'HOST_RAW_MATCH';
  return 'OUTPUT_MISMATCH';
}

function currentMatch(visibleFingerprint, row) {
  const visible = String(visibleFingerprint || '');
  if (!visible || !row) return 'NONE';
  if (visible === String(row.freshFingerprint || '')) return 'FRESH_CHAT';
  if (visible === String(row.canonicalFingerprint || '')) return 'CANONICAL';
  if (visible === String(row.hostRawFingerprint || '')) return 'HOST_RAW';
  return 'NONE';
}

function deltaShape(match) {
  if (match === 'FRESH_CHAT') return 'FRESH_EXACT_CARRYOVER';
  if (match === 'CANONICAL') return 'CANONICAL_EXACT_CARRYOVER';
  if (match === 'HOST_RAW') return 'HOST_RAW_EXACT_CARRYOVER';
  return 'NEW_VISIBLE_REPRESENTATION';
}

function inspectCarryover(visibleFingerprint, row) {
  const priorCanonical = String(row?.canonicalFingerprint || '');
  const priorFresh = String(row?.freshFingerprint || '');
  const priorHostRaw = String(row?.hostRawFingerprint || '');
  const priorMatch = String(row?.fingerprintMatch || '');
  const prior = priorRepresentation(row);
  const current = currentMatch(visibleFingerprint, row);
  const currentChars = fingerprintChars(visibleFingerprint);
  const canonicalChars = fingerprintChars(priorCanonical);
  const freshChars = fingerprintChars(priorFresh);
  return Object.freeze({
    priorCanonical, priorFresh, priorHostRaw, priorMatch,
    priorRepresentation: prior,
    currentMatch: current,
    deltaCanonical: currentChars != null && canonicalChars != null ? currentChars - canonicalChars : null,
    deltaFresh: currentChars != null && freshChars != null ? currentChars - freshChars : null,
    deltaShape: deltaShape(current),
  });
}

function createRegistry(limit = 16) {
  const maxRows = Math.max(1, Number(limit) || 16);
  const ledger = [];
  function remember(probe) {
    if (!probe || !probe.freshFingerprintFull) return;
    const entry = Object.freeze({
      outIndex: Number(probe.outIndex),
      locationKey: String(probe.locationKey || ''),
      status: String(probe.status || 'n/a'),
      fingerprintMatch: String(probe.fingerprintMatch || 'n/a'),
      canonicalFingerprint: String(probe.canonicalFingerprintFull || ''),
      hostRawFingerprint: String(probe.hostRawFingerprintFull || ''),
      freshFingerprint: String(probe.freshFingerprintFull || ''),
      at: Number(probe.finishedAt || Date.now()),
    });
    for (let i = ledger.length - 1; i >= 0; i--) {
      if (ledger[i].locationKey === entry.locationKey && ledger[i].outIndex === entry.outIndex) ledger.splice(i, 1);
    }
    ledger.push(entry);
    if (ledger.length > maxRows) ledger.splice(0, ledger.length - maxRows);
  }
  function rows() { return ledger.slice(); }
  function latest(outIndex, locationKey = '') {
    const expectedIndex = Number(outIndex);
    const expectedLocation = String(locationKey || '');
    for (let i = ledger.length - 1; i >= 0; i--) {
      const row = ledger[i];
      if (Number(row?.outIndex) !== expectedIndex) continue;
      if (expectedLocation && String(row?.locationKey || '') !== expectedLocation) continue;
      return row;
    }
    return null;
  }
  function clear() { ledger.length = 0; }
  return Object.freeze({ remember, rows, latest, clear });
}

module.exports = { createRegistry, inspectCarryover, fingerprintChars };
});'''.replace(r'\"', '"')


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def regex_one(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, got {count}')
    return updated


def patch(text):
    if f'//@version {FROM_VERSION}' not in text:
        if f'//@version {TO_VERSION}' in text and 'SimCore.define("representation"' in text:
            return text
        raise SystemExit('unexpected source version')

    text = one(text, f'//@version {FROM_VERSION}', f'//@version {TO_VERSION}', 'metadata version')
    text = one(text, f"const SIMCORE_RUNTIME_VERSION = '{FROM_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{TO_VERSION}';", 'runtime version')
    text = one(
        text,
        '// - Output Compat: output envelope compatibility/canonicalization + bounded Fresh-confirmation metadata',
        '// - Representation: bounded CANONICAL/HOST_RAW/FRESH_CHAT identity + provenance classification only; memory-only, no raw bodies or chat writes\n// - Output Compat: output envelope compatibility/canonicalization + bounded Fresh-confirmation metadata',
        'inventory comment',
    )
    text = one(text, '// v0.63.59 Broadcast End Closure Contract:', RELEASE_NOTE + '// v0.63.59 Broadcast End Closure Contract:', 'release note')

    mirror_marker = 'SimCore.define("runtime-mirror", function (require, module, exports) {'
    text = one(text, mirror_marker, REPRESENTATION_MODULE + '\n\n' + mirror_marker, 'representation module')

    text = regex_one(
        text,
        r'''function createMirrorRuntime\(deps\) \{\n  const \{ coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey, getCoreSession, runtimeIsCurrent, getRuntimeEpoch \} = deps;\n  let sequence = 0;\n  const latestByLocation = new Map\(\);\n  const PROVENANCE_LEDGER_LIMIT = 16;\n  const provenanceLedger = \[\];\n  let lastProbe = null;\n\n  function rememberProvenance\(probe\) \{.*?\n  \}\n\n  function capture''',
        '''function createMirrorRuntime(deps) {\n  const { coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey, getCoreSession, runtimeIsCurrent, getRuntimeEpoch, rememberRepresentation } = deps;\n  let sequence = 0;\n  const latestByLocation = new Map();\n  let lastProbe = null;\n\n  function capture''',
        'runtime mirror ownership',
    )
    text = one(text, '      rememberProvenance(probe);', '      rememberRepresentation(probe);', 'mirror provenance handoff')
    text = one(text, '    provenanceLedger.length = 0;\n', '', 'mirror provenance clear')
    text = one(text, '  return Object.freeze({ schedule, lastProbe: () => lastProbe, provenanceLedger: () => provenanceLedger.slice(), clear });', '  return Object.freeze({ schedule, lastProbe: () => lastProbe, clear });', 'mirror API')

    text = one(
        text,
        "  const runtimeSessionRules = SimCore.require('runtime-session');\n  const runtimeMirrorRules = SimCore.require('runtime-mirror');",
        "  const runtimeSessionRules = SimCore.require('runtime-session');\n  const representationRules = SimCore.require('representation');\n  const runtimeMirrorRules = SimCore.require('runtime-mirror');",
        'representation require',
    )
    text = one(
        text,
        '''  const runtimeMirror = runtimeMirrorRules.createMirrorRuntime({\n    coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey,\n    getCoreSession: () => coreSession,\n    runtimeIsCurrent,\n    getRuntimeEpoch: () => runtimeEpoch,\n  });''',
        '''  const representationRegistry = representationRules.createRegistry(16);\n  const runtimeMirror = runtimeMirrorRules.createMirrorRuntime({\n    coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey,\n    getCoreSession: () => coreSession,\n    runtimeIsCurrent,\n    getRuntimeEpoch: () => runtimeEpoch,\n    rememberRepresentation: (probe) => representationRegistry.remember(probe),\n  });''',
        'representation wiring',
    )

    text = regex_one(
        text,
        r'''    const provenanceRows = runtimeMirror\.provenanceLedger\(\);\n    let priorProvenance = null;.*?    const freshChars = fingerprintChars\(priorFresh\);''',
        '''    const priorProvenance = representationRegistry.latest(lastAssistant, coreLocationKey);\n    const relation = representationRules.inspectCarryover(visibleFingerprint, priorProvenance);\n    const { priorCanonical, priorFresh, priorHostRaw, priorMatch, priorRepresentation, currentMatch } = relation;''',
        'request representation relation',
    )
    text = one(
        text,
        '      perfDetail.editDeltaCanonical = currentChars != null && canonicalChars != null ? currentChars - canonicalChars : null;\n      perfDetail.editDeltaFresh = currentChars != null && freshChars != null ? currentChars - freshChars : null;',
        '      perfDetail.editDeltaCanonical = relation.deltaCanonical;\n      perfDetail.editDeltaFresh = relation.deltaFresh;',
        'delta ownership',
    )
    text = one(
        text,
        "      let deltaShape = currentMatch === 'FRESH_CHAT' ? 'FRESH_EXACT_CARRYOVER'\n        : (currentMatch === 'CANONICAL' ? 'CANONICAL_EXACT_CARRYOVER'\n          : (currentMatch === 'HOST_RAW' ? 'HOST_RAW_EXACT_CARRYOVER' : 'NEW_VISIBLE_REPRESENTATION'));",
        '      let deltaShape = relation.deltaShape;',
        'shape ownership',
    )

    if text.count('runtimeMirror.provenanceLedger()') != 1:
        raise SystemExit('expected one remaining runtimeMirror.provenanceLedger() observer call')
    text = text.replace('runtimeMirror.provenanceLedger()', 'representationRegistry.rows()', 1)

    marker = "      `Output representation: ${deferredMirror ? runtimeProbeRules.representation(deferredMirror) : 'n/a'}`,"
    text = one(
        text,
        marker,
        marker + "\n      `Representation ownership: REPRESENTATION · ledger ${representationRegistry.rows().length} · mirror TRANSPORT_ONLY · raw bodies NOT RETAINED`,",
        'representation diagnostic',
    )

    text = one(
        text,
        '    lastDiagnosticRequestProbe = null;\n    runtimeMirror.clear();',
        '    lastDiagnosticRequestProbe = null;\n    representationRegistry.clear();\n    runtimeMirror.clear();',
        'representation cleanup',
    )
    return text


for target in TARGETS:
    target.write_text(patch(target.read_text(encoding='utf-8')), encoding='utf-8')

latest = TARGETS[0].read_text(encoding='utf-8')
install = TARGETS[1].read_text(encoding='utf-8')
if latest != install:
    raise SystemExit('latest.js and install.js diverged')

for needle in (
    'SimCore.define("representation"',
    'representationRules.inspectCarryover',
    'representationRegistry.latest',
    'representationRegistry.remember',
    'Representation ownership: REPRESENTATION',
    'REPRESENTATION_DRIFT_CORRELATED',
    'USER_EDIT_CANDIDATE',
    "reason: 'representation-fast-reconciled'",
):
    if needle not in latest:
        raise SystemExit(f'missing post-patch marker: {needle}')

mirror = latest.split('SimCore.define("runtime-mirror"', 1)[1].split('SimCore.define("runtime-hooks"', 1)[0]
for forbidden in ('const provenanceLedger = []', 'rememberProvenance(', 'provenanceLedger:'):
    if forbidden in mirror:
        raise SystemExit(f'runtime-mirror still owns provenance symbol: {forbidden}')
if 'runtimeMirror.provenanceLedger()' in latest:
    raise SystemExit('outer shell still consumes provenance through runtime-mirror')

print('SimCore M2-2 Representation Ownership Split patch: OK')
