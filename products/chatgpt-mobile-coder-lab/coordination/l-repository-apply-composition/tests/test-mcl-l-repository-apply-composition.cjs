'use strict';
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const ROOT = path.resolve(__dirname, '../../../../..');
const owner = require('../mcl-l-repository-apply-composition.cjs');
const handoff = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const lease = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const holder = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const lOwner = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/mcl-l-repository-owner.cjs'));
const finalizeRecovery = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/coordination/repository-implementation/mcl-repository-implementation-finalize-recovery.cjs'));
const PACKET_REF = '#3525';
const PACKET_BODY='p';
const LEASE_ID = 'a'.repeat(64);
const BASE = 'b'.repeat(40);
const HEAD = 'c'.repeat(40);
const CLAIM = 'd'.repeat(64);
const TITLE='x';
const PR_BODY='Refs #3525';
const FIXTURES=[];
test.afterEach(()=>{while(FIXTURES.length)fs.rmSync(FIXTURES.pop(),{recursive:true,force:true});});
const B='products/chatgpt-mobile-coder-lab/coordination/l-repository-apply-composition/';
const PATHS=[B+'README.md',B+'mcl-l-repository-apply-composition.cjs',B+'tests/test-mcl-l-repository-apply-composition.cjs'];
function manifest(overrides = {}) {
return handoff.buildManifest({
schemaVersion: 1,
mode: 'MCL_TASK_MANIFEST',
packetRef: PACKET_REF,
packetBodySha256: lease.digest(PACKET_BODY),
phaseId: '3525-implementation-pr',
phaseClass: 'REPOSITORY_MUTATION',
route: 'L',
executor: 'L',
scopes: [...PATHS.map((item) => 'path:' + item), 'surface:mcl:l-repository-local-holder-apply'],
workspace: {
kind: 'repository',
branch:'laptop/x',
worktree:'/home/alsl0/nyang-worktrees/x',
},
observedBaseSha: BASE,
leaseRequirement: 'REQUIRED',
leaseEvidence: {
ledgerRef: '#2352',
leaseId: LEASE_ID,
acquiredGeneration: 10,
acquireEvidenceRef: 'run:101',
},
sourceAuthorityRefs: ['#3525', 'issue:#2352'],
inputRefs: ['commit:' + BASE, 'issue:#3524'],
expectedOutputRefs: PATHS.map((item) => 'path:' + item),
acceptanceRefs: ['#3525', 'issue:#3524'],
stopCondition: 'fixture',
authority: {...owner.FALSE_AUTHORITY},
...overrides,
});
}
function fixtureFiles({manifestValue = manifest(), prBody = PR_BODY} = {}) {
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mcl3525-test-'));FIXTURES.push(dir);
const manifestFile = path.join(dir, 'manifest.md');
const requestFile = path.join(dir, 'request.json');
const patchFile = path.join(dir, 'patch.diff');
const prRequestFile = path.join(dir, 'pr.json');
fs.writeFileSync(manifestFile, handoff.renderManifest(manifestValue));
const patch = Buffer.from('fixture-patch\n');
fs.writeFileSync(patchFile, patch);
fs.writeFileSync(requestFile, JSON.stringify({
schema: 'mcl-l-repository-owner-request.v1',
packet_ref: PACKET_REF,
message: TITLE,
expected_paths: PATHS,
patch_sha256: require('node:crypto').createHash('sha256').update(patch).digest('hex'),
}));
fs.writeFileSync(prRequestFile, JSON.stringify({
schema: 'mcl-l-pr-publication-request.v1',
title: TITLE,
body: prBody,
}));
return {
dir,
args: {
packetRef: PACKET_REF,
packetNumber: 3525,
manifestFile,
requestFile,
patchFile,
prRequestFile,
},
manifestText: fs.readFileSync(manifestFile, 'utf8'),
};
}
function baseDeps(files,overrides={}){
const events=[],comments=[{id:1,body:files.manifestText}];let activation=null;
const deps={
readCurrent(){events.push('read-current');return {issue:{state:'open',body:PACKET_BODY},ledger:{body:events.includes('release-lease')?'released-ledger':'active-ledger'}};},
readComments(){events.push('read-comments');return comments.map((x)=>({...x}));},
postComment(_p,body){events.push('post-completion');const id=100+comments.length;comments.push({id,body});return id;},
validateEvidence(input){events.push(input.requireActiveLease?'validate-active':'validate-released');return {ok:true,reasonCodes:[],state:{generation:input.requireActiveLease?10:12}};},
ownerRunCli(argv,env){if(argv[0]==='inspect'){events.push('owner-inspect');return inspectPass();}events.push('owner-apply');assert.equal(env[holder.CLAIM_ENV],CLAIM);return {code:0,text:JSON.stringify({status:'PASS',reason_codes:[],new_head:HEAD,pr_number:4001,next_legal_action:'RELEASE_D013_THEN_RELEASE_HOLDER_THEN_D014_COMPLETE'})+'\n'};},
claimHolder(){events.push('holder-claim');return {result:{status:'CLAIMED',reasonCodes:[]},secret:CLAIM};},
checkHolder(_f,claim){events.push('holder-check');assert.equal(claim,CLAIM);return {status:'CHECK_PASS',reasonCodes:[]};},
releaseLease(){events.push('release-lease');return {ok:true,value:{evidenceRef:'run:202',observedGeneration:11}};},
releaseHolder(_f,claim){events.push('holder-release');assert.equal(claim,CLAIM);return {status:'RELEASED',reasonCodes:[]};},
reviewUpdateInspect(){events.push('review-update-inspect');return {state:'READY'};},
writeActivation(_m,value){events.push('write-activation');activation=structuredClone(value);return structuredClone(activation);},
readActivation(){events.push('read-activation');if(!activation)throw new owner.CompositionError('BLOCKED',['ACTIVATION_MISSING']);return structuredClone(activation);},
removeActivation(){events.push('remove-activation');activation=null;},
readPublished(){events.push('read-published');return {ok:true,commit:HEAD,prNumber:4001};},
tempRoot:files.dir,...overrides};
return {deps,events,comments,getActivation:()=>activation&&structuredClone(activation),setActivation:(value)=>{activation=value&&structuredClone(value);}};
}
function inspectPass(workspace='PREPARED',holderState='ABSENT'){
return {code:0,text:JSON.stringify({status:'PASS',reason_codes:[],workspace_state:workspace,holder_state:holderState})+'\n'};
}
function apply(files,state){return owner.executeComposition(files.args,state.deps);}
function finalize(files,state){return owner.executeFinalize({operation:'finalize',packetRef:PACKET_REF,packetNumber:3525,manifestFile:files.args.manifestFile},state.deps);}
function no(state,...events){for(const event of events)assert.ok(!state.events.includes(event),event);}
test('t01', () => {
assert.throws(
() => owner.parseArgs([
'apply', '--packet', '#3525', '--manifest', 'm', '--request', 'r',
'--patch', 'p', '--pr-request', 'pr', '--holder-claim', 'x', '--apply',
]),
(error) => error.reasonCodes.includes('ARGUMENT_UNSUPPORTED_OR_DUPLICATE:holder-claim')
);
assert.throws(
() => owner.parseArgs([
'apply', '--packet', '#3525', '--manifest', 'm', '--request', 'r',
'--patch', 'p', '--pr-request', 'pr',
]),
(error) => error.reasonCodes.includes('APPLY_FLAG_REQUIRED')
);
const finalize = owner.parseArgs([
'finalize', '--packet', '#3525', '--manifest', 'm', '--apply',
]);
assert.equal(finalize.operation, 'finalize');
assert.equal(finalize.requestFile, null);
});
test('t02', () => {
const files = fixtureFiles({manifestValue: manifest({
route: 'S',
executor: 'S',
workspace: {kind: 'repository', branch: 'server/test', worktree: '/root/nyang-worktrees/test'},
})});
assert.throws(
() => owner.executeComposition(files.args, baseDeps(files).deps),
(error) => error.reasonCodes.includes('MANIFEST_ROUTE_EXECUTOR_INVALID')
);
});
test('t03', () => {
const files = fixtureFiles();
const state = baseDeps(files, {readComments: () => []});
assert.throws(
() => apply(files,state),
(error) => error.reasonCodes.includes('MANIFEST_COMMENT_MISSING')
);
no(state,'holder-claim');
});
test('t04', () => {
const files = fixtureFiles({prBody: 'prefix Refs #3525 suffix'});
const state = baseDeps(files);
assert.throws(
() => apply(files,state),
(error) => error.reasonCodes.includes('NON_CLOSING_REF_REQUIRED')
);
no(state,'holder-claim');
});
test('t05', () => {
const files = fixtureFiles();
let reads = 0;
const state = baseDeps(files, {
readCurrent() {
state.events.push('read-current');
reads += 1;
return {
issue: {state: 'open', body: reads === 2 ? PACKET_BODY + '\nchanged' : PACKET_BODY},
ledger: {body: 'active-ledger'},
};
},
validateEvidence(input) {
state.events.push(input.requireActiveLease ? 'validate-active' : 'validate-released');
if (input.requireActiveLease && input.packetBody !== PACKET_BODY) {
return {ok: false, reasonCodes: ['PACKET_BODY_HASH_DRIFT'], state: null};
}
return {ok: true, reasonCodes: [], state: {generation: 10}};
},
});
assert.throws(
() => apply(files,state),
(error) => error.reasonCodes.includes('PACKET_BODY_HASH_DRIFT')
);
no(state,'holder-claim');
no(state,'owner-apply');
});
test('t06', () => {
const files = fixtureFiles();
let reads = 0;
const state = baseDeps(files, {
readCurrent() {
state.events.push('read-current');
reads += 1;
return {
issue: {state: 'open', body: PACKET_BODY},
ledger: {body: reads === 3 ? 'revoked-ledger' : 'active-ledger'},
};
},
validateEvidence(input) {
state.events.push(input.requireActiveLease ? 'validate-active' : 'validate-released');
if (input.requireActiveLease && input.ledgerBody !== 'active-ledger') {
return {ok: false, reasonCodes: ['LEASE_NOT_ACTIVE'], state: null};
}
return {ok: true, reasonCodes: [], state: {generation: 10}};
},
});
assert.throws(
() => apply(files,state),
(error) => error.reasonCodes.includes('LEASE_NOT_ACTIVE')
);
assert.ok(state.events.includes('holder-claim'));
no(state,'owner-apply');
no(state,'release-lease');
});
test('t07', () => {
const files = fixtureFiles();
const state = baseDeps(files, {
ownerRunCli(argv) {
if (argv[0] === 'inspect') {
state.events.push('owner-inspect');
return inspectPass('ABSENT','NOT_APPLICABLE');
}
throw new Error('unexpected apply');
},
});
assert.throws(
() => apply(files,state),
(error) => error.reasonCodes.includes('WORKSPACE_NOT_PREPARED')
);
no(state,'holder-claim');
});
test('t08', () => {
const files = fixtureFiles();
const state = baseDeps(files);
const out = apply(files,state);
assert.equal(out.status, 'PASS');
assert.equal(out.commit, HEAD);
assert.equal(out.prNumber, 4001);
assert.equal(out.nextLegalAction, 'VALIDATION_MERGE');
assert.deepEqual(out.authority, owner.FALSE_AUTHORITY);
assert.equal(JSON.stringify(out).includes(CLAIM), false);
const receiptRow = state.comments.find((row) => row.id === out.completionCommentId);
const receiptParsed = handoff.parseCompletionReceipt(receiptRow.body);
assert.equal(receiptParsed.status, 'VALID');
assert.equal(receiptParsed.value.leaseReleaseEvidence.releasedGeneration, 11);
const sequence = [
'owner-inspect',
'holder-claim',
'holder-check',
'owner-apply',
'write-activation',
'release-lease',
'validate-released',
'holder-release',
'read-published',
'post-completion',
];
let cursor = -1;
for (const item of sequence) {
const next = state.events.indexOf(item);
assert.ok(next > cursor, item + ' order');
cursor = next;
}
});
test('t09', () => {
const files = fixtureFiles();
const state = baseDeps(files, {
ownerRunCli(argv, env) {
if (argv[0] === 'inspect') {
state.events.push('owner-inspect');
return inspectPass();
}
state.events.push('owner-apply');
assert.equal(env[holder.CLAIM_ENV], CLAIM);
return {code: 2, text: JSON.stringify({
status: 'BLOCKED', reason_codes: ['SOURCE_VALIDATION_BLOCKED'],
}) + '\n'};
},
});
const out = apply(files,state);
assert.equal(out.status, 'BLOCKED');
no(state,'release-lease');
no(state,'holder-release');
no(state,'post-completion');
});
test('t10', () => {
const files = fixtureFiles();
let checks = 0;
const state = baseDeps(files, {
checkHolder(_files, claim) {
state.events.push('holder-check');
assert.equal(claim, CLAIM);
checks += 1;
return checks >= 2
? {status: 'BLOCKED', reasonCodes: ['HOLDER_CHANGED_BEFORE_RELEASE']}
: {status: 'CHECK_PASS', reasonCodes: []};
},
});
assert.throws(
() => apply(files,state),
(error) => error.reasonCodes.includes('HOLDER_CHANGED_BEFORE_RELEASE')
);
no(state,'release-lease');
no(state,'holder-release');
});
test('t11', () => {
const files = fixtureFiles();
const state = baseDeps(files, {
releaseLease() {
state.events.push('release-lease');
return {ok: false, value: {}};
},
});
assert.throws(
() => apply(files,state),
(error) => error.reasonCodes.includes('D013_RELEASE_NOT_PROVEN')
);
no(state,'holder-release');
no(state,'post-completion');
});
test('t12', () => {
const files = fixtureFiles();
const state = baseDeps(files, {
validateEvidence(input) {
state.events.push(input.requireActiveLease ? 'validate-active' : 'validate-released');
return input.requireActiveLease
? {ok: true, reasonCodes: [], state: {generation: 10}}
: {ok: true, reasonCodes: [], state: {generation: 10}};
},
});
assert.throws(
() => apply(files,state),
(error) => error.reasonCodes.includes('D013_RELEASE_READBACK_STALE')
);
no(state,'holder-release');
no(state,'post-completion');
});
test('t13', () => {
const files = fixtureFiles();
const state = baseDeps(files, {
releaseHolder() {
state.events.push('holder-release');
return {status: 'BLOCKED', reasonCodes: ['HOLDER_REMOVE_FAILED']};
},
});
assert.throws(
() => apply(files,state),
(error) => error.reasonCodes.includes('HOLDER_REMOVE_FAILED')
);
no(state,'post-completion');
});
test('t14', () => {
const files = fixtureFiles();
const state = baseDeps(files, {
claimHolder() {
state.events.push('holder-claim');
fs.writeFileSync(files.args.prRequestFile, JSON.stringify({
schema: 'mcl-l-pr-publication-request.v1',
title: 'changed after preflight',
body: 'Fixes #3525',
}));
fs.writeFileSync(files.args.requestFile, JSON.stringify({
schema: 'mcl-l-repository-owner-request.v1',
packet_ref: PACKET_REF,
message: 'changed after preflight',
expected_paths: PATHS,
patch_sha256: '0'.repeat(64),
}));
return {result: {status: 'CLAIMED', reasonCodes: []}, secret: CLAIM};
},
ownerRunCli(argv, env) {
if (argv[0] === 'inspect') {
state.events.push('owner-inspect');
return inspectPass();
}
state.events.push('owner-apply');
assert.equal(env[holder.CLAIM_ENV], CLAIM);
const requestPath = argv[argv.indexOf('--request') + 1];
const patchPath = argv[argv.indexOf('--patch') + 1];
const prPath = argv[argv.indexOf('--pr-request') + 1];
assert.notEqual(requestPath, files.args.requestFile);
assert.notEqual(patchPath, files.args.patchFile);
assert.notEqual(prPath, files.args.prRequestFile);
const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
const pr = JSON.parse(fs.readFileSync(prPath, 'utf8'));
assert.equal(request.message, TITLE);
assert.equal(pr.title, TITLE);
assert.equal(pr.body, PR_BODY);
assert.equal(fs.readFileSync(patchPath, 'utf8'), 'fixture-patch\n');
return {code: 0, text: JSON.stringify({
status: 'PASS', reason_codes: [], new_head: HEAD, pr_number: 4001,
}) + '\n'};
},
});
const out = apply(files,state);
assert.equal(out.status, 'PASS');
});
test('t15', () => {
const files = fixtureFiles();
const state = baseDeps(files, {
ownerRunCli(argv) {
if (argv[0] === 'inspect') {
state.events.push('owner-inspect');
return inspectPass();
}
state.events.push('owner-apply');
throw new lOwner.OwnerError('BLOCKED', ['PATCH_DOES_NOT_APPLY']);
},
});
const out = apply(files,state);
assert.equal(out.status, 'BLOCKED');
assert.deepEqual(out.reasonCodes, ['PATCH_DOES_NOT_APPLY']);
no(state,'release-lease');
no(state,'holder-release');
});
test('t16', () => {
const files = fixtureFiles();
const state = baseDeps(files, {
ownerRunCli(argv) {
if (argv[0] === 'inspect') {
state.events.push('owner-inspect');
throw new lOwner.OwnerError('CONFLICT', ['WORKSPACE_STATE_CONFLICT']);
}
throw new Error('unexpected apply');
},
});
assert.throws(
() => apply(files,state),
(error) => error.kind === 'CONFLICT'
&& error.reasonCodes.includes('WORKSPACE_STATE_CONFLICT')
);
no(state,'holder-claim');
});
test('t17', () => {
const files = fixtureFiles();
const state = baseDeps(files);
const m = manifest();
state.setActivation(owner.buildActivation({
manifest: m,
manifestCommentId: 1,
owner: {new_head: HEAD, pr_number: 4001},
prRequest: {
title: TITLE,
body: PR_BODY,
},
releaseGeneration: 11,
releaseEvidenceRef: 'run:202',
}));
state.deps.readCurrent = () => {
state.events.push('read-current');
return {
issue: {state: 'open', body: PACKET_BODY},
ledger: {body: 'released-ledger'},
};
};
state.deps.validateEvidence = (input) => {
state.events.push(input.requireActiveLease ? 'validate-active' : 'validate-released');
return {
ok: !input.requireActiveLease,
reasonCodes: input.requireActiveLease ? ['LEASE_NOT_ACTIVE'] : [],
state: {generation: 12},
};
};
const out = finalize(files,state);
assert.equal(out.status, 'PASS');
assert.equal(out.commit, HEAD);
assert.equal(out.prNumber, 4001);
no(state,'holder-claim');
no(state,'owner-apply');
no(state,'release-lease');
no(state,'holder-release');
assert.ok(state.events.includes('read-published'));
assert.ok(state.events.includes('post-completion'));
no(state,'remove-activation');
assert.ok(state.getActivation());
});
test('t18', () => {
const files = fixtureFiles();
const state = baseDeps(files);
const m = manifest();
state.setActivation(owner.buildActivation({
manifest: m,
manifestCommentId: 1,
owner: {new_head: HEAD, pr_number: 4001},
prRequest: {
title: TITLE,
body: PR_BODY,
},
}));
const ledgerBody = lease.renderLedger({
schemaVersion: 1,
scope: 'chatgpt-mobile-coder-lab',
mode: 'MCL_TASK_LEASE_LEDGER',
status: 'ACTIVE',
generation: 12,
controllerPath: lease.CONTROLLER_PATH,
controllerCommit: 'e'.repeat(40),
packetRef: lease.OWNER_PACKET_REF,
activeLeases: [],
lastRelease: {leaseId: LEASE_ID, releasedAtGeneration: 11},
});
state.deps.readCurrent = () => {
state.events.push('read-current');
return {
issue: {state: 'open', body: PACKET_BODY},
ledger: {body: ledgerBody},
};
};
state.deps.validateEvidence = (input) => {
state.events.push(input.requireActiveLease ? 'validate-active' : 'validate-released');
return {
ok: !input.requireActiveLease,
reasonCodes: input.requireActiveLease ? ['LEASE_NOT_ACTIVE'] : [],
state: {generation: 12},
};
};
const out = finalize(files,state);
assert.equal(out.status, 'PASS');
assert.equal(out.releaseEvidenceRef, 'issue:#2352');
assert.ok(state.events.includes('write-activation'));
assert.equal(state.getActivation().releaseGeneration, 11);
});
test('t19', () => {
const files=fixtureFiles();
const state=baseDeps(files);
const m=manifest();
state.setActivation(owner.buildActivation({
manifest:m,manifestCommentId:1,
owner:{new_head:HEAD,pr_number:4001},
prRequest:{title:TITLE,body:PR_BODY},
}));
const ledgerBody=lease.renderLedger({
schemaVersion:1,scope:'chatgpt-mobile-coder-lab',mode:'MCL_TASK_LEASE_LEDGER',
status:'ACTIVE',generation:12,controllerPath:lease.CONTROLLER_PATH,
controllerCommit:'e'.repeat(40),packetRef:lease.OWNER_PACKET_REF,
activeLeases:[],lastRelease:null,
});
state.deps.readCurrent=()=>({
issue:{state:'open',body:PACKET_BODY},ledger:{body:ledgerBody},
});
state.deps.validateEvidence=(input)=>({
ok:!input.requireActiveLease,
reasonCodes:input.requireActiveLease?['LEASE_NOT_ACTIVE']:[],
state:{generation:12},
});
state.deps.readPrCreatedAt=(prNumber)=>{
assert.equal(prNumber,4001);
return '2026-10-11T00:00:00Z';
};
state.deps.historicalReleaseEvidence=(leaseId,acquiredGeneration,createdAfter,effectBase)=>{
assert.equal(leaseId,LEASE_ID);
assert.equal(acquiredGeneration,10);
assert.equal(createdAfter,'2026-10-11T00:00:00Z');
assert.equal(effectBase,BASE);
throw new finalizeRecovery.RecoveryError('CONFLICT',['D013_RELEASE_PROOF_AMBIGUOUS']);
};
assert.throws(
()=>owner.executeFinalize({
operation:'finalize',packetRef:PACKET_REF,packetNumber:3525,
manifestFile:files.args.manifestFile,
},state.deps),
(error)=>error.kind==='CONFLICT'
&&error.reasonCodes.includes('D013_RELEASE_PROOF_AMBIGUOUS')
);
});
test('t20', () => {
const files = fixtureFiles();
const state = baseDeps(files);
let reads = 0;
state.deps.readComments = () => {
reads += 1;
const manifestId = reads <= 3 ? reads : 3;
return [
{id: manifestId, body: files.manifestText},
...state.comments.filter((row) => row.body !== files.manifestText),
];
};
state.deps.postComment = (_packet, body) => {
state.events.push('post-completion');
const id = 999;
state.comments.push({id, body});
return id;
};
const out = apply(files,state);
assert.equal(out.status, 'PASS');
assert.equal(out.manifestCommentId, 3);
assert.equal(state.events.filter((item) => item === 'write-activation').length, 2);
});
test('t21', () => {
const files = fixtureFiles();
const state = baseDeps(files);
let posted = false;
state.deps.postComment = (_packet, body) => {
posted = true;
const id = 777;
state.comments.push({id, body});
return id;
};
const first = apply(files,state);
assert.equal(first.status, 'PASS');
assert.equal(posted, true);
const receiptText = state.comments.find((row) => row.id === first.completionCommentId).body;
const before = owner.exactCommentState(state.comments, receiptText);
assert.equal(before.count, 1);
});
test('t22', () => {
const files = fixtureFiles();
const state = baseDeps(files);
state.deps.postComment = (_packet, body) => {
state.events.push('post-completion');
const id = 888;
state.comments.push({id, body});
throw new Error('simulated lost acknowledgement');
};
const out = apply(files,state);
assert.equal(out.status, 'PASS');
assert.equal(out.completionCommentId, 888);
const matches = state.comments.filter((row) => row.id === 888);
assert.equal(matches.length, 1);
});
test('t23', () => {
const files = fixtureFiles();
const state = baseDeps(files);
const m = manifest();
state.setActivation(owner.buildActivation({
manifest: m,
manifestCommentId: 1,
owner: {new_head: HEAD, pr_number: 4001},
prRequest: {
title: TITLE,
body: PR_BODY,
},
releaseGeneration: 11,
releaseEvidenceRef: 'run:202',
}));
state.deps.readComments = () => [{id: 2, body: files.manifestText}];
assert.throws(
() => finalize(files,state),
(error) => error.reasonCodes.includes('FINALIZE_MANIFEST_COMMENT_CONFLICT')
);
no(state,'post-completion');
});
test('t24', () => {
const files = fixtureFiles();
const state = baseDeps(files);
state.deps.postComment = (_packet, body) => {
state.events.push('post-completion');
state.comments.push({id: 700, body}, {id: 701, body});
return 701;
};
const out = apply(files,state);
assert.equal(out.status, 'PASS');
assert.equal(out.completionCommentId, 700);
assert.equal(state.comments.filter((row) =>
typeof row.body === 'string' && row.body.includes('mcl-task-completion-receipt')).length, 2);
});
test('t25', () => {
const files = fixtureFiles();
const state = baseDeps(files);
const first = apply(files,state);
assert.equal(first.status, 'PASS');
assert.ok(state.getActivation());
state.events.length = 0;
state.deps.readPublished = () => {
state.events.push('read-published');
throw new Error('must not be needed for terminal replay');
};
const replay = finalize(files,state);
assert.equal(replay.status, 'PASS');
assert.equal(replay.completionReceiptId, first.completionReceiptId);
assert.equal(replay.completionCommentId, first.completionCommentId);
no(state,'read-published');
assert.ok(state.getActivation());
});
test('t27', () => {
const m=manifest();
const activation=owner.buildActivation({
manifest:m,manifestCommentId:1,
owner:{new_head:HEAD,pr_number:4001},
prRequest:{title:TITLE,body:'x'.repeat(20000)},
});
assert.throws(
()=>owner.defaultWriteActivation(m,activation),
(error)=>error.reasonCodes.includes('ACTIVATION_TOO_LARGE')
);
});
test('t28', () => {
const files=fixtureFiles();
let revoked=false;
const state=baseDeps(files,{
readCurrent(){
state.events.push('read-current');
return {
issue:{state:'open',body:PACKET_BODY},
ledger:{body:revoked?'revoked-ledger':'active-ledger'},
};
},
validateEvidence(input){
state.events.push(input.requireActiveLease?'validate-active':'validate-released');
if(input.requireActiveLease&&input.ledgerBody==='revoked-ledger'){
return {ok:false,reasonCodes:['LEASE_NOT_ACTIVE'],state:null};
}
return {ok:true,reasonCodes:[],state:{generation:10}};
},
ownerRunCli(argv,env,options){
if(argv[0]==='inspect'){
state.events.push('owner-inspect');
return {code:0,text:JSON.stringify({
status:'PASS',reason_codes:[],workspace_state:'PREPARED',holder_state:'ABSENT',
})+'\n'};
}
state.events.push('owner-apply');
assert.equal(env[holder.CLAIM_ENV],CLAIM);
options.runner('git',['-C','fixture','apply','--index','patch'],{});
revoked=true;
options.runner('git',['-C','fixture','commit','-m','fixture'],{});
throw new Error('unreachable');
},
});
const original=childProcess.spawnSync;
childProcess.spawnSync=(command,args)=> {
state.events.push('spawn:'+command+':'+args.join(' '));
return {status:0,stdout:'',stderr:'',signal:null,error:null};
};
try {
const out=owner.executeComposition(files.args,state.deps);
assert.equal(out.status,'BLOCKED');
assert.ok(out.reasonCodes.includes('COORDINATION_EVIDENCE_INVALID'));
assert.ok(out.reasonCodes.includes('LEASE_NOT_ACTIVE'));
assert.ok(!state.events.some((item)=>item.includes(':commit ')));
no(state,'release-lease');
no(state,'post-completion');
} finally {
childProcess.spawnSync=original;
}
});
test('t29 review-update parser is fixed and rejects mixed request surfaces', () => {
const parsed=owner.parseArgs([
'review-update','--packet','#3525','--manifest','m',
'--review-update-request','r','--patch','p','--pr-request','pr','--apply',
]);
assert.equal(parsed.operation,'review-update');
assert.equal(parsed.requestFile,'r');
assert.throws(
()=>owner.parseArgs([
'review-update','--packet','#3525','--manifest','m',
'--review-update-request','r','--request','ordinary',
'--patch','p','--pr-request','pr','--apply',
]),
(error)=>error.reasonCodes.includes('ARGUMENT_UNSUPPORTED_OR_DUPLICATE:request')
);
const patch=Buffer.from('review-patch\n');
const request=owner.parseReviewUpdateRequestStructure(JSON.stringify({
schema:'mcl-l-review-update-request.v1',
packet_ref:PACKET_REF,
message:'fix: review fixture',
expected_old_head:BASE,
expected_paths:PATHS,
patch_sha256:require('node:crypto').createHash('sha256').update(patch).digest('hex'),
}));
assert.equal(request.expected_old_head,BASE);
assert.deepEqual(request.expected_paths,[...PATHS].sort());
assert.throws(
()=>owner.parseReviewUpdateRequestStructure(JSON.stringify({
...request,extra:true,
})),
(error)=>error.reasonCodes.includes('REVIEW_UPDATE_REQUEST_FIELDS_INVALID')
);
});

