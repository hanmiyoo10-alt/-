'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const audit = fs.readFileSync('docs/USAGE_DASHBOARD_RUNTIME_AUDIT_STANDARD.md', 'utf8');

for (const token of [
  '# Local Usage Dashboard — AI Agent Runtime Audit Standard',
  'Memory pressure / heap overflow risk',
  'Memory leak / retained-reference risk',
  'CPU hotspot / main-thread blocking',
  'Async safety / race conditions',
  'Error-handling robustness',
  'Event-loop starvation / freeze risk',
  'UNKNOWN stays UNKNOWN.',
  'Never turn missing runtime/data evidence into zero',
  'One release, one primary goal.',
  'Lifecycle ownership must be explicit.',
  'Regression follows incidents.',
  'No style-only churn.',
  'Critical/High findings before release',
  'Severity:',
  'Estimated Frequency:',
  'Confidence:',
  'Critical issue count',
  'Memory leak risk score `0–10`',
  'CPU bottleneck risk score `0–10`',
  'Long-running stability score `0–10`',
  'Expected failure likelihood score `0–10`',
  'Priority fix TOP 5',
  'static-analysis estimates',
  'VERIFIED',
  'SUPPORTED HYPOTHESIS',
  'UNKNOWN',
  'runtime audit → implementation → focused regression → full regression → PR/CI',
]) {
  assert.ok(audit.includes(token), `runtime audit standard missing durable token: ${token}`);
}

assert.match(audit, /setInterval/);
assert.match(audit, /AbortController/);
assert.match(audit, /EventEmitter/);
assert.match(audit, /WebSocket/);
assert.match(audit, /Map/);
assert.match(audit, /Set/);
assert.match(audit, /JSON\.parse/);
assert.match(audit, /JSON\.stringify/);
assert.match(audit, /O\(n²\)/);
assert.match(audit, /stale response overwrite/);
assert.match(audit, /retry storms/);
assert.match(audit, /missing `finally`/);
assert.match(audit, /requestIdleCallback/);
assert.match(audit, /queueMicrotask/);

console.log('usage-dashboard runtime audit standard contract: OK · runtime-failure-first static review + project evidence/release boundaries locked');
