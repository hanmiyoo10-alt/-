const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

const src = fs.readFileSync('plugins/simcore/latest.js', 'utf8');
const before = fs.readFileSync('/tmp/simcore-before.js', 'utf8');

assert(src.includes('//@version 0.63.35'));
assert(src.includes('// v0.63.35 Runtime Stability Consolidation:'));
assert(src.includes('`Stability: ${stabilityStatus}'));
assert(src.includes('`Edit reconcile: ${requestBreakdown ?'));
assert(src.includes("editPath: String(edit.path || 'n/a')"));
assert(src.includes('editDidSave: !!edit.didSave'));

const expectedModules = new Set([
  'contracts','store','community','recurrence','lineage','handoff','evidence','kernel','time',
  'lifecycle','reaction','frame','structure','recovery','prompt','session','ops',
]);

function extractModules(text) {
  const re = /SimCore\.define\("([^"]+)", function \(require, module, exports\) \{/g;
  const hits = [...text.matchAll(re)];
  const out = new Map();
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index;
    const end = i + 1 < hits.length ? hits[i + 1].index : text.indexOf('\n\n(async () => {', start);
    assert(start >= 0 && end > start);
    out.set(hits[i][1], text.slice(start, end));
  }
  return out;
}

const beforeModules = extractModules(before);
const afterModules = extractModules(src);
assert.deepStrictEqual(new Set(beforeModules.keys()), expectedModules);
assert.deepStrictEqual(new Set(afterModules.keys()), expectedModules);
for (const name of expectedModules) {
  assert.strictEqual(afterModules.get(name), beforeModules.get(name), `module changed: ${name}`);
}
const frozenBytes = [...afterModules.values()].reduce((n, x) => n + Buffer.byteLength(x), 0);
const moduleDigest = crypto.createHash('sha256')
  .update([...expectedModules].sort().map((name) => `${name}:${crypto.createHash('sha256').update(afterModules.get(name)).digest('hex')}`).join('\n'))
  .digest('hex');

function between(text, startToken, endToken) {
  const a = text.indexOf(startToken);
  const b = text.indexOf(endToken, a);
  assert(a >= 0 && b > a, `${startToken} region missing`);
  return text.slice(a, b);
}

// Hot/runtime paths remain byte-identical. .35 changes diagnostics only.
for (const [start, end] of [
  ['  const beforeRequestHandler = async (messages, type) => {', "\n  await Risuai.addRisuReplacer('beforeRequest', beforeRequestHandler);"],
  ['  async function processCoreOutput(', '\n\n  const beforeRequestHandler'],
  ['  const outputHandler = async (content) => {', "\n  await Risuai.addRisuScriptHandler('output', outputHandler);"],
  ['  function captureCoreMirrorSnapshot(', '\n\n  async function reconcileManualEdit'],
  ['  await Risuai.onUnload(async () => {', "\n  console.log('[simcore/v0.63.4] initialized');"],
]) {
  assert.strictEqual(between(src, start, end), between(before, start, end), `runtime region changed: ${start}`);
}

const callTokens = [
  'Risuai.getCurrentCharacterIndex(', 'Risuai.getCurrentChatIndex(', 'Risuai.getChatFromIndex(',
  'Risuai.getCharacter(', 'Risuai.setChatToIndex(', "Risuai.addRisuReplacer('beforeRequest'",
  "Risuai.removeRisuReplacer('beforeRequest'", "Risuai.addRisuScriptHandler('output'",
  "Risuai.removeRisuScriptHandler('output'", 'Risuai.registerButton(', 'Risuai.registerSetting(',
  'Risuai.unregisterUIPart(', 'pluginStorage.getItem(', 'pluginStorage.setItem(',
  'pluginStorage.removeItem(', 'pluginStorage.keys(', 'setTimeout(', 'setInterval(', 'requestAnimationFrame(',
];
for (const token of callTokens) {
  assert.strictEqual(src.split(token).length, before.split(token).length, `call-site count changed: ${token}`);
}

// Critical ordering and refreshless lifecycle stay frozen.
assert(src.includes("await this.store.save('out', outIndex, result.state"));
assert(src.includes("markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'COMMITTED'"));
assert(src.indexOf("outputStatus: 'COMMITTED'") < src.indexOf('scheduleDeferredCoreMirror(chaIdx, chatIdx, chat, outIndex, result.state)'));
assert(src.includes("setTimeout(() => { void runDeferredMirror(); }, 0)"));
assert(src.includes('runtimeIsCurrent(epoch)'));
assert(src.includes('deferredMirrorLatestByLocation.get(locationKey) === sequence'));
assert(src.includes('deferredMirrorLatestByLocation.clear();'));
assert(src.includes("await Risuai.removeRisuReplacer('beforeRequest', beforeRequestHandler)"));
assert(src.includes("await Risuai.removeRisuScriptHandler('output', outputHandler)"));

