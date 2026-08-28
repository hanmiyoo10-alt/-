#!/usr/bin/env python3
from pathlib import Path
import re

VERSION_FROM = '0.64.8'
VERSION_TO = '0.64.9'
RELEASE_NAME = 'Session Transport Root Resolution'
FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'06409_PATCH_ANCHOR_INVALID {label} count={count}')
    return text.replace(old, new, 1)


def replace_module(text, start, end, replacement, label):
    start_count = text.count(start)
    end_count = text.count(end)
    if start_count != 1 or end_count != 1:
        raise SystemExit(f'06409_PATCH_ANCHOR_INVALID {label} start={start_count} end={end_count}')
    a = text.index(start)
    b = text.index(end, a)
    return text[:a] + replacement + '\n\n' + text[b:]


RELEASE_NOTE = '''// v0.64.9 Session Transport Root Resolution:
// - Repairs the confirmed v0.64.8 live-gate pre-refresh failure by resolving the existing telemetry session sidecar across exactly two bounded browser-local roots: WINDOW then GLOBAL_THIS
// - Passively classifies each sessionStorage surface as ROOT_ABSENT / STORAGE_ABSENT / ACCESS_ERROR / METHODS_INCOMPLETE / USABLE, de-duplicates identical storage objects, serializes once, and performs at most two real checkpoint write attempts with bounded fallback attribution
// - Boot claim consumes each distinct usable session candidate at most once, preserves memory-first validation, and can adopt a compatible capsule from either WINDOW or GLOBAL_THIS without replaying consumed duplicates
// - Last Turn Diagnostic now exposes Session surface, memory/session checkpoint disposition, selected root/fallback attribution, and session-adoption root; provider cache remains explicitly UNVERIFIED
// - Adds one bounded operator-facing 업데이트 내역 card inside the existing SimCore diagnostic panel; it is static/pure guidance only and adds no top-level UI registration, storage operation, network request, timer, polling, automatic experiment action, or live-gate mutation
// - Core semantic owners, telemetry capsule schema/key/age/size bounds, output commit semantics, Representation/Edit Reconcile, Recovery, Broadcast/Frame/Time/Evidence/Lineage/Handoff/Recurrence/Summary/Structure/COMMUNITY/Reaction/Prompt semantics and M2-3 ownership remain frozen
//
'''

