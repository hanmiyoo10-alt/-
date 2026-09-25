'use strict';

const stageReceipt = require('../stage-receipt.cjs');
const executionReceipt = require('../execution-receipt.cjs');
const agentDecisionView = require('../agent-decision-view.cjs');

const ADAPTER_LOCATOR = 'adapter:canonical-receipt-attention:v1';
const PRIMITIVE_ID = 'repo:canonical-receipt-attention-v1';
const EXECUTION_SURFACE = 'CANONICAL_MAIN:RECEIPT_ATTENTION';
const INPUT_FIELDS = new Set(['receiptText', 'expectedStage', 'receiptLocator']);

const DEFAULT_DEPS = Object.freeze({
  stageReceipt,
  executionReceipt,
  agentDecisionView,
});

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function safeLocator(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  if (Buffer.byteLength(text, 'utf8') > 320) return null;
  if (/[\u0000-\u001f\u007f]/.test(text)) return null;
  if (/(authorization\s*:|bearer\s+|token\s*=|secret\s*=|api[_-]?key\s*=|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]+)/i.test(text)) {
    return null;
  }
  return text;
}

function inspectInput(input, deps = DEFAULT_DEPS) {
  const reasons = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      receiptText: null,
      expectedStage: null,
      receiptLocator: ADAPTER_LOCATOR,
      reasons: ['INPUT_OBJECT_REQUIRED'],
    };
  }
  for (const key of Object.keys(input)) {
    if (!INPUT_FIELDS.has(key)) reasons.push('INPUT_FIELD_UNSUPPORTED:' + key);
  }
  const receiptText = typeof input.receiptText === 'string' ? input.receiptText : null;
  if (!receiptText) reasons.push('RECEIPT_TEXT_REQUIRED');

  const expectedStage = typeof input.expectedStage === 'string'
    && deps.stageReceipt.STAGES.includes(input.expectedStage)
    ? input.expectedStage
    : null;
  if (!expectedStage) reasons.push('EXPECTED_STAGE_UNSUPPORTED');

  const receiptLocator = safeLocator(input.receiptLocator);
  if (!receiptLocator) reasons.push('RECEIPT_LOCATOR_INVALID');

  return {
    receiptText,
    expectedStage,
    receiptLocator: receiptLocator || ADAPTER_LOCATOR,
    reasons: uniqueSorted(reasons),
  };
}

function statusMapping(status) {
  if (status === 'PASS') return {result: 'PASS', attentionDisposition: 'COMPLETE', severity: null};
  if (status === 'FAIL') return {result: 'FAIL', attentionDisposition: 'NEEDS_REVIEW', severity: 'FAIL'};
  if (status === 'BLOCKED') return {result: 'BLOCKED', attentionDisposition: 'BLOCKED', severity: 'BLOCKER'};
  if (status === 'CONFLICT') return {result: 'CONFLICT', attentionDisposition: 'CONFLICT', severity: 'CONFLICT'};
  return {result: 'UNKNOWN', attentionDisposition: 'UNKNOWN', severity: 'UNKNOWN'};
}

function primaryReason(stage, fallback) {
  return stage?.reasonCodes?.[0]
    || stage?.conflicts?.[0]
    || stage?.requiredUnknowns?.[0]
    || stage?.blockers?.[0]
    || fallback;
}

function attentionItem({reasonCode, severity, locator, nextLegalAction}) {
  return {
    subject: PRIMITIVE_ID,
    reasonCode,
    severity,
    constraint: 'RECEIPT_ATTENTION_ADAPTER',
    nextPhase: nextLegalAction || 'TARGETED_RECEIPT_DRILLDOWN',
    locator,
  };
}

