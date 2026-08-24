#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ReleaseError,
  blobAt,
  canonicalJson,
  parentCommits,
  validateCandidateAgainstSpec,
} from './lib.mjs';
import { materializeCandidate } from './materialize.mjs';
import { runController } from './controller.mjs';

function git(cwd, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 2 * 1024 * 1024,
    input: options.input,
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr || result.stdout).trim()}`);
  return String(result.stdout || '').trimEnd();
}

function write(root, rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function source(version, name, extra = '') {
  return `//@name simcore\n//@api 3.0\n//@version ${version}\nconst SIMCORE_RUNTIME_VERSION = '${version}';\n// v${version} ${name}:\n${extra}\n`;
}

function commitAll(root, message) {
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', message]);
  return git(root, ['rev-parse', 'HEAD']);
}

function checkout(root, ref) {
  git(root, ['checkout', '-q', ref]);
}

function createBranch(root, name, start) {
  git(root, ['branch', '-f', name, start]);
}

function specFor({ releaseId, version, releaseName, releaseMode, C, P, L, changeClass = 'RUNTIME_FEATURE', liveRequired = true, modeObject = {} }) {
  return {
    schemaVersion: 1,
    releaseId,
    product: 'SimCore',
    version,
    releaseName,
    releaseMode,
    candidateCommit: C,
    expectedProductionCommit: P,
    candidateReleaseBlob: L,
    primaryGoalId: 'RS2_4_SELF_TEST',
    changeClass,
    evidenceRefs: ['docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4_SHADOW_IMPLEMENTATION_EVIDENCE.md#self-test'],
    liveGate: {
      required: liveRequired,
      scenarioId: liveRequired ? 'RS2_4_TEST_LIVE' : 'RS2_4_INFRA_NOOP',
      closeAuthority: 'HUMAN_EVIDENCE',
    },
    ...modeObject,
  };
}

function createAuthorization(root, parent, spec) {
  checkout(root, parent);
  const rel = `products/simcore/releases/specs/${spec.releaseId}.json`;
  write(root, rel, canonicalJson(spec));
  const R = commitAll(root, `authorize ${spec.releaseId}`);
  return { R, Q: rel };
}

function receipt(transaction, overrides = {}) {
  return {
    schemaVersion: 1,
    authority: 'SHADOW_ONLY',
    profile: 'CANDIDATE_REQUIRED',
    ciConclusion: 'PASS',
    verifiedCandidateCommit: transaction.candidateCommit,
    verifiedProductionCommit: transaction.expectedProductionCommit,
    verifiedCandidateLatestBlob: transaction.candidateReleaseBlob,
    verifiedCandidateInstallBlob: transaction.candidateReleaseBlob,
    verifierCommit: transaction.authorizationCommit,
    reportSha256: 'a'.repeat(64),
    releaseSpecSha256: transaction.releaseSpecSha256,
    ...overrides,
  };
}

function expectCode(code, fn) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught instanceof ReleaseError, `expected ReleaseError ${code}, got ${caught}`);
  assert.equal(caught.releaseCode, code);
}

function resolve(root, R, Q, productionRef = 'refs/heads/release-simcore') {
  return runController(root, {
    phase: 'resolve',
    authority: 'SHADOW_ONLY',
    'authorization-commit': R,
    'release-spec-path': Q,
    'production-ref': productionRef,
    report: path.join(root, 'ignored-resolve.json'),
  });
}

function finalize(root, resolved, verifierReceipt, productionRef = 'refs/heads/release-simcore') {
  const txFile = path.join(root, 'resolved.json');
  const receiptFile = path.join(root, 'receipt.json');
  fs.writeFileSync(txFile, `${JSON.stringify(resolved, null, 2)}\n`);
  fs.writeFileSync(receiptFile, `${JSON.stringify(verifierReceipt, null, 2)}\n`);
  return runController(root, {
    phase: 'finalize',
    authority: 'SHADOW_ONLY',
    'resolved-transaction': txFile,
    'verifier-receipt': receiptFile,
    'production-ref': productionRef,
    report: path.join(root, 'ignored-finalize.json'),
  });
}

