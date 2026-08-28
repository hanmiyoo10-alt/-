#!/usr/bin/env python3
from pathlib import Path
import re

VERSION_FROM = '0.64.9'
VERSION_TO = '0.64.10'
RELEASE_NAME = 'Host-Local One-Shot Telemetry Handoff'
FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'06410_PATCH_ANCHOR_INVALID {label} count={count}')
    return text.replace(old, new, 1)


def replace_range(text, start, end, replacement, label):
    start_count = text.count(start)
    end_count = text.count(end)
    if start_count != 1 or end_count != 1:
        raise SystemExit(f'06410_PATCH_ANCHOR_INVALID {label} start={start_count} end={end_count}')
    a = text.index(start)
    b = text.index(end, a)
    return text[:a] + replacement + '\n\n' + text[b:]


RELEASE_NOTE = '''// v0.64.10 Host-Local One-Shot Telemetry Handoff:
// - Follows confirmed v0.64.9 live evidence where both WINDOW.sessionStorage and GLOBAL_THIS.sessionStorage throw ACCESS_ERROR and therefore cannot provide the pre-refresh durable telemetry sidecar
// - Preserves MEMORY -> browser SESSION priority and adds exactly one lowest-priority HOST_LOCAL fallback through Risuai.getLocalPluginStorage() only when the common metadata-only capsule is valid and browser SESSION did not write
// - Uses one SimCore-owned Host-local pending mailbox, one runtime-scoped lazy Host store acquisition, one boot mailbox read, consume-before-adopt for matching locations, and non-destructive FOREIGN_LOCATION handling; no retry, polling, queue, key enumeration or second Host-local key is added
// - Keeps the existing schema-1 capsule, exact location guard, 10-minute age bound, 16,384-character serialized cap and provider cache UNVERIFIED contract; raw user/assistant/prompt bodies and Core semantic state are never persisted
// - Authoritative OUTPUT_COMMIT awaits at most one Host-local write after Core output success so the copied diagnostic reports actual durability before refresh; any Host-local failure remains telemetry-only and cannot downgrade the committed output
// - Last Turn Diagnostic adds bounded Host-local acquisition/clear/boot/write attribution and Host write timing while preserving v0.64.9 Session surface diagnostics and existing Core semantic owners
// - Updates the existing collapsed 업데이트 내역 card to the 0.64.10/0.64.9/0.64.8 ledger without adding a top-level UI part or rendering-time storage/network/timer operation
// - M2-3 ownership extraction remains frozen until 06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT closes with human evidence
//
'''

