#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validatePostPublishStateEnvelope } from './release-state-converge.mjs';

const HEX40 = /^[0-9a-f]{40}$/;
const RELEASE_BEGIN_RE = /<!-- SIMCORE_RELEASE_STATE:([^:]+):BEGIN -->/g;
const RELEASE_END_RE = /<!-- SIMCORE_RELEASE_STATE:([^:]+):END -->/g;

function fail(code, detail = '') {
  const e = new Error(detail ? `${code}: ${detail}` : code);
  e.code = code;
  throw e;
}
function parseArgs(argv) {
  const out = {};
  for (let i=0; i<argv.length; i+=1) {
    const arg=argv[i];
    if(!arg.startsWith('--')) fail('R2_6_DURABLE_REOBSERVE_ARGS_INVALID',arg);
    const key=arg.slice(2), value=argv[++i];
    if(value==null||value.startsWith('--')) fail('R2_6_DURABLE_REOBSERVE_ARGS_INVALID',key);
    out[key]=value;
  }
  return out;
}
function under(root, rel) {
  if(!rel||typeof rel!=='string'||path.isAbsolute(rel)) fail('R2_6_DURABLE_REOBSERVE_FAIL',`path ${rel}`);
  const p=path.resolve(root,rel);
  if(p!==root&&!p.startsWith(root+path.sep)) fail('R2_6_DURABLE_REOBSERVE_FAIL',`outside root ${rel}`);
  return p;
}
function readJson(file, detail) {
  try { return JSON.parse(fs.readFileSync(file,'utf8')); }
  catch(e) { fail('R2_6_DURABLE_REOBSERVE_FAIL',`${detail}: ${e.message}`); }
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function gitBlob(bytes) { return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'); }
function sourceIdentity(bytes, version) {
  const text=bytes.toString('utf8');
  const v=text.match(/^\/\/@version\s+([^\r\n]+)$/m)?.[1]?.trim()||'';
  const escaped=version.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const name=text.match(new RegExp(`^// v${escaped}\\s+(.+?):\\s*$`,'m'))?.[1]?.trim()||'';
  return {version:v,releaseName:name};
}
function assertEq(actual, expected, detail) { if(actual!==expected) fail('R2_6_DURABLE_REOBSERVE_FAIL',`${detail}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`); }
function verifyProduction(root,envelope,identity) {
  if(!identity||identity.schemaVersion!==1||identity.product!=='SimCore'||identity.resolvedBranch!=='release-simcore'||!HEX40.test(identity.resolvedCommit||'')) fail('R2_6_DURABLE_REOBSERVE_FAIL','production identity envelope');
  assertEq(identity.resolvedCommit,envelope.productionCommit,'production commit');
  for(const k of ['latest','install']) if(!identity[k]||typeof identity[k].path!=='string'||!HEX40.test(identity[k].blob||'')) fail('R2_6_DURABLE_REOBSERVE_FAIL',`production ${k}`);
  const latest=fs.readFileSync(under(root,identity.latest.path));
  const install=fs.readFileSync(under(root,identity.install.path));
  const lb=gitBlob(latest), ib=gitBlob(install);
  assertEq(lb,envelope.productionBlob,'latest blob');
  assertEq(ib,envelope.productionBlob,'install blob');
  assertEq(identity.latest.blob,envelope.productionBlob,'identity latest blob');
  assertEq(identity.install.blob,envelope.productionBlob,'identity install blob');
  if(!latest.equals(install)) fail('R2_6_DURABLE_REOBSERVE_FAIL','latest/install diverged');
  const parsed=sourceIdentity(latest,envelope.version);
  assertEq(parsed.version,envelope.version,'source version');
  assertEq(parsed.releaseName,envelope.releaseName,'source release name');
}
function verifyPayloadHashes(root,envelope) {
  for(const row of envelope.persistentPayloadManifest) {
    const file=under(root,row.path);
    if(!fs.existsSync(file)) fail('R2_6_DURABLE_REOBSERVE_FAIL',`missing persistent member ${row.path}`);
    assertEq(sha256(fs.readFileSync(file)),row.sha256,`persistent hash ${row.path}`);
  }
}
function verifyCurrentDevelopment(root,envelope) {
  const text=fs.readFileSync(under(root,'docs/CURRENT_DEVELOPMENT.md'),'utf8');
  const begins=[...text.matchAll(RELEASE_BEGIN_RE)].map((m)=>m[1]);
  const ends=[...text.matchAll(RELEASE_END_RE)].map((m)=>m[1]);
  if(begins.length!==1||ends.length!==1||begins[0]!==ends[0]||begins[0]!=='LIVE_PENDING') fail('R2_6_DURABLE_REOBSERVE_FAIL',`release-state markers ${JSON.stringify({begins,ends})}`);
  for(const token of [
    `Release transaction: \`${envelope.releaseId}\``,
    `Production commit: \`${envelope.productionCommit}\``,
    `Current priority / live gate: \`${envelope.liveScenarioId}\``,
    'Validation status: `PENDING_REAL_LONG_CHAT`',
    'R lifecycle: `REAL_RELEASE_LIVE_PENDING`',
  ]) if(!text.includes(token)) fail('R2_6_DURABLE_REOBSERVE_FAIL',`CURRENT_DEVELOPMENT token ${token}`);
}
function verifyDurableObjects(root,envelope,handoff) {
  const c=envelope.expectedDurableClaims;
  for(const key of ['releaseId','productionCommit','previousProductionCommit','productionBlob','publisherRunId','liveScenarioId']) assertEq(handoff[key],c[key],`handoff ${key}`);
  const manifest=readJson(under(root,'product-manifest.json'),'manifest');
  assertEq(manifest.production_version,c.version,'manifest version');
  assertEq(manifest.release_name,c.releaseName,'manifest release name');
  assertEq(manifest.release_commit,c.productionCommit,'manifest commit');
  assertEq(manifest.release_blob,c.productionBlob,'manifest blob');
  assertEq(manifest.validation_status,c.validationStatus,'manifest validation');
  assertEq(manifest.current_priority,c.currentPriority,'manifest priority');

  const record=readJson(under(root,envelope.releaseRecordPath),'release record');
  assertEq(record.releaseId,c.releaseId,'record releaseId');
  assertEq(record.productionCommit,c.productionCommit,'record commit');
  assertEq(record.previousProductionCommit,c.previousProductionCommit,'record previous commit');
  assertEq(record.productionBlob,c.productionBlob,'record blob');
  assertEq(record.publisherRunId,c.publisherRunId,'record publisherRunId');
  assertEq(record.releaseState,c.lifecycleState,'record releaseState');
  assertEq(record.productionTruth,'PUBLISHED_IDENTITY_VERIFIED','record production truth');
  assertEq(record.stateSyncStatus,'PASS','record state sync');
  assertEq(record.liveGate?.scenarioId,c.liveScenarioId,'record live scenario');

  const receipt=readJson(under(root,envelope.stateReceiptPath),'state receipt');
  assertEq(receipt.schemaVersion,1,'receipt schema');
  assertEq(receipt.product,'SimCore','receipt product');
  assertEq(receipt.releaseId,c.releaseId,'receipt releaseId');
  assertEq(receipt.publisherRunId,c.publisherRunId,'receipt publisherRunId');
  assertEq(receipt.productionCommit,c.productionCommit,'receipt commit');
  assertEq(receipt.previousProductionCommit,c.previousProductionCommit,'receipt previous commit');
  assertEq(receipt.productionBlob,c.productionBlob,'receipt blob');
  assertEq(receipt.liveScenarioId,c.liveScenarioId,'receipt live scenario');
  assertEq(receipt.validationStatus,c.validationStatus,'receipt validation');
  assertEq(receipt.lifecycleState,c.rLifecycleState,'receipt lifecycle');
  assertEq(receipt.releaseRecordPath,envelope.releaseRecordPath,'receipt record path');
  assertEq(receipt.productionMutation,envelope.productionMutation,'receipt production mutation');
  assertEq(receipt.releaseAuthority,c.releaseAuthority,'receipt authority');
  assertEq(receipt.result,c.receiptResult,'receipt result');
}
function writeReport(file,value) { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`); }

export function run(argv=process.argv.slice(2)) {
  const a=parseArgs(argv);
  for(const k of ['root','envelope','handoff','production-identity','report']) if(!a[k]) fail('R2_6_DURABLE_REOBSERVE_ARGS_INVALID',k);
  const root=path.resolve(a.root);
  const envelope=validatePostPublishStateEnvelope(readJson(under(root,a.envelope),'envelope'));
  if(!['PERMANENT','RECOVERY'].includes(envelope.mode)) fail('R2_6_STATE_ENVELOPE_INVALID',`reobserve mode ${envelope.mode}`);
  const handoff=readJson(under(root,a.handoff),'handoff');
  const identity=readJson(under(root,a['production-identity']),'production identity');
  verifyProduction(root,envelope,identity);
  verifyPayloadHashes(root,envelope);
  verifyCurrentDevelopment(root,envelope);
  verifyDurableObjects(root,envelope,handoff);
  if(a['landed-main-commit']) {
    const head=process.env.R2_6_DURABLE_MAIN_COMMIT||a['landed-main-commit'];
    if(!HEX40.test(head)) fail('R2_6_DURABLE_REOBSERVE_FAIL','landed main commit');
  }
  const report={
    schemaVersion:1,
    tool:'release-state-reobserve',
    releaseId:envelope.releaseId,
    mode:envelope.mode,
    productionCommit:envelope.productionCommit,
    productionBlob:envelope.productionBlob,
    changedPaths:envelope.changedPaths,
    durableMemberCount:envelope.persistentPayloadManifest.length,
    productionMutation:envelope.productionMutation,
    result:'RS2_6_POST_PUBLISH_DURABLE_MAIN_PASS',
  };
  writeReport(under(root,a.report),report);
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(run())); }
  catch(e) { console.error(e.code||'R2_6_DURABLE_REOBSERVE_FAIL',e.message||''); process.exit(2); }
}
