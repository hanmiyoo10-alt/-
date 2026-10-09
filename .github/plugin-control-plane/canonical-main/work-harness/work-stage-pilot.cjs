'use strict';

const stageCheckpoint = require('./stage-checkpoint.cjs');

const MODE = 'CANONICAL_MAIN_WORK_STAGE_PILOT';
const STAGE_CHECKPOINT_OWNER = '.github/plugin-control-plane/canonical-main/work-harness/stage-checkpoint.cjs';
const VALIDATION_ATTENTION_OWNER = '.github/plugin-control-plane/canonical-main/work-harness/validation-attention/validation-attention-owner.cjs';
const PROOF_ELIGIBILITY_OWNER = '.github/plugin-control-plane/canonical-main/work-system/proof-eligibility.cjs';
const MAX_REASON_CODES = 32;

const STAGE_ROUTES = Object.freeze({
  AUTHORITY_SCOPE: Object.freeze({
    handoffOwner: 'OWNING_AUTHORITY_CHAIN',
    ownerLocator: 'packet:read-first',
    requiredInputs: Object.freeze(['current-authority','owning-contracts','complete-overlap-evidence']),
  }),
  IMPLEMENTATION_PR: Object.freeze({
    handoffOwner: 'PACKET_IMPLEMENTATION_OWNER',
    ownerLocator: 'packet:implementation-owner',
    requiredInputs: Object.freeze(['bounded-write-scope','implementation-route','implementation-validation']),
  }),
  VALIDATION_MERGE: Object.freeze({
    handoffOwner: 'VALIDATION_ATTENTION',
    ownerLocator: VALIDATION_ATTENTION_OWNER,
    requiredInputs: Object.freeze(['pr-identity','canonical-implementation-pr-receipt']),
  }),
  POSTMERGE_CONVERGENCE: Object.freeze({
    handoffOwner: 'PACKET_POSTMERGE_AUTHORITIES',
    ownerLocator: 'packet:postmerge-acceptance',
    requiredInputs: Object.freeze(['merge-identity','merged-main-owning-validation']),
  }),
  EXPERIMENT_CLOSE: Object.freeze({
    handoffOwner: 'PROOF_ELIGIBILITY_OR_PROJECT_EXPERIMENT_OWNER',
    ownerLocator: PROOF_ELIGIBILITY_OWNER,
    requiredInputs: Object.freeze(['postmerge-convergence-receipt','declared-live-proof-acceptance']),
  }),
});

const DEFAULT_DEPS = Object.freeze({checkpointRun: stageCheckpoint.run});

function uniqueBoundedStrings(values, max = MAX_REASON_CODES) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))]
    .sort()
    .slice(0, max);
}

function boundedStages(values) {
  if (!Array.isArray(values)) return [];
  return values.filter((stage) => stageCheckpoint.STAGES.includes(stage))
    .slice(0, stageCheckpoint.STAGES.length);
}

function baseResult(inspection = {}, extras = {}) {
  const packetNumber = Number.isSafeInteger(inspection.packetNumber) && inspection.packetNumber > 0
    ? inspection.packetNumber
    : null;
  return {
    schemaVersion: 1,
    mode: MODE,
    result: extras.result || 'UNKNOWN',
    disposition: extras.disposition || extras.result || 'UNKNOWN',
    packetNumber,
    nativeState: typeof inspection.nativeState === 'string' ? inspection.nativeState : null,
    lifecycle: typeof inspection.lifecycle === 'string' ? inspection.lifecycle : null,
    currentStage: typeof inspection.currentStage === 'string' ? inspection.currentStage : null,
    completedStages: boundedStages(inspection.completedStages),
    furthestCompletedStage: typeof inspection.furthestCompletedStage === 'string' ? inspection.furthestCompletedStage : null,
    rebindDisposition: typeof inspection.rebindDisposition === 'string' ? inspection.rebindDisposition : null,
    nextStage: typeof inspection.nextStage === 'string' ? inspection.nextStage : null,
    nextLegalAction: typeof inspection.nextLegalAction === 'string' ? inspection.nextLegalAction : null,
    handoffOwner: extras.handoffOwner || 'STAGE_CHECKPOINT_INSPECTOR',
    ownerLocator: extras.ownerLocator || STAGE_CHECKPOINT_OWNER,
    requiredInputs: uniqueBoundedStrings(extras.requiredInputs || []),
    reasonCodes: uniqueBoundedStrings(extras.reasonCodes || inspection.reasonCodes || []),
    sourceLocators: uniqueBoundedStrings([
      packetNumber ? `issue:#${packetNumber}` : null,
      'issue:#293',
      `owner:${STAGE_CHECKPOINT_OWNER}`,
      extras.ownerLocator ? `owner:${extras.ownerLocator}` : null,
    ].filter(Boolean)),
    mutationAuthorized: false,
    executionAuthorized: false,
  };
}

