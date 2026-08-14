from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.16 Evidence Mapping Probe:\n// - Diagnostics-only probe for the next Short-C provenance design: measures whether the authoritative raw lineage root turn maps uniquely onto the final beforeRequest message array\n// - Confirms raw chat indices and provider-request indices as separate coordinate systems; never indexes request messages directly with the lineage rootIndex\n// - For source-locked requests only, compares the raw root user plus its first completed assistant response against already-loaded request messages by exact role/content, retaining only indices/counts/lengths\n// - Adds no prompt text, source-body copy, output repair, semantic scan, state/schema/storage field, host/storage/API call, timer, polling, or visible-chat mutation\n// - Keeps all 16 internal modules byte-identical to v0.63.15, including Frame, Prompt, Time, Structure, Recovery, Lineage, Handoff, Recurrence, Community, Reaction, Session, and OPS\n//\n"""

PROBE_FUNCS = r'''  // EVIDENCE_MAPPING_PROBE_BEGIN
  function evidenceAssistantRole(m) {
    return m?.role === 'char' || m?.role === 'assistant';
  }

  function evidenceText(m, getText) {
    if (!m) return '';
    if (typeof getText === 'function') return String(getText(m) || '');
    const v = m.content ?? m.data ?? m.text ?? '';
    return typeof v === 'string' ? v : String(v || '');
  }

  function evidenceSourceAssistantIndex(chatMessages, rootIndex, sendIndex) {
    const rows = Array.isArray(chatMessages) ? chatMessages : [];
    const start = Number.isInteger(Number(rootIndex)) ? Number(rootIndex) + 1 : 0;
    const stopRaw = Number.isInteger(Number(sendIndex)) ? Number(sendIndex) : rows.length;
    const stop = Math.min(Math.max(start, stopRaw), rows.length);
    for (let i = start; i < stop; i++) {
      if (evidenceAssistantRole(rows[i])) return i;
    }
    return -1;
  }

  function evidenceExactRequestMatch(requestMessages, expectedRole, targetText, getText) {
    const rows = Array.isArray(requestMessages) ? requestMessages : [];
    const target = String(targetText || '');
    if (!target) return { count: 0, requestIndex: -1 };
    let count = 0;
    let requestIndex = -1;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (expectedRole && rows[i]?.role !== expectedRole) continue;
      const text = evidenceText(rows[i], getText);
      if (text.length !== target.length || text !== target) continue;
      count += 1;
      if (requestIndex < 0) requestIndex = i;
      if (count >= 2) break;
    }
    return { count, requestIndex };
  }

  function buildEvidenceMappingProbe(requestMessages, chatMessages, pending, sendIndex, getText) {
    const p = pending && typeof pending === 'object' ? pending : null;
    const rootIndex = Number(p?.requestLineageRootIndex);
    const sourceLocked = !!p?.active && String(p?.mode || '') === 'C'
      && Number.isInteger(rootIndex) && rootIndex >= 0
      && String(p?.requestLineageSourceKind || '') !== 'UNSEEDED';
    if (!sourceLocked) return null;

    const chatRows = Array.isArray(chatMessages) ? chatMessages : [];
    const rootUser = chatRows[rootIndex];
    const rootUserText = rootUser?.role === 'user' ? evidenceText(rootUser, getText) : '';
    const sourceAssistantIndex = evidenceSourceAssistantIndex(chatRows, rootIndex, sendIndex);
    const sourceAssistant = sourceAssistantIndex >= 0 ? chatRows[sourceAssistantIndex] : null;
    const sourceAssistantText = sourceAssistant ? evidenceText(sourceAssistant, getText) : '';

    const rootMatch = evidenceExactRequestMatch(requestMessages, 'user', rootUserText, getText);
    const assistantMatch = evidenceExactRequestMatch(requestMessages, 'assistant', sourceAssistantText, getText);
    let status = 'MISSING';
    if (rootUserText && sourceAssistantText && rootMatch.count === 1 && assistantMatch.count === 1) status = 'UNIQUE';
    else if (rootMatch.count > 1 || assistantMatch.count > 1) status = 'AMBIGUOUS';

    return {
      status,
      rootUserRawIndex: rootIndex,
      rootUserRequestIndex: rootMatch.requestIndex,
      rootUserMatches: rootMatch.count,
      rootUserChars: rootUserText.length,
      sourceAssistantRawIndex: sourceAssistantIndex,
      sourceAssistantRequestIndex: assistantMatch.requestIndex,
      sourceAssistantMatches: assistantMatch.count,
      sourceAssistantChars: sourceAssistantText.length,
      requestMessages: Array.isArray(requestMessages) ? requestMessages.length : 0,
    };
  }
  // EVIDENCE_MAPPING_PROBE_END

'''


