from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.1 Short-C Source Lock + Turn Diagnostic Copy:\n// - Strengthens eligible short Mode C source guidance without changing lineage/handoff classification: the current lineage root is explicitly authoritative and prior similar events/community answers may not substitute it\n// - Emits only deterministic lineage metadata already computed by SimCore; no lore/content extraction, semantic source selection, history search, or state-schema/storage change\n// - Adds a manual '최근 턴 진단 복사' panel action that copies raw root/parent/current turns plus live SimCore probes on demand, with no persistent response copy\n// - Reuses the proven navigator.clipboard.writeText pattern from Local Usage Dashboard; clipboard work occurs only after the user presses the diagnostic button\n// - Keeps Cache-Aware Prompt Compiler ordering, >=20% mode-transition cache-floor gate, visible Thoughts/preamble recovery, reaction/time/broadcast behavior, and pluginStorage call sites unchanged\n//\n"""

OLD_PROMPT = """  if (p.communitySourceHandoffNewSource) {\n    lines.push(`short_community_request_reused_with_new_source=${p.communitySourceHandoffRootMode || 'unknown'}`);\n    lines.push('derive_reaction_from_current_source_not_prior_answer=1');\n  }\n  else if (p.mode === 'C' && p.communitySourceHandoffEligible) {\n    lines.push('short_community_request_context_is_current_lineage=1');\n  }\n"""

NEW_PROMPT = """  if (p.mode === 'C' && p.communitySourceHandoffEligible) {\n    const sourceRootMode = p.communitySourceHandoffRootMode || 'unknown';\n    const sourceRootIndex = Number.isInteger(Number(p.communitySourceHandoffRootIndex)) && Number(p.communitySourceHandoffRootIndex) >= 0\n      ? Number(p.communitySourceHandoffRootIndex)\n      : 'unknown';\n    lines.push('short_community_request_context_is_current_lineage=1');\n    lines.push('short_community_source_selector=current_lineage_root_turn');\n    lines.push(`short_community_source_root_mode=${sourceRootMode}`);\n    lines.push(`short_community_source_root_index=${sourceRootIndex}`);\n    lines.push('short_community_source_is_authoritative=1');\n    lines.push('do_not_substitute_prior_similar_source_or_prior_community_answer=1');\n    if (p.communitySourceHandoffNewSource) {\n      lines.push(`short_community_request_reused_with_new_source=${sourceRootMode}`);\n      lines.push('derive_reaction_from_current_source_not_prior_answer=1');\n    }\n  }\n"""

