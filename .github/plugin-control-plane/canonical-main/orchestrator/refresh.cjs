'use strict';

const fs = require('fs');
const path = require('path');
const {loadPolicy, deriveOperatorState} = require('../contract.cjs');
const {createGitHubClient} = require('../infra/github-client.cjs');
const {createIssueStore} = require('../infra/issue-store.cjs');
const {createActionsStore} = require('../infra/actions-store.cjs');
const {createRepoFiles} = require('../infra/repo-files.cjs');
const {safeObserve} = require('../observers/common.cjs');
const deliveryReceipts = require('../observers/delivery-receipts.cjs');
const {modules} = require('../modules/registry.cjs');
const {deriveCoverage} = require('../domains/bootstrap.cjs');
const {incidentFromIssue, planIncident} = require('../domains/incidents.cjs');
const {renderIncidentBody} = require('../surfaces/incidents.cjs');
const {renderOpsView} = require('../surfaces/ops-view.cjs');

const LABEL_DEFS = [['control-plane:operations','5319e7','Canonical main repository operations surface'],['control-plane:incident','b60205','Canonical main normalized incident record'],['incident:open','d73a4a','Incident is currently open'],['incident:recovered','0e8a16','Incident is proven recovered'],['severity:P0','b60205','Repository or authority integrity incident'],['severity:P1','d93f0b','Actionable workflow failure'],['severity:P2','fbca04','Operational follow-up'],['severity:P3','c5def5','Informational repository churn']];

function loadRegistry(root) { return JSON.parse(fs.readFileSync(path.join(root, '.github/plugin-control-plane/registry.json'), 'utf8')); }
async function applyIncidentPlan(issueStore, plan) {
  if (plan.action === 'none') return null;
  const body = renderIncidentBody(plan.event, plan.severity, plan.transition, plan.key, plan.alertEnvelope);
  let issue;
  if (plan.action === 'update') {
    issue = await issueStore.updateIssue(plan.issue.number, {title: plan.title, body, state: plan.transition === 'RECOVERED' ? 'closed' : 'open'});
    await issueStore.replaceLabels(plan.issue.number, plan.labels);
  } else issue = await issueStore.createIssue({title: plan.title, body, labels: plan.labels});
  return {number: issue.number, transition: plan.transition, severity: plan.severity, reason: plan.event.observation.reasonCode, notificationEligible: plan.alertEnvelope.eligible, deliveryKey: plan.alertEnvelope.deliveryKey};
}
async function collectBaseObservations(context) {
  const pairs = await Promise.all(modules.map(async (module) => [module.id, await safeObserve(module.id, () => module.observe(context))]));
  return Object.fromEntries(pairs);
}
function adapterEvents(observations) { return [...(observations.requiredCi.events || []), ...(observations.productionAuthority.events || []), ...(observations.writers.events || []), ...(observations.bootstrap.events || [])]; }
function observationCoverageValid(observations) { return observations.requiredCi.known === true && observations.productionAuthority.known === true && observations.writers.known === true && observations.bootstrap.known === true; }

