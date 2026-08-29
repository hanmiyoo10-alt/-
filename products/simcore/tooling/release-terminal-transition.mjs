#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureParentUnderRoot, resolveRoot, resolveUnderRoot } from './root-path.mjs';

const SHA40=/^[0-9a-f]{40}$/;
const RELEASE_ID=/^simcore-v[0-9]+\.[0-9]+\.[0-9]+-(?:new|correction|rollback|noop)-[0-9]{2,}$/;
const SAFE_TOKEN=/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,127}$/;
const CHECKPOINT=/^M([0-9]+)-([0-9]+)$/;
const DOC_PATH=/^docs\/[A-Za-z0-9._/-]+\.md$/;
const LIVE_PENDING='PENDING_REAL_LONG_CHAT';
const LIVE_PASS='LIVE_PASS';
const R_PENDING='REAL_RELEASE_LIVE_PENDING';
const R_PASS='REAL_RELEASE_LIVE_PASS';
const TOP_LEVEL_KEYS=new Set([
  'schemaVersion','product','releaseId','productionCommit','productionBlob','liveScenarioId',
  'decision','checkpoint','nextPriority','humanEvidence','authorityConfirmation',
]);

function failDisposition(disposition,code,detail=''){
  return {schemaVersion:1,product:'SimCore',disposition,code,detail,productionMutation:'NONE',humanEvidenceMutation:'NONE',authorityMutation:'NONE',mainMutation:'NONE'};
}
function same(a,b){return a===b;}
function isPlainObject(v){return Boolean(v)&&typeof v==='object'&&!Array.isArray(v);}
function checkpointTuple(value){
  const m=String(value||'').match(CHECKPOINT);
  return m?[Number(m[1]),Number(m[2])]:null;
}
function checkpointRegresses(current,target){
  const a=checkpointTuple(current),b=checkpointTuple(target);
  if(!a||!b)return null;
  return b[0]<a[0]||(b[0]===a[0]&&b[1]<a[1]);
}
function canonicalEvidencePath(releaseId){return `products/simcore/releases/live-evidence/${releaseId}.json`;}
function canonicalRecordPath(releaseId){return `products/simcore/releases/records/${releaseId}.json`;}
function canonicalReceiptPath(releaseId){return `products/simcore/releases/state-receipts/${releaseId}.json`;}
function livePendingBlock(evidence){
  return [
    '<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:BEGIN -->',
    '## Current Release Live Gate',
    '',
    `- Release transaction: \`${evidence.releaseId}\``,
    `- Production commit: \`${evidence.productionCommit}\``,
    '- Validation status: `PENDING_REAL_LONG_CHAT`',
    `- Current priority / live gate: \`${evidence.liveScenarioId}\``,
    '- R lifecycle: `REAL_RELEASE_LIVE_PENDING`',
    '',
    'This block is machine-managed by `release-state-converge` from immutable publication evidence.',
    '<!-- SIMCORE_RELEASE_STATE:LIVE_PENDING:END -->',
  ].join('\n');
}
function livePassBlock(evidence){
  return [
    '<!-- SIMCORE_RELEASE_STATE:LIVE_PASS:BEGIN -->',
    '## Current Release Terminal State',
    '',
    `- Release transaction: \`${evidence.releaseId}\``,
    `- Production commit: \`${evidence.productionCommit}\``,
    '- Validation status: `LIVE_PASS`',
    `- Current priority: \`${evidence.nextPriority}\``,
    '- Terminal disposition: `LIVE_PASS`',
    '- R lifecycle: `REAL_RELEASE_LIVE_PASS`',
    '',
    'This block is the terminal administrative state backed by accepted real long-chat evidence and production reobservation.',
    '<!-- SIMCORE_RELEASE_STATE:LIVE_PASS:END -->',
  ].join('\n');
}
function validateEvidenceShape(evidence,evidencePath,availableEvidencePaths){
  if(!isPlainObject(evidence)||evidence.schemaVersion!==1||evidence.product!=='SimCore')return 'evidence envelope';
  for(const key of Object.keys(evidence))if(!TOP_LEVEL_KEYS.has(key))return `unknown field ${key}`;
  if(!RELEASE_ID.test(String(evidence.releaseId||'')))return 'releaseId';
  if(evidencePath!==canonicalEvidencePath(evidence.releaseId))return 'canonical evidence path';
  if(!SHA40.test(String(evidence.productionCommit||''))||!SHA40.test(String(evidence.productionBlob||'')))return 'production identity';
  if(!SAFE_TOKEN.test(String(evidence.liveScenarioId||'')))return 'liveScenarioId';
  if(evidence.decision!==LIVE_PASS)return 'decision';
  if(!CHECKPOINT.test(String(evidence.checkpoint||'')))return 'checkpoint';
  if(!SAFE_TOKEN.test(String(evidence.nextPriority||''))||evidence.nextPriority===evidence.liveScenarioId)return 'nextPriority';
  if(evidence.authorityConfirmation!=='HUMAN_EVIDENCE')return 'authorityConfirmation';
  if(!Array.isArray(evidence.humanEvidence)||evidence.humanEvidence.length===0||evidence.humanEvidence.length>16)return 'humanEvidence';
  const unique=new Set();
  for(const item of evidence.humanEvidence){
    if(typeof item!=='string'||!DOC_PATH.test(item)||item.includes('..')||unique.has(item))return 'humanEvidence path';
    unique.add(item);
    if(availableEvidencePaths&&!availableEvidencePaths.has(item))return `humanEvidence missing ${item}`;
  }
  return null;
}
function validateReleaseBinding(evidence,record,receipt){
  if(!isPlainObject(record)||record.schemaVersion!==1||record.product!=='SimCore')return 'record envelope';
  if(record.releaseId!==evidence.releaseId)return 'record releaseId';
  if(record.productionCommit!==evidence.productionCommit||record.productionBlob!==evidence.productionBlob)return 'record production identity';
  if(record.releaseState!=='LIVE_PENDING'||record.productionTruth!=='PUBLISHED_IDENTITY_VERIFIED'||record.stateSyncStatus!=='PASS')return 'record publication state';
  if(!isPlainObject(receipt)||receipt.schemaVersion!==1||receipt.product!=='SimCore')return 'receipt envelope';
  if(receipt.releaseId!==evidence.releaseId)return 'receipt releaseId';
  if(receipt.releaseRecordPath!==canonicalRecordPath(evidence.releaseId))return 'receipt releaseRecordPath';
  if(receipt.productionCommit!==evidence.productionCommit||receipt.productionBlob!==evidence.productionBlob)return 'receipt production identity';
  if(receipt.validationStatus!==LIVE_PENDING||receipt.lifecycleState!==R_PENDING||receipt.releaseAuthority!=='RS2_4_PERMANENT'||receipt.result!=='PASS')return 'receipt state';
  if(String(receipt.publisherRunId)!==String(record.publisherRunId))return 'publisherRunId';
  return null;
}
function validateLiveGate(evidence,record,receipt){
  if(record?.liveGate?.required!==true)return 'record live gate required';
  if(record.liveGate.scenarioId!==evidence.liveScenarioId)return 'record live scenario';
  if(record.liveGate.result!=='PENDING')return 'record live gate result';
  if(receipt.liveScenarioId!==evidence.liveScenarioId)return 'receipt live scenario';
  return null;
}
function validateProduction(evidence,manifest,identity){
  if(!isPlainObject(manifest)||manifest.product!=='SimCore')return 'manifest envelope';
  if(manifest.release_branch!=='release-simcore')return 'manifest release branch';
  if(manifest.release_commit!==evidence.productionCommit||manifest.release_blob!==evidence.productionBlob)return 'manifest production identity';
  if(!isPlainObject(identity)||identity.schemaVersion!==1||identity.product!=='SimCore'||identity.resolvedBranch!=='release-simcore')return 'production identity envelope';
  if(identity.resolvedCommit!==evidence.productionCommit)return 'observed production commit';
  if(identity.latest?.blob!==evidence.productionBlob||identity.install?.blob!==evidence.productionBlob||identity.latest.blob!==identity.install.blob)return 'observed production blob';
  return null;
}
function terminalStateCoherent(evidence,manifest,currentDevelopmentText){
  return manifest.validation_status===LIVE_PASS&&
    manifest.current_priority===evidence.nextPriority&&
    manifest.major_update_checkpoint===evidence.checkpoint&&
    currentDevelopmentText.includes(livePassBlock(evidence))&&
    !currentDevelopmentText.includes(livePendingBlock(evidence));
}
function pendingStateCoherent(evidence,manifest,currentDevelopmentText){
  return manifest.validation_status===LIVE_PENDING&&
    manifest.current_priority===evidence.liveScenarioId&&
    currentDevelopmentText.includes(livePendingBlock(evidence))&&
    !currentDevelopmentText.includes(livePassBlock(evidence));
}
function buildTransition(evidence,manifest){
  const expected={
    validation_status:LIVE_PENDING,
    current_priority:evidence.liveScenarioId,
  };
  const set={
    validation_status:LIVE_PASS,
    current_priority:evidence.nextPriority,
  };
  if(manifest.major_update_checkpoint!==evidence.checkpoint){
    expected.major_update_checkpoint=manifest.major_update_checkpoint;
    set.major_update_checkpoint=evidence.checkpoint;
  }
  return {
    schemaVersion:1,
    product:'SimCore',
    transitionId:`r2-8-terminal-${evidence.releaseId}`,
    expectedProductionCommit:evidence.productionCommit,
    expected,
    set,
    evidence:[...evidence.humanEvidence],
    documentReplacements:[{
      id:`${evidence.releaseId}-live-pending-to-live-pass`,
      path:'docs/CURRENT_DEVELOPMENT.md',
      from:livePendingBlock(evidence),
      to:livePassBlock(evidence),
    }],
  };
}

