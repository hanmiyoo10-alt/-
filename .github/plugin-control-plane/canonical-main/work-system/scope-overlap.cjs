const fs = require('node:fs');
const path = require('node:path');
const {classifyPrActivity} = require('./pr-activity.cjs');
const {classifyPacketActivity} = require('./packet-activity.cjs');
const {parseLifecycle} = require('./packet-projection.cjs');

const PACKET_MARKER = '<!-- canonical-main-work-packet:v1 -->';
const TERMINAL_PACKET_STATES = new Set(['DONE', 'CANCELLED', 'SUPERSEDED']);
const PACKET_SCOPE_HEADINGS = Object.freeze([
  'Bounded write scope',
  'Bounded implementation write scope',
  'Locked write scope',
  'Bounded IMPLEMENTATION_PR write scope',
  'Repository write-scope ceiling used by IMPLEMENTATION_PR',
  'Bounded repository write ceiling',
]);
const DISCOVERY_STATES = new Set(['COMPLETE', 'PARTIAL', 'UNKNOWN']);

const REASON_CODES = Object.freeze({
  INPUT_INVALID: 'INPUT_INVALID',
  INPUT_JSON_INVALID: 'INPUT_JSON_INVALID',
  REQUESTED_SCOPE_INVALID: 'REQUESTED_SCOPE_INVALID',
  DISCOVERY_INCOMPLETE: 'DISCOVERY_INCOMPLETE',
  CANDIDATE_INVALID: 'CANDIDATE_INVALID',
  PACKET_BODY_UNSUPPORTED: 'PACKET_BODY_UNSUPPORTED',
  PACKET_STATE_UNRESOLVED: 'PACKET_STATE_UNRESOLVED',
  PACKET_SCOPE_UNRESOLVED: 'PACKET_SCOPE_UNRESOLVED',
  PACKET_NATIVE_STATE_CONFLICT: 'PACKET_NATIVE_STATE_CONFLICT',
  PR_CHANGED_FILES_INCOMPLETE: 'PR_CHANGED_FILES_INCOMPLETE',
  PR_ACTIVITY_UNKNOWN: 'PR_ACTIVITY_UNKNOWN',
  PR_ACTIVITY_CONFLICT: 'PR_ACTIVITY_CONFLICT',
  PACKET_ACTIVITY_UNKNOWN: 'PACKET_ACTIVITY_UNKNOWN',
  PACKET_ACTIVITY_CONFLICT: 'PACKET_ACTIVITY_CONFLICT',
  LINKED_PR_EVIDENCE_MISSING: 'LINKED_PR_EVIDENCE_MISSING',
  PACKET_PR_SCOPE_DRIFT: 'PACKET_PR_SCOPE_DRIFT',
  WRITE_SCOPE_OVERLAP: 'WRITE_SCOPE_OVERLAP',
});

function boundedText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 240);
}

function makeFinding(code, disposition, ownerRef, requestedScope, evidence, sourceRefs, extra = {}) {
  return {
    code,
    disposition,
    ownerRef,
    requestedScope,
    evidence: boundedText(evidence),
    sourceRefs: [...new Set(sourceRefs.filter(Boolean))],
    ...extra,
  };
}

function invalidScope(raw, reason) {
  return {ok: false, raw, reason};
}