NEW_TELEMETRY = r'''SimCore.define("runtime-telemetry", function (require, module, exports) {
const KEY = '__SIMCORE_TELEMETRY_HANDOFF_V1__';
const SESSION_KEY = '__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__';
const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_SESSION_CHARS = 16384;
let lastWriteProbe = null;
let lastClaimProbe = null;
let lastSurfaceProbe = null;

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
  const surface = Object.freeze({
    window: windowSurface.status,
    globalThis: globalSurface.status,
    relation,
  });
  lastSurfaceProbe = surface;
  return Object.freeze({ surface, first, second });
}

function surfaceDiagnostics() {
  return lastSurfaceProbe || Object.freeze({ window: 'UNOBSERVED', globalThis: 'UNOBSERVED', relation: 'NONE' });
}

function publish(root, windowLike, capsule) {
  if (!capsule) return false;
  let memory = 'UNAVAILABLE';
  let session = 'UNAVAILABLE';
  let sessionRoot = 'NONE';
  let fallbackFrom = null;
  let attempted = '';
  let serializedChars = 0;
  if (root) {
    try { root[KEY] = capsule; memory = 'WRITTEN'; }
    catch (_) { memory = 'FAILED'; }
  }

  const resolved = resolveSessionCandidates(root, windowLike);
  const first = resolved.first;
  const second = resolved.second;
  if (first) {
    let encoded = null;
    try {
      encoded = JSON.stringify(capsule);
      serializedChars = encoded.length;
    } catch (_) {
      session = 'FAILED';
    }
    if (encoded != null) {
      if (serializedChars > MAX_SESSION_CHARS) {
        session = 'OVERSIZE';
        try { first.storage.removeItem(SESSION_KEY); } catch (_) {}
        if (second) { try { second.storage.removeItem(SESSION_KEY); } catch (_) {} }
      } else {
        attempted = first.label;
        try {
          first.storage.setItem(SESSION_KEY, encoded);
          session = 'WRITTEN';
          sessionRoot = first.label;
        } catch (_) {
          session = 'FAILED';
          fallbackFrom = `${first.label}_FAILED`;
          if (second) {
            attempted = `${first.label},${second.label}`;
            try {
              second.storage.setItem(SESSION_KEY, encoded);
              session = 'WRITTEN';
              sessionRoot = second.label;
            } catch (_) {
              session = 'FAILED';
            }
          }
        }
      }
    }
  }

  lastWriteProbe = Object.freeze({
    memory,
    session,
    sessionRoot,
    fallbackFrom,
    attempted,
    serializedChars,
    maxSessionChars: MAX_SESSION_CHARS,
    surface: resolved.surface,
    retainedBodies: false,
  });
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
    sessionRoots: Object.freeze({
      first: first ? `${first.root}:${firstStatus}` : null,
      second: second ? `${second.root}:${secondStatus}` : null,
    }),
    sessionChars: Number(first?.serializedChars || 0) + Number(second?.serializedChars || 0),
    surface: resolved.surface,
    memoryValidation: 'PENDING',
    sessionValidation: 'PENDING',
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

function validate(claimed, locationKey, now = Date.now()) {
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

  if (memory.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: 'exact', sessionValidation: (firstEntry || secondEntry) ? 'standby' : 'empty', selected: 'memory', selectedRoot: 'NONE' });
    return { ...memory, transport: 'memory', fallbackFrom: null, sessionRoot: null };
  }
  if (firstValidation.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: 'exact', selected: 'session', selectedRoot: firstEntry.root });
    return { ...firstValidation, transport: 'session', fallbackFrom: memory.reason, sessionRoot: firstEntry.root };
  }
  if (secondValidation.accepted) {
    lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: 'exact', selected: 'session', selectedRoot: secondEntry.root });
    return { ...secondValidation, transport: 'session', fallbackFrom: sessionReason(firstEntry, firstValidation), sessionRoot: secondEntry.root };
  }
  const firstReason = sessionReason(firstEntry, firstValidation);
  const secondReason = sessionReason(secondEntry, secondValidation);
  lastClaimProbe = Object.freeze({ ...(lastClaimProbe || {}), memoryValidation: validationClass(memory), sessionValidation: validationClass(secondEntry ? secondValidation : firstValidation), selected: 'NONE', selectedRoot: 'NONE' });
  const primary = claimed.memory ? memory : (firstEntry ? { ...firstValidation, reason: firstReason } : { ...secondValidation, reason: secondReason });
  return { ...primary, transport: null, fallbackFrom: claimed.memory ? (secondEntry ? secondReason : firstReason) : null, sessionRoot: null };
}

function diagnostics() {
  return Object.freeze({ write: lastWriteProbe, claim: lastClaimProbe, surface: surfaceDiagnostics(), sessionKey: SESSION_KEY, maxSessionChars: MAX_SESSION_CHARS });
}
module.exports = { capture, publish, claim, validate, diagnostics };
});'''

