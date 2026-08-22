from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

SOURCE = '3.0.0-alpha.3.39'
TARGET = '3.0.0-alpha.3.40'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.3.40')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.39 or alpha.3.40')

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

helpers = r'''  function recentRequestValue(row, keys, fallback = null) {
    for (const key of keys) {
      const parts = String(key).split('.');
      let value = row;
      for (const part of parts) value = value?.[part];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function normalizeRecentRequestRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => {
      if (!row || typeof row !== 'object') return null;
      const timestamp = bridgeTimestamp(recentRequestValue(row, ['timestamp','createdAt','created_at','time','date','created'], null));
      const provider = String(recentRequestValue(row, ['provider','providerName','provider_name','usedProvider','used_provider','metadata.used_provider','metadata.usedProvider','source.provider'], 'Unknown') || 'Unknown');
      const model = String(recentRequestValue(row, ['model','modelId','model_id','usedModel','used_model','metadata.used_model','metadata.usedModel','source.model'], 'Unknown') || 'Unknown');
      const costRaw = recentRequestValue(row, ['cost','usage.cost','inferenceCost','inference_cost','totalCost','total_cost','usage.cost_details.total_cost','cost_details.total_cost'], null);
      const tokensRaw = recentRequestValue(row, ['totalTokens','total_tokens','usage.total_tokens'], null);
      const requestNumberRaw = recentRequestValue(row, ['sequence','seq','requestNumber','request_number','number'], null);
      const status = String(recentRequestValue(row, ['status','state'], '') || '').toLowerCase();
      const errorCodeRaw = recentRequestValue(row, ['errorCode','error_code','statusCode','status_code','httpStatus','http_status','error.code'], null);
      const errorTypeRaw = recentRequestValue(row, ['errorType','error_type','error.type'], null);
      const statusCode = num(errorCodeRaw) ? Number(errorCodeRaw) : null;
      const explicitSuccess = typeof row.success === 'boolean' ? row.success : null;
      const failedByStatus = ['error','failed','failure','upstream_error','gateway_error','timeout'].includes(status);
      const hasErrorObject = Boolean(row.error && (typeof row.error === 'string' || typeof row.error === 'object'));
      const success = explicitSuccess !== null ? explicitSuccess : !(failedByStatus || hasErrorObject || (statusCode !== null && statusCode >= 400));
      if (!timestamp && provider === 'Unknown' && model === 'Unknown') return null;
      return {
        timestamp,
        provider,
        model,
        cost:num(costRaw) ? Number(costRaw) : null,
        totalTokens:num(tokensRaw) ? Number(tokensRaw) : null,
        requestNumber:requestNumberRaw !== null && requestNumberRaw !== undefined && requestNumberRaw !== '' ? String(requestNumberRaw) : '',
        success,
        errorCode:success ? '' : String(errorCodeRaw ?? ''),
        errorType:success ? '' : String(errorTypeRaw ?? '')
      };
    }).filter(Boolean).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, 12);
  }

  function scopeUsageDetailsHtml(scopeActivity) {
    if (!scopeActivity) return '';
    const aggregateRows = rows => (Array.isArray(rows) ? rows : []).slice(0, 8).map(row =>
      `<div class="usage-detail-row"><b>${esc(row?.name || 'Unknown')}</b><span>${Number(row?.requests || 0).toLocaleString()}회 · ${money(row?.cost,4)}</span></div>`
    ).join('');
    const providers = aggregateRows(scopeActivity.providers);
    const models = aggregateRows(scopeActivity.models);
    const recentRows = (Array.isArray(scopeActivity.recent) ? scopeActivity.recent : []).map(row => {
      const numberText = row.requestNumber ? `#${esc(row.requestNumber)} · ` : '';
      const resultText = row.success
        ? '성공'
        : ['오류', row.errorCode ? esc(row.errorCode) : '', row.errorType ? esc(row.errorType) : ''].filter(Boolean).join(' · ');
      const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : ''].filter(Boolean).join(' · ');
      return `<div class="request-detail-row"><div><b>${numberText}${esc(row.provider)} · ${esc(row.model)}</b><span>${row.timestamp ? dashboardDateText(row.timestamp) : '시간 미제공'}</span></div><em>${usageText}</em></div>`;
    }).join('');
    const sourceRows = Number(scopeActivity.recentRawCount || 0);
    const emptyRecent = sourceRows > 0
      ? `요청 단위 메타데이터 없음 · source rows ${sourceRows}`
      : 'Bridge가 최근 요청 메타데이터를 아직 제공하지 않음';
    return `<div class="usage-detail-grid"><div class="usage-detail-box"><h3>Provider</h3>${providers || '<p>데이터 없음</p>'}</div><div class="usage-detail-box"><h3>Model</h3>${models || '<p>데이터 없음</p>'}</div></div><div class="usage-detail-box recent-requests"><h3>최근 요청 · 요청 단위</h3>${recentRows || `<p>${emptyRecent}</p>`}</div>`;
  }

'''
one('usage detail helpers', '  function normalizeScopeActivity(raw) {', helpers + '  function normalizeScopeActivity(raw) {')

