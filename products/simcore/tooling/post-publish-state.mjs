#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run as convergeRun } from './release-state-converge.mjs';

// Compatibility adapter retained for already-qualified permanent publication and
// recovery callers. Application ownership lives in release-state-converge.
export function run(argv = process.argv.slice(2)) {
  return convergeRun(argv);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = run();
    console.log(JSON.stringify(r));
  } catch (e) {
    console.error(e.code || 'POST_PUBLISH_STATE_FAILED', e.message || '');
    process.exit(2);
  }
}
