#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const REPO = 'hanmiyoo10-alt/-';
const TARGET = Object.freeze({
  packet: 2463,
  packetRef: '#2463',
  pr: 2464,
  candidate: 'd3b53402b5629a30845da024ecfafeeae5cc0553',
  merge: '11d297dc0aa7b08d99aafb5ea2b5e667c02ebf3e',
  manifestId: '4dc31adefc0c62c36f12eaf3d07db6782913813923c24544326d75d0f24b01e1',
  leaseId: '7301e6def893e383129825f3cc5427da39280e4ab03f61e643680f8e6da34d1b',
  acquiredGeneration: 381,
  releaseRun: 35683545760,
  releasedGeneration: 382,
  ownerValidationRun: 35683368917,
  requiredRun: 35683369017,
  requiredJob: 106604969118,
});
const EXPECTED_EFFECTS = Object.freeze([
  'CANONICAL_VALIDATION_MERGE_RECEIPT',
  'COORDINATION_FINALIZATION',
]);
const TARGET_2786 = Object.freeze({
  packet: 2786,
  packetRef: '#2786',
  pr: 2878,
  candidate: '81049faef1f4a029af42b3be4d4146341b5167da',
  merge: '0a25b7691bf5d768aced94403b32ebdb50f12cc3',
  workspaceManifestId: '60ecd6edd15f59ad81bcaf8bee601490c12f94734ff1111b338eaff2e5048756',
  workspaceManifestPhaseId: '2786-implementation-pr-stage-entry',
  workspaceLeaseId: 'd116ebcba38d2ee167a5ea5351422d93c2d39f60e4e8e53c349429165286a800',
  workspaceAcquiredGeneration: 530,
  workspaceBranch: 'server/mcl-packet-2786',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-2786',
  implementationReceiptDigest:
    'f56874a0c8b0a4a9c037d1e4cd490a01a6d293d1a0fe608eacc0a975e73160aa',
  requiredCoordinationGates: Object.freeze([
    'implementation-coordination-readback',
    'implementation-d013-release',
  ]),
});
const TARGET_3043 = Object.freeze({
  packet: 3043,
  packetRef: '#3043',
  pr: 3046,
  candidate: 'a2c0e07b591d501c1142e160e035f470e8eee99b',
  merge: 'c12f904cf8c322c3431e4689e85554e645df77be',
  workspaceManifestId: '7e48be16b513b7ec9404171573c1f4199e40a00766f62a02eff221997e5e7d4a',
  workspaceManifestPhaseId: '3043-validation-merge-currentization-r2',
  workspaceLeaseId: '5558a606390eb906bac9ad4aa410fca461b5d223d68585edb56ce9488966f6c4',
  workspaceAcquiredGeneration: 592,
  workspaceBranch: 'server/mcl-packet-3043',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-3043',
  implementationReceiptDigest:
    '705334f84db38572a6ef5e63097c695605b15e347da90cd5c354090e0d3a8da2',
  requiredCoordinationGates: Object.freeze([
    'd013-release',
    'd014-completion',
    'currentization-coordination-released',
    'currentization-d014-complete',
    'currentization-scope-and-blob-preservation',
    'currentization-replay-safe',
  ]),
});
const TARGET_3051 = Object.freeze({
  packet: 3051,
  packetRef: '#3051',
  pr: 3053,
  candidate: '86eeab83a743bda412d6e2e0ab8ad4d7fd89c012',
  merge: 'f01f6f40df00c3886f553931f0aaa1cfa3b99bee',
  workspaceManifestId: '987ced1ea67ab783db61347b476a7c0ea998b45454ce17da5ae62bc657e36184',
  workspaceManifestPhaseId: '3051-implementation-pr-stage-entry',
  workspaceLeaseId: '8732b9293e42b03f5b4287c96d8b56c93de542235102824f732bd7f1f1a9ef67',
  workspaceAcquiredGeneration: 600,
  workspaceBranch: 'server/mcl-packet-3051',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-3051',
  implementationReceiptDigest:
    '3db0f963b917b627ddb90f8ed3d005cf2fd2e3f092abbe60e1890d133cc6b03c',
  requiredCoordinationGates: Object.freeze([
    'currentization-scope-and-blob-preservation',
    'd013-d014-holder-convergence',
    'd013-release',
    'd014-completion',
  ]),
});
const TARGET_3092 = Object.freeze({
  packet: 3092,
  packetRef: '#3092',
  pr: 3094,
  candidate: 'f8541fa5637296575deda6b561520401e14ca782',
  merge: 'eee0ed8f3172d31d7ec967fb330227045926e3cb',
  workspaceManifestId: 'e6fb64ff598c5085aec404f0cca6c1930ba50ae68a95c34ff5370f03bbb0aa37',
  workspaceManifestPhaseId: '3092-implementation-pr-stage-entry',
  workspaceLeaseId: '7219c2441495c48ce7201b99bf5f07e1bbc57a7e720b505f56ed27ed6b792afd',
  workspaceAcquiredGeneration: 618,
  workspaceBranch: 'server/mcl-packet-3092',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-3092',
  implementationReceiptDigest:
    'a142d048af6026ad708d7566379d792a83b56e3d0dcfe7561fa1778bf076eba5',
  requiredCoordinationGates: Object.freeze([
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
  ]),
});
const TARGET_3099 = Object.freeze({
  packet: 3099,
  packetRef: '#3099',
  pr: 3102,
  candidate: 'e7866d0a9869a9f46f5ea5b8ee6890087497ec5d',
  merge: '4a9b242380b05582eae7221f11686986c55f8b26',
  workspaceManifestId: 'fad85ff9e714d7c17495849dc84f75e460b82228e8f985716d8c4dde8355611a',
  workspaceManifestPhaseId: '3099-implementation-pr-stage-entry',
  workspaceLeaseId: '0e91520c043389d3845001900db31d2c16638f27180766d66b96951a92cfd7c9',
  workspaceAcquiredGeneration: 626,
  workspaceBranch: 'server/mcl-packet-3099',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-3099',
  implementationReceiptDigest:
    'd11741c406b8786fb9365dc107fd63fcad04bd1f427b31aa7608aa700a0e5896',
  requiredCoordinationGates: Object.freeze([
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
  ]),
});
const TARGET_3110 = Object.freeze({
  packet: 3110,
  packetRef: '#3110',
  pr: 3113,
  candidate: '4bc3c66f3519927a2bb827ddd49ef02ffc0162e6',
  merge: 'f45b9e5a32644179f2c9d00b4dced73ef5840cbe',
  workspaceManifestId: '1c848f29285a8455bb0830a27cbf0ae1796742c0cfbd13426d8cfd100110f775',
  workspaceManifestPhaseId: '3110-implementation-pr-stage-entry',
  workspaceLeaseId: '834a17137086bde80fd3a6f3a0b1a51e2853aa1e28a20f81a0f7e5a8534c055c',
  workspaceAcquiredGeneration: 630,
  workspaceBranch: 'server/mcl-packet-3110',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-3110',
  implementationReceiptDigest:
    '9afd4d7b4a1ebbb57e1e1931d348cfeee17ebae561cada0f8158a7926e0901c3',
  requiredCoordinationGates: Object.freeze([
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
  ]),
});
const TARGET_3118 = Object.freeze({
  packet: 3118,
  packetRef: '#3118',
  pr: 3122,
  candidate: '256b858a270dcc38e15d6dd7b4d6d263b0cbfb1b',
  merge: '45d699b7a4c2377283cfe434472ad12498088602',
  workspaceManifestId: 'bfa86f26e286aacadcddfbd128dbd65ad391d5db7e4cbffa4c52c3ae8fccf475',
  workspaceManifestPhaseId: '3118-implementation-pr-recovery-rebind-3121',
  workspaceLeaseId: 'cb3c98b20e38423baffe4fdd5ca7cf162282d37143d2115a4d96541727aa45da',
  workspaceAcquiredGeneration: 638,
  workspaceBranch: 'server/mcl-packet-3118',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-3118',
  implementationReceiptDigest:
    '70e62921e17aef683a566381083144e9acdf6946405e6b39b1b5c879e0cd82c2',
  requiredCoordinationGates: Object.freeze([
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
  ]),
});
const TARGET_3126 = Object.freeze({
  packet: 3126,
  packetRef: '#3126',
  pr: 3129,
  candidate: '435d2714551745ad2e5eb587a6f95d545abbcbe3',
  merge: 'a2c68cffd695fd837282a67f79bbca662500d11d',
  workspaceManifestId: '25771eff86e80d0660d8c4db17e5c84ff1cd75670bb66a8b4c317bda05d1ba6e',
  workspaceManifestPhaseId: '3126-implementation-pr-stage-entry',
  workspaceLeaseId: '1adc0b00ee8a92faa4923960d23d1bcc397dad4940602094f1356c1157dbca85',
  workspaceAcquiredGeneration: 646,
  workspaceBranch: 'server/mcl-packet-3126',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-3126',
  implementationReceiptDigest:
    'f47aefb72827e49a9e72d10354d9b3cd67070016c820bc69e7fff5a5895a96bb',
  requiredCoordinationGates: Object.freeze([
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
  ]),
});
const TARGET_3144 = Object.freeze({
  packet: 3144,
  packetRef: '#3144',
  pr: 3147,
  candidate: '900d3c67d9ff0f831b6efaec0dee69f1ebba4ee7',
  merge: '2db2e75187c67a39e6b1b012a704f871982ba930',
  workspaceManifestId: '9a4f4d2b279942ffbb462e9fa135dca89a3de1a02c3650b284817d44bc1da89c',
  workspaceManifestPhaseId: '3144-implementation-pr-stage-entry',
  workspaceLeaseId: 'f83f3788990ce9567a804f0e08b8886cc0cdddb596ccaf9e88046088d2ad29c5',
  workspaceAcquiredGeneration: 664,
  workspaceBranch: 'server/mcl-packet-3144',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-3144',
  implementationReceiptDigest:
    '5ab640da43f4b8ced263ada4b021d6760249535ac5959c7a3a054425b74fb78d',
  requiredCoordinationGates: Object.freeze([
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
  ]),
});
const TARGET_3108 = Object.freeze({
  packet: 3108,
  packetRef: '#3108',
  pr: 3135,
  candidate: '2298b0ebbe1f30a829aeb523cf5fb3b24817f497',
  merge: 'dda4df11ae1fdff1dccb3867a915d0a0eb545f7c',
  workspaceManifestId: '5595609dfee2396b20149584aed7e3c20e679ba69481662c9625439e7c695c96',
  workspaceManifestPhaseId: '3108-validation-merge-currentization-r1',
  workspaceLeaseId: 'b4cc1b671115f6079a9ae668ca4e0e872586d6584e7a4a078e99a838d84d1dde',
  workspaceAcquiredGeneration: 656,
  workspaceBranch: 'server/mcl-packet-3108',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-3108',
  implementationReceiptDigest:
    '5a887673d3e5e8cbf822bd7403025366d43759613456684ba76a5beced1745e7',
  requiredCoordinationGates: Object.freeze([
    'd013-release',
    'd014-completion',
    'currentization-coordination-released',
    'currentization-d014-complete',
    'currentization-scope-and-blob-preservation',
    'packet-scoped-currentization-replay',
    'natural-3090-recovery-proof',
  ]),
});
const TARGET_2791 = Object.freeze({
  packet: 2791,
  packetRef: '#2791',
  pr: 2795,
  candidate: '2dbf071ee4e79f738fd9deca8caeb3e0b46dbe0f',
  merge: 'a78adf18618600366a7c2c146f534d8ae983744c',
  workspaceManifestId: '8a4b9938e726b0d6c1ac6306063532106a78db0dc08338c6de16726cbaf1d0e1',
  workspaceManifestPhaseId: '2791-validation-merge-currentization-20261003',
  workspaceLeaseId: 'eeebb48452e1e73a3f240660cd0cef66671605a5792d00c1b5aca842040dece4',
  workspaceAcquiredGeneration: 724,
  workspaceBranch: 'server/mcl-packet-2791',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-2791',
  implementationReceiptDigest:
    'de2e871fe8115046670d4995b4419a49228b62b798a239a8a7e169a1456bd277',
  requiredCoordinationGates: Object.freeze([
    'currentization-scope-and-blob-preservation',
    'currentization-replay-safe',
    'currentization-d013-release',
    'currentization-d014-complete',
    'exact-head-required',
    'exact-head-verify',
    'lifeline-dedicated-ci',
    'exact-seven-path-scope',
  ]),
});
const TARGET_3216 = Object.freeze({
  packet: 3216,
  packetRef: '#3216',
  pr: 3219,
  candidate: '6d9c957960187ac019da97b1cce87a031030fec3',
  merge: '3df6d7c29d55d0dc451e368b60902833b712aa5d',
  workspaceManifestId: '7e4894e742c4197682fcadbb3dcc3a697af86d0b2a4fee551df42ae457d4286b',
  workspaceManifestPhaseId: '3216-implementation-pr-recovery-rebind',
  workspaceLeaseId: 'e076cac60eba5a12168e7eb1f68f561ac2880cf02d7eb4d061b16c77a8ec8914',
  workspaceAcquiredGeneration: 730,
  workspaceBranch: 'server/mcl-packet-3216',
  workspaceWorktree: '/root/nyang-worktrees/mcl-packet-3216',
  implementationReceiptDigest:
    '2eca442f98b3581f456bfce89000e52769c4f62f0e6f6d54876e053bad6efd74',
  requiredCoordinationGates: Object.freeze([
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
    'implementation-coordination-converged',
    'exact-head-required',
    'exact-head-verify',
    'exact-four-path-diff',
  ]),
});
const EXPECTED_EFFECTS_2786 = Object.freeze([
  'CANONICAL_VALIDATION_MERGE_RECEIPT',
]);
const PROFILES = Object.freeze({
  '#2463': Object.freeze({
    target: TARGET,
    mode: 'VALIDATION_D014',
    expectedEffects: EXPECTED_EFFECTS,
  }),
  '#2786': Object.freeze({
    target: TARGET_2786,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#3043': Object.freeze({
    target: TARGET_3043,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#3051': Object.freeze({
    target: TARGET_3051,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#3092': Object.freeze({
    target: TARGET_3092,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#3099': Object.freeze({
    target: TARGET_3099,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#3110': Object.freeze({
    target: TARGET_3110,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#3118': Object.freeze({
    target: TARGET_3118,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#3126': Object.freeze({
    target: TARGET_3126,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#3144': Object.freeze({
    target: TARGET_3144,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#3108': Object.freeze({
    target: TARGET_3108,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#2791': Object.freeze({
    target: TARGET_2791,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
  '#3216': Object.freeze({
    target: TARGET_3216,
    mode: 'IMPLEMENTATION_COORDINATION',
    expectedEffects: EXPECTED_EFFECTS_2786,
  }),
});
const SELF_OWNER_PATHS = Object.freeze([
  'products/chatgpt-mobile-coder-lab/coordination/validation-finalization/README.md',
  'products/chatgpt-mobile-coder-lab/coordination/validation-finalization/mcl-validation-finalization-apply.cjs',
  'products/chatgpt-mobile-coder-lab/coordination/validation-finalization/tests/test-mcl-validation-finalization-apply.cjs',
].sort());
const SELF_OWNER_SCOPES = Object.freeze([
  ...SELF_OWNER_PATHS.map((repoPath) => 'path:' + repoPath),
  'surface:mcl:validation-finalization-effect',
].sort());
const SELF_OWNER_REQUIRED_GATES = Object.freeze([
  'currentization-scope-and-blob-preservation',
  'd013-release',
  'd014-completion',
  'exact-head-required',
  'exact-head-verify',
  'exact-three-file-diff',
]);
const SELF_OWNER_CURRENTIZED_REQUIRED_GATES = Object.freeze([
  'currentization-scope-and-blob-preservation',
  'packet-scoped-currentization-replay',
  'currentization-d013-release',
  'currentization-d014-completion',
  'currentization-holder-release',
  'currentized-exact-head-required',
  'currentized-exact-head-verify',
  'currentized-pr-readback',
  'exact-three-file-diff',
]);
const PACKET_REF_RE = /^#[1-9][0-9]*$/;

function profileFor(packetRef) {
  const profile = PROFILES[packetRef];
  if (!profile) fail('BLOCKED', 'PACKET_NOT_REVIEWED_TARGET');
  return profile;
}

const handoff = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const taskLease = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const stageEntry = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs'));
const holderOwner = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const completionSet = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/completion-receipt-set.cjs'));
const stageReceipt = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs'));
const validationStageSet = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/validation-finalization/validation-stage-receipt-set.cjs'));
const finalization = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/validation-finalization/validation-finalization-owner.cjs'));

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

class ApplyError extends Error {
  constructor(kind, reasonCodes) {
    const unique = [...new Set(reasonCodes)].sort();
    super(unique[0] || kind);
    this.kind = kind;
    this.reasonCodes = unique;
  }
}

function fail(kind, ...reasonCodes) {
  throw new ApplyError(kind, reasonCodes);
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function unique(values) {
  return [...new Set(values)].sort();
}
function output(status, extras = {}, reasonCodes = [], packetRef = TARGET.packetRef) {
  return {
    schemaVersion: 1,
    mode: 'MCL_VALIDATION_FINALIZATION_APPLY',
    validity: 'VALID',
    packetRef,
    status,
    reasonCodes: unique(reasonCodes),
    ...extras,
    authority: {...FALSE_AUTHORITY},
  };
}
function defaultRunner(args, options = {}) {
  const result = childProcess.spawnSync('gh', args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    input: options.input || null,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}
function runGitRead(worktree, args, spawn = childProcess.spawnSync) {
  const result = spawn('git', ['-C', worktree, ...args], {
    encoding: 'utf8',
    shell: false,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) fail('UNKNOWN', 'WORKSPACE_GIT_READ_FAILED');
  return (result.stdout || '').trim();
}
function ghJson(endpoint, runner = defaultRunner, options = {}) {
  const args = ['api', endpoint, '--method', options.method || 'GET',
    '--header', 'Accept: application/vnd.github+json'];
  const runOptions = {};
  if (options.body !== undefined) {
    args.push('--input', '-');
    runOptions.input = JSON.stringify(options.body);
  }
  const result = runner(args, runOptions);
  if (result.code !== 0) fail(options.write ? 'UNKNOWN' : 'UNKNOWN',
    options.write ? 'GITHUB_COMMENT_WRITE_FAILED' : 'GITHUB_READ_FAILED');
  try { return JSON.parse(result.stdout || 'null'); }
  catch { fail('UNKNOWN', 'GITHUB_JSON_INVALID'); }
}
function readIssue(number, runner) {
  const issue = ghJson('repos/' + REPO + '/issues/' + number, runner);
  if (!issue || issue.pull_request || typeof issue.body !== 'string') {
    fail('UNKNOWN', 'PACKET_READ_INVALID');
  }
  return issue;
}
function readComments(number, runner = defaultRunner) {
  const comments = [];
  const pageSize = 100;
  const maxPages = 5;
  for (let page = 1; page <= maxPages; page += 1) {
    const rows = ghJson('repos/' + REPO + '/issues/' + number
      + '/comments?per_page=' + pageSize + '&page=' + page, runner);
    if (!Array.isArray(rows)) fail('UNKNOWN', 'COMMENT_READ_INVALID');
    comments.push(...rows);
    if (rows.length < pageSize) return comments;
  }
  fail('UNKNOWN', 'COMMENT_DISCOVERY_PARTIAL');
}
function readPr(number, runner = defaultRunner) {
  const pr = ghJson('repos/' + REPO + '/pulls/' + number, runner);
  if (!pr || pr.number !== number) fail('UNKNOWN', 'PR_READ_INVALID');
  return pr;
}
function readReleaseEvidence(runner = defaultRunner) {
  const metaRun = runner(['run', 'view', String(TARGET.releaseRun), '--repo', REPO,
    '--json', 'databaseId,name,event,status,conclusion,headSha,url']);
  if (metaRun.code !== 0) fail('UNKNOWN', 'RELEASE_RUN_READ_FAILED');
  let meta;
  try { meta = JSON.parse(metaRun.stdout || '{}'); }
  catch { fail('UNKNOWN', 'RELEASE_RUN_JSON_INVALID'); }
  if (meta.databaseId !== TARGET.releaseRun || meta.name !== 'MCL Task Lease'
      || meta.event !== 'workflow_dispatch' || meta.status !== 'completed'
      || meta.conclusion !== 'success') {
    fail('CONFLICT', 'RELEASE_RUN_IDENTITY_CONFLICT');
  }
  const logRun = runner(['run', 'view', String(TARGET.releaseRun), '--repo', REPO, '--log']);
  if (logRun.code !== 0) fail('UNKNOWN', 'RELEASE_RUN_LOG_FAILED');
  const log = logRun.stdout || '';
  const required = [
    'MCL_LEASE_PACKET_REF: ' + TARGET.packetRef,
    'MCL_LEASE_ID: ' + TARGET.leaseId,
    '"status":"RELEASE_UPDATED"',
    '"generation":' + TARGET.releasedGeneration,
    '"leaseId":"' + TARGET.leaseId + '"',
  ];
  if (required.some((item) => !log.includes(item))) {
    fail('CONFLICT', 'RELEASE_RUN_PROVENANCE_CONFLICT');
  }
  return {
    status: 'PROVEN',
    runId: TARGET.releaseRun,
    releasedGeneration: TARGET.releasedGeneration,
    evidenceRef: 'run:' + TARGET.releaseRun,
  };
}

function commentBody(comment) {
  return typeof comment?.body === 'string' ? comment.body : '';
}
function stageReceiptsFromComments(comments) {
  const rows = [];
  for (const comment of comments) {
    const body = commentBody(comment);
    if (!body.includes('canonical-main-stage-receipt:v1')) continue;
    const parsed = stageReceipt.parseRenderedStageReceipt(body);
    if (parsed.status !== 'VALID') fail(
      parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      'CANONICAL_STAGE_RECEIPT_INVALID_PRESENT');
    rows.push({comment, receipt: parsed.value, text: body});
  }
  return rows;
}
function selectImplementationReceipt(stageRows, pr) {
  const matches = stageRows.filter(({receipt}) => {
    if (receipt.stage !== 'IMPLEMENTATION_PR' || receipt.packetNumber !== TARGET.packet
        || receipt.status !== 'PASS' || receipt.nextLegalAction !== 'VALIDATION_MERGE') {
      return false;
    }
    return receipt.authorityRefs.some((row) =>
      row.kind === 'PR' && row.locator === 'pr:#' + TARGET.pr
      && row.identity === TARGET.candidate);
  });
  const byDigest = new Map(matches.map((row) => [row.receipt.receiptDigest, row]));
  if (byDigest.size !== 1) {
    fail(byDigest.size ? 'CONFLICT' : 'UNKNOWN',
      byDigest.size ? 'IMPLEMENTATION_RECEIPT_AMBIGUOUS' : 'IMPLEMENTATION_RECEIPT_MISSING');
  }
  const selected = [...byDigest.values()][0];
  if (pr?.head?.sha !== TARGET.candidate) fail('CONFLICT', 'PR_HEAD_CONFLICT');
  return selected;
}
function manifestsFromComments(comments) {
  const rows = [];
  for (const comment of comments) {
    const body = commentBody(comment);
    if (!body.includes('mcl-task-manifest:v1')) continue;
    const parsed = handoff.parseManifest(body);
    if (parsed.status !== 'VALID') fail(
      parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      'D014_MANIFEST_INVALID_PRESENT');
    rows.push({comment, manifest: parsed.value, text: body});
  }
  return rows;
}
function selectTargetManifest(comments) {
  const rows = manifestsFromComments(comments)
    .filter((row) => row.manifest.manifestId === TARGET.manifestId);
  if (rows.length !== 1) fail(rows.length ? 'CONFLICT' : 'UNKNOWN',
    rows.length ? 'TARGET_MANIFEST_AMBIGUOUS' : 'TARGET_MANIFEST_MISSING');
  const manifest = rows[0].manifest;
  if (manifest.packetRef !== TARGET.packetRef
      || manifest.phaseId !== 'validation-merge'
      || manifest.phaseClass !== 'VALIDATION'
      || manifest.route !== 'S'
      || manifest.executor !== 'S'
      || manifest.leaseRequirement !== 'REQUIRED'
      || manifest.leaseEvidence?.leaseId !== TARGET.leaseId
      || manifest.leaseEvidence?.acquiredGeneration !== TARGET.acquiredGeneration
      || manifest.workspace?.kind !== 'repository'
      || manifest.workspace?.branch !== 'server/mcl-wireless-adb-new-chat-landing-2463'
      || manifest.workspace?.worktree !== '/root/nyang-worktrees/mcl-wireless-adb-new-chat-landing-2463') {
    fail('CONFLICT', 'TARGET_MANIFEST_IDENTITY_CONFLICT');
  }
  return rows[0];
}
function completionState(comments, manifest) {
  const targetTexts = [];
  for (const comment of comments) {
    const body = commentBody(comment);
    if (!body.includes('mcl-task-completion-receipt:v1')) continue;
    const parsed = handoff.parseCompletionReceipt(body);
    if (parsed.status !== 'VALID') fail(
      parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      'D014_RECEIPT_INVALID_PRESENT');
    if (parsed.value.manifestId === manifest.manifestId) targetTexts.push(body);
  }
  if (!targetTexts.length) {
    return {status: 'ABSENT', receiptIds: [], representativeReceiptId: null};
  }
  const classified = completionSet.classify({
    manifestId: manifest.manifestId,
    receiptTexts: targetTexts,
  });
  if (classified.status === 'CONFLICT') fail('CONFLICT', 'D014_COMPLETION_CONFLICT');
  if (!['SINGLE', 'MULTIPLE_EQUIVALENT'].includes(classified.status)) {
    fail('UNKNOWN', 'D014_COMPLETION_UNRESOLVED');
  }
  return {
    status: 'COMPLETE',
    receiptIds: classified.receiptIds,
    representativeReceiptId: classified.representativeReceiptId,
  };
}
function selectValidationStageReceiptSet(stageRows, packetNumber) {
  const rows = stageRows.filter(({receipt}) =>
    receipt.stage === 'VALIDATION_MERGE' && receipt.packetNumber === packetNumber);
  if (!rows.length) return {status: 'ABSENT', receipt: null, set: null};
  const classified = validationStageSet.classify(rows.map((row) => row.text));
  if (classified.status === 'CONFLICT') {
    fail('CONFLICT', 'VALIDATION_STAGE_RECEIPT_CONFLICT');
  }
  if (!['SINGLE', 'MULTIPLE_EQUIVALENT'].includes(classified.status)) {
    fail('UNKNOWN', 'VALIDATION_STAGE_RECEIPT_UNRESOLVED');
  }
  const selected = rows.find((row) =>
    row.receipt.receiptDigest === classified.representativeReceiptDigest);
  if (!selected) fail('UNKNOWN', 'VALIDATION_STAGE_RECEIPT_REPRESENTATIVE_MISSING');
  return {status: 'PASS', receipt: selected.receipt, set: classified};
}
function validationStageState(stageRows, implReceipt, pr) {
  const selected = selectValidationStageReceiptSet(stageRows, TARGET.packet);
  if (selected.status === 'ABSENT') return {status: 'ABSENT', receipt: null};
  const receipt = selected.receipt;
  const hasPr = receipt.authorityRefs.some((item) =>
    item.kind === 'PR' && item.locator === 'pr:#' + TARGET.pr
    && item.identity === TARGET.candidate);
  const hasMerge = receipt.authorityRefs.some((item) =>
    item.kind === 'COMMIT' && item.identity === TARGET.merge);
  if (receipt.status !== 'PASS'
      || receipt.nextLegalAction !== 'POSTMERGE_CONVERGENCE'
      || !hasPr || !hasMerge
      || !same(receipt.scope.paths, implReceipt.scope.paths)
      || receipt.scope.diffRequired !== true
      || receipt.scope.diffIdentity !== implReceipt.scope.diffIdentity) {
    fail('CONFLICT', 'VALIDATION_STAGE_RECEIPT_CONFLICT');
  }
  if (pr.merge_commit_sha !== TARGET.merge) fail('CONFLICT', 'PR_MERGE_IDENTITY_CONFLICT');
  return {status: 'PASS', receipt, receiptSetStatus: selected.set.status};
}
function readWorkspace(manifest, spawn = childProcess.spawnSync) {
  const inspected = holderOwner.inspectWorkspace(manifest);
  if (!inspected.ok || !inspected.holderPath) {
    fail('BLOCKED', ...(inspected.reasonCodes || ['WORKSPACE_INSPECT_FAILED']));
  }
  const worktree = manifest.workspace.worktree;
  const branch = runGitRead(worktree, ['branch', '--show-current'], spawn);
  const head = runGitRead(worktree, ['rev-parse', 'HEAD'], spawn);
  const dirty = runGitRead(worktree,
    ['status', '--porcelain=v1', '--untracked-files=all'], spawn);
  if (branch !== manifest.workspace.branch || head !== TARGET.candidate) {
    fail('CONFLICT', 'WORKSPACE_IDENTITY_CONFLICT');
  }
  if (dirty) fail('BLOCKED', 'WORKSPACE_NOT_CLEAN');
  const holder = holderOwner.readHolder(inspected.holderPath);
  if (holder.missing) {
    return {state: 'CLEAN', holderState: 'ABSENT', holderPath: inspected.holderPath};
  }
  if (!holder.ok) fail('CONFLICT', 'HOLDER_STATE_CONFLICT');
  if (holder.value.manifestId !== manifest.manifestId
      || holder.value.leaseId !== TARGET.leaseId) {
    fail('CONFLICT', 'HOLDER_IDENTITY_CONFLICT');
  }
  return {state: 'CLEAN', holderState: 'PRESENT_EXACT', holderPath: inspected.holderPath};
}
function readLedgerState(runner = defaultRunner) {
  const ledger = readIssue(2352, runner);
  const parsed = taskLease.parseLedger(ledger.body || '');
  if (!parsed.ok || parsed.state.status !== 'ACTIVE') fail('UNKNOWN', 'LEDGER_STATE_INVALID');
  const matches = parsed.state.activeLeases.filter((item) => item.leaseId === TARGET.leaseId);
  if (matches.length) fail('BLOCKED', 'TARGET_LEASE_STILL_ACTIVE');
  return {body: ledger.body || '', generation: parsed.state.generation, targetLeaseAbsent: true};
}
function pathScopeDigest(paths) {
  return 'sha256:' + sha256(JSON.stringify([...paths]));
}

function requiredGateNamesPass(receipt, requiredNames) {
  const pass = new Set((receipt.requiredGates || [])
    .filter((row) => row.result === 'PASS')
    .map((row) => row.name));
  return requiredNames.every((name) => pass.has(name));
}
function selfOwnerLineageForReceipt(receipt, packet) {
  if (requiredGateNamesPass(receipt, SELF_OWNER_REQUIRED_GATES)) {
    return {
      kind: 'IMPLEMENTATION_STAGE_ENTRY',
      completionGate: 'd014-completion',
      phaseId: String(packet) + '-implementation-pr-stage-entry',
      requiredGates: SELF_OWNER_REQUIRED_GATES,
    };
  }
  if (requiredGateNamesPass(receipt, SELF_OWNER_CURRENTIZED_REQUIRED_GATES)) {
    return {
      kind: 'VALIDATION_MERGE_CURRENTIZATION',
      completionGate: 'currentization-d014-completion',
      phaseId: String(packet) + '-validation-merge-currentization',
      requiredGates: SELF_OWNER_CURRENTIZED_REQUIRED_GATES,
    };
  }
  return null;
}
function selfOwnerReceiptIdentity(row, packet) {
  const receipt = row?.receipt;
  if (!receipt
      || receipt.stage !== 'IMPLEMENTATION_PR'
      || receipt.packetNumber !== packet
      || receipt.status !== 'PASS'
      || receipt.nextLegalAction !== 'VALIDATION_MERGE'
      || !same(receipt.scope?.paths, SELF_OWNER_PATHS)
      || receipt.scope?.diffRequired !== true) {
    return null;
  }
  const lineage = selfOwnerLineageForReceipt(receipt, packet);
  if (!lineage) return null;
  const prRefs = (receipt.authorityRefs || []).filter((item) =>
    item.kind === 'PR'
    && /^pr:#[1-9][0-9]*$/.test(item.locator || '')
    && /^[0-9a-f]{40}$/.test(item.identity || ''));
  const candidateRefs = (receipt.authorityRefs || []).filter((item) =>
    item.kind === 'COMMIT'
    && item.locator === 'candidate-head'
    && /^[0-9a-f]{40}$/.test(item.identity || ''));
  if (prRefs.length !== 1 || candidateRefs.length !== 1
      || prRefs[0].identity !== candidateRefs[0].identity) {
    fail('CONFLICT', 'SELF_OWNER_IMPLEMENTATION_AUTHORITY_CONFLICT');
  }
  return {
    row,
    pr: Number(prRefs[0].locator.slice('pr:#'.length)),
    candidate: prRefs[0].identity,
    diffIdentity: receipt.scope.diffIdentity,
    lineage,
    semanticIdentity: JSON.stringify({
      pr: prRefs[0].locator,
      candidate: prRefs[0].identity,
      paths: receipt.scope.paths,
      diffIdentity: receipt.scope.diffIdentity,
    }),
  };
}
function selfOwnerImplementationIdentities(stageRows, packet) {
  const identities = stageRows
    .map((row) => selfOwnerReceiptIdentity(row, packet))
    .filter(Boolean);
  if (!identities.length) {
    fail('BLOCKED', 'SELF_OWNER_IMPLEMENTATION_RECEIPT_NOT_QUALIFIED');
  }
  const prNumbers = new Set(identities.map((item) => item.pr));
  if (prNumbers.size !== 1) {
    fail('CONFLICT', 'SELF_OWNER_IMPLEMENTATION_PR_GENERATION_CONFLICT');
  }
  return identities;
}
function selectSelfOwnerImplementationReceipt(stageRows, packet, pr = null) {
  const identities = selfOwnerImplementationIdentities(stageRows, packet);
  let selected = identities;
  if (pr) {
    const prNumber = identities[0].pr;
    if (pr.number !== prNumber || !/^[0-9a-f]{40}$/.test(pr.head?.sha || '')) {
      fail('CONFLICT', 'SELF_OWNER_MERGED_PR_IDENTITY_CONFLICT');
    }
    selected = identities.filter((item) => item.candidate === pr.head.sha);
    if (!selected.length) {
      fail('CONFLICT', 'SELF_OWNER_IMPLEMENTATION_LIVE_HEAD_GENERATION_MISSING');
    }
  }
  const semantic = new Set(selected.map((item) => item.semanticIdentity));
  if (semantic.size !== 1) {
    fail('CONFLICT', 'SELF_OWNER_IMPLEMENTATION_GENERATION_CONFLICT');
  }
  selected.sort((left, right) =>
    left.row.receipt.receiptDigest.localeCompare(right.row.receipt.receiptDigest));
  return selected[0];
}
function selectSelfOwnerCompletionReceipt(comments, packet, packetRef, impl) {
  const lineage = impl?.lineage || {
    kind: 'IMPLEMENTATION_STAGE_ENTRY',
    completionGate: 'd014-completion',
    phaseId: String(packet) + '-implementation-pr-stage-entry',
    requiredGates: SELF_OWNER_REQUIRED_GATES,
  };
  const gates = (impl?.row?.receipt?.requiredGates || [])
    .filter((row) => row.name === lineage.completionGate);
  if (gates.length !== 1 || gates[0].result !== 'PASS') {
    fail(gates.length ? 'CONFLICT' : 'UNKNOWN',
      gates.length ? 'SELF_OWNER_D014_COMPLETION_GATE_CONFLICT'
        : 'SELF_OWNER_D014_COMPLETION_GATE_MISSING');
  }
  const locator = /^issue-comment:([1-9][0-9]*)$/.exec(gates[0].evidenceLocator || '');
  if (!locator) fail('CONFLICT', 'SELF_OWNER_D014_COMPLETION_LOCATOR_INVALID');
  const commentId = Number(locator[1]);
  const matches = comments.filter((comment) => Number(comment?.id) === commentId);
  if (matches.length !== 1) {
    fail(matches.length ? 'CONFLICT' : 'UNKNOWN',
      matches.length ? 'SELF_OWNER_D014_COMPLETION_COMMENT_AMBIGUOUS'
        : 'SELF_OWNER_D014_COMPLETION_COMMENT_MISSING');
  }
  const body = commentBody(matches[0]);
  const parsed = handoff.parseCompletionReceipt(body);
  if (parsed.status !== 'VALID') {
    fail(parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      'SELF_OWNER_D014_COMPLETION_INVALID');
  }
  const receipt = parsed.value;
  if (receipt.packetRef !== packetRef
      || receipt.phaseId !== lineage.phaseId
      || receipt.executor !== 'S'
      || receipt.disposition !== 'COMPLETE'
      || receipt.workspaceResult !== 'clean'
      || (receipt.blockerRefs || []).length
      || (receipt.requiredUnknownRefs || []).length
      || !(receipt.outputRefs || []).includes('pr:#' + impl.pr)) {
    fail('CONFLICT', 'SELF_OWNER_D014_COMPLETION_IDENTITY_CONFLICT');
  }
  return {comment: matches[0], receipt, text: body, lineage};
}

function selectSelfOwnerWorkspaceManifest(comments, packet, packetRef, impl) {
  const completionRow = selectSelfOwnerCompletionReceipt(comments, packet, packetRef, impl);
  const completion = completionRow.receipt;
  const lineage = completionRow.lineage;
  const candidates = [];
  for (const comment of comments) {
    const body = commentBody(comment);
    if (!body.includes('mcl-task-manifest:v1')) continue;
    const parsed = handoff.parseManifest(body);
    if (parsed.status !== 'VALID') continue;
    const manifest = parsed.value;
    if (manifest.manifestId !== completion.manifestId) continue;
    candidates.push({comment, manifest, text: body});
  }
  if (candidates.length !== 1) {
    fail(candidates.length ? 'CONFLICT' : 'UNKNOWN',
      candidates.length ? 'SELF_OWNER_WORKSPACE_MANIFEST_AMBIGUOUS'
        : 'SELF_OWNER_WORKSPACE_MANIFEST_MISSING');
  }
  const selected = candidates[0];
  const manifest = selected.manifest;
  if (manifest.payloadSha256 !== completion.manifestPayloadSha256
      || manifest.packetRef !== packetRef
      || manifest.phaseId !== lineage.phaseId
      || manifest.phaseClass !== 'REPOSITORY_MUTATION'
      || manifest.route !== 'S'
      || manifest.executor !== 'S'
      || manifest.leaseRequirement !== 'REQUIRED'
      || !same([...(manifest.scopes || [])].sort(), SELF_OWNER_SCOPES)
      || !/^[0-9a-f]{64}$/.test(manifest.leaseEvidence?.leaseId || '')
      || !Number.isSafeInteger(manifest.leaseEvidence?.acquiredGeneration)
      || manifest.workspace?.kind !== 'repository'
      || manifest.workspace?.branch !== 'server/mcl-packet-' + packet
      || manifest.workspace?.worktree !== '/root/nyang-worktrees/mcl-packet-' + packet) {
    fail('CONFLICT', 'SELF_OWNER_WORKSPACE_MANIFEST_IDENTITY_CONFLICT');
  }
  return {...selected, completionReceipt: completion, completionText: completionRow.text,
    lineage};
}

function createSelfOwnerLiveContext(packetRef, deps = {}) {
  if (!PACKET_REF_RE.test(packetRef || '')) fail('BLOCKED', 'PACKET_NOT_REVIEWED_TARGET');
  const packet = Number(packetRef.slice(1));
  const runner = deps.runner || defaultRunner;
  const spawn = deps.spawn || childProcess.spawnSync;
  const issue = readIssue(packet, runner);
  if (issue.state !== 'open') fail('BLOCKED', 'PACKET_NOT_OPEN');
  const currentStage = ['VALIDATION_MERGE', 'POSTMERGE_CONVERGENCE', 'EXPERIMENT_CLOSE']
    .find((stage) => issue.body.includes('Current stage: ' + String.fromCharCode(96)
      + stage + String.fromCharCode(96)));
  if (!currentStage) fail('BLOCKED', 'PACKET_VALIDATION_STAGE_NOT_COMPATIBLE');
  const lateRecognition = currentStage !== 'VALIDATION_MERGE';
  let packetScopes;
  try {
    packetScopes = stageEntry.extractPacketScopes(issue.body);
  } catch (error) {
    fail(error?.kind === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      ...(error?.reasonCodes || ['SELF_OWNER_PACKET_SCOPE_UNRESOLVED']));
  }
  if (!same(packetScopes, SELF_OWNER_SCOPES)) {
    fail('BLOCKED', 'PACKET_NOT_REVIEWED_TARGET');
  }
  const comments = readComments(packet, runner);
  const stageRows = stageReceiptsFromComments(comments);
  const identities = selfOwnerImplementationIdentities(stageRows, packet);
  const pr = readPr(identities[0].pr, runner);
  if (pr.state !== 'closed' || !pr.merged_at
      || !/^[0-9a-f]{40}$/.test(pr.head?.sha || '')
      || !/^[0-9a-f]{40}$/.test(pr.merge_commit_sha || '')) {
    fail('CONFLICT', 'SELF_OWNER_MERGED_PR_IDENTITY_CONFLICT');
  }
  const impl = selectSelfOwnerImplementationReceipt(stageRows, packet, pr);
  if (pr.head.sha !== impl.candidate) fail('CONFLICT', 'SELF_OWNER_MERGED_PR_IDENTITY_CONFLICT');
  const manifestRow = selectSelfOwnerWorkspaceManifest(comments, packet, packetRef, impl);
  const manifest = manifestRow.manifest;
  const target = Object.freeze({
    packet,
    packetRef,
    pr: impl.pr,
    candidate: impl.candidate,
    merge: pr.merge_commit_sha,
    workspaceManifestId: manifest.manifestId,
    workspaceManifestPhaseId: manifest.phaseId,
    workspaceLeaseId: manifest.leaseEvidence.leaseId,
    workspaceAcquiredGeneration: manifest.leaseEvidence.acquiredGeneration,
    workspaceBranch: manifest.workspace.branch,
    workspaceWorktree: manifest.workspace.worktree,
    implementationReceiptDigest: impl.row.receipt.receiptDigest,
    requiredCoordinationGates: impl.lineage.requiredGates,
  });
  return {
    target,
    packet,
    packetRef,
    packetBodyDigest: sha256(issue.body),
    runner,
    spawn,
    pr,
    implReceipt: impl.row.receipt,
    implCommentId: impl.row.comment.id,
    workspaceManifest: manifest,
    workspaceManifestText: manifestRow.text,
    coordinationProof: 'PROVEN',
    selfOwnerClass: true,
    selfOwnerLineage: impl.lineage.kind,
    currentStage,
    lateRecognition,
  };
}

function coordinationGatesProven(receipt, target = TARGET_2786) {
  const pass = new Set((receipt.requiredGates || [])
    .filter((row) => row.result === 'PASS')
    .map((row) => row.name));
  const missing = target.requiredCoordinationGates.filter((name) => !pass.has(name));
  if (missing.length) {
    fail('BLOCKED', ...missing.map((name) =>
      'IMPLEMENTATION_COORDINATION_GATE_NOT_PASS:' + name));
  }
  return true;
}
function select2786ImplementationReceipt(stageRows, pr, target = TARGET_2786) {
  const matches = stageRows.filter(({receipt}) =>
    receipt.stage === 'IMPLEMENTATION_PR'
    && receipt.packetNumber === target.packet
    && receipt.status === 'PASS'
    && receipt.nextLegalAction === 'VALIDATION_MERGE'
    && receipt.receiptDigest === target.implementationReceiptDigest
    && receipt.authorityRefs.some((row) =>
      row.kind === 'PR' && row.locator === 'pr:#' + target.pr
      && row.identity === target.candidate));
  if (matches.length !== 1) {
    fail(matches.length ? 'CONFLICT' : 'UNKNOWN',
      matches.length ? 'IMPLEMENTATION_RECEIPT_AMBIGUOUS'
        : 'IMPLEMENTATION_RECEIPT_MISSING');
  }
  if (pr?.head?.sha !== target.candidate) fail('CONFLICT', 'PR_HEAD_CONFLICT');
  coordinationGatesProven(matches[0].receipt, target);
  return matches[0];
}
function select2786WorkspaceManifest(comments, target = TARGET_2786) {
  const exactToken = '"manifestId": "' + target.workspaceManifestId + '"';
  const candidates = comments.filter((comment) => {
    const body = commentBody(comment);
    return body.includes('mcl-task-manifest:v1') && body.includes(exactToken);
  });
  if (candidates.length !== 1) fail(candidates.length ? 'CONFLICT' : 'UNKNOWN',
    candidates.length ? 'WORKSPACE_MANIFEST_AMBIGUOUS' : 'WORKSPACE_MANIFEST_MISSING');
  const parsed = handoff.parseManifest(commentBody(candidates[0]));
  if (parsed.status !== 'VALID') fail(
    parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
    'WORKSPACE_MANIFEST_INVALID');
  const manifest = parsed.value;
  if (manifest.manifestId !== target.workspaceManifestId
      || manifest.packetRef !== target.packetRef
      || manifest.phaseId !== target.workspaceManifestPhaseId
      || manifest.phaseClass !== 'REPOSITORY_MUTATION'
      || manifest.route !== 'S'
      || manifest.executor !== 'S'
      || manifest.leaseRequirement !== 'REQUIRED'
      || manifest.leaseEvidence?.leaseId !== target.workspaceLeaseId
      || manifest.leaseEvidence?.acquiredGeneration !== target.workspaceAcquiredGeneration
      || manifest.workspace?.kind !== 'repository'
      || manifest.workspace?.branch !== target.workspaceBranch
      || manifest.workspace?.worktree !== target.workspaceWorktree) {
    fail('CONFLICT', 'WORKSPACE_MANIFEST_IDENTITY_CONFLICT');
  }
  return {comment: candidates[0], manifest, text: commentBody(candidates[0])};
}
function read2786Workspace(manifest, spawn = childProcess.spawnSync, target = TARGET_2786) {
  const inspected = holderOwner.inspectWorkspace(manifest);
  if (!inspected.ok || !inspected.holderPath) {
    fail('BLOCKED', ...(inspected.reasonCodes || ['WORKSPACE_INSPECT_FAILED']));
  }
  const branch = runGitRead(target.workspaceWorktree, ['branch', '--show-current'], spawn);
  const head = runGitRead(target.workspaceWorktree, ['rev-parse', 'HEAD'], spawn);
  const dirty = runGitRead(target.workspaceWorktree,
    ['status', '--porcelain=v1', '--untracked-files=all'], spawn);
  if (branch !== target.workspaceBranch || head !== target.candidate) {
    fail('CONFLICT', 'WORKSPACE_IDENTITY_CONFLICT');
  }
  if (dirty) fail('BLOCKED', 'WORKSPACE_NOT_CLEAN');
  const holder = holderOwner.readHolder(inspected.holderPath);
  if (!holder.missing) {
    if (!holder.ok) fail('CONFLICT', 'HOLDER_STATE_CONFLICT');
    fail('BLOCKED', '2786_HOLDER_PRESENT_NOT_AUTHORIZED');
  }
  return {state: 'CLEAN', holderState: 'ABSENT', holderPath: inspected.holderPath};
}
function read2786LedgerState(runner = defaultRunner, target = TARGET_2786) {
  const ledger = readIssue(2352, runner);
  const parsed = taskLease.parseLedger(ledger.body || '');
  if (!parsed.ok || parsed.state.status !== 'ACTIVE') fail('UNKNOWN', 'LEDGER_STATE_INVALID');
  const packetLeases = parsed.state.activeLeases
    .filter((item) => item.packetRef === target.packetRef);
  if (packetLeases.length) fail('BLOCKED', 'TARGET_PACKET_LEASE_STILL_ACTIVE');
  return {
    body: ledger.body || '',
    generation: parsed.state.generation,
    targetPacketLeaseAbsent: true,
  };
}
function validationStageState2786(stageRows, implReceipt, pr, target = TARGET_2786) {
  const selected = selectValidationStageReceiptSet(stageRows, target.packet);
  if (selected.status === 'ABSENT') return {status: 'ABSENT', receipt: null};
  const receipt = selected.receipt;
  const hasPr = receipt.authorityRefs.some((item) =>
    item.kind === 'PR' && item.locator === 'pr:#' + target.pr
    && item.identity === target.candidate);
  const hasMerge = receipt.authorityRefs.some((item) =>
    item.kind === 'COMMIT' && item.identity === target.merge);
  if (receipt.status !== 'PASS'
      || receipt.nextLegalAction !== 'POSTMERGE_CONVERGENCE'
      || !hasPr || !hasMerge
      || !same(receipt.scope.paths, implReceipt.scope.paths)
      || receipt.scope.diffRequired !== true
      || receipt.scope.diffIdentity !== implReceipt.scope.diffIdentity) {
    fail('CONFLICT', 'VALIDATION_STAGE_RECEIPT_CONFLICT');
  }
  if (pr.merge_commit_sha !== target.merge) fail('CONFLICT', 'PR_MERGE_IDENTITY_CONFLICT');
  return {status: 'PASS', receipt, receiptSetStatus: selected.set.status};
}
function create2786LiveContext(packetRef, deps = {}) {
  const profile = profileFor(packetRef);
  if (profile.mode !== 'IMPLEMENTATION_COORDINATION') {
    fail('BLOCKED', 'PACKET_NOT_IMPLEMENTATION_COORDINATION_TARGET');
  }
  const target = profile.target;
  const runner = deps.runner || defaultRunner;
  const spawn = deps.spawn || childProcess.spawnSync;
  const issue = readIssue(target.packet, runner);
  if (issue.state !== 'open') fail('BLOCKED', 'PACKET_NOT_OPEN');
  if (!issue.body.includes('Current stage: `VALIDATION_MERGE`')) {
    fail('BLOCKED', 'PACKET_VALIDATION_STAGE_NOT_COMPATIBLE');
  }
  const comments = readComments(target.packet, runner);
  const pr = readPr(target.pr, runner);
  if (pr.state !== 'closed' || !pr.merged_at
      || pr.head?.sha !== target.candidate
      || pr.merge_commit_sha !== target.merge) {
    fail('CONFLICT', 'MERGED_PR_IDENTITY_CONFLICT');
  }
  const stageRows = stageReceiptsFromComments(comments);
  const impl = select2786ImplementationReceipt(stageRows, pr, target);
  const manifestRow = select2786WorkspaceManifest(comments, target);
  return {
    target,
    packet: target.packet,
    packetRef: target.packetRef,
    packetBodyDigest: sha256(issue.body),
    runner,
    spawn,
    pr,
    implReceipt: impl.receipt,
    implCommentId: impl.comment.id,
    workspaceManifest: manifestRow.manifest,
    workspaceManifestText: manifestRow.text,
    coordinationProof: 'PROVEN',
  };
}
function inspectorEvidence(ctx, mutable) {
  const diff = 'sha256:' + ctx.implReceipt.scope.diffIdentity;
  const scopeDigest = pathScopeDigest(ctx.implReceipt.scope.paths);
  const completeCoordination = mutable.release.status === 'PROVEN'
    && mutable.ledger.targetLeaseAbsent
    && mutable.workspace.holderState === 'ABSENT'
    && mutable.completion.status === 'COMPLETE';
  const stage = mutable.validationStage.status === 'PASS'
    ? {
      state: 'PASS',
      packetRef: TARGET.packetRef,
      prNumber: TARGET.pr,
      candidateHead: TARGET.candidate,
      mergeCommit: TARGET.merge,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    }
    : {
      state: 'ABSENT',
      packetRef: null,
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
      nextLegalAction: 'UNKNOWN',
    };
  return {
    schemaVersion: 1,
    mode: 'VALIDATION_FINALIZATION_EVIDENCE',
    subject: 'issue:' + TARGET.packetRef,
    packetRef: TARGET.packetRef,
    packetState: 'EXACT',
    validationStageState: 'COMPATIBLE',
    expected: {
      prNumber: TARGET.pr,
      candidateHead: TARGET.candidate,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
    },
    mergeEvidence: {
      state: 'MERGED',
      prNumber: TARGET.pr,
      candidateHead: TARGET.candidate,
      mergeCommit: TARGET.merge,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
    },
    validationEvidence: {
      state: 'PASS',
      candidateHead: TARGET.candidate,
      diffIdentity: diff,
    },
    stageReceipt: stage,
    coordinationState: completeCoordination ? 'COMPLETE' : 'INCOMPLETE',
    workspaceState: 'CLEAN',
    requiredUnknownState: 'NONE',
    sourceRefs: [
      'issue:' + TARGET.packetRef,
      'pr:#' + TARGET.pr,
      'manifest:' + ctx.manifest.manifestId,
    ],
  };
}

function inspectorEvidence2786(ctx, mutable) {
  const target = ctx.target;
  const diff = 'sha256:' + ctx.implReceipt.scope.diffIdentity;
  const scopeDigest = pathScopeDigest(ctx.implReceipt.scope.paths);
  const completeCoordination = ctx.coordinationProof === 'PROVEN'
    && mutable.ledger.targetPacketLeaseAbsent
    && mutable.workspace.holderState === 'ABSENT';
  const stage = mutable.validationStage.status === 'PASS'
    ? {
      state: 'PASS',
      packetRef: target.packetRef,
      prNumber: target.pr,
      candidateHead: target.candidate,
      mergeCommit: target.merge,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    }
    : {
      state: 'ABSENT',
      packetRef: null,
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
      nextLegalAction: 'UNKNOWN',
    };
  return {
    schemaVersion: 1,
    mode: 'VALIDATION_FINALIZATION_EVIDENCE',
    subject: 'issue:' + target.packetRef,
    packetRef: target.packetRef,
    packetState: 'EXACT',
    validationStageState: 'COMPATIBLE',
    expected: {
      prNumber: target.pr,
      candidateHead: target.candidate,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
    },
    mergeEvidence: {
      state: 'MERGED',
      prNumber: target.pr,
      candidateHead: target.candidate,
      mergeCommit: target.merge,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
    },
    validationEvidence: {
      state: 'PASS',
      candidateHead: target.candidate,
      diffIdentity: diff,
    },
    stageReceipt: stage,
    coordinationState: completeCoordination ? 'COMPLETE' : 'UNKNOWN',
    workspaceState: mutable.workspace.state,
    requiredUnknownState: 'NONE',
    sourceRefs: [
      'issue:' + target.packetRef,
      'pr:#' + target.pr,
      'receipt:' + ctx.implReceipt.receiptDigest,
      'manifest:' + ctx.workspaceManifest.manifestId,
    ],
  };
}
function read2786MutableState(ctx) {
  const target = ctx.target;
  const issue = readIssue(target.packet, ctx.runner);
  if (sha256(issue.body) !== ctx.packetBodyDigest) fail('BLOCKED', 'PACKET_BODY_DRIFT');
  const comments = readComments(target.packet, ctx.runner);
  const stageRows = stageReceiptsFromComments(comments);
  const ledger = read2786LedgerState(ctx.runner, target);
  const workspace = read2786Workspace(ctx.workspaceManifest, ctx.spawn, target);
  const validationStage = validationStageState2786(
    stageRows, ctx.implReceipt, ctx.pr, target);
  const mutable = {
    comments,
    ledger,
    workspace,
    completion: {
      status: 'NOT_APPLICABLE',
      receiptIds: [],
      representativeReceiptId: null,
    },
    validationStage,
  };
  const evidence = inspectorEvidence2786(ctx, mutable);
  const decision = finalization.projectValidationFinalization(evidence);
  return {...mutable, evidence, decision};
}

function createLiveContext(packetRef, deps = {}) {
  if (packetRef !== TARGET.packetRef) fail('BLOCKED', 'PACKET_NOT_V1_TARGET');
  const runner = deps.runner || defaultRunner;
  const spawn = deps.spawn || childProcess.spawnSync;
  const issue = readIssue(TARGET.packet, runner);
  if (issue.state !== 'open') fail('BLOCKED', 'PACKET_NOT_OPEN');
  if (!issue.body.includes('Current stage: `VALIDATION_MERGE`')) {
    fail('BLOCKED', 'PACKET_VALIDATION_STAGE_NOT_COMPATIBLE');
  }
  const comments = readComments(TARGET.packet, runner);
  const pr = readPr(TARGET.pr, runner);
  if (pr.state !== 'closed' || !pr.merged_at
      || pr.head?.sha !== TARGET.candidate
      || pr.merge_commit_sha !== TARGET.merge) {
    fail('CONFLICT', 'MERGED_PR_IDENTITY_CONFLICT');
  }
  const stageRows = stageReceiptsFromComments(comments);
  const impl = selectImplementationReceipt(stageRows, pr);
  const manifestRow = selectTargetManifest(comments);
  const release = readReleaseEvidence(runner);
  return {
    packet: TARGET.packet,
    packetRef: TARGET.packetRef,
    packetBodyDigest: sha256(issue.body),
    runner,
    spawn,
    pr,
    implReceipt: impl.receipt,
    implCommentId: impl.comment.id,
    manifest: manifestRow.manifest,
    manifestText: manifestRow.text,
    release,
  };
}
function readMutableState(ctx) {
  const issue = readIssue(TARGET.packet, ctx.runner);
  if (sha256(issue.body) !== ctx.packetBodyDigest) fail('BLOCKED', 'PACKET_BODY_DRIFT');
  const comments = readComments(TARGET.packet, ctx.runner);
  const stageRows = stageReceiptsFromComments(comments);
  const ledger = readLedgerState(ctx.runner);
  const workspace = readWorkspace(ctx.manifest, ctx.spawn);
  const completion = completionState(comments, ctx.manifest);
  const validationStage = validationStageState(stageRows, ctx.implReceipt, ctx.pr);
  const mutable = {
    comments,
    ledger,
    workspace,
    completion,
    validationStage,
    release: ctx.release,
  };
  const evidence = inspectorEvidence(ctx, mutable);
  const decision = finalization.projectValidationFinalization(evidence);
  return {...mutable, evidence, decision};
}
function buildCompletionText(ctx) {
  const receipt = handoff.buildCompletionReceipt(ctx.manifest, {
    disposition: 'COMPLETE',
    outputRefs: [
      'commit:' + TARGET.candidate,
      'commit:' + TARGET.merge,
      'pr:#' + TARGET.pr,
    ],
    validationRefs: [
      'run:' + TARGET.ownerValidationRun,
      'run:' + TARGET.requiredRun,
      'run:' + TARGET.releaseRun,
      'pr:#' + TARGET.pr,
    ],
    observedRefs: [
      'commit:' + TARGET.candidate,
      'commit:' + TARGET.merge,
      'pr:#' + TARGET.pr,
    ],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: {
      ledgerRef: '#2352',
      leaseId: TARGET.leaseId,
      releasedGeneration: TARGET.releasedGeneration,
      evidenceRef: 'run:' + TARGET.releaseRun,
    },
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
  });
  return {text: handoff.renderCompletionReceipt(receipt), receipt};
}
function buildValidationStageText(ctx, completion) {
  if (completion.status !== 'COMPLETE' || !completion.representativeReceiptId) {
    fail('BLOCKED', 'D014_COMPLETION_REQUIRED_BEFORE_STAGE_RECEIPT');
  }
  const receipt = stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: TARGET.packet,
    stage: 'VALIDATION_MERGE',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate-head', identity: TARGET.candidate},
      {kind: 'COMMIT', locator: 'merge:#' + TARGET.pr, identity: TARGET.merge},
      {kind: 'PR', locator: 'pr:#' + TARGET.pr, identity: TARGET.candidate},
      {kind: 'WORKFLOW_RUN', locator: 'run:' + TARGET.ownerValidationRun,
        identity: TARGET.candidate},
      {kind: 'WORKFLOW_RUN', locator: 'run:' + TARGET.requiredRun,
        identity: TARGET.candidate},
      {kind: 'WORKFLOW_RUN', locator: 'run:' + TARGET.releaseRun,
        identity: TARGET.merge},
    ],
    requiredGates: [
      {name: 'candidate-bound-owner-validation', result: 'PASS',
        evidenceLocator: 'run:' + TARGET.ownerValidationRun},
      {name: 'candidate-bound-required', result: 'PASS',
        evidenceLocator: 'run:' + TARGET.requiredRun + '/job:' + TARGET.requiredJob},
      {name: 'expected-head-merge', result: 'PASS',
        evidenceLocator: 'commit:' + TARGET.merge},
      {name: 'historical-d013-release', result: 'PASS',
        evidenceLocator: 'run:' + TARGET.releaseRun},
      {name: 'current-lease-absence', result: 'PASS',
        evidenceLocator: 'issue:#2352'},
      {name: 'holder-absent', result: 'PASS',
        evidenceLocator: 'receipt:mcl-workspace-holder:absent'},
      {name: 'workspace-clean', result: 'PASS',
        evidenceLocator: 'receipt:mcl-workspace-clean:#2463'},
      {name: 'd014-complete', result: 'PASS',
        evidenceLocator: 'receipt:mcl-task-completion-receipt:'
          + completion.representativeReceiptId},
    ],
    scope: {
      paths: ctx.implReceipt.scope.paths,
      diffRequired: true,
      diffIdentity: ctx.implReceipt.scope.diffIdentity,
      diffEvidenceLocator: 'pr:#' + TARGET.pr,
    },
    proof: [
      {term: 'CONTRACT_PROVEN', evidenceLocator: 'run:' + TARGET.ownerValidationRun},
      {term: 'LIVE_PROVEN', evidenceLocator: 'pr:#' + TARGET.pr},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
  });
  if (receipt.status !== 'PASS') fail('UNKNOWN', 'STAGE_RECEIPT_BUILD_NOT_PASS');
  return {text: stageReceipt.renderStageReceipt(receipt), receipt};
}
function stageReceiptAuthorityInput(row) {
  return {kind: row.kind, locator: row.locator, identity: row.identity};
}
function build2786ValidationStageText(ctx) {
  const target = ctx.target;
  const receipt = stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: target.packet,
    stage: 'VALIDATION_MERGE',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate-head', identity: target.candidate},
      {kind: 'COMMIT', locator: 'merge:#' + target.pr, identity: target.merge},
      {kind: 'PR', locator: 'pr:#' + target.pr, identity: target.candidate},
      ...ctx.implReceipt.authorityRefs
        .filter((row) => row.kind === 'WORKFLOW_RUN')
        .map(stageReceiptAuthorityInput),
    ],
    requiredGates: [
      {name: 'implementation-stage-receipt', result: 'PASS',
        evidenceLocator: 'receipt:' + ctx.implReceipt.receiptDigest},
      {name: 'implementation-coordination-converged', result: 'PASS',
        evidenceLocator: 'receipt:' + ctx.implReceipt.receiptDigest},
      {name: 'expected-head-merge', result: 'PASS',
        evidenceLocator: 'commit:' + target.merge},
      {name: 'current-packet-lease-absence', result: 'PASS',
        evidenceLocator: 'issue:#2352'},
      {name: 'holder-absent', result: 'PASS',
        evidenceLocator: 'receipt:mcl-workspace-holder:absent'},
      {name: 'workspace-clean', result: 'PASS',
        evidenceLocator: 'receipt:mcl-workspace-clean:' + target.packetRef},
    ],
    scope: {
      paths: ctx.implReceipt.scope.paths,
      diffRequired: true,
      diffIdentity: ctx.implReceipt.scope.diffIdentity,
      diffEvidenceLocator: 'pr:#' + target.pr,
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + target.candidate},
      {term: 'CONTRACT_PROVEN',
        evidenceLocator: 'receipt:' + ctx.implReceipt.receiptDigest},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
  });
  if (receipt.status !== 'PASS') fail('UNKNOWN', 'STAGE_RECEIPT_BUILD_NOT_PASS');
  return {text: stageReceipt.renderStageReceipt(receipt), receipt};
}
function cleanupHolderLive(ctx, mutable) {
  if (mutable.workspace.holderState === 'ABSENT') return {cleaned: 0};
  if (mutable.workspace.holderState !== 'PRESENT_EXACT') {
    fail('CONFLICT', 'HOLDER_NOT_EXACT');
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-finalization-'));
  const manifestPath = path.join(dir, 'manifest.md');
  const ledgerPath = path.join(dir, 'ledger.md');
  try {
    fs.writeFileSync(manifestPath, ctx.manifestText, {mode: 0o600});
    fs.writeFileSync(ledgerPath, mutable.ledger.body, {mode: 0o600});
    const result = holderOwner.cleanupStale({manifestPath, ledgerPath, packetPath: null});
    if (result.status !== 'STALE_CLEANED') {
      fail('BLOCKED', ...(result.reasonCodes || ['HOLDER_CLEANUP_FAILED']));
    }
    return {cleaned: 1};
  } finally {
    try { fs.rmSync(dir, {recursive: true, force: true}); } catch (_) {}
  }
}
function postExactComment(packet, body, runner = defaultRunner) {
  const before = readComments(packet, runner)
    .filter((comment) => commentBody(comment) === body);
  if (before.length > 1) fail('CONFLICT', 'EXACT_COMMENT_DUPLICATE');
  if (before.length === 1) return {written: 0, reused: 1, lostAckRecovered: false};

  const result = runner([
    'api', 'repos/' + REPO + '/issues/' + packet + '/comments',
    '--method', 'POST',
    '--header', 'Accept: application/vnd.github+json',
    '--input', '-',
  ], {input: JSON.stringify({body})});

  const after = readComments(packet, runner)
    .filter((comment) => commentBody(comment) === body);
  if (after.length > 1) fail('CONFLICT', 'EXACT_COMMENT_DUPLICATE');
  if (after.length === 1) {
    return {written: 1, reused: 0, lostAckRecovered: result.code !== 0};
  }
  if (result.code !== 0) fail('UNKNOWN', 'COMMENT_WRITE_ACK_UNKNOWN');
  fail('UNKNOWN', 'COMMENT_WRITE_READBACK_MISSING');
}
function decisionSummary(decision) {
  return {
    finalizationDisposition: decision.finalizationDisposition,
    result: decision.result,
    attentionDisposition: decision.attentionDisposition,
    requiredEffectClasses: decision.requiredEffectClasses,
    nextLegalAction: decision.nextLegalAction,
    evidenceDigest: decision.evidenceDigest,
  };
}
function effectPairExact(decision) {
  return decision.finalizationDisposition === 'FINALIZATION_REQUIRED'
    && decision.result === 'PASS'
    && decision.attentionDisposition === 'ACTION_REQUIRED'
    && same([...decision.requiredEffectClasses].sort(), [...EXPECTED_EFFECTS].sort())
    && decision.nextLegalAction === 'FIXED_FINALIZATION_EFFECT_REVIEW';
}
function effectPair2786Exact(decision) {
  return decision.finalizationDisposition === 'FINALIZATION_REQUIRED'
    && decision.result === 'PASS'
    && decision.attentionDisposition === 'ACTION_REQUIRED'
    && same([...decision.requiredEffectClasses].sort(), [...EXPECTED_EFFECTS_2786].sort())
    && decision.nextLegalAction === 'FIXED_FINALIZATION_EFFECT_REVIEW';
}

function inspect2463Packet(packetRef, deps = {}) {
  const createContext = deps.createContext || createLiveContext;
  const readState = deps.readState || readMutableState;
  const ctx = createContext(packetRef, deps);
  const state = readState(ctx, deps);
  return output(state.decision.result, {
    operation: 'inspect',
    ...decisionSummary(state.decision),
    effects: {
      holderCleaned: 0,
      d014Published: 0,
      stageReceiptPublished: 0,
    },
  });
}
function apply2463Packet(packetRef, deps = {}) {
  const createContext = deps.createContext || createLiveContext;
  const readState = deps.readState || readMutableState;
  const cleanupHolder = deps.cleanupHolder || cleanupHolderLive;
  const publishExact = deps.publishExact || ((packet, body, ctx) =>
    postExactComment(packet, body, ctx.runner));
  const makeCompletion = deps.buildCompletionText || buildCompletionText;
  const makeStage = deps.buildValidationStageText || buildValidationStageText;

  const ctx = createContext(packetRef, deps);
  let state = readState(ctx, deps);
  const pre = state.decision;
  const effects = {
    holderCleaned: 0,
    d014Published: 0,
    stageReceiptPublished: 0,
  };

  if (pre.finalizationDisposition === 'ALREADY_FINALIZED'
      && pre.result === 'PASS'
      && pre.nextLegalAction === 'POSTMERGE_CONVERGENCE'
      && pre.requiredEffectClasses.length === 0) {
    return output('PASS', {
      operation: 'apply',
      pre: decisionSummary(pre),
      post: decisionSummary(pre),
      finalizationDisposition: 'ALREADY_FINALIZED',
      result: 'PASS',
      effects,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    });
  }

  if (!effectPairExact(pre)) {
    fail(pre.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'PRE_EFFECT_FINALIZATION_DISPOSITION_NOT_V1_PAIR');
  }

  if (state.workspace.holderState === 'PRESENT_EXACT') {
    const cleaned = cleanupHolder(ctx, state, deps);
    effects.holderCleaned += cleaned.cleaned || 0;
    state = readState(ctx, deps);
  }
  if (state.workspace.holderState !== 'ABSENT') {
    fail('BLOCKED', 'HOLDER_NOT_ABSENT_AFTER_CLEANUP');
  }
  if (state.workspace.state !== 'CLEAN') fail('BLOCKED', 'WORKSPACE_NOT_CLEAN');

  if (state.completion.status === 'ABSENT') {
    const built = makeCompletion(ctx, state, deps);
    const posted = publishExact(TARGET.packet, built.text, ctx, deps);
    effects.d014Published += posted.written || 0;
    state = readState(ctx, deps);
  }
  if (state.completion.status !== 'COMPLETE') {
    fail('BLOCKED', 'D014_COMPLETION_NOT_PROVEN');
  }

  if (state.validationStage.status === 'ABSENT') {
    const built = makeStage(ctx, state.completion, deps);
    const posted = publishExact(TARGET.packet, built.text, ctx, deps);
    effects.stageReceiptPublished += posted.written || 0;
    state = readState(ctx, deps);
  }
  if (state.validationStage.status !== 'PASS') {
    fail('BLOCKED', 'VALIDATION_STAGE_RECEIPT_NOT_PROVEN');
  }

  const post = state.decision;
  if (post.finalizationDisposition !== 'ALREADY_FINALIZED'
      || post.result !== 'PASS'
      || post.attentionDisposition !== 'COMPLETE'
      || post.requiredEffectClasses.length !== 0
      || post.nextLegalAction !== 'POSTMERGE_CONVERGENCE') {
    fail(post.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'POST_EFFECT_REINSPECT_NOT_ALREADY_FINALIZED');
  }

  return output('PASS', {
    operation: 'apply',
    pre: decisionSummary(pre),
    post: decisionSummary(post),
    finalizationDisposition: post.finalizationDisposition,
    result: post.result,
    effects,
    nextLegalAction: post.nextLegalAction,
  });
}

function inspect2786Packet(packetRef, deps = {}) {
  const profile = profileFor(packetRef);
  if (profile.mode !== 'IMPLEMENTATION_COORDINATION') {
    fail('BLOCKED', 'PACKET_NOT_IMPLEMENTATION_COORDINATION_TARGET');
  }
  const target = profile.target;
  const createContext = deps.createContext || create2786LiveContext;
  const readState = deps.readState || read2786MutableState;
  const ctx = createContext(packetRef, deps);
  const state = readState(ctx, deps);
  return output(state.decision.result, {
    operation: 'inspect',
    ...decisionSummary(state.decision),
    effects: {
      holderCleaned: 0,
      d014Published: 0,
      stageReceiptPublished: 0,
    },
  }, [], target.packetRef);
}
function apply2786Packet(packetRef, deps = {}) {
  const profile = profileFor(packetRef);
  if (profile.mode !== 'IMPLEMENTATION_COORDINATION') {
    fail('BLOCKED', 'PACKET_NOT_IMPLEMENTATION_COORDINATION_TARGET');
  }
  const target = profile.target;
  const createContext = deps.createContext || create2786LiveContext;
  const readState = deps.readState || read2786MutableState;
  const publishExact = deps.publishExact || ((packet, body, ctx) =>
    postExactComment(packet, body, ctx.runner));
  const makeStage = deps.buildValidationStageText || build2786ValidationStageText;

  const ctx = createContext(packetRef, deps);
  let state = readState(ctx, deps);
  const pre = state.decision;
  const effects = {
    holderCleaned: 0,
    d014Published: 0,
    stageReceiptPublished: 0,
  };

  if (pre.finalizationDisposition === 'ALREADY_FINALIZED'
      && pre.result === 'PASS'
      && pre.nextLegalAction === 'POSTMERGE_CONVERGENCE'
      && pre.requiredEffectClasses.length === 0) {
    return output('PASS', {
      operation: 'apply',
      pre: decisionSummary(pre),
      post: decisionSummary(pre),
      finalizationDisposition: 'ALREADY_FINALIZED',
      result: 'PASS',
      effects,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    }, [], target.packetRef);
  }

  if (!effectPair2786Exact(pre)) {
    fail(pre.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'PRE_EFFECT_FINALIZATION_DISPOSITION_NOT_2786_PAIR');
  }
  if (state.workspace.holderState !== 'ABSENT') {
    fail('BLOCKED', '2786_HOLDER_PRESENT_NOT_AUTHORIZED');
  }
  if (state.workspace.state !== 'CLEAN') fail('BLOCKED', 'WORKSPACE_NOT_CLEAN');
  if (state.completion.status !== 'NOT_APPLICABLE') {
    fail('CONFLICT', '2786_D014_COMPLETION_MUST_BE_NOT_APPLICABLE');
  }

  if (state.validationStage.status === 'ABSENT') {
    const built = makeStage(ctx, state, deps);
    const posted = publishExact(target.packet, built.text, ctx, deps);
    effects.stageReceiptPublished += posted.written || 0;
    state = readState(ctx, deps);
  }
  if (state.validationStage.status !== 'PASS') {
    fail('BLOCKED', 'VALIDATION_STAGE_RECEIPT_NOT_PROVEN');
  }

  const post = state.decision;
  if (post.finalizationDisposition !== 'ALREADY_FINALIZED'
      || post.result !== 'PASS'
      || post.attentionDisposition !== 'COMPLETE'
      || post.requiredEffectClasses.length !== 0
      || post.nextLegalAction !== 'POSTMERGE_CONVERGENCE') {
    fail(post.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'POST_EFFECT_REINSPECT_NOT_ALREADY_FINALIZED');
  }

  return output('PASS', {
    operation: 'apply',
    pre: decisionSummary(pre),
    post: decisionSummary(post),
    finalizationDisposition: post.finalizationDisposition,
    result: post.result,
    effects,
    nextLegalAction: post.nextLegalAction,
  }, [], target.packetRef);
}
function inspectSelfOwnerPacket(packetRef, deps = {}) {
  const createContext = deps.createSelfOwnerContext || createSelfOwnerLiveContext;
  const readState = deps.readState || read2786MutableState;
  const ctx = createContext(packetRef, deps);
  const state = readState(ctx, deps);
  if (ctx.lateRecognition) {
    const decision = state.decision;
    if (state.validationStage.status !== 'PASS'
        || decision.finalizationDisposition !== 'ALREADY_FINALIZED'
        || decision.result !== 'PASS'
        || decision.requiredEffectClasses.length !== 0) {
      fail('BLOCKED', 'LATE_SELF_OWNER_EXISTING_VALIDATION_STAGE_REQUIRED');
    }
  }
  return output(state.decision.result, {
    operation: 'inspect',
    ...decisionSummary(state.decision),
    selfOwnerMode: ctx.lateRecognition
      ? 'LATE_ZERO_EFFECT_RECOGNITION' : 'NORMAL_VALIDATION_MERGE_PUBLICATION',
    effects: {
      holderCleaned: 0,
      d014Published: 0,
      stageReceiptPublished: 0,
    },
  }, [], ctx.target.packetRef);
}
function applySelfOwnerPacket(packetRef, deps = {}) {
  const createContext = deps.createSelfOwnerContext || createSelfOwnerLiveContext;
  const readState = deps.readState || read2786MutableState;
  const publishExact = deps.publishExact || ((packet, body, ctx) =>
    postExactComment(packet, body, ctx.runner));
  const makeStage = deps.buildValidationStageText || build2786ValidationStageText;

  const ctx = createContext(packetRef, deps);
  let state = readState(ctx, deps);
  const pre = state.decision;
  const effects = {
    holderCleaned: 0,
    d014Published: 0,
    stageReceiptPublished: 0,
  };
  if (ctx.lateRecognition) {
    if (state.validationStage.status !== 'PASS'
        || pre.finalizationDisposition !== 'ALREADY_FINALIZED'
        || pre.result !== 'PASS'
        || pre.attentionDisposition !== 'COMPLETE'
        || pre.requiredEffectClasses.length !== 0
        || pre.nextLegalAction !== 'POSTMERGE_CONVERGENCE') {
      fail('BLOCKED', 'LATE_SELF_OWNER_EXISTING_VALIDATION_STAGE_REQUIRED');
    }
    return output('PASS', {
      operation: 'apply',
      pre: decisionSummary(pre),
      post: decisionSummary(pre),
      selfOwnerMode: 'LATE_ZERO_EFFECT_RECOGNITION',
      finalizationDisposition: 'ALREADY_FINALIZED',
      result: 'PASS',
      effects,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    }, [], ctx.target.packetRef);
  }
  if (pre.finalizationDisposition === 'ALREADY_FINALIZED'
      && pre.result === 'PASS'
      && pre.nextLegalAction === 'POSTMERGE_CONVERGENCE'
      && pre.requiredEffectClasses.length === 0) {
    return output('PASS', {
      operation: 'apply',
      pre: decisionSummary(pre),
      post: decisionSummary(pre),
      finalizationDisposition: 'ALREADY_FINALIZED',
      result: 'PASS',
      effects,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    }, [], ctx.target.packetRef);
  }
  if (!effectPair2786Exact(pre)) {
    fail(pre.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'PRE_EFFECT_FINALIZATION_DISPOSITION_NOT_SELF_OWNER_PAIR');
  }
  if (state.workspace.holderState !== 'ABSENT') {
    fail('BLOCKED', 'SELF_OWNER_HOLDER_PRESENT_NOT_AUTHORIZED');
  }
  if (state.workspace.state !== 'CLEAN') fail('BLOCKED', 'WORKSPACE_NOT_CLEAN');
  if (state.completion.status !== 'NOT_APPLICABLE') {
    fail('CONFLICT', 'SELF_OWNER_D014_COMPLETION_MUST_BE_NOT_APPLICABLE');
  }
  if (state.validationStage.status === 'ABSENT') {
    const built = makeStage(ctx, state, deps);
    const posted = publishExact(ctx.target.packet, built.text, ctx, deps);
    effects.stageReceiptPublished += posted.written || 0;
    state = readState(ctx, deps);
  }
  if (state.validationStage.status !== 'PASS') {
    fail('BLOCKED', 'VALIDATION_STAGE_RECEIPT_NOT_PROVEN');
  }
  const post = state.decision;
  if (post.finalizationDisposition !== 'ALREADY_FINALIZED'
      || post.result !== 'PASS'
      || post.attentionDisposition !== 'COMPLETE'
      || post.requiredEffectClasses.length !== 0
      || post.nextLegalAction !== 'POSTMERGE_CONVERGENCE') {
    fail(post.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'POST_EFFECT_REINSPECT_NOT_ALREADY_FINALIZED');
  }
  return output('PASS', {
    operation: 'apply',
    pre: decisionSummary(pre),
    post: decisionSummary(post),
    finalizationDisposition: post.finalizationDisposition,
    result: post.result,
    effects,
    nextLegalAction: post.nextLegalAction,
  }, [], ctx.target.packetRef);
}

function inspectPacket(packetRef, deps = {}) {
  const profile = PROFILES[packetRef];
  if (!profile) return inspectSelfOwnerPacket(packetRef, deps);
  return profile.mode === 'IMPLEMENTATION_COORDINATION'
    ? inspect2786Packet(packetRef, deps)
    : inspect2463Packet(packetRef, deps);
}
function applyPacket(packetRef, deps = {}) {
  const profile = PROFILES[packetRef];
  if (!profile) return applySelfOwnerPacket(packetRef, deps);
  return profile.mode === 'IMPLEMENTATION_COORDINATION'
    ? apply2786Packet(packetRef, deps)
    : apply2463Packet(packetRef, deps);
}

function parseArgs(argv = process.argv.slice(2)) {
  const command = argv[0];
  if (!['inspect', 'apply'].includes(command)) throw new Error('COMMAND_UNSUPPORTED');
  const values = {};
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error('ARGUMENT_INVALID');
    const name = key.slice(2);
    if (!['packet', 'format'].includes(name)) throw new Error('ARGUMENT_UNSUPPORTED:' + name);
    if (values[name] !== undefined) throw new Error('ARGUMENT_DUPLICATE:' + name);
    values[name] = value;
  }
  if (!PACKET_REF_RE.test(values.packet || '')) throw new Error('PACKET_REF_INVALID');
  if (!['agent-view', 'json'].includes(values.format)) throw new Error('FORMAT_UNSUPPORTED');
  return {command, packetRef: values.packet, format: values.format};
}
function render(result, format) {
  if (format === 'json') return result;
  return {
    schemaVersion: 1,
    mode: 'MCL_VALIDATION_FINALIZATION_APPLY_VIEW',
    validity: result.validity,
    packetRef: result.packetRef,
    operation: result.operation || null,
    status: result.status,
    finalizationDisposition: result.finalizationDisposition
      || result.post?.finalizationDisposition
      || result.pre?.finalizationDisposition
      || null,
    result: result.result || result.post?.result || result.pre?.result || result.status,
    requiredEffectClasses: result.requiredEffectClasses
      || result.post?.requiredEffectClasses
      || result.pre?.requiredEffectClasses
      || [],
    effects: result.effects || {
      holderCleaned: 0,
      d014Published: 0,
      stageReceiptPublished: 0,
    },
    nextLegalAction: result.nextLegalAction
      || result.post?.nextLegalAction
      || result.pre?.nextLegalAction
      || 'TARGETED_DRILLDOWN_REQUIRED',
    reasonCodes: result.reasonCodes || [],
    selfOwnerMode: result.selfOwnerMode || null,
    authority: {...FALSE_AUTHORITY},
  };
}
function errorResult(error, packetRef = TARGET.packetRef) {
  if (error instanceof ApplyError) {
    return output(error.kind, {
      operation: null,
      finalizationDisposition: null,
      result: error.kind,
      requiredEffectClasses: [],
      effects: {
        holderCleaned: 0,
        d014Published: 0,
        stageReceiptPublished: 0,
      },
      nextLegalAction: error.kind === 'CONFLICT'
        ? 'SEMANTIC_REVIEW_REQUIRED'
        : 'TARGETED_DRILLDOWN_REQUIRED',
    }, error.reasonCodes, packetRef);
  }
  return output('UNKNOWN', {
    operation: null,
    finalizationDisposition: null,
    result: 'UNKNOWN',
    requiredEffectClasses: [],
    effects: {
      holderCleaned: 0,
      d014Published: 0,
      stageReceiptPublished: 0,
    },
    nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
  }, ['RUNTIME_ERROR'], packetRef);
}
function runCli(argv = process.argv.slice(2), deps = {}) {
  let args;
  let result;
  try {
    args = parseArgs(argv);
    result = args.command === 'inspect'
      ? inspectPacket(args.packetRef, deps)
      : applyPacket(args.packetRef, deps);
  } catch (error) {
    result = errorResult(error, args?.packetRef || TARGET.packetRef);
    args = args || {format: 'json'};
  }
  const rendered = render(result, args.format || 'json');
  const code = result.status === 'PASS' ? 0
    : result.status === 'CONFLICT' ? 3 : 2;
  return {code, text: JSON.stringify(rendered, null, 2) + '\n', result};
}

