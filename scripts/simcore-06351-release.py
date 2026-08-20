from pathlib import Path

LATEST = Path('plugins/simcore/latest.js')
INSTALL = Path('plugins/simcore/install.js')
text = LATEST.read_text(encoding='utf-8')


def once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    text = text.replace(old, new, 1)


once('//@version 0.63.50', '//@version 0.63.51', 'metadata version')
once("const SIMCORE_RUNTIME_VERSION = '0.63.50';", "const SIMCORE_RUNTIME_VERSION = '0.63.51';", 'runtime version')

release_note = '''// v0.63.51 Fresh-Confirmed Envelope Recovery:
// - Targets the real v0.63.50 B_END failure where a unique # 응답 suffix followed a THOUGHTS_COMPAT preamble but full Structure safety rejected the suffix because COMMUNITY shape was independently malformed; the initial Recovery pass remains fail-open and does not weaken Structure acceptance
// - Records only a bounded memory-only fingerprint/length/offset for one unique THOUGHTS_COMPAT response suffix when frame + Knowledge are intact; the suffix body is not retained and no request/chat/persistent snapshot mutation occurs on the critical output path
// - Reuses the already-existing Deferred Mirror fresh-chat read as the confirmation boundary: only exact FRESH_CHAT fingerprint equality may promote the suffix representation to canonical for the current in-memory state and mirrored portable state; mismatch remains OUTPUT_MISMATCH with setChat blocked
// - Adds Envelope recovery telemetry with RECOVERED / FRESH_MISMATCH / NOT_APPLICABLE and FRESH_CONFIRMED_SUFFIX provenance while leaving COMMUNITY structural quarantine independent for a later targeted repair
// - Output-recovery scope only: Deferred Mirror identity/location/staleness guards, Structure/COMMUNITY rules, Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence, TAIL_AFTER_CURRENT_USER, History stabilization OBSERVE_ONLY, Host Prefix Attribution, cache/provider policy, persistent schema, network and timer surfaces remain frozen
//
'''
once('// v0.63.50 Host Prefix Reset Attribution:\n', release_note + '// v0.63.50 Host Prefix Reset Attribution:\n', 'release note insertion')

helper = r'''function buildFreshEnvelopeConfirmation(rawPrefix, matches, candidates) {
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
    envelopeOffset: Number(rows[0]?.index || 0),
    persistentMutation: 'NONE',
  });
}

'''
once('// Whole-response restart recovery. Structure judges candidate integrity; Recovery chooses/moves content.\n', helper + '// Whole-response restart recovery. Structure judges candidate integrity; Recovery chooses/moves content.\n', 'fresh confirmation helper')

old_no_safe = '''    const preambleProvenance = buildPreambleProvenance(raw, matches, -1, resolved, classification);
    return { content: raw.trim(), repaired: false, issues, diagnostics, candidateCount: matches.length, selectedIndex: -1, resolved, preambleProvenance };
'''
new_no_safe = '''    const preambleProvenance = buildPreambleProvenance(raw, matches, -1, resolved, classification);
    const freshConfirmation = buildFreshEnvelopeConfirmation(rawPrefix, matches, candidates);
    return { content: raw.trim(), repaired: false, issues, diagnostics, candidateCount: matches.length, selectedIndex: -1, resolved, preambleProvenance, freshConfirmation };
'''
once(old_no_safe, new_no_safe, 'no-safe fresh candidate')

once('''    result.preambleProvenance = prepared.envelope.preambleProvenance || null;
    return result;
''', '''    result.preambleProvenance = prepared.envelope.preambleProvenance || null;
    result.freshEnvelopeConfirmation = prepared.envelope.freshConfirmation || null;
    return result;
''', 'output result confirmation')

once('''  async function mirror(chaIdx, chatIdx, chatArg = null, perfDetail = null, mirrorSnapshot = null, shouldApply = null) {
''', '''  async function mirror(chaIdx, chatIdx, chatArg = null, perfDetail = null, mirrorSnapshot = null, shouldApply = null, freshEnvelopeConfirmation = null) {
''', 'mirror signature')

