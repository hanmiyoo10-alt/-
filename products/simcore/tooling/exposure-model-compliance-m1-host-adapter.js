//@name simcore_exposure_m1_eval_adapter
//@display-name SimCore Exposure M1 Eval Adapter
//@api 3.0
//@version 0.1.0

(async () => {
  'use strict';

  const ADAPTER_VERSION = 'EXPOSURE_MODEL_COMPLIANCE_M1_HOST_ADAPTER_2026-09-01';
  const EXPECTED_CANDIDATE_HASH = '3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc';
  const SOURCE_PROVENANCE_ANCHOR =
    'outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;boundary_applies_title_body_comments_descriptions_Knowledge=1';
  const EXPOSURE_LINES = Object.freeze([
    'short_community_b_exposure_scope=direct_root_broadcast_turn',
    'short_community_b_audience_exposure_basis=current_source_visible_broadcast_prose+current_user_explicit_public_disclosure;mere_mention_or_reaction_request_does_not_publish_hidden_fact=1',
    'short_community_b_source_community_role=derived_social_context_not_event_fact_authority;rumor_opinion_may_recur_only_as_attributed_rumor_opinion_or_reaction=1',
    'short_community_b_source_knowledge_role=continuity_context_not_audience_exposure_authority;reference_context_alone_not_public_knowledge_certificate=1',
    'short_community_b_unknown_exposure=do_not_assert_as_known_public_fact;event_scope_expansion_does_not_expand_audience_exposure=1',
    'short_community_b_visible_cue_inference=allowed_as_inference_opinion_joke;hidden_private_state_not_confirmed_without_exposure=1',
  ]);

  const runtime = {
    permissionGranted: false,
    replacerRegistered: false,
    bodyInterceptorRegistered: false,
    bodyInterceptorId: null,
    outputListenerRegistered: false,
    uiPartId: null,
    activeRun: null,
    latestReceipt: null,
    receiptHistory: [],
    initError: null,
    unloaded: false,
  };

  function stable(value, seen = new WeakSet()) {
    if (value === null || value === undefined) return value ?? null;
    if (typeof value === 'bigint') return String(value);
    if (typeof value !== 'object') return value;
    if (seen.has(value)) return '[CIRCULAR]';
    seen.add(value);
    if (Array.isArray(value)) {
      const out = value.map((item) => stable(item, seen));
      seen.delete(value);
      return out;
    }
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (typeof item === 'function' || typeof item === 'symbol') continue;
      out[key] = stable(item, seen);
    }
    seen.delete(value);
    return out;
  }

  function stableJson(value) { return JSON.stringify(stable(value)); }

  async function sha256Utf8(value) {
    if (!globalThis.crypto?.subtle || typeof TextEncoder !== 'function') throw new Error('WEB_CRYPTO_UNAVAILABLE');
    const bytes = new TextEncoder().encode(String(value));
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function hashJson(value) { return sha256Utf8(stableJson(value)); }
  function lineMatches(content, target) { return String(content ?? '').split(/\r?\n/).filter((line) => line === target).length; }
  function countExactLineAcrossMessages(messages, target) {
    return (Array.isArray(messages) ? messages : []).reduce((sum, message) => sum + lineMatches(message?.content, target), 0);
  }
  function candidatePresence(messages) { return EXPOSURE_LINES.map((line) => countExactLineAcrossMessages(messages, line)); }

  function locateAnchor(messages) {
    const matches = [];
    const rows = Array.isArray(messages) ? messages : [];
    rows.forEach((message, messageIndex) => {
      String(message?.content ?? '').split(/\r?\n/).forEach((line, lineIndex) => {
        if (line === SOURCE_PROVENANCE_ANCHOR) matches.push({ messageIndex, lineIndex, role: String(message?.role || '') });
      });
    });
    return matches;
  }

  function applyE6(messages) {
    const anchors = locateAnchor(messages);
    if (anchors.length !== 1) return { ok: false, reason: anchors.length === 0 ? 'ANCHOR_MISSING' : 'ANCHOR_AMBIGUOUS', messages };
    if (anchors[0].role !== 'system') return { ok: false, reason: 'ANCHOR_NOT_SYSTEM', messages };
    const beforePresence = candidatePresence(messages);
    if (beforePresence.some((count) => count !== 0)) return { ok: false, reason: 'CANDIDATE_ALREADY_PRESENT', messages };
    const { messageIndex, lineIndex } = anchors[0];
    const originalMessage = messages[messageIndex];
    const originalContent = String(originalMessage?.content ?? '');
    const newline = originalContent.includes('\r\n') ? '\r\n' : '\n';
    const lines = originalContent.split(/\r?\n/);
    lines.splice(lineIndex + 1, 0, ...EXPOSURE_LINES);
    const next = messages.slice();
    next[messageIndex] = { ...originalMessage, content: lines.join(newline) };
    const afterPresence = candidatePresence(next);
    if (afterPresence.some((count) => count !== 1)) return { ok: false, reason: 'CANDIDATE_POSTCONDITION_FAILED', messages };
    return { ok: true, reason: 'E6_INSERTED', messages: next, anchorMessageIndex: messageIndex, anchorLineIndex: lineIndex, beforePresence, afterPresence };
  }

  function pickMessageText(message) {
    if (!message || typeof message !== 'object') return '';
    if (typeof message.data === 'string') return message.data;
    if (typeof message.content === 'string') return message.content;
    return '';
  }

  function providerModelIdentifier(body, outputMessage) {
    const bodyModel = body && typeof body === 'object' && typeof body.model === 'string' ? body.model : null;
    if (bodyModel) return bodyModel;
    const info = outputMessage?.generationInfo;
    for (const key of ['model', 'modelName', 'modelId', 'providerModel']) {
      if (typeof info?.[key] === 'string' && info[key]) return info[key];
    }
    return null;
  }

  function settingsProjection(db) {
    const source = db && typeof db === 'object' ? db : {};
    return {
      temperature: source.temperature ?? null,
      maxContext: source.maxContext ?? null,
      maxResponse: source.maxResponse ?? null,
      frequencyPenalty: source.frequencyPenalty ?? null,
      PresensePenalty: source.PresensePenalty ?? null,
      seperateModelsForAxModels: source.seperateModelsForAxModels ?? null,
      seperateModels: source.seperateModels ?? null,
    };
  }

  function characterReferenceProjection(character) {
    if (!character || typeof character !== 'object') return null;
    const omitted = new Set(['chat', 'chats', 'message', 'messages', 'scriptstate']);
    const out = {};
    for (const key of Object.keys(character).sort()) {
      if (omitted.has(key)) continue;
      const value = character[key];
      if (typeof value === 'function' || typeof value === 'symbol') continue;
      out[key] = value;
    }
    return out;
  }

  function boundedPush(array, value, max = 8) {
    array.push(value);
    if (array.length > max) array.splice(0, array.length - max);
  }

  function publicStatus() {
    const active = runtime.activeRun;
    return {
      adapterVersion: ADAPTER_VERSION,
      permissionGranted: runtime.permissionGranted,
      replacerRegistered: runtime.replacerRegistered,
      bodyInterceptorRegistered: runtime.bodyInterceptorRegistered,
      outputListenerRegistered: runtime.outputListenerRegistered,
      unloaded: runtime.unloaded,
      initError: runtime.initError,
      activeRun: active ? {
        runId: active.runId,
        condition: active.condition,
        expectedSyntheticScenarioFingerprint: active.expectedSyntheticScenarioFingerprint,
        state: active.state,
        invalidReason: active.invalidReason,
        beforeRequestInvocationCount: active.beforeRequestInvocationCount,
        providerBodyCaptureCount: active.providerBodyCaptures.length,
      } : null,
      latestReceipt: runtime.latestReceipt,
      receiptHistoryCount: runtime.receiptHistory.length,
    };
  }

  async function assertCandidateIdentity() {
    const actual = await sha256Utf8(EXPOSURE_LINES.join('\n'));
    if (actual !== EXPECTED_CANDIDATE_HASH) throw new Error(`CANDIDATE_HASH_MISMATCH:${actual}`);
    return actual;
  }

  async function armRun({ runId, condition, expectedSyntheticScenarioFingerprint } = {}) {
    if (runtime.unloaded) throw new Error('ADAPTER_UNLOADED');
    if (!runtime.permissionGranted || !runtime.replacerRegistered) throw new Error('ADAPTER_NOT_READY');
    if (runtime.activeRun) throw new Error('RUN_ALREADY_ACTIVE');
    const normalizedRunId = String(runId || '').trim();
    const normalizedCondition = String(condition || '').trim().toUpperCase();
    const scenarioFingerprint = String(expectedSyntheticScenarioFingerprint || '').trim().toLowerCase();
    if (!normalizedRunId) throw new Error('RUN_ID_REQUIRED');
    if (!['B0', 'E6'].includes(normalizedCondition)) throw new Error('CONDITION_INVALID');
    if (!/^[a-f0-9]{64}$/.test(scenarioFingerprint)) throw new Error('SCENARIO_FINGERPRINT_INVALID');
    const candidateHash = await assertCandidateIdentity();
    const [character, db] = await Promise.all([
      risuai.getCharacter(),
      risuai.getDatabase(['temperature', 'maxContext', 'maxResponse', 'frequencyPenalty', 'PresensePenalty', 'seperateModelsForAxModels', 'seperateModels']),
    ]);
    const settings = settingsProjection(db);
    const characterProjection = characterReferenceProjection(character);
    runtime.activeRun = {
      runId: normalizedRunId,
      condition: normalizedCondition,
      expectedSyntheticScenarioFingerprint: scenarioFingerprint,
      candidateContractHash: candidateHash,
      state: 'ARMED',
      invalidReason: null,
      armedAt: Date.now(),
      firstBeforeRequestAt: null,
      requestType: null,
      beforeRequestInvocationCount: 0,
      beforeRequestInputFingerprint: null,
      beforeRequestOutputFingerprint: null,
      anchorMessageIndex: null,
      anchorLineIndex: null,
      candidatePresenceBefore: null,
      candidatePresenceAfter: null,
      providerBodyCaptures: [],
      modelSettingsFingerprint: await hashJson(settings),
      characterReferenceFingerprint: await hashJson(characterProjection),
    };
    return publicStatus();
  }

  function invalidateActive(reason) {
    if (!runtime.activeRun) return;
    runtime.activeRun.invalidReason = String(reason || 'UNKNOWN');
    runtime.activeRun.state = 'INVALID';
  }

  async function beforeRequestReplacer(messages, type) {
    const active = runtime.activeRun;
    if (!active || !['ARMED', 'REQUEST_SEEN'].includes(active.state)) return messages;
    const inputFingerprint = await hashJson(messages);
    if (active.beforeRequestInputFingerprint && active.beforeRequestInputFingerprint !== inputFingerprint) {
      invalidateActive('MULTI_REQUEST_COLLISION');
      return messages;
    }
    active.beforeRequestInvocationCount += 1;
    active.firstBeforeRequestAt ??= Date.now();
    active.requestType ??= String(type || '');
    if (active.requestType !== String(type || '')) {
      invalidateActive('REQUEST_TYPE_CHANGED');
      return messages;
    }
    let output = messages;
    let anchorMessageIndex = null;
    let anchorLineIndex = null;
    let beforePresence = candidatePresence(messages);
    let afterPresence = beforePresence.slice();
    if (active.condition === 'B0') {
      if (beforePresence.some((count) => count !== 0)) {
        invalidateActive('B0_CANDIDATE_ALREADY_PRESENT');
        return messages;
      }
      const anchors = locateAnchor(messages);
      if (anchors.length !== 1 || anchors[0].role !== 'system') {
        invalidateActive(anchors.length === 0 ? 'ANCHOR_MISSING' : (anchors.length > 1 ? 'ANCHOR_AMBIGUOUS' : 'ANCHOR_NOT_SYSTEM'));
        return messages;
      }
      anchorMessageIndex = anchors[0].messageIndex;
      anchorLineIndex = anchors[0].lineIndex;
    } else {
      const applied = applyE6(messages);
      if (!applied.ok) {
        invalidateActive(applied.reason);
        return messages;
      }
      output = applied.messages;
      anchorMessageIndex = applied.anchorMessageIndex;
      anchorLineIndex = applied.anchorLineIndex;
      beforePresence = applied.beforePresence;
      afterPresence = applied.afterPresence;
    }
    active.beforeRequestInputFingerprint = inputFingerprint;
    active.beforeRequestOutputFingerprint = await hashJson(output);
    active.anchorMessageIndex = anchorMessageIndex;
    active.anchorLineIndex = anchorLineIndex;
    active.candidatePresenceBefore = beforePresence;
    active.candidatePresenceAfter = afterPresence;
    active.state = 'REQUEST_SEEN';
    return output;
  }

  async function providerBodyInterceptor(body, type) {
    const active = runtime.activeRun;
    if (!active || active.state !== 'REQUEST_SEEN') return body;
    if (active.requestType && String(type || '') !== active.requestType) return body;
    const bodyText = stableJson(body);
    const lineMatchVector = EXPOSURE_LINES.map((line) => bodyText.includes(line) ? 1 : 0);
    active.providerBodyCaptures.push({
      at: Date.now(),
      type: String(type || ''),
      fingerprint: await sha256Utf8(bodyText),
      modelIdentifier: body && typeof body === 'object' && typeof body.model === 'string' ? body.model : null,
      candidateLineMatchVector: lineMatchVector,
    });
    if (active.providerBodyCaptures.length > 8) active.providerBodyCaptures.splice(0, active.providerBodyCaptures.length - 8);
    return body;
  }

  async function outputListener({ chat, messageIndex } = {}) {
    const active = runtime.activeRun;
    if (!active || active.state !== 'REQUEST_SEEN') return;
    const outputMessage = Array.isArray(chat?.message) && Number.isInteger(Number(messageIndex)) ? chat.message[Number(messageIndex)] : null;
    const generatedOutput = pickMessageText(outputMessage);
    const providerCapture = active.providerBodyCaptures.at(-1) || null;
    const outputAt = Date.now();
    const expectedProviderMatches = active.condition === 'E6' ? 6 : 0;
    const observedProviderMatches = providerCapture ? providerCapture.candidateLineMatchVector.reduce((sum, value) => sum + value, 0) : null;
    const providerPropagationStatus = providerCapture == null ? 'NOT_OBSERVED' : observedProviderMatches === expectedProviderMatches ? 'MATCH' : 'MISMATCH';
    const receipt = {
      schema: 1,
      adapterVersion: ADAPTER_VERSION,
      runId: active.runId,
      condition: active.condition,
      expectedSyntheticScenarioFingerprint: active.expectedSyntheticScenarioFingerprint,
      candidateContractHash: active.condition === 'E6' ? active.candidateContractHash : null,
      materializationStatus: generatedOutput ? 'HOST_CAPTURE_COMPLETE' : 'HOST_CAPTURE_PARTIAL',
      requestStage: 'BEFORE_REQUEST_PRE_REQUEST_TRIGGER_PRE_PROVIDER_REFORMAT',
      requestType: active.requestType,
      beforeRequestInvocationCount: active.beforeRequestInvocationCount,
      beforeRequestInputFingerprint: active.beforeRequestInputFingerprint,
      flattenedMessageFingerprint: active.beforeRequestOutputFingerprint,
      actualHostRequestFingerprint: providerCapture?.fingerprint || null,
      providerBodyCaptureCount: active.providerBodyCaptures.length,
      providerPropagationStatus,
      providerCandidateLineMatchCount: observedProviderMatches,
      modelIdentifier: providerModelIdentifier(providerCapture ? { model: providerCapture.modelIdentifier } : null, outputMessage),
      modelSettingsFingerprint: active.modelSettingsFingerprint,
      characterReferenceFingerprint: active.characterReferenceFingerprint,
      generatedOutput,
      outputFingerprint: generatedOutput ? await sha256Utf8(generatedOutput) : null,
      outputStructuralStatus: 'NOT_EVALUATED_BY_ADAPTER',
      anchorMessageIndex: active.anchorMessageIndex,
      anchorLineIndex: active.anchorLineIndex,
      candidatePresenceBefore: active.candidatePresenceBefore,
      candidatePresenceAfter: active.candidatePresenceAfter,
      retryObserved: active.beforeRequestInvocationCount > 1 || active.providerBodyCaptures.length > 1,
      invalidReason: active.invalidReason,
      timing: {
        armedAt: active.armedAt,
        firstBeforeRequestAt: active.firstBeforeRequestAt,
        committedOutputAt: outputAt,
        requestStageToCommittedOutputMs: active.firstBeforeRequestAt == null ? null : Math.max(0, outputAt - active.firstBeforeRequestAt),
      },
    };
    runtime.latestReceipt = receipt;
    boundedPush(runtime.receiptHistory, receipt);
    runtime.activeRun = null;
  }

  function disarm(reason = 'MANUAL_DISARM') {
    if (!runtime.activeRun) return false;
    runtime.activeRun.state = 'DISARMED';
    runtime.activeRun.invalidReason = String(reason || 'MANUAL_DISARM');
    runtime.activeRun = null;
    return true;
  }
  function receiptHistory() { return runtime.receiptHistory.slice(); }

  function renderControlPanel() {
    if (typeof document === 'undefined') return;
    document.body.innerHTML = `
      <main style="font-family:system-ui;padding:18px;max-width:820px;margin:0 auto">
        <h2>SimCore Exposure M1 Eval Adapter</h2>
        <p>DISARMED by default. Arms exactly one eval run. Production SimCore bytes are untouched.</p>
        <label>Run ID<br><input id="runId" style="width:100%"></label><br><br>
        <label>Synthetic scenario SHA-256<br><input id="scenarioFp" style="width:100%" maxlength="64"></label><br><br>
        <label>Condition <select id="condition"><option>B0</option><option>E6</option></select></label>
        <button id="arm">Arm one run</button>
        <button id="disarm">Disarm</button>
        <button id="refresh">Refresh</button>
        <pre id="status" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>
      </main>`;
    const status = document.getElementById('status');
    const refresh = () => { status.textContent = JSON.stringify(publicStatus(), null, 2); };
    document.getElementById('arm').onclick = async () => {
      try {
        await armRun({
          runId: document.getElementById('runId').value,
          expectedSyntheticScenarioFingerprint: document.getElementById('scenarioFp').value,
          condition: document.getElementById('condition').value,
        });
      } catch (error) {
        runtime.initError = `ARM_ERROR:${error?.message || error}`;
      }
      refresh();
    };
    document.getElementById('disarm').onclick = () => { disarm(); refresh(); };
    document.getElementById('refresh').onclick = refresh;
    refresh();
  }

  const control = Object.freeze({
    arm: armRun,
    disarm,
    status: publicStatus,
    latestReceipt: () => runtime.latestReceipt,
    receipts: receiptHistory,
    constants: Object.freeze({
      adapterVersion: ADAPTER_VERSION,
      expectedCandidateHash: EXPECTED_CANDIDATE_HASH,
      sourceProvenanceAnchor: SOURCE_PROVENANCE_ANCHOR,
      exposureLines: EXPOSURE_LINES.slice(),
      requestStage: 'BEFORE_REQUEST_PRE_REQUEST_TRIGGER_PRE_PROVIDER_REFORMAT',
    }),
  });
  globalThis.__SIMCORE_EXPOSURE_M1_EVAL__ = control;

  const replacer = beforeRequestReplacer;
  const bodyInterceptor = providerBodyInterceptor;
  const listener = outputListener;

  async function cleanup() {
    if (runtime.unloaded) return;
    runtime.unloaded = true;
    disarm('UNLOAD');
    try { if (runtime.replacerRegistered) await risuai.removeRisuReplacer('beforeRequest', replacer); } catch (_) {}
    try { if (runtime.bodyInterceptorId) await risuai.unregisterBodyIntercepter(runtime.bodyInterceptorId); } catch (_) {}
    try { if (runtime.outputListenerRegistered) await risuai.removeRisuChatListener('output', listener); } catch (_) {}
    try { if (runtime.uiPartId) await risuai.unregisterUIPart(runtime.uiPartId); } catch (_) {}
    runtime.replacerRegistered = false;
    runtime.bodyInterceptorRegistered = false;
    runtime.outputListenerRegistered = false;
  }

  try {
    await assertCandidateIdentity();
    runtime.permissionGranted = await risuai.requestPluginPermission('replacer') === true;
    runtime.uiPartId = (await risuai.registerSetting(
      'SimCore Exposure M1 Eval',
      async () => { await risuai.showContainer('fullscreen'); renderControlPanel(); },
      '🧪',
      'html',
      'simcore-exposure-m1-eval',
    ))?.id || null;
    if (!runtime.permissionGranted) {
      runtime.initError = 'REPLACER_PERMISSION_DENIED';
      await risuai.onUnload(cleanup);
      return;
    }
    await risuai.addRisuReplacer('beforeRequest', replacer);
    runtime.replacerRegistered = true;
    const interceptor = await risuai.registerBodyIntercepter(bodyInterceptor);
    if (interceptor?.id) {
      runtime.bodyInterceptorId = interceptor.id;
      runtime.bodyInterceptorRegistered = true;
    }
    await risuai.addRisuChatListener('output', listener);
    runtime.outputListenerRegistered = true;
    await risuai.onUnload(cleanup);
  } catch (error) {
    runtime.initError = `INIT_ERROR:${error?.message || error}`;
    try { await cleanup(); } catch (_) {}
  }
})();
