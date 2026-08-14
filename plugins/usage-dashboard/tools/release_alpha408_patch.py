from pathlib import Path

ROOT = Path('plugins/usage-dashboard/src')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


# 00 runtime/core: version + counters for click-only hourly detail rendering.
p = ROOT / '00-runtime-core.part.js'
s = p.read_text()
s = replace_once(s, '//@version 3.0.0-alpha.4.7', '//@version 3.0.0-alpha.4.8', 'metadata version')
s = replace_once(s, "const VERSION = '3.0.0-alpha.4.7';", "const VERSION = '3.0.0-alpha.4.8';", 'runtime version')
s = replace_once(
    s,
    "panelSectionWrites:0,panelSectionSkips:0,lastPanelRenderMode:'full'",
    "panelSectionWrites:0,panelSectionSkips:0,hourlyDetailWrites:0,hourlyDetailSkips:0,hourlyDetailFallbacks:0,lastPanelRenderMode:'full'",
    'hourly render counters',
)
p.write_text(s)


# 10 usage/data: refine selected-hour detail with Provider/Model aggregates,
# explicit cache coverage, and local observation coverage.
p = ROOT / '10-usage-data.part.js'
s = p.read_text()
start = s.index('  function hourlyRequestDrilldownHtml(scopeKey) {')
end = s.index('  function scopeUsageDetailsHtml(scopeActivity) {', start)
replacement = r'''  function requestLedgerCoverageText() {
    if (!num(state.requestLedgerStartedAt)) return '관측 시작 —';
    const started = Number(state.requestLedgerStartedAt);
    const elapsed = Math.max(0, Math.min(24 * 60 * 60 * 1000, Date.now() - started));
    const minutes = Math.floor(elapsed / 60000);
    const coverage = elapsed >= 24 * 60 * 60 * 1000
      ? '24h 확보'
      : minutes < 1
        ? '1분 미만 확보'
        : minutes < 60
          ? `${minutes}분 확보`
          : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 확보`;
    const startedText = new Date(started).toLocaleString('ko-KR', {
      timeZone:KST_TIME_ZONE,
      month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false
    });
    return `로컬 관측 시작 ${startedText} · ${coverage} / 24h`;
  }

  function aggregateSelectedHour(rows, key) {
    const groups = new Map();
    for (const row of (Array.isArray(rows) ? rows : [])) {
      const name = String(row?.[key] || 'Unknown');
      if (!groups.has(name)) groups.set(name, {name, requests:0, cost:0, costKnown:0, tokens:0, tokenKnown:0, cacheKnown:0, cacheHits:0, errors:0});
      const item = groups.get(name);
      item.requests += 1;
      if (num(row?.cost)) { item.cost += Number(row.cost); item.costKnown += 1; }
      if (num(row?.totalTokens)) { item.tokens += Number(row.totalTokens); item.tokenKnown += 1; }
      if (typeof row?.cacheHit === 'boolean') { item.cacheKnown += 1; if (row.cacheHit) item.cacheHits += 1; }
      if (row?.success === false) item.errors += 1;
    }
    return Array.from(groups.values()).sort((a,b) => b.cost - a.cost || b.requests - a.requests || a.name.localeCompare(b.name));
  }

  function selectedHourAggregateHtml(title, rows) {
    const html = (Array.isArray(rows) ? rows : []).map(row => {
      const cacheText = row.cacheKnown
        ? `캐시 ${(row.cacheHits / row.cacheKnown * 100).toFixed(1)}% · 정보 ${row.cacheKnown}/${row.requests}`
        : `캐시 정보 0/${row.requests}`;
      const meta = [
        row.tokenKnown ? `${row.tokens.toLocaleString()} tok` : '',
        cacheText,
        row.errors ? `오류 ${row.errors}` : ''
      ].filter(Boolean).join(' · ');
      return `<div class="hour-aggregate-row"><div><b>${esc(row.name)}</b><small>${esc(meta)}</small></div><span>${row.requests}회 · ${row.costKnown ? money(row.cost,4) : '비용 —'}</span></div>`;
    }).join('');
    return `<div class="hour-aggregate-box"><h4>${esc(title)}</h4>${html || '<p>데이터 없음</p>'}</div>`;
  }

  function hourlyRequestDrilldownHtml(scopeKey) {
    const rows = requestLedgerRowsForScope(scopeKey);
    const coverageText = requestLedgerCoverageText();
    if (!rows.length) {
      return `<div class="usage-detail-box hourly-ledger"><div class="recent-head"><h3>시간별 요청 · 24h 로컬 관측</h3><span>0건</span></div><p>${esc(coverageText)} · 아직 누적된 요청 메타데이터가 없어.</p></div>`;
    }
    const groups = new Map();
    for (const row of rows) {
      const key = requestHourKey(row.timestamp);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const selectedKey = groups.has(String(state.selectedHourKey || '')) ? String(state.selectedHourKey) : '';
    const hourRows = Array.from(groups.entries()).sort((a,b) => b[0].localeCompare(a[0])).map(([key, hour]) => {
      const costRows = hour.filter(row => num(row.cost));
      const totalCost = costRows.reduce((sum,row) => sum + Number(row.cost), 0);
      const cacheRows = hour.filter(row => typeof row.cacheHit === 'boolean');
      const cacheHits = cacheRows.filter(row => row.cacheHit).length;
      const cacheRate = cacheRows.length ? cacheHits / cacheRows.length * 100 : null;
      const errors = hour.filter(row => row.success === false).length;
      const cacheText = cacheRate === null
        ? `캐시 정보 0/${hour.length}`
        : `캐시 ${cacheRate.toFixed(1)}% · 정보 ${cacheRows.length}/${hour.length}`;
      const errorText = errors ? ` · 오류 ${errors}` : '';
      return `<button class="hour-row ${selectedKey===key?'active':''}" data-usage-hour="${esc(key)}"><span><b>${esc(requestHourLabel(key))}</b><small>${hour.length}회 · ${costRows.length ? money(totalCost,4) : '비용 —'}</small></span><em>${cacheText}${errorText}</em></button>`;
    }).join('');

    let selectedHtml = '';
    if (selectedKey) {
      const selected = groups.get(selectedKey) || [];
      const costRows = selected.filter(row => num(row.cost));
      const totalCost = costRows.reduce((sum,row) => sum + Number(row.cost), 0);
      const tokenRows = selected.filter(row => num(row.totalTokens));
      const totalTokens = tokenRows.reduce((sum,row) => sum + Number(row.totalTokens), 0);
      const cacheRows = selected.filter(row => typeof row.cacheHit === 'boolean');
      const cacheHits = cacheRows.filter(row => row.cacheHit).length;
      const cacheRate = cacheRows.length ? cacheHits / cacheRows.length * 100 : null;
      const errors = selected.filter(row => row.success === false).length;
      const cacheSummary = cacheRate === null
        ? `캐시 정보 0/${selected.length} · 비율 —`
        : `캐시 ${cacheRate.toFixed(1)}% · HIT ${cacheHits}/${cacheRows.length} · 정보 ${cacheRows.length}/${selected.length}`;
      const summary = [
        `${selected.length}회`,
        costRows.length ? money(totalCost,4) : '비용 —',
        tokenRows.length ? `${totalTokens.toLocaleString()} tok` : '토큰 —',
        cacheSummary,
        errors ? `오류 ${errors}` : '오류 0'
      ].join(' · ');
      const providerSummary = aggregateSelectedHour(selected, 'provider');
      const modelSummary = aggregateSelectedHour(selected, 'model');
      const aggregates = `<div class="hour-aggregate-grid">${selectedHourAggregateHtml('Provider 합계', providerSummary)}${selectedHourAggregateHtml('Model 합계', modelSummary)}</div>`;
      const visible = selected.slice(0, 300);
      const detailRows = visible.map(row => {
        const numberText = row.requestNumber ? `#${esc(row.requestNumber)} · ` : '';
        const resultText = row.success === false
          ? ['오류', row.errorCode ? esc(row.errorCode) : '', row.errorType ? esc(row.errorType) : ''].filter(Boolean).join(' · ')
          : '성공';
        const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '캐시 정보 없음';
        const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', cacheText].filter(Boolean).join(' · ');
        return `<div class="request-detail-row hour-request-row"><div class="request-main"><b>${numberText}${esc(row.provider)}</b><span class="request-model">${esc(row.model)}</span><span>${esc(requestExactTime(row.timestamp))}</span></div><em class="${row.success === false ? 'error-text' : 'ok-text'}">${usageText}</em></div>`;
      }).join('');
      const truncated = selected.length > visible.length ? `<p>성능 보호로 최신 ${visible.length}/${selected.length}건 표시</p>` : '';
      selectedHtml = `<div class="hour-detail"><div class="recent-head"><h3>${esc(requestHourLabel(selectedKey))} 요청별 상세</h3><span>${esc(summary)}</span></div>${aggregates}<div class="hour-request-list">${detailRows}</div>${truncated}</div>`;
    }

    return `<div class="usage-detail-box hourly-ledger"><div class="recent-head"><h3>시간별 요청 · 24h 로컬 관측</h3><span>${rows.length}건 · ${groups.size}시간</span></div><p>${esc(coverageText)} · recent 메타데이터 중복 제거 누적 · 프롬프트/응답 미저장</p><div class="hour-list">${hourRows}</div>${selectedHtml}</div>`;
  }

'''
s = s[:start] + replacement + s[end:]
p.write_text(s)


