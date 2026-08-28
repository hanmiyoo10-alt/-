#!/usr/bin/env python3
from pathlib import Path
import re

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.64.11'
TARGET_VERSION = '0.65.0'

RELEASE_NOTE = '''// v0.65.0 M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence:\n// - Converges userscript metadata, SIMCORE_RUNTIME_VERSION and HOST_COMPAT_VERSION on one v0.65.0 release identity so bounded Host-local telemetry capsules are stamped with the installed runtime version\n// - Physically extracts the existing previous-assistant edit reconciliation decision tree from the outer runtime shell + Session into one application-level Edit Reconcile module without changing its frozen decisions\n// - Preserves SAME_FAST / SAME_HOST_FAST, snapshot exact carryover, REPRESENTATION_FAST_RECONCILED, USER_EDIT_CANDIDATE and MANUAL_EDIT_REBUILT behavior; Representation remains provenance/taxonomy authority and Runtime Mirror remains transport-only\n// - Adds permanent build assertions for metadata/runtime/host identity equality plus physical ownership/delegate markers; latest.js and install.js remain byte-identical\n// - Keeps telemetry capsule schema/budgets, Host-local mailbox/TTL/location/consume semantics, Deferred Mirror gates, persistent schema, output semantics, provider-cache policy and all unrelated domain owners frozen\n// - Live acceptance is ordered: Stage A proves v0.65.0 Host-local reload continuity first; only then may Stage B claim M2-3 behavioral equivalence\n//\n'''

CARD = '''  const OPERATOR_RELEASE_CARD = Object.freeze({\n    version: '0.65.0',\n    name: 'M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence',\n    scenario: '06500_IDENTITY_RELOAD_THEN_M2_3_EDIT_RECONCILE_REAL_LONG_CHAT',\n    summary: Object.freeze([\n      'Stage A — Runtime Identity Convergence: Version 0.65.0 + COMPACT_V2 + HOST_LOCAL WRITTEN 확인 뒤 같은 탭 새로고침',\n      'Stage A — 첫 post-refresh 자연 요청에서 ADOPTED via host-local 확인 후 자연 요청 1회 더 해 clean continuation 확인',\n      'Stage B — Stage A PASS 뒤에만 SAME_FAST / REPRESENTATION_FAST_RECONCILED / genuine hand-edit MANUAL_EDIT_REBUILT controls 진행',\n      'Stage A blocker가 보이면 Stage B acceptance를 중지하고 현재 진단을 먼저 보존',\n    ]),\n    recent: Object.freeze([\n      Object.freeze({ version: '0.65.0', name: 'M2-3 + Runtime Identity Convergence', bullets: Object.freeze(['edit reconcile ownership을 한 application service로 기계적 추출', 'metadata/runtime/host version identity를 0.65.0으로 수렴']) }),\n      Object.freeze({ version: '0.64.11', name: 'Bounded Telemetry Capsule Compaction', bullets: Object.freeze(['reload handoff export를 bounded compact shape로 분리', '전체 16KB hard cap 유지']) }),\n      Object.freeze({ version: '0.64.10', name: 'Host-Local One-Shot Telemetry Handoff', bullets: Object.freeze(['sessionStorage 불가 시 Host 로컬 one-shot fallback', 'matching location은 consume-before-adopt']) }),\n    ]),\n  });\n\n  function buildOperatorReleaseCardHtml() {\n    const card = OPERATOR_RELEASE_CARD;\n    const bullets = card.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join('');\n    const recent = card.recent.map((item) => `<li><b>v${escapeHtml(item.version)} · ${escapeHtml(item.name)}</b><br>${item.bullets.map((bullet) => `• ${escapeHtml(bullet)}`).join('<br>')}</li>`).join('');\n    return `<section id="operator-release-card" class="card" style="display:none;margin-bottom:10px;padding:13px">\n<div style="font-weight:800;margin-bottom:6px">📦 업데이트 내역 · v${escapeHtml(card.version)}</div>\n<div style="color:#9fb3d7;margin-bottom:8px">${escapeHtml(card.name)}</div>\n<ul style="margin:0 0 12px 18px;padding:0">${bullets}</ul>\n<div style="font-weight:700;margin:8px 0 5px">Stage A — Reload continuity</div>\n<ol style="margin:7px 0 10px 18px;padding:0"><li>자연 요청 1회 후 <b>Version 0.65.0 · COMPACT_V2 · 16,384 chars 이하 · HOST_LOCAL WRITTEN</b> 확인 및 진단 전체 복사</li><li>같은 탭 새로고침 후 첫 자연 요청에서 <b>ADOPTED · via host-local</b> 확인 및 진단 전체 복사</li><li>자연 요청 1회 더 하고 repeated adoption/reset 없이 fresh bounded checkpoint가 다시 쓰이는지 확인</li></ol>\n<div style="font-weight:700;margin:8px 0 5px">Stage B — M2-3 controls</div>\n<ol start="4" style="margin:7px 0 10px 18px;padding:0"><li>normal exact carryover → SAME_FAST · Edit origin NONE</li><li>자연스럽게 가능한 prior OUTPUT_MISMATCH + exact Fresh carryover → REPRESENTATION_FAST_RECONCILED · snapshot UNCHANGED</li><li>genuine hand edit → USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT</li></ol>\n<div style="font-weight:700;margin:8px 0 5px">중지 조건</div>\n<div>Stage A에서 identity split / COMPACTION_FAILED / HOST_LOCAL failure / adoption contradiction 또는 예상 밖 semantic/runtime 이상이면 <b>Stage B로 진행하지 말고 현재 진단을 먼저 보존</b></div>\n<div style="font-weight:700;margin:10px 0 5px">이번 버전 실험</div><div><code>${escapeHtml(card.scenario)}</code></div>\n<div style="font-weight:700;margin:10px 0 5px">최근 업데이트</div>\n<ul style="margin:0 0 0 18px;padding:0">${recent}</ul>\n<div style="margin-top:10px;color:#9fb3d7">이 카드는 운영 가이드이며 release PASS/FAIL authority가 아닙니다.</div>\n</section>`;\n  }'''


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'06500_PATCH_ANCHOR_INVALID {label} count={count}')
    return text.replace(old, new, 1)


