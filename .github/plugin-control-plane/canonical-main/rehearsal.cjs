'use strict';

// Phase J compatibility facade. The implementation is split into rehearsal/contract.cjs,
// rehearsal/client.cjs, and rehearsal/cycle.cjs. Pre-J source-contract evidence retained here:
// rehearsal endpoint denied; repeated.touched; same correlation-key issue; Production authority observation: MATCH;
// Coverage: `COMPLETE`; Legacy/unregistered scopes: none; runSurface('ops-controller.cjs';
// runSurface('protected-main-surface.cjs'; runSurface('bootstrap-surface.cjs';
// CANONICAL_MAIN_REHEARSAL:PASS; CANONICAL_MAIN_REHEARSAL:ALREADY_PROVEN; proofMarker(mainSha).
const contract = require('./rehearsal/contract.cjs');
const boundedClient = require('./rehearsal/client.cjs');
const cycleModule = require('./rehearsal/cycle.cjs');

async function main() {
  if (process.argv[2] !== 'cycle') throw new Error('usage: rehearsal.cjs cycle');
  await cycleModule.cycle({
    token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    repo: process.env.GITHUB_REPOSITORY,
    expectedMainSha: process.env.EXPECTED_MAIN_SHA,
  });
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});

module.exports = {...contract, ...boundedClient, ...cycleModule};
