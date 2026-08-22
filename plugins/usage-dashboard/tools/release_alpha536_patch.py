from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
OLD = '3.0.0-alpha.5.35'
NEW = '3.0.0-alpha.5.36'


def replace_once(path, old, new, label):
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    path.write_text(text.replace(old, new, 1))


# Product/runtime identity + persistent selection state.
core = ROOT / 'src/00-runtime-core.part.js'
replace_once(core, f'//@version {OLD}', f'//@version {NEW}', 'metadata version')
replace_once(core, f"const VERSION = '{OLD}';", f"const VERSION = '{NEW}';", 'runtime version')
replace_once(core, "const REQUIRED_BRIDGE_VERSION = '1.6.1';", "const REQUIRED_BRIDGE_VERSION = '1.6.4';", 'required engine version')
replace_once(
    core,
    "    dashboardView: 'overview',\n",
    "    dashboardView: 'overview',\n    selectedCreditsOrgId: '',\n    creditsOrgFallbackCount: 0,\n    creditsOrgLastFallbackFrom: '',\n    creditsOrgLastFallbackTo: '',\n",
    'credits org state defaults',
)

# Snapshot request carries selected Credits organization without changing the default path.
bridge_io = ROOT / 'src/20-bridge-io.part.js'
replace_once(
    bridge_io,
    "    const res = await Risuai.nativeFetch(`${base}/snapshot`, {\n",
    "    const selectedCreditsOrgId = String(state.selectedCreditsOrgId || '').trim();\n    const snapshotUrl = `${base}/snapshot${selectedCreditsOrgId ? `?creditsOrgId=${encodeURIComponent(selectedCreditsOrgId)}` : ''}`;\n    const res = await Risuai.nativeFetch(snapshotUrl, {\n",
    'snapshot org routing query',
)

# Normalize the exact organization selected by the bridge and expose safe organization metadata to UI.
usage_data = ROOT / 'src/10-usage-data.part.js'
old_credit_org = """      const creditOrg = orgRows.find(org =>
        String(org?.kind || 'default') === 'default' &&
        String(org?.status || 'active') !== 'deleted' &&
        num(org?.credits)
      ) || orgRows.find(org => String(org?.status || 'active') !== 'deleted' && num(org?.credits)) || null;
"""
new_credit_org = """      const selectedCreditsOrgId = String(r.creditsOrganizationId || '').trim();
      const creditOrg = orgRows.find(org =>
        selectedCreditsOrgId && String(org?.id || '') === selectedCreditsOrgId &&
        String(org?.kind || 'default') === 'default' &&
        String(org?.status || 'active') !== 'deleted'
      ) || orgRows.find(org =>
        String(org?.kind || 'default') === 'default' &&
        String(org?.status || 'active') !== 'deleted' &&
        num(org?.credits)
      ) || orgRows.find(org => String(org?.status || 'active') !== 'deleted' && num(org?.credits)) || null;
"""
replace_once(usage_data, old_credit_org, new_credit_org, 'normalized selected credits org')
replace_once(
    usage_data,
    "        monthly, weekly, credits, activity, runway, usageScopes, analytics, analyticsScopes\n",
    "        monthly, weekly, credits, activity, runway, usageScopes, analytics, analyticsScopes,\n        organizations:orgRows.filter(org => String(org?.id || '') && String(org?.status || 'active') !== 'deleted').map(org => ({id:String(org.id),name:String(org?.name || org.id),kind:String(org?.kind || 'default'),status:String(org?.status || 'active'),credits:num(org?.credits)?Number(org.credits):null})),\n        creditsOrganizationId:String(r.creditsOrganizationId || creditOrg?.id || ''),\n        requestedCreditsOrganizationId:String(r.requestedCreditsOrganizationId || ''),\n        creditsOrganizationFallback:r.creditsOrganizationFallback === true,\n        creditsOrganizationFallbackReason:String(r.creditsOrganizationFallbackReason || '')\n",
    'normalized credits org metadata',
)

