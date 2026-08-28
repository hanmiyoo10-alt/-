'use strict';

const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {composeProofBundle} = require('../proof-bundle.cjs');

const DEFAULT_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 5000;

function ghJson(args) {
  const output = execFileSync('gh', ['api', ...args], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    env: process.env,
  });
  return output.trim() ? JSON.parse(output) : null;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function workflowRuns(repo, workflow, sha, event) {
  const payload = ghJson([
    '--method', 'GET',
    `repos/${repo}/actions/workflows/${workflow}/runs`,
    '-f', `head_sha=${sha}`,
    '-f', `event=${event}`,
    '-f', 'status=completed',
    '-f', 'per_page=100',
  ]) || {};
  return Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
}

function newestRun(rows) {
  return [...rows].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0] || null;
}

function workflowEvidence(repo, workflow, sha, event, withJobs = false) {
  const run = newestRun(workflowRuns(repo, workflow, sha, event));
  if (!run) return null;
  const evidence = {runId: run.id, conclusion: String(run.conclusion || 'unknown')};
  if (!withJobs) return evidence;
  const payload = ghJson([`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`]) || {};
  const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  for (const name of ['Verify', 'Required']) {
    const job = jobs.find((row) => row.name === name);
    evidence[name.toLowerCase()] = job ? String(job.conclusion || 'unknown') : undefined;
  }
  return evidence;
}

function associatedMergedPr(repo, targetSha) {
  const rows = ghJson([
    '-H', 'Accept: application/vnd.github+json',
    `repos/${repo}/commits/${targetSha}/pulls?per_page=100`,
  ]) || [];
  if (!Array.isArray(rows)) return null;
  const exact = rows.find((row) => row.merged_at && row.merge_commit_sha === targetSha && row.base?.ref === 'main');
  const candidate = exact || rows.find((row) => row.merged_at && row.base?.ref === 'main');
  if (!candidate) return null;
  return {
    number: Number(candidate.number),
    headSha: String(candidate.head?.sha || ''),
    mergeSha: String(candidate.merge_commit_sha || ''),
  };
}

function section(body, heading, nextHeading) {
  const start = body.indexOf(heading);
  if (start < 0) return '';
  const from = start + heading.length;
  const end = nextHeading ? body.indexOf(nextHeading, from) : -1;
  return body.slice(from, end < 0 ? body.length : end);
}

function incidentProjection(body, heading, nextHeading, severityPattern) {
  const value = section(body, heading, nextHeading);
  if (!value) return {known: false, count: null};
  if (/none observed within current adapter coverage/i.test(value)) return {known: true, count: 0};
  if (/UNKNOWN|unavailable/i.test(value)) return {known: false, count: null};
  const matches = value.match(severityPattern) || [];
  return {known: true, count: matches.length};
}

function parseOps(body) {
  const state = body.match(/- STATE: `([^`]+)`/)?.[1];
  const main = body.match(/- MAIN: `([0-9a-f]{40})` \/ Required ([A-Z]+)/)?.slice(1);
  const convergence = body.match(/- Convergence: `([^`]+)`/)?.[1];
  const production = body.match(/- AUTHORITY: Production ([A-Z_]+)/)?.[1];
  const unknown = body.match(/- UNKNOWN: ([^\n]+)/)?.[1]?.trim();
  const active = incidentProjection(body, '## Active P0/P1 incidents', '## Attention queue (P2)', /- \*\*P[01]\*\*/g);
  const attention = incidentProjection(body, '## Attention queue (P2)', '## Projects / products', /- \*\*P2\*\*/g);
  return {
    observedSha: main?.[0],
    state,
    convergence,
    requiredPass: main ? main[1] === 'PASS' : undefined,
    productionMatch: production ? production === 'MATCH' : undefined,
    requiredUnknownNone: unknown ? unknown === 'NONE' : undefined,
    activeP0P1Count: active.count,
    attentionCount: attention.count,
    activeP0P1Known: active.known,
    attentionKnown: attention.known,
  };
}