function normalizeScope(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return invalidScope(raw, 'scope must be a non-empty string');
  const value = raw.trim();

  if (value.startsWith('path:')) {
    const declared = value.slice(5).trim();
    if (!declared || declared.includes('\\')) return invalidScope(raw, 'path must be repository-relative POSIX form');
    const prefix = declared.endsWith('/**');
    const base = prefix ? declared.slice(0, -3) : declared;
    if (!base || path.posix.isAbsolute(base)) return invalidScope(raw, 'absolute or empty path is unsupported');
    if (base.split('/').some((part) => part === '..')) return invalidScope(raw, 'path traversal is unsupported');
    if (/[*?{}[\]()|^$]/.test(base)) return invalidScope(raw, 'unsupported wildcard or pattern syntax');

    const normalizedBase = path.posix.normalize(base);
    if (!normalizedBase || normalizedBase === '.' || normalizedBase.startsWith('../')) {
      return invalidScope(raw, 'path normalization escaped repository root');
    }
    return {
      ok: true,
      kind: 'path',
      mode: prefix ? 'prefix' : 'exact',
      value: normalizedBase,
      normalized: `path:${normalizedBase}${prefix ? '/**' : ''}`,
    };
  }

  if (value.startsWith('surface:')) {
    const rest = value.slice('surface:'.length);
    const separator = rest.indexOf(':');
    if (separator <= 0 || separator === rest.length - 1) return invalidScope(raw, 'surface requires kind and identity');
    const kind = rest.slice(0, separator).trim().toLowerCase();
    const identity = rest.slice(separator + 1).trim();
    if (!kind || !identity || /\s|[*?{}[\]()|^$]/.test(`${kind}:${identity}`)) {
      return invalidScope(raw, 'surface identity contains unsupported syntax');
    }
    return {
      ok: true,
      kind: 'surface',
      mode: 'exact',
      value: `${kind}:${identity}`,
      normalized: `surface:${kind}:${identity}`,
    };
  }

  return invalidScope(raw, 'supported scopes start with path: or surface:');
}

function scopesOverlap(left, right) {
  if (!left.ok || !right.ok || left.kind !== right.kind) return false;
  if (left.kind === 'surface') return left.value === right.value;
  if (left.mode === 'exact' && right.mode === 'exact') return left.value === right.value;

  const contains = (prefixValue, otherValue) => (
    otherValue === prefixValue || otherValue.startsWith(`${prefixValue}/`)
  );
  if (left.mode === 'prefix' && right.mode === 'prefix') {
    return contains(left.value, right.value) || contains(right.value, left.value);
  }
  if (left.mode === 'prefix') return contains(left.value, right.value);
  return contains(right.value, left.value);
}

function markdownStructure(body) {
  const records = [];
  let fence = null;
  for (const text of body.split(/\r?\n/)) {
    const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
    const marker = match ? {char: match[1][0], length: match[1].length, tail: match[2]} : null;
    if (!fence) {
      if (marker) fence = {char: marker.char, length: marker.length};
      records.push({text, fenced: Boolean(marker)});
      continue;
    }
    records.push({text, fenced: true});
    if (marker && marker.char === fence.char && marker.length >= fence.length && !marker.tail.trim()) {
      fence = null;
    }
  }
  return {ok: fence === null, lines: records};
}

function nonWriteBoundary(line) {
  const heading = /^#{3,6}\s+(.+?)\s*#*\s*$/.exec(line);
  if (heading && /^(?:explicit\s+)?(?:non-write(?:\s*\/\s*(?:preservation|non-effect))?|preservation(?:\s*\/\s*non-write)?)(?:\s+(?:scope|boundary|surfaces?))?$/i.test(heading[1].trim())) {
    return true;
  }
  return /^Preservation(?:\s*\/|\s|:)/i.test(line)
    || /^Non-write(?:\s|:)/i.test(line)
    || /^Do not modify:\s*$/i.test(line)
    || /^Forbidden:\s*$/i.test(line)
    || /^Do not touch unless fresh evidence proves required:/i.test(line);
}

function scopeDeclaration(rawLine) {
  const list = /^\s*(?:[-*+]|\d+\.)\s+(.+?)\s*$/.exec(rawLine);
  const value = list ? list[1] : rawLine.trim();
  if (list) {
    const code = /^`([^`]+)`/.exec(value);
    if (code) return code[1];
    return /^(?:path|surface):\S+$/.test(value) ? value : null;
  }
  const labeled = /^(?:Scope ceiling|Semantic\/effect surface):\s*`([^`]+)`\s*$/.exec(value);
  if (labeled) return labeled[1];
  const code = /^`([^`]+)`$/.exec(value);
  if (code) return code[1];
  return /^(?:path|surface):\S+$/.test(value) ? value : null;
}

function sectionBlocks(lines, heading) {
  const blocks = [];
  for (let start = 0; start < lines.length; start += 1) {
    if (lines[start].fenced
        || lines[start].text.trim().toLowerCase() !== `## ${heading}`.toLowerCase()) continue;
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
      if (!lines[index].fenced && /^##\s+/.test(lines[index].text.trim())) {
        end = index;
        break;
      }
    }
    blocks.push(lines.slice(start + 1, end));
  }
  return blocks;
}

