#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validatePostPublishStateEnvelope } from './release-state-converge.mjs';

const SAFE_PREFIX = /^[A-Za-z0-9_.-]{1,96}$/;
const EPHEMERAL_PREFIXES = ['.simcore-release/', '.simcore-state-sync/', 'dist/'];

function fail(code, detail = '') {
  const e = new Error(detail ? `${code}: ${detail}` : code);
  e.code = code;
  throw e;
}
function parseArgs(argv) {
  const out = { validateOnly:false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--validate-only') { out.validateOnly = true; continue; }
    if (!arg.startsWith('--')) fail('R2_6_MAIN_GATE_ARGS_INVALID', arg);
    const key = arg.slice(2);
    const value = argv[++i];
    if (value == null || value.startsWith('--')) fail('R2_6_MAIN_GATE_ARGS_INVALID', key);
    out[key] = value;
  }
  return out;
}
function under(root, rel) {
  if (!rel || typeof rel !== 'string' || path.isAbsolute(rel)) fail('R2_6_MAIN_GATE_PATH_INVALID', String(rel));
  const resolved = path.resolve(root, rel);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) fail('R2_6_MAIN_GATE_PATH_INVALID', rel);
  return resolved;
}
function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { fail(code, e.message); }
}
function runCommand(root, command, args, code, env = process.env) {
  const r = spawnSync(command, args, { cwd:root, encoding:'utf8', env, maxBuffer:4*1024*1024 });
  if (r.status !== 0) fail(code, `${command} ${args.join(' ')}\n${r.stdout || ''}\n${r.stderr || ''}`.trim());
  return (r.stdout || '').trim();
}
function uniqueSorted(values) { return [...new Set(values)].sort(); }
function policyAllows(policy, rel) {
  const p = policy?.postPublishState;
  if (!p || !Array.isArray(p.exactPaths) || !Array.isArray(p.prefixPaths)) return false;
  return p.exactPaths.includes(rel) || p.prefixPaths.some((prefix) => typeof prefix === 'string' && rel.startsWith(prefix) && rel.length > prefix.length);
}
function validatePolicy(policy) {
  if (!policy || policy.policyVersion !== 2 || policy.cutoverState !== 'CANONICAL_ACTIVE') fail('R2_6_STATE_PAYLOAD_POLICY_FAIL', 'policy version');
  if (policy.requirements?.mainIntegration !== 'repo-main-write.py' || policy.requirements?.directMainPushForbidden !== true) fail('R2_6_STATE_PAYLOAD_POLICY_FAIL', 'main integration');
  const p = policy.postPublishState;
  if (!p || p.mainGateway !== 'scripts/repo-main-write.py' || p.requiredWorkflow !== 'simcore-ci.yml' || p.requiredProfile !== 'MAIN_HEALTH' || p.requiredJob !== 'Required') fail('R2_6_STATE_PAYLOAD_POLICY_FAIL', 'postPublishState contract');
}

