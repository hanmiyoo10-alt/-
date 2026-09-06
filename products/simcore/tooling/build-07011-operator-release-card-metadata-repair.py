#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.cwd()
LATEST = ROOT / 'plugins' / 'simcore' / 'latest.js'
INSTALL = ROOT / 'plugins' / 'simcore' / 'install.js'

FROM_VERSION = '0.70.10'
TARGET_VERSION = '0.70.11'
RELEASE_NAME = 'Operator Release Card Metadata Repair'
SCENARIO = '07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT'
VALIDATION = 'PENDING_REAL_LONG_CHAT'

RELEASE_NOTE = """// v0.70.11 Operator Release Card Metadata Repair:
// - Replaces the stale historical operator release-card scenario, summary and live checks with one release-local metadata unit
// - Makes version, name, scenario, validation, summary and checks converge on the v0.70.11 repair release and adds permanent regression coverage against body carryover
// - Preserves request/output hooks, Session/Mirror/Representation/Edit Reconcile, Host-local attribution, persistent schemas, mailbox semantics and all storage/network/timer behavior
// - Keeps the separate visible internal: alias FIX, Host-local performance work, provider-cache work and release-system refactors outside this release
//
"""

CARD = r'''  const OPERATOR_RELEASE_CARD = Object.freeze({
    version: '0.70.11',
    name: 'Operator Release Card Metadata Repair',
    scenario: '07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT',
    validation: 'PENDING_REAL_LONG_CHAT',
    summary: Object.freeze([
      '과거 릴리스에서 이월된 operator release-card scenario/summary/checks를 현재 v0.70.11 release-local metadata로 교체',
      'version/name/scenario/validation/summary/checks가 한 릴리스 family로 함께 움직이도록 영구 회귀 검증 추가',
      'request/output/storage/network/timer/persistent-schema와 기존 Host-local telemetry 동작은 변경하지 않음',
      '별도 visible internal: output-hygiene FIX와 성능/provider-cache 작업은 이번 릴리스에 포함하지 않음',
    ]),
    checks: Object.freeze([
      '업데이트 카드에서 Version 0.70.11 · Operator Release Card Metadata Repair · 현재 scenario/validation을 확인',
      '카드에 v0.69 State Reconcile / Kernel Inversion 검증 지시가 남아 있지 않은지 확인',
      '기존 장기챗에서 자연 ordinary turn 1회를 수행하고 Last Turn Diagnostic의 request/output/binding/mirror/hook 안정성을 확인',
      '새 storage/network/timer/schema 동작이 없고 별도 visible internal: output-hygiene FIX를 이번 릴리스가 해결했다고 주장하지 않는지 확인',
      '이상 징후가 있으면 다음 acceptance로 진행하지 말고 현재 증거를 보존한 뒤 WATCH / DEFER / FIX / BLOCKER로 분류',
    ]),
    recent: Object.freeze([
      Object.freeze({ version: '0.70.11', name: 'Operator Release Card Metadata Repair', bullets: Object.freeze(['release-local operator-card body convergence', 'version/name/scenario/summary/checks drift regression']) }),
      Object.freeze({ version: '0.70.10', name: 'Host-Local Telemetry Set Cost Attribution', bullets: Object.freeze(['Host acquire/set cost decomposition', 'bounded Host set ms/1K diagnostic attribution']) }),
      Object.freeze({ version: '0.70.9', name: 'Inline Planning Marker Hygiene Guard', bullets: Object.freeze(['bounded reserved internal_memo cleanup', 'non-payload Output Compat provenance']) }),
    ]),
  });

  function buildOperatorReleaseCardHtml() {
    const card = OPERATOR_RELEASE_CARD;
    const bullets = card.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const checks = card.checks.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const recent = card.recent.map((item) => `<li><b>v${escapeHtml(item.version)} · ${escapeHtml(item.name)}</b><br>${item.bullets.map((bullet) => `• ${escapeHtml(bullet)}`).join('<br>')}</li>`).join('');
    return `<section id="operator-release-card" class="card" style="display:none;margin-bottom:10px;padding:13px">
<div style="font-weight:800;margin-bottom:6px">📦 업데이트 내역 · v${escapeHtml(card.version)}</div>
<div style="color:#9fb3d7;margin-bottom:8px">${escapeHtml(card.name)}</div>
<ul style="margin:0 0 12px 18px;padding:0">${bullets}</ul>
<div style="font-weight:700;margin:8px 0 5px">실전 확인</div>
<ol style="margin:7px 0 10px 18px;padding:0">${checks}</ol>
<div style="font-weight:700;margin:8px 0 5px">중지 조건</div>
<div>카드 identity/body 불일치, ordinary-turn runtime regression, 예상 밖 storage/network/timer/schema 변화 또는 latest/install 불일치가 보이면 <b>다음 acceptance로 진행하지 말고 현재 진단을 먼저 보존</b></div>
<div style="font-weight:700;margin:10px 0 5px">이번 버전 실험</div><div><code>${escapeHtml(card.scenario)}</code> · <code>${escapeHtml(card.validation)}</code></div>
<div style="font-weight:700;margin:10px 0 5px">최근 업데이트</div>
<ul style="margin:0 0 0 18px;padding:0">${recent}</ul>
<div style="margin-top:10px;color:#9fb3d7">이 카드는 운영 가이드이며 release PASS/FAIL authority가 아닙니다.</div>
</section>`;
  }'''


