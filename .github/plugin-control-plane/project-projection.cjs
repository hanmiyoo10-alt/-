'use strict';

const {
  classifyPacketProjection,
  MAX_BODY_BYTES,
} = require('./canonical-main/work-system/packet-projection.cjs');

const MAX_LABELS = 32;
const MAX_LABEL_BYTES = 128;
const PROJECT_FIELDS = Object.freeze(['status', 'priority', 'area', 'workType']);

const AREA_BY_LABEL = Object.freeze({
  'product:termux': 'Termux',
  'product:pocketrisu-helper-mod': 'PocketRisu',
  'scope:research-product': 'Mobile Coder Lab',
  'scope:repo': 'Repository Ops',
});

const REASON_CODES = Object.freeze({
  INPUT_INVALID: 'INPUT_INVALID',
  PACKET_PROJECTION_UNKNOWN: 'PACKET_PROJECTION_UNKNOWN',
  PACKET_PROJECTION_CONFLICT: 'PACKET_PROJECTION_CONFLICT',
  STATUS_READY_OPEN: 'STATUS_READY_OPEN',
  STATUS_ACTIVE_OPEN: 'STATUS_ACTIVE_OPEN',
  STATUS_TERMINAL_CLOSED: 'STATUS_TERMINAL_CLOSED',
  STATUS_BLOCKED_PRESERVE: 'STATUS_BLOCKED_PRESERVE',
  STATUS_LIFECYCLE_NATIVE_CONFLICT: 'STATUS_LIFECYCLE_NATIVE_CONFLICT',
  STATUS_LIFECYCLE_UNSUPPORTED: 'STATUS_LIFECYCLE_UNSUPPORTED',
  AREA_DETERMINED: 'AREA_DETERMINED',
  AREA_UNKNOWN: 'AREA_UNKNOWN',
  AREA_CONFLICT: 'AREA_CONFLICT',
  WORK_TYPE_PACKET: 'WORK_TYPE_PACKET',
  WORK_TYPE_UNKNOWN: 'WORK_TYPE_UNKNOWN',
  WORK_TYPE_CONFLICT: 'WORK_TYPE_CONFLICT',
  PRIORITY_HUMAN_ONLY: 'PRIORITY_HUMAN_ONLY',
});

