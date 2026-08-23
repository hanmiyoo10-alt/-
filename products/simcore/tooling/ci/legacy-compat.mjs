#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--') || i + 1 >= argv.length) throw new Error(`invalid argument ${arg}`);
    out[arg.slice(2)] = argv[++i];
  }
  if (!out.source) throw new Error('--source required');
  return out;
}

function bounded(text, max = 4096) {
  const value = String(text || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  return value.length <= max ? value : `${value.slice(0, max)}…[truncated]`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(fs.readFileSync('products/simcore/ci/legacy-compat.json', 'utf8'));
  if (registry.schemaVersion !== 1 || registry.status !== 'TRANSITIONAL_BOUNDED') throw new Error('legacy compat registry invalid');
  const adapters = [...new Set(registry.assertions.map((row) => row.sourceAdapter))];
  if (adapters.length !== 1) throw new Error('legacy compat adapter set must remain bounded');
  const adapter = adapters[0];
  if (!adapter.startsWith('scripts/') || adapter.includes('..')) throw new Error('legacy compat adapter path invalid');

  const before = fs.readFileSync(path.resolve(args.source));
  const run = spawnSync(process.execPath, [adapter, path.resolve(args.source)], { encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024 });
  const after = fs.readFileSync(path.resolve(args.source));
  if (!before.equals(after)) throw new Error('LEGACY_COMPAT_SOURCE_MUTATION');

  const report = {
    schemaVersion: 1,
    gate: 'GATE_LEGACY_COMPAT',
    status: run.status === 0 ? 'PASS' : 'FAIL',
    assertionIds: registry.assertions.map((row) => row.id),
    adapter,
    exitCode: run.status,
    signal: run.signal || null,
    stderr: run.status === 0 ? '' : bounded(run.stderr),
  };
  if (args.report) fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`GATE_LEGACY_COMPAT ${report.status} (${report.assertionIds.length} assertions)`);
  if (run.error) throw run.error;
  if (run.status !== 0) process.exit(1);
}

try { main(); }
catch (error) { console.error(`LEGACY_COMPAT_ERROR: ${error?.message || error}`); process.exit(2); }