def cut(text, start, end, label):
    s = text.find(start)
    e = text.find(end, s + len(start)) if s >= 0 else -1
    if s < 0 or e < 0:
        raise SystemExit(f'06500_PATCH_ANCHOR_INVALID {label} start={s} end={e}')
    return s, e, text[s:e]


def function_body(source, signature, label):
    if not source.startswith(signature):
        raise SystemExit(f'06500_EXTRACT_INVALID {label} signature')
    first = source.find('{')
    last = source.rfind('}')
    if first < 0 or last <= first:
        raise SystemExit(f'06500_EXTRACT_INVALID {label} braces')
    return source[first + 1:last]


def build_edit_module(session_method, outer_function):
    session_sig = '  async reconcileEditedOutput(outIndex, content, perfDetail = null) {'
    outer_sig = '  async function reconcileManualEdit(cs, chat, perfDetail = null) {'
    session_body = function_body(session_method, session_sig, 'session-method').replace('this.', 'session.')
    outer_body = function_body(outer_function, outer_sig, 'outer-function')
    outer_body = one(
        outer_body,
        '      r = await cs.reconcileEditedOutput(lastAssistant, visibleContent, perfDetail);',
        '      r = await reconcileSession(lastAssistant, visibleContent, perfDetail);',
        'outer-fallback-delegate',
    )
    return '''SimCore.define("edit-reconcile", function (require, module, exports) {\nasync function reconcileSessionEditedOutput(session, outIndex, content, perfDetail = null, deps = {}) {\n  const { kernel, time, recovery, finalizePreparedOutput, sessionNow, sessionElapsed } = deps;\n''' + session_body + '''\n}\n\nasync function reconcileVisiblePreviousAssistant(cs, chat, perfDetail = null, deps = {}) {\n  const { coreRules, textMessageContent, representationRegistry, representationRules, coreLocationKey, SIMCORE_LOG_PREFIX, reconcileSession } = deps;\n''' + outer_body + '''\n}\n\nmodule.exports = { reconcileSessionEditedOutput, reconcileVisiblePreviousAssistant };\n});'''


