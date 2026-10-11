'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const registry = require('../registry.json');
const taxonomy = require('../taxonomy.json');
const {
  AREA_BY_LABEL,
  REASON_CODES,
  planProjectFields,
} = require('../project-projection.cjs');

const sourcePath = path.resolve(__dirname, '../project-projection.cjs');
const source = fs.readFileSync(sourcePath, 'utf8');

function body(state, stage = 'IMPLEMENTATION_PR') {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '',
    '## State',
    `\`${state}\``,
    '',
    '## Interaction stage',
    `- Current stage: \`${stage}\``,
    '',
  ].join('\n');
}

function input(overrides = {}) {
  return {
    body: body('READY'),
    nativeState: 'open',
    labels: ['scope:repo'],
    current: {
      status: null,
      priority: null,
      area: null,
      workType: null,
    },
    ...overrides,
  };
}

function assertSet(row, value) {
  assert.equal(row.action, 'SET');
  assert.equal(row.desiredValue, value);
}

function assertAuthoritiesFalse(result) {
  assert.equal(result.mutationAuthorized, false);
  assert.equal(result.membershipMutationAuthorized, false);
  assert.equal(result.reverseSyncAuthorized, false);
}

assert.deepEqual(AREA_BY_LABEL, {
  'product:termux': 'Termux',
  'product:pocketrisu-helper-mod': 'PocketRisu',
  'scope:research-product': 'Mobile Coder Lab',
  'scope:repo': 'Repository Ops',
});

assert.ok(registry.products.termux, 'Termux mapping must retain registered product identity');
assert.ok(registry.products['pocketrisu-helper-mod'], 'PocketRisu mapping must retain registered product identity');
const researchScope = registry.nonOperationalScopes.find((entry) => entry.id === 'research-product');
assert.equal(researchScope.label, 'scope:research-product');
assert.deepEqual(researchScope.paths, ['products/chatgpt-mobile-coder-lab/**']);
const mclTaxonomy = taxonomy.members.find((member) => member.id === 'mobile-coder-lab');
assert.deepEqual(mclTaxonomy.sourceRefs, ['scope:research-product']);
assert.ok(registry.repoPaths.includes('.github/plugin-control-plane/**'));

for (const forbidden of [
  "require('fs')",
  'require("fs")',
  "require('node:fs')",
  'require("node:fs")',
  'child_process',
  'fetch(',
  'https://api.github.com',
  'gh project',
  'item-add',
  'item-delete',
  'item-archive',
]) {
  assert.equal(source.includes(forbidden), false, `planner source must not contain forbidden effect surface: ${forbidden}`);
}

const ready = planProjectFields(input());
assert.equal(ready.disposition, 'PASS');
assertSet(ready.fields.status, 'Todo');
assertSet(ready.fields.area, 'Repository Ops');
assertSet(ready.fields.workType, 'Work Packet');
assert.equal(ready.fields.priority.action, 'PRESERVE');
assert.equal(ready.fields.priority.reasonCode, REASON_CODES.PRIORITY_HUMAN_ONLY);
assertAuthoritiesFalse(ready);

for (const lifecycle of ['CLAIMED', 'IN_PROGRESS', 'REVIEW']) {
  const projected = planProjectFields(input({body: body(lifecycle)}));
  assert.equal(projected.disposition, 'PASS');
  assertSet(projected.fields.status, 'In Progress');
  assertSet(projected.fields.workType, 'Work Packet');
  assertAuthoritiesFalse(projected);
}

for (const lifecycle of ['DONE', 'CANCELLED', 'SUPERSEDED']) {
  const projected = planProjectFields(input({body: body(lifecycle), nativeState: 'closed'}));
  assert.equal(projected.disposition, 'PASS');
  assertSet(projected.fields.status, 'Done');
  assertSet(projected.fields.workType, 'Work Packet');
  assertAuthoritiesFalse(projected);
}

const blocked = planProjectFields(input({body: body('BLOCKED')}));
assert.equal(blocked.disposition, 'PASS');
assert.equal(blocked.fields.status.action, 'PRESERVE');
assert.equal(blocked.fields.status.reasonCode, REASON_CODES.STATUS_BLOCKED_PRESERVE);
assertSet(blocked.fields.workType, 'Work Packet');

for (const [lifecycle, nativeState] of [
  ['READY', 'closed'],
  ['IN_PROGRESS', 'closed'],
  ['REVIEW', 'closed'],
  ['DONE', 'open'],
  ['CANCELLED', 'open'],
  ['SUPERSEDED', 'open'],
  ['BLOCKED', 'closed'],
]) {
  const projected = planProjectFields(input({body: body(lifecycle), nativeState}));
  assert.equal(projected.disposition, 'CONFLICT');
  assert.equal(projected.fields.status.action, 'CONFLICT');
  assert.equal(projected.fields.status.reasonCode, REASON_CODES.STATUS_LIFECYCLE_NATIVE_CONFLICT);
  assertAuthoritiesFalse(projected);
}

