const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  const root = 'plugins/usage-dashboard';
  const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
  const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

  assert.ok(engine.includes("const VERSION = '1.6.11';"));
  assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.57';"));
  assert.equal(manifest.productVersion, '3.0.0-alpha.5.57');
  assert.equal(manifest.components.bridge.requiredVersion, '1.6.11');
  assert.equal(manifest.components.bridgeManager.version, '1.2.6');

  const failureLine = "if (!organizations.length) throw new Error('No organizations found in CLI output');";
  assert.ok(engine.includes(failureLine), 'empty organization result must preserve the pre-5.57 failure contract');

  const orgStart = engine.indexOf('async function loadOrgs() {');
  const orgEnd = engine.indexOf('\nfunction usageOrganizations', orgStart);
  assert.ok(orgStart >= 0 && orgEnd > orgStart, 'loadOrgs must be extractable');
  const orgBlock = engine.slice(orgStart, orgEnd);
  assert.ok(orgBlock.includes("discoveryMode = 'capture-primary'"));
  assert.ok(orgBlock.includes("discoveryMode = 'plain-orgs-fallback'"));
  assert.ok(orgBlock.includes(failureLine));
  assert.ok(
    orgBlock.indexOf("discoveryMode = 'plain-orgs-fallback'") < orgBlock.indexOf(failureLine),
    'legacy plain-orgs fallback must run before declaring the result empty',
  );

  const context = {
    Promise,
    Boolean,
    Date,
    Error,
    cached: async (_name, loader) => loader(),
    normalizeOrganizations: raw => Array.isArray(raw?.organizations) ? raw.organizations.map(row => ({...row})) : [],
    enrichDevPassFromStatus: rows => rows,
    hasDevPassCycleDetails: () => false,
    currentSnapshotAttribution: () => ({}),
    classifyError: () => 'UPSTREAM_ERROR',
    loadAccountCapture: async () => ({ orgs: { organizations: [] } }),
    runCli: async args => {
      if (args[0] === 'credits') return { credits: [] };
      if (args[0] === 'orgs') return { organizations: [] };
      throw new Error(`unexpected CLI ${args[0]}`);
    },
  };
  // Later releases may share the Credits read through a bootstrap wrapper. Keep
  // this fidelity fixture focused on the fallback/error contract, not ownership
  // of the Credits call.
  context.loadCreditsBootstrap = () => context.runCli(['credits', '--json']);
  vm.createContext(context);
  vm.runInContext(`${orgBlock}\nthis.loadOrgs = loadOrgs;`, context);
  await assert.rejects(
    () => context.loadOrgs(),
    /No organizations found in CLI output/,
    'capture-empty + plain-fallback-empty must fail exactly as the prior contract did',
  );

  // A valid fallback still succeeds; this guard must not disable the intended
  // 5.57 fallback path.
  let plainCalls = 0;
  context.loadAccountCapture = async () => { throw new Error('capture unavailable'); };
  context.runCli = async args => {
    if (args[0] === 'credits') return { credits: [] };
    if (args[0] === 'orgs') {
      plainCalls += 1;
      return { organizations: [{ id:'fallback-ok', kind:'default', status:'active' }] };
    }
    throw new Error(`unexpected CLI ${args[0]}`);
  };
  const recovered = await context.loadOrgs();
  assert.equal(plainCalls, 1);
  assert.equal(recovered.organizations[0].id, 'fallback-ok');
  assert.equal(recovered.organizationDiscovery.mode, 'plain-orgs-fallback');
  assert.equal(recovered.organizationDiscovery.fallbackCount, 1);

  console.log('usage-dashboard P19 organization empty fallback fidelity: OK · empty capture+fallback stays an error while valid fallback remains usable');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});