function canonicalCommit(root, P, pluginText, message, extraPath = null) {
  checkout(root, P);
  write(root, 'plugins/simcore/latest.js', pluginText);
  write(root, 'plugins/simcore/install.js', pluginText);
  if (extraPath) write(root, extraPath, 'unexpected\n');
  return commitAll(root, message);
}

function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-rs2-4-selftest-'));
  try {
    git(root, ['init', '-q', '-b', 'main']);
    git(root, ['config', 'user.name', 'SimCore Self Test']);
    git(root, ['config', 'user.email', 'simcore-selftest@example.invalid']);

    write(root, 'plugins/simcore/latest.js', source('1.0.0', 'Baseline'));
    write(root, 'plugins/simcore/install.js', source('1.0.0', 'Baseline'));
    const P = commitAll(root, 'baseline');
    createBranch(root, 'release-simcore', P);
    createBranch(root, 'admin-base', P);

    checkout(root, P);
    write(root, 'plugins/simcore/latest.js', source('1.1.0', 'Shadow Release', 'const SHADOW = true;'));
    write(root, 'plugins/simcore/install.js', source('1.1.0', 'Shadow Release', 'const SHADOW = true;'));
    const W = commitAll(root, 'development work');

    const materialized = materializeCandidate(root, {
      'source-commit': W,
      'expected-production-commit': P,
      'release-id': 'simcore-v1.1.0-new-01',
      version: '1.1.0',
      'release-name': 'Shadow Release',
      'release-mode': 'NEW_VERSION',
      report: path.join(root, 'materialize.json'),
    });
    assert.equal(materialized.disposition, 'CANONICALIZED');
    const C = materialized.candidateCommit;
    const L = materialized.candidateReleaseBlob;
    assert.deepEqual(parentCommits(root, C), [P]);
    assert.equal(blobAt(root, C, 'plugins/simcore/latest.js'), L);
    assert.equal(blobAt(root, C, 'plugins/simcore/install.js'), L);

    const validSpec = specFor({
      releaseId: 'simcore-v1.1.0-new-01',
      version: '1.1.0',
      releaseName: 'Shadow Release',
      releaseMode: 'NEW_VERSION',
      C,
      P,
      L,
      modeObject: { newVersion: { expectedParentVersion: '1.0.0' } },
    });
    const validAuth = createAuthorization(root, 'admin-base', validSpec);
    const resolved = resolve(root, validAuth.R, validAuth.Q);
    assert.equal(resolved.status, 'READY_FOR_CANDIDATE_REQUIRED');
    assert.equal(resolved.transaction.candidateCommit, C);
    assert.equal(resolved.transaction.expectedProductionCommit, P);
    assert.equal(resolved.transaction.candidateReleaseBlob, L);

    const publish = finalize(root, resolved, receipt(resolved.transaction));
    assert.equal(publish.publicationDisposition, 'WOULD_PUBLISH');
    assert.equal(publish.productionMutation, 'NONE');

    expectCode('CANDIDATE_REQUIRED_FAILED', () => finalize(root, resolved, receipt(resolved.transaction, { ciConclusion: 'FAIL' })));
    expectCode('VERIFIER_IDENTITY_MISMATCH', () => finalize(root, resolved, receipt(resolved.transaction, { verifiedCandidateCommit: P })));
    expectCode('VERIFIER_IDENTITY_MISMATCH', () => finalize(root, resolved, receipt(resolved.transaction, { verifiedCandidateLatestBlob: 'b'.repeat(40) })));

    checkout(root, P);
    write(root, 'production-drift.txt', 'moved\n');
    const moved = commitAll(root, 'move production for negative');
    createBranch(root, 'release-simcore', moved);
    expectCode('PRODUCTION_PARENT_MOVED', () => finalize(root, resolved, receipt(resolved.transaction)));
    createBranch(root, 'release-simcore', P);

    const nonChildMessage = 'SimCore v1.1.0 Shadow Release\n\nRelease-Id: simcore-v1.1.0-new-02\nRelease-Mode: NEW_VERSION\n';
    const nonChild = canonicalCommit(root, W, source('1.1.0', 'Shadow Release', 'const NON_CHILD = true;'), nonChildMessage);
    const nonChildBlob = blobAt(root, nonChild, 'plugins/simcore/latest.js');
    const nonChildSpec = specFor({
      releaseId: 'simcore-v1.1.0-new-02', version: '1.1.0', releaseName: 'Shadow Release', releaseMode: 'NEW_VERSION',
      C: nonChild, P, L: nonChildBlob, modeObject: { newVersion: { expectedParentVersion: '1.0.0' } },
    });
    const nonChildAuth = createAuthorization(root, validAuth.R, nonChildSpec);
    expectCode('CANDIDATE_DIRECT_CHILD_REQUIRED', () => resolve(root, nonChildAuth.R, nonChildAuth.Q));

    const blobMismatchSpec = specFor({
      releaseId: 'simcore-v1.1.0-new-03', version: '1.1.0', releaseName: 'Shadow Release', releaseMode: 'NEW_VERSION',
      C, P, L: blobAt(root, P, 'plugins/simcore/latest.js'), modeObject: { newVersion: { expectedParentVersion: '1.0.0' } },
    });
    const blobMismatchAuth = createAuthorization(root, nonChildAuth.R, blobMismatchSpec);
    expectCode('CANDIDATE_BLOB_BINDING_MISMATCH', () => resolve(root, blobMismatchAuth.R, blobMismatchAuth.Q));

    const pathMessage = 'SimCore v1.1.0 Shadow Release\n\nRelease-Id: simcore-v1.1.0-new-04\nRelease-Mode: NEW_VERSION\n';
    const pathBad = canonicalCommit(root, P, source('1.1.0', 'Shadow Release', 'const PATH_BAD = true;'), pathMessage, 'unexpected.txt');
    const pathBadSpec = specFor({
      releaseId: 'simcore-v1.1.0-new-04', version: '1.1.0', releaseName: 'Shadow Release', releaseMode: 'NEW_VERSION',
      C: pathBad, P, L: blobAt(root, pathBad, 'plugins/simcore/latest.js'), modeObject: { newVersion: { expectedParentVersion: '1.0.0' } },
    });
    const pathBadAuth = createAuthorization(root, blobMismatchAuth.R, pathBadSpec);
    expectCode('CANDIDATE_MATERIALIZATION_PATH_DENIED', () => resolve(root, pathBadAuth.R, pathBadAuth.Q));

    const noopBlob = blobAt(root, P, 'plugins/simcore/latest.js');
    const noopSpec = specFor({
      releaseId: 'simcore-v1.0.0-noop-01',
      version: '1.0.0',
      releaseName: 'Baseline',
      releaseMode: 'NOOP_IDENTICAL',
      C: P,
      P,
      L: noopBlob,
      changeClass: 'RELEASE_INFRA_QUALIFICATION',
      liveRequired: false,
    });
    const noopAuth = createAuthorization(root, pathBadAuth.R, noopSpec);
    const noopResolved = resolve(root, noopAuth.R, noopAuth.Q);
    const noop = finalize(root, noopResolved, receipt(noopResolved.transaction));
    assert.equal(noop.publicationDisposition, 'WOULD_NOOP');
    assert.equal(noop.productionMutation, 'NONE');

    const unknownFieldSpec = { ...noopSpec, arbitraryCommand: 'rm -rf /' };
    expectCode('RELEASE_SPEC_SCHEMA_INVALID', () => validateCandidateAgainstSpec(root, unknownFieldSpec));

    console.log('RS2-4 shadow release self-test: PASS (12 controls)');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

try { main(); }
catch (error) {
  console.error(`RS2_4_RELEASE_SELF_TEST_FAIL: ${error?.stack || error}`);
  process.exit(1);
}