old_recent = r'''    const providers = rows(raw.providers);
    const models = rows(raw.models);
    const recent = Array.isArray(raw.recent) ? raw.recent : [];
    if (![totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate].some(num) && !providers.length && !models.length && !recent.length) return null;
    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,providers,models,recent,fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};'''
new_recent = r'''    const providers = rows(raw.providers);
    const models = rows(raw.models);
    const rawRecent = Array.isArray(raw.recent) ? raw.recent : [];
    const recent = normalizeRecentRequestRows(rawRecent);
    if (![totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate].some(num) && !providers.length && !models.length && !rawRecent.length) return null;
    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,providers,models,recent,recentRawCount:rawRecent.length,fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};'''
one('recent request normalization', old_recent, new_recent)

css_old = r'''      .scope-tabs{display:flex;gap:6px;margin-top:10px}.scope-tab{flex:1;min-width:0;padding:7px 9px}.scope-tab.active{background:var(--g);border-color:var(--g);color:#15170f}
'''
css_new = r'''      .scope-tabs{display:flex;gap:6px;margin-top:10px}.scope-tab{flex:1;min-width:0;padding:7px 9px}.scope-tab.active{background:var(--g);border-color:var(--g);color:#15170f}
      .usage-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.usage-detail-box{background:var(--p2);border-radius:10px;padding:10px;margin-top:8px}.usage-detail-box h3{font-size:11px;margin:0 0 7px;color:var(--m)}.usage-detail-box p{margin:0}.usage-detail-row{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--l)}.usage-detail-row:first-of-type{border-top:0}.usage-detail-row b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.usage-detail-row span{color:var(--m);font-size:11px;white-space:nowrap}.recent-requests{margin-top:8px}.request-detail-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--l)}.request-detail-row:first-of-type{border-top:0}.request-detail-row>div{min-width:0}.request-detail-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.request-detail-row span{display:block;color:var(--m);font-size:10px;margin-top:2px}.request-detail-row em{font-style:normal;color:var(--m);font-size:11px;text-align:right;white-space:nowrap}
'''
one('usage detail css', css_old, css_new)

media_old = '@media(max-width:680px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}.minis,.today-grid{grid-template-columns:1fr 1fr}}'
media_new = '@media(max-width:680px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}.minis,.today-grid{grid-template-columns:1fr 1fr}.usage-detail-grid{grid-template-columns:1fr}.request-detail-row{align-items:flex-start;flex-direction:column}.request-detail-row em{text-align:left;white-space:normal}}'
one('usage detail mobile css', media_old, media_new)

scope_anchor = r'''          ${scopeExtra}
        </div>` : `<p>Bridge snapshot에 ${esc(scopeNames[scopeKey][0])} 범위 데이터가 아직 없어.</p>`}'''
scope_new = r'''          ${scopeExtra}
        </div>${scopeUsageDetailsHtml(scopeActivity)}` : `<p>Bridge snapshot에 ${esc(scopeNames[scopeKey][0])} 범위 데이터가 아직 없어.</p>`}'''
one('usage detail section', scope_anchor, scope_new)

diag_vars_old = r'''  function diagText() {
    const d = state.data || {}, h = d.health || {};
    const bridgeDiag = bridgeStabilitySnapshot();
    return ['''
diag_vars_new = r'''  function diagText() {
    const d = state.data || {}, h = d.health || {};
    const bridgeDiag = bridgeStabilitySnapshot();
    const diagUsageKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const diagUsage = d.usageScopes?.scopes?.[diagUsageKey] || null;
    return ['''
one('usage detail diag vars', diag_vars_old, diag_vars_new)

diag_line_old = r'''      `Bridge CLI/circuit: active ${bridgeDiag.cliActive ?? '—'} · queued ${bridgeDiag.cliQueued ?? '—'} · open ${bridgeDiag.openCircuits ?? '—'} · recoveries ${bridgeDiag.circuitRecoveries ?? '—'}`,
      `Runtime state:'''
diag_line_new = r'''      `Bridge CLI/circuit: active ${bridgeDiag.cliActive ?? '—'} · queued ${bridgeDiag.cliQueued ?? '—'} · open ${bridgeDiag.openCircuits ?? '—'} · recoveries ${bridgeDiag.circuitRecoveries ?? '—'}`,
      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)}`,
      `Runtime state:'''
one('usage detail diagnostics line', diag_line_old, diag_line_new)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.40 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    'function normalizeRecentRequestRows',
    'function scopeUsageDetailsHtml',
    'recentRawCount:rawRecent.length',
    '최근 요청 · 요청 단위',
    'Usage detail:',
    'request-detail-row',
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
