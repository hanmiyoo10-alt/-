'use strict';

const assert = require('node:assert/strict');
const control = require('../tools/release_control_command.cjs');

const sha='a'.repeat(40);
assert.deepEqual(control.parseValidateCommand(`/usage-dashboard validate 248 ${sha}`),{prNumber:248,candidateSha:sha});
assert.deepEqual(control.parseValidateCommand(`/usage-dashboard validate 1 ${sha.toUpperCase()}`),{prNumber:1,candidateSha:sha});
for(const denied of [
  `/usage-dashboard validate 0 ${sha}`,
  `/usage-dashboard validate 248 deadbeef`,
  `/usage-dashboard validate 248 ${sha} extra`,
  `/usage-dashboard validate #248 ${sha}`,
  `/usage-dashboard validate 248 ${sha}\nextra`,
]) assert.throws(()=>control.parseValidateCommand(denied),/UD_CONTROL_VALIDATE_DENIED/);
assert.equal(control.assertControlEnvelope(197,'hanmiyoo10-alt','hanmiyoo10-alt'),true);
assert.throws(()=>control.assertControlEnvelope(198,'hanmiyoo10-alt','hanmiyoo10-alt'),/UD_CONTROL_ISSUE_DENIED/);
assert.throws(()=>control.assertControlEnvelope(197,'github-actions[bot]','hanmiyoo10-alt'),/UD_CONTROL_ACTOR_DENIED/);

const sourceBranch='release/usage-dashboard-575-provenance-analytics-wrapper-consolidation';
assert.deepEqual(control.parseStageIssueTitle(`[usage-dashboard-stage] ${sourceBranch}`),{candidateBranch:sourceBranch});
for(const denied of [
  `[usage-dashboard-stage] feature/not-allowed`,
  `[usage-dashboard-stage] ${sourceBranch} extra`,
  `[usage-dashboard-stage] ${sourceBranch}\nextra`,
  `usage-dashboard-stage ${sourceBranch}`,
]) assert.throws(()=>control.parseStageIssueTitle(denied),/UD_STAGE_ISSUE_TITLE_DENIED/);
assert.equal(control.assertStageIssueEnvelope('hanmiyoo10-alt','hanmiyoo10-alt','hanmiyoo10-alt'),true);
assert.throws(()=>control.assertStageIssueEnvelope('github-actions[bot]','hanmiyoo10-alt','hanmiyoo10-alt'),/UD_STAGE_ISSUE_ACTOR_DENIED/);
assert.throws(()=>control.assertStageIssueEnvelope('hanmiyoo10-alt','someone-else','hanmiyoo10-alt'),/UD_STAGE_ISSUE_AUTHOR_DENIED/);

console.log('usage-dashboard E7 validation control command contract: OK · owner-only #197 command envelope + owner-only exact stage-request issue title + exact PR/SHA validation');
