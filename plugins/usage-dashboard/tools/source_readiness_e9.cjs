#!/usr/bin/env node
'use strict';

const {execFileSync} = require('node:child_process');
const stage = require('./candidate_stage_e6.cjs');
const changes = require('./source_change_semantics.cjs');
const preflight = require('./release_generic_preflight.cjs');

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function git(args, options = {}) {
  return execFileSync('git', args, {encoding:'utf8', ...options}).trim();
}

function showText(sha, path) {
  try { return execFileSync('git',['show',`${sha}:${path}`],{encoding:'utf8'}); }
  catch { return null; }
}

function grepTree(sha, needle, pathspec) {
  try {
    const out = execFileSync('git',['grep','-l','-F','-e',needle,sha,'--',pathspec],{encoding:'utf8'}).trim();
    return out ? out.split(/\r?\n/).map((row) => row.replace(new RegExp(`^${sha.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}:`),'')) : [];
  } catch (error) {
    if (error?.status === 1) return [];
    throw error;
  }
}

function parsePartsAt(sha) {
  const text = showText(sha,'plugins/usage-dashboard/src/parts.cjs');
  if (text === null) fail('E9_READINESS_PARTS_MISSING');
  const rows = [];
  const re = /\{file:'([^']+)', marker:(null|'(?:\\.|[^'])*'), label:'[^']*'\}/g;
  for (const match of text.matchAll(re)) {
    const file = match[1];
    let marker = null;
    if (match[2] !== 'null') marker = Function(`return ${match[2]}`)();
    rows.push({file,marker});
  }
  if (!rows.length) fail('E9_READINESS_PARTS_PARSE_EMPTY');
  return rows;
}

function assertTouchedPartBoundaries(sourceSha, changeRows) {
  const touched = new Set();
  for (const row of changeRows) {
    if (row.path.startsWith('plugins/usage-dashboard/src/') && row.path.endsWith('.part.js') && row.kind !== 'D') touched.add(row.path.slice('plugins/usage-dashboard/src/'.length));
    if (row.kind === 'R' && row.path.startsWith('plugins/usage-dashboard/src/') && row.path.endsWith('.part.js')) touched.add(row.path.slice('plugins/usage-dashboard/src/'.length));
  }
  if (!touched.size && !changeRows.some((row) => row.path === 'plugins/usage-dashboard/src/parts.cjs')) return;
  const parts = parsePartsAt(sourceSha);
  const byFile = new Map(parts.map((row) => [row.file,row]));
  for (const file of touched) {
    const part = byFile.get(file);
    if (!part) fail('E9_READINESS_TOUCHED_PART_UNREGISTERED', file);
    if (part.marker === null) continue;
    const text = showText(sourceSha,`plugins/usage-dashboard/src/${file}`);
    if (text === null) fail('E9_READINESS_TOUCHED_PART_MISSING', file);
    if (!text.includes(part.marker)) fail('E9_READINESS_PART_BOUNDARY_STALE', file);
  }
}

function inspectReadiness(trustedBaseSha, sourceSha) {
  const transaction = stage.inspectTransaction(trustedBaseSha, sourceSha);
  const changeRows = changes.resolveChanges(transaction.intentBaseSha, transaction.sourceSha);
  const canonicalFiles = changes.changedPaths(transaction.intentBaseSha, transaction.sourceSha);
  const stagedFiles = [...transaction.files].sort();
  if (JSON.stringify(canonicalFiles) !== JSON.stringify(stagedFiles)) {
    fail('E9_READINESS_CHANGE_SEMANTICS_DRIFT', `${JSON.stringify(stagedFiles)}!=${JSON.stringify(canonicalFiles)}`);
  }

  const stale = [];
  for (const file of stagedFiles.filter((file) => file.startsWith('plugins/usage-dashboard/tests/') && file.endsWith('.cjs'))) {
    const text = showText(transaction.sourceSha,file);
    if (text === null) continue;
    const findings = preflight.staleProductAssertions(text, transaction.productVersion);
    for (const finding of findings) stale.push(`${file}:${finding.line}:${finding.version}`);
  }
  if (stale.length) fail('SOURCE_SHA_NOT_READY', `historical-literal:${stale.join(',')}`);

  const deleted = changeRows.flatMap((row) => row.kind === 'D' ? [row.path] : row.kind === 'R' ? [row.from] : []).filter(Boolean);
  const staleOwners = [];
  for (const file of deleted.filter((file) => file.startsWith('plugins/usage-dashboard/src/') && file.endsWith('.part.js'))) {
    for (const hit of grepTree(transaction.sourceSha,file,'plugins/usage-dashboard/tests')) staleOwners.push(`${file}->${hit}`);
  }
  if (staleOwners.length) fail('SOURCE_SHA_NOT_READY', `deleted-owner:${staleOwners.join(',')}`);

  assertTouchedPartBoundaries(transaction.sourceSha, changeRows);

  return {
    sourceSha:transaction.sourceSha,
    productVersion:transaction.productVersion,
    releaseSpec:transaction.releaseSpec,
    candidateBranch:transaction.candidateBranch,
    files:canonicalFiles,
    changes:changeRows,
  };
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--inspect') {
    const result = inspectReadiness(args[0],args[1]);
    process.stdout.write(JSON.stringify(result));
    return;
  }
  fail('E9_READINESS_USAGE');
}

module.exports = {showText,grepTree,parsePartsAt,assertTouchedPartBoundaries,inspectReadiness};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
