import assert from 'node:assert/strict';
import {
  DEPENDENCY_TRAP_CASES,
  evaluateDependencyTrapCase,
} from './context-projection-dependency-trap-corpus.mjs';

const ids = DEPENDENCY_TRAP_CASES.map((row) => row.id);
assert.equal(new Set(ids).size, ids.length, 'fixture ids must be unique');

const traps = DEPENDENCY_TRAP_CASES.filter((row) => row.kind === 'TRAP');
const controls = DEPENDENCY_TRAP_CASES.filter((row) => row.kind === 'CONTROL');

assert.equal(traps.length, 8, 'corpus must keep eight dependency trap classes');
assert.equal(controls.length, 2, 'corpus must keep two controls');
assert.deepEqual(
  traps.map((row) => row.dependencyClass).sort(),
  [
    'ENTITY_ALIAS_BINDING',
    'EXCEPTION_RULE',
    'INVENTORY_STATE',
    'PRIOR_ASSISTANT_DERIVATION',
    'PRONOUN_ANTECEDENT',
    'SECRET_LITERAL',
    'USER_CONSTRAINT',
    'WORLD_STATE_CONTINUITY',
  ].sort(),
);

for (const testCase of DEPENDENCY_TRAP_CASES) {
  const before = JSON.stringify(testCase.fixture);
  const result = evaluateDependencyTrapCase(testCase);

  assert.equal(result.plan.executionMode, 'SHADOW_ONLY');
  assert.equal(result.plan.applied, false);
  assert.equal(result.plan.activeProjectionAuthorized, false);
  assert.equal(JSON.stringify(testCase.fixture), before, `${testCase.id} must not be mutated`);

  for (const requiredIndex of testCase.requiredPreRootIndices) {
    assert.ok(requiredIndex < testCase.fixture.rootIndex, `${testCase.id} dependency must be pre-root`);
  }

  if (testCase.kind === 'TRAP') {
    assert.equal(testCase.semanticOracle, 'PRE_ROOT_REQUIRED');
    assert.ok(testCase.requiredPreRootIndices.length > 0);
    assert.equal(result.plan.status, 'ELIGIBLE_SHADOW_PLAN');
    assert.equal(result.plan.semanticSafety, 'UNPROVEN_REVIEW_REQUIRED');
    assert.ok(result.severedRequiredIndices.length > 0, `${testCase.id} must sever a required dependency`);
    assert.equal(result.dependencySevered, true);
    assert.equal(result.structuralFalseSafe, true);
    assert.equal(result.activeProjectionDisposition, 'BLOCK_ACTIVE_PROJECTION');
  }
}

{
  const control = evaluateDependencyTrapCase(
    DEPENDENCY_TRAP_CASES.find((row) => row.id === 'CONTROL_SELF_CONTAINED_ROOT'),
  );
  assert.equal(control.plan.status, 'ELIGIBLE_SHADOW_PLAN');
  assert.equal(control.dependencySevered, false);
  assert.equal(control.structuralFalseSafe, false);
  assert.equal(control.activeProjectionDisposition, 'NO_CORPUS_BLOCK');
  assert.equal(control.plan.activeProjectionAuthorized, false, 'control does not authorize active projection');
}

{
  const control = evaluateDependencyTrapCase(
    DEPENDENCY_TRAP_CASES.find((row) => row.id === 'CONTROL_NO_PRE_ROOT_CONVERSATION'),
  );
  assert.equal(control.plan.status, 'ELIGIBLE_NO_REDUCTION');
  assert.deepEqual(control.plan.candidateExcludedIndices, []);
  assert.equal(control.activeProjectionDisposition, 'NO_CORPUS_BLOCK');
}

console.log(`context-projection-dependency-trap-corpus: PASS (${traps.length} traps, ${controls.length} controls)`);