function executionFacts({
  phase, sourceIdentity, steps, result, attentionDisposition, reasonCodes,
  unknowns, conflicts, blockers, nextLegalAction, locator, affectedFiles = [],
  attentionCount = 1,
}) {
  return {
    schemaVersion: 2,
    operationId: 'repo-canonical-receipt-attention:' + phase + ':' + sourceIdentity.identity,
    primitiveId: PRIMITIVE_ID,
    sourceIdentity,
    executionSurface: EXECUTION_SURFACE,
    stage: phase,
    executionLifecycle: 'FINISHED',
    attentionDisposition,
    result,
    proofScope: 'read-only compatibility projection over one already-materialized canonical stage receipt; no execution replay',
    steps,
    counters: [
      {name: 'attention_items', value: attentionCount},
      {name: 'effects_performed', value: 0},
      {name: 'raw_receipt_exposed', value: 0},
      {name: 'targeted_drilldowns', value: 0},
    ],
    affectedFiles,
    artifactLocators: [locator],
    reasonCodes: uniqueSorted(reasonCodes),
    requiredUnknowns: uniqueSorted(unknowns),
    conflicts: uniqueSorted(conflicts),
    blockers: uniqueSorted(blockers),
    exitCode: null,
    stderrTail: null,
    nextLegalAction,
  };
}

function projectView({receipt, phase, output, attention, sourceLocator, deps = DEFAULT_DEPS}) {
  return deps.agentDecisionView.projectAgentDecisionView({
    receipt,
    phase,
    output,
    attention,
    receiptLocator: 'inline:repository-execution-receipt:' + (receipt.receiptDigest || 'unknown'),
    reportLocator: sourceLocator,
  });
}

function projectInputFailure(inputState, deps = DEFAULT_DEPS) {
  const phase = inputState.expectedStage || 'UNKNOWN';
  const reasonCode = inputState.reasons[0] || 'INPUT_INVALID';
  const receipt = deps.executionReceipt.projectExecutionReceipt(executionFacts({
    phase,
    sourceIdentity: {
      kind: 'CANONICAL_STAGE_RECEIPT',
      locator: inputState.receiptLocator,
      identity: 'UNKNOWN',
    },
    steps: [{name: 'adapter-input', result: 'UNKNOWN', evidenceLocator: inputState.receiptLocator}],
    result: 'UNKNOWN',
    attentionDisposition: 'UNKNOWN',
    reasonCodes: inputState.reasons,
    unknowns: inputState.reasons,
    conflicts: [],
    blockers: [],
    nextLegalAction: 'TARGETED_RECEIPT_DRILLDOWN',
    locator: inputState.receiptLocator,
  }));
  const attention = [attentionItem({
    reasonCode,
    severity: 'UNKNOWN',
    locator: inputState.receiptLocator,
    nextLegalAction: 'TARGETED_RECEIPT_DRILLDOWN',
  })];
  const view = projectView({
    receipt, phase,
    output: {expectedStage: phase, projectionResult: 'UNKNOWN'},
    attention, sourceLocator: inputState.receiptLocator, deps,
  });
  return {receipt, view};
}

function projectParserFailure({parsed, inputState, deps = DEFAULT_DEPS}) {
  const phase = inputState.expectedStage;
  const mapping = statusMapping(parsed.status);
  const reasons = uniqueSorted(parsed.reasonCodes || ['STAGE_RECEIPT_PARSE_UNKNOWN']);
  const isConflict = parsed.status === 'CONFLICT';
  const receipt = deps.executionReceipt.projectExecutionReceipt(executionFacts({
    phase,
    sourceIdentity: {
      kind: 'CANONICAL_STAGE_RECEIPT',
      locator: inputState.receiptLocator,
      identity: 'UNKNOWN',
    },
    steps: [{name: 'canonical-stage-receipt-parse', result: mapping.result,
      evidenceLocator: inputState.receiptLocator}],
    result: mapping.result,
    attentionDisposition: mapping.attentionDisposition,
    reasonCodes: reasons,
    unknowns: isConflict ? [] : reasons,
    conflicts: isConflict ? reasons : [],
    blockers: [],
    nextLegalAction: 'TARGETED_RECEIPT_DRILLDOWN',
    locator: inputState.receiptLocator,
  }));
  const attention = [attentionItem({
    reasonCode: reasons[0],
    severity: mapping.severity,
    locator: inputState.receiptLocator,
    nextLegalAction: 'TARGETED_RECEIPT_DRILLDOWN',
  })];
  const view = projectView({
    receipt, phase,
    output: {expectedStage: phase, projectionResult: mapping.result},
    attention, sourceLocator: inputState.receiptLocator, deps,
  });
  return {receipt, view};
}