# A fallback becomes the new safe persisted selection, with diagnostics history retained.
refresh_runtime = ROOT / 'src/30-refresh-runtime.part.js'
replace_once(
    refresh_runtime,
    "        state.data = applyObservedToday(snapshot);\n        collectRecentRequestLedger(state.data);\n",
    "        state.data = applyObservedToday(snapshot);\n        if (state.data?.creditsOrganizationFallback && state.data?.creditsOrganizationId) {\n          const from = String(state.data.requestedCreditsOrganizationId || state.selectedCreditsOrgId || '');\n          const to = String(state.data.creditsOrganizationId || '');\n          if (from && to && from !== to) {\n            state.creditsOrgFallbackCount = Number(state.creditsOrgFallbackCount || 0) + 1;\n            state.creditsOrgLastFallbackFrom = from;\n            state.creditsOrgLastFallbackTo = to;\n          }\n          state.selectedCreditsOrgId = to;\n        }\n        collectRecentRequestLedger(state.data);\n",
    'credits org fallback reconciliation',
)

# Credits tab: organization selector and source-aware labels. Analytics keeps its scope selector.
settings_ui = ROOT / 'src/50-settings-ui.part.js'
replace_once(
    settings_ui,
    "    const dashboardView = ['overview','devpass','credits','analytics','settings'].includes(String(state.dashboardView)) ? String(state.dashboardView) : 'overview';\n",
    "    const dashboardView = ['overview','devpass','credits','analytics','settings'].includes(String(state.dashboardView)) ? String(state.dashboardView) : 'overview';\n    const creditsOrganizations = (Array.isArray(d.organizations) ? d.organizations : []).filter(org => String(org?.kind || 'default') === 'default' && String(org?.status || 'active') !== 'deleted');\n    const selectedCreditsOrgId = String(d.creditsOrganizationId || state.selectedCreditsOrgId || '');\n    const selectedCreditsOrg = creditsOrganizations.find(org => String(org?.id || '') === selectedCreditsOrgId) || creditsOrganizations[0] || null;\n    const creditsOrgLabel = String(selectedCreditsOrg?.name || selectedCreditsOrgId || 'Default organization');\n    const creditsOrgSelector = creditsOrganizations.length ? `<label class=\"credits-org-picker\"><span>Credits Organization</span><select id=\"credits-org-id\">${creditsOrganizations.map(org => `<option value=\"${esc(org.id)}\" ${String(org.id)===selectedCreditsOrgId?'selected':''}>${esc(org.name || org.id)}${num(org.credits)?` · ${money(org.credits)}`:''}</option>`).join('')}</select></label>${d.creditsOrganizationFallback ? `<p class=\"warn credits-org-fallback\">선택한 organization을 찾지 못해 ${esc(creditsOrgLabel)}로 자동 복구했어.</p>` : ''}` : '';\n",
    'credits org selector variables',
)
replace_once(
    settings_ui,
    "const scopeNames = {all:['전체 24h Usage','DevPass + Credits 합산 서버 집계'],devpass:['DevPass 24h Usage','DevPass project /activity 서버 집계'],credits:['Credits 24h Usage','Default organization 서버 집계']};",
    "const scopeNames = {all:['전체 24h Usage',`DevPass + ${creditsOrgLabel} Credits 합산 서버 집계`],devpass:['DevPass 24h Usage','DevPass project /activity 서버 집계'],credits:['Credits 24h Usage',`${creditsOrgLabel} 서버 집계`]};",
    'usage org-aware labels',
)
replace_once(
    settings_ui,
    "      credits:['Credits Analytics','Default organization 서버 분석']\n",
    "      credits:['Credits Analytics',`${creditsOrgLabel} 서버 분석`]\n",
    'analytics org-aware labels',
)
replace_once(
    settings_ui,
    "      .scope-tabs{display:flex;gap:6px;margin-top:10px}.scope-tab{flex:1;min-width:0;padding:7px 9px}.scope-tab.active{background:var(--g);border-color:var(--g);color:#15170f}\n",
    "      .scope-tabs{display:flex;gap:6px;margin-top:10px}.scope-tab{flex:1;min-width:0;padding:7px 9px}.scope-tab.active{background:var(--g);border-color:var(--g);color:#15170f}.credits-org-picker{max-width:420px;margin-top:10px}.credits-org-picker select{margin-top:2px}.credits-org-fallback{margin:6px 0 0}\n",
    'credits org selector styling',
)
replace_once(
    settings_ui,
    "        <div class=\"today-head\"><div><b>${dashboardView === 'devpass' ? 'DevPass Usage' : dashboardView === 'credits' ? 'Credits Usage' : '24h Usage Scope'}</b><p style=\"margin:2px 0 0\">${esc(scopeNames[scopeKey][1])}</p></div><span class=\"stamp\">${scopeFetchedAt ? dashboardDateText(scopeFetchedAt) : ''}</span></div>\n        <div class=\"scope-tabs\" role=\"tablist\" aria-label=\"24h Usage scope\">\n",
    "        <div class=\"today-head\"><div><b>${dashboardView === 'devpass' ? 'DevPass Usage' : dashboardView === 'credits' ? 'Credits Usage' : '24h Usage Scope'}</b><p style=\"margin:2px 0 0\">${esc(scopeNames[scopeKey][1])}</p></div><span class=\"stamp\">${scopeFetchedAt ? dashboardDateText(scopeFetchedAt) : ''}</span></div>\n        ${dashboardView === 'credits' ? creditsOrgSelector : ''}\n        <div class=\"scope-tabs\" role=\"tablist\" aria-label=\"24h Usage scope\">\n",
    'credits org selector placement',
)