# 40 diagnostics: expose refinement + click-only partial render counters.
p = ROOT / '40-diagnostics.part.js'
s = p.read_text()
s = replace_once(
    s,
    "      `Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS`,",
    "      `Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS`,\n      `Hourly detail: provider/model summary · cache coverage · click-only partial render · writes ${Number(performanceRuntime.hourlyDetailWrites || 0)} · skips ${Number(performanceRuntime.hourlyDetailSkips || 0)} · fallback ${Number(performanceRuntime.hourlyDetailFallbacks || 0)}`,",
    'hourly detail diagnostic',
)
p.write_text(s)


# 50 settings UI: compact selected-hour aggregate cards.
p = ROOT / '50-settings-ui.part.js'
s = p.read_text()
marker = '.hour-request-row:last-child{padding-bottom:0}'
addition = '.hour-request-row:last-child{padding-bottom:0}.hour-aggregate-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}.hour-aggregate-box{background:#181a1f;border:1px solid var(--l);border-radius:8px;padding:8px}.hour-aggregate-box h4{margin:0 0 4px;color:var(--m);font-size:10px}.hour-aggregate-row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:5px 0;border-top:1px solid var(--l)}.hour-aggregate-row:first-of-type{border-top:0}.hour-aggregate-row>div{min-width:0;flex:1}.hour-aggregate-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.hour-aggregate-row small{display:block;color:var(--m);font-size:8.5px;white-space:normal}.hour-aggregate-row>span{color:var(--m);font-size:9px;white-space:nowrap}.hour-request-list{margin-top:4px}'
s = replace_once(s, marker, addition, 'hour aggregate CSS')
media_marker = '.stat-chip{padding:2px 5px;font-size:8.5px!important}}'
media_addition = '.stat-chip{padding:2px 5px;font-size:8.5px!important}.hour-aggregate-grid{grid-template-columns:1fr}.hour-row em{white-space:normal;text-align:right;max-width:48%}.hour-detail>.recent-head{align-items:flex-start}.hour-detail>.recent-head span{max-width:58%}}'
s = replace_once(s, media_marker, media_addition, 'hour aggregate mobile CSS')
p.write_text(s)


