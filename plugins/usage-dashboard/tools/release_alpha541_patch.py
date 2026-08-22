from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TESTS = ROOT / 'tests'


def read(path):
    return path.read_text()


def write(path, text):
    path.write_text(text)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# Product/plugin version and required bridge bump.
core_path = SRC / '00-runtime-core.part.js'
core = read(core_path)
core = replace_once(core, '//@version 3.0.0-alpha.5.40', '//@version 3.0.0-alpha.5.41', 'metadata version')
core = replace_once(core, "const VERSION = '3.0.0-alpha.5.40';", "const VERSION = '3.0.0-alpha.5.41';", 'runtime version')
core = replace_once(core, "const REQUIRED_BRIDGE_VERSION = '1.6.4';", "const REQUIRED_BRIDGE_VERSION = '1.6.5';", 'required bridge version')
write(core_path, core)


# Engine 1.6.5: keep metadata-only /logs capture, adding requested/served service tier
# plus the exact source field name that matched. Prompt/response bodies remain excluded.
engine_path = RUNTIME / 'bridge-engine.mjs'
engine = read(engine_path)
engine = replace_once(engine, "const VERSION = '1.6.4';", "const VERSION = '1.6.5';", 'engine version')
log_helper = r'''  const logField = (row, candidates) => {
    for (const candidate of candidates) {
      const parts = String(candidate).split('.');
      let value = row;
      for (const part of parts) value = value?.[part];
      if (value !== undefined && value !== null && value !== '') return { value, source: String(candidate) };
    }
    return { value: null, source: '' };
  };

'''
engine = replace_once(engine, "  const sanitizeLogs = (value) => {\n", log_helper + "  const sanitizeLogs = (value) => {\n", 'log field helper')
old_sanitize = '''      const requestNumber = row.requestId ?? row.request_id ?? row.id ?? '';
      const timestamp = row.createdAt ?? row.created_at ?? null;
      if (!requestNumber || !timestamp) return null;
      return {
        timestamp,
        requestNumber: String(requestNumber),
        provider: String(row.usedProvider ?? row.used_provider ?? row.requestedProvider ?? row.requested_provider ?? 'Unknown'),
        model: String(row.usedModel ?? row.used_model ?? row.requestedModel ?? row.requested_model ?? 'Unknown'),
        cost: row.cost ?? null,
        totalTokens: row.totalTokens ?? row.total_tokens ?? null,
        cacheHit: typeof row.cached === 'boolean' ? row.cached : null,
        success: row.hasError === true ? false : true,
      };
'''
new_sanitize = '''      const requestNumber = row.requestId ?? row.request_id ?? row.id ?? '';
      const timestamp = row.createdAt ?? row.created_at ?? null;
      if (!requestNumber || !timestamp) return null;
      const requestedTier = logField(row, [
        'requestedServiceTier','requested_service_tier','requestServiceTier','request_service_tier',
        'requestedTier','requested_tier','metadata.requestedServiceTier','metadata.requested_service_tier',
        'request.serviceTier','request.service_tier'
      ]);
      const servedTier = logField(row, [
        'servedServiceTier','served_service_tier','usedServiceTier','used_service_tier',
        'actualServiceTier','actual_service_tier','billingServiceTier','billing_service_tier',
        'metadata.servedServiceTier','metadata.served_service_tier','metadata.usedServiceTier','metadata.used_service_tier',
        'response.serviceTier','response.service_tier','serviceTier','service_tier'
      ]);
      return {
        timestamp,
        requestNumber: String(requestNumber),
        provider: String(row.usedProvider ?? row.used_provider ?? row.requestedProvider ?? row.requested_provider ?? 'Unknown'),
        model: String(row.usedModel ?? row.used_model ?? row.requestedModel ?? row.requested_model ?? 'Unknown'),
        cost: row.cost ?? null,
        totalTokens: row.totalTokens ?? row.total_tokens ?? null,
        cacheHit: typeof row.cached === 'boolean' ? row.cached : null,
        requestedServiceTier: requestedTier.value,
        servedServiceTier: servedTier.value,
        requestedServiceTierSource: requestedTier.source,
        servedServiceTierSource: servedTier.source,
        success: row.hasError === true ? false : true,
      };
'''
engine = replace_once(engine, old_sanitize, new_sanitize, 'sanitize logs service tier')
old_normalized = '''      cacheHit: typeof row.cacheHit === 'boolean' ? row.cacheHit : null,
      requestNumber,
      success: row.success !== false,
'''
new_normalized = '''      cacheHit: typeof row.cacheHit === 'boolean' ? row.cacheHit : null,
      requestedServiceTier: row.requestedServiceTier ?? null,
      servedServiceTier: row.servedServiceTier ?? null,
      requestedServiceTierSource: String(row.requestedServiceTierSource || ''),
      servedServiceTierSource: String(row.servedServiceTierSource || ''),
      requestNumber,
      success: row.success !== false,
'''
engine = replace_once(engine, old_normalized, new_normalized, 'normalize captured tier metadata')
write(engine_path, engine)
engine_sha = sha256(engine_path)


