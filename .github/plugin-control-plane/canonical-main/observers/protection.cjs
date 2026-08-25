'use strict';

const {loadProtectedMainContract, observeProtection} = require('../protected-main.cjs');

async function observe(context) {
  const contract = loadProtectedMainContract();
  const observation = observeProtection(context.branch, {root: context.root, policy: context.policy, contract});
  return {known: true, summary: observation.state, events: [], data: observation};
}

module.exports = {observe};
