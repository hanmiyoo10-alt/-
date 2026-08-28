'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const {nextActionForBlock, isRepositoryNextAction} = require('../domains/next-action.cjs');
const QUEUE_ISSUE = 465, MEMORY_ISSUE = 462, AUDIT_ISSUE = 293;
const PROOF_MODE = 'CANONICAL_MAIN_PROOF_BUNDLE';
const WORK_PACKET_MARKER = '<!-- canonical-main-work-packet:v1 -->';
const AUTO_CLOSE_OPT_IN = '<!-- canonical-main-a1-standard-auto-close:v1 -->';
const QUEUE_START = '<!-- canonical-main-auto-closure:start -->', QUEUE_END = '<!-- canonical-main-auto-closure:end -->';
const EVIDENCE_START = '<!-- canonical-main-auto-closure-evidence:start -->', EVIDENCE_END = '<!-- canonical-main-auto-closure-evidence:end -->';
const num = (v) => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
function markerNumber(body, label) { const rows = [...String(body || '').matchAll(new RegExp(`^${label}:\\s*#([1-9]\\d*)\\s*$`, 'gmi'))]; return rows.length === 1 ? Number(rows[0][1]) : null; }
function parsePrIdentity(body) { const packet = markerNumber(body, 'Canonical-Main-Packet'), design = markerNumber(body, 'Canonical-Main-Design'); return packet && design ? Object.freeze({packet, design}) : null; }
function packetId(body) { return String(body || '').match(/## Packet ID\s*\n([^\n]+)/)?.[1]?.trim() || null; }
function blockReplace(body, start, end, replacement) { const text = String(body || ''), a = text.indexOf(start), b = text.indexOf(end); return a >= 0 && b >= a ? `${text.slice(0, a)}${replacement}${text.slice(b + end.length)}` : `${text.trimEnd()}\n\n${replacement}\n`; }
function parseQueue(body) {
  const text = String(body || ''), a = text.indexOf(QUEUE_START), b = text.indexOf(QUEUE_END); if (a < 0 || b < a) return {valid:false};
  const part = text.slice(a, b + QUEUE_END.length), state = text.match(/\*\*Queue state:\s*(ACTIVE|IDLE)\s*\/\s*CANONICAL-MAIN-V1\.2\*\*/)?.[1] || null;
  const active = part.match(/Active writable packet:\s*\*\*[^\n#]*#([1-9]\d*)/)?.[1], latest = part.match(/Latest completed packet:\s*\*\*[^\n#]*#([1-9]\d*)/)?.[1], design = part.match(/Design authority:\s*\*\*#([1-9]\d*)/)?.[1];
  const coordinationActive = text.match(/^- Active:\s*\*\*([^\n*]+)\*\*\.\s*$/m)?.[1]?.trim() || null;
  return {valid:Boolean(state), state, activePacket:active ? Number(active) : null, latestPacket:latest ? Number(latest) : null, design:design ? Number(design) : null, activeNone:/Active writable packet:\s*\*\*NONE\*\*/.test(part), coordinationActive, coordinationActiveNone:coordinationActive === 'NONE'};
}
function blocked(reasonCode, detail='NONE') { const next = nextActionForBlock({reasonCode}); if (!isRepositoryNextAction(next)) throw new Error(`invalid NEXT:${next}`); return Object.freeze({state:'BLOCKED', reasonCode, next, detail}); }
function classifyBundle(bundle, target) {
  if (!bundle || bundle.mode !== PROOF_MODE) return blocked('EVIDENCE_UNKNOWN','PROOF_BUNDLE_MODE_UNKNOWN');
  if (String(bundle.targetSha || '') !== String(target || '')) return blocked('CONVERGENCE_STALE','PROOF_TARGET_MISMATCH');
  if (bundle.state !== 'COMPLETE' || !Array.isArray(bundle.missing) || bundle.missing.length) return blocked('EVIDENCE_UNKNOWN', Array.isArray(bundle.missing) ? bundle.missing.join(',') || 'PARTIAL' : 'PARTIAL');
  const f = Array.isArray(bundle.failures) ? bundle.failures : []; if (bundle.acceptanceReady === true && !f.length) return Object.freeze({state:'READY', reasonCode:'NONE', next:'NONE'});
  if (f.some((x) => /REQUIRED|PLUGIN_CI|SIMCORE_CI|SIMCORE_VERIFY/.test(String(x)))) return blocked('REQUIRED_CHECK_FAILED',f.join(','));
  if (f.some((x) => /PRODUCTION_AUTHORITY/.test(String(x)))) return blocked('PRODUCTION_AUTHORITY_MISMATCH',f.join(','));
  if (f.some((x) => /TARGET_MISMATCH|OPS_NOT_STABLE/.test(String(x)))) return blocked('CONVERGENCE_STALE',f.join(','));
  return blocked('EVIDENCE_UNKNOWN',f.join(',') || 'ACCEPTANCE_NOT_READY');
}
function ensurePacketEligible(issue) {
  const body = String(issue?.body || ''); if (!body.includes(WORK_PACKET_MARKER)) return blocked('EVIDENCE_UNKNOWN','WORK_PACKET_MARKER_MISSING'); if (!body.includes(AUTO_CLOSE_OPT_IN)) return blocked('EVIDENCE_UNKNOWN','AUTO_CLOSE_OPT_IN_MISSING');
  const state = body.match(/\*\*State:\s*([A-Z_]+)\*\*/)?.[1]; if (!['ACTIVE','IN_PROGRESS','REVIEW','DONE'].includes(state)) return blocked('EVIDENCE_UNKNOWN',`PACKET_STATE_${state || 'UNKNOWN'}`); return {state:'READY', packetState:state, packetId:packetId(body)};
}
function evidenceProjection(bundle, ctx) { return {schemaVersion:1, packet:ctx.packetNumber, design:ctx.designNumber, proofRunId:ctx.proofRunId, targetSha:bundle.targetSha, pr:bundle.pr, prHead:bundle.evidence?.prHead, mergedMain:bundle.evidence?.mergedMain, ops:bundle.evidence?.ops, protection:bundle.evidence?.protection, incidents:bundle.evidence?.incidents, missing:bundle.missing, failures:bundle.failures, taxonomy:['IMPLEMENTED','CONTRACT_PROVEN','LIVE_PROVEN','DONE']}; }
function renderEvidence(bundle, ctx) { return [EVIDENCE_START,'## Automatic closure evidence','', '```json', JSON.stringify(evidenceProjection(bundle,ctx),null,2), '```','', '> Generated issue-only bookkeeping. Repository/Git/CI/release authorities remain authoritative.',EVIDENCE_END].join('\n'); }
function renderPacketDone(body, bundle, ctx) { let next = String(body || ''); if (!next.includes(WORK_PACKET_MARKER) || !next.includes(AUTO_CLOSE_OPT_IN)) throw new Error('packet not auto-close eligible'); const m = next.match(/\*\*State:\s*([A-Z_]+)\*\*/); if (!m) throw new Error('packet state missing'); if (m[1] !== 'DONE') next = next.replace(m[0],'**State: DONE**'); return blockReplace(next,EVIDENCE_START,EVIDENCE_END,renderEvidence(bundle,ctx)); }
function appendCompleted(body,id) { if (!id || !/^V12-[A-Z0-9]+$/.test(id)) return body; return String(body).replace(/(- Completed v1\.2 slices:\s*)([^\n]+)/,(all,prefix,list)=>{ const clean=list.trim().replace(/\.$/,''); return `${prefix}${clean.split(/,\s*/).includes(id)?clean:`${clean}, ${id}`}.`; }); }
function renderQueueIdle(body, {packetNumber,designNumber,packetIdValue,bundle,proofRunId}) {
  const q=parseQueue(body); if (!q.valid) throw new Error('queue marker missing'); if (q.state==='ACTIVE' && (q.activePacket!==packetNumber || q.design!==designNumber)) throw new Error('queue active target mismatch'); if (q.state==='IDLE' && q.latestPacket!==packetNumber) throw new Error('queue idle target mismatch');
  const block=[QUEUE_START,'- Active writable packet: **NONE**.',`- Latest completed packet: **${packetIdValue?`${packetIdValue} `:''}#${packetNumber} — DONE / IMPLEMENTED / CONTRACT_PROVEN / LIVE_PROVEN**.`,`- Design authority: **#${designNumber}**.`,`- Last auto-closure proof: target \`${bundle.targetSha}\` / proof run \`${proofRunId}\`.`,QUEUE_END].join('\n');
  let next=blockReplace(body,QUEUE_START,QUEUE_END,block)
    .replace(/\*\*Queue state:\s*(?:ACTIVE|IDLE)\s*\/\s*CANONICAL-MAIN-V1\.2\*\*/,'**Queue state: IDLE / CANONICAL-MAIN-V1.2**')
    .replace(/^- Active:\s*\*\*[^\n]*\*\*\.\s*$/m,'- Active: **NONE**.')
    .replace(/- active packet:\s*#[1-9]\d*/i,'- active packet: none')
    .replace(/- latest completed packet:\s*(?:#[1-9]\d*|none)/i,`- latest completed packet: #${packetNumber}`);
  return appendCompleted(next,packetIdValue);
}
const provenanceMarker=(surface,packet)=>`<!-- canonical-main-auto-closure:v1 surface=${surface} packet=${packet} -->`;
function renderProvenance(surface,bundle,ctx) { return [provenanceMarker(surface,ctx.packetNumber),`## Canonical-main automatic closure — ${surface}`,'',`- packet: ${ctx.packetIdValue?`\`${ctx.packetIdValue}\` `:''}#${ctx.packetNumber}`,`- design: #${ctx.designNumber}`,`- target: \`${bundle.targetSha}\` / PR #${bundle.pr?.number || 'UNKNOWN'} / proof run \`${ctx.proofRunId}\``,'- A1 proof: `COMPLETE / acceptanceReady=true / missing NONE / failures NONE`','- bookkeeping: `packet DONE + #465 IDLE + design/memory/audit provenance`','- mutation boundary: `issues only`','- taxonomy: `IMPLEMENTED / CONTRACT_PROVEN / LIVE_PROVEN / DONE`'].join('\n'); }
const blockedMarker=(packet)=>`<!-- canonical-main-auto-closure-blocked:v1 packet=${packet} -->`;
function renderBlocked(packet,target,run,decision) { return [blockedMarker(packet),'## Automatic closure bookkeeping blocked','',`- reasonCode: \`${decision.reasonCode}\``,`- NEXT: \`${decision.next}\``,`- target: \`${target || 'UNKNOWN'}\` / proof run \`${run || 'UNKNOWN'}\``,`- evidence: \`${String(decision.detail || 'NONE').slice(0,500)}\``,'','> Packet and queue remain incomplete.'].join('\n'); }
function ghRaw(args,binary=false,maxBuffer=16*1024*1024) { return execFileSync('gh',['api',...args],{encoding:binary?null:'utf8',maxBuffer,env:process.env}); }
function ghJson(args) { const text=String(ghRaw(args)||'').trim(); return text?JSON.parse(text):null; }
const getIssue=(repo,n)=>ghJson([`repos/${repo}/issues/${n}`]);
function patchIssue(repo,n,fields) { const args=['--method','PATCH',`repos/${repo}/issues/${n}`]; for (const [k,v] of Object.entries(fields)) args.push('-f',`${k}=${v}`); return ghJson(args); }
function comments(repo,n) { const rows=[]; for(let p=1;p<=20;p++){ const batch=ghJson([`repos/${repo}/issues/${n}/comments?per_page=100&page=${p}`])||[]; rows.push(...batch); if(batch.length<100) break; } return rows; }
function upsertComment(repo,n,marker,body) { const old=comments(repo,n).find((x)=>String(x.body||'').includes(marker)); if(old){ if(String(old.body||'')===body) return; ghJson(['--method','PATCH',`repos/${repo}/issues/comments/${old.id}`,'-f',`body=${body}`]); return; } ghJson(['--method','POST',`repos/${repo}/issues/${n}/comments`,'-f',`body=${body}`]); }
function associatedPr(repo,target) { const rows=ghJson(['-H','Accept: application/vnd.github+json',`repos/${repo}/commits/${target}/pulls?per_page=100`])||[]; return Array.isArray(rows)?rows.find((x)=>x.merged_at&&x.merge_commit_sha===target&&x.base?.ref==='main')||null:null; }
function artifactBundle(repo,run,target) {
  const rows=(ghJson([`repos/${repo}/actions/runs/${run}/artifacts?per_page=100`])?.artifacts||[]).filter((x)=>x.name===`canonical-main-proof-bundle-${target}`&&!x.expired); if(rows.length!==1) return {error:`PROOF_ARTIFACT_COUNT_${rows.length}`};
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cm-close-')); try { const zip=path.join(dir,'proof.zip'); fs.writeFileSync(zip,ghRaw([`repos/${repo}/actions/artifacts/${rows[0].id}/zip`],true,32*1024*1024)); const json=execFileSync('unzip',['-p',zip,'canonical-main-proof-bundle.json'],{encoding:'utf8',maxBuffer:4*1024*1024}); return {bundle:JSON.parse(json),artifactId:rows[0].id}; } catch(e){ return {error:`PROOF_ARTIFACT_READ_FAILED:${e.message}`}; } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
function queueDisposition(queue,id) { if(!queue.valid) return blocked('EVIDENCE_UNKNOWN','QUEUE_MARKER_UNKNOWN'); if(queue.state==='ACTIVE') return queue.activePacket===id.packet&&queue.design===id.design?{state:'READY'}:blocked('PACKET_SCOPE_OVERLAP','QUEUE_ACTIVE_TARGET_MISMATCH'); if(queue.state==='IDLE'&&queue.latestPacket===id.packet&&queue.design===id.design&&queue.activeNone&&queue.coordinationActiveNone) return {state:'IDEMPOTENT'}; return blocked('PACKET_SCOPE_OVERLAP','QUEUE_NOT_OWNED_BY_PACKET'); }
function note(line){ console.log(line); if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`${line}\n`); }
function blockAndReturn(repo,packet,target,run,decision){ upsertComment(repo,packet,blockedMarker(packet),renderBlocked(packet,target,run,decision)); note(`AUTO_CLOSURE=BLOCKED reason=${decision.reasonCode} next=${decision.next}`); }
function run() {
  const repo=String(process.env.GITHUB_REPOSITORY||'').trim(), target=String(process.env.PROOF_TARGET_SHA||'').trim(), proofRunId=num(process.env.PROOF_RUN_ID), conclusion=String(process.env.PROOF_RUN_CONCLUSION||'').trim(); if(!repo||!target||!proofRunId||!process.env.GH_TOKEN) throw new Error('closure-bookkeeping missing environment');
  const queueIssue=getIssue(repo,QUEUE_ISSUE), queue=parseQueue(queueIssue?.body), pr=associatedPr(repo,target); if(!pr){ note('AUTO_CLOSURE=IGNORED_NO_ASSOCIATED_PR'); return; } const id=parsePrIdentity(pr.body); if(!id){ note(`AUTO_CLOSURE=IGNORED_PR_WITHOUT_EXPLICIT_MARKERS pr=${pr.number}`); return; }
  if(queue.valid&&queue.state==='IDLE'&&queue.activeNone&&queue.coordinationActiveNone&&queue.latestPacket!==id.packet){ note('AUTO_CLOSURE=NO_ACTIVE_PACKET'); return; }
  const qd=queueDisposition(queue,id); if(qd.state==='BLOCKED'){ blockAndReturn(repo,queue.activePacket||id.packet,target,proofRunId,qd); return; }
  if(conclusion!=='success'){ blockAndReturn(repo,id.packet,target,proofRunId,blocked('EVIDENCE_UNKNOWN',`PROOF_WORKFLOW_${conclusion||'UNKNOWN'}`)); return; }
  const loaded=artifactBundle(repo,proofRunId,target); if(!loaded.bundle){ blockAndReturn(repo,id.packet,target,proofRunId,blocked('EVIDENCE_UNKNOWN',loaded.error)); return; } const pd=classifyBundle(loaded.bundle,target); if(pd.state!=='READY'){ blockAndReturn(repo,id.packet,target,proofRunId,pd); return; }
  const packet=getIssue(repo,id.packet), eligible=ensurePacketEligible(packet); if(eligible.state!=='READY'){ blockAndReturn(repo,id.packet,target,proofRunId,eligible); return; }
  const ctx={packetNumber:id.packet,designNumber:id.design,proofRunId,packetIdValue:eligible.packetId}, freshQueue=getIssue(repo,QUEUE_ISSUE); if(String(freshQueue?.updated_at||'')!==String(queueIssue?.updated_at||'')){ blockAndReturn(repo,id.packet,target,proofRunId,blocked('PACKET_SCOPE_OVERLAP','QUEUE_CHANGED_DURING_PREFLIGHT')); return; }
  const packetDone=eligible.packetState==='DONE'&&packet.state==='closed'&&String(packet.body||'').includes(EVIDENCE_START), q=parseQueue(freshQueue.body), queueDone=q.state==='IDLE'&&q.latestPacket===id.packet&&q.activeNone&&q.coordinationActiveNone; let packetChanged=false;
  try { if(!packetDone){ patchIssue(repo,id.packet,{body:renderPacketDone(packet.body,loaded.bundle,ctx),state:'closed',state_reason:'completed'}); packetChanged=true; } if(!queueDone) patchIssue(repo,QUEUE_ISSUE,{body:renderQueueIdle(freshQueue.body,{...ctx,bundle:loaded.bundle})}); }
  catch(error){ if(packetChanged) try{ patchIssue(repo,id.packet,{body:packet.body,state:packet.state==='closed'?'closed':'open',state_reason:packet.state==='closed'?'completed':'reopened'}); }catch(rollback){ console.error(`rollback failed:${rollback.message}`); } throw error; }
  upsertComment(repo,id.design,provenanceMarker('design',id.packet),renderProvenance('design',loaded.bundle,ctx)); upsertComment(repo,MEMORY_ISSUE,provenanceMarker('memory',id.packet),renderProvenance('memory',loaded.bundle,ctx)); upsertComment(repo,AUDIT_ISSUE,provenanceMarker('audit',id.packet),renderProvenance('audit',loaded.bundle,ctx)); note(`AUTO_CLOSURE=DONE packet=${id.packet} target=${target} proofRun=${proofRunId} artifact=${loaded.artifactId}`);
}
if(require.main===module) run();
module.exports={AUTO_CLOSE_OPT_IN,EVIDENCE_START,QUEUE_END,QUEUE_START,WORK_PACKET_MARKER,blocked,classifyBundle,ensurePacketEligible,parsePrIdentity,parseQueue,queueDisposition,renderBlocked,renderPacketDone,renderQueueIdle};
