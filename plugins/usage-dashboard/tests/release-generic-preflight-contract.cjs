'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const preflight = require('../tools/release_generic_preflight.cjs');

const target = '3.0.0-alpha.5.74';
const stale = "const release={productVersion:'x'}; assert.equal(release.productVersion, '3.0.0-alpha.5.73');\n";
const current = "const release={productVersion:'x'}; assert.equal(release.productVersion, '3.0.0-alpha.5.74');\n";
const lockOnly = "// UD_HISTORICAL_VERSION_LOCK\nconst release={productVersion:'x'}; assert.equal(release.productVersion, '3.0.0-alpha.5.73');\n";
const guardOnly = "const release={productVersion:'x'}; if (release.productVersion !== '3.0.0-alpha.5.73') process.exit(0);\nassert.equal(release.productVersion, '3.0.0-alpha.5.73');\n";
const historical = "const release={productVersion:'x'}; if (release.productVersion !== '3.0.0-alpha.5.73') { process.exit(0); }\n// UD_HISTORICAL_VERSION_LOCK\nassert.equal(release.productVersion, '3.0.0-alpha.5.73');\n";
const wrongGuard = "const release={productVersion:'x'}; if (release.productVersion !== '3.0.0-alpha.5.72') { process.exit(0); }\n// UD_HISTORICAL_VERSION_LOCK\nassert.equal(release.productVersion, '3.0.0-alpha.5.73');\n";

assert.deepEqual(preflight.staleProductAssertions(current,target),[]);
assert.equal(preflight.staleProductAssertions(stale,target)[0].reason,'stale-current-version-assertion');
assert.equal(preflight.staleProductAssertions(lockOnly,target)[0].reason,'historical-scope-missing');
assert.equal(preflight.staleProductAssertions(guardOnly,target)[0].reason,'stale-current-version-assertion');
assert.equal(preflight.staleProductAssertions(wrongGuard,target)[0].reason,'historical-scope-missing');
assert.deepEqual([...preflight.historicalScopeVersions(historical)],['3.0.0-alpha.5.73']);
assert.deepEqual(preflight.staleProductAssertions(historical,target),[]);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'usage-dashboard-preflight-'));
try {
  const tests=path.join(temp,'tests');
  fs.mkdirSync(tests,{recursive:true});
  const spec=path.join(temp,'5.74.json');
  fs.writeFileSync(spec,JSON.stringify({productVersion:target})+'\n');
  fs.writeFileSync(path.join(tests,'current.cjs'),current);
  assert.deepEqual(preflight.inspect(spec,tests),{targetVersion:target,findings:[]});
  fs.writeFileSync(path.join(tests,'stale.cjs'),lockOnly);
  let result=preflight.inspect(spec,tests);
  assert.equal(result.findings.length,1);
  assert.equal(result.findings[0].literal,'3.0.0-alpha.5.73');
  assert.equal(result.findings[0].reason,'historical-scope-missing');
  fs.writeFileSync(path.join(tests,'stale.cjs'),historical);
  assert.deepEqual(preflight.inspect(spec,tests),{targetVersion:target,findings:[]});
} finally {
  fs.rmSync(temp,{recursive:true,force:true});
}

const stage=fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml','utf8');
assert.match(stage,/release_generic_preflight\.cjs --spec "\$RELEASE_SPEC"/);
assert.match(stage,/RELEASE_PREFLIGHT_REJECTED/);
assert.match(stage,/next: release-generic preflight \+ materializing/);

console.log('usage-dashboard E7 release-generic preflight contract: OK · historical exemption requires lock + exact release-version guard · stale current-version literals fail early');
