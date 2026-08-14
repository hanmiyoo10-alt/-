from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.18 Evidence Boundary Probe:\n// - Diagnostics-only follow-up after v0.63.17 live mapping uniquely located the root user as NORMALIZED and the authoritative source assistant as TRANSFORMED in the final beforeRequest array\n// - Extends transformed-source telemetry with deterministic start/middle/end anchor survival, normalized source/request lengths, and leading/trailing boundary gaps so the next release can decide whether whole-message in-place fencing is safe\n// - Does not fence, inject, copy, summarize, semantically compare, retain source bodies, repair output, or add state/schema/storage fields\n// - Adds no host/storage/API call, timer, polling, or visible-chat mutation and keeps all 16 internal modules byte-identical to v0.63.17\n//\n"""

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
    let picked = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (!predicate(rows[i])) continue;
      count += 1;
      if (!picked) picked = { ...rows[i], requestIndex: i };
      if (count >= 2) break;
    }
    return {
      stage: count === 0 ? 'ABSENT' : (count === 1 ? stage : 'AMBIGUOUS'),
      count,
      requestIndex: picked?.requestIndex ?? -1,
      role: picked?.role || null,
      requestChars: picked?.text?.length || 0,
      requestNormChars: picked?.norm?.length || 0,
      requestNorm: picked?.norm || '',
    };
  }

  function evidenceAnchorChunks(target) {
    const text = String(target || '');
    if (text.length < 48) return [];
    const size = Math.min(64, Math.max(24, Math.floor(text.length / 8)));
    const middleStart = Math.max(0, Math.floor((text.length - size) / 2));
    return [
      { key: 'S', text: text.slice(0, size) },
      { key: 'M', text: text.slice(middleStart, middleStart + size) },
      { key: 'E', text: text.slice(Math.max(0, text.length - size)) },
    ].filter((x, i, a) => x.text && a.findIndex((y) => y.text === x.text) === i);
  }

  function evidenceBoundary(targetNorm, requestNorm) {
    const anchors = evidenceAnchorChunks(targetNorm);
    const found = [];
    for (const anchor of anchors) {
      const pos = requestNorm.indexOf(anchor.text);
      if (pos >= 0) found.push({ key: anchor.key, pos, len: anchor.text.length });
    }
    found.sort((a, b) => a.pos - b.pos);
    const first = found[0] || null;
    const last = found[found.length - 1] || null;
    return {
      anchorMask: found.map((x) => x.key).join('') || 'NONE',
      anchorCount: found.length,
      leadingGap: first ? first.pos : -1,
      trailingGap: last ? Math.max(0, requestNorm.length - (last.pos + last.len)) : -1,
    };
  }

  function evidenceTargetShape(requestMessages, targetText, getText) {
    const target = String(targetText || '');
    const targetNorm = evidenceNormalize(target);
    if (!target || !targetNorm) {
      return { stage: 'ABSENT', count: 0, requestIndex: -1, role: null, requestChars: 0, requestNormChars: 0, targetNormChars: targetNorm.length, anchorMask: 'NONE', anchorCount: 0, leadingGap: -1, trailingGap: -1 };
    }
    const rows = (Array.isArray(requestMessages) ? requestMessages : []).map((m) => {
      const text = evidenceText(m, getText);
      return { role: m?.role || null, text, norm: evidenceNormalize(text) };
    });

    let r = evidencePick(rows, (x) => x.text === target, 'EXACT');
    if (!r.count) r = evidencePick(rows, (x) => x.norm === targetNorm, 'NORMALIZED');
    if (!r.count && targetNorm.length >= 24) r = evidencePick(rows, (x) => x.norm.length >= targetNorm.length && x.norm.includes(targetNorm), 'EMBEDDED');
    if (!r.count) {
      const anchors = evidenceAnchorChunks(targetNorm);
      if (anchors.length >= 2) {
        const required = Math.min(2, anchors.length);
        r = evidencePick(rows, (x) => anchors.reduce((n, a) => n + (x.norm.includes(a.text) ? 1 : 0), 0) >= required, 'TRANSFORMED');
      }
    }
    const boundary = r.requestIndex >= 0 ? evidenceBoundary(targetNorm, r.requestNorm) : { anchorMask: 'NONE', anchorCount: 0, leadingGap: -1, trailingGap: -1 };
    return {
      stage: r.stage,
      count: r.count,
      requestIndex: r.requestIndex,
      role: r.role,
      requestChars: r.requestChars,
      requestNormChars: r.requestNormChars,
      targetNormChars: targetNorm.length,
      ...boundary,
    };
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
      rootUserNormChars: rootShape.targetNormChars,
      rootUserRequestNormChars: rootShape.requestNormChars,
      rootUserAnchorMask: rootShape.anchorMask,
      rootUserLeadingGap: rootShape.leadingGap,
      rootUserTrailingGap: rootShape.trailingGap,
      sourceAssistantShape: assistantShape.stage,
      sourceAssistantRawIndex: sourceAssistantIndex,
      sourceAssistantRequestIndex: assistantShape.requestIndex,
      sourceAssistantRequestRole: assistantShape.role,
      sourceAssistantMatches: assistantShape.count,
      sourceAssistantChars: sourceAssistantText.length,
      sourceAssistantRequestChars: assistantShape.requestChars,
      sourceAssistantNormChars: assistantShape.targetNormChars,
      sourceAssistantRequestNormChars: assistantShape.requestNormChars,
      sourceAssistantAnchorMask: assistantShape.anchorMask,
      sourceAssistantLeadingGap: assistantShape.leadingGap,
      sourceAssistantTrailingGap: assistantShape.trailingGap,
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
    if '//@version 0.63.17' not in text:
        raise SystemExit(f'{path}: expected 0.63.17 baseline')
    if '// v0.63.18 Evidence Boundary Probe:' in text:
        raise SystemExit(f'{path}: already patched')
    text = replace_once(text, '//@version 0.63.17', '//@version 0.63.18', 'version', path)
    text = replace_once(text, '// v0.63.17 Evidence Shape Probe:\n', CHANGELOG + '// v0.63.17 Evidence Shape Probe:\n', 'changelog', path)
    begin = text.find('  // EVIDENCE_MAPPING_PROBE_BEGIN\n')
    end_marker = '  // EVIDENCE_MAPPING_PROBE_END\n'
    end = text.find(end_marker, begin)
    if begin < 0 or end < 0:
        raise SystemExit(f'{path}: evidence probe markers missing')
    end += len(end_marker)
    text = text[:begin] + PROBE_FUNCS + text[end:]
    old_line = "      `Evidence shape: ${evidenceMap ? `${evidenceMap.status} · root ${evidenceMap.rootUserShape} raw @${evidenceMap.rootUserRawIndex}→request @${evidenceMap.rootUserRequestIndex >= 0 ? evidenceMap.rootUserRequestIndex : 'n/a'} role ${evidenceMap.rootUserRequestRole || 'n/a'} (${evidenceMap.rootUserMatches} match) · source assistant ${evidenceMap.sourceAssistantShape} raw @${evidenceMap.sourceAssistantRawIndex >= 0 ? evidenceMap.sourceAssistantRawIndex : 'n/a'}→request @${evidenceMap.sourceAssistantRequestIndex >= 0 ? evidenceMap.sourceAssistantRequestIndex : 'n/a'} role ${evidenceMap.sourceAssistantRequestRole || 'n/a'} (${evidenceMap.sourceAssistantMatches} match)` : 'n/a'}`,\n"
    new_line = old_line + "      `Evidence boundary: ${evidenceMap ? `root anchors ${evidenceMap.rootUserAnchorMask} · norm ${evidenceMap.rootUserNormChars}→${evidenceMap.rootUserRequestNormChars} · gaps ${evidenceMap.rootUserLeadingGap}/${evidenceMap.rootUserTrailingGap} · assistant anchors ${evidenceMap.sourceAssistantAnchorMask} · norm ${evidenceMap.sourceAssistantNormChars}→${evidenceMap.sourceAssistantRequestNormChars} · gaps ${evidenceMap.sourceAssistantLeadingGap}/${evidenceMap.sourceAssistantTrailingGap}` : 'n/a'}`,\n"
    text = replace_once(text, old_line, new_line, 'diagnostic evidence boundary line', path)
    text = replace_once(text, '⚙️ SimCore v0.63.17', '⚙️ SimCore v0.63.18', 'panel version', path)
    text = replace_once(text, "'Version: 0.63.17'", "'Version: 0.63.18'", 'diagnostic version', path)
    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.18 latest.js/install.js (diagnostics-only Evidence Boundary Probe; all 16 internal modules frozen)')
