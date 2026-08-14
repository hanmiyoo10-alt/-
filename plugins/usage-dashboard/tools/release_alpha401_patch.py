from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

SOURCE = '3.0.0-alpha.4.0'
TARGET = '3.0.0-alpha.4.1'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.4.1')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.4.0 or alpha.4.1')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)

one('meta version', f'//@version {SOURCE}', f'//@version {TARGET}')
one('runtime version', f"const VERSION = '{SOURCE}';", f"const VERSION = '{TARGET}';")

helpers = r'''  function normalizeBridgeError(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string' || typeof value === 'number') {
      return {code:'', type:'', message:String(value)};
    }
    if (typeof value !== 'object') return {code:'', type:'', message:String(value)};
    const nested = value.error && typeof value.error === 'object' ? value.error : null;
    const codeRaw = value.code ?? value.errorCode ?? value.error_code ?? value.statusCode ?? value.status_code ?? nested?.code ?? '';
    const typeRaw = value.type ?? value.errorType ?? value.error_type ?? nested?.type ?? '';
    const messageRaw = value.message ?? (typeof value.error === 'string' ? value.error : null) ?? nested?.message ?? '';
    const code = codeRaw === null || codeRaw === undefined ? '' : String(codeRaw);
    const type = typeRaw === null || typeRaw === undefined ? '' : String(typeRaw);
    const message = messageRaw === null || messageRaw === undefined ? '' : String(messageRaw);
    return (code || type || message) ? {code, type, message} : null;
  }

  function normalizeErrorMap(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
      const normalized = normalizeBridgeError(value);
      if (normalized) out[key] = normalized;
    }
    return out;
  }

  function errorSummaryText(value) {
    const normalized = normalizeBridgeError(value);
    if (!normalized) return '';
    return [normalized.code, normalized.type, normalized.message].filter(Boolean).join(' · ') || '오류';
  }

  function countErrorMap(raw) {
    if (!raw || typeof raw !== 'object') return 0;
    return Object.values(raw).filter(value => Boolean(normalizeBridgeError(value))).length;
  }

  function usageCacheText(scope) {
    const hasCount = num(scope?.cacheCount);
    const hasRate = num(scope?.cacheRate);
    if (!hasCount && !hasRate) return '—';
    return [
      hasCount ? `${Number(scope.cacheCount).toLocaleString()}회` : '',
      hasRate ? `${Number(scope.cacheRate).toFixed(1)}%` : ''
    ].filter(Boolean).join(' · ');
  }

  function normalizeBridgeModule(name, row) {
    if (!row || typeof row !== 'object') return null;
    const error = normalizeBridgeError(row.error || {
      code: row.errorCode ?? row.error_code ?? '',
      type: row.errorType ?? row.error_type ?? '',
      message: row.errorMessage ?? row.error_message ?? ''
    });
    const status = String(row.status || row.state || (error ? 'error' : 'ok')).toLowerCase() || 'unknown';
    const fetchedAt = bridgeTimestamp(row.fetchedAt ?? row.updatedAt ?? row.updated_at ?? row.lastUpdatedAt ?? row.completedAt);
    const durationRaw = row.durationMs ?? row.duration_ms ?? row.elapsedMs ?? row.elapsed_ms ?? row.latencyMs ?? row.tookMs;
    return {
      name:String(name || row.name || 'module'),
      status,
      stale:row.stale === true || status === 'stale',
      fetchedAt,
      durationMs:num(durationRaw) ? Math.max(0, Number(durationRaw)) : null,
      errorCode:String(row.errorCode ?? row.error_code ?? error?.code ?? ''),
      errorType:String(row.errorType ?? row.error_type ?? error?.type ?? ''),
      errorMessage:String(row.errorMessage ?? row.error_message ?? error?.message ?? '')
    };
  }

  function normalizeBridgeModules(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const out = {};
    for (const [name, row] of Object.entries(raw)) {
      const normalized = normalizeBridgeModule(name, row);
      if (normalized) out[name] = normalized;
    }
    return Object.keys(out).length ? out : null;
  }

'''
one('P1 bridge helpers', '  function bridgeSemver(value) {', helpers + '  function bridgeSemver(value) {')

one(
    'normalize bridge modules',
    "    const modules = raw.modules && typeof raw.modules === 'object' ? raw.modules : null;",
    "    const modules = normalizeBridgeModules(raw.modules);"
)

old_module_error = r'''    const moduleError = row => {
      const status = String(row?.status || '').toLowerCase();
      return ['error','open','partial'].includes(status) || Boolean(row?.errorCode) || Boolean(row?.error);
    };
    const numeric = value => num(value) ? Number(value) : null;'''
