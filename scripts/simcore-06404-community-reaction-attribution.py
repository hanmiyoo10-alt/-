from pathlib import Path

LATEST = Path('plugins/simcore/latest.js')
INSTALL = Path('plugins/simcore/install.js')

text = LATEST.read_text(encoding='utf-8')

expected = [
    '//@version 0.64.3',
    "const SIMCORE_RUNTIME_VERSION = '0.64.3';",
    '// v0.64.3 B_END Diagnostic Builder Binding Repair:',
    "const REACTION_AT_END_RE = /\\[(공감|RT|좋아요|추천|Upvote|포텐)\\s+([\\d,]+(?:\\.\\d+)?\\s*(?:천|만|억|K|M|B)?)\\]\\s*$/i;",
    '댓글 반응 태그 ${reactionLineErrors}줄 오류',
    'REPRESENTATION_FAST_RECONCILED',
    'USER_EDIT_CANDIDATE',
    'MANUAL_EDIT_REBUILT',
]
for marker in expected:
    if marker not in text:
        raise SystemExit(f'missing expected v0.64.3 marker: {marker}')

if '// v0.64.4 COMMUNITY Reaction Validator Attribution:' in text:
    raise SystemExit('v0.64.4 release note already present')
if 'function inspectCommentReactionLine(line)' in text:
    raise SystemExit('reaction attribution helper already present')

release_note = """// v0.64.4 COMMUNITY Reaction Validator Attribution:
// - Follows recurrent v0.64.3 B_START/B_CONTINUE/B_END COMMUNITY reaction-tail warnings whose retained visible suffix examples are accepted by the current Reaction regex and therefore do not statically reproduce the live failure
// - Adds bounded reason attribution only: Reaction exposes inspectCommentReactionLine() while Structure keeps the exact old pass/fail predicate semantics and remains judge-only
// - Invalid lines are classified as MISSING / MULTIPLE / FINAL_TAIL with bounded tail kind/count metadata; raw comment text is never retained, persisted or logged by the helper
// - No reaction grammar tolerance, normalization rule, supported label, output repair, COMMUNITY shape, Broadcast/Time/Frame, Representation/Edit Reconcile, Store schema, host/network/timer or prompt-generation semantic changes are introduced
// - The next natural recurrence is the gate for an evidence-backed repair mini; this release intentionally does not guess at invisible-character or trimming behavior
//
"""

text = text.replace('//@version 0.64.3', '//@version 0.64.4', 1)
text = text.replace("const SIMCORE_RUNTIME_VERSION = '0.64.3';", "const SIMCORE_RUNTIME_VERSION = '0.64.4';", 1)
text = text.replace('// v0.64.3 B_END Diagnostic Builder Binding Repair:', release_note + '// v0.64.3 B_END Diagnostic Builder Binding Repair:', 1)

reaction_anchor = """const REACTION_AT_END_RE = /\\[(공감|RT|좋아요|추천|Upvote|포텐)\\s+([\\d,]+(?:\\.\\d+)?\\s*(?:천|만|억|K|M|B)?)\\]\\s*$/i;

function parseReactionNumber(raw) {"""
reaction_replacement = """const REACTION_AT_END_RE = /\\[(공감|RT|좋아요|추천|Upvote|포텐)\\s+([\\d,]+(?:\\.\\d+)?\\s*(?:천|만|억|K|M|B)?)\\]\\s*$/i;

function inspectCommentReactionLine(line) {
  const text = String(line || '');
  const matcher = new RegExp(REACTION_RE.source, 'gi');
  let tagCount = 0;
  let lastTagEnd = -1;
  let match = null;
  while ((match = matcher.exec(text)) !== null) {
    tagCount += 1;
    lastTagEnd = matcher.lastIndex;
    if (match[0] === '') matcher.lastIndex += 1;
  }

  const finalTagValid = REACTION_AT_END_RE.test(text);
  const ok = tagCount === 1 && finalTagValid;
  let failureReason = 'NONE';
  if (!ok) {
    if (tagCount === 0) failureReason = 'MISSING';
    else if (tagCount > 1) failureReason = 'MULTIPLE';
    else failureReason = 'FINAL_TAIL';
  }

  let tailKind = tagCount === 0 ? 'NO_TAG' : 'NONE';
  let trailingChars = 0;
  if (lastTagEnd >= 0 && lastTagEnd < text.length) {
    const tail = text.slice(lastTagEnd);
    trailingChars = Array.from(tail).length;
    if (/^\\s+$/.test(tail)) tailKind = 'WHITESPACE';
    else if (/^[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u206F]+$/.test(tail)) tailKind = 'FORMAT_ONLY';
    else tailKind = 'VISIBLE_OR_UNKNOWN';
  }

  return {
    ok,
    tagCount,
    finalTagValid,
    failureReason,
    tailKind,
    trailingChars,
  };
}

function parseReactionNumber(raw) {"""
if text.count(reaction_anchor) != 1:
    raise SystemExit(f'unexpected reaction helper anchor count: {text.count(reaction_anchor)}')