function loadSimCore(text) {
  const start = text.indexOf('const SimCore = (() => {');
  const end = text.indexOf('\n\n(async () => {', start);
  assert(start >= 0 && end > start);
  return new Function(`${text.slice(start, end)}\nreturn SimCore;`)();
}

function activeProbe() {
  return {
    __simcorePromptProbe: true,
    active: true,
    config: { protagonist: '주인공', secondaryName: '', secondaryKeyword: '' },
  };
}

function frameText(volume, chapter, title, chatindex, timestamp = '⏱️[2029-01-01 (Mon) 01:00 PM]') {
  return `# 응답\n\n## 볼륨 ${volume}: 테스트\n### 챕터 ${chapter}: ${title}\n#### Chatindex: ${chatindex}∮\n${timestamp}\n\n본문 테스트\n\n<Knowledge>\n- 테스트 지식\n</Knowledge>`;
}

function memoryBackend() {
  const map = new Map();
  const calls = { get: 0, set: 0, remove: 0, keys: 0, setRows: [] };
  return {
    map,
    calls,
    backend: {
      async get(k) { calls.get += 1; return map.has(k) ? map.get(k) : null; },
      async set(k, v) { calls.set += 1; calls.setRows.push([k, v]); map.set(k, v); },
      async remove(k) { calls.remove += 1; map.delete(k); },
      async keys() { calls.keys += 1; return [...map.keys()]; },
    },
  };
}