NEW_TELEMETRY = r'''SimCore.define("runtime-telemetry", function (require, module, exports) {
const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';
const SESSION_KEY = '__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__';
const HOST_LOCAL_KEY = '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__';
const HOST_COMPAT_VERSION = '0.64.10';
const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_SESSION_CHARS = 16384;
const MAX_SERIALIZED_CHARS = 16384;
let lastWriteProbe = null;
let lastClaimProbe = null;
let lastSurfaceProbe = null;
let lastHostProbe = Object.freeze({ api: 'UNOBSERVED', store: 'UNOBSERVED', clear: 'UNKNOWN', boot: 'UNOBSERVED', acquireAttempts: 0, readAttempts: 0 });
let hostStorePromise = null;
let hostReadAttempted = false;
let hostClaimResult = null;

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

function inspectSessionSurface(root, label) {
  if (!root) return Object.freeze({ label, status: 'ROOT_ABSENT', storage: null });
  let storage = null;
  try { storage = root.sessionStorage; }
  catch (_) { return Object.freeze({ label, status: 'ACCESS_ERROR', storage: null }); }
  if (storage == null) return Object.freeze({ label, status: 'STORAGE_ABSENT', storage: null });
  if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    return Object.freeze({ label, status: 'METHODS_INCOMPLETE', storage: null });
  }
  return Object.freeze({ label, status: 'USABLE', storage });
}

function resolveSessionCandidates(root, windowLike) {
  const windowSurface = inspectSessionSurface(windowLike, 'WINDOW');
  const globalSurface = inspectSessionSurface(root, 'GLOBAL_THIS');
  const windowUsable = windowSurface.status === 'USABLE';
  const globalUsable = globalSurface.status === 'USABLE';
  let relation = 'NONE';
  let first = null;
  let second = null;
  if (windowUsable && globalUsable) {
    if (windowSurface.storage === globalSurface.storage) {
      relation = 'SAME_OBJECT';
      first = Object.freeze({ label: 'WINDOW', storage: windowSurface.storage });
    } else {
      relation = 'DISTINCT_OBJECTS';
      first = Object.freeze({ label: 'WINDOW', storage: windowSurface.storage });
      second = Object.freeze({ label: 'GLOBAL_THIS', storage: globalSurface.storage });
    }
  } else if (windowUsable) {
    relation = 'SINGLE_CANDIDATE';
    first = Object.freeze({ label: 'WINDOW', storage: windowSurface.storage });
  } else if (globalUsable) {
    relation = 'SINGLE_CANDIDATE';
    first = Object.freeze({ label: 'GLOBAL_THIS', storage: globalSurface.storage });
  }
  const surface = Object.freeze({ window: windowSurface.status, globalThis: globalSurface.status, relation });
  lastSurfaceProbe = surface;
  return Object.freeze({ surface, first, second });
}

function surfaceDiagnostics() {
  return lastSurfaceProbe || Object.freeze({ window: 'UNOBSERVED', globalThis: 'UNOBSERVED', relation: 'NONE' });
}

function serializeCapsule(capsule) {
  if (!capsule) return Object.freeze({ status: 'EMPTY', encoded: null, chars: 0 });
  try {
    const encoded = JSON.stringify(capsule);
    const chars = encoded.length;
    return Object.freeze({ status: chars > MAX_SERIALIZED_CHARS ? 'OVERSIZE' : 'OK', encoded, chars });
  } catch (_) {
    return Object.freeze({ status: 'FAILED', encoded: null, chars: 0 });
  }
}

function publishPrepared(root, windowLike, capsule, prepared) {
  let memory = 'UNAVAILABLE';
  let session = 'UNAVAILABLE';
  let sessionRoot = 'NONE';
  let fallbackFrom = null;
  let attempted = '';
  if (root) {
    try { root[KEY] = capsule; memory = 'WRITTEN'; }
    catch (_) { memory = 'FAILED'; }
  }

  const resolved = resolveSessionCandidates(root, windowLike);
  const first = resolved.first;
  const second = resolved.second;
  if (prepared.status === 'OVERSIZE') {
    session = first ? 'OVERSIZE' : 'UNAVAILABLE';
    if (first) { try { first.storage.removeItem(SESSION_KEY); } catch (_) {} }
    if (second) { try { second.storage.removeItem(SESSION_KEY); } catch (_) {} }
  } else if (prepared.status === 'FAILED') {
    session = first ? 'FAILED' : 'UNAVAILABLE';
  } else if (prepared.status === 'OK' && first) {
    attempted = first.label;
    try {
      first.storage.setItem(SESSION_KEY, prepared.encoded);
      session = 'WRITTEN';
      sessionRoot = first.label;
    } catch (_) {
      session = 'FAILED';
      fallbackFrom = `${first.label}_FAILED`;
      if (second) {
        attempted = `${first.label},${second.label}`;
        try {
          second.storage.setItem(SESSION_KEY, prepared.encoded);
          session = 'WRITTEN';
          sessionRoot = second.label;
        } catch (_) { session = 'FAILED'; }
      }
    }
  }
  return Object.freeze({ memory, session, sessionRoot, fallbackFrom, attempted, serializedChars: prepared.chars, serialization: prepared.status, surface: resolved.surface });
}

function publish(root, windowLike, capsule) {
  if (!capsule) return false;
  const prepared = serializeCapsule(capsule);
  const base = publishPrepared(root, windowLike, capsule, prepared);
  lastWriteProbe = Object.freeze({ ...base, hostLocal: 'UNOBSERVED', hostElapsedMs: 0, retainedBodies: false });
  return base.memory === 'WRITTEN' || base.session === 'WRITTEN';
}

function updateHostProbe(patch) {
  lastHostProbe = Object.freeze({ ...lastHostProbe, ...patch });
  if (lastClaimProbe) lastClaimProbe = Object.freeze({ ...lastClaimProbe, hostLocal: lastHostProbe.boot });
  return lastHostProbe;
}

async function getHostLocalTelemetryStoreOnce(hostApi) {
  if (hostStorePromise) return hostStorePromise;
  hostStorePromise = (async () => {
    updateHostProbe({ acquireAttempts: 1 });
    if (!hostApi || typeof hostApi.getLocalPluginStorage !== 'function') {
      updateHostProbe({ api: 'ABSENT', store: 'API_ABSENT', clear: 'UNKNOWN' });
      return Object.freeze({ status: 'API_ABSENT', store: null, clear: 'UNKNOWN' });
    }
    updateHostProbe({ api: 'PRESENT' });
    let store = null;
    try { store = await hostApi.getLocalPluginStorage(); }
    catch (_) {
      updateHostProbe({ store: 'ACQUIRE_FAILED', clear: 'UNKNOWN' });
      return Object.freeze({ status: 'ACQUIRE_FAILED', store: null, clear: 'UNKNOWN' });
    }
    if (!store || typeof store.getItem !== 'function' || typeof store.setItem !== 'function') {
      updateHostProbe({ store: 'METHODS_INCOMPLETE', clear: 'UNKNOWN' });
      return Object.freeze({ status: 'METHODS_INCOMPLETE', store: null, clear: 'UNKNOWN' });
    }
    const clear = typeof store.removeItem === 'function' ? 'REMOVE' : 'EMPTY_WRITE';
    updateHostProbe({ store: 'USABLE', clear });
    return Object.freeze({ status: 'USABLE', store, clear });
  })();
  return hostStorePromise;
}

async function publishWithHostLocal(root, windowLike, hostApi, capsule) {
  if (!capsule) return false;
  const prepared = serializeCapsule(capsule);
  const base = publishPrepared(root, windowLike, capsule, prepared);
  let hostLocal = 'UNAVAILABLE';
  let hostElapsedMs = 0;
  if (base.session === 'WRITTEN') {
    hostLocal = 'NOT_NEEDED';
  } else if (prepared.status === 'OVERSIZE') {
    hostLocal = 'OVERSIZE';
  } else if (prepared.status === 'OK') {
    const startedAt = Date.now();
    const acquired = await getHostLocalTelemetryStoreOnce(hostApi);
    if (acquired.status === 'USABLE') {
      try {
        await acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded);
        hostLocal = 'WRITTEN';
      } catch (_) { hostLocal = 'FAILED'; }
    } else {
      hostLocal = 'UNAVAILABLE';
    }
    hostElapsedMs = Math.max(0, Date.now() - startedAt);
  }
  lastWriteProbe = Object.freeze({
    ...base,
    hostLocal,
    hostElapsedMs,
    host: lastHostProbe,
    retainedBodies: false,
  });
  return base.memory === 'WRITTEN' || base.session === 'WRITTEN' || hostLocal === 'WRITTEN';
}

function takeMemory(root) {
  if (!root) return { status: 'unavailable', capsule: null };
  try {
    const capsule = root[KEY] || null;
    try { delete root[KEY]; } catch (_) { root[KEY] = undefined; }
    return { status: capsule ? 'available' : 'empty', capsule };
  } catch (_) { return { status: 'failed', capsule: null }; }
}

function takeSessionCandidate(candidate) {
  if (!candidate) return null;
  let raw = null;
  try { raw = candidate.storage.getItem(SESSION_KEY); }
  catch (_) { return Object.freeze({ root: candidate.label, status: 'failed', capsule: null, serializedChars: 0 }); }
  if (raw == null) return Object.freeze({ root: candidate.label, status: 'empty', capsule: null, serializedChars: 0 });
  try { candidate.storage.removeItem(SESSION_KEY); } catch (_) {}
  const serializedChars = String(raw).length;
  if (serializedChars > MAX_SESSION_CHARS) return Object.freeze({ root: candidate.label, status: 'oversize', capsule: null, serializedChars });
  try { return Object.freeze({ root: candidate.label, status: 'available', capsule: JSON.parse(String(raw)), serializedChars }); }
  catch (_) { return Object.freeze({ root: candidate.label, status: 'malformed', capsule: null, serializedChars }); }
}

function claim(root, windowLike) {
  const memory = takeMemory(root);
  const resolved = resolveSessionCandidates(root, windowLike);
  const first = takeSessionCandidate(resolved.first);
  const second = takeSessionCandidate(resolved.second);
  const firstStatus = first?.status || 'unavailable';
  const secondStatus = second?.status || 'unavailable';
  const summaryStatus = first?.status === 'available' ? 'available' : (second?.status === 'available' ? 'available' : (first?.status || second?.status || 'unavailable'));
  lastClaimProbe = Object.freeze({
    memory: memory.status,
    session: summaryStatus,
    sessionRoots: Object.freeze({ first: first ? `${first.root}:${firstStatus}` : null, second: second ? `${second.root}:${secondStatus}` : null }),
    sessionChars: Number(first?.serializedChars || 0) + Number(second?.serializedChars || 0),
    surface: resolved.surface,
    hostLocal: lastHostProbe.boot,
    memoryValidation: 'PENDING',
    sessionValidation: 'PENDING',
    hostValidation: 'PENDING',
    selected: 'NONE',
    selectedRoot: 'NONE',
    retainedBodies: false,
  });
  return Object.freeze({
    claimSchema: 1,
    memory: memory.capsule,
    session: first?.capsule || null,
    sessionStatus: firstStatus,
    sessionRoot: first?.root || null,
    sessionCandidates: second ? Object.freeze([first, second]) : (first ? Object.freeze([first]) : Object.freeze([])),
  });
}

function hostExportShape(value) {
  return value == null || (typeof value === 'object' && !Array.isArray(value));
}

function classifyConsumedHostCapsule(capsule, now) {
  if (!capsule || typeof capsule !== 'object' || Array.isArray(capsule)) return 'MALFORMED';
  if (Number(capsule.schema) !== 1) return 'INCOMPATIBLE';
  if (String(capsule.sourceVersion || '') !== HOST_COMPAT_VERSION) return 'INCOMPATIBLE';
  const capturedAt = Number(capsule.capturedAt || 0);
  const ageMs = Math.max(0, Number(now) - capturedAt);
  if (!Number.isFinite(capturedAt) || capturedAt <= 0 || !Number.isFinite(ageMs) || ageMs > MAX_AGE_MS) return 'STALE';
  if (!hostExportShape(capsule.runtimePromptCache) || !hostExportShape(capsule.requestTopology) || !hostExportShape(capsule.cacheCandidates)) return 'MALFORMED';
  return 'CONSUMED';
}

async function claimHostLocalOnce(hostApi, locationKey, now = Date.now()) {
  if (hostReadAttempted) return hostClaimResult;
  hostReadAttempted = true;
  updateHostProbe({ readAttempts: 1 });
  const acquired = await getHostLocalTelemetryStoreOnce(hostApi);
  if (acquired.status !== 'USABLE') {
    hostClaimResult = Object.freeze({ status: 'UNAVAILABLE', capsule: null, serializedChars: 0 });
    updateHostProbe({ boot: 'UNAVAILABLE' });
    return hostClaimResult;
  }
  let raw = null;
  try { raw = await acquired.store.getItem(HOST_LOCAL_KEY); }
  catch (_) {
    hostClaimResult = Object.freeze({ status: 'READ_FAILED', capsule: null, serializedChars: 0 });
    updateHostProbe({ boot: 'READ_FAILED' });
    return hostClaimResult;
  }
  if (raw == null || String(raw) === '') {
    hostClaimResult = Object.freeze({ status: 'EMPTY', capsule: null, serializedChars: 0 });
    updateHostProbe({ boot: 'EMPTY' });
    return hostClaimResult;
  }
  const serializedChars = String(raw).length;
  if (serializedChars > MAX_SERIALIZED_CHARS) {
    hostClaimResult = Object.freeze({ status: 'MALFORMED', capsule: null, serializedChars });
    updateHostProbe({ boot: 'MALFORMED' });
    return hostClaimResult;
  }
  let capsule = null;
  try { capsule = JSON.parse(String(raw)); }
  catch (_) {
    hostClaimResult = Object.freeze({ status: 'MALFORMED', capsule: null, serializedChars });
    updateHostProbe({ boot: 'MALFORMED' });
    return hostClaimResult;
  }
  if (!capsule || typeof capsule !== 'object' || Array.isArray(capsule)) {
    hostClaimResult = Object.freeze({ status: 'MALFORMED', capsule: null, serializedChars });
    updateHostProbe({ boot: 'MALFORMED' });
    return hostClaimResult;
  }
  if (String(capsule.locationKey || '') !== String(locationKey || '')) {
    hostClaimResult = Object.freeze({ status: 'FOREIGN_LOCATION', capsule: null, serializedChars });
    updateHostProbe({ boot: 'FOREIGN_LOCATION' });
    return hostClaimResult;
  }
  try {
    if (typeof acquired.store.removeItem === 'function') await acquired.store.removeItem(HOST_LOCAL_KEY);
    else await acquired.store.setItem(HOST_LOCAL_KEY, '');
  } catch (_) {
    hostClaimResult = Object.freeze({ status: 'CONSUME_FAILED', capsule: null, serializedChars });
    updateHostProbe({ boot: 'CONSUME_FAILED' });
    return hostClaimResult;
  }
  const status = classifyConsumedHostCapsule(capsule, now);
  hostClaimResult = Object.freeze({ status, capsule: status === 'CONSUMED' ? capsule : null, serializedChars });
  updateHostProbe({ boot: status });
  return hostClaimResult;
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

function sessionReason(entry, validation) {
  if (entry?.status === 'malformed') return 'session-malformed';
  if (entry?.status === 'oversize') return 'session-oversize';
  if (entry?.status === 'failed') return 'session-failed';
  return validation?.reason || 'no-compatible-handoff';
}

function hostReason(hostClaim, validation) {
  if (!hostClaim) return 'no-compatible-handoff';
  if (hostClaim.status !== 'CONSUMED') return `host-local-${String(hostClaim.status || 'unavailable').toLowerCase()}`;
  return validation?.reason || 'no-compatible-handoff';
}

function validate(claimed, locationKey, now = Date.now(), hostClaim = null) {
  if (!claimed || Number(claimed.claimSchema) !== 1) {
    const legacy = validateCapsule(claimed, locationKey, now);
    return { ...legacy, transport: legacy.accepted ? 'memory' : null, fallbackFrom: null, sessionRoot: null };
  }
  const memory = validateCapsule(claimed.memory, locationKey, now);
  const candidates = Array.isArray(claimed.sessionCandidates)
    ? claimed.sessionCandidates
    : [claimed.session ? { root: claimed.sessionRoot || 'WINDOW', status: claimed.sessionStatus || 'available', capsule: claimed.session } : null].filter(Boolean);
  const firstEntry = candidates[0] || null;
  const secondEntry = candidates[1] || null;
  const firstValidation = validateCapsule(firstEntry?.capsule || null, locationKey, now);
  const secondValidation = validateCapsule(secondEntry?.capsule || null, locationKey, now);
  const hostValidation = validateCapsule(hostClaim?.status === 'CONSUMED' ? hostClaim.capsule : null, locationKey, now);

  if (memory.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: 'exact', sessionValidation: (firstEntry || secondEntry) ? 'standby' : 'empty', hostValidation: hostClaim ? 'standby' : 'empty', selected: 'memory', selectedRoot: 'NONE' });
    return { ...memory, transport: 'memory', fallbackFrom: null, sessionRoot: null };
  }
  if (firstValidation.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: 'exact', hostValidation: hostClaim ? 'standby' : 'empty', selected: 'session', selectedRoot: firstEntry.root });
    return { ...firstValidation, transport: 'session', fallbackFrom: memory.reason, sessionRoot: firstEntry.root };
  }
  if (secondValidation.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: 'exact', hostValidation: hostClaim ? 'standby' : 'empty', selected: 'session', selectedRoot: secondEntry.root });
    return { ...secondValidation, transport: 'session', fallbackFrom: sessionReason(firstEntry, firstValidation), sessionRoot: secondEntry.root };
  }
  if (hostValidation.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: validationClass(secondEntry ? secondValidation : firstValidation), hostValidation: 'exact', selected: 'host-local', selectedRoot: 'NONE' });
    return { ...hostValidation, transport: 'host-local', fallbackFrom: secondEntry ? sessionReason(secondEntry, secondValidation) : (firstEntry ? sessionReason(firstEntry, firstValidation) : memory.reason), sessionRoot: null };
  }
  const firstReason = sessionReason(firstEntry, firstValidation);
  const secondReason = sessionReason(secondEntry, secondValidation);
  const hostFailure = hostReason(hostClaim, hostValidation);
  lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: validationClass(secondEntry ? secondValidation : firstValidation), hostValidation: hostClaim ? validationClass(hostValidation) : 'empty', selected: 'NONE', selectedRoot: 'NONE' });
  const primary = claimed.memory
    ? memory
    : (firstEntry ? { ...firstValidation, reason: firstReason }
      : (secondEntry ? { ...secondValidation, reason: secondReason }
        : { ...hostValidation, reason: hostFailure }));
  return { ...primary, transport: null, fallbackFrom: claimed.memory ? (hostClaim ? hostFailure : (secondEntry ? secondReason : firstReason)) : null, sessionRoot: null };
}

function diagnostics() {
  return Object.freeze({
    write: lastWriteProbe,
    claim: lastClaimProbe,
    surface: surfaceDiagnostics(),
    host: lastHostProbe,
    sessionKey: SESSION_KEY,
    hostLocalKey: HOST_LOCAL_KEY,
    maxSessionChars: MAX_SESSION_CHARS,
    maxSerializedChars: MAX_SERIALIZED_CHARS,
  });
}
module.exports = { capture, publish, publishWithHostLocal, claim, claimHostLocalOnce, validate, diagnostics };
});'''

