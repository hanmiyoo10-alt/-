'use strict';

const assert = require('node:assert/strict');
const pilot = require('../work-stage-pilot.cjs');
const stageCheckpoint = require('../stage-checkpoint.cjs');

function inspection(overrides = {}) {
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_STAGE_CHECKPOINT_INSPECT',
    disposition: 'PASS',
    packetNumber: 4000,
    nativeState: 'open',
    lifecycle: 'IN_PROGRESS',
    currentStage: 'IMPLEMENTATION_PR',
    completedStages: ['AUTHORITY_SCOPE'],
    furthestCompletedStage: 'AUTHORITY_SCOPE',
    rebindDisposition: 'CONTINUE_CURRENT_STAGE',
    nextStage: 'IMPLEMENTATION_PR',
    nextLegalAction: 'CONTINUE_IMPLEMENTATION_PR',
    reasonCodes: [],
    mutationAuthorized: false,
    executionAuthorized: false,
    ...overrides,
  };
}

function assertReadOnly(result) {
  assert.equal(result.mutationAuthorized, false);
  assert.equal(result.executionAuthorized, false);
}

function stageRoutingContract() {
  const cases = [
    ['AUTHORITY_SCOPE', 'OWNING_AUTHORITY_CHAIN', 'packet:read-first'],
    ['IMPLEMENTATION_PR', 'PACKET_IMPLEMENTATION_OWNER', 'packet:implementation-owner'],
    ['VALIDATION_MERGE', 'VALIDATION_ATTENTION', pilot.VALIDATION_ATTENTION_OWNER],
    ['POSTMERGE_CONVERGENCE', 'PACKET_POSTMERGE_AUTHORITIES', 'packet:postmerge-acceptance'],
    ['EXPERIMENT_CLOSE', 'PROOF_ELIGIBILITY_OR_PROJECT_EXPERIMENT_OWNER', pilot.PROOF_ELIGIBILITY_OWNER],
  ];
  for (const [stage, owner, locator] of cases) {
    const result = pilot.projectInspection(inspection({
      currentStage: stage,
      nextStage: stage,
      completedStages: [],
      furthestCompletedStage: null,
      nextLegalAction: `CONTINUE_${stage}`,
    }));
    assert.equal(result.result, 'PASS');
    assert.equal(result.currentStage, stage);
    assert.equal(result.handoffOwner, owner);
    assert.equal(result.ownerLocator, locator);
    assert.ok(result.requiredInputs.length > 0);
    assertReadOnly(result);
  }
}

function reuseCompletedStageRoutesForward() {
  const result = pilot.projectInspection(inspection({
    completedStages: ['AUTHORITY_SCOPE', 'IMPLEMENTATION_PR'],
    furthestCompletedStage: 'IMPLEMENTATION_PR',
    rebindDisposition: 'REUSE_COMPLETED_STAGE',
    nextStage: 'VALIDATION_MERGE',
    nextLegalAction: 'ADVANCE_TO_VALIDATION_MERGE',
  }));
  assert.equal(result.result, 'PASS');
  assert.equal(result.handoffOwner, 'VALIDATION_ATTENTION');
  assert.equal(result.nextStage, 'VALIDATION_MERGE');
  assert.deepEqual(result.requiredInputs, ['canonical-implementation-pr-receipt','pr-identity']);
}

function terminalAndCloseSyncContracts() {
  const terminal = pilot.projectInspection(inspection({
    nativeState: 'closed',
    lifecycle: 'DONE',
    currentStage: 'EXPERIMENT_CLOSE',
    completedStages: [...stageCheckpoint.STAGES],
    furthestCompletedStage: 'EXPERIMENT_CLOSE',
    rebindDisposition: 'STOP_TERMINAL',
    nextStage: null,
    nextLegalAction: 'NONE_TERMINAL_PACKET_COMPLETE',
  }));
  assert.equal(terminal.result, 'PASS');
  assert.equal(terminal.handoffOwner, 'NONE_TERMINAL');
  assert.deepEqual(terminal.requiredInputs, []);
  assertReadOnly(terminal);

  const closeSync = pilot.projectInspection(inspection({
    lifecycle: 'DONE',
    currentStage: 'EXPERIMENT_CLOSE',
    completedStages: [...stageCheckpoint.STAGES],
    furthestCompletedStage: 'EXPERIMENT_CLOSE',
    rebindDisposition: 'CONTINUE_TRANSACTION_CLOSURE',
    nextStage: null,
    nextLegalAction: 'SELF_CLOSE_SYNC_CURRENT_PACKET',
  }));
  assert.equal(closeSync.result, 'PASS');
  assert.equal(closeSync.handoffOwner, 'PACKET_SELF_BOOKKEEPING');
  assert.deepEqual(closeSync.requiredInputs, ['current-packet-body','terminal-stage-evidence']);
  assertReadOnly(closeSync);
}

