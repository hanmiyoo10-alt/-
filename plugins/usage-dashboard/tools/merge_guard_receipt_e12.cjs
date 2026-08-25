#!/usr/bin/env node
'use strict';

const SHA_RE = /^[0-9a-f]{40}$/;
const BASE_SOURCES = new Set(['explicit-frozen-main-trailer','ancestry-compatibility-fallback']);
const VERDICTS = new Set([
  'MERGE_READY_NO_DRIFT',
  'MERGE_READY_WITH_UNRELATED_MAIN_DRIFT',
  'MERGE_BLOCKED_PROTECTED_MAIN_DRIFT',
]);

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function boundedPaths(paths) {
  const list = Array.isArray(paths) ? paths.map((value)=>String(value)).filter(Boolean) : [];
  return `${list.slice(0,20).join(',')}${list.length>20?`,...(+${list.length-20})`:''}`;
}

function assertGuardResult(row) {
  if (!row || typeof row !== 'object') fail('E12_MERGE_GUARD_RESULT_INVALID');
  if (!VERDICTS.has(row.verdict)) fail('E12_MERGE_GUARD_VERDICT_INVALID', String(row.verdict || ''));
  for (const [key,value] of [
    ['candidateParentSha',row.candidateParentSha],
    ['candidateBaseSha',row.candidateBaseSha],
    ['currentMainSha',row.currentMainSha],
  ]) {
    if (!SHA_RE.test(String(value || ''))) fail('E12_MERGE_GUARD_SHA_INVALID', key);
  }
  if (!BASE_SOURCES.has(row.candidateBaseSource)) fail('E12_MERGE_GUARD_BASE_SOURCE_INVALID', String(row.candidateBaseSource || ''));
  return row;
}

function formatMergeGuardReceipt(marker, result) {
  const row = assertGuardResult(result);
  const expectedMarker = `UD_E11_MERGE_GUARD:${row.candidateSha || ''}:${row.currentMainSha}`;
  if (typeof marker !== 'string' || !marker.startsWith('UD_E11_MERGE_GUARD:')) fail('E12_MERGE_GUARD_MARKER_INVALID');
  if (row.candidateSha && marker !== expectedMarker) fail('E12_MERGE_GUARD_MARKER_MISMATCH');
  const lines = [
    marker,
    `verdict: ${row.verdict}`,
    `candidate_parent_sha: ${row.candidateParentSha}`,
    `candidate_base_sha: ${row.candidateBaseSha}`,
    `candidate_base_source: ${row.candidateBaseSource}`,
    `current_main_sha: ${row.currentMainSha}`,
  ];
  const changed = boundedPaths(row.changedPaths);
  const protectedPaths = boundedPaths(row.protectedPaths);
  if (changed) lines.push(`changed_paths: ${changed}`);
  if (protectedPaths) lines.push(`protected_paths: ${protectedPaths}`);
  if (row.verdict === 'MERGE_BLOCKED_PROTECTED_MAIN_DRIFT') {
    lines.push('next: refresh the same source branch on current main, update source_sha on the same durable request, then re-stage/revalidate');
  } else {
    lines.push('next: assistant re-reads PR head/candidate/main/mergeability and performs expected-head merge only while this receipt is fresh');
  }
  return lines.join('\n');
}

function main() {
  const [command, marker, json] = process.argv.slice(2);
  if (command !== '--format' || !marker || !json) fail('E12_MERGE_GUARD_RECEIPT_USAGE');
  process.stdout.write(formatMergeGuardReceipt(marker, JSON.parse(json)));
}

module.exports = {SHA_RE,BASE_SOURCES,VERDICTS,boundedPaths,assertGuardResult,formatMergeGuardReceipt};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
