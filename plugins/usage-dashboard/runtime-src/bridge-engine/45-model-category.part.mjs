let modelCategoryCatalogMap = null;
let modelCategoryCatalogLoad = null;
let modelCategoryCatalogStatus = Object.freeze({modelCatalogState:'unavailable',modelCatalogVersion:'',modelCatalogExpectedVersion:MODEL_CATALOG_VERSION});

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

async function ensureModelCategoryCatalog() {
  if (modelCategoryCatalogMap instanceof Map) return modelCategoryCatalogMap;
  if (modelCategoryCatalogLoad) return modelCategoryCatalogLoad;
  modelCategoryCatalogLoad = (async () => {
    try {
      const runtime = await managedCliRuntime();
      if (runtime?.state !== 'ready' || runtime?.modelCatalogState !== 'ready' || runtime?.modelCatalogVersion !== MODEL_CATALOG_VERSION || !runtime?.modelCatalogEntry) {
        throw new Error('managed model catalog pair unavailable');
      }
      const module = await import(pathToFileURL(runtime.modelCatalogEntry).href);
      if (!Array.isArray(module?.models)) throw new Error('managed model catalog export missing models[]');
      const derived = buildModelCategoryMap(module.models);
      if (!derived.size) throw new Error('managed model catalog produced empty classification map');
      modelCategoryCatalogMap = derived;
      modelCategoryCatalogStatus = Object.freeze({modelCatalogState:'ready',modelCatalogVersion:MODEL_CATALOG_VERSION,modelCatalogExpectedVersion:MODEL_CATALOG_VERSION});
      return derived;
    } catch {
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
  return rows.map((row) => ({...row, ...classifyModelCategoryFromMap(row?.model, modelCategoryCatalogMap)}));
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
