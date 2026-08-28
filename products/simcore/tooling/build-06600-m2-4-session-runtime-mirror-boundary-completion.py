#!/usr/bin/env python3
from pathlib import Path
import re

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FROM_VERSION = "0.65.0"
TARGET_VERSION = "0.66.0"

RELEASE_NOTE = """// v0.66.0 M2-4 Session / Runtime Mirror Boundary Completion:
// - Physically extracts deterministic output finalization from Session into one application-level Output Finalize service while preserving Frame/Time/Structure/Reaction ordering and receipts
// - Moves deferred retention cadence/running bookkeeping from Session into Store housekeeping without changing index-17/%17 cadence, 750 ms deferral, failure isolation or output-critical awaits
// - Migrates Session/Edit Reconcile runtime calls from the Recovery compatibility facade to Output Compat / Bootstrap Migration / Output Finalize physical owners while retaining the Recovery shim
// - Splits Deferred Mirror compatibility ownership into Output Compat candidate-plan/interpretation policy, Runtime Mirror one-read exact observation/guards/transport, and Representation accepted canonical-equivalence provenance
// - Preserves FRESH_CONFIRMED_SUFFIX / BOUNDARY_CONFIRMED_SUFFIX / SAFE_BOUNDARY_CONFIRMED external meanings, SAME_FAST / REPRESENTATION_FAST_RECONCILED / MANUAL_EDIT_REBUILT controls, persistent schema, provider-cache UNVERIFIED policy and all unrelated domain semantics
// - Keeps latest.js and install.js byte-identical and requires real long-chat human evidence after release publication
//
"""

CARD = r'''  const OPERATOR_RELEASE_CARD = Object.freeze({
    version: '0.66.0',
    name: 'M2-4 Session / Runtime Mirror Boundary Completion',
    scenario: '06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT',
    summary: Object.freeze([
      'M2-4 — output-finalize / Store housekeeping / Recovery direct-owner / Runtime Mirror observation boundaries를 동작 변경 없이 정리',
      '자연 A/C/B 요청에서 output commit · Deferred Mirror · Frame/Time/COMMUNITY/Reaction 회귀가 없는지 확인',
      'Representation fast reconcile과 genuine hand edit controls를 다시 확인',
      '이상 징후는 현재 진단을 먼저 보존하고 WATCH / DEFER / FIX / BLOCKER로 분류',
    ]),
    recent: Object.freeze([
      Object.freeze({ version: '0.66.0', name: 'M2-4 Boundary Completion', bullets: Object.freeze(['Session finalization/housekeeping ownership 축소', 'Mirror Observe→Interpret→Apply→Record 경계 완성']) }),
      Object.freeze({ version: '0.65.0', name: 'M2-3 + Runtime Identity Convergence', bullets: Object.freeze(['Edit Reconcile application service 추출', 'metadata/runtime/host identity 0.65.0 수렴']) }),
      Object.freeze({ version: '0.64.11', name: 'Bounded Telemetry Capsule Compaction', bullets: Object.freeze(['reload handoff bounded compact shape', 'whole capsule 16KB hard cap']) }),
    ]),
  });

  function buildOperatorReleaseCardHtml() {
    const card = OPERATOR_RELEASE_CARD;
    const bullets = card.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const recent = card.recent.map((item) => `<li><b>v${escapeHtml(item.version)} · ${escapeHtml(item.name)}</b><br>${item.bullets.map((bullet) => `• ${escapeHtml(bullet)}`).join('<br>')}</li>`).join('');
    return `<section id="operator-release-card" class="card" style="display:none;margin-bottom:10px;padding:13px">
<div style="font-weight:800;margin-bottom:6px">📦 업데이트 내역 · v${escapeHtml(card.version)}</div>
<div style="color:#9fb3d7;margin-bottom:8px">${escapeHtml(card.name)}</div>
<ul style="margin:0 0 12px 18px;padding:0">${bullets}</ul>
<div style="font-weight:700;margin:8px 0 5px">실전 확인</div>
<ol style="margin:7px 0 10px 18px;padding:0"><li>자연 A/C/B 요청에서 Version 0.66.0 · Runtime ACTIVE · output COMMITTED 확인</li><li>ordinary exact carryover → SAME_FAST · Edit origin NONE 확인</li><li>자연스럽게 가능한 prior OUTPUT_MISMATCH + exact Fresh carryover → REPRESENTATION_FAST_RECONCILED · snapshot UNCHANGED 확인</li><li>genuine hand edit → USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT 확인</li><li>Deferred Mirror의 CANONICAL/HOST_RAW/confirmed-boundary 의미와 stale/superseded guard가 이전과 동일한지 확인</li></ol>
<div style="font-weight:700;margin:8px 0 5px">중지 조건</div>
<div>예상 밖 semantic/runtime 이상, unsafe mirror write, repeated adoption/reset, identity split 또는 구조 회귀가 보이면 <b>다음 acceptance로 진행하지 말고 현재 진단을 먼저 보존</b></div>
<div style="font-weight:700;margin:10px 0 5px">이번 버전 실험</div><div><code>${escapeHtml(card.scenario)}</code></div>
<div style="font-weight:700;margin:10px 0 5px">최근 업데이트</div>
<ul style="margin:0 0 0 18px;padding:0">${recent}</ul>
<div style="margin-top:10px;color:#9fb3d7">이 카드는 운영 가이드이며 release PASS/FAIL authority가 아닙니다.</div>
</section>`;
  }'''


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"06600_PATCH_ANCHOR_INVALID {label} count={count}")
    return text.replace(old, new, 1)


def module_bounds(text, name):
    start_token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(start_token)
    if start < 0:
        raise SystemExit(f"06600_MODULE_MISSING {name}")
    next_start = text.find('\nSimCore.define("', start + len(start_token))
    end = next_start if next_start >= 0 else len(text)
    return start, end


