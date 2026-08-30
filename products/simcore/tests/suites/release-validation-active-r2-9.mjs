import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  extractSourceReleaseVersion,
  validateValidationProfile,
} from '../../tooling/validation-contract-profile.mjs';
import { runProjectedValidationContract } from './release-validation-contracts-r2-9.mjs';

const REQUIRED_CONTRACTS = Object.freeze([
  'reload-cache-continuity',
  'operator-release-card',
  'host-local-telemetry',
  'bounded-telemetry-capsule',
]);

function activeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function loadActiveValidationProfile(source) {
  const version = extractSourceReleaseVersion(source);
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw activeError('VALIDATION_ACTIVE_SOURCE_VERSION_INVALID', `source version is not an exact semantic version: ${version || '<missing>'}`);
  }

  const profileUrl = new URL(`../../releases/validation-profiles/${version}.json`, import.meta.url);
  const profilePath = fileURLToPath(profileUrl);
  if (!fs.existsSync(profilePath)) {
    throw activeError('VALIDATION_ACTIVE_PROFILE_MISSING', `no exact validation profile for source version ${version}`);
  }

  let profile;
  try {
    profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  } catch (error) {
    throw activeError('VALIDATION_ACTIVE_PROFILE_INVALID', `cannot read validation profile ${version}: ${error?.message || error}`);
  }

  return validateValidationProfile(profile, { requiredContracts: REQUIRED_CONTRACTS });
}

export async function runActiveProjectedValidationContract(contractId, ctx) {
  if (!REQUIRED_CONTRACTS.includes(contractId)) {
    throw activeError('VALIDATION_ACTIVE_CONTRACT_UNSUPPORTED', `unsupported active contract: ${contractId}`);
  }
  const profile = loadActiveValidationProfile(ctx.source);
  return runProjectedValidationContract(contractId, ctx, profile);
}
