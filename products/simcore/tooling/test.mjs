#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registry, packAliases } from '../tests/registry.mjs';
import { BundleLoader, HarnessError, extractModuleSource, extractFunctionSource, loadFunctions, invokeExtracted } from './bundle-loader.mjs';
import { createDiagnosticDom } from './test-context.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const testsRoot = path.join(root, 'tests');
const defaultContract = path.join(root, 'contracts', 'frozen-surfaces-v1.json');

function parseArgs(argv) {
  const out = { suite: 'batch-a', mode: 'single' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--self-test') out.selfTest = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new HarnessError('INVOCATION_ERROR', `missing value for ${arg}`);
      out[key] = value;
      i += 1;
    } else throw new HarnessError('INVOCATION_ERROR', `unexpected argument ${arg}`);
  }
  return out;
}

function validateRegistry() {
  const seen = new Set();
  for (const row of registry) {
    if (!row?.id || seen.has(row.id)) throw new HarnessError('REGISTRY_INVALID', `duplicate/invalid suite: ${row?.id}`);
    seen.add(row.id);
    if (!['EXECUTABLE', 'HYBRID_TRANSITIONAL'].includes(row.coverage)) throw new HarnessError('REGISTRY_INVALID', `coverage: ${row.id}`);
  }
}

function validateFixture(fixture, expectedSuite) {
  if (!fixture || fixture.schemaVersion !== 1 || typeof fixture.id !== 'string' || !fixture.id) throw new HarnessError('FIXTURE_SCHEMA_INVALID', 'fixture envelope');
  if (fixture.suite !== expectedSuite) throw new HarnessError('FIXTURE_SCHEMA_INVALID', `${fixture.id} suite mismatch`);
  if (!Object.prototype.hasOwnProperty.call(fixture, 'input') || !Object.prototype.hasOwnProperty.call(fixture, 'expected')) throw new HarnessError('FIXTURE_SCHEMA_INVALID', `${fixture.id} missing input/expected`);
  if (!fixture.meta || fixture.meta.goldenGate !== true) throw new HarnessError('FIXTURE_SCHEMA_INVALID', `${fixture.id} goldenGate`);
  if (!['EXECUTABLE', 'HYBRID_TRANSITIONAL'].includes(fixture.meta.coverageExpectation)) throw new HarnessError('FIXTURE_SCHEMA_INVALID', `${fixture.id} coverageExpectation`);
}

function loadFixtures(suite) {
  const dir = path.join(testsRoot, 'fixtures', suite.fixtureDir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new HarnessError('FIXTURE_DIRECTORY_MISSING', suite.id);
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
  if (!files.length) throw new HarnessError('REQUIRED_FIXTURE_MISSING', suite.id);
  const seen = new Set();
  return files.map((name) => {
    const fixture = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    validateFixture(fixture, suite.id);
    if (seen.has(fixture.id)) throw new HarnessError('FIXTURE_ID_DUPLICATE', fixture.id);
    seen.add(fixture.id);
    return fixture;
  });
}

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}

function sourceMeta(sourcePath, bytes) {
  const text = bytes.toString('utf8');
  const version = text.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || null;
  return { label: path.basename(sourcePath), bytes: bytes.length, sha256: sha256(bytes), gitBlobSha1: gitBlobSha1(bytes), version };
}

function resolveSuites(value) {
  const ids = packAliases[value] || [value];
  const out = [];
  for (const id of ids) {
    const row = registry.find((r) => r.id === id);
    if (!row) throw new HarnessError('SUITE_UNKNOWN', id);
    out.push(row);
  }
  return out;
}