def module_text(text, name):
    s, e = module_bounds(text, name)
    return text[s:e]


def replace_module(text, name, new_module):
    s, e = module_bounds(text, name)
    return text[:s] + new_module.rstrip() + "\n" + text[e:]


def cut_between(text, start_token, end_token, label):
    start = text.find(start_token)
    end = text.find(end_token, start + len(start_token)) if start >= 0 else -1
    if start < 0 or end < 0:
        raise SystemExit(f"06600_PATCH_ANCHOR_INVALID {label} start={start} end={end}")
    return start, end, text[start:end]


def extract_finalize(session_module):
    start_token = "function finalizePreparedOutput(baseState, prepared, outIndex, opts = {}) {"
    end_token = "\n\nclass CoreRulesetSession"
    s, e, fn = cut_between(session_module, start_token, end_token, "session-finalize")
    return s, e, fn.rstrip()


def build_output_finalize_module(fn):
    return '''SimCore.define("output-finalize", function (require, module, exports) {
const kernel = require('./kernel');
const time = require('./time');
const frame = require('./frame');
const reaction = require('./reaction');
const structure = require('./structure');

''' + fn + '''

module.exports = { finalizePreparedOutput };
});'''


def patch_store(text):
    store = module_text(text, "store")
    store = one(
        store,
        "    this.keepN = keepN;\n    this.lastKeyScan = null;",
        "    this.keepN = keepN;\n    this.lastKeyScan = null;\n    this.deferredPruneIndex = -1;\n    this.deferredPruneRunning = false;",
        "store-housekeeping-state",
    )
    method = '''  scheduleDeferredPrune(outIndex) {
    // Retention is housekeeping, not part of the user-visible output commit. Run it only
    // periodically and after the output promise can resolve. 17 is coprime with the usual
    // user/assistant index step of 2, so long chats still hit the cadence after reloads.
    if (!Number.isInteger(outIndex) || outIndex < 17 || (outIndex % 17) !== 0) return false;
    if (this.deferredPruneIndex === outIndex || this.deferredPruneRunning) return false;
    this.deferredPruneIndex = outIndex;

    const run = async () => {
      if (this.deferredPruneRunning) return;
      this.deferredPruneRunning = true;
      try { await this.prune(); }
      catch (e) { /* retention failure must never affect committed output/state */ }
      finally { this.deferredPruneRunning = false; }
    };

    if (typeof setTimeout === 'function') {
      const timer = setTimeout(run, 750);
      if (timer && typeof timer.unref === 'function') timer.unref();
    } else {
      Promise.resolve().then(run);
    }
    return true;
  }

'''
    store = one(store, "  async prune() { return this._prune(); }", method + "  async prune() { return this._prune(); }", "store-housekeeping-method")
    return replace_module(text, "store", store)