DIAG_FUNCTIONS = r'''  function diagnosticAssistantRole(m) {
    return m?.role === 'char' || m?.role === 'assistant';
  }

  function diagnosticLastAssistantIndex(messages) {
    const rows = Array.isArray(messages) ? messages : [];
    for (let i = rows.length - 1; i >= 0; i--) if (diagnosticAssistantRole(rows[i])) return i;
    return -1;
  }

  function diagnosticUserBefore(messages, beforeIndex) {
    const rows = Array.isArray(messages) ? messages : [];
    const start = Math.min(rows.length - 1, Math.max(-1, Number(beforeIndex) - 1));
    for (let i = start; i >= 0; i--) if (rows[i]?.role === 'user') return i;
    return -1;
  }

  function diagnosticAssistantAfterUser(messages, userIndex) {
    const rows = Array.isArray(messages) ? messages : [];
    const start = Number.isInteger(Number(userIndex)) ? Number(userIndex) + 1 : rows.length;
    for (let i = start; i < rows.length; i++) {
      if (rows[i]?.role === 'user') break;
      if (diagnosticAssistantRole(rows[i])) return i;
    }
    return -1;
  }

  function diagnosticRawMessage(messages, index) {
    const rows = Array.isArray(messages) ? messages : [];
    return Number.isInteger(Number(index)) && Number(index) >= 0 && Number(index) < rows.length
      ? textMessageContent(rows[Number(index)])
      : '';
  }

  function diagnosticProbeFresh() {
    const currentKey = String(coreKey || coreLocationKey || '');
    return !!currentKey && previousRuntimePromptKey === currentKey;
  }

  function diagnosticSection(title, messages, userIndex, assistantIndex, meta = []) {
    const userRaw = diagnosticRawMessage(messages, userIndex);
    const assistantRaw = diagnosticRawMessage(messages, assistantIndex);
    return [
      `--- ${title} ---`,
      ...meta,
      `User index: ${Number.isInteger(Number(userIndex)) && Number(userIndex) >= 0 ? Number(userIndex) : 'n/a'}`,
      `Assistant index: ${Number.isInteger(Number(assistantIndex)) && Number(assistantIndex) >= 0 ? Number(assistantIndex) : 'n/a'}`,
      '',
      'USER (RAW):',
      userRaw || '[unavailable]',
      '',
      'ASSISTANT (RAW):',
      assistantRaw || '[unavailable]',
      '',
    ].join('\n');
  }

  function buildLastTurnDiagnosticReport(chat, state) {
    const messages = Array.isArray(chat?.message) ? chat.message : [];
    const latestAssistantIndex = diagnosticLastAssistantIndex(messages);
    const currentUserIndex = diagnosticUserBefore(messages, latestAssistantIndex >= 0 ? latestAssistantIndex : messages.length);
    const lineage = lastRequestLineageProbe || null;
    const handoff = lastCommunitySourceHandoffProbe || null;
    const recurrenceProbe = lastTemplateRecurrenceProbe || null;
    const narrative = lastNarrativeClockProbe || null;
    const cacheProbe = lastRuntimePromptCacheProbe || null;
    const budget = lastRuntimePromptBudget || null;
    const probeFresh = diagnosticProbeFresh();
    const rootIndex = probeFresh && lineage ? Number(lineage.rootIndex) : -1;
    const parentIndex = probeFresh && lineage ? Number(lineage.parentIndex) : -1;
    const rootAssistantIndex = rootIndex >= 0 && rootIndex !== currentUserIndex
      ? diagnosticAssistantAfterUser(messages, rootIndex)
      : -1;
    const parentAssistantIndex = parentIndex >= 0 && parentIndex !== currentUserIndex
      ? diagnosticAssistantAfterUser(messages, parentIndex)
      : -1;
    const warnings = Array.isArray(lastCore?.issues) ? lastCore.issues : [];
    const compatibility = Array.isArray(lastCore?.diagnostics) ? lastCore.diagnostics : [];
    const prefixLabel = !probeFresh || !cacheProbe
      ? 'n/a'
      : (cacheProbe.baseline
        ? 'BASELINE'
        : `${Number(cacheProbe.stablePrefixPercent || 0).toFixed(1)}% · ${cacheProbe.reason || 'other'}`);
    const lines = [
      '=== SimCore Last Turn Diagnostic ===',
      'Diagnostic format: raw-lineage-v1',
      'Version: 0.63.1',
      `Captured: ${new Date().toISOString()}`,
      `Probe context: ${probeFresh ? 'CURRENT CHAT' : 'STALE/UNAVAILABLE'}`,
      `Mode: ${lastCore?.mode || state?.lastMode || 'n/a'}`,
      `Warnings: ${warnings.length}`,
      `Compatibility diagnostics: ${compatibility.length}`,
      `Prompt prefix: ${prefixLabel}`,
      `Runtime prompt: ${probeFresh && budget ? `${Number(budget.chars || 0)} chars / ${Number(budget.lines || 0)} lines` : 'n/a'}`,
      `Short-C source lock: ${probeFresh && budget?.sourceAnchor ? 'ON' : 'OFF'}`,
      `Template recurrence: ${probeFresh && recurrenceProbe ? `${recurrenceProbe.eligible ? (recurrenceProbe.repeated ? 'REPEATED' : 'FIRST') : 'INELIGIBLE'} · family ${recurrenceProbe.modeFamily || 'n/a'}` : 'n/a'}`,
      `Request lineage: ${probeFresh && lineage ? `${lineage.sourceKind || 'UNSEEDED'} · root ${lineage.rootMode || 'n/a'}@${Number(lineage.rootIndex ?? -1)} · parent ${lineage.parentMode || 'n/a'}@${Number(lineage.parentIndex ?? -1)} · depth ${Number(lineage.depth || 0)}` : 'n/a'}`,
      `Source handoff: ${probeFresh && handoff ? `${handoff.newSource ? 'NEW SOURCE' : (handoff.eligible ? (handoff.seen ? 'SAME SOURCE' : 'FIRST') : 'INELIGIBLE')} · reason ${handoff.reason || 'n/a'}` : 'n/a'}`,
      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · output ${narrative.outputTimestamp || 'n/a'}` : 'n/a'}`,
      `Broadcast: ${state?.broadcastLocked ? 'LOCKED' : 'UNLOCKED'} · airtime ${state?.broadcastAirtime || 'n/a'} · start ${state?.broadcastAirtimeStart || 'n/a'}`,
      '',
      'Warnings detail:',
      ...(warnings.length ? warnings.map((x) => `- ${x}`) : ['- none']),
      'Compatibility detail:',
      ...(compatibility.length ? compatibility.map((x) => `- ${x}`) : ['- none']),
      '',
    ];

    const sections = [];
    if (probeFresh && rootIndex >= 0 && rootIndex !== currentUserIndex) {
      sections.push(diagnosticSection(
        'ROOT SOURCE TURN (RAW)',
        messages,
        rootIndex,
        rootAssistantIndex,
        [`Root mode: ${lineage?.rootMode || 'n/a'}`, `Lineage role: authoritative root source`],
      ));
    } else if (probeFresh && rootIndex === currentUserIndex && rootIndex >= 0) {
      lines.push('Root source: current input (INLINE/current-turn source); see CURRENT TURN below.', '');
    } else {
      lines.push('Root source: unavailable for this live probe.', '');
    }

    if (probeFresh && parentIndex >= 0 && parentIndex !== currentUserIndex && parentIndex !== rootIndex) {
      sections.push(diagnosticSection(
        'PARENT TURN (RAW)',
        messages,
        parentIndex,
        parentAssistantIndex,
        [`Parent mode: ${lineage?.parentMode || 'n/a'}`, `Lineage depth: ${Number(lineage?.depth || 0)}`],
      ));
    }

    sections.push(diagnosticSection(
      'CURRENT TURN (RAW)',
      messages,
      currentUserIndex,
      latestAssistantIndex,
      [`Current mode: ${lastCore?.mode || state?.lastMode || 'n/a'}`],
    ));
    return lines.join('\n') + sections.join('\n');
  }

  async function copyLastTurnDiagnostic(chat, state) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(buildLastTurnDiagnosticReport(chat, state));
        return true;
      }
    } catch (_) {}
    return false;
  }

'''