def fail(code: str, detail: str = ''):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail('07011_BUILD_BLOCK', f'{label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def module_names(text: str):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function', text)


def module_text(text: str, name: str) -> str:
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(token)
    if start < 0:
        fail('07011_BUILD_BLOCK', f'module missing: {name}')
    nxt = text.find('\nSimCore.define("', start + len(token))
    return text[start:nxt if nxt >= 0 else len(text)]


def require_lines(text: str, name: str):
    return re.findall(r"^const [^\n=]+ = require\('[^']+'\);$", module_text(text, name), re.M)


def card_bounds(text: str):
    start_token = '  const OPERATOR_RELEASE_CARD = Object.freeze({'
    end_token = '  async function openPanel() {'
    start = text.find(start_token)
    end = text.find(end_token, start + len(start_token)) if start >= 0 else -1
    if start < 0 or end < 0:
        fail('07011_BUILD_BLOCK', f'operator-card bounds missing: start={start} end={end}')
    if text.find(start_token, start + 1) >= 0:
        fail('07011_BUILD_BLOCK', 'operator-card start is ambiguous')
    return start, end


def card_text(text: str):
    start, end = card_bounds(text)
    return text[start:end]


def marker_count(text: str, marker: str) -> int:
    return text.count(marker)


source = LATEST.read_text(encoding='utf-8')
install_source = INSTALL.read_text(encoding='utf-8')
if source != install_source:
    fail('07011_BUILD_BLOCK', 'predecessor latest/install differ')
if not re.search(r'^//@version\s+0\.70\.10\s*$', source, re.M):
    fail('07011_BUILD_BLOCK', 'predecessor metadata is not 0.70.10')
if "const SIMCORE_RUNTIME_VERSION = '0.70.10';" not in source:
    fail('07011_BUILD_BLOCK', 'predecessor runtime identity missing')
if "const HOST_COMPAT_VERSION = '0.70.10';" not in source:
    fail('07011_BUILD_BLOCK', 'predecessor Host identity missing')
if "version: '0.70.10',\n    name: 'Host-Local Telemetry Set Cost Attribution'," not in source:
    fail('07011_BUILD_BLOCK', 'predecessor release-card identity missing')
if source.count('// v0.70.10 Host-Local Telemetry Set Cost Attribution:') != 1:
    fail('07011_BUILD_BLOCK', 'predecessor release-note identity missing')

predecessor_card = card_text(source)
for historical in [
    '06900_M2_6_STATE_RECONCILE_KERNEL_INVERSION_REAL_LONG_CHAT',
    'Version 0.69.0',
    'State Reconcile',
    'Kernel Inversion',
]:
    if historical not in predecessor_card:
        fail('07011_BUILD_BLOCK', f'expected stale predecessor card evidence missing: {historical}')

