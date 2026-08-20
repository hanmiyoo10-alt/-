from pathlib import Path
import re

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

RELEASE_NOTES = """// v0.63.53 Boundary-Normalized Envelope Recovery:
// - Follows v0.63.52 real long-chat validation where a genuine user edit was correctly classified USER_EDIT_CANDIDATE, while a separate unedited B_END entered SAME_FAST/EXACT and then produced THOUGHTS_COMPAT 4252c, one # 응답 candidate, CANONICAL↔FRESH -4247c and Deferred Mirror OUTPUT_MISMATCH
// - Extends the existing v0.63.51 Fresh-Confirmed Envelope Recovery with a bounded fingerprint-only boundary check: after the exact candidate fingerprint misses, at most two trailing CR/LF characters may be removed from the unique HOST_RAW suffix and each bounded variant is compared against the already-read FRESH_CHAT fingerprint
// - Recovery succeeds only when one such CR/LF-only boundary variant is FRESH_EXACT; the Fresh body is never copied into canonical output, candidate/variant bodies are not retained, and non-CR/LF differences or larger deltas remain FRESH_MISMATCH with setChat blocked
// - Adds BOUNDARY_CONFIRMED_SUFFIX plus boundary delta/kind/chars telemetry while preserving existing FRESH_CONFIRMED_SUFFIX behavior, Edit Origin Attribution, Structure/COMMUNITY quarantine, Deferred Mirror strict identity/staleness gates and all request/cache/history semantics
// - Output-boundary scope only: Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence, TAIL_AFTER_CURRENT_USER, History stabilization OBSERVE_ONLY, Host Prefix Attribution, provider cache UNVERIFIED, persistent schema, network/timer/storage surfaces and generation semantics remain frozen
//
"""

NEW_CONFIRMATION = r'''function buildBoundaryEnvelopeCandidates(candidateText) {
  const raw = String(candidateText || '');
  const out = [];
  let current = raw;
  let removed = '';
  for (let i = 0; i < 2; i++) {
    const last = current.slice(-1);
    if (last !== '\n' && last !== '\r') break;
    removed = last + removed;
    current = current.slice(0, -1);
    if (!current.startsWith('# 응답') || current.length < 128) break;
    const kind = removed === '\n' ? 'TRAILING_LF'
      : (removed === '\r\n' ? 'TRAILING_CRLF'
        : (removed === '\n\n' ? 'TRAILING_LF_LF'
          : (removed === '\r\r' ? 'TRAILING_CR_CR' : 'TRAILING_CR_LF')));
    out.push(Object.freeze({
      fingerprint: kernel.fingerprintText(current),
      chars: current.length,
      deltaChars: current.length - raw.length,
      kind,
    }));
  }
  return Object.freeze(out);
}

function buildFreshEnvelopeConfirmation(rawPrefix, matches, candidates) {
  const rows = Array.isArray(matches) ? matches : [];
  const list = Array.isArray(candidates) ? candidates : [];
  if (rows.length !== 1 || list.length !== 1) return null;
  const classification = classifyPreamble(rawPrefix, rows.length, false);
  if (classification.prefixKind !== 'THOUGHTS_COMPAT') return null;
  const candidate = list[0];
  const candidateText = String(candidate?.text || '');
  if (!candidateText.startsWith('# 응답') || candidateText.length < 128) return null;
  if (!candidate?.integrity?.frameOk || !candidate?.integrity?.knowledgeOk) return null;
  return Object.freeze({
    status: 'PENDING',
    source: 'HOST_RAW_SUFFIX',
    confirmation: 'FRESH_EXACT',
    candidateFingerprint: kernel.fingerprintText(candidateText),
    candidateChars: candidateText.length,
    boundaryCandidates: buildBoundaryEnvelopeCandidates(candidateText),
    envelopeOffset: Number(rows[0]?.index || 0),
    persistentMutation: 'NONE',
  });
}

// Whole-response restart recovery.'''

OLD_MIRROR_MATCH = r'''        const candidateFingerprint = String(confirmation?.candidateFingerprint || '');
        const normalMatch = actualFingerprint === canonical ? 'CANONICAL' : (actualFingerprint === hostRaw ? 'HOST_RAW' : 'MISMATCH');
        const freshConfirmed = normalMatch === 'MISMATCH'
          && confirmation?.status === 'PENDING'
          && confirmation?.confirmation === 'FRESH_EXACT'
          && !!candidateFingerprint
          && actualFingerprint === candidateFingerprint;
        const fingerprintMatch = freshConfirmed ? 'FRESH_CONFIRMED_SUFFIX' : normalMatch;'''

