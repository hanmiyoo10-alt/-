#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../..');
const MAX_INPUT_BYTES = 16 * 1024;
const MAX_REPORT_BYTES = 32 * 1024;
const REPO_PREFIX = '.github/plugin-control-plane/canonical-main/';

const continuation = require('../validation-continuation/validation-continuation-owner.cjs');
const validationMerge = require('../validation-merge/validation-merge-owner.cjs');
const finalization = require('../validation-finalization/validation-finalization-owner.cjs');
const stageReceipt = require('../stage-receipt.cjs');
const executionReceipt = require('../execution-receipt.cjs');
const agentDecisionView = require('../agent-decision-view.cjs');
const {canonicalize, stableHash} = require('../handoff.cjs');

const DEFAULT_DEPS = Object.freeze({
  continuation,
  validationMerge,
  finalization,
  stageReceipt,
  executionReceipt,
  agentDecisionView,
});

class ValidationAttentionError extends Error {
  constructor(kind, reasonCodes, locator = null) {
    const unique = [...new Set(reasonCodes)].sort();
    super(unique[0] || kind);
    this.kind = kind;
    this.reasonCodes = unique;
    this.locator = locator;
  }
}

function sorted(values) {
  return [...new Set(values)].sort();
}
function readRegularJson(filePath, maxBytes = MAX_INPUT_BYTES) {
  const resolved = path.resolve(filePath);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) {
    throw new ValidationAttentionError('UNKNOWN', ['INPUT_FILE_INVALID']);
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch {
    throw new ValidationAttentionError('UNKNOWN', ['INPUT_JSON_INVALID']);
  }
}
function childReason(receipt, fallback) {
  return receipt?.reasonCodes?.[0]
    || receipt?.conflicts?.[0]
    || receipt?.requiredUnknowns?.[0]
    || receipt?.blockers?.[0]
    || fallback;
}
function severityFor(result, attentionDisposition) {
  if (result === 'CONFLICT' || attentionDisposition === 'CONFLICT') return 'CONFLICT';
  if (result === 'UNKNOWN' || attentionDisposition === 'UNKNOWN') return 'UNKNOWN';
  if (result === 'BLOCKED' || attentionDisposition === 'BLOCKED') return 'BLOCKER';
  if (result === 'FAIL') return 'FAIL';
  if (result === 'PARTIAL' || attentionDisposition === 'NEEDS_REVIEW') return 'UNKNOWN';
  return 'WARN';
}
function attentionItem(receipt, locator, fallbackReason, nextAction) {
  return {
    subject: receipt?.primitiveId || 'repo:validation-attention',
    reasonCode: childReason(receipt, fallbackReason),
    severity: severityFor(receipt?.result, receipt?.attentionDisposition),
    constraint: 'VALIDATION_ATTENTION_EXCEPTION',
    nextPhase: nextAction || receipt?.nextLegalAction || 'NEEDS_SEMANTIC_DECISION',
    locator: locator || 'UNKNOWN',
  };
}
function compositionReceipt({
  operation, packetNumber, prNumber, candidateHead, paths, steps,
  result, attentionDisposition, reasonCodes = [], unknowns = [],
  conflicts = [], blockers = [], nextLegalAction, artifacts = [],
  attentionCount = 0, deps = DEFAULT_DEPS,
}) {
  return deps.executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'repo-validation-attention:' + operation + ':' + packetNumber + ':' + prNumber,
    primitiveId: 'repo:validation-attention-' + operation,
    sourceIdentity: {
      kind: 'PULL_REQUEST',
      locator: 'pr:#' + prNumber,
      identity: candidateHead || 'UNKNOWN',
    },
    executionSurface: 'CANONICAL_MAIN:VALIDATION_ATTENTION',
    stage: 'VALIDATION_MERGE',
    executionLifecycle: 'FINISHED',
    attentionDisposition,
    result,
    proofScope: operation === 'inspect'
      ? 'fixed read-only validation attention composition; merge effect excluded'
      : 'fixed read-only merge finalization attention composition; postmerge excluded',
    steps,
    counters: [
      {name: 'attention_items', value: attentionCount},
      {name: 'changed_paths', value: Array.isArray(paths) ? paths.length : 0},
      {name: 'merge_effects_performed', value: 0},
      {name: 'raw_transcript_exposed', value: 0},
      {name: 'semantic_surface_budget', value: 3},
      {name: 'targeted_drilldowns', value: 0},
    ],
    affectedFiles: Array.isArray(paths) ? paths : [],
    artifactLocators: sorted(artifacts),
    reasonCodes: sorted(reasonCodes),
    requiredUnknowns: sorted(unknowns),
    conflicts: sorted(conflicts),
    blockers: sorted(blockers),
    exitCode: null,
    stderrTail: null,
    nextLegalAction,
  });
}
function dispositionFromError(error) {
  const kind = error instanceof ValidationAttentionError ? error.kind : 'UNKNOWN';
  if (kind === 'CONFLICT') return ['CONFLICT', 'CONFLICT'];
  if (kind === 'BLOCKED') return ['BLOCKED', 'BLOCKED'];
  if (kind === 'NEEDS_REVIEW') return ['PARTIAL', 'NEEDS_REVIEW'];
  if (kind === 'FAIL') return ['FAIL', 'NEEDS_REVIEW'];
  return ['UNKNOWN', 'UNKNOWN'];
}
function aggregateError({
  operation, packetNumber, prNumber, candidateHead = null, paths = [],
  error, nextLegalAction = 'TARGETED_DRILLDOWN_REQUIRED', deps = DEFAULT_DEPS,
}) {
  const reasons = error?.reasonCodes || ['VALIDATION_ATTENTION_INTERNAL_ERROR'];
  const [result, attentionDisposition] = dispositionFromError(error);
  const locator = error?.locator || 'issue:#' + packetNumber;
  const draft = {
    primitiveId: 'repo:validation-attention-' + operation,
    result,
    attentionDisposition,
    reasonCodes: reasons,
    requiredUnknowns: result === 'UNKNOWN' ? reasons : [],
    conflicts: result === 'CONFLICT' ? reasons : [],
    blockers: result === 'BLOCKED' ? reasons : [],
    nextLegalAction,
  };
  const attention = [attentionItem(draft, locator, reasons[0], nextLegalAction)];
  const receipt = compositionReceipt({
    operation, packetNumber, prNumber, candidateHead, paths,
    steps: [{name: 'validation-attention', result, evidenceLocator: locator}],
    result, attentionDisposition, reasonCodes: reasons,
    unknowns: draft.requiredUnknowns, conflicts: draft.conflicts, blockers: draft.blockers,
    nextLegalAction, artifacts: [locator], attentionCount: attention.length, deps,
  });
  return {
    receipt,
    report: {
      schemaVersion: 1,
      mode: 'VALIDATION_ATTENTION_REPORT',
      operation,
      packetNumber,
      prNumber,
      route: 'ERROR',
      result: receipt.result,
      reasonCodes: receipt.reasonCodes,
      attention,
      output: {pr: '#' + prNumber, mergeAdmission: 'UNKNOWN'},
      receiptDigest: receipt.receiptDigest,
    },
  };
}
function persistChild(owner, result, packetNumber, prNumber, root, operation = null) {
  return operation
    ? owner.persistResult(result, packetNumber, prNumber, operation, root)
    : owner.persistResult(result, packetNumber, prNumber, root);
}
function continuationRouting(result, locators) {
  const disposition = result.report.resumeDisposition;
  const child = result.receipt;
  const locator = locators.reportLocator;
  if (disposition === 'MERGE_ADMISSION_READY') return {kind: 'MERGE_ADMISSION'};
  if (disposition === 'ALREADY_MERGED') {
    return {
      kind: 'COMPLETE',
      result: 'PASS',
      attentionDisposition: 'COMPLETE',
      reasonCodes: [],
      nextLegalAction: 'VALIDATION_MERGE_FINALIZE',
      attention: [],
      output: {
        mergeAdmission: 'ALREADY_MERGED',
        currentization: result.report.output.currentization,
        required: result.report.output.required,
      },
    };
  }
  const canonicalOverride = {
    CONFLICT: ['CONFLICT', 'CONFLICT'],
    UNKNOWN: ['UNKNOWN', 'UNKNOWN'],
    BLOCKED: ['BLOCKED', 'BLOCKED'],
    FAIL: ['FAIL', 'NEEDS_REVIEW'],
  };
  const actionMap = {
    CURRENTIZATION_REQUIRED: 'BLOCKED',
    VALIDATION_REFRESH_REQUIRED: 'BLOCKED',
    NEEDS_RECOVERY_INSPECT: 'NEEDS_REVIEW',
    NEEDS_REVIEW: 'NEEDS_REVIEW',
    BLOCKED: 'BLOCKED',
    UNKNOWN: 'UNKNOWN',
  };
  const route = actionMap[disposition] || 'UNKNOWN';
  const resultMap = {BLOCKED: 'BLOCKED', NEEDS_REVIEW: 'PARTIAL', UNKNOWN: 'UNKNOWN'};
  const attentionMap = {BLOCKED: 'BLOCKED', NEEDS_REVIEW: 'NEEDS_REVIEW', UNKNOWN: 'UNKNOWN'};
  const override = canonicalOverride[child.result];
  const aggregateResult = override ? override[0] : resultMap[route];
  const aggregateAttention = override ? override[1] : attentionMap[route];
  const reason = childReason(child, 'VALIDATION_CONTINUATION_ATTENTION');
  const projected = {
    ...child,
    result: aggregateResult,
    attentionDisposition: aggregateAttention,
    reasonCodes: child.reasonCodes?.length ? child.reasonCodes : [reason],
  };
  return {
    kind: 'STOP',
    result: aggregateResult,
    attentionDisposition: aggregateAttention,
    reasonCodes: projected.reasonCodes,
    nextLegalAction: result.report.nextLegalAction || child.nextLegalAction,
    attention: [attentionItem(projected, locator, reason,
      result.report.nextLegalAction || child.nextLegalAction)],
    output: {
      mergeAdmission: 'BLOCKED',
      currentization: disposition === 'CURRENTIZATION_REQUIRED'
        ? 'REQUIRED' : result.report.output.currentization,
      required: disposition === 'VALIDATION_REFRESH_REQUIRED'
        ? 'REFRESH_REQUIRED' : result.report.output.required,
    },
  };
}
function mergeRouting(result, locators) {
  if (result.receipt.result === 'PASS'
      && result.receipt.attentionDisposition === 'COMPLETE'
      && result.receipt.nextLegalAction === 'MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT') {
    return {kind: 'READY'};
  }
  const child = result.receipt;
  const locator = locators.reportLocator;
  return {
    kind: 'STOP',
    result: child.result,
    attentionDisposition: child.attentionDisposition,
    reasonCodes: child.reasonCodes,
    nextLegalAction: child.nextLegalAction,
    attention: [attentionItem(child, locator, 'VALIDATION_MERGE_ATTENTION', child.nextLegalAction)],
    output: {
      mergeAdmission: 'BLOCKED',
      currentization: child.nextLegalAction === 'CURRENTIZE_PR_THROUGH_EXISTING_OWNER'
        ? 'REQUIRED' : 'UNKNOWN',
      required: result.report.output?.required || 'UNKNOWN',
      overlap: result.report.output?.overlap || 'UNKNOWN',
    },
  };
}
function inspectOutput(implementation, continuationResult, mergeResult) {
  const mergeReport = mergeResult.report;
  return {
    branchProtection: 'PASS',
    candidateHead: implementation.expectedHead,
    currentization: ['EXACT_CURRENT_MAIN', 'REPLAY_SAFE']
      .includes(continuationResult.report.output.currentization) ? 'NOT_REQUIRED' : 'UNKNOWN',
    mainObserved: mergeReport.currentMainSha,
    mergeAdmission: 'READY',
    overlap: mergeReport.output.overlap,
    required: mergeReport.output.required,
    reviews: mergeReport.output.reviewClear ? 'CLEAR' : 'UNKNOWN',
    threads: mergeReport.output.reviewClear ? 'CLEAR' : 'UNKNOWN',
  };
}
async function inspectComposition({
  client, packetNumber, prNumber, implementationReceipt,
  root = ROOT, deps = DEFAULT_DEPS,
}) {
  let implementation;
  try {
    implementation = deps.validationMerge.validateImplementationReceipt(
      implementationReceipt, packetNumber, prNumber);
  } catch (error) {
    const wrapped = new ValidationAttentionError(
      error?.kind || 'UNKNOWN',
      error?.reasonCodes || ['IMPLEMENTATION_STAGE_RECEIPT_INVALID'],
      error?.locator || 'receipt:canonical-main-stage:IMPLEMENTATION_PR');
    return aggregateError({operation: 'inspect', packetNumber, prNumber, error: wrapped, deps});
  }

  let continuationResult;
  try {
    continuationResult = await deps.continuation.inspectWithClient({client, packetNumber, prNumber});
  } catch (error) {
    const wrapped = new ValidationAttentionError(
      error?.kind || 'UNKNOWN',
      error?.reasonCodes || ['VALIDATION_CONTINUATION_CHILD_ERROR'],
      error?.locator || 'issue:#' + packetNumber);
    return aggregateError({
      operation: 'inspect', packetNumber, prNumber,
      candidateHead: implementation.expectedHead, paths: implementation.paths,
      error: wrapped, deps,
    });
  }
  const continuationLocators = persistChild(
    deps.continuation, continuationResult, packetNumber, prNumber, root);
  const route = continuationRouting(continuationResult, continuationLocators);

  if (route.kind !== 'MERGE_ADMISSION') {
    const result = route.result;
    const reasons = route.reasonCodes || [];
    const receipt = compositionReceipt({
      operation: 'inspect', packetNumber, prNumber,
      candidateHead: implementation.expectedHead, paths: implementation.paths,
      steps: [{
        name: 'validation-continuation',
        result: result === 'PARTIAL' ? 'PARTIAL' : result,
        evidenceLocator: continuationLocators.reportLocator,
      }],
      result, attentionDisposition: route.attentionDisposition, reasonCodes: reasons,
      unknowns: result === 'UNKNOWN' ? reasons : [],
      conflicts: result === 'CONFLICT' ? reasons : [],
      blockers: result === 'BLOCKED' ? reasons : [],
      nextLegalAction: route.nextLegalAction,
      artifacts: [continuationLocators.receiptLocator, continuationLocators.reportLocator],
      attentionCount: route.attention.length, deps,
    });
    return {
      receipt,
      report: {
        schemaVersion: 1, mode: 'VALIDATION_ATTENTION_REPORT', operation: 'inspect',
        packetNumber, prNumber, route: continuationResult.report.resumeDisposition,
        candidateHead: implementation.expectedHead, implementationReceipt,
        children: {
          continuation: {
            receiptDigest: continuationResult.receipt.receiptDigest,
            receiptLocator: continuationLocators.receiptLocator,
            reportLocator: continuationLocators.reportLocator,
          },
          mergeAdmission: null,
        },
        semanticSurfaceBudget: 3, targetedDrilldowns: 0, rawTranscriptExposed: 0,
        result: receipt.result, reasonCodes: receipt.reasonCodes,
        attention: route.attention, output: {pr: '#' + prNumber, ...route.output},
        receiptDigest: receipt.receiptDigest,
      },
    };
  }

  const mergeResult = await deps.validationMerge.inspectWithClient({
    client, packetNumber, prNumber, implementationReceipt,
  });
  const mergeLocators = persistChild(
    deps.validationMerge, mergeResult, packetNumber, prNumber, root, 'inspect');
  const mergeRoute = mergeRouting(mergeResult, mergeLocators);
  if (mergeRoute.kind !== 'READY') {
    const result = mergeRoute.result;
    const reasons = mergeRoute.reasonCodes || [];
    const receipt = compositionReceipt({
      operation: 'inspect', packetNumber, prNumber,
      candidateHead: implementation.expectedHead, paths: implementation.paths,
      steps: [
        {name: 'validation-continuation', result: 'PASS',
          evidenceLocator: continuationLocators.reportLocator},
        {name: 'validation-merge-admission',
          result: result === 'PARTIAL' ? 'PARTIAL' : result,
          evidenceLocator: mergeLocators.reportLocator},
      ],
      result, attentionDisposition: mergeRoute.attentionDisposition,
      reasonCodes: reasons,
      unknowns: result === 'UNKNOWN' ? reasons : [],
      conflicts: result === 'CONFLICT' ? reasons : [],
      blockers: result === 'BLOCKED' ? reasons : [],
      nextLegalAction: mergeRoute.nextLegalAction,
      artifacts: [
        continuationLocators.receiptLocator, continuationLocators.reportLocator,
        mergeLocators.receiptLocator, mergeLocators.reportLocator,
      ],
      attentionCount: mergeRoute.attention.length, deps,
    });
    return {
      receipt,
      report: {
        schemaVersion: 1, mode: 'VALIDATION_ATTENTION_REPORT', operation: 'inspect',
        packetNumber, prNumber, route: 'MERGE_ADMISSION_BLOCKED',
        candidateHead: implementation.expectedHead, implementationReceipt,
        children: {
          continuation: {
            receiptDigest: continuationResult.receipt.receiptDigest,
            receiptLocator: continuationLocators.receiptLocator,
            reportLocator: continuationLocators.reportLocator,
          },
          mergeAdmission: {
            receiptDigest: mergeResult.receipt.receiptDigest,
            receiptLocator: mergeLocators.receiptLocator,
            reportLocator: mergeLocators.reportLocator,
          },
        },
        semanticSurfaceBudget: 3, targetedDrilldowns: 0, rawTranscriptExposed: 0,
        result: receipt.result, reasonCodes: receipt.reasonCodes,
        attention: mergeRoute.attention, output: {pr: '#' + prNumber, ...mergeRoute.output},
        receiptDigest: receipt.receiptDigest,
      },
    };
  }

  const output = inspectOutput(implementation, continuationResult, mergeResult);
  const receipt = compositionReceipt({
    operation: 'inspect', packetNumber, prNumber,
    candidateHead: implementation.expectedHead, paths: implementation.paths,
    steps: [
      {name: 'validation-continuation', result: 'PASS',
        evidenceLocator: continuationLocators.reportLocator},
      {name: 'validation-merge-admission', result: 'PASS',
        evidenceLocator: mergeLocators.reportLocator},
    ],
    result: 'PASS', attentionDisposition: 'COMPLETE',
    nextLegalAction: 'MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT',
    artifacts: [
      continuationLocators.receiptLocator, continuationLocators.reportLocator,
      mergeLocators.receiptLocator, mergeLocators.reportLocator,
    ],
    attentionCount: 0, deps,
  });
  return {
    receipt,
    report: {
      schemaVersion: 1, mode: 'VALIDATION_ATTENTION_REPORT', operation: 'inspect',
      packetNumber, prNumber, route: 'MERGE_ADMISSION_READY',
      candidateHead: implementation.expectedHead, implementationReceipt,
      packetBodySha256: mergeResult.report.packetBodySha256,
      children: {
        continuation: {
          receiptDigest: continuationResult.receipt.receiptDigest,
          receiptLocator: continuationLocators.receiptLocator,
          reportLocator: continuationLocators.reportLocator,
        },
        mergeAdmission: {
          receiptDigest: mergeResult.receipt.receiptDigest,
          receiptLocator: mergeLocators.receiptLocator,
          reportLocator: mergeLocators.reportLocator,
        },
      },
      semanticSurfaceBudget: 3, targetedDrilldowns: 0, rawTranscriptExposed: 0,
      result: receipt.result, reasonCodes: [], attention: [],
      output: {pr: '#' + prNumber, ...output},
      receiptDigest: receipt.receiptDigest,
    },
  };
}

