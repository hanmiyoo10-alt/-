
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

  function requestModelCategoryValue(value) {
    const text = String(value || '').trim().toLowerCase();
    return ['premium','regular','unknown'].includes(text) ? text : 'unknown';
  }

  function requestModelCategorySourceValue(value, category = 'unknown') {
    const text = String(value || '').trim().toLowerCase();
    return requestModelCategoryValue(category) !== 'unknown' && text === 'llmgateway-model-catalog'
      ? 'llmgateway-model-catalog'
      : 'unknown';
  }

  function preferKnownModelCategory(incomingCategory, incomingSource, currentCategory, currentSource) {
    const incoming = requestModelCategoryValue(incomingCategory);
    if (incoming !== 'unknown') return {modelCategory:incoming,modelCategorySource:requestModelCategorySourceValue(incomingSource, incoming)};
    const current = requestModelCategoryValue(currentCategory);
    if (current !== 'unknown') return {modelCategory:current,modelCategorySource:requestModelCategorySourceValue(currentSource, current)};
    return {modelCategory:'unknown',modelCategorySource:'unknown'};
  }

  function requestModelCategoryText(row) {
    const category = requestModelCategoryValue(row?.modelCategory);
    if (category === 'premium') return 'Premium';
    if (category === 'regular') return 'Regular';
    return '?';
  }

  function requestModelCategoryStats(rows) {
    const stats = {rows:0,premium:0,regular:0,unknown:0};
    for (const row of (Array.isArray(rows) ? rows : [])) {
      const category = requestModelCategoryValue(row?.modelCategory);
      stats.rows += 1;
      stats[category] += 1;
    }
    return stats;
  }