def replace_once(text, old, new, label, path):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: {label} anchor drift ({count})')
    return text.replace(old, new, 1)


for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.15' not in text:
        raise SystemExit(f'{path}: expected 0.63.15 baseline')
    if '// v0.63.16 Evidence Mapping Probe:' in text:
        raise SystemExit(f'{path}: already patched')

    text = replace_once(text, '//@version 0.63.15', '//@version 0.63.16', 'version', path)
    text = replace_once(text, '// v0.63.15 Frame Guard:\n', CHANGELOG + '// v0.63.15 Frame Guard:\n', 'changelog', path)

    global_anchor = "  let lastFrameGuardProbe = null;\n  let lastNarrativeClockProbe = null;\n"
    global_new = "  let lastFrameGuardProbe = null;\n  let lastEvidenceMappingProbe = null;\n  let lastNarrativeClockProbe = null;\n"
    text = replace_once(text, global_anchor, global_new, 'probe global', path)

    func_anchor = "  function diagnosticProbeFresh() {\n"
    text = replace_once(text, func_anchor, PROBE_FUNCS + func_anchor, 'probe functions', path)

    budget_anchor = "      lastRuntimePromptBudget = {\n        sendIndex: Number.isInteger(Number(result.state.pending?.sendIndex)) ? Number(result.state.pending.sendIndex) : -1,\n"
    # Keep the existing object byte-for-byte; only attach the probe after the object closes, using a nearby stable anchor.
    if budget_anchor not in text:
        raise SystemExit(f'{path}: runtime budget anchor missing')

    probe_call_anchor = "        at: Date.now(),\n      };\n      const runtimePromptKey = String(coreKey || coreLocationKey || '');\n"
    probe_call_new = "        at: Date.now(),\n      };\n      lastEvidenceMappingProbe = lastRuntimePromptBudget.sourceAnchor\n        ? buildEvidenceMappingProbe(messages, chat?.message || [], result.state.pending, sendIndex, textMessageContent)\n        : null;\n      const runtimePromptKey = String(coreKey || coreLocationKey || '');\n"
    text = replace_once(text, probe_call_anchor, probe_call_new, 'probe call', path)

    diagnostic_var_anchor = "    const frameGuard = lastFrameGuardProbe || null;\n    const narrative = lastNarrativeClockProbe || null;\n"
    diagnostic_var_new = "    const frameGuard = lastFrameGuardProbe || null;\n    const evidenceMap = lastEvidenceMappingProbe || null;\n    const narrative = lastNarrativeClockProbe || null;\n"
    text = replace_once(text, diagnostic_var_anchor, diagnostic_var_new, 'diagnostic variable', path)

    diagnostic_line_anchor = "      `Frame guard: ${frameGuard ? `${frameGuard.applied ? 'CLAMPED' : 'PASS'} · ${frameGuard.regression || 'NONE'}` : 'n/a'}`,\n      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · output ${narrative.outputTimestamp || 'n/a'}` : 'n/a'}`,\n"
    diagnostic_line_new = "      `Frame guard: ${frameGuard ? `${frameGuard.applied ? 'CLAMPED' : 'PASS'} · ${frameGuard.regression || 'NONE'}` : 'n/a'}`,\n      `Evidence map: ${evidenceMap ? `${evidenceMap.status} · root user raw @${evidenceMap.rootUserRawIndex}→request @${evidenceMap.rootUserRequestIndex >= 0 ? evidenceMap.rootUserRequestIndex : 'n/a'} (${evidenceMap.rootUserMatches} match) · source assistant raw @${evidenceMap.sourceAssistantRawIndex >= 0 ? evidenceMap.sourceAssistantRawIndex : 'n/a'}→request @${evidenceMap.sourceAssistantRequestIndex >= 0 ? evidenceMap.sourceAssistantRequestIndex : 'n/a'} (${evidenceMap.sourceAssistantMatches} match)` : 'n/a'}`,\n      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · output ${narrative.outputTimestamp || 'n/a'}` : 'n/a'}`,\n"
    text = replace_once(text, diagnostic_line_anchor, diagnostic_line_new, 'diagnostic line', path)

    text = replace_once(text, '⚙️ SimCore v0.63.15', '⚙️ SimCore v0.63.16', 'panel version', path)
    text = replace_once(text, "'Version: 0.63.15'", "'Version: 0.63.16'", 'diagnostic version', path)

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.16 latest.js/install.js (diagnostics-only Evidence Mapping Probe; all 16 internal modules frozen)')