function persistResult(result, packetNumber, prNumber, operation, root = ROOT, deps = DEFAULT_DEPS) {
  const dir = path.join(deps.validationMerge.gitAdminDir(root), 'validation-attention-evidence');
  fs.mkdirSync(dir, {recursive: true, mode: 0o700});
  fs.chmodSync(dir, 0o700);
  const prefix = 'packet-' + packetNumber + '-pr-' + prNumber + '.' + operation;
  const receiptPath = path.join(dir, prefix + '.receipt.json');
  const reportPath = path.join(dir, prefix + '.report.json');
  const reportBytes = Buffer.byteLength(JSON.stringify(canonicalize(result.report)), 'utf8');
  if (reportBytes > MAX_REPORT_BYTES) {
    throw new ValidationAttentionError('UNKNOWN', ['ATTENTION_REPORT_TOO_LARGE']);
  }
  const receiptLocator = deps.validationMerge.writeJsonAtomic(receiptPath, result.receipt);
  const reportLocator = deps.validationMerge.writeJsonAtomic(reportPath, result.report);
  return {paths: {receipt: receiptPath, report: reportPath}, receiptLocator, reportLocator};
}
function projectView(result, locators, deps = DEFAULT_DEPS) {
  return deps.agentDecisionView.projectAgentDecisionView({
    receipt: result.receipt,
    phase: 'VALIDATION_MERGE',
    output: result.report.output || {},
    attention: result.report.attention || [],
    receiptLocator: locators.receiptLocator,
    reportLocator: locators.reportLocator,
  });
}
function readCanonicalInspectEvidence(packetNumber, prNumber, root = ROOT, deps = DEFAULT_DEPS) {
  const dir = path.join(deps.validationMerge.gitAdminDir(root), 'validation-attention-evidence');
  const prefix = 'packet-' + packetNumber + '-pr-' + prNumber + '.inspect';
  const receipt = readRegularJson(path.join(dir, prefix + '.receipt.json'), MAX_REPORT_BYTES);
  const report = readRegularJson(path.join(dir, prefix + '.report.json'), MAX_REPORT_BYTES);
  const reasons = [];
  const canonicalReceipt = deps.agentDecisionView.validateCanonicalReceipt(receipt, reasons);
  if (!canonicalReceipt || reasons.length) {
    throw new ValidationAttentionError('CONFLICT', ['ATTENTION_INSPECT_RECEIPT_CONFLICT']);
  }
  if (report?.schemaVersion !== 1 || report?.mode !== 'VALIDATION_ATTENTION_REPORT'
      || report?.operation !== 'inspect' || report?.packetNumber !== packetNumber
      || report?.prNumber !== prNumber || report?.result !== 'PASS'
      || report?.receiptDigest !== canonicalReceipt.receiptDigest
      || !report?.implementationReceipt) {
    throw new ValidationAttentionError('CONFLICT', ['ATTENTION_INSPECT_REPORT_CONFLICT']);
  }
  const implementation = deps.validationMerge.validateImplementationReceipt(
    report.implementationReceipt, packetNumber, prNumber);
  if (implementation.expectedHead !== report.candidateHead) {
    throw new ValidationAttentionError('CONFLICT', ['ATTENTION_INSPECT_HEAD_CONFLICT']);
  }
  return {receipt: canonicalReceipt, report, implementation};
}
function repoNeutralPacket(packet) {
  const scopes = packet?.scopes || [];
  const paths = packet?.paths || [];
  const surfaces = scopes.filter((row) => row.startsWith('surface:'));
  return paths.length > 0
    && paths.every((repoPath) => repoPath.startsWith(REPO_PREFIX))
    && surfaces.length > 0
    && surfaces.every((row) => row.startsWith('surface:repo:'));
}
function pathScopeDigest(paths) {
  return 'sha256:' + stableHash(sorted(paths));
}
function alreadyMergedFinalizeEvidence({
  packetNumber, prNumber, inspectEvidence, packet,
}) {
  const locator = 'receipt:' + inspectEvidence.receipt.receiptDigest;
  if (inspectEvidence.report.route !== 'ALREADY_MERGED'
      || inspectEvidence.report.output?.mergeAdmission !== 'ALREADY_MERGED'
      || inspectEvidence.receipt.nextLegalAction !== 'VALIDATION_MERGE_FINALIZE') {
    throw new ValidationAttentionError(
      'CONFLICT', ['ALREADY_MERGED_INSPECT_ROUTE_CONFLICT'], locator);
  }
  const continuation = inspectEvidence.report.children?.continuation;
  if (!continuation?.receiptDigest || !continuation?.reportLocator) {
    throw new ValidationAttentionError(
      'CONFLICT', ['ALREADY_MERGED_CONTINUATION_EVIDENCE_CONFLICT'], locator);
  }
  if (!packet || typeof packet.bodySha256 !== 'string'
      || JSON.stringify(sorted(packet.paths || []))
        !== JSON.stringify(sorted(inspectEvidence.implementation.paths))) {
    throw new ValidationAttentionError(
      'CONFLICT', ['ALREADY_MERGED_PACKET_SCOPE_CONFLICT'], 'issue:#' + packetNumber);
  }
  return {
    receipt: inspectEvidence.receipt,
    report: {
      schemaVersion: 1,
      mode: 'VALIDATION_MERGE_REPORT',
      operation: 'inspect',
      packetNumber,
      prNumber,
      packetBodySha256: packet.bodySha256,
      expectedHead: inspectEvidence.implementation.expectedHead,
      paths: sorted(packet.paths),
      result: 'PASS',
      receiptDigest: inspectEvidence.receipt.receiptDigest,
      output: {pr: '#' + prNumber, merge: 'ALREADY_MERGED'},
    },
  };
}
function buildValidationStageReceipt({
  packetNumber, prNumber, inspectEvidence, mergeInspectEvidence,
  mergeFinalizeResult, mergeFinalizeLocators, alreadyMerged = false,
  deps = DEFAULT_DEPS,
}) {
  const implementationReceipt = inspectEvidence.report.implementationReceipt;
  const candidate = inspectEvidence.implementation.expectedHead;
  const mergeCommit = mergeFinalizeResult.report.mergeCommit;
  const requiredLocator = mergeInspectEvidence.report.requiredRunId
    ? 'run:' + mergeInspectEvidence.report.requiredRunId
      + '/job:' + mergeInspectEvidence.report.requiredJobId
    : mergeFinalizeLocators.reportLocator;
  const requiredGates = alreadyMerged
    ? [
      {name: 'validation-attention-inspect', result: 'PASS',
        evidenceLocator: 'receipt:' + inspectEvidence.receipt.receiptDigest},
      {name: 'implementation-stage-receipt', result: 'PASS',
        evidenceLocator: 'receipt:' + implementationReceipt.receiptDigest},
      {name: 'validation-continuation-already-merged', result: 'PASS',
        evidenceLocator: 'receipt:'
          + inspectEvidence.report.children.continuation.receiptDigest},
      {name: 'validation-merge-finalize', result: 'PASS',
        evidenceLocator: 'receipt:' + mergeFinalizeResult.receipt.receiptDigest},
      {name: 'repo-neutral-coordination', result: 'NOT_APPLICABLE',
        evidenceLocator: 'issue:#' + packetNumber},
    ]
    : [
      {name: 'validation-attention-inspect', result: 'PASS',
        evidenceLocator: 'receipt:' + inspectEvidence.receipt.receiptDigest},
      {name: 'validation-merge-inspect', result: 'PASS',
        evidenceLocator: 'receipt:' + mergeInspectEvidence.receipt.receiptDigest},
      {name: 'validation-merge-finalize', result: 'PASS',
        evidenceLocator: 'receipt:' + mergeFinalizeResult.receipt.receiptDigest},
      {name: 'exact-head-required', result: 'PASS', evidenceLocator: requiredLocator},
      {name: 'repo-neutral-coordination', result: 'NOT_APPLICABLE',
        evidenceLocator: 'issue:#' + packetNumber},
    ];
  return deps.stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber,
    stage: 'VALIDATION_MERGE',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate-head', identity: candidate},
      {kind: 'PR', locator: 'pr:#' + prNumber, identity: candidate},
      {kind: 'COMMIT', locator: 'merge:#' + prNumber, identity: mergeCommit},
    ],
    requiredGates,
    scope: implementationReceipt.scope,
    proof: implementationReceipt.proof,
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
  });
}
function finalizationInput({
  packetNumber, prNumber, candidateHead, mergeCommit,
  implementationReceipt, stage, sourceRefs,
}) {
  const diffIdentity = 'sha256:' + implementationReceipt.scope.diffIdentity;
  const scopeDigest = pathScopeDigest(implementationReceipt.scope.paths);
  return {
    schemaVersion: 1,
    mode: 'VALIDATION_FINALIZATION_EVIDENCE',
    subject: 'issue:#' + packetNumber,
    packetRef: '#' + packetNumber,
    packetState: 'EXACT',
    validationStageState: 'COMPATIBLE',
    expected: {prNumber, candidateHead, diffIdentity, pathScopeDigest: scopeDigest},
    mergeEvidence: {
      state: 'MERGED', prNumber, candidateHead, mergeCommit,
      diffIdentity, pathScopeDigest: scopeDigest,
    },
    validationEvidence: {state: 'PASS', candidateHead, diffIdentity},
    stageReceipt: {
      state: stage.status, packetRef: '#' + packetNumber, prNumber, candidateHead,
      mergeCommit, diffIdentity, pathScopeDigest: scopeDigest,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    },
    coordinationState: 'NOT_APPLICABLE',
    workspaceState: 'NOT_APPLICABLE',
    requiredUnknownState: 'NONE',
    sourceRefs,
  };
}
async function finalizeComposition({
  client, packetNumber, prNumber, root = ROOT, deps = DEFAULT_DEPS,
}) {
  let inspectEvidence;
  try {
    inspectEvidence = readCanonicalInspectEvidence(packetNumber, prNumber, root, deps);
  } catch (error) {
    return aggregateError({
      operation: 'finalize', packetNumber, prNumber, error,
      nextLegalAction: 'VALIDATION_ATTENTION_INSPECT_REQUIRED', deps,
    });
  }
  const alreadyMerged = inspectEvidence.report.route === 'ALREADY_MERGED';
  if (!alreadyMerged && inspectEvidence.report.route !== 'MERGE_ADMISSION_READY') {
    return aggregateError({
      operation: 'finalize', packetNumber, prNumber,
      candidateHead: inspectEvidence.implementation.expectedHead,
      paths: inspectEvidence.implementation.paths,
      error: new ValidationAttentionError(
        'BLOCKED', ['ATTENTION_INSPECT_NOT_MERGE_ADMISSION_READY'],
        'receipt:' + inspectEvidence.receipt.receiptDigest),
      nextLegalAction: inspectEvidence.receipt.nextLegalAction, deps,
    });
  }

  let packet = null;
  let mergeInspectEvidence;
  if (alreadyMerged) {
    try {
      packet = await deps.validationMerge.readPacket(client, packetNumber);
      mergeInspectEvidence = alreadyMergedFinalizeEvidence({
        packetNumber, prNumber, inspectEvidence, packet,
      });
    } catch (error) {
      return aggregateError({
        operation: 'finalize', packetNumber, prNumber,
        candidateHead: inspectEvidence.implementation.expectedHead,
        paths: inspectEvidence.implementation.paths,
        error: error instanceof ValidationAttentionError ? error
          : new ValidationAttentionError(
            error?.kind || 'UNKNOWN',
            error?.reasonCodes || ['ALREADY_MERGED_FINALIZE_EVIDENCE_REQUIRED'],
            error?.locator || 'issue:#' + packetNumber),
        nextLegalAction: inspectEvidence.receipt.nextLegalAction, deps,
      });
    }
  } else {
    try {
      mergeInspectEvidence = deps.validationMerge.readCanonicalInspectEvidence(
        packetNumber, prNumber, root);
    } catch (error) {
      return aggregateError({
        operation: 'finalize', packetNumber, prNumber,
        candidateHead: inspectEvidence.implementation.expectedHead,
        paths: inspectEvidence.implementation.paths,
        error: new ValidationAttentionError(
          error?.kind || 'UNKNOWN',
          error?.reasonCodes || ['MERGE_INSPECT_EVIDENCE_REQUIRED'],
          error?.locator || 'local-artifact:validation-merge-inspect'),
        nextLegalAction: 'VALIDATION_MERGE_INSPECT_REQUIRED', deps,
      });
    }
    if (inspectEvidence.report.children?.mergeAdmission?.receiptDigest
        !== mergeInspectEvidence.receipt.receiptDigest) {
      return aggregateError({
        operation: 'finalize', packetNumber, prNumber,
        candidateHead: inspectEvidence.implementation.expectedHead,
        paths: inspectEvidence.implementation.paths,
        error: new ValidationAttentionError(
          'CONFLICT', ['MERGE_INSPECT_CHILD_IDENTITY_CONFLICT'],
          inspectEvidence.report.children?.mergeAdmission?.reportLocator || 'UNKNOWN'),
        deps,
      });
    }
  }

  const mergeFinalizeResult = await deps.validationMerge.finalizeWithClient({
    client, packetNumber, prNumber, inspectEvidence: mergeInspectEvidence,
  });
  const mergeFinalizeLocators = persistChild(
    deps.validationMerge, mergeFinalizeResult, packetNumber, prNumber, root, 'finalize');
  if (mergeFinalizeResult.receipt.result !== 'PASS'
      || mergeFinalizeResult.receipt.nextLegalAction !== 'POSTMERGE_CONVERGENCE') {
    const child = mergeFinalizeResult.receipt;
    const attention = [attentionItem(
      child, mergeFinalizeLocators.reportLocator,
      'VALIDATION_MERGE_FINALIZE_ATTENTION', child.nextLegalAction)];
    const receipt = compositionReceipt({
      operation: 'finalize', packetNumber, prNumber,
      candidateHead: inspectEvidence.implementation.expectedHead,
      paths: inspectEvidence.implementation.paths,
      steps: [{name: 'validation-merge-finalize', result: child.result,
        evidenceLocator: mergeFinalizeLocators.reportLocator}],
      result: child.result, attentionDisposition: child.attentionDisposition,
      reasonCodes: child.reasonCodes,
      unknowns: child.result === 'UNKNOWN' ? child.reasonCodes : [],
      conflicts: child.result === 'CONFLICT' ? child.reasonCodes : [],
      blockers: child.result === 'BLOCKED' ? child.reasonCodes : [],
      nextLegalAction: child.nextLegalAction,
      artifacts: [mergeFinalizeLocators.receiptLocator, mergeFinalizeLocators.reportLocator],
      attentionCount: attention.length, deps,
    });
    return {
      receipt,
      report: {
        schemaVersion: 1, mode: 'VALIDATION_ATTENTION_REPORT', operation: 'finalize',
        packetNumber, prNumber, route: 'MERGE_FINALIZE_BLOCKED',
        candidateHead: inspectEvidence.implementation.expectedHead,
        children: {mergeFinalize: {
          receiptDigest: child.receiptDigest,
          receiptLocator: mergeFinalizeLocators.receiptLocator,
          reportLocator: mergeFinalizeLocators.reportLocator,
        }},
        result: receipt.result, reasonCodes: receipt.reasonCodes, attention,
        output: {pr: '#' + prNumber, mergeAdmission: 'UNKNOWN', finalization: 'UNKNOWN'},
        receiptDigest: receipt.receiptDigest,
      },
    };
  }

  if (!packet) packet = await deps.validationMerge.readPacket(client, packetNumber);
  if (!repoNeutralPacket(packet)) {
    return aggregateError({
      operation: 'finalize', packetNumber, prNumber,
      candidateHead: inspectEvidence.implementation.expectedHead,
      paths: inspectEvidence.implementation.paths,
      error: new ValidationAttentionError(
        'BLOCKED', ['REPO_NEUTRAL_FINALIZATION_SCOPE_REQUIRED'], 'issue:#' + packetNumber),
      nextLegalAction: 'EXISTING_COORDINATION_FINALIZATION_OWNER_REQUIRED', deps,
    });
  }

  const stage = buildValidationStageReceipt({
    packetNumber, prNumber, inspectEvidence, mergeInspectEvidence,
    mergeFinalizeResult, mergeFinalizeLocators, alreadyMerged, deps,
  });
  if (stage.status !== 'PASS') {
    const reasons = stage.reasonCodes?.length ? stage.reasonCodes : ['DERIVED_STAGE_RECEIPT_NOT_PASS'];
    return aggregateError({
      operation: 'finalize', packetNumber, prNumber,
      candidateHead: inspectEvidence.implementation.expectedHead,
      paths: inspectEvidence.implementation.paths,
      error: new ValidationAttentionError(
        stage.status === 'CONFLICT' ? 'CONFLICT'
          : stage.status === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN',
        reasons, 'receipt:' + (stage.receiptDigest || 'UNKNOWN')),
      deps,
    });
  }

  const mergeCommit = mergeFinalizeResult.report.mergeCommit;
  const mergeAdmission = alreadyMerged ? 'ALREADY_MERGED' : 'COMPLETE';
  const finalDecision = deps.finalization.projectValidationFinalization(finalizationInput({
    packetNumber, prNumber,
    candidateHead: inspectEvidence.implementation.expectedHead,
    mergeCommit,
    implementationReceipt: inspectEvidence.report.implementationReceipt,
    stage,
    sourceRefs: [
      'issue:#' + packetNumber,
      'pr:#' + prNumber,
      'receipt:' + stage.receiptDigest,
      'receipt:' + mergeFinalizeResult.receipt.receiptDigest,
    ],
  }));
  if (finalDecision.finalizationDisposition !== 'ALREADY_FINALIZED'
      || finalDecision.result !== 'PASS'
      || finalDecision.attentionDisposition !== 'COMPLETE') {
    const reason = finalDecision.reasonCode || 'VALIDATION_FINALIZATION_ATTENTION';
    const attention = [{
      subject: 'repo:validation-finalization',
      reasonCode: reason,
      severity: finalDecision.result === 'CONFLICT' ? 'CONFLICT'
        : finalDecision.result === 'UNKNOWN' ? 'UNKNOWN'
          : finalDecision.result === 'BLOCKED' ? 'BLOCKER' : 'WARN',
      constraint: 'VALIDATION_FINALIZATION_ATTENTION',
      nextPhase: finalDecision.nextLegalAction,
      locator: 'receipt:' + stage.receiptDigest,
    }];
    const result = finalDecision.result === 'PASS' ? 'PARTIAL' : finalDecision.result;
    const disposition = finalDecision.attentionDisposition === 'ACTION_REQUIRED'
      ? 'NEEDS_REVIEW' : finalDecision.attentionDisposition;
    const receipt = compositionReceipt({
      operation: 'finalize', packetNumber, prNumber,
      candidateHead: inspectEvidence.implementation.expectedHead,
      paths: inspectEvidence.implementation.paths,
      steps: [
        {name: 'validation-merge-finalize', result: 'PASS',
          evidenceLocator: mergeFinalizeLocators.reportLocator},
        {name: 'canonical-validation-merge-receipt', result: 'PASS',
          evidenceLocator: 'receipt:' + stage.receiptDigest},
        {name: 'validation-finalization', result,
          evidenceLocator: 'receipt:' + stage.receiptDigest},
      ],
      result, attentionDisposition: disposition, reasonCodes: [reason],
      unknowns: result === 'UNKNOWN' ? [reason] : [],
      conflicts: result === 'CONFLICT' ? [reason] : [],
      blockers: result === 'BLOCKED' ? [reason] : [],
      nextLegalAction: finalDecision.nextLegalAction,
      artifacts: [
        mergeFinalizeLocators.receiptLocator, mergeFinalizeLocators.reportLocator,
        'receipt:' + stage.receiptDigest,
      ],
      attentionCount: attention.length, deps,
    });
    return {
      receipt,
      report: {
        schemaVersion: 1, mode: 'VALIDATION_ATTENTION_REPORT', operation: 'finalize',
        packetNumber, prNumber, route: 'FINALIZATION_ATTENTION',
        candidateHead: inspectEvidence.implementation.expectedHead,
        stageReceipt: stage, finalizationDecision: finalDecision,
        result: receipt.result, reasonCodes: receipt.reasonCodes, attention,
        output: {pr: '#' + prNumber, mergeAdmission,
          finalization: finalDecision.finalizationDisposition},
        receiptDigest: receipt.receiptDigest,
      },
    };
  }

  const output = {
    candidateHead: inspectEvidence.implementation.expectedHead,
    finalization: 'ALREADY_FINALIZED',
    mergeAdmission,
    mergeCommit,
    stageReceipt: 'PASS',
  };
  const receipt = compositionReceipt({
    operation: 'finalize', packetNumber, prNumber,
    candidateHead: inspectEvidence.implementation.expectedHead,
    paths: inspectEvidence.implementation.paths,
    steps: [
      {name: 'validation-merge-finalize', result: 'PASS',
        evidenceLocator: mergeFinalizeLocators.reportLocator},
      {name: 'canonical-validation-merge-receipt', result: 'PASS',
        evidenceLocator: 'receipt:' + stage.receiptDigest},
      {name: 'validation-finalization', result: 'PASS',
        evidenceLocator: 'receipt:' + finalDecision.evidenceDigest},
    ],
    result: 'PASS', attentionDisposition: 'COMPLETE',
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
    artifacts: [
      mergeFinalizeLocators.receiptLocator, mergeFinalizeLocators.reportLocator,
      'receipt:' + stage.receiptDigest,
      'receipt:' + finalDecision.evidenceDigest,
    ],
    attentionCount: 0, deps,
  });
  return {
    receipt,
    report: {
      schemaVersion: 1, mode: 'VALIDATION_ATTENTION_REPORT', operation: 'finalize',
      packetNumber, prNumber, route: 'ALREADY_FINALIZED',
      candidateHead: inspectEvidence.implementation.expectedHead,
      implementationReceipt: inspectEvidence.report.implementationReceipt,
      children: {mergeFinalize: {
        receiptDigest: mergeFinalizeResult.receipt.receiptDigest,
        receiptLocator: mergeFinalizeLocators.receiptLocator,
        reportLocator: mergeFinalizeLocators.reportLocator,
      }},
      stageReceipt: stage, finalizationDecision: finalDecision,
      semanticSurfaceBudget: 3, targetedDrilldowns: 0, rawTranscriptExposed: 0,
      result: receipt.result, reasonCodes: [], attention: [],
      output: {pr: '#' + prNumber, ...output},
      receiptDigest: receipt.receiptDigest,
    },
  };
}

