export const RELEASE_BLOCKER_INCIDENT_STATES = Object.freeze({
  BLOCKER_ACTIVE: 'BLOCKER_ACTIVE',
  RECOVERY_PENDING: 'DEFECT_FIXED_RELEASE_RECOVERY_PENDING',
  RECOVERED: 'RECOVERED_PRODUCTION_REOBSERVED',
  TERMINATED: 'TERMINATED_EXPLICIT',
});

export const REQUIRED_RECOVERY_EVIDENCE = Object.freeze([
  'recoveryAppendOnlyPreserved',
  'exactCandidateApprovalVerified',
  'permanentReleaseSucceeded',
  'productionCommitReobserved',
  'latestInstallEqualReobserved',
  'livePendingStateConverged',
]);

export const TERMINAL_DISPOSITIONS = Object.freeze([
  'CANCELLED',
  'ROLLED_BACK',
]);

function bool(value) {
  return value === true;
}

export function repairPrReferenceVerb() {
  return 'Refs';
}

export function evaluateReleaseBlockerIncident(input = {}) {
  const defectFixed = bool(input.defectFixed);
  const terminalDisposition = TERMINAL_DISPOSITIONS.includes(input.terminalDisposition)
    ? input.terminalDisposition
    : null;

  if (terminalDisposition) {
    if (bool(input.durableTerminalEvidence)) {
      return Object.freeze({
        state: RELEASE_BLOCKER_INCIDENT_STATES.TERMINATED,
        closeEligible: true,
        repairPrReferenceVerb: repairPrReferenceVerb(),
        terminalDisposition,
        missingEvidence: [],
      });
    }
    return Object.freeze({
      state: defectFixed
        ? RELEASE_BLOCKER_INCIDENT_STATES.RECOVERY_PENDING
        : RELEASE_BLOCKER_INCIDENT_STATES.BLOCKER_ACTIVE,
      closeEligible: false,
      repairPrReferenceVerb: repairPrReferenceVerb(),
      terminalDisposition,
      missingEvidence: ['durableTerminalEvidence'],
    });
  }

  if (!defectFixed) {
    return Object.freeze({
      state: RELEASE_BLOCKER_INCIDENT_STATES.BLOCKER_ACTIVE,
      closeEligible: false,
      repairPrReferenceVerb: repairPrReferenceVerb(),
      terminalDisposition: null,
      missingEvidence: ['defectFixed'],
    });
  }

  const missingEvidence = REQUIRED_RECOVERY_EVIDENCE.filter((key) => !bool(input[key]));
  if (missingEvidence.length) {
    return Object.freeze({
      state: RELEASE_BLOCKER_INCIDENT_STATES.RECOVERY_PENDING,
      closeEligible: false,
      repairPrReferenceVerb: repairPrReferenceVerb(),
      terminalDisposition: null,
      missingEvidence,
    });
  }

  return Object.freeze({
    state: RELEASE_BLOCKER_INCIDENT_STATES.RECOVERED,
    closeEligible: true,
    repairPrReferenceVerb: repairPrReferenceVerb(),
    terminalDisposition: null,
    missingEvidence: [],
  });
}

export function assertIncidentClosureTruth(input = {}) {
  const decision = evaluateReleaseBlockerIncident(input);
  if (bool(input.issueClosed) && !decision.closeEligible) {
    const error = new Error(`release blocker closed before terminal evidence: ${decision.state}`);
    error.code = 'RELEASE_BLOCKER_PREMATURE_CLOSURE';
    error.decision = decision;
    throw error;
  }
  return decision;
}
