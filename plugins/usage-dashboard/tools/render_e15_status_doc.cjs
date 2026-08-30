'use strict';

const handoff = require('./release_handoff_e15.cjs');

const STATUS_BEGIN = '<!-- E15_GENERATED_STATUS:BEGIN -->';
const STATUS_END = '<!-- E15_GENERATED_STATUS:END -->';

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function renderStatusBlock() {
  const status = handoff.E15_IMPLEMENTATION_STATUS;
  return [
    STATUS_BEGIN,
    '## Generated implementation status',
    '',
    '> Machine-owned block. Regenerate from the local E15 contract; do not hand-edit its contents.',
    '',
    `- schema: \`${status.schema}\``,
    `- implementation: \`${status.implementation}\``,
    '- helper: `plugins/usage-dashboard/tools/release_handoff_e15.cjs`',
    '- contract: `plugins/usage-dashboard/tests/e15-release-handoff-hygiene-contract.cjs`',
    `- durable release generation: \`${status.durableReleaseGeneration}\``,
    `- E15 durable generation: \`${status.durableGeneration ? 'yes' : 'no'}\``,
    `- documentation mode: \`${status.documentationMode}\``,
    `- live evidence history: \`${status.liveEvidenceIssue}\``,
    STATUS_END,
  ].join('\n');
}

function extractStatusBlock(documentText) {
  const text = String(documentText || '').replace(/\r/g, '');
  const begin = text.indexOf(STATUS_BEGIN);
  const end = text.indexOf(STATUS_END);
  if (begin < 0 || end < 0 || end < begin) fail('E15_DOC_STATUS_MARKERS_INVALID');
  const after = end + STATUS_END.length;
  if (text.indexOf(STATUS_BEGIN, begin + STATUS_BEGIN.length) >= 0) fail('E15_DOC_STATUS_MARKERS_DUPLICATE');
  if (text.indexOf(STATUS_END, after) >= 0) fail('E15_DOC_STATUS_MARKERS_DUPLICATE');
  return text.slice(begin, after);
}

function assertStatusCurrent(documentText) {
  const actual = extractStatusBlock(documentText);
  const expected = renderStatusBlock();
  if (actual !== expected) fail('E15_DOC_STATUS_STALE', 'regenerate canonical E15 status block');
  return true;
}

function replaceStatusBlock(documentText) {
  const text = String(documentText || '').replace(/\r/g, '');
  const actual = extractStatusBlock(text);
  return text.replace(actual, renderStatusBlock());
}

module.exports = {
  STATUS_BEGIN,
  STATUS_END,
  renderStatusBlock,
  extractStatusBlock,
  assertStatusCurrent,
  replaceStatusBlock,
};
