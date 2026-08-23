'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {discoverTests, regressionNumber} = require('./registry.cjs');

function withTemp(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-dashboard-test-registry-'));
  try {
    for (const name of files) fs.writeFileSync(path.join(dir, name), `'use strict';\n`, 'utf8');
    return fn(dir);
  } finally {
    fs.rmSync(dir, {recursive:true, force:true});
  }
}

const current = discoverTests();
assert.ok(current.ordered.includes('behavior-request-duration.cjs'));
assert.ok(current.ordered.includes('p34-request-duration-fidelity.cjs'));
assert.ok(current.ordered.indexOf('foundation.cjs') < current.ordered.indexOf('behavior-request-duration.cjs'));
assert.ok(current.ordered.indexOf('behavior-request-duration.cjs') < current.ordered.indexOf('p1-contract.cjs'));

withTemp(['foundation.cjs','registry.cjs','run-all.cjs','behavior-z.cjs','behavior-a.cjs','p10-z.cjs','p2-z.cjs','p2-a.cjs'], (dir) => {
  const suite = discoverTests({testDir:dir, foundationTests:['foundation.cjs'], infrastructureFiles:['registry.cjs','run-all.cjs']});
  assert.deepEqual(suite.behavior, ['behavior-a.cjs','behavior-z.cjs']);
  assert.deepEqual(suite.regressions, ['p2-a.cjs','p2-z.cjs','p10-z.cjs']);
});

withTemp(['foundation.cjs','registry.cjs','run-all.cjs','behavior-new.cjs','p35-new.cjs'], (dir) => {
  const suite = discoverTests({testDir:dir, foundationTests:['foundation.cjs'], infrastructureFiles:['registry.cjs','run-all.cjs']});
  assert.ok(suite.ordered.includes('behavior-new.cjs'));
  assert.ok(suite.ordered.includes('p35-new.cjs'));
});

withTemp(['foundation.cjs','registry.cjs','run-all.cjs','mystery.cjs'], (dir) => {
  assert.throws(() => discoverTests({testDir:dir, foundationTests:['foundation.cjs'], infrastructureFiles:['registry.cjs','run-all.cjs']}), /UNREGISTERED_TEST_FILE:mystery\.cjs/);
});
withTemp(['registry.cjs','run-all.cjs'], (dir) => {
  assert.throws(() => discoverTests({testDir:dir, foundationTests:['foundation.cjs'], infrastructureFiles:['registry.cjs','run-all.cjs']}), /REGISTERED_TEST_MISSING:foundation\.cjs/);
});
withTemp(['foundation.cjs','registry.cjs','run-all.cjs'], (dir) => {
  assert.throws(() => discoverTests({testDir:dir, foundationTests:['foundation.cjs','foundation.cjs'], infrastructureFiles:['registry.cjs','run-all.cjs']}), /DUPLICATE_TEST_REGISTRATION/);
});
withTemp(['foundation.cjs','registry.cjs','run-all.cjs','pX-bad.cjs'], (dir) => {
  assert.throws(() => discoverTests({testDir:dir, foundationTests:['foundation.cjs'], infrastructureFiles:['registry.cjs','run-all.cjs']}), /INVALID_REGRESSION_TEST_NAME:pX-bad\.cjs/);
});
assert.equal(regressionNumber('p1-a.cjs'), 1);
assert.equal(regressionNumber('p10-a.cjs'), 10);
assert.equal(regressionNumber('behavior-a.cjs'), null);

console.log('usage-dashboard test registry contract: OK · hybrid discovery, fail-closed classification, numeric P ordering');