function extractPacketScopes(body) {
  const structure = markdownStructure(body);
  if (!structure.ok) {
    return {ok: false, conflict: false, scopes: [], reason: 'unclosed Markdown fence in packet body'};
  }
  const matches = PACKET_SCOPE_HEADINGS.flatMap((heading) => (
    sectionBlocks(structure.lines, heading).map((lines) => ({heading, lines}))
  ));
  if (matches.length === 0) {
    return {ok: false, conflict: false, scopes: [], reason: 'missing deterministic write-scope section'};
  }
  if (matches.length > 1) {
    return {
      ok: false,
      conflict: true,
      scopes: [],
      reason: `multiple deterministic write-scope sections: ${matches.map((item) => item.heading).join(', ')}`,
    };
  }
  const lines = matches[0].lines;
  const scopes = [];
  const invalid = [];

  for (const record of lines) {
    if (record.fenced) continue;
    const cleaned = record.text.trim();
    if (!cleaned) continue;
    if (nonWriteBoundary(cleaned)) break;
    const token = scopeDeclaration(record.text);
    if (!token) continue;

    const parsed = normalizeScope(token.startsWith('path:') || token.startsWith('surface:') ? token : `path:${token}`);
    if (parsed.ok) scopes.push(parsed);
    else invalid.push({token, reason: parsed.reason});
  }

  if (scopes.length === 0 || invalid.length > 0) {
    return {
      ok: false,
      conflict: false,
      scopes,
      reason: invalid.length > 0
        ? `unsupported bounded scope entry: ${invalid[0].token}`
        : 'no deterministic bounded scope entries found',
    };
  }
  return {ok: true, conflict: false, scopes, reason: null};
}

function candidateRef(candidate, index) {
  return typeof candidate?.ref === 'string' && candidate.ref.trim()
    ? candidate.ref.trim()
    : `candidate:${index}`;
}

