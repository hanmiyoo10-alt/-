import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectSnapshot, normalizeCopilotQuota, unknownProvider } from '../collector.mjs';

test('copilot explicit zero stays zero', () => {
  const r = normalizeCopilotQuota({ premium_interactions: { entitlementRequests: 100, usedRequests: 100, remainingPercentage: 0, resetDate: '2026-11-01T00:00:00Z' } }, '2026-10-27T01:00:00Z');
  assert.equal(r.remaining, 0);
  assert.equal(r.remainingPercent, 0);
  assert.equal(r.fidelity, 'observed');
});

test('missing quota stays unknown', () => {
  const r = normalizeCopilotQuota({}, '2026-10-27T01:00:00Z');
  assert.equal(r.remaining, null);
  assert.equal(r.limit, null);
  assert.equal(r.fidelity, 'unknown');
});

test('unlimited sentinel stays unlimited', () => {
  const r = normalizeCopilotQuota({ premium_interactions: { entitlementRequests: -1, usedRequests: 4, remainingPercentage: 100 } });
  assert.equal(r.status, 'unlimited');
  assert.equal(r.limit, -1);
  assert.equal(r.remaining, null);
});

test('unknown provider never fabricates quantities', () => {
  const r = unknownProvider('vertex', 'not-verified');
  assert.equal(r.used, null);
  assert.equal(r.remaining, null);
});

test('snapshot keeps Vertex and AI Studio unknown', async () => {
  const s = await collectSnapshot({ copilotReader: async () => normalizeCopilotQuota({ premium_interactions: { entitlementRequests: 100, usedRequests: 25, remainingPercentage: 75 } }) });
  assert.equal(s.providers.copilot.remaining, 75);
  assert.equal(s.providers.vertex.remaining, null);
  assert.equal(s.providers.ais.remaining, null);
});

test('Risu surface is mini-floating only and secret-free', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const plugin = fs.readFileSync(path.join(here, '..', 'provider-balance-mini.plugin.js'), 'utf8');
  assert.match(plugin, /position:fixed/);
  assert.match(plugin, /requestPluginPermission\('mainDom'\)/);
  assert.match(plugin, /127\.0\.0\.1:39221/);
  assert.match(plugin, /Risuai\.nativeFetch/);
  assert.doesNotMatch(plugin, /registerSetting\(|registerButton\(|openSettings|dashboard/i);
  assert.doesNotMatch(plugin, /copilot_internal|private_key|client_secret|api[_-]?key/i);
});
