'use strict';

const fs = require('fs');
const path = require('path');
const {loadPolicy} = require('./contract.cjs');
const {loadProtectedMainContract, observeProtection} = require('./protected-main.cjs');

const START = '<!-- canonical-main-protection-start -->';
const END = '<!-- canonical-main-protection-end -->';

function renderProtectionSection(observation) {
  const checks = observation.requiredChecks.length ? observation.requiredChecks.map((row) => `\`${row}\``).join(', ') : 'none';
  return [
    START,
    '## Protected main',
    '',
    `- Protection state: \`${observation.state}\``,
    `- GitHub branch protected: \`${observation.protected}\``,
    `- Required status-check enforcement: \`${observation.enforcementLevel}\``,
    `- Required target: \`${observation.requiredName}\` / API context \`${observation.requiredApiContext}\` — \`${observation.requiredPresent ? 'PRESENT' : 'NOT_ENFORCED'}\``,
    `- Observed required checks: ${checks}`,
    `- Protected writer gateway: \`${observation.writerGatewayReady ? 'READY' : 'DRIFT'}\` — ${observation.activeWriterCount} active writers`,
    `- Exact-candidate shadow proof: \`${observation.shadowProof}\``,
    `- Automatic native activation attempt: \`${observation.automaticActivationAttempt ? 'ENABLED' : 'DISABLED'}\``,
    `- Soft enforcement fallback: \`${observation.softEnforcementEnabled ? 'ACTIVE' : 'DISABLED'}\` — \`${observation.softEnforcementStrategy}\``,
    `- Soft fallback equals native protection: \`${observation.nativeProtectionEquivalent}\``,
    ...(observation.writerErrors.length ? observation.writerErrors.map((row) => `- Writer contract error: \`${row}\``) : []),
    '- This is direct GitHub governance read-back. A PASS Required run or ACTIVE soft fallback alone does not mean native branch protection is enabled.',
    END,
  ].join('\n');
}

function replaceProtectionSection(body, section) {
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (pattern.test(body)) return body.replace(pattern, section);
  const anchor = '\n## Main-write / durable-memory adapters';
  const index = body.indexOf(anchor);
  if (index >= 0) return `${body.slice(0, index)}\n\n${section}${body.slice(index)}`;
  return `${body.trimEnd()}\n\n${section}\n`;
}

async function refresh() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) throw new Error('GH_TOKEN/GITHUB_TOKEN and GITHUB_REPOSITORY are required');

  async function api(endpoint, options = {}) {
    const response = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'canonical-main-protection-surface',
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${endpoint}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
    if (response.status === 204) return null;
    return response.json();
  }

  const root = process.cwd();
  const policy = loadPolicy();
  const contract = loadProtectedMainContract();
  const branch = await api('/branches/main');
  const observation = observeProtection(branch, {root, policy, contract});
  const issues = (await api('/issues?state=open&per_page=100')).filter((row) => !row.pull_request);
  const issue = issues.find((row) => row.title === policy.operations.issueTitle);
  if (!issue) throw new Error(`canonical main operations issue not found: ${policy.operations.issueTitle}`);
  const body = replaceProtectionSection(issue.body || '', renderProtectionSection(observation));
  if (body !== issue.body) await api(`/issues/${issue.number}`, {method: 'PATCH', body: {body}});
  console.log(`CANONICAL_MAIN_PROTECTION_SURFACE:#${issue.number}:${observation.state}`);
}

async function main() {
  if (process.argv[2] !== 'refresh') throw new Error('usage: protected-main-surface.cjs refresh');
  await refresh();
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});

module.exports = {
  START,
  END,
  renderProtectionSection,
  replaceProtectionSection,
};
