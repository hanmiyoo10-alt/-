#!/usr/bin/env node
'use strict';

const {execFileSync} = require('node:child_process');
const stage = require('./candidate_stage_e6.cjs');
const changes = require('./source_change_semantics.cjs');
const preflight = require('./release_generic_preflight.cjs');
const specContract = require('./release_spec_contract_e19.cjs');

class ReadinessError extends Error {
  constructor(code, receipt = {}) {
    const detail = String(receipt.detail || '');
    super(detail ? `${code}:${detail}` : code);
    this.name = 'ReadinessError';
    this.code = code;
    this.receipt = Object.freeze({
      reason_code:String(receipt.reason_code || 'readiness-error'),
      detail,
      offending_path:String(receipt.offending_path || ''),
      owner_path:String(receipt.owner_path || ''),
      repair_hint:String(receipt.repair_hint || ''),
    });
  }
}

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function readinessFail(reasonCode, code = 'SOURCE_SHA_NOT_READY', fields = {}) {
  throw new ReadinessError(code, {reason_code:reasonCode, ...fields});
}

function receiptForError(error) {
  if (error instanceof ReadinessError) return error.receipt;
  return {
    reason_code:'unexpected-readiness-error',
    detail:String(error?.message || error || '').replace(/\s+/g,' ').slice(0,300),
    offending_path:'',
    owner_path:'',
    repair_hint:'inspect trusted readiness logs before changing source',
  };
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
  const path = 'plugins/usage-dashboard/src/parts.cjs';
  const text = showText(sha,path);
  if (text === null) readinessFail('parts-missing','SOURCE_SHA_NOT_READY',{
    detail:`parts-missing:${path}`,
    offending_path:path,
    repair_hint:'restore the Usage Dashboard PARTS registry before staging',
  });
  const rows = [];
  const re = /\{file:'([^']+)', marker:(null|'(?:\\.|[^'])*'), label:'[^']*'\}/g;
  for (const match of text.matchAll(re)) {
    const file = match[1];
    let marker = null;
    if (match[2] !== 'null') marker = Function(`return ${match[2]}`)();
    rows.push({file,marker});
  }
  if (!rows.length) readinessFail('parts-parse-empty','SOURCE_SHA_NOT_READY',{
    detail:`parts-parse-empty:${path}`,
    offending_path:path,
    repair_hint:'repair PARTS syntax before staging',
  });
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
    const path = `plugins/usage-dashboard/src/${file}`;
    const part = byFile.get(file);
    if (!part) readinessFail('part-unregistered','SOURCE_SHA_NOT_READY',{
      detail:`part-unregistered:${file}`,
      offending_path:path,
      repair_hint:'register the surviving source part in parts.cjs',
    });
    if (part.marker === null) continue;
    const text = showText(sourceSha,path);
    if (text === null) readinessFail('part-missing','SOURCE_SHA_NOT_READY',{
      detail:`part-missing:${file}`,
      offending_path:path,
      repair_hint:'restore the registered part or remove its PARTS entry',
    });
    if (!text.includes(part.marker)) readinessFail('stale-part-boundary','SOURCE_SHA_NOT_READY',{
      detail:`part-boundary-stale:${file}`,
      offending_path:path,
      repair_hint:'update the PARTS marker to the exact surviving source boundary',
    });
  }
}

function assertPythonSyntax(text, filename = '<materializer>') {
  try {
    execFileSync('python3',[
      '-c',
      'import ast,sys; ast.parse(sys.stdin.read(), filename=sys.argv[1])',
      filename,
    ],{input:String(text),encoding:'utf8',stdio:['pipe','pipe','pipe']});
  } catch (error) {
    const stderr = String(error?.stderr || error?.message || '').trim().replace(/\s+/g,' ').slice(0,300);
    readinessFail('materializer-syntax','SOURCE_SHA_NOT_READY',{
      detail:`materializer-syntax:${filename}${stderr ? `:${stderr}` : ''}`,
      offending_path:filename,
      repair_hint:'repair Python syntax in the exact release materializer before staging',
    });
  }
}