# Plugin request normalization / 24h request ledger / tier UI.
usage_path = SRC / '10-usage-data.part.js'
usage = read(usage_path)
tier_helpers = r'''  function normalizeServiceTierValue(value) {
    const text = String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
    if (!text) return '';
    if (['flex','flexible'].includes(text)) return 'flex';
    if (['priority','fast'].includes(text)) return 'priority';
    if (['standard','default','auto','on-demand','ondemand','on demand'].includes(text)) return 'standard';
    return 'unknown';
  }

  function serviceTierKnown(value) {
    return ['flex','standard','priority'].includes(normalizeServiceTierValue(value));
  }

  function preferKnownServiceTier(next, current) {
    const nextTier = normalizeServiceTierValue(next);
    const currentTier = normalizeServiceTierValue(current);
    if (serviceTierKnown(nextTier)) return nextTier;
    if (serviceTierKnown(currentTier)) return currentTier;
    return nextTier || currentTier || '';
  }

  function requestServiceTierText(row) {
    const requested = normalizeServiceTierValue(row?.requestedServiceTier);
    const served = normalizeServiceTierValue(row?.servedServiceTier);
    const label = value => value === 'flex' ? 'FLEX' : value === 'priority' ? 'PRIORITY' : value === 'standard' ? 'STANDARD' : '?';
    if (serviceTierKnown(requested) && serviceTierKnown(served)) {
      return requested === served ? label(served) : `요청 ${label(requested)} → 실제 ${label(served)}`;
    }
    if (serviceTierKnown(served)) return `실제 ${label(served)}`;
    if (serviceTierKnown(requested)) return `요청 ${label(requested)} · 실제 ?`;
    return 'TIER ?';
  }

  function requestServiceTierStats(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const stats = {rows:list.length, requestedKnown:0, servedKnown:0, flex:0, standard:0, priority:0, unknown:0, requestedSources:[], servedSources:[]};
    const requestedSources = new Set();
    const servedSources = new Set();
    for (const row of list) {
      const requested = normalizeServiceTierValue(row?.requestedServiceTier);
      const served = normalizeServiceTierValue(row?.servedServiceTier);
      if (serviceTierKnown(requested)) stats.requestedKnown += 1;
      if (serviceTierKnown(served)) {
        stats.servedKnown += 1;
        stats[served] += 1;
      } else stats.unknown += 1;
      if (row?.requestedServiceTierSource) requestedSources.add(String(row.requestedServiceTierSource));
      if (row?.servedServiceTierSource) servedSources.add(String(row.servedServiceTierSource));
    }
    stats.requestedSources = Array.from(requestedSources).sort();
    stats.servedSources = Array.from(servedSources).sort();
    return stats;
  }

  function requestServiceTierSummary(rows) {
    const stats = requestServiceTierStats(rows);
    return `TIER F/S/P/? ${stats.flex}/${stats.standard}/${stats.priority}/${stats.unknown}`;
  }

'''
usage = replace_once(usage, '  function requestTimestampPrecision(timestamp, sourceKey, requestNumber) {\n', tier_helpers + '  function requestTimestampPrecision(timestamp, sourceKey, requestNumber) {\n', 'service tier helpers')
old_request_parse = '''      const tokensRaw = recentRequestValue(row, ['totalTokens','total_tokens','usage.total_tokens'], null);
      const requestNumberRaw = recentRequestValue(row, ['id','requestId','request_id','sequence','seq','requestNumber','request_number','number'], null);
      const requestNumber = requestNumberRaw !== null && requestNumberRaw !== undefined && requestNumberRaw !== '' ? String(requestNumberRaw) : '';
      const status = String(recentRequestValue(row, ['status','state'], '') || '').toLowerCase();
'''
new_request_parse = '''      const tokensRaw = recentRequestValue(row, ['totalTokens','total_tokens','usage.total_tokens'], null);
      const requestedTierField = recentRequestField(row, [
        'requestedServiceTier','requested_service_tier','requestServiceTier','request_service_tier',
        'requestedTier','requested_tier','metadata.requestedServiceTier','metadata.requested_service_tier',
        'request.serviceTier','request.service_tier'
      ]);
      const servedTierField = recentRequestField(row, [
        'servedServiceTier','served_service_tier','usedServiceTier','used_service_tier',
        'actualServiceTier','actual_service_tier','billingServiceTier','billing_service_tier',
        'metadata.servedServiceTier','metadata.served_service_tier','metadata.usedServiceTier','metadata.used_service_tier',
        'response.serviceTier','response.service_tier','serviceTier','service_tier'
      ]);
      const requestedServiceTier = normalizeServiceTierValue(requestedTierField.value);
      const servedServiceTier = normalizeServiceTierValue(servedTierField.value);
      const requestedServiceTierSource = String(recentRequestValue(row, ['requestedServiceTierSource','requested_service_tier_source'], requestedTierField.key) || requestedTierField.key || '');
      const servedServiceTierSource = String(recentRequestValue(row, ['servedServiceTierSource','served_service_tier_source'], servedTierField.key) || servedTierField.key || '');
      const requestNumberRaw = recentRequestValue(row, ['id','requestId','request_id','sequence','seq','requestNumber','request_number','number'], null);
      const requestNumber = requestNumberRaw !== null && requestNumberRaw !== undefined && requestNumberRaw !== '' ? String(requestNumberRaw) : '';
      const status = String(recentRequestValue(row, ['status','state'], '') || '').toLowerCase();
'''
usage = replace_once(usage, old_request_parse, new_request_parse, 'request tier parse')
old_request_return = '''        cacheHit:requestCacheSignal(row),
        requestNumber,
        success,
'''
new_request_return = '''        cacheHit:requestCacheSignal(row),
        requestedServiceTier,
        servedServiceTier,
        requestedServiceTierSource,
        servedServiceTierSource,
        requestNumber,
        success,
'''
usage = replace_once(usage, old_request_return, new_request_return, 'request tier fields')
old_capability = '''    const cacheKnown = list.filter(row => typeof row?.cacheHit === 'boolean').length;
    const ids = list.filter(row => String(row?.requestNumber || '')).length;
    return {rows:list.length, exact, bucket, cacheKnown, ids};
'''
new_capability = '''    const cacheKnown = list.filter(row => typeof row?.cacheHit === 'boolean').length;
    const ids = list.filter(row => String(row?.requestNumber || '')).length;
    const tier = requestServiceTierStats(list);
    return {rows:list.length, exact, bucket, cacheKnown, ids, tier};
'''
usage = replace_once(usage, old_capability, new_capability, 'request capability tier stats')
old_ledger_merge = '''          cacheHit:typeof row.cacheHit === 'boolean' ? row.cacheHit : (typeof current?.cacheHit === 'boolean' ? current.cacheHit : null),
          timestampPrecision:String(row.timestampPrecision || current?.timestampPrecision || 'unknown'),
          timestampSource:String(row.timestampSource || current?.timestampSource || ''),
          requestNumber:String(row.requestNumber || current?.requestNumber || ''),
'''
new_ledger_merge = '''          cacheHit:typeof row.cacheHit === 'boolean' ? row.cacheHit : (typeof current?.cacheHit === 'boolean' ? current.cacheHit : null),
          requestedServiceTier:preferKnownServiceTier(row.requestedServiceTier, current?.requestedServiceTier),
          servedServiceTier:preferKnownServiceTier(row.servedServiceTier, current?.servedServiceTier),
          requestedServiceTierSource:String(row.requestedServiceTierSource || current?.requestedServiceTierSource || ''),
          servedServiceTierSource:String(row.servedServiceTierSource || current?.servedServiceTierSource || ''),
          timestampPrecision:String(row.timestampPrecision || current?.timestampPrecision || 'unknown'),
          timestampSource:String(row.timestampSource || current?.timestampSource || ''),
          requestNumber:String(row.requestNumber || current?.requestNumber || ''),
'''
usage = replace_once(usage, old_ledger_merge, new_ledger_merge, 'ledger tier enrichment')
old_hour_row = '''      const errorText = errors ? ` · 오류 ${errors}` : '';
      return `<button class="hour-row ${selectedKey===key?'active':''}" data-usage-hour="${esc(key)}"><span><b>${esc(requestHourLabel(key))}</b><small>${hour.length}회 · ${costRows.length ? money(totalCost,4) : '비용 —'}</small></span><em>${cacheText}${errorText}</em></button>`;
'''
new_hour_row = '''      const errorText = errors ? ` · 오류 ${errors}` : '';
      const tierText = requestServiceTierSummary(hour);
      return `<button class="hour-row ${selectedKey===key?'active':''}" data-usage-hour="${esc(key)}"><span><b>${esc(requestHourLabel(key))}</b><small>${hour.length}회 · ${costRows.length ? money(totalCost,4) : '비용 —'}</small></span><em>${cacheText} · ${tierText}${errorText}</em></button>`;
'''
usage = replace_once(usage, old_hour_row, new_hour_row, 'hour tier summary')
old_selected_cache = '''      const errors = selected.filter(row => row.success === false).length;
      const cacheSummary = cacheRate === null
'''
new_selected_cache = '''      const errors = selected.filter(row => row.success === false).length;
      const tierSummary = requestServiceTierSummary(selected);
      const cacheSummary = cacheRate === null
'''
usage = replace_once(usage, old_selected_cache, new_selected_cache, 'selected hour tier summary')
usage = replace_once(usage, '''        cacheSummary,
        errors ? `오류 ${errors}` : '오류 0'
''', '''        cacheSummary,
        tierSummary,
        errors ? `오류 ${errors}` : '오류 0'
''', 'selected hour summary tier')
old_hour_detail_usage = '''        const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '캐시 정보 없음';
        const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', cacheText].filter(Boolean).join(' · ');
'''
new_hour_detail_usage = '''        const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '캐시 정보 없음';
        const tierText = requestServiceTierText(row);
        const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, cacheText].filter(Boolean).join(' · ');
'''
usage = replace_once(usage, old_hour_detail_usage, new_hour_detail_usage, 'hour request tier text')
usage = replace_once(usage, '''    return `<div class="usage-detail-box hourly-ledger"><div class="recent-head"><h3>시간별 요청 · 24h 로컬 관측</h3><span>${rows.length}건 · ${groups.size}시간</span></div><p>${esc(coverageText)} · 시각 exact ${fidelity.exact}/${fidelity.rows} · 버킷 ${fidelity.bucket}/${fidelity.rows} · 캐시 정보 ${fidelity.cacheKnown}/${fidelity.rows} · 프롬프트/응답 미저장</p><div class="hour-list">${hourRows}</div>${selectedHtml}</div>`;
''', '''    return `<div class="usage-detail-box hourly-ledger"><div class="recent-head"><h3>시간별 요청 · 24h 로컬 관측</h3><span>${rows.length}건 · ${groups.size}시간</span></div><p>${esc(coverageText)} · 시각 exact ${fidelity.exact}/${fidelity.rows} · 버킷 ${fidelity.bucket}/${fidelity.rows} · 캐시 정보 ${fidelity.cacheKnown}/${fidelity.rows} · tier 실제 ${fidelity.tier.servedKnown}/${fidelity.rows} · 프롬프트/응답 미저장</p><div class="hour-list">${hourRows}</div>${selectedHtml}</div>`;
''', 'hour tier fidelity')
old_recent_usage = '''      const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '';
      const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', cacheText].filter(Boolean).join(' · ');
'''
new_recent_usage = '''      const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '';
      const tierText = requestServiceTierText(row);
      const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, cacheText].filter(Boolean).join(' · ');
'''
usage = replace_once(usage, old_recent_usage, new_recent_usage, 'recent request tier text')