text = text.replace(reaction_anchor, reaction_replacement, 1)

export_anchor = """module.exports = {
  REACTION_RE,
  REACTION_AT_END_RE,
  parseReactionNumber,"""
export_replacement = """module.exports = {
  REACTION_RE,
  REACTION_AT_END_RE,
  inspectCommentReactionLine,
  parseReactionNumber,"""
if text.count(export_anchor) != 1:
    raise SystemExit(f'unexpected reaction export anchor count: {text.count(export_anchor)}')
text = text.replace(export_anchor, export_replacement, 1)

old_structure = """      const commentLines = commentScope.split(/\\r?\\n/).filter((line) => /^\\s*(?:-\\s+|ㄴ\\s+)/.test(line));
      let reactionLineErrors = 0;
      for (const line of commentLines) {
        const tags = line.match(new RegExp(reaction.REACTION_RE.source, 'gi')) || [];
        if (tags.length !== 1 || !reaction.REACTION_AT_END_RE.test(line)) reactionLineErrors += 1;
      }
      if (reactionLineErrors) {
        issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 댓글 반응 태그 ${reactionLineErrors}줄 오류 (각 댓글/대댓글 끝에 정확히 1개 필요)`);
      }"""
new_structure = """      const commentLines = commentScope.split(/\\r?\\n/).filter((line) => /^\\s*(?:-\\s+|ㄴ\\s+)/.test(line));
      let reactionLineErrors = 0;
      const reactionFailureCounts = {
        missing: 0,
        multiple: 0,
        finalTail: 0,
        tailFormatOnly: 0,
        tailVisibleOrUnknown: 0,
        tailOther: 0,
        trailingChars: 0,
      };
      for (const line of commentLines) {
        const inspection = reaction.inspectCommentReactionLine(line);
        if (inspection.ok) continue;
        reactionLineErrors += 1;
        if (inspection.failureReason === 'MISSING') reactionFailureCounts.missing += 1;
        else if (inspection.failureReason === 'MULTIPLE') reactionFailureCounts.multiple += 1;
        else if (inspection.failureReason === 'FINAL_TAIL') {
          reactionFailureCounts.finalTail += 1;
          reactionFailureCounts.trailingChars += Number(inspection.trailingChars || 0);
          if (inspection.tailKind === 'FORMAT_ONLY') reactionFailureCounts.tailFormatOnly += 1;
          else if (inspection.tailKind === 'VISIBLE_OR_UNKNOWN') reactionFailureCounts.tailVisibleOrUnknown += 1;
          else reactionFailureCounts.tailOther += 1;
        }
      }
      if (reactionLineErrors) {
        issues.push(`COMMUNITY ${bi + 1}-${si + 1}: 댓글 반응 태그 ${reactionLineErrors}줄 오류 (각 댓글/대댓글 끝에 정확히 1개 필요) · missing ${reactionFailureCounts.missing} · multiple ${reactionFailureCounts.multiple} · final-tail ${reactionFailureCounts.finalTail} · tail-format ${reactionFailureCounts.tailFormatOnly} · tail-visible ${reactionFailureCounts.tailVisibleOrUnknown} · tail-other ${reactionFailureCounts.tailOther} · tail-chars ${reactionFailureCounts.trailingChars}`);
      }"""
if text.count(old_structure) != 1:
    raise SystemExit(f'unexpected Structure reaction validator block count: {text.count(old_structure)}')
text = text.replace(old_structure, new_structure, 1)

if text.count('function inspectCommentReactionLine(line)') != 1:
    raise SystemExit('reaction attribution helper count is not exactly one')
if text.count('inspectCommentReactionLine,') != 1:
    raise SystemExit('reaction attribution export count is not exactly one')
if text.count('reaction.inspectCommentReactionLine(line)') != 1:
    raise SystemExit('Structure attribution consumer count is not exactly one')
if 'tags.length !== 1 || !reaction.REACTION_AT_END_RE.test(line)' in text:
    raise SystemExit('legacy inline Structure predicate was not replaced')

LATEST.write_text(text, encoding='utf-8')
INSTALL.write_text(text, encoding='utf-8')
print('SimCore v0.64.4 attribution patch applied')