new_module_error = r'''    const moduleError = row => {
      const status = String(row?.status || '').toLowerCase();
      return ['error','open','partial'].includes(status) || Boolean(row?.errorCode) || Boolean(row?.errorType) || Boolean(row?.errorMessage);
    };
    const partialModules = modules ? moduleRows.filter(row => String(row?.status || '').toLowerCase() === 'partial').length : null;
    const slowestModule = moduleRows.filter(row => num(row?.durationMs)).sort((a,b) => Number(b.durationMs) - Number(a.durationMs))[0] || null;
    const numeric = value => num(value) ? Number(value) : null;'''
one('module error standardization', old_module_error, new_module_error)

one(
    'module stability fields',
    "      errorModules: modules ? moduleRows.filter(moduleError).length : null,\n      cacheHitRate: numeric(cache?.hitRate),",
    "      errorModules: modules ? moduleRows.filter(moduleError).length : null,\n      partialModules,\n      moduleDetails:moduleRows,\n      slowestModule,\n      cacheHitRate: numeric(cache?.hitRate),"
)

module_text_helpers = r'''
  function bridgeModuleFreshnessText(details) {
    const rows = (Array.isArray(details) ? details : []).filter(row => row?.fetchedAt);
    if (!rows.length) return '—';
    return rows.slice(0, 8).map(row => `${row.name} ${age(row.fetchedAt)}`).join(' · ');
  }

  function bridgeModuleDurationText(details) {
    const rows = (Array.isArray(details) ? details : []).filter(row => num(row?.durationMs));
    if (!rows.length) return '—';
    return rows.slice(0, 8).map(row => `${row.name} ${Math.round(Number(row.durationMs))}ms`).join(' · ');
  }

'''
one('module detail text helpers', '  function age(ts) {', module_text_helpers + '  function age(ts) {')

one(
    'usage errors normalize',
    "    return {scopes,errors:raw?.errors && typeof raw.errors === 'object' ? raw.errors : {},fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),source:String(raw?.source || 'LLMGateway hybrid scoped usage')};",
    "    return {scopes,errors:normalizeErrorMap(raw?.errors),fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),source:String(raw?.source || 'LLMGateway hybrid scoped usage')};"
)
one(
    'analytics window errors normalize',
    "      errors:raw?.errors && typeof raw.errors === 'object' ? raw.errors : {},\n      fetchedAt:raw?.fetchedAt || windows['24h']?.fetchedAt || Date.now(),",
    "      errors:normalizeErrorMap(raw?.errors),\n      fetchedAt:raw?.fetchedAt || windows['24h']?.fetchedAt || Date.now(),"
)
one(
    'analytics scope errors normalize',
    "      errors:raw?.errors && typeof raw.errors === 'object' ? raw.errors : {},\n      fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),",
    "      errors:normalizeErrorMap(raw?.errors),\n      fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),"
)

one(
    'usage cache card missing vs zero',
    '<div class="mini"><span>캐시</span><b>${Number(scopeActivity.cacheCount || 0).toLocaleString()}회 · ${Number(scopeActivity.cacheRate || 0).toFixed(1)}%</b></div>',
    '<div class="mini"><span>캐시</span><b>${usageCacheText(scopeActivity)}</b></div>'
)
one(
    'analytics cache card missing vs zero',
    '<div class="mini"><span>캐시</span><b>${num(analyticsW24.cacheCount) ? `${Number(analyticsW24.cacheCount).toLocaleString()}회 · ${num(analyticsW24.cacheRate)?Number(analyticsW24.cacheRate).toFixed(1):\'0.0\'}%` : (num(analyticsW24.cacheRate) ? `${Number(analyticsW24.cacheRate).toFixed(1)}%` : \'0회 · 0.0%\')}</b></div>',
    '<div class="mini"><span>캐시</span><b>${usageCacheText(analyticsW24)}</b></div>'
)

