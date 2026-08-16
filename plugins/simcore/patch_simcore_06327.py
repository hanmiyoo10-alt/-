from pathlib import Path

latest = Path('plugins/simcore/latest.js')
install = Path('plugins/simcore/install.js')
latest_text = latest.read_text(encoding='utf-8')
install_text = install.read_text(encoding='utf-8')
if latest_text != install_text:
    raise SystemExit('baseline artifacts differ')
s = latest_text


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {count}')
    s = s.replace(old, new, 1)


replace_once('//@version 0.63.26', '//@version 0.63.27', 'version')
replace_once("      'Version: 0.63.26',", "      'Version: 0.63.27',", 'diagnostic version')
replace_once('⚙️ SimCore v0.63.26', '⚙️ SimCore v0.63.27', 'panel version')

replace_once('// v0.63.25 Targeted Reload Hook Cleanup:', '''// v0.63.27 Response Envelope Scope:\n// - Restricts Structure validation, Knowledge scanning and state-commit judgement to the canonical # 응답 envelope instead of treating host/model preamble text as part of the response body\n// - Defines the first canonical timestamp immediately after the ordered response/Volume/Chapter/Chatindex frame as the single frame timestamp; later body/scene timestamps are intentionally allowed and no longer count as duplicate frame timestamps\n// - Preserves Recovery preamble telemetry while allowing a structurally complete canonical envelope to resolve independently, preventing valid multi-scene outputs from being quarantined solely because of later scene timestamps or pre-envelope tag noise\n// - Keeps Time first-timestamp semantics, Frame continuity, Evidence, Prompt, Lineage/Handoff, Recurrence, Reaction, reload safety, storage schema and host/API call sites frozen; no new timer, polling or background activity\n//\n// v0.63.25 Targeted Reload Hook Cleanup:''', 'release note')

helper_anchor = '''const CHATINDEX_HEADER_MARKER_RE = /^[ \\t]*####[ \\t]+Chatindex[^\\r\\n]*$/mi;\nconst TIMESTAMP_MARKER_RE = /⏱️\\[/i;\n\nfunction validateHostFrameItem'''
helper_replacement = '''const CHATINDEX_HEADER_MARKER_RE = /^[ \\t]*####[ \\t]+Chatindex[^\\r\\n]*$/mi;\nconst TIMESTAMP_MARKER_RE = /⏱️\\[/i;\n\nfunction firstMatch(text, re) {\n  const m = String(text || '').match(re);\n  if (!m || !Number.isInteger(m.index)) return null;\n  return { index: m.index, end: m.index + m[0].length, text: m[0] };\n}\n\nfunction responseEnvelopeScope(content) {\n  const raw = String(content || '');\n  const responseInRaw = firstMatch(raw, RESPONSE_HEADER_MARKER_RE);\n  if (!responseInRaw) {\n    return {\n      envelope: raw,\n      responseStart: -1,\n      frameOk: false,\n      orderOk: false,\n      timestampMarkerFound: false,\n      timestampValid: false,\n      timestamp: null,\n    };\n  }\n\n  const envelope = raw.slice(responseInRaw.index);\n  const response = firstMatch(envelope, RESPONSE_HEADER_MARKER_RE);\n  const volume = firstMatch(envelope, VOLUME_HEADER_MARKER_RE);\n  const chapter = firstMatch(envelope, CHAPTER_HEADER_MARKER_RE);\n  const chatindex = firstMatch(envelope, CHATINDEX_HEADER_MARKER_RE);\n\n  let timestampMarker = null;\n  let timestamp = null;\n  if (chatindex) {\n    const afterChatindex = envelope.slice(chatindex.end);\n    const marker = firstMatch(afterChatindex, TIMESTAMP_MARKER_RE);\n    if (marker) {\n      timestampMarker = {\n        index: chatindex.end + marker.index,\n        end: chatindex.end + marker.end,\n        text: marker.text,\n      };\n      const fromMarker = envelope.slice(timestampMarker.index);\n      const parsed = firstMatch(fromMarker, TIMESTAMP_RE);\n      if (parsed && parsed.index === 0) {\n        timestamp = {\n          index: timestampMarker.index,\n          end: timestampMarker.index + parsed.end,\n          text: parsed.text,\n        };\n      }\n    }\n  }\n\n  const responseCount = kernel.regexCount(envelope, RESPONSE_HEADER_MARKER_RE);\n  const volumeCount = kernel.regexCount(envelope, VOLUME_HEADER_MARKER_RE);\n  const chapterCount = kernel.regexCount(envelope, CHAPTER_HEADER_MARKER_RE);\n  const chatindexCount = kernel.regexCount(envelope, CHATINDEX_HEADER_MARKER_RE);\n  const responseValidCount = kernel.regexCount(envelope, RESPONSE_HEADER_RE);\n  const volumeValidCount = kernel.regexCount(envelope, VOLUME_HEADER_RE);\n  const chapterValidCount = kernel.regexCount(envelope, CHAPTER_HEADER_RE);\n  const chatindexValidCount = kernel.regexCount(envelope, CHATINDEX_HEADER_RE);\n\n  const ordered = !!(response && volume && chapter && chatindex && timestamp\n    && response.index === 0\n    && response.end <= volume.index\n    && volume.end <= chapter.index\n    && chapter.end <= chatindex.index\n    && chatindex.end <= timestamp.index);\n  const cleanGaps = !!(ordered\n    && !envelope.slice(response.end, volume.index).trim()\n    && !envelope.slice(volume.end, chapter.index).trim()\n    && !envelope.slice(chapter.end, chatindex.index).trim()\n    && !envelope.slice(chatindex.end, timestamp.index).trim());\n  const orderOk = ordered && cleanGaps;\n  const headerCountsOk = responseCount === 1 && volumeCount === 1 && chapterCount === 1 && chatindexCount === 1;\n  const headerFormatsOk = responseValidCount === 1 && volumeValidCount === 1\n    && chapterValidCount === 1 && chatindexValidCount === 1;\n  const frameOk = headerCountsOk && headerFormatsOk && !!timestamp && orderOk;\n\n  return {\n    envelope,\n    responseStart: responseInRaw.index,\n    frameOk,\n    orderOk,\n    timestampMarkerFound: !!timestampMarker,\n    timestampValid: !!timestamp,\n    timestamp: timestamp?.text || null,\n  };\n}\n\nfunction validateHostFrameItem'''
replace_once(helper_anchor, helper_replacement, 'response envelope scope helper')

