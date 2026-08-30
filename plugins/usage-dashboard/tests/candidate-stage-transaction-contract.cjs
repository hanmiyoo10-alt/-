'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const control = require('../tools/release_control_command.cjs');
const e6 = require('../tools/candidate_stage_e6.cjs');

const stage = fs.readFileSync('.github/workflows/usage-dashboard-stage-e7.yml','utf8');
const exact = fs.readFileSync('.github/workflows/usage-dashboard-validate-exact.yml','utf8');
const validator = fs.readFileSync('.github/workflows/usage-dashboard-validate.yml','utf8');
const reusable = fs.readFileSync('.github/workflows/reusable-usage-dashboard-validate.yml','utf8');
const fallback = fs.readFileSync('.github/workflows/usage-dashboard-prepare-candidate.yml','utf8');
const promoter = fs.readFileSync('.github/workflows/usage-dashboard-promote.yml','utf8');

const sourceBranch='release/usage-dashboard-5.74-fixture';
assert.deepEqual(control.parseStageCommand(`/usage-dashboard stage ${sourceBranch}`),{candidateBranch:sourceBranch});
assert.equal(e6.deriveCandidateBranch('3.0.0-alpha.5.74'),'stage/usage-dashboard-3.0.0-alpha.5.74');
assert.equal(fs.existsSync('.github/workflows/usage-dashboard-stage-e6.yml'),false,'E6 normal stage workflow must be retired after E7 takeover');

assert.match(stage,/^name: Usage Dashboard E7 Candidate-Ready Stage$/m);
assert.match(stage,/group: usage-dashboard-e7-stage/);
assert.match(stage,/github\.event\.issue\.number == 197/);
assert.match(stage,/github\.actor == github\.repository_owner/);
assert.match(stage,/startsWith\(github\.event\.comment\.body, '\/usage-dashboard stage '\)/);
assert.match(stage,/candidate_stage_e6\.cjs --inspect/,'E7 inherits proven E6 source-derived authority helper');
assert.match(stage,/E7_STAGE_SOURCE_FROZEN/);
assert.doesNotMatch(stage,/pull-requests: write/,'stage must not own PR bootstrap');
assert.doesNotMatch(stage,/\/pulls|usage-dashboard-e9-validate\.yml\/dispatches/,'stage must not own PR bootstrap or validation activation');
assert.equal((stage.match(/contents: write/g)||[]).length,1,'E7 stage owns exactly one constrained contents writer');

const resolveAt=stage.indexOf('\n  resolve_stage:');
const materializeAt=stage.indexOf('\n  materialize_stage:');
const writerAt=stage.indexOf('\n  write_candidate:');
const readyAt=stage.indexOf('\n  receipt_ready:');
assert.ok(resolveAt>0 && materializeAt>resolveAt && writerAt>materializeAt && readyAt>writerAt);
const materialize=stage.slice(materializeAt,writerAt);
const preflightAt=materialize.indexOf('release_generic_preflight.cjs --spec "$RELEASE_SPEC"');
const materializerAt=materialize.indexOf('python3 "$UD_MATERIALIZER"');
assert.ok(preflightAt>0 && materializerAt>preflightAt,'release-generic preflight must run before materializer/expensive smoke');
assert.match(materialize,/RELEASE_PREFLIGHT_REJECTED/);
assert.match(materialize,/git diff --binary "\$INTENT_BASE_SHA" "\$SOURCE_SHA"/);
assert.match(materialize,/git apply --index --3way/);
assert.match(materialize,/SOURCE_INTENT_CONFLICT/);
assert.match(materialize,/reconcile_release_candidate\.py --spec "\$RELEASE_SPEC" --two-pass/);
assert.match(materialize,/derived_impact_e18\.cjs --smoke-plan "\$TRUSTED_BASE_SHA"/,'E18 smoke depth must derive from post-materialization artifact impact');
assert.match(materialize,/UD_DERIVED_IMPACT/);
assert.match(materialize,/E18_UNKNOWN_RUNTIME_IMPACT/);
assert.match(materialize,/run_behavior_smoke\.cjs --repeat "\$E18_SMOKE_REPEAT"/);
assert.match(materialize,/E18_SMOKE_REPEAT/);
assert.doesNotMatch(materialize,/if \[\[ "\$ENGINE_CHANGED" == 'true' \]\]/,'source-intent Engine flag must not choose post-materialization smoke depth');
assert.doesNotMatch(materialize,/elif \[\[ "\$PLUGIN_CHANGED" == 'true' \]\]/,'source-intent Plugin flag must not choose post-materialization smoke depth');
assert.match(materialize,/NEEDS_FROZEN_MAIN_PARENT=false/);
assert.match(materialize,/git merge-base --is-ancestor "\$TRUSTED_BASE_SHA" "\$CANDIDATE_PARENT_SHA"/);
assert.match(materialize,/PARENT_ARGS=\(-p "\$CANDIDATE_PARENT_SHA"\)/);
assert.match(materialize,/PARENT_ARGS\+=\(-p "\$TRUSTED_BASE_SHA"\)/);
assert.match(materialize,/git commit-tree "\$TREE_SHA" "\$\{PARENT_ARGS\[@\]\}"/);
assert.match(materialize,/BUNDLE_EXCLUDES=\("\^\$CANDIDATE_PARENT_SHA"\)/);
assert.match(materialize,/BUNDLE_EXCLUDES\+=\("\^\$TRUSTED_BASE_SHA"\)/);
assert.match(materialize,/candidate_stage_e6\.cjs --verify-derived/);
assert.doesNotMatch(materialize,/contents: write/);