before_modules = module_names(source)
before_requires = {name: require_lines(source, name) for name in before_modules}
protected_markers = [
    'getLocalPluginStorage',
    'setItem(',
    'getItem(',
    'removeItem(',
    'pluginStorage.setItem(',
    'pluginStorage.getItem(',
    'pluginStorage.removeItem(',
    'pluginStorage.keys(',
    'setChatToIndex',
    'getChatFromIndex',
    'setTimeout(',
    'setInterval(',
    'fetch(',
    'XMLHttpRequest',
    'history.splice(',
    'messages.splice(',
    'Date.now()',
    'const PROMPT_COMPILER_VERSION = 4;',
    'const COMMUNITY_CLASSIFIER_VERSION = 3;',
    'const STATE_VERSION = 5;',
    'const CORE_STATE_VERSION = 10;',
    '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__',
    '10 * 60 * 1000',
    '16 * 1024',
    "await acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded);",
    "await checkpointRuntimeTelemetry('OUTPUT_COMMIT');",
]
before_counts = {marker: marker_count(source, marker) for marker in protected_markers}

out = source
out = one(out, '//@version 0.70.10', '//@version 0.70.11', 'metadata version')
out = one(out, "const SIMCORE_RUNTIME_VERSION = '0.70.10';", "const SIMCORE_RUNTIME_VERSION = '0.70.11';", 'runtime version')
out = one(out, "const HOST_COMPAT_VERSION = '0.70.10';", "const HOST_COMPAT_VERSION = '0.70.11';", 'Host compatibility version')
out = one(
    out,
    '// v0.70.10 Host-Local Telemetry Set Cost Attribution:\n',
    RELEASE_NOTE + '// v0.70.10 Host-Local Telemetry Set Cost Attribution:\n',
    'release-note source identity',
)
start, end = card_bounds(out)
out = out[:start] + CARD + '\n\n' + out[end:]

if module_names(out) != before_modules:
    fail('07011_BUILD_BLOCK', 'module inventory/order changed')
for name in before_modules:
    if require_lines(out, name) != before_requires[name]:
        fail('07011_BUILD_BLOCK', f'require graph changed: {name}')
for marker, expected in before_counts.items():
    actual = marker_count(out, marker)
    if actual != expected:
        fail('07011_BUILD_BLOCK', f'protected side-effect/schema marker changed {marker}: {expected} -> {actual}')

if not re.search(r'^//@version\s+0\.70\.11\s*$', out, re.M):
    fail('07011_BUILD_BLOCK', 'candidate metadata identity missing')
for marker in [
    "const SIMCORE_RUNTIME_VERSION = '0.70.11';",
    "const HOST_COMPAT_VERSION = '0.70.11';",
    '// v0.70.11 Operator Release Card Metadata Repair:',
]:
    if out.count(marker) != 1:
        fail('07011_BUILD_BLOCK', f'candidate identity marker cardinality invalid: {marker}')

current_card = card_text(out)
required_card = [
    "version: '0.70.11'",
    "name: 'Operator Release Card Metadata Repair'",
    "scenario: '07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT'",
    "validation: 'PENDING_REAL_LONG_CHAT'",
    'summary: Object.freeze([',
    'checks: Object.freeze([',
    'const checks = card.checks.map(',
    '${escapeHtml(card.scenario)}',
    '${escapeHtml(card.validation)}',
]
for marker in required_card:
    if marker not in current_card:
        fail('07011_BUILD_BLOCK', f'current release-card marker missing: {marker}')
for historical in [
    '06900_M2_6_STATE_RECONCILE_KERNEL_INVERSION_REAL_LONG_CHAT',
    'Version 0.69.0',
    'State Reconcile',
    'Kernel Inversion',
]:
    if historical in current_card:
        fail('07011_BUILD_BLOCK', f'historical operator-card guidance survived: {historical}')

if '#1660' in current_card:
    fail('07011_BUILD_BLOCK', 'current card must not claim issue-specific #1660 repair ownership')
if "fetch(" in current_card or 'XMLHttpRequest' in current_card or 'setTimeout(' in current_card or 'setInterval(' in current_card:
    fail('07011_BUILD_BLOCK', 'operator card acquired forbidden side effect surface')

LATEST.write_text(out, encoding='utf-8')
INSTALL.write_text(out, encoding='utf-8')
print('07011_BUILD_PASS')
