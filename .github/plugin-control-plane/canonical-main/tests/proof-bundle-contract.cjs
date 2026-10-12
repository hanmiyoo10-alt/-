'use strict';

const assert = require('assert');
const {execFileSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {composeProofBundle, MODE} = require('../proof-bundle.cjs');
const {readGitHubCliJson} = require('../infra/github-cli-read.cjs');
const {attachReadFailures, parseOps, writeBundle} = require('../orchestrator/proof-bundle.cjs');
const {exactShaWorkflowApplicability, pluginWorkflowEvidence, resolveMergeBase} = require('../orchestrator/pr-workflow-applicability.cjs');

function sample() {
  return {
    targetSha: 'a'.repeat(40),
    pr: {number: 675, headSha: 'b'.repeat(40), mergeSha: 'a'.repeat(40)},
    prHead: {
      plugin: {runId: 11, conclusion: 'success'},
      simcore: {runId: 12, conclusion: 'success', verify: 'success', required: 'success'},
    },
    mergedMain: {runId: 13, conclusion: 'success', verify: 'success', required: 'success'},
    ops: {
      observedSha: 'a'.repeat(40),
      state: 'CLEAR',
      convergence: 'STABLE',
      requiredPass: true,
      productionMatch: true,
      requiredUnknownNone: true,
    },
    protection: {protected: false, enforcementLevel: 'off', requiredChecks: []},
    incidents: {activeP0P1Known: true, activeP0P1Count: 0, attentionKnown: true, attentionCount: 0},
  };
}

const complete = composeProofBundle(sample());
assert.equal(complete.mode, MODE);
assert.equal(complete.state, 'COMPLETE');
assert.equal(complete.acceptanceReady, true);
assert.deepEqual(complete.missing, []);
assert.deepEqual(complete.failures, []);
assert.equal(complete.evidence.protection.protected, false, 'direct protected=false is known evidence, not UNKNOWN');

const partialInput = sample();
delete partialInput.ops.observedSha;
const partial = composeProofBundle(partialInput);
assert.equal(partial.state, 'PARTIAL');
assert.equal(partial.acceptanceReady, false);
assert(partial.missing.includes('OPS_SHA_UNKNOWN'));

const failedInput = sample();
failedInput.mergedMain.required = 'failure';
const failed = composeProofBundle(failedInput);
assert.equal(failed.state, 'COMPLETE', 'known failure is complete evidence, not missing evidence');
assert.equal(failed.acceptanceReady, false);
assert(failed.failures.includes('MERGED_MAIN_REQUIRED_NOT_SUCCESS'));
const pluginPathFilteredInput = sample();
pluginPathFilteredInput.prHead.plugin = {applicability: 'EXPECTED_NO_RUN_PATH_FILTER', reasonCodes: ['PATH_FILTERED'], inventoryComplete: true};
const pluginPathFiltered = composeProofBundle(pluginPathFilteredInput);
assert.equal(pluginPathFiltered.state, 'COMPLETE', 'owner-proven path-filter absence is complete evidence');
assert.equal(pluginPathFiltered.acceptanceReady, true);
assert(!pluginPathFiltered.missing.includes('PR_HEAD_PLUGIN_CI_UNKNOWN'));
assert(!pluginPathFiltered.failures.includes('PR_HEAD_PLUGIN_CI_NOT_SUCCESS'));

const pluginTriggerInapplicableInput = sample();
pluginTriggerInapplicableInput.prHead.plugin = {applicability: 'TRIGGER_NOT_APPLICABLE', reasonCodes: ['REF_FILTERED'], inventoryComplete: true};
const pluginTriggerInapplicable = composeProofBundle(pluginTriggerInapplicableInput);
assert.equal(pluginTriggerInapplicable.state, 'COMPLETE');
assert.equal(pluginTriggerInapplicable.acceptanceReady, true);

for (const applicability of ['UNKNOWN', 'BLOCKED_CAPABILITY', 'MISSING_UNEXPECTED', 'RAN']) {
  const input = sample();
  input.prHead.plugin = {applicability, reasonCodes: ['TEST']};
  const result = composeProofBundle(input);
  assert.equal(result.state, 'PARTIAL', `${applicability} without a completed run must stay partial`);
  assert(result.missing.includes('PR_HEAD_PLUGIN_CI_UNKNOWN'));
}

const pluginFailedInput = sample();
pluginFailedInput.prHead.plugin = {runId: 44, conclusion: 'failure', applicability: 'RAN'};
const pluginFailed = composeProofBundle(pluginFailedInput);
assert.equal(pluginFailed.state, 'COMPLETE');
assert.equal(pluginFailed.acceptanceReady, false);
assert(pluginFailed.failures.includes('PR_HEAD_PLUGIN_CI_NOT_SUCCESS'));

const activeIncidentInput = sample();
activeIncidentInput.incidents.activeP0P1Count = 1;
const activeIncident = composeProofBundle(activeIncidentInput);
assert.equal(activeIncident.state, 'COMPLETE', 'known incident state remains representable evidence');
assert.equal(activeIncident.evidence.incidents.activeP0P1Count, 1);

const rendered = [
  '- STATE: `CLEAR`',
  `- MAIN: \`${'a'.repeat(40)}\` / Required PASS — run 123`,
  '- AUTHORITY: Production MATCH — release-simcore abc; native protection `BLOCKED_PERMISSION` / protected `false`; soft fallback `ACTIVE`',
  '- UNKNOWN: NONE',
  '- Convergence: `STABLE`',
  '## Active P0/P1 incidents',
  '',
  '- none observed within current adapter coverage',
  '## Attention queue (P2)',
  '',
  '- none observed within current adapter coverage',
  '## Projects / products',
].join('\n');
const parsed = parseOps(rendered);
assert.equal(parsed.observedSha, 'a'.repeat(40));
assert.equal(parsed.state, 'CLEAR');
assert.equal(parsed.convergence, 'STABLE');
assert.equal(parsed.requiredPass, true);
assert.equal(parsed.productionMatch, true);
assert.equal(parsed.requiredUnknownNone, true);
assert.equal(parsed.activeP0P1Known, true);
assert.equal(parsed.activeP0P1Count, 0);
assert.equal(parsed.attentionKnown, true);
assert.equal(parsed.attentionCount, 0);
const pluginPr = {headSha: 'b'.repeat(40), baseSha: 'c'.repeat(40), baseRef: 'main'};
let classifyCalls = 0;
const directPlugin = pluginWorkflowEvidence('owner/repo', pluginPr, 'd'.repeat(40), [], () => ({runId: 71, conclusion: 'success'}), () => {classifyCalls += 1; return {disposition: 'UNKNOWN', reasonCodes: [], inventoryComplete: false, evidence: {}};});
assert.equal(directPlugin.runId, 71);
assert.equal(directPlugin.applicability, 'RAN');
assert.equal(classifyCalls, 0, 'direct completed evidence must not invoke absence classification');

let classifyInput = null;
const pathFilteredPlugin = pluginWorkflowEvidence(
  'owner/repo', pluginPr, 'd'.repeat(40), [], () => null,
  (input) => {classifyInput = input; return {disposition: 'EXPECTED_NO_RUN_PATH_FILTER', reasonCodes: ['PATH_FILTERED'], inventoryComplete: true, evidence: {beforeSha: 'e'.repeat(40), workflowRef: 'd'.repeat(40), changedPathCount: 6}};},
  () => 'e'.repeat(40),
);
assert.equal(pathFilteredPlugin.applicability, 'EXPECTED_NO_RUN_PATH_FILTER');
assert.deepEqual(pathFilteredPlugin.reasonCodes, ['PATH_FILTERED']);
assert.equal(pathFilteredPlugin.applicabilityEvidence.changedPathCount, 6);
assert.equal(classifyInput.beforeSha, 'e'.repeat(40));
assert.equal(classifyInput.workflowRef, 'd'.repeat(40));
assert.equal(classifyInput.sha, pluginPr.headSha);

const missingBasePlugin = pluginWorkflowEvidence('owner/repo', {headSha: pluginPr.headSha}, 'd'.repeat(40), [], () => null, () => {throw new Error('classifier must not run without exact base identity');});
assert.equal(missingBasePlugin.applicability, 'UNKNOWN');
assert.deepEqual(missingBasePlugin.reasonCodes, ['PR_BASE_IDENTITY_UNKNOWN']);

const resolvedMergeBase = resolveMergeBase(
  'owner/repo', 'c'.repeat(40), 'b'.repeat(40), [],
  () => ({value: {merge_base_commit: {sha: 'e'.repeat(40)}}, failure: null}),
);
assert.equal(resolvedMergeBase, 'e'.repeat(40));

const ownerProjection = exactShaWorkflowApplicability(
  {repo: 'owner/repo', sha: 'a'.repeat(40), workflow: '.github/workflows/x.yml', event: 'pull_request', ref: 'main', beforeSha: 'b'.repeat(40)},
  () => JSON.stringify({disposition: 'EXPECTED_NO_RUN_PATH_FILTER', reason_codes: ['PATH_FILTERED', 'bad reason', 'X'.repeat(101)], inventory_complete: true, evidence: {workflow_blob_sha: 'c'.repeat(40), before_sha: 'b'.repeat(40), workflow_ref: 'd'.repeat(40), changed_path_count: 6}}),
);
assert.equal(ownerProjection.disposition, 'EXPECTED_NO_RUN_PATH_FILTER');
assert.deepEqual(ownerProjection.reasonCodes, ['PATH_FILTERED']);
assert.equal(ownerProjection.inventoryComplete, true);
assert.equal(ownerProjection.evidence.changedPathCount, 6);
assert.equal(ownerProjection.evidence.workflowRef, 'd'.repeat(40));

const unknownOwnerVocabulary = exactShaWorkflowApplicability({repo: 'owner/repo'}, () => JSON.stringify({disposition: 'FUTURE_UNREVIEWED_STATE', reason_codes: []}));
assert.equal(unknownOwnerVocabulary.disposition, 'UNKNOWN');
const failedOwnerInvocation = exactShaWorkflowApplicability({repo: 'owner/repo'}, () => {throw new Error('do not expose raw child error');});
assert.equal(failedOwnerInvocation.disposition, 'UNKNOWN');
assert.deepEqual(failedOwnerInvocation.reasonCodes, ['EXACT_SHA_OWNER_INVOKE_FAILED']);

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const exactFixtureScript = [
  'import json, pathlib, sys',
  "sys.path.insert(0, str(pathlib.Path.cwd() / 'tools' / 'repo-ci-mcp'))",
  'from repo_ci_mcp.exact_sha import repo_ci_exact_sha',
  'class Reader:',
  "  repository = 'hanmiyoo10-alt/-'",
  '  def list_runs_exact_sha(self, sha): return (0, [])',
  '  def get_repository_file(self, path, ref, max_bytes):',
  '    raw = pathlib.Path(path).read_bytes()',
  "    return {'content': raw, 'blob_sha': 'd' * 40, 'size': len(raw)}",
  '  def compare_changed_paths(self, before, sha):',
  "    return (['tools/repo-ci-mcp/README.md','tools/repo-ci-mcp/repo_ci_mcp/github_observability.py','tools/repo-ci-mcp/repo_ci_mcp/github_reader.py','tools/repo-ci-mcp/repo_ci_mcp/server.py','tools/repo-ci-mcp/tests/test_github_observability.py','tools/repo-ci-mcp/tests/test_github_reader.py'], True)",
  "result = repo_ci_exact_sha(Reader(), 'fca76cda388b3f8bb4b70cc32d4fbecd801ddf42', '.github/workflows/plugin-control-plane-ci.yml', event='pull_request', ref='main', before_sha='dc564aa008d9bd116103ccde773a13730a0a26fe', workflow_ref='d142386866ce9e1ba685ee97c3aa99918621776c')",
  'print(json.dumps(result))',
].join('\n');
const exactFixture = JSON.parse(execFileSync('python3', ['-c', exactFixtureScript], {cwd: repoRoot, encoding: 'utf8', maxBuffer: 512 * 1024, stdio: ['ignore', 'pipe', 'inherit']}));
assert.equal(exactFixture.disposition, 'EXPECTED_NO_RUN_PATH_FILTER');
assert.deepEqual(exactFixture.reason_codes, ['PATH_FILTERED']);
assert.equal(exactFixture.evidence.changed_path_count, 6);
assert.equal(exactFixture.evidence.workflow_ref, 'd142386866ce9e1ba685ee97c3aa99918621776c');

function sequenceExec(steps) {
  let index = 0;
  return () => {
    const step = steps[Math.min(index, steps.length - 1)];
    index += 1;
    if (step instanceof Error) throw step;
    return step;
  };
}

const recoveredCommand = readGitHubCliJson(
  ['repos/example/repo/issues/1'],
  {attempts: 2, delayMs: 0, execFileSync: sequenceExec([new Error('secret-token'), '{"ok":true}'])},
);
assert.deepEqual(recoveredCommand, {value: {ok: true}, failure: null});

const recoveredJson = readGitHubCliJson(
  ['repos/example/repo/issues/2'],
  {attempts: 2, delayMs: 0, execFileSync: sequenceExec(['{"broken":', '{"ok":2}'])},
);
assert.deepEqual(recoveredJson, {value: {ok: 2}, failure: null});

const failedCommand = readGitHubCliJson(
  ['repos/example/repo/issues/3'],
  {attempts: 2, delayMs: 0, execFileSync: sequenceExec([new Error('secret-one'), new Error('secret-two')])},
);
assert.equal(failedCommand.value, null);
assert.deepEqual(failedCommand.failure, {
  read: 'repos/example/repo/issues/3',
  failureClass: 'GH_API_COMMAND_FAILED',
  attempts: 2,
});
assert(!JSON.stringify(failedCommand).includes('secret-'), 'raw command failure detail must not be retained');

const failedJson = readGitHubCliJson(
  ['repos/example/repo/issues/4'],
  {attempts: 2, delayMs: 0, execFileSync: sequenceExec(['{"token":"secret"', '{"token":"still-secret"'])},
);
assert.equal(failedJson.value, null);
assert.equal(failedJson.failure.failureClass, 'GH_API_JSON_INVALID');
assert(!JSON.stringify(failedJson).includes('secret'), 'raw malformed JSON must not be retained');

assert.throws(
  () => readGitHubCliJson(['--method', 'POST', 'repos/example/repo/issues']),
  /read-only/,
  'GitHub CLI helper must reject explicit write methods',
);
assert.throws(
  () => readGitHubCliJson(['repos/example/repo/issues', '-f', 'title=forbidden']),
  /read-only/,
  'GitHub CLI helper must reject field arguments that would imply POST',
);

const partialReadFailure = attachReadFailures(complete, [failedCommand.failure]);
assert.equal(partialReadFailure.state, 'PARTIAL');
assert.equal(partialReadFailure.acceptanceReady, false);
assert(partialReadFailure.missing.includes('EXTERNAL_READ_FAILURE'));
assert.deepEqual(partialReadFailure.evidence.readFailures, [failedCommand.failure]);
assert.strictEqual(attachReadFailures(complete, []), complete, 'clean later collection must not inherit old read failures');

const oldCwd = process.cwd();
const oldSummary = process.env.GITHUB_STEP_SUMMARY;
const oldOutput = process.env.GITHUB_OUTPUT;
const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-bundle-contract-'));
try {
  delete process.env.GITHUB_STEP_SUMMARY;
  delete process.env.GITHUB_OUTPUT;
  process.chdir(artifactRoot);
  const artifact = writeBundle(partialReadFailure);
  assert(fs.existsSync(artifact), 'partial external-read failure must still materialize an artifact');
  const persisted = JSON.parse(fs.readFileSync(artifact, 'utf8'));
  assert.equal(persisted.acceptanceReady, false);
  assert(persisted.missing.includes('EXTERNAL_READ_FAILURE'));
} finally {
  process.chdir(oldCwd);
  if (oldSummary === undefined) delete process.env.GITHUB_STEP_SUMMARY;
  else process.env.GITHUB_STEP_SUMMARY = oldSummary;
  if (oldOutput === undefined) delete process.env.GITHUB_OUTPUT;
  else process.env.GITHUB_OUTPUT = oldOutput;
  fs.rmSync(artifactRoot, {recursive: true, force: true});
}

const githubDir = path.resolve(__dirname, '..', '..', '..');
const collector = fs.readFileSync(path.join(__dirname, '..', 'orchestrator', 'proof-bundle.cjs'), 'utf8');
const workflow = fs.readFileSync(path.join(githubDir, 'workflows', 'canonical-main-proof-bundle.yml'), 'utf8');
assert(!/--method['",\s]+(?:POST|PATCH|PUT|DELETE)/i.test(collector), 'collector must not issue write API methods');
assert(!/^\s*[a-z-]+:\s*write\s*$/mi.test(workflow), 'proof workflow permissions must be read-only');
assert(/push:\s*\n\s*branches:\s*\[main\]/m.test(workflow), 'proof bundle must run automatically on main push');
assert(/canonical-main-proof-bundle\.json/.test(workflow), 'workflow must upload the JSON bundle');
assert(/if-no-files-found:\s*error/.test(workflow), 'missing proof artifact must remain a workflow error');
assert(/orchestrator\/proof-bundle\.cjs compose/.test(workflow), 'workflow must invoke the trusted composer');

console.log('canonical-main proof-bundle-contract: ok');