test('t30 review-update keeps holder process-local and completes with operation evidence', () => {
const files=fixtureFiles();
const patch=fs.readFileSync(files.args.patchFile);
fs.writeFileSync(files.args.requestFile,JSON.stringify({
schema:'mcl-l-review-update-request.v1',
packet_ref:PACKET_REF,
message:TITLE,
expected_old_head:BASE,
expected_paths:PATHS,
patch_sha256:require('node:crypto').createHash('sha256').update(patch).digest('hex'),
}));
files.args.operation='review-update';
const state=baseDeps(files,{
ownerRunCli(argv,env){
if(argv[0]==='inspect'){
state.events.push('owner-inspect');
return inspectPass();
}
state.events.push('owner-review-update');
assert.equal(argv[0],'review-update');
assert.ok(argv.includes('--review-update-request'));
assert.equal(argv.includes('--request'),false);
assert.equal(env[holder.CLAIM_ENV],CLAIM);
return {code:0,text:JSON.stringify({
status:'PASS',reason_codes:[],new_head:HEAD,pr_number:4001,
next_legal_action:'RELEASE_D013_THEN_RELEASE_HOLDER_THEN_D014_COMPLETE',
})+'\n'};
},
});
const out=owner.executeComposition(files.args,state.deps);
assert.equal(out.status,'PASS');
assert.equal(JSON.stringify(out).includes(CLAIM),false);
assert.equal(state.getActivation().effectOperation,'review-update');
assert.ok(state.events.includes('owner-review-update'));
assert.ok(state.events.includes('release-lease'));
assert.ok(state.events.includes('holder-release'));
const row=state.comments.find((x)=>x.id===out.completionCommentId);
const receipt=handoff.parseCompletionReceipt(row.body);
assert.equal(receipt.status,'VALID');
assert.ok(receipt.value.validationRefs.includes(
'receipt:mcl-l-repository-owner:review-update:'+files.manifestText.match(/"manifestId": "([0-9a-f]{64})"/)[1]));
});

