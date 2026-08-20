from pathlib import Path

TARGETS = [
    Path('plugins/simcore/latest.js'),
    Path('plugins/simcore/install.js'),
]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def patch_source(text: str) -> str:
    text = replace_once(
        text,
        '//@version 0.63.54',
        '//@version 0.63.55',
        'metadata version',
    )

    release_marker = '// v0.63.54 Safe-Envelope Structural Boundary Reconcile:'
    release_notes = '''// v0.63.55 Representation Fast Reconcile:
// - Follows two same-runtime production cases where an unedited previous assistant was recorded as CANONICAL!=FRESH_CHAT, the next request visible assistant matched the prior FRESH_CHAT exactly, Edit Origin classified REPRESENTATION_DRIFT_CORRELATED, and the existing manual-edit path spent 4.091 s / 6.257 s rebuilding state
// - Adds one request-side provenance fast path before snapshot I/O: only a prior OUTPUT_MISMATCH for the same assistant slot/location whose current visible fingerprint equals the recorded prior FRESH_CHAT exactly may bypass the full manual-edit reconstruction
// - Requires the live CoreSession to still point at the same output index with both current.outputFingerprint and trustedOutputFingerprint equal to the recorded prior canonical fingerprint; any stale/missing/third representation fails open to the existing reconcile path
// - The fast path is representation acceptance only: it performs no state rebuild, no snapshot write, no visible-chat write, no Fresh-body copy/retention and no canonical-state mutation. Genuine user edits that match neither prior canonical nor prior Fresh remain USER_EDIT_CANDIDATE and keep MANUAL_EDIT_REBUILT
// - Output-side Deferred Mirror, v0.63.53/v0.63.54 envelope recovery, Structure/COMMUNITY quarantine, Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence, TAIL_AFTER_CURRENT_USER, History OBSERVE_ONLY, Host Prefix Attribution and provider cache UNVERIFIED remain frozen
// - Adds no host/storage/network/timer call, persistent field, request-history mutation, provider-cache claim, prompt relocation or generation-semantic change
//
'''
    text = replace_once(
        text,
        release_marker,
        release_notes + release_marker,
        'release notes marker',
    )

    text = replace_once(
        text,
        "const SIMCORE_RUNTIME_VERSION = '0.63.54';",
        "const SIMCORE_RUNTIME_VERSION = '0.63.55';",
        'runtime version',
    )

    old_call = '''    const r = await cs.reconcileEditedOutput(lastAssistant, visibleContent, perfDetail);
    if (perfDetail) {
      let editOrigin = 'NONE';
'''
    new_call = '''    // v0.63.55: the Deferred Mirror already observed the host-visible previous assistant.
    // If that exact Fresh representation carries into the next request, it is a proven
    // representation alias for this slot/location, not a third unknown body. Keep the
    // canonical state untouched and skip the expensive snapshot/manual-edit rebuild.
    const representationFastEligible = !!(
      priorProvenance
      && priorRepresentation === 'OUTPUT_MISMATCH'
      && currentMatch === 'FRESH_CHAT'
      && !!priorCanonical
      && !!priorFresh
      && priorCanonical !== priorFresh
      && visibleFingerprint === priorFresh
      && Number(cs.currentOutputIndex) === lastAssistant
      && String(cs.current?.outputFingerprint || '') === priorCanonical
      && String(cs.trustedOutputFingerprint || '') === priorCanonical
    );
    let r;
    if (representationFastEligible) {
      if (perfDetail) {
        perfDetail.path = 'representation-fast-reconciled';
        perfDetail.compatibilitySource = 'fresh-exact-carryover';
      }
      r = {
        changed: false,
        reason: 'representation-fast-reconciled',
        representationFastReconciled: true,
      };
    } else {
      r = await cs.reconcileEditedOutput(lastAssistant, visibleContent, perfDetail);
    }
    if (perfDetail) {
      let editOrigin = 'NONE';
'''
    text = replace_once(text, old_call, new_call, 'reconcile call')

    old_origin = '''      if (r.changed) {
        if (!priorProvenance) editOrigin = 'UNKNOWN';
        else if (priorRepresentation === 'OUTPUT_MISMATCH' && currentMatch === 'FRESH_CHAT') editOrigin = 'REPRESENTATION_DRIFT_CORRELATED';
        else if (priorRepresentation === 'EXACT') editOrigin = 'USER_EDIT_CANDIDATE';
        else editOrigin = 'AMBIGUOUS_CHANGE';
      }
'''
    new_origin = '''      if (r.representationFastReconciled) {
        editOrigin = 'REPRESENTATION_DRIFT_CORRELATED';
      } else if (r.changed) {
        if (!priorProvenance) editOrigin = 'UNKNOWN';
        else if (priorRepresentation === 'OUTPUT_MISMATCH' && currentMatch === 'FRESH_CHAT') editOrigin = 'REPRESENTATION_DRIFT_CORRELATED';
        else if (priorRepresentation === 'EXACT') editOrigin = 'USER_EDIT_CANDIDATE';
        else editOrigin = 'AMBIGUOUS_CHANGE';
      }
'''
    text = replace_once(text, old_origin, new_origin, 'edit-origin classification')

    required = [
        'v0.63.55 Representation Fast Reconcile',
        "const SIMCORE_RUNTIME_VERSION = '0.63.55';",
        "perfDetail.path = 'representation-fast-reconciled';",
        "perfDetail.compatibilitySource = 'fresh-exact-carryover';",
        'representationFastReconciled: true',
        "priorRepresentation === 'OUTPUT_MISMATCH'",
        "currentMatch === 'FRESH_CHAT'",
        'Number(cs.currentOutputIndex) === lastAssistant',
        "String(cs.current?.outputFingerprint || '') === priorCanonical",
        "String(cs.trustedOutputFingerprint || '') === priorCanonical",
        "editOrigin = 'REPRESENTATION_DRIFT_CORRELATED';",
        "editOrigin = 'USER_EDIT_CANDIDATE';",
        'v0.63.54 Safe-Envelope Structural Boundary Reconcile',
        'buildSafeEnvelopeBoundaryConfirmation',
        'BOUNDARY_CONFIRMED_SUFFIX',
        "return stabilizationResult('OBSERVE_ONLY'",
        'provider UNVERIFIED',
    ]
    for needle in required:
        if needle not in text:
            raise SystemExit(f'missing required guard after patch: {needle}')

    forbidden = [
        "slot.content = replacement.canonicalRaw",
        "return stabilizationResult('APPLIED'",
    ]
    for needle in forbidden:
        if needle in text:
            raise SystemExit(f'frozen mutator unexpectedly present: {needle}')

    return text


patched = []
for path in TARGETS:
    if not path.exists():
        raise SystemExit(f'missing production source: {path}')
    original = path.read_text(encoding='utf-8')
    updated = patch_source(original)
    path.write_text(updated, encoding='utf-8')
    patched.append(updated)

if patched[0] != patched[1]:
    raise SystemExit('latest.js and install.js diverged after patch')

print('SimCore v0.63.55 patch applied to latest.js/install.js')