validate_anchor = '''function responseEnvelopeIntegrity(content, pending) {'''
validate_insert = '''function validateFrameEnvelope(scope, issues) {\n  const text = scope.envelope;\n  validateHostFrameItem(text, issues, '# 응답 헤더', RESPONSE_HEADER_MARKER_RE, RESPONSE_HEADER_RE);\n  validateHostFrameItem(text, issues, '볼륨 헤더', VOLUME_HEADER_MARKER_RE, VOLUME_HEADER_RE);\n  validateHostFrameItem(text, issues, '챕터 헤더', CHAPTER_HEADER_MARKER_RE, CHAPTER_HEADER_RE);\n  validateHostFrameItem(text, issues, 'Chatindex 헤더', CHATINDEX_HEADER_MARKER_RE, CHATINDEX_HEADER_RE);\n  if (!scope.timestampMarkerFound) issues.push('공통 timestamp 누락');\n  else if (!scope.timestampValid) issues.push('공통 timestamp 형식 오류');\n  if (scope.timestampValid && !scope.orderOk) issues.push('공통 frame 순서 오류');\n}\n\nfunction responseEnvelopeIntegrity(content, pending) {'''
replace_once(validate_anchor, validate_insert, 'frame envelope validator')

old_integrity = '''function responseEnvelopeIntegrity(content, pending) {\n  const text = String(content || '').trim();\n  const expected = lifecycle.expectedCommunityBlocks(pending?.mode);\n  const knowledge = kernel.scanKnowledgeBlocks(text);\n  const blocks = community.communityBlocks(text);\n  const k = knowledge.blocks.length === 1 && !knowledge.malformed ? knowledge.blocks[0] : null;\n  const frameOk = kernel.regexCount(text, RESPONSE_HEADER_RE) === 1\n    && kernel.regexCount(text, VOLUME_HEADER_RE) === 1\n    && kernel.regexCount(text, CHAPTER_HEADER_RE) === 1\n    && kernel.regexCount(text, CHATINDEX_HEADER_RE) === 1\n    && kernel.regexCount(text, TIMESTAMP_RE) === 1;\n  const communityOk = blocks.length === expected;\n  const knowledgeOk = !!k && !text.slice(k.end).trim();\n  return { safe: frameOk && communityOk && knowledgeOk, frameOk, communityOk, knowledgeOk, blocks, knowledge };\n}'''
new_integrity = '''function responseEnvelopeIntegrity(content, pending) {\n  const scope = responseEnvelopeScope(content);\n  const text = String(scope.envelope || '').trim();\n  const expected = lifecycle.expectedCommunityBlocks(pending?.mode);\n  const knowledge = kernel.scanKnowledgeBlocks(text);\n  const blocks = community.communityBlocks(text);\n  const k = knowledge.blocks.length === 1 && !knowledge.malformed ? knowledge.blocks[0] : null;\n  const frameOk = scope.frameOk;\n  const communityOk = blocks.length === expected;\n  const knowledgeOk = !!k && !text.slice(k.end).trim();\n  return { safe: frameOk && communityOk && knowledgeOk, frameOk, communityOk, knowledgeOk, blocks, knowledge, scope };\n}'''
replace_once(old_integrity, new_integrity, 'response envelope integrity')