function projectStage({stage, inputState, deps = DEFAULT_DEPS}) {
  if (stage.stage !== inputState.expectedStage) {
    const reasonCode = 'RECEIPT_EXPECTED_STAGE_CONFLICT:'
      + inputState.expectedStage + ':' + stage.stage;
    const receipt = deps.executionReceipt.projectExecutionReceipt(executionFacts({
      phase: inputState.expectedStage,
      sourceIdentity: {
        kind: 'CANONICAL_STAGE_RECEIPT',
        locator: inputState.receiptLocator,
        identity: stage.receiptDigest,
      },
      steps: [
        {name: 'canonical-stage-receipt-parse', result: 'PASS',
          evidenceLocator: inputState.receiptLocator},
        {name: 'expected-stage-match', result: 'CONFLICT',
          evidenceLocator: inputState.receiptLocator},
      ],
      result: 'CONFLICT',
      attentionDisposition: 'CONFLICT',
      reasonCodes: [reasonCode],
      unknowns: [],
      conflicts: [reasonCode],
      blockers: [],
      nextLegalAction: 'TARGETED_RECEIPT_DRILLDOWN',
      locator: inputState.receiptLocator,
      affectedFiles: stage.scope?.paths || [],
    }));
    const view = projectView({
      receipt, phase: inputState.expectedStage,
      output: {
        canonicalReceiptDigest: stage.receiptDigest,
        expectedStage: inputState.expectedStage,
        sourceStage: stage.stage,
        sourceStatus: stage.status,
      },
      attention: [attentionItem({
        reasonCode,
        severity: 'CONFLICT',
        locator: inputState.receiptLocator,
        nextLegalAction: 'TARGETED_RECEIPT_DRILLDOWN',
      })],
      sourceLocator: inputState.receiptLocator,
      deps,
    });
    return {receipt, view};
  }

  const mapping = statusMapping(stage.status);
  const fallbackReason = 'STAGE_RECEIPT_STATUS_' + stage.status;
  const reasonCode = primaryReason(stage, fallbackReason);
  const attention = mapping.result === 'PASS' ? [] : [attentionItem({
    reasonCode,
    severity: mapping.severity,
    locator: inputState.receiptLocator,
    nextLegalAction: stage.nextLegalAction,
  })];
  const receipt = deps.executionReceipt.projectExecutionReceipt(executionFacts({
    phase: stage.stage,
    sourceIdentity: {
      kind: 'CANONICAL_STAGE_RECEIPT',
      locator: inputState.receiptLocator,
      identity: stage.receiptDigest,
    },
    steps: [
      {name: 'canonical-stage-receipt-parse', result: 'PASS',
        evidenceLocator: inputState.receiptLocator},
      {name: 'stage-evidence', result: mapping.result,
        evidenceLocator: inputState.receiptLocator},
    ],
    result: mapping.result,
    attentionDisposition: mapping.attentionDisposition,
    reasonCodes: mapping.result === 'PASS' ? [] : [...(stage.reasonCodes || []), reasonCode],
    unknowns: stage.requiredUnknowns || [],
    conflicts: stage.conflicts || [],
    blockers: stage.blockers || [],
    nextLegalAction: stage.nextLegalAction,
    locator: inputState.receiptLocator,
    affectedFiles: stage.scope?.paths || [],
    attentionCount: attention.length,
  }));
  const view = projectView({
    receipt,
    phase: stage.stage,
    output: {
      canonicalReceiptDigest: stage.receiptDigest,
      expectedStage: inputState.expectedStage,
      sourceStage: stage.stage,
      sourceStatus: stage.status,
    },
    attention,
    sourceLocator: inputState.receiptLocator,
    deps,
  });
  return {receipt, view};
}

function projectCanonicalReceiptAttention(input, deps = DEFAULT_DEPS) {
  const inputState = inspectInput(input, deps);
  if (inputState.reasons.length) return projectInputFailure(inputState, deps);

  const parsed = deps.stageReceipt.parseRenderedStageReceipt(inputState.receiptText);
  if (parsed.status !== 'VALID' || !parsed.value) {
    return projectParserFailure({parsed, inputState, deps});
  }
  return projectStage({stage: parsed.value, inputState, deps});
}

module.exports = {
  ADAPTER_LOCATOR,
  DEFAULT_DEPS,
  EXECUTION_SURFACE,
  PRIMITIVE_ID,
  inspectInput,
  projectCanonicalReceiptAttention,
  safeLocator,
  statusMapping,
};
