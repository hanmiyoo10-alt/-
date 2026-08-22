'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const requiredEngineVersion = String(manifest.components.bridge.requiredVersion || '');

assert.ok(/^1\.6\.\d+$/.test(requiredEngineVersion), `unexpected bridge contract version: ${requiredEngineVersion}`);
for (const marker of [
  'requestedServiceTierSource',
  'servedServiceTierSource',
  "'requestedServiceTier','requested_service_tier'",
  "'servedServiceTier','served_service_tier'",
  'function normalizeCapturedRecentLogs(root)',
]) assert.ok(engine.includes(marker), `missing Engine service tier marker: ${marker}`);

for (const marker of [
  'function normalizeServiceTierValue(value)',
  'function requestServiceTierText(row)',
  'function requestServiceTierStats(rows)',
  'function requestServiceTierSummary(rows)',
  'requestedServiceTier:preferKnownServiceTier',
  'servedServiceTier:preferKnownServiceTier',
  'function requestLedgerKey(row)',
  'Service tier fidelity:',
  'Service tier source fields:',
  'DevPass account tier:',
  'devpassAccount',
  '<span>Service tier</span>',
  '<span>Routing</span>',
  '<span>Pending tier</span>',
  '<span>Personal org</span>',
]) assert.ok(source.includes(marker), `missing plugin service tier marker: ${marker}`);

assert.ok((source.match(/requestServiceTierText\(row\)/g) || []).length >= 2, 'recent and hourly request rows must both show tier');
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);

console.log(`usage-dashboard P5 per-request service tier fidelity: OK · static tier/source/UI boundaries retained; normalization, display, stats, and dedupe identity delegated to production process harness · ${version} · engine ${requiredEngineVersion}`);