async function runSource(sourcePath, suiteValue, contractPath) {
  const before = fs.readFileSync(sourcePath);
  const source = before.toString('utf8');
  const meta = sourceMeta(sourcePath, before);
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  for (const marker of contract.requiredSourceMarkers || []) {
    if (!source.includes(marker)) throw new HarnessError('FROZEN_SURFACE_MISSING', marker);
  }
  const loader = new BundleLoader(source);
  const suiteRows = [];
  for (const suite of resolveSuites(suiteValue)) {
    const fixtures = loadFixtures(suite);
    const moduleUrl = pathToFileURL(path.join(testsRoot, suite.module.replace(/^\.\//, ''))).href;
    const mod = await import(moduleUrl);
    if (typeof mod.runSuite !== 'function') throw new HarnessError('SUITE_INVALID', `${suite.id} runSuite missing`);
    try {
      const result = await mod.runSuite({ source, loader, fixtures });
      if (result.coverage !== suite.coverage) throw new HarnessError('COVERAGE_STATE_MISMATCH', `${suite.id}: ${result.coverage}`);
      suiteRows.push({ id: suite.id, coverage: suite.coverage, status: result.status || 'PASS', assertions: result.assertions || [], missingExecutableSurface: result.missingExecutableSurface || null });
    } catch (error) {
      if (error instanceof HarnessError) throw error;
      throw new HarnessError('SUITE_ASSERTION_FAILED', `${suite.id}: ${error?.message || error}`);
    }
  }
  const after = fs.readFileSync(sourcePath);
  if (!before.equals(after)) throw new HarnessError('SOURCE_MUTATION_DETECTED', sourcePath);
  return { source: meta, suites: suiteRows };
}

async function selfTest() {
  const checks = [];
  const ok = (id, fn) => {
    try { fn(); checks.push({ id, status: 'PASS' }); }
    catch (error) { throw new HarnessError('HARNESS_SELF_TEST_FAILED', `${id}: ${error?.message || error}`); }
  };
  const expectCode = (id, code, fn) => ok(id, () => {
    let got = null;
    try { fn(); } catch (error) { got = error?.code || null; }
    if (got !== code) throw new Error(`expected ${code}, got ${got}`);
  });

  const mini = 'SimCore.define("a", function (require, module, exports) { module.exports = { value: 1 }; });\nSimCore.define("z", function (require, module, exports) { module.exports = {}; });\n';
  ok('unique-module-extraction', () => { if (!extractModuleSource(mini, 'a').includes('value: 1')) throw new Error('bad slice'); });
  expectCode('duplicate-module-extraction', 'MODULE_EXTRACTION_AMBIGUOUS', () => extractModuleSource(mini + mini, 'a'));
  expectCode('missing-module-extraction', 'MODULE_EXTRACTION_FAILED', () => extractModuleSource(mini, 'missing'));
  const fsrc = 'function one(){ return 1; }\nfunction two(){ return missingDependency(); }';
  ok('unique-function-extraction', () => { if (!extractFunctionSource(fsrc, 'one').includes('return 1')) throw new Error('bad function'); });
  expectCode('duplicate-function-extraction', 'FUNCTION_EXTRACTION_AMBIGUOUS', () => extractFunctionSource('function one(){} function one(){}', 'one'));
  expectCode('function-dependency-unresolved', 'FUNCTION_DEPENDENCY_UNRESOLVED', () => {
    const { two } = loadFunctions(fsrc, ['two']);
    invokeExtracted(two);
  });
  expectCode('invalid-fixture-schema', 'FIXTURE_SCHEMA_INVALID', () => validateFixture({ schemaVersion: 1, id: 'bad' }, 'x'));
  expectCode('undeclared-capability-request', 'MODULE_DEPENDENCY_UNRESOLVED', () => {
    const src = 'SimCore.define("cap", function (require, module, exports) { require("host"); module.exports = {}; });\nSimCore.define("z", function (require, module, exports) { module.exports = {}; });\n';
    new BundleLoader(src).load('cap');
  });
  ok('fixture-state-isolation', () => {
    const a = createDiagnosticDom(); const b = createDiagnosticDom();
    a.body.children.push({});
    if (b.body.children.length !== 0) throw new Error('state leaked');
  });
  ok('bounded-report-no-raw-source', () => {
    const sentinel = 'SECRET_RAW_SOURCE_BODY';
    const report = { source: { sha256: sha256(Buffer.from(sentinel)), bytes: sentinel.length }, suites: [] };
    if (JSON.stringify(report).includes(sentinel)) throw new Error('raw source leaked');
  });
  ok('source-bytes-unchanged', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-rs21-'));
    const file = path.join(dir, 'source.js');
    const bytes = Buffer.from(mini, 'utf8');
    fs.writeFileSync(file, bytes);
    const loader = new BundleLoader(fs.readFileSync(file, 'utf8'));
    loader.load('a');
    if (!fs.readFileSync(file).equals(bytes)) throw new Error('source mutated');
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return checks;
}

function writeReport(reportPath, report) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateRegistry();
  if (args.selfTest) {
    const checks = await selfTest();
    const report = { schemaVersion: 1, mode: 'self-test', status: 'PASS', checks };
    writeReport(args.report, report);
    console.log(`RS2-1 harness self-test PASS (${checks.length})`);
    return;
  }
  const contractPath = path.resolve(args.contract || defaultContract);
  if (args.mode === 'differential') {
    if (!args.baseline || !args.candidate) throw new HarnessError('INVOCATION_ERROR', 'differential mode requires --baseline and --candidate');
    const baseline = await runSource(path.resolve(args.baseline), args.suite, contractPath);
    const candidate = await runSource(path.resolve(args.candidate), args.suite, contractPath);
    const report = { schemaVersion: 1, mode: 'differential', status: 'PASS', suite: args.suite, baseline, candidate };
    writeReport(args.report, report);
    console.log(`RS2-1 differential PASS: ${args.suite}`);
    return;
  }
  if (!args.source) throw new HarnessError('INVOCATION_ERROR', 'single-source mode requires --source');
  const result = await runSource(path.resolve(args.source), args.suite, contractPath);
  const report = { schemaVersion: 1, mode: 'single', status: 'PASS', suite: args.suite, ...result };
  writeReport(args.report, report);
  console.log(`RS2-1 ${args.suite} PASS: ${result.suites.length} suites`);
}

main().catch((error) => {
  const code = error?.code || 'HARNESS_ERROR';
  console.error(`${code}: ${error?.message || error}`);
  process.exit(code === 'SUITE_ASSERTION_FAILED' ? 1 : 2);
});
