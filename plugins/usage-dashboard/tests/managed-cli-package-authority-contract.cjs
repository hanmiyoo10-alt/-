'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {loadCurrentRelease, assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const ROOT = process.cwd();
const release = loadCurrentRelease();
const alpha = /^3\.0\.0-alpha\.5\.(\d+)$/.exec(String(release.productVersion || ''));

// 5.88/5.89 are the historical authority-defect releases. 5.90 introduces the permanent contract.
if (alpha && Number(alpha[1]) < 90) {
  console.log(`Managed CLI Package Authority Contract: SKIP · historical ${release.productVersion} predates package-authority contract`);
  process.exit(0);
}

assert.ok(Object.hasOwn(release, 'managedCliVersion'), 'managed CLI authority: release spec missing managedCliVersion');
assert.ok(Object.hasOwn(release, 'managedCliAuthority'), 'managed CLI authority: release spec missing managedCliAuthority');
assert.match(String(release.managedCliVersion || ''), /^\d+\.\d+\.\d+$/, 'managed CLI authority: invalid package version');

const authorityRoot = path.resolve(ROOT, '.github/usage-dashboard/dependencies');
const authorityPath = path.resolve(ROOT, String(release.managedCliAuthority || ''));
const relative = path.relative(authorityRoot, authorityPath);
assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'managed CLI authority: authority path must stay inside dependency authority root');
assert.equal(path.extname(authorityPath), '.json', 'managed CLI authority: authority record must be JSON');
assert.ok(fs.existsSync(authorityPath), `managed CLI authority: authority record missing ${release.managedCliAuthority}`);

const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
assert.equal(authority.schemaVersion, 1, 'managed CLI authority: unsupported authority schema');
assert.equal(authority.package, '@llmgateway/cli', 'managed CLI authority: wrong package');
assert.equal(authority.upstreamRepository, 'theopenco/llmgateway-templates', 'managed CLI authority: wrong package repository');
assert.equal(authority.tagNamespace, '@llmgateway/cli@', 'managed CLI authority: wrong tag namespace');
assert.equal(authority.version, release.managedCliVersion, 'managed CLI authority: release spec must match package authority version');
assert.equal(authority.tag, `${authority.tagNamespace}${authority.version}`, 'managed CLI authority: tag must be package-specific');
assert.match(String(authority.tagCommit || ''), /^[0-9a-f]{40}$/, 'managed CLI authority: tag commit must be an exact SHA');
assert.equal(authority.parentProjectRepository, 'theopenco/llmgateway', 'managed CLI authority: parent project must remain explicitly separate');
assert.equal(authority.parentProjectReleaseIsPackageAuthority, false, 'managed CLI authority: parent project release must never be accepted as package authority');

assertCurrentReleaseArtifacts(release);
const engineCore = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/00-core.part.mjs', 'utf8');
const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const enginePin = engineCore.match(/const CLI_VERSION = process\.env\.LLMGATEWAY_CLI_VERSION \|\| '([^']+)';/)?.[1] || '';
const managerPin = manager.match(/const MANAGED_CLI_VERSION = '([^']+)';/)?.[1] || '';

assert.equal(enginePin, authority.version, 'managed CLI authority: Engine pin must equal package authority');
assert.equal(managerPin, authority.version, 'managed CLI authority: Manager pin must equal package authority');
assert.equal(enginePin, managerPin, 'managed CLI authority: Engine/Manager pins must remain identical');
assert.ok(engine.includes(`const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '${authority.version}';`), 'managed CLI authority: generated Engine must match canonical package authority');

console.log(`Managed CLI Package Authority Contract: OK · ${authority.package}@${authority.version} · tag ${authority.tag} · Engine/Manager pins package-bound · parent project release rejected as authority`);
