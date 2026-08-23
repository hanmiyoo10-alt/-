'use strict';

const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {discoverTests} = require('./registry.cjs');

function main() {
  const suite = discoverTests();
  for (const filename of suite.ordered) {
    const absolute = path.join(suite.testDir, filename);
    console.log(`RUN_TEST:${filename}`);
    const result = spawnSync(process.execPath, [absolute], {stdio:'inherit', env:process.env});
    if (result.error) {
      console.error(`TEST_FAILED:${filename}:${result.error.message}`);
      process.exitCode = 1;
      return;
    }
    if (result.status !== 0) {
      console.error(`TEST_FAILED:${filename}:exit=${result.status}`);
      process.exitCode = result.status || 1;
      return;
    }
  }
  console.log(`TEST_REGISTRY_GREEN:${suite.ordered.length}`);
}

if (require.main === module) main();
