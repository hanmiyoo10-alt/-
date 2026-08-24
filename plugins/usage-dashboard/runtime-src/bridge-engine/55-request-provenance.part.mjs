// 5.71 Cross-Scope Request Provenance normalization.
// Classification authority is explicit request provenance only. Model/provider,
// price, tokens, duration, cache and service tier never participate.
function normalizeRequestUsedMode(value) {
  return String(value || '').trim().toLowerCase();
}

function classifyRequestAccountScope(rawRow, devPassProjectId, creditsOrganizationId) {
  const requestProjectId = String(rawRow?.requestProjectId || '').trim();
  const requestOrganizationId = String(rawRow?.requestOrganizationId || '').trim();
  const requestUsedMode = normalizeRequestUsedMode(rawRow?.requestUsedMode);
  const devPassProject = Boolean(devPassProjectId && requestProjectId && requestProjectId === String(devPassProjectId));
  const creditsBilling = Boolean(
    creditsOrganizationId
    && requestOrganizationId
    && requestOrganizationId === String(creditsOrganizationId)
    && requestUsedMode === 'credits'
  );
  const conflict = devPassProject && creditsBilling;

  if (devPassProject) {
    return { requestAccountScope:'devpass', requestScopeFidelity:'explicit-project', requestScopeConflict:conflict };
  }
  if (creditsBilling) {
    return { requestAccountScope:'credits', requestScopeFidelity:'explicit-org-billing', requestScopeConflict:false };
  }
  return { requestAccountScope:'unknown', requestScopeFidelity:'unknown', requestScopeConflict:false };
}

function classifiedAccountRecentRequests(capturedLogs, devPassProjectId, creditsOrganizationId) {
  const rawRows = Array.isArray(capturedLogs?.rows) ? capturedLogs.rows.slice(0, 100) : [];
  const normalizedRows = normalizeCapturedRecentLogs(capturedLogs).slice(0, 100);
  const rawByRequest = new Map();
  for (const row of rawRows) {
    const requestNumber = String(row?.requestNumber || '');
    if (requestNumber) rawByRequest.set(requestNumber, row);
  }
  return normalizedRows.map((row) => ({
    ...row,
    ...classifyRequestAccountScope(rawByRequest.get(String(row?.requestNumber || '')) || null, devPassProjectId, creditsOrganizationId),
  }));
}

function requestProvenanceSummary(rows, capturedLogs) {
  const list = Array.isArray(rows) ? rows : [];
  const mode = String(capturedLogs?.mode || '');
  const captureMode = mode.startsWith('account-wide-')
    ? 'account-wide'
    : mode.startsWith('project-fallback-')
      ? 'project-fallback'
      : 'unknown';
  return {
    captureMode,
    rows:list.length,
    fallbackCount:captureMode === 'project-fallback' ? 1 : 0,
    devpass:list.filter((row) => row?.requestAccountScope === 'devpass').length,
    credits:list.filter((row) => row?.requestAccountScope === 'credits').length,
    unknown:list.filter((row) => row?.requestAccountScope === 'unknown').length,
    conflict:list.filter((row) => row?.requestScopeConflict === true).length,
    modelInference:0,
    authority:'project-exact+credits-org-used-mode',
  };
}

async function resolvedCreditsOrganizationId(requestedCreditsOrgId = '') {
  try {
    const orgData = await loadOrgs();
    const selection = creditsUsageSelection(orgData, requestedCreditsOrgId);
    return String(selection?.org?.id || '').trim();
  } catch {
    return String(requestedCreditsOrgId || '').trim();
  }
}

const activityForScopeBeforeRequestProvenance = activityForScope;
activityForScope = async function activityForScopeWithRequestProvenance(range = '24h', scope = 'all', creditsOrgId = '', options = {}) {
  const normalizedRange = ['24h','7d','30d'].includes(String(range)) ? String(range) : '24h';
  const normalizedScope = ['all','devpass','credits'].includes(String(scope)) ? String(scope) : 'all';
  const base = await activityForScopeBeforeRequestProvenance(normalizedRange, normalizedScope, creditsOrgId, options);
  if (normalizedRange !== '24h') return base;

  let captured = null;
  try { captured = await loadAccountCapture(); }
  catch { return base; }
  const capturedLogs = captured?.devpassLogs;
  if (!capturedLogs || !Array.isArray(capturedLogs.rows)) return base;

  const status = normalizeIndependentDevPassStatus(captured?.devPlanStatus ?? null);
  const devPassProjectId = String(status?.projectId || '').trim();
  const creditsOrganizationId = await resolvedCreditsOrganizationId(creditsOrgId);
  const allRows = classifiedAccountRecentRequests(capturedLogs, devPassProjectId, creditsOrganizationId);
  const scopedRows = normalizedScope === 'all'
    ? allRows
    : allRows.filter((row) => row.requestAccountScope === normalizedScope);
  const provenance = requestProvenanceSummary(allRows, capturedLogs);

  return {
    ...base,
    recentRequests:scopedRows,
    requestProvenance:provenance,
    source:provenance.captureMode === 'project-fallback'
      ? `${String(base?.source || 'LLMGateway usage')} · /logs DevPass fallback · provenance-v1`
      : `${String(base?.source || 'LLMGateway usage')} · account-wide /logs · provenance-v1`,
  };
};
