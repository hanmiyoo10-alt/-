'use strict';

const assert = require('assert');
const {buildIssueListEndpoint, createIssueStore} = require('../infra/issue-store.cjs');
const {loadRefreshIssues, mergeIssueCollections} = require('../orchestrator/refresh.cjs');

assert.equal(
  buildIssueListEndpoint('all', 2, ['control-plane:incident']),
  '/issues?state=all&per_page=100&page=2&labels=control-plane%3Aincident',
  'incident history must use a server-side label filter',
);

assert.deepEqual(
  mergeIssueCollections(
    [{number: 3, state: 'open'}, {number: 1, state: 'open'}],
    [{number: 3, state: 'closed'}, {number: 4, state: 'closed'}],
  ).map((issue) => [issue.number, issue.state]),
  [[1, 'open'], [3, 'closed'], [4, 'closed']],
  'refresh issue inventory must deduplicate by issue number and retain incident-history updates',
);

async function main() {
  const calls = [];
  const client = {
    api: async (endpoint) => {
      calls.push(endpoint);
      if (endpoint === '/issues?state=open&per_page=100&page=1') {
        return [
          {number: 10, state: 'open', labels: []},
          {number: 11, state: 'open', labels: [{name: 'control-plane:incident'}]},
        ];
      }
      if (endpoint === '/issues?state=all&per_page=100&page=1&labels=control-plane%3Aincident') {
        return [
          {number: 11, state: 'open', labels: [{name: 'control-plane:incident'}]},
          {number: 12, state: 'closed', labels: [{name: 'control-plane:incident'}]},
        ];
      }
      throw new Error(`unexpected endpoint: ${endpoint}`);
    },
  };

  const rows = await loadRefreshIssues(createIssueStore(client));
  assert.deepEqual(rows.map((issue) => issue.number), [10, 11, 12]);
  assert.deepEqual(calls, [
    '/issues?state=open&per_page=100&page=1',
    '/issues?state=all&per_page=100&page=1&labels=control-plane%3Aincident',
  ]);

  console.log('CANONICAL_MAIN_ISSUE_STORE_CONTRACTS:OK');
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
