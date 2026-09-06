#!/usr/bin/env node
import fs from 'node:fs';
import { LABELS, classifyPaths } from './classify.mjs';

function expect(value, message) {
  if (!value) throw new Error(message);
}

expect(LABELS.includes('MCP_TOOLING'), 'MCP_TOOLING label missing');

for (const path of [
  'tools/simcore-mcp/simcore_mcp/server.py',
  'tools/simcore-mcp/tests/test_relationship_audit.py',
  'tools/simcore-mcp/README.md',
]) {
  const result = classifyPaths([path]);
  expect(result.labels.length === 1 && result.labels[0] === 'MCP_TOOLING', `${path}: ${JSON.stringify(result)}`);
  expect(result.unrelated === false, `${path}: unexpectedly unrelated`);
  expect(result.docOnly === false, `${path}: unexpectedly docOnly`);
}

const unrelated = classifyPaths(['products/usage-dashboard/README.md']);
expect(unrelated.unrelated === true && unrelated.labels.length === 0, `unrelated regression: ${JSON.stringify(unrelated)}`);

const docOnly = classifyPaths(['docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md']);
expect(docOnly.docOnly === true && docOnly.labels.includes('SIMCORE_DOC_ONLY'), `doc-only regression: ${JSON.stringify(docOnly)}`);

const check = fs.readFileSync('products/simcore/tooling/check.mjs', 'utf8');
for (const token of [
  'GATE_MCP_TOOLING',
  "labels.has('MCP_TOOLING')",
  'tools/simcore-mcp/simcore_mcp',
  'tools/simcore-mcp/tests',
  'MCP_TOOLING_TEST_FAIL',
  'MCP_TOOLING_GATE_ERROR',
]) {
  expect(check.includes(token), `MCP tooling verifier token missing: ${token}`);
}

console.log('SIMCORE_MCP_TOOLING_SELF_TEST_PASS');