CARD_BLOCK = r'''  const OPERATOR_RELEASE_CARD = Object.freeze({
    version: '0.64.10',
    name: 'Host-Local One-Shot Telemetry Handoff',
    scenario: '06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT',
    summary: Object.freeze([
      '브라우저 sessionStorage를 쓸 수 없을 때 Host 로컬 저장소를 telemetry handoff 대체 경로로 사용',
      '저장 내용은 10분 TTL / location 일치 / 16KB 이하의 메타데이터-only capsule으로 제한',
      '같은 location의 capsule은 안전하게 지운 뒤에만 한 번 채택',
      'SESSION 또는 HOST_LOCAL이 실제 WRITTEN일 때만 새로고침 실험 진행',
    ]),
    recent: Object.freeze([
      Object.freeze({ version: '0.64.10', name: 'Host-Local One-Shot Telemetry Handoff', bullets: Object.freeze(['sessionStorage 불가 시 Host 로컬 one-shot fallback', 'matching location은 consume-before-adopt']) }),
      Object.freeze({ version: '0.64.9', name: 'Session Transport Root Resolution', bullets: Object.freeze(['WINDOW / GLOBAL_THIS sessionStorage surface를 분리 진단', '실제 checkpoint/claim root를 표시']) }),
      Object.freeze({ version: '0.64.8', name: 'Output-Complete Telemetry Checkpoint Repair', bullets: Object.freeze(['정상 출력 완료 뒤 telemetry checkpoint 추가', 'checkpoint 결과를 Last Turn Diagnostic에 표시']) }),
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
<div style="font-weight:700;margin:8px 0 5px">이번 버전 실험</div>
<div><code>${escapeHtml(card.scenario)}</code></div>
<ol style="margin:7px 0 10px 18px;padding:0"><li>업데이트 뒤 새로고침 없이 자연 요청 1회 후 진단 확인</li><li><b>SESSION WRITTEN 또는 HOST_LOCAL WRITTEN</b>이면 pre-refresh 진단 전체 복사 후 같은 탭 새로고침</li><li>첫 post-refresh 자연 요청 후 진단 전체 복사</li><li>재생성/손수정 없이 자연 요청 1회 더 하고 두 번째 post-refresh 진단 전체 복사</li></ol>
<div style="font-weight:700;margin:8px 0 5px">중지 조건</div>
<div>HOST_LOCAL UNAVAILABLE / FAILED / OVERSIZE, 공통 serialization 실패 또는 예상 밖 semantic/runtime 이상이면 <b>새로고침하지 말고 현재 진단 전체를 먼저 보존</b></div>
<div style="font-weight:700;margin:10px 0 5px">진단 캡처</div>
<div><b>REQUIRED</b> · pre-refresh / first post-refresh / second post-refresh</div>
<div><b>IMMEDIATE</b> · visible semantic anomaly, unexpected warnings/compatibility, checkpoint/continuity phase contradiction</div>
<div><b>CONTROL</b> · 원본 진단 보존 뒤에만 retry/reroll, 손수정, 자연 follow-up</div>
<div style="font-weight:700;margin:10px 0 5px">최근 업데이트</div>
<ul style="margin:0 0 0 18px;padding:0">${recent}</ul>
<div style="margin-top:10px;color:#9fb3d7">이 카드는 운영 가이드이며 release PASS/FAIL authority가 아닙니다.</div>
</section>`;
  }
'''


