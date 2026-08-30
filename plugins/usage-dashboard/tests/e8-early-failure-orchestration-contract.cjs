'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const preflight = require('../tools/release_generic_preflight.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
const hygiene = preflight.inspect(release.specPath);
assert.deepEqual(hygiene.findings, [], 'current repository must carry no unannotated stale current-release assertions');

const match = release.productVersion.match(/^(.*\.)(\d+)$/);
assert.ok(match, `unexpected product version: ${release.productVersion}`);
const staleVersion = `${match[1]}${Math.max(0, Number(match[2]) - 1)}`;
const staleFixture = `const release={productVersion:'x'};\nassert.equal(release.productVersion, '${staleVersion}');\n`;
assert.equal(preflight.staleProductAssertions(staleFixture, release.productVersion).length, 1);
const lockedOnlyFixture = `const release={productVersion:'x'};\n// ${preflight.HISTORICAL_LOCK}\nassert.equal(release.productVersion, '${staleVersion}');\n`;
assert.equal(preflight.staleProductAssertions(lockedOnlyFixture, release.productVersion)[0].reason, 'historical-scope-missing');
const guardedHistoricalFixture = `const release={productVersion:'x'}; if (release.productVersion !== '${staleVersion}') { process.exit(0); }\n// ${preflight.HISTORICAL_LOCK}\nassert.equal(release.productVersion, '${staleVersion}');\n`;
assert.deepEqual(preflight.staleProductAssertions(guardedHistoricalFixture, release.productVersion), []);

const reconcile = fs.readFileSync('plugins/usage-dashboard/tools/reconcile_release_candidate.py', 'utf8');
assert.match(reconcile, /def validate_release_memory_contract\(spec_path: Path\)/);
assert.match(reconcile, /env\['UD_RELEASE_SPEC'\] = spec_path\.as_posix\(\)/);
assert.match(reconcile, /current-release-contract\.cjs/);
assert.match(reconcile, /RELEASE_MEMORY_CONTRACT_REJECTED/);
assert.match(reconcile, /validate_release_memory_contract\(spec_path\)/);
const validateCandidateIndex = reconcile.indexOf("validate_release_candidate.py'), '--spec', str(spec_path)");
const releaseMemoryIndex = reconcile.indexOf('validate_release_memory_contract(spec_path)');
assert.ok(validateCandidateIndex >= 0 && releaseMemoryIndex > validateCandidateIndex, 'release-memory gate must run after materialized candidate validation');

const stage = fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml', 'utf8');
const reconcileIndex = stage.indexOf('reconcile_release_candidate.py --spec "$RELEASE_SPEC" --two-pass');
const candidateTreeIndex = stage.indexOf('git add -A');
assert.ok(reconcileIndex >= 0 && candidateTreeIndex > reconcileIndex, 'reconciliation including release-memory gate must finish before candidate tree/bundle creation');
assert.match(stage, /write_candidate:\n\s+needs: \[resolve_stage, materialize_stage\]/);
assert.match(stage, /if: \$\{\{ needs\.resolve_stage\.result == 'success' && needs\.materialize_stage\.result == 'success' \}\}/);
assert.match(stage, /issues:\n\s+types: \[opened\]/, 'owner issue stage request path must remain');
assert.match(stage, /workflow_dispatch:\n\s+inputs:\n\s+source_branch:/, 'trusted stage workflow must accept exact source-branch dispatch');
assert.match(stage, /github\.event_name == 'workflow_dispatch'/);
assert.match(stage, /E8_STAGE_TRUSTED_DISPATCH_REQUEST/);
assert.match(stage, /github\.actor == github\.repository_owner/);
assert.match(stage, /github\.event\.issue\.user\.login == github\.repository_owner/);
assert.match(stage, /startsWith\(github\.event\.issue\.title, '\[usage-dashboard-stage\] '\)/);
assert.match(stage, /--check-stage-issue-envelope/);
assert.match(stage, /--stage-issue-branch/);
assert.match(stage, /E8_STAGE_CONNECTED_ISSUE_REQUEST/);
assert.match(stage, /github\.event\.issue\.number == 197/,'legacy #197 stage command path must remain');
assert.match(stage, /\/usage-dashboard stage /,'legacy slash-command stage path must remain');