function failClosedContracts() {
  const unknown = pilot.projectInspection(inspection({
    disposition: 'UNKNOWN',
    reasonCodes: ['CHECKPOINT_PAIR_INCOMPLETE'],
    rebindDisposition: null,
    nextStage: null,
    nextLegalAction: null,
  }));
  assert.equal(unknown.result, 'UNKNOWN');
  assert.equal(unknown.handoffOwner, 'STAGE_CHECKPOINT_INSPECTOR');
  assert.deepEqual(unknown.reasonCodes, ['CHECKPOINT_PAIR_INCOMPLETE']);
  assertReadOnly(unknown);

  const conflict = pilot.projectInspection(inspection({
    disposition: 'CONFLICT',
    reasonCodes: ['CHECKPOINT_STAGE_PREFIX_CONFLICT'],
    rebindDisposition: null,
    nextStage: null,
    nextLegalAction: null,
  }));
  assert.equal(conflict.result, 'CONFLICT');
  assert.equal(conflict.handoffOwner, 'STAGE_CHECKPOINT_INSPECTOR');
  assertReadOnly(conflict);

  const malformed = pilot.projectInspection({disposition: 'PASS', packetNumber: 4000});
  assert.equal(malformed.result, 'UNKNOWN');
  assert.ok(malformed.reasonCodes.includes('PILOT_INSPECTION_SCHEMA_INVALID'));
  assert.ok(malformed.reasonCodes.includes('PILOT_INSPECTION_MODE_INVALID'));
  assert.ok(malformed.reasonCodes.includes('PILOT_INSPECTION_LIFECYCLE_MISSING'));
  assert.ok(malformed.reasonCodes.includes('PILOT_INSPECTION_REBIND_MISSING'));
  assert.ok(malformed.reasonCodes.includes('PILOT_INSPECTION_NEXT_ACTION_MISSING'));

  const truncated = pilot.projectInspection({
    disposition: 'PASS',
    schemaVersion: 1,
    mode: pilot.CHECKPOINT_INSPECT_MODE,
    packetNumber: 4000,
    nativeState: 'open',
    currentStage: 'IMPLEMENTATION_PR',
    completedStages: [],
    mutationAuthorized: false,
    executionAuthorized: false,
  });
  assert.equal(truncated.result, 'UNKNOWN');
  assert.equal(truncated.handoffOwner, 'STAGE_CHECKPOINT_INSPECTOR');
  assert.ok(truncated.reasonCodes.includes('PILOT_INSPECTION_LIFECYCLE_MISSING'));
  assert.ok(truncated.reasonCodes.includes('PILOT_INSPECTION_REBIND_MISSING'));
  assert.ok(truncated.reasonCodes.includes('PILOT_INSPECTION_NEXT_ACTION_MISSING'));

  const wrongMode = pilot.projectInspection(inspection({mode: 'SOME_OTHER_MODE'}));
  assert.equal(wrongMode.result, 'UNKNOWN');
  assert.ok(wrongMode.reasonCodes.includes('PILOT_INSPECTION_MODE_INVALID'));

  const invalid = pilot.projectInspection(null);
  assert.equal(invalid.result, 'UNKNOWN');
  assert.ok(invalid.reasonCodes.includes('PILOT_INSPECTION_OBJECT_REQUIRED'));
}

async function delegationContract() {
  const calls = [];
  const result = await pilot.inspectWorkStage({
    packetNumber: 3439,
    deps: {
      checkpointRun: async (args) => {
        calls.push(args);
        return inspection({packetNumber: 3439});
      },
    },
  });
  assert.deepEqual(calls, [{argv: ['inspect', '--packet', '3439']}]);
  assert.equal(result.result, 'PASS');
  assert.equal(result.packetNumber, 3439);
  assert.equal(result.handoffOwner, 'PACKET_IMPLEMENTATION_OWNER');
  assertReadOnly(result);
  assert.equal(pilot.DEFAULT_DEPS.checkpointRun, stageCheckpoint.run);

  let invoked = false;
  const invalid = await pilot.inspectWorkStage({
    packetNumber: 0,
    deps: {checkpointRun: async () => { invoked = true; return inspection(); }},
  });
  assert.equal(invoked, false);
  assert.equal(invalid.result, 'UNKNOWN');
  assert.ok(invalid.reasonCodes.includes('PACKET_NUMBER_INVALID'));
}

async function cliContract() {
  assert.deepEqual(pilot.parseArgs(['inspect', '--packet', '3439']), {packetNumber: 3439});
  assert.throws(() => pilot.parseArgs(['inspect', '--packet', '0']));
  assert.throws(() => pilot.parseArgs(['--packet', '3439']));

  const output = await pilot.runCli(['inspect', '--packet', '3439'], {
    deps: {checkpointRun: async () => inspection({packetNumber: 3439})},
  });
  assert.equal(output.code, 0);
  const parsed = JSON.parse(output.text);
  assert.equal(parsed.mode, pilot.MODE);
  assert.equal(parsed.result, 'PASS');
  assertReadOnly(parsed);
  assert.equal(pilot.exitCodeFor({result: 'PASS'}), 0);
  assert.equal(pilot.exitCodeFor({result: 'UNKNOWN'}), 3);
  assert.equal(pilot.exitCodeFor({result: 'CONFLICT'}), 2);
}

(async () => {
  stageRoutingContract();
  reuseCompletedStageRoutesForward();
  terminalAndCloseSyncContracts();
  failClosedContracts();
  await delegationContract();
  await cliContract();
  process.stdout.write('work-stage-pilot-contract: ok\n');
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