test('t31 legacy activation without effect operation remains apply-compatible', () => {
const files=fixtureFiles();
const state=baseDeps(files);
const m=manifest();
const current=owner.buildActivation({
manifest:m,manifestCommentId:1,
owner:{new_head:HEAD,pr_number:4001},
prRequest:{title:TITLE,body:PR_BODY},
releaseGeneration:11,
releaseEvidenceRef:'run:202',
});
const core={...current};
delete core.effectOperation;
delete core.recordDigest;
const legacy={...core,recordDigest:require('node:crypto').createHash('sha256')
.update(JSON.stringify(handoff.stable(core))).digest('hex')};
assert.equal(owner.activationEffectOperation(owner.normalizeActivation(legacy,m)),'apply');
state.setActivation(legacy);
state.deps.readCurrent=()=>({
issue:{state:'open',body:PACKET_BODY},
ledger:{body:'released-ledger'},
});
state.deps.validateEvidence=(input)=>({
ok:!input.requireActiveLease,
reasonCodes:input.requireActiveLease?['LEASE_NOT_ACTIVE']:[],
state:{generation:12},
});
const out=finalize(files,state);
assert.equal(out.status,'PASS');
const row=state.comments.find((x)=>x.id===out.completionCommentId);
const receipt=handoff.parseCompletionReceipt(row.body);
assert.equal(receipt.status,'VALID');
assert.ok(receipt.value.validationRefs.includes(
'receipt:mcl-l-repository-owner:apply:'+m.manifestId));
});