export function validateEnvelopePolicy(envelope, policy) {
  validatePostPublishStateEnvelope(envelope);
  validatePolicy(policy);
  if (!['PERMANENT','RECOVERY'].includes(envelope.mode)) fail('R2_6_STATE_ENVELOPE_INVALID', `main gate mode ${envelope.mode}`);
  const manifestPaths = envelope.persistentPayloadManifest.map((row) => row.path);
  for (const rel of manifestPaths) if (!policyAllows(policy, rel)) fail('R2_6_STATE_PAYLOAD_POLICY_FAIL', rel);
  for (const rel of envelope.changedPaths) if (!manifestPaths.includes(rel) || !policyAllows(policy, rel)) fail('R2_6_STATE_PAYLOAD_POLICY_FAIL', rel);
  return { manifestPaths, changedPaths: envelope.changedPaths };
}
function workingTreePaths(root) {
  const tracked = runCommand(root, 'git', ['diff','--name-only','HEAD','--'], 'R2_6_STATE_GIT_DIFF_MISMATCH')
    .split(/\r?\n/).filter(Boolean);
  const untracked = runCommand(root, 'git', ['ls-files','--others','--exclude-standard'], 'R2_6_STATE_GIT_DIFF_MISMATCH')
    .split(/\r?\n/).filter(Boolean);
  return uniqueSorted([...tracked, ...untracked].filter((rel) => !EPHEMERAL_PREFIXES.some((prefix) => rel.startsWith(prefix))));
}
function assertExactDiff(root, envelope) {
  const actual = workingTreePaths(root);
  const expected = uniqueSorted(envelope.changedPaths);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('R2_6_STATE_GIT_DIFF_MISMATCH', `actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
  return actual;
}
function writeReport(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function run(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  for (const k of ['root','envelope','writer-policy','report']) if (!a[k]) fail('R2_6_MAIN_GATE_ARGS_INVALID', k);
  const root = path.resolve(a.root);
  const envelope = readJson(under(root, a.envelope), 'R2_6_STATE_ENVELOPE_INVALID');
  const policy = readJson(under(root, a['writer-policy']), 'R2_6_STATE_PAYLOAD_POLICY_FAIL');
  const reportPath = under(root, a.report);
  validateEnvelopePolicy(envelope, policy);
  const diff = assertExactDiff(root, envelope);

  if (a.validateOnly) {
    const report = { schemaVersion:1, tool:'release-state-main-gate', mode:envelope.mode, releaseId:envelope.releaseId, result:'VALIDATION_PASS', changedPaths:diff, productionMutation:envelope.productionMutation, mainMutation:'NONE' };
    writeReport(reportPath, report);
    return report;
  }

  if (envelope.changedPaths.length === 0) {
    if (envelope.mainMutation !== 'NONE') fail('R2_6_STATE_ENVELOPE_INVALID', 'no changedPaths with mutation');
    const report = { schemaVersion:1, tool:'release-state-main-gate', mode:envelope.mode, releaseId:envelope.releaseId, result:'ALREADY_DURABLE', changedPaths:[], productionMutation:envelope.productionMutation, mainMutation:'NONE', payloadCommit:null, durableMainCommit:runCommand(root,'git',['rev-parse','HEAD'],'R2_6_MAIN_GATE_FAIL') };
    writeReport(reportPath, report);
    return report;
  }
  if (envelope.mainMutation !== 'LOCAL_PAYLOAD_PENDING_GATEWAY') fail('R2_6_STATE_ENVELOPE_INVALID', `mainMutation=${envelope.mainMutation}`);
  if (!a.message || a.message.length > 180 || /[\r\n\0]/.test(a.message)) fail('R2_6_MAIN_GATE_ARGS_INVALID', 'message');
  if (!a['staging-prefix'] || !SAFE_PREFIX.test(a['staging-prefix'])) fail('R2_6_MAIN_GATE_ARGS_INVALID', 'staging-prefix');

  runCommand(root, 'git', ['add','--', ...envelope.changedPaths], 'R2_6_MAIN_GATE_FAIL');
  const staged = runCommand(root, 'git', ['diff','--cached','--name-only'], 'R2_6_MAIN_GATE_FAIL').split(/\r?\n/).filter(Boolean).sort();
  if (JSON.stringify(staged) !== JSON.stringify(uniqueSorted(envelope.changedPaths))) fail('R2_6_STATE_GIT_DIFF_MISMATCH', `staged=${JSON.stringify(staged)}`);
  runCommand(root, 'git', ['config','user.name','github-actions[bot]'], 'R2_6_MAIN_GATE_FAIL');
  runCommand(root, 'git', ['config','user.email','41898282+github-actions[bot]@users.noreply.github.com'], 'R2_6_MAIN_GATE_FAIL');
  runCommand(root, 'git', ['commit','-m',a.message], 'R2_6_MAIN_GATE_FAIL');
  const payloadCommit = runCommand(root, 'git', ['rev-parse','HEAD'], 'R2_6_MAIN_GATE_FAIL');

  const gate = policy.postPublishState;
  const gatewayArgs = [
    gate.mainGateway,
    '--commit', payloadCommit,
    ...envelope.changedPaths.flatMap((rel) => ['--allow', rel]),
    '--required-workflow', gate.requiredWorkflow,
    '--required-profile', gate.requiredProfile,
    '--required-job', gate.requiredJob,
    '--staging-prefix', a['staging-prefix'],
  ];
  runCommand(root, 'python3', gatewayArgs, 'R2_6_MAIN_GATE_FAIL');
  runCommand(root, 'git', ['fetch','--no-tags','origin','main'], 'R2_6_MAIN_GATE_FAIL');
  const durableMainCommit = runCommand(root, 'git', ['rev-parse','origin/main'], 'R2_6_MAIN_GATE_FAIL');
  const report = {
    schemaVersion:1,
    tool:'release-state-main-gate',
    mode:envelope.mode,
    releaseId:envelope.releaseId,
    result:'MAIN_GATE_PASS',
    changedPaths:envelope.changedPaths,
    productionMutation:envelope.productionMutation,
    mainMutation:'GATEWAY_LANDED',
    payloadCommit,
    durableMainCommit,
    gateway:gate.mainGateway,
  };
  writeReport(reportPath, report);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = run();
    console.log(JSON.stringify(result));
  } catch (e) {
    console.error(e.code || 'R2_6_MAIN_GATE_FAIL', e.message || '');
    process.exit(2);
  }
}