async function refresh(options = {}) {
  const root = options.root || process.cwd();
  const policy = options.policy || loadPolicy();
  const registry = options.registry || loadRegistry(root);
  const client = options.client || createGitHubClient({token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN, repo: process.env.GITHUB_REPOSITORY});
  const issueStore = options.issueStore || createIssueStore(client);
  const actions = options.actions || createActionsStore(client);
  const repoFiles = options.repoFiles || createRepoFiles(client);
  await issueStore.ensureLabels(LABEL_DEFS);
  const branch = await client.api('/branches/main');
  let allIssues = await issueStore.listIssues('all');
  const context = {root, policy, registry, client, issueStore, actions, repoFiles, branch, mainSha: branch.commit.sha, allIssues};
  const observations = await collectBaseObservations(context);
  const touched = [];
  for (const event of adapterEvents(observations)) {
    const result = await applyIncidentPlan(issueStore, planIncident(event, allIssues, policy));
    if (result) touched.push(result);
  }
  if (touched.length) { allIssues = await issueStore.listIssues('all'); context.allIssues = allIssues; }
  const incidentRows = allIssues.map(incidentFromIssue).filter(Boolean);
  observations.delivery = await safeObserve('delivery-receipts', () => deliveryReceipts.observe(context, incidentRows));
  const active = incidentRows.filter((row) => row.state === 'OPEN');
  const activeP2 = active.filter((row) => row.severity === 'P2');
  const projectRows = observations.projectStatus.data || [];
  const projectStatusFresh = observations.projectStatus.known === true && projectRows.length > 0 && projectRows.every((row) => row.fresh);
  const configuredCoverageComplete = policy.operations.eventAdaptersComplete === true;
  const observationCoverage = observationCoverageValid(observations);
  const freshnessValid = projectStatusFresh && configuredCoverageComplete && observationCoverage;
  const operatorState = deriveOperatorState({incidents: active, attention: activeP2, freshnessValid});
  const recentRecoveries = incidentRows.filter((row) => row.state === 'RECOVERED').sort((a,b) => Date.parse(b.issue.updated_at) - Date.parse(a.issue.updated_at)).slice(0, policy.operations.recentRecoveryLimit);
  const bootstrapCoverage = deriveCoverage(registry, observations.bootstrap);
  const snapshot = Object.freeze({schemaVersion: 1, repository: client.repo || process.env.GITHUB_REPOSITORY, observedMainSha: branch.commit.sha, observedAt: new Date().toISOString(), policy, observations, bootstrapCoverage, incidents: {all: incidentRows, active, activeP2, recentRecoveries}, freshness: {configuredCoverageComplete, observationCoverageValid: observationCoverage, projectStatusFresh, valid: freshnessValid}, operatorState});
  const body = renderOpsView(snapshot);
  let opsIssue = allIssues.find((row) => row.title === policy.operations.issueTitle);
  if (opsIssue) {
    opsIssue = await issueStore.updateIssue(opsIssue.number, {body, state: 'open'});
    await issueStore.replaceLabels(opsIssue.number, ['scope:repo','control-plane:operations']);
    console.log(`CANONICAL_MAIN_OPS_UPDATED:#${opsIssue.number}:${operatorState}`);
  } else {
    opsIssue = await issueStore.createIssue({title: policy.operations.issueTitle, body, labels: ['scope:repo','control-plane:operations']});
    console.log(`CANONICAL_MAIN_OPS_CREATED:#${opsIssue.number}:${operatorState}`);
  }
  console.log(`CANONICAL_MAIN_PROTECTION_SURFACE:#${opsIssue.number}:${observations.protection.data?.state || 'UNKNOWN'}`);
  console.log(`CANONICAL_MAIN_BOOTSTRAP_SURFACE:#${opsIssue.number}:${bootstrapCoverage.complete ? 'COMPLETE' : 'INCOMPLETE'}:${bootstrapCoverage.readyCount}/${bootstrapCoverage.expectedCount}`);
  for (const row of touched) {
    console.log(`CANONICAL_MAIN_INCIDENT_${row.transition}:#${row.number}:${row.severity}:${row.reason}`);
    if (row.notificationEligible) console.log(`CANONICAL_MAIN_NOTIFICATION_OUTBOX:#${row.number}:${row.severity}:${row.transition}:${row.deliveryKey}`);
  }
  return {snapshot, opsIssue, touched};
}
async function main() { if (process.argv[2] !== 'refresh') throw new Error('usage: orchestrator/refresh.cjs refresh'); await refresh(); }
if (require.main === module) main().catch((error) => { console.error(error.stack || String(error)); process.exitCode = 1; });
module.exports = {LABEL_DEFS, loadRegistry, applyIncidentPlan, collectBaseObservations, adapterEvents, observationCoverageValid, refresh};
