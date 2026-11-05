import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeCopilotQuota } from '../collector.mjs';

test('explicit null quota fields remain unknown', () => {
  const r = normalizeCopilotQuota({
    premium_interactions: {
      entitlementRequests: null,
      usedRequests: null,
      remainingPercentage: null,
      resetDate: null
    }
  }, '2026-10-27T01:00:00Z');

  assert.equal(r.used, null);
  assert.equal(r.limit, null);
  assert.equal(r.remaining, null);
  assert.equal(r.remainingPercent, null);
});

test('Copilot SDK runtime contract pins supported Node range', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));
  assert.equal(pkg.engines.node, '^20.19.0 || >=22.12.0');
  assert.equal(pkg.dependencies['@github/copilot-sdk'], '1.0.26');
});