def patch_output_compat(text):
    mod = module_text(text, "output-compat")
    insert_before = "\nmodule.exports = {\n"
    if insert_before not in mod:
        raise SystemExit("06600_OUTPUT_COMPAT_EXPORT_ANCHOR_MISSING")
    additions = r'''
function buildFreshObservationPlan(freshEnvelopeConfirmation = null, safeEnvelopeBoundaryConfirmation = null) {
  const fresh = freshEnvelopeConfirmation && typeof freshEnvelopeConfirmation === 'object'
    ? freshEnvelopeConfirmation : null;
  const safe = safeEnvelopeBoundaryConfirmation && typeof safeEnvelopeBoundaryConfirmation === 'object'
    ? safeEnvelopeBoundaryConfirmation : null;
  const candidates = [];
  const meanings = {};
  const add = (kind, fingerprint, metadata = null) => {
    const fp = String(fingerprint || '');
    if (!fp) return null;
    const id = `C${candidates.length}`;
    candidates.push(Object.freeze({ candidateId: id, fingerprint: fp }));
    meanings[id] = Object.freeze({ kind, ...(metadata || {}) });
    return id;
  };

  const freshEligible = fresh?.status === 'PENDING' && fresh?.confirmation === 'FRESH_EXACT';
  if (freshEligible) {
    add('FRESH_PRIMARY', fresh.candidateFingerprint, {
      source: String(fresh.source || 'HOST_RAW_SUFFIX'),
      candidateChars: Number(fresh.candidateChars || 0),
    });
    const boundaries = Array.isArray(fresh.boundaryCandidates) ? fresh.boundaryCandidates : [];
    for (const row of boundaries) {
      add('FRESH_BOUNDARY', row?.fingerprint, {
        source: String(fresh.source || 'HOST_RAW_SUFFIX'),
        chars: Number(row?.chars || 0),
        deltaChars: Number(row?.deltaChars || 0),
        boundaryKind: String(row?.kind || 'CRLF_ONLY'),
      });
    }
  }

  const safeEligible = safe?.status === 'PENDING' && safe?.confirmation === 'FRESH_EXACT';
  if (safeEligible) {
    const boundaries = Array.isArray(safe.boundaryCandidates) ? safe.boundaryCandidates : [];
    for (const row of boundaries) {
      add('SAFE_BOUNDARY', row?.fingerprint, {
        source: String(safe.source || 'CANONICAL_BOUNDARY'),
        chars: Number(row?.chars || 0),
        deltaChars: Number(row?.deltaChars || 0),
        boundaryKind: String(row?.kind || 'STRUCTURAL_LF'),
      });
    }
  }

  return Object.freeze({
    schema: 1,
    observation: Object.freeze({
      schema: 1,
      candidates: Object.freeze(candidates),
    }),
    meanings: Object.freeze(meanings),
    telemetrySeed: Object.freeze({
      freshEnvelopeCandidateChars: fresh ? Number(fresh.candidateChars || 0) : 0,
      safeEnvelopeCanonicalChars: safe ? Number(safe.canonicalChars || 0) : 0,
      freshConfirmationPresent: !!fresh,
      safeConfirmationPresent: !!safe,
    }),
  });
}

function interpretFreshObservation(plan, receipt) {
  const p = plan && Number(plan.schema) === 1 ? plan : buildFreshObservationPlan();
  const r = receipt && Number(receipt.schema) === 1 ? receipt : null;
  if (!r) {
    return Object.freeze({
      acceptedCanonicalEquivalent: false,
      fingerprintMatch: 'MISMATCH',
      freshEnvelopeRecovery: p.telemetrySeed.freshConfirmationPresent ? 'FRESH_MISMATCH' : 'NOT_APPLICABLE',
      freshEnvelopeSource: null,
      freshEnvelopePolicy: null,
      freshEnvelopeCandidateChars: Number(p.telemetrySeed.freshEnvelopeCandidateChars || 0),
      freshEnvelopeBoundaryChars: 0,
      freshEnvelopeBoundaryDelta: 0,
      freshEnvelopeBoundaryKind: null,
      freshEnvelopePersistent: 'NONE',
      safeEnvelopeReconcile: p.telemetrySeed.safeConfirmationPresent ? 'REJECTED' : 'NOT_APPLICABLE',
      safeEnvelopeSource: null,
      safeEnvelopePolicy: null,
      safeEnvelopeCanonicalChars: Number(p.telemetrySeed.safeEnvelopeCanonicalChars || 0),
      safeEnvelopeBoundaryChars: 0,
      safeEnvelopeBoundaryDelta: 0,
      safeEnvelopeBoundaryKind: null,
      safeEnvelopePersistent: 'NONE',
    });
  }

  const baseMatch = String(r.baseMatch || 'MISMATCH');
  if (baseMatch === 'CANONICAL' || baseMatch === 'HOST_RAW') {
    return Object.freeze({
      acceptedCanonicalEquivalent: false,
      fingerprintMatch: baseMatch,
      freshEnvelopeRecovery: 'NOT_APPLICABLE',
      freshEnvelopeSource: null,
      freshEnvelopePolicy: null,
      freshEnvelopeCandidateChars: Number(p.telemetrySeed.freshEnvelopeCandidateChars || 0),
      freshEnvelopeBoundaryChars: 0,
      freshEnvelopeBoundaryDelta: 0,
      freshEnvelopeBoundaryKind: null,
      freshEnvelopePersistent: 'NONE',
      safeEnvelopeReconcile: 'NOT_APPLICABLE',
      safeEnvelopeSource: null,
      safeEnvelopePolicy: null,
      safeEnvelopeCanonicalChars: Number(p.telemetrySeed.safeEnvelopeCanonicalChars || 0),
      safeEnvelopeBoundaryChars: 0,
      safeEnvelopeBoundaryDelta: 0,
      safeEnvelopeBoundaryKind: null,
      safeEnvelopePersistent: 'NONE',
    });
  }

  const matchedIds = Array.isArray(r.matchedCandidateIds) ? r.matchedCandidateIds.map(String) : [];
  const matched = matchedIds
    .map((id) => ({ id, meaning: p.meanings?.[id] || null }))
    .filter((row) => row.meaning);
  const primary = matched.filter((row) => row.meaning.kind === 'FRESH_PRIMARY');
  const freshBoundary = matched.filter((row) => row.meaning.kind === 'FRESH_BOUNDARY');
  const safeBoundary = matched.filter((row) => row.meaning.kind === 'SAFE_BOUNDARY');

  // Preserve v0.65 priority: primary Fresh candidate, then Fresh boundary, then one unique Safe boundary.
  let accepted = null;
  if (primary.length === 1) accepted = primary[0];
  else if (primary.length === 0 && freshBoundary.length === 1) accepted = freshBoundary[0];
  else if (primary.length === 0 && freshBoundary.length === 0 && safeBoundary.length === 1) accepted = safeBoundary[0];

  const kind = accepted?.meaning?.kind || null;
  const freshAccepted = kind === 'FRESH_PRIMARY' || kind === 'FRESH_BOUNDARY';
  const safeAccepted = kind === 'SAFE_BOUNDARY';
  const policy = kind === 'FRESH_PRIMARY'
    ? 'FRESH_CONFIRMED_SUFFIX'
    : (kind === 'FRESH_BOUNDARY'
      ? 'BOUNDARY_CONFIRMED_SUFFIX'
      : (kind === 'SAFE_BOUNDARY' ? 'SAFE_BOUNDARY_CONFIRMED' : 'MISMATCH'));
  const freshMeta = freshAccepted ? accepted.meaning : null;
  const safeMeta = safeAccepted ? accepted.meaning : null;

  return Object.freeze({
    acceptedCanonicalEquivalent: !!accepted,
    acceptedCandidateId: accepted?.id || null,
    fingerprintMatch: policy,
    freshEnvelopeRecovery: freshAccepted
      ? 'RECOVERED'
      : (p.telemetrySeed.freshConfirmationPresent ? 'FRESH_MISMATCH' : 'NOT_APPLICABLE'),
    freshEnvelopeSource: freshAccepted ? String(freshMeta.source || 'HOST_RAW_SUFFIX') : null,
    freshEnvelopePolicy: freshAccepted ? (kind === 'FRESH_BOUNDARY' ? 'BOUNDARY_CONFIRMED_SUFFIX' : 'FRESH_CONFIRMED_SUFFIX') : null,
    freshEnvelopeCandidateChars: Number(p.telemetrySeed.freshEnvelopeCandidateChars || 0),
    freshEnvelopeBoundaryChars: kind === 'FRESH_BOUNDARY' ? Number(freshMeta.chars || 0) : 0,
    freshEnvelopeBoundaryDelta: kind === 'FRESH_BOUNDARY' ? Number(freshMeta.deltaChars || 0) : 0,
    freshEnvelopeBoundaryKind: kind === 'FRESH_BOUNDARY' ? String(freshMeta.boundaryKind || 'CRLF_ONLY') : null,
    freshEnvelopePersistent: 'NONE',
    safeEnvelopeReconcile: safeAccepted
      ? 'CONFIRMED'
      : (p.telemetrySeed.safeConfirmationPresent ? 'REJECTED' : 'NOT_APPLICABLE'),
    safeEnvelopeSource: safeAccepted ? String(safeMeta.source || 'CANONICAL_BOUNDARY') : null,
    safeEnvelopePolicy: safeAccepted ? 'SAFE_BOUNDARY_CONFIRMED' : null,
    safeEnvelopeCanonicalChars: Number(p.telemetrySeed.safeEnvelopeCanonicalChars || 0),
    safeEnvelopeBoundaryChars: safeAccepted ? Number(safeMeta.chars || 0) : 0,
    safeEnvelopeBoundaryDelta: safeAccepted ? Number(safeMeta.deltaChars || 0) : 0,
    safeEnvelopeBoundaryKind: safeAccepted ? String(safeMeta.boundaryKind || 'STRUCTURAL_LF') : null,
    safeEnvelopePersistent: 'NONE',
  });
}
'''
    mod = mod.replace(insert_before, "\n" + additions.rstrip() + insert_before, 1)
    mod = one(
        mod,
        "  prepareOutput,\n};",
        "  prepareOutput,\n  buildFreshObservationPlan,\n  interpretFreshObservation,\n};",
        "output-compat-exports",
    )
    return replace_module(text, "output-compat", mod)


