from pathlib import Path

LATEST = Path('plugins/simcore/latest.js')
INSTALL = Path('plugins/simcore/install.js')
text = LATEST.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 occurrence, got {count}')
    text = text.replace(old, new, 1)


replace_once('//@version 0.63.3', '//@version 0.63.4', 'version')

replace_once(
    '// v0.63.3 Two-Turn Diagnostic Copy:\n',
    '''// v0.63.4 Long-Chat Regression Probe:\n// - Diagnostics-only mini release: generation behavior, runtime prompt, state schema, storage, recurrence, lineage, handoff, time, recovery, reaction, and broadcast semantics stay unchanged\n// - Extends the manual two-turn raw diagnostic with Volume/Chapter/Chatindex continuity and explicit regression flags\n// - Reports recurrence guidance state, the current template fingerprint, and the most recent exact historical fingerprint match by user/assistant index\n// - Historical fingerprint lookup runs only when the user presses the diagnostic-copy button; no request/output hot-path history scan, response persistence, or new pluginStorage call is added\n// - Keeps the v0.63.0 cache-aware Prompt compiler byte-identical; runtime prompt text and cache-prefix behavior are unchanged by construction\n//\n// v0.63.3 Two-Turn Diagnostic Copy:\n''',
    'changelog',
)

replace_once(
    "  const coreRules = SimCore.require('session');\n  const ops = SimCore.require('ops');\n",
    "  const coreRules = SimCore.require('session');\n  const recurrenceRules = SimCore.require('recurrence');\n  const ops = SimCore.require('ops');\n",
    'recurrence diagnostic accessor',
)

replace_once(
    "          modeFamily: pendingProbe.templateRecurrenceModeFamily || null,\n          eligible: !!pendingProbe.templateRecurrenceEligible,\n",
    "          modeFamily: pendingProbe.templateRecurrenceModeFamily || null,\n          hash: pendingProbe.templateRecurrenceHash == null ? null : Number(pendingProbe.templateRecurrenceHash),\n          eligible: !!pendingProbe.templateRecurrenceEligible,\n",
    'recurrence probe hash',
)

