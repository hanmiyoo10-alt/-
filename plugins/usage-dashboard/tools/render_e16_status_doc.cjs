'use strict';

const STATUS_BEGIN = '<!-- E16_GENERATED_STATUS:BEGIN -->';
const STATUS_END = '<!-- E16_GENERATED_STATUS:END -->';
const STATUS = Object.freeze({
  schema: 1,
  implementation: 'live-baseline-proven',
  durableReleaseGeneration: 'E13',
  durableGeneration: false,
  documentationMode: 'generated-parity',
  evidenceMode: 'immutable-release-receipts',
  liveEvidenceIssue: '#906',
  liveProofReleases: Object.freeze(['3.0.0-alpha.5.91', '3.0.0-alpha.5.92']),
  liveProofRequests: Object.freeze(['#909', '#923']),
});

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function renderStatusBlock() {
  return [
    STATUS_BEGIN,
    '## Generated implementation / live-proof status',
    '',
    '> Machine-owned block. Regenerate from the local E16 documentation contract; do not hand-edit its contents.',
    '',
    `- schema: \`${STATUS.schema}\``,
    `- implementation: \`${STATUS.implementation}\``,
    '- authority helper: `plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs` (unchanged)',
    '- authority contract: `plugins/usage-dashboard/tests/e16-derived-merge-authority-capsule-contract.cjs`',
    '- documentation parity: `plugins/usage-dashboard/tests/e16-documentation-status-hygiene-contract.cjs`',
    `- durable release generation: \`${STATUS.durableReleaseGeneration}\``,
    `- E16 durable generation: \`${STATUS.durableGeneration ? 'yes' : 'no'}\``,
    `- documentation mode: \`${STATUS.documentationMode}\``,
    `- evidence mode: \`${STATUS.evidenceMode}\``,
    `- live evidence history: \`${STATUS.liveEvidenceIssue}\``,
    `- live proof releases: \`${STATUS.liveProofReleases.join(', ')}\``,
    `- live proof requests: \`${STATUS.liveProofRequests.join(', ')}\``,
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
  STATUS,
  renderStatusBlock,
  extractStatusBlock,
  assertStatusCurrent,
  replaceStatusBlock,
};