old_commit = '''function stateCommitSafety(content, pending, envelopeResolved = true) {\n  const text = String(content || '');\n  const expected = lifecycle.expectedCommunityBlocks(pending?.mode);\n  const blocks = community.communityBlocks(text);\n  const responseCount = kernel.regexCount(text, RESPONSE_HEADER_MARKER_RE);\n  const communitySafe = envelopeResolved && responseCount === 1 && blocks.length === expected;\n  return {\n    communitySafe,\n    expectedBlocks: expected,\n    observedBlocks: blocks.length,\n    reason: communitySafe ? '' : `state quarantine: response=${responseCount}, COMMUNITY=${blocks.length}/${expected}`,\n  };\n}'''
new_commit = '''function stateCommitSafety(content, pending, envelopeResolved = true) {\n  const scope = responseEnvelopeScope(content);\n  const text = String(scope.envelope || '');\n  const expected = lifecycle.expectedCommunityBlocks(pending?.mode);\n  const blocks = community.communityBlocks(text);\n  const responseCount = kernel.regexCount(text, RESPONSE_HEADER_MARKER_RE);\n  const communitySafe = envelopeResolved && scope.frameOk && responseCount === 1 && blocks.length === expected;\n  return {\n    communitySafe,\n    expectedBlocks: expected,\n    observedBlocks: blocks.length,\n    reason: communitySafe ? '' : `state quarantine: response=${responseCount}, COMMUNITY=${blocks.length}/${expected}`,\n  };\n}'''
replace_once(old_commit, new_commit, 'state commit safety')

replace_once("  const issues = [];\n  const text = String(content || '');\n  const blocks = community.communityBlocks(text);", "  const issues = [];\n  const scope = responseEnvelopeScope(content);\n  const text = String(scope.envelope || '');\n  const blocks = community.communityBlocks(text);", 'validate structure scope')

old_frame_checks = '''  validateHostFrameItem(text, issues, '# 응답 헤더', RESPONSE_HEADER_MARKER_RE, RESPONSE_HEADER_RE);\n  validateHostFrameItem(text, issues, '볼륨 헤더', VOLUME_HEADER_MARKER_RE, VOLUME_HEADER_RE);\n  validateHostFrameItem(text, issues, '챕터 헤더', CHAPTER_HEADER_MARKER_RE, CHAPTER_HEADER_RE);\n  validateHostFrameItem(text, issues, 'Chatindex 헤더', CHATINDEX_HEADER_MARKER_RE, CHATINDEX_HEADER_RE);\n  validateHostFrameItem(text, issues, 'timestamp', TIMESTAMP_MARKER_RE, TIMESTAMP_RE);'''
replace_once(old_frame_checks, '  validateFrameEnvelope(scope, issues);', 'frame validation scope')

replace_once('module.exports = { TIMESTAMP_RE, responseEnvelopeIntegrity, stateCommitSafety, validateStructure };', 'module.exports = { TIMESTAMP_RE, responseEnvelopeScope, responseEnvelopeIntegrity, stateCommitSafety, validateStructure };', 'structure exports')

if s == latest_text:
    raise SystemExit('patch produced no changes')
if '0.63.26' in s:
    raise SystemExit('stale 0.63.26 version label remains')
if s.count('responseEnvelopeScope') < 5:
    raise SystemExit('response envelope scope helper not wired')

latest.write_text(s, encoding='utf-8')
install.write_text(s, encoding='utf-8')
print('patched SimCore 0.63.27 Response Envelope Scope')
