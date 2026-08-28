export const CLEAN_RELEASE_WORK_ITEM_STATES = Object.freeze({
  PRE_LIVE: 'PRE_LIVE_OR_PUBLICATION_PENDING',
  LIVE_PENDING: 'LIVE_PENDING_AWAITING_TERMINAL_EVIDENCE',
  TERMINAL_EVIDENCE_ACCEPTED: 'TERMINAL_EVIDENCE_ACCEPTED_AWAITING_PR3',
  PR3_MERGED: 'PR3_MERGED_AWAITING_REOBSERVATION',
  TERMINAL_REOBSERVED: 'TERMINAL_REOBSERVED_CLOSE_ELIGIBLE',
});

export const CLEAN_RELEASE_TERMINAL_DISPOSITIONS = Object.freeze([
  'LIVE_PASS',
  'CANCELLED',
  'ROLLED_BACK',
  'SUPERSEDED',
  'LIVE_FAIL_HANDOFF_TO_NEW_RELEASE',
]);

const HUMAN_EVIDENCE_DISPOSITIONS = new Set([
  'LIVE_PASS',
  'LIVE_FAIL_HANDOFF_TO_NEW_RELEASE',
]);

function bool(value) {
  return value === true;
}

function terminalDisposition(value) {
  return CLEAN_RELEASE_TERMINAL_DISPOSITIONS.includes(value) ? value : null;
}

export function releaseWorkItemOpenThroughText() {
  return 'This work item remains open through implementation, candidate qualification, exact approval, permanent publication, production reobservation, LIVE_PENDING, and the required HUMAN_EVIDENCE / PR3 terminal disposition.';
}

function requiredTerminalEvidence(disposition) {
  const required = [];
  if (disposition === 'LIVE_PASS') required.push('livePendingConverged');
  if (HUMAN_EVIDENCE_DISPOSITIONS.has(disposition)) required.push('humanEvidenceAccepted');
  else required.push('durableTerminalEvidence');
  required.push(
    'terminalClosurePrMerged',
    'mainTerminalStateReobserved',
    'productionIdentityReobserved',
    'workItemClosureEvidenceRefPresent',
  );
  return required;
}

function stateBeforeClosure(input, disposition, missingEvidence) {
  if (!disposition) {
    return bool(input.livePendingConverged)
      ? CLEAN_RELEASE_WORK_ITEM_STATES.LIVE_PENDING
      : CLEAN_RELEASE_WORK_ITEM_STATES.PRE_LIVE;
  }

  const evidenceKey = HUMAN_EVIDENCE_DISPOSITIONS.has(disposition)
    ? 'humanEvidenceAccepted'
    : 'durableTerminalEvidence';

  if (missingEvidence.includes(evidenceKey) || missingEvidence.includes('livePendingConverged')) {
    return bool(input.livePendingConverged)
      ? CLEAN_RELEASE_WORK_ITEM_STATES.LIVE_PENDING
      : CLEAN_RELEASE_WORK_ITEM_STATES.PRE_LIVE;
  }
  if (missingEvidence.includes('terminalClosurePrMerged')) {
    return CLEAN_RELEASE_WORK_ITEM_STATES.TERMINAL_EVIDENCE_ACCEPTED;
  }
  return CLEAN_RELEASE_WORK_ITEM_STATES.PR3_MERGED;
}

export function evaluateCleanReleaseWorkItemClosure(input = {}) {
  const disposition = terminalDisposition(input.terminalDisposition);

  if (!disposition) {
    return Object.freeze({
      state: bool(input.livePendingConverged)
        ? CLEAN_RELEASE_WORK_ITEM_STATES.LIVE_PENDING
        : CLEAN_RELEASE_WORK_ITEM_STATES.PRE_LIVE,
      closeEligible: false,
      terminalDisposition: null,
      missingEvidence: ['terminalDisposition'],
      labelAuthorityUsed: false,
    });
  }

  const required = requiredTerminalEvidence(disposition);
  const missingEvidence = required.filter((key) => !bool(input[key]));
  if (missingEvidence.length) {
    return Object.freeze({
      state: stateBeforeClosure(input, disposition, missingEvidence),
      closeEligible: false,
      terminalDisposition: disposition,
      missingEvidence,
      labelAuthorityUsed: false,
    });
  }

  return Object.freeze({
    state: CLEAN_RELEASE_WORK_ITEM_STATES.TERMINAL_REOBSERVED,
    closeEligible: true,
    terminalDisposition: disposition,
    missingEvidence: [],
    labelAuthorityUsed: false,
  });
}

export function assertCleanReleaseWorkItemClosureTruth(input = {}) {
  const decision = evaluateCleanReleaseWorkItemClosure(input);
  if (bool(input.issueClosed) && !decision.closeEligible) {
    const error = new Error(`clean release work item closed before terminal evidence: ${decision.state}`);
    error.code = 'CLEAN_RELEASE_WORK_ITEM_PREMATURE_CLOSURE';
    error.decision = decision;
    throw error;
  }
  return decision;
}