test('t32 unknown activation operation and unsupported owner review-update fail closed', () => {
const m=manifest();
const bad=owner.buildActivation({
manifest:m,manifestCommentId:1,
owner:{new_head:HEAD,pr_number:4001},
prRequest:{title:TITLE,body:PR_BODY},
});
bad.effectOperation='generic-owner';
assert.throws(
()=>owner.normalizeActivation(bad,m),
(error)=>error.reasonCodes.includes('ACTIVATION_EFFECT_OPERATION_INVALID')
);
const files=fixtureFiles();
const patch=fs.readFileSync(files.args.patchFile);
fs.writeFileSync(files.args.requestFile,JSON.stringify({
schema:'mcl-l-review-update-request.v1',
packet_ref:PACKET_REF,
message:TITLE,
expected_old_head:BASE,
expected_paths:PATHS,
patch_sha256:require('node:crypto').createHash('sha256').update(patch).digest('hex'),
}));
files.args.operation='review-update';
const state=baseDeps(files,{
ownerRunCli(argv){
if(argv[0]==='inspect'){
state.events.push('owner-inspect');
return inspectPass();
}
state.events.push('owner-review-update');
return {code:3,text:JSON.stringify({
status:'UNKNOWN',reason_codes:['OPERATION_UNSUPPORTED'],
next_legal_action:'TARGETED_RECOVERY_REQUIRED',
})+'\n'};
},
});
const out=owner.executeComposition(files.args,state.deps);
assert.equal(out.status,'UNKNOWN');
assert.ok(out.reasonCodes.includes('OPERATION_UNSUPPORTED'));
no(state,'release-lease','holder-release','post-completion');
});

