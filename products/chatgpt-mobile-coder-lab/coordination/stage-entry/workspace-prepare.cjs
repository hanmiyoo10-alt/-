#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SHA40_RE = /^[0-9a-f]{40}$/;
const REPO = 'hanmiyoo10-alt/-';
const DEFAULT_PROFILE = Object.freeze({
  control: '/root/nyang-repo',
  worktreeRoot: '/root/nyang-worktrees',
  branchPrefix: 'server/mcl-packet-',
  targetPrefix: 'mcl-packet-',
  remote: 'origin',
});

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function runDefault(args, options = {}) {
  const result = childProcess.spawnSync(args[0], args.slice(1), {
    encoding: 'utf8',
    shell: false,
    cwd: options.cwd,
    input: options.input,
    env: options.env || process.env,
    maxBuffer: 1024 * 1024,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function digest(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function result(status, reasonCodes = [], extra = {}) {
  return {
    schema: 'mcl-stage-entry-workspace.v1',
    status,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    details: 'withheld',
    authority: {...FALSE_AUTHORITY},
    ...extra,
  };
}

function validatePacketNumber(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('PACKET_NUMBER_INVALID');
  return number;
}

function workspaceIdentity(packetNumber, profile = DEFAULT_PROFILE) {
  const number = validatePacketNumber(packetNumber);
  const branch = `${profile.branchPrefix}${number}`;
  const target = `${profile.targetPrefix}${number}`;
  return {
    packetNumber: number,
    branch,
    target,
    worktree: path.join(profile.worktreeRoot, target),
    control: profile.control,
    remote: profile.remote,
  };
}

function git(runner, identity, args, options = {}) {
  return runner(['git', '-C', identity.control, ...args], options);
}

function targetGit(runner, identity, args, options = {}) {
  return runner(['git', '-C', identity.worktree, ...args], options);
}

function createRemoteRefDefault({identity, baseSha, runner = runDefault}) {
  const remoteRef = `refs/heads/${identity.branch}`;
  const response = runner([
    'gh', 'api', `repos/${REPO}/git/refs`, '--method', 'POST', '--input', '-',
  ], {input: JSON.stringify({ref: remoteRef, sha: baseSha})});
  return {ok: response.code === 0};
}

function parseLsRemote(text, expectedRef) {
  const lines = String(text || '').trim().split('\n').filter(Boolean);
  if (lines.length !== 1) return null;
  const parts = lines[0].trim().split(/\s+/);
  if (parts.length !== 2 || parts[1] !== expectedRef || !SHA40_RE.test(parts[0])) return null;
  return parts[0];
}

function snapshotControl(runner, identity) {
  const branch = git(runner, identity, ['branch', '--show-current']);
  const head = git(runner, identity, ['rev-parse', 'HEAD']);
  const status = git(runner, identity, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (branch.code !== 0 || head.code !== 0 || status.code !== 0 || !SHA40_RE.test(head.stdout.trim())) {
    return null;
  }
  return {
    branch: branch.stdout.trim(),
    head: head.stdout.trim(),
    statusDigest: digest(status.stdout),
  };
}

function inspectWorkspace({packetNumber, baseSha, runner = runDefault, profile = DEFAULT_PROFILE}) {
  const identity = workspaceIdentity(packetNumber, profile);
  const reasons = [];
  if (!SHA40_RE.test(baseSha || '')) reasons.push('BASE_SHA_INVALID');
  if (reasons.length) return result('UNKNOWN', reasons, {identity, stateChanged: false});

  const object = git(runner, identity, ['cat-file', '-e', `${baseSha}^{commit}`]);
  if (object.code !== 0) reasons.push('BASE_OBJECT_MISSING');

  const localBranch = git(runner, identity, ['show-ref', '--verify', '--quiet', `refs/heads/${identity.branch}`]);
  if (localBranch.code === 0) reasons.push('LOCAL_BRANCH_EXISTS');
  else if (localBranch.code !== 1) reasons.push('LOCAL_BRANCH_READ_FAILED');

  let pathExists = false;
  try { pathExists = fs.lstatSync(identity.worktree) !== null; }
  catch (error) { if (error.code !== 'ENOENT') reasons.push('WORKTREE_PATH_READ_FAILED'); }
  if (pathExists) reasons.push('WORKTREE_PATH_EXISTS');

  const list = git(runner, identity, ['worktree', 'list', '--porcelain']);
  if (list.code !== 0) {
    reasons.push('WORKTREE_REGISTRATION_READ_FAILED');
  } else {
    const exact = list.stdout.split('\n').some((line) => line === `worktree ${identity.worktree}`);
    if (exact) reasons.push('WORKTREE_REGISTERED');
  }

  const remoteRef = `refs/heads/${identity.branch}`;
  const remote = git(runner, identity, ['ls-remote', '--exit-code', identity.remote, remoteRef]);
  if (remote.code === 0) reasons.push('REMOTE_BRANCH_EXISTS');
  else if (remote.code !== 2) reasons.push('REMOTE_BRANCH_READ_FAILED');

  const status = reasons.length ? 'BLOCKED' : 'READY';
  return result(status, reasons, {
    identity,
    baseSha,
    stateChanged: false,
    localCreated: false,
    remoteCreated: false,
  });
}

function createWorkspace({
  packetNumber,
  baseSha,
  runner = runDefault,
  profile = DEFAULT_PROFILE,
  remoteCreate = createRemoteRefDefault,
  beforeRemoteCreate = null,
}) {
  const inspected = inspectWorkspace({packetNumber, baseSha, runner, profile});
  if (inspected.status !== 'READY') return inspected;
  const identity = inspected.identity;
  const before = snapshotControl(runner, identity);
  if (!before) return result('UNKNOWN', ['CONTROL_SNAPSHOT_FAILED'], {
    identity, baseSha, stateChanged: false, localCreated: false, remoteCreated: false,
  });

  const add = git(runner, identity, [
    'worktree', 'add', '-q', '-b', identity.branch, identity.worktree, baseSha,
  ]);
  if (add.code !== 0) {
    const branchNow = git(runner, identity, ['show-ref', '--verify', '--quiet', `refs/heads/${identity.branch}`]);
    let pathNow = false;
    try { pathNow = fs.existsSync(identity.worktree); } catch {}
    return result('PARTIAL', ['LOCAL_WORKSPACE_CREATE_FAILED'], {
      identity, baseSha,
      stateChanged: branchNow.code === 0 || pathNow,
      localCreated: branchNow.code === 0 || pathNow,
      remoteCreated: false,
    });
  }

  const localBranch = targetGit(runner, identity, ['branch', '--show-current']);
  const localHead = targetGit(runner, identity, ['rev-parse', 'HEAD']);
  const localStatus = targetGit(runner, identity, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (localBranch.code !== 0 || localBranch.stdout.trim() !== identity.branch
      || localHead.code !== 0 || localHead.stdout.trim() !== baseSha
      || localStatus.code !== 0 || localStatus.stdout !== '') {
    return result('PARTIAL', ['LOCAL_WORKSPACE_POSTCHECK_FAILED'], {
      identity, baseSha, stateChanged: true, localCreated: true, remoteCreated: false,
    });
  }

  if (beforeRemoteCreate) beforeRemoteCreate({identity, baseSha, runner, profile});

  const remoteRef = `refs/heads/${identity.branch}`;
  const createdRemote = remoteCreate({identity, baseSha, runner, profile});
  if (!createdRemote || createdRemote.ok !== true) {
    return result('PARTIAL', ['REMOTE_BRANCH_CREATE_FAILED'], {
      identity, baseSha, stateChanged: true, localCreated: true, remoteCreated: false,
    });
  }

  const remote = git(runner, identity, ['ls-remote', '--exit-code', identity.remote, remoteRef]);
  const remoteHead = remote.code === 0 ? parseLsRemote(remote.stdout, remoteRef) : null;
  if (remoteHead !== baseSha) {
    return result('PARTIAL', ['REMOTE_BRANCH_POSTCHECK_FAILED'], {
      identity, baseSha, stateChanged: true, localCreated: true, remoteCreated: true,
      remoteHead: remoteHead || 'unknown',
    });
  }

  const after = snapshotControl(runner, identity);
  if (!after || JSON.stringify(after) !== JSON.stringify(before)) {
    return result('PARTIAL', ['CONTROL_PRESERVATION_CONFLICT'], {
      identity, baseSha, stateChanged: true, localCreated: true, remoteCreated: true,
      remoteHead,
    });
  }

  return result('CREATED', [], {
    identity,
    baseSha,
    remoteHead,
    stateChanged: true,
    localCreated: true,
    remoteCreated: true,
  });
}

module.exports = {
  DEFAULT_PROFILE,
  FALSE_AUTHORITY,
  REPO,
  createRemoteRefDefault,
  createWorkspace,
  inspectWorkspace,
  parseLsRemote,
  runDefault,
  workspaceIdentity,
};

if (require.main === module) {
  process.stderr.write('workspace-prepare.cjs is an internal stage-entry module\n');
  process.exitCode = 64;
}
