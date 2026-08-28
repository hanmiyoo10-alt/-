import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assert, equal } from '../../tooling/assertions.mjs';
import { buildApprovalPackage, materializeApprovalPackage } from '../../tooling/release-approval-package.mjs';
import { loadApprovalEnvelopeFiles, validateApprovalEnvelope } from '../../tooling/release-approval-envelope.mjs';
import { qualifyPr2 } from '../../tooling/ci/pr2-approval-qualification.mjs';

function run(cwd, command, args, allowFailure = false) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 90000, maxBuffer: 2 * 1024 * 1024 });
  if (!allowFailure && result.status !== 0) throw new Error(`${command} ${args.join(' ')}: ${result.stderr || result.stdout}`);
  return { status: result.status, stdout: String(result.stdout || '').trim(), stderr: String(result.stderr || '').trim() };
}
function git(cwd, ...args) { return run(cwd, 'git', args).stdout; }
function write(root, rel, value) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const text = typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(target, text, 'utf8');
}
function removeTree(target) {
  fs.rmSync(target, { recursive:true, force:true, maxRetries:4, retryDelay:25 });
}
function expectCode(fn, code) {
  let got = null;
  try { fn(); } catch (error) { got = error?.code || null; }
  equal(got, code, `expected ${code}, got ${got}`);
}

function makeObjects(fixture, production, candidate, candidateBlob) {
  const { releaseId, intentId, version, releaseName } = fixture;
  const receiptPath = `products/simcore/releases/candidate-receipts/${intentId}.json`;
  const shadowPath = `products/simcore/releases/spec-shadows/${releaseId}.json`;
  const receipt = {
    schemaVersion:1, product:'SimCore', intentId, releaseId, candidateDisposition:'CREATED',
    expectedProductionCommit:production, sourceCommit:'b'.repeat(40), candidateCommit:candidate,
    candidateReleaseBlob:candidateBlob, candidateFetchRef:`candidate/simcore/${intentId}`,
    builderPath:'products/simcore/tooling/build-fixture.py', builderSha256:'e'.repeat(64),
    verifierCommit:'f'.repeat(40), verificationSuite:'batch-a', verificationReportSha256:'1'.repeat(64),
    result:'PASS', productionMutation:'NONE', releaseAuthority:'CANDIDATE_RECEIPT_ONLY',
  };
  const spec = {
    schemaVersion:1, releaseId, product:'SimCore', version, releaseName, releaseMode:'NEW_VERSION',
    candidateCommit:candidate, expectedProductionCommit:production, candidateReleaseBlob:candidateBlob,
    primaryGoalId:'R2_5_APPROVAL_BOUNDARY_CONVERGENCE', changeClass:'RUNTIME_FEATURE',
    evidenceRefs:['docs/SIMCORE_RELEASE_SYSTEM_V2_5_APPROVAL_BOUNDARY_CONVERGENCE_DESIGN.md'],
    liveGate:{required:true,scenarioId:'R2_5_NEXT_REAL_RELEASE',closeAuthority:'HUMAN_EVIDENCE'},
  };
  const shadow = { schemaVersion:1, product:'SimCore', authority:'SHADOW_ONLY', intentId, releaseId, candidateReceiptPath:receiptPath, derivedSpec:spec };
  const pkg = buildApprovalPackage({ candidateReceipt:receipt, candidateReceiptPath:receiptPath, specShadow:shadow, specShadowPath:shadowPath });
  return { receiptPath, shadowPath, receipt, shadow, pkg };
}

