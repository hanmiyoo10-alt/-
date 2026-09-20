import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const inventoryPath = path.join(here, 'legacy-candidates.json');
const data = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const errors = [];

function fail(message) {
  errors.push(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

if (data.schema_version !== 1) fail('schema_version must be 1');
if (data.posture !== 'locator-only') fail('posture must be locator-only');

for (const field of [
  'target_materialization_authorized',
  'authority_reassignment_authorized',
  'source_move_authorized'
]) {
  if (data[field] !== false) fail(`${field} must be false`);
}

const allowedEcosystems = new Set(['risu', 'standalone']);
const allowedKinds = new Set(['app', 'api', 'hybrid']);
const allowedStates = new Set(['legacy-evidence']);
const allowedAuthority = new Set(['UNKNOWN', 'UNASSIGNED']);
const ids = new Set();

if (!Array.isArray(data.candidates) || data.candidates.length === 0) {
  fail('candidates must contain at least one legacy candidate');
}

for (const [index, candidate] of (data.candidates || []).entries()) {
  const trail = `candidates[${index}]`;

  if (!candidate.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate.id)) {
    fail(`${trail}.id invalid`);
  } else if (ids.has(candidate.id)) {
    fail(`${trail}.id duplicate: ${candidate.id}`);
  } else {
    ids.add(candidate.id);
  }

  if (typeof candidate.display_name !== 'string' || !candidate.display_name.trim()) {
    fail(`${trail}.display_name missing`);
  }
  if (!allowedEcosystems.has(candidate.proposed_ecosystem)) {
    fail(`${trail}.proposed_ecosystem invalid`);
  }
  if (!allowedKinds.has(candidate.proposed_kind)) {
    fail(`${trail}.proposed_kind invalid`);
  }
  if (!allowedStates.has(candidate.candidate_state)) {
    fail(`${trail}.candidate_state invalid`);
  }
  if (!allowedAuthority.has(candidate.repository_authority_status)) {
    fail(`${trail}.repository_authority_status must preserve UNKNOWN/UNASSIGNED`);
  }
  if (candidate.materialized !== false) {
    fail(`${trail}.materialized must remain false in legacy candidate inventory`);
  }
  if (candidate.migration_authorized !== false) {
    fail(`${trail}.migration_authorized must remain false in legacy candidate inventory`);
  }

  const expectedRoot = `products/app-api-mod-lab/targets/${candidate.proposed_ecosystem}/${candidate.id}`;
  if (candidate.proposed_target_root !== expectedRoot) {
    fail(`${trail}.proposed_target_root must equal ${expectedRoot}`);
  }

  const targetFsPath = path.resolve(here, 'targets', candidate.proposed_ecosystem, candidate.id);
  if (fs.existsSync(targetFsPath)) {
    fail(`${trail}: target root already exists while candidate remains non-materialized`);
  }

  if (!Array.isArray(candidate.evidence_locators) || candidate.evidence_locators.length === 0) {
    fail(`${trail}.evidence_locators missing`);
    continue;
  }

  for (const [locatorIndex, locator] of candidate.evidence_locators.entries()) {
    const locatorTrail = `${trail}.evidence_locators[${locatorIndex}]`;
    if (!isObject(locator)) {
      fail(`${locatorTrail} must be an object`);
      continue;
    }

    if (locator.type === 'issue') {
      if (!Number.isInteger(locator.number) || locator.number <= 0) {
        fail(`${locatorTrail}.number invalid`);
      }
    } else if (locator.type === 'branch_path') {
      if (typeof locator.branch !== 'string' || !locator.branch.trim()) {
        fail(`${locatorTrail}.branch missing`);
      }
      if (
        typeof locator.path !== 'string' ||
        !locator.path.trim() ||
        locator.path.startsWith('/') ||
        locator.path.includes('..')
      ) {
        fail(`${locatorTrail}.path invalid`);
      }
    } else {
      fail(`${locatorTrail}.type invalid`);
    }

    if (typeof locator.note !== 'string' || !locator.note.trim()) {
      fail(`${locatorTrail}.note missing`);
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(`APP_API_MOD_LAB_LEGACY_CANDIDATES:FAIL:${error}`);
  process.exit(1);
}

console.log(`APP_API_MOD_LAB_LEGACY_CANDIDATES:OK:candidates=${data.candidates.length}:materialized=0`);