const writer=stage.slice(writerAt,readyAt);
assert.match(writer,/permissions:\n      contents: write/);
assert.match(writer,/E7_CANDIDATE_CAS_FAILED/);
assert.match(writer,/E7_CANDIDATE_POSTVERIFY_FAILED/);
assert.match(writer,/git push origin "\$PAYLOAD_SHA:refs\/heads\/\$CANDIDATE_BRANCH"/);
assert.doesNotMatch(writer,/--force|--force-with-lease/);
for(const forbidden of ['python3 "$UD_MATERIALIZER"','reconcile_release_candidate.py','run_behavior_smoke.cjs','tests/run-all.cjs']) {
  assert.ok(!writer.includes(forbidden),`write-only job must not execute ${forbidden}`);
}

const ready=stage.slice(readyAt);
assert.match(ready,/UD_CANDIDATE_READY/);
assert.match(ready,/base_sha: \$BASE_SHA/);
assert.match(ready,/next: ensure deterministic PR \+ exact-SHA validation/);
assert.match(stage,/UD_STAGE_ACCEPTED/);
assert.match(stage,/UD_STAGE_REJECTED/);
assert.doesNotMatch(ready,/validation: DISPATCHED|pr: #/,'candidate-ready receipt must not claim PR/validation completion');

assert.match(exact,/^name: Usage Dashboard E7 Exact-SHA Validation$/m);
assert.match(exact,/github\.event\.issue\.number == 197/);
assert.match(exact,/github\.actor == github\.repository_owner/);
assert.match(exact,/startsWith\(github\.event\.comment\.body, '\/usage-dashboard validate '\)/);
assert.ok(exact.includes("/^stage\\/usage-dashboard-3\\.0\\.0-alpha\\.5\\.\\d+$/"),'exact validator must restrict PR heads to deterministic E7 candidate branches');
assert.match(exact,/pr\.base\?\.ref!=='main'/);
assert.match(exact,/pr\.head\?\.sha!==candidateSha/);
assert.match(exact,/VALIDATION_IDENTITY_MISMATCH/);
assert.match(exact,/uses: \.\/\.github\/workflows\/reusable-usage-dashboard-validate\.yml/);
assert.match(exact,/candidate_sha: \$\{\{ needs\.resolve_validation\.outputs\.candidate_sha \}\}/);
assert.match(exact,/UD_VALIDATION_ACCEPTED/);
assert.match(exact,/UD_VALIDATION_RESULT/);
assert.match(exact,/validated_sha: \$CANDIDATE_SHA/);
assert.match(exact,/UD_VALIDATION_REJECTED/);
assert.doesNotMatch(exact,/close PR|reopen PR|state.*closed/,'E7 validation must not depend on close/reopen trust choreography');

assert.match(reusable,/candidate_sha:/);
assert.match(reusable,/ref: \$\{\{ inputs\.candidate_sha != '' && inputs\.candidate_sha \|\| github\.sha \}\}/);
assert.match(reusable,/UD_VALIDATING_EXACT_SHA/);
assert.match(reusable,/VALIDATION_IDENTITY_MISMATCH/);
assert.match(validator,/^  workflow_dispatch:$/m,'ordinary manual/defense-in-depth validation remains available');
assert.match(validator,/^  pull_request:$/m,'ordinary PR validation remains defense in depth');
assert.match(validator,/usage-dashboard-stage-e7\.yml/);
assert.match(validator,/usage-dashboard-validate-exact\.yml/);

assert.match(promoter,/usage-dashboard-stage-e7\.yml/);
assert.match(promoter,/usage-dashboard-validate-exact\.yml/);
assert.match(promoter,/^  release-receipt:/m);
assert.match(promoter,/UD_RELEASE_DEPLOYED/);
assert.match(promoter,/exact_byte_parity: VERIFIED/);
assert.match(promoter,/physical_verification: PENDING/);

const fallbackIf=fallback.match(/^    if:.*$/m)?.[0]||'';
assert.match(fallbackIf,/\/usage-dashboard prepare /);
assert.doesNotMatch(fallbackIf,/\/usage-dashboard stage /,'fallback preparation must not own the normal E7 stage command');

console.log('usage-dashboard E7/E14 stage transaction contract: OK · candidate-ready boundary, derived-impact smoke selection, conditional ancestry convergence, config-free PR authority split, exact-SHA full validation, preflight, exact-byte promotion preserved');