# Restore useful DevPass 2.7.3 account metadata parity through the managed bridge.
old_runway = '''      const runway = runwayRaw ? {
        runwayDays:num(runwayRaw.runwayDays)?Number(runwayRaw.runwayDays):null,
        avgDailySpend7d:num(runwayRaw.avgDailySpend7d)?Number(runwayRaw.avgDailySpend7d):null,
        fetchedAt:runwayRaw.fetchedAt || r.fetchedAt || Date.now()
      } : null;
      const out = {
'''
new_runway = '''      const runway = runwayRaw ? {
        runwayDays:num(runwayRaw.runwayDays)?Number(runwayRaw.runwayDays):null,
        avgDailySpend7d:num(runwayRaw.avgDailySpend7d)?Number(runwayRaw.avgDailySpend7d):null,
        fetchedAt:runwayRaw.fetchedAt || r.fetchedAt || Date.now()
      } : null;
      const devpassAccount = ds ? {
        plan:String(ds.plan || 'none'),
        pendingTier:ds.pendingTier === null || ds.pendingTier === undefined ? '' : String(ds.pendingTier),
        serviceTier:String(ds.serviceTier || 'default'),
        routingStrategy:String(ds.routingStrategy || 'auto'),
        paygEnabled:ds.paygEnabled === true,
        hasPersonalOrg:typeof ds.hasPersonalOrg === 'boolean' ? ds.hasPersonalOrg : null,
        source:String(ds.source || '')
      } : null;
      const out = {
'''
usage = replace_once(usage, old_runway, new_runway, 'devpass account adapter')
usage = replace_once(usage, '        monthly, weekly, credits, activity, runway, usageScopes, analytics, analyticsScopes,\n', '        monthly, weekly, credits, activity, runway, usageScopes, analytics, analyticsScopes, devpassAccount,\n', 'devpass account output')
write(usage_path, usage)


