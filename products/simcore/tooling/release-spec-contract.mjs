import fs from 'node:fs';

const schemaUrl = new URL('../releases/release-schema-v1.json', import.meta.url);
const schema = JSON.parse(fs.readFileSync(schemaUrl, 'utf8'));
const properties = schema?.properties || {};

function values(name) {
  const rows = properties?.[name]?.enum;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`RELEASE_SPEC_SCHEMA_ENUM_MISSING:${name}`);
  return Object.freeze([...rows]);
}
function bounds(name) {
  const node = properties?.[name] || {};
  return Object.freeze({ min: Number(node.minLength || 0), max: Number(node.maxLength || Number.MAX_SAFE_INTEGER) });
}
function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}
function boundedString(value, rule) {
  return typeof value === 'string' && value.length >= rule.min && value.length <= rule.max;
}

export const RELEASE_SPEC_ACTIVE_MODES = Object.freeze(values('releaseMode').filter((value) => value !== 'NOOP_IDENTICAL'));
export const RELEASE_SPEC_ACTIVE_CHANGE_CLASSES = Object.freeze(values('changeClass').filter((value) => value !== 'NOOP'));
export const RELEASE_SPEC_EVIDENCE_PATTERN = String(properties?.evidenceRefs?.items?.pattern || '');

const activeModes = new Set(RELEASE_SPEC_ACTIVE_MODES);
const activeChangeClasses = new Set(RELEASE_SPEC_ACTIVE_CHANGE_CLASSES);
const versionPattern = new RegExp(String(properties?.version?.pattern || '^$'));
const evidencePattern = new RegExp(RELEASE_SPEC_EVIDENCE_PATTERN || '^$');
const versionBounds = bounds('version');
const releaseNameBounds = bounds('releaseName');
const goalBounds = bounds('primaryGoalId');
const evidenceItem = properties?.evidenceRefs?.items || {};
const evidenceBounds = Object.freeze({ min: Number(evidenceItem.minLength || 0), max: Number(evidenceItem.maxLength || Number.MAX_SAFE_INTEGER) });
const evidenceMaxItems = Number(properties?.evidenceRefs?.maxItems || Number.MAX_SAFE_INTEGER);
const gate = properties?.liveGate?.properties || {};
const scenarioBounds = Object.freeze({ min: Number(gate?.scenarioId?.minLength || 0), max: Number(gate?.scenarioId?.maxLength || Number.MAX_SAFE_INTEGER) });
const liveGateKeys = Object.freeze(['required', 'scenarioId', 'closeAuthority']);

export function activeReleaseSpecViolation(spec) {
  const value = spec || {};
  const version = String(value.version || '');
  if (!boundedString(version, versionBounds) || !versionPattern.test(version)) return 'VERSION';
  if (!boundedString(value.releaseName, releaseNameBounds) || !String(value.releaseName).trim()) return 'RELEASE_NAME';
  if (!activeModes.has(value.releaseMode)) return 'RELEASE_MODE';
  if (!activeChangeClasses.has(value.changeClass)) return 'CHANGE_CLASS';
  if (!boundedString(value.primaryGoalId, goalBounds) || !String(value.primaryGoalId).trim()) return 'PRIMARY_GOAL';
  if (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.length > evidenceMaxItems) return 'EVIDENCE';
  for (const ref of value.evidenceRefs) {
    if (!boundedString(ref, evidenceBounds) || !evidencePattern.test(ref)) return 'EVIDENCE';
  }
  if (!exactKeys(value.liveGate, liveGateKeys)) return 'LIVE_GATE';
  if (value.liveGate.required !== true) return 'LIVE_GATE';
  if (!boundedString(value.liveGate.scenarioId, scenarioBounds) || !String(value.liveGate.scenarioId).trim()) return 'LIVE_GATE';
  if (value.liveGate.closeAuthority !== 'HUMAN_EVIDENCE') return 'LIVE_GATE';
  return null;
}

export function assertActiveReleaseSpecContract(spec, prefix = 'RELEASE_SPEC_CONTRACT') {
  const violation = activeReleaseSpecViolation(spec);
  if (!violation) return Object.freeze({ result: 'PASS' });
  const error = new Error(`${prefix}_${violation}_INVALID`);
  error.code = `${prefix}_${violation}_INVALID`;
  throw error;
}

export function contractSnapshot() {
  return Object.freeze({
    activeModes: RELEASE_SPEC_ACTIVE_MODES,
    activeChangeClasses: RELEASE_SPEC_ACTIVE_CHANGE_CLASSES,
    evidencePattern: RELEASE_SPEC_EVIDENCE_PATTERN,
    schemaId: String(schema?.$id || ''),
  });
}
