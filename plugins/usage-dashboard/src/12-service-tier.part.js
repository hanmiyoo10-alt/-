
  function normalizeServiceTierValue(value) {
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

  function requestAccountScopeLabel(value) {
    const scope = requestAccountScopeValue(value);
    if (scope === 'devpass') return 'DevPass';
    if (scope === 'credits') return 'Credits';
    return '—';
  }

  function requestServiceTierText(row) {
    const scopeText = requestAccountScopeLabel(row?.requestAccountScope);
    const requested = normalizeServiceTierValue(row?.requestedServiceTier);
    const served = normalizeServiceTierValue(row?.servedServiceTier);
    const label = value => value === 'flex' ? 'FLEX' : value === 'priority' ? 'PRIORITY' : value === 'standard' ? 'STANDARD' : '?';
    let tierText = 'TIER ?';
    if (serviceTierKnown(requested) && serviceTierKnown(served)) {
      tierText = requested === served ? label(served) : `요청 ${label(requested)} → 실제 ${label(served)}`;
    } else if (serviceTierKnown(served)) {
      tierText = `실제 ${label(served)}`;
    } else if (serviceTierKnown(requested)) {
      tierText = `요청 ${label(requested)} · 실제 ?`;
    }
    return `${scopeText} · ${tierText}`;
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
