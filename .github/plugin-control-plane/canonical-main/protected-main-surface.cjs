'use strict';

const surface = require('./surfaces/protection.cjs');
const {refresh} = require('./orchestrator/refresh.cjs');

async function main() {
  if (process.argv[2] !== 'refresh') throw new Error('usage: protected-main-surface.cjs refresh');
  await refresh();
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});

module.exports = {...surface, refresh};
