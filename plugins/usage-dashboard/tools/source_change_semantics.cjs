#!/usr/bin/env node
'use strict';

const {execFileSync} = require('node:child_process');

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function normalizeSha(value, code = 'E9_CHANGE_SHA_INVALID') {
  const text = String(value || '').trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(text)) fail(code, text || 'missing');
  return text;
}

function normalizePath(value) {
  const path = String(value || '').replaceAll('\\', '/');
  if (!path || path.includes('\0') || path.includes('\n') || path.includes('\r') || path.startsWith('/') || path.split('/').includes('..')) {
    fail('E9_CHANGE_PATH_INVALID', path || 'empty');
  }
  return path;
}

function parseNameStatusZ(text) {
  const fields = String(text || '').split('\0');
  if (fields.at(-1) === '') fields.pop();
  const rows = [];
  for (let index = 0; index < fields.length;) {
    const statusRaw = fields[index++];
    if (!statusRaw) fail('E9_CHANGE_STATUS_MISSING');
    const kind = statusRaw[0];
    if (!['A','M','D','R','T'].includes(kind)) fail('E9_CHANGE_STATUS_DENIED', statusRaw);
    if (kind === 'R') {
      if (index + 1 >= fields.length) fail('E9_CHANGE_RENAME_TRUNCATED', statusRaw);
      const from = normalizePath(fields[index++]);
      const path = normalizePath(fields[index++]);
      rows.push({kind, status:statusRaw, from, path});
    } else {
      if (index >= fields.length) fail('E9_CHANGE_PATH_MISSING', statusRaw);
      rows.push({kind, status:statusRaw, path:normalizePath(fields[index++])});
    }
  }
  rows.sort((a,b) => a.path.localeCompare(b.path) || String(a.from || '').localeCompare(String(b.from || '')));
  return rows;
}

function resolveChanges(baseSha, headSha, cwd = process.cwd()) {
  const base = normalizeSha(baseSha, 'E9_CHANGE_BASE_SHA_INVALID');
  const head = normalizeSha(headSha, 'E9_CHANGE_HEAD_SHA_INVALID');
  const output = execFileSync('git', ['diff','--name-status','-z','-M','--diff-filter=ACDMRT',base,head,'--'], {cwd,encoding:'utf8'});
  return parseNameStatusZ(output);
}

function changedPaths(baseSha, headSha, cwd = process.cwd()) {
  return [...new Set(resolveChanges(baseSha, headSha, cwd).flatMap((row) => row.kind === 'R' ? [row.from,row.path] : [row.path]))].sort();
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--resolve') {
    process.stdout.write(JSON.stringify(resolveChanges(args[0], args[1])));
    return;
  }
  if (command === '--paths') {
    process.stdout.write(JSON.stringify(changedPaths(args[0], args[1])));
    return;
  }
  fail('E9_CHANGE_USAGE');
}

module.exports = {normalizeSha, normalizePath, parseNameStatusZ, resolveChanges, changedPaths};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