function assertMaterializerSyntax(sourceSha, releaseSpecPath) {
  const specText = showText(sourceSha, releaseSpecPath);
  if (specText === null) readinessFail('release-spec-missing','SOURCE_SHA_NOT_READY',{
    detail:`release-spec-missing:${releaseSpecPath}`,
    offending_path:releaseSpecPath,
    repair_hint:'add the exact release specification on the source branch',
  });
  let spec;
  try { spec = JSON.parse(specText); }
  catch { readinessFail('release-spec-json','SOURCE_SHA_NOT_READY',{
    detail:`release-spec-json:${releaseSpecPath}`,
    offending_path:releaseSpecPath,
    repair_hint:'repair release specification JSON before staging',
  }); }

  const findings = specContract.inspectReleaseSpec(spec);
  if (findings.length) readinessFail('release-spec-contract','SOURCE_SHA_NOT_READY',{
    detail:`release-spec-contract:${specContract.summarizeFindings(findings)}`,
    offending_path:releaseSpecPath,
    repair_hint:'repair all listed canonical release-spec findings on the same source SHA before staging',
  });

  const materializer = String(spec?.materializer || '');
  if (!specContract.MATERIALIZER_RE.test(materializer) || materializer.includes('..')) {
    readinessFail('materializer-path','SOURCE_SHA_NOT_READY',{
      detail:`materializer-path:${materializer || '<missing>'}`,
      offending_path:releaseSpecPath,
      owner_path:materializer,
      repair_hint:'point the release spec at one repository-local Usage Dashboard Python materializer',
    });
  }
  const text = showText(sourceSha, materializer);
  if (text === null) readinessFail('materializer-missing','SOURCE_SHA_NOT_READY',{
    detail:`materializer-missing:${materializer}`,
    offending_path:materializer,
    repair_hint:'add the materializer referenced by the release specification',
  });
  assertPythonSyntax(text, materializer);
  return materializer;
}

function inspectReadiness(trustedBaseSha, sourceSha) {
  const transaction = stage.inspectTransaction(trustedBaseSha, sourceSha);
  const changeRows = changes.resolveChanges(transaction.intentBaseSha, transaction.sourceSha);
  const canonicalFiles = changes.changedPaths(transaction.intentBaseSha, transaction.sourceSha);
  const stagedFiles = [...transaction.files].sort();
  if (JSON.stringify(canonicalFiles) !== JSON.stringify(stagedFiles)) {
    throw new ReadinessError('E9_READINESS_CHANGE_SEMANTICS_DRIFT',{
      reason_code:'change-semantics-drift',
      detail:`${JSON.stringify(stagedFiles)}!=${JSON.stringify(canonicalFiles)}`,
      repair_hint:'use the canonical A/M/D/R/T resolver for the exact source intent',
    });
  }

  const stale = [];
  for (const file of stagedFiles.filter((file) => file.startsWith('plugins/usage-dashboard/tests/') && file.endsWith('.cjs'))) {
    const text = showText(transaction.sourceSha,file);
    if (text === null) continue;
    const findings = preflight.staleProductAssertions(text, transaction.productVersion);
    for (const finding of findings) stale.push({file,line:finding.line,version:finding.version});
  }
  if (stale.length) {
    const first = stale[0];
    readinessFail('historical-product-literal','SOURCE_SHA_NOT_READY',{
      detail:`historical-literal:${stale.map((row)=>`${row.file}:${row.line}:${row.version}`).join(',')}`,
      offending_path:first.file,
      repair_hint:'replace stale current-release literals with forward-lineage or current-release authority',
    });
  }

  const deleted = changeRows.flatMap((row) => row.kind === 'D' ? [row.path] : row.kind === 'R' ? [row.from] : []).filter(Boolean);
  const staleOwners = [];
  for (const ownerPath of deleted.filter((file) => file.startsWith('plugins/usage-dashboard/src/') && file.endsWith('.part.js'))) {
    for (const offendingPath of grepTree(transaction.sourceSha,ownerPath,'plugins/usage-dashboard/tests')) staleOwners.push({ownerPath,offendingPath});
  }
  if (staleOwners.length) {
    const first = staleOwners[0];
    readinessFail('deleted-owner-reference','SOURCE_SHA_NOT_READY',{
      detail:`deleted-owner:${staleOwners.map((row)=>`${row.ownerPath}->${row.offendingPath}`).join(',')}`,
      offending_path:first.offendingPath,
      owner_path:first.ownerPath,
      repair_hint:'migrate the test to the surviving direct owner before deleting the old source module',
    });
  }

  assertTouchedPartBoundaries(transaction.sourceSha, changeRows);
  const materializer = assertMaterializerSyntax(transaction.sourceSha, transaction.releaseSpec);

  return {
    sourceSha:transaction.sourceSha,
    productVersion:transaction.productVersion,
    releaseSpec:transaction.releaseSpec,
    materializer,
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

module.exports = {
  ReadinessError,
  readinessFail,
  receiptForError,
  showText,
  grepTree,
  parsePartsAt,
  assertTouchedPartBoundaries,
  assertPythonSyntax,
  assertMaterializerSyntax,
  inspectReadiness,
};

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error?.stack || String(error));
    console.error(`UD_SOURCE_READINESS_ERROR:${JSON.stringify(receiptForError(error))}`);
    process.exitCode = 1;
  }
}