CARD_BLOCK = r'''  const OPERATOR_RELEASE_CARD = Object.freeze({
    version: '0.64.9',
    name: 'Session Transport Root Resolution',
    scenario: '06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT',
    summary: Object.freeze([
      'sessionStorage를 WINDOW / GLOBAL_THIS 두 경로에서 구분해서 확인',
      '실제 체크포인트는 사용 가능한 경로에 쓰고 필요할 때 한 번만 대체 경로 시도',
      '진단에 Session surface / 실제 저장 root / memory 상태를 함께 표시',
      '세션 저장이 확인된 경우에만 새로고침 실험 진행',
    ]),
    recent: Object.freeze([
      Object.freeze({ version: '0.64.9', name: 'Session Transport Root Resolution', bullets: Object.freeze(['두 sessionStorage root를 bounded하게 구분', '실제 checkpoint/claim root를 진단에 표시']) }),
      Object.freeze({ version: '0.64.8', name: 'Output-Complete Telemetry Checkpoint Repair', bullets: Object.freeze(['정상 출력 완료 뒤 telemetry checkpoint 추가', 'checkpoint 결과를 Last Turn Diagnostic에 표시']) }),
      Object.freeze({ version: '0.64.7', name: 'Cross-Reload Cache Observer Continuity', bullets: Object.freeze(['reload 경계를 위한 memory + session telemetry handoff 도입', 'provider cache는 계속 UNVERIFIED']) }),
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
<ol style="margin:7px 0 10px 18px;padding:0"><li>업데이트 뒤 새로고침 없이 자연 요청 1회 후 진단 확인</li><li><b>SESSION WRITTEN via WINDOW 또는 GLOBAL_THIS</b>면 pre-refresh 진단 전체 복사 후 같은 탭 새로고침</li><li>첫 post-refresh 자연 요청 후 진단 전체 복사</li><li>재생성/손수정 없이 자연 요청 1회 더 하고 두 번째 post-refresh 진단 전체 복사</li></ol>
<div style="font-weight:700;margin:8px 0 5px">중지 조건</div>
<div>SESSION UNAVAILABLE / FAILED / OVERSIZE 또는 예상 밖 semantic/runtime 이상이면 <b>새로고침하지 말고 현재 진단 전체를 먼저 보존</b></div>
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


def patch(text: str) -> str:
    text = replace_once(text, '//@version 0.64.8', '//@version 0.64.9', 'metadata-version')
    text, count = re.subn(r"const SIMCORE_RUNTIME_VERSION = '0\.64\.8';", "const SIMCORE_RUNTIME_VERSION = '0.64.9';", text)
    if count != 1:
        raise SystemExit(f'06409_PATCH_ANCHOR_INVALID runtime-version count={count}')
    text = replace_once(text, '// v0.64.8 Output-Complete Telemetry Checkpoint Repair:\n', RELEASE_NOTE + '// v0.64.8 Output-Complete Telemetry Checkpoint Repair:\n', 'release-note')
    text = replace_module(
        text,
        'SimCore.define("runtime-telemetry", function (require, module, exports) {',
        'SimCore.define("runtime-session", function (require, module, exports) {',
        NEW_TELEMETRY,
        'runtime-telemetry-module',
    )
    text = replace_once(
        text,
        "          transport: adoption.transport || null, fallbackFrom: adoption.fallbackFrom || null,\n          claim: runtimeTelemetryRules.diagnostics().claim,",
        "          transport: adoption.transport || null, fallbackFrom: adoption.fallbackFrom || null, sessionRoot: adoption.sessionRoot || null,\n          claim: runtimeTelemetryRules.diagnostics().claim,",
        'continuity-probe-root',
    )
    text = replace_once(
        text,
        "  return `ADOPTED · via ${probe.transport || 'memory'} · from ${probe.sourceVersion || '?'} · age ${cadence(probe.ageMs)} · topology ${probe.topology ? 'RESTORED' : 'FRESH'} · runtime-prefix ${probe.runtimePrefix ? 'RESTORED' : 'FRESH'} · trajectory ${probe.trajectory ? 'RESTORED' : 'FRESH'}`;",
        "  return `ADOPTED · via ${probe.transport || 'memory'}${probe.transport === 'session' && probe.sessionRoot ? ` · root ${probe.sessionRoot}` : ''} · from ${probe.sourceVersion || '?'} · age ${cadence(probe.ageMs)} · topology ${probe.topology ? 'RESTORED' : 'FRESH'} · runtime-prefix ${probe.runtimePrefix ? 'RESTORED' : 'FRESH'} · trajectory ${probe.trajectory ? 'RESTORED' : 'FRESH'}`;",
        'continuity-label-root',
    )
    text = replace_once(
        text,
        "        memory: write?.memory || 'UNAVAILABLE',\n        session: write?.session || 'UNAVAILABLE',\n        serializedChars: Number(write?.serializedChars || 0),",
        "        memory: write?.memory || 'UNAVAILABLE',\n        session: write?.session || 'UNAVAILABLE',\n        sessionRoot: write?.sessionRoot || 'NONE',\n        fallbackFrom: write?.fallbackFrom || null,\n        attempted: write?.attempted || '',\n        surface: write?.surface || runtimeTelemetryRules.diagnostics().surface || null,\n        serializedChars: Number(write?.serializedChars || 0),",
        'checkpoint-probe-attribution',
    )
    text = replace_once(
        text,
        "        memory: 'FAILED',\n        session: 'FAILED',\n        serializedChars: 0,",
        "        memory: 'FAILED',\n        session: 'FAILED',\n        sessionRoot: 'NONE',\n        fallbackFrom: null,\n        attempted: '',\n        surface: runtimeTelemetryRules.diagnostics().surface || null,\n        serializedChars: 0,",
        'checkpoint-failure-attribution',
    )
    diag_anchor = "      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,\n      `Telemetry checkpoint: ${lastTelemetryCheckpointProbe ? `SESSION · ${lastTelemetryCheckpointProbe.session || 'UNAVAILABLE'} · ${Number(lastTelemetryCheckpointProbe.serializedChars || 0)} chars · ${diagnosticFormatMs(lastTelemetryCheckpointProbe.elapsedMs)} · trigger ${lastTelemetryCheckpointProbe.trigger || 'UNKNOWN'}` : 'n/a'}`,"
    diag_replacement = "      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,\n      `Session surface: ${lastTelemetryCheckpointProbe?.surface ? `WINDOW ${lastTelemetryCheckpointProbe.surface.window || 'UNOBSERVED'} · GLOBAL_THIS ${lastTelemetryCheckpointProbe.surface.globalThis || 'UNOBSERVED'} · relation ${lastTelemetryCheckpointProbe.surface.relation || 'NONE'}` : 'n/a'}`,\n      `Telemetry checkpoint: ${lastTelemetryCheckpointProbe ? `MEMORY ${lastTelemetryCheckpointProbe.memory || 'UNAVAILABLE'} · SESSION ${lastTelemetryCheckpointProbe.session || 'UNAVAILABLE'}${lastTelemetryCheckpointProbe.session === 'WRITTEN' ? ` via ${lastTelemetryCheckpointProbe.sessionRoot || 'NONE'}` : (lastTelemetryCheckpointProbe.sessionRoot && lastTelemetryCheckpointProbe.sessionRoot !== 'NONE' ? ` · root ${lastTelemetryCheckpointProbe.sessionRoot}` : '')}${lastTelemetryCheckpointProbe.fallbackFrom ? ` · fallback ${lastTelemetryCheckpointProbe.fallbackFrom}` : ''}${lastTelemetryCheckpointProbe.attempted && lastTelemetryCheckpointProbe.session === 'FAILED' ? ` · attempted ${lastTelemetryCheckpointProbe.attempted}` : ''} · ${Number(lastTelemetryCheckpointProbe.serializedChars || 0)} chars · ${diagnosticFormatMs(lastTelemetryCheckpointProbe.elapsedMs)} · trigger ${lastTelemetryCheckpointProbe.trigger || 'UNKNOWN'}` : 'n/a'}`,"
    text = replace_once(text, diag_anchor, diag_replacement, 'diagnostic-root-attribution')
    text = replace_once(text, '  async function openPanel() {\n', CARD_BLOCK + '  async function openPanel() {\n', 'release-card-formatter')
    text = replace_once(
        text,
        '<div class="actions"><button id="copy-turn-diag">최근 2턴 진단 복사</button><button id="close">닫기</button></div>\n</div>\n<div class="health">',
        '<div class="actions"><button id="copy-turn-diag">최근 2턴 진단 복사</button><button id="toggle-release-card">업데이트 내역</button><button id="close">닫기</button></div>\n</div>\n${buildOperatorReleaseCardHtml()}\n<div class="health">',
        'release-card-panel-placement',
    )
    text = replace_once(
        text,
        "      const copyTurnDiagButton = document.getElementById('copy-turn-diag');\n",
        "      const releaseCardButton = document.getElementById('toggle-release-card');\n      const releaseCardSection = document.getElementById('operator-release-card');\n      if (releaseCardButton && releaseCardSection) releaseCardButton.onclick = () => {\n        releaseCardSection.style.display = releaseCardSection.style.display === 'none' ? 'block' : 'none';\n      };\n      const copyTurnDiagButton = document.getElementById('copy-turn-diag');\n",
        'release-card-toggle-handler',
    )

    checks = {
        'version': text.count('//@version 0.64.9'),
        'runtime-version': text.count("const SIMCORE_RUNTIME_VERSION = '0.64.9';"),
        'surface-inspector': text.count('function inspectSessionSurface(root, label)'),
        'candidate-resolver': text.count('function resolveSessionCandidates(root, windowLike)'),
        'output-checkpoint-call': text.count("checkpointRuntimeTelemetry('OUTPUT_COMMIT')"),
        'unload-checkpoint-call': text.count("checkpointRuntimeTelemetry('UNLOAD')"),
        'session-surface-diagnostic': text.count('`Session surface: ${lastTelemetryCheckpointProbe?.surface ?'),
        'release-card-button': text.count('id="toggle-release-card"'),
        'release-card-section': text.count('id="operator-release-card"'),
        'top-level-register-button': text.count('Risuai.registerButton('),
        'top-level-register-setting': text.count('Risuai.registerSetting('),
    }
    for label in ['version','runtime-version','surface-inspector','candidate-resolver','output-checkpoint-call','unload-checkpoint-call','session-surface-diagnostic','release-card-button','release-card-section']:
        if checks[label] != 1:
            raise SystemExit(f'06409_PATCH_POSTCONDITION_INVALID {label} count={checks[label]}')
    if checks['top-level-register-button'] != 1 or checks['top-level-register-setting'] != 1:
        raise SystemExit(f'06409_PATCH_POSTCONDITION_INVALID ui-registration button={checks["top-level-register-button"]} setting={checks["top-level-register-setting"]}')
    for marker in [
        "const MAX_AGE_MS = 10 * 60 * 1000;",
        "const MAX_SESSION_CHARS = 16384;",
        "const SESSION_KEY = '__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__';",
        "provider cache UNVERIFIED",
        "06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT",
    ]:
        if marker not in text:
            raise SystemExit(f'06409_PATCH_POSTCONDITION_INVALID marker={marker}')
    return text


def main():
    original = FILES[0].read_text(encoding='utf-8')
    mirror = FILES[1].read_text(encoding='utf-8')
    if original != mirror:
        raise SystemExit('06409_PRECONDITION_LATEST_INSTALL_MISMATCH')
    if '//@version 0.64.8' not in original:
        raise SystemExit('06409_PRECONDITION_VERSION_MISMATCH')
    if "function checkpointRuntimeTelemetry(trigger)" not in original:
        raise SystemExit('06409_PRECONDITION_06408_CHECKPOINT_MISSING')
    if "function sessionStorageOf(windowLike)" not in original:
        raise SystemExit('06409_PRECONDITION_06407_SESSION_OWNER_MISSING')
    updated = patch(original)
    for path in FILES:
        path.write_text(updated, encoding='utf-8', newline='\n')
    print('SIMCORE_06409_PATCH_PASS')


if __name__ == '__main__':
    main()
