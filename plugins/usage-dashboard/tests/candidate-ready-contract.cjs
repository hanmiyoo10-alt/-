'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const control = require('../tools/release_control_command.cjs');

const preflight = fs.readFileSync('.github/workflows/usage-dashboard-candidate-ready.yml', 'utf8');
const validator = fs.readFileSync('.github/workflows/reusable-usage-dashboard-validate.yml', 'utf8');

assert.match(preflight, /workflow_dispatch:/);
assert.match(preflight, /^  issue_comment:\n    types: \[created\]$/m);
assert.match(preflight, /candidate_sha:/);
assert.match(preflight, /github\.event\.issue\.number == 197/);
assert.match(preflight, /github\.actor == github\.repository_owner/);
assert.match(preflight, /\/usage-dashboard ready /);
assert.match(preflight, /\/usage-dashboard ready-branch /);
assert.match(preflight, /permissions:\s*\n\s*contents: read/);
assert.match(preflight, /Checkout immutable trusted release control parser/);
assert.match(preflight, /ref: \$\{\{ github\.sha \}\}/);
assert.match(preflight, /Resolve exact candidate SHA/);
assert.match(preflight, /release_control_command\.cjs --check-envelope/);
assert.match(preflight, /release_control_command\.cjs --ready-sha/);
assert.match(preflight, /release_control_command\.cjs --ready-branch/);
assert.match(preflight, /candidate_preparation_policy\.cjs --check-target/);
assert.match(preflight, /git\/ref\/heads\/\$CANDIDATE_BRANCH/);
assert.match(preflight, /CANDIDATE_READY_BRANCH_SHA_INVALID/);
assert.match(preflight, /ref: \$\{\{ steps\.request\.outputs\.candidate_sha \}\}/);
assert.match(preflight, /persist-credentials: false/);
assert.match(preflight, /\^\[0-9a-fA-F\]\{40\}\$/);
assert.match(preflight, /git rev-parse HEAD/);
assert.match(preflight, /CANDIDATE_READY_SHA_MISMATCH/);
assert.match(preflight, /resolve_release_spec\.cjs/);
assert.match(preflight, /CANDIDATE_READY_MATERIALIZER_DENIED/);
assert.match(preflight, /build_bridge_engine\.cjs --write/);
assert.match(preflight, /build_usage_dashboard\.cjs --write/);
assert.match(preflight, /CANDIDATE_NOT_MATERIALIZED/);
assert.match(preflight, /sync_project_guidelines\.py --check/);
assert.match(preflight, /tests\/test-registry-contract\.cjs/);
assert.doesNotMatch(preflight, /tests\/run-all\.cjs/);
assert.match(preflight, /CANDIDATE_READY_FORBIDDEN_WORKFLOW/);
assert.match(preflight, /CANDIDATE_READY:\$\{ACTUAL_SHA\}:\$\{PRODUCT_VERSION\}/);
assert.doesNotMatch(preflight, /contents: write|git push|git switch|release-usage-dashboard/);

const candidateSha = 'a43da840bb689ad43d8ac3cc0c6748a274cccc75';
const candidateBranch = 'release/usage-dashboard-5.71-cross-scope-provenance-v2';
assert.deepEqual(control.parseReadyCommand(`/usage-dashboard ready ${candidateSha}`), {candidateSha});
assert.deepEqual(control.parseReadyBranchCommand(`/usage-dashboard ready-branch ${candidateBranch}`), {candidateBranch});
for (const denied of [
  `/usage-dashboard ready ${candidateSha} extra`,
  `/usage-dashboard ready ${candidateSha}\nextra`,
  '/usage-dashboard ready not-a-sha',
]) assert.throws(() => control.parseReadyCommand(denied), /UD_CONTROL_READY_DENIED/);
for (const denied of [
  `/usage-dashboard ready-branch ${candidateBranch} extra`,
  `/usage-dashboard ready-branch ${candidateBranch}\nextra`,
  '/usage-dashboard ready-branch main',
  '/usage-dashboard ready-branch release-usage-dashboard',
  '/usage-dashboard ready-branch feature/foo',
]) assert.throws(() => control.parseReadyBranchCommand(denied), /UD_CONTROL_READY_BRANCH_DENIED/);

assert.match(validator, /permissions:\s*\n\s*contents: read/);
assert.match(validator, /CANDIDATE_NOT_MATERIALIZED/);
assert.match(validator, /tests\/run-all\.cjs/);

console.log('usage-dashboard candidate-ready contract: OK · manual/comment exact-SHA plus trusted branch-to-SHA resolution, read-only, no full pre-PR regression');