settings_runtime = ROOT / 'src/60-settings-runtime.part.js'
replace_once(
    settings_runtime,
    "    document.querySelectorAll('[data-recent-filter]').forEach(button => {\n",
    "    if (q('#credits-org-id')) q('#credits-org-id').onchange = async e => {\n      const next = String(e.target.value || '').trim();\n      if (!next || next === String(state.selectedCreditsOrgId || '')) return;\n      state.selectedCreditsOrgId = next;\n      state.selectedHourKey = '';\n      await persist();\n      await enqueueRefresh('manual');\n      renderSettings();\n    };\n    document.querySelectorAll('[data-recent-filter]').forEach(button => {\n",
    'credits org selector binding',
)

diagnostics = ROOT / 'src/40-diagnostics.part.js'
old_diag = "      `Local runtime errors: ${localRuntimeErrors.count} · persist ${localRuntimeErrors.persistFailures} · render ${localRuntimeErrors.renderFailures} · last ${localRuntimeErrors.lastAt ? `${age(localRuntimeErrors.lastAt)} · ${localRuntimeErrors.lastStage} · ${localRuntimeErrors.lastMessage}` : 'none'}`,\n"
new_diag = "      `Credits organization: selected ${state.data?.creditsOrganizationId || state.selectedCreditsOrgId || 'default'} · available ${Array.isArray(state.data?.organizations) ? state.data.organizations.filter(org=>String(org?.kind||'default')==='default'&&String(org?.status||'active')!=='deleted').length : 0} · fallbacks ${Number(state.creditsOrgFallbackCount || 0)}${state.creditsOrgLastFallbackFrom ? ` · last ${state.creditsOrgLastFallbackFrom} → ${state.creditsOrgLastFallbackTo || 'default'}` : ''}`,\n" + old_diag
replace_once(diagnostics, old_diag, new_diag, 'credits org diagnostics')

# Engine 1.6.4: resolve selected default org once, key every aggregate cache by org, and expose fallback metadata.
engine = ROOT / 'runtime/bridge-engine.mjs'
replace_once(engine, "const VERSION = '1.6.3';", "const VERSION = '1.6.4';", 'engine version')
replace_once(engine, "    ?? (name === 'usageScopes' ? 60_000 : null)\n", "    ?? ((name === 'usageScopes' || name.startsWith('usageScopes:')) ? 60_000 : null)\n", 'usage scope keyed ttl')
replace_once(engine, "    ?? (name === 'analyticsScopes' ? 60_000 : null)\n", "    ?? ((name === 'analyticsScopes' || name.startsWith('analyticsScopes:')) ? 60_000 : null)\n", 'analytics scope keyed ttl')