export function resolveTerminalTransition({evidence,evidencePath,record,receipt,manifest,productionIdentity,currentDevelopmentText,availableEvidencePaths}){
  const invalid=validateEvidenceShape(evidence,evidencePath,availableEvidencePaths);
  if(invalid)return failDisposition('BLOCKED_EVIDENCE_INVALID','R2_8_TERMINAL_EVIDENCE_INVALID',invalid);

  const binding=validateReleaseBinding(evidence,record,receipt);
  if(binding)return failDisposition('BLOCKED_RELEASE_BINDING_MISMATCH','R2_8_RELEASE_BINDING_MISMATCH',binding);

  const live=validateLiveGate(evidence,record,receipt);
  if(live)return failDisposition('BLOCKED_LIVE_GATE_MISMATCH','R2_8_LIVE_GATE_MISMATCH',live);

  const production=validateProduction(evidence,manifest,productionIdentity);
  if(production)return failDisposition('BLOCKED_PRODUCTION_MOVED','R2_8_PRODUCTION_MOVED',production);

  const regresses=checkpointRegresses(manifest.major_update_checkpoint,evidence.checkpoint);
  if(regresses===null)return failDisposition('BLOCKED_CURRENT_STATE_CONTRADICTION','R2_8_CURRENT_STATE_CONTRADICTION','manifest checkpoint syntax');
  if(regresses)return failDisposition('BLOCKED_CHECKPOINT_REGRESSION','R2_8_CHECKPOINT_REGRESSION',`${manifest.major_update_checkpoint} -> ${evidence.checkpoint}`);

  if(terminalStateCoherent(evidence,manifest,currentDevelopmentText)){
    return {
      schemaVersion:1,product:'SimCore',disposition:'ALREADY_DURABLE',code:'R2_8_TERMINAL_ALREADY_DURABLE',
      transition:null,productionMutation:'NONE',humanEvidenceMutation:'NONE',authorityMutation:'NONE',mainMutation:'NONE',
    };
  }

  if(!pendingStateCoherent(evidence,manifest,currentDevelopmentText)){
    return failDisposition('BLOCKED_CURRENT_STATE_CONTRADICTION','R2_8_CURRENT_STATE_CONTRADICTION','pending/terminal state is partial or contradictory');
  }

  return {
    schemaVersion:1,product:'SimCore',disposition:'ELIGIBLE_TO_PROJECT',code:'R2_8_TERMINAL_ELIGIBLE',
    transition:buildTransition(evidence,manifest),
    productionMutation:'NONE',humanEvidenceMutation:'NONE',authorityMutation:'HUMAN_EVIDENCE_CONSUMED_NOT_CREATED',mainMutation:'LOCAL_TERMINAL_STATE_PENDING_GATEWAY',
  };
}

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const a=argv[i];
    if(!a.startsWith('--')||i+1>=argv.length)throw Object.assign(new Error(a),{code:'R2_8_TERMINAL_ARGS_INVALID'});
    out[a.slice(2)]=argv[++i];
  }
  for(const key of ['root','evidence','record','receipt','manifest','development','production-identity','transition-out','report']){
    if(!out[key])throw Object.assign(new Error(`--${key} required`),{code:'R2_8_TERMINAL_ARGS_INVALID'});
  }
  return out;
}
function readJson(file,kind){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){throw Object.assign(new Error(`${kind}: ${e.message}`),{code:'R2_8_TERMINAL_INPUT_INVALID'});}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}