const malformedPacket = planProjectFields(input({
  body: '<!-- canonical-main-work-packet:v1 -->\n\n## State\nnot-a-state\n',
}));
assert.equal(malformedPacket.disposition, 'ATTENTION');
assert.equal(malformedPacket.fields.status.action, 'UNKNOWN');
assert.equal(malformedPacket.fields.workType.action, 'UNKNOWN');
assertAuthoritiesFalse(malformedPacket);

const conflictingPacket = planProjectFields(input({
  body: [
    '<!-- canonical-main-work-packet:v1 -->',
    '<!-- canonical-main-work-packet:v1 -->',
    '## State',
    '`READY`',
    '## Interaction stage',
    '- Current stage: `IMPLEMENTATION_PR`',
  ].join('\n'),
}));
assert.equal(conflictingPacket.disposition, 'CONFLICT');
assert.equal(conflictingPacket.fields.status.action, 'CONFLICT');
assert.equal(conflictingPacket.fields.workType.action, 'CONFLICT');
assertAuthoritiesFalse(conflictingPacket);

for (const [label, expected] of [
  ['product:termux', 'Termux'],
  ['product:pocketrisu-helper-mod', 'PocketRisu'],
  ['scope:research-product', 'Mobile Coder Lab'],
  ['scope:repo', 'Repository Ops'],
]) {
  const projected = planProjectFields(input({labels: [label]}));
  assertSet(projected.fields.area, expected);
}

const unclassified = planProjectFields(input({labels: ['scope:unclassified']}));
assert.equal(unclassified.disposition, 'ATTENTION');
assert.equal(unclassified.fields.area.action, 'UNKNOWN');
assert.equal(unclassified.fields.area.reasonCode, REASON_CODES.AREA_UNKNOWN);

const conflictingArea = planProjectFields(input({
  labels: ['product:termux', 'scope:research-product'],
}));
assert.equal(conflictingArea.disposition, 'CONFLICT');
assert.equal(conflictingArea.fields.area.action, 'CONFLICT');
assert.equal(conflictingArea.fields.area.reasonCode, REASON_CODES.AREA_CONFLICT);

const anomalyConventionOnly = planProjectFields(input({
  body: '[anomaly] observed false failure\nNo canonical packet marker.',
  labels: ['scope:research-product'],
}));
assert.equal(anomalyConventionOnly.disposition, 'ATTENTION');
assert.equal(anomalyConventionOnly.fields.workType.action, 'UNKNOWN');
assert.equal(anomalyConventionOnly.fields.workType.reasonCode, REASON_CODES.WORK_TYPE_UNKNOWN);
assert.equal(anomalyConventionOnly.fields.status.action, 'UNKNOWN');
assertSet(anomalyConventionOnly.fields.area, 'Mobile Coder Lab');
assert.equal(anomalyConventionOnly.fields.priority.action, 'PRESERVE');
assertAuthoritiesFalse(anomalyConventionOnly);

const importanceCannotSetPriority = planProjectFields(input({
  body: body('IN_PROGRESS') + '\nImportance: 최상\nP0 critical urgent\n',
  current: {
    status: 'Todo',
    priority: 'P3',
    area: 'Repository Ops',
    workType: 'Work Packet',
  },
}));
assert.equal(importanceCannotSetPriority.fields.priority.action, 'PRESERVE');
assert.equal(importanceCannotSetPriority.fields.priority.desiredValue, undefined);

for (const invalid of [
  null,
  {},
  {...input(), repository: 'hanmiyoo10-alt/-'},
  {...input(), nativeState: 'unknown'},
  {...input(), labels: ['scope:repo', 'scope:repo']},
  {...input(), labels: [' scope:repo']},
  {...input(), current: {...input().current, extra: 'x'}},
]) {
  const projected = planProjectFields(invalid);
  assert.equal(projected.disposition, 'ATTENTION');
  assert.equal(projected.fields.status.action, 'UNKNOWN');
  assert.equal(projected.fields.area.action, 'UNKNOWN');
  assert.equal(projected.fields.workType.action, 'UNKNOWN');
  assert.equal(projected.fields.priority.action, 'PRESERVE');
  assertAuthoritiesFalse(projected);
}

const oversizedBody = 'x'.repeat((128 * 1024) + 1);
const oversized = planProjectFields(input({body: oversizedBody}));
assert.equal(oversized.disposition, 'ATTENTION');
assert.equal(oversized.fields.status.reasonCode, REASON_CODES.INPUT_INVALID);
assertAuthoritiesFalse(oversized);

console.log('project projection contract: PASS');