old_fp = '''        const actualFingerprint = coreRules.fingerprintText(textMessageContent(message));
        const canonical = String(snapshot.outputFingerprint || '');
        const hostRaw = String(snapshot.hostOutputFingerprint || '');
        if (detail) {
          detail.canonicalFingerprint = canonical.slice(0, 12);
          detail.hostRawFingerprint = hostRaw.slice(0, 12);
          detail.freshFingerprint = String(actualFingerprint || '').slice(0, 12);
          detail.canonicalFingerprintFull = canonical;
          detail.hostRawFingerprintFull = hostRaw;
          detail.freshFingerprintFull = String(actualFingerprint || '');
          detail.fingerprintMatch = actualFingerprint === canonical ? 'CANONICAL' : (actualFingerprint === hostRaw ? 'HOST_RAW' : 'MISMATCH');
        }
        if ((canonical || hostRaw) && actualFingerprint !== canonical && actualFingerprint !== hostRaw) {
          if (detail) detail.status = 'OUTPUT_MISMATCH';
          return false;
        }
'''
new_fp = '''        const actualFingerprint = coreRules.fingerprintText(textMessageContent(message));
        const canonical = String(snapshot.outputFingerprint || '');
        const hostRaw = String(snapshot.hostOutputFingerprint || '');
        const confirmation = freshEnvelopeConfirmation && typeof freshEnvelopeConfirmation === 'object' ? freshEnvelopeConfirmation : null;
        const candidateFingerprint = String(confirmation?.candidateFingerprint || '');
        const normalMatch = actualFingerprint === canonical ? 'CANONICAL' : (actualFingerprint === hostRaw ? 'HOST_RAW' : 'MISMATCH');
        const freshConfirmed = normalMatch === 'MISMATCH'
          && confirmation?.status === 'PENDING'
          && confirmation?.confirmation === 'FRESH_EXACT'
          && !!candidateFingerprint
          && actualFingerprint === candidateFingerprint;
        const fingerprintMatch = freshConfirmed ? 'FRESH_CONFIRMED_SUFFIX' : normalMatch;
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
        }
'''
once(old_fp, new_fp, 'deferred fresh confirmation gate')

once('''  function schedule(chaIdx, chatIdx, chat, outIndex, state) {
    const snapshot = capture(chaIdx, chatIdx, chat, outIndex, state);
''', '''  function schedule(chaIdx, chatIdx, chat, outIndex, state, freshEnvelopeConfirmation = null) {
    const snapshot = capture(chaIdx, chatIdx, chat, outIndex, state);
''', 'schedule signature')

once('''      freshFingerprint: null, fingerprintMatch: 'PENDING',
      canonicalFingerprintFull: String(snapshot.outputFingerprint || ''),
      hostRawFingerprintFull: String(snapshot.hostOutputFingerprint || ''),
      freshFingerprintFull: null,
''', '''      freshFingerprint: null, fingerprintMatch: 'PENDING',
      canonicalFingerprintFull: String(snapshot.outputFingerprint || ''),
      hostRawFingerprintFull: String(snapshot.hostOutputFingerprint || ''),
      freshFingerprintFull: null,
      freshEnvelopeRecovery: freshEnvelopeConfirmation ? 'PENDING' : 'NOT_APPLICABLE',
      freshEnvelopeSource: null,
      freshEnvelopePersistent: 'NONE',
''', 'mirror probe fields')

once('''      const ok = await mirror(chaIdx, chatIdx, null, detail, snapshot, shouldApply);
''', '''      const ok = await mirror(chaIdx, chatIdx, null, detail, snapshot, shouldApply, freshEnvelopeConfirmation);
''', 'mirror schedule pass-through')

once('''      probe.fingerprintMatch = detail.fingerprintMatch ?? probe.fingerprintMatch;
      if (!runtimeIsCurrent(epoch)) probe.status = 'STALE_DROPPED';
''', '''      probe.fingerprintMatch = detail.fingerprintMatch ?? probe.fingerprintMatch;
      probe.freshEnvelopeRecovery = detail.freshEnvelopeRecovery ?? probe.freshEnvelopeRecovery;
      probe.freshEnvelopeSource = detail.freshEnvelopeSource ?? probe.freshEnvelopeSource;
      probe.freshEnvelopePersistent = detail.freshEnvelopePersistent ?? probe.freshEnvelopePersistent;
      if (!runtimeIsCurrent(epoch)) probe.status = 'STALE_DROPPED';
''', 'mirror probe result fields')