NEW_MIRROR_MATCH = r'''        const candidateFingerprint = String(confirmation?.candidateFingerprint || '');
        const boundaryCandidates = Array.isArray(confirmation?.boundaryCandidates) ? confirmation.boundaryCandidates : [];
        const normalMatch = actualFingerprint === canonical ? 'CANONICAL' : (actualFingerprint === hostRaw ? 'HOST_RAW' : 'MISMATCH');
        const exactFreshConfirmed = normalMatch === 'MISMATCH'
          && confirmation?.status === 'PENDING'
          && confirmation?.confirmation === 'FRESH_EXACT'
          && !!candidateFingerprint
          && actualFingerprint === candidateFingerprint;
        const boundaryMatch = !exactFreshConfirmed && normalMatch === 'MISMATCH'
          && confirmation?.status === 'PENDING'
          && confirmation?.confirmation === 'FRESH_EXACT'
          ? boundaryCandidates.find((row) => String(row?.fingerprint || '') === actualFingerprint) || null
          : null;
        const freshConfirmed = exactFreshConfirmed || !!boundaryMatch;
        const recoveryPolicy = boundaryMatch ? 'BOUNDARY_CONFIRMED_SUFFIX' : (exactFreshConfirmed ? 'FRESH_CONFIRMED_SUFFIX' : null);
        const fingerprintMatch = recoveryPolicy || normalMatch;'''

OLD_DETAIL = r'''          detail.fingerprintMatch = fingerprintMatch;
          detail.freshEnvelopeRecovery = freshConfirmed ? 'RECOVERED' : (confirmation ? 'FRESH_MISMATCH' : 'NOT_APPLICABLE');
          detail.freshEnvelopeSource = freshConfirmed ? String(confirmation.source || 'HOST_RAW_SUFFIX') : null;
          detail.freshEnvelopePersistent = 'NONE';'''

NEW_DETAIL = r'''          detail.fingerprintMatch = fingerprintMatch;
          detail.freshEnvelopeRecovery = freshConfirmed ? 'RECOVERED' : (confirmation ? 'FRESH_MISMATCH' : 'NOT_APPLICABLE');
          detail.freshEnvelopeSource = freshConfirmed ? String(confirmation.source || 'HOST_RAW_SUFFIX') : null;
          detail.freshEnvelopePolicy = recoveryPolicy;
          detail.freshEnvelopeCandidateChars = confirmation ? Number(confirmation.candidateChars || 0) : 0;
          detail.freshEnvelopeBoundaryChars = boundaryMatch ? Number(boundaryMatch.chars || 0) : 0;
          detail.freshEnvelopeBoundaryDelta = boundaryMatch ? Number(boundaryMatch.deltaChars || 0) : 0;
          detail.freshEnvelopeBoundaryKind = boundaryMatch ? String(boundaryMatch.kind || 'CRLF_ONLY') : null;
          detail.freshEnvelopePersistent = 'NONE';'''

OLD_PROBE_INIT = r'''      freshEnvelopeRecovery: freshEnvelopeConfirmation ? 'PENDING' : 'NOT_APPLICABLE',
      freshEnvelopeSource: null,
      freshEnvelopePersistent: 'NONE','''

NEW_PROBE_INIT = r'''      freshEnvelopeRecovery: freshEnvelopeConfirmation ? 'PENDING' : 'NOT_APPLICABLE',
      freshEnvelopeSource: null,
      freshEnvelopePolicy: null,
      freshEnvelopeCandidateChars: Number(freshEnvelopeConfirmation?.candidateChars || 0),
      freshEnvelopeBoundaryChars: 0,
      freshEnvelopeBoundaryDelta: 0,
      freshEnvelopeBoundaryKind: null,
      freshEnvelopePersistent: 'NONE','''

OLD_PROBE_COPY = r'''      probe.freshEnvelopeRecovery = detail.freshEnvelopeRecovery ?? probe.freshEnvelopeRecovery;
      probe.freshEnvelopeSource = detail.freshEnvelopeSource ?? probe.freshEnvelopeSource;
      probe.freshEnvelopePersistent = detail.freshEnvelopePersistent ?? probe.freshEnvelopePersistent;'''

NEW_PROBE_COPY = r'''      probe.freshEnvelopeRecovery = detail.freshEnvelopeRecovery ?? probe.freshEnvelopeRecovery;
      probe.freshEnvelopeSource = detail.freshEnvelopeSource ?? probe.freshEnvelopeSource;
      probe.freshEnvelopePolicy = detail.freshEnvelopePolicy ?? probe.freshEnvelopePolicy;
      probe.freshEnvelopeCandidateChars = detail.freshEnvelopeCandidateChars ?? probe.freshEnvelopeCandidateChars;
      probe.freshEnvelopeBoundaryChars = detail.freshEnvelopeBoundaryChars ?? probe.freshEnvelopeBoundaryChars;
      probe.freshEnvelopeBoundaryDelta = detail.freshEnvelopeBoundaryDelta ?? probe.freshEnvelopeBoundaryDelta;
      probe.freshEnvelopeBoundaryKind = detail.freshEnvelopeBoundaryKind ?? probe.freshEnvelopeBoundaryKind;
      probe.freshEnvelopePersistent = detail.freshEnvelopePersistent ?? probe.freshEnvelopePersistent;'''