def patch_representation(text):
    mod = module_text(text, "representation")
    exact_block = """const EXACT_PRIOR_MATCHES = Object.freeze([
  'CANONICAL',
  'FRESH_CONFIRMED_SUFFIX',
  'BOUNDARY_CONFIRMED_SUFFIX',
  'SAFE_BOUNDARY_CONFIRMED',
]);

"""
    mod = one(mod, exact_block, "", "representation-label-list-remove")
    old_prior = """function priorRepresentation(row) {
  if (!row) return 'UNAVAILABLE';
  const match = String(row.fingerprintMatch || '');
  if (EXACT_PRIOR_MATCHES.includes(match)) return 'EXACT';
  if (match === 'HOST_RAW') return 'HOST_RAW_MATCH';
  return 'OUTPUT_MISMATCH';
}"""
    new_prior = """function priorRepresentation(row) {
  if (!row) return 'UNAVAILABLE';
  const match = String(row.fingerprintMatch || '');
  if (row.acceptedCanonicalEquivalent === true || match === 'CANONICAL') return 'EXACT';
  if (match === 'HOST_RAW') return 'HOST_RAW_MATCH';
  return 'OUTPUT_MISMATCH';
}"""
    mod = one(mod, old_prior, new_prior, "representation-prior-fact")
    old_entry = """      fingerprintMatch: String(probe.fingerprintMatch || 'n/a'),
      canonicalFingerprint: String(probe.canonicalFingerprintFull || ''),
      hostRawFingerprint: String(probe.hostRawFingerprintFull || ''),
      freshFingerprint: String(probe.freshFingerprintFull || ''),
      at: Number(probe.finishedAt || Date.now()),"""
    new_entry = """      fingerprintMatch: String(probe.fingerprintMatch || 'n/a'),
      acceptedCanonicalEquivalent: probe.acceptedCanonicalEquivalent === true,
      canonicalFingerprint: String(probe.canonicalFingerprintFull || ''),
      hostRawFingerprint: String(probe.hostRawFingerprintFull || ''),
      freshFingerprint: String(probe.freshFingerprintFull || ''),
      at: Number(probe.finishedAt || Date.now()),"""
    mod = one(mod, old_entry, new_entry, "representation-registry-fact")
    return replace_module(text, "representation", mod)


