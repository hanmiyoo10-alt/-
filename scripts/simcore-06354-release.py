from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

RELEASE_NOTES = """// v0.63.54 Safe-Envelope Structural Boundary Reconcile:
// - Follows v0.63.53 same-runtime A/B evidence where a SAFE_ENVELOPE_COMPAT B_CONTINUE produced CANONICAL 4238 vs FRESH_CHAT 4237, Deferred Mirror OUTPUT_MISMATCH, and the next unedited request was classified REPRESENTATION_DRIFT_CORRELATED and spent 4.091 s in MANUAL_EDIT_REBUILT; an exact predecessor returned to SAME_FAST 0 ms
// - Corrects the initial trailing-newline hypothesis before production: SimCore fingerprints already normalize CRLF and trim trailing whitespace, and safe envelope candidates are trimmed, so the observed -1 cannot be explained by document-end CR/LF
// - Adds a bounded canonical-derived structural-boundary confirmation only for already-safe THOUGHTS_COMPAT / SAFE_ENVELOPE_COMPAT outputs with zero structure warnings and safe state commit: one internal LF may be removed only at deterministic base→COMMUNITY, COMMUNITY→COMMUNITY, COMMUNITY→Knowledge, or base→Knowledge separators
// - The existing Deferred Mirror fresh-chat read is the sole confirmation boundary; exactly one derived boundary fingerprint must equal FRESH_CHAT exactly before SAFE_BOUNDARY_CONFIRMED may promote the trusted canonical identity. Fresh bodies are never copied or retained, and ambiguous/non-boundary mismatches remain OUTPUT_MISMATCH with setChat blocked
// - Adds Safe-envelope reconcile/boundary telemetry and treats all Fresh-confirmed identities as exact for next-turn Edit Origin Attribution; v0.63.53 unresolved-envelope recovery, Structure/COMMUNITY rules, request/history/cache behavior and strict mirror identity/staleness gates remain frozen
// - No new host read, storage read/write, network call, timer, persistent field, request mutation, history mutation, provider-cache claim, prompt relocation, or generation-semantic change is introduced
//
"""