# 60 settings runtime: clicking an hour now replaces only the hourly ledger
# block instead of rebuilding the whole settings panel.
p = ROOT / '60-settings-runtime.part.js'
s = p.read_text()
insert_marker = '  function bindSettings() {'
helpers = r'''  function renderHourlyDrilldownOnly() {
    const current = document.querySelector('.hourly-ledger');
    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    if (!current || typeof document?.createElement !== 'function') {
      performanceRuntime.hourlyDetailFallbacks += 1;
      renderSettings();
      return;
    }
    const holder = document.createElement('div');
    holder.innerHTML = hourlyRequestDrilldownHtml(scopeKey);
    const next = holder.firstElementChild;
    if (!next) {
      performanceRuntime.hourlyDetailFallbacks += 1;
      renderSettings();
      return;
    }
    if (current.innerHTML === next.innerHTML && current.className === next.className) {
      performanceRuntime.hourlyDetailSkips += 1;
      bindHourlyDrilldown();
      return;
    }
    current.replaceWith(next);
    performanceRuntime.hourlyDetailWrites += 1;
    bindHourlyDrilldown();
  }

  function bindHourlyDrilldown() {
    document.querySelectorAll('[data-usage-hour]').forEach(button => {
      button.onclick = async () => {
        const key = String(button.getAttribute('data-usage-hour') || '');
        state.selectedHourKey = state.selectedHourKey === key ? '' : key;
        await persist();
        renderHourlyDrilldownOnly();
      };
    });
  }

'''
s = replace_once(s, insert_marker, helpers + insert_marker, 'hourly partial helper insertion')
old_binding = r'''    document.querySelectorAll('[data-usage-hour]').forEach(button => {
      button.onclick = async () => {
        const key = String(button.getAttribute('data-usage-hour') || '');
        state.selectedHourKey = state.selectedHourKey === key ? '' : key;
        await persist();
        renderSettings();
      };
    });'''
