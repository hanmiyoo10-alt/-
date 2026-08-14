const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06318-baseline.js', 'utf8');
const newSource = fs.readFileSync('plugins/simcore/latest.js', 'utf8');
function fail(m){ throw new Error(m); }
function assert(c,m){ if(!c) fail(m); }
function count(s,t){ return String(s).split(t).length-1; }
function moduleBlock(source,name){
  const marker=`SimCore.define("${name}", function (require, module, exports) {`;
  const start=source.indexOf(marker); if(start<0) fail(`module missing: ${name}`);
  let end=source.indexOf('\nSimCore.define("',start+marker.length);
  if(end<0) end=source.indexOf('\n(async () => {',start+marker.length);
  if(end<0) fail(`module end missing: ${name}`); return source.slice(start,end);
}
function loadEvidence(source){
  let exported=null;
  const ctx={SimCore:{define:(name,fn)=>{ if(name!=='evidence') fail(`unexpected module ${name}`); const module={exports:{}}; fn(()=>{throw new Error('Evidence must not require another module');},module,module.exports); exported=module.exports; }}};
  vm.runInNewContext(moduleBlock(source,'evidence'),ctx);
  return exported;
}

assert(newSource.includes('//@version 0.63.19'),'version missing');
assert(newSource.includes('// v0.63.19 Evidence Fence:'),'changelog missing');
assert(newSource.includes('// - Evidence: authoritative request-message resolution + safe request-only source fencing'),'module list missing Evidence');
assert(newSource.includes("evidence: Object.freeze({ owns: 'authoritative request-message resolution and safe request-only source fencing'"),'Evidence contract missing');
assert(!newSource.includes('// EVIDENCE_MAPPING_PROBE_BEGIN'),'legacy external probe block retained');
assert(!newSource.includes('buildEvidenceMappingProbe('),'legacy probe call retained');
assert(newSource.includes("const evidenceRules = SimCore.require('evidence');"),'Evidence runtime require missing');
assert(newSource.includes('evidenceRules.inspectAndFence(messages, chat?.message || [], result.state.pending, sendIndex, textMessageContent)'),'request fence call missing');
assert(newSource.includes('source_event_identity_and_facts=current_lineage_root+CURRENT_SOURCE_EVIDENCE_when_present'),'source prompt not retargeted');
assert(newSource.includes('specific_event_example_scene_action_item_quote_or_outcome_requires_CURRENT_SOURCE_EVIDENCE_support_when_present_else_current_root_support=1'),'specific evidence prompt not retargeted');
assert(newSource.includes('`Evidence fence: ${evidenceFence ?'),'Evidence fence diagnostic missing');
assert(!newSource.includes('messages[rootIndex]'),'raw lineage index used directly on request messages');

const frozen=['kernel','store','lifecycle','time','frame','recurrence','lineage','handoff','community','reaction','structure','recovery','session','ops'];
for(const name of frozen) assert(moduleBlock(oldSource,name)===moduleBlock(newSource,name),`frozen module changed: ${name}`);
assert(moduleBlock(oldSource,'contracts')!==moduleBlock(newSource,'contracts'),'Contracts should declare Evidence ownership');
assert(moduleBlock(oldSource,'prompt')!==moduleBlock(newSource,'prompt'),'Prompt should retarget the two provenance lines');
for(const t of ['Risuai.getChatFromIndex','Risuai.setChatToIndex','pluginStorage',"addRisuReplacer('beforeRequest'", "addRisuScriptHandler('output'",'setInterval(','setTimeout(']) {
  assert(count(oldSource,t)===count(newSource,t),`host/storage/timer call-site changed: ${t}`);
}

const evidence=loadEvidence(newSource);
const getText=m=>m?.content??m?.data??m?.text??'';
const pending={active:true,mode:'C',requestLineageRootIndex:0,requestLineageSourceKind:'CHAIN'};
const root='한편 현재 사건의 루트 사용자 메시지이며 Evidence Fence 안전 경계를 검증하기 위해 충분히 길고 서로 다른 문장을 포함한다.';
const assistant=[
  '# 응답','## 볼륨 63: 테스트','### 챕터 9: 테스트','#### Chatindex: 782∮',
  'SOURCE START alpha one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen.',
  'FIRST GAP unique host transform region qwerty asdfgh zxcvbn lorem ipsum dolor sit amet consectetur adipiscing elit.',
  'SOURCE MIDDLE beta twenty one twenty two twenty three twenty four twenty five twenty six twenty seven twenty eight.',
  'SECOND GAP more unique material orange violet silver cobalt cedar maple river mountain cloud horizon lantern.',
  'SOURCE END gamma thirty one thirty two thirty three thirty four thirty five thirty six thirty seven thirty eight.',
  '<Knowledge>tail marker remains authoritative and stable for the final ending anchor.</Knowledge>'
].join('\n');
const chat=[{role:'user',content:root},{role:'char',content:assistant},{role:'user',content:'[커뮤니티] 런닝맨 반응'}];
const norm=evidence.normalize;
const an=norm(assistant);
assert(an.length>500,'fixture too short');
const transformed=an.slice(0,110)+an.slice(120); // internal 10-char host transformation; boundaries preserved
const rootNormalized='  '+root.replace(/ /g,'   ')+'  ';

