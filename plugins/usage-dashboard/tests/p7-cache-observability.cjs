const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = 'plugins/usage-dashboard';
const normalize = fs.readFileSync(`${root}/src/10-request-normalize.part.js`, 'utf8');
const ledger = fs.readFileSync(`${root}/src/14-request-ledger.part.js`, 'utf8');
const usage = fs.readFileSync(`${root}/src/16-usage-analytics.part.js`, 'utf8');
const diag = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const markup = fs.readFileSync(`${root}/src/54-dashboard-markup.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');

for (const marker of [
  'function requestCacheMetrics(row)',
  'cacheReadInputTokens',
  'cacheCreationInputTokens',
  'cacheCreation5mTokens',
  'cacheCreation1hTokens',
  'cacheReadRatio'
]) assert.ok(normalize.includes(marker), `missing cache normalize marker: ${marker}`);
assert.ok(ledger.includes('function requestCacheObservabilityStats(rows)'));
assert.ok(ledger.includes('requestCacheDetailText(row)'));
assert.ok(!/requestLedgerKey[\s\S]{0,600}cacheReadInputTokens/.test(ledger), 'cache enrichment must not fragment ledger dedupe key');
assert.ok(usage.includes('cachedInputTokens'));
assert.ok(usage.includes('cacheReadInputTokens'));
assert.ok(usage.includes('cacheCreationInputTokens'));
assert.ok(diag.includes('Cache observability:'));
assert.ok(diag.includes('request HIT rate != token Read ratio'));
assert.ok(markup.includes('요청 캐시 HIT'));
assert.ok(markup.includes('Cache Read'));
assert.ok(markup.includes('Cache Write'));
assert.ok(markup.includes('Token Read Ratio'));
assert.ok(latest.includes('//@version 3.0.0-alpha.5.47'));
console.log('usage-dashboard P7 cache observability: OK · hit/read/write semantics locked');
