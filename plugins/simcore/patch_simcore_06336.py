from pathlib import Path

PATHS = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

RUNTIME_MODULES = r'''
SimCore.define("runtime-contracts", function (require, module, exports) {
const cache = Object.freeze({
  requestOrder: 'FROZEN',
  runtimePromptPlacement: 'TAIL_AFTER_CURRENT_USER',
  runtimePromptPolicy: 'OBSERVE_ONLY',
  providerCache: 'UNVERIFIED',
});
const ownership = Object.freeze({
  host: 'runtime-host',
  session: 'runtime-session',
  cache: 'runtime-cache',
  mirror: 'runtime-mirror',
  hooks: 'runtime-hooks',
  probe: 'runtime-probe',
});
module.exports = { cache, ownership };
});

SimCore.define("runtime-host", function (require, module, exports) {
function createHostAdapter(Risuai) {
  return Object.freeze({
    async currentIndices() {
      const [chaIdx, chatIdx] = await Promise.all([
        Risuai.getCurrentCharacterIndex(),
        Risuai.getCurrentChatIndex(),
      ]);
      return { chaIdx, chatIdx };
    },
    getChat(chaIdx, chatIdx) { return Risuai.getChatFromIndex(chaIdx, chatIdx); },
    getCharacter() { return Risuai.getCharacter(); },
    setChat(chaIdx, chatIdx, chat) { return Risuai.setChatToIndex(chaIdx, chatIdx, chat); },
    storageBackend() {
      return {
        get: (k) => Risuai.pluginStorage.getItem(k),
        set: (k, v) => Risuai.pluginStorage.setItem(k, v),
        remove: (k) => Risuai.pluginStorage.removeItem(k),
        keys: () => Risuai.pluginStorage.keys(),
      };
    },
  });
}
module.exports = { createHostAdapter };
});

SimCore.define("runtime-cache", function (require, module, exports) {
function promptChangeReason(previousLine, currentLine) {
  const text = `${String(previousLine || '')}\n${String(currentLine || '')}`;
  if (/^reaction_max=/m.test(text)) return 'reaction_max';
  if (/broadcast_airtime_|broadcast_locked=|mode_b_/m.test(text)) return 'broadcast-time';
  if (/narrative_|timestamp_semantics=/m.test(text)) return 'narrative-time';
  if (/^(?:mode=|episode_no=)/m.test(text)) return 'mode/lifecycle';
  if (/community_blocks_expected=|platform_groups_required=|b_end_|final_required_blocks=/m.test(text)) return 'community';
  if (/request_template_|prior_answer_|reevaluate_current_event|do_not_mechanically_reuse/m.test(text)) return 'recurrence';
  if (/short_community_|derive_reaction_from_current_source/m.test(text)) return 'handoff/lineage';
  if (/korean_age_offset=|current_korean_age=|world_year=/m.test(text)) return 'age/world-year';
  return 'other';
}

function buildRuntimePromptCacheProbe(previousText, currentText) {
  const current = String(currentText || '');
  const previous = previousText == null ? null : String(previousText);
  const currentLines = current ? current.split('\n') : [];
  if (previous == null) {
    return {
      baseline: true,
      stable: false,
      previousChars: 0,
      currentChars: current.length,
      stablePrefixChars: 0,
      stablePrefixPercent: null,
      stablePrefixLines: 0,
      firstChangedLine: null,
      changedLineSlots: 0,
      reason: 'baseline',
    };
  }

  let prefixChars = 0;
  const charLimit = Math.min(previous.length, current.length);
  while (prefixChars < charLimit && previous.charCodeAt(prefixChars) === current.charCodeAt(prefixChars)) prefixChars += 1;

  const previousLines = previous ? previous.split('\n') : [];
  let prefixLines = 0;
  const lineLimit = Math.min(previousLines.length, currentLines.length);
  while (prefixLines < lineLimit && previousLines[prefixLines] === currentLines[prefixLines]) prefixLines += 1;

  const stable = previous === current;
  const denominator = Math.max(previous.length, current.length, 1);
  const firstChangedLine = stable ? null : prefixLines + 1;
  const changedLineSlots = stable ? 0 : Math.max(previousLines.length, currentLines.length) - prefixLines;
  const previousChangedLine = stable ? '' : (previousLines[prefixLines] || '');
  const currentChangedLine = stable ? '' : (currentLines[prefixLines] || '');

  return {
    baseline: false,
    stable,
    previousChars: previous.length,
    currentChars: current.length,
    stablePrefixChars: prefixChars,
    stablePrefixPercent: stable ? 100 : (prefixChars / denominator) * 100,
    stablePrefixLines: prefixLines,
    firstChangedLine,
    changedLineSlots,
    reason: stable ? 'stable' : promptChangeReason(previousChangedLine, currentChangedLine),
  };
}

function createRuntimePromptCacheTracker(contract = null) {
  let previousText = null;
  let previousKey = null;
  return Object.freeze({
    observe(key, currentText, extra = null) {
      const currentKey = String(key || '');
      const prior = previousKey === currentKey ? previousText : null;
      const probe = {
        ...buildRuntimePromptCacheProbe(prior, currentText),
        placement: contract?.runtimePromptPlacement || 'TAIL_AFTER_CURRENT_USER',
        requestOrder: contract?.requestOrder || 'FROZEN',
        providerCache: contract?.providerCache || 'UNVERIFIED',
        ...(extra && typeof extra === 'object' ? extra : {}),
      };
      previousText = String(currentText || '');
      previousKey = currentKey;
      return probe;
    },
    reset() {
      previousText = null;
      previousKey = null;
    },
  });
}
module.exports = { promptChangeReason, buildRuntimePromptCacheProbe, createRuntimePromptCacheTracker };
});

SimCore.define("runtime-session", function (require, module, exports) {
function createSessionRuntime(deps) {
  const { coreRules, host, perfNow, perfMs, textMessageContent, readState, writeState } = deps;
  async function loadCoreForChat(chaIdx, chatIdx, chatArg = null, perfDetail = null) {
    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.path = 'UNKNOWN';
      detail.chatFallbackMs = 0;
      detail.characterLoadMs = 0;
      detail.initScanMs = 0;
      detail.initMs = 0;
    }
    let { coreSession, coreKey, coreLocationKey } = readState();
    let t = perfNow();
    const chat = chatArg || await host.getChat(chaIdx, chatIdx);
    if (detail) detail.chatFallbackMs = chatArg ? 0 : perfMs(t);
    if (!chat) {
      if (detail) detail.path = 'NO_CHAT';
      writeState({ coreSession: null, coreKey: null, coreLocationKey: null });
      return null;
    }

    const locationKey = `${chaIdx}:${chatIdx}:${chat.id ?? ''}`;
    if (coreSession && coreLocationKey === locationKey) {
      if (detail) detail.path = 'LOCATION_REUSE';
      return coreSession;
    }

    t = perfNow();
    const char = await host.getCharacter();
    if (detail) detail.characterLoadMs = perfMs(t);
    if (!char) {
      if (detail) detail.path = 'NO_CHARACTER';
      writeState({ coreSession: null, coreKey: null, coreLocationKey: null });
      return null;
    }
    const charId = char.chaId ?? char.name;
    const chatId = chat.id ?? `${charId}:${chatIdx}`;
    const key = `${charId}:${chatId}`;
    if (coreSession && coreKey === key) {
      writeState({ coreSession, coreKey, coreLocationKey: locationKey });
      if (detail) detail.path = 'KEY_REUSE';
      return coreSession;
    }

    coreSession = new coreRules.CoreRulesetSession(host.storageBackend(), {
      chatId,
      prefix: `sim:core:${key}`,
      keepN: 80,
    });
    coreKey = key;
    coreLocationKey = locationKey;
    writeState({ coreSession, coreKey, coreLocationKey });

    if (detail) detail.path = 'COLD_INIT';
    t = perfNow();
    const msgs = chat.message || [];
    let lastAssistant = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.role === 'char' || msgs[i]?.role === 'assistant') { lastAssistant = i; break; }
    }
    const latestOutputFingerprint = lastAssistant >= 0
      ? coreRules.fingerprintText(textMessageContent(msgs[lastAssistant]))
      : null;
    if (detail) detail.initScanMs = perfMs(t);
    t = perfNow();
    await coreSession.init(lastAssistant, chat.scriptstate?.['$simcore_core_state'] || null, latestOutputFingerprint);
    if (detail) detail.initMs = perfMs(t);
    return coreSession;
  }
  return Object.freeze({ loadCoreForChat });
}
module.exports = { createSessionRuntime };
});

SimCore.define("runtime-mirror", function (require, module, exports) {
function createMirrorRuntime(deps) {
  const { coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey, getCoreSession, runtimeIsCurrent, getRuntimeEpoch } = deps;
  let sequence = 0;
  const latestByLocation = new Map();
  let lastProbe = null;

  function capture(chaIdx, chatIdx, chat, outIndex, state = null) {
    const coreSession = getCoreSession();
    if (!coreSession) return null;
    const committed = state && typeof state === 'object' ? state : coreSession.current;
    if (!committed) return null;
    return {
      outIndex: Number(outIndex),
      locationKey: diagnosticLocationKey(chaIdx, chatIdx, chat),
      portableState: coreSession.portableState(),
      mode: committed.lastMode || 'A',
      broadcastLocked: committed.broadcastLocked ? '1' : '0',
      communityCount: String(committed.community?.activationCount || 0),
      ageOffset: String(committed.koreanAgeOffset || 0),
      outputFingerprint: committed.outputFingerprint || null,
      hostOutputFingerprint: committed.hostOutputFingerprint || null,
    };
  }

  async function mirror(chaIdx, chatIdx, chatArg = null, perfDetail = null, mirrorSnapshot = null, shouldApply = null) {
    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;
    if (detail) {
      detail.chatLoadMs = 0;
      detail.prepareMs = 0;
      detail.setChatMs = 0;
      detail.status = 'PENDING';
    }
    const coreSession = getCoreSession();
    const snapshot = mirrorSnapshot || capture(chaIdx, chatIdx, chatArg, coreSession?.currentOutputIndex, coreSession?.current);
    if (!snapshot) { if (detail) detail.status = 'NO_SNAPSHOT'; return false; }
    const guard = typeof shouldApply === 'function' ? shouldApply : () => true;
    if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }
    try {
      let t = perfNow();
      const chat = chatArg || await host.getChat(chaIdx, chatIdx);
      if (detail) detail.chatLoadMs = perfMs(t);
      if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }
      if (!chat) { if (detail) detail.status = 'NO_CHAT'; return false; }
      if (diagnosticLocationKey(chaIdx, chatIdx, chat) !== String(snapshot.locationKey || '')) {
        if (detail) detail.status = 'LOCATION_MISMATCH';
        return false;
      }

      const expectedOutIndex = Number(snapshot.outIndex);
      if (Number.isInteger(expectedOutIndex) && expectedOutIndex >= 0) {
        const message = Array.isArray(chat.message) ? chat.message[expectedOutIndex] : null;
        if (!message || (message.role !== 'char' && message.role !== 'assistant')) {
          if (detail) detail.status = 'OUTPUT_NOT_READY';
          return false;
        }
        const actualFingerprint = coreRules.fingerprintText(textMessageContent(message));
        const canonical = String(snapshot.outputFingerprint || '');
        const hostRaw = String(snapshot.hostOutputFingerprint || '');
        if ((canonical || hostRaw) && actualFingerprint !== canonical && actualFingerprint !== hostRaw) {
          if (detail) detail.status = 'OUTPUT_MISMATCH';
          return false;
        }
      }
      if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }

      t = perfNow();
      chat.scriptstate = chat.scriptstate || {};
      chat.scriptstate['$simcore_core_state'] = snapshot.portableState;
      chat.scriptstate['$simcore_core_mode'] = snapshot.mode || 'A';
      chat.scriptstate['$simcore_core_broadcast_locked'] = snapshot.broadcastLocked || '0';
      chat.scriptstate['$simcore_core_community_count'] = snapshot.communityCount || '0';
      chat.scriptstate['$simcore_core_age_offset'] = snapshot.ageOffset || '0';
      delete chat.scriptstate['$simcore_core_reaction_global_max'];
      if (detail) detail.prepareMs = perfMs(t);
      if (!guard()) { if (detail) detail.status = 'GUARD_DROPPED'; return false; }

      t = perfNow();
      await host.setChat(chaIdx, chatIdx, chat);
      if (detail) { detail.setChatMs = perfMs(t); detail.status = 'COMMITTED'; }
      return true;
    } catch (e) {
      if (detail) { detail.status = 'ERROR'; detail.errorName = e?.name || 'Error'; }
      console.log('[simcore/v0.63.4] state mirror failed:', e.message);
      return false;
    }
  }

  function schedule(chaIdx, chatIdx, chat, outIndex, state) {
    const snapshot = capture(chaIdx, chatIdx, chat, outIndex, state);
    if (!snapshot) return false;
    const epoch = getRuntimeEpoch();
    const locationKey = String(snapshot.locationKey || '');
    const currentSequence = ++sequence;
    latestByLocation.set(locationKey, currentSequence);
    const probe = {
      outIndex: Number(outIndex), locationKey, sequence: currentSequence, status: 'SCHEDULED',
      scheduledAt: Date.now(), startedAt: null, finishedAt: null,
      chatLoadMs: 0, prepareMs: 0, setChatMs: 0, totalMs: 0,
    };
    lastProbe = probe;
    const shouldApply = () => runtimeIsCurrent(epoch) && latestByLocation.get(locationKey) === currentSequence;

    const runDeferredMirror = async () => {
      if (!shouldApply()) {
        probe.status = runtimeIsCurrent(epoch) ? 'SUPERSEDED' : 'STALE_DROPPED';
        probe.finishedAt = Date.now();
        return;
      }
      probe.startedAt = Date.now();
      const detail = {};
      const started = perfNow();
      const ok = await mirror(chaIdx, chatIdx, null, detail, snapshot, shouldApply);
      probe.totalMs = perfMs(started);
      probe.chatLoadMs = Number(detail.chatLoadMs || 0);
      probe.prepareMs = Number(detail.prepareMs || 0);
      probe.setChatMs = Number(detail.setChatMs || 0);
      if (!runtimeIsCurrent(epoch)) probe.status = 'STALE_DROPPED';
      else if (latestByLocation.get(locationKey) !== currentSequence) probe.status = 'SUPERSEDED';
      else probe.status = detail.status || (ok ? 'COMMITTED' : 'SKIPPED');
      probe.finishedAt = Date.now();
    };

    if (typeof setTimeout === 'function') {
      const timer = setTimeout(() => { void runDeferredMirror(); }, 0);
      if (timer && typeof timer.unref === 'function') timer.unref();
    } else {
      void runDeferredMirror();
    }
    return true;
  }

  function clear() {
    latestByLocation.clear();
    lastProbe = null;
  }

  return Object.freeze({ schedule, lastProbe: () => lastProbe, clear });
}
module.exports = { createMirrorRuntime };
});

SimCore.define("runtime-hooks", function (require, module, exports) {
async function addBefore(Risuai, handler) { return Risuai.addRisuReplacer('beforeRequest', handler); }
async function addOutput(Risuai, handler) { return Risuai.addRisuScriptHandler('output', handler); }
async function remove(Risuai, beforeHandler, outputHandler) {
  try { await Risuai.removeRisuReplacer('beforeRequest', beforeHandler); } catch (_) {}
  try { await Risuai.removeRisuScriptHandler('output', outputHandler); } catch (_) {}
}
module.exports = { addBefore, addOutput, remove };
});

SimCore.define("runtime-probe", function (require, module, exports) {
function cachePosture(probe, contract) {
  if (!probe) return `${contract?.requestOrder || 'FROZEN'} · runtime ${contract?.runtimePromptPlacement || 'TAIL_AFTER_CURRENT_USER'} · runtime-prefix n/a · provider cache ${contract?.providerCache || 'UNVERIFIED'}`;
  const prefix = probe.baseline ? 'BASELINE' : `${Number(probe.stablePrefixPercent || 0).toFixed(1)}%`;
  return `${probe.requestOrder || contract?.requestOrder || 'FROZEN'} · runtime ${probe.placement || contract?.runtimePromptPlacement || 'TAIL_AFTER_CURRENT_USER'} · runtime-prefix ${prefix} · provider cache ${probe.providerCache || contract?.providerCache || 'UNVERIFIED'}`;
}
module.exports = { cachePosture };
});
'''.strip()