for path in FILES:
    text = path.read_text(encoding='utf-8')
    original = text

    if '//@version 0.63.0' not in text:
        raise SystemExit(f'{path}: expected 0.63.0 metadata')
    text = text.replace('//@version 0.63.0', '//@version 0.63.1', 1)

    marker = '// v0.63.0 Cache-Aware Prompt Compiler:\n'
    if marker not in text:
        raise SystemExit(f'{path}: 0.63.0 changelog marker missing')
    if '// v0.63.1 Short-C Source Lock + Turn Diagnostic Copy:' in text:
        raise SystemExit(f'{path}: 0.63.1 changelog already present')
    text = text.replace(marker, CHANGELOG + marker, 1)

    if OLD_PROMPT not in text:
        raise SystemExit(f'{path}: short-C prompt anchor baseline missing')
    text = text.replace(OLD_PROMPT, NEW_PROMPT, 1)

    budget_anchor = "        lineageAnchor: runtimeBudgetLines.some((line) => line === 'short_community_request_context_is_current_lineage=1'),\n"
    if budget_anchor not in text:
        raise SystemExit(f'{path}: runtime budget lineage anchor missing')
    text = text.replace(
        budget_anchor,
        budget_anchor + "        sourceAnchor: runtimeBudgetLines.some((line) => line === 'short_community_source_is_authoritative=1'),\n",
        1,
    )

    open_panel_anchor = "  async function openPanel() {\n"
    if open_panel_anchor not in text:
        raise SystemExit(f'{path}: openPanel anchor missing')
    text = text.replace(open_panel_anchor, DIAG_FUNCTIONS + open_panel_anchor, 1)

    title_old = '<h1>⚙️ SimCore v0.63.0 <button id="close">닫기</button></h1>'
    title_new = '<h1>⚙️ SimCore v0.63.1 <button id="copy-turn-diag">최근 턴 진단 복사</button> <button id="close">닫기</button></h1>'
    if title_old not in text:
        raise SystemExit(f'{path}: panel title anchor missing')
    text = text.replace(title_old, title_new, 1)

    short_metric_old = "<div class=\"metric\"><div class=\"k\">Short-C lineage</div><div class=\"v\">${lastRuntimePromptBudget?.lineageAnchor ? 'CURRENT LINEAGE' : 'OFF'}</div></div>"
    short_metric_new = "<div class=\"metric\"><div class=\"k\">Short-C lineage</div><div class=\"v\">${lastRuntimePromptBudget?.sourceAnchor ? 'SOURCE LOCKED' : (lastRuntimePromptBudget?.lineageAnchor ? 'CURRENT LINEAGE' : 'OFF')}</div></div>"
    if short_metric_old not in text:
        raise SystemExit(f'{path}: Short-C metric anchor missing')
    text = text.replace(short_metric_old, short_metric_new, 1)

    footer_old = '<div class="card muted">Short Community Lineage Anchor · FIRST/SAME SOURCE seeded short-C gets one current-lineage hint</div>'
    footer_new = '<div class="card muted">Short-C Source Lock · eligible short-C is bound to the current lineage root; diagnostic copy is manual/raw-only</div>'
    if footer_old not in text:
        raise SystemExit(f'{path}: Short-C footer anchor missing')
    text = text.replace(footer_old, footer_new, 1)

    close_handler = "      document.getElementById('close').onclick = () => Risuai.hideContainer();\n"
    copy_handler = """      const copyTurnDiagButton = document.getElementById('copy-turn-diag');\n      if (copyTurnDiagButton) copyTurnDiagButton.onclick = async () => {\n        const oldText = copyTurnDiagButton.textContent;\n        copyTurnDiagButton.textContent = (await copyLastTurnDiagnostic(chat, s)) ? '복사됨 ✓' : '복사 실패';\n        setTimeout(() => { copyTurnDiagButton.textContent = oldText; }, 1200);\n      };\n"""
    if close_handler not in text:
        raise SystemExit(f'{path}: close handler anchor missing')
    text = text.replace(close_handler, copy_handler + close_handler, 1)

    # Runtime-facing labels only. Keep the historical 0.63.0 changelog intact.
    text = text.replace('[simcore/v0.63.0]', '[simcore/v0.63.1]')

    if text == original:
        raise SystemExit(f'{path}: no changes produced')
    path.write_text(text, encoding='utf-8')

if FILES[0].read_bytes() != FILES[1].read_bytes():
    raise SystemExit('latest.js/install.js parity failed after patch')

print('patched SimCore 0.63.1 latest.js/install.js')
