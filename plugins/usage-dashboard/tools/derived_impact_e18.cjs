#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {execFileSync} = require('node:child_process');

const PRODUCT_ROOT = 'plugins/usage-dashboard/';
const PLUGIN_BUNDLE = 'plugins/usage-dashboard/latest.js';
const PLUGIN_SOURCE_PREFIX = 'plugins/usage-dashboard/src/';
const ENGINE_ARTIFACT = 'plugins/usage-dashboard/runtime/bridge-engine.mjs';
const ENGINE_SOURCE_PREFIX = 'plugins/usage-dashboard/runtime-src/bridge-engine/';
const MANAGER_ARTIFACT = 'plugins/usage-dashboard/runtime/bridge-manager.cjs';
const BOOTSTRAP_ARTIFACT = 'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh';
const PRODUCT_MANIFEST = 'plugins/usage-dashboard/runtime/product-manifest.json';
const RUNTIME_PREFIX = 'plugins/usage-dashboard/runtime/';
const RUNTIME_SOURCE_PREFIX = 'plugins/usage-dashboard/runtime-src/';
const TEST_PREFIX = 'plugins/usage-dashboard/tests/';
const TOOL_PREFIX = 'plugins/usage-dashboard/tools/';
const RELEASE_SPEC_PREFIX = '.github/usage-dashboard/releases/';
const WORKFLOW_PREFIX = '.github/workflows/usage-dashboard-';
const DOC_PREFIX = 'docs/USAGE_DASHBOARD_';

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function normalizePath(value) {
  const path = String(value || '').replaceAll('\\', '/').trim();
  if (!path || path.startsWith('/') || path.split('/').includes('..') || /[\0\r\n]/.test(path)) {
    fail('E18_IMPACT_PATH_INVALID', path || 'empty');
  }
  return path;
}

function uniquePaths(values) {
  return [...new Set((values || []).map(normalizePath))].sort();
}

function deriveImpact(paths, options = {}) {
  const files = uniquePaths(paths);
  const impact = {
    plugin:false,
    engine:false,
    manager:false,
    bootstrap:false,
    contracts:Boolean(options.contractsChanged),
    tests:false,
    docs:false,
    control_plane:false,
    unknown:false,
    paths:files,
    unknownPaths:[],
  };

  for (const path of files) {
    if (path === PLUGIN_BUNDLE || path.startsWith(PLUGIN_SOURCE_PREFIX)) impact.plugin = true;
    if (path === ENGINE_ARTIFACT || path.startsWith(ENGINE_SOURCE_PREFIX)) impact.engine = true;
    if (path === MANAGER_ARTIFACT) impact.manager = true;
    if (path === BOOTSTRAP_ARTIFACT) impact.bootstrap = true;
    if (path.startsWith(TEST_PREFIX)) impact.tests = true;
    if (path.startsWith(DOC_PREFIX)) impact.docs = true;
    if (path.startsWith(TOOL_PREFIX) || path.startsWith(RELEASE_SPEC_PREFIX) || path.startsWith(WORKFLOW_PREFIX)) impact.control_plane = true;

    const knownRuntime = path === ENGINE_ARTIFACT || path === MANAGER_ARTIFACT || path === BOOTSTRAP_ARTIFACT || path === PRODUCT_MANIFEST;
    const knownRuntimeSource = path.startsWith(ENGINE_SOURCE_PREFIX);
    if ((path.startsWith(RUNTIME_PREFIX) && !knownRuntime) || (path.startsWith(RUNTIME_SOURCE_PREFIX) && !knownRuntimeSource)) {
      impact.unknown = true;
      impact.unknownPaths.push(path);
    }
  }

  return Object.freeze({...impact, unknownPaths:Object.freeze([...impact.unknownPaths]), paths:Object.freeze([...impact.paths])});
}

