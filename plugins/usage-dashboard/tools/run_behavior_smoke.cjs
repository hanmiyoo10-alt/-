#!/usr/bin/env node
'use strict';

const {spawnSync} = require('node:child_process');
const path = require('node:path');
const {discoverTests} = require('../tests/registry.cjs');

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function parseRepeat(argv) {
  const at = argv.indexOf('--repeat');
  if (at < 0) return 1;
  const value = Number(argv[at + 1]);
  if (!Number.isSafeInteger(value) || value < 1 || value > 3) fail('BEHAVIOR_SMOKE_REPEAT_DENIED', String(argv[at + 1] || ''));
  return value;
}

function run() {
  const repeat = parseRepeat(process.argv.slice(2));
  const suite = discoverTests();
  if (!suite.behavior.length) fail('BEHAVIOR_SMOKE_EMPTY');
  for (let pass = 1; pass <= repeat; pass += 1) {
    for (const file of suite.behavior) {
      const result = spawnSync(process.execPath, [path.join('plugins/usage-dashboard/tests', file)], {
        stdio:'inherit',
        env:process.env,
      });
      if (result.status !== 0) fail('BEHAVIOR_SMOKE_FAILED', `pass=${pass}:${file}`);
    }
    console.log(`BEHAVIOR_SMOKE_PASS:${pass}/${repeat}:${suite.behavior.length}`);
  }
  console.log(`BEHAVIOR_SMOKE_GREEN:${repeat}:${suite.behavior.length}`);
}

try { run(); } catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