s = replace_once(s, old_binding, '    bindHourlyDrilldown();', 'hour click binding')
p.write_text(s)


# Add version-forward regression coverage for alpha.4.8 and later.
test = Path('plugins/usage-dashboard/tests/p4-hourly-detail.cjs')
test.write_text(r'''const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alpha4 = version.match(/^3\.0\.0-alpha\.4\.(\d+)$/);
const enabled = alpha4 ? Number(alpha4[1]) >= 8 : /^(3\.0\.0-beta\.|3\.0\.0$)/.test(version);

if (!enabled) {
  console.log(`usage-dashboard P4 hourly detail regression: skipped · ${version}`);
  process.exit(0);
}

for (const marker of [
  'function aggregateSelectedHour(rows, key)',
  'function selectedHourAggregateHtml(title, rows)',
  'Provider 합계',
  'Model 합계',
  '캐시 정보 0/${selected.length}',
  'function requestLedgerCoverageText()',
  '로컬 관측 시작',
  'function renderHourlyDrilldownOnly()',
  'function bindHourlyDrilldown()',
  'performanceRuntime.hourlyDetailWrites += 1',
  'Hourly detail: provider/model summary · cache coverage · click-only partial render',
  '캐시 정보 없음',
]) {
  assert.ok(source.includes(marker), `missing alpha.4.8 hourly detail marker: ${marker}`);
}

assert.ok(source.includes('current.replaceWith(next);'), 'hour click should patch only the hourly ledger block');
assert.ok(!/data-usage-hour[\s\S]{0,500}renderSettings\(\);/.test(source), 'hour click handler must not full-render the settings panel');
assert.ok(source.includes('Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS'), 'alpha.4.7 hourly drilldown regression');
assert.ok(source.includes('P4 partial: auto section patch · diagnostics live · settings preserved'), 'alpha.4.6 partial render regression');

console.log(`usage-dashboard P4 hourly detail regression: OK · ${version}`);
''')

print('alpha.4.8 hourly detail refinement patch applied')