OLD_DIAGNOSTIC = """      `Envelope recovery: ${deferredMirror ? `${deferredMirror.freshEnvelopeRecovery || 'NOT_APPLICABLE'} · source ${deferredMirror.freshEnvelopeSource || 'n/a'} · confirmation ${deferredMirror.fingerprintMatch === 'FRESH_CONFIRMED_SUFFIX' ? 'FRESH_EXACT' : 'n/a'} · persistent ${deferredMirror.freshEnvelopePersistent || 'NONE'}` : 'n/a'}`,
      `Output hotspot:"""

NEW_DIAGNOSTIC = """      `Envelope recovery: ${deferredMirror ? `${deferredMirror.freshEnvelopeRecovery || 'NOT_APPLICABLE'} · policy ${deferredMirror.freshEnvelopePolicy || 'n/a'} · source ${deferredMirror.freshEnvelopeSource || 'n/a'} · confirmation ${deferredMirror.freshEnvelopeRecovery === 'RECOVERED' ? 'FRESH_EXACT' : 'n/a'} · persistent ${deferredMirror.freshEnvelopePersistent || 'NONE'}` : 'n/a'}`,
      `Envelope boundary: ${deferredMirror?.freshEnvelopePolicy === 'BOUNDARY_CONFIRMED_SUFFIX' ? `RAW_SUFFIX ${Number(deferredMirror.freshEnvelopeCandidateChars || 0)} → NORMALIZED ${Number(deferredMirror.freshEnvelopeBoundaryChars || 0)} · Δchars ${Number(deferredMirror.freshEnvelopeBoundaryDelta || 0) >= 0 ? '+' : ''}${Number(deferredMirror.freshEnvelopeBoundaryDelta || 0)} · ${deferredMirror.freshEnvelopeBoundaryKind || 'CRLF_ONLY'} · FRESH_EXACT` : 'NOT_APPLICABLE'}`,
      `Output hotspot:"""

OLD_PREAMBLE_POLICY = """· policy ${deferredMirror?.freshEnvelopeRecovery === 'RECOVERED' ? 'FRESH_CONFIRMED_SUFFIX' : (preamble.policy || 'n/a')}"""
NEW_PREAMBLE_POLICY = """· policy ${deferredMirror?.freshEnvelopeRecovery === 'RECOVERED' ? (deferredMirror.freshEnvelopePolicy || 'FRESH_CONFIRMED_SUFFIX') : (preamble.policy || 'n/a')}"""


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def patch(text: str) -> str:
    text = replace_once(text, '//@version 0.63.52', '//@version 0.63.53', 'metadata version')
    text = replace_once(text, "const SIMCORE_RUNTIME_VERSION = '0.63.52';", "const SIMCORE_RUNTIME_VERSION = '0.63.53';", 'runtime version')
    text = replace_once(text, '// v0.63.52 Edit Origin Attribution:\n', RELEASE_NOTES + '// v0.63.52 Edit Origin Attribution:\n', 'release notes')

    pattern = re.compile(r'function buildFreshEnvelopeConfirmation\(rawPrefix, matches, candidates\) \{.*?\n\}\n\n// Whole-response restart recovery\.', re.S)
    text, n = pattern.subn(NEW_CONFIRMATION, text, count=1)
    if n != 1:
        raise SystemExit(f'fresh confirmation function: expected one match, got {n}')

    text = replace_once(text, OLD_MIRROR_MATCH, NEW_MIRROR_MATCH, 'mirror match')
    text = replace_once(text, OLD_DETAIL, NEW_DETAIL, 'mirror detail')
    text = replace_once(text, OLD_PROBE_INIT, NEW_PROBE_INIT, 'probe init')
    text = replace_once(text, OLD_PROBE_COPY, NEW_PROBE_COPY, 'probe copy')
    text = replace_once(text, OLD_DIAGNOSTIC, NEW_DIAGNOSTIC, 'diagnostic envelope')
    text = replace_once(text, OLD_PREAMBLE_POLICY, NEW_PREAMBLE_POLICY, 'preamble policy')

    required = [
        'v0.63.53 Boundary-Normalized Envelope Recovery',
        'buildBoundaryEnvelopeCandidates',
        "'BOUNDARY_CONFIRMED_SUFFIX'",
        'freshEnvelopeBoundaryDelta',
        'Envelope boundary:',
        "return stabilizationResult('OBSERVE_ONLY'",
        "source: 'REQUEST_SIGNATURE_OBSERVER'",
        'provider UNVERIFIED',
        "persistentMutation: 'NONE'",
    ]
    for needle in required:
        if needle not in text:
            raise SystemExit(f'missing required marker: {needle}')
    if 'slot.content = replacement.canonicalRaw' in text:
        raise SystemExit('active request-history mutator assignment remains')
    return text


base = FILES[0].read_text(encoding='utf-8')
patched = patch(base)
for path in FILES:
    path.write_text(patched, encoding='utf-8')