probe_anchor = '''  function diagnosticProbeFresh() {\n    const currentKey = String(coreKey || coreLocationKey || '');\n    return !!currentKey && previousRuntimePromptKey === currentKey;\n  }\n\n'''
probe_helpers = r'''  function diagnosticProbeFresh() {
    const currentKey = String(coreKey || coreLocationKey || '');
    return !!currentKey && previousRuntimePromptKey === currentKey;
  }

  function diagnosticFrameState(raw) {
    const text = String(raw || '');
    const volume = text.match(/^\s*##\s+볼륨\s+(\d+)\s*[:：]/mi);
    const chapter = text.match(/^\s*###\s+챕터\s+(\d+)\s*[:：]/mi);
    const chatindex = text.match(/^\s*####\s+Chatindex\s*[:：]\s*(\d+)\s*∮/mi);
    return {
      volume: volume ? Number(volume[1]) : null,
      chapter: chapter ? Number(chapter[1]) : null,
      chatindex: chatindex ? Number(chatindex[1]) : null,
    };
  }

  function diagnosticStepLabel(previous, current) {
    if (!Number.isFinite(previous) || !Number.isFinite(current)) return 'n/a';
    if (current > previous) return 'ADVANCED';
    if (current < previous) return 'REGRESSED';
    return 'SAME';
  }

  function diagnosticFrameContinuity(messages, currentUserIndex, latestAssistantIndex) {
    const rows = Array.isArray(messages) ? messages : [];
    const before = currentUserIndex >= 0 ? currentUserIndex : latestAssistantIndex;
    let previousAssistantIndex = -1;
    for (let i = before - 1; i >= 0; i--) {
      if (diagnosticAssistantRole(rows[i])) { previousAssistantIndex = i; break; }
    }
    const previous = diagnosticFrameState(diagnosticRawMessage(rows, previousAssistantIndex));
    const current = diagnosticFrameState(diagnosticRawMessage(rows, latestAssistantIndex));
    const volumeStep = diagnosticStepLabel(previous.volume, current.volume);
    let chapterStep = diagnosticStepLabel(previous.chapter, current.chapter);
    if (Number.isFinite(previous.volume) && Number.isFinite(current.volume) && current.volume > previous.volume
        && Number.isFinite(previous.chapter) && Number.isFinite(current.chapter) && current.chapter < previous.chapter) {
      chapterStep = 'RESET_AFTER_VOLUME_ADVANCE';
    }
    const chatindexStep = diagnosticStepLabel(previous.chatindex, current.chatindex);
    const regressions = [];
    if (Number.isFinite(previous.volume) && Number.isFinite(current.volume) && current.volume < previous.volume) regressions.push('VOLUME');
    if (Number.isFinite(previous.volume) && Number.isFinite(current.volume) && current.volume === previous.volume
        && Number.isFinite(previous.chapter) && Number.isFinite(current.chapter) && current.chapter < previous.chapter) regressions.push('CHAPTER');
    if (Number.isFinite(previous.chatindex) && Number.isFinite(current.chatindex) && current.chatindex < previous.chatindex) regressions.push('CHATINDEX');
    const value = (v) => Number.isFinite(v) ? Number(v) : 'n/a';
    return {
      previousAssistantIndex,
      previous,
      current,
      label: `volume ${value(previous.volume)}→${value(current.volume)} ${volumeStep} · chapter ${value(previous.chapter)}→${value(current.chapter)} ${chapterStep} · Chatindex ${value(previous.chatindex)}→${value(current.chatindex)} ${chatindexStep}`,
      regression: regressions.length ? regressions.join('+') : 'NONE',
    };
  }

  function diagnosticRecurrencePrior(messages, currentUserIndex, probe) {
    if (!probe?.eligible) return { status: 'INELIGIBLE', userIndex: -1, assistantIndex: -1, distance: null, hashHex: 'n/a' };
    const hash = Number(probe.hash);
    if (!Number.isFinite(hash)) return { status: 'NO HASH', userIndex: -1, assistantIndex: -1, distance: null, hashHex: 'n/a' };
    const family = String(probe.modeFamily || 'A');
    const mode = family === 'C' ? 'C' : (family === 'B' ? 'B_START' : 'A');
    const rows = Array.isArray(messages) ? messages : [];
    for (let i = Math.min(rows.length - 1, Number(currentUserIndex) - 1); i >= 0; i--) {
      if (rows[i]?.role !== 'user') continue;
      const fp = recurrenceRules.templateFingerprint(textMessageContent(rows[i]), mode);
      if (fp.eligible && Number(fp.hash) === hash) {
        const assistantIndex = diagnosticAssistantAfterUser(rows, i);
        return {
          status: 'MATCH',
          userIndex: i,
          assistantIndex,
          distance: Number(currentUserIndex) - i,
          hashHex: `0x${(hash >>> 0).toString(16).padStart(8, '0')}`,
        };
      }
    }
    return {
      status: 'NO MATCH',
      userIndex: -1,
      assistantIndex: -1,
      distance: null,
      hashHex: `0x${(hash >>> 0).toString(16).padStart(8, '0')}`,
    };
  }

'''
replace_once(probe_anchor, probe_helpers, 'diagnostic helpers')

replace_once(
    "    const warnings = Array.isArray(lastCore?.issues) ? lastCore.issues : [];\n",
    "    const recurrenceHistory = probeFresh && recurrenceProbe ? diagnosticRecurrencePrior(messages, currentUserIndex, recurrenceProbe) : null;\n    const frameProbe = diagnosticFrameContinuity(messages, currentUserIndex, latestAssistantIndex);\n    const warnings = Array.isArray(lastCore?.issues) ? lastCore.issues : [];\n",
    'diagnostic probe calculations',
)