def patch(text):
    if f'//@version {FROM_VERSION}' not in text:
        raise SystemExit('06500_UNEXPECTED_SOURCE_VERSION')

    text = one(text, f'//@version {FROM_VERSION}', f'//@version {TARGET_VERSION}', 'metadata-version')
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.64.10';", "const SIMCORE_RUNTIME_VERSION = '0.65.0';", 'runtime-version')
    text = one(text, "const HOST_COMPAT_VERSION = '0.64.11';", "const HOST_COMPAT_VERSION = '0.65.0';", 'host-version')
    text = one(
        text,
        '// - Representation: bounded CANONICAL/HOST_RAW/FRESH_CHAT identity + provenance classification only; memory-only, no raw bodies or chat writes\n// - Output Compat:',
        '// - Representation: bounded CANONICAL/HOST_RAW/FRESH_CHAT identity + provenance classification only; memory-only, no raw bodies or chat writes\n// - Edit Reconcile: previous-assistant reconcile decision tree + manual rebuild fallback coordination; application-only, no host reads\n// - Output Compat:',
        'module-inventory',
    )
    text = one(text, '// v0.64.11 Bounded Telemetry Capsule Compaction:', RELEASE_NOTE + '// v0.64.11 Bounded Telemetry Capsule Compaction:', 'release-note')

    sm_start = '  async reconcileEditedOutput(outIndex, content, perfDetail = null) {'
    sm_end = '\n\n  storageDiagnostics()'
    ss, se, session_method = cut(text, sm_start, sm_end, 'session-reconcile')
    of_start = '  async function reconcileManualEdit(cs, chat, perfDetail = null) {'
    of_end = '\n\n  async function prepareCoreRequest'
    _, _, outer_function = cut(text, of_start, of_end, 'outer-reconcile')
    edit_module = build_edit_module(session_method, outer_function)

    # Replace original ownership sites first. Inserting the extracted module first would make
    # its copied function signatures become the first anchors and patch the wrong region.
    delegate = '''  async reconcileEditedOutput(outIndex, content, perfDetail = null) {\n    return editReconcile.reconcileSessionEditedOutput(this, outIndex, content, perfDetail, {\n      kernel, time, recovery, finalizePreparedOutput, sessionNow, sessionElapsed,\n    });\n  }'''
    text = text[:ss] + delegate + text[se:]

    os, oe, _ = cut(text, of_start, of_end, 'outer-reconcile-after-session-delegate')
    outer_delegate = '''  async function reconcileManualEdit(cs, chat, perfDetail = null) {\n    return editReconcileRules.reconcileVisiblePreviousAssistant(cs, chat, perfDetail, {\n      coreRules, textMessageContent, representationRegistry, representationRules,\n      coreLocationKey, SIMCORE_LOG_PREFIX,\n      reconcileSession: (outIndex, content, detail) => cs.reconcileEditedOutput(outIndex, content, detail),\n    });\n  }'''
    text = text[:os] + outer_delegate + text[oe:]

    session_marker = 'SimCore.define("session", function (require, module, exports) {'
    text = one(text, session_marker, edit_module + '\n\n' + session_marker, 'edit-module-insert')
    text = one(
        text,
        "const recovery = require('./recovery');\nconst recurrence = require('./recurrence');",
        "const recovery = require('./recovery');\nconst editReconcile = require('./edit-reconcile');\nconst recurrence = require('./recurrence');",
        'session-require',
    )
    text = one(
        text,
        "  const representationRules = SimCore.require('representation');\n  const runtimeMirrorRules = SimCore.require('runtime-mirror');",
        "  const representationRules = SimCore.require('representation');\n  const editReconcileRules = SimCore.require('edit-reconcile');\n  const runtimeMirrorRules = SimCore.require('runtime-mirror');",
        'outer-edit-require',
    )

    card_start = '  const OPERATOR_RELEASE_CARD = Object.freeze({'
    card_end = '\n\n\n  async function openPanel() {'
    cs, ce, _ = cut(text, card_start, card_end, 'operator-release-card')
    text = text[:cs] + CARD + text[ce:]
    return text


def assert_candidate(text):
    metadata = re.search(r'^//@version\s+([^\s]+)\s*$', text, re.M)
    runtime = re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", text)
    host = re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", text)
    values = [metadata.group(1) if metadata else None, runtime.group(1) if runtime else None, host.group(1) if host else None]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        raise SystemExit(f'06500_RUNTIME_IDENTITY_SPLIT values={values}')
    required = (
        'SimCore.define("edit-reconcile"',
        "const editReconcile = require('./edit-reconcile');",
        "const editReconcileRules = SimCore.require('edit-reconcile');",
        'return editReconcile.reconcileSessionEditedOutput(this, outIndex, content, perfDetail',
        'return editReconcileRules.reconcileVisiblePreviousAssistant(cs, chat, perfDetail',
        "reason: 'representation-fast-reconciled'",
        "editOrigin = 'REPRESENTATION_DRIFT_CORRELATED'",
        "editOrigin = 'USER_EDIT_CANDIDATE'",
        "detail.path = 'manual-edit-rebuilt'",
        "version: '0.65.0'",
        'Stage A — Reload continuity',
        'Stage B — M2-3 controls',
    )
    for needle in required:
        if needle not in text:
            raise SystemExit(f'06500_REQUIRED_MARKER_MISSING {needle}')

    session_slice = text.split('SimCore.define("session"', 1)[1].split('SimCore.define("ops"', 1)[0]
    if session_slice.count('async reconcileEditedOutput(outIndex, content, perfDetail = null)') != 1:
        raise SystemExit('06500_SESSION_DELEGATE_INVALID')
    if "detail.path = 'manual-edit-rebuilt'" in session_slice:
        raise SystemExit('06500_SESSION_STILL_OWNS_REBUILD')

    outer_start = text.rfind('  async function reconcileManualEdit(cs, chat, perfDetail = null) {')
    outer_end = text.find('\n\n  async function prepareCoreRequest', outer_start)
    if outer_start < 0 or outer_end < 0:
        raise SystemExit('06500_OUTER_DELEGATE_MISSING')
    outer_slice = text[outer_start:outer_end]
    if 'representationFastEligible' in outer_slice or "USER_EDIT_CANDIDATE" in outer_slice:
        raise SystemExit('06500_OUTER_STILL_OWNS_EDIT_DECISION')


for target in FILES:
    original = target.read_text(encoding='utf-8')
    updated = patch(original)
    assert_candidate(updated)
    target.write_text(updated, encoding='utf-8')

latest = FILES[0].read_text(encoding='utf-8')
install = FILES[1].read_text(encoding='utf-8')
if latest != install:
    raise SystemExit('06500_LATEST_INSTALL_DIVERGED')

print('SimCore v0.65.0 M2-3 + Runtime Identity Convergence patch: OK')
