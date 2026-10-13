'use strict';

const PROFILE = 'issue_coordination_write';
const MAX_COMMENT_BYTES = 8192;

const TARGET_KINDS = Object.freeze(['ISSUE', 'PULL_REQUEST']);
const TARGET_SURFACES = Object.freeze([
  'ORDINARY_ISSUE',
  'CANONICAL_WORK_PACKET',
  'CANONICAL_WORK_QUEUE',
  'CANONICAL_AUDIT',
  'CANONICAL_RESERVED',
]);
const OPERATIONS = Object.freeze([
  'COMMENT',
  'BODY_UPDATE',
  'TITLE_UPDATE',
  'CLOSE',
  'REOPEN',
  'LABEL_ADD',
  'LABEL_REMOVE',
  'LABEL_REPLACE',
  'ASSIGNEE_ADD',
  'ASSIGNEE_REMOVE',
  'ASSIGNEE_REPLACE',
  'MILESTONE_UPDATE',
  'ISSUE_CREATE',
  'STAGE_CHECKPOINT',
  'TERMINAL_CLOSE_SYNC',
]);
const DISPOSITIONS = Object.freeze([
  'ADMIT_CONNECTOR_ISSUE_COMMENT',
  'ROUTE_SPECIALIZED_OWNER',
  'REJECT_PR_SURFACE',
  'REJECT_UNSUPPORTED_EFFECT',
  'UNKNOWN',
  'CONFLICT',
]);

const FALSE_AUTHORITIES = Object.freeze({
  mutationAuthorized: false,
  repositoryMutationAuthorized: false,
  mergeAuthorized: false,
  workflowAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
  runtimeAuthorized: false,
  adminAuthorized: false,
  securityMutationAuthorized: false,
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function unexpectedKeys(value, allowed) {
  if (!isObject(value)) return [];
  const expected = new Set(allowed);
  return Object.keys(value).filter((key) => !expected.has(key)).sort();
}

function unique(values) {
  return [...new Set(values)].sort();
}

function hasUnpairedSurrogate(text) {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xD800 && code <= 0xDBFF) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xDC00 && next <= 0xDFFF)) return true;
      index += 1;
    } else if (code >= 0xDC00 && code <= 0xDFFF) {
      return true;
    }
  }
  return false;
}

function makeResult({
  request = null,
  disposition,
  ownerRoute = null,
  confirmationRequired = false,
  requiredEvidence = [],
  postEffectReadbackRequired = false,
  reasonCodes = [],
}) {
  const target = isObject(request?.target) ? request.target : {};
  const operation = isObject(request?.operation) ? request.operation : {};
  return Object.freeze({
    schemaVersion: 1,
    profile: PROFILE,
    targetIssue: Number.isSafeInteger(target.issueNumber) ? target.issueNumber : null,
    targetKind: TARGET_KINDS.includes(target.kind) ? target.kind : null,
    targetSurface: TARGET_SURFACES.includes(target.surface) ? target.surface : null,
    requestedOperation: OPERATIONS.includes(operation.type) ? operation.type : null,
    disposition,
    ownerRoute,
    confirmationRequired,
    requiredEvidence: unique(requiredEvidence),
    postEffectReadbackRequired,
    idempotencyClaimed: false,
    ...FALSE_AUTHORITIES,
    reasonCodes: unique(reasonCodes),
  });
}

function unknown(request, ...reasonCodes) {
  return makeResult({request, disposition: 'UNKNOWN', reasonCodes});
}

function conflict(request, ...reasonCodes) {
  return makeResult({request, disposition: 'CONFLICT', reasonCodes});
}

