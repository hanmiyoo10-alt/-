let modelCategoryCatalogMap = null;
let modelLifecycleCatalogMap = null;
let modelCategoryCatalogLoad = null;
let modelCategoryCatalogStatus = Object.freeze({modelCatalogState:'unavailable',modelCatalogVersion:'',modelCatalogExpectedVersion:MODEL_CATALOG_VERSION});
const MODEL_LIFECYCLE_NOTICE_MS = 90 * 24 * 60 * 60 * 1000;

function normalizeModelCategoryId(usedModel) {
  const value = typeof usedModel === 'string' ? usedModel.trim() : '';
  if (!value) return '';
  const slashIndex = value.indexOf('/');
  const withoutProvider = slashIndex === -1 ? value : value.slice(slashIndex + 1);
  const colonIndex = withoutProvider.indexOf(':');
  return (colonIndex === -1 ? withoutProvider : withoutProvider.slice(0, colonIndex)).trim();
}

function modelCategoryFinitePrice(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number.parseFloat(String(value));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function buildModelCategoryMap(models) {
  const out = new Map();
  if (!Array.isArray(models)) return out;
  for (const model of models) {
    const id = typeof model?.id === 'string' ? model.id.trim() : '';
    if (!id) continue;
    let premium = false;
    for (const provider of (Array.isArray(model?.providers) ? model.providers : [])) {
      const inputPrice = modelCategoryFinitePrice(provider?.inputPrice);
      const outputPrice = modelCategoryFinitePrice(provider?.outputPrice);
      if ((inputPrice !== null && inputPrice >= 5e-6) || (outputPrice !== null && outputPrice >= 15e-6)) {
        premium = true;
        break;
      }
    }
    out.set(id, premium ? 'premium' : 'regular');
  }
  return out;
}

function classifyModelCategoryFromMap(usedModel, catalogMap) {
  const id = normalizeModelCategoryId(usedModel);
  if (!id || !(catalogMap instanceof Map) || !catalogMap.has(id)) {
    return {modelCategory:'unknown',modelCategorySource:'unknown'};
  }
  const value = catalogMap.get(id);
  if (!['premium','regular'].includes(value)) return {modelCategory:'unknown',modelCategorySource:'unknown'};
  return {modelCategory:value,modelCategorySource:'llmgateway-model-catalog'};
}

function buildModelLifecycleMap(models) {
  const out = new Map();
  if (!Array.isArray(models)) return out;
  for (const model of models) {
    const id = typeof model?.id === 'string' ? model.id.trim() : '';
    if (!id) continue;
    const mappings = (Array.isArray(model?.providers) ? model.providers : []).map((mapping) => ({
      providerId:typeof mapping?.providerId === 'string' ? mapping.providerId.trim() : '',
      deprecatedAt:mapping?.deprecatedAt ?? null,
      deactivatedAt:mapping?.deactivatedAt ?? null,
    })).filter((mapping) => mapping.providerId);
    out.set(id, mappings);
  }
  return out;
}

function modelLifecycleDateTruth(value) {
  if (value === undefined || value === null || value === '') return {present:false,valid:true,time:null,iso:null};
  const date = new Date(value);
  const time = date.getTime();
  return Number.isFinite(time)
    ? {present:true,valid:true,time,iso:date.toISOString()}
    : {present:true,valid:false,time:null,iso:null};
}

function unknownModelLifecycle() {
  return {modelLifecycleStatus:'unknown',modelLifecycleSource:'unknown',modelLifecycleDeprecatedAt:null,modelLifecycleDeactivatedAt:null};
}

function classifyModelLifecycleFromMap(usedModel, usedProvider, catalogMap, now = Date.now()) {
  const id = normalizeModelCategoryId(usedModel);
  const providerId = typeof usedProvider === 'string' ? usedProvider.trim() : '';
  if (!id || !providerId || !(catalogMap instanceof Map) || !catalogMap.has(id)) return unknownModelLifecycle();
  const matches = (Array.isArray(catalogMap.get(id)) ? catalogMap.get(id) : []).filter((mapping) => mapping?.providerId === providerId);
  if (matches.length !== 1) return unknownModelLifecycle();
  const mapping = matches[0];
  const deprecated = modelLifecycleDateTruth(mapping?.deprecatedAt);
  const deactivated = modelLifecycleDateTruth(mapping?.deactivatedAt);
  if (!deprecated.valid || !deactivated.valid || !Number.isFinite(Number(now))) return unknownModelLifecycle();
  const nowMs = Number(now);
  let status = 'active';
  if (deactivated.present && deactivated.time <= nowMs) status = 'deactivated';
  else if (deactivated.present && deactivated.time > nowMs && deactivated.time - nowMs <= MODEL_LIFECYCLE_NOTICE_MS) status = 'scheduled';
  else if (deprecated.present) status = 'deprecated';
  return {
    modelLifecycleStatus:status,
    modelLifecycleSource:'llmgateway-model-catalog',
    modelLifecycleDeprecatedAt:deprecated.iso,
    modelLifecycleDeactivatedAt:deactivated.iso,
  };
}

async function ensureModelCategoryCatalog() {
  if (modelCategoryCatalogMap instanceof Map && modelLifecycleCatalogMap instanceof Map) return modelCategoryCatalogMap;
  if (modelCategoryCatalogLoad) return modelCategoryCatalogLoad;
  modelCategoryCatalogLoad = (async () => {
    try {
      const runtime = await managedCliRuntime();
      if (runtime?.state !== 'ready' || runtime?.modelCatalogState !== 'ready' || runtime?.modelCatalogVersion !== MODEL_CATALOG_VERSION || !runtime?.modelCatalogEntry) {
        throw new Error('managed model catalog pair unavailable');
      }
      const module = await import(pathToFileURL(runtime.modelCatalogEntry).href);
      if (!Array.isArray(module?.models)) throw new Error('managed model catalog export missing models[]');
      const categoryMap = buildModelCategoryMap(module.models);
      const lifecycleMap = buildModelLifecycleMap(module.models);
      if (!categoryMap.size || !lifecycleMap.size) throw new Error('managed model catalog produced empty enrichment map');
      modelCategoryCatalogMap = categoryMap;
      modelLifecycleCatalogMap = lifecycleMap;
      modelCategoryCatalogStatus = Object.freeze({modelCatalogState:'ready',modelCatalogVersion:MODEL_CATALOG_VERSION,modelCatalogExpectedVersion:MODEL_CATALOG_VERSION});
      return categoryMap;
    } catch {
      modelCategoryCatalogMap = null;
      modelLifecycleCatalogMap = null;
      modelCategoryCatalogStatus = Object.freeze({modelCatalogState:'unavailable',modelCatalogVersion:'',modelCatalogExpectedVersion:MODEL_CATALOG_VERSION});
      return null;
    } finally {
      modelCategoryCatalogLoad = null;
    }
  })();
  return modelCategoryCatalogLoad;
}

const loadAccountCaptureBeforeModelCategory = loadAccountCapture;
loadAccountCapture = async function loadAccountCaptureWithModelCategory() {
  await ensureModelCategoryCatalog();
  return loadAccountCaptureBeforeModelCategory();
};

const normalizeCapturedRecentLogsBeforeModelCategory = normalizeCapturedRecentLogs;
normalizeCapturedRecentLogs = function normalizeCapturedRecentLogsWithModelCategory(root) {
  const rows = normalizeCapturedRecentLogsBeforeModelCategory(root);
  return rows.map((row) => ({
    ...row,
    ...classifyModelCategoryFromMap(row?.model, modelCategoryCatalogMap),
    ...classifyModelLifecycleFromMap(row?.model, row?.provider, modelLifecycleCatalogMap),
  }));
};

const managedCliDiagnosticsBeforeModelCategory = managedCliDiagnostics;
managedCliDiagnostics = async function managedCliDiagnosticsWithModelCategory() {
  const runtime = await managedCliDiagnosticsBeforeModelCategory();
  await ensureModelCategoryCatalog();
  return {
    ...runtime,
    modelCatalogState:modelCategoryCatalogStatus.modelCatalogState,
    modelCatalogVersion:modelCategoryCatalogStatus.modelCatalogVersion,
    modelCatalogExpectedVersion:modelCategoryCatalogStatus.modelCatalogExpectedVersion,
  };
};
