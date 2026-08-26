'use strict';

const { createGitHubClient } = require('../infra/github-client.cjs');
const { createIssueStore } = require('../infra/issue-store.cjs');
const { scanRepositoryActiveWork } = require('./active-work.cjs');

async function run({ token, repo, fetchImpl } = {}) {
  const client = createGitHubClient({
    token: token || process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    repo: repo || process.env.GITHUB_REPOSITORY,
    fetchImpl,
    userAgent: 'repository-work-harness-shadow-scan',
  });
  const issueStore = createIssueStore(client);
  return scanRepositoryActiveWork({ issueStore });
}

async function main() {
  try {
    const result = await run();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      mode: 'SHADOW',
      scanError: true,
      error: error && error.message ? error.message : String(error),
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { run };