one(
    'usage scope error display',
    '${d.usageScopes?.errors?.[scopeKey] ? `<p class="warn">Usage Scope · ${esc(d.usageScopes.errors[scopeKey])}</p>` : \'\'}',
    '${d.usageScopes?.errors?.[scopeKey] ? `<p class="warn">Usage Scope · ${esc(errorSummaryText(d.usageScopes.errors[scopeKey]))}</p>` : \'\'}'
)
one(
    'analytics scope error display',
    '${d.analyticsScopes?.errors?.[analyticsScopeKey] ? `<p class="warn">Analytics · ${esc(d.analyticsScopes.errors[analyticsScopeKey])}</p>` : \'\'}',
    '${d.analyticsScopes?.errors?.[analyticsScopeKey] ? `<p class="warn">Analytics · ${esc(errorSummaryText(d.analyticsScopes.errors[analyticsScopeKey]))}</p>` : \'\'}'
)
one(
    'analytics range partial failure display',
    '${analyticsBundle?.errors && Object.keys(analyticsBundle.errors).length ? `<p class="warn">기간 일부 실패 · ${esc(Object.entries(analyticsBundle.errors).map(([range,message])=>`${range}: ${message}`).join(\' · \'))}</p>` : \'\'}',
    '${analyticsBundle?.errors && Object.keys(analyticsBundle.errors).length ? `<p class="warn">기간 일부 실패 · ${esc(Object.entries(analyticsBundle.errors).map(([range,error])=>`${range}: ${errorSummaryText(error)}`).join(\' · \'))}</p>` : \'\'}'
)

diag_modules_old = "      `Bridge modules: ${bridgeDiag.moduleCount ?? '—'} · stale ${bridgeDiag.staleModules ?? '—'} · errors ${bridgeDiag.errorModules ?? '—'}`,"
diag_modules_new = diag_modules_old + r'''
      `Bridge module freshness: ${bridgeModuleFreshnessText(bridgeDiag.moduleDetails)}`,
      `Bridge module duration: ${bridgeModuleDurationText(bridgeDiag.moduleDetails)}`,
      `Bridge partial: modules ${bridgeDiag.partialModules ?? '—'} · usage ${countErrorMap(d.usageScopes?.errors)} · analytics ${countErrorMap(d.analyticsScopes?.errors)}`,'''
one('module diagnostics lines', diag_modules_old, diag_modules_new)

one(
    'usage cache diagnostics missing vs zero',
    "      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)} · cache ${Number(diagUsage?.cacheCount || 0).toLocaleString()}회 · ${Number(diagUsage?.cacheRate || 0).toFixed(1)}%`,",
    "      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)} · cache ${usageCacheText(diagUsage)}`,"
)

ui_bridge_old = "<p>Bridge Stability · ${bridgeDiag.version?`v${esc(bridgeDiag.version)}`:'—'} · required ≥${esc(REQUIRED_BRIDGE_VERSION)} · compatible ${bridgeDiag.compatible===null?'unknown':bridgeDiag.compatible?'yes':'no'} · modules ${bridgeDiag.moduleCount??'—'} · stale ${bridgeDiag.staleModules??'—'} · errors ${bridgeDiag.errorModules??'—'}</p><p>Bridge Runtime ·"
ui_bridge_new = "<p>Bridge Stability · ${bridgeDiag.version?`v${esc(bridgeDiag.version)}`:'—'} · required ≥${esc(REQUIRED_BRIDGE_VERSION)} · compatible ${bridgeDiag.compatible===null?'unknown':bridgeDiag.compatible?'yes':'no'} · modules ${bridgeDiag.moduleCount??'—'} · stale ${bridgeDiag.staleModules??'—'} · errors ${bridgeDiag.errorModules??'—'} · partial ${bridgeDiag.partialModules??'—'}</p><p>Bridge Modules · freshness ${esc(bridgeModuleFreshnessText(bridgeDiag.moduleDetails))} · duration ${esc(bridgeModuleDurationText(bridgeDiag.moduleDetails))}</p><p>Bridge Runtime ·"
one('settings module diagnostics', ui_bridge_old, ui_bridge_new)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('4.1 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    'function normalizeBridgeModule(name, row)',
    'function normalizeErrorMap(raw)',
    'function usageCacheText(scope)',
    'Bridge module freshness:',
    'Bridge module duration:',
    'Bridge partial:',
    'Bridge Modules · freshness',
    'cache ${usageCacheText(diagUsage)}',
    '<span>캐시</span><b>${usageCacheText(scopeActivity)}</b>',
    'errorSummaryText(d.usageScopes.errors[scopeKey])',
    'Schema: snapshot v',
    'Usage detail:',
    'Resume route: requested',
    'Stall/render coincidence:',
    'Bridge detail:',
    'Performance settings:',
    'Runtime state:',
    'Resume input:',
    'Panel render scheduler:',
    'Render spike:',
    'Scheduler: pending',
    'Resume grace:',
    'UI stall probe:',
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'",
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
    'release-usage-dashboard/plugins/usage-dashboard/latest.js',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