function field(action, reasonCode, desiredValue) {
  const result = {action, reasonCode};
  if (action === 'SET') result.desiredValue = desiredValue;
  return result;
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function validCurrentValue(value) {
  return value === null
    || (typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= MAX_LABEL_BYTES);
}

function normalizeInput(input) {
  if (!exactKeys(input, ['body', 'nativeState', 'labels', 'current'])) return null;
  if (typeof input.body !== 'string' || Buffer.byteLength(input.body, 'utf8') > MAX_BODY_BYTES) return null;
  if (!['open', 'closed'].includes(input.nativeState)) return null;
  if (!Array.isArray(input.labels) || input.labels.length > MAX_LABELS) return null;
  if (!exactKeys(input.current, PROJECT_FIELDS)) return null;

  const labels = [];
  const seen = new Set();
  for (const label of input.labels) {
    if (typeof label !== 'string') return null;
    const normalized = label.trim();
    if (!normalized || normalized !== label || Buffer.byteLength(label, 'utf8') > MAX_LABEL_BYTES) return null;
    if (seen.has(label)) return null;
    seen.add(label);
    labels.push(label);
  }

  for (const name of PROJECT_FIELDS) {
    if (!validCurrentValue(input.current[name])) return null;
  }

  return {
    body: input.body,
    nativeState: input.nativeState,
    labels: labels.sort(),
    current: {...input.current},
  };
}

function statusPlan(projection, nativeState) {
  if (projection.disposition === 'CONFLICT') {
    return field('CONFLICT', REASON_CODES.PACKET_PROJECTION_CONFLICT);
  }
  if (projection.disposition !== 'PASS') {
    return field('UNKNOWN', REASON_CODES.PACKET_PROJECTION_UNKNOWN);
  }

  const lifecycle = projection.lifecycle;
  const terminal = new Set(['DONE', 'CANCELLED', 'SUPERSEDED']);
  const active = new Set(['CLAIMED', 'IN_PROGRESS', 'REVIEW']);

  if (lifecycle === 'READY') {
    return nativeState === 'open'
      ? field('SET', REASON_CODES.STATUS_READY_OPEN, 'Todo')
      : field('CONFLICT', REASON_CODES.STATUS_LIFECYCLE_NATIVE_CONFLICT);
  }

  if (active.has(lifecycle)) {
    return nativeState === 'open'
      ? field('SET', REASON_CODES.STATUS_ACTIVE_OPEN, 'In Progress')
      : field('CONFLICT', REASON_CODES.STATUS_LIFECYCLE_NATIVE_CONFLICT);
  }

  if (terminal.has(lifecycle)) {
    return nativeState === 'closed'
      ? field('SET', REASON_CODES.STATUS_TERMINAL_CLOSED, 'Done')
      : field('CONFLICT', REASON_CODES.STATUS_LIFECYCLE_NATIVE_CONFLICT);
  }

  if (lifecycle === 'BLOCKED') {
    return nativeState === 'open'
      ? field('PRESERVE', REASON_CODES.STATUS_BLOCKED_PRESERVE)
      : field('CONFLICT', REASON_CODES.STATUS_LIFECYCLE_NATIVE_CONFLICT);
  }

  return field('UNKNOWN', REASON_CODES.STATUS_LIFECYCLE_UNSUPPORTED);
}

function areaPlan(labels) {
  const values = [...new Set(labels.map((label) => AREA_BY_LABEL[label]).filter(Boolean))].sort();
  if (values.length === 0) return field('UNKNOWN', REASON_CODES.AREA_UNKNOWN);
  if (values.length > 1) return field('CONFLICT', REASON_CODES.AREA_CONFLICT);
  return field('SET', REASON_CODES.AREA_DETERMINED, values[0]);
}

function workTypePlan(projection) {
  if (projection.disposition === 'PASS') {
    return field('SET', REASON_CODES.WORK_TYPE_PACKET, 'Work Packet');
  }
  if (projection.disposition === 'CONFLICT') {
    return field('CONFLICT', REASON_CODES.WORK_TYPE_CONFLICT);
  }
  return field('UNKNOWN', REASON_CODES.WORK_TYPE_UNKNOWN);
}

function overallDisposition(fields) {
  const actions = Object.values(fields).map((value) => value.action);
  if (actions.includes('CONFLICT')) return 'CONFLICT';
  if (actions.includes('UNKNOWN')) return 'ATTENTION';
  return 'PASS';
}

function invalidResult() {
  const fields = {
    status: field('UNKNOWN', REASON_CODES.INPUT_INVALID),
    priority: field('PRESERVE', REASON_CODES.PRIORITY_HUMAN_ONLY),
    area: field('UNKNOWN', REASON_CODES.INPUT_INVALID),
    workType: field('UNKNOWN', REASON_CODES.INPUT_INVALID),
  };
  return result(fields);
}

function result(fields) {
  return {
    schemaVersion: 1,
    mode: 'GITHUB_PROJECT_PLANNING_PROJECTION',
    disposition: overallDisposition(fields),
    fields,
    mutationAuthorized: false,
    membershipMutationAuthorized: false,
    reverseSyncAuthorized: false,
  };
}

function planProjectFields(input) {
  const normalized = normalizeInput(input);
  if (!normalized) return invalidResult();

  const projection = classifyPacketProjection(normalized.body);
  const fields = {
    status: statusPlan(projection, normalized.nativeState),
    priority: field('PRESERVE', REASON_CODES.PRIORITY_HUMAN_ONLY),
    area: areaPlan(normalized.labels),
    workType: workTypePlan(projection),
  };
  return result(fields);
}

module.exports = {
  AREA_BY_LABEL,
  MAX_LABELS,
  MAX_LABEL_BYTES,
  PROJECT_FIELDS,
  REASON_CODES,
  areaPlan,
  normalizeInput,
  planProjectFields,
  statusPlan,
  workTypePlan,
};