def patch_runtime_mirror(text):
    mod = module_text(text, "runtime-mirror")
    marker = 'SimCore.define("runtime-mirror", function (require, module, exports) {\n'
    mod = one(mod, marker, marker + "const outputCompat = require('./output-compat');\n", "runtime-mirror-output-compat-require")

    old_sig = "  async function mirror(chaIdx, chatIdx, chatArg = null, perfDetail = null, mirrorSnapshot = null, shouldApply = null, freshEnvelopeConfirmation = null, safeEnvelopeBoundaryConfirmation = null) {"
    new_sig = "  async function mirror(chaIdx, chatIdx, chatArg = null, perfDetail = null, mirrorSnapshot = null, shouldApply = null, observationPlan = null) {"
    mod = one(mod, old_sig, new_sig, "runtime-mirror-signature")

    start_token = "        const actualFingerprint = coreRules.fingerprintText(textMessageContent(message));"
    end_token = """        if ((canonical || hostRaw) && normalMatch === 'MISMATCH' && !representationConfirmed) {
          if (detail) detail.status = 'OUTPUT_MISMATCH';
          return false;
        }"""
    s, e, _ = cut_between(mod, start_token, end_token, "runtime-mirror-interpretation-block")
    e += len(end_token)
    new_block = r'''        const actualFingerprint = coreRules.fingerprintText(textMessageContent(message));
        const canonical = String(snapshot.outputFingerprint || '');
        const hostRaw = String(snapshot.hostOutputFingerprint || '');
        const baseMatch = actualFingerprint === canonical ? 'CANONICAL' : (actualFingerprint === hostRaw ? 'HOST_RAW' : 'MISMATCH');
        const candidates = Array.isArray(observationPlan?.observation?.candidates)
          ? observationPlan.observation.candidates : [];
        const matchedCandidateIds = [];
        for (const row of candidates) {
          if (actualFingerprint === String(row?.fingerprint || '')) matchedCandidateIds.push(String(row?.candidateId || ''));
        }
        const receipt = Object.freeze({
          schema: 1,
          outIndex: expectedOutIndex,
          locationKey: String(snapshot.locationKey || ''),
          freshFingerprint: String(actualFingerprint || ''),
          baseMatch,
          matchedCandidateIds: Object.freeze(matchedCandidateIds),
          candidateMatchCount: matchedCandidateIds.length,
        });
        let interpretation;
        try {
          interpretation = outputCompat.interpretFreshObservation(observationPlan, receipt);
        } catch (_) {
          interpretation = null;
        }
        const acceptedCanonicalEquivalent = interpretation?.acceptedCanonicalEquivalent === true;
        const fingerprintMatch = String(interpretation?.fingerprintMatch || baseMatch || 'MISMATCH');

        if (detail) {
          detail.canonicalFingerprint = (acceptedCanonicalEquivalent ? actualFingerprint : canonical).slice(0, 12);
          detail.hostRawFingerprint = hostRaw.slice(0, 12);
          detail.freshFingerprint = String(actualFingerprint || '').slice(0, 12);
          detail.canonicalFingerprintFull = acceptedCanonicalEquivalent ? String(actualFingerprint || '') : canonical;
          detail.hostRawFingerprintFull = hostRaw;
          detail.freshFingerprintFull = String(actualFingerprint || '');
          detail.fingerprintMatch = fingerprintMatch;
          detail.acceptedCanonicalEquivalent = acceptedCanonicalEquivalent;
          detail.observationBaseMatch = baseMatch;
          detail.observationCandidateMatches = matchedCandidateIds.length;
          detail.freshEnvelopeRecovery = interpretation?.freshEnvelopeRecovery || (observationPlan?.telemetrySeed?.freshConfirmationPresent ? 'FRESH_MISMATCH' : 'NOT_APPLICABLE');
          detail.freshEnvelopeSource = interpretation?.freshEnvelopeSource || null;
          detail.freshEnvelopePolicy = interpretation?.freshEnvelopePolicy || null;
          detail.freshEnvelopeCandidateChars = Number(interpretation?.freshEnvelopeCandidateChars || observationPlan?.telemetrySeed?.freshEnvelopeCandidateChars || 0);
          detail.freshEnvelopeBoundaryChars = Number(interpretation?.freshEnvelopeBoundaryChars || 0);
          detail.freshEnvelopeBoundaryDelta = Number(interpretation?.freshEnvelopeBoundaryDelta || 0);
          detail.freshEnvelopeBoundaryKind = interpretation?.freshEnvelopeBoundaryKind || null;
          detail.freshEnvelopePersistent = 'NONE';
          detail.safeEnvelopeReconcile = interpretation?.safeEnvelopeReconcile || (observationPlan?.telemetrySeed?.safeConfirmationPresent ? 'REJECTED' : 'NOT_APPLICABLE');
          detail.safeEnvelopeSource = interpretation?.safeEnvelopeSource || null;
          detail.safeEnvelopePolicy = interpretation?.safeEnvelopePolicy || null;
          detail.safeEnvelopeCanonicalChars = Number(interpretation?.safeEnvelopeCanonicalChars || observationPlan?.telemetrySeed?.safeEnvelopeCanonicalChars || 0);
          detail.safeEnvelopeBoundaryChars = Number(interpretation?.safeEnvelopeBoundaryChars || 0);
          detail.safeEnvelopeBoundaryDelta = Number(interpretation?.safeEnvelopeBoundaryDelta || 0);
          detail.safeEnvelopeBoundaryKind = interpretation?.safeEnvelopeBoundaryKind || null;
          detail.safeEnvelopePersistent = 'NONE';
        }

        if (baseMatch === 'MISMATCH' && !acceptedCanonicalEquivalent) {
          if (detail) detail.status = 'OUTPUT_MISMATCH';
          return false;
        }
        // Interpretation cannot authorize stale work. Re-check before any trusted-identity mutation.
        if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }
        if (acceptedCanonicalEquivalent) {
          snapshot.outputFingerprint = actualFingerprint;
          const liveSession = getCoreSession();
          if (!liveSession?.current
              || Number(liveSession.currentOutputIndex) !== expectedOutIndex
              || String(snapshot.locationKey || '') !== diagnosticLocationKey(chaIdx, chatIdx, chat)) {
            if (detail) detail.status = 'SESSION_IDENTITY_MISMATCH';
            return false;
          }
          liveSession.current.outputFingerprint = actualFingerprint;
          liveSession.trustedOutputFingerprint = actualFingerprint;
          snapshot.portableState = liveSession.portableState();
        }'''
    mod = mod[:s] + new_block + mod[e:]

    old_schedule_head = """  function schedule(chaIdx, chatIdx, chat, outIndex, state, freshEnvelopeConfirmation = null, safeEnvelopeBoundaryConfirmation = null) {
    const snapshot = capture(chaIdx, chatIdx, chat, outIndex, state);
    if (!snapshot) return false;"""
    new_schedule_head = """  function schedule(chaIdx, chatIdx, chat, outIndex, state, freshEnvelopeConfirmation = null, safeEnvelopeBoundaryConfirmation = null) {
    const snapshot = capture(chaIdx, chatIdx, chat, outIndex, state);
    if (!snapshot) return false;
    const observationPlan = outputCompat.buildFreshObservationPlan(
      freshEnvelopeConfirmation,
      safeEnvelopeBoundaryConfirmation,
    );"""
    mod = one(mod, old_schedule_head, new_schedule_head, "runtime-mirror-plan-before-deferred")

    mod = one(
        mod,
        "      freshEnvelopeCandidateChars: Number(freshEnvelopeConfirmation?.candidateChars || 0),",
        "      freshEnvelopeCandidateChars: Number(observationPlan?.telemetrySeed?.freshEnvelopeCandidateChars || 0),",
        "runtime-mirror-probe-fresh-seed",
    )
    mod = one(
        mod,
        "      safeEnvelopeCanonicalChars: Number(safeEnvelopeBoundaryConfirmation?.canonicalChars || 0),",
        "      safeEnvelopeCanonicalChars: Number(observationPlan?.telemetrySeed?.safeEnvelopeCanonicalChars || 0),",
        "runtime-mirror-probe-safe-seed",
    )
    mod = one(
        mod,
        "      safeEnvelopePersistent: 'NONE',\n    };",
        "      safeEnvelopePersistent: 'NONE',\n      acceptedCanonicalEquivalent: false,\n      observationBaseMatch: 'PENDING',\n      observationCandidateMatches: 0,\n    };",
        "runtime-mirror-probe-facts",
    )
    mod = one(
        mod,
        "      const ok = await mirror(chaIdx, chatIdx, null, detail, snapshot, shouldApply, freshEnvelopeConfirmation, safeEnvelopeBoundaryConfirmation);",
        "      const ok = await mirror(chaIdx, chatIdx, null, detail, snapshot, shouldApply, observationPlan);",
        "runtime-mirror-deferred-call",
    )
    mod = one(
        mod,
        "      probe.safeEnvelopePersistent = detail.safeEnvelopePersistent ?? probe.safeEnvelopePersistent;\n",
        "      probe.safeEnvelopePersistent = detail.safeEnvelopePersistent ?? probe.safeEnvelopePersistent;\n"
        "      probe.acceptedCanonicalEquivalent = detail.acceptedCanonicalEquivalent === true;\n"
        "      probe.observationBaseMatch = detail.observationBaseMatch ?? probe.observationBaseMatch;\n"
        "      probe.observationCandidateMatches = detail.observationCandidateMatches ?? probe.observationCandidateMatches;\n",
        "runtime-mirror-probe-fact-copy",
    )

    for token in ("FRESH_CONFIRMED_SUFFIX", "BOUNDARY_CONFIRMED_SUFFIX", "SAFE_BOUNDARY_CONFIRMED"):
        if token in mod:
            raise SystemExit(f"06600_RUNTIME_MIRROR_POLICY_LABEL_REMAINS {token}")
    return replace_module(text, "runtime-mirror", mod)