function collectOnce(repo, targetSha) {
  const pr = associatedMergedPr(repo, targetSha) || {};
  const plugin = pr.headSha ? workflowEvidence(repo, 'plugin-control-plane-ci.yml', pr.headSha, 'pull_request', false) : null;
  const simcoreHead = pr.headSha ? workflowEvidence(repo, 'simcore-ci.yml', pr.headSha, 'pull_request', true) : null;
  const simcoreMain = workflowEvidence(repo, 'simcore-ci.yml', targetSha, 'push', true);
  const opsIssue = ghJson([`repos/${repo}/issues/485`]) || {};
  const ops = parseOps(String(opsIssue.body || ''));
  const branch = ghJson([`repos/${repo}/branches/main`]) || {};
  const protection = {
    protected: typeof branch.protected === 'boolean' ? branch.protected : undefined,
    enforcementLevel: branch.protection?.required_status_checks?.enforcement_level || 'unknown',
    requiredChecks: branch.protection?.required_status_checks?.contexts || [],
  };
  return composeProofBundle({
    targetSha,
    pr,
    prHead: {
      plugin: plugin || {},
      simcore: simcoreHead || {},
    },
    mergedMain: simcoreMain || {},
    ops,
    protection,
    incidents: {
      activeP0P1Known: ops.activeP0P1Known,
      activeP0P1Count: ops.activeP0P1Count,
      attentionKnown: ops.attentionKnown,
      attentionCount: ops.attentionCount,
    },
  });
}

function renderSummary(bundle) {
  return [
    '## Canonical Main proof bundle',
    '',
    `- STATE: \`${bundle.state}\``,
    `- ACCEPTANCE_READY: \`${bundle.acceptanceReady}\``,
    `- TARGET: \`${bundle.targetSha || 'UNKNOWN'}\``,
    `- PR: ${bundle.pr.number ? `#${bundle.pr.number}` : 'UNKNOWN'}`,
    `- PR_HEAD: \`${bundle.pr.headSha || 'UNKNOWN'}\``,
    `- MISSING: ${bundle.missing.length ? bundle.missing.join(', ') : 'NONE'}`,
    `- FAILURES: ${bundle.failures.length ? bundle.failures.join(', ') : 'NONE'}`,
    '',
    '> Read-only evidence bundle. Repository/Git/CI/release authorities remain authoritative.',
  ].join('\n');
}

function writeBundle(bundle) {
  const dir = path.join(process.cwd(), '.artifacts');
  fs.mkdirSync(dir, {recursive: true});
  const file = path.join(dir, 'canonical-main-proof-bundle.json');
  fs.writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${renderSummary(bundle)}\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `bundle_state=${bundle.state}\nacceptance_ready=${bundle.acceptanceReady}\n`);
  }
  return file;
}

function run() {
  const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
  const targetSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim();
  if (!repo) throw new Error('proof-bundle missing GITHUB_REPOSITORY');
  if (!targetSha) throw new Error('proof-bundle missing TARGET_SHA');
  if (!process.env.GH_TOKEN) throw new Error('proof-bundle missing GH_TOKEN');

  const attempts = Math.max(1, Number(process.env.PROOF_BUNDLE_ATTEMPTS || DEFAULT_ATTEMPTS));
  const delayMs = Math.max(0, Number(process.env.PROOF_BUNDLE_DELAY_MS || DEFAULT_DELAY_MS));
  let bundle = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    bundle = collectOnce(repo, targetSha);
    console.log(`CANONICAL_MAIN_PROOF_BUNDLE:${bundle.state}:acceptanceReady=${bundle.acceptanceReady}:attempt=${attempt}`);
    if (bundle.acceptanceReady || attempt === attempts) break;
    sleep(delayMs);
  }
  writeBundle(bundle);
}

if (require.main === module) {
  const command = process.argv[2] || 'compose';
  if (command !== 'compose') throw new Error(`proof-bundle unknown command: ${command}`);
  run();
}

module.exports = {
  associatedMergedPr,
  collectOnce,
  incidentProjection,
  parseOps,
  renderSummary,
  workflowEvidence,
};