replace_once("      'Diagnostic format: raw-lineage-v1',\n      'Version: 0.63.1',\n", "      'Diagnostic format: raw-lineage-v2',\n      'Version: 0.63.4',\n", 'diagnostic format/version')

replace_once(
    "      `Template recurrence: ${probeFresh && recurrenceProbe ? `${recurrenceProbe.eligible ? (recurrenceProbe.repeated ? 'REPEATED' : 'FIRST') : 'INELIGIBLE'} · family ${recurrenceProbe.modeFamily || 'n/a'}` : 'n/a'}`,\n",
    "      `Template recurrence: ${probeFresh && recurrenceProbe ? `${recurrenceProbe.eligible ? (recurrenceProbe.repeated ? 'REPEATED' : 'FIRST') : 'INELIGIBLE'} · family ${recurrenceProbe.modeFamily || 'n/a'}` : 'n/a'}`,\n      `Recurrence guidance: ${probeFresh && budget ? (budget.recurrence ? 'ON' : 'OFF') : 'n/a'}`,\n      `Recurrence history match: ${recurrenceHistory ? `${recurrenceHistory.status} · hash ${recurrenceHistory.hashHex} · user @${recurrenceHistory.userIndex >= 0 ? recurrenceHistory.userIndex : 'n/a'} · assistant @${recurrenceHistory.assistantIndex >= 0 ? recurrenceHistory.assistantIndex : 'n/a'}${recurrenceHistory.distance != null ? ` · distance ${recurrenceHistory.distance}` : ''}` : 'n/a'}`,\n",
    'recurrence diagnostic lines',
)

replace_once(
    "      `Source handoff: ${probeFresh && handoff ? `${handoff.newSource ? 'NEW SOURCE' : (handoff.eligible ? (handoff.seen ? 'SAME SOURCE' : 'FIRST') : 'INELIGIBLE')} · reason ${handoff.reason || 'n/a'}` : 'n/a'}`,\n      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · output ${narrative.outputTimestamp || 'n/a'}` : 'n/a'}`,\n",
    "      `Source handoff: ${probeFresh && handoff ? `${handoff.newSource ? 'NEW SOURCE' : (handoff.eligible ? (handoff.seen ? 'SAME SOURCE' : 'FIRST') : 'INELIGIBLE')} · reason ${handoff.reason || 'n/a'}` : 'n/a'}`,\n      `Frame continuity: ${frameProbe.label}`,\n      `Frame regression: ${frameProbe.regression}`,\n      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · output ${narrative.outputTimestamp || 'n/a'}` : 'n/a'}`,\n",
    'frame diagnostic lines',
)

# Keep every console/UI version marker truthful while leaving runtime semantics untouched.
if '[simcore/v0.63.3]' not in text:
    raise SystemExit('console version marker missing')
text = text.replace('[simcore/v0.63.3]', '[simcore/v0.63.4]')
text = text.replace('SimCore v0.63.3 <button id="copy-turn-diag"', 'SimCore v0.63.4 <button id="copy-turn-diag"')

replace_once(
    '<div class="card muted">Short-C Source Lock · eligible short-C is bound to the current lineage root; diagnostic copy = previous + current completed turns, manual/raw-only</div>',
    '<div class="card muted">Long-Chat Regression Probe · frame continuity + recurrence-history match are computed only for manual diagnostic copy; runtime prompt/generation behavior unchanged</div>',
    'panel footer',
)

# The manual copy button stays the only caller of buildLastTurnDiagnosticReport; no background scan.
if text.count('buildLastTurnDiagnosticReport(chat, state)') != 2:
    raise SystemExit('unexpected diagnostic report call topology')

LATEST.write_text(text, encoding='utf-8')
INSTALL.write_text(text, encoding='utf-8')
print('patched SimCore 0.63.4 latest.js/install.js (diagnostics only)')