def patch_edit_reconcile(text):
    mod = module_text(text, "edit-reconcile")
    marker = 'SimCore.define("edit-reconcile", function (require, module, exports) {\n'
    prelude = """const kernel = require('./kernel');
const time = require('./time');
const outputCompat = require('./output-compat');
const bootstrapMigration = require('./bootstrap-migration');
const outputFinalize = require('./output-finalize');

function reconcileNow() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
}
function reconcileElapsed(start) { return Math.max(0, reconcileNow() - start); }

"""
    mod = one(mod, marker, marker + prelude, "edit-reconcile-direct-owner-requires")
    old_head = """async function reconcileSessionEditedOutput(session, outIndex, content, perfDetail = null, deps = {}) {
  const { kernel, time, recovery, finalizePreparedOutput, sessionNow, sessionElapsed } = deps;
"""
    new_head = """async function reconcileSessionEditedOutput(session, outIndex, content, perfDetail = null) {
"""
    mod = one(mod, old_head, new_head, "edit-reconcile-signature")
    mod = mod.replace("sessionNow()", "reconcileNow()").replace("sessionElapsed(", "reconcileElapsed(")
    mod = mod.replace("recovery.prepareOutput(", "outputCompat.prepareOutput(")
    mod = mod.replace("recovery.repairLegacyClockState(", "bootstrapMigration.repairLegacyClockState(")
    mod = re.sub(r'(?<![\w.])finalizePreparedOutput\(', 'outputFinalize.finalizePreparedOutput(', mod)
    if "recovery." in mod or "require('./recovery')" in mod:
        raise SystemExit("06600_EDIT_RECONCILE_RECOVERY_CALLER_REMAINS")
    return replace_module(text, "edit-reconcile", mod)


def patch_session(text):
    session = module_text(text, "session")
    _, _, finalize_fn = extract_finalize(session)
    output_module = build_output_finalize_module(finalize_fn)

    fs, fe, _ = cut_between(session, "function finalizePreparedOutput(baseState, prepared, outIndex, opts = {}) {", "\n\nclass CoreRulesetSession", "session-finalize-remove")
    session = session[:fs] + session[fe+2:]

    session = one(
        session,
        "const recovery = require('./recovery');",
        "const outputCompat = require('./output-compat');\nconst bootstrapMigration = require('./bootstrap-migration');\nconst outputFinalize = require('./output-finalize');",
        "session-direct-owner-requires",
    )
    session = session.replace("recovery.bootstrapFromHistory(", "bootstrapMigration.bootstrapFromHistory(")
    session = session.replace("recovery.repairLatestGlobalFloorContamination(", "bootstrapMigration.repairLatestGlobalFloorContamination(")
    session = session.replace("recovery.repairLegacyClockState(", "bootstrapMigration.repairLegacyClockState(")
    session = session.replace("recovery.prepareOutput(", "outputCompat.prepareOutput(")
    session = session.replace("recovery.buildSafeEnvelopeBoundaryConfirmation(", "outputCompat.buildSafeEnvelopeBoundaryConfirmation(")
    session = re.sub(r'(?<![\w.])finalizePreparedOutput\(', 'outputFinalize.finalizePreparedOutput(', session)

    session = one(
        session,
        "    this.deferredPruneIndex = -1;\n    this.deferredPruneRunning = false;\n",
        "",
        "session-housekeeping-state-remove",
    )
    sched_start = "  scheduleDeferredPrune(outIndex) {"
    sched_end = "\n\n  async processOutput(outIndex, content, perfDetail = null) {"
    ss, se, _ = cut_between(session, sched_start, sched_end, "session-housekeeping-method-remove")
    session = session[:ss] + session[se+2:]
    session = session.replace("this.scheduleDeferredPrune(outIndex)", "this.store.scheduleDeferredPrune(outIndex)")

    method_start = "  async reconcileEditedOutput(outIndex, content, perfDetail = null) {"
    method_end = "\n\n  storageDiagnostics()"
    ms, me, _ = cut_between(session, method_start, method_end, "session-edit-delegate")
    delegate = """  async reconcileEditedOutput(outIndex, content, perfDetail = null) {
    return editReconcile.reconcileSessionEditedOutput(this, outIndex, content, perfDetail);
  }"""
    session = session[:ms] + delegate + session[me:]

    if "recovery." in session or "require('./recovery')" in session:
        raise SystemExit("06600_SESSION_RECOVERY_CALLER_REMAINS")
    if "function finalizePreparedOutput(" in session:
        raise SystemExit("06600_SESSION_FINALIZE_OWNER_REMAINS")
    if "deferredPruneIndex" in session or "deferredPruneRunning" in session:
        raise SystemExit("06600_SESSION_HOUSEKEEPING_STATE_REMAINS")

    text = replace_module(text, "session", session)
    session_start, _ = module_bounds(text, "session")
    text = text[:session_start] + output_module + "\n\n" + text[session_start:]
    return text


