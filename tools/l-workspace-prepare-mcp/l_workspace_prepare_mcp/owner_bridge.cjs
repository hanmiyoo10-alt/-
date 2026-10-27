#!/usr/bin/env node
'use strict';

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

function defaultDeps(repoRoot = FIXED_REPO_ROOT) {
  if (repoRoot !== FIXED_REPO_ROOT || process.cwd() !== FIXED_REPO_ROOT) {
    throw new Error('REPO_ROOT_INVALID');
  }
  const handoff = require(path.join(
    repoRoot, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
  const holder = require(path.join(
    repoRoot, 'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
  const owner = require(path.join(
    repoRoot, 'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/mcl-l-repository-owner.cjs'));
  return {
    parseManifest: handoff.parseManifest,
    validateEvidence: holder.validateEvidence,
    validateManifestShape: owner.validateManifestShape,
    ownerRunCli: owner.runCli,
  };
}

function run(inputValue, deps = null) {
  let input;
  try { input = exactInput(inputValue); }
  catch (error) { return result('UNKNOWN', inputValue, [String(error.message || 'INPUT_INVALID')]); }

  let d;
  try { d = deps || defaultDeps(); }
  catch { return result('UNKNOWN', input, ['OWNER_DEPENDENCY_LOAD_FAILED']); }

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
    } catch {
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
  FIXED_REPO_ROOT,
  exactInput,
  result,
  run,
  sha256,
};