function smokePlan(impact) {
  if (!impact || typeof impact !== 'object') fail('E18_IMPACT_REPORT_INVALID');
  if (impact.unknown) return Object.freeze({mode:'block', repeat:0, reason:'unknown-runtime-impact'});
  if (impact.engine) return Object.freeze({mode:'run', repeat:3, reason:'engine-impact'});
  if (impact.plugin) return Object.freeze({mode:'run', repeat:1, reason:'plugin-impact'});
  if (impact.manager || impact.bootstrap) return Object.freeze({mode:'run', repeat:1, reason:'runtime-sidecar-impact'});
  return Object.freeze({mode:'skip', repeat:0, reason:'no-derived-runtime-impact'});
}

function diagnostic(impact) {
  const yes = value => value ? 'true' : 'false';
  return [
    `plugin=${yes(impact.plugin)}`,
    `engine=${yes(impact.engine)}`,
    `manager=${yes(impact.manager)}`,
    `bootstrap=${yes(impact.bootstrap)}`,
    `contracts=${yes(impact.contracts)}`,
    `tests=${yes(impact.tests)}`,
    `docs=${yes(impact.docs)}`,
    `control_plane=${yes(impact.control_plane)}`,
    `unknown=${yes(impact.unknown)}`,
  ].join(' ');
}

function normalizeSha(value) {
  const sha = String(value || '').trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(sha)) fail('E18_BASE_SHA_INVALID', sha || 'missing');
  return sha;
}

function nulList(value) {
  return String(value || '').split('\0').filter(Boolean);
}

function gitChangedPaths(baseSha) {
  const base = normalizeSha(baseSha);
  const tracked = nulList(execFileSync('git', ['diff','--name-only','-z',base,'--'], {encoding:'utf8'}));
  const untracked = nulList(execFileSync('git', ['ls-files','--others','--exclude-standard','-z'], {encoding:'utf8'}));
  return uniquePaths([...tracked, ...untracked]);
}

function contractsChangedFromGit(baseSha) {
  const base = normalizeSha(baseSha);
  let before;
  let after;
  try {
    before = JSON.parse(execFileSync('git', ['show', `${base}:${PRODUCT_MANIFEST}`], {encoding:'utf8'}));
    after = JSON.parse(fs.readFileSync(PRODUCT_MANIFEST, 'utf8'));
  } catch (error) {
    fail('E18_CONTRACT_COMPARE_FAILED', error.message);
  }
  return JSON.stringify(before?.contracts ?? null) !== JSON.stringify(after?.contracts ?? null);
}

function reportFromGit(baseSha) {
  const impact = deriveImpact(gitChangedPaths(baseSha), {contractsChanged:contractsChangedFromGit(baseSha)});
  return Object.freeze({impact, smoke:smokePlan(impact), diagnostic:diagnostic(impact)});
}

function main() {
  const [command, value] = process.argv.slice(2);
  if (command === '--smoke-plan') {
    process.stdout.write(JSON.stringify(reportFromGit(value)));
    return;
  }
  if (command === '--classify-json') {
    let paths;
    try { paths = JSON.parse(String(value || '[]')); }
    catch (error) { fail('E18_IMPACT_JSON_INVALID', error.message); }
    const impact = deriveImpact(paths);
    process.stdout.write(JSON.stringify({impact,smoke:smokePlan(impact),diagnostic:diagnostic(impact)}));
    return;
  }
  fail('E18_USAGE');
}

module.exports = {
  PRODUCT_ROOT,
  PLUGIN_BUNDLE,
  PLUGIN_SOURCE_PREFIX,
  ENGINE_ARTIFACT,
  ENGINE_SOURCE_PREFIX,
  MANAGER_ARTIFACT,
  BOOTSTRAP_ARTIFACT,
  PRODUCT_MANIFEST,
  deriveImpact,
  smokePlan,
  diagnostic,
  gitChangedPaths,
  contractsChangedFromGit,
  reportFromGit,
};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