# DevPass account parity surface in the DevPass tab; keep nth-child panel structure unchanged.
ui_path = SRC / '50-settings-ui.part.js'
ui = read(ui_path)
ui = replace_once(ui, '    const bridgeDiag = bridgeStabilitySnapshot();\n', "    const bridgeDiag = bridgeStabilitySnapshot();\n    const devpassAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;\n", 'devpass account ui state')
ui = replace_once(ui, '''    const scopeFetchedAt = scopeActivity?.fetchedAt || d.usageScopes?.fetchedAt || d.fetchedAt;
    const scopeExtra = scopeKey === 'devpass'
''', '''    const scopeFetchedAt = scopeActivity?.fetchedAt || d.usageScopes?.fetchedAt || d.fetchedAt;
    const devpassParityExtra = devpassAccount
      ? `<div class="mini"><span>Service tier</span><b>${esc(String(devpassAccount.serviceTier || '—').toUpperCase())}</b></div><div class="mini"><span>Routing</span><b>${esc(String(devpassAccount.routingStrategy || '—'))}</b></div><div class="mini"><span>Pending tier</span><b>${esc(String(devpassAccount.pendingTier || '—'))}</b></div><div class="mini"><span>Personal org</span><b>${devpassAccount.hasPersonalOrg === null ? '—' : devpassAccount.hasPersonalOrg ? '있음' : '없음'}</b></div>`
      : '';
    const scopeExtra = scopeKey === 'devpass'
''', 'devpass parity ui helper')
ui = replace_once(ui, '''      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>월간 갱신</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div><div class="mini purple"><span>프리미엄 남음</span><b>${money(d.weekly?.remaining)}</b></div><div class="mini purple"><span>Reset Pass</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>`
''', '''      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>월간 갱신</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div><div class="mini purple"><span>프리미엄 남음</span><b>${money(d.weekly?.remaining)}</b></div><div class="mini purple"><span>Reset Pass</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>${devpassParityExtra}`
''', 'devpass parity minis')
write(ui_path, ui)