function resolveScopeOverlap(input) {
  const findings = [];
  const candidateActivity = [];
  const requested = [];
  const rawRequested = Array.isArray(input?.requestedScopes) ? input.requestedScopes : [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    findings.push(makeFinding(
      REASON_CODES.INPUT_INVALID,
      'UNKNOWN',
      'input',
      '<invalid>',
      'input must be a JSON object',
      ['caller:input'],
    ));
  }

  for (const raw of rawRequested) {
    const parsed = normalizeScope(raw);
    if (parsed.ok) requested.push(parsed);
    else findings.push(makeFinding(
      REASON_CODES.REQUESTED_SCOPE_INVALID,
      'UNKNOWN',
      'request',
      boundedText(raw) || '<empty>',
      parsed.reason,
      ['caller:requestedScopes'],
    ));
  }
  if (rawRequested.length === 0) {
    findings.push(makeFinding(
      REASON_CODES.REQUESTED_SCOPE_INVALID,
      'UNKNOWN',
      'request',
      '<missing>',
      'requestedScopes must contain at least one scope',
      ['caller:requestedScopes'],
    ));
  }

  const discovery = typeof input?.discovery === 'string' ? input.discovery.trim().toUpperCase() : '';
  if (!DISCOVERY_STATES.has(discovery) || discovery !== 'COMPLETE') {
    findings.push(makeFinding(
      REASON_CODES.DISCOVERY_INCOMPLETE,
      'UNKNOWN',
      'discovery',
      requested[0]?.normalized || '<unresolved>',
      DISCOVERY_STATES.has(discovery)
        ? `bounded discovery is ${discovery}`
        : 'discovery must be COMPLETE, PARTIAL, or UNKNOWN',
      ['caller:discovery'],
    ));
  }

  const candidates = Array.isArray(input?.candidates) ? input.candidates : [];
  if (!Array.isArray(input?.candidates) && input?.candidates !== undefined) {
    findings.push(makeFinding(
      REASON_CODES.INPUT_INVALID,
      'UNKNOWN',
      'candidates',
      requested[0]?.normalized || '<unresolved>',
      'candidates must be an array',
      ['caller:candidates'],
    ));
  }

  const prByRef = new Map();
  candidates.forEach((candidate, index) => {
    if (candidate?.type === 'pr') prByRef.set(candidateRef(candidate, index), candidate);
  });

  const packetRecords = [];
  candidates.forEach((candidate, index) => {
    const ref = candidateRef(candidate, index);
    if (!candidate || typeof candidate !== 'object' || !['packet', 'pr'].includes(candidate.type)) {
      findings.push(makeFinding(
        REASON_CODES.CANDIDATE_INVALID,
        'UNKNOWN',
        ref,
        requested[0]?.normalized || '<unresolved>',
        'candidate type must be packet or pr',
        [ref],
      ));
      return;
    }

    if (candidate.type === 'packet') {
      const issueState = typeof candidate.issueState === 'string' ? candidate.issueState.toLowerCase() : '';
      const body = typeof candidate.body === 'string' ? candidate.body : '';
      if (!body.includes(PACKET_MARKER)) {
        findings.push(makeFinding(
          REASON_CODES.PACKET_BODY_UNSUPPORTED,
          'UNKNOWN',
          ref,
          requested[0]?.normalized || '<unresolved>',
          'packet marker is missing',
          [ref],
        ));
        return;
      }
      const lifecycleEvidence = parseLifecycle(body);
      const lifecycle = lifecycleEvidence.lifecycle;
      if (!lifecycle || !['open', 'closed'].includes(issueState)) {
        const lifecycleDetail = lifecycleEvidence.reasonCodes.length > 0
          ? `canonical lifecycle unresolved: ${lifecycleEvidence.reasonCodes.join(',')}`
          : 'native issue state is unresolved';
        findings.push(makeFinding(
          REASON_CODES.PACKET_STATE_UNRESOLVED,
          lifecycleEvidence.conflict ? 'CONFLICT' : 'UNKNOWN',
          ref,
          requested[0]?.normalized || '<unresolved>',
          lifecycleDetail,
          [ref],
        ));
        return;
      }
      if (issueState === 'closed' && !TERMINAL_PACKET_STATES.has(lifecycle)) {
        findings.push(makeFinding(
          REASON_CODES.PACKET_NATIVE_STATE_CONFLICT,
          'CONFLICT',
          ref,
          requested[0]?.normalized || '<unresolved>',
          `native issue is closed while packet lifecycle is ${lifecycle}`,
          [ref],
        ));
        return;
      }
      if (TERMINAL_PACKET_STATES.has(lifecycle)) {
        packetRecords.push({ref, active: false, scopes: [], linkedPrRef: candidate.linkedPrRef});
        return;
      }

      const parsedScopes = extractPacketScopes(body);
      if (!parsedScopes.ok) {
        findings.push(makeFinding(
          REASON_CODES.PACKET_SCOPE_UNRESOLVED,
          parsedScopes.conflict ? 'CONFLICT' : 'UNKNOWN',
          ref,
          requested[0]?.normalized || '<unresolved>',
          parsedScopes.reason,
          [ref],
        ));
        return;
      }

      if (Object.prototype.hasOwnProperty.call(candidate, 'packetActivityEvidence')) {
        const activity = classifyPacketActivity({
          candidateRef: ref,
          requesterRef: typeof input?.requesterRef === 'string' ? input.requesterRef.trim() : '',
          evidence: candidate.packetActivityEvidence,
        });
        candidateActivity.push(activity);
        if (activity.state === 'NONBLOCKING_PROVEN') {
          packetRecords.push({
            ref,
            active: false,
            scopes: parsedScopes.scopes,
            linkedPrRef: typeof candidate.linkedPrRef === 'string' ? candidate.linkedPrRef.trim() : null,
          });
          return;
        }
        if (activity.state === 'UNKNOWN' || activity.state === 'CONFLICT') {
          findings.push(makeFinding(
            activity.state === 'CONFLICT'
              ? REASON_CODES.PACKET_ACTIVITY_CONFLICT
              : REASON_CODES.PACKET_ACTIVITY_UNKNOWN,
            activity.state,
            ref,
            requested[0]?.normalized || '<unresolved>',
            activity.reasonCode,
            activity.sourceRefs,
            {candidateType: 'packet', activityReasonCode: activity.reasonCode},
          ));
          return;
        }
      }

      packetRecords.push({
        ref,
        active: true,
        scopes: parsedScopes.scopes,
        linkedPrRef: typeof candidate.linkedPrRef === 'string' ? candidate.linkedPrRef.trim() : null,
      });
      for (const requestedScope of requested) {
        for (const candidateScope of parsedScopes.scopes) {
          if (!scopesOverlap(requestedScope, candidateScope)) continue;
          findings.push(makeFinding(
            REASON_CODES.WRITE_SCOPE_OVERLAP,
            'OVERLAP',
            ref,
            requestedScope.normalized,
            `active packet scope ${candidateScope.normalized} overlaps requested scope`,
            [ref],
            {candidateScope: candidateScope.normalized, candidateType: 'packet'},
          ));
        }
      }
      return;
    }

    const prState = typeof candidate.state === 'string' ? candidate.state.toLowerCase() : '';
    if (!['open', 'closed', 'merged'].includes(prState)) {
      findings.push(makeFinding(
        REASON_CODES.CANDIDATE_INVALID,
        'UNKNOWN',
        ref,
        requested[0]?.normalized || '<unresolved>',
        'PR state must be open, closed, or merged',
        [ref],
      ));
      return;
    }
    if (prState !== 'open') return;

    if (Object.prototype.hasOwnProperty.call(candidate, 'activityEvidence')) {
      const evidence = candidate.activityEvidence && typeof candidate.activityEvidence === 'object'
        ? candidate.activityEvidence
        : {};
      const activity = classifyPrActivity({
        pr: {
          ref, state: 'open', merged: candidate.merged === true, headSha: candidate.headSha, sourceRefs: [ref],
        },
        linkedPacket: evidence.linkedPacket,
        successor: evidence.successor,
      });
      candidateActivity.push(activity);
      if (activity.state === 'NONBLOCKING_PROVEN') return;
      if (activity.state === 'UNKNOWN' || activity.state === 'CONFLICT') {
        findings.push(makeFinding(
          activity.state === 'CONFLICT' ? REASON_CODES.PR_ACTIVITY_CONFLICT : REASON_CODES.PR_ACTIVITY_UNKNOWN,
          activity.state, ref, requested[0]?.normalized || '<unresolved>', activity.evidence, activity.sourceRefs,
          {candidateType: 'pr', activityReasonCode: activity.reasonCode},
        ));
        return;
      }
    }

    const changedFiles = Array.isArray(candidate.changedFiles) ? candidate.changedFiles : [];
    let matched = false;
    for (const changedFile of changedFiles) {
      const changedScope = normalizeScope(`path:${changedFile}`);
      if (!changedScope.ok) {
        findings.push(makeFinding(
          REASON_CODES.PR_CHANGED_FILES_INCOMPLETE,
          'UNKNOWN',
          ref,
          requested[0]?.normalized || '<unresolved>',
          `invalid changed-file evidence: ${boundedText(changedFile)}`,
          [ref],
        ));
        continue;
      }
      for (const requestedScope of requested) {
        if (!scopesOverlap(requestedScope, changedScope)) continue;
        matched = true;
        findings.push(makeFinding(
          REASON_CODES.WRITE_SCOPE_OVERLAP,
          'OVERLAP',
          ref,
          requestedScope.normalized,
          `open PR changed file ${changedScope.value} overlaps requested scope`,
          [ref],
          {candidateScope: changedScope.normalized, candidateType: 'pr'},
        ));
      }
    }
    if (!matched && candidate.filesComplete !== true) {
      findings.push(makeFinding(
        REASON_CODES.PR_CHANGED_FILES_INCOMPLETE,
        'UNKNOWN',
        ref,
        requested[0]?.normalized || '<unresolved>',
        'open PR changed-file inventory is missing or incomplete',
        [ref],
      ));
    }
  });

  for (const packet of packetRecords) {
    if (!packet.active || !packet.linkedPrRef) continue;
    const linked = prByRef.get(packet.linkedPrRef);
    if (!linked) {
      findings.push(makeFinding(
        REASON_CODES.LINKED_PR_EVIDENCE_MISSING,
        'UNKNOWN',
        packet.ref,
        requested[0]?.normalized || '<unresolved>',
        `linked PR evidence ${packet.linkedPrRef} was not supplied`,
        [packet.ref, packet.linkedPrRef],
      ));
      continue;
    }
    if (String(linked.state || '').toLowerCase() !== 'open') continue;
    if (!Array.isArray(linked.changedFiles)) continue;

    for (const file of linked.changedFiles) {
      const fileScope = normalizeScope(`path:${file}`);
      if (!fileScope.ok) continue;
      const withinDeclaredScope = packet.scopes.some((scope) => scopesOverlap(scope, fileScope));
      if (withinDeclaredScope) continue;
      findings.push(makeFinding(
        REASON_CODES.PACKET_PR_SCOPE_DRIFT,
        'CONFLICT',
        packet.ref,
        requested[0]?.normalized || '<unresolved>',
        `linked open PR changed file ${fileScope.value} is outside packet bounded write scope`,
        [packet.ref, packet.linkedPrRef],
        {candidateScope: fileScope.normalized, linkedPrRef: packet.linkedPrRef},
      ));
    }
  }

  const dispositions = new Set(findings.map((item) => item.disposition));
  const state = dispositions.has('CONFLICT')
    ? 'CONFLICT'
    : dispositions.has('OVERLAP')
      ? 'OVERLAP'
      : dispositions.has('UNKNOWN')
        ? 'UNKNOWN'
        : 'DISJOINT';

  return {
    schemaVersion: 1,
    state,
    discovery: DISCOVERY_STATES.has(discovery) ? discovery : 'UNKNOWN',
    requestedScopes: requested.map((scope) => scope.normalized),
    candidateCount: candidates.length,
    findings,
    ...(candidateActivity.length > 0 ? {candidateActivity} : {}),
  };
}

function readCliInput(filePath) {
  return filePath ? fs.readFileSync(filePath, 'utf8') : fs.readFileSync(0, 'utf8');
}

if (require.main === module) {
  let result;
  try {
    result = resolveScopeOverlap(JSON.parse(readCliInput(process.argv[2])));
  } catch (error) {
    result = {
      schemaVersion: 1,
      state: 'UNKNOWN',
      discovery: 'UNKNOWN',
      requestedScopes: [],
      candidateCount: 0,
      findings: [makeFinding(
        REASON_CODES.INPUT_JSON_INVALID,
        'UNKNOWN',
        'input',
        '<unresolved>',
        error?.message || 'invalid JSON input',
        ['caller:input'],
      )],
    };
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.state === 'OVERLAP') process.exitCode = 1;
  else if (result.state === 'UNKNOWN') process.exitCode = 2;
  else if (result.state === 'CONFLICT') process.exitCode = 3;
}

module.exports = {REASON_CODES, extractPacketScopes, normalizeScope, scopesOverlap, resolveScopeOverlap};
