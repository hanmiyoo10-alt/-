import {
  R2_10_REQUIRED_CONTRACTS,
  createValidationContext,
  loadExactValidationProfileForSource,
} from '../../tooling/validation-context-r2-10.mjs';
import { runProjectedValidationContract } from './release-validation-contracts-r2-9.mjs';

const REQUIRED_CONTRACTS = R2_10_REQUIRED_CONTRACTS;

function activeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function loadActiveValidationProfile(source) {
  try {
    return loadExactValidationProfileForSource(source, { requiredContracts: REQUIRED_CONTRACTS });
  } catch (error) {
    if (error?.code === 'VALIDATION_CONTEXT_SOURCE_VERSION_INVALID') {
      throw activeError('VALIDATION_ACTIVE_SOURCE_VERSION_INVALID', error.message);
    }
    if (error?.code === 'VALIDATION_CONTEXT_PROFILE_MISSING') {
      throw activeError('VALIDATION_ACTIVE_PROFILE_MISSING', error.message);
    }
    if (error?.code === 'VALIDATION_CONTEXT_PROFILE_INVALID') {
      throw activeError('VALIDATION_ACTIVE_PROFILE_INVALID', error.message);
    }
    throw error;
  }
}

export function buildActiveValidationContext(contractId, ctx) {
  if (!REQUIRED_CONTRACTS.includes(contractId)) {
    throw activeError('VALIDATION_ACTIVE_CONTRACT_UNSUPPORTED', `unsupported active contract: ${contractId}`);
  }
  return createValidationContext({
    source: ctx?.source,
    contractId,
    outerContext: ctx,
    validationAuthorityOverrides: ctx?.validationAuthorityOverrides || null,
  });
}

export async function runActiveProjectedValidationContract(contractId, ctx) {
  const coherentContext = buildActiveValidationContext(contractId, ctx);
  return runProjectedValidationContract(contractId, coherentContext, coherentContext.profile);
}

export async function runSuite(ctx) {
  const contractIds = [...new Set((ctx.fixtures || []).map((fixture) => fixture?.suite).filter(Boolean))];
  if (contractIds.length !== 1) {
    throw activeError('VALIDATION_ACTIVE_FIXTURE_CONTRACT_AMBIGUOUS', `expected one active contract fixture identity, found ${contractIds.length}`);
  }
  return runActiveProjectedValidationContract(contractIds[0], ctx);
}
