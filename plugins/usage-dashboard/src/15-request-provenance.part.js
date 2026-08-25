
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

  const requestServiceTierTextBeforeProvenance = requestServiceTierText;
  requestServiceTierText = function requestServiceTierTextWithProvenance(row) {
    const scopeText = requestAccountScopeLabel(row?.requestAccountScope);
    const tierText = requestServiceTierTextBeforeProvenance(row);
    return `${scopeText} · ${tierText}`;
  };
