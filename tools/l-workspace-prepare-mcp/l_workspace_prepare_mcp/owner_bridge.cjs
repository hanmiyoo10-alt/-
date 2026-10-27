#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const FIXED_REPO_ROOT = '/home/alsl0/nyang-repo';

function result(status, input, reasonCodes = [], extra = {}) {
  return {
    schemaVersion: 1,
    kind: 'MCL_L_PREPARE_WORKSPACE',
    status,
    packetNumber: Number.isSafeInteger(input?.packetNumber) ? input.packetNumber : null,
    manifestId: SHA256_RE.test(input?.manifestId || '') ? input.manifestId : null,
    workspaceState: extra.workspaceState || 'UNKNOWN',
    baseSha: SHA40_RE.test(extra.baseSha || '') ? extra.baseSha : null,
    headSha: SHA40_RE.test(extra.headSha || '') ? extra.headSha : null,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    authority: {...FALSE_AUTHORITY},
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function exactInput(value) {
  const keys = ['ledgerBody', 'mainSha', 'manifestId', 'manifestText', 'packetBody', 'packetNumber'];
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys)) {
    throw new Error('INPUT_SCHEMA_INVALID');
  }
  if (!Number.isSafeInteger(value.packetNumber) || value.packetNumber <= 0
      || !SHA256_RE.test(value.manifestId || '')
      || !SHA40_RE.test(value.mainSha || '')
      || typeof value.packetBody !== 'string'
      || typeof value.ledgerBody !== 'string'
      || typeof value.manifestText !== 'string') {
    throw new Error('INPUT_FIELD_INVALID');
  }
  return value;
}

const CURRENT_OWNER_PATHS = Object.freeze([
  '.github/plugin-control-plane/canonical-main/infra/github-client.cjs',
  '.github/plugin-control-plane/canonical-main/work-system/packet-activity.cjs',
  '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs',
  '.github/plugin-control-plane/canonical-main/work-system/policy.json',
  '.github/plugin-control-plane/canonical-main/work-system/pr-activity.cjs',
  '.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs',
  'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/mcl-l-repository-owner.cjs',
]);
const FIXED_GIT = '/usr/bin/git';
const CURRENT_FILE_MAX_BYTES = 4 * 1024 * 1024;

function fixedReadCommand(command, argv, options = {}) {
  return childProcess.spawnSync(command, argv, {
    encoding: options.binary ? null : 'utf8',
    input: options.input,
    shell: false,
    timeout: 15000,
    maxBuffer: CURRENT_FILE_MAX_BYTES,
    env: {
      PATH: '/usr/bin:/bin',
      HOME: process.env.HOME || '/home/alsl0',
      GIT_NO_REPLACE_OBJECTS: '1',
    },
  });
}