const selfHeal = fs.readFileSync('.github/workflows/usage-dashboard-stage-request-self-heal.yml', 'utf8');
assert.match(selfHeal, /push:\n\s+branches: \[main\]/, 'self-healer must activate from trusted main push');
assert.match(selfHeal, /schedule:\n\s+- cron: '\*\/5 \* \* \* \*'/, 'self-healer must retain bounded scheduled recovery');
assert.match(selfHeal, /actions: write/,'self-healer needs only dispatch authority in addition to read/issue metadata');
assert.match(selfHeal, /issues: write/,'self-healer consumes request metadata after successful dispatch');
assert.match(selfHeal, /ref: main/,'self-healer must checkout and dispatch trusted main');
assert.match(selfHeal, /state=open&labels=plugin%3Ausage-dashboard/);
assert.match(selfHeal, /--stage-issue-branch/);
assert.match(selfHeal, /\.user\.login/);
assert.match(selfHeal, /actions\/workflows\/usage-dashboard-stage-e7\.yml\/dispatches/);
assert.match(selfHeal, /\{ref:"main",inputs:\{source_branch:\$branch\}\}/);
assert.match(selfHeal, /UD_STAGE_REQUEST_SELF_HEAL_DISPATCHED/);
assert.ok(!selfHeal.includes('git push'), 'self-healer must never mutate candidate or production refs directly');

const ordinary = fs.readFileSync('.github/workflows/usage-dashboard-validate.yml', 'utf8');
assert.match(ordinary, /deterministic-stage-pr-note:/);
assert.match(ordinary, /CANDIDATE_PR_EVENT_NONAUTHORITATIVE:deterministic-stage-pr/);
assert.match(ordinary, /startsWith\(github\.head_ref, 'stage\/usage-dashboard-'\)/);
assert.match(ordinary, /github\.event_name != 'pull_request' \|\| !startsWith\(github\.head_ref, 'stage\/usage-dashboard-'\)/);
assert.match(ordinary, /uses: \.\/\.github\/workflows\/reusable-usage-dashboard-validate\.yml/);

const exact = fs.readFileSync('.github/workflows/usage-dashboard-validate-exact.yml', 'utf8');
assert.match(exact, /usage-dashboard validate/);
assert.match(exact, /reusable-usage-dashboard-validate\.yml/);
assert.ok(!exact.includes('git push'), 'exact-SHA validation must remain read-only with respect to refs');

const promoter = fs.readFileSync('.github/workflows/reusable-usage-dashboard-promote.yml', 'utf8');
assert.match(promoter, /contents: write/);
assert.match(promoter, /promote_release_blobs\.cjs/);

const runbook = fs.readFileSync('docs/USAGE_DASHBOARD_PR_LIFECYCLE_E8_EARLY_FAILURE_HARDENING.md', 'utf8');
for (const token of [
  'E7-E real-release proof: COMPLETE',
  'E(n+1)',
  'RELEASE_MEMORY_CONTRACT_REJECTED',
  'CANDIDATE_PR_EVENT_NONAUTHORITATIVE',
  'CONNECTED_REF_MUTATION_DENIED',
  'must not create or advance release Git refs',
]) assert.ok(runbook.includes(token), `E8 runbook missing ${token}`);

console.log(`usage-dashboard E8 early-failure/orchestration contract: OK · ${release.productVersion} · continuous hygiene + guarded historical scope + pre-candidate release-memory gate + owner issue self-heal dispatch + exact-SHA authority + ref boundary`);