HELPER = r'''function buildSafeEnvelopeBoundaryConfirmation(content, envelope, issues, stateCommit) {
  const preamble = envelope?.preambleProvenance || null;
  if (!envelope?.resolved
      || preamble?.kind !== 'THOUGHTS_COMPAT'
      || preamble?.action !== 'STRIPPED'
      || preamble?.policy !== 'SAFE_ENVELOPE_COMPAT'
      || Number(preamble?.candidateCount || 0) !== 1
      || (Array.isArray(issues) && issues.length)
      || stateCommit?.communitySafe !== true) return null;

  const raw = String(content || '');
  if (!raw.startsWith('# 응답') || raw.length < 128) return null;
  const canonicalFingerprint = kernel.fingerprintText(raw);
  const canonicalMatch = /^(\d+):/.exec(canonicalFingerprint);
  const canonicalChars = canonicalMatch ? Number(canonicalMatch[1]) : 0;
  const boundaries = [];
  const addBoundary = (start, kind) => {
    if (!Number.isInteger(start) || start < 2 || raw.slice(start - 2, start) !== '\n\n') return;
    const variant = raw.slice(0, start - 1) + raw.slice(start);
    const fingerprint = kernel.fingerprintText(variant);
    const match = /^(\d+):/.exec(fingerprint);
    const chars = match ? Number(match[1]) : 0;
    if (chars !== canonicalChars - 1) return;
    boundaries.push(Object.freeze({ fingerprint, chars, deltaChars: -1, kind }));
  };

  const communityRe = /<COMMUNITY(?:\s[^>]*)?>/gi;
  let communityIndex = 0;
  let match;
  while ((match = communityRe.exec(raw))) {
    const start = Number(match.index);
    const before = raw.slice(0, Math.max(0, start - 2)).trimEnd();
    addBoundary(start, communityIndex > 0 || before.endsWith('</COMMUNITY>') ? 'COMMUNITY_TO_COMMUNITY' : 'BASE_TO_COMMUNITY');
    communityIndex += 1;
  }
  const knowledge = raw.indexOf('<Knowledge>');
  if (knowledge >= 0) {
    const before = raw.slice(0, Math.max(0, knowledge - 2)).trimEnd();
    addBoundary(knowledge, before.endsWith('</COMMUNITY>') ? 'COMMUNITY_TO_KNOWLEDGE' : 'BASE_TO_KNOWLEDGE');
  }
  if (!boundaries.length) return null;

  return Object.freeze({
    status: 'PENDING',
    source: 'CANONICAL_BOUNDARY',
    confirmation: 'FRESH_EXACT',
    canonicalFingerprint,
    canonicalChars,
    boundaryCandidates: Object.freeze(boundaries),
    persistentMutation: 'NONE',
  });
}

'''


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def patch(text: str) -> str:
    text = replace_once(text, '//@version 0.63.53', '//@version 0.63.54', 'metadata version')
    text = replace_once(text, "const SIMCORE_RUNTIME_VERSION = '0.63.53';", "const SIMCORE_RUNTIME_VERSION = '0.63.54';", 'runtime version')
    text = replace_once(text, '// v0.63.53 Boundary-Normalized Envelope Recovery:\n', RELEASE_NOTES + '// v0.63.53 Boundary-Normalized Envelope Recovery:\n', 'release notes')

    text = replace_once(
        text,
        'function buildFreshEnvelopeConfirmation(rawPrefix, matches, candidates) {',
        HELPER + 'function buildFreshEnvelopeConfirmation(rawPrefix, matches, candidates) {',
        'safe-boundary helper',
    )

    text = replace_once(
        text,
        "module.exports = {\n  classifyPreamble,\n  canonicalizeResponseEnvelope,",
        "module.exports = {\n  classifyPreamble,\n  buildSafeEnvelopeBoundaryConfirmation,\n  canonicalizeResponseEnvelope,",
        'recovery export',
    )

    old_finalize = r'''    const result = finalizePreparedOutput(base, prepared, outIndex);
    // PocketRisu can persist either the raw handler input or the canonical handler result.'''
    new_finalize = r'''    const result = finalizePreparedOutput(base, prepared, outIndex);
    const safeEnvelopeBoundaryConfirmation = recovery.buildSafeEnvelopeBoundaryConfirmation(
      result.content, prepared.envelope, issues, result.stateCommit,
    );
    // PocketRisu can persist either the raw handler input or the canonical handler result.'''
    text = replace_once(text, old_finalize, new_finalize, 'safe confirmation build')

    text = replace_once(
        text,
        "    result.freshEnvelopeConfirmation = prepared.envelope.freshConfirmation || null;\n    return result;",
        "    result.freshEnvelopeConfirmation = prepared.envelope.freshConfirmation || null;\n    result.safeEnvelopeBoundaryConfirmation = safeEnvelopeBoundaryConfirmation || null;\n    return result;",
        'safe confirmation result',
    )

    text = replace_once(
        text,
        '  async function mirror(chaIdx, chatIdx, chatArg = null, perfDetail = null, mirrorSnapshot = null, shouldApply = null, freshEnvelopeConfirmation = null) {',
        '  async function mirror(chaIdx, chatIdx, chatArg = null, perfDetail = null, mirrorSnapshot = null, shouldApply = null, freshEnvelopeConfirmation = null, safeEnvelopeBoundaryConfirmation = null) {',
        'mirror signature',
    )

    old_match = r'''        const freshConfirmed = exactFreshConfirmed || !!boundaryMatch;
        const recoveryPolicy = boundaryMatch ? 'BOUNDARY_CONFIRMED_SUFFIX' : (exactFreshConfirmed ? 'FRESH_CONFIRMED_SUFFIX' : null);
        const fingerprintMatch = recoveryPolicy || normalMatch;
        if (detail) {
          detail.canonicalFingerprint = (freshConfirmed ? actualFingerprint : canonical).slice(0, 12);
          detail.hostRawFingerprint = hostRaw.slice(0, 12);
          detail.freshFingerprint = String(actualFingerprint || '').slice(0, 12);
          detail.canonicalFingerprintFull = freshConfirmed ? String(actualFingerprint || '') : canonical;
          detail.hostRawFingerprintFull = hostRaw;
          detail.freshFingerprintFull = String(actualFingerprint || '');
          detail.fingerprintMatch = fingerprintMatch;
          detail.freshEnvelopeRecovery = freshConfirmed ? 'RECOVERED' : (confirmation ? 'FRESH_MISMATCH' : 'NOT_APPLICABLE');
          detail.freshEnvelopeSource = freshConfirmed ? String(confirmation.source || 'HOST_RAW_SUFFIX') : null;
          detail.freshEnvelopePolicy = recoveryPolicy;
          detail.freshEnvelopeCandidateChars = confirmation ? Number(confirmation.candidateChars || 0) : 0;
          detail.freshEnvelopeBoundaryChars = boundaryMatch ? Number(boundaryMatch.chars || 0) : 0;
          detail.freshEnvelopeBoundaryDelta = boundaryMatch ? Number(boundaryMatch.deltaChars || 0) : 0;
          detail.freshEnvelopeBoundaryKind = boundaryMatch ? String(boundaryMatch.kind || 'CRLF_ONLY') : null;
          detail.freshEnvelopePersistent = 'NONE';
        }
        if (freshConfirmed) {
          snapshot.outputFingerprint = actualFingerprint;
          const liveSession = getCoreSession();
          if (liveSession?.current && Number(liveSession.currentOutputIndex) === expectedOutIndex) {
            liveSession.current.outputFingerprint = actualFingerprint;
            liveSession.trustedOutputFingerprint = actualFingerprint;
            snapshot.portableState = liveSession.portableState();
          }
        }
        if ((canonical || hostRaw) && normalMatch === 'MISMATCH' && !freshConfirmed) {
          if (detail) detail.status = 'OUTPUT_MISMATCH';
          return false;
        }'''

    new_match = r'''        const freshConfirmed = exactFreshConfirmed || !!boundaryMatch;
        const recoveryPolicy = boundaryMatch ? 'BOUNDARY_CONFIRMED_SUFFIX' : (exactFreshConfirmed ? 'FRESH_CONFIRMED_SUFFIX' : null);
        const safeConfirmation = safeEnvelopeBoundaryConfirmation && typeof safeEnvelopeBoundaryConfirmation === 'object'
          ? safeEnvelopeBoundaryConfirmation : null;
        const safeCandidates = Array.isArray(safeConfirmation?.boundaryCandidates) ? safeConfirmation.boundaryCandidates : [];
        const safeMatches = !freshConfirmed && normalMatch === 'MISMATCH'
          && safeConfirmation?.status === 'PENDING'
          && safeConfirmation?.confirmation === 'FRESH_EXACT'
          ? safeCandidates.filter((row) => String(row?.fingerprint || '') === actualFingerprint)
          : [];
        const safeBoundaryMatch = safeMatches.length === 1 ? safeMatches[0] : null;
        const safeBoundaryConfirmed = !!safeBoundaryMatch;
        const representationConfirmed = freshConfirmed || safeBoundaryConfirmed;
        const fingerprintMatch = safeBoundaryConfirmed ? 'SAFE_BOUNDARY_CONFIRMED' : (recoveryPolicy || normalMatch);
        if (detail) {
          detail.canonicalFingerprint = (representationConfirmed ? actualFingerprint : canonical).slice(0, 12);
          detail.hostRawFingerprint = hostRaw.slice(0, 12);
          detail.freshFingerprint = String(actualFingerprint || '').slice(0, 12);
          detail.canonicalFingerprintFull = representationConfirmed ? String(actualFingerprint || '') : canonical;
          detail.hostRawFingerprintFull = hostRaw;
          detail.freshFingerprintFull = String(actualFingerprint || '');
          detail.fingerprintMatch = fingerprintMatch;
          detail.freshEnvelopeRecovery = freshConfirmed ? 'RECOVERED' : (confirmation ? 'FRESH_MISMATCH' : 'NOT_APPLICABLE');
          detail.freshEnvelopeSource = freshConfirmed ? String(confirmation.source || 'HOST_RAW_SUFFIX') : null;
          detail.freshEnvelopePolicy = recoveryPolicy;
          detail.freshEnvelopeCandidateChars = confirmation ? Number(confirmation.candidateChars || 0) : 0;
          detail.freshEnvelopeBoundaryChars = boundaryMatch ? Number(boundaryMatch.chars || 0) : 0;
          detail.freshEnvelopeBoundaryDelta = boundaryMatch ? Number(boundaryMatch.deltaChars || 0) : 0;
          detail.freshEnvelopeBoundaryKind = boundaryMatch ? String(boundaryMatch.kind || 'CRLF_ONLY') : null;
          detail.freshEnvelopePersistent = 'NONE';
          detail.safeEnvelopeReconcile = safeBoundaryConfirmed ? 'CONFIRMED' : (safeConfirmation && normalMatch === 'MISMATCH' ? 'REJECTED' : 'NOT_APPLICABLE');
          detail.safeEnvelopeSource = safeBoundaryConfirmed ? String(safeConfirmation.source || 'CANONICAL_BOUNDARY') : null;
          detail.safeEnvelopePolicy = safeBoundaryConfirmed ? 'SAFE_BOUNDARY_CONFIRMED' : null;
          detail.safeEnvelopeCanonicalChars = safeConfirmation ? Number(safeConfirmation.canonicalChars || 0) : 0;
          detail.safeEnvelopeBoundaryChars = safeBoundaryMatch ? Number(safeBoundaryMatch.chars || 0) : 0;
          detail.safeEnvelopeBoundaryDelta = safeBoundaryMatch ? Number(safeBoundaryMatch.deltaChars || 0) : 0;
          detail.safeEnvelopeBoundaryKind = safeBoundaryMatch ? String(safeBoundaryMatch.kind || 'STRUCTURAL_LF') : null;
          detail.safeEnvelopePersistent = 'NONE';
        }
        if (representationConfirmed) {
          snapshot.outputFingerprint = actualFingerprint;
          const liveSession = getCoreSession();
          if (liveSession?.current && Number(liveSession.currentOutputIndex) === expectedOutIndex) {
            liveSession.current.outputFingerprint = actualFingerprint;
            liveSession.trustedOutputFingerprint = actualFingerprint;
            snapshot.portableState = liveSession.portableState();
          }
        }
        if ((canonical || hostRaw) && normalMatch === 'MISMATCH' && !representationConfirmed) {
          if (detail) detail.status = 'OUTPUT_MISMATCH';
          return false;
        }'''
    text = replace_once(text, old_match, new_match, 'mirror safe-boundary match')

    text = replace_once(
        text,
        '  function schedule(chaIdx, chatIdx, chat, outIndex, state, freshEnvelopeConfirmation = null) {',
        '  function schedule(chaIdx, chatIdx, chat, outIndex, state, freshEnvelopeConfirmation = null, safeEnvelopeBoundaryConfirmation = null) {',
        'schedule signature',
    )

    old_probe = r'''      freshEnvelopeBoundaryKind: null,
      freshEnvelopePersistent: 'NONE','''
    new_probe = r'''      freshEnvelopeBoundaryKind: null,
      freshEnvelopePersistent: 'NONE',
      safeEnvelopeReconcile: 'NOT_APPLICABLE',
      safeEnvelopeSource: null,
      safeEnvelopePolicy: null,
      safeEnvelopeCanonicalChars: Number(safeEnvelopeBoundaryConfirmation?.canonicalChars || 0),
      safeEnvelopeBoundaryChars: 0,
      safeEnvelopeBoundaryDelta: 0,
      safeEnvelopeBoundaryKind: null,
      safeEnvelopePersistent: 'NONE','''
    text = replace_once(text, old_probe, new_probe, 'safe probe init')

    text = replace_once(
        text,
        '      const ok = await mirror(chaIdx, chatIdx, null, detail, snapshot, shouldApply, freshEnvelopeConfirmation);',
        '      const ok = await mirror(chaIdx, chatIdx, null, detail, snapshot, shouldApply, freshEnvelopeConfirmation, safeEnvelopeBoundaryConfirmation);',
        'mirror call',
    )

    old_probe_copy = r'''      probe.freshEnvelopeBoundaryKind = detail.freshEnvelopeBoundaryKind ?? probe.freshEnvelopeBoundaryKind;
      probe.freshEnvelopePersistent = detail.freshEnvelopePersistent ?? probe.freshEnvelopePersistent;'''
    new_probe_copy = r'''      probe.freshEnvelopeBoundaryKind = detail.freshEnvelopeBoundaryKind ?? probe.freshEnvelopeBoundaryKind;
      probe.freshEnvelopePersistent = detail.freshEnvelopePersistent ?? probe.freshEnvelopePersistent;
      probe.safeEnvelopeReconcile = detail.safeEnvelopeReconcile ?? probe.safeEnvelopeReconcile;
      probe.safeEnvelopeSource = detail.safeEnvelopeSource ?? probe.safeEnvelopeSource;
      probe.safeEnvelopePolicy = detail.safeEnvelopePolicy ?? probe.safeEnvelopePolicy;
      probe.safeEnvelopeCanonicalChars = detail.safeEnvelopeCanonicalChars ?? probe.safeEnvelopeCanonicalChars;
      probe.safeEnvelopeBoundaryChars = detail.safeEnvelopeBoundaryChars ?? probe.safeEnvelopeBoundaryChars;
      probe.safeEnvelopeBoundaryDelta = detail.safeEnvelopeBoundaryDelta ?? probe.safeEnvelopeBoundaryDelta;
      probe.safeEnvelopeBoundaryKind = detail.safeEnvelopeBoundaryKind ?? probe.safeEnvelopeBoundaryKind;
      probe.safeEnvelopePersistent = detail.safeEnvelopePersistent ?? probe.safeEnvelopePersistent;'''
    text = replace_once(text, old_probe_copy, new_probe_copy, 'safe probe copy')

    text = replace_once(
        text,
        '    const mirrorScheduled = runtimeMirror.schedule(chaIdx, chatIdx, chat, outIndex, result.state, result.freshEnvelopeConfirmation);',
        '    const mirrorScheduled = runtimeMirror.schedule(chaIdx, chatIdx, chat, outIndex, result.state, result.freshEnvelopeConfirmation, result.safeEnvelopeBoundaryConfirmation);',
        'runtime mirror schedule',
    )

    old_relation = "  const relation = (probe.fingerprintMatch === 'CANONICAL' || probe.fingerprintMatch === 'FRESH_CONFIRMED_SUFFIX') ? 'EXACT' : (probe.fingerprintMatch === 'HOST_RAW' ? 'HOST_RAW_MATCH' : 'DIFFERENT');"
    new_relation = "  const relation = ['CANONICAL', 'FRESH_CONFIRMED_SUFFIX', 'BOUNDARY_CONFIRMED_SUFFIX', 'SAFE_BOUNDARY_CONFIRMED'].includes(String(probe.fingerprintMatch || '')) ? 'EXACT' : (probe.fingerprintMatch === 'HOST_RAW' ? 'HOST_RAW_MATCH' : 'DIFFERENT');"
    text = replace_once(text, old_relation, new_relation, 'representation relation')

    old_prior = r'''      : ((priorMatch === 'CANONICAL' || priorMatch === 'FRESH_CONFIRMED_SUFFIX')
        ? 'EXACT' '''
    new_prior = r'''      : ((['CANONICAL', 'FRESH_CONFIRMED_SUFFIX', 'BOUNDARY_CONFIRMED_SUFFIX', 'SAFE_BOUNDARY_CONFIRMED'].includes(priorMatch))
        ? 'EXACT' '''
    text = replace_once(text, old_prior, new_prior, 'edit prior exact classification')

    old_diag = r'''      `Envelope boundary: ${deferredMirror?.freshEnvelopePolicy === 'BOUNDARY_CONFIRMED_SUFFIX' ? `RAW_SUFFIX ${Number(deferredMirror.freshEnvelopeCandidateChars || 0)} → NORMALIZED ${Number(deferredMirror.freshEnvelopeBoundaryChars || 0)} · Δchars ${Number(deferredMirror.freshEnvelopeBoundaryDelta || 0) >= 0 ? '+' : ''}${Number(deferredMirror.freshEnvelopeBoundaryDelta || 0)} · ${deferredMirror.freshEnvelopeBoundaryKind || 'CRLF_ONLY'} · FRESH_EXACT` : 'NOT_APPLICABLE'}`,
      `Output hotspot: ${outputBreakdown ? `${outputBreakdown.hotspot} · ${diagnosticFormatMs(outputBreakdown.hotspotMs)} · ${Number(outputBreakdown.hotspotPercent || 0).toFixed(1)}%` : 'n/a'}`,'''
    new_diag = r'''      `Envelope boundary: ${deferredMirror?.freshEnvelopePolicy === 'BOUNDARY_CONFIRMED_SUFFIX' ? `RAW_SUFFIX ${Number(deferredMirror.freshEnvelopeCandidateChars || 0)} → NORMALIZED ${Number(deferredMirror.freshEnvelopeBoundaryChars || 0)} · Δchars ${Number(deferredMirror.freshEnvelopeBoundaryDelta || 0) >= 0 ? '+' : ''}${Number(deferredMirror.freshEnvelopeBoundaryDelta || 0)} · ${deferredMirror.freshEnvelopeBoundaryKind || 'CRLF_ONLY'} · FRESH_EXACT` : 'NOT_APPLICABLE'}`,
      `Safe-envelope reconcile: ${deferredMirror ? `${deferredMirror.safeEnvelopeReconcile || 'NOT_APPLICABLE'} · policy ${deferredMirror.safeEnvelopePolicy || 'n/a'} · source ${deferredMirror.safeEnvelopeSource || 'n/a'} · confirmation ${deferredMirror.safeEnvelopeReconcile === 'CONFIRMED' ? 'FRESH_EXACT' : 'n/a'} · persistent ${deferredMirror.safeEnvelopePersistent || 'NONE'}` : 'n/a'}`,
      `Safe-envelope boundary: ${deferredMirror?.safeEnvelopeReconcile === 'CONFIRMED' ? `CANONICAL ${Number(deferredMirror.safeEnvelopeCanonicalChars || 0)} → NORMALIZED ${Number(deferredMirror.safeEnvelopeBoundaryChars || 0)} · Δchars ${Number(deferredMirror.safeEnvelopeBoundaryDelta || 0) >= 0 ? '+' : ''}${Number(deferredMirror.safeEnvelopeBoundaryDelta || 0)} · ${deferredMirror.safeEnvelopeBoundaryKind || 'STRUCTURAL_LF'} · FRESH_EXACT` : 'NOT_APPLICABLE'}`,
      `Output hotspot: ${outputBreakdown ? `${outputBreakdown.hotspot} · ${diagnosticFormatMs(outputBreakdown.hotspotMs)} · ${Number(outputBreakdown.hotspotPercent || 0).toFixed(1)}%` : 'n/a'}`,'''
    text = replace_once(text, old_diag, new_diag, 'safe diagnostics')

    required = [
        'v0.63.54 Safe-Envelope Structural Boundary Reconcile',
        'buildSafeEnvelopeBoundaryConfirmation',
        "'SAFE_BOUNDARY_CONFIRMED'",
        "'CANONICAL_BOUNDARY'",
        "'COMMUNITY_TO_KNOWLEDGE'",
        'Safe-envelope reconcile:',
        'Safe-envelope boundary:',
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
