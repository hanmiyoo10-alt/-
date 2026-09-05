import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateValidationProfile } from './validation-contract-profile.mjs';

const EXACT_PROFILE_FILENAME_RE = /^(\d+\.\d+\.\d+)\.json$/;

function inventoryError(code, message, causeCode = null) {
  const error = new Error(message);
  error.code = code;
  if (causeCode) error.causeCode = causeCode;
  return error;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function semverParts(version) {
  return String(version).split('.').map((part) => Number(part));
}

function compareSemver(a, b) {
  const left = semverParts(a);
  const right = semverParts(b);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function defaultProfilesDirectory() {
  return fileURLToPath(new URL('../releases/validation-profiles/', import.meta.url));
}

function parseEntryProfile(entry) {
  if (entry && Object.prototype.hasOwnProperty.call(entry, 'profile')) return clone(entry.profile);
  const raw = entry?.content;
  if (typeof raw !== 'string') {
    throw inventoryError(
      'VALIDATION_INVENTORY_PROFILE_PARSE_FAIL',
      `validation profile ${entry?.filename || '<missing>'} has no readable JSON content`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw inventoryError(
      'VALIDATION_INVENTORY_PROFILE_PARSE_FAIL',
      `validation profile ${entry?.filename || '<missing>'} JSON parse failed: ${error?.message || error}`,
    );
  }
}

export function buildValidationProfileInventoryFromEntries(entries, { requiredContracts = [] } = {}) {
  const jsonEntries = (Array.isArray(entries) ? entries : [])
    .filter((entry) => String(entry?.filename || '').endsWith('.json'));

  if (!jsonEntries.length) {
    throw inventoryError('VALIDATION_INVENTORY_EMPTY', 'validation profile inventory is empty');
  }

  const profilesByVersion = Object.create(null);
  const identitiesByVersion = Object.create(null);
  const seenVersions = new Set();

  for (const entry of jsonEntries) {
    const filename = String(entry?.filename || '');
    const match = filename.match(EXACT_PROFILE_FILENAME_RE);
    if (!match) {
      throw inventoryError(
        'VALIDATION_INVENTORY_FILENAME_INVALID',
        `validation profile filename must be exact semver JSON: ${filename || '<missing>'}`,
      );
    }

    const filenameVersion = match[1];
    const rawProfile = parseEntryProfile(entry);
    let profile;
    try {
      profile = validateValidationProfile(rawProfile, { requiredContracts });
    } catch (error) {
      if (error?.code === 'VALIDATION_PROFILE_IDENTITY_INVALID') {
        throw inventoryError(
          'VALIDATION_INVENTORY_RELEASE_NAME_INVALID',
          `validation profile ${filename} has invalid releaseName`,
          error.code,
        );
      }
      throw inventoryError(
        'VALIDATION_INVENTORY_PROFILE_INVALID',
        `validation profile ${filename} is invalid: ${error?.message || error}`,
        error?.code || null,
      );
    }

    if (profile.releaseVersion !== filenameVersion) {
      throw inventoryError(
        'VALIDATION_INVENTORY_VERSION_MISMATCH',
        `validation profile ${filename} declares releaseVersion ${profile.releaseVersion}`,
      );
    }
    if (seenVersions.has(profile.releaseVersion)) {
      throw inventoryError(
        'VALIDATION_INVENTORY_DUPLICATE_VERSION',
        `duplicate validation profile releaseVersion: ${profile.releaseVersion}`,
      );
    }
    seenVersions.add(profile.releaseVersion);

    profilesByVersion[profile.releaseVersion] = Object.freeze(clone(profile));
    identitiesByVersion[profile.releaseVersion] = Object.freeze({
      releaseVersion: profile.releaseVersion,
      releaseName: profile.releaseName,
    });
  }

  const versions = Object.freeze([...seenVersions].sort(compareSemver));
  const orderedProfiles = Object.create(null);
  const orderedIdentities = Object.create(null);
  for (const version of versions) {
    orderedProfiles[version] = profilesByVersion[version];
    orderedIdentities[version] = identitiesByVersion[version];
  }

  return Object.freeze({
    versions,
    profilesByVersion: Object.freeze(orderedProfiles),
    identitiesByVersion: Object.freeze(orderedIdentities),
    provenance: Object.freeze({
      owner: 'R2.11_PROFILE_DRIVEN_VALIDATION_INVENTORY',
      exactProfilesOnly: true,
      inferredProfiles: false,
    }),
  });
}

export function buildValidationProfileInventory({
  directory = defaultProfilesDirectory(),
  requiredContracts = [],
} = {}) {
  let names;
  try {
    names = fs.readdirSync(directory).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    throw inventoryError(
      'VALIDATION_INVENTORY_EMPTY',
      `validation profile directory is unavailable: ${error?.message || error}`,
    );
  }

  const entries = names
    .filter((name) => name.endsWith('.json'))
    .map((filename) => ({
      filename,
      content: fs.readFileSync(path.join(directory, filename), 'utf8'),
    }));

  return buildValidationProfileInventoryFromEntries(entries, { requiredContracts });
}
