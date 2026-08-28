
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

  function normalizeServiceTierSelectionSource(value) {
    const text = String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
    if (text === 'request') return 'request';
    if (text === 'coding-plan-default') return 'coding-plan-default';
    return 'unknown';
  }

  function serviceTierSelectionSourceKnown(value) {
    return ['request','coding-plan-default'].includes(normalizeServiceTierSelectionSource(value));
  }

  function preferKnownServiceTierSelectionSource(next, current) {
    const nextSource = normalizeServiceTierSelectionSource(next);
    const currentSource = normalizeServiceTierSelectionSource(current);
    if (serviceTierSelectionSourceKnown(nextSource)) return nextSource;
    if (serviceTierSelectionSourceKnown(currentSource)) return currentSource;
    return 'unknown';
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

  function requestServiceTierSelectionSourceText(row) {
    const source = normalizeServiceTierSelectionSource(row?.serviceTierSelectionSource);
    if (source === 'request') return '요청 지정';
    if (source === 'coding-plan-default') return '플랜 기본';
    return '';
  }

  function requestServiceTierStats(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const stats = {
      rows:list.length, requestedKnown:0, servedKnown:0,
      flex:0, standard:0, priority:0, unknown:0,
      requested:{flex:0,standard:0,priority:0,unknown:0},
      served:{flex:0,standard:0,priority:0,unknown:0},
      selectionSource:{request:0,planDefault:0,unknown:0},
      requestedSources:[], servedSources:[]
    };
    const requestedSources = new Set();
    const servedSources = new Set();
    for (const row of list) {
      const requested = normalizeServiceTierValue(row?.requestedServiceTier);
      const served = normalizeServiceTierValue(row?.servedServiceTier);
      const selection = normalizeServiceTierSelectionSource(row?.serviceTierSelectionSource);
      if (serviceTierKnown(requested)) {
        stats.requestedKnown += 1;
        stats.requested[requested] += 1;
      } else stats.requested.unknown += 1;
      if (serviceTierKnown(served)) {
        stats.servedKnown += 1;
        stats[served] += 1;
        stats.served[served] += 1;
      } else {
        stats.unknown += 1;
        stats.served.unknown += 1;
      }
      if (selection === 'request') stats.selectionSource.request += 1;
      else if (selection === 'coding-plan-default') stats.selectionSource.planDefault += 1;
      else stats.selectionSource.unknown += 1;
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