def patch_contracts_runtime(text):
    mod = module_text(text, "contracts")
    mod = one(
        mod,
        "  store: Object.freeze({ owns: 'snapshot persistence and retention', excludes: 'semantic state decisions or prompt wording' }),",
        "  store: Object.freeze({ owns: 'snapshot persistence, retention and deferred retention housekeeping mechanics', excludes: 'semantic state decisions or prompt wording' }),",
        "runtime-contract-store",
    )
    mod = one(
        mod,
        "  'output-compat': Object.freeze({ owns: 'output envelope compatibility/canonicalization and Fresh-confirmation candidate metadata', excludes: 'history bootstrap, manual edit attribution, persistent raw body' }),",
        "  'output-compat': Object.freeze({ owns: 'output envelope compatibility/canonicalization plus bounded Fresh candidate planning and compatibility interpretation', excludes: 'host Fresh reads, history bootstrap, manual edit attribution, persistent raw body' }),",
        "runtime-contract-output-compat",
    )
    mod = one(
        mod,
        "  'bootstrap-migration': Object.freeze({ owns: 'history bootstrap and legacy migration/repair coordination', excludes: 'ordinary output compatibility or manual edit attribution' }),",
        "  'bootstrap-migration': Object.freeze({ owns: 'history bootstrap and legacy migration/repair coordination', excludes: 'ordinary output compatibility or manual edit attribution' }),\n"
        "  'output-finalize': Object.freeze({ owns: 'deterministic prepared-output to committed-state/content transition composition', excludes: 'storage I/O, host I/O, envelope candidate policy or edit attribution' }),",
        "runtime-contract-output-finalize",
    )
    mod = one(
        mod,
        "  recovery: Object.freeze({ owns: 'M2 compatibility facade over output-compat + bootstrap-migration', excludes: 'new policy ownership; facade may shrink after callers migrate' }),",
        "  recovery: Object.freeze({ owns: 'deprecated M2 compatibility facade over output-compat + bootstrap-migration with zero runtime callers', excludes: 'new policy ownership' }),",
        "runtime-contract-recovery",
    )
    mod = one(
        mod,
        "  session: Object.freeze({ owns: 'pipeline orchestration and commit sequencing', excludes: 'prompt wording ownership or creative/semantic decisions' }),",
        "  session: Object.freeze({ owns: 'per-chat application identity/current-state holder plus bounded persistence sequencing', excludes: 'output-finalization policy, retention housekeeping mechanics, prompt wording ownership or creative/semantic decisions' }),",
        "runtime-contract-session",
    )
    return replace_module(text, "contracts", mod)


def patch_operator_card(text):
    start = "  const OPERATOR_RELEASE_CARD = Object.freeze({"
    end = "\n\n\n  async function openPanel() {"
    s, e, _ = cut_between(text, start, end, "operator-release-card")
    return text[:s] + CARD + text[e:]


def patch_header(text):
    text = one(text, f"//@version {FROM_VERSION}", f"//@version {TARGET_VERSION}", "metadata-version")
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.65.0';", "const SIMCORE_RUNTIME_VERSION = '0.66.0';", "runtime-version")
    text = one(text, "const HOST_COMPAT_VERSION = '0.65.0';", "const HOST_COMPAT_VERSION = '0.66.0';", "host-version")
    text = one(
        text,
        "// - Store: snapshot persistence/retention only",
        "// - Store: snapshot persistence/retention + deferred retention housekeeping mechanics only",
        "inventory-store",
    )
    text = one(
        text,
        "// - Edit Reconcile: previous-assistant reconcile decision tree + manual rebuild fallback coordination; application-only, no host reads\n// - Output Compat:",
        "// - Edit Reconcile: previous-assistant reconcile decision tree + manual rebuild fallback coordination; application-only, no host reads\n"
        "// - Output Finalize: deterministic prepared-output → committed state/content transition composition; application-only, no I/O\n"
        "// - Output Compat:",
        "inventory-output-finalize",
    )
    text = one(text, "// v0.65.0 M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence:", RELEASE_NOTE + "// v0.65.0 M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence:", "release-note")
    return text