# Diagnostics: fidelity and source-field discovery, plus old-widget account parity.
diag_path = SRC / '40-diagnostics.part.js'
diag = read(diag_path)
diag = replace_once(diag, '''    const diagLedgerFidelity = requestLedgerCapabilities(diagLedgerRows);
    return [
''', '''    const diagLedgerFidelity = requestLedgerCapabilities(diagLedgerRows);
    const diagDevpassRows = requestLedgerRowsForScope('devpass');
    const diagTierFidelity = requestServiceTierStats(diagDevpassRows);
    const diagAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;
    return [
''', 'tier diagnostics setup')
diag = replace_once(diag, '''      `Request fidelity: exact ${diagLedgerFidelity.exact}/${diagLedgerFidelity.rows} · bucket ${diagLedgerFidelity.bucket}/${diagLedgerFidelity.rows} · cache known ${diagLedgerFidelity.cacheKnown}/${diagLedgerFidelity.rows} · ids ${diagLedgerFidelity.ids}/${diagLedgerFidelity.rows}`,
      `Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS`,
''', '''      `Request fidelity: exact ${diagLedgerFidelity.exact}/${diagLedgerFidelity.rows} · bucket ${diagLedgerFidelity.bucket}/${diagLedgerFidelity.rows} · cache known ${diagLedgerFidelity.cacheKnown}/${diagLedgerFidelity.rows} · ids ${diagLedgerFidelity.ids}/${diagLedgerFidelity.rows}`,
      `Service tier fidelity: requested known ${diagTierFidelity.requestedKnown}/${diagTierFidelity.rows} · served known ${diagTierFidelity.servedKnown}/${diagTierFidelity.rows} · served flex ${diagTierFidelity.flex} · standard ${diagTierFidelity.standard} · priority ${diagTierFidelity.priority} · unknown ${diagTierFidelity.unknown}`,
      `Service tier source fields: requested ${diagTierFidelity.requestedSources.join(',') || 'none'} · served ${diagTierFidelity.servedSources.join(',') || 'none'}`,
      `DevPass account tier: service ${diagAccount?.serviceTier || '—'} · routing ${diagAccount?.routingStrategy || '—'} · pending ${diagAccount?.pendingTier || '—'} · personal org ${diagAccount?.hasPersonalOrg === null || diagAccount?.hasPersonalOrg === undefined ? '—' : diagAccount.hasPersonalOrg ? 'yes' : 'no'}`,
      `Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS · service tier`,
''', 'tier diagnostic lines')
write(diag_path, diag)


