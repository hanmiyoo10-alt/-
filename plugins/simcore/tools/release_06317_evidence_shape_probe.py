from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.17 Evidence Shape Probe:\n// - Diagnostics-only follow-up after v0.63.16 live mapping returned MISSING for both authoritative root messages\n// - Classifies how each raw source message appears in the already-built beforeRequest array using deterministic stages only: EXACT, NORMALIZED, EMBEDDED, TRANSFORMED, AMBIGUOUS, or ABSENT\n// - Records request index and request role without retaining source text; light normalization is whitespace-only and transformed detection uses fixed source anchors rather than semantic similarity\n// - Adds no prompt text, source injection/fence, output repair, state/schema/storage field, host/storage/API call, timer, polling, or visible-chat mutation\n// - Keeps all 16 internal modules byte-identical to v0.63.16, including Frame, Prompt, Time, Structure, Recovery, Lineage, Handoff, Recurrence, Community, Reaction, Session, and OPS\n//\n"""

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

  function evidenceNormalize(text) {
    return String(text || '').replace(/\r\n?/g, '\n').replace(/\s+/g, ' ').trim();
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

  function evidencePick(rows, predicate, stage) {
    let count = 0;
    let requestIndex = -1;
    let role = null;
    let requestChars = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (!predicate(rows[i])) continue;
      count += 1;
      if (requestIndex < 0) {
        requestIndex = i;
        role = rows[i]?.role || null;
        requestChars = rows[i]?.text?.length || 0;
      }
      if (count >= 2) break;
    }
    return {
      stage: count === 0 ? 'ABSENT' : (count === 1 ? stage : 'AMBIGUOUS'),
      count,
      requestIndex,
      role,
      requestChars,
    };
  }

  function evidenceAnchorChunks(target) {
    const text = String(target || '');
    if (text.length < 48) return [];
    const size = Math.min(64, Math.max(24, Math.floor(text.length / 8)));
    const middleStart = Math.max(0, Math.floor((text.length - size) / 2));
    return [
      text.slice(0, size),
      text.slice(middleStart, middleStart + size),
      text.slice(Math.max(0, text.length - size)),
    ].filter((x, i, a) => x && a.indexOf(x) === i);
  }

  function evidenceTargetShape(requestMessages, targetText, getText) {
    const target = String(targetText || '');
    const targetNorm = evidenceNormalize(target);
    if (!target || !targetNorm) {
      return { stage: 'ABSENT', count: 0, requestIndex: -1, role: null, requestChars: 0 };
    }
    const rows = (Array.isArray(requestMessages) ? requestMessages : []).map((m) => {
      const text = evidenceText(m, getText);
      return { role: m?.role || null, text, norm: evidenceNormalize(text) };
    });

    let r = evidencePick(rows, (x) => x.text === target, 'EXACT');
    if (r.count) return r;
    r = evidencePick(rows, (x) => x.norm === targetNorm, 'NORMALIZED');
    if (r.count) return r;
    if (targetNorm.length >= 24) {
      r = evidencePick(rows, (x) => x.norm.length >= targetNorm.length && x.norm.includes(targetNorm), 'EMBEDDED');
      if (r.count) return r;
    }

    const anchors = evidenceAnchorChunks(targetNorm);
    if (anchors.length >= 2) {
      const required = Math.min(2, anchors.length);
      r = evidencePick(rows, (x) => anchors.reduce((n, a) => n + (x.norm.includes(a) ? 1 : 0), 0) >= required, 'TRANSFORMED');
      if (r.count) return r;
    }
    return r;
  }

  function evidenceCombinedStatus(rootShape, assistantShape) {
    const stages = [rootShape?.stage || 'ABSENT', assistantShape?.stage || 'ABSENT'];
    if (stages.includes('AMBIGUOUS')) return 'AMBIGUOUS';
    if (stages.includes('ABSENT')) return 'ABSENT';
    const rank = { EXACT: 0, NORMALIZED: 1, EMBEDDED: 2, TRANSFORMED: 3 };
    return stages.sort((a, b) => (rank[b] ?? 99) - (rank[a] ?? 99))[0] || 'ABSENT';
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

    const rootShape = evidenceTargetShape(requestMessages, rootUserText, getText);
    const assistantShape = evidenceTargetShape(requestMessages, sourceAssistantText, getText);
    return {
      status: evidenceCombinedStatus(rootShape, assistantShape),
      rootUserShape: rootShape.stage,
      rootUserRawIndex: rootIndex,
      rootUserRequestIndex: rootShape.requestIndex,
      rootUserRequestRole: rootShape.role,
      rootUserMatches: rootShape.count,
      rootUserChars: rootUserText.length,
      rootUserRequestChars: rootShape.requestChars,
      sourceAssistantShape: assistantShape.stage,
      sourceAssistantRawIndex: sourceAssistantIndex,
      sourceAssistantRequestIndex: assistantShape.requestIndex,
      sourceAssistantRequestRole: assistantShape.role,
      sourceAssistantMatches: assistantShape.count,
      sourceAssistantChars: sourceAssistantText.length,
      sourceAssistantRequestChars: assistantShape.requestChars,
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
    if '//@version 0.63.16' not in text:
        raise SystemExit(f'{path}: expected 0.63.16 baseline')
    if '// v0.63.17 Evidence Shape Probe:' in text:
        raise SystemExit(f'{path}: already patched')

    text = replace_once(text, '//@version 0.63.16', '//@version 0.63.17', 'version', path)
    text = replace_once(text, '// v0.63.16 Evidence Mapping Probe:\n', CHANGELOG + '// v0.63.16 Evidence Mapping Probe:\n', 'changelog', path)

    begin = text.find('  // EVIDENCE_MAPPING_PROBE_BEGIN\n')
    end_marker = '  // EVIDENCE_MAPPING_PROBE_END\n'
    end = text.find(end_marker, begin)
    if begin < 0 or end < 0:
        raise SystemExit(f'{path}: evidence probe markers missing')
    end += len(end_marker)
    text = text[:begin] + PROBE_FUNCS + text[end:]

    old_line = "      `Evidence map: ${evidenceMap ? `${evidenceMap.status} · root user raw @${evidenceMap.rootUserRawIndex}→request @${evidenceMap.rootUserRequestIndex >= 0 ? evidenceMap.rootUserRequestIndex : 'n/a'} (${evidenceMap.rootUserMatches} match) · source assistant raw @${evidenceMap.sourceAssistantRawIndex >= 0 ? evidenceMap.sourceAssistantRawIndex : 'n/a'}→request @${evidenceMap.sourceAssistantRequestIndex >= 0 ? evidenceMap.sourceAssistantRequestIndex : 'n/a'} (${evidenceMap.sourceAssistantMatches} match)` : 'n/a'}`,\n"
    new_line = "      `Evidence shape: ${evidenceMap ? `${evidenceMap.status} · root ${evidenceMap.rootUserShape} raw @${evidenceMap.rootUserRawIndex}→request @${evidenceMap.rootUserRequestIndex >= 0 ? evidenceMap.rootUserRequestIndex : 'n/a'} role ${evidenceMap.rootUserRequestRole || 'n/a'} (${evidenceMap.rootUserMatches} match) · source assistant ${evidenceMap.sourceAssistantShape} raw @${evidenceMap.sourceAssistantRawIndex >= 0 ? evidenceMap.sourceAssistantRawIndex : 'n/a'}→request @${evidenceMap.sourceAssistantRequestIndex >= 0 ? evidenceMap.sourceAssistantRequestIndex : 'n/a'} role ${evidenceMap.sourceAssistantRequestRole || 'n/a'} (${evidenceMap.sourceAssistantMatches} match)` : 'n/a'}`,\n"
    text = replace_once(text, old_line, new_line, 'diagnostic evidence shape line', path)

    text = replace_once(text, '⚙️ SimCore v0.63.16', '⚙️ SimCore v0.63.17', 'panel version', path)
    text = replace_once(text, "'Version: 0.63.16'", "'Version: 0.63.17'", 'diagnostic version', path)
    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.17 latest.js/install.js (diagnostics-only Evidence Shape Probe; all 16 internal modules frozen)')