function validateRequest(request) {
  const reasons = [];
  if (!isObject(request)) return ['REQUEST_OBJECT_REQUIRED'];
  if (unexpectedKeys(request, ['schemaVersion', 'target', 'operation']).length) {
    reasons.push('REQUEST_FIELDS_INVALID');
  }
  if (request.schemaVersion !== 1) reasons.push('REQUEST_SCHEMA_VERSION_INVALID');

  if (!isObject(request.target)) {
    reasons.push('TARGET_OBJECT_REQUIRED');
  } else {
    if (unexpectedKeys(request.target, ['issueNumber', 'kind', 'surface']).length) {
      reasons.push('TARGET_FIELDS_INVALID');
    }
    if (!Number.isSafeInteger(request.target.issueNumber) || request.target.issueNumber <= 0) {
      reasons.push('TARGET_ISSUE_NUMBER_INVALID');
    }
    if (!TARGET_KINDS.includes(request.target.kind)) reasons.push('TARGET_KIND_INVALID');
    if (!TARGET_SURFACES.includes(request.target.surface)) reasons.push('TARGET_SURFACE_INVALID');
  }

  if (!isObject(request.operation)) {
    reasons.push('OPERATION_OBJECT_REQUIRED');
  } else {
    if (!OPERATIONS.includes(request.operation.type)) {
      reasons.push('OPERATION_TYPE_INVALID');
    }
    const allowed = request.operation.type === 'COMMENT' ? ['type', 'body'] : ['type'];
    if (unexpectedKeys(request.operation, allowed).length) reasons.push('OPERATION_FIELDS_INVALID');
  }
  return unique(reasons);
}

function targetIdentityConflict(request) {
  const {issueNumber, surface} = request.target;
  if (surface === 'CANONICAL_WORK_QUEUE' && issueNumber !== 465) {
    return ['WORK_QUEUE_IDENTITY_CONFLICT'];
  }
  if (surface === 'CANONICAL_AUDIT' && issueNumber !== 293) {
    return ['AUDIT_IDENTITY_CONFLICT'];
  }
  if (surface === 'ORDINARY_ISSUE' && (issueNumber === 465 || issueNumber === 293)) {
    return ['RESERVED_ISSUE_SURFACE_CONFLICT'];
  }
  if (surface === 'CANONICAL_WORK_PACKET' && (issueNumber === 465 || issueNumber === 293)) {
    return ['WORK_PACKET_IDENTITY_CONFLICT'];
  }
  return [];
}

function validateCommentBody(body) {
  const reasons = [];
  if (typeof body !== 'string') return ['COMMENT_BODY_REQUIRED'];
  if (body.trim().length === 0) reasons.push('COMMENT_BODY_EMPTY');
  if (body.includes('\u0000')) reasons.push('COMMENT_BODY_NUL_FORBIDDEN');
  if (hasUnpairedSurrogate(body)) reasons.push('COMMENT_BODY_UTF8_INVALID');
  if (!hasUnpairedSurrogate(body) && Buffer.byteLength(body, 'utf8') > MAX_COMMENT_BYTES) {
    reasons.push('COMMENT_BODY_TOO_LARGE');
  }
  return unique(reasons);
}

function specializedRoute(request) {
  const {surface} = request.target;
  const {type} = request.operation;

  if (surface === 'CANONICAL_WORK_PACKET') {
    if (type === 'BODY_UPDATE') {
      return makeResult({
        request,
        disposition: 'ROUTE_SPECIALIZED_OWNER',
        ownerRoute: 'CANONICAL_COORDINATION_BODY_PATCH',
        confirmationRequired: true,
        requiredEvidence: ['exact packet identity', 'expected body SHA-256', 'specialized owner preconditions'],
        postEffectReadbackRequired: true,
        reasonCodes: ['SPECIALIZED_WORK_PACKET_BODY_OWNER'],
      });
    }
    if (type === 'STAGE_CHECKPOINT') {
      return makeResult({
        request,
        disposition: 'ROUTE_SPECIALIZED_OWNER',
        ownerRoute: 'CANONICAL_STAGE_CHECKPOINT',
        confirmationRequired: true,
        requiredEvidence: ['exact packet identity', 'paired packet/audit checkpoint contract'],
        postEffectReadbackRequired: true,
        reasonCodes: ['SPECIALIZED_STAGE_CHECKPOINT_OWNER'],
      });
    }
    if (type === 'TERMINAL_CLOSE_SYNC') {
      return makeResult({
        request,
        disposition: 'ROUTE_SPECIALIZED_OWNER',
        ownerRoute: 'CANONICAL_PACKET_CLOSURE_OWNER',
        confirmationRequired: true,
        requiredEvidence: ['terminal packet body reconciliation', 'closure owner preconditions'],
        postEffectReadbackRequired: true,
        reasonCodes: ['SPECIALIZED_PACKET_CLOSURE_OWNER'],
      });
    }
    return unknown(request, 'SPECIALIZED_OWNER_REQUIRED');
  }

  if (surface === 'CANONICAL_WORK_QUEUE') {
    if (type === 'BODY_UPDATE') {
      return makeResult({
        request,
        disposition: 'ROUTE_SPECIALIZED_OWNER',
        ownerRoute: 'CANONICAL_COORDINATION_BODY_PATCH',
        confirmationRequired: true,
        requiredEvidence: ['issue #465 identity', 'expected body SHA-256', 'WORK_QUEUE owner preconditions'],
        postEffectReadbackRequired: true,
        reasonCodes: ['SPECIALIZED_WORK_QUEUE_BODY_OWNER'],
      });
    }
    return unknown(request, 'SPECIALIZED_OWNER_REQUIRED');
  }

  if (surface === 'CANONICAL_AUDIT') {
    if (type === 'STAGE_CHECKPOINT') {
      return makeResult({
        request,
        disposition: 'ROUTE_SPECIALIZED_OWNER',
        ownerRoute: 'CANONICAL_STAGE_CHECKPOINT_AUDIT',
        confirmationRequired: true,
        requiredEvidence: ['issue #293 identity', 'paired checkpoint contract'],
        postEffectReadbackRequired: true,
        reasonCodes: ['SPECIALIZED_AUDIT_CHECKPOINT_OWNER'],
      });
    }
    return unknown(request, 'SPECIALIZED_OWNER_REQUIRED');
  }

  if (surface === 'CANONICAL_RESERVED') {
    return unknown(request, 'SPECIALIZED_OWNER_REQUIRED');
  }
  return null;
}