# Regression locks.
p3_path = TESTS / 'p3-ui.cjs'
p3 = read(p3_path)
p3 = replace_once(p3, "  'renderBridgeControls',\n]) {", "  'renderBridgeControls',\n  'requestServiceTierText',\n  'Service tier fidelity:',\n  '<span>Service tier</span>',\n  '<span>Routing</span>',\n  '<span>Pending tier</span>',\n  '<span>Personal org</span>',\n]) {", 'P3 service tier markers')
write(p3_path, p3)

control_path = TESTS / 'p5-bridge-control-sync.cjs'
control = read(control_path)
control = replace_once(control, "assert.ok(source.includes('//@version 3.0.0-alpha.5.40'));\n", "const version = (source.match(/^\\/\\/@version (.+)$/m) || [])[1] || '';\nconst alpha540Plus = version.match(/^3\\.0\\.0-alpha\\.5\\.(\\d+)$/);\nassert.ok(alpha540Plus && Number(alpha540Plus[1]) >= 40, `bridge control sync requires alpha.5.40+, got ${version}`);\n", 'futureproof bridge control test version')
control = replace_once(control, "console.log('usage-dashboard P5 bridge control surface sync: OK · 3.0.0-alpha.5.40');", "console.log(`usage-dashboard P5 bridge control surface sync: OK · ${version}`);", 'bridge control test console')
write(control_path, control)

bundled_path = TESTS / 'p5-bundled-engine.cjs'
bundled = read(bundled_path)
bundled = bundled.replace("1.6.4", "1.6.5")
write(bundled_path, bundled)