if (require.main === module) {
  const out = runCli();
  process.stdout.write(out.text);
  process.exitCode = out.code;
}

module.exports = {
  ApplyError,
  EXPECTED_EFFECTS,
  EXPECTED_EFFECTS_2786,
  FALSE_AUTHORITY,
  PROFILES,
  SELF_OWNER_PATHS,
  SELF_OWNER_REQUIRED_GATES,
  SELF_OWNER_CURRENTIZED_REQUIRED_GATES,
  SELF_OWNER_SCOPES,
  TARGET,
  TARGET_2786,
  TARGET_2791,
  TARGET_3216,
  TARGET_3043,
  TARGET_3051,
  TARGET_3092,
  TARGET_3099,
  TARGET_3110,
  TARGET_3118,
  TARGET_3126,
  TARGET_3144,
  TARGET_3108,
  apply2463Packet,
  apply2786Packet,
  applySelfOwnerPacket,
  applyPacket,
  build2786ValidationStageText,
  buildCompletionText,
  buildValidationStageText,
  completionState,
  coordinationGatesProven,
  create2786LiveContext,
  createSelfOwnerLiveContext,
  createLiveContext,
  decisionSummary,
  effectPair2786Exact,
  effectPairExact,
  errorResult,
  inspectorEvidence,
  inspectorEvidence2786,
  inspect2463Packet,
  inspect2786Packet,
  inspectSelfOwnerPacket,
  inspectPacket,
  parseArgs,
  pathScopeDigest,
  postExactComment,
  read2786LedgerState,
  read2786MutableState,
  read2786Workspace,
  readMutableState,
  readReleaseEvidence,
  render,
  runCli,
  select2786ImplementationReceipt,
  select2786WorkspaceManifest,
  selfOwnerImplementationIdentities,
  selectSelfOwnerImplementationReceipt,
  selectSelfOwnerWorkspaceManifest,
  selectImplementationReceipt,
  selectTargetManifest,
  selectValidationStageReceiptSet,
  stageReceiptAuthorityInput,
  stageReceiptsFromComments,
  validationStageState,
  validationStageState2786,
};