def patch(text):
    text = replace_once(text, '//@version 0.64.9', '//@version 0.64.10', 'metadata-version')
    text, count = re.subn(r"const SIMCORE_RUNTIME_VERSION = '0\.64\.9';", "const SIMCORE_RUNTIME_VERSION = '0.64.10';", text)
    if count != 1:
        raise SystemExit(f'06410_PATCH_ANCHOR_INVALID runtime-version count={count}')
    text = replace_once(text, '// v0.64.9 Session Transport Root Resolution:\n', RELEASE_NOTE + '// v0.64.9 Session Transport Root Resolution:\n', 'release-note')
    text = replace_range(
        text,
        'SimCore.define("runtime-telemetry", function (require, module, exports) {',
        'SimCore.define("runtime-session", function (require, module, exports) {',
        NEW_TELEMETRY,
        'runtime-telemetry-module',
    )
    text = replace_once(text, '  function checkpointRuntimeTelemetry(trigger) {\n', '  async function checkpointRuntimeTelemetry(trigger) {\n', 'async-checkpoint-helper')
    text = replace_once(
        text,
        "      runtimeTelemetryRules.publish(globalThis, typeof window !== 'undefined' ? window : null, capsule);\n",
        "      await runtimeTelemetryRules.publishWithHostLocal(globalThis, typeof window !== 'undefined' ? window : null, Risuai, capsule);\n",
        'host-local-checkpoint-writer',
    )
    text = replace_once(
        text,
        "        surface: write?.surface || runtimeTelemetryRules.diagnostics().surface || null,\n        serializedChars: Number(write?.serializedChars || 0),\n        elapsedMs: perfMs(startedAt),",
        "        surface: write?.surface || runtimeTelemetryRules.diagnostics().surface || null,\n        hostLocal: write?.hostLocal || 'UNAVAILABLE',\n        hostElapsedMs: Number(write?.hostElapsedMs || 0),\n        host: runtimeTelemetryRules.diagnostics().host || null,\n        serializedChars: Number(write?.serializedChars || 0),\n        elapsedMs: perfMs(startedAt),",
        'checkpoint-host-attribution',
    )
    text = replace_once(
        text,
        "        surface: runtimeTelemetryRules.diagnostics().surface || null,\n        serializedChars: 0,\n        elapsedMs: 0,",
        "        surface: runtimeTelemetryRules.diagnostics().surface || null,\n        hostLocal: 'FAILED',\n        hostElapsedMs: 0,\n        host: runtimeTelemetryRules.diagnostics().host || null,\n        serializedChars: 0,\n        elapsedMs: 0,",
        'checkpoint-host-failure-attribution',
    )
    text = replace_once(
        text,
        "      if (!telemetryAdoptionAttempted) {\n        telemetryAdoptionAttempted = true;\n        const adoption = runtimeTelemetryRules.validate(pendingTelemetryHandoff, runtimePromptKey, Date.now());",
        "      if (!telemetryAdoptionAttempted) {\n        telemetryAdoptionAttempted = true;\n        const hostLocalClaim = await runtimeTelemetryRules.claimHostLocalOnce(Risuai, runtimePromptKey, Date.now());\n        const adoption = runtimeTelemetryRules.validate(pendingTelemetryHandoff, runtimePromptKey, Date.now(), hostLocalClaim);",
        'first-request-host-local-claim',
    )
    text = replace_once(
        text,
        "      checkpointRuntimeTelemetry('OUTPUT_COMMIT');\n",
        "      await checkpointRuntimeTelemetry('OUTPUT_COMMIT');\n",
        'await-output-checkpoint',
    )
    text = replace_once(
        text,
        "    checkpointRuntimeTelemetry('UNLOAD');\n",
        "    await checkpointRuntimeTelemetry('UNLOAD');\n",
        'await-unload-checkpoint',
    )
    diag_anchor = "      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,\n      `Session surface: ${lastTelemetryCheckpointProbe?.surface ? `WINDOW ${lastTelemetryCheckpointProbe.surface.window || 'UNOBSERVED'} · GLOBAL_THIS ${lastTelemetryCheckpointProbe.surface.globalThis || 'UNOBSERVED'} · relation ${lastTelemetryCheckpointProbe.surface.relation || 'NONE'}` : 'n/a'}`,\n      `Telemetry checkpoint: ${lastTelemetryCheckpointProbe ? `MEMORY ${lastTelemetryCheckpointProbe.memory || 'UNAVAILABLE'} · SESSION ${lastTelemetryCheckpointProbe.session || 'UNAVAILABLE'}${lastTelemetryCheckpointProbe.session === 'WRITTEN' ? ` via ${lastTelemetryCheckpointProbe.sessionRoot || 'NONE'}` : (lastTelemetryCheckpointProbe.sessionRoot && lastTelemetryCheckpointProbe.sessionRoot !== 'NONE' ? ` · root ${lastTelemetryCheckpointProbe.sessionRoot}` : '')}${lastTelemetryCheckpointProbe.fallbackFrom ? ` · fallback ${lastTelemetryCheckpointProbe.fallbackFrom}` : ''}${lastTelemetryCheckpointProbe.attempted && lastTelemetryCheckpointProbe.session === 'FAILED' ? ` · attempted ${lastTelemetryCheckpointProbe.attempted}` : ''} · ${Number(lastTelemetryCheckpointProbe.serializedChars || 0)} chars · ${diagnosticFormatMs(lastTelemetryCheckpointProbe.elapsedMs)} · trigger ${lastTelemetryCheckpointProbe.trigger || 'UNKNOWN'}` : 'n/a'}`,"
    diag_replacement = "      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,\n      `Session surface: ${lastTelemetryCheckpointProbe?.surface ? `WINDOW ${lastTelemetryCheckpointProbe.surface.window || 'UNOBSERVED'} · GLOBAL_THIS ${lastTelemetryCheckpointProbe.surface.globalThis || 'UNOBSERVED'} · relation ${lastTelemetryCheckpointProbe.surface.relation || 'NONE'}` : 'n/a'}`,\n      `Host-local transport: ${lastTelemetryCheckpointProbe?.host ? `API ${lastTelemetryCheckpointProbe.host.api || 'UNOBSERVED'} · store ${lastTelemetryCheckpointProbe.host.store || 'UNOBSERVED'} · clear ${lastTelemetryCheckpointProbe.host.clear || 'UNKNOWN'} · boot ${lastTelemetryCheckpointProbe.host.boot || 'UNOBSERVED'}` : 'n/a'}`,\n      `Telemetry checkpoint: ${lastTelemetryCheckpointProbe ? `MEMORY ${lastTelemetryCheckpointProbe.memory || 'UNAVAILABLE'} · SESSION ${lastTelemetryCheckpointProbe.session || 'UNAVAILABLE'}${lastTelemetryCheckpointProbe.session === 'WRITTEN' ? ` via ${lastTelemetryCheckpointProbe.sessionRoot || 'NONE'}` : (lastTelemetryCheckpointProbe.sessionRoot && lastTelemetryCheckpointProbe.sessionRoot !== 'NONE' ? ` · root ${lastTelemetryCheckpointProbe.sessionRoot}` : '')}${lastTelemetryCheckpointProbe.fallbackFrom ? ` · fallback ${lastTelemetryCheckpointProbe.fallbackFrom}` : ''}${lastTelemetryCheckpointProbe.attempted && lastTelemetryCheckpointProbe.session === 'FAILED' ? ` · attempted ${lastTelemetryCheckpointProbe.attempted}` : ''} · HOST_LOCAL ${lastTelemetryCheckpointProbe.hostLocal || 'UNAVAILABLE'} · ${Number(lastTelemetryCheckpointProbe.serializedChars || 0)} chars${lastTelemetryCheckpointProbe.hostElapsedMs > 0 ? ` · host ${diagnosticFormatMs(lastTelemetryCheckpointProbe.hostElapsedMs)}` : ''} · ${diagnosticFormatMs(lastTelemetryCheckpointProbe.elapsedMs)} total · trigger ${lastTelemetryCheckpointProbe.trigger || 'UNKNOWN'}` : 'n/a'}`,"
    text = replace_once(text, diag_anchor, diag_replacement, 'host-local-diagnostics')
    text = replace_range(text, '  const OPERATOR_RELEASE_CARD = Object.freeze({', '  async function openPanel() {', CARD_BLOCK, 'operator-release-card')

    checks = {
        'version': text.count('//@version 0.64.10'),
        'runtime-version': text.count("const SIMCORE_RUNTIME_VERSION = '0.64.10';"),
        'host-key': text.count("const HOST_LOCAL_KEY = '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__';"),
        'host-api': text.count('getLocalPluginStorage'),
        'async-publisher': text.count('async function publishWithHostLocal('),
        'host-claim': text.count('async function claimHostLocalOnce('),
        'output-checkpoint-call': text.count("await checkpointRuntimeTelemetry('OUTPUT_COMMIT')"),
        'unload-checkpoint-call': text.count("await checkpointRuntimeTelemetry('UNLOAD')"),
        'host-diagnostic': text.count('`Host-local transport: ${lastTelemetryCheckpointProbe?.host ?'),
        'release-card-button': text.count('id="toggle-release-card"'),
        'release-card-section': text.count('id="operator-release-card"'),
        'top-level-register-button': text.count('Risuai.registerButton('),
        'top-level-register-setting': text.count('Risuai.registerSetting('),
    }
    for label in ['version', 'runtime-version', 'host-key', 'async-publisher', 'host-claim', 'output-checkpoint-call', 'unload-checkpoint-call', 'host-diagnostic', 'release-card-button', 'release-card-section']:
        if checks[label] != 1:
            raise SystemExit(f'06410_PATCH_POSTCONDITION_INVALID {label} count={checks[label]}')
    if checks['host-api'] != 1:
        raise SystemExit(f'06410_PATCH_POSTCONDITION_INVALID host-api count={checks["host-api"]}')
    if checks['top-level-register-button'] != 1 or checks['top-level-register-setting'] != 1:
        raise SystemExit(f'06410_PATCH_POSTCONDITION_INVALID ui-registration button={checks["top-level-register-button"]} setting={checks["top-level-register-setting"]}')
    for marker in [
        "const MAX_AGE_MS = 10 * 60 * 1000;",
        "const MAX_SERIALIZED_CHARS = 16384;",
        "const SESSION_KEY = '__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__';",
        "provider cache UNVERIFIED",
        "06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT",
        "host-local",
        "FOREIGN_LOCATION",
        "CONSUME_FAILED",
    ]:
        if marker not in text:
            raise SystemExit(f'06410_PATCH_POSTCONDITION_INVALID marker={marker}')
    for forbidden in ['localStorage', 'IndexedDB', 'XMLHttpRequest', 'setInterval(', 'setTimeout(']:
        module = text[text.index('SimCore.define("runtime-telemetry"'):text.index('SimCore.define("runtime-session"')]
        if forbidden in module:
            raise SystemExit(f'06410_PATCH_POSTCONDITION_INVALID forbidden={forbidden}')
    return text


def main():
    original = FILES[0].read_text(encoding='utf-8')
    mirror = FILES[1].read_text(encoding='utf-8')
    if original != mirror:
        raise SystemExit('06410_PRECONDITION_LATEST_INSTALL_MISMATCH')
    if '//@version 0.64.9' not in original:
        raise SystemExit('06410_PRECONDITION_VERSION_MISMATCH')
    if "function inspectSessionSurface(root, label)" not in original:
        raise SystemExit('06410_PRECONDITION_06409_ROOT_RESOLUTION_MISSING')
    if "checkpointRuntimeTelemetry('OUTPUT_COMMIT')" not in original:
        raise SystemExit('06410_PRECONDITION_OUTPUT_CHECKPOINT_MISSING')
    if "06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT" not in original:
        raise SystemExit('06410_PRECONDITION_06409_CARD_MISSING')
    updated = patch(original)
    for path in FILES:
        path.write_text(updated, encoding='utf-8', newline='\n')
    print('SIMCORE_06410_PATCH_PASS')


if __name__ == '__main__':
    main()
