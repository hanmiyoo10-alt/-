'use strict';

// Phase J compatibility facade. Runtime orchestration uses observers/ through modules/registry.cjs.
// Compatibility evidence markers retained for pre-J contracts: observationEpoch, MAIN_WRITE_RETRY_EXHAUSTED,
// MAIN_WRITE_CONTENT_CONFLICT, MEMORY_SYNC_PATH_ESCAPE. Their implementation lives in observers/writer-workflows.cjs.
const {stableEventId, safeObserve} = require('./observers/common.cjs');
const requiredCi = require('./observers/required-ci.cjs');
const productionAuthority = require('./observers/production-authority.cjs');
const writers = require('./observers/writer-workflows.cjs');
const bootstrap = require('./observers/bootstrap.cjs');

async function observeRequiredCi(apiOrContext, mainSha) {
  if (apiOrContext?.actions) return requiredCi.observe(apiOrContext);
  throw new Error('observeRequiredCi compatibility call requires modular context');
}

async function observeProductionAuthority(apiOrContext) {
  if (apiOrContext?.repoFiles) return productionAuthority.observe(apiOrContext);
  throw new Error('observeProductionAuthority compatibility call requires modular context');
}

function descriptorFiles(root = process.cwd()) {
  const {loadPolicy} = require('./contract.cjs');
  return bootstrap.descriptorFiles(root, loadPolicy());
}

function observeBootstrap(root = process.cwd()) {
  const {loadPolicy} = require('./contract.cjs');
  return bootstrap.observe({root, policy: loadPolicy()});
}

async function observeAll(context) {
  const [requiredResult, productionResult, writerResult] = await Promise.all([
    safeObserve('required-ci', () => requiredCi.observe(context)),
    safeObserve('production-authority', () => productionAuthority.observe(context)),
    safeObserve('writers', () => writers.observe(context)),
  ]);
  let bootstrapResult;
  try {
    bootstrapResult = await bootstrap.observe(context);
  } catch (error) {
    bootstrapResult = {known: false, summary: `UNKNOWN — bootstrap adapter error: ${error.message}`, statuses: [], events: [], data: null};
  }
  const writerRows = writerResult.data || [];
  return {
    requiredCi: requiredResult,
    productionAuthority: productionResult,
    writers: writerRows,
    bootstrap: bootstrapResult,
    events: [...(requiredResult.events || []), ...(productionResult.events || []), ...(writerResult.events || []), ...(bootstrapResult.events || [])],
    coverage: {
      requiredCi: requiredResult.known,
      productionAuthority: productionResult.known,
      writers: writerResult.known,
      bootstrap: bootstrapResult.known,
      complete: requiredResult.known && productionResult.known && writerResult.known && bootstrapResult.known,
    },
  };
}

module.exports = {
  stableEventId,
  requiredCiEvent: requiredCi.requiredCiEvent,
  runAtOrAfterEpoch: writers.runAtOrAfterEpoch,
  latestRelevantRun: writers.latestRelevantRun,
  scanFailedRun: writers.scanFailedRun,
  memoryEvent: writers.memoryEvent,
  descriptorFiles,
  bootstrapEvent: bootstrap.bootstrapEvent,
  observeBootstrap,
  observeRequiredCi,
  observeProductionAuthority,
  observeAll,
};