RELEASE_NOTE = '''// v0.63.36 Runtime Boundary Modularization + Cache Contract:\n// - Extracts host access, session loading, runtime-prompt cache observation, deferred mirroring, named-hook registration and cache-posture formatting from the outer runtime shell into explicit internal modules while keeping the proven v0.63.35 Core modules byte-identical\n// - Freezes request message order and runtime prompt bytes: the current runtime block remains TAIL_AFTER_CURRENT_USER, and cache telemetry explicitly distinguishes SimCore runtime-block stability from provider/host prompt-cache behavior rather than claiming a cache hit\n// - Preserves LOCATION_REUSE/KEY_REUSE/COLD_INIT decisions, authoritative snapshot sequencing, Deferred Chat Mirror guards, named callback identity, storage schema, async ordering and all Frame/Time/Evidence/Recovery/Prompt semantics\n// - Adds no provider-cache directive, host/storage/API call, polling, history scan or prompt reordering; the modular cache seam is intentionally observational so a later stable/volatile prefix A/B experiment can be isolated from the 0.63 golden runtime\n//\n'''


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise AssertionError(f'{label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def between(text, start, end):
    a = text.index(start)
    b = text.index(end, a)
    return a, b, text[a:b]


def patch(src):
    assert '//@version 0.63.35' in src
    assert '// v0.63.35 Runtime Stability Consolidation:' in src
    assert 'SimCore.define("runtime-cache"' not in src

    src = replace_once(src, '//@version 0.63.35', '//@version 0.63.36', 'version')
    src = replace_once(src, '// v0.63.35 Runtime Stability Consolidation:\n', RELEASE_NOTE + '// v0.63.35 Runtime Stability Consolidation:\n', 'release note')
    src = replace_once(src, "'Version: 0.63.35'", "'Version: 0.63.36'", 'diagnostic version')
    src = replace_once(src, '⚙️ SimCore v0.63.35', '⚙️ SimCore v0.63.36', 'panel version')

    ops_anchor = 'module.exports = { perfNow, perfMs, normalizationIssues };\n});\n\n(async () => {'
    src = replace_once(src, ops_anchor, 'module.exports = { perfNow, perfMs, normalizationIssues };\n});\n\n' + RUNTIME_MODULES + '\n\n(async () => {', 'runtime module insertion')

    require_anchor = "  const ops = SimCore.require('ops');\n"
    require_block = require_anchor + "  const runtimeContracts = SimCore.require('runtime-contracts');\n  const runtimeHostRules = SimCore.require('runtime-host');\n  const runtimeCacheRules = SimCore.require('runtime-cache');\n  const runtimeSessionRules = SimCore.require('runtime-session');\n  const runtimeMirrorRules = SimCore.require('runtime-mirror');\n  const runtimeHooks = SimCore.require('runtime-hooks');\n  const runtimeProbeRules = SimCore.require('runtime-probe');\n"
    src = replace_once(src, require_anchor, require_block, 'runtime requires')

    src = replace_once(src, "  let previousRuntimePromptText = null;\n  let previousRuntimePromptKey = null;\n", '', 'cache shell state')
    src = replace_once(src, "  let deferredMirrorSequence = 0;\n  const deferredMirrorLatestByLocation = new Map();\n  let lastDeferredMirrorProbe = null;\n", '', 'mirror shell state')

    # Move cache logic out of the shell.
    a, b, _ = between(src, '  function promptChangeReason(', '  async function currentIndices()')
    src = src[:a] + src[b:]

    # currentIndices now belongs to runtime-host.
    a, b, _ = between(src, '  async function currentIndices()', '  async function loadCoreForChat(')
    src = src[:a] + src[b:]

    # Session loading now belongs to runtime-session.
    a, b, _ = between(src, '  async function loadCoreForChat(', '  function captureCoreMirrorSnapshot(')
    src = src[:a] + src[b:]

    # Deferred mirror implementation now belongs to runtime-mirror.
    a, b, _ = between(src, '  function captureCoreMirrorSnapshot(', '  async function reconcileManualEdit(')
    src = src[:a] + src[b:]

    init_anchor = '  const { perfNow, perfMs } = ops;\n\n'
    init_block = '''  const { perfNow, perfMs } = ops;\n  const host = runtimeHostRules.createHostAdapter(Risuai);\n  const runtimePromptCache = runtimeCacheRules.createRuntimePromptCacheTracker(runtimeContracts.cache);\n  const runtimeSession = runtimeSessionRules.createSessionRuntime({\n    coreRules, host, perfNow, perfMs, textMessageContent,\n    readState: () => ({ coreSession, coreKey, coreLocationKey }),\n    writeState: (next) => {\n      coreSession = next.coreSession;\n      coreKey = next.coreKey;\n      coreLocationKey = next.coreLocationKey;\n    },\n  });\n  const runtimeMirror = runtimeMirrorRules.createMirrorRuntime({\n    coreRules, host, perfNow, perfMs, textMessageContent, diagnosticLocationKey,\n    getCoreSession: () => coreSession,\n    runtimeIsCurrent,\n    getRuntimeEpoch: () => runtimeEpoch,\n  });\n\n'''
    src = replace_once(src, init_anchor, init_block, 'runtime init')

    # Route session/host/mirror calls through the new boundaries.
    src = src.replace('await loadCoreForChat(', 'await runtimeSession.loadCoreForChat(')
    src = src.replace('await currentIndices()', 'await host.currentIndices()')
    src = src.replace('await Risuai.getChatFromIndex(chaIdx, chatIdx)', 'await host.getChat(chaIdx, chatIdx)')
    src = replace_once(src, 'scheduleDeferredCoreMirror(chaIdx, chatIdx, chat, outIndex, result.state)', 'runtimeMirror.schedule(chaIdx, chatIdx, chat, outIndex, result.state)', 'mirror schedule')

    old_cache = '''      const runtimePromptKey = String(coreKey || coreLocationKey || '');\n      const priorRuntimePrompt = previousRuntimePromptKey === runtimePromptKey ? previousRuntimePromptText : null;\n      lastRuntimePromptCacheProbe = {\n        ...buildRuntimePromptCacheProbe(priorRuntimePrompt, runtimeBudgetText),\n        sendIndex: Number.isInteger(Number(result.state.pending?.sendIndex)) ? Number(result.state.pending.sendIndex) : -1,\n        mode: runtimeBudgetMode,\n        at: Date.now(),\n      };\n      previousRuntimePromptText = runtimeBudgetText;\n      previousRuntimePromptKey = runtimePromptKey;\n'''
    new_cache = '''      const runtimePromptKey = String(coreKey || coreLocationKey || '');\n      lastRuntimePromptCacheProbe = runtimePromptCache.observe(runtimePromptKey, runtimeBudgetText, {\n        sendIndex: Number.isInteger(Number(result.state.pending?.sendIndex)) ? Number(result.state.pending.sendIndex) : -1,\n        mode: runtimeBudgetMode,\n        at: Date.now(),\n      });\n'''
    src = replace_once(src, old_cache, new_cache, 'cache tracker')

    src = replace_once(src, "      previousRuntimePromptText = null;\n      previousRuntimePromptKey = null;\n", '      runtimePromptCache.reset();\n', 'inactive cache reset')

    # Diagnostic mirror probe reads module-owned state.
    old_probe = '''    const deferredMirror = outputFresh && lastDeferredMirrorProbe\n      && Number(lastDeferredMirrorProbe.outIndex) === Number(latestAssistantIndex)\n      && String(lastDeferredMirrorProbe.locationKey || '') === String(requestProbe?.locationKey || '')\n      ? lastDeferredMirrorProbe : null;\n'''
    new_probe = '''    const deferredMirrorProbe = runtimeMirror.lastProbe();\n    const deferredMirror = outputFresh && deferredMirrorProbe\n      && Number(deferredMirrorProbe.outIndex) === Number(latestAssistantIndex)\n      && String(deferredMirrorProbe.locationKey || '') === String(requestProbe?.locationKey || '')\n      ? deferredMirrorProbe : null;\n'''
    src = replace_once(src, old_probe, new_probe, 'diagnostic mirror probe')

    # Expose cache posture without adding a request/history scan.
    prefix_line = '      `Prompt prefix: ${prefixLabel}`,\n'
    src = replace_once(src, prefix_line, prefix_line + '      `Cache posture: ${runtimeProbeRules.cachePosture(cacheProbe, runtimeContracts.cache)}`,\n', 'cache posture diagnostic')

    # Hook ownership module, while preserving add timing and exact callback identity.
    src = replace_once(src, "  await Risuai.addRisuReplacer('beforeRequest', beforeRequestHandler);", '  await runtimeHooks.addBefore(Risuai, beforeRequestHandler);', 'before hook add')
    src = replace_once(src, "  await Risuai.addRisuScriptHandler('output', outputHandler);", '  await runtimeHooks.addOutput(Risuai, outputHandler);', 'output hook add')
    old_remove = "    try { await Risuai.removeRisuReplacer('beforeRequest', beforeRequestHandler); } catch (_) {}\n    try { await Risuai.removeRisuScriptHandler('output', outputHandler); } catch (_) {}"
    src = replace_once(src, old_remove, '    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);', 'hook remove')

    # Unload ownership resets.
    src = replace_once(src, "    previousRuntimePromptText = null;\n    previousRuntimePromptKey = null;\n", '    runtimePromptCache.reset();\n', 'unload cache reset')
    src = replace_once(src, "    deferredMirrorLatestByLocation.clear();\n    lastDeferredMirrorProbe = null;", '    runtimeMirror.clear();', 'unload mirror reset')

    # Keep panel/diagnostic wording observational: existing prefix probe still describes only the runtime block.
    assert "messages.push({ role: 'system', content: result.promptBlock });" in src
    assert 'TAIL_AFTER_CURRENT_USER' in src
    assert 'provider cache ${contract?.providerCache' in src

    # Old shell implementations/state must be gone.
    for token in [
      'function promptChangeReason(', 'function buildRuntimePromptCacheProbe(', 'async function currentIndices()',
      'async function loadCoreForChat(', 'function captureCoreMirrorSnapshot(', 'function scheduleDeferredCoreMirror(',
      'previousRuntimePromptText', 'previousRuntimePromptKey', 'deferredMirrorLatestByLocation', 'lastDeferredMirrorProbe',
    ]:
      # Definitions remain inside the new module block for function names; shell-state identifiers should be fully absent.
      if token in {'previousRuntimePromptText', 'previousRuntimePromptKey', 'deferredMirrorLatestByLocation', 'lastDeferredMirrorProbe'}:
        assert token not in src, token

    return src


baseline = PATHS[0].read_text(encoding='utf-8')
assert PATHS[1].read_text(encoding='utf-8') == baseline, 'latest/install baseline mismatch'
patched = patch(baseline)
for path in PATHS:
    path.write_text(patched, encoding='utf-8')
print('patched SimCore 0.63.36 Runtime Boundary Modularization + Cache Contract')
