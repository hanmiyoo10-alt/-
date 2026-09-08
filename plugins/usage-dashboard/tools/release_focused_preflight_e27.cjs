'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {discoverTests} = require('../tests/registry.cjs');

const TEST_PREFIX = 'plugins/usage-dashboard/tests/';
const E21_TEST = 'plugins/usage-dashboard/tests/e21-evidence-consumer-convergence-contract.cjs';
const ALLOWED_OWNER_ROOTS = Object.freeze([
  'plugins/usage-dashboard/src',
  'plugins/usage-dashboard/runtime-src',
]);
const OWNER_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.json', '.html', '.css']);

class E27Error extends Error {
  constructor(code, detail = '') {
    super(detail ? `${code}:${detail}` : code);
    this.name = 'E27Error';
    this.code = code;
    this.detail = detail;
  }
}

function bounded(value, max = 160) {
  return String(value || '').replace(/[^A-Za-z0-9_./:=-]/g, '_').slice(0, max);
}

function fail(code, detail = '') {
  throw new E27Error(code, bounded(detail));
}

function normalizeFocusedRegressionPath(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') fail('RED_SPEC', 'newRegression-not-string');
  if (value.includes('\\') || value.includes('\0')) fail('RED_SPEC', 'newRegression-invalid-separator');
  if (path.posix.isAbsolute(value)) fail('RED_SPEC', 'newRegression-absolute');
  const normalized = path.posix.normalize(value);
  if (normalized !== value || value.includes('..')) fail('RED_SPEC', 'newRegression-path-traversal');
  if (!value.startsWith(TEST_PREFIX)) fail('RED_SPEC', 'newRegression-outside-tests');
  const leaf = value.slice(TEST_PREFIX.length);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*\.cjs$/.test(leaf)) fail('RED_SPEC', 'newRegression-invalid-name');
  if (leaf.includes('/')) fail('RED_SPEC', 'newRegression-not-registry-top-level');
  return value;
}

function readReleaseSpec(specPath) {
  if (typeof specPath !== 'string' || !specPath) fail('RED_SPEC', 'spec-path-missing');
  let raw;
  try {
    raw = fs.readFileSync(specPath, 'utf8');
  } catch {
    fail('RED_SPEC', 'spec-unreadable');
  }
  try {
    return JSON.parse(raw);
  } catch {
    fail('RED_SPEC', 'spec-json-invalid');
  }
}

function resolveFocusedRegression(specPath) {
  const spec = readReleaseSpec(specPath);
  const regressionPath = normalizeFocusedRegressionPath(spec.newRegression);
  if (regressionPath === null) return {spec, regressionPath:null};

  const suite = discoverTests();
  const filename = regressionPath.slice(TEST_PREFIX.length);
  const absolute = path.resolve(regressionPath);
  const expected = path.resolve(suite.testDir, filename);
  if (absolute !== expected) fail('RED_SPEC', 'newRegression-registry-path-mismatch');
  if (!suite.ordered.includes(filename)) fail('RED_SPEC', 'newRegression-not-discovered');
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail('RED_SPEC', 'newRegression-missing');
  return {spec, regressionPath};
}

function runNodeTest(testPath, failureCode) {
  const absolute = path.resolve(testPath);
  const result = spawnSync(process.execPath, [absolute], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) fail('RED_EXECUTION', `${path.basename(testPath)}-spawn`);
  if (result.status !== 0) fail(failureCode, `${path.basename(testPath)}-exit-${result.status || 1}`);
}

function runFocusedPreflight(specPath) {
  const {regressionPath} = resolveFocusedRegression(specPath);
  if (regressionPath !== null) runNodeTest(regressionPath, 'RED_FOCUSED_REGRESSION');

  const suite = discoverTests();
  const e21Name = path.basename(E21_TEST);
  if (!suite.ordered.includes(e21Name)) fail('RED_EXECUTION', 'e21-not-discovered');
  runNodeTest(E21_TEST, 'RED_E21_CONSUMER');

  return Object.freeze({
    result:'GREEN',
    regressionPath,
    e21:E21_TEST,
  });
}

function resolveUniqueSemanticOwnerFromFiles(marker, files) {
  if (typeof marker !== 'string' || marker.length < 1 || marker.length > 240) fail('RED_OWNER_MISSING', 'invalid-marker');
  if (!Array.isArray(files)) fail('RED_EXECUTION', 'owner-files-not-array');
  const matches = [];
  for (const row of files) {
    if (!row || typeof row.path !== 'string' || typeof row.content !== 'string') continue;
    if (row.content.includes(marker)) matches.push(row.path);
  }
  if (matches.length === 0) fail('RED_OWNER_MISSING', bounded(marker, 80));
  if (matches.length !== 1) fail('RED_OWNER_AMBIGUOUS', `${bounded(marker, 60)}:${matches.length}`);
  return Object.freeze({path:matches[0], marker});
}

function collectSourceFiles(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    if (!fs.existsSync(current)) continue;
    for (const entry of fs.readdirSync(current, {withFileTypes:true})) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(child);
      else if (entry.isFile() && OWNER_EXTENSIONS.has(path.extname(entry.name))) {
        out.push({path:child.split(path.sep).join('/'), content:fs.readFileSync(child, 'utf8')});
      }
    }
  }
  return out;
}

function resolveUniqueSemanticOwner(marker, roots = ALLOWED_OWNER_ROOTS) {
  if (!Array.isArray(roots) || roots.length < 1) fail('RED_EXECUTION', 'owner-roots-empty');
  const allowed = new Set(ALLOWED_OWNER_ROOTS);
  const files = [];
  for (const root of roots) {
    if (!allowed.has(root)) fail('RED_EXECUTION', `owner-root-denied:${root}`);
    files.push(...collectSourceFiles(root));
  }
  return resolveUniqueSemanticOwnerFromFiles(marker, files);
}

function main(argv = process.argv.slice(2)) {
  const specIndex = argv.indexOf('--spec');
  const ownerIndex = argv.indexOf('--resolve-owner');
  try {
    if (specIndex >= 0) {
      const specPath = argv[specIndex + 1];
      const result = runFocusedPreflight(specPath);
      console.log(`UD_E27_FOCUSED_PREFLIGHT:GREEN:${result.regressionPath || 'none'}`);
      return;
    }
    if (ownerIndex >= 0) {
      const marker = argv[ownerIndex + 1];
      const result = resolveUniqueSemanticOwner(marker);
      console.log(`UD_E27_OWNER:GREEN:${result.path}`);
      return;
    }
    fail('RED_EXECUTION', 'usage');
  } catch (error) {
    const code = error instanceof E27Error ? error.code : 'RED_EXECUTION';
    const detail = error instanceof E27Error ? error.detail : 'unexpected';
    console.error(`UD_E27_FOCUSED_PREFLIGHT:${code}:${bounded(detail)}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  TEST_PREFIX,
  E21_TEST,
  ALLOWED_OWNER_ROOTS,
  E27Error,
  normalizeFocusedRegressionPath,
  resolveFocusedRegression,
  runFocusedPreflight,
  resolveUniqueSemanticOwnerFromFiles,
  resolveUniqueSemanticOwner,
};
