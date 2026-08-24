
  function requestAccountScopeValue(value) {
    const text = String(value || '').trim().toLowerCase();
    return ['devpass','credits','unknown'].includes(text) ? text : 'unknown';
  }

  function requestScopeFidelityValue(value, scope = 'unknown') {
    const text = String(value || '').trim().toLowerCase();
    const normalizedScope = requestAccountScopeValue(scope);
    if (normalizedScope === 'devpass' && text === 'explicit-project') return text;
    if (normalizedScope === 'credits' && text === 'explicit-org-billing') return text;
    return 'unknown';
  }

  function requestAccountScopeLabel(value) {
    const scope = requestAccountScopeValue(value);
    if (scope === 'devpass') return 'DevPass';
    if (scope === 'credits') return 'Credits';
    return '—';
  }

  function requestAccountScopeStats(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const stats = {rows:list.length,devpass:0,credits:0,unknown:0,conflict:0};
    for (const row of list) {
      const scope = requestAccountScopeValue(row?.requestAccountScope);
      stats[scope] += 1;
      if (row?.requestScopeConflict === true) stats.conflict += 1;
    }
    return stats;
  }

  const normalizeRecentRequestRowsBeforeProvenance = normalizeRecentRequestRows;
  normalizeRecentRequestRows = function normalizeRecentRequestRowsWithProvenance(rows, limit = 12) {
    const normalized = normalizeRecentRequestRowsBeforeProvenance(rows, limit);
    const sourceByRequest = new Map();
    for (const row of (Array.isArray(rows) ? rows : [])) {
      if (!row || typeof row !== 'object') continue;
      const requestNumberRaw = recentRequestValue(row, ['id','requestId','request_id','sequence','seq','requestNumber','request_number','number'], null);
      const requestNumber = requestNumberRaw !== null && requestNumberRaw !== undefined && requestNumberRaw !== '' ? String(requestNumberRaw) : '';
      if (requestNumber) sourceByRequest.set(requestNumber, row);
    }
    return normalized.map((row) => {
      const source = sourceByRequest.get(String(row?.requestNumber || '')) || null;
      const scope = requestAccountScopeValue(recentRequestValue(source || {}, ['requestAccountScope','request_account_scope'], 'unknown'));
      return {
        ...row,
        requestAccountScope:scope,
        requestScopeFidelity:requestScopeFidelityValue(recentRequestValue(source || {}, ['requestScopeFidelity','request_scope_fidelity'], 'unknown'), scope),
        requestScopeConflict:source?.requestScopeConflict === true,
      };
    });
  };

  const requestLedgerRowsForScopeBeforeProvenance = requestLedgerRowsForScope;
  requestLedgerRowsForScope = function requestLedgerRowsForScopeWithProvenance(scopeKey) {
    const key = ['all','devpass','credits'].includes(String(scopeKey)) ? String(scopeKey) : 'all';
    const rows = requestLedgerRowsForScopeBeforeProvenance('all');
    if (key === 'all') return rows;
    return rows.filter((row) => requestAccountScopeValue(row?.requestAccountScope) === key);
  };

  const requestServiceTierTextBeforeProvenance = requestServiceTierText;
  requestServiceTierText = function requestServiceTierTextWithProvenance(row) {
    const scopeText = requestAccountScopeLabel(row?.requestAccountScope);
    const tierText = requestServiceTierTextBeforeProvenance(row);
    return `${scopeText} · ${tierText}`;
  };
