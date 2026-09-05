
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

  function categoryPair(row) {
    const modelCategory = requestModelCategoryValue(recentRequestValue(row, ['modelCategory','model_category'], 'unknown'));
    return {modelCategory,modelCategorySource:requestModelCategorySourceValue(recentRequestValue(row, ['modelCategorySource','model_category_source'], 'unknown'), modelCategory)};
  }

  function mergeCategory(row, current) {
    return preferKnownModelCategory(row?.modelCategory, row?.modelCategorySource, current?.modelCategory, current?.modelCategorySource);
  }

  function requestModelLifecycleValue(value) {
    const text = String(value || '').trim().toLowerCase();
    return ['active','scheduled','deprecated','deactivated','unknown'].includes(text) ? text : 'unknown';
  }

  function requestModelLifecycleDateTruth(value) {
    if (value === undefined || value === null || value === '') return {present:false,valid:true,value:null};
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? {present:true,valid:true,value:date.toISOString()}
      : {present:true,valid:false,value:null};
  }

  function lifecyclePair(row) {
    const status = requestModelLifecycleValue(recentRequestValue(row, ['modelLifecycleStatus','model_lifecycle_status'], 'unknown'));
    const sourceRaw = String(recentRequestValue(row, ['modelLifecycleSource','model_lifecycle_source'], 'unknown') || '').trim().toLowerCase();
    const deprecated = requestModelLifecycleDateTruth(recentRequestValue(row, ['modelLifecycleDeprecatedAt','model_lifecycle_deprecated_at'], null));
    const deactivated = requestModelLifecycleDateTruth(recentRequestValue(row, ['modelLifecycleDeactivatedAt','model_lifecycle_deactivated_at'], null));
    const requiredDateMissing = (status === 'scheduled' || status === 'deactivated') ? !deactivated.present : status === 'deprecated' ? !deprecated.present : false;
    if (status === 'unknown' || sourceRaw !== 'llmgateway-model-catalog' || !deprecated.valid || !deactivated.valid || requiredDateMissing) {
      return {modelLifecycleStatus:'unknown',modelLifecycleSource:'unknown',modelLifecycleDeprecatedAt:null,modelLifecycleDeactivatedAt:null};
    }
    return {modelLifecycleStatus:status,modelLifecycleSource:'llmgateway-model-catalog',modelLifecycleDeprecatedAt:deprecated.value,modelLifecycleDeactivatedAt:deactivated.value};
  }

  function mergeLifecycle(row, current) {
    void current;
    return lifecyclePair(row);
  }

  function requestModelLifecycleText(row) {
    const lifecycle = lifecyclePair(row);
    if (lifecycle.modelLifecycleStatus === 'active') return '모델 상태 ACTIVE';
    if (lifecycle.modelLifecycleStatus === 'scheduled') return `모델 상태 종료 예정 · ${String(lifecycle.modelLifecycleDeactivatedAt).slice(0,10)}`;
    if (lifecycle.modelLifecycleStatus === 'deprecated') return '모델 상태 DEPRECATED';
    if (lifecycle.modelLifecycleStatus === 'deactivated') return '모델 상태 DEACTIVATED';
    return '모델 상태 —';
  }

  function requestModelLifecycleStats(rows) {
    const stats = {rows:0,active:0,scheduled:0,deprecated:0,deactivated:0,unknown:0};
    for (const row of (Array.isArray(rows) ? rows : [])) {
      const status = lifecyclePair(row).modelLifecycleStatus;
      stats.rows += 1;
      stats[status] += 1;
    }
    return stats;
  }