const safeRequest=[
  {role:'system',content:'system context remains untouched'},
  {role:'user',content:rootNormalized},
  {role:'assistant',content:transformed},
  {role:'user',content:'[커뮤니티] 런닝맨 반응'},
];
const safeBefore=JSON.parse(JSON.stringify(safeRequest));
const safe=evidence.inspectAndFence(safeRequest,chat,pending,2,getText);
assert(safe.mapping.status==='TRANSFORMED','combined mapping should remain TRANSFORMED');
assert(safe.mapping.rootUserShape==='NORMALIZED'&&safe.mapping.rootUserRequestIndex===1&&safe.mapping.rootUserRequestRole==='user','root identity mapping failed');
assert(safe.mapping.sourceAssistantShape==='TRANSFORMED'&&safe.mapping.sourceAssistantRequestIndex===2&&safe.mapping.sourceAssistantRequestRole==='assistant','source assistant mapping failed');
assert(safe.mapping.sourceAssistantAnchorMask==='SME','source anchors must be SME');
assert(safe.mapping.sourceAssistantLeadingGap===0&&safe.mapping.sourceAssistantTrailingGap===0,'safe fixture must have zero outer gaps');
assert(safe.mapping.sourceAssistantNormChars-safe.mapping.sourceAssistantRequestNormChars===10,'expected 10-char normalized delta');
assert(safe.fence.status==='APPLIED'&&safe.fence.reason==='safe-whole-message','safe boundary did not apply fence');
assert(safe.fence.requestIndex===2&&safe.fence.normDelta===10,'fence telemetry wrong');
assert(safeRequest[2].content===`${evidence.FENCE_OPEN}\n${transformed}\n${evidence.FENCE_CLOSE}`,'fence must wrap the existing host-transformed request body verbatim');
assert(safeRequest[0].content===safeBefore[0].content&&safeRequest[1].content===safeBefore[1].content&&safeRequest[3].content===safeBefore[3].content,'fence touched unrelated request messages');
assert(!JSON.stringify(safe).includes('SOURCE START alpha'),'diagnostics retained source body');

const merged=[
  {role:'system',content:'sys'},
  {role:'user',content:rootNormalized},
  {role:'assistant',content:`MEMORY WRAP ${transformed} TRAILING MERGED CONTEXT`},
  {role:'user',content:'[커뮤니티] 런닝맨 반응'},
];
const mergedOriginal=merged[2].content;
const mergedResult=evidence.inspectAndFence(merged,chat,pending,2,getText);
assert(mergedResult.fence.status==='SKIPPED'&&mergedResult.fence.reason==='unsafe-source-boundary','merged context must fail open');
assert(merged[2].content===mergedOriginal,'unsafe merged request was mutated');

const ambiguous=[
  {role:'user',content:rootNormalized},
  {role:'assistant',content:transformed},
  {role:'assistant',content:transformed},
  {role:'user',content:'[커뮤니티] 런닝맨 반응'},
];
const ambiguousOriginal=JSON.stringify(ambiguous);
const ambiguousResult=evidence.inspectAndFence(ambiguous,chat,pending,2,getText);
assert(ambiguousResult.mapping.sourceAssistantShape==='AMBIGUOUS','duplicate source should be ambiguous');
assert(ambiguousResult.fence.status==='SKIPPED','ambiguous source must not be fenced');
assert(JSON.stringify(ambiguous)===ambiguousOriginal,'ambiguous request mutated');

const largeDeltaText=an.slice(0,110)+an.slice(210);
const largeDelta=[{role:'user',content:rootNormalized},{role:'assistant',content:largeDeltaText},{role:'user',content:'[커뮤니티] 런닝맨 반응'}];
const largeDeltaOriginal=largeDelta[1].content;
const largeDeltaResult=evidence.inspectAndFence(largeDelta,chat,pending,2,getText);
assert(largeDeltaResult.fence.status==='SKIPPED','large internal transform must fail open');
assert(largeDelta[1].content===largeDeltaOriginal,'large-delta source mutated');

const wrongRole=[{role:'user',content:rootNormalized},{role:'system',content:transformed},{role:'user',content:'[커뮤니티] 런닝맨 반응'}];
const wrongRoleResult=evidence.inspectAndFence(wrongRole,chat,pending,2,getText);
assert(wrongRoleResult.fence.status==='SKIPPED','wrong request role must fail open');

const inactive=[{role:'assistant',content:transformed}];
const inactiveOriginal=inactive[0].content;
const inactiveResult=evidence.inspectAndFence(inactive,chat,{...pending,mode:'A'},2,getText);
assert(inactiveResult.fence.status==='INELIGIBLE'&&inactive[0].content===inactiveOriginal,'non-Short-C request changed');

console.log('0.63.19 Evidence Fence OK; safe whole-message transformed source fenced, merged/ambiguous/large-delta/wrong-role cases fail open');
console.log('ownership freeze OK: Evidence + Contracts + two Prompt provenance lines only; Frame/Time/Lineage/Handoff/Recurrence/Session/output modules byte-identical');
console.log('behavior hygiene OK: no new host/storage/timer call sites; request body preserved verbatim inside the fence; no visible-chat/state/source retention');