def assert_candidate(text):
    metadata = re.search(r"^//@version\s+([^\s]+)\s*$", text, re.M)
    runtime = re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", text)
    host = re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", text)
    values = [metadata.group(1) if metadata else None, runtime.group(1) if runtime else None, host.group(1) if host else None]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        raise SystemExit(f"06600_RUNTIME_IDENTITY_SPLIT values={values}")

    required = (
        'SimCore.define("output-finalize"',
        "const outputFinalize = require('./output-finalize');",
        "scheduleDeferredPrune(outIndex)",
        "this.store.scheduleDeferredPrune(outIndex)",
        "const outputCompat = require('./output-compat');",
        "const bootstrapMigration = require('./bootstrap-migration');",
        "buildFreshObservationPlan",
        "interpretFreshObservation",
        "acceptedCanonicalEquivalent",
        "observationCandidateMatches",
        "version: '0.66.0'",
        "M2-4 Session / Runtime Mirror Boundary Completion",
    )
    for needle in required:
        if needle not in text:
            raise SystemExit(f"06600_REQUIRED_MARKER_MISSING {needle}")

    store = module_text(text, "store")
    session = module_text(text, "session")
    edit = module_text(text, "edit-reconcile")
    finalize = module_text(text, "output-finalize")
    mirror = module_text(text, "runtime-mirror")
    representation = module_text(text, "representation")
    recovery = module_text(text, "recovery")
    output_compat = module_text(text, "output-compat")

    if "function finalizePreparedOutput(" in session:
        raise SystemExit("06600_SLICE_A_SESSION_FINALIZER_REMAINS")
    if "function finalizePreparedOutput(" not in finalize:
        raise SystemExit("06600_SLICE_A_FINALIZER_MISSING")
    for token in (".store", "host.", "setChat", "pluginStorage", "setTimeout", "setInterval"):
        if token in finalize:
            raise SystemExit(f"06600_SLICE_A_IO_FORBIDDEN {token}")

    if "deferredPruneIndex" in session or "deferredPruneRunning" in session or "\n  scheduleDeferredPrune(outIndex) {" in session:
        raise SystemExit("06600_SLICE_B_SESSION_HOUSEKEEPING_REMAINS")
    for token in ("deferredPruneIndex", "deferredPruneRunning", "scheduleDeferredPrune(outIndex)", "setTimeout(run, 750)", "await this.prune()"):
        if token not in store:
            raise SystemExit(f"06600_SLICE_B_STORE_MARKER_MISSING {token}")

    for name, mod in (("session", session), ("edit-reconcile", edit)):
        if "require('./recovery')" in mod or "recovery." in mod:
            raise SystemExit(f"06600_SLICE_C_RECOVERY_CALLER_REMAINS {name}")
    if 'SimCore.define("recovery"' not in recovery:
        raise SystemExit("06600_SLICE_C_RECOVERY_SHIM_MISSING")
    for export in ("prepareOutput", "bootstrapFromHistory", "repairLegacyClockState", "repairLatestGlobalFloorContamination"):
        if export not in recovery:
            raise SystemExit(f"06600_SLICE_C_RECOVERY_EXPORT_MISSING {export}")

    for token in ("FRESH_CONFIRMED_SUFFIX", "BOUNDARY_CONFIRMED_SUFFIX", "SAFE_BOUNDARY_CONFIRMED"):
        if token in mirror:
            raise SystemExit(f"06600_SLICE_D_MIRROR_POLICY_LABEL_REMAINS {token}")
        if token not in output_compat:
            raise SystemExit(f"06600_SLICE_D_OUTPUT_COMPAT_POLICY_LABEL_MISSING {token}")
        if token in representation:
            raise SystemExit(f"06600_SLICE_D_REPRESENTATION_POLICY_LABEL_REMAINS {token}")
    if "EXACT_PRIOR_MATCHES" in representation:
        raise SystemExit("06600_SLICE_D_REPRESENTATION_LABEL_LIST_REMAINS")
    if "row.acceptedCanonicalEquivalent === true" not in representation:
        raise SystemExit("06600_SLICE_D_REPRESENTATION_EQUIVALENCE_FACT_MISSING")
    if "const observationPlan = outputCompat.buildFreshObservationPlan(" not in mirror:
        raise SystemExit("06600_SLICE_D_PLAN_MISSING")
    if "outputCompat.interpretFreshObservation(observationPlan, receipt)" not in mirror:
        raise SystemExit("06600_SLICE_D_INTERPRETATION_DELEGATE_MISSING")
    if "const actualFingerprint = coreRules.fingerprintText(textMessageContent(message));" not in mirror:
        raise SystemExit("06600_SLICE_D_FRESH_OBSERVATION_MISSING")
    if mirror.count("host.getChat(") != 1:
        raise SystemExit(f"06600_SLICE_D_HOST_CHAT_READ_COUNT count={mirror.count('host.getChat(')}")
    if "if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }\n        if (acceptedCanonicalEquivalent)" not in mirror:
        raise SystemExit("06600_SLICE_D_POST_INTERPRET_GUARD_MISSING")

    if "providerCache: 'UNVERIFIED'" not in text and "provider cache UNVERIFIED" not in text:
        raise SystemExit("06600_PROVIDER_CACHE_CONTRACT_MISSING")


def patch(text):
    if f"//@version {FROM_VERSION}" not in text:
        raise SystemExit("06600_UNEXPECTED_SOURCE_VERSION")
    text = patch_header(text)
    text = patch_contracts_runtime(text)
    text = patch_store(text)
    text = patch_output_compat(text)
    text = patch_representation(text)
    text = patch_edit_reconcile(text)
    text = patch_session(text)
    text = patch_runtime_mirror(text)
    text = patch_operator_card(text)
    assert_candidate(text)
    return text


for target in FILES:
    original = target.read_text(encoding="utf-8")
    updated = patch(original)
    target.write_text(updated, encoding="utf-8")

latest = FILES[0].read_text(encoding="utf-8")
install = FILES[1].read_text(encoding="utf-8")
if latest != install:
    raise SystemExit("06600_LATEST_INSTALL_MISMATCH")

print("06600_BUILD_PASS")
print(f"version={TARGET_VERSION}")
print(f"bytes={len(latest.encode('utf-8'))}")