old_selector = """function creditsUsageOrganization(orgData) {
  const rows = orgData?.organizations || [];
  return rows.find((row) => row.kind === 'default' && row.status !== 'deleted') || null;
}
"""
new_selector = """function creditsUsageSelection(orgData, requestedOrgId = '') {
  const rows = (orgData?.organizations || []).filter((row) => row.kind === 'default' && row.status !== 'deleted');
  const requestedId = String(requestedOrgId || '').trim();
  const requested = requestedId ? rows.find((row) => String(row.id || '') === requestedId) || null : null;
  const fallback = rows.find((row) => finite(row.credits) !== null) || rows[0] || null;
  const org = requested || fallback;
  return {
    org,
    requestedId,
    fallback: Boolean(requestedId && (!requested || String(requested.id || '') !== requestedId)),
    fallbackReason: requestedId && !requested ? 'requested Credits organization unavailable' : '',
  };
}

function creditsUsageOrganization(orgData, requestedOrgId = '') {
  return creditsUsageSelection(orgData, requestedOrgId).org;
}
"""
replace_once(engine, old_selector, new_selector, 'engine credits org resolver')

replace_once(
    engine,
    "async function activityForScope(range = '24h', scope = 'all') {\n  const normalizedScope = ['all', 'devpass', 'credits'].includes(scope) ? scope : 'all';\n  return cached(`activity:${normalizedScope}:${range}`, async () => {\n",
    "async function activityForScope(range = '24h', scope = 'all', creditsOrgId = '') {\n  const normalizedScope = ['all', 'devpass', 'credits'].includes(scope) ? scope : 'all';\n  const normalizedCreditsOrgId = String(creditsOrgId || '').trim();\n  const creditsCacheKey = normalizedCreditsOrgId || 'default';\n  return cached(`activity:${normalizedScope}:${creditsCacheKey}:${range}`, async () => {\n",
    'activity org-aware cache key',
)
replace_once(engine, "const creditsOrg = creditsUsageOrganization(await getOrgData());", "const creditsOrg = creditsUsageOrganization(await getOrgData(), normalizedCreditsOrgId);", 'activity selected credits org')
replace_once(
    engine,
    "async function activityForRange(range = '24h') {\n  return activityForScope(range, 'all');\n}\n\nasync function activity() {\n  return activityForScope('24h', 'all');\n}\n\nasync function usageScopes() {\n  return cached('usageScopes', async () => {\n",
    "async function activityForRange(range = '24h', creditsOrgId = '') {\n  return activityForScope(range, 'all', creditsOrgId);\n}\n\nasync function activity(creditsOrgId = '') {\n  return activityForScope('24h', 'all', creditsOrgId);\n}\n\nasync function usageScopes(creditsOrgId = '') {\n  const creditsCacheKey = String(creditsOrgId || '').trim() || 'default';\n  return cached(`usageScopes:${creditsCacheKey}`, async () => {\n",
    'usage scopes org-aware signature',
)
replace_once(engine, "const settled = await Promise.allSettled(scopes.map((scope) => activityForScope('24h', scope)));", "const settled = await Promise.allSettled(scopes.map((scope) => activityForScope('24h', scope, creditsOrgId)));", 'usage scopes selected org')
replace_once(
    engine,
    "async function analyticsForScope(scope = 'all') {\n  const normalizedScope = ['all', 'devpass', 'credits'].includes(scope) ? scope : 'all';\n  return cached(`analytics:${normalizedScope}`, async () => {\n",
    "async function analyticsForScope(scope = 'all', creditsOrgId = '') {\n  const normalizedScope = ['all', 'devpass', 'credits'].includes(scope) ? scope : 'all';\n  const creditsCacheKey = String(creditsOrgId || '').trim() || 'default';\n  return cached(`analytics:${normalizedScope}:${creditsCacheKey}`, async () => {\n",
    'analytics org-aware cache key',
)
replace_once(engine, "const settled = await Promise.allSettled(ranges.map((range) => activityForScope(range, normalizedScope)));", "const settled = await Promise.allSettled(ranges.map((range) => activityForScope(range, normalizedScope, creditsOrgId)));", 'analytics selected org')
replace_once(
    engine,
    "async function analytics() {\n  return analyticsForScope('all');\n}\n\nasync function analyticsScopes() {\n  return cached('analyticsScopes', async () => {\n",
    "async function analytics(creditsOrgId = '') {\n  return analyticsForScope('all', creditsOrgId);\n}\n\nasync function analyticsScopes(creditsOrgId = '') {\n  const creditsCacheKey = String(creditsOrgId || '').trim() || 'default';\n  return cached(`analyticsScopes:${creditsCacheKey}`, async () => {\n",
    'analytics scopes org-aware signature',
)
replace_once(engine, "const settled = await Promise.allSettled(scopes.map((scope) => analyticsForScope(scope)));", "const settled = await Promise.allSettled(scopes.map((scope) => analyticsForScope(scope, creditsOrgId)));", 'analytics scopes selected org')
replace_once(engine, "const creditsOnly = await activityForScope('7d', 'credits');", "const creditsOnly = await activityForScope('7d', 'credits', orgId);", 'runway selected org fallback')