function ordinaryUnsupported(request) {
  const type = request.operation.type;
  if (['CLOSE', 'LABEL_ADD', 'ASSIGNEE_ADD'].includes(type)) {
    return makeResult({
      request,
      disposition: 'REJECT_UNSUPPORTED_EFFECT',
      reasonCodes: ['DEFER_TO_ISSUE_COORDINATION_SUGGESTION_WRITE'],
    });
  }
  if (type === 'ISSUE_CREATE') {
    return makeResult({
      request,
      disposition: 'REJECT_UNSUPPORTED_EFFECT',
      reasonCodes: ['DEFER_TO_ISSUE_CREATION_IDEMPOTENCY_DESIGN'],
    });
  }
  if (['STAGE_CHECKPOINT', 'TERMINAL_CLOSE_SYNC'].includes(type)) {
    return conflict(request, 'SPECIALIZED_OPERATION_SURFACE_CONFLICT');
  }
  return makeResult({
    request,
    disposition: 'REJECT_UNSUPPORTED_EFFECT',
    reasonCodes: ['PROVIDER_ATOMIC_CONDITIONAL_WRITE_UNAVAILABLE'],
  });
}

function classifyIssueCoordinationWrite(request) {
  const validation = validateRequest(request);
  if (validation.length) return unknown(request, ...validation);

  const identityConflict = targetIdentityConflict(request);
  if (identityConflict.length) return conflict(request, ...identityConflict);

  if (request.target.kind === 'PULL_REQUEST') {
    return makeResult({
      request,
      disposition: 'REJECT_PR_SURFACE',
      ownerRoute: 'FUTURE_PR_COLLABORATION_WRITE',
      reasonCodes: ['PR_SURFACE_FORBIDDEN'],
    });
  }

  const specialized = specializedRoute(request);
  if (specialized) return specialized;

  if (request.operation.type !== 'COMMENT') return ordinaryUnsupported(request);

  const commentReasons = validateCommentBody(request.operation.body);
  if (commentReasons.length) return unknown(request, ...commentReasons);

  return makeResult({
    request,
    disposition: 'ADMIT_CONNECTOR_ISSUE_COMMENT',
    ownerRoute: 'GITHUB_CONNECTOR_ADD_COMMENT_TO_ISSUE',
    confirmationRequired: true,
    requiredEvidence: [
      'explicit user confirmation before effect',
      'fresh read proves exact existing non-PR issue identity',
      'post-effect comment readback',
    ],
    postEffectReadbackRequired: true,
    reasonCodes: ['COMMENT_ADMISSION_READY'],
  });
}

module.exports = {
  DISPOSITIONS,
  MAX_COMMENT_BYTES,
  OPERATIONS,
  PROFILE,
  TARGET_KINDS,
  TARGET_SURFACES,
  classifyIssueCoordinationWrite,
};