test('t33 review-update mutation boundary includes currentization merge', () => {
const source=fs.readFileSync(path.join(__dirname,'../mcl-l-repository-apply-composition.cjs'),'utf8');
assert.ok(source.includes("args.includes('merge')"));
assert.ok(source.includes("effectOperation === 'review-update'"));
assert.ok(source.includes("'--review-update-request'"));
assert.equal(source.includes('review-update-fallback'),false);
});

test('t34 stale/diverged review-update skips generic inspect and uses review-specific preflight', () => {
const files=fixtureFiles();
const patch=fs.readFileSync(files.args.patchFile);
fs.writeFileSync(files.args.requestFile,JSON.stringify({
schema:'mcl-l-review-update-request.v1',
packet_ref:PACKET_REF,
message:TITLE,
expected_old_head:BASE,
expected_paths:PATHS,
patch_sha256:require('node:crypto').createHash('sha256').update(patch).digest('hex'),
}));
files.args.operation='review-update';
const state=baseDeps(files,{
reviewUpdateInspect(input){
state.events.push('review-update-inspect');
assert.equal(input.manifest.observedBaseSha,BASE);
assert.equal(input.request.expected_old_head,BASE);
assert.deepEqual(input.request.expected_paths,[...PATHS].sort());
assert.deepEqual(input.patchBytes,patch);
return {state:'READY'};
},
ownerRunCli(argv,env){
if(argv[0]==='inspect'){
state.events.push('owner-inspect');
return {code:2,text:JSON.stringify({
status:'BLOCKED',
reason_codes:['LANDING_HEAD_NOT_ANCESTOR_OF_BASE','PROTECTED_MAIN_STALE','REMOTE_MAIN_STALE'],
})+'\n'};
}
state.events.push('owner-review-update');
assert.equal(argv[0],'review-update');
assert.equal(env[holder.CLAIM_ENV],CLAIM);
return {code:0,text:JSON.stringify({
status:'PASS',reason_codes:[],new_head:HEAD,pr_number:4001,
next_legal_action:'RELEASE_D013_THEN_RELEASE_HOLDER_THEN_D014_COMPLETE',
})+'\n'};
},
});
const out=owner.executeComposition(files.args,state.deps);
assert.equal(out.status,'PASS');
no(state,'owner-inspect');
assert.ok(state.events.indexOf('review-update-inspect')<state.events.indexOf('holder-claim'));
assert.ok(state.events.indexOf('holder-claim')<state.events.indexOf('owner-review-update'));
});

