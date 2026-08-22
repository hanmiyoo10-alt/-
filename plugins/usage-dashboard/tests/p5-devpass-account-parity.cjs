const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const usage = ['10-request-normalize.part.js','12-service-tier.part.js','14-request-ledger.part.js','16-usage-analytics.part.js'].map(file => fs.readFileSync(`${root}/src/${file}`, 'utf8')).join('');
const ui = ['50-dashboard-context.part.js','52-analytics-context.part.js','54-dashboard-markup.part.js'].map(file => fs.readFileSync(`${root}/src/${file}`, 'utf8')).join('');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const requiredEngineVersion = String(manifest.components.bridge.requiredVersion || '');

for (const marker of [
  'cycle:ds.cycle',
  'billingCycleStart:ds.billingCycleStart',
  'expiresAt:ds.expiresAt',
  'cancelled:ds.cancelled === true',
  'hasBillingHistory:',
  'resetPasses:num(ds.resetPasses)',
  'includedResetPasses:num(ds.includedResetPasses)',
  'includedResetPassesRemaining:num(ds.includedResetPassesRemaining)',
  'resetPassPrice:num(ds.resetPassPrice)',
  'regularCredits:num(ds.regularCredits)',
]) assert.ok(usage.includes(marker), `missing DevPass account adapter field: ${marker}`);

for (const marker of [
  'DevPass account',
  'Reset Pass · PAYG',
  '<span>Plan</span>',
  '<span>Cycle</span>',
  '<span>Status</span>',
  '<span>Service tier</span>',
  '<span>Routing</span>',
  '<span>Pending tier</span>',
  '<span>Personal org</span>',
  '<span>Billing history</span>',
  '<span>총 사용 가능</span>',
  '<span>구매/보유 패스</span>',
  '<span>기본 패스 남음</span>',
  '<span>Reset Pass 가격</span>',
  '<span>PAYG overflow</span>',
  '<span>Regular Credits</span>',
]) assert.ok(ui.includes(marker), `missing DevPass parity UI marker: ${marker}`);

assert.ok(ui.includes("dashboardView === 'devpass' ? devpassAccountDetailHtml : ''"), 'DevPass parity boxes must be scoped to DevPass tab');
assert.ok(diagnostics.includes('DevPass account detail:'), 'DevPass account detail diagnostics missing');
assert.ok(!ui.includes('<span>Organization ID</span>') && !ui.includes('<span>Project ID</span>'), 'internal identifiers must remain hidden');
assert.ok(/^1\.6\.\d+$/.test(requiredEngineVersion), `unexpected bridge contract version: ${requiredEngineVersion}`);
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);
console.log(`usage-dashboard P5 DevPass account detail parity: OK · engine ${requiredEngineVersion}`);
