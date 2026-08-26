'use strict';

const path = require('node:path');
const { createGitHubClient } = require('../infra/github-client.cjs');
const { createIssueStore } = require('../infra/issue-store.cjs');
const { discoverActiveWorkRecords, evaluateDiscoveredWork } = require('./active-work.cjs');
const { loadAdapterRegistry, loadProjectRegistry } = require('./dispatch.cjs');
const { revalidateActiveWorkReceipts } = require('./receipt-shadow.cjs');

async function run({ token, repo, fetchImpl, observedMainSha, rootDir, adapterRegistry, projectRegistry } = {}) {
  const client = createGitHubClient({
    token: token || process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    repo: repo || process.env.GITHUB_REPOSITORY,
    fetchImpl,
    userAgent: 'repository-work-harness-shadow-scan',
  });
  const issueStore = createIssueStore(client);
  const issues = await issueStore.listIssues('open');
  const discovery = discoverActiveWorkRecords(issues);
  const result = evaluateDiscoveredWork(discovery);
  const root = rootDir || path.resolve(__dirname, '../../../..');
  const adapters = adapterRegistry || loadAdapterRegistry(root);
  const projects = projectRegistry || loadProjectRegistry(root);
  const mainSha = observedMainSha || process.env.GITHUB_SHA || '';
  const receiptRevalidation = revalidateActiveWorkReceipts({
    issues,
    discovery,
    observedRefs: mainSha ? { main: mainSha } : {},
    adapterRegistry: adapters,
    projectRegistry: projects,
  });
  return { ...result, receiptRevalidation };
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