function currentDeps(mainSha, repoRoot = FIXED_REPO_ROOT) {
  if (repoRoot !== FIXED_REPO_ROOT || process.cwd() !== FIXED_REPO_ROOT
      || !SHA40_RE.test(mainSha || '')) {
    throw new Error('CURRENT_OWNER_CONTEXT_INVALID');
  }
  const present = fixedReadCommand(
    FIXED_GIT, ['-C', repoRoot, 'cat-file', '-e', mainSha + '^{commit}']);
  if (present.error || present.signal || present.status !== 0) {
    throw new Error('CURRENT_MAIN_OBJECT_MISSING');
  }

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-l-current-owner-'));
  try {
    for (const repoPath of CURRENT_OWNER_PATHS) {
      const read = fixedReadCommand(
        FIXED_GIT, ['-C', repoRoot, 'cat-file', 'blob', mainSha + ':' + repoPath],
        {binary: true},
      );
      if (read.error || read.signal || read.status !== 0 || !read.stdout?.length) {
        throw new Error('CURRENT_OWNER_BLOB_READ_FAILED');
      }
      const destination = path.join(temp, repoPath);
      fs.mkdirSync(path.dirname(destination), {recursive: true, mode: 0o700});
      fs.writeFileSync(destination, read.stdout, {mode: 0o600, flag: 'wx'});
    }

    const projection = require(path.join(
      temp, '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));
    const handoff = require(path.join(
      temp, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
    const holder = require(path.join(
      temp, 'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
    const owner = require(path.join(
      temp, 'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/mcl-l-repository-owner.cjs'));
    return {
      deps: {
        classifyPacketProjection: projection.classifyPacketProjection,
        parseManifest: handoff.parseManifest,
        validateEvidence: holder.validateEvidence,
        validateManifestShape: owner.validateManifestShape,
        ownerRunCli: owner.runCli,
      },
      cleanup() {
        try { fs.rmSync(temp, {recursive: true, force: true}); } catch {}
      },
    };
  } catch (error) {
    try { fs.rmSync(temp, {recursive: true, force: true}); } catch {}
    throw error;
  }
}

function run(inputValue, deps = null) {
  let input;
  try { input = exactInput(inputValue); }
  catch (error) { return result('UNKNOWN', inputValue, [String(error.message || 'INPUT_INVALID')]); }

  let d;
  let cleanup = () => {};
  try {
    if (deps) d = deps;
    else {
      const loaded = currentDeps(input.mainSha);
      d = loaded.deps;
      cleanup = loaded.cleanup;
    }
  } catch (error) {
    const code = error?.message === 'CURRENT_MAIN_OBJECT_MISSING'
      ? 'CURRENT_MAIN_OBJECT_MISSING' : 'OWNER_DEPENDENCY_LOAD_FAILED';
    return result('UNKNOWN', input, [code]);
  }

  try {
  const packetProjection = d.classifyPacketProjection(input.packetBody);
  if (!packetProjection || typeof packetProjection !== 'object'
      || !Array.isArray(packetProjection.reasonCodes)) {
    return result('UNKNOWN', input, ['PACKET_PROJECTION_INVALID']);
  }
  if (packetProjection.disposition !== 'PASS') {
    const status = packetProjection.disposition === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN';
    return result(status, input,
      packetProjection.reasonCodes.length
        ? packetProjection.reasonCodes : ['PACKET_PROJECTION_INVALID']);
  }
  if (packetProjection.interactionStage !== 'IMPLEMENTATION_PR') {
    return result('BLOCKED', input, ['PACKET_STAGE_NOT_IMPLEMENTATION_PR']);
  }
  if (['DONE', 'CANCELLED', 'SUPERSEDED'].includes(packetProjection.lifecycle)) {
    return result('BLOCKED', input, ['PACKET_LIFECYCLE_TERMINAL']);
  }

  const parsed = d.parseManifest(input.manifestText);
  if (!parsed || parsed.status !== 'VALID' || !parsed.value) {
    return result(parsed?.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN', input,
      parsed?.reasonCodes || ['MANIFEST_INVALID']);
  }
  const manifest = parsed.value;
  if (manifest.manifestId !== input.manifestId) {
    return result('CONFLICT', input, ['MANIFEST_ID_CONFLICT']);
  }
  if (manifest.packetRef !== '#' + input.packetNumber) {
    return result('CONFLICT', input, ['MANIFEST_PACKET_CONFLICT']);
  }
  if (sha256(Buffer.from(input.packetBody, 'utf8')) !== manifest.packetBodySha256) {
    return result('CONFLICT', input, ['PACKET_BODY_HASH_CONFLICT']);
  }
  if (manifest.route !== 'L' || manifest.executor !== 'L'
      || manifest.workspace?.kind !== 'repository') {
    return result('BLOCKED', input, ['MANIFEST_PROFILE_INVALID']);
  }
  if (manifest.observedBaseSha !== input.mainSha) {
    return result('BLOCKED', input, ['MANIFEST_BASE_NOT_CURRENT_MAIN']);
  }

  try { d.validateManifestShape(manifest); }
  catch (error) {
    return result(
      ['BLOCKED', 'CONFLICT'].includes(error?.kind) ? error.kind : 'UNKNOWN',
      input,
      error?.reasonCodes || ['MANIFEST_OWNER_PROFILE_INVALID'],
    );
  }

  const evidence = d.validateEvidence({
    manifest,
    ledgerBody: input.ledgerBody,
    packetBody: input.packetBody,
    requireActiveLease: true,
  });
  if (!evidence?.ok) {
    return result('BLOCKED', input, [
      'COORDINATION_EVIDENCE_INVALID',
      ...(evidence?.reasonCodes || []),
    ]);
  }

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-l-prepare-workspace-'));
  const manifestPath = path.join(temp, 'manifest.md');
  const ledgerPath = path.join(temp, 'ledger.md');
  const packetPath = path.join(temp, 'packet.md');
  try {
    fs.writeFileSync(manifestPath, input.manifestText, {encoding: 'utf8', mode: 0o600, flag: 'wx'});
    fs.writeFileSync(ledgerPath, input.ledgerBody, {encoding: 'utf8', mode: 0o600, flag: 'wx'});
    fs.writeFileSync(packetPath, input.packetBody, {encoding: 'utf8', mode: 0o600, flag: 'wx'});

    let ownerOut;
    try {
      ownerOut = d.ownerRunCli([
        'prepare-workspace',
        '--manifest', manifestPath,
        '--ledger', ledgerPath,
        '--packet', packetPath,
        '--apply',
      ], process.env);
    } catch (error) {
      const kind = ['BLOCKED', 'CONFLICT', 'UNKNOWN'].includes(error?.kind)
        ? error.kind : null;
      const reasons = Array.isArray(error?.reasonCodes)
        ? error.reasonCodes.filter((item) => (
          typeof item === 'string'
          && /^[A-Za-z0-9_:+.-]{1,120}$/.test(item)
        )).slice(0, 32)
        : [];
      if (kind && reasons.length) return result(kind, input, reasons);
      return result('UNKNOWN', input, ['OWNER_INVOCATION_FAILED']);
    }
    let value;
    try { value = JSON.parse(String(ownerOut?.text || '')); }
    catch { return result('UNKNOWN', input, ['OWNER_RESULT_INVALID']); }

    const reasons = Array.isArray(value?.reason_codes)
      ? value.reason_codes.filter((item) => typeof item === 'string').slice(0, 32)
      : [];
    if (ownerOut?.code === 0 && value?.status === 'PREPARED') {
      return result('PASS', input, [], {
        workspaceState: 'PREPARED',
        baseSha: value.base_sha,
        headSha: value.base_sha,
      });
    }
    const status = ['BLOCKED', 'CONFLICT', 'UNKNOWN'].includes(value?.status)
      ? value.status : 'UNKNOWN';
    return result(status, input, reasons.length ? reasons : ['OWNER_PREPARE_FAILED']);
  } finally {
    try { fs.rmSync(temp, {recursive: true, force: true}); } catch {}
  }
  } finally {
    cleanup();
  }
}

function main() {
  let input;
  try { input = JSON.parse(fs.readFileSync(0, 'utf8')); }
  catch {
    process.stdout.write(JSON.stringify(result('UNKNOWN', null, ['INPUT_JSON_INVALID'])) + '\n');
    return 3;
  }
  const out = run(input);
  process.stdout.write(JSON.stringify(out) + '\n');
  return out.status === 'PASS' ? 0 : out.status === 'UNKNOWN' ? 3 : 2;
}

if (require.main === module) process.exitCode = main();

module.exports = {
  FALSE_AUTHORITY,
  CURRENT_FILE_MAX_BYTES,
  CURRENT_OWNER_PATHS,
  FIXED_GIT,
  FIXED_REPO_ROOT,
  currentDeps,
  exactInput,
  result,
  run,
  sha256,
};