service_test = r'''const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.ok(source.includes('//@version 3.0.0-alpha.5.41'));
assert.ok(source.includes("const REQUIRED_BRIDGE_VERSION = '1.6.5';"));
assert.ok(engine.includes("const VERSION = '1.6.5';"));
for (const marker of [
  'requestedServiceTierSource',
  'servedServiceTierSource',
  "'requestedServiceTier','requested_service_tier'",
  "'servedServiceTier','served_service_tier'",
  'function normalizeCapturedRecentLogs(root)',
]) assert.ok(engine.includes(marker), `missing Engine service tier marker: ${marker}`);

for (const marker of [
  'function normalizeServiceTierValue(value)',
  'function requestServiceTierText(row)',
  'function requestServiceTierStats(rows)',
  'function requestServiceTierSummary(rows)',
  'requestedServiceTier:preferKnownServiceTier',
  'servedServiceTier:preferKnownServiceTier',
  'Service tier fidelity:',
  'Service tier source fields:',
  'DevPass account tier:',
  'devpassAccount',
  '<span>Service tier</span>',
  '<span>Routing</span>',
  '<span>Pending tier</span>',
  '<span>Personal org</span>',
]) assert.ok(source.includes(marker), `missing plugin service tier marker: ${marker}`);

assert.ok((source.match(/requestServiceTierText\(row\)/g) || []).length >= 2, 'recent and hourly request rows must both show tier');
const keyStart = source.indexOf('  function requestLedgerKey(row) {');
const keyEnd = source.indexOf('  function collectRecentRequestLedger(data) {', keyStart);
assert.ok(keyStart >= 0 && keyEnd > keyStart, 'requestLedgerKey slice missing');
const keySlice = source.slice(keyStart, keyEnd);
assert.ok(!keySlice.includes('requestedServiceTier') && !keySlice.includes('servedServiceTier'), 'tier enrichment must not change request dedupe identity');

const helperStart = source.indexOf('  function normalizeServiceTierValue(value) {');
const helperEnd = source.indexOf('  function requestTimestampPrecision(timestamp, sourceKey, requestNumber) {', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'service tier helper slice missing');
const context = {};
vm.createContext(context);
vm.runInContext(`${source.slice(helperStart, helperEnd)}\nthis.api={normalizeServiceTierValue,requestServiceTierText,requestServiceTierStats};`, context);
assert.equal(context.api.normalizeServiceTierValue('flex'), 'flex');
assert.equal(context.api.normalizeServiceTierValue('default'), 'standard');
assert.equal(context.api.normalizeServiceTierValue('priority'), 'priority');
assert.equal(context.api.requestServiceTierText({requestedServiceTier:'flex',servedServiceTier:'flex'}), 'FLEX');
assert.equal(context.api.requestServiceTierText({requestedServiceTier:'flex',servedServiceTier:'default'}), '요청 FLEX → 실제 STANDARD');
const stats = context.api.requestServiceTierStats([
  {requestedServiceTier:'flex',servedServiceTier:'flex',requestedServiceTierSource:'requestedServiceTier',servedServiceTierSource:'usedServiceTier'},
  {requestedServiceTier:'default',servedServiceTier:'default'},
  {requestedServiceTier:'priority',servedServiceTier:''},
]);
assert.equal(stats.requestedKnown, 3);
assert.equal(stats.servedKnown, 2);
assert.equal(stats.flex, 1);
assert.equal(stats.standard, 1);
assert.equal(stats.unknown, 1);

assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.41';"));
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.5';"));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.41');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.41');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.5');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);
console.log('usage-dashboard P5 per-request service tier fidelity: OK · 3.0.0-alpha.5.41');
'''
write(TESTS / 'p5-service-tier-fidelity.cjs', service_test)


# Manager stays 1.2.6 semantically, but learns the new bundled Engine and product version.
manager_path = RUNTIME / 'bridge-manager.cjs'
manager = read(manager_path)
manager = replace_once(manager, "const PRODUCT_VERSION = '3.0.0-alpha.5.40';", "const PRODUCT_VERSION = '3.0.0-alpha.5.41';", 'manager product version')
manager = replace_once(manager, "const BUNDLED_ENGINE_VERSION = '1.6.4';", "const BUNDLED_ENGINE_VERSION = '1.6.5';", 'manager bundled engine version')
old_sha_line = next((line for line in manager.splitlines() if line.startswith("const BUNDLED_ENGINE_SHA256 = '")), None)
if not old_sha_line:
    raise SystemExit('manager bundled engine sha line missing')
manager = replace_once(manager, old_sha_line, f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", 'manager bundled engine sha')
write(manager_path, manager)
manager_sha = sha256(manager_path)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
if manifest.get('productVersion') != '3.0.0-alpha.5.40':
    raise SystemExit(f"unexpected manifest product version: {manifest.get('productVersion')}")
manifest['productVersion'] = '3.0.0-alpha.5.41'
manifest['components']['plugin']['version'] = '3.0.0-alpha.5.41'
manifest['components']['bridge']['requiredVersion'] = '1.6.5'
manifest['components']['bridge']['sha256'] = engine_sha
manifest['components']['bridgeManager']['productVersion'] = '3.0.0-alpha.5.41'
manifest['components']['bridgeManager']['sha256'] = manager_sha
write(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

print('prepared Local Usage Dashboard 3.0.0-alpha.5.41 per-request service tier fidelity + DevPass account parity')
