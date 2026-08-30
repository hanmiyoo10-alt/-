'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

function run(argv) {
  const args = argv.slice(2);
  if (args[0] !== '--spec' || !args[1] || args.length !== 2) {
    throw new Error('usage: node release_generic_preflight.cjs --spec <release-spec>');
  }
  const result = inspect(args[1]);
  if (result.findings.length) {
    for (const finding of result.findings) {
      console.error(`RELEASE_PREFLIGHT_STALE_PRODUCT_LITERAL:${finding.file}:${finding.line}:${finding.literal}:target=${result.targetVersion}:reason=${finding.reason}`);
    }
    throw new Error(`RELEASE_PREFLIGHT_REJECTED:${result.findings.length}`);
  }
  console.log(`RELEASE_PREFLIGHT_GREEN:${result.targetVersion}`);
}

if (require.main === module) {
  try { run(process.argv); }
  catch (error) { console.error(error && error.message ? error.message : String(error)); process.exitCode = 1; }
}

module.exports = {HISTORICAL_LOCK, historicalScopeVersions, staleProductAssertions, inspect};