replace_once(
    engine,
    "async function snapshot(profile = 'full') {\n  const normalizedProfile = profile === 'light' ? 'light' : 'full';\n",
    "async function snapshot(profile = 'full', creditsOrgId = '') {\n  const normalizedProfile = profile === 'light' ? 'light' : 'full';\n  const requestedCreditsOrgId = String(creditsOrgId || '').trim();\n",
    'snapshot selected org signature',
)
old_snapshot_select = """  const rows = orgs?.organizations || [];
  const creditsOrg = rows.find((row) => row.kind === 'default' && row.status !== 'deleted' && finite(row.credits) !== null)
    || rows.find((row) => row.kind === 'default' && row.status !== 'deleted')
    || null;

  const jobs = [loadDevPassStatus(), usageScopes()];
  if (normalizedProfile === 'full') {
    jobs.push(creditsOrg ? runwayFor(creditsOrg.id) : Promise.resolve(null), analyticsScopes());
  }
"""
new_snapshot_select = """  const rows = orgs?.organizations || [];
  const creditsSelection = creditsUsageSelection({ organizations: rows }, requestedCreditsOrgId);
  const creditsOrg = creditsSelection.org;
  const resolvedCreditsOrgId = String(creditsOrg?.id || '');

  const jobs = [loadDevPassStatus(), usageScopes(resolvedCreditsOrgId)];
  if (normalizedProfile === 'full') {
    jobs.push(creditsOrg ? runwayFor(creditsOrg.id) : Promise.resolve(null), analyticsScopes(resolvedCreditsOrgId));
  }
"""
replace_once(engine, old_snapshot_select, new_snapshot_select, 'snapshot credits selection')
replace_once(
    engine,
    "    creditsOrganizationId: creditsOrg?.id || null,\n    activity: activityValue,\n",
    "    creditsOrganizationId: creditsOrg?.id || null,\n    requestedCreditsOrganizationId: requestedCreditsOrgId || null,\n    creditsOrganizationFallback: creditsSelection.fallback,\n    creditsOrganizationFallbackReason: creditsSelection.fallbackReason || null,\n    activity: activityValue,\n",
    'snapshot credits fallback metadata',
)
replace_once(
    engine,
    "    snapshotProfile: normalizedProfile,\n",
    "    snapshotProfile: normalizedProfile,\n    creditsOrganization: {requestedId: requestedCreditsOrgId || null, selectedId: creditsOrg?.id || null, fallback: creditsSelection.fallback, fallbackReason: creditsSelection.fallbackReason || null},\n",
    'engine diagnostics credits org',
)