function parseNumber(value, field) {
  const text = String(value || '').replace(/^#/, '');
  if (!/^[1-9][0-9]*$/.test(text)) throw new Error(field + '_INVALID');
  return Number(text);
}
function parseArgs(argv = process.argv.slice(2)) {
  if (!['inspect', 'finalize'].includes(argv[0])) throw new Error('COMMAND_INVALID');
  const command = argv[0];
  const allowed = new Set(['packet', 'pr', 'implementation-receipt-file', 'format']);
  const values = {};
  for (let index = 1; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith('--') || value === undefined) throw new Error('ARGUMENT_INVALID');
    const key = token.slice(2);
    if (!allowed.has(key) || key in values) throw new Error('ARGUMENT_INVALID');
    values[key] = value;
  }
  const packetNumber = parseNumber(values.packet, 'PACKET');
  const prNumber = parseNumber(values.pr, 'PR');
  const format = values.format || 'agent-view';
  if (!['agent-view', 'receipt'].includes(format)) throw new Error('FORMAT_INVALID');
  if (command === 'inspect' && !values['implementation-receipt-file']) {
    throw new Error('IMPLEMENTATION_RECEIPT_REQUIRED');
  }
  if (command === 'finalize' && values['implementation-receipt-file']) {
    throw new Error('ARGUMENT_INVALID');
  }
  return {command, packetNumber, prNumber,
    implementationReceiptFile: values['implementation-receipt-file'] || null, format};
}
async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const deps = options.deps || DEFAULT_DEPS;
  const client = options.client || deps.validationMerge.createLiveClient(options);
  let result;
  if (args.command === 'inspect') {
    const implementationReceipt = readRegularJson(args.implementationReceiptFile);
    result = await inspectComposition({
      client, packetNumber: args.packetNumber, prNumber: args.prNumber,
      implementationReceipt, root: options.root || ROOT, deps,
    });
  } else {
    result = await finalizeComposition({
      client, packetNumber: args.packetNumber, prNumber: args.prNumber,
      root: options.root || ROOT, deps,
    });
  }
  let locators;
  try {
    locators = persistResult(
      result, args.packetNumber, args.prNumber, args.command, options.root || ROOT, deps);
  } catch (error) {
    result = aggregateError({
      operation: args.command, packetNumber: args.packetNumber, prNumber: args.prNumber,
      error: error instanceof ValidationAttentionError ? error
        : new ValidationAttentionError('UNKNOWN', ['ATTENTION_SIDECAR_WRITE_FAILED']),
      deps,
    });
    if (args.format === 'receipt') {
      return {text: JSON.stringify(canonicalize(result.receipt), null, 2) + '\n',
        code: deps.executionReceipt.exitCodeFor(result.receipt)};
    }
    const invalidView = deps.agentDecisionView.projectAgentDecisionView({
      receipt: result.receipt, phase: 'VALIDATION_MERGE',
      output: result.report.output || {}, attention: result.report.attention || [],
      receiptLocator: '', reportLocator: '',
    });
    return {text: JSON.stringify(canonicalize(invalidView), null, 2) + '\n',
      code: deps.agentDecisionView.exitCodeFor(invalidView)};
  }
  if (args.format === 'receipt') {
    return {text: JSON.stringify(canonicalize(result.receipt), null, 2) + '\n',
      code: deps.executionReceipt.exitCodeFor(result.receipt)};
  }
  const view = projectView(result, locators, deps);
  return {text: JSON.stringify(canonicalize(view), null, 2) + '\n',
    code: deps.agentDecisionView.exitCodeFor(view)};
}

if (require.main === module) {
  runCli().then(({text, code}) => {
    process.stdout.write(text);
    process.exitCode = code;
  }).catch(() => {
    process.stdout.write(JSON.stringify({
      schemaVersion: 1, mode: 'REPOSITORY_AGENT_DECISION_VIEW',
      validity: 'INVALID', phase: 'UNKNOWN', executionLifecycle: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN', result: 'UNKNOWN', reasonCodes: ['RUNTIME_ERROR'],
    }) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  DEFAULT_DEPS,
  MAX_INPUT_BYTES,
  MAX_REPORT_BYTES,
  ValidationAttentionError,
  aggregateError,
  alreadyMergedFinalizeEvidence,
  buildValidationStageReceipt,
  compositionReceipt,
  continuationRouting,
  finalizationInput,
  finalizeComposition,
  inspectComposition,
  parseArgs,
  pathScopeDigest,
  persistResult,
  projectView,
  readCanonicalInspectEvidence,
  repoNeutralPacket,
  runCli,
};
