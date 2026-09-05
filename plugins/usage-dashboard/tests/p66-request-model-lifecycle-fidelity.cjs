'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
if (release.productVersion !== '3.0.0-alpha.5.100') {
  const categorySource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs', 'utf8');
  const provenance = fs.readFileSync('plugins/usage-dashboard/src/15-request-provenance.part.js', 'utf8');
  const ledger = fs.readFileSync('plugins/usage-dashboard/src/14-request-ledger.part.js', 'utf8');
  const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
  for (const marker of [
    'function buildModelLifecycleMap(models)',
    'function classifyModelLifecycleFromMap(usedModel, usedProvider, catalogMap, now = Date.now())',
    'mapping?.providerId === providerId',
    "modelLifecycleSource:'llmgateway-model-catalog'",
  ]) assert.ok(categorySource.includes(marker), `P66 forward lifecycle marker missing: ${marker}`);
  for (const marker of [
    'function lifecyclePair(row)',
    'function mergeLifecycle(row, current)',
    'void current;',
    'function requestModelLifecycleText(row)',
    'function requestModelLifecycleStats(rows)',
  ]) assert.ok(provenance.includes(marker), `P66 forward provenance marker missing: ${marker}`);
  const keyStart = ledger.indexOf('function requestLedgerKey(row)');
  const keyEnd = ledger.indexOf('function collectRecentRequestLedger(data)', keyStart);
  assert.ok(keyStart >= 0 && keyEnd > keyStart, 'P66 forward request identity boundary missing');
  const keySource = ledger.slice(keyStart, keyEnd);
  for (const forbidden of ['modelLifecycleStatus','modelLifecycleSource','modelLifecycleDeprecatedAt','modelLifecycleDeactivatedAt']) {
    assert.equal(keySource.includes(forbidden), false, `P66 forward lifecycle must remain outside request identity: ${forbidden}`);
  }
  assert.ok(diagnostics.includes('Model lifecycle fidelity:'), 'P66 forward lifecycle diagnostics must remain present');
  assert.ok(fs.statSync('plugins/usage-dashboard/src/14-request-ledger.part.js').size <= 38 * 1024, 'P66 forward request ledger owner must remain within 38 KiB hard ceiling');
  console.log(`P66 Request Model Lifecycle Fidelity: FORWARD-PRESERVED · candidate ${release.productVersion}`);
} else {
  // UD_HISTORICAL_VERSION_LOCK
  assert.equal(release.productVersion, '3.0.0-alpha.5.100');
  require('./p66-request-model-lifecycle-fidelity.legacy.js');
}