export function run(argv=process.argv.slice(2)){
  const a=parseArgs(argv);const root=resolveRoot(a.root);
  const evidencePath=String(a.evidence).replaceAll('\\','/').replace(/^\.\//,'');
  const evidenceFile=resolveUnderRoot(root,evidencePath,{kind:'EVIDENCE'});
  const record=readJson(resolveUnderRoot(root,a.record,{kind:'RECORD'}),'record');
  const receipt=readJson(resolveUnderRoot(root,a.receipt,{kind:'RECEIPT'}),'receipt');
  const manifest=readJson(resolveUnderRoot(root,a.manifest,{kind:'MANIFEST'}),'manifest');
  const identity=readJson(resolveUnderRoot(root,a['production-identity'],{kind:'PRODUCTION_IDENTITY'}),'production identity');
  const developmentFile=resolveUnderRoot(root,a.development,{kind:'DEVELOPMENT'});
  const evidence=readJson(evidenceFile,'evidence');
  const currentDevelopmentText=fs.readFileSync(developmentFile,'utf8');
  const availableEvidencePaths=new Set();
  if(Array.isArray(evidence.humanEvidence)){
    for(const rel of evidence.humanEvidence){
      if(typeof rel!=='string')continue;
      try{const p=resolveUnderRoot(root,rel,{kind:'HUMAN_EVIDENCE'});if(fs.existsSync(p)&&fs.statSync(p).isFile())availableEvidencePaths.add(rel);}catch{}
    }
  }
  const result=resolveTerminalTransition({evidence,evidencePath,record,receipt,manifest,productionIdentity:identity,currentDevelopmentText,availableEvidencePaths});
  const transitionOut=ensureParentUnderRoot(root,a['transition-out'],{kind:'TRANSITION_OUTPUT'});
  if(result.transition)writeJson(transitionOut,result.transition);else if(fs.existsSync(transitionOut))fs.unlinkSync(transitionOut);
  const report={...result};delete report.transition;report.evidencePath=evidencePath;report.recordPath=a.record;report.receiptPath=a.receipt;
  writeJson(ensureParentUnderRoot(root,a.report,{kind:'REPORT'}),report);
  return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const result=run();
    process.stdout.write(`SIMCORE_R2_8_TERMINAL_${result.disposition}\n`);
    if(result.disposition.startsWith('BLOCKED_'))process.exit(2);
  }catch(e){console.error(`${e.code||'R2_8_TERMINAL_ERROR'}: ${e.message||e}`);process.exit(2);}
}