async function main() {
  const SimCore = loadSimCore(src);
  const kernel = SimCore.require('kernel');
  const lifecycle = SimCore.require('lifecycle');
  const frame = SimCore.require('frame');
  const time = SimCore.require('time');
  const recovery = SimCore.require('recovery');
  const evidence = SimCore.require('evidence');
  const recurrence = SimCore.require('recurrence');
  const lineage = SimCore.require('lineage');
  const handoff = SimCore.require('handoff');
  const reaction = SimCore.require('reaction');
  const structure = SimCore.require('structure');
  const prompt = SimCore.require('prompt');
  const { SnapshotStore } = SimCore.require('store');
  const { CoreRulesetSession } = SimCore.require('session');

  // Lifecycle A/B/C golden modes.
  assert.strictEqual(lifecycle.classifyMode(kernel.initialState(), '일반 장면').mode, 'A');
  assert.strictEqual(lifecycle.classifyMode(kernel.initialState(), '[커뮤니티] 반응').mode, 'C');
  const broadcast = kernel.initialState();
  assert.strictEqual(lifecycle.classifyMode(broadcast, '[방송 시작] 오프닝').mode, 'B_START');
  assert.strictEqual(broadcast.broadcastLocked, true);
  assert.strictEqual(lifecycle.classifyMode(broadcast, '[방송 중] 계속').mode, 'B_CONTINUE');
  assert.strictEqual(lifecycle.classifyMode(broadcast, '[방송 종료] 엔딩').mode, 'B_END');
  assert.strictEqual(lifecycle.expectedCommunityBlocks('A'), 0);
  assert.strictEqual(lifecycle.expectedCommunityBlocks('C'), 1);
  assert.strictEqual(lifecycle.expectedCommunityBlocks('B_START'), 1);
  assert.strictEqual(lifecycle.expectedCommunityBlocks('B_END'), 2);

  // Frame: same-title chapter hold, volume-reset allowance, and Chatindex floor.
  const prev = frame.parseFrame(frameText(5, 8, '같은 제목', 20));
  const titleAdvance = frame.enforceContinuity(frameText(5, 9, '같은 제목', 21), prev);
  assert.strictEqual(titleAdvance.probe.regression, 'CHAPTER_TITLE_HOLD');
  assert(titleAdvance.content.includes('### 챕터 8: 같은 제목'));
  const volumeAdvance = frame.enforceContinuity(frameText(6, 1, '새 출발', 21), prev);
  assert.strictEqual(volumeAdvance.probe.regression, 'NONE');
  assert(volumeAdvance.content.includes('## 볼륨 6: 테스트'));
  assert(volumeAdvance.content.includes('### 챕터 1: 새 출발'));
  const chatRegression = frame.enforceContinuity(frameText(5, 8, '같은 제목', 19), prev);
  assert.strictEqual(chatRegression.probe.regression, 'CHATINDEX');
  assert(chatRegression.content.includes('#### Chatindex: 20∮'));

  // Time: final scene promotes only for a valid monotonic timestamp sequence.
  const monotonic = `# 응답\n⏱️[2029-01-01 (Mon) 01:00 PM]\n장면 A\n⏱️[2029-01-01 (Mon) 02:30 PM]\n장면 B`;
  const seqGood = time.narrativeTimestampSequence(monotonic);
  assert.strictEqual(seqGood.tailStatus, 'MONOTONIC');
  assert.strictEqual(seqGood.sceneCount, 1);
  assert.strictEqual(seqGood.candidate, '⏱️[2029-01-01 (Mon) 02:30 PM]');
  const seqBack = time.narrativeTimestampSequence(`# 응답\n⏱️[2029-01-01 (Mon) 02:00 PM]\nA\n⏱️[2029-01-01 (Mon) 01:30 PM]\nB`);
  assert.strictEqual(seqBack.tailStatus, 'SKIPPED_NON_MONOTONIC');
  assert.strictEqual(seqBack.candidate, '⏱️[2029-01-01 (Mon) 02:00 PM]');
  const seqMalformed = time.narrativeTimestampSequence(`# 응답\n⏱️[2029-01-01 (Mon) 02:00 PM]\nA\n⏱️[2029-01-01 (Mon) 02:99 PM]\nB`);
  assert.strictEqual(seqMalformed.tailStatus, 'SKIPPED_MALFORMED');

  // Response envelope: later scene timestamps remain legal; Thoughts policies stay frozen.
  const validA = frameText(1, 1, '시작', 1);
  const laterSceneA = validA.replace('본문 테스트', '본문 테스트\n\n⏱️[2029-01-01 (Mon) 02:00 PM]\n후속 장면');
  assert.strictEqual(structure.responseEnvelopeScope(laterSceneA).frameOk, true);
  assert.deepStrictEqual(structure.validateStructure(laterSceneA, { active: true, mode: 'A' }), []);
  const completeThoughts = recovery.classifyPreamble('<Thoughts>analysis</Thoughts>\n', 1, true);
  assert.strictEqual(completeThoughts.kind, 'THOUGHTS_COMPAT');
  assert.strictEqual(completeThoughts.policy, 'SILENT_COMPAT');
  const partialThoughts = recovery.classifyPreamble('<Thoughts>analysis\n', 1, true);
  assert.strictEqual(partialThoughts.kind, 'THOUGHTS_COMPAT');
  assert.strictEqual(partialThoughts.policy, 'SAFE_ENVELOPE_COMPAT');
  assert.strictEqual(recovery.classifyPreamble('unknown preamble', 1, true).policy, 'WARNING');
  assert.strictEqual(recovery.classifyPreamble('<Thoughts>x</Thoughts>', 0, false).policy, 'FAIL_OPEN');
  const completeEnvelope = recovery.canonicalizeResponseEnvelope(`<Thoughts>analysis</Thoughts>\n${validA}`, { active: true, mode: 'A' });
  assert.strictEqual(completeEnvelope.resolved, true);
  assert.strictEqual(completeEnvelope.preambleProvenance.policy, 'SILENT_COMPAT');
  assert.deepStrictEqual(completeEnvelope.diagnostics, []);
  const partialEnvelope = recovery.canonicalizeResponseEnvelope(`<Thoughts>analysis\n${validA}`, { active: true, mode: 'A' });
  assert.strictEqual(partialEnvelope.resolved, true);
  assert.strictEqual(partialEnvelope.preambleProvenance.policy, 'SAFE_ENVELOPE_COMPAT');
  assert.strictEqual(partialEnvelope.diagnostics.length, 1);

  // Evidence: exact safe source fences in-place; unsafe root boundary fails open.
  const rootText = 'ROOT '.repeat(20) + 'authoritative current event root';
  const sourceText = 'SOURCE '.repeat(24) + 'authoritative assistant evidence for current event';
  const chatRows = [
    { role: 'user', content: rootText },
    { role: 'assistant', content: sourceText },
    { role: 'user', content: '[커뮤니티] 현재 반응' },
  ];
  const requestRows = chatRows.map((x) => ({ ...x }));
  const pendingEvidence = { active: true, mode: 'C', requestLineageRootIndex: 0, requestLineageSourceKind: 'CHAIN' };
  const fenced = evidence.inspectAndFence(requestRows, chatRows, pendingEvidence, 2, (m) => m.content);
  assert.strictEqual(fenced.fence.status, 'APPLIED');
  assert.strictEqual(fenced.fence.reason, 'safe-whole-message');
  assert(requestRows[1].content.startsWith('<CURRENT_SOURCE_EVIDENCE>\n'));
  const unsafeRequestRows = [
    { role: 'user', content: `PREFIX ${rootText}` },
    { role: 'assistant', content: sourceText },
    { role: 'user', content: '[커뮤니티] 현재 반응' },
  ];
  const skipped = evidence.inspectAndFence(unsafeRequestRows, chatRows, pendingEvidence, 2, (m) => m.content);
  assert.strictEqual(skipped.fence.status, 'SKIPPED');
  assert.strictEqual(skipped.fence.reason, 'unsafe-root-boundary');

  // Bundled request snapshot stays exactly one write with {snapshotVersion, pre, send}.
  const isolated = memoryBackend();
  const isolatedStore = new SnapshotStore(isolated.backend, 'golden', 80);
  const metric = {};
  await isolatedStore.saveTurn(4, { a: 1 }, { b: 2 }, { prune: false, metric });
  assert.strictEqual(isolated.calls.set, 1);
  assert.strictEqual(isolated.calls.setRows[0][0], 'golden:turn:4');
  const bundled = JSON.parse(isolated.calls.setRows[0][1]);
  assert.deepStrictEqual(bundled, { snapshotVersion: 1, pre: { a: 1 }, send: { b: 2 } });
  assert.strictEqual(metric.payloadChars, isolated.calls.setRows[0][1].length);

  // Recurrence/lineage/handoff stay mode-scoped and source-aware.
  const template1 = '[커뮤니티] 반응 (현재 사건의 변화와 강조 포인트, 게시글 구성, 댓글 구성, 반응 수치를 각각 세세하게 보여줘 2029)';
  const template2 = '[커뮤니티] 반응 (현재 사건의 변화와 강조 포인트, 게시글 구성, 댓글 구성, 반응 수치를 각각 세세하게 보여줘 2030)';
  const fp1 = recurrence.templateFingerprint(template1, 'C');
  const fp2 = recurrence.templateFingerprint(template2, 'C');
  assert.strictEqual(fp1.eligible, true);
  assert.strictEqual(fp1.hash, fp2.hash);
  const lineageState = kernel.initialState();
  const rootLine = lineage.observe(lineageState, '일반 장면', 'A', 10);
  assert.strictEqual(rootLine.sourceKind, 'ROOT');
  const chainLine = lineage.observe(lineageState, '[커뮤니티] 졸업 반응', 'C', 12);
  assert.strictEqual(chainLine.sourceKind, 'CHAIN');
  assert.strictEqual(chainLine.rootMode, 'A');
  assert.strictEqual(chainLine.rootIndex, 10);
  assert.strictEqual(chainLine.parentMode, 'A');
  assert.strictEqual(chainLine.parentIndex, 10);
  assert.strictEqual(chainLine.depth, 1);
  const h1 = handoff.observe(lineageState, '[커뮤니티] 졸업 반응', 'C', chainLine, { eligible: false });
  assert.strictEqual(h1.eligible, true);
  assert.strictEqual(h1.seen, false);
  assert.strictEqual(h1.reason, 'first');
  lineage.observe(lineageState, '새 일반 장면', 'A', 20);
  const newChain = lineage.observe(lineageState, '[커뮤니티] 졸업 반응', 'C', 22);
  const h2 = handoff.observe(lineageState, '[커뮤니티] 졸업 반응', 'C', newChain, { eligible: false });
  assert.strictEqual(h2.newSource, true);
  assert.strictEqual(h2.reason, 'same-short-request-new-source');

  // Reaction floor remains per-family and deterministic.
  assert.strictEqual(reaction.parseReactionNumber('1.5M'), 1500000);
  const remap = reaction.normalizeSectionValues([50, 150], 100);
  assert.strictEqual(remap.mode, 'affine_remap');
  assert(remap.values.every((n) => n > 100));

  // Prompt compiler still serializes the existing mode contract only.
  const cPrepared = lifecycle.prepareTurn(kernel.initialState(), '[커뮤니티] 현재 반응을 자세히 보여줘', activeProbe(), 5);
  const cPrompt = prompt.renderRuntimePrompt(cPrepared);
  assert(cPrompt.includes('mode=C'));
  assert(cPrompt.includes('community_blocks_expected=1'));
  assert(cPrompt.includes('mode_c_after_frame=COMMUNITY_immediately'));
  assert(cPrompt.includes('knowledge_required=1'));

  // End-to-end Session: request bundled snapshot -> MEMORY_FAST output -> authoritative out snapshot.
  const mem = memoryBackend();
  const cs = new CoreRulesetSession(mem.backend, { prefix: 'sim:golden', keepN: 80 });
  const history0 = [{ role: 'user', content: '첫 장면' }];
  const sendDetail0 = {};
  const send0 = await cs.onSend(0, '첫 장면', activeProbe(), sendDetail0, history0);
  assert.strictEqual(send0.active, true);
  assert.strictEqual(sendDetail0.restoreReason, 'forward');
  assert.strictEqual(sendDetail0.mustRestorePre, false);
  assert.strictEqual(mem.calls.set, 1);
  const outDetail = {};
  const processed = await cs.processOutput(1, validA, outDetail);
  assert.strictEqual(processed.active, true);
  assert.strictEqual(outDetail.stateLoadSource, 'memory-fast');
  assert.strictEqual(mem.calls.set, 2);
  assert(mem.map.has('sim:golden:turn:0'));
  assert(mem.map.has('sim:golden:out:1'));

  // Unedited output is the no-I/O fast path; a real manual edit rebuilds from durable snapshots.
  const sameDetail = {};
  const sameResult = await cs.reconcileEditedOutput(1, processed.content, sameDetail);
  assert.strictEqual(sameResult.changed, false);
  assert.strictEqual(sameDetail.path, 'same-fast');
  assert.strictEqual(sameDetail.didSave, false);
  const edited = processed.content.replace('본문 테스트', '본문 수정 테스트');
  const editDetail = {};
  const editedResult = await cs.reconcileEditedOutput(1, edited, editDetail);
  assert.strictEqual(editedResult.changed, true);
  assert.strictEqual(editDetail.path, 'manual-edit-rebuilt');
  assert.strictEqual(editDetail.didSave, true);
  assert.strictEqual(cs.current.manualEditRevision, 1);

  // Forward / repeat-send / rewind restore reasons remain deterministic.
  const history2 = [
    { role: 'user', content: '첫 장면' },
    { role: 'assistant', content: edited },
    { role: 'user', content: '두번째 장면' },
  ];
  const forwardDetail = {};
  await cs.onSend(2, '두번째 장면', activeProbe(), forwardDetail, history2);
  assert.strictEqual(forwardDetail.restoreReason, 'forward');
  assert.strictEqual(forwardDetail.mustRestorePre, false);
  const repeatDetail = {};
  await cs.onSend(2, '두번째 장면', activeProbe(), repeatDetail, history2);
  assert.strictEqual(repeatDetail.restoreReason, 'repeat-send');
  assert.strictEqual(repeatDetail.mustRestorePre, true);
  assert.strictEqual(repeatDetail.existingPre, true);
  const rewindDetail = {};
  await cs.onSend(0, '첫 장면 다시', activeProbe(), rewindDetail, history0);
  assert.strictEqual(rewindDetail.restoreReason, 'rewind');
  assert.strictEqual(rewindDetail.mustRestorePre, true);
  assert.strictEqual(rewindDetail.existingPre, true);

  // A fresh session without matching in-memory pending state uses durable send fallback.
  const fallbackSession = new CoreRulesetSession(mem.backend, { prefix: 'sim:golden', keepN: 80 });
  fallbackSession.current = kernel.initialState();
  const fallbackDetail = {};
  const fallbackState = await fallbackSession.stateForOutput(3, fallbackDetail);
  assert.strictEqual(fallbackDetail.stateLoadSource, 'storage-fallback');
  assert.strictEqual(fallbackState.pending?.sendIndex, 2);

  console.log('SimCore 0.63.35 golden behavioral contracts: PASS');
  console.log(`frozen modules: ${expectedModules.size} bytes: ${frozenBytes} digest: ${moduleDigest}`);
  console.log('covered: lifecycle A/B/C · frame · time · structure · Thoughts · evidence · store · recurrence · lineage/handoff · reaction · prompt · memory/storage output · manual edit · repeat/rewind · deferred lifecycle');
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
