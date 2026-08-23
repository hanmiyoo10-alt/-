'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

assertCurrentReleaseArtifacts();
const root = 'plugins/usage-dashboard';
const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const analytics = fs.readFileSync(`${root}/src/16-usage-analytics.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

// Retain only source/security/presentation boundaries here. Active failure,
// recovery history, and stable-readiness behavior are exercised by the
// shipped-dashboard process harness in behavior-runtime-recovery.cjs.
assert.ok(diagnostics.includes('parser provider-usage-v3'));
assert.ok(diagnostics.includes('unknown stays unknown'));
assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));
assert.ok(core.includes("active:{persist:null,render:null,runtime:null}"));
assert.ok(analytics.includes('function localRuntimeErrorKind(stage)'));
assert.ok(analytics.includes('function localRuntimeActiveCount()'));
assert.ok(analytics.includes('function noteLocalRuntimeRecovery(stage)'));
assert.ok(analytics.includes('noteLocalRuntimeRecovery(stage); return true;'));
assert.ok(diagnostics.includes('active local errors ${activeLocalErrors}'));
assert.ok(!diagnostics.includes('localRuntimeErrors.count || 0) > 0'));
assert.ok(diagnostics.includes('local recoveries ${Number(localRuntimeErrors.recoveredCount || 0)}'));
assert.ok(diagnostics.includes('Local runtime errors: total ${Number(localRuntimeErrors.count || 0)} · active ${localRuntimeActiveCount()} · recoveries'));
assert.ok(diagnostics.includes('function stableReadinessSnapshot(bridgeDiag, runtimeBridge)'));
assert.ok(diagnostics.includes('Stable readiness:'));
assert.ok(diagnostics.includes('Stable contract:'));

assert.ok(guidelines.includes('Runtime Recovery Fidelity'));
// This sentence is historical 5.66 device-success evidence. Do not rewrite its
// Engine identity to the current release; current artifact identity is already
// validated by assertCurrentReleaseArtifacts(), while this guard preserves the
// actual evidence that existed when managed-direct recovery was verified.
assert.ok(guidelines.includes('Stable Readiness remains READY with Engine `1.6.19`, Manager `1.3.0`, managed CLI runtime `ready`, CLI `v1.9.0`, and no active local runtime error.'));

console.log('usage-dashboard P15 runtime recovery fidelity: OK · static recovery/readiness boundaries retained; failure and recovery behavior delegated to production process harness');
