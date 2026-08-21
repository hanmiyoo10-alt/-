#!/usr/bin/env python3
from pathlib import Path

TARGETS = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.63.59'
TO_VERSION = '0.64.0'

RELEASE_NOTE = r'''// v0.64.0 M2-2 Representation Ownership Split:
// - Starts the next staged 2.0M Major checkpoint from the v0.63.59 production baseline; this checkpoint is mechanical ownership movement, not a feature release
// - Introduces Representation as a first-class memory-only module owning the bounded CANONICAL / HOST_RAW / FRESH_CHAT provenance ledger, prior representation taxonomy, exact visible carryover classification and fingerprint-length deltas
// - Runtime Mirror still owns Fresh chat observation plus strict identity/location/staleness guards and mirror writes, but no longer owns the provenance ledger or exposes provenance through its runtime API
// - The outer request shell now consumes Representation facts through the new module; v0.63.55 representation-fast eligibility and edit-origin routing remain unchanged in decision semantics
// - Genuine user edits remain the frozen positive control: Prior EXACT + current matches neither canonical nor Fresh continues to route USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT
// - Fresh remains identity evidence, never a body source: no raw Fresh body retention, persistent representation state, chat/history mutation, network call or timer is introduced
// - Recovery/output-compat/bootstrap-migration, Deferred Mirror safety, Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence/Structure, cache/history observation, storage schema and prompt placement remain frozen
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
  const fresh = String(row.freshFingerprint || '');
  const canonical = String(row.canonicalFingerprint || '');
  const hostRaw = String(row.hostRawFingerprint || '');
  if (visible === fresh) return 'FRESH_CHAT';
  if (visible === canonical) return 'CANONICAL';
  if (visible === hostRaw) return 'HOST_RAW';
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
  const representation = priorRepresentation(row);
  const match = currentMatch(visibleFingerprint, row);
  const currentChars = fingerprintChars(visibleFingerprint);
  const canonicalChars = fingerprintChars(priorCanonical);
  const freshChars = fingerprintChars(priorFresh);
  return Object.freeze({
    priorCanonical,
    priorFresh,
    priorHostRaw,
    priorMatch,
    priorRepresentation: representation,
    currentMatch: match,
    deltaCanonical: currentChars != null && canonicalChars != null ? currentChars - canonicalChars : null,
    deltaFresh: currentChars != null && freshChars != null ? currentChars - freshChars : null,
    deltaShape: deltaShape(match),
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

OLD_RELATION_BLOCK = r'''    const provenanceRows = runtimeMirror.provenanceLedger();
    let priorProvenance = null;
    for (let i = provenanceRows.length - 1; i >= 0; i--) {
      const row = provenanceRows[i];
      if (Number(row?.outIndex) !== lastAssistant) continue;
      if (coreLocationKey && String(row?.locationKey || '') !== String(coreLocationKey)) continue;
      priorProvenance = row;
      break;
    }
    const priorCanonical = String(priorProvenance?.canonicalFingerprint || '');
    const priorFresh = String(priorProvenance?.freshFingerprint || '');
    const priorHostRaw = String(priorProvenance?.hostRawFingerprint || '');
    const priorMatch = String(priorProvenance?.fingerprintMatch || '');
    const priorRepresentation = !priorProvenance
      ? 'UNAVAILABLE'
      : ((['CANONICAL', 'FRESH_CONFIRMED_SUFFIX', 'BOUNDARY_CONFIRMED_SUFFIX', 'SAFE_BOUNDARY_CONFIRMED'].includes(priorMatch))
        ? 'EXACT'
        : (priorMatch === 'HOST_RAW' ? 'HOST_RAW_MATCH' : 'OUTPUT_MISMATCH'));
    const currentMatch = visibleFingerprint && visibleFingerprint === priorFresh
      ? 'FRESH_CHAT'
      : (visibleFingerprint && visibleFingerprint === priorCanonical
        ? 'CANONICAL'
        : (visibleFingerprint && visibleFingerprint === priorHostRaw ? 'HOST_RAW' : 'NONE'));
    const fingerprintChars = (value) => {
      const match = String(value || '').match(/^(\d+):/);
      return match ? Number(match[1]) : null;
    };
    const currentChars = fingerprintChars(visibleFingerprint);
    const canonicalChars = fingerprintChars(priorCanonical);
    const freshChars = fingerprintChars(priorFresh);'''

NEW_RELATION_BLOCK = '''    const priorProvenance = representationRegistry.latest(lastAssistant, coreLocationKey);\n    const relation = representationRules.inspectCarryover(visibleFingerprint, priorProvenance);\n    const { priorCanonical, priorFresh, priorHostRaw, priorMatch, priorRepresentation, currentMatch } = relation;'''


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def patch(text: str) -> str:
    if f'//@version {FROM_VERSION}' not in text:
        if f'//@version {TO_VERSION}' in text and 'SimCore.define("representation"' in text:
            return text
        raise SystemExit('unexpected source version')

    text = replace_once(text, f'//@version {FROM_VERSION}', f'//@version {TO_VERSION}', 'metadata version')
    text = replace_once(text, f"const SIMCORE_RUNTIME_VERSION = '{FROM_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{TO_VERSION}';", 'runtime version')

    text = replace_once(
        text,
        '// - Output Compat: output envelope compatibility/canonicalization + bounded Fresh-confirmation metadata',
        '// - Representation: bounded CANONICAL/HOST_RAW/FRESH_CHAT identity + provenance classification only; memory-only, no raw bodies or chat writes\n// - Output Compat: output envelope compatibility/canonicalization + bounded Fresh-confirmation metadata',
        'module inventory comment',
    )
    text = replace_once(text, '// v0.63.59 Broadcast End Closure Contract:', RELEASE_NOTE + '//\n// v0.63.59 Broadcast End Closure Contract:', 'release note')

    mirror_marker = 'SimCore.define("runtime-mirror", function (require, module, exports) {'
    text = replace_once(text, mirror_marker, REPRESENTATION_MODULE + '\n\n' + mirror_marker, 'representation module insertion')

    old_mirror_head = '''function createMirrorRuntime(deps) {\n  const { coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey, getCoreSession, runtimeIsCurrent, getRuntimeEpoch } = deps;\n  let sequence = 0;\n  const latestByLocation = new Map();\n  const PROVENANCE_LEDGER_LIMIT = 16;\n  const provenanceLedger = [];\n  let lastProbe = null;\n\n  function rememberProvenance(probe) {\n    if (!probe || !probe.freshFingerprintFull) return;\n    const entry = Object.freeze({\n      outIndex: Number(probe.outIndex),\n      locationKey: String(probe.locationKey || ''),\n      status: String(probe.status || 'n/a'),\n      fingerprintMatch: String(probe.fingerprintMatch || 'n/a'),\n      canonicalFingerprint: String(probe.canonicalFingerprintFull || ''),\n      hostRawFingerprint: String(probe.hostRawFingerprintFull || ''),\n      freshFingerprint: String(probe.freshFingerprintFull || ''),\n      at: Number(probe.finishedAt || Date.now()),\n    });\n    for (let i = provenanceLedger.length - 1; i >= 0; i--) {\n      if (provenanceLedger[i].locationKey === entry.locationKey && provenanceLedger[i].outIndex === entry.outIndex) provenanceLedger.splice(i, 1);\n    }\n    provenanceLedger.push(entry);\n    if (provenanceLedger.length > PROVENANCE_LEDGER_LIMIT) provenanceLedger.splice(0, provenanceLedger.length - PROVENANCE_LEDGER_LIMIT);\n  }'''
    new_mirror_head = '''function createMirrorRuntime(deps) {\n  const { coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey, getCoreSession, runtimeIsCurrent, getRuntimeEpoch, rememberRepresentation } = deps;\n  let sequence = 0;\n  const latestByLocation = new Map();\n  let lastProbe = null;'''
    text = replace_once(text, old_mirror_head, new_mirror_head, 'runtime mirror ownership head')
    text = replace_once(text, '      rememberProvenance(probe);', '      rememberRepresentation(probe);', 'mirror provenance handoff')
    text = replace_once(text, '    provenanceLedger.length = 0;\n', '', 'mirror provenance clear ownership')
    text = replace_once(
        text,
        '  return Object.freeze({ schedule, lastProbe: () => lastProbe, provenanceLedger: () => provenanceLedger.slice(), clear });',
        '  return Object.freeze({ schedule, lastProbe: () => lastProbe, clear });',
        'mirror public API narrowing',
    )

    text = replace_once(
        text,
        "  const runtimeSessionRules = SimCore.require('runtime-session');\n  const runtimeMirrorRules = SimCore.require('runtime-mirror');",
        "  const runtimeSessionRules = SimCore.require('runtime-session');\n  const representationRules = SimCore.require('representation');\n  const runtimeMirrorRules = SimCore.require('runtime-mirror');",
        'outer representation require',
    )
    text = replace_once(
        text,
        '''  const runtimeMirror = runtimeMirrorRules.createMirrorRuntime({\n    coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey,\n    getCoreSession: () => coreSession,\n    runtimeIsCurrent,\n    getRuntimeEpoch: () => runtimeEpoch,\n  });''',
        '''  const representationRegistry = representationRules.createRegistry(16);\n  const runtimeMirror = runtimeMirrorRules.createMirrorRuntime({\n    coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey,\n    getCoreSession: () => coreSession,\n    runtimeIsCurrent,\n    getRuntimeEpoch: () => runtimeEpoch,\n    rememberRepresentation: (probe) => representationRegistry.remember(probe),\n  });''',
        'representation registry wiring',
    )

    text = replace_once(text, OLD_RELATION_BLOCK, NEW_RELATION_BLOCK, 'request relation extraction')
    text = replace_once(
        text,
        '      perfDetail.editDeltaCanonical = currentChars != null && canonicalChars != null ? currentChars - canonicalChars : null;\n      perfDetail.editDeltaFresh = currentChars != null && freshChars != null ? currentChars - freshChars : null;',
        '      perfDetail.editDeltaCanonical = relation.deltaCanonical;\n      perfDetail.editDeltaFresh = relation.deltaFresh;',
        'request delta delegation',
    )
    text = replace_once(
        text,
        "      let deltaShape = currentMatch === 'FRESH_CHAT' ? 'FRESH_EXACT_CARRYOVER'\n        : (currentMatch === 'CANONICAL' ? 'CANONICAL_EXACT_CARRYOVER'\n          : (currentMatch === 'HOST_RAW' ? 'HOST_RAW_EXACT_CARRYOVER' : 'NEW_VISIBLE_REPRESENTATION'));",
        '      let deltaShape = relation.deltaShape;',
        'carryover shape delegation',
    )

    provenance_calls = text.count('runtimeMirror.provenanceLedger()')
    if provenance_calls != 1:
        raise SystemExit(f'expected one remaining runtimeMirror.provenanceLedger() call after relation extraction, got {provenance_calls}')
    text = text.replace('runtimeMirror.provenanceLedger()', 'representationRegistry.rows()')

    marker = "      `Output representation: ${runtimeProbeRules.representation(lastDeferredProbe)}`,"
    if marker not in text:
        raise SystemExit('output representation diagnostic marker not found')
    text = text.replace(
        marker,
        marker + "\n      `Representation ownership: REPRESENTATION · ledger ${representationRegistry.rows().length} · mirror TRANSPORT_ONLY · raw bodies NOT RETAINED`,",
        1,
    )

    cleanup = '    lastDiagnosticRequestProbe = null;\n    runtimeMirror.clear();'
    text = replace_once(
        text,
        cleanup,
        '    lastDiagnosticRequestProbe = null;\n    representationRegistry.clear();\n    runtimeMirror.clear();',
        'representation cleanup ownership',
    )

    return text


for target in TARGETS:
    source = target.read_text(encoding='utf-8')
    updated = patch(source)
    target.write_text(updated, encoding='utf-8')

latest = TARGETS[0].read_text(encoding='utf-8')
install = TARGETS[1].read_text(encoding='utf-8')
if latest != install:
    raise SystemExit('latest.js and install.js diverged after patch')

required = [
    'SimCore.define("representation"',
    'representationRules.inspectCarryover',
    'representationRegistry.latest',
    'representationRegistry.remember',
    'Representation ownership: REPRESENTATION',
    'REPRESENTATION_DRIFT_CORRELATED',
    'USER_EDIT_CANDIDATE',
    "reason: 'representation-fast-reconciled'",
]
for needle in required:
    if needle not in latest:
        raise SystemExit(f'missing expected post-patch marker: {needle}')

runtime_mirror = latest.split('SimCore.define("runtime-mirror"', 1)[1].split('SimCore.define("runtime-hooks"', 1)[0]
for forbidden in ('const provenanceLedger = []', 'rememberProvenance(', 'provenanceLedger:'):
    if forbidden in runtime_mirror:
        raise SystemExit(f'runtime-mirror still owns provenance symbol: {forbidden}')
if 'runtimeMirror.provenanceLedger()' in latest:
    raise SystemExit('outer shell still consumes provenance through runtime-mirror')

print('SimCore M2-2 Representation Ownership Split patch: OK')
