from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
RUNTIME_SRC = ROOT / 'runtime-src' / 'bridge-engine'
TOOLS = ROOT / 'tools'
SPEC = Path('.github/usage-dashboard/releases/5.83.json')

CORE = SRC / '00-runtime-core.part.js'
REQUEST_NORMALIZE = SRC / '10-request-normalize.part.js'
LEDGER = SRC / '14-request-ledger.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
DASHBOARD = SRC / '50-dashboard-context.part.js'
MARKUP = SRC / '54-dashboard-markup.part.js'
SETTINGS = SRC / '60-settings-runtime.part.js'

ENGINE_CORE = RUNTIME_SRC / '00-core.part.mjs'
ENGINE_CAPTURE = RUNTIME_SRC / '35-request-provenance-capture.part.mjs'
ENGINE_SOURCES = RUNTIME_SRC / '40-sources.part.mjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.82'
TARGET_VERSION = '3.0.0-alpha.5.83'
BASE_ENGINE = '1.6.23'
TARGET_ENGINE = '1.6.24'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Billing Cycle Truth Strip'
TARGET_RELEASE_TITLE = 'Exact Final HTTP Status Fidelity'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.80 — Request Ledger Provenance Ownership Consolidation`.'
BASE_ENGINE_SHA = '848a26f0a4d6bb05c943511ed8205dd76ce01162e76559479aba59e8541dd123'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def replace_once_or_target(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def function_slice(text: str, start_marker: str, end_marker: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f'missing function boundary: {start_marker}')
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'missing function end boundary: {end_marker}')
    return text[start:end]


def load_release_notes():
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    if spec.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.83 release spec product version mismatch')
    if spec.get('engineVersion') != TARGET_ENGINE:
        raise SystemExit('5.83 release spec Engine version mismatch')
    if spec.get('managerVersion') != TARGET_MANAGER:
        raise SystemExit('5.83 release spec Manager version mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.83 release spec contracts changed from 1/1')
    if spec.get('materializer') != 'plugins/usage-dashboard/tools/release_http_status_update_guidance_583.py':
        raise SystemExit('5.83 release spec materializer mismatch')
    title = spec.get('releaseTitle')
    highlights = spec.get('highlights')
    hints = spec.get('diagnosticHints')
    if not isinstance(title, str) or not title.strip():
        raise SystemExit('5.83 releaseTitle must be a non-empty string')
    for key, value in [('highlights', highlights), ('diagnosticHints', hints)]:
        if not isinstance(value, list) or not 1 <= len(value) <= 5:
            raise SystemExit(f'5.83 {key} must contain 1..5 items')
        if any(not isinstance(item, str) or not item.strip() or len(item) > 160 for item in value):
            raise SystemExit(f'5.83 {key} items must be non-empty bounded strings')
    return title.strip(), [x.strip() for x in highlights], [x.strip() for x in hints]


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def release_notes_constant(title, highlights, hints) -> str:
    h = ',\n    '.join(js_string(item) for item in highlights)
    d = ',\n    '.join(js_string(item) for item in hints)
    return (
        "  const RELEASE_NOTES = Object.freeze({\n"
        f"    title: {js_string(title)},\n"
        "    highlights: Object.freeze([\n"
        f"    {h}\n"
        "    ]),\n"
        "    diagnosticHints: Object.freeze([\n"
        f"    {d}\n"
        "    ]),\n"
        "  });\n"
    )


def apply_identity_and_release_notes(title, highlights, hints) -> None:
    replace_once_or_target(CORE, '//@version 3.0.0-alpha.5.82', '//@version 3.0.0-alpha.5.83', '5.83 plugin header version')
    replace_once_or_target(CORE, "  const VERSION = '3.0.0-alpha.5.82';", "  const VERSION = '3.0.0-alpha.5.83';", '5.83 plugin runtime version')
    replace_once_or_target(CORE, "  const REQUIRED_BRIDGE_VERSION = '1.6.23';", "  const REQUIRED_BRIDGE_VERSION = '1.6.24';", '5.83 plugin Engine requirement')
    replace_once_or_target(ENGINE_CORE, "const VERSION = '1.6.23';", "const VERSION = '1.6.24';", '5.83 Engine source version')

    notes = release_notes_constant(title, highlights, hints)
    anchor = "  const VERSION = '3.0.0-alpha.5.83';\n"
    replace_once_or_target(CORE, anchor + "  const UPDATE_URL =", anchor + notes + "  const UPDATE_URL =", '5.83 static release notes')


def apply_capture_http_status() -> None:
    replace_once_or_target(
        ENGINE_CAPTURE,
        '''    source = replaceCaptureSourceOnce(
      source,
      "llmgateway.devpass.bridge.capture.v10",
      "llmgateway.devpass.bridge.capture.v11",
      'capture-marker',
    );
''',
        '''    source = replaceCaptureSourceOnce(
      source,
      "llmgateway.devpass.bridge.capture.v10",
      "llmgateway.devpass.bridge.capture.v12",
      'capture-marker',
    );
''',
        '5.83 capture marker v12',
    )
    old_input = '''      "      const requestProject = logField(row, ['projectId','project_id','project.id','metadata.projectId','metadata.project_id']);\\n      const requestOrganization = logField(row, ['organizationId','organization_id','orgId','org_id','organization.id','metadata.organizationId','metadata.organization_id']);\\n      const requestUsedMode = logField(row, ['usedMode','used_mode']);\\n      const cacheUsage = normalizeProviderCacheUsage(row);\\n      const durationMs = typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration >= 0",
      'ephemeral-provenance-inputs',
'''
    new_input = '''      "      const requestProject = logField(row, ['projectId','project_id','project.id','metadata.projectId','metadata.project_id']);\\n      const requestOrganization = logField(row, ['organizationId','organization_id','orgId','org_id','organization.id','metadata.organizationId','metadata.organization_id']);\\n      const requestUsedMode = logField(row, ['usedMode','used_mode']);\\n      const finalHttpStatus = logField(row, ['errorDetails.statusCode']);\\n      const cacheUsage = normalizeProviderCacheUsage(row);\\n      const durationMs = typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration >= 0",
      'exact-final-http-status-input',
'''
    replace_once_or_target(ENGINE_CAPTURE, old_input, new_input, '5.83 capture exact final HTTP input')

    old_fields = '''      "        durationFidelity: durationMs !== null ? 'explicit' : 'unknown',\\n        requestProjectId: requestProject.value === null ? '' : String(requestProject.value),\\n        requestOrganizationId: requestOrganization.value === null ? '' : String(requestOrganization.value),\\n        requestUsedMode: requestUsedMode.value === null ? '' : String(requestUsedMode.value),\\n        requestedServiceTier: requestedTier.value,",
      'ephemeral-provenance-fields',
'''
    new_fields = '''      "        durationFidelity: durationMs !== null ? 'explicit' : 'unknown',\\n        httpStatusCode: typeof finalHttpStatus.value === 'number' && Number.isInteger(finalHttpStatus.value) && finalHttpStatus.value >= 100 && finalHttpStatus.value <= 599 ? finalHttpStatus.value : null,\\n        httpStatusSource: typeof finalHttpStatus.value === 'number' && Number.isInteger(finalHttpStatus.value) && finalHttpStatus.value >= 100 && finalHttpStatus.value <= 599 ? 'errorDetails.statusCode' : '',\\n        httpStatusFidelity: typeof finalHttpStatus.value === 'number' && Number.isInteger(finalHttpStatus.value) && finalHttpStatus.value >= 100 && finalHttpStatus.value <= 599 ? 'explicit' : 'unknown',\\n        requestProjectId: requestProject.value === null ? '' : String(requestProject.value),\\n        requestOrganizationId: requestOrganization.value === null ? '' : String(requestOrganization.value),\\n        requestUsedMode: requestUsedMode.value === null ? '' : String(requestUsedMode.value),\\n        requestedServiceTier: requestedTier.value,",
      'exact-final-http-status-fields',
'''
    replace_once_or_target(ENGINE_CAPTURE, old_fields, new_fields, '5.83 capture exact final HTTP fields')


def apply_engine_http_status() -> None:
    old = '''    const durationExplicit = row?.durationFidelity === 'explicit'
      && typeof row?.durationMs === 'number'
      && Number.isFinite(row.durationMs)
      && row.durationMs >= 0;
'''
    new = old + '''    const httpStatusExplicit = row?.httpStatusFidelity === 'explicit'
      && row?.httpStatusSource === 'errorDetails.statusCode'
      && typeof row?.httpStatusCode === 'number'
      && Number.isInteger(row.httpStatusCode)
      && row.httpStatusCode >= 100
      && row.httpStatusCode <= 599;
'''
    replace_once_or_target(ENGINE_SOURCES, old, new, '5.83 Engine explicit HTTP predicate')

    old_out = '''      durationMs: durationExplicit ? row.durationMs : null,
      durationSource: durationExplicit ? 'llmgateway-log-duration' : '',
      durationFidelity: durationExplicit ? 'explicit' : 'unknown',
'''
    new_out = old_out + '''      httpStatusCode: httpStatusExplicit ? row.httpStatusCode : null,
      httpStatusSource: httpStatusExplicit ? 'errorDetails.statusCode' : '',
      httpStatusFidelity: httpStatusExplicit ? 'explicit' : 'unknown',
'''
    replace_once_or_target(ENGINE_SOURCES, old_out, new_out, '5.83 Engine public HTTP fields')


def apply_plugin_http_helpers() -> None:
    helpers = r'''  function requestHttpStatusMetadata(row) {
    const raw = recentRequestValue(row, ['httpStatusCode','http_status_code'], null);
    const source = String(recentRequestValue(row, ['httpStatusSource','http_status_source'], '') || '');
    const fidelity = String(recentRequestValue(row, ['httpStatusFidelity','http_status_fidelity'], 'unknown') || 'unknown');
    const explicit = typeof raw === 'number'
      && Number.isInteger(raw)
      && raw >= 100
      && raw <= 599
      && source === 'errorDetails.statusCode'
      && fidelity === 'explicit';
    return {
      httpStatusCode: explicit ? raw : null,
      httpStatusSource: explicit ? 'errorDetails.statusCode' : '',
      httpStatusFidelity: explicit ? 'explicit' : 'unknown'
    };
  }

  function requestHttpStatusText(row) {
    const http = requestHttpStatusMetadata(row);
    return requestOutcomeCategory(row) === 'error' && http.httpStatusFidelity === 'explicit'
      ? `HTTP ${http.httpStatusCode}`
      : '';
  }

  function requestHttpStatusStats(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const errorRows = list.filter(row => requestOutcomeCategory(row) === 'error');
    const exact = errorRows.filter(row => requestHttpStatusMetadata(row).httpStatusFidelity === 'explicit').length;
    return {errorRows:errorRows.length, exact, unknown:errorRows.length - exact, source:'errorDetails.statusCode'};
  }

'''
    replace_once_or_target(
        REQUEST_NORMALIZE,
        '  function requestCacheSignal(row) {',
        helpers + '  function requestCacheSignal(row) {',
        '5.83 Plugin HTTP helpers',
    )


def apply_ledger_http_status() -> None:
    replace_once_or_target(
        LEDGER,
        '''      const cacheMetrics = requestCacheMetrics(row);
      const duration = requestDurationMetadata(row);
''',
        '''      const cacheMetrics = requestCacheMetrics(row);
      const duration = requestDurationMetadata(row);
      const httpStatus = requestHttpStatusMetadata(row);
''',
        '5.83 ledger HTTP normalize input',
    )
    replace_once_or_target(
        LEDGER,
        '''        durationMs:duration.durationMs,
        durationSource:duration.durationSource,
        durationFidelity:duration.durationFidelity,
''',
        '''        durationMs:duration.durationMs,
        durationSource:duration.durationSource,
        durationFidelity:duration.durationFidelity,
        httpStatusCode:httpStatus.httpStatusCode,
        httpStatusSource:httpStatus.httpStatusSource,
        httpStatusFidelity:httpStatus.httpStatusFidelity,
''',
        '5.83 ledger HTTP normalized fields',
    )
    replace_once_or_target(
        LEDGER,
        '''        const incomingDuration = requestDurationMetadata(row);
        const currentDuration = requestDurationMetadata(current || {});
        const duration = incomingDuration.durationFidelity === 'explicit' ? incomingDuration : currentDuration;
''',
        '''        const incomingDuration = requestDurationMetadata(row);
        const currentDuration = requestDurationMetadata(current || {});
        const duration = incomingDuration.durationFidelity === 'explicit' ? incomingDuration : currentDuration;
        const incomingHttpStatus = requestHttpStatusMetadata(row);
        const currentHttpStatus = requestHttpStatusMetadata(current || {});
        const httpStatus = incomingHttpStatus.httpStatusFidelity === 'explicit' ? incomingHttpStatus : currentHttpStatus;
''',
        '5.83 ledger HTTP enrichment merge',
    )
    replace_once_or_target(
        LEDGER,
        '''          durationMs:duration.durationMs,
          durationSource:duration.durationSource,
          durationFidelity:duration.durationFidelity,
''',
        '''          durationMs:duration.durationMs,
          durationSource:duration.durationSource,
          durationFidelity:duration.durationFidelity,
          httpStatusCode:httpStatus.httpStatusCode,
          httpStatusSource:httpStatus.httpStatusSource,
          httpStatusFidelity:httpStatus.httpStatusFidelity,
''',
        '5.83 ledger merged HTTP fields',
    )

    hourly_old = '''        const cacheText = requestCacheDetailText(row) || '캐시 정보 없음';
        const tierText = requestServiceTierText(row);
        const durationText = `Duration ${requestDurationText(row)}`;
        const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, durationText, cacheText].filter(Boolean).join(' · ');
'''
    hourly_new = '''        const cacheText = requestCacheDetailText(row) || '캐시 정보 없음';
        const tierText = requestServiceTierText(row);
        const durationText = `Duration ${requestDurationText(row)}`;
        const httpStatusText = requestHttpStatusText(row);
        const usageText = [resultText, httpStatusText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, durationText, cacheText].filter(Boolean).join(' · ');
'''
    replace_once_or_target(LEDGER, hourly_old, hourly_new, '5.83 hourly HTTP badge')

    recent_old = '''      const cacheText = requestCacheDetailText(row);
      const tierText = requestServiceTierText(row);
      const durationText = `Duration ${requestDurationText(row)}`;
      const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, durationText, cacheText].filter(Boolean).join(' · ');
'''
    recent_new = '''      const cacheText = requestCacheDetailText(row);
      const tierText = requestServiceTierText(row);
      const durationText = `Duration ${requestDurationText(row)}`;
      const httpStatusText = requestHttpStatusText(row);
      const usageText = [resultText, httpStatusText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, durationText, cacheText].filter(Boolean).join(' · ');
'''
    replace_once_or_target(LEDGER, recent_old, recent_new, '5.83 Recent Requests HTTP badge')


def apply_http_diagnostics() -> None:
    replace_once_or_target(
        DIAGNOSTICS,
        '''    const diagDurationFidelity = requestDurationStats(diagLedgerRows);
    const diagTierFidelity = requestServiceTierStats(diagLedgerRows);
    const diagOutcome = requestOutcomeStats(diagLedgerRows);
''',
        '''    const diagDurationFidelity = requestDurationStats(diagLedgerRows);
    const diagTierFidelity = requestServiceTierStats(diagLedgerRows);
    const diagOutcome = requestOutcomeStats(diagLedgerRows);
    const diagHttpStatus = requestHttpStatusStats(diagLedgerRows);
''',
        '5.83 HTTP diagnostic stats',
    )
    old = "      `Request outcome taxonomy: success ${diagOutcome.success} · error ${diagOutcome.error} · cancelled ${diagOutcome.cancelled} · unknown ${diagOutcome.unknown} · rows ${diagOutcome.rows}`,\n"
    new = old + "      `HTTP final status fidelity: error rows ${diagHttpStatus.errorRows} · exact ${diagHttpStatus.exact}/${diagHttpStatus.errorRows} · unknown ${diagHttpStatus.unknown}/${diagHttpStatus.errorRows} · source ${diagHttpStatus.source}`,\n"
    replace_once_or_target(DIAGNOSTICS, old, new, '5.83 HTTP diagnostics line')


def apply_release_guidance_ui() -> None:
    helpers = r'''  function releaseNotesPanelHtml() {
    const highlights = RELEASE_NOTES.highlights.map(item => `<li>${esc(item)}</li>`).join('');
    const hints = RELEASE_NOTES.diagnosticHints.map(item => `<li>${esc(item)}</li>`).join('');
    return `<div id="release-notes-panel" class="usage-detail-box release-notes-panel" hidden>
      <div class="recent-head"><h3>${esc(RELEASE_NOTES.title)}</h3><span>v${esc(VERSION)}</span></div>
      <p><b>이번 업데이트</b></p><ul>${highlights}</ul>
      <p><b>다음 진단 때 확인하면 좋은 것</b></p><ul>${hints}</ul>
      <div class="actions"><button id="copy-release-guide">진단 제출 가이드 복사</button></div>
    </div>`;
  }

  function releaseDiagnosticGuideText() {
    const hints = RELEASE_NOTES.diagnosticHints.map(item => `- ${item}`).join('\n');
    return [
      `Local Usage Dashboard v${VERSION}`,
      `Release: ${RELEASE_NOTES.title}`,
      '',
      '다음 진단 때 확인:',
      hints,
      '',
      '문제/관찰 한 줄: [직접 작성]',
      '재현 행동: [직접 작성]',
      '필요하면 Runtime Diagnostics > 전체 Diagnostics 복사를 함께 첨부'
    ].join('\n');
  }

'''
    replace_once_or_target(DASHBOARD, '  function settingsHtml() {', helpers + '  function settingsHtml() {', '5.83 release guidance helpers')

    old_markup = '''        <div class="bridge-config-static"><div class="settings-section-title"><b>Connection</b><span>Bridge endpoint · token</span></div><label><span>Bridge URL</span><input id="bridge-base" value="${esc(state.bridgeBase)}"></label>
'''
    new_markup = '''        <div class="bridge-config-static"><div class="settings-section-title"><b>Runtime & Update</b><span>현재 설치 버전 · 다음 진단 가이드</span></div>
        <div class="actions"><button id="release-notes-toggle" aria-expanded="false" aria-controls="release-notes-panel">업데이트 내역</button></div>
        ${releaseNotesPanelHtml()}
        <div class="settings-section-title"><b>Connection</b><span>Bridge endpoint · token</span></div><label><span>Bridge URL</span><input id="bridge-base" value="${esc(state.bridgeBase)}"></label>
'''
    replace_once_or_target(MARKUP, old_markup, new_markup, '5.83 Settings update notes surface')

    handlers = r'''    if (q('#release-notes-toggle')) q('#release-notes-toggle').onclick = e => {
      const button = e.currentTarget;
      const panel = q('#release-notes-panel');
      if (!panel) return;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      panel.hidden = expanded;
    };
    if (q('#copy-release-guide')) q('#copy-release-guide').onclick = async e => {
      const button = e.currentTarget;
      let ok = false;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(releaseDiagnosticGuideText());
          ok = true;
        }
      } catch (_) {}
      button.textContent = ok ? '복사됨 ✓' : '복사 실패';
    };
'''
    replace_once_or_target(SETTINGS, "    if (q('#connect')) q('#connect').onclick = async () => {", handlers + "    if (q('#connect')) q('#connect').onclick = async () => {", '5.83 release guidance handlers')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        if text.count(BASE_RELEASE_MEMORY) != 1:
            raise SystemExit(f'5.83 release memory sync mismatch: {text.count(BASE_RELEASE_MEMORY)}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    if VERIFIED_BASELINE not in text:
        raise SystemExit('5.83 must retain the last verified real-device baseline at 5.80')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manager_engine_identity() -> None:
    engine_sha = sha256(ENGINE)
    manager_text = MANAGER.read_text(encoding='utf-8')
    manager_text, version_count = re.subn(
        r"const BUNDLED_ENGINE_VERSION = '[^']+';",
        f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';",
        manager_text,
        count=1,
    )
    manager_text, sha_count = re.subn(
        r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        manager_text,
        count=1,
    )
    if version_count != 1 or sha_count != 1:
        raise SystemExit('5.83 Manager bundled Engine identity markers missing')
    MANAGER.write_text(manager_text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target(title, highlights, hints) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.83 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.83 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.83 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.83 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.83 contracts changed from 1/1')
    if bridge.get('sha256') != sha256(ENGINE):
        raise SystemExit('5.83 Engine hash mismatch')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.83 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP) or sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.83 bootstrap must remain byte-identical')

    core = CORE.read_text(encoding='utf-8')
    capture = ENGINE_CAPTURE.read_text(encoding='utf-8')
    engine_sources = ENGINE_SOURCES.read_text(encoding='utf-8')
    request_normalize = REQUEST_NORMALIZE.read_text(encoding='utf-8')
    ledger = LEDGER.read_text(encoding='utf-8')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    dashboard = DASHBOARD.read_text(encoding='utf-8')
    markup = MARKUP.read_text(encoding='utf-8')
    settings = SETTINGS.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    latest = LATEST.read_text(encoding='utf-8')

    for marker in [f'//@version {TARGET_VERSION}', f"const VERSION = '{TARGET_VERSION}';", f"const REQUIRED_BRIDGE_VERSION = '{TARGET_ENGINE}';", 'const RELEASE_NOTES = Object.freeze({']:
        if marker not in core:
            raise SystemExit(f'5.83 plugin core identity/release notes missing: {marker}')
    for item in [title, *highlights, *hints]:
        if js_string(item) not in core:
            raise SystemExit(f'5.83 release note item missing from core: {item}')

    if f"const VERSION = '{TARGET_ENGINE}';" not in ENGINE_CORE.read_text(encoding='utf-8'):
        raise SystemExit('5.83 Engine source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in manager_text:
        raise SystemExit('5.83 Manager product identity mismatch')
    if f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';" not in manager_text:
        raise SystemExit('5.83 Manager bundled Engine version mismatch')
    if f"const BUNDLED_ENGINE_SHA256 = '{sha256(ENGINE)}';" not in manager_text:
        raise SystemExit('5.83 Manager bundled Engine hash mismatch')

    for marker in [
        'llmgateway.devpass.bridge.capture.v12',
        "logField(row, ['errorDetails.statusCode'])",
        "'exact-final-http-status-input'",
        "'exact-final-http-status-fields'",
    ]:
        if marker not in capture:
            raise SystemExit(f'5.83 exact HTTP capture marker missing: {marker}')

    for marker in [
        'const httpStatusExplicit =',
        "row?.httpStatusSource === 'errorDetails.statusCode'",
        "httpStatusSource: httpStatusExplicit ? 'errorDetails.statusCode' : ''",
        "httpStatusFidelity: httpStatusExplicit ? 'explicit' : 'unknown'",
    ]:
        if marker not in engine_sources:
            raise SystemExit(f'5.83 Engine HTTP marker missing: {marker}')

    for marker in [
        'function requestHttpStatusMetadata(row)',
        "source === 'errorDetails.statusCode'",
        "requestOutcomeCategory(row) === 'error'",
        "source:'errorDetails.statusCode'",
    ]:
        if marker not in request_normalize:
            raise SystemExit(f'5.83 Plugin HTTP helper marker missing: {marker}')

    identity = function_slice(ledger, '  function requestLedgerKey(row) {', '  function collectRecentRequestLedger(data) {')
    if 'httpStatus' in identity:
        raise SystemExit('5.83 HTTP status must not enter Request Ledger identity')
    for marker in [
        'httpStatusCode:httpStatus.httpStatusCode',
        "incomingHttpStatus.httpStatusFidelity === 'explicit' ? incomingHttpStatus : currentHttpStatus",
        'const httpStatusText = requestHttpStatusText(row);',
        '[resultText, httpStatusText,',
    ]:
        if marker not in ledger:
            raise SystemExit(f'5.83 ledger HTTP marker missing: {marker}')
    if ledger.count('const httpStatusText = requestHttpStatusText(row);') < 2:
        raise SystemExit('5.83 HTTP badge must appear in Recent Requests and hourly detail')

    if 'HTTP final status fidelity:' not in diagnostics:
        raise SystemExit('5.83 HTTP diagnostic summary missing')

    for marker in [
        'function releaseNotesPanelHtml()',
        'function releaseDiagnosticGuideText()',
        '이번 업데이트',
        '다음 진단 때 확인하면 좋은 것',
        '진단 제출 가이드 복사',
        '문제/관찰 한 줄: [직접 작성]',
        '재현 행동: [직접 작성]',
    ]:
        if marker not in dashboard:
            raise SystemExit(f'5.83 release guidance marker missing: {marker}')
    for marker in ['<b>Runtime & Update</b>', 'id="release-notes-toggle"', 'aria-controls="release-notes-panel"', '${releaseNotesPanelHtml()}']:
        if marker not in markup:
            raise SystemExit(f'5.83 Settings release-notes marker missing: {marker}')

    handler_start = settings.find("    if (q('#release-notes-toggle'))")
    handler_end = settings.find("    if (q('#connect'))", handler_start)
    if handler_start < 0 or handler_end <= handler_start:
        raise SystemExit('5.83 bounded release-note handler block missing')
    handlers = settings[handler_start:handler_end]
    for forbidden in ['persist(', 'enqueueRefresh(', 'scheduleRefresh(', 'schedulePanelRender(', 'store.setItem(', 'store.removeItem(', 'setTimeout(', 'setInterval(', 'nativeFetch(', 'fetchSnapshot(', 'runCli(', 'Risuai.', 'bridgeBase']:
        if forbidden in handlers:
            raise SystemExit(f'5.83 release-note handlers must not own {forbidden}')

    if f'//@version {TARGET_VERSION}' not in latest or 'HTTP final status fidelity:' not in latest or 'id="release-notes-panel"' not in latest:
        raise SystemExit('5.83 built Plugin primary/companion markers missing')
    if f"const VERSION = '{TARGET_ENGINE}';" not in ENGINE.read_text(encoding='utf-8'):
        raise SystemExit('5.83 built Engine version mismatch')


title, highlights, hints = load_release_notes()
manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.83 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.83 baseline contracts are not 1/1')
if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
    raise SystemExit('5.83 baseline bootstrap diverged')
if current == BASE_VERSION:
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != BASE_ENGINE:
        raise SystemExit('5.83 baseline Engine version is not 1.6.23')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.83 baseline Engine artifact diverged from 5.82')

old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size

apply_identity_and_release_notes(title, highlights, hints)
apply_capture_http_status()
apply_engine_http_status()
apply_plugin_http_helpers()
apply_ledger_http_status()
apply_http_diagnostics()
apply_release_guidance_ui()

if current == BASE_VERSION:
    replace_once_or_target(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.82';", "const PRODUCT_VERSION = '3.0.0-alpha.5.83';", '5.83 Manager Product version')
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
sync_manager_engine_identity()
sync_manifest_hashes()
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target(title, highlights, hints)

new_plugin_bytes = LATEST.stat().st_size
new_engine_bytes = ENGINE.stat().st_size
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} · exact final HTTP status + static update guidance · plugin bytes {old_plugin_bytes}->{new_plugin_bytes} ({new_plugin_bytes-old_plugin_bytes:+d}) · engine bytes {old_engine_bytes}->{new_engine_bytes} ({new_engine_bytes-old_engine_bytes:+d})')