test('t35 review-specific preflight composes current-main, replay state, and holder absence', () => {
const m=manifest();
const patch=Buffer.from('review-patch\n');
const request={
schema:'mcl-l-review-update-request.v1',
packet_ref:PACKET_REF,
message:TITLE,
expected_old_head:BASE,
expected_paths:PATHS,
patch_sha256:require('node:crypto').createHash('sha256').update(patch).digest('hex'),
};
const prRequest={schema:'mcl-l-pr-publication-request.v1',title:TITLE,body:PR_BODY};
const calls=[];
const result=owner.inspectReviewUpdatePrepared({
manifest:m,request,patchBytes:patch,prRequest,
},{
runner(){throw new Error('runner should remain delegated');},
currentMain(manifestValue){
calls.push('current-main');
assert.equal(manifestValue.observedBaseSha,BASE);
return HEAD;
},
preparedDigest(manifestValue,requestValue,patchValue){
calls.push('prepared-digest');
assert.equal(manifestValue.manifestId,m.manifestId);
assert.equal(requestValue.expected_old_head,BASE);
assert.deepEqual(patchValue,patch);
return 'e'.repeat(64);
},
classifyState(manifestValue,requestValue,prValue,main,digest){
calls.push('classify-state');
assert.equal(manifestValue.manifestId,m.manifestId);
assert.equal(requestValue.expected_old_head,BASE);
assert.equal(prValue.title,TITLE);
assert.equal(main,HEAD);
assert.equal(digest,'e'.repeat(64));
return {state:'READY'};
},
inspectWorkspace(manifestValue){
calls.push('inspect-holder-workspace');
assert.equal(manifestValue.manifestId,m.manifestId);
return {ok:true,reasonCodes:[],holderPath:'/fixture/holder'};
},
readHolder(holderPath){
calls.push('read-holder');
assert.equal(holderPath,'/fixture/holder');
return {ok:false,missing:true,reasonCodes:['HOLDER_MISSING'],value:null};
},
});
assert.equal(result.state,'READY');
assert.deepEqual(calls,[
'current-main','prepared-digest','classify-state','inspect-holder-workspace','read-holder',
]);
assert.throws(
()=>owner.inspectReviewUpdatePrepared({
manifest:m,request,patchBytes:patch,prRequest,
},{
currentMain(){return HEAD;},
preparedDigest(){return 'e'.repeat(64);},
classifyState(){return {state:'READY'};},
inspectWorkspace(){return {ok:true,reasonCodes:[],holderPath:'/fixture/holder'};},
readHolder(){return {ok:true,missing:false,reasonCodes:[],value:{}};},
}),
(error)=>error.reasonCodes.includes('HOLDER_NOT_ABSENT_BEFORE_COMPOSITION')
);
assert.throws(
()=>owner.inspectReviewUpdatePrepared({
manifest:m,request,patchBytes:patch,prRequest,
},{
currentMain(){throw new lOwner.OwnerError('CONFLICT',['REVIEW_UPDATE_MAIN_IDENTITY_CONFLICT']);},
}),
(error)=>error instanceof owner.CompositionError
&& error.kind==='CONFLICT'
&& error.reasonCodes.includes('REVIEW_UPDATE_MAIN_IDENTITY_CONFLICT')
);
const source=fs.readFileSync(path.join(__dirname,'../mcl-l-repository-apply-composition.cjs'),'utf8');
for(const needle of [
'lOwner.reviewUpdateCurrentMain',
'lOwner.expectedReviewUpdatePreparedDigest',
'lOwner.classifyReviewUpdateState',
'workspaceHolder.inspectWorkspace',
'workspaceHolder.readHolder',
]) assert.ok(source.includes(needle),needle);
});