function unknownResult(inspection, reasonCodes) {
  return baseResult(inspection, {
    result: 'UNKNOWN',
    disposition: 'UNKNOWN',
    reasonCodes,
    handoffOwner: 'STAGE_CHECKPOINT_INSPECTOR',
    ownerLocator: STAGE_CHECKPOINT_OWNER,
    requiredInputs: ['targeted-stage-checkpoint-drill-down'],
  });
}

function projectInspection(inspection) {
  if (!inspection || typeof inspection !== 'object' || Array.isArray(inspection)) {
    return unknownResult({}, ['PILOT_INSPECTION_OBJECT_REQUIRED']);
  }
  const disposition = inspection.disposition;
  if (!['PASS', 'UNKNOWN', 'CONFLICT'].includes(disposition)) {
    return unknownResult(inspection, [
      ...uniqueBoundedStrings(inspection.reasonCodes),
      'PILOT_INSPECTION_DISPOSITION_INVALID',
    ]);
  }
  if (disposition !== 'PASS') {
    return baseResult(inspection, {
      result: disposition,
      disposition,
      reasonCodes: inspection.reasonCodes,
      handoffOwner: 'STAGE_CHECKPOINT_INSPECTOR',
      ownerLocator: STAGE_CHECKPOINT_OWNER,
      requiredInputs: ['targeted-stage-checkpoint-drill-down'],
    });
  }
  if (inspection.rebindDisposition === 'STOP_TERMINAL'
      || inspection.nextLegalAction === 'NONE_TERMINAL_PACKET_COMPLETE') {
    return baseResult(inspection, {
      result: 'PASS',
      disposition: 'PASS',
      handoffOwner: 'NONE_TERMINAL',
      ownerLocator: 'packet:terminal',
      requiredInputs: [],
      reasonCodes: inspection.reasonCodes,
    });
  }
  if (inspection.rebindDisposition === 'CONTINUE_TRANSACTION_CLOSURE'
      || inspection.nextLegalAction === 'SELF_CLOSE_SYNC_CURRENT_PACKET') {
    return baseResult(inspection, {
      result: 'PASS',
      disposition: 'PASS',
      handoffOwner: 'PACKET_SELF_BOOKKEEPING',
      ownerLocator: 'packet:self-bookkeeping',
      requiredInputs: ['terminal-stage-evidence','current-packet-body'],
      reasonCodes: inspection.reasonCodes,
    });
  }
  const routeStage = typeof inspection.nextStage === 'string' && inspection.nextStage
    ? inspection.nextStage
    : inspection.currentStage;
  const route = STAGE_ROUTES[routeStage];
  if (!route) {
    return unknownResult(inspection, [
      ...uniqueBoundedStrings(inspection.reasonCodes),
      'PILOT_STAGE_ROUTE_UNKNOWN',
    ]);
  }
  return baseResult(inspection, {
    result: 'PASS',
    disposition: 'PASS',
    handoffOwner: route.handoffOwner,
    ownerLocator: route.ownerLocator,
    requiredInputs: route.requiredInputs,
    reasonCodes: inspection.reasonCodes,
  });
}

async function inspectWorkStage({packetNumber, deps = DEFAULT_DEPS} = {}) {
  if (!Number.isSafeInteger(packetNumber) || packetNumber <= 0) {
    return unknownResult({packetNumber: null}, ['PACKET_NUMBER_INVALID']);
  }
  if (!deps || typeof deps.checkpointRun !== 'function') {
    return unknownResult({packetNumber}, ['STAGE_CHECKPOINT_OWNER_UNAVAILABLE']);
  }
  let inspection;
  try {
    inspection = await deps.checkpointRun({argv: ['inspect', '--packet', String(packetNumber)]});
  } catch {
    return unknownResult({packetNumber}, ['STAGE_CHECKPOINT_INSPECT_FAILED']);
  }
  return projectInspection(inspection);
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 3 || argv[0] !== 'inspect' || argv[1] !== '--packet' || !/^[1-9]\d*$/.test(argv[2])) {
    throw new Error('usage: node work-stage-pilot.cjs inspect --packet <number>');
  }
  return {packetNumber: Number(argv[2])};
}

function exitCodeFor(result) {
  if (result?.result === 'PASS') return 0;
  if (result?.result === 'CONFLICT') return 3;
  return 2;
}

async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const result = await inspectWorkStage({packetNumber: args.packetNumber, deps: options.deps || DEFAULT_DEPS});
  return {text: `${JSON.stringify(result, null, 2)}\n`, code: exitCodeFor(result)};
}

async function main() {
  try {
    const output = await runCli();
    process.stdout.write(output.text);
    process.exitCode = output.code;
  } catch {
    const result = unknownResult({}, ['PILOT_ARGUMENT_OR_RUNTIME_ERROR']);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = exitCodeFor(result);
  }
}

if (require.main === module) main();

module.exports = {
  DEFAULT_DEPS,
  MODE,
  PROOF_ELIGIBILITY_OWNER,
  STAGE_CHECKPOINT_OWNER,
  STAGE_ROUTES,
  VALIDATION_ATTENTION_OWNER,
  baseResult,
  exitCodeFor,
  inspectWorkStage,
  parseArgs,
  projectInspection,
  runCli,
};
