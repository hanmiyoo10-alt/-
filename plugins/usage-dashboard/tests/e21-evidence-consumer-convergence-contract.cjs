'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const evidence = require('../tools/release_evidence_contract_e20.cjs');
const evidenceView = require('../tools/release_evidence_view_e21.cjs');
const specContract = require('../tools/release_spec_contract_e19.cjs');
const versionOrder = require('../tools/release_version_order.cjs');

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json','utf8'));
const currentProduct = String(manifest.productVersion || '');
const releaseDir = '.github/usage-dashboard/releases';
const currentSpecs = fs.readdirSync(releaseDir)
  .filter((name)=>name.endsWith('.json'))
  .map((name)=>JSON.parse(fs.readFileSync(path.join(releaseDir,name),'utf8')))
  .filter((spec)=>spec.productVersion === currentProduct);
assert.equal(currentSpecs.length, 1, `expected one current release spec for ${currentProduct}`);
const currentSpec = currentSpecs[0];

const forwardProduct = versionOrder.nextForwardFixture(currentProduct);
assert.ok(forwardProduct, `current Product must support a local forward fixture: ${currentProduct}`);
assert.equal(versionOrder.compareReleaseVersions(forwardProduct,currentProduct), 1);

const synthetic = JSON.parse(JSON.stringify(currentSpec));
synthetic.productVersion = forwardProduct;
assert.deepEqual(
  specContract.inspectReleaseSpec(synthetic,{currentProductVersion:currentProduct}),
  [],
  'synthetic forward structured spec must satisfy E19+E20 before a real Product bump',
);
const syntheticView = evidenceView.resolveReleaseEvidenceView(synthetic);
assert.equal(syntheticView.mode, 'structured');
assert.ok(syntheticView.acceptedBaseline);
assert.ok(syntheticView.latestInstalled);
assert.ok(syntheticView.display.acceptedBaseline);
assert.ok(syntheticView.display.latestInstalled);

const legacySpec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.96.json','utf8'));
const legacyView = evidenceView.resolveReleaseEvidenceView(legacySpec);
assert.equal(legacyView.mode, 'legacy');
assert.equal(legacyView.acceptedBaseline, null);
assert.equal(legacyView.latestInstalled, null);
assert.ok(legacyView.display.acceptedBaseline);

const extraRole = JSON.parse(JSON.stringify(synthetic));
extraRole.releaseEvidence.thirdRole = {productVersion:currentProduct};
assert.ok(
  evidence.inspectReleaseEvidence(extraRole.releaseEvidence,{targetProductVersion:forwardProduct})
    .some((row)=>row.code === 'release-evidence-key' && row.field === 'releaseEvidence.thirdRole'),
  'unknown evidence role must fail closed',
);

const extraRoleField = JSON.parse(JSON.stringify(synthetic));
extraRoleField.releaseEvidence.acceptedBaseline.trusted = true;
assert.ok(
  evidence.inspectReleaseEvidence(extraRoleField.releaseEvidence,{targetProductVersion:forwardProduct})
    .some((row)=>row.code === 'release-evidence-role-key' && row.field.endsWith('.trusted')),
  'unknown role field must fail closed',
);

const dualOwner = JSON.parse(JSON.stringify(synthetic));
dualOwner.verifiedBaseline = 'shadow legacy owner';
dualOwner.latestInstalledEvidence = 'shadow legacy owner';
const dualFindings = specContract.inspectReleaseSpec(dualOwner,{currentProductVersion:currentProduct});
assert.ok(dualFindings.some((row)=>row.code === 'evidence-legacy-owner' && row.field === 'verifiedBaseline'));
assert.ok(dualFindings.some((row)=>row.code === 'evidence-legacy-owner' && row.field === 'latestInstalledEvidence'));
assert.throws(()=>evidenceView.resolveReleaseEvidenceView(dualOwner), /cannot share ownership/);

const helperSources = [
  'plugins/usage-dashboard/tools/release_version_order.cjs',
  'plugins/usage-dashboard/tools/release_evidence_contract_e20.cjs',
  'plugins/usage-dashboard/tools/release_evidence_view_e21.cjs',
].map((file)=>[file,fs.readFileSync(file,'utf8')]);
for (const [file,source] of helperSources) {
  for (const forbidden of ['node:fs','writeFileSync','setTimeout(','setInterval(','fetch(','https.request','http.request','GITHUB_TOKEN','curl ']) {
    assert.equal(source.includes(forbidden), false, `${file} must remain pure/local: ${forbidden}`);
  }
}

const pythonParity = spawnSync('python3', ['-c', [
  "import json,runpy",
  "ns=runpy.run_path('plugins/usage-dashboard/tools/check_release_monotonic.py')",
  "p=ns['parse_version']",
  "vals=['3.0.0-alpha.5.97','3.0.0-alpha.6.1','3.0.0-rc.1','3.0.0']",
  "print(json.dumps([[p(v).stage,p(v).series,p(v).iteration] for v in vals]))",
].join(';')], {encoding:'utf8'});
assert.equal(pythonParity.status, 0, pythonParity.stderr || pythonParity.stdout);
const pythonKeys = JSON.parse(pythonParity.stdout.trim());
const jsKeys = ['3.0.0-alpha.5.97','3.0.0-alpha.6.1','3.0.0-rc.1','3.0.0']
  .map((value)=>{
    const parsed = versionOrder.parseReleaseVersion(value);
    return [parsed.stage,parsed.series,parsed.iteration];
  });
assert.deepEqual(jsKeys, pythonKeys, 'JS release ordering must match the monotonic publisher policy');

const testsRoot = 'plugins/usage-dashboard/tests';
const directEvidenceNames = ['verifiedBaseline','latestInstalledEvidence','releaseEvidence'];
const offenders = [];
for (const name of fs.readdirSync(testsRoot).filter((entry)=>entry.endsWith('.cjs'))) {
  const file = path.join(testsRoot,name);
  const source = fs.readFileSync(file,'utf8');
  if (!source.includes('helpers/current-release.cjs')) continue;
  for (const marker of directEvidenceNames) {
    if (source.includes(marker)) offenders.push(`${name}:${marker}`);
  }
}
assert.deepEqual(offenders, [], `generic current-release consumers must use evidenceView only: ${offenders.join(',')}`);

const e20Source = fs.readFileSync('plugins/usage-dashboard/tools/release_evidence_contract_e20.cjs','utf8');
assert.ok(e20Source.includes("require('./release_version_order.cjs')"), 'E20 ordering must reuse the shared JS release-order helper');
assert.equal(e20Source.includes("/^3\\.0\\.0-alpha\\.5\\."), false, 'E20 must not retain its old alpha.5-only ordering regex');

console.log(`E21 Evidence Consumer Convergence: OK · ${currentProduct} -> synthetic ${forwardProduct} · closed shape · canonical view · direct-read canary · monotonic-order parity`);