old_routes = """    if (url.pathname === '/snapshot') {
      const profile = url.searchParams.get('profile') === 'light' ? 'light' : 'full';
      return json(res, 200, await snapshot(profile));
    }
    if (url.pathname === '/orgs') return json(res, 200, await loadOrgs());
    if (url.pathname === '/devpass-status') return json(res, 200, await loadDevPassStatus());
    if (url.pathname === '/activity') return json(res, 200, await activity());
    if (url.pathname === '/analytics') return json(res, 200, await analytics());
    if (url.pathname === '/usage-scopes') return json(res, 200, await usageScopes());
    if (url.pathname === '/analytics-scopes') return json(res, 200, await analyticsScopes());
    if (url.pathname === '/v1/summary') return json(res, 200, await snapshot('full'));
"""
new_routes = """    const creditsOrgId = String(url.searchParams.get('creditsOrgId') || '').trim();
    if (url.pathname === '/snapshot') {
      const profile = url.searchParams.get('profile') === 'light' ? 'light' : 'full';
      return json(res, 200, await snapshot(profile, creditsOrgId));
    }
    if (url.pathname === '/orgs') return json(res, 200, await loadOrgs());
    if (url.pathname === '/devpass-status') return json(res, 200, await loadDevPassStatus());
    if (url.pathname === '/activity') return json(res, 200, await activity(creditsOrgId));
    if (url.pathname === '/analytics') return json(res, 200, await analytics(creditsOrgId));
    if (url.pathname === '/usage-scopes') return json(res, 200, await usageScopes(creditsOrgId));
    if (url.pathname === '/analytics-scopes') return json(res, 200, await analyticsScopes(creditsOrgId));
    if (url.pathname === '/v1/summary') return json(res, 200, await snapshot('full', creditsOrgId));
"""
replace_once(engine, old_routes, new_routes, 'org-aware routes')

# Regression tests become routing-aware and validate manifest hash rather than a historical fixed hash.
p3 = ROOT / 'tests/p3-ui.cjs'
replace_once(
    p3,
    "  'widgetRemoteListeners.length=0;',\n",
    "  'widgetRemoteListeners.length=0;',\n  'id=\\\"credits-org-id\\\"',\n  'selectedCreditsOrgId',\n  'creditsOrganizationFallback',\n",
    'P3 multi-org markers',
)

p5 = ROOT / 'tests/p5-bundled-engine.cjs'
replace_once(p5, "assert.equal(hash(enginePath),'16807420932bb5a8bbdb8f85ae3a998042067997c6e6afa788b79da3b3eb6c01');", "assert.equal(hash(enginePath),manifest.components.bridge.sha256);", 'engine hash source of truth')
replace_once(p5, "assert.ok(engine.includes(\"const VERSION = '1.6.3';\"));", "assert.ok(engine.includes(\"const VERSION = '1.6.4';\"));", 'engine test version')
replace_once(p5, "assert.equal(manifest.components.bridge.requiredVersion,'1.6.3');", "assert.equal(manifest.components.bridge.requiredVersion,'1.6.4');", 'manifest required engine test')
replace_once(
    p5,
    "assert.ok(engine.includes('recentRequests: recentRequests.sort'));\n",
    "assert.ok(engine.includes('recentRequests: recentRequests.sort'));\nassert.ok(engine.includes(\"function creditsUsageSelection(orgData, requestedOrgId = '')\"));\nassert.ok(engine.includes(\"async function usageScopes(creditsOrgId = '')\"));\nassert.ok(engine.includes('`usageScopes:${creditsCacheKey}`'));\nassert.ok(engine.includes(\"async function analyticsScopes(creditsOrgId = '')\"));\nassert.ok(engine.includes('`analyticsScopes:${creditsCacheKey}`'));\nassert.ok(engine.includes(\"await snapshot(profile, creditsOrgId)\"));\n",
    'engine multi-org regression markers',
)

# Product metadata and hashes.
manager = ROOT / 'runtime/bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD}';", f"const PRODUCT_VERSION = '{NEW}';", 'manager product version')

product_manifest = ROOT / 'runtime/product-manifest.json'
manifest = json.loads(product_manifest.read_text())
if manifest.get('productVersion') != OLD:
    raise SystemExit(f"unexpected product manifest baseline: {manifest.get('productVersion')}")
manifest['productVersion'] = NEW
manifest['components']['plugin']['version'] = NEW
manifest['components']['bridge']['requiredVersion'] = '1.6.4'
manifest['components']['bridge']['sha256'] = hashlib.sha256(engine.read_bytes()).hexdigest()
manifest['components']['bridgeManager']['productVersion'] = NEW
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager.read_bytes()).hexdigest()
product_manifest.write_text(json.dumps(manifest, indent=2) + '\n')
