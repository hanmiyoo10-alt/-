'use strict';

const fs = require('node:fs');
const path = require('node:path');
const e24 = require('./release_evidence_handoff_e24.cjs');

const TEST_ROOT = 'plugins/usage-dashboard/tests';
const HISTORICAL_LOCK = 'UD_HISTORICAL_VERSION_LOCK';

function walkCjs(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, {withFileTypes:true})) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkCjs(full));
    else if (entry.isFile() && entry.name.endsWith('.cjs')) out.push(full.replaceAll('\\','/'));
  }
  return out.sort();
}

function historicalScopeVersions(source) {
  const scopes = new Set();
  const guard = /if\s*\(\s*release\.productVersion\s*!==\s*(['"])(3\.0\.0-alpha\.5\.\d+)\1\s*\)/g;
  for (const match of String(source || '').matchAll(guard)) scopes.add(match[2]);
  return scopes;
}

function staleProductAssertions(source, targetVersion) {
  const lines = source.split(/\r?\n/);
  const scopes = historicalScopeVersions(source);
  const findings = [];
  const exact = /^\s*assert\.(?:equal|strictEqual)\(\s*(?:release|manifest)\.productVersion\s*,\s*(['"])(3\.0\.0-alpha\.5\.\d+)\1/;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(exact);
    if (!match || match[2] === targetVersion) continue;
    const previous = index > 0 ? lines[index - 1] : '';
    const locked = line.includes(HISTORICAL_LOCK) || previous.includes(HISTORICAL_LOCK);
    if (locked && scopes.has(match[2])) continue;
    findings.push({
      line:index + 1,
      literal:match[2],
      text:line.trim(),
      reason:locked ? 'historical-scope-missing' : 'stale-current-version-assertion',
    });
  }
  return findings;
}

function inspect(specPath, testRoot = TEST_ROOT) {
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const targetVersion = String(spec.productVersion || '');
  if (!/^3\.0\.0-alpha\.5\.\d+$/.test(targetVersion)) throw new Error(`RELEASE_PREFLIGHT_TARGET_INVALID:${targetVersion}`);
  const findings = [];
  for (const file of walkCjs(testRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const finding of staleProductAssertions(source, targetVersion)) findings.push({file, ...finding});
  }
  return {targetVersion, findings};
}

function inspectReleaseEvidenceContext(spec, context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return [{code:'E24_HANDOFF_CONTEXT_MISSING',detail:'release-evidence-context'}];
  }
  const targetProductVersion = String(spec?.productVersion || '');
  const input = {...context,targetProductVersion};
  return e24.inspectReleaseEvidenceHandoff(spec?.releaseEvidence,input);
}

function parseArgs(args) {
  let specPath = '';
  let contextPath = '';
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--spec' && args[index + 1]) {
      specPath = args[++index];
      continue;
    }
    if (arg === '--release-evidence-context' && args[index + 1]) {
      contextPath = args[++index];
      continue;
    }
    throw new Error('usage: node release_generic_preflight.cjs --spec <release-spec> [--release-evidence-context <transaction-local-json>]');
  }
  if (!specPath) throw new Error('usage: node release_generic_preflight.cjs --spec <release-spec> [--release-evidence-context <transaction-local-json>]');
  return {specPath,contextPath};
}

function run(argv) {
  const {specPath,contextPath} = parseArgs(argv.slice(2));
  const result = inspect(specPath);
  if (result.findings.length) {
    for (const finding of result.findings) {
      console.error(`RELEASE_PREFLIGHT_STALE_PRODUCT_LITERAL:${finding.file}:${finding.line}:${finding.literal}:target=${result.targetVersion}:reason=${finding.reason}`);
    }
    throw new Error(`RELEASE_PREFLIGHT_REJECTED:${result.findings.length}`);
  }

  if (contextPath) {
    const spec = JSON.parse(fs.readFileSync(specPath,'utf8'));
    const context = JSON.parse(fs.readFileSync(contextPath,'utf8'));
    const handoffFindings = inspectReleaseEvidenceContext(spec,context);
    if (handoffFindings.length) {
      for (const finding of handoffFindings) console.error(`RELEASE_PREFLIGHT_E24:${finding.code}:${finding.detail || ''}`);
      throw new Error(`RELEASE_PREFLIGHT_REJECTED:${handoffFindings.length}`);
    }
    console.log(`RELEASE_PREFLIGHT_E24_GREEN:${result.targetVersion}`);
  }

  console.log(`RELEASE_PREFLIGHT_GREEN:${result.targetVersion}`);
}

if (require.main === module) {
  try { run(process.argv); }
  catch (error) { console.error(error && error.message ? error.message : String(error)); process.exitCode = 1; }
}

module.exports = {HISTORICAL_LOCK, historicalScopeVersions, staleProductAssertions, inspect, inspectReleaseEvidenceContext, parseArgs};