function makeScenario(fixture, { wrongSpecPath = false, thirdFile = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-r25-root-'));
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-r25-origin-'));
  git(root, 'init');
  git(root, 'config', 'user.name', 'fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  write(root, 'plugins/simcore/latest.js', '//@version 0.64.11\nconst value = 1;\n');
  write(root, 'plugins/simcore/install.js', '//@version 0.64.11\nconst value = 1;\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture production');
  const production = git(root, 'rev-parse', 'HEAD');

  write(root, 'plugins/simcore/latest.js', '//@version 0.65.0\nconst value = 2;\n');
  write(root, 'plugins/simcore/install.js', '//@version 0.65.0\nconst value = 2;\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture candidate');
  const candidate = git(root, 'rev-parse', 'HEAD');
  const candidateBlob = git(root, 'rev-parse', `${candidate}:plugins/simcore/latest.js`);

  git(bare, 'init', '--bare');
  git(root, 'remote', 'add', 'origin', bare);
  git(root, 'push', 'origin', `${production}:refs/heads/release-simcore`);
  git(root, 'push', 'origin', `${candidate}:refs/heads/candidate/simcore/${fixture.intentId}`);

  git(root, 'reset', '--hard', production);
  const objects = makeObjects(fixture, production, candidate, candidateBlob);
  write(root, objects.receiptPath, objects.receipt);
  write(root, objects.shadowPath, objects.shadow);
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture receipt shadow');
  const base = git(root, 'rev-parse', 'HEAD');

  write(root, objects.pkg.approvalPath, objects.pkg.approval);
  const specPath = wrongSpecPath ? `products/simcore/releases/authorized-specs/${fixture.releaseId}.json` : objects.pkg.specPath;
  write(root, specPath, objects.pkg.spec);
  if (thirdFile) write(root, 'docs/unrelated-third-file.md', 'third file\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture approval pr');
  const head = git(root, 'rev-parse', 'HEAD');

  return { root, bare, production, candidate, base, head, specPath, ...objects };
}
function cleanup(s) { removeTree(s.root); removeTree(s.bare); }

export async function runSuite({ fixtures }) {
  const fixture = fixtures[0].input;
  const expected = fixtures[0].expected;
  const assertions = [];
  const pass = (id) => assertions.push({ id, status:'PASS' });

  const valid = makeScenario(fixture);
  try {
    const q = qualifyPr2({ root:valid.root, 'base-commit':valid.base, 'head-commit':valid.head, 'production-commit':valid.production, report:'r25-preflight.json' });
    equal(q.result,'PASS','valid PR2 preflight');
    equal(q.releaseId,fixture.releaseId,'releaseId');
    equal(q.canonicalTitle,expected.canonicalTitle,'canonical title');
    equal(q.releaseAuthority,expected.validationAuthority,'validation authority');
    equal(q.qualificationAuthority,expected.qualificationAuthority,'qualification authority');
    equal(q.productionMutation,expected.productionMutation,'production mutation');
    equal(q.durableAuthorizationCreated,false,'preflight created durable authorization');
    pass('r25-valid-v06500-shape-premerge-pass');

    const loaded = loadApprovalEnvelopeFiles({root:valid.root,approvalPath:valid.pkg.approvalPath,specPath:valid.pkg.specPath});
    const post = validateApprovalEnvelope({
      mode:'POSTMERGE', approval:loaded.approval, approvalPath:loaded.approvalPath,
      authorizedSpec:loaded.authorizedSpec, specPath:loaded.specPath,
      candidateReceipt:loaded.candidateReceipt, candidateReceiptPath:loaded.candidateReceiptPath,
      specShadow:loaded.specShadow, specShadowPath:loaded.specShadowPath,
      observedCandidateCommit:valid.candidate, observedProductionCommit:valid.production,
      changedPaths:[valid.pkg.approvalPath,valid.pkg.specPath], observedTitle:'not canonical but harmless',
    });
    equal(post.result,'PASS','valid postmerge envelope');
    equal(post.titleCanonical,false,'title regained authority');
    pass('r25-noncanonical-title-presentation-only');

    expectCode(() => validateApprovalEnvelope({
      mode:'POSTMERGE', approval:loaded.approval, approvalPath:loaded.approvalPath,
      authorizedSpec:loaded.authorizedSpec, specPath:loaded.specPath,
      candidateReceipt:loaded.candidateReceipt, candidateReceiptPath:loaded.candidateReceiptPath,
      specShadow:loaded.specShadow, specShadowPath:loaded.specShadowPath,
      observedCandidateCommit:valid.candidate, observedProductionCommit:'9'.repeat(40),
      changedPaths:[valid.pkg.approvalPath,valid.pkg.specPath],
    }), 'APPROVAL_ENVELOPE_PRODUCTION_PARENT_MOVED');
    pass('r25-postmerge-production-parent-reobservation-still-blocks');
  } finally { cleanup(valid); }

  const wrongSpec = makeScenario(fixture,{wrongSpecPath:true});
  try {
    expectCode(() => qualifyPr2({ root:wrongSpec.root, 'base-commit':wrongSpec.base, 'head-commit':wrongSpec.head, 'production-commit':wrongSpec.production, report:'r25-preflight.json' }), 'APPROVAL_ENVELOPE_SPEC_PATH_INVALID');
    pass('r25-v06500-wrong-spec-path-fails-premerge');
  } finally { cleanup(wrongSpec); }

  const third = makeScenario(fixture,{thirdFile:true});
  try {
    expectCode(() => qualifyPr2({ root:third.root, 'base-commit':third.base, 'head-commit':third.head, 'production-commit':third.production, report:'r25-preflight.json' }), 'APPROVAL_ENVELOPE_CHANGED_PATH_INVALID');
    pass('r25-third-file-fails-premerge');
  } finally { cleanup(third); }

  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(),'simcore-r25-package-'));
  try {
    const production='a'.repeat(40), candidate='b'.repeat(40), blob='c'.repeat(40);
    const objects=makeObjects(fixture,production,candidate,blob);
    write(packageRoot,objects.receiptPath,objects.receipt);
    write(packageRoot,objects.shadowPath,objects.shadow);
    const first=materializeApprovalPackage({root:packageRoot,candidateReceiptPath:objects.receiptPath,specShadowPath:objects.shadowPath});
    equal(first.canonicalTitle,expected.canonicalTitle,'package canonical title');
    assert(fs.existsSync(path.join(packageRoot,first.approvalPath)),'approval output missing');
    assert(fs.existsSync(path.join(packageRoot,first.specPath)),'spec output missing');
    expectCode(() => materializeApprovalPackage({root:packageRoot,candidateReceiptPath:objects.receiptPath,specShadowPath:objects.shadowPath}), 'APPROVAL_PACKAGE_OUTPUT_EXISTS');
    pass('r25-canonical-package-and-no-overwrite');
  } finally { removeTree(packageRoot); }

  const envelopeTool=fs.readFileSync('products/simcore/tooling/release-approval-envelope.mjs','utf8');
  const packageTool=fs.readFileSync('products/simcore/tooling/release-approval-package.mjs','utf8');
  const pr2=fs.readFileSync('products/simcore/tooling/ci/pr2-approval-qualification.mjs','utf8');
  const check=fs.readFileSync('products/simcore/tooling/check.mjs','utf8');
  const workflow=fs.readFileSync('.github/workflows/simcore-release-pr-activation.yml','utf8');
  for(const tool of [envelopeTool,packageTool])for(const token of ['release-publish.mjs','repo-main-write.py','gh workflow run','git push','force-with-lease'])assert(!tool.includes(token),`R2.5 tool gained authority primitive: ${token}`);
  assert(check.includes('GATE_PR2_PREFLIGHT'),'PR2 preflight gate missing');
  assert(check.includes('pr2-approval-qualification.mjs'),'PR2 preflight helper not wired');
  assert(workflow.includes('release-approval-envelope.mjs'),'postmerge does not reuse shared envelope validator');
  assert(!workflow.includes('PR_TITLE'),'PR title remains authorization input');
  assert(!workflow.includes('SIMCORE_RELEASE_APPROVAL_TITLE_INVALID'),'title failure semantics remain active');
  assert(!workflow.includes('release-approval-resolve.mjs'),'postmerge kept duplicate resolver invocation');
  assert(packageTool.includes('APPROVAL_PACKAGE_MANUAL_OUTPUT_PATH_FORBIDDEN'),'manual output path rejection missing');
  pass('r25-wiring-authority-and-simplicity-budget');

  return { coverage:'EXECUTABLE', status:'PASS', assertions };
}
