#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { selectArchitectureContract } from './ci/architecture-contract-select.mjs';

const ROOT = process.cwd();
const PROFILES = new Set(['PR_MAIN', 'MAIN_HEALTH', 'CANDIDATE_SHADOW', 'CANDIDATE_REQUIRED']);
const CANDIDATE_REQUIRED_AUTHORITIES = new Set(['RS2_4_SHADOW', 'RS2_4_RELEASE']);
const MAX_REPORT = 256 * 1024;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--') || i + 1 >= argv.length) throw new Error(`invalid argument ${arg}`);
    out[arg.slice(2)] = argv[++i];
  }
  for (const key of ['profile', 'source', 'mirror-source', 'production-identity', 'report']) if (!out[key]) throw new Error(`--${key} required`);
  if (!PROFILES.has(out.profile)) throw Object.assign(new Error('unsupported profile'), { ciCode: 'CI_PROFILE_INVALID' });
  return out;
}

function inside(rel) {
  const resolved = path.resolve(ROOT, rel);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) throw Object.assign(new Error(`path outside root: ${rel}`), { ciCode: 'CI_PATH_INVALID' });
  return resolved;
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function shortVersion(command, args) {
  const r = spawnSync(command, args, { encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });
  if (r.status !== 0) return 'unavailable';
  const m = String(r.stdout || r.stderr).match(/(\d+)\.(\d+)/);
  return m ? `${m[1]}.${m[2]}` : 'unknown';
}
function bounded(value, max = 2048) {
  const s = String(value || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  return s.length <= max ? s : `${s.slice(0, max)}…[truncated]`;
}
function run(command, args, timeout = 120000, extra = {}) {
  const r = spawnSync(command, args, { encoding: 'utf8', timeout, maxBuffer: 1024 * 1024, ...extra });
  return { status: r.status, signal: r.signal || null, error: r.error || null, stdout: bounded(r.stdout), stderr: bounded(r.stderr) };
}
function gate(id, planned) { return { id, planned, status: planned ? 'PENDING' : 'NOT_APPLICABLE', reasonCode: null }; }
function scopePaths(scope) {
  return (scope?.paths || []).map((row) => typeof row === 'string' ? row : row?.path).filter(Boolean);
}
function hasCandidateRequest(scope) {
  return scopePaths(scope).some((p) => /^products\/simcore\/releases\/candidate-requests\/[^/]+\.json$/.test(String(p)));
}

function plannedGates(profile, scope) {
  const ids = ['GATE_CI_SELF','GATE_MCP_TOOLING','GATE_PR1_DRY','GATE_STATIC','GATE_ARCH','GATE_REGRESSION','GATE_STATE','GATE_COORDINATION','GATE_LEGACY_COMPAT'];
  const plan = Object.fromEntries(ids.map((id) => [id, false]));
  if (['MAIN_HEALTH','CANDIDATE_SHADOW','CANDIDATE_REQUIRED'].includes(profile)) {
    for (const id of ['GATE_STATIC','GATE_ARCH','GATE_REGRESSION','GATE_STATE','GATE_COORDINATION','GATE_LEGACY_COMPAT']) plan[id] = true;
    return plan;
  }
  if (scope.unrelated || scope.docOnly) return plan;
  const labels = new Set(scope.labels || []);
  if (labels.has('CI_SELF')) for (const id of ['GATE_CI_SELF','GATE_STATIC','GATE_ARCH','GATE_REGRESSION']) plan[id] = true;
  if (labels.has('HARNESS')) for (const id of ['GATE_CI_SELF','GATE_STATIC','GATE_ARCH','GATE_REGRESSION']) plan[id] = true;
  if (labels.has('MCP_TOOLING')) plan.GATE_MCP_TOOLING = true;
  if (labels.has('ARCH_CONTRACT')) for (const id of ['GATE_STATIC','GATE_ARCH','GATE_REGRESSION']) plan[id] = true;
  if (labels.has('STATE_SYNC')) for (const id of ['GATE_STATIC','GATE_STATE']) plan[id] = true;
  if (labels.has('SHARED_MAIN_COORDINATION')) for (const id of ['GATE_STATIC','GATE_COORDINATION']) plan[id] = true;
  if (labels.has('LEGACY_VERIFICATION')) for (const id of ['GATE_STATIC','GATE_ARCH','GATE_REGRESSION','GATE_LEGACY_COMPAT']) plan[id] = true;
  if (hasCandidateRequest(scope)) plan.GATE_PR1_DRY = true;
  return plan;
}

function resultClass(runResult, semanticCode, infraCode) {
  if (runResult.error || runResult.status === null || runResult.signal) return { status:'INFRA_ERROR', reasonCode:infraCode };
  if (runResult.status === 0) return { status:'PASS', reasonCode:null };
  if (runResult.status === 1) return { status:'FAIL', reasonCode:semanticCode };
  return { status:'INFRA_ERROR', reasonCode:infraCode };
}

function stateCheck(args) {
  const report = '.simcore-ci/state-check.json';
  return run(process.execPath, [
    'products/simcore/tooling/sync-state.mjs', '--check', '--root', '.', '--manifest', 'product-manifest.json',
    '--production-identity', args['production-identity'], '--targets', 'products/simcore/state-sync/target-registry.json',
    '--probes', 'products/simcore/state-sync/current-claim-probes.json', '--writer-policy', 'products/simcore/state-sync/writer-policy.json',
    '--report', report,
  ], 120000);
}

function pr1DryCheck(args, productionCommit) {
  if (!args['pr-base-commit'] || !args['pr-head-commit']) {
    return { status: 2, signal: null, error: null, stdout: '', stderr: 'PR1_DRY_PR_IDENTITY_MISSING' };
  }
  return run(process.execPath, [
    'products/simcore/tooling/ci/pr1-dry-qualification.mjs',
    '--root', '.',
    '--base-commit', args['pr-base-commit'],
    '--head-commit', args['pr-head-commit'],
    '--production-commit', productionCommit,
    '--report', '.simcore-ci/pr1-dry-qualification.json',
  ], 360000);
}

function phaseResult(phase, result, statusOverride = undefined) {
  const detail = [result.stderr, result.stdout].filter(Boolean).join('\n');
  return {
    ...result,
    status: statusOverride === undefined ? result.status : statusOverride,
    stderr: bounded(`phase=${phase}${detail ? `\n${detail}` : ''}`),
  };
}

function mcpToolingCheck() {
  const install = run('python3', ['-m','pip','install','--disable-pip-version-check','-e','tools/simcore-mcp'], 240000);
  if (install.status !== 0 || install.error || install.signal) {
    const status = !install.error && !install.signal && install.status === 1 ? 2 : install.status;
    return phaseResult('install', install, status);
  }
  const compile = run('python3', ['-m','compileall','-q','tools/simcore-mcp/simcore_mcp','tools/simcore-mcp/tests'], 120000);
  if (compile.status !== 0 || compile.error || compile.signal) return phaseResult('compile', compile);
  const tests = run('python3', ['-m','unittest','discover','-s','tools/simcore-mcp/tests','-p','test_*.py','-v'], 240000);
  return phaseResult('unit_tests', tests);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.profile === 'CANDIDATE_REQUIRED' && !CANDIDATE_REQUIRED_AUTHORITIES.has(args['candidate-required-authority'])) {
    throw Object.assign(new Error('CANDIDATE_REQUIRED caller authority is not an authorized RS2-4 lane'), { ciCode:'CANDIDATE_REQUIRED_RESERVED_FOR_RS2_4' });
  }
  const sourcePath = inside(args.source), mirrorPath = inside(args['mirror-source']);
  const sourceBytes = fs.readFileSync(sourcePath), mirrorBytes = fs.readFileSync(mirrorPath);
  let scope = { schemaVersion:1, labels:[], unrelated:false, docOnly:false };
  if (args['scope-file']) scope = JSON.parse(fs.readFileSync(inside(args['scope-file']), 'utf8'));
  if (args.profile !== 'PR_MAIN') scope = { schemaVersion:1, labels:['FULL_BASELINE'],unrelated:false,docOnly:false };
  const identity = JSON.parse(fs.readFileSync(inside(args['production-identity']), 'utf8'));

  const plan = plannedGates(args.profile, scope);
  const gates = Object.fromEntries(Object.entries(plan).map(([id, p]) => [id, gate(id, p)]));
  const reasonCodes = [];
  const observations = [];
  const details = {};

  const setGate = (id, classification, runResult = null) => {
    Object.assign(gates[id], classification);
    if (classification.reasonCode) reasonCodes.push(classification.reasonCode);
    if (runResult && classification.status !== 'PASS') details[id] = { exitCode:runResult.status, signal:runResult.signal, stderr:runResult.stderr };
  };

  if (plan.GATE_CI_SELF) {
    const primary = run(process.execPath, ['products/simcore/tooling/ci/self-test.mjs'], 120000);
    if (primary.status !== 0 || primary.error || primary.signal) {
      setGate('GATE_CI_SELF', resultClass(primary, 'CI_SELF_TEST_FAIL', 'CI_SELF_TEST_ERROR'), primary);
    } else {
      const mcpCoverage = run(process.execPath, ['products/simcore/tooling/ci/mcp-tooling-self-test.mjs'], 60000);
      setGate('GATE_CI_SELF', resultClass(mcpCoverage, 'CI_SELF_TEST_FAIL', 'CI_SELF_TEST_ERROR'), mcpCoverage);
    }
  }
  if (plan.GATE_MCP_TOOLING) {
    const r = mcpToolingCheck();
    setGate('GATE_MCP_TOOLING', resultClass(r, 'MCP_TOOLING_TEST_FAIL', 'MCP_TOOLING_GATE_ERROR'), r);
  }
  if (plan.GATE_PR1_DRY) {
    const r = pr1DryCheck(args, identity.resolvedCommit);
    setGate('GATE_PR1_DRY', resultClass(r, 'PR1_DRY_QUALIFICATION_FAIL', 'PR1_DRY_QUALIFICATION_ERROR'), r);
  }
  if (plan.GATE_STATIC) {
    let classification;
    if (!sourceBytes.equals(mirrorBytes)) classification = { status:'FAIL', reasonCode:'LATEST_INSTALL_MISMATCH' };
    else {
      const a = run(process.execPath, ['--check', sourcePath], 60000);
      const b = run(process.execPath, ['--check', mirrorPath], 60000);
      if (a.status === 0 && b.status === 0) classification = { status:'PASS', reasonCode:null };
      else if ([a.status,b.status].includes(1)) classification = { status:'FAIL', reasonCode:'SOURCE_SYNTAX_INVALID' };
      else classification = { status:'INFRA_ERROR', reasonCode:'STATIC_GATE_ERROR' };
    }
    setGate('GATE_STATIC', classification);
  }
  let architectureContract = null;
  if (plan.GATE_ARCH) {
    try {
      architectureContract = selectArchitectureContract({ root: ROOT, source: sourcePath, mirrorSource: mirrorPath });
      const r = run('python3', ['scripts/simcore-architecture-check.py','--contract',architectureContract.contract,'--source',sourcePath,'--source',mirrorPath], 120000);
      setGate('GATE_ARCH', resultClass(r, 'ARCH_CONTRACT_FAIL', 'ARCH_GATE_ERROR'), r);
    } catch (error) {
      setGate('GATE_ARCH', { status:'INFRA_ERROR', reasonCode:error?.code || 'ARCH_CONTRACT_SELECT_ERROR' }, { status:2, signal:null, error:null, stdout:'', stderr:String(error?.message || error) });
    }
  }
  if (plan.GATE_REGRESSION) {
    const r = run(process.execPath, ['products/simcore/tooling/test.mjs','--source',sourcePath,'--suite','batch-a','--report','.simcore-ci/regression.json'], 240000);
    setGate('GATE_REGRESSION', resultClass(r, 'PERMANENT_REGRESSION_FAIL', 'HARNESS_ERROR'), r);
  }
  if (plan.GATE_STATE) {
    const r = stateCheck(args);
    const c = r.status === 0 ? {status:'PASS',reasonCode:null} : r.status === 1 ? {status:'FAIL',reasonCode:'STATE_DRIFT'} : {status:'INFRA_ERROR',reasonCode:'STATE_CHECK_BLOCKED'};
    setGate('GATE_STATE', c, r);
    try {
      const state = JSON.parse(fs.readFileSync('.simcore-ci/state-check.json','utf8'));
      for (const f of state.findings || []) if (f.severity === 'OBSERVATION') observations.push(f.code);
    } catch {}
  }
  if (plan.GATE_COORDINATION) {
    const r = run('python3', ['scripts/test-repo-main-write.py'], 120000);
    setGate('GATE_COORDINATION', resultClass(r, 'COORDINATION_COMPAT_FAIL', 'COORDINATION_GATE_ERROR'), r);
  }
  if (plan.GATE_LEGACY_COMPAT) {
    const r = run(process.execPath, ['products/simcore/tooling/ci/legacy-compat.mjs','--source',sourcePath,'--report','.simcore-ci/legacy-compat.json'], 180000);
    setGate('GATE_LEGACY_COMPAT', resultClass(r, 'LEGACY_COMPAT_SEMANTIC_FAIL', 'LEGACY_COMPAT_ERROR'), r);
  }

  const planned = Object.values(gates).filter((x) => x.planned);
  const infra = planned.some((x) => x.status === 'INFRA_ERROR');
  const failed = planned.some((x) => x.status === 'FAIL');
  const noop = args.profile === 'PR_MAIN' && planned.length === 0;
  const conclusion = infra ? 'INFRA_ERROR' : failed ? 'FAIL' : noop ? 'NOOP' : 'PASS';
  if (noop) reasonCodes.push(scope.docOnly ? 'NOOP_SIMCORE_DOC_ONLY' : 'NOOP_UNRELATED');

  const report = {
    schemaVersion:1,
    profile:args.profile,
    conclusion,
    reasonCodes:[...new Set(reasonCodes)],
    verifierCommit:args['verifier-commit'] || null,
    productionCommit:identity.resolvedCommit || null,
    candidateCommit:args['candidate-commit'] || null,
    expectedProductionCommit:args['expected-production-commit'] || null,
    candidateRequiredAuthority:args['candidate-required-authority'] || null,
    prBaseCommit:args['pr-base-commit'] || null,
    prHeadCommit:args['pr-head-commit'] || null,
    scopeLabels:scope.labels || [],
    gates:Object.values(gates),
    architectureContract:architectureContract ? { version:architectureContract.version, path:architectureContract.contract, transitional:architectureContract.transitional } : null,
    stateCheck:gates.GATE_STATE.status === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : gates.GATE_STATE.status,
    observationIds:[...new Set(observations)],
    sourceDigests:{ latestSha256:sha256(sourceBytes), installSha256:sha256(mirrorBytes), bytes:sourceBytes.length },
    toolchain:{ node:shortVersion(process.execPath,['--version']), python:shortVersion('python3',['--version']), runner:'ubuntu-24.04' },
    details,
    reportTruncated:false,
  };
  let encoded = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
  if (encoded.length > MAX_REPORT) {
    report.details = { report:'details truncated to preserve 256 KiB bound' };
    report.reportTruncated = true;
    encoded = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
  }
  if (encoded.length > MAX_REPORT) throw Object.assign(new Error('bounded report still exceeds limit'), { ciCode:'CI_REPORT_TOO_LARGE' });
  fs.mkdirSync(path.dirname(inside(args.report)), { recursive:true });
  fs.writeFileSync(inside(args.report), encoded);
  console.log(`SimCore permanent CI ${conclusion}; planned=${planned.map((x)=>x.id).join(',') || 'NONE'}`);
  if (conclusion === 'FAIL') process.exit(1);
  if (conclusion === 'INFRA_ERROR') process.exit(2);
}

try { main(); }
catch (error) {
  console.error(`${error?.ciCode || 'CI_RUNNER_ERROR'}: ${error?.message || error}`);
  process.exit(2);
}