once('''    const mirrorScheduled = runtimeMirror.schedule(chaIdx, chatIdx, chat, outIndex, result.state);
''', '''    const mirrorScheduled = runtimeMirror.schedule(chaIdx, chatIdx, chat, outIndex, result.state, result.freshEnvelopeConfirmation);
''', 'outer schedule confirmation')

once("""      `Output representation: ${deferredMirror ? runtimeProbeRules.representation(deferredMirror) : 'n/a'}`,
      `Output hotspot: ${outputBreakdown ? `${outputBreakdown.hotspot} · ${diagnosticFormatMs(outputBreakdown.hotspotMs)} · ${Number(outputBreakdown.hotspotPercent || 0).toFixed(1)}%` : 'n/a'}`,
""", """      `Output representation: ${deferredMirror ? runtimeProbeRules.representation(deferredMirror) : 'n/a'}`,
      `Envelope recovery: ${deferredMirror ? `${deferredMirror.freshEnvelopeRecovery || 'NOT_APPLICABLE'} · source ${deferredMirror.freshEnvelopeSource || 'n/a'} · confirmation ${deferredMirror.fingerprintMatch === 'FRESH_CONFIRMED_SUFFIX' ? 'FRESH_EXACT' : 'n/a'} · persistent ${deferredMirror.freshEnvelopePersistent || 'NONE'}` : 'n/a'}`,
      `Output hotspot: ${outputBreakdown ? `${outputBreakdown.hotspot} · ${diagnosticFormatMs(outputBreakdown.hotspotMs)} · ${Number(outputBreakdown.hotspotPercent || 0).toFixed(1)}%` : 'n/a'}`,
""", 'envelope recovery diagnostic')

once("""      `Preamble provenance: ${preamble ? `${preamble.kind || 'UNKNOWN'} · chars ${Number(preamble.chars || 0)} · lines ${Number(preamble.lines || 0)} · action ${preamble.action || 'n/a'} · policy ${preamble.policy || 'n/a'} · envelope offset ${preamble.envelopeOffset == null ? 'n/a' : Number(preamble.envelopeOffset)} · candidates ${Number(preamble.candidateCount || 0)}${preamble.selectedCandidate == null ? '' : ` · selected ${Number(preamble.selectedCandidate)}`}` : 'n/a'}`,
""", """      `Preamble provenance: ${preamble ? `${preamble.kind || 'UNKNOWN'} · chars ${Number(preamble.chars || 0)} · lines ${Number(preamble.lines || 0)} · action ${deferredMirror?.freshEnvelopeRecovery === 'RECOVERED' ? 'STRIPPED' : (preamble.action || 'n/a')} · policy ${deferredMirror?.freshEnvelopeRecovery === 'RECOVERED' ? 'FRESH_CONFIRMED_SUFFIX' : (preamble.policy || 'n/a')} · envelope offset ${preamble.envelopeOffset == null ? 'n/a' : Number(preamble.envelopeOffset)} · candidates ${Number(preamble.candidateCount || 0)}${deferredMirror?.freshEnvelopeRecovery === 'RECOVERED' ? ' · selected 1' : (preamble.selectedCandidate == null ? '' : ` · selected ${Number(preamble.selectedCandidate)}`)}` : 'n/a'}`,
""", 'preamble confirmed diagnostic')

# representation() must render the confirmed fresh suffix as exact canonical representation.
once("""  const relation = probe.fingerprintMatch === 'CANONICAL' ? 'EXACT' : (probe.fingerprintMatch === 'HOST_RAW' ? 'HOST_RAW_MATCH' : 'DIFFERENT');
""", """  const relation = (probe.fingerprintMatch === 'CANONICAL' || probe.fingerprintMatch === 'FRESH_CONFIRMED_SUFFIX') ? 'EXACT' : (probe.fingerprintMatch === 'HOST_RAW' ? 'HOST_RAW_MATCH' : 'DIFFERENT');
""", 'representation confirmed exact')

LATEST.write_text(text, encoding='utf-8')
INSTALL.write_text(text, encoding='utf-8')
print('patched SimCore v0.63.51 Fresh-Confirmed Envelope Recovery')