test('t36 default review preflight runner preserves timeout and sanitized environment', () => {
const original=childProcess.spawnSync;
const priorGitDir=process.env.GIT_DIR;
const priorGitWorkTree=process.env.GIT_WORK_TREE;
const priorHome=process.env.HOME;
const seen=[];
process.env.GIT_DIR='/tmp/forbidden-git-dir';
process.env.GIT_WORK_TREE='/tmp/forbidden-git-work-tree';
process.env.HOME='/tmp/safe-home';
childProcess.spawnSync=(command,args,options)=>{
seen.push({command,args,options});
return {status:0,stdout:'ok',stderr:'',signal:null,error:null};
};
try {
const result=owner.defaultOwnerReadRunner('git',['status','--short'],{
cwd:'/tmp/fixture',
input:'payload',
timeoutMs:321,
});
assert.equal(result.code,0);
assert.equal(seen[0].command,'git');
assert.deepEqual(seen[0].args,['status','--short']);
assert.equal(seen[0].options.cwd,'/tmp/fixture');
assert.equal(seen[0].options.input,'payload');
assert.equal(seen[0].options.timeout,321);
assert.equal(seen[0].options.maxBuffer,64*1024);
assert.equal(seen[0].options.shell,false);
assert.equal(seen[0].options.env.HOME,'/tmp/safe-home');
assert.equal(Object.hasOwn(seen[0].options.env,'GIT_DIR'),false);
assert.equal(Object.hasOwn(seen[0].options.env,'GIT_WORK_TREE'),false);

const explicitEnv={HOME:'/explicit-home',GIT_DIR:'/explicit-git-dir'};
owner.defaultOwnerReadRunner('git',['rev-parse','HEAD'],{env:explicitEnv});
assert.equal(seen[1].options.timeout,120000);
assert.equal(seen[1].options.env,explicitEnv);
} finally {
childProcess.spawnSync=original;
if(priorGitDir===undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR=priorGitDir;
if(priorGitWorkTree===undefined) delete process.env.GIT_WORK_TREE; else process.env.GIT_WORK_TREE=priorGitWorkTree;
if(priorHome===undefined) delete process.env.HOME; else process.env.HOME=priorHome;
}
const deps=owner.defaultDeps();
assert.ok(typeof deps.reviewUpdateInspect==='function');
const source=fs.readFileSync(path.join(__dirname,'../mcl-l-repository-apply-composition.cjs'),'utf8');
for(const needle of [
'defaultOwnerReadRunner',
'timeout: options.timeoutMs || 120000',
'env: options.env || ownerChildEnv()',
'runner: ownerReadRunner',
]) assert.ok(source.includes(needle),needle);
});

test('t26',()=>{
const s=fs.readFileSync(path.join(__dirname,'../mcl-l-repository-apply-composition.cjs'),'utf8');
for(const x of ["execSync(","pr', 'create","gh pr merge","gitRead(manifest.workspace.worktree, ['push'","gitRead(manifest.workspace.worktree, ['commit'","gitRead(manifest.workspace.worktree, ['merge'","gitRead(manifest.workspace.worktree, ['reset'","gitRead(manifest.workspace.worktree, ['stash'","gitRead(manifest.workspace.worktree, ['clean'","process.kill","fetch("])assert.ok(!s.includes(x),x);
for(const x of ["childProcess.spawnSync('git'","lOwner.runCli","workspaceHolder.claimHolder","stageEntry.releaseRepositoryLease","taskHandoff.buildCompletionReceipt","fs.fsyncSync(fd)","fs.fsyncSync(dirFd)","releaseEvidenceRef = 'issue:#2352'","finalizeRecovery.RecoveryError"])assert.ok(s.includes(x),x);
});
