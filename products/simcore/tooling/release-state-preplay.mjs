#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run as convergeRun, validatePostPublishStateEnvelope } from './release-state-converge.mjs';
import { validateEnvelopePolicy } from './release-state-main-gate.mjs';

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
    if(!arg.startsWith('--')) fail('R2_6_PREPLAY_ARGS_INVALID',arg);
    const key=arg.slice(2), value=argv[++i];
    if(value==null||value.startsWith('--')) fail('R2_6_PREPLAY_ARGS_INVALID',key);
    out[key]=value;
  }
  return out;
}
function under(root, rel) {
  if(!rel||typeof rel!=='string'||path.isAbsolute(rel)) fail('R2_6_PREPLAY_ARGS_INVALID',`path ${rel}`);
  const p=path.resolve(root,rel);
  if(p!==root&&!p.startsWith(root+path.sep)) fail('R2_6_PREPLAY_ARGS_INVALID',`outside root ${rel}`);
  return p;
}
function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file,'utf8')); }
  catch(e) { fail(code,e.message); }
}
function activeHumanSection(text) {
  const startMarker='# 1. Current Operational State';
  const start=text.indexOf(startMarker);
  if(start<0) fail('R2_6_PREPLAY_CLOSURE_FAIL','current operational state section missing');
  const historical=text.indexOf('## Historical validated precursor',start);
  const fallback=text.indexOf('# 2.',start);
  const end=historical>=0?historical:fallback;
  if(end<=start) fail('R2_6_PREPLAY_CLOSURE_FAIL','active human current-state boundary missing');
  return text.slice(start,end);
}
function verifyClosureSurface(root,envelope) {
  const text=fs.readFileSync(under(root,'docs/CURRENT_DEVELOPMENT.md'),'utf8');
  const begins=[...text.matchAll(RELEASE_BEGIN_RE)].map((m)=>m[1]);
  const ends=[...text.matchAll(RELEASE_END_RE)].map((m)=>m[1]);
  if(begins.length!==1||ends.length!==1||begins[0]!==ends[0]||begins[0]!=='LIVE_PENDING') {
    fail('R2_6_PREPLAY_CLOSURE_FAIL',`release-state markers ${JSON.stringify({begins,ends})}`);
  }
  const active=activeHumanSection(text);
  if(/v0\.\d+\.\d+/.test(active)) fail('R2_6_PREPLAY_CLOSURE_FAIL','active human prose duplicates version literal');
  if(/\b[0-9a-f]{40}\b/i.test(active)) fail('R2_6_PREPLAY_CLOSURE_FAIL','active human prose duplicates commit literal');
  if(/\b0\d{4}_[A-Z0-9_]+\b/.test(active)) fail('R2_6_PREPLAY_CLOSURE_FAIL','active human prose duplicates live-gate literal');
  for(const token of [
    `Release transaction: \`${envelope.releaseId}\``,
    `Production commit: \`${envelope.productionCommit}\``,
    `Current priority / live gate: \`${envelope.liveScenarioId}\``,
    'Validation status: `PENDING_REAL_LONG_CHAT`',
    'R lifecycle: `REAL_RELEASE_LIVE_PENDING`',
  ]) if(!text.includes(token)) fail('R2_6_PREPLAY_CLOSURE_FAIL',`missing ${token}`);
}
function writeReport(file,value) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);
}

export function run(argv=process.argv.slice(2)) {
  const a=parseArgs(argv);
  for(const k of ['root','input','production-identity','writer-policy','report']) if(!a[k]) fail('R2_6_PREPLAY_ARGS_INVALID',k);
  const root=path.resolve(a.root);
  const reportPath=under(root,a.report);
  const ownerReportRel=a['owner-report']||'.simcore-release/preplay-owner-envelope.json';
  const owner=convergeRun([
    '--root',root,
    '--input',a.input,
    '--production-identity',a['production-identity'],
    '--writer-policy',a['writer-policy'],
    '--mode','PREPUBLICATION_SIMULATION',
    '--report',ownerReportRel,
    ...(a.probes==='NONE'?['--probes','NONE']:[]),
  ]);
  const envelope=validatePostPublishStateEnvelope(owner);
  if(envelope.mode!=='PREPUBLICATION_SIMULATION'||envelope.productionMutation!=='NONE'||envelope.mainMutation!=='SIMULATION_ONLY') {
    fail('R2_6_PREPLAY_STATE_RENDER_FAIL','simulation authority boundary');
  }
  const policy=readJson(under(root,a['writer-policy']),'R2_6_PREPLAY_PAYLOAD_POLICY_FAIL');
  try { validateEnvelopePolicy(envelope,policy,{allowSimulation:true}); }
  catch(e) { fail(e.code==='R2_6_STATE_PAYLOAD_POLICY_FAIL'?'R2_6_PREPLAY_PAYLOAD_POLICY_FAIL':(e.code||'R2_6_PREPLAY_PAYLOAD_POLICY_FAIL'),e.message); }
  verifyClosureSurface(root,envelope);
  const report={
    schemaVersion:1,
    tool:'release-state-preplay',
    releaseId:envelope.releaseId,
    productionCommit:envelope.productionCommit,
    previousProductionCommit:envelope.previousProductionCommit,
    productionBlob:envelope.productionBlob,
    changedPaths:envelope.changedPaths,
    persistentPayloadManifest:envelope.persistentPayloadManifest,
    disposition:envelope.disposition,
    productionMutation:'NONE',
    publicationDispatch:'BLOCKED_UNTIL_PREPLAY_PASS',
    classification:'FIX / PREPUBLICATION_POST_PUBLISH_QUALIFICATION',
    result:'RS2_6_POST_PUBLISH_PREPLAY_PASS',
  };
  writeReport(reportPath,report);
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(run())); }
  catch(e) { console.error(e.code||'R2_6_PREPLAY_STATE_RENDER_FAIL',e.message||''); process.exit(2); }
}
