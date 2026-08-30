'use strict';

const e16 = require('./release_merge_capsule_e16.cjs');

const STATUS_BEGIN = '<!-- E16_GENERATED_STATUS:BEGIN -->';
const STATUS_END = '<!-- E16_GENERATED_STATUS:END -->';

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function renderStatusBlock() {
  const status = e16.E16_IMPLEMENTATION_STATUS;
  return [
    STATUS_BEGIN,
    '## Generated implementation / live-proof status',
    '',
    '> Machine-owned block. Regenerate from the local E16 contract; do not hand-edit its contents.',
    '',
    `- schema: \`${status.schema}\``,
    `- implementation: \`${status.implementation}\``,
    '- helper: `plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs`',
    '- contract: `plugins/usage-dashboard/tests/e16-derived-merge-authority-capsule-contract.cjs`',
    '- documentation parity: `plugins/usage-dashboard/tests/e16-documentation-status-hygiene-contract.cjs`',
    `- durable release generation: \`${status.durableReleaseGeneration}\``,
    `- E16 durable generation: \`${status.durableGeneration ? 'yes' : 'no'}\``,
    `- documentation mode: \`${status.documentationMode}\``,
    `- evidence mode: \`${status.evidenceMode}\``,
    `- live evidence history: \`${status.liveEvidenceIssue}\``,
    `- live proof releases: \`${status.liveProofReleases.join(', ')}\``,
    `- live proof requests: \`${status.liveProofRequests.join(', ')}\``,
    STATUS_END,
  ].join('\n');
}

function extractStatusBlock(documentText) {
  const text = String(documentText || '').replace(/\r/g, '');
  const begin = text.indexOf(STATUS_BEGIN);
  const end = text.indexOf(STATUS_END);
  if (begin < 0 || end < 0 || end < begin) fail('E16_DOC_STATUS_MARKERS_INVALID');
  const after = end + STATUS_END.length;
  if (text.indexOf(STATUS_BEGIN, begin + STATUS_BEGIN.length) >= 0) fail('E16_DOC_STATUS_MARKERS_DUPLICATE');
  if (text.indexOf(STATUS_END, after) >= 0) fail('E16_DOC_STATUS_MARKERS_DUPLICATE');
  return text.slice(begin, after);
}

function assertStatusCurrent(documentText) {
  const actual = extractStatusBlock(documentText);
  const expected = renderStatusBlock();
  if (actual !== expected) fail('E16_DOC_STATUS_STALE', 'regenerate canonical E16 status block');
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